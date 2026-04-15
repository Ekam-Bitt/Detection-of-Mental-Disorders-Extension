class TestHealthEndpoint:
    """Test health check endpoint."""

    def test_health_returns_200(self, client):
        """Health endpoint should return 200 status."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_returns_status_ok(self, client):
        """Health endpoint should return status ok."""
        response = client.get("/health")
        data = response.get_json()
        assert data["status"] == "ok"

    def test_health_returns_model_info(self, client):
        """Health endpoint should return model information."""
        response = client.get("/health")
        data = response.get_json()
        assert "model" in data
        assert data["model"] in ["loaded", "not_loaded"]

    def test_health_returns_version(self, client):
        """Health endpoint should return version."""
        response = client.get("/health")
        data = response.get_json()
        assert "version" in data
