import os


class AppConfig:
    def __init__(
        self,
        model_path: str,
        top_k: int,
        torch_num_threads: int,
        v2_model_path: str,
        onnx_model_path: str,
        min_comments_for_summary: int,
        evidence_comments_per_signal: int,
    ):
        self.model_path = model_path
        self.top_k = top_k
        self.torch_num_threads = torch_num_threads
        self.v2_model_path = v2_model_path
        self.onnx_model_path = onnx_model_path
        self.min_comments_for_summary = min_comments_for_summary
        self.evidence_comments_per_signal = evidence_comments_per_signal

    @staticmethod
    def from_env() -> "AppConfig":
        return AppConfig(
            model_path=os.getenv("MODEL_ID", "ekam28/emotion-detector"),
            top_k=int(os.getenv("TOP_K", "7")),
            torch_num_threads=int(os.getenv("TORCH_NUM_THREADS", "1")),
            v2_model_path=os.getenv(
                "V2_MODEL_ID", os.getenv("MODEL_ID", "ekam28/emotion-detector")
            ),
            onnx_model_path=os.getenv("ONNX_MODEL_PATH", ""),
            min_comments_for_summary=int(os.getenv("MIN_COMMENTS_FOR_SUMMARY", "5")),
            evidence_comments_per_signal=int(
                os.getenv("EVIDENCE_COMMENTS_PER_SIGNAL", "3")
            ),
        )

    def to_flask_config(self) -> dict:
        return {
            "MODEL_PATH": self.model_path,
            "TOP_K": self.top_k,
            "TORCH_NUM_THREADS": self.torch_num_threads,
            "V2_MODEL_PATH": self.v2_model_path,
            "ONNX_MODEL_PATH": self.onnx_model_path,
            "MIN_COMMENTS_FOR_SUMMARY": self.min_comments_for_summary,
            "EVIDENCE_COMMENTS_PER_SIGNAL": self.evidence_comments_per_signal,
        }
