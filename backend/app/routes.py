import logging
from typing import Any

from flask import Blueprint, Response, current_app, jsonify, request

from .inference import apply_top_k

__version__ = "1.1.3"

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


def register_health(app):
    @app.route("/health", methods=["GET"])
    def health_check() -> tuple[Response, int]:
        pipeline = current_app.config.get("SENTIMENT_PIPELINE")
        model_status = "loaded" if pipeline else "not_loaded"

        return (
            jsonify({"status": "ok", "model": model_status, "version": __version__}),
            200,
        )
