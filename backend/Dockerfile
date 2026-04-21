FROM python:3.10-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends binutils \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY pyproject.toml ./
COPY backend ./backend

RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu ".[ml]" \
    && rm -rf /opt/venv/lib/python3.10/site-packages/torch/include \
        /opt/venv/lib/python3.10/site-packages/torch/test \
    && find /opt/venv -type d \( -name __pycache__ -o -name tests \) -prune -exec rm -rf '{}' + \
    && find /opt/venv -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete \
    && rm -rf /opt/venv/lib/python3.10/site-packages/pip* \
        /opt/venv/lib/python3.10/site-packages/setuptools* \
        /opt/venv/lib/python3.10/site-packages/wheel* \
    && find /opt/venv/lib/python3.10/site-packages -type f \( -name '*.so' -o -name '*.so.*' \) -exec strip --strip-unneeded '{}' + || true

FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MODEL_ID=ekam28/emotion-detector \
    HF_HOME=/app/model_cache \
    LOG_LEVEL=INFO \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Setup non-root user early
RUN useradd --create-home --shell /bin/bash appuser \
    && mkdir -p /app/model_cache \
    && chown -R appuser:appuser /app

# Copy the virtual environment and app files with correct ownership directly
# This avoids the "Layer Doubling" effect of a separate RUN chown command
COPY --from=builder --chown=appuser:appuser /opt/venv /opt/venv
COPY --chown=appuser:appuser backend/ ./

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=5)" || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "4", "wsgi:app"]
