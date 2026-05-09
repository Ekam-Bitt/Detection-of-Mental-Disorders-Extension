# Mental Wellbeing Guard

![GitHub Release](https://img.shields.io/github/v/release/Ekam-Bitt/Detection-of-Mental-Disorders-Extension)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Ekam-Bitt/Detection-of-Mental-Disorders-Extension/docker-build.yml?label=build)
![GitHub License](https://img.shields.io/github/license/Ekam-Bitt/Detection-of-Mental-Disorders-Extension)

A dual-mode wellbeing platform that combines a **Chrome extension**, an optional **web dashboard**, and a **self-analysis tool**. It uses a quantized ONNX RoBERTa model to classify mental health signals in social media comments across YouTube, Reddit, and X (Twitter).

**v2.0** introduces **Cloud Mode** (default) for zero-setup usage via Hugging Face Spaces, while **Local Mode** retains the full Docker-based pipeline with dashboard, history tracking, and complete data privacy.

---

## Architecture Overview

```
                        Chrome Extension
                              |
               +--------------+--------------+
               |                             |
        Cloud Mode (default)          Local Mode (opt-in)
               |                             |
    HF Space ONNX API              Docker Flask Backend
    (ekam28-emotion-                  localhost:8000
     detector-api.hf.space)              |
               |                    +----+----+
               |                    |         |
          Inference only       ONNX Runtime  SQLite DB
                                    |         |
                               Inference   Dashboard
                                           + History
```

### Mode Comparison

| Capability | Cloud Mode | Local Mode |
|:-----------|:-----------|:-----------|
| Comment analysis | Yes | Yes |
| Shield Mode (on-page blur) | Yes | Yes |
| Smart Nudges | Yes | Yes |
| Draft Support Prompts | Yes | Yes |
| Weekly Dashboard | No | Yes |
| Trend Charts | No | Yes |
| Browsing History | No | Yes |
| Web Hub (localhost:8000) | No | Yes |
| Setup required | None | Docker |
| Data privacy | Data sent to HF Space | Fully local |
| Settings storage | chrome.storage | Backend + chrome.storage |

---

## Quick Start

### Cloud Mode (Recommended)

1. Download the [latest release](https://github.com/Ekam-Bitt/Detection-of-Mental-Disorders-Extension/releases/latest) and unzip
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `extension/` folder
5. Done. The extension works immediately using the hosted HF Space API.

### Local Mode (Privacy-First)

For users who want full data privacy, dashboard, and history tracking:

#### Prerequisites

- **Docker Desktop** (with Compose v2)
- **Chrome** or any Chromium-based browser

#### 1. Clone the repository

```bash
git clone https://github.com/Ekam-Bitt/Detection-of-Mental-Disorders-Extension.git
cd Detection-of-Mental-Disorders-Extension
```

#### 2. Start the backend

```bash
docker compose up --build
```

The first build takes a few minutes. On first startup, the app downloads the quantized ONNX model (~500 MB) and caches it in a persistent Docker volume.

#### 3. Load the extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `extension/` folder

#### 4. Switch to Local Mode

Open the extension popup, go to the **Settings** tab, and select **Local** under Inference Mode. The extension will verify the backend connection automatically.

#### 5. Open the Web Hub

Navigate to **[http://localhost:8000](http://localhost:8000)** for the full dashboard experience:

- **Dashboard** -- weekly exposure trends, emotional diet breakdown, unified event timeline
- **Self-check** -- paste any text for private analysis; results feed into the shared dashboard
- **Extension companion** -- guidance on what syncs from the extension

---

## Features

### Chrome Extension (Both Modes)

- **Passive Page Monitor** -- auto-extracts and analyzes up to 24 comments on YouTube, Reddit, and X (Twitter) on every page load and scroll, with debounced re-analysis
- **Smart Shield Mode** -- blurs high-risk comments directly on the website when they exceed a configurable distress threshold; click to reveal
- **Rabbit-Hole Nudges** -- detects unusually intense threads and offers a 5-minute breather that temporarily shields all elevated comments
- **Draft-Time Support Prompts** -- watches your text inputs for high-risk keywords and surfaces grounding guidance with local crisis contacts
- **Manual Thread Scan** -- on-demand analysis with comment-by-comment breakdown, label filtering, and a Thread Mix chart
- **Incremental Analysis** -- previously analyzed comments are cached and skipped on re-scan, avoiding redundant API calls
- **Settings Tab** -- configure inference mode, shield threshold, nudge toggles, and support prompts in one place

### Local Mode Extras

- **Popup Dashboard** -- compact 7-day trend overview with exposure stats and emotional diet breakdown
- **Browsing Session Tracking** -- passively records time on supported domains with risk scores and syncs to the backend
- **Web Hub** -- full-screen dashboard, self-check tool, and unified timeline at localhost:8000

### Shared Across Surfaces

- **7 Classification Labels** -- ADHD, Anxiety, Autism, BPD, Depression, PTSD, Normal
- **Distress-Weighted Risk Score** -- composite metric combining label probabilities, distress weights, and keyword boosting
- **Volatility Detection** -- flags erratic session-to-session swings in risk exposure

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| **ML Model** | RoBERTa fine-tuned on mental health text, distributed as an INT8 ONNX artifact (~120 MB) |
| **Cloud Inference** | Hugging Face Spaces (Docker SDK, FastAPI, ONNX Runtime) |
| **Local Inference** | ONNX Runtime (CPU, 2 intra-op threads) -- no PyTorch needed at runtime |
| **Backend** | Python 3.10, Flask 3.x, Gunicorn (1 worker, 2 threads) |
| **Data Store** | SQLite via Docker volume (`wellbeing-data`) |
| **Product Hub** | Server-rendered Jinja2 template + vanilla JS/CSS |
| **Extension** | Chrome Manifest V3, ES modules, Chart.js for popup charts |
| **Infrastructure** | Docker, Docker Compose, GitHub Actions (lint, test, CodeQL, Docker build, release) |

---

## Model Details

Fine-tuned RoBERTa: [ekam28/emotion-detector](https://huggingface.co/ekam28/emotion-detector)

Quantized ONNX artifact: [ekam28/emotion-detector-onnx](https://huggingface.co/ekam28/emotion-detector-onnx)

Cloud API (HF Space): [ekam28/emotion-detector-api](https://huggingface.co/spaces/ekam28/emotion-detector-api)

| Label | Condition |
|:------|:----------|
| `LABEL_0` | ADHD |
| `LABEL_1` | Anxiety |
| `LABEL_2` | Autism |
| `LABEL_3` | BPD (Borderline Personality Disorder) |
| `LABEL_4` | Depression |
| `LABEL_5` | PTSD |
| `LABEL_6` | Normal |

```
Original (FP32):  ~499 MB
Quantized (INT8): ~125 MB  (75% reduction)
```

---

## API Reference

### Cloud API (HF Space)

| Method | Endpoint | Purpose |
|:-------|:---------|:--------|
| `POST` | `/predict` | Classify a single text |
| `POST` | `/batch` | Classify an array of texts |
| `GET`  | `/health` | Health check with model status |

### Local API (Docker Backend)

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
│   │       └── app.css          # Hub styles
│   ├── tests/                   # pytest suite
│   ├── bootstrap_model.py       # Downloads ONNX model if missing
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── wsgi.py                  # Gunicorn entry point
├── extension/
│   ├── manifest.json            # Manifest V3 definition
│   ├── background.js            # Service worker: session tracking, event sync, mode-aware
│   ├── page-monitor.js          # Content script: auto-analysis, shielding, nudges, drafts
│   ├── content.js               # Injected script: comment extraction (YouTube/Reddit/X)
│   ├── config.js                # Shared constants, thresholds, and dual-mode config
│   ├── popup.html               # Extension popup UI (3 tabs: Dashboard, Thread, Settings)
│   ├── styles.css               # Popup styles
│   ├── content.css              # In-page shield/nudge/support styles
│   ├── js/
│   │   ├── main.js              # Popup entry: views, settings, mode toggle, analyze
│   │   ├── mode.js              # Inference mode manager (cloud/local, health check)
│   │   ├── analysis.js          # Risk scoring and summary
│   │   ├── api.js               # Dual-endpoint inference (cloud HF Space / local Docker)
│   │   ├── backend-api.js       # Local-only: settings, dashboard, events (no-op in cloud)
│   │   ├── chart.js             # Chart.js wrapper for popup charts
│   │   ├── comments.js          # Extract + batch-analyze with incremental caching
│   │   ├── shield.js            # Shield mode toggle helpers
│   │   ├── state.js             # In-memory popup state (results, batch cursor)
│   │   ├── ui.js                # Popup DOM rendering
│   │   └── wellbeing-storage.js # Settings sync (backend or chrome.storage by mode)
│   └── libs/
│       └── chart.umd.min.js     # Bundled Chart.js
├── docker-compose.yml           # Local backend stack + named volume
├── Makefile                     # Dev shortcuts (lint, test, format, docker)
├── pyproject.toml               # Black + pytest config
├── .github/workflows/           # CI: lint, test, CodeQL, Docker build, release
├── DEVELOPMENT.md               # Developer setup guide
└── README.md
```

---

## Troubleshooting

| Problem | Fix |
|:--------|:----|
| **Extension shows "Backend not detected" in Local mode** | Ensure Docker is running and `curl http://localhost:8000/health` returns `"status": "ok"`. |
| **Cloud mode times out** | HF Spaces on free tier sleep after 15 min of inactivity. The first request wakes it up (10--60s). Try again after a moment. |
| **Docker build fails on Apple Silicon** | The compose file defaults `DOCKER_PLATFORM` to `linux/arm64`. Override with `DOCKER_PLATFORM=linux/amd64 docker compose up --build` on Intel Macs or Linux. |
| **Comments not detected on Reddit** | Reddit frequently changes its DOM. Check `page-monitor.js` and `content.js` for selector arrays. |
| **High CPU / lag** | The Dockerfile limits Gunicorn to 1 worker, 2 threads, and ONNX to 2 intra-op threads. Lower `OMP_NUM_THREADS` in the Dockerfile if needed. |

For developer-oriented troubleshooting, see [DEVELOPMENT.md](DEVELOPMENT.md).

---

## Disclaimer

This tool is for **educational and informational purposes only**. It is **NOT** a diagnostic tool and should not be used to diagnose mental health conditions. The results are based on statistical patterns in text and may not reflect the actual mental state of an individual.

If any result feels urgent, contact local emergency support or a trusted person immediately.

---

## License

MIT License
