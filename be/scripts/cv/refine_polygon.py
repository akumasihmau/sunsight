#!/usr/bin/env python3
"""Merapikan poligon kasar menjadi poligon presisi batas atap.

Kontrak CLI, dipakai bersama oleh ProcessCvClient dan verifikasi manual:

    --image PATH       citra masukan
    --polygon JSON     poligon kasar, koordinat piksel, [[x, y], ...]
    --mask-out PATH    tujuan berkas mask (PNG)

stdout berisi satu baris JSON: {"refined_polygon": [[x, y], ...]}
Kode keluar nol untuk sukses, bukan nol beserta pesan di stderr bila gagal.

Catatan: tahap ini baru menormalkan poligon masukan. Algoritma perapian yang
sesungguhnya (ambang adaptif, morfologi, GrabCut) dikerjakan pada U12.
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merapikan poligon atap.")
    parser.add_argument("--image", required=True)
    parser.add_argument("--polygon", required=True)
    parser.add_argument("--mask-out", required=True)
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
    """Membuang titik kembar, termasuk penutup ring yang menyamai titik pertama."""
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


def clamp_to_image(points: list[list[float]], width: int, height: int) -> list[list[float]]:
    return [
        [min(max(x, 0.0), float(width)), min(max(y, 0.0), float(height))]
        for x, y in points
    ]


def main() -> int:
    args = parse_args()

    image = cv2.imread(args.image, cv2.IMREAD_COLOR)
    if image is None:
        print(f"citra tidak dapat dibaca: {args.image}", file=sys.stderr)
        return 1

    height, width = image.shape[:2]

    try:
        polygon = clamp_to_image(unique_points(load_polygon(args.polygon)), width, height)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1

    if len(polygon) < MIN_UNIQUE_POINTS:
        print(
            f"poligon perlu minimal {MIN_UNIQUE_POINTS} titik unik, diterima {len(polygon)}",
            file=sys.stderr,
        )
        return 1

    mask = np.zeros((height, width), dtype=np.uint8)
    cv2.fillPoly(mask, [np.round(np.array(polygon, dtype=np.float64)).astype(np.int32)], 255)

    if Path(args.mask_out).suffix.lower() != ".png":
        print("mask-out harus berakhiran .png", file=sys.stderr)
        return 1

    if not cv2.imwrite(args.mask_out, mask):
        print(f"mask tidak dapat ditulis: {args.mask_out}", file=sys.stderr)
        return 1

    print(json.dumps({"refined_polygon": polygon}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
