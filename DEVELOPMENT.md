# Development Setup Guide

## Prerequisites

- Python 3.10+
- Node.js 20+
- Docker & Docker Compose
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Ekam-Bitt/Detection-of-Mental-Disorders-Extension.git
cd Detection-of-Mental-Disorders-Extension
```

### 2. Backend Setup (Local Development)

#### Option A: Using Docker (Recommended)

```bash
docker compose up --build
```

The backend will be available at `http://localhost:8000`

#### Option B: Local Python Environment

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Run the development server
python -m flask --app wsgi:app run --port 8000 --debug
```

### 3. Extension Setup

```bash
cd extension

# Install dependencies
npm install

# Load the extension in Chrome:
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the extension folder
```

## Development Workflow

### Backend Development

```bash
# Activate virtual environment
source .venv/bin/activate

# Run linting
flake8 backend/
black --check backend/

# Format code
black backend/

# Run tests
pytest backend/tests/
```

### Extension Development

```bash
cd extension

# Run linting
npx prettier --check .

# Format code
npx prettier --write .
```

### Pre-commit Hooks

Install pre-commit hooks to automatically lint code before committing:

```bash
# Install pre-commit
pip install pre-commit
pre-commit install
```

## Testing

### Backend Tests

```bash
# Run all tests
pytest backend/tests/ -v

# Run with coverage
pytest backend/tests/ -v --cov=backend/app --cov-report=html
```

### Extension Tests

```bash
cd extension
npm test
```

## API Endpoints

- `POST /api/analyze` - Analyze text for emotions
- `GET /health` - Health check endpoint

## Configuration

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_ID` | `ekam28/emotion-detector` | Hugging Face model ID |
| `HF_HOME` | `/app/model_cache` | Model cache directory |
| `LOG_LEVEL` | `INFO` | Logging level |

### Extension Configuration

Edit `extension/config.js` to modify:
- Backend API URL
- Analysis settings
- UI preferences

## Troubleshooting

### Backend Issues

**Model not loading:**
```bash
# Clear model cache
rm -rf backend/app/model_cache
docker compose up --build
```

**Port already in use:**
```bash
# Change port in docker-compose.yml
ports:
  - "8001:8000"  # Use 8001 instead
```

### Extension Issues

**Extension not loading:**
1. Check `manifest.json` for errors
2. Ensure all files are in the extension folder
3. Reload the extension at `chrome://extensions/`

**API connection errors:**
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check CORS settings in `backend/app/__init__.py`

## Project Structure

```
Detection-of-Mental-Disorders-Extension/
├── backend/
│   ├── app/
│   │   ├── __init__.py      # Flask app factory
│   │   ├── config.py        # Configuration
│   │   ├── inference.py     # ML model inference
│   │   └── routes.py        # API routes
│   ├── tests/               # Backend tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── wsgi.py
├── extension/
│   ├── background.js        # Service worker
│   ├── content.js           # Content script
│   ├── popup.html           # Extension popup
│   ├── styles.css
│   ├── config.js
│   ├── manifest.json
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and write tests
3. Run linting: `flake8` and `black` for backend, `prettier` for extension
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License
