from __future__ import annotations

import json
from pathlib import Path

from transformers import AutoModelForSequenceClassification, AutoTokenizer

from app.v2.taxonomy import SIGNAL_KEYS


def export_student_to_onnx(
    model_name_or_path: str,
    output_dir: str | Path,
    *,
    max_length: int = 256,
) -> Path:
    import torch

    target_dir = Path(output_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(model_name_or_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_name_or_path)
    model.eval()

    encoded = tokenizer(
        ["mental health signal analysis"],
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=max_length,
    )

    onnx_path = target_dir / "model.onnx"
    torch.onnx.export(
        model,
        (encoded["input_ids"], encoded["attention_mask"]),
        onnx_path,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "sequence"},
            "attention_mask": {0: "batch", 1: "sequence"},
            "logits": {0: "batch"},
        },
        opset_version=17,
    )

    tokenizer.save_pretrained(target_dir)
    config_payload = {
        "signal_labels": list(SIGNAL_KEYS),
        "max_length": max_length,
        "source_model": model_name_or_path,
    }
    (target_dir / "config.json").write_text(
        json.dumps(config_payload, indent=2), encoding="utf-8"
    )
    return onnx_path


def quantize_onnx_model(model_path: str | Path, output_path: str | Path) -> Path:
    from onnxruntime.quantization import QuantType, quantize_dynamic

    target_path = Path(output_path)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    quantize_dynamic(
        model_input=str(model_path),
        model_output=str(target_path),
        weight_type=QuantType.QInt8,
    )
    return target_path
