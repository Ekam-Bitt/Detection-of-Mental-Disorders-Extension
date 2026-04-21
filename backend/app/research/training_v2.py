from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any


def load_json_config(path: str) -> dict[str, Any]:
    return json.loads(Path(path).read_text())


def set_global_seed(seed: int) -> None:
    random.seed(seed)
    try:
        import numpy as np

        np.random.seed(seed)
    except Exception:
        pass

    try:
        import torch

        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
    except Exception:
        pass


@dataclass
class TrainingArtifacts:
    model_dir: str
    metrics_path: str


def maybe_start_mlflow(config: dict[str, Any]) -> Any:
    tracking_uri = config.get("mlflow_tracking_uri")
    experiment_name = config.get("mlflow_experiment")
    if not tracking_uri or not experiment_name:
        return None

    import mlflow

    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(experiment_name)
    return mlflow.start_run(run_name=config.get("run_name"))


def close_mlflow_run(run: Any) -> None:
    if run is not None:
        import mlflow

        mlflow.end_run()
