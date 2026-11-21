# Image produksi ringan CPU-only (ONNX Runtime, tanpa PyTorch CUDA)
# Kompatibel untuk AWS EC2 maupun Hugging Face Spaces (Docker Space, port 7860)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    MODEL_PATH=/app/weights/best.onnx

WORKDIR /app

# Dependensi sistem minimal untuk opencv-python-headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-service.txt /app/requirements-service.txt
RUN pip install --no-cache-dir -r /app/requirements-service.txt

COPY service/app /app/app
RUN mkdir -p /app/weights

# Opsional saat build CI/CD: unduh bobot ONNX dari GitHub Releases / HF Hub
ARG WEIGHTS_URL=""
RUN if [ -n "$WEIGHTS_URL" ]; then \
      curl -fL "$WEIGHTS_URL" -o /app/weights/best.onnx && test -s /app/weights/best.onnx; \
    fi

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/ready || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
