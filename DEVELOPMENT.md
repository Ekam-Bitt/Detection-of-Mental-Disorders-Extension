# Development Setup Guide

Full developer environment for all three product surfaces: the Flask backend, the web hub, and the Chrome extension.

---

## Prerequisites

| Tool | Minimum | Purpose |
|:-----|:--------|:--------|
| Python | 3.10+ | Backend runtime, linting, tests |
| Node.js | 20+ | Extension formatting (Prettier) |
| Docker + Compose v2 | Latest | Production-like local backend |
| Git | Latest | Version control, pre-commit hooks |

---

## One-Command Bootstrap

```bash
# Clone and enter the repo
git clone https://github.com/Ekam-Bitt/Detection-of-Mental-Disorders-Extension.git
cd Detection-of-Mental-Disorders-Extension

# Run the automated setup script
./setup.sh
```

`setup.sh` will:
1. Verify Python, Node.js, and Docker installations
2. Create a `.venv` virtual environment and install backend + dev dependencies
3. Install extension npm dependencies
4. Install pre-commit hooks
5. Create a `.env` file for local development (if missing)

After setup, activate the virtual environment in every new terminal:

```bash
source .venv/bin/activate
```

---

## Starting the Full Stack

### Option A: Docker (recommended for daily use)

```bash
docker compose up --build
```

This builds the production Docker image and starts the backend at `http://localhost:8000`. The web hub is served from the same process. The SQLite database is persisted in a Docker volume (`wellbeing-data`).

### Option B: Bare-metal Flask (for backend hacking)

```bash
source .venv/bin/activate
cd backend
python -m flask --app wsgi:app run --port 8000 --debug
```

When running bare-metal, the ONNX model is loaded from `backend/onnx_model_quantized/` (or whichever path `MODEL_PATH` points to). The SQLite DB defaults to `backend/data/wellbeing.db`.

### Loading the extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder
4. The extension connects to `http://localhost:8000` by default

> **Tip:** After code changes to the extension, click the ↻ reload button on the extension card in `chrome://extensions/`. For `page-monitor.js` or `content.js` changes, also reload the target tab.

---

## Development Workflow

### Makefile Shortcuts

Run `make help` to see all targets. Key commands:

```bash
make install-dev        # Install all backend + extension + dev dependencies
make run-backend        # Start Flask dev server on :8000
make test-backend       # Run pytest suite
make test-backend-cov   # Run pytest with HTML coverage report
make lint               # Lint backend (flake8 + black) and extension (prettier)
make format             # Auto-format all code
make docker-up          # docker compose up --build
make docker-down        # docker compose down
make docker-logs        # docker compose logs -f
make health             # curl localhost:8000/health
make clean              # Remove __pycache__, .pytest_cache, model cache, etc.
```

### Backend Development

```bash
source .venv/bin/activate

# Lint
flake8 backend/
black --check backend/

# Format
black backend/

# Test
pytest backend/tests/ -v

# Test with coverage
pytest backend/tests/ -v --cov=backend/app --cov-report=html --cov-report=term
```

Key backend modules:

| File | Purpose |
|:-----|:--------|
| `app/__init__.py` | Flask app factory — wires CORS, logging, WellbeingStore, ONNX pipeline, routes |
| `app/config.py` | `AppConfig` dataclass reading `MODEL_PATH`, `TOP_K`, `WELLBEING_DB_PATH` from env |
| `app/inference.py` | Loads ONNX model + tokenizer, builds a `predict(texts)` callable with softmax post-processing |
| `app/routes.py` | API blueprint (`/api/analyze`, `/api/self-check`, `/api/events`, `/api/dashboard`, `/api/settings`, `/api/support-resource`) + health check + product hub route |
| `app/store.py` | `WellbeingStore` — SQLite schema, event CRUD, settings merge |
| `app/wellbeing.py` | Domain logic — risk scoring, distress weights, volatility metrics, dashboard summarization, support resources |
| `app/templates/index.html` | Server-rendered Jinja2 template for the web hub |
| `app/static/app.js` | Hub client-side JS (self-check flow, dashboard rendering) |
| `app/static/app.css` | Hub styles (glassmorphism, responsive grid, DM Sans + Fraunces) |

### Extension Development

```bash
cd extension

# Lint
npx prettier --check .

# Format
npx prettier --write .
```

Key extension modules:

| File | Purpose |
|:-----|:--------|
| `manifest.json` | Manifest V3 — permissions, content scripts, service worker |
| `background.js` | Service worker — tab session tracking, event sync, message router |
| `page-monitor.js` | Content script (auto-injected) — passive comment analysis, shield mode, nudges, draft support prompts |
| `content.js` | Injected script (on-demand) — comment DOM extraction for YouTube/Reddit/X |
| `config.js` | Shared constants: thresholds, selectors, labels, support resources |
| `popup.html` / `styles.css` | Popup UI shell and styles |
| `js/main.js` | Popup entry — dashboard view, settings, analyze button |
| `js/analysis.js` | Client-side risk scoring and summary (mirrors `wellbeing.py` logic) |
| `js/api.js` | `/api/analyze` client (single + batch) |
| `js/backend-api.js` | Backend REST client for settings, dashboard, events, support resources |
| `js/comments.js` | Extract + batch-analyze orchestration (popup "Analyze" flow) |
| `js/chart.js` | Chart.js wrapper for popup trend charts |
| `js/shield.js` | Shield mode toggle helpers |
| `js/state.js` | In-memory popup state (results, batch cursor, filters) |
| `js/ui.js` | Popup DOM rendering (dashboard, analysis, settings panels) |
| `js/wellbeing-storage.js` | Settings sync: backend → `chrome.storage.local` fallback |

### Pre-commit Hooks

Pre-commit hooks run automatically on `git commit`:

- `trailing-whitespace`, `end-of-file-fixer`, `check-yaml`, `check-json`, `check-merge-conflict`
- `black` (Python formatting)
- `flake8` (Python linting)
- `prettier` (extension JS/CSS/HTML/JSON formatting)

To install or reinstall:

```bash
pip install pre-commit
pre-commit install
```

---

## Environment Variables

### Backend (runtime)

| Variable | Default | Description |
|:---------|:--------|:------------|
| `MODEL_PATH` | `onnx_model_quantized` | Path to the quantized ONNX model directory |
| `WELLBEING_DB_PATH` | `backend/data/wellbeing.db` | SQLite database file path |
| `TOP_K` | `7` | Number of top labels to return per prediction |
| `LOG_LEVEL` | `INFO` | Python logging level |
| `MAX_CONTENT_LENGTH` | `1048576` | Flask max request body size (bytes) |
| `OMP_NUM_THREADS` | `2` | OpenMP thread limit (set in Dockerfile) |

### Docker Compose

The `docker-compose.yml` sets:
- `MODEL_PATH=/app/onnx_model_quantized`
- `WELLBEING_DB_PATH=/app/data/wellbeing.db`
- `platform: linux/arm64` (remove for Intel/Linux hosts)
- Named volume `wellbeing-data` mounted at `/app/data` for persistent SQLite

### Extension

The extension reads `apiBaseUrl` from `chrome.storage.sync` (default: `http://localhost:8000`). All other configuration lives in `extension/config.js`.

---

## Testing

### Backend Tests

```bash
# All tests
pytest backend/tests/ -v

# With coverage
pytest backend/tests/ -v --cov=backend/app --cov-report=html

# Open coverage report
open htmlcov/index.html
```

Test files:
- `test_analyze.py` — `/api/analyze` validation, batch processing, error cases
- `test_health.py` — `/health` endpoint, model status
- `test_config.py` — `AppConfig.from_env()` defaults and overrides
- `test_product.py` — product hub route, self-check flow, dashboard endpoint

### Extension Tests

```bash
cd extension
npm test
```

---

## ONNX Model Pipeline

The project ships with a pre-quantized ONNX model. If you need to regenerate it from the Hugging Face checkpoint:

```bash
# 1. Install export dependencies (one-time)
pip install optimum[onnxruntime]

# 2. Export HF model to ONNX (FP32, ~499 MB)
cd backend
python convert_to_onnx.py

# 3. Quantize to INT8 (~125 MB, ~75% size reduction)
python quantize_onnx.py
```

The quantized model is used by default in production (`MODEL_PATH=/app/onnx_model_quantized`).

---

## CI / GitHub Actions

| Workflow | Trigger | What it does |
|:---------|:--------|:-------------|
| `lint.yml` | Push / PR | Runs `black --check`, `flake8`, and `prettier --check` |
| `test.yml` | Push / PR | Runs `pytest` on the backend test suite |
| `docker-build.yml` | Push / PR | Builds the Docker image to verify the Dockerfile |
| `codeql.yml` | Push / PR / Schedule | GitHub CodeQL security analysis |
| `release.yml` | Tag push | Creates a GitHub release from a version tag |

---

## Troubleshooting

### Backend Issues

**Model not loading:**
```bash
# Verify the model directory exists and contains model.onnx
ls backend/onnx_model_quantized/

# For Docker: rebuild from scratch
docker compose down -v
docker compose up --build
```

**Port already in use:**
```bash
# Either stop the conflicting process or change the port
# In docker-compose.yml:
ports:
  - "8001:8000"
```

**High CPU usage:**
- Gunicorn is limited to 1 worker / 2 threads (Dockerfile `CMD`)
- ONNX intra-op threads are limited to 2 (`inference.py`)
- `OMP_NUM_THREADS=2` is set in the Dockerfile
- If still too heavy, reduce these values further

### Extension Issues

**Extension not loading:**
1. Verify `manifest.json` has no syntax errors
2. Check Chrome DevTools → Extensions → Errors
3. Reload the extension from `chrome://extensions/`

**API connection errors:**
1. Confirm backend is running: `curl http://localhost:8000/health`
2. Check that `http://localhost:8000/*` is in `host_permissions` in `manifest.json`
3. Check CORS: the backend allows `"*"` origins on `/api/*`

**Comments not detected:**
- Reddit, YouTube, and X change their DOM frequently
- Check the selector arrays in `page-monitor.js` (content script) and `content.js` (injected script)
- Use DevTools to inspect whether comments match the expected selectors

**Settings not syncing:**
- The extension tries to sync settings with the backend on startup and falls back to `chrome.storage.local`
- If the backend was down when the extension initialized, reload the extension after starting the backend

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feature/my-feature`
2. Make changes with tests
3. Run `make lint` and `make test-backend` to verify
4. Submit a pull request

---

## License

MIT License
