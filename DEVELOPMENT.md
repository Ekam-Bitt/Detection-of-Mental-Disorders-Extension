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

For backend changes, we use **Ruff** for linting and formatting.

| Task        | Command               | Description                              |
| ----------- | --------------------- | ---------------------------------------- |
| **Run API** | `make run-backend`    | Starts Flask server locally on port 8000 |
| **Lint**    | `make lint-backend`   | Check code with Ruff                     |
| **Format**  | `make format-backend` | Auto-format code with Ruff               |
| **Test**    | `make test-backend`   | Run backend tests with pytest            |
| **Cleanup** | `make clean`          | Remove caches and model artifacts        |

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

---

## ⚙️ Configuration

### Environment Variables (.env)

The `make setup` command creates a `.env` file with these defaults:

| Variable     | Default                     | Description                  |
| ------------ | --------------------------- | ---------------------------- |
| `MODEL_ID`   | `ekam28/emotion-detector`   | Hugging Face model ID        |
| `HF_HOME`    | `./backend/app/model_cache` | Model cache directory        |
| `LOG_LEVEL`  | `DEBUG`                     | Logging level                |
| `PYTHONPATH` | `./backend`                 | Required for local execution |

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
│   ├── tests/             # Pytest suite
│   ├── Dockerfile         # Container config
│   └── wsgi.py            # WSGI entrypoint
├── extension/             # Browser extension code
├── Makefile               # Task automation
├── pyproject.toml         # Python packaging, dependencies, and tool configuration
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
