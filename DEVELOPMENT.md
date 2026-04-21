# Development Setup Guide

This guide provides detailed instructions for setting up your local environment, running tests, and contributing to the project.

## 📋 Prerequisites

- **Python 3.10+** (Backend)
- **Node.js 20+** (Extension - optional for local dev)
- **Docker & Docker Compose** (Containerized development)
- **Make** (Automated task management)

## 🚀 Quick Start

### 1. Unified Setup

The easiest way to set up everything (virtual environment, dependencies, `.env` file, and git hooks) is using the `Makefile`:

```bash
# 1. Clone the repository
git clone https://github.com/Ekam-Bitt/Detection-of-Mental-Disorders-Extension.git
cd Detection-of-Mental-Disorders-Extension

# 2. Run the automated setup
make setup

# 3. Activate the environment
source .venv/bin/activate
```

---

## 🛠️ Development Workflow

The project uses a `Makefile` to simplify common development tasks. Run `make help` to see all available commands.

### Backend Development

For backend changes, we use **Ruff** for linting and formatting. The backend now has two tracks:
- product serving for the browser extension
- research tooling for dataset prep, evaluation, and export

| Task        | Command               | Description                              |
| ----------- | --------------------- | ---------------------------------------- |
| **Run API** | `make run-backend`    | Starts Flask server locally on port 8000 |
| **Lint**    | `make lint-backend`   | Check code with Ruff                     |
| **Format**  | `make format-backend` | Auto-format code with Ruff               |
| **Test**    | `make test-backend`   | Run backend tests with pytest            |
| **Cleanup** | `make clean`          | Remove caches and model artifacts        |

### Research / Dataset Workflow

Install the extra research stack when you need data preparation, evaluation, or model export:

```bash
make install-research
```

Key commands:

| Task | Command | Description |
| ---- | ------- | ----------- |
| Weak labels | `make prepare-weak-labels ARGS="..."` | Convert raw CSV into v2 weak-label JSONL |
| Annotation sample | `make sample-annotation-set ARGS="..."` | Create a balanced annotation batch |
| Final dataset | `make build-final-dataset ARGS="..."` | Assign train, validation, test, and cross-platform splits |
| Split validation | `make validate-splits ARGS="..."` | Check leakage and class balance |
| Evaluation | `make evaluate-v2 ARGS="..."` | Compute signal, severity, and calibration metrics |
| ONNX export | `make export-student-onnx ARGS="..."` | Export and quantize a student model |

### Extension Development

| Task       | Command                  | Description               |
| ---------- | ------------------------ | ------------------------- |
| **Setup**  | `make install-extension` | Install npm dependencies  |
| **Lint**   | `make lint-extension`    | Check code with Prettier  |
| **Format** | `make format-extension`  | Auto-format with Prettier |

**Loading in Browser:**

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `extension` folder.

---

## 🧪 Testing

### Backend Tests

We use `pytest` for backend verification, and Python dependencies are managed centrally through `pyproject.toml`.

```bash
# Run all tests
make test-backend

# Run with coverage report
make test-backend-cov
```

The v2 test suite now covers:
- `/api/v2/analyze/comments`
- dataset split integrity helpers
- v2 configuration defaults

---

## ⚙️ Configuration

### Environment Variables (.env)

The `make setup` command creates a `.env` file with these defaults:

| Variable     | Default                     | Description                  |
| ------------ | --------------------------- | ---------------------------- |
| `MODEL_ID` | `ekam28/emotion-detector` | Legacy compatibility model |
| `V2_MODEL_ID` | `ekam28/emotion-detector` | v2 HF model path if not using ONNX |
| `ONNX_MODEL_PATH` | `` | Directory containing `model.onnx` and tokenizer files |
| `HF_HOME` | `./backend/app/model_cache` | Model cache directory |
| `LOG_LEVEL` | `DEBUG` | Logging level |
| `PYTHONPATH` | `./backend` | Required for local execution |

### Git Hooks

Pre-commit hooks are installed automatically by `make setup`. They run Ruff and Prettier on every commit to ensure code quality.

To run them manually:

```bash
pre-commit run --all-files
```

---

## 📂 Project Structure

```text
.
├── backend/               # Python Flask API
│   ├── app/               # Core application logic
│   │   ├── research/      # Dataset, evaluation, and export helpers
│   │   └── v2/            # v2 taxonomy, aggregation, and inference
│   ├── scripts/           # CLI entry points for dataset and model tooling
│   ├── tests/             # Pytest suite
│   ├── Dockerfile         # Container config
│   └── wsgi.py            # WSGI entrypoint
├── docs/v2/               # Dataset/model cards and safety docs
├── extension/             # Browser extension code
├── Makefile               # Task automation
├── pyproject.toml         # Python packaging, dependencies, and tool configuration
├── research/              # Experiment configs and manifests
├── docker-compose.yml     # Orchestration
└── README.md              # Project overview
```

---

## 🤝 Contributing

1. **Branch**: `git checkout -b feature/your-feature`
2. **Setup**: Run `make setup` to ensure latest dependencies and hooks are installed.
3. **Changes**: Write your code and tests.
4. **Quality**: Run `make lint` and `make format` before committing.
5. **Verify**: Ensure `make test-backend` passes.
6. **Pull Request**: Submit via GitHub for review.

---

## 📄 License

MIT License
