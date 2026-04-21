import logging
from typing import Any

from flask import Blueprint, Response, current_app, jsonify, request

from .inference import apply_top_k
from .v2.service import build_page_summary
from .v2.taxonomy import SIGNAL_DEFINITIONS, SOURCE_PLATFORMS

__version__ = "2.0.0"

api_bp = Blueprint("api", __name__, url_prefix="/api")
logger = logging.getLogger("api")

MAX_COMMENT_LENGTH = 5000
MAX_COMMENTS_PER_REQUEST = 100


class ValidationError(Exception):
    pass


class ModelError(Exception):
    pass


def validate_comments(data: dict[str, Any]) -> list[str]:
    if not data or "comments" not in data:
        raise ValidationError("'comments' field is required")

    comments = data["comments"]
    if not isinstance(comments, list):
        raise ValidationError("'comments' must be a list")

    if len(comments) > MAX_COMMENTS_PER_REQUEST:
        raise ValidationError(f"Too many comments (max {MAX_COMMENTS_PER_REQUEST})")

    for i, comment in enumerate(comments):
        if not isinstance(comment, str):
            raise ValidationError(f"Comment {i} must be a string")
        if len(comment) > MAX_COMMENT_LENGTH:
            raise ValidationError(
                f"Comment {i} exceeds max length ({MAX_COMMENT_LENGTH} chars)"
            )
        if not comment.strip():
            raise ValidationError(f"Comment {i} is empty")

    return comments


def validate_v2_comments(data: dict[str, Any]) -> list[dict[str, Any]]:
    if not data or "comments" not in data:
        raise ValidationError("'comments' field is required")

    comments = data["comments"]
    if not isinstance(comments, list):
        raise ValidationError("'comments' must be a list")
    if len(comments) > MAX_COMMENTS_PER_REQUEST:
        raise ValidationError(f"Too many comments (max {MAX_COMMENTS_PER_REQUEST})")

    validated = []
    for index, item in enumerate(comments):
        if not isinstance(item, dict):
            raise ValidationError(f"Comment {index} must be an object")

        text = item.get("text")
        if not isinstance(text, str):
            raise ValidationError(f"Comment {index} text must be a string")
        if len(text) > MAX_COMMENT_LENGTH:
            raise ValidationError(
                f"Comment {index} exceeds max length ({MAX_COMMENT_LENGTH} chars)"
            )
        if not text.strip():
            raise ValidationError(f"Comment {index} is empty")

        source_platform = item.get("source_platform", "reddit")
        if source_platform == "twitter":
            source_platform = "x"
        if source_platform not in SOURCE_PLATFORMS:
            raise ValidationError(
                f"Comment {index} source_platform must be one of "
                f"{sorted(SOURCE_PLATFORMS)}"
            )

        validated.append(
            {
                "text": text.strip(),
                "source_platform": source_platform,
                "thread_id": item.get("thread_id"),
                "post_id": item.get("post_id"),
                "timestamp": item.get("timestamp"),
            }
        )

    return validated


@api_bp.route("/analyze", methods=["POST"])
def analyze_sentiment() -> tuple[Response, int]:
    try:
        data = request.get_json()
        comments = validate_comments(data)
    except ValidationError as e:
        logger.warning("Validation error: %s", e)
        return jsonify({"error": str(e), "type": "validation_error"}), 400

    sentiment_pipeline = current_app.config.get("SENTIMENT_PIPELINE")
    if not sentiment_pipeline:
        logger.error("Sentiment pipeline not loaded.")
        return (
            jsonify(
                {
                    "error": "Sentiment analysis service not available",
                    "type": "service_error",
                }
            ),
            500,
        )

    try:
        raw_results = sentiment_pipeline(comments)
        top_k = current_app.config.get("TOP_K", 0)
        results = apply_top_k(raw_results, top_k)
        return (
            jsonify(
                {
                    "results": results,
                    "metadata": {
                        "total_processed": len(comments),
                        "top_k": top_k,
                    },
                }
            ),
            200,
        )
    except Exception:
        logger.exception("Error during sentiment analysis")
        return (
            jsonify({"error": "Failed to analyze comments", "type": "model_error"}),
            500,
        )


@api_bp.route("/v2/analyze/comments", methods=["POST"])
def analyze_signal_comments() -> tuple[Response, int]:
    try:
        data = request.get_json()
        comments = validate_v2_comments(data)
    except ValidationError as exc:
        logger.warning("Validation error: %s", exc)
        return jsonify({"error": str(exc), "type": "validation_error"}), 400

    signal_pipeline = current_app.config.get("SIGNAL_PIPELINE_V2")
    if not signal_pipeline:
        logger.error("V2 signal pipeline not loaded.")
        return (
            jsonify(
                {
                    "error": "Mental-health signal service not available",
                    "type": "service_error",
                }
            ),
            500,
        )

    try:
        comment_analyses = signal_pipeline.analyze(comments)
        page_summary, evidence = build_page_summary(
            comment_analyses,
            min_comments=current_app.config.get("MIN_COMMENTS_FOR_SUMMARY", 5),
            evidence_per_signal=current_app.config.get(
                "EVIDENCE_COMMENTS_PER_SIGNAL", 3
            ),
        )
        return (
            jsonify(
                {
                    "comments": comment_analyses,
                    "page_summary": page_summary,
                    "evidence": evidence,
                    "metadata": {
                        "total_processed": len(comments),
                        "signal_labels": [
                            {
                                "key": definition.key,
                                "display_name": definition.display_name,
                                "description": definition.description,
                            }
                            for definition in SIGNAL_DEFINITIONS
                        ],
                        "backend": signal_pipeline.backend_name,
                        "task": "mental_health_signal_analysis_v2",
                        "disclaimer": (
                            "This tool surfaces mental-health-related language "
                            "signals in public text and is not a diagnostic system."
                        ),
                    },
                }
            ),
            200,
        )
    except Exception:
        logger.exception("Error during v2 signal analysis")
        return (
            jsonify(
                {
                    "error": "Failed to analyze comments with v2 signal pipeline",
                    "type": "model_error",
                }
            ),
            500,
        )


def register_health(app):
    @app.route("/health", methods=["GET"])
    def health_check() -> tuple[Response, int]:
        pipeline = current_app.config.get("SENTIMENT_PIPELINE")
        model_status = "loaded" if pipeline else "not_loaded"

        return (
            jsonify({"status": "ok", "model": model_status, "version": __version__}),
            200,
        )
