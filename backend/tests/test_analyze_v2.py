class _SignalPipeline:
    backend_name = "test_v2_pipeline"

    def analyze(self, comments):
        results = []
        for comment in comments:
            text = comment["text"]
            if "panic" in text.lower():
                top_signal = {
                    "key": "anxious_affect",
                    "display_name": "Anxious Affect",
                    "score": 0.87,
                }
                signals = [
                    top_signal,
                    {
                        "key": "no_clear_signal",
                        "display_name": "No Clear Signal",
                        "score": 0.13,
                    },
                ]
                severity = {"level": 2, "label": "moderate", "score": 0.87}
            else:
                top_signal = {
                    "key": "no_clear_signal",
                    "display_name": "No Clear Signal",
                    "score": 0.73,
                }
                signals = [
                    {
                        "key": "depressive_affect",
                        "display_name": "Depressive Affect",
                        "score": 0.21,
                    },
                    top_signal,
                ]
                severity = {"level": 0, "label": "none", "score": 0.73}

            results.append(
                {
                    "text": text,
                    "source_platform": comment["source_platform"],
                    "thread_id": comment.get("thread_id"),
                    "post_id": comment.get("post_id"),
                    "timestamp": comment.get("timestamp"),
                    "signals": signals,
                    "top_signal": top_signal,
                    "severity": severity,
                    "confidence": top_signal["score"],
                    "uncertainty": {"level": "low", "score": 0.12, "entropy": 0.4},
                }
            )
        return results


class TestAnalyzeV2Endpoint:
    def test_v2_requires_comments(self, client):
        response = client.post("/api/v2/analyze/comments", json={})
        assert response.status_code == 400
        data = response.get_json()
        assert data["type"] == "validation_error"

    def test_v2_requires_valid_source_platform(self, client):
        response = client.post(
            "/api/v2/analyze/comments",
            json={"comments": [{"text": "test", "source_platform": "facebook"}]},
        )
        assert response.status_code == 400
        data = response.get_json()
        assert "source_platform" in data["error"]

    def test_v2_service_unavailable_without_pipeline(self, client):
        response = client.post(
            "/api/v2/analyze/comments",
            json={"comments": [{"text": "test", "source_platform": "youtube"}]},
        )
        assert response.status_code == 500
        data = response.get_json()
        assert data["type"] == "service_error"

    def test_v2_success_returns_comment_level_and_page_level_fields(self, app):
        app.config["SIGNAL_PIPELINE_V2"] = _SignalPipeline()
        client = app.test_client()

        response = client.post(
            "/api/v2/analyze/comments",
            json={
                "comments": [
                    {
                        "text": "I am having a panic attack again today",
                        "source_platform": "youtube",
                        "thread_id": "abc123",
                    },
                    {
                        "text": "This is just a general reaction comment",
                        "source_platform": "youtube",
                        "thread_id": "abc123",
                    },
                ]
            },
        )
        assert response.status_code == 200

        data = response.get_json()
        assert len(data["comments"]) == 2
        assert data["metadata"]["backend"] == "test_v2_pipeline"
        assert data["metadata"]["task"] == "mental_health_signal_analysis_v2"
        assert data["page_summary"]["comment_count"] == 2
        assert "dominant_signals" in data["page_summary"]
        assert "evidence" in data
        assert "anxious_affect" in data["evidence"]
        assert data["comments"][0]["top_signal"]["key"] == "anxious_affect"

    def test_v2_short_pages_mark_insufficient_evidence(self, app):
        app.config["SIGNAL_PIPELINE_V2"] = _SignalPipeline()
        client = app.test_client()

        response = client.post(
            "/api/v2/analyze/comments",
            json={
                "comments": [
                    {"text": "panic again", "source_platform": "x"},
                ]
            },
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["page_summary"]["insufficient_evidence"] is True
