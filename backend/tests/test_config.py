from app.config import AppConfig


class TestAppConfig:
    """Test application configuration."""

    def test_from_env_uses_defaults(self):
        """AppConfig should use environment defaults."""
        config = AppConfig.from_env()
        assert config.model_path == "ekam28/emotion-detector"
        assert config.v2_model_path == "ekam28/emotion-detector"
        assert config.top_k == 7
        assert config.torch_num_threads == 1
        assert config.min_comments_for_summary == 5
        assert config.evidence_comments_per_signal == 3

    def test_from_env_respects_env_vars(self, monkeypatch):
        """AppConfig should respect environment variables."""
        monkeypatch.setenv("MODEL_ID", "test-model")
        monkeypatch.setenv("V2_MODEL_ID", "test-v2-model")
        monkeypatch.setenv("ONNX_MODEL_PATH", "/tmp/student")
        monkeypatch.setenv("TOP_K", "5")
        monkeypatch.setenv("TORCH_NUM_THREADS", "4")
        monkeypatch.setenv("MIN_COMMENTS_FOR_SUMMARY", "8")
        monkeypatch.setenv("EVIDENCE_COMMENTS_PER_SIGNAL", "2")
        config = AppConfig.from_env()
        assert config.model_path == "test-model"
        assert config.v2_model_path == "test-v2-model"
        assert config.onnx_model_path == "/tmp/student"
        assert config.top_k == 5
        assert config.torch_num_threads == 4
        assert config.min_comments_for_summary == 8
        assert config.evidence_comments_per_signal == 2

    def test_to_flask_config_returns_dict(self):
        """to_flask_config should return a dictionary."""
        config = AppConfig.from_env()
        flask_config = config.to_flask_config()
        assert isinstance(flask_config, dict)
        assert "MODEL_PATH" in flask_config
        assert "V2_MODEL_PATH" in flask_config
        assert "ONNX_MODEL_PATH" in flask_config
        assert "TOP_K" in flask_config
        assert "TORCH_NUM_THREADS" in flask_config
