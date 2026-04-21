from __future__ import annotations

import math
import time
from typing import Any

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    roc_auc_score,
)

from app.v2.taxonomy import SEVERITY_LABELS, SIGNAL_KEYS


def _to_multihot(labels: list[list[str]]) -> list[list[int]]:
    return [[1 if signal in row else 0 for signal in SIGNAL_KEYS] for row in labels]


def compute_signal_metrics(
    true_labels: list[list[str]],
    predicted_scores: list[dict[str, float]],
    *,
    threshold: float = 0.5,
) -> dict[str, Any]:
    y_true = _to_multihot(true_labels)
    y_score = [
        [float(row.get(signal, 0.0)) for signal in SIGNAL_KEYS]
        for row in predicted_scores
    ]
    y_pred = [[1 if score >= threshold else 0 for score in row] for row in y_score]

    metrics: dict[str, Any] = {
        "macro_f1": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "micro_f1": float(f1_score(y_true, y_pred, average="micro", zero_division=0)),
        "per_label": classification_report(
            y_true,
            y_pred,
            target_names=list(SIGNAL_KEYS),
            output_dict=True,
            zero_division=0,
        ),
    }

    try:
        metrics["auroc"] = {
            signal: float(
                roc_auc_score(
                    [row[index] for row in y_true],
                    [row[index] for row in y_score],
                )
            )
            for index, signal in enumerate(SIGNAL_KEYS)
        }
    except ValueError:
        metrics["auroc"] = {}

    return metrics


def compute_severity_metrics(
    true_severity: list[int],
    predicted_severity: list[int],
) -> dict[str, Any]:
    labels = sorted(SEVERITY_LABELS)
    matrix = confusion_matrix(true_severity, predicted_severity, labels=labels)
    return {
        "macro_f1": float(
            f1_score(
                true_severity, predicted_severity, average="macro", zero_division=0
            )
        ),
        "confusion_matrix": matrix.tolist(),
        "labels": [SEVERITY_LABELS[label] for label in labels],
    }


def expected_calibration_error(
    confidences: list[float],
    correctness: list[int],
    *,
    bins: int = 10,
) -> float:
    if not confidences or not correctness or len(confidences) != len(correctness):
        return 0.0

    bucket_totals = [0] * bins
    bucket_confidence = [0.0] * bins
    bucket_accuracy = [0.0] * bins

    for confidence, correct in zip(confidences, correctness):
        index = min(bins - 1, math.floor(max(0.0, min(0.9999, confidence)) * bins))
        bucket_totals[index] += 1
        bucket_confidence[index] += confidence
        bucket_accuracy[index] += int(correct)

    sample_count = len(confidences)
    error = 0.0
    for index in range(bins):
        if bucket_totals[index] == 0:
            continue
        avg_confidence = bucket_confidence[index] / bucket_totals[index]
        avg_accuracy = bucket_accuracy[index] / bucket_totals[index]
        error += (bucket_totals[index] / sample_count) * abs(
            avg_accuracy - avg_confidence
        )
    return float(error)


def benchmark_callable_latency(
    fn: Any,
    payloads: list[Any],
) -> dict[str, float]:
    if not payloads:
        return {"count": 0, "mean_ms": 0.0, "max_ms": 0.0}

    durations = []
    for payload in payloads:
        start = time.perf_counter()
        fn(payload)
        durations.append((time.perf_counter() - start) * 1000.0)

    return {
        "count": float(len(durations)),
        "mean_ms": round(sum(durations) / len(durations), 4),
        "max_ms": round(max(durations), 4),
    }
