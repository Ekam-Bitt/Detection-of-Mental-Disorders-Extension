from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import List

NORMAL_LABEL = "LABEL_6"
DASHBOARD_WINDOW_DAYS = 7
HIGH_RISK_SCORE = 0.68
EXTREME_RISK_SCORE = 0.84
VOLATILITY_SWING_THRESHOLD = 0.45
VOLATILITY_AVERAGE_THRESHOLD = 0.3
PAGE_RABBIT_HOLE_THRESHOLD = 0.62
PAGE_RABBIT_HOLE_RATIO = 0.45

LABELS = {
    "LABEL_0": {"name": "ADHD", "color": "#38bdf8"},
    "LABEL_1": {"name": "Anxiety", "color": "#fb923c"},
    "LABEL_2": {"name": "Autism", "color": "#facc15"},
    "LABEL_3": {"name": "BPD", "color": "#f472b6"},
    "LABEL_4": {"name": "Depression", "color": "#8b5cf6"},
    "LABEL_5": {"name": "PTSD", "color": "#ef4444"},
    "LABEL_6": {"name": "Normal", "color": "#22c55e"},
}

LABEL_ORDER = [
    "LABEL_0",
    "LABEL_1",
    "LABEL_2",
    "LABEL_3",
    "LABEL_4",
    "LABEL_5",
    "LABEL_6",
]

DISTRESS_WEIGHTS = {
    "LABEL_0": 0.4,
    "LABEL_1": 0.72,
    "LABEL_2": 0.35,
    "LABEL_3": 0.88,
    "LABEL_4": 0.82,
    "LABEL_5": 0.76,
    "LABEL_6": 0.0,
}

DEFAULT_SETTINGS = {
    "shieldEnabled": True,
    "shieldThreshold": 0.62,
    "nudgesEnabled": True,
    "resourcePromptsEnabled": True,
}

HIGH_RISK_KEYWORDS = [
    "want to die",
    "kill myself",
    "end my life",
    "self harm",
    "self-harm",
    "suicidal",
    "suicide",
    "no reason to live",
    "hopeless",
    "i give up",
    "harm myself",
    "want to disappear",
    "can’t do this anymore",
    "can't do this anymore",
    "life is pointless",
]

SUPPORT_RESOURCES = {
    "india": {
        "name": "Tele-MANAS",
        "primaryLabel": "Call 14416",
        "primaryHref": "tel:14416",
        "secondaryLabel": "Call 1800-891-4416",
        "secondaryHref": "tel:18008914416",
        "helperText": "24/7 tele-mental health support in India.",
    },
    "unitedStates": {
        "name": "988 Lifeline",
        "primaryLabel": "Call or Text 988",
        "primaryHref": "tel:988",
        "secondaryLabel": "Open 988 chat",
        "secondaryHref": "https://988lifeline.org/get-help/",
        "helperText": "24/7 crisis support across the United States and territories.",
    },
    "fallback": {
        "name": "Immediate Support",
        "primaryLabel": "Find crisis support",
        "primaryHref": "https://988lifeline.org/get-help/",
        "secondaryLabel": "Contact emergency services",
        "secondaryHref": "#",
        "helperText": (
            "Reach out to local emergency services" " or a trusted person right now."
        ),
    },
}


def _round_metric(value: float, digits: int = 3) -> float:
    return round(float(value), digits)


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, float(value)))


def get_prediction_score(predictions: List[dict], label: str) -> float:
    for prediction in predictions or []:
        if prediction.get("label") == label:
            return float(prediction.get("score", 0.0))
    return 0.0


def sort_predictions(predictions: List[dict]) -> List[dict]:
    return sorted(
        predictions or [], key=lambda item: item.get("score", 0.0), reverse=True
    )


def get_top_prediction(predictions: List[dict]) -> dict | None:
    return sort_predictions(predictions)[0] if predictions else None


def extract_high_risk_keywords(text: str = "") -> List[str]:
    normalized = text.lower()
    return [keyword for keyword in HIGH_RISK_KEYWORDS if keyword in normalized]


def calculate_risk_score(predictions: List[dict], text: str = "") -> float:
    if not predictions:
        return 0.0

    normal_score = get_prediction_score(predictions, NORMAL_LABEL)
    weighted_distress = sum(
        get_prediction_score(predictions, label) * DISTRESS_WEIGHTS.get(label, 0.0)
        for label in LABEL_ORDER
    )
    keyword_hits = extract_high_risk_keywords(text)
    keyword_boost = min(len(keyword_hits) * 0.08, 0.24)

    return _round_metric(
        _clamp((1 - normal_score) * 0.55 + weighted_distress * 0.45 + keyword_boost)
    )


def get_risk_band(score: float) -> str:
    if score >= EXTREME_RISK_SCORE:
        return "extreme"
    if score >= HIGH_RISK_SCORE:
        return "high"
    if score >= 0.4:
        return "guarded"
    return "calm"


def describe_risk(score: float) -> str:
    band = get_risk_band(score)
    if band == "extreme":
        return "Acute"
    if band == "high":
        return "High"
    if band == "guarded":
        return "Watchful"
    return "Steady"


def analyze_result(result: dict) -> dict:
    top_prediction = get_top_prediction(result.get("predictions", []))
    risk_score = calculate_risk_score(
        result.get("predictions", []), result.get("text", "") or ""
    )

    analyzed = dict(result)
    analyzed["topPrediction"] = top_prediction
    analyzed["riskScore"] = risk_score
    analyzed["riskBand"] = get_risk_band(risk_score)
    return analyzed


def get_volatility_metrics(scores: List[float]) -> dict:
    if len(scores) < 2:
        return {
            "averageSwing": 0.0,
            "maxSwing": 0.0,
            "flagged": False,
            "swingCount": 0,
        }

    swings = [abs(scores[index] - scores[index - 1]) for index in range(1, len(scores))]
    average_swing = _round_metric(sum(swings) / len(swings))
    max_swing = _round_metric(max(swings))
    return {
        "averageSwing": average_swing,
        "maxSwing": max_swing,
        "flagged": (
            average_swing >= VOLATILITY_AVERAGE_THRESHOLD
            or max_swing >= VOLATILITY_SWING_THRESHOLD
        ),
        "swingCount": len(swings),
    }


def summarize_results(results: List[dict]) -> dict:
    analyzed_results = [analyze_result(result) for result in results]
    summary = {label: 0 for label in LABEL_ORDER}
    label_intensity = {label: 0.0 for label in LABEL_ORDER}

    for result in analyzed_results:
        top_prediction = result.get("topPrediction")
        if not top_prediction:
            continue
        summary[top_prediction["label"]] += 1
        for prediction in result.get("predictions", []):
            label_intensity[prediction["label"]] += prediction["score"]

    risk_scores = [result.get("riskScore", 0.0) for result in analyzed_results]
    average_risk = (
        _round_metric(sum(risk_scores) / len(risk_scores)) if analyzed_results else 0.0
    )
    high_risk_count = len([score for score in risk_scores if score >= HIGH_RISK_SCORE])
    extreme_risk_count = len(
        [score for score in risk_scores if score >= EXTREME_RISK_SCORE]
    )
    toxic_ratio = (
        _round_metric(high_risk_count / len(analyzed_results))
        if analyzed_results
        else 0.0
    )
    dominant_label = (
        max(summary.items(), key=lambda item: item[1])[0] if analyzed_results else None
    )

    return {
        "results": analyzed_results,
        "summary": summary,
        "averageRisk": average_risk,
        "highRiskCount": high_risk_count,
        "extremeRiskCount": extreme_risk_count,
        "toxicRatio": toxic_ratio,
        "totalComments": len(analyzed_results),
        "dominantLabel": dominant_label,
        "labelIntensity": {
            label: (
                _round_metric(value / len(analyzed_results))
                if analyzed_results
                else 0.0
            )
            for label, value in label_intensity.items()
        },
        "rabbitHoleLikely": (
            average_risk >= PAGE_RABBIT_HOLE_THRESHOLD
            or toxic_ratio >= PAGE_RABBIT_HOLE_RATIO
        ),
        "volatility": get_volatility_metrics(risk_scores),
    }


def _parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def summarize_history(history: List[dict], now: datetime | None = None) -> dict:
    current = now or datetime.now(timezone.utc)
    start_date = datetime(current.year, current.month, current.day) - timedelta(
        days=DASHBOARD_WINDOW_DAYS - 1
    )

    recent_history = sorted(
        [
            entry
            for entry in history
            if _parse_timestamp(entry["timestamp"]).replace(tzinfo=None) >= start_date
        ],
        key=lambda entry: entry["timestamp"],
    )

    daily_map = {}
    for offset in range(DASHBOARD_WINDOW_DAYS):
        day = start_date + timedelta(days=offset)
        key = day.date().isoformat()
        daily_map[key] = {
            "dayKey": key,
            "label": day.strftime("%a"),
            "totalMs": 0,
            "highRiskMs": 0,
            "averageRiskNumerator": 0.0,
            "averageRiskDenominator": 0.0,
            "sessionCount": 0,
            "eventCount": 0,
        }

    total_ms = 0
    high_risk_ms = 0
    calm_ms = 0
    guarded_ms = 0
    intense_ms = 0
    source_breakdown = {
        "extension": {
            "count": 0,
            "durationMs": 0,
            "averageRisk": 0.0,
            "riskTotal": 0.0,
        },
        "selfCheck": {
            "count": 0,
            "durationMs": 0,
            "averageRisk": 0.0,
            "riskTotal": 0.0,
        },
    }

    for entry in recent_history:
        duration_ms = max(int(entry.get("durationMs") or 0), 0)
        risk_score = float(entry.get("riskScore") or 0.0)
        band = get_risk_band(risk_score)
        key = _parse_timestamp(entry["timestamp"]).date().isoformat()
        bucket = daily_map.get(key)

        if bucket:
            bucket["totalMs"] += duration_ms
            bucket["highRiskMs"] += duration_ms if risk_score >= HIGH_RISK_SCORE else 0
            if duration_ms > 0:
                bucket["averageRiskNumerator"] += risk_score * duration_ms
                bucket["averageRiskDenominator"] += duration_ms
                bucket["sessionCount"] += 1
            else:
                bucket["averageRiskNumerator"] += risk_score
                bucket["averageRiskDenominator"] += 1
            bucket["eventCount"] += 1

        total_ms += duration_ms
        high_risk_ms += duration_ms if risk_score >= HIGH_RISK_SCORE else 0
        if duration_ms > 0:
            if band == "calm":
                calm_ms += duration_ms
            elif band == "guarded":
                guarded_ms += duration_ms
            else:
                intense_ms += duration_ms

        source_key = "selfCheck" if entry.get("kind") == "self_check" else "extension"
        source_breakdown[source_key]["count"] += 1
        source_breakdown[source_key]["durationMs"] += duration_ms
        source_breakdown[source_key]["riskTotal"] += risk_score

    daily_series = []
    for bucket in daily_map.values():
        denominator = bucket["averageRiskDenominator"]
        daily_series.append(
            {
                "dayKey": bucket["dayKey"],
                "label": bucket["label"],
                "totalMs": bucket["totalMs"],
                "highRiskMs": bucket["highRiskMs"],
                "averageRisk": (
                    _round_metric(bucket["averageRiskNumerator"] / denominator)
                    if denominator
                    else 0.0
                ),
                "highRiskShare": (
                    _round_metric(bucket["highRiskMs"] / bucket["totalMs"])
                    if bucket["totalMs"]
                    else 0.0
                ),
                "totalMinutes": round(bucket["totalMs"] / 60000),
                "sessionCount": bucket["sessionCount"],
                "eventCount": bucket["eventCount"],
            }
        )

    all_risk_scores = [float(entry.get("riskScore") or 0.0) for entry in recent_history]
    duration_events = [
        entry for entry in recent_history if int(entry.get("durationMs") or 0) > 0
    ]
    total_minutes = round(total_ms / 60000)
    high_risk_share = _round_metric(high_risk_ms / total_ms) if total_ms else 0.0
    volatility = get_volatility_metrics(all_risk_scores)

    insight = (
        "Not enough weekly exposure data yet."
        " Run a self-check or browse supported"
        " threads to build your dashboard."
    )
    if duration_events and total_ms > 0:
        pct = round(high_risk_share * 100)
        if high_risk_share >= 0.8:
            insight = (
                f"About {pct}% of your tracked"
                " browsing time landed on"
                " high-risk threads this week."
            )
        elif volatility["flagged"]:
            swing = round(volatility["maxSwing"] * 100)
            insight = (
                "Your recent inputs swung sharply,"
                f" with a max jump of {swing}"
                " points between events."
            )
        elif high_risk_share >= 0.45:
            insight = (
                f"Nearly {pct}% of your tracked"
                " time was spent in"
                " high-intensity conversations."
            )
        else:
            insight = (
                "Your recent browsing pattern" " looks relatively steady this week."
            )
    elif recent_history:
        sc_count = source_breakdown["selfCheck"]["count"]
        insight = (
            f"You logged {sc_count} self-checks"
            " this week. Use the recent timeline"
            " to spot entries worth reviewing."
        )

    for stats in source_breakdown.values():
        stats["averageRisk"] = (
            _round_metric(stats["riskTotal"] / stats["count"])
            if stats["count"]
            else 0.0
        )
        stats.pop("riskTotal", None)

    return {
        "recentHistory": recent_history,
        "totalMinutes": total_minutes,
        "totalSessions": len(duration_events),
        "totalEvents": len(recent_history),
        "manualCheckCount": source_breakdown["selfCheck"]["count"],
        "highRiskShare": high_risk_share,
        "calmShare": _round_metric(calm_ms / total_ms) if total_ms else 0.0,
        "guardedShare": _round_metric(guarded_ms / total_ms) if total_ms else 0.0,
        "intenseShare": _round_metric(intense_ms / total_ms) if total_ms else 0.0,
        "averageRisk": (
            _round_metric(sum(all_risk_scores) / len(all_risk_scores))
            if recent_history
            else 0.0
        ),
        "volatility": volatility,
        "dailySeries": daily_series,
        "insight": insight,
        "sourceBreakdown": source_breakdown,
        "lastUpdated": (
            recent_history[-1]["timestamp"] if recent_history else current.isoformat()
        ),
    }


def get_support_resource(locale: str = "", time_zone: str = "") -> dict:
    normalized_locale = (locale or "").lower()
    normalized_zone = (time_zone or "").lower()

    if "in" in normalized_locale or "kolkata" in normalized_zone:
        return deepcopy(SUPPORT_RESOURCES["india"])
    if "us" in normalized_locale or normalized_zone.startswith("america/"):
        return deepcopy(SUPPORT_RESOURCES["unitedStates"])
    return deepcopy(SUPPORT_RESOURCES["fallback"])
