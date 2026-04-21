"""Quantize the ONNX model to INT8 for smaller size and faster CPU inference."""

from onnxruntime.quantization import quantize_dynamic, QuantType
from pathlib import Path
import shutil

INPUT_MODEL = "onnx_model/model.onnx"
OUTPUT_DIR = "onnx_model_quantized"

# Copy all tokenizer files first
Path(OUTPUT_DIR).mkdir(exist_ok=True)
for f in Path("onnx_model").iterdir():
    if f.name != "model.onnx":
        shutil.copy2(f, Path(OUTPUT_DIR) / f.name)

# Quantize
print("Quantizing model...")
quantize_dynamic(
    model_input=INPUT_MODEL,
    model_output=f"{OUTPUT_DIR}/model.onnx",
    weight_type=QuantType.QUInt8,
)

print(f"Done! Quantized model saved to {OUTPUT_DIR}/")

# Show size comparison
original = Path(INPUT_MODEL).stat().st_size / (1024 * 1024)
quantized = Path(f"{OUTPUT_DIR}/model.onnx").stat().st_size / (1024 * 1024)
print(f"Original:  {original:.1f} MB")
print(f"Quantized: {quantized:.1f} MB")
print(f"Reduction: {(1 - quantized/original) * 100:.1f}%")
