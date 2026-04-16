from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.research.metrics_v2 import (
    compute_severity_metrics,
    compute_signal_metrics,
    expected_calibration_error,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Evaluate v2 predictions from a JSON file of gold/pred rows."
    )
    parser.add_argument("--input", required=True, help="Path to evaluation JSON file")
    parser.add_argument("--output", help="Optional path for metrics JSON")
    parser.add_argument("--threshold", type=float, default=0.5)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))

    true_labels = [row["true_signals"] for row in payload["rows"]]
    predicted_scores = [row["predicted_scores"] for row in payload["rows"]]
    true_severity = [int(row["true_severity"]) for row in payload["rows"]]
    predicted_severity = [int(row["predicted_severity"]) for row in payload["rows"]]
    confidences = [float(row.get("confidence", 0.0)) for row in payload["rows"]]
    correctness = [int(row.get("correct_top_signal", 0)) for row in payload["rows"]]

    report = {
        "signals": compute_signal_metrics(
            true_labels,
            predicted_scores,
            threshold=args.threshold,
        ),
        "severity": compute_severity_metrics(true_severity, predicted_severity),
        "ece": expected_calibration_error(confidences, correctness),
    }

    if args.output:
        Path(args.output).write_text(json.dumps(report, indent=2), encoding="utf-8")
    else:
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
