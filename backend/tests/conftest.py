import pytest
from unittest.mock import patch
from app import create_app


@pytest.fixture
def app(tmp_path, monkeypatch):
    """Create application for testing with the model pipeline mocked out."""
    monkeypatch.setenv("WELLBEING_DB_PATH", str(tmp_path / "wellbeing.db"))
    with patch("app.load_pipeline", return_value=None):
        application = create_app()
    application.config["TESTING"] = True
    application.config["SENTIMENT_PIPELINE"] = None
    yield application


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()
