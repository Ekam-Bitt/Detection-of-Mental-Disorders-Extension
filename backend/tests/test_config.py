from app.config import AppConfig


class TestAppConfig:
    """Test application configuration."""

    def test_from_env_uses_defaults(self):
        """AppConfig should use environment defaults."""
        config = AppConfig.from_env()
        assert config.model_path == "onnx_model_quantized"
        assert config.top_k == 7

    def test_from_env_respects_env_vars(self, monkeypatch):
        """AppConfig should respect environment variables."""
        monkeypatch.setenv("MODEL_PATH", "test-model")
        monkeypatch.setenv("TOP_K", "5")
        config = AppConfig.from_env()
        assert config.model_path == "test-model"
        assert config.top_k == 5

    def test_to_flask_config_returns_dict(self):
        """to_flask_config should return a dictionary."""
        config = AppConfig.from_env()
        flask_config = config.to_flask_config()
        assert isinstance(flask_config, dict)
        assert "MODEL_PATH" in flask_config
        assert "TOP_K" in flask_config
