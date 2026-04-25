# Mental Wellbeing Guard

![GitHub Release](https://img.shields.io/github/v/release/Ekam-Bitt/Detection-of-Mental-Disorders-Extension)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Ekam-Bitt/Detection-of-Mental-Disorders-Extension/docker-build.yml?label=build)
![GitHub License](https://img.shields.io/github/license/Ekam-Bitt/Detection-of-Mental-Disorders-Extension)

A privacy-first, local-only wellbeing platform that combines a **web dashboard**, a **self-analysis tool**, and a **Chrome extension** into a single unified product. It runs a quantized ONNX RoBERTa model entirely on your machine — no cloud, no telemetry, no external data sharing.

---

## Architecture Overview

The project is organized into three product surfaces that share a single backend and data store:

```
┌────────────────────────────────────────────────────────────────┐
│                     Local Backend (Flask)                      │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │ ONNX Runtime │  │  Wellbeing    │  │ Product Web Hub     │  │
│  │ Inference    │  │ Store (SQLite)│  │ (Jinja templates +  │  │
│  │ Engine       │  │               │  │  static JS/CSS)     │  │
│  └──────┬───────┘  └──────┬────────┘  └─────────┬───────────┘  │
│         │                 │                     │              │
│         └────────┬────────┘                     │              │
│                  ▼                              ▼              │
│            REST API (/api/*)              Web Hub (/)          │
└─────────────┬────────────────────────────────┬─────────────────┘
              │                                │
   ┌──────────▼───────────┐        ┌───────────▼──────────┐
   │   Chrome Extension   │        │   Browser (Hub UI)   │
   │  • Page monitor      │        │  • Dashboard         │
   │  • Shield mode       │        │  • Self-check        │
   │  • Smart nudges      │        │  • Recent timeline   │
   │  • Support prompts   │        │  • Extension guide   │
   │  • Popup dashboard   │        └──────────────────────┘
   └──────────────────────┘
```

### How the pieces connect

| Surface | What it does | Data flow |
|:--------|:-------------|:----------|
| **Web Hub** (`localhost:8000`) | Full-screen dashboard for weekly trend review, manual self-checks, and extension guidance. | Reads/writes events and settings via `/api/dashboard`, `/api/self-check`, `/api/settings`. |
| **Chrome Extension** | Passive page monitor + popup for on-demand thread scans. Shields high-risk comments, triggers nudges, surfaces support prompts on drafts. | Sends analyzed events to `/api/events`, reads settings from `/api/settings`, fetches dashboard from `/api/dashboard`. Falls back to `chrome.storage.local` when backend is unreachable. |
| **Backend API** | Flask server with ONNX inference, SQLite-backed wellbeing store, and server-rendered product hub. | Serves the hub UI, processes `/api/analyze` and `/api/self-check` requests, persists events and settings in a Docker volume. |

All three surfaces share the **same SQLite database** (via Docker volume `wellbeing-data`) and the **same settings store**, so a self-check run on the web hub and a browsing session tracked by the extension both appear on the same unified timeline.

---

## Quick Start

### Prerequisites

- **Docker Desktop** (with Compose v2)
- **Chrome** or any Chromium-based browser

This Docker-first flow is the recommended path for macOS, Linux, and Windows first-time setup.

### 1. Clone the repository

```bash
git clone https://github.com/Ekam-Bitt/Detection-of-Mental-Disorders-Extension.git
cd Detection-of-Mental-Disorders-Extension
```

Or download the [latest release](https://github.com/Ekam-Bitt/Detection-of-Mental-Disorders-Extension/releases/latest) source archive and unzip.

### 2. Start the backend

```bash
docker compose up --build
```

The first build takes a few minutes for Python dependency installation. On first Docker startup, the app downloads the quantized ONNX runtime model and caches it in a persistent Docker volume for reuse.

On Windows, use the same command from PowerShell or Command Prompt with Docker Desktop running.

### 3. Open the web hub

Navigate to **[http://localhost:8000](http://localhost:8000)** in your browser. This is the primary product surface:

- **Dashboard** — weekly exposure trends, emotional diet breakdown, and a unified event timeline
- **Self-check** — paste any text for private analysis; results feed into the shared dashboard
- **Extension companion** — guidance on what syncs from the extension and what stays in-browser

### 4. Load the extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder from this repo

The extension icon appears in the toolbar. It will automatically monitor supported sites in the background.

For local development commands, formatting, and backend test workflow, see [DEVELOPMENT.md](/Users/ekambitt/Projects/Detection-of-Mental-Disorders-Extension/DEVELOPMENT.md).

---

## Features

### Web Hub (localhost:8000)

- **Weekly Wellbeing Dashboard** — rolling 7-day trend of risk exposure, volatility, emotional diet (calm / watchful / intense), and source mix (extension vs. self-checks)
- **Manual Self-Check** — paste a journal note, message, or any text; the analysis result is persisted in the shared timeline with an optional support prompt for high-risk text
- **Unified Timeline** — recent events from both browsing sessions and manual checks in one chronological view
- **Support Resources** — locale-aware crisis hotline links (India, US, fallback) that surface automatically for high-risk results

### Chrome Extension

- **Passive Page Monitor** — auto-extracts and analyzes up to 24 comments on YouTube, Reddit, and X (Twitter) on every page load / scroll, with debounced re-analysis
- **Smart Shield Mode** — blurs comments exceeding a configurable distress threshold; click to reveal
- **Rabbit-Hole Nudges** — detects when a thread is unusually intense and offers a 5-minute breather flow that temporarily shields all elevated comments
- **Draft-Time Support Prompts** — watches your own text inputs for high-risk keywords and surfaces grounding guidance with local crisis contacts
- **Popup Dashboard** — compact 7-day trend overview, settings panel, and manual thread scan with comment-by-comment breakdown and label filtering
- **Browsing Session Tracking** — passively records time on supported domains with the thread's risk score and syncs it to the backend on tab switch / close

### Shared Across Surfaces

- **7 Classification Labels** — ADHD, Anxiety, Autism, BPD, Depression, PTSD, Normal
- **Distress-Weighted Risk Score** — composite metric combining label probabilities, distress weights, and keyword boosting
- **Volatility Detection** — flags erratic session-to-session swings in risk exposure
- **Settings Sync** — shield threshold, nudge toggles, and support prompt toggles are shared between hub and extension via the backend; extension falls back to local cache if backend is down

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| **ML Model** | RoBERTa fine-tuned on mental health text, distributed as an INT8 ONNX runtime artifact (~120 MB) |
| **Inference Runtime** | ONNX Runtime (CPU, 2 intra-op threads) — no PyTorch needed at runtime |
| **Backend** | Python 3.10, Flask 3.x, Gunicorn (1 worker, 2 threads) |
| **Data Store** | SQLite via Docker volume (`wellbeing-data`) |
| **Product Hub** | Server-rendered Jinja2 template + vanilla JS/CSS (DM Sans + Fraunces fonts, glassmorphism aesthetic) |
| **Extension** | Chrome Manifest V3, ES modules, Chart.js for popup charts |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions (lint, test, CodeQL, Docker build, release) |

---

## Model Details

Fine-tuned RoBERTa hosted on Hugging Face: [ekam28/emotion-detector](https://huggingface.co/ekam28/emotion-detector)

Quantized ONNX runtime artifact used by the app: [ekam28/emotion-detector-onnx](https://huggingface.co/ekam28/emotion-detector-onnx)

| Label | Condition |
|:------|:----------|
| `LABEL_0` | ADHD |
| `LABEL_1` | Anxiety |
| `LABEL_2` | Autism |
| `LABEL_3` | BPD (Borderline Personality Disorder) |
| `LABEL_4` | Depression |
| `LABEL_5` | PTSD |
| `LABEL_6` | Normal |

The production build uses a **quantized ONNX** model for fast CPU inference without PyTorch:

```
Original (FP32):  ~499 MB
Quantized (INT8): ~125 MB  (75% reduction)
```

---

## API Reference

| Method | Endpoint | Purpose |
|:-------|:---------|:--------|
| `POST` | `/api/analyze` | Batch-classify an array of comments |
| `POST` | `/api/self-check` | Analyze a single text, persist the event, return support resources |
| `POST` | `/api/events` | Ingest a wellbeing event (from extension) |
| `GET`  | `/api/dashboard` | Return dashboard summary, recent events, and current settings |
| `GET / PATCH` | `/api/settings` | Read or update wellbeing settings |
| `GET`  | `/api/support-resource` | Locale-aware crisis support resource |
| `GET`  | `/health` | Backend health check with model status |

---

## Project Structure

```
Detection-of-Mental-Disorders-Extension/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── config.py            # AppConfig (model path, DB path, top-k)
│   │   ├── inference.py         # ONNX Runtime inference engine
│   │   ├── routes.py            # API routes + product hub route
│   │   ├── store.py             # WellbeingStore (SQLite CRUD)
│   │   ├── wellbeing.py         # Risk scoring, volatility, dashboard logic
│   │   ├── templates/
│   │   │   └── index.html       # Web hub Jinja2 template
│   │   └── static/
│   │       ├── app.js           # Hub client-side logic
│   │       └── app.css          # Hub styles (glassmorphism, DM Sans)
│   ├── tests/                   # pytest suite (analyze, health, config, product)
│   ├── bootstrap_model.py       # Downloads the ONNX runtime model if it is missing
│   ├── Dockerfile               # Production image (python:3.10-slim)
│   ├── requirements.txt         # Runtime deps (Flask, ONNX, transformers)
│   ├── requirements-dev.txt     # Dev deps (pytest, black, flake8)
│   └── wsgi.py                  # Gunicorn entry point
├── extension/
│   ├── manifest.json            # Manifest V3 definition
│   ├── background.js            # Service worker: session tracking, event sync
│   ├── page-monitor.js          # Content script: auto-analysis, shielding, nudges, drafts
│   ├── content.js               # Injected script: comment extraction (YouTube/Reddit/X)
│   ├── config.js                # Shared constants and thresholds
│   ├── popup.html               # Extension popup UI
│   ├── styles.css               # Popup styles
│   ├── content.css              # In-page shield/nudge/support styles
│   ├── js/
│   │   ├── main.js              # Popup entry: bind views, settings, analyze button
│   │   ├── analysis.js          # Risk scoring and summary (mirrors backend wellbeing.py)
│   │   ├── api.js               # /api/analyze client (single + batch)
│   │   ├── backend-api.js       # /api/settings, /api/dashboard, /api/events client
│   │   ├── chart.js             # Chart.js wrapper for popup charts
│   │   ├── comments.js          # Extract + batch-analyze orchestration
│   │   ├── shield.js            # Shield mode toggle helpers
│   │   ├── state.js             # In-memory popup state (results, batch cursor)
│   │   ├── ui.js                # Popup DOM rendering
│   │   └── wellbeing-storage.js # Settings sync (backend → chrome.storage fallback)
│   └── libs/
│       └── chart.umd.min.js     # Bundled Chart.js
├── docker-compose.yml           # Single service + named volume
├── Makefile                     # Dev shortcuts (lint, test, format, docker)
├── pyproject.toml               # Black + pytest config
├── .github/workflows/           # CI: lint, test, CodeQL, Docker build, release
├── DEVELOPMENT.md               # Developer setup guide
└── README.md                    # ← You are here
```

---

## Troubleshooting

| Problem | Fix |
|:--------|:----|
| **Docker build fails on Apple Silicon** | The compose file defaults `DOCKER_PLATFORM` to `linux/arm64`. Override it with `DOCKER_PLATFORM=linux/amd64 docker compose up --build` on Intel Macs or Linux. |
| **Extension won't connect to backend** | Ensure Docker is running and `curl http://localhost:8000/health` returns `"status": "ok"`. |
| **Do I need to export or quantize the model first?** | No. Docker and the backend bootstrap script download the quantized runtime model automatically if it is missing. |
| **Comments not detected on Reddit** | Reddit frequently changes its DOM. If selectors stop working, check `page-monitor.js` and `content.js` for the selector arrays. |
| **High CPU / lag** | The Dockerfile limits Gunicorn to 1 worker, 2 threads, and ONNX to 2 intra-op threads. If your machine is still lagging, lower `OMP_NUM_THREADS` in the Dockerfile. |

For developer-oriented troubleshooting and command references, use [DEVELOPMENT.md](/Users/ekambitt/Projects/Detection-of-Mental-Disorders-Extension/DEVELOPMENT.md).

---

## Disclaimer

This tool is for **educational and informational purposes only**. It is **NOT** a diagnostic tool and should not be used to diagnose mental health conditions. The results are based on statistical patterns in text and may not reflect the actual mental state of an individual.

If any result feels urgent, contact local emergency support or a trusted person immediately.

---

## License

MIT License
