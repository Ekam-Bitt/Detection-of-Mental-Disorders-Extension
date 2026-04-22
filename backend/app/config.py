import os
from pathlib import Path


class AppConfig:
    def __init__(self, model_path: str, top_k: int, wellbeing_db_path: str):
        self.model_path = model_path
        self.top_k = top_k
        self.wellbeing_db_path = wellbeing_db_path

    @staticmethod
    def from_env() -> "AppConfig":
        default_db_path = (
            Path(__file__).resolve().parent.parent / "data" / "wellbeing.db"
        )
        return AppConfig(
            model_path=os.getenv("MODEL_PATH", "onnx_model_quantized"),
            top_k=int(os.getenv("TOP_K", "7")),
            wellbeing_db_path=os.getenv("WELLBEING_DB_PATH", str(default_db_path)),
        )

    def to_flask_config(self) -> dict:
        return {
            "MODEL_PATH": self.model_path,
            "TOP_K": self.top_k,
            "WELLBEING_DB_PATH": self.wellbeing_db_path,
        }
