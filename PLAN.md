# Version 2.0 Plan: Research-Grade Mental Health Signal Analysis System

## Summary
Build v2.0 as a research-heavy, end-to-end upgrade that moves the project from a weakly supervised, single-label Reddit classifier into a multi-source mental-health signal analysis system.

The key shift is:
- Current baseline: subreddit-derived 7-class, single-label `roberta-base` classifier over isolated text
- v2.0 target: multi-source, multi-task pipeline with a research teacher model, a deployable distilled student model, stronger evaluation, and a safer output contract focused on **mental-health signals and severity**, not diagnosis

## Implementation Changes

### 1. Problem framing and dataset refactor
- Redefine the task from “detect mental disorder” to **detect mental-health-related signals in social media text**.
- Replace pure subreddit-name supervision as the final label source.
- Use the current Reddit dataset only as a **weak-label bootstrap corpus**, not the final gold benchmark.
- Build a new unified dataset from:
  - Reddit posts/comments
  - YouTube comments
  - X/Twitter posts
- Standardize each example into one schema:
  - `text`
  - `source_platform`
  - `thread_id`
  - `post_id`
  - `label_signals`
  - `severity`
  - `annotator_confidence`
  - `split`
- Final label set for v2.0:
  - `attention_dysregulation`
  - `anxious_affect`
  - `autistic_trait_discussion`
  - `emotional_instability`
  - `depressive_affect`
  - `trauma_stress`
  - `crisis_self_harm`
  - `no_clear_signal`
- Make labels **multi-label**, not mutually exclusive.
- Add a secondary **severity target** with ordinal classes:
  - `0 = none`
  - `1 = mild`
  - `2 = moderate`
  - `3 = high`
- Create data splits by **author/thread/source isolation** so there is no leakage across train/validation/test.
- Keep one dedicated **cross-platform holdout split** where one source is excluded during training and used only for testing.
- Replace notebook-only data prep with reproducible scripts:
  - `prepare_weak_labels`
  - `sample_annotation_set`
  - `build_final_dataset`
  - `validate_splits`
- Store dataset manifests and label documentation in versioned files; notebooks become exploration-only.

### 2. Model architecture and training
- Teacher model:
  - Use `microsoft/deberta-v3-base` as the main research model.
  - Input length: `256`
  - Fine-tune with full supervision, not frozen embeddings.
- Student model for deployment:
  - Distill into `distilroberta-base`
  - Export the student model to **ONNX + dynamic quantization** for CPU-friendly local serving
- Training stack:
  - Stage 1: domain-adaptive pretraining on unlabeled social-media text
  - Stage 2: supervised multi-task fine-tuning on the annotated dataset
  - Stage 3: teacher-student distillation for deployment
- Multi-task heads:
  - multi-label signal head
  - ordinal severity head
  - optional source-platform head for domain robustness analysis
- Losses:
  - weighted BCE or focal BCE for signal labels
  - ordinal loss or cross-entropy for severity
  - combined weighted objective with signal task as primary
- Training defaults:
  - mixed precision when GPU is available
  - early stopping on validation macro-F1
  - class weighting for imbalance
  - temperature scaling after training for calibrated confidence
- Required ablations:
  - current `roberta-base` single-label baseline
  - teacher without DAPT
  - teacher with DAPT
  - distilled student
  - with vs without multi-task severity head

### 3. Backend, inference, and extension refactor
- Introduce an explicit v2 API contract rather than overloading the current endpoint.
- New backend endpoint:
  - `POST /api/v2/analyze/comments`
- Request shape:
  - list of comments with `text`, `source_platform`, optional `thread_id`, optional `timestamp`
- Response shape:
  - per-comment signal probabilities
  - per-comment severity
  - confidence / uncertainty
  - page-level aggregate summary
  - top evidence comments for each detected signal
  - disclaimer metadata
- Aggregation logic:
  - analyze each comment independently with the student model
  - aggregate at page/thread level using prevalence + weighted confidence
  - suppress strong conclusions when uncertainty is high or comment count is too low
- Extension upgrades:
  - show “signal summary” instead of disorder verdicts
  - add an explicit **uncertain / insufficient evidence** state
  - surface top evidence comments for each detected signal
  - add source-aware extraction for Reddit, YouTube, and X with comment-count thresholds
  - keep local/private inference behavior as a core feature
- Model-serving refactor:
  - separate training artifacts from serving artifacts
  - serve only the distilled ONNX student in production/local API
  - keep teacher checkpoints for experiments only

### 4. Research rigor, safety, and reproducibility
- Required evaluation metrics:
  - macro-F1
  - per-label precision / recall / F1
  - AUROC for each signal
  - confusion analysis for severity
  - ECE / calibration error
  - latency and throughput for CPU inference
- Required evaluation scenarios:
  - in-domain test
  - cross-platform holdout
  - short-text vs long-text slices
  - ambiguous / overlapping-signal samples
  - crisis-class false-negative review
- Required project artifacts:
  - model card
  - dataset card
  - annotation guidelines
  - ethics / limitations section
  - error analysis report with representative failure cases
- Reproducibility refactor:
  - move all train/eval settings into config files
  - use deterministic seeds
  - log experiments with one tool only; default to **MLflow**
  - keep notebooks only for visualization and analysis, not core pipeline logic

## Public Interfaces / Deliverables
- New v2 model output is **multi-label + severity**, not single top class only.
- New backend public API:
  - `POST /api/v2/analyze/comments`
  - `GET /health` remains unchanged
- New research deliverables:
  - baseline vs teacher vs student comparison
  - calibrated confidence analysis
  - cross-platform generalization analysis
  - ethics and non-diagnostic positioning

## Test Plan
- Data tests:
  - no author/thread leakage across splits
  - no duplicate text across train/test after normalization
  - label frequency and severity distribution checks
- Model tests:
  - baseline reproduction from current pipeline
  - teacher training convergence
  - student distillation quality within acceptable F1 drop
  - calibration before and after temperature scaling
- Backend tests:
  - schema validation for v2 request/response
  - empty/short/duplicate comment handling
  - uncertainty fallback when evidence is insufficient
  - CPU inference latency budget
- Extension tests:
  - Reddit, YouTube, and X extraction
  - page summary rendering
  - uncertain-state rendering
  - evidence-comment display and pagination

## Assumptions and Defaults
- Optimize for a **research-heavy** v2.0 with end-to-end improvements.
- English-only for v2.0.
- Public social-media text only; no private/user-authenticated ingestion.
- The project should remain a browser-extension + local API system.
- The final system should avoid claiming diagnosis and instead report mental-health-related signals with confidence and limitations.
- `deberta-v3-base` is the primary teacher model; `distilroberta-base` ONNX is the deployment student by default.
