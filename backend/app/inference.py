import logging
from typing import List

import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer


def _softmax(logits: np.ndarray) -> np.ndarray:
    exp = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
    return exp / exp.sum(axis=-1, keepdims=True)


def load_pipeline(config) -> any:
    logger = logging.getLogger("api")

    model_path = config.model_path
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        sess_options = ort.SessionOptions()
        sess_options.intra_op_num_threads = 2
        sess_options.inter_op_num_threads = 1
        sess_options.log_severity_level = 3  # suppress ONNX warnings
        session = ort.InferenceSession(
            f"{model_path}/model.onnx",
            sess_options=sess_options,
            providers=["CPUExecutionProvider"],
        )

        # Read label mapping from config.json
        import json
        from pathlib import Path

        config_file = Path(model_path) / "config.json"
        id2label = {}
        if config_file.exists():
            with open(config_file) as f:
                model_config = json.load(f)
                id2label = model_config.get("id2label", {})

        logger.info(f"ONNX model loaded from: {model_path}")

        def predict(texts: List[str]) -> List[List[dict]]:
            inputs = tokenizer(
                texts,
                return_tensors="np",
                truncation=True,
                padding=True,
                max_length=512,
            )
            ort_inputs = {
                k: v
                for k, v in inputs.items()
                if k in [inp.name for inp in session.get_inputs()]
            }
            logits = session.run(None, ort_inputs)[0]
            probs = _softmax(logits)

            results = []
            for row in probs:
                labels = []
                for idx, score in enumerate(row):
                    label = id2label.get(str(idx), f"LABEL_{idx}")
                    labels.append({"label": label, "score": float(score)})
                labels.sort(key=lambda x: x["score"], reverse=True)
                results.append(labels)
            return results

        return predict

    except Exception as e:
        logger.exception(f"Error loading ONNX model: {e}")
        return None


def apply_top_k(results: List[List[dict]], top_k: int) -> List[List[dict]]:
    if top_k <= 0:
        return results
    trimmed: List[List[dict]] = []
    for group in results:
        group_sorted = sorted(group, key=lambda x: x.get("score", 0.0), reverse=True)
        trimmed.append(group_sorted[:top_k])
    return trimmed
