from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.research.data_v2 import validate_split_integrity


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate leakage and class balance for a v2 dataset JSONL."
    )
    parser.add_argument("--input", required=True, help="Input JSONL path")
    return parser


def read_jsonl(path: str) -> list[dict]:
    rows = []
    with Path(path).open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def main() -> None:
    args = build_parser().parse_args()
    report = validate_split_integrity(read_jsonl(args.input))
    print(json.dumps(report, indent=2))
    if not report["is_valid"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
