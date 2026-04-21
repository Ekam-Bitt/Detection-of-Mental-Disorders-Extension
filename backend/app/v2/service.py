from __future__ import annotations

import math
import re
from typing import Any

from .taxonomy import (
    LEGACY_LABEL_TO_SIGNAL,
    SEVERITY_LABELS,
    SIGNAL_DISPLAY_NAMES,
    SIGNAL_KEYS,
)

CRISIS_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"\bkill myself\b",
        r"\bend my life\b",
        r"\bsuicid(?:e|al)\b",
        r"\bself[- ]harm\b",
        r"\bhurt myself\b",
        r"\bcut myself\b",
    )
)


def empty_signal_scores() -> dict[str, float]:
    return {signal: 0.0 for signal in SIGNAL_KEYS}


def clamp_score(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def normalize_signal_scores(raw_scores: dict[str, float]) -> dict[str, float]:
    scores = empty_signal_scores()
    for key, value in raw_scores.items():
        if key in scores:
            scores[key] = clamp_score(value)

    non_clear = scores["no_clear_signal"]
    competing = max(
        scores[key] for key in SIGNAL_KEYS if key not in {"no_clear_signal"}
    )
    if competing > non_clear:
        scores["no_clear_signal"] = max(0.0, 1.0 - competing)
    return scores


def legacy_predictions_to_signal_scores(
    predictions: list[dict[str, Any]], text: str
) -> dict[str, float]:
    scores = empty_signal_scores()

    for item in predictions:
        label = item.get("label")
        score = item.get("score", 0.0)
        signal_key = LEGACY_LABEL_TO_SIGNAL.get(label, label)
        if signal_key in scores:
            scores[signal_key] = clamp_score(score)

    crisis_bonus = crisis_signal_boost(text)
    if crisis_bonus > 0.0:
        scores["crisis_self_harm"] = max(scores["crisis_self_harm"], crisis_bonus)
        scores["no_clear_signal"] = min(scores["no_clear_signal"], 1.0 - crisis_bonus)

    return normalize_signal_scores(scores)


def crisis_signal_boost(text: str) -> float:
    normalized_text = text.strip()
    for pattern in CRISIS_PATTERNS:
        if pattern.search(normalized_text):
            return 0.92
    return 0.0


def compute_confidence(scores: dict[str, float]) -> float:
    ordered = sorted(scores.values(), reverse=True)
    top = ordered[0]
    second = ordered[1] if len(ordered) > 1 else 0.0
    margin = max(0.0, top - second)
    confidence = 0.6 * top + 0.4 * margin
    return clamp_score(confidence)


def compute_uncertainty(scores: dict[str, float]) -> dict[str, Any]:
    ordered = sorted(scores.values(), reverse=True)
    top = ordered[0]
    second = ordered[1] if len(ordered) > 1 else 0.0
    confidence = compute_confidence(scores)
    entropy = 0.0
    total = sum(scores.values())
    if total > 0:
        for score in scores.values():
            if score <= 0:
                continue
            prob = score / total
            entropy -= prob * math.log(prob, 2)

    if confidence >= 0.72 and (top - second) >= 0.18:
        level = "low"
    elif confidence >= 0.48:
        level = "medium"
    else:
        level = "high"

    return {
        "level": level,
        "score": round(clamp_score(1.0 - confidence), 4),
        "entropy": round(entropy, 4),
    }


def derive_severity(scores: dict[str, float]) -> dict[str, Any]:
    crisis = scores["crisis_self_harm"]
    top_signal = top_signal_key(scores)
    top_score = scores[top_signal]

    if crisis >= 0.75:
        level = 3
    elif top_score >= 0.72 and top_signal != "no_clear_signal":
        level = 3
    elif top_score >= 0.52 and top_signal != "no_clear_signal":
        level = 2
    elif top_score >= 0.28 and top_signal != "no_clear_signal":
        level = 1
    else:
        level = 0

    return {
        "level": level,
        "label": SEVERITY_LABELS[level],
        "score": round(max(crisis, top_score), 4),
    }


def top_signal_key(scores: dict[str, float]) -> str:
    return max(scores, key=scores.get)


def build_comment_analysis(
    comment: dict[str, Any], signal_scores: dict[str, float]
) -> dict[str, Any]:
    normalized = normalize_signal_scores(signal_scores)
    confidence = compute_confidence(normalized)
    uncertainty = compute_uncertainty(normalized)
    severity = derive_severity(normalized)
    top_signal = top_signal_key(normalized)

    return {
        "text": comment["text"],
        "source_platform": comment["source_platform"],
        "thread_id": comment.get("thread_id"),
        "post_id": comment.get("post_id"),
        "timestamp": comment.get("timestamp"),
        "signals": [
            {
                "key": key,
                "display_name": SIGNAL_DISPLAY_NAMES[key],
                "score": round(normalized[key], 4),
            }
            for key in SIGNAL_KEYS
        ],
        "top_signal": {
            "key": top_signal,
            "display_name": SIGNAL_DISPLAY_NAMES[top_signal],
            "score": round(normalized[top_signal], 4),
        },
        "severity": severity,
        "confidence": round(confidence, 4),
        "uncertainty": uncertainty,
    }


def build_evidence_by_signal(
    comment_analyses: list[dict[str, Any]], evidence_per_signal: int
) -> dict[str, list[dict[str, Any]]]:
    evidence: dict[str, list[dict[str, Any]]] = {}

    for signal in SIGNAL_KEYS:
        if signal == "no_clear_signal":
            continue

        ranked = sorted(
            comment_analyses,
            key=lambda item: _signal_score(item, signal) * item["confidence"],
            reverse=True,
        )
        trimmed = [
            {
                "text": item["text"],
                "source_platform": item["source_platform"],
                "signal_score": round(_signal_score(item, signal), 4),
                "confidence": item["confidence"],
                "severity": item["severity"]["label"],
            }
            for item in ranked
            if _signal_score(item, signal) >= 0.2
        ][:evidence_per_signal]
        evidence[signal] = trimmed

    return evidence


def build_page_summary(
    comment_analyses: list[dict[str, Any]],
    *,
    min_comments: int,
    evidence_per_signal: int,
) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    comment_count = len(comment_analyses)
    evidence = build_evidence_by_signal(comment_analyses, evidence_per_signal)

    signal_prevalence = []
    for signal in SIGNAL_KEYS:
        mean_score = (
            sum(_signal_score(item, signal) for item in comment_analyses)
            / comment_count
            if comment_count
            else 0.0
        )
        support = sum(
            1 for item in comment_analyses if _signal_score(item, signal) >= 0.4
        )
        signal_prevalence.append(
            {
                "key": signal,
                "display_name": SIGNAL_DISPLAY_NAMES[signal],
                "mean_score": round(mean_score, 4),
                "support": support,
            }
        )

    dominant_signals = [
        item
        for item in sorted(
            signal_prevalence,
            key=lambda entry: (entry["mean_score"], entry["support"]),
            reverse=True,
        )
        if item["key"] != "no_clear_signal" and item["mean_score"] >= 0.2
    ][:3]

    severity_distribution = {label: 0 for label in SEVERITY_LABELS.values()}
    for item in comment_analyses:
        severity_distribution[item["severity"]["label"]] += 1

    average_confidence = (
        sum(item["confidence"] for item in comment_analyses) / comment_count
        if comment_count
        else 0.0
    )
    insufficient_evidence = comment_count < min_comments or average_confidence < 0.4
    overall_uncertainty = (
        "high"
        if insufficient_evidence
        else "medium"
        if average_confidence < 0.62
        else "low"
    )

    summary = {
        "comment_count": comment_count,
        "average_confidence": round(average_confidence, 4),
        "overall_uncertainty": overall_uncertainty,
        "insufficient_evidence": insufficient_evidence,
        "dominant_signals": dominant_signals,
        "signal_prevalence": signal_prevalence,
        "severity_distribution": severity_distribution,
    }
    return summary, evidence


def _signal_score(comment_analysis: dict[str, Any], signal_key: str) -> float:
    for item in comment_analysis["signals"]:
        if item["key"] == signal_key:
            return float(item["score"])
    return 0.0
