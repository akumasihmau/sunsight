#!/usr/bin/env python3
"""Menaksir luas area atap yang tidak berbayang di dalam poligon presisi.

Kontrak CLI, dipakai bersama oleh ProcessCvClient dan verifikasi manual:

    --image PATH              citra masukan
    --polygon JSON            poligon presisi, koordinat piksel
    --meters-per-pixel FLOAT  skala citra
    --mask-out PATH           tujuan berkas mask bayangan (PNG)
    --shadow-ratio FLOAT      opsional, bawaan 0.85

stdout berisi satu baris JSON: {"usable_area_sqm": F, "shadow_area_sqm": F}
Kode keluar nol untuk sukses, bukan nol beserta pesan di stderr bila gagal.

Ambang diturunkan dari kecerahan rata-rata di dalam poligon, bukan angka tetap,
sehingga atap terang dan atap gelap diperlakukan sama. Ini masih baseline
kecerahan: atap gelap, kolam, dan vegetasi dapat keliru dianggap bayangan.
Perbaikannya dikerjakan pada U13.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

MIN_UNIQUE_POINTS = 3
DUPLICATE_TOLERANCE = 1e-6
DEFAULT_SHADOW_RATIO = 0.85


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deteksi area berbayang pada atap.")
    parser.add_argument("--image", required=True)
    parser.add_argument("--polygon", required=True)
    parser.add_argument("--meters-per-pixel", required=True, type=float)
    parser.add_argument("--mask-out", required=True)
    parser.add_argument("--shadow-ratio", type=float, default=DEFAULT_SHADOW_RATIO)
    return parser.parse_args()


def load_polygon(raw: str) -> list[list[float]]:
    try:
        points = json.loads(raw)
    except json.JSONDecodeError as error:
        raise ValueError(f"poligon bukan JSON yang sah: {error}") from error

    if not isinstance(points, list):
        raise ValueError("poligon harus berupa daftar titik")

    polygon: list[list[float]] = []
    for point in points:
        if not isinstance(point, (list, tuple)) or len(point) != 2:
            raise ValueError("setiap titik harus berpasangan [x, y]")
        polygon.append([float(point[0]), float(point[1])])

    return polygon


def unique_points(points: list[list[float]]) -> list[list[float]]:
    unique: list[list[float]] = []
    for point in points:
        if any(
            abs(point[0] - kept[0]) <= DUPLICATE_TOLERANCE
            and abs(point[1] - kept[1]) <= DUPLICATE_TOLERANCE
            for kept in unique
        ):
            continue
        unique.append(point)
    return unique


def main() -> int:
    args = parse_args()

    if args.meters_per_pixel <= 0:
        print("meters-per-pixel harus lebih besar dari nol", file=sys.stderr)
        return 1

    if not 0 < args.shadow_ratio < 1:
        print("shadow-ratio harus berada di antara 0 dan 1", file=sys.stderr)
        return 1

    image = cv2.imread(args.image, cv2.IMREAD_COLOR)
    if image is None:
        print(f"citra tidak dapat dibaca: {args.image}", file=sys.stderr)
        return 1

    height, width = image.shape[:2]

    try:
        polygon = unique_points(load_polygon(args.polygon))
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1

    if len(polygon) < MIN_UNIQUE_POINTS:
        print(
            f"poligon perlu minimal {MIN_UNIQUE_POINTS} titik unik, diterima {len(polygon)}",
            file=sys.stderr,
        )
        return 1

    roof_mask = np.zeros((height, width), dtype=np.uint8)
    cv2.fillPoly(roof_mask, [np.round(np.array(polygon, dtype=np.float64)).astype(np.int32)], 255)

    inside = roof_mask == 255
    total_pixels = int(np.count_nonzero(inside))

    if total_pixels == 0:
        print("poligon tidak mencakup satu piksel pun di dalam citra", file=sys.stderr)
        return 1

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    mean_brightness = float(np.mean(gray[inside]))

    shadow_mask = np.zeros((height, width), dtype=np.uint8)
    shadow_mask[inside & (gray.astype(np.float64) < mean_brightness * args.shadow_ratio)] = 255

    shadow_pixels = int(np.count_nonzero(shadow_mask))
    usable_pixels = total_pixels - shadow_pixels

    square_meters_per_pixel = args.meters_per_pixel ** 2

    if Path(args.mask_out).suffix.lower() != ".png":
        print("mask-out harus berakhiran .png", file=sys.stderr)
        return 1

    if not cv2.imwrite(args.mask_out, shadow_mask):
        print(f"mask tidak dapat ditulis: {args.mask_out}", file=sys.stderr)
        return 1

    print(json.dumps({
        "usable_area_sqm": round(usable_pixels * square_meters_per_pixel, 4),
        "shadow_area_sqm": round(shadow_pixels * square_meters_per_pixel, 4),
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
