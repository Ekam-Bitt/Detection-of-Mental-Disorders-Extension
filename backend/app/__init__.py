import logging
import os

from flask import Flask
from flask_cors import CORS

from .config import AppConfig
from .inference import load_pipeline
from .routes import api_bp, register_health


def create_app() -> Flask:
    app = Flask(__name__)

    allowed_origins = os.getenv(
        "ALLOWED_ORIGINS", "chrome-extension://*,moz-extension://*"
    ).split(",")
    CORS(app, origins=allowed_origins)

    app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", "1048576"))

    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    app.logger.setLevel(logging.getLevelName(os.getenv("LOG_LEVEL", "INFO")))

    config = AppConfig.from_env()
    app.config.update(config.to_flask_config())

    sentiment_pipeline = load_pipeline(config)
    app.config["SENTIMENT_PIPELINE"] = sentiment_pipeline

    app.register_blueprint(api_bp)
    register_health(app)

    return app
