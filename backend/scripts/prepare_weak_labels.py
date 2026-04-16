from __future__ import annotations

import argparse

from app.research.data_v2 import prepare_weak_label_examples, read_csv_rows, write_jsonl


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Convert raw social-media CSV data into v2 weak-label JSONL."
    )
    parser.add_argument("--input", required=True, help="Path to input CSV file")
    parser.add_argument(
        "--source-platform",
        required=True,
        choices=["reddit", "youtube", "x"],
        help="Platform identifier for all rows in the CSV",
    )
    parser.add_argument("--output", required=True, help="Output JSONL path")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    rows = read_csv_rows(args.input)
    prepared = prepare_weak_label_examples(rows, args.source_platform)
    write_jsonl(args.output, prepared)


if __name__ == "__main__":
    main()
