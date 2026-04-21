from unittest.mock import patch

import pytest
from app import create_app


@pytest.fixture
def app():
    """Create application for testing with the model pipeline mocked out."""
    with patch("app.load_pipeline", return_value=None):
        application = create_app()
    application.config["TESTING"] = True
    application.config["SENTIMENT_PIPELINE"] = None
    yield application


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()
