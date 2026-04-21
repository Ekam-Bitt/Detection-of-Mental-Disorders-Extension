# Mental Health Signal Analysis

![GitHub Release](https://img.shields.io/github/v/release/Ekam-Bitt/Detection-of-Mental-Disorders-Extension)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Ekam-Bitt/Detection-of-Mental-Disorders-Extension/docker-build.yml?label=build)
![GitHub License](https://img.shields.io/github/license/Ekam-Bitt/Detection-of-Mental-Disorders-Extension)

A privacy-focused browser extension and local API for surfacing mental-health-related language signals in public social-media text. Version 2.0 upgrades the project from a single-label classifier into a multi-source signal-analysis system with severity, uncertainty, and evidence summaries.

## 📥 Getting Started

### 1. Get the Code

You need the full project code to run both the backend server and the extension.

- **Option A: Git (Recommended)**

  ```bash
  git clone https://github.com/Ekam-Bitt/Detection-of-Mental-Disorders-Extension.git
  cd Detection-of-Mental-Disorders-Extension
  ```

- **Option B: No Git**
  1.  Go to the **[Latest Release](https://github.com/Ekam-Bitt/Detection-of-Mental-Disorders-Extension/releases/latest)**.
  2.  Download the **Source code (zip)** (at the bottom of the assets list).
  3.  Unzip the file and open the folder.

### 2. Start the Backend

The extension relies on a local backend server to process data.

```bash
docker compose up --build
```

_Note: On the first run, it will download the ML model (~500MB) from Hugging Face._

### 3. Load the Extension

1.  Open Chrome and go to `chrome://extensions/`.
2.  Enable **Developer mode** (top right).
3.  Click **Load unpacked**.
4.  Select the `extension` folder from the project directory.

## 🛠️ Development

For local development without Docker, use the `Makefile`:

```bash
make setup
source .venv/bin/activate
```

Python dependencies are managed centrally in `pyproject.toml`, with `dev` and `ml` extras used by local development, CI, and Docker builds.

For research and dataset tooling:

```bash
make install-research
```

For detailed instructions on testing, linting, and contribution guidelines, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## 🚀 Features

- **Platform Support**: Extracts visible comments from **YouTube**, **Reddit**, and **X**.
- **Privacy First**: Runs through a local API; no cloud inference is required.
- **Signal-Based Output**: Reports language signals, severity, confidence, uncertainty, and evidence comments.
- **Research Toolkit**: Includes reproducible dataset preparation, split validation, evaluation, and ONNX export utilities.

## 🛠️ Tech Stack

- **Frontend (Extension)**: HTML, CSS, JavaScript (Manifest V3)
- **Backend (API)**: Python, Flask, Gunicorn
- **ML Models**:
  - v1 compatibility model: fine-tuned RoBERTa on Hugging Face
  - v2 serving path: multi-label student model exported to ONNX
  - v2 research teacher: `microsoft/deberta-v3-base`
- **Infrastructure**: Docker, Docker Compose

## 🖥️ Usage

1.  Navigate to a **YouTube** video, **Reddit** thread, or **X (Twitter)** post with comments.
2.  Click the **Mental Health Signal Analysis** icon in your browser toolbar.
3.  The extension will analyze visible comments and display:
    - page-level signal prevalence
    - severity and uncertainty
    - evidence comments for the strongest signals

## 🧠 v2 Signal Taxonomy

The v2 system uses a safer label space focused on text signals rather than diagnosis:

- `attention_dysregulation`
- `anxious_affect`
- `autistic_trait_discussion`
- `emotional_instability`
- `depressive_affect`
- `trauma_stress`
- `crisis_self_harm`
- `no_clear_signal`

## 🔬 Research Workflow

The repository now includes reproducible scripts for the v2 dataset and evaluation pipeline:

```bash
make prepare-weak-labels ARGS="--input raw.csv --source-platform reddit --output research/datasets/reddit_weak.jsonl"
make sample-annotation-set ARGS="--input research/datasets/reddit_weak.jsonl --output research/datasets/annotation_batch.jsonl --sample-size 250"
make build-final-dataset ARGS="--input research/datasets/annotated.jsonl --output research/datasets/final_dataset.jsonl --cross-platform-holdout youtube"
make validate-splits ARGS="--input research/datasets/final_dataset.jsonl"
make export-student-onnx ARGS="--model path/to/student-checkpoint --output-dir backend/models/student-onnx"
```

Experiment configs live in [research/configs](./research/configs), and project artifacts live in [docs/v2](./docs/v2).

## ⚠️ Disclaimer

This tool is for **educational and informational purposes only**. It is **NOT** a diagnostic system and should not be used to diagnose mental health conditions. The results summarize patterns in text, not the mental state of a person.

## 📄 License

MIT License
