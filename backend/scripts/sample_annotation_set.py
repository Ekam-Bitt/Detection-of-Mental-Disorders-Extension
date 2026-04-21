from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.research.data_v2 import sample_annotation_rows, write_jsonl


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Sample an annotation batch from prepared v2 JSONL rows."
    )
    parser.add_argument("--input", required=True, help="Input JSONL path")
    parser.add_argument("--output", required=True, help="Output JSONL path")
    parser.add_argument("--sample-size", type=int, default=250)
    parser.add_argument("--seed", type=int, default=42)
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
    sampled = sample_annotation_rows(
        rows,
        sample_size=args.sample_size,
        seed=args.seed,
    )
    write_jsonl(args.output, sampled)


if __name__ == "__main__":
    main()
