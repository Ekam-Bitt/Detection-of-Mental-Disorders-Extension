# Model Card: Mental Health Signal Analysis v2

## Intended Use
Surface mental-health-related language signals in public text while explicitly avoiding diagnostic claims.

## Serving Model
- Default deployment target: distilled `distilroberta-base`
- Export format: ONNX with dynamic quantization for CPU inference

## Research Teacher
- `microsoft/deberta-v3-base`

## Outputs
- Multi-label signal probabilities
- Ordinal severity estimate
- Confidence and uncertainty
- Page-level aggregation and evidence comments

## Safety Notes
- Output should be treated as a content-signal summary, not a person-level assessment
- Low-comment pages must return insufficient-evidence states
- Crisis-like language should be reviewed conservatively
