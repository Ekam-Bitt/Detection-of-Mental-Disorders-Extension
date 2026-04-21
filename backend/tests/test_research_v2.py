from app.research.data_v2 import (
    build_final_dataset,
    prepare_weak_label_examples,
    validate_split_integrity,
)


class TestResearchDataV2:
    def test_prepare_weak_label_examples_maps_reddit_labels(self):
        rows = [
            {"text": "I keep spiraling", "subreddit": "anxiety", "author": "user-a"},
            {"text": "just hanging out", "subreddit": "CasualConversation"},
        ]
        prepared = prepare_weak_label_examples(rows, "reddit")

        assert prepared[0]["label_signals"] == ["anxious_affect"]
        assert prepared[1]["label_signals"] == ["no_clear_signal"]

    def test_build_final_dataset_creates_cross_platform_holdout(self):
        rows = [
            {
                "text": "youtube sample",
                "source_platform": "youtube",
                "thread_id": "yt-1",
                "post_id": "yt-a",
                "label_signals": ["anxious_affect"],
                "severity": 1,
                "annotator_confidence": 0.9,
            },
            {
                "text": "reddit sample",
                "source_platform": "reddit",
                "thread_id": "rd-1",
                "post_id": "rd-a",
                "label_signals": ["depressive_affect"],
                "severity": 2,
                "annotator_confidence": 0.8,
            },
            {
                "text": "reddit sample second",
                "source_platform": "reddit",
                "thread_id": "rd-2",
                "post_id": "rd-b",
                "label_signals": ["no_clear_signal"],
                "severity": 0,
                "annotator_confidence": 0.7,
            },
        ]

        dataset = build_final_dataset(rows, cross_platform_holdout="youtube")
        youtube_row = next(
            row for row in dataset if row["source_platform"] == "youtube"
        )
        assert youtube_row["split"] == "cross_platform_test"
        assert any(
            row["split"] == "train"
            for row in dataset
            if row["source_platform"] == "reddit"
        )

    def test_validate_split_integrity_detects_duplicate_text_leaks(self):
        rows = [
            {
                "text": "same",
                "normalized_text": "same",
                "split": "train",
                "thread_id": "a",
                "post_id": "1",
                "label_signals": ["anxious_affect"],
                "severity": 1,
            },
            {
                "text": "same",
                "normalized_text": "same",
                "split": "test",
                "thread_id": "b",
                "post_id": "2",
                "label_signals": ["anxious_affect"],
                "severity": 1,
            },
        ]

        report = validate_split_integrity(rows)
        assert report["is_valid"] is False
        assert report["duplicate_text_leaks"] == ["same"]
