from app.inference import apply_top_k


class TestAnalyzeEndpoint:
    """Test text analysis endpoint."""

    def test_analyze_requires_post(self, client):
        """Analyze endpoint should only accept POST requests."""
        response = client.get("/api/analyze")
        assert response.status_code == 405

    def test_analyze_requires_comments(self, client):
        """Analyze endpoint should require comments field."""
        response = client.post("/api/analyze", json={})
        assert response.status_code == 400
        data = response.get_json()
        assert "error" in data
        assert "validation_error" in data["type"]

    def test_analyze_requires_list(self, client):
        """Analyze endpoint should require comments to be a list."""
        response = client.post("/api/analyze", json={"comments": "not a list"})
        assert response.status_code == 400
        data = response.get_json()
        assert "must be a list" in data["error"]

    def test_analyze_rejects_too_many_comments(self, client):
        """Analyze endpoint should reject requests with too many comments."""
        response = client.post("/api/analyze", json={"comments": ["test"] * 101})
        assert response.status_code == 400
        data = response.get_json()
        assert "Too many comments" in data["error"]

    def test_analyze_rejects_long_comments(self, client):
        """Analyze endpoint should reject overly long comments."""
        long_comment = "test " * 2000
        response = client.post("/api/analyze", json={"comments": [long_comment]})
        assert response.status_code == 400
        data = response.get_json()
        assert "exceeds max length" in data["error"]

    def test_analyze_service_unavailable_when_pipeline_missing(self, client):
        """Analyze endpoint should return 500 when the model is not loaded."""
        response = client.post(
            "/api/analyze", json={"comments": ["I feel anxious today"]}
        )
        # conftest sets SENTIMENT_PIPELINE = None, so service is unavailable
        assert response.status_code == 500
        data = response.get_json()
        assert "error" in data
        assert data["type"] == "service_error"

    def test_analyze_error_body_is_well_formed(self, client):
        """Error responses must always contain 'error' and 'type' fields."""
        response = client.post("/api/analyze", json={"comments": ["test comment"]})
        assert response.status_code == 500
        data = response.get_json()
        assert "error" in data
        assert "type" in data

    def test_analyze_success_with_mock_pipeline(self, app):
        """Analyze endpoint returns results and metadata when pipeline is loaded."""
        # fmt: off
        mock_pipeline = lambda texts: [  # noqa: E731
            [
                {"label": "LABEL_4", "score": 0.85},
                {"label": "LABEL_1", "score": 0.10},
                {"label": "LABEL_6", "score": 0.05},
            ]
            for _ in texts
        ]
        # fmt: on
        app.config["SENTIMENT_PIPELINE"] = mock_pipeline
        app.config["TOP_K"] = 3
        client = app.test_client()

        response = client.post(
            "/api/analyze", json={"comments": ["I feel really down today"]}
        )
        assert response.status_code == 200
        data = response.get_json()

        assert "results" in data
        assert len(data["results"]) == 1
        assert len(data["results"][0]) == 3  # top_k=3

        assert "metadata" in data
        assert data["metadata"]["total_processed"] == 1
        assert data["metadata"]["top_k"] == 3

    def test_analyze_top_k_trims_results(self, app):
        """apply_top_k restricts results to the highest-scoring labels."""
        mock_pipeline = lambda texts: [  # noqa: E731
            [
                {"label": "LABEL_4", "score": 0.85},
                {"label": "LABEL_1", "score": 0.10},
                {"label": "LABEL_6", "score": 0.05},
                {"label": "LABEL_0", "score": 0.00},
            ]
            for _ in texts
        ]
        app.config["SENTIMENT_PIPELINE"] = mock_pipeline
        app.config["TOP_K"] = 2
        client = app.test_client()

        response = client.post("/api/analyze", json={"comments": ["test"]})
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["results"][0]) == 2
        assert data["results"][0][0]["label"] == "LABEL_4"  # highest score first


class TestApplyTopK:
    """Unit tests for the apply_top_k helper."""

    _groups = [
        [
            {"label": "LABEL_6", "score": 0.05},
            {"label": "LABEL_4", "score": 0.85},
            {"label": "LABEL_1", "score": 0.10},
        ]
    ]

    def test_returns_top_k_sorted_descending(self):
        result = apply_top_k(self._groups, top_k=2)
        assert len(result[0]) == 2
        assert result[0][0]["label"] == "LABEL_4"
        assert result[0][1]["label"] == "LABEL_1"

    def test_zero_top_k_returns_all(self):
        result = apply_top_k(self._groups, top_k=0)
        assert len(result[0]) == 3

    def test_top_k_larger_than_group_returns_all(self):
        result = apply_top_k(self._groups, top_k=10)
        assert len(result[0]) == 3

    def test_multiple_groups(self):
        groups = [
            [{"label": "A", "score": 0.9}, {"label": "B", "score": 0.1}],
            [{"label": "C", "score": 0.5}, {"label": "D", "score": 0.5}],
        ]
        result = apply_top_k(groups, top_k=1)
        assert len(result) == 2
        assert len(result[0]) == 1
        assert len(result[1]) == 1

    def test_negative_top_k_returns_all(self):
        result = apply_top_k(self._groups, top_k=-1)
        assert len(result[0]) == 3

    def test_empty_input(self):
        assert apply_top_k([], top_k=3) == []
