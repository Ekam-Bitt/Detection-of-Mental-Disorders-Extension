FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MODEL_PATH=/home/appuser/model-cache/onnx_model_quantized \
    MODEL_REPO_ID=ekam28/emotion-detector-onnx \
    MODEL_REVISION=fa68a75ca66c2dab45f4d6151323d2d4afe75241 \
    LOG_LEVEL=INFO \
    TRANSFORMERS_NO_ADVISORY_WARNINGS=1 \
    ORT_LOG_LEVEL=ERROR \
    OMP_NUM_THREADS=2

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .
RUN mkdir -p /app/data /home/appuser/model-cache \
    && chown -R appuser:appuser /app/data /home/appuser/model-cache

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=5)" || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "2", "--timeout", "120", "wsgi:app"]
