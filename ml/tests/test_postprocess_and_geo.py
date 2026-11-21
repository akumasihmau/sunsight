"""Unit tests untuk geometri Web Mercator, filter anti-jalan, & regularisasi poligon ortogonal."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np

ML_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_ROOT / "scripts"))
sys.path.insert(0, str(ML_ROOT / "service"))

from geo_utils import latlng_to_pixel_in_grid, latlng_to_tile_xy, tile_grid_bbox  # noqa: E402
from app.postprocess import regularize_binary_mask  # noqa: E402


def test_web_mercator_projection_roundtrip():
    lat, lng = -6.5971, 106.7945
    cx, cy = latlng_to_tile_xy(lat, lng, 19)
    start_x, start_y = cx - 1, cy - 1
    bbox = tile_grid_bbox(start_x, start_y, 3, 19)
    assert bbox.min_lat < lat < bbox.max_lat
    assert bbox.min_lng < lng < bbox.max_lng

    px, py = latlng_to_pixel_in_grid(lat, lng, start_x, start_y, 19)
    assert 256.0 <= px <= 512.0
    assert 256.0 <= py <= 512.0


def test_rejects_elongated_road_mask():
    mask = np.zeros((512, 512), dtype=np.uint8)
    # Simulasi ruas jalan memanjang: 360 x 24 px -> aspect ratio = 15.0 (> 4.5)
    cv2.rectangle(mask, (60, 220), (420, 244), 255, thickness=-1)
    result = regularize_binary_mask(mask, 512, 512, mode="orthogonal")
    assert result is None, "Ruas jalan memanjang harus ditolak oleh filter anti-jalan"


def test_rejects_small_noise():
    mask = np.zeros((512, 512), dtype=np.uint8)
    cv2.rectangle(mask, (100, 100), (110, 110), 255, thickness=-1)  # 100 px^2 (< 200)
    result = regularize_binary_mask(mask, 512, 512, mode="orthogonal")
    assert result is None


def test_snaps_blobby_rectangular_roof_to_4_corners():
    mask = np.zeros((512, 512), dtype=np.uint8)
    # Atap persegi panjang sedikit membulat (blobby) dengan blur + threshold
    cv2.rectangle(mask, (120, 140), (260, 230), 255, thickness=-1)
    mask = cv2.GaussianBlur(mask, (15, 15), 0)
    _, blobby = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

    raw = regularize_binary_mask(blobby, 512, 512, mode="raw")
    reg = regularize_binary_mask(blobby, 512, 512, mode="orthogonal")

    assert raw is not None and reg is not None
    assert reg.strategy == "min_area_rect_90deg"
    assert len(reg.points) == 4
    assert len(reg.points) < len(raw.points)
    assert reg.area_px > 10_000


def test_snaps_l_shaped_roof_orthogonally():
    mask = np.zeros((512, 512), dtype=np.uint8)
    # Bentuk huruf L (rectangularity ~ 0.65)
    cv2.rectangle(mask, (100, 100), (260, 160), 255, thickness=-1)
    cv2.rectangle(mask, (100, 160), (160, 280), 255, thickness=-1)

    reg = regularize_binary_mask(mask, 512, 512, mode="orthogonal")
    assert reg is not None
    assert reg.strategy == "orthogonal_snap"
    assert 5 <= len(reg.points) <= 8
    assert abs(reg.area_px - (160 * 60 + 60 * 120)) / (160 * 60 + 60 * 120) < 0.08


def test_notebooks_are_valid_json():
    for nb in (
        ML_ROOT / "notebooks" / "01_autolabel_sam2_colab.ipynb",
        ML_ROOT / "notebooks" / "02_train_yolo11s_seg_colab.ipynb",
    ):
        data = json.loads(nb.read_text(encoding="utf-8"))
        assert data["nbformat"] == 4
        assert len(data["cells"]) >= 4


if __name__ == "__main__":
    test_web_mercator_projection_roundtrip()
    test_rejects_elongated_road_mask()
    test_rejects_small_noise()
    test_snaps_blobby_rectangular_roof_to_4_corners()
    test_snaps_l_shaped_roof_orthogonally()
    test_notebooks_are_valid_json()
    print("ALL TESTS PASSED!")
