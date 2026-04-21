class TestProductRoutes:
    def test_homepage_renders(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert b"Mental Wellbeing Guard" in response.data

    def test_settings_get_returns_defaults(self, client):
        response = client.get("/api/settings")
        assert response.status_code == 200
        data = response.get_json()
        assert data["settings"]["shieldEnabled"] is True
        assert 0 <= data["settings"]["shieldThreshold"] <= 1

    def test_settings_patch_persists(self, client):
        response = client.patch(
            "/api/settings",
            json={"shieldEnabled": False, "shieldThreshold": 0.8},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["settings"]["shieldEnabled"] is False
        assert data["settings"]["shieldThreshold"] == 0.8

        again = client.get("/api/settings").get_json()
        assert again["settings"]["shieldEnabled"] is False
        assert again["settings"]["shieldThreshold"] == 0.8

    def test_event_ingestion_updates_dashboard(self, client):
        response = client.post(
            "/api/events",
            json={
                "source": "extension",
                "kind": "browsing_session",
                "timestamp": "2026-04-22T12:00:00",
                "title": "YouTube thread",
                "riskScore": 0.74,
                "durationMs": 180000,
                "toxicRatio": 0.55,
                "totalComments": 24,
                "topLabel": "LABEL_4",
                "summary": {"LABEL_4": 8, "LABEL_6": 4},
            },
        )
        assert response.status_code == 201

        dashboard = client.get("/api/dashboard")
        assert dashboard.status_code == 200
        data = dashboard.get_json()
        assert data["dashboard"]["totalMinutes"] == 3
        assert data["dashboard"]["sourceBreakdown"]["extension"]["count"] == 1
        assert data["recentEvents"][-1]["title"] == "YouTube thread"

    def test_self_check_uses_model_and_persists(self, app):
        mock_pipeline = lambda texts: [  # noqa: E731
            [
                {"label": "LABEL_4", "score": 0.76},
                {"label": "LABEL_1", "score": 0.14},
                {"label": "LABEL_6", "score": 0.10},
            ]
            for _ in texts
        ]
        app.config["SENTIMENT_PIPELINE"] = mock_pipeline
        client = app.test_client()

        response = client.post(
            "/api/self-check",
            json={"text": "I feel overwhelmed and deeply hopeless today."},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["result"]["riskScore"] > 0
        assert data["metrics"]["totalComments"] == 1
        assert data["supportResource"]["name"]

        dashboard = client.get("/api/dashboard").get_json()
        assert dashboard["dashboard"]["manualCheckCount"] == 1
        assert dashboard["recentEvents"][-1]["kind"] == "self_check"
