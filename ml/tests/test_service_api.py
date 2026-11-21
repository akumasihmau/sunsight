"""Verifikasi kontrak API FastAPI ML Service (docs/ml-service-design.md & MlClient.php)."""

from __future__ import annotations

import asyncio
import io
import sys
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image

ML_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_ROOT / "service"))

from app.main import health, predict, ready  # noqa: E402


def _make_jpeg_bytes(w: int = 128, h: int = 128) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), color=(180, 90, 60)).save(buf, format="JPEG")
    return buf.getvalue()


def test_health_and_ready_without_weights():
    h = asyncio.run(health())
    assert h == {"status": "ok"}

    r = asyncio.run(ready())
    # Tanpa bobot best.onnx, /ready wajib mengembalikan 503
    assert r.status_code == 503


def test_predict_validation_and_contract():
    # 1. File kosong -> HTTP 400
    empty_file = UploadFile(filename="empty.jpg", file=io.BytesIO(b""))
    try:
        asyncio.run(predict(file=empty_file, min_confidence=0.25))
        raise AssertionError("Seharusnya melempar HTTPException 400 untuk file kosong")
    except HTTPException as exc:
        assert exc.status_code == 400

    # 2. ROI tidak valid -> HTTP 400
    jpg = UploadFile(filename="roof.jpg", file=io.BytesIO(_make_jpeg_bytes()))
    try:
        asyncio.run(
            predict(file=jpg, min_confidence=0.25, roi_x1=100, roi_y1=0, roi_x2=50, roi_y2=100)
        )
        raise AssertionError("Seharusnya melempar HTTPException 400 untuk ROI tidak valid")
    except HTTPException as exc:
        assert exc.status_code == 400

    # 3. Gambar valid tanpa bobot -> HTTP 200 dengan success=False (sesuai kontrak MlClient.php)
    jpg2 = UploadFile(filename="roof.jpg", file=io.BytesIO(_make_jpeg_bytes()))
    res = asyncio.run(predict(file=jpg2, min_confidence=0.25))
    assert isinstance(res, dict)
    assert res["success"] is False
    assert res["request_id"].startswith("req_")
    assert "meta" in res and "model" in res["meta"]


if __name__ == "__main__":
    test_health_and_ready_without_weights()
    test_predict_validation_and_contract()
    print("ALL API CONTRACT TESTS PASSED!")
