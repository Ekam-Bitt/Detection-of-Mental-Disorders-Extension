from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from app.research.export_v2 import export_student_to_onnx, quantize_onnx_model


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Export a distilled student checkpoint to ONNX and quantize it."
    )
    parser.add_argument("--model", required=True, help="HF model path or id")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--max-length", type=int, default=256)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    output_dir = Path(args.output_dir)
    onnx_path = export_student_to_onnx(
        args.model,
        output_dir,
        max_length=args.max_length,
    )
    quantized_path = output_dir / "model.quantized.onnx"
    quantize_onnx_model(onnx_path, quantized_path)
    shutil.move(str(quantized_path), str(onnx_path))


if __name__ == "__main__":
    main()
