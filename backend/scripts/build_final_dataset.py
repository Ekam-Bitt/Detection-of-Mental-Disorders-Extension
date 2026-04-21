from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.research.data_v2 import build_final_dataset, write_jsonl


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build the final v2 dataset splits from annotated JSONL."
    )
    parser.add_argument("--input", required=True, help="Input JSONL path")
    parser.add_argument("--output", required=True, help="Output JSONL path")
    parser.add_argument(
        "--cross-platform-holdout",
        required=True,
        choices=["reddit", "youtube", "x"],
    )
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
    rows = read_jsonl(args.input)
    final_rows = build_final_dataset(
        rows,
        cross_platform_holdout=args.cross_platform_holdout,
    )
    write_jsonl(args.output, final_rows)


if __name__ == "__main__":
    main()
