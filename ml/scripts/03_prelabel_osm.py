"""
Stage 3: Auto Pre-Labeling Poligon Atap via Cache Lokal OpenStreetMap Kota Bogor.

Menggunakan cache poligon OSM Kota Bogor + indeks spasial Shapely STRtree
sehingga memproses seluruh 360 tile Esri + membuat pratinjau overlay selesai
hanya dalam ~5-10 detik (tidak lagi ratusan request HTTP satu per satu!).

Output:
  - `ml/data/raw_esri_bogor/labels_osm_draft/*.txt` (format YOLO-Seg)
  - `ml/data/raw_esri_bogor/previews/*.jpg` (overlay hijau untuk inspeksi visual)
  - `ml/data/raw_esri_bogor/qc_prelabels.html`

Contoh penggunaan:
    python ml/scripts/03_prelabel_osm.py
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np
from shapely.geometry import Polygon, box
from tqdm import tqdm

from geo_utils import (
    GeoBBox,
    latlng_to_pixel_in_grid,
    load_or_fetch_bogor_osm_buildings,
    query_buildings_in_bbox,
)


def clip_and_format_yolo_polygons(
    geo_polygons: List[List[Tuple[float, float]]],
    start_x: int,
    start_y: int,
    zoom: int,
    width: int,
    height: int,
    min_area_px: float = 120.0,
) -> Tuple[List[str], List[np.ndarray]]:
    """Proyeksikan poligon (lat, lng) ke piksel citra & format YOLO-Seg (`0 x1 y1 ...`)."""
    frame = box(0.0, 0.0, float(width - 1), float(height - 1))
    yolo_lines: List[str] = []
    pixel_polys: List[np.ndarray] = []

    for ring in geo_polygons:
        pts = [latlng_to_pixel_in_grid(lat, lng, start_x, start_y, zoom) for lat, lng in ring]
        if len(pts) < 3:
            continue
        poly = Polygon(pts)
        if not poly.is_valid:
            poly = poly.buffer(0)
        clipped = poly.intersection(frame)
        if clipped.is_empty:
            continue

        geoms = [clipped] if clipped.geom_type == "Polygon" else list(getattr(clipped, "geoms", []))
        for g in geoms:
            if g.geom_type != "Polygon" or g.area < min_area_px:
                continue
            coords = list(g.exterior.coords)[:-1]
            if len(coords) < 3:
                continue
            norm_tokens: List[str] = ["0"]
            arr_pts: List[List[int]] = []
            for x, y in coords:
                nx = max(0.0, min(1.0, x / width))
                ny = max(0.0, min(1.0, y / height))
                norm_tokens.append(f"{nx:.6f}")
                norm_tokens.append(f"{ny:.6f}")
                arr_pts.append([int(round(x)), int(round(y))])
            yolo_lines.append(" ".join(norm_tokens))
            pixel_polys.append(np.array(arr_pts, dtype=np.int32))

    return yolo_lines, pixel_polys


def save_overlay_preview(
    img_path: Path,
    pixel_polys: List[np.ndarray],
    out_path: Path,
) -> None:
    img = cv2.imread(str(img_path))
    if img is None:
        return
    overlay = img.copy()
    for pts in pixel_polys:
        cv2.fillPoly(overlay, [pts], color=(40, 220, 90))
        cv2.polylines(img, [pts], isClosed=True, color=(0, 255, 120), thickness=2)
    blended = cv2.addWeighted(overlay, 0.25, img, 0.75, 0)
    cv2.imwrite(str(out_path), blended, [int(cv2.IMWRITE_JPEG_QUALITY), 85])


def build_qc_html(items: List[dict], out_html: Path) -> None:
    cards = []
    for rec in items:
        cards.append(
            f"<div class='card'>"
            f"<img src='previews/{rec['filename']}' loading='lazy' />"
            f"<div class='meta'><b>{rec['id']}</b><br/>"
            f"{rec['kecamatan']} · <b>{rec['osm_polygons']} atap OSM</b></div>"
            f"</div>"
        )
    html = (
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<title>SunSight QC — Draft Pre-Label OSM</title>"
        "<style>"
        "body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:20px;}"
        ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}"
        ".card{background:#1d1d1f;border-radius:10px;overflow:hidden;border:1px solid #333;}"
        ".card img{width:100%;aspect-ratio:1;object-fit:cover;display:block;}"
        ".meta{padding:8px 10px;font-size:12px;color:#ccc;}"
        "</style></head><body>"
        f"<h2>Draft Pre-Label OSM ({len(items)} tile)</h2>"
        "<p>Poligon hijau ini adalah prompt awal dari OpenStreetMap. "
        "Lanjutkan dengan notebook <code>ml/notebooks/01_autolabel_sam2_colab.ipynb</code> "
        "agar SAM 2.1 otomatis menempelkan setiap poligon pas ke piksel Esri.</p>"
        f"<div class='grid'>{''.join(cards)}</div></body></html>"
    )
    out_html.write_text(html, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate draft YOLO-Seg pre-labels dari cache OSM Kota Bogor secara instan."
    )
    parser.add_argument("--raw-dir", type=Path, default=Path("ml/data/raw_esri_bogor"))
    parser.add_argument("--osm-cache", type=Path, default=Path("ml/data/osm_bogor_buildings.json"))
    parser.add_argument("--limit", type=int, default=0, help="Batasi jumlah tile (0 = semua).")
    args = parser.parse_args()

    meta_path = args.raw_dir / "metadata.json"
    if not meta_path.exists():
        raise FileNotFoundError(
            f"{meta_path} tidak ditemukan. Jalankan 01_harvest_esri_bogor.py terlebih dahulu."
        )

    records = json.loads(meta_path.read_text(encoding="utf-8"))
    if args.limit > 0:
        records = records[: args.limit]

    rings, geoms, tree = load_or_fetch_bogor_osm_buildings(cache_path=args.osm_cache)

    img_dir = args.raw_dir / "images"
    lbl_dir = args.raw_dir / "labels_osm_draft"
    prev_dir = args.raw_dir / "previews"
    lbl_dir.mkdir(parents=True, exist_ok=True)
    prev_dir.mkdir(parents=True, exist_ok=True)

    summary: List[dict] = []
    empty_osm_tiles = 0
    for rec in tqdm(records, desc="OSM Pre-Labeling (STRtree)"):
        img_path = img_dir / rec["filename"]
        if not img_path.exists():
            continue

        bbox = GeoBBox(*rec["bbox"])
        geo_polys = query_buildings_in_bbox(bbox, rings, geoms, tree)
        yolo_lines, pixel_polys = clip_and_format_yolo_polygons(
            geo_polygons=geo_polys,
            start_x=rec["start_x"],
            start_y=rec["start_y"],
            zoom=rec["zoom"],
            width=rec["width"],
            height=rec["height"],
        )
        if not yolo_lines:
            empty_osm_tiles += 1

        (lbl_dir / f"{rec['id']}.txt").write_text("\n".join(yolo_lines), encoding="utf-8")
        save_overlay_preview(img_path, pixel_polys, prev_dir / rec["filename"])
        summary.append({**rec, "osm_polygons": len(yolo_lines)})

    build_qc_html(summary, args.raw_dir / "qc_prelabels.html")
    total_polys = sum(item["osm_polygons"] for item in summary)
    print(
        f"\nSelesai! Draft label OSM untuk {len(summary)} tile ({total_polys} poligon atap) "
        f"tersimpan di {lbl_dir}"
    )
    if empty_osm_tiles:
        print(f"Catatan: {empty_osm_tiles} tile memiliki 0 poligon OSM (area belum terpetakan di OSM / lahan kosong).")
    print(f"Buka {args.raw_dir / 'qc_prelabels.html'} untuk pratinjau overlay.")


if __name__ == "__main__":
    main()
