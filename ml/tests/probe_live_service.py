"""Probe live FastAPI ML Service di http://127.0.0.1:8001 (/health, /ready, /api/v1/predict)."""

from pathlib import Path
import requests

BASE = "http://127.0.0.1:8001"
IMG = Path("ml/data/raw_esri_bogor/images/bogor_bogor_timur_z19_417713_271790.jpg")

r_h = requests.get(f"{BASE}/health", timeout=5)
r_r = requests.get(f"{BASE}/ready", timeout=5)
print("GET /health ->", r_h.status_code, r_h.json())
print("GET /ready  ->", r_r.status_code, r_r.json())

with IMG.open("rb") as fh:
    r_p = requests.post(
        f"{BASE}/api/v1/predict",
        params={"min_confidence": 0.25},
        files={"file": ("capture.jpg", fh, "image/jpeg")},
        timeout=30,
    )

body = r_p.json()
assert r_p.status_code == 200 and body["success"] is True
print(
    "POST /api/v1/predict ->",
    r_p.status_code,
    "| success:", body["success"],
    "| total_detections:", body["data"]["total_detections"],
    "| meta:", body["meta"],
)
print("SAMPLE[0]:", body["data"]["detections"][0])
