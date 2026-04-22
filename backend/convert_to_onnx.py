"""One-time script to export ekam28/emotion-detector to ONNX format."""

from optimum.onnxruntime import ORTModelForSequenceClassification
from transformers import AutoTokenizer

MODEL_ID = "ekam28/emotion-detector"
OUTPUT_DIR = "onnx_model"

print(f"Exporting {MODEL_ID} to ONNX...")
model = ORTModelForSequenceClassification.from_pretrained(MODEL_ID, export=True)
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print(f"Done! ONNX model saved to {OUTPUT_DIR}/")
