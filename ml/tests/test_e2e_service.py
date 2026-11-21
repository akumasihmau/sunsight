"""Uji end-to-end FastAPI ML Service SunSight (GET /health, GET /ready, POST /api/v1/predict)."""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
SVC_DIR = ROOT / "service"
SAMPLE_IMG = ROOT / "data" / "raw_esri_bogor" / "images" / "bogor_bogor_timur_z19_417713_271790.jpg"


def main() -> None:
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"],
        cwd=str(SVC_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        ready_ok = False
        for _ in range(40):
            try:
                r = requests.get("http://127.0.0.1:8001/ready", timeout=2)
                if r.status_code == 200:
                    print("GET /ready  ->", r.status_code, r.json())
                    ready_ok = True
                    break
            except Exception:
                time.sleep(0.5)
        if not ready_ok:
            out, err = proc.communicate(timeout=3)
            raise RuntimeError(f"Service gagal ready.\nSTDOUT:\n{out}\nSTDERR:\n{err}")

        h = requests.get("http://127.0.0.1:8001/health", timeout=2)
        print("GET /health ->", h.status_code, h.json())

        with SAMPLE_IMG.open("rb") as fh:
            pr = requests.post(
                "http://127.0.0.1:8001/api/v1/predict",
                params={"min_confidence": 0.25},
                files={"file": ("capture.jpg", fh, "image/jpeg")},
                timeout=30,
            )
        payload = pr.json()
        assert pr.status_code == 200
        assert payload["success"] is True
        assert payload["data"]["total_detections"] > 0
        print(
            "POST /api/v1/predict ->",
            pr.status_code,
            "| success:", payload["success"],
            "| total_detections:", payload["data"]["total_detections"],
            "| inference_ms:", payload["meta"]["inference_time_ms"],
            "| model:", payload["meta"]["model"],
        )
        print("SAMPLE DETECTION[0]:", payload["data"]["detections"][0])
        print("E2E FASTAPI CONTRACT TEST PASSED!")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    main()
