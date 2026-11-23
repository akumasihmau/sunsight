# Image produksi ringan CPU-only (ONNX Runtime, tanpa PyTorch CUDA)
# Kompatibel untuk AWS EC2 maupun Hugging Face Spaces (Docker Space, port 7860)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    MODEL_PATH=/app/weights/best_v3.onnx \
    MODEL_NAME=yolo11m-seg-clahe \
    MODEL_VERSION=v3-esri-bogor-pro \
    MODEL_IMAGE_SIZE=1280 \
    MODEL_CONFIDENCE=0.18 \
    MODEL_IOU_THRESHOLD=0.40 \
    USE_CLAHE_LAB=true \
    MAX_ASPECT_RATIO=7.5 \
    RECTANGULARITY_SNAP_THRESHOLD=0.84 \
    ORTHOGONAL_MIN_RECTANGULARITY=0.58

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

# Opsional saat build CI/CD: unduh bobot ONNX dari GitHub Releases / HF Hub / Drive direct link
ARG WEIGHTS_URL=""
RUN if [ -n "$WEIGHTS_URL" ]; then \
      curl -fL "$WEIGHTS_URL" -o /app/weights/best_v3.onnx && test -s /app/weights/best_v3.onnx; \
    fi

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/ready || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
