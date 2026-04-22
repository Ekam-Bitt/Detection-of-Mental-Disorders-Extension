from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

from flask import Blueprint, Response, current_app, jsonify, render_template, request

from .inference import apply_top_k
from .wellbeing import (
    DEFAULT_SETTINGS,
    HIGH_RISK_SCORE,
    LABELS,
    summarize_history,
    summarize_results,
    get_risk_band,
    get_support_resource,
)

__version__ = "1.2.0"

api_bp = Blueprint("api", __name__, url_prefix="/api")
logger = logging.getLogger("api")

MAX_COMMENT_LENGTH = 5000
MAX_COMMENTS_PER_REQUEST = 100


class ValidationError(Exception):
    pass


def validate_comments(data: Dict[str, Any]) -> List[str]:
    if not data or "comments" not in data:
        raise ValidationError("'comments' field is required")

    comments = data["comments"]
    if not isinstance(comments, list):
        raise ValidationError("'comments' must be a list")

    if len(comments) > MAX_COMMENTS_PER_REQUEST:
        raise ValidationError(f"Too many comments (max {MAX_COMMENTS_PER_REQUEST})")

    for index, comment in enumerate(comments):
        if not isinstance(comment, str):
            raise ValidationError(f"Comment {index} must be a string")
        if len(comment) > MAX_COMMENT_LENGTH:
            raise ValidationError(
                f"Comment {index} exceeds max length ({MAX_COMMENT_LENGTH} chars)"
            )
        if not comment.strip():
            raise ValidationError(f"Comment {index} is empty")

    return comments


def _run_analysis(comments: List[str]) -> List[List[dict]]:
    sentiment_pipeline = current_app.config.get("SENTIMENT_PIPELINE")
    if not sentiment_pipeline:
        logger.error("Sentiment pipeline not loaded.")
        raise RuntimeError("Sentiment analysis service not available")

    raw_results = sentiment_pipeline(comments)
    top_k = current_app.config.get("TOP_K", 0)
    return apply_top_k(raw_results, top_k)


def _get_store():
    return current_app.extensions["wellbeing_store"]


def _validate_settings_patch(payload: dict | None) -> dict:
    if payload is None or not isinstance(payload, dict):
        raise ValidationError("JSON object body is required")

    allowed = {
        "shieldEnabled": bool,
        "shieldThreshold": (int, float),
        "nudgesEnabled": bool,
        "resourcePromptsEnabled": bool,
    }

    patch = {}
    for key, value in payload.items():
        if key not in allowed:
            raise ValidationError(f"Unknown setting '{key}'")
        if not isinstance(value, allowed[key]):
            raise ValidationError(f"Setting '{key}' has invalid type")
        patch[key] = value

    threshold = patch.get("shieldThreshold")
    if threshold is not None and not 0 <= float(threshold) <= 1:
        raise ValidationError("shieldThreshold must be between 0 and 1")

    return patch


def _validate_event(payload: dict | None) -> dict:
    if payload is None or not isinstance(payload, dict):
        raise ValidationError("JSON object body is required")

    required_fields = ["source", "kind", "timestamp", "riskScore"]
    for field in required_fields:
        if field not in payload:
            raise ValidationError(f"'{field}' field is required")

    try:
        datetime.fromisoformat(str(payload["timestamp"]).replace("Z", "+00:00"))
    except ValueError as error:
        raise ValidationError("timestamp must be an ISO 8601 string") from error

    risk_score = float(payload["riskScore"])
    if not 0 <= risk_score <= 1:
        raise ValidationError("riskScore must be between 0 and 1")

    duration_ms = int(payload.get("durationMs") or 0)
    toxic_ratio = float(payload.get("toxicRatio") or 0.0)
    total_comments = int(payload.get("totalComments") or 0)
    if duration_ms < 0:
        raise ValidationError("durationMs must be >= 0")
    if not 0 <= toxic_ratio <= 1:
        raise ValidationError("toxicRatio must be between 0 and 1")
    if total_comments < 0:
        raise ValidationError("totalComments must be >= 0")

    content = payload.get("content")
    if content is not None and len(str(content)) > MAX_COMMENT_LENGTH * 2:
        raise ValidationError("content is too long")

    excerpt = payload.get("excerpt") or (str(content)[:280] if content else None)

    return {
        "source": str(payload["source"]),
        "kind": str(payload["kind"]),
        "timestamp": str(payload["timestamp"]),
        "title": payload.get("title"),
        "url": payload.get("url"),
        "host": payload.get("host"),
        "content": content,
        "excerpt": excerpt,
        "durationMs": duration_ms,
        "riskScore": risk_score,
        "riskBand": payload.get("riskBand") or get_risk_band(risk_score),
        "toxicRatio": toxic_ratio,
        "totalComments": total_comments,
        "topLabel": payload.get("topLabel"),
        "summary": payload.get("summary") or {},
        "predictions": payload.get("predictions") or [],
        "metadata": payload.get("metadata") or {},
    }


def _support_payload(payload: dict | None = None) -> dict:
    locale = request.args.get("locale", (payload or {}).get("locale", ""))
    time_zone = request.args.get("timeZone", (payload or {}).get("timeZone", ""))
    return get_support_resource(locale=locale, time_zone=time_zone)


@api_bp.route("/analyze", methods=["POST"])
def analyze_sentiment() -> Tuple[Response, int]:
    try:
        comments = validate_comments(request.get_json())
        results = _run_analysis(comments)
    except ValidationError as error:
        logger.warning("Validation error: %s", error)
        return jsonify({"error": str(error), "type": "validation_error"}), 400
    except RuntimeError as error:
        return jsonify({"error": str(error), "type": "service_error"}), 500
    except Exception:
        logger.exception("Error during sentiment analysis")
        return (
            jsonify({"error": "Failed to analyze comments", "type": "model_error"}),
            500,
        )

    return (
        jsonify(
            {
                "results": results,
                "metadata": {
                    "total_processed": len(comments),
                    "top_k": current_app.config.get("TOP_K", 0),
                },
            }
        ),
        200,
    )


@api_bp.route("/self-check", methods=["POST"])
def self_check() -> Tuple[Response, int]:
    payload = request.get_json()
    text = (payload or {}).get("text", "")
    try:
        comments = validate_comments({"comments": [text]})
        predictions = _run_analysis(comments)[0]
        metrics = summarize_results([{"text": text, "predictions": predictions}])
        result = metrics["results"][0]

        event = {
            "source": "web",
            "kind": "self_check",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "title": "Manual self-check",
            "content": text,
            "excerpt": text[:280],
            "riskScore": result["riskScore"],
            "riskBand": result["riskBand"],
            "toxicRatio": 1.0 if result["riskScore"] >= HIGH_RISK_SCORE else 0.0,
            "totalComments": 1,
            "topLabel": (
                result["topPrediction"]["label"] if result["topPrediction"] else None
            ),
            "summary": metrics["summary"],
            "predictions": predictions,
            "metadata": {
                "dominantLabel": metrics["dominantLabel"],
                "labelIntensity": metrics["labelIntensity"],
            },
        }
        event_id = _get_store().insert_event(event)
    except ValidationError as error:
        logger.warning("Validation error: %s", error)
        return jsonify({"error": str(error), "type": "validation_error"}), 400
    except RuntimeError as error:
        return jsonify({"error": str(error), "type": "service_error"}), 500
    except Exception:
        logger.exception("Error during self-check")
        return (
            jsonify({"error": "Failed to complete self-check", "type": "model_error"}),
            500,
        )

    return (
        jsonify(
            {
                "eventId": event_id,
                "result": result,
                "metrics": metrics,
                "supportResource": _support_payload(payload),
                "labels": LABELS,
            }
        ),
        200,
    )


@api_bp.route("/events", methods=["POST"])
def ingest_event() -> Tuple[Response, int]:
    try:
        event = _validate_event(request.get_json())
        event_id = _get_store().insert_event(event)
    except ValidationError as error:
        return jsonify({"error": str(error), "type": "validation_error"}), 400

    return jsonify({"eventId": event_id, "status": "ok"}), 201


@api_bp.route("/dashboard", methods=["GET"])
def get_dashboard() -> Tuple[Response, int]:
    store = _get_store()
    history = store.list_events()
    recent_events = store.list_events(limit=10)
    dashboard = summarize_history(history)
    return (
        jsonify(
            {
                "dashboard": dashboard,
                "recentEvents": list(reversed(recent_events)),
                "settings": store.get_settings(),
                "labels": LABELS,
            }
        ),
        200,
    )


@api_bp.route("/settings", methods=["GET", "PUT", "PATCH"])
def settings() -> Tuple[Response, int]:
    store = _get_store()
    if request.method == "GET":
        return (
            jsonify({"settings": store.get_settings(), "defaults": DEFAULT_SETTINGS}),
            200,
        )

    try:
        patch = _validate_settings_patch(request.get_json())
        settings_value = store.save_settings(patch)
    except ValidationError as error:
        return jsonify({"error": str(error), "type": "validation_error"}), 400

    return jsonify({"settings": settings_value}), 200


@api_bp.route("/support-resource", methods=["GET"])
def support_resource() -> Tuple[Response, int]:
    return jsonify({"resource": _support_payload()}), 200


def register_health(app):
    @app.route("/health", methods=["GET"])
    def health_check() -> Tuple[Response, int]:
        pipeline = current_app.config.get("SENTIMENT_PIPELINE")
        model_status = "loaded" if pipeline else "not_loaded"

        return (
            jsonify({"status": "ok", "model": model_status, "version": __version__}),
            200,
        )


def register_product_routes(app):
    @app.route("/", methods=["GET"])
    def index() -> str:
        return render_template("index.html", version=__version__)
