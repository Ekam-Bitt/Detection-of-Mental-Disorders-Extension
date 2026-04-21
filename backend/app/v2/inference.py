from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from transformers import AutoTokenizer, pipeline

from .service import build_comment_analysis, legacy_predictions_to_signal_scores
from .taxonomy import SIGNAL_KEYS

logger = logging.getLogger("api.v2")


class BaseSignalAnalyzer:
    backend_name = "unknown"

    def analyze(self, comments: list[dict[str, Any]]) -> list[dict[str, Any]]:
        raise NotImplementedError


class LegacySignalAnalyzer(BaseSignalAnalyzer):
    backend_name = "legacy_hf_adapter"

    def __init__(self, legacy_pipeline: Any):
        self.legacy_pipeline = legacy_pipeline

    def analyze(self, comments: list[dict[str, Any]]) -> list[dict[str, Any]]:
        texts = [item["text"] for item in comments]
        predictions = self.legacy_pipeline(texts)
        return [
            build_comment_analysis(
                comment,
                legacy_predictions_to_signal_scores(
                    predictions[index], comment["text"]
                ),
            )
            for index, comment in enumerate(comments)
        ]


class HuggingFaceSignalAnalyzer(BaseSignalAnalyzer):
    backend_name = "huggingface_multilabel"

    def __init__(self, model_path: str):
        self.classifier = pipeline(
            "text-classification",
            model=model_path,
            tokenizer=model_path,
            top_k=None,
            truncation=True,
            padding=True,
        )

    def analyze(self, comments: list[dict[str, Any]]) -> list[dict[str, Any]]:
        texts = [item["text"] for item in comments]
        predictions = self.classifier(texts)
        results = []
        for index, comment in enumerate(comments):
            raw_scores = {
                entry["label"]: float(entry["score"]) for entry in predictions[index]
            }
            results.append(build_comment_analysis(comment, raw_scores))
        return results


class OnnxSignalAnalyzer(BaseSignalAnalyzer):
    backend_name = "onnx_student"

    def __init__(self, model_dir: str):
        from onnxruntime import InferenceSession

        model_path = Path(model_dir)
        config_path = model_path / "config.json"
        onnx_path = model_path / "model.onnx"
        if not config_path.exists() or not onnx_path.exists():
            raise FileNotFoundError(
                "ONNX model directory must contain config.json and model.onnx"
            )

        config = json.loads(config_path.read_text())
        self.label_order = tuple(config.get("signal_labels", SIGNAL_KEYS))
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)
        self.session = InferenceSession(str(onnx_path))

    def analyze(self, comments: list[dict[str, Any]]) -> list[dict[str, Any]]:
        import numpy as np

        texts = [item["text"] for item in comments]
        encoded = self.tokenizer(
            texts,
            truncation=True,
            max_length=256,
            padding=True,
            return_tensors="np",
        )

        inputs = {
            self.session.get_inputs()[0].name: encoded["input_ids"].astype("int64"),
            self.session.get_inputs()[1].name: encoded["attention_mask"].astype(
                "int64"
            ),
        }
        outputs = self.session.run(None, inputs)
        logits = outputs[0]
        probabilities = 1.0 / (1.0 + np.exp(-logits))

        results = []
        for index, comment in enumerate(comments):
            scores = {
                label: float(probabilities[index][label_index])
                for label_index, label in enumerate(self.label_order)
                if label in SIGNAL_KEYS
            }
            results.append(build_comment_analysis(comment, scores))
        return results


def load_signal_analyzer_v2(
    config: Any, legacy_pipeline: Any
) -> BaseSignalAnalyzer | None:
    onnx_path = getattr(config, "onnx_model_path", "")
    v2_model_path = getattr(config, "v2_model_path", "")

    if onnx_path:
        try:
            analyzer = OnnxSignalAnalyzer(onnx_path)
            logger.info("Loaded v2 ONNX analyzer from %s", onnx_path)
            return analyzer
        except Exception as exc:  # pragma: no cover - fallback path
            logger.warning("Falling back from ONNX analyzer: %s", exc)

    if v2_model_path and v2_model_path != getattr(config, "model_path", ""):
        try:
            analyzer = HuggingFaceSignalAnalyzer(v2_model_path)
            logger.info("Loaded v2 Hugging Face analyzer from %s", v2_model_path)
            return analyzer
        except Exception as exc:  # pragma: no cover - fallback path
            logger.warning("Falling back from Hugging Face analyzer: %s", exc)

    if legacy_pipeline:
        logger.info("Using legacy v1 model adapter for v2 signal analysis")
        return LegacySignalAnalyzer(legacy_pipeline)

    return None
