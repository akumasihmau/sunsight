"""
FastAPI ML Service SunSight — Kontrak 100% kompatibel dengan Laravel MlClient.php.

Endpoint:
  - GET  /health
  - GET  /ready
  - POST /api/v1/predict  (multipart `file` + query `min_confidence`, `roi_*`, opsional `X-Api-Key`)
"""

from __future__ import annotations

import asyncio
import hmac
import io
import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from .config import settings
from .inference import OnnxRoofSegmenter

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = logging.getLogger("sunsight.ml")
Image.MAX_IMAGE_PIXELS = settings.max_image_pixels

segmenter = OnnxRoofSegmenter(settings)
_inference_semaphore: Optional[asyncio.Semaphore] = None


def get_inference_semaphore() -> asyncio.Semaphore:
    global _inference_semaphore
    if _inference_semaphore is None:
        _inference_semaphore = asyncio.Semaphore(max(1, settings.max_concurrent_inferences))
    return _inference_semaphore


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        segmenter.load()
    except FileNotFoundError as exc:
        logger.warning("Layanan menyala tanpa bobot (/ready akan 503): %s", exc)
    except Exception as exc:
        logger.exception("Gagal memuat model ONNX saat startup: %s", exc)
    yield


app = FastAPI(
    title="SunSight Roof Segmentation ML Service",
    version=settings.model_version,
    lifespan=lifespan,
)


def verify_api_key(x_api_key: Optional[str] = Header(default=None, alias="X-Api-Key")) -> None:
    if settings.api_key and not hmac.compare_digest(x_api_key or "", settings.api_key):
        raise HTTPException(status_code=401, detail="Invalid or missing X-Api-Key")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    if not segmenter.is_loaded:
        return JSONResponse(
            status_code=503,
            content={"status": "loading", "model_loaded": False},
        )
    return {"status": "ready", "model_loaded": True}


@app.post(f"{settings.api_v1_prefix}/predict", dependencies=[Depends(verify_api_key)])
async def predict(
    file: UploadFile = File(...),
    min_confidence: float = Query(default=settings.model_confidence, ge=0.0, le=1.0),
    roi_x1: Optional[int] = Query(default=None, ge=0),
    roi_y1: Optional[int] = Query(default=None, ge=0),
    roi_x2: Optional[int] = Query(default=None, ge=1),
    roi_y2: Optional[int] = Query(default=None, ge=1),
    model_version: str = Query(default="latest"),
):
    del model_version  # Layanan memuat tepat satu berkas bobot sesuai kontrak
    request_id = f"req_{uuid.uuid4().hex[:12]}"

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(raw_bytes) > settings.max_image_size:
        raise HTTPException(status_code=413, detail="Image exceeds maximum allowed size")

    try:
        pil_img = Image.open(io.BytesIO(raw_bytes))
        if pil_img.format not in {"JPEG", "PNG", "WEBP"}:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image format: {pil_img.format}. Use JPEG, PNG, or WebP.",
            )
        width, height = pil_img.size
        if width * height > settings.max_image_pixels:
            raise HTTPException(status_code=400, detail="Image resolution exceeds 20 MP limit")
        rgb = np.asarray(pil_img.convert("RGB"))
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Corrupted or unrecognized image file")

    # Validasi ROI opsional (jika diberikan)
    roi_tuple: Optional[tuple[int, int, int, int]] = None
    if any(v is not None for v in (roi_x1, roi_y1, roi_x2, roi_y2)):
        rx1 = roi_x1 if roi_x1 is not None else 0
        ry1 = roi_y1 if roi_y1 is not None else 0
        rx2 = roi_x2 if roi_x2 is not None else width
        ry2 = roi_y2 if roi_y2 is not None else height
        if rx1 >= rx2 or ry1 >= ry2:
            raise HTTPException(status_code=400, detail="Invalid ROI bounds (x1>=x2 or y1>=y2)")
        if not (rx1 == 0 and ry1 == 0 and rx2 == width and ry2 == height):
            roi_tuple = (rx1, ry1, rx2, ry2)

    if not segmenter.is_loaded:
        # Kontrak docs/ml-service-design.md: kegagalan inferensi -> HTTP 200 dengan success=false
        return {
            "success": False,
            "request_id": request_id,
            "data": None,
            "error": "Model weights are not loaded",
            "meta": {
                "model": settings.model_name,
                "model_version": settings.model_version,
                "inference_time_ms": 0.0,
            },
        }

    t0 = time.perf_counter()
    try:
        async with get_inference_semaphore():
            detections = await asyncio.to_thread(
                segmenter.predict,
                bgr,
                min_confidence,
                roi_tuple,
            )
    except Exception as exc:
        logger.exception("Inferensi gagal [%s]: %s", request_id, exc)
        return {
            "success": False,
            "request_id": request_id,
            "data": None,
            "error": "Internal inference error",
            "meta": {
                "model": settings.model_name,
                "model_version": settings.model_version,
                "inference_time_ms": round((time.perf_counter() - t0) * 1000.0, 2),
            },
        }

    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    return {
        "success": True,
        "request_id": request_id,
        "data": {
            "image": {"width": width, "height": height},
            "total_detections": len(detections),
            "detections": detections,
        },
        "error": None,
        "meta": {
            "model": settings.model_name,
            "model_version": settings.model_version,
            "inference_time_ms": elapsed_ms,
        },
    }
