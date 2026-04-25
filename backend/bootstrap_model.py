from __future__ import annotations

import os
from pathlib import Path

from huggingface_hub import snapshot_download


DEFAULT_MODEL_PATH = Path("backend/onnx_model_quantized")
REQUIRED_FILES = (
    "model.onnx",
    "config.json",
    "tokenizer.json",
    "tokenizer_config.json",
)


def _default_model_path() -> Path:
    return Path(os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH))).expanduser()


def _has_runtime_model(model_dir: Path) -> bool:
    return all((model_dir / filename).exists() for filename in REQUIRED_FILES)


def ensure_model() -> Path:
    model_dir = _default_model_path()
    if _has_runtime_model(model_dir):
        print(f"Model already available at {model_dir}")
        return model_dir

    repo_id = os.getenv("MODEL_REPO_ID", "ekam28/emotion-detector-onnx")
    revision = os.getenv("MODEL_REVISION", "main")
    model_dir.mkdir(parents=True, exist_ok=True)

    print(f"Downloading quantized ONNX model from {repo_id}@{revision} to {model_dir}")
    snapshot_download(
        repo_id=repo_id,
        revision=revision,
        repo_type="model",
        local_dir=str(model_dir),
        allow_patterns=[
            "model.onnx",
            "config.json",
            "tokenizer.json",
            "tokenizer_config.json",
            "special_tokens_map.json",
            "merges.txt",
            "vocab.json",
        ],
    )

    if not _has_runtime_model(model_dir):
        raise RuntimeError(
            "Downloaded model from "
            f"{repo_id}, but required files are missing in {model_dir}"
        )

    print(f"Model ready at {model_dir}")
    return model_dir


if __name__ == "__main__":
    ensure_model()
