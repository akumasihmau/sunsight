"""Konfigurasi layanan ML SunSight sesuai kontrak docs/ml-service-design.md."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(SERVICE_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Model & Inference
    model_path: str = "weights/best.onnx"
    model_name: str = "yolo11s-seg"
    model_version: str = "v2-esri-bogor"
    model_image_size: int = 1280
    model_confidence: float = 0.25
    model_iou_threshold: float = 0.45
    use_clahe_lab: bool = False

    # Post-processing Anti-Blobby & Anti-Jalan (CLAUDE.md Bagian 4.C.4)
    # 140 px^2 (~12.3 m^2 di z19 Bogor) agar rumah petak padat tetap terdeteksi, noise kecil terbuang
    min_contour_area_px: float = 140.0
    max_aspect_ratio: float = 4.5
    rectangularity_snap_threshold: float = 0.80
    orthogonal_min_rectangularity: float = 0.55
    approx_epsilon_ratio: float = 0.015

    # API & Keamanan
    api_v1_prefix: str = "/api/v1"
    api_key: str = ""  # Jika diisi, POST /api/v1/predict wajib membawa header X-Api-Key
    max_image_size: int = 10_485_760  # 10 MB
    max_image_pixels: int = 20_000_000  # 20 MP
    max_concurrent_inferences: int = 1
    log_level: str = "INFO"


settings = Settings()
