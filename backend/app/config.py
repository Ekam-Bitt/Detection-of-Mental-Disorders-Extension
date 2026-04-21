import os


class AppConfig:
    def __init__(self, model_path: str, top_k: int):
        self.model_path = model_path
        self.top_k = top_k

    @staticmethod
    def from_env() -> "AppConfig":
        return AppConfig(
            model_path=os.getenv("MODEL_PATH", "onnx_model_quantized"),
            top_k=int(os.getenv("TOP_K", "7")),
        )

    def to_flask_config(self) -> dict:
        return {
            "MODEL_PATH": self.model_path,
            "TOP_K": self.top_k,
        }
