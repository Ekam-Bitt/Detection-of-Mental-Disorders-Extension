from __future__ import annotations

import csv
import json
import random
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from app.v2.taxonomy import SIGNAL_KEYS, SOURCE_PLATFORMS

WEAK_LABEL_TO_SIGNALS: dict[str, list[str]] = {
    "adhd": ["attention_dysregulation"],
    "anxiety": ["anxious_affect"],
    "autism": ["autistic_trait_discussion"],
    "bpd": ["emotional_instability"],
    "depression": ["depressive_affect"],
    "ptsd": ["trauma_stress"],
    "casualconversation": ["no_clear_signal"],
}


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def infer_weak_signals(label: str) -> list[str]:
    return WEAK_LABEL_TO_SIGNALS.get(label.strip().lower(), ["no_clear_signal"])


def prepare_weak_label_examples(
    records: list[dict[str, Any]], source_platform: str
) -> list[dict[str, Any]]:
    if source_platform not in SOURCE_PLATFORMS:
        raise ValueError(f"Unsupported source platform: {source_platform}")

    prepared = []
    for index, row in enumerate(records):
        text = (row.get("text") or row.get("post") or row.get("comment") or "").strip()
        if not text:
            continue
        label = row.get("label") or row.get("subreddit") or "CasualConversation"
        prepared.append(
            {
                "text": text,
                "source_platform": source_platform,
                "thread_id": row.get("thread_id") or row.get("author"),
                "post_id": row.get("post_id") or f"{source_platform}-{index}",
                "label_signals": infer_weak_signals(str(label)),
                "severity": 0 if label == "CasualConversation" else 1,
                "annotator_confidence": 0.35,
                "split": "unassigned",
            }
        )
    return prepared


def sample_annotation_rows(
    rows: list[dict[str, Any]],
    *,
    sample_size: int,
    seed: int = 42,
) -> list[dict[str, Any]]:
    by_signal: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        for signal in row.get("label_signals", ["no_clear_signal"]):
            by_signal[signal].append(row)

    rng = random.Random(seed)
    sampled: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    per_signal = max(1, sample_size // max(1, len(by_signal)))

    for signal, signal_rows in by_signal.items():
        candidates = signal_rows[:]
        rng.shuffle(candidates)
        for row in candidates:
            post_id = str(row["post_id"])
            if post_id in seen_ids:
                continue
            sampled.append(
                {
                    **row,
                    "annotation_signal_hint": signal,
                    "annotation_notes": "",
                }
            )
            seen_ids.add(post_id)
            if (
                len(
                    [
                        item
                        for item in sampled
                        if item["annotation_signal_hint"] == signal
                    ]
                )
                >= per_signal
            ):
                break

    if len(sampled) < sample_size:
        remaining = [row for row in rows if str(row["post_id"]) not in seen_ids]
        rng.shuffle(remaining)
        for row in remaining[: sample_size - len(sampled)]:
            sampled.append(
                {**row, "annotation_signal_hint": "", "annotation_notes": ""}
            )

    return sampled[:sample_size]


def build_final_dataset(
    rows: list[dict[str, Any]],
    *,
    cross_platform_holdout: str,
) -> list[dict[str, Any]]:
    if cross_platform_holdout not in SOURCE_PLATFORMS:
        raise ValueError("Cross-platform holdout must be one of the supported sources")

    split_buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        normalized = normalize_text(row["text"])
        if not normalized:
            continue

        row = {
            **row,
            "label_signals": sorted(
                {
                    signal
                    for signal in row.get("label_signals", [])
                    if signal in SIGNAL_KEYS
                }
                or {"no_clear_signal"}
            ),
            "severity": int(row.get("severity", 0)),
            "annotator_confidence": float(row.get("annotator_confidence", 0.0)),
            "normalized_text": normalized,
        }

        if row["source_platform"] == cross_platform_holdout:
            row["split"] = "cross_platform_test"
            split_buckets["cross_platform_test"].append(row)
            continue

        bucket_key = str(row.get("thread_id") or row.get("post_id"))
        split_buckets[bucket_key].append(row)

    final_rows: list[dict[str, Any]] = []
    train_turn = 0
    for bucket_key, bucket_rows in split_buckets.items():
        if bucket_key == "cross_platform_test":
            final_rows.extend(bucket_rows)
            continue

        split = "train"
        if train_turn % 10 == 8:
            split = "validation"
        elif train_turn % 10 == 9:
            split = "test"
        train_turn += 1

        for row in bucket_rows:
            row["split"] = split
            final_rows.append(row)

    return final_rows


def validate_split_integrity(rows: list[dict[str, Any]]) -> dict[str, Any]:
    duplicate_texts: dict[str, set[str]] = defaultdict(set)
    thread_splits: dict[str, set[str]] = defaultdict(set)
    post_splits: dict[str, set[str]] = defaultdict(set)
    split_counts = Counter()

    for row in rows:
        split = row["split"]
        split_counts[split] += 1
        duplicate_texts[row["normalized_text"]].add(split)
        if row.get("thread_id"):
            thread_splits[str(row["thread_id"])].add(split)
        if row.get("post_id"):
            post_splits[str(row["post_id"])].add(split)

    duplicate_leaks = sorted(
        text for text, splits in duplicate_texts.items() if len(splits) > 1
    )
    thread_leaks = sorted(
        key for key, splits in thread_splits.items() if len(splits) > 1
    )
    post_leaks = sorted(key for key, splits in post_splits.items() if len(splits) > 1)

    label_distribution = Counter()
    severity_distribution = Counter()
    for row in rows:
        for label in row["label_signals"]:
            label_distribution[label] += 1
        severity_distribution[int(row["severity"])] += 1

    return {
        "split_counts": dict(split_counts),
        "duplicate_text_leaks": duplicate_leaks,
        "thread_leaks": thread_leaks,
        "post_leaks": post_leaks,
        "label_distribution": dict(label_distribution),
        "severity_distribution": dict(severity_distribution),
        "is_valid": not duplicate_leaks and not thread_leaks and not post_leaks,
    }


def write_jsonl(path: str | Path, rows: list[dict[str, Any]]) -> None:
    target = Path(path)
    with target.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=True) + "\n")


def read_csv_rows(path: str | Path) -> list[dict[str, Any]]:
    with Path(path).open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))
