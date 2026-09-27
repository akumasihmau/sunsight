#!/usr/bin/env python3
"""Menghasilkan fixture citra sintetis untuk pengujian pipeline CV.

Fixture ini BUKAN citra satelit nyata. Tujuannya hanya menyediakan citra
berukuran sama dengan kontrak (512 x 512) dan bertekstur cukup sehingga perapian
poligon serta deteksi bayangan dapat diuji secara deterministik dan tanpa jaringan.

Jalankan ulang bila perlu:

    cd be && .venv/bin/python tests/fixtures/imagery/make_fixtures.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SIZE = 512
HERE = Path(__file__).resolve().parent
SEED = 20260927
rng = np.random.default_rng(SEED)


def textured(color: tuple[int, int, int], noise: float = 9.0) -> np.ndarray:
    canvas = np.zeros((SIZE, SIZE, 3), dtype=np.float64)
    canvas[:, :] = color
    return canvas + rng.normal(0, noise, canvas.shape)


def with_polygons(canvas: np.ndarray, polygons: list[tuple[list, tuple]]) -> np.ndarray:
    image = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))
    draw = ImageDraw.Draw(image)
    for points, fill in polygons:
        draw.polygon(points, fill=fill)
    return np.asarray(image).astype(np.float64)


def save(canvas: np.ndarray, name: str) -> None:
    final = np.clip(canvas + rng.normal(0, 4, canvas.shape), 0, 255).astype(np.uint8)
    Image.fromarray(final).save(HERE / name, format="PNG")
    print(f"  {name}  {SIZE}x{SIZE}")


def roof_01() -> None:
    """Atap terang dengan satu bayangan gelap menutupi sebagian atap."""
    canvas = textured((70, 72, 68))
    save(
        with_polygons(canvas, [
            ([(118, 108), (402, 96), (416, 352), (132, 366)], (176, 174, 166)),
            ([(118, 108), (402, 96), (409, 196), (125, 206)], (92, 94, 100)),
        ]),
        "roof-01.png",
    )


def roof_02() -> None:
    """Atap gelap dengan bayangan dari sisi berlawanan.

    Atap gelap sengaja dipakai untuk menandai kelemahan ambang kecerahan: bagian
    atap yang gelap tetapi bukan bayangan.
    """
    canvas = textured((104, 102, 96))
    save(
        with_polygons(canvas, [
            ([(96, 168), (368, 132), (428, 312), (152, 356)], (86, 84, 82)),
            ([(96, 168), (368, 132), (352, 176), (82, 214)], (58, 60, 64)),
        ]),
        "roof-02.png",
    )


def roof_03() -> None:
    """Atap logam terang bersebelahan dengan vegetasi hijau dan genangan air.

    Vegetasi dan air dipakai oleh U13: keduanya gelap tetapi bukan bayangan.
    """
    canvas = textured((78, 80, 74))
    save(
        with_polygons(canvas, [
            ([(140, 120), (392, 128), (386, 344), (146, 336)], (168, 176, 186)),
            ([(140, 120), (392, 128), (390, 176), (142, 168)], (96, 100, 108)),
            ([(404, 150), (486, 160), (480, 300), (398, 292)], (54, 92, 48)),
            ([(180, 360), (300, 366), (296, 440), (176, 434)], (40, 56, 78)),
        ]),
        "roof-03.png",
    )


def main() -> None:
    HERE.mkdir(parents=True, exist_ok=True)
    print(f"Menulis fixture ke {HERE}")
    roof_01()
    roof_02()
    roof_03()


if __name__ == "__main__":
    main()
