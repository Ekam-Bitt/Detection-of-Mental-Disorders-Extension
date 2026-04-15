import logging

try:
    import torch
except Exception:
    torch = None

from transformers import pipeline


def _select_device() -> int:
    if torch is None:
        return -1
    try:
        if torch.cuda.is_available():
            return 0
    except Exception:
        pass
    return -1


def load_pipeline(config) -> any:
    logger = logging.getLogger("api")

    if torch is not None:
        try:
            torch.set_num_threads(int(config.torch_num_threads))
        except Exception:
            pass

    device = _select_device()
    try:
        clf = pipeline(
            "text-classification",
            model=config.model_path,
            tokenizer=config.model_path,
            device=device,
            top_k=None,
            truncation=True,
            padding=True,
        )
        logger.info(
            f"Model loaded from: {config.model_path} "
            f"on device: {'cuda:0' if device == 0 else 'cpu'}"
        )
        return clf
    except Exception as e:
        logger.exception(f"Error loading model: {e}")
        return None


def apply_top_k(results: list[list[dict]], top_k: int) -> list[list[dict]]:
    if top_k <= 0:
        return results
    trimmed: list[list[dict]] = []
    for group in results:
        group_sorted = sorted(group, key=lambda x: x.get("score", 0.0), reverse=True)
        trimmed.append(group_sorted[:top_k])
    return trimmed
