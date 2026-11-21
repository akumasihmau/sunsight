"""
Stage 2-v2: Penemu Otomatis 80 Tile Hard Negative 100% Bebas Bangunan di Bogor.

Menggunakan cache lokal `ml/data/bogor_buildings_2026.json` (288.092 poligon bangunan)
+ indeks spasial Shapely STRtree untuk memindai koridor jalan tol, landasan pacu,
Kebun Raya, hutan CIFOR, danau, lapangan golf, dan area terbuka di sekitar Kota Bogor,
dan HANYA memilih tile z19 (2x2 = 512x512 px, ~152 m) yang secara matematis memiliki
0 bangunan (termasuk buffer pengaman ~22 meter di sekeliling tepi tile!).

Juga menghasilkan `contact_sheet.jpg` (grid 8x10 seluruh thumbnail) untuk verifikasi visual instan.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import numpy as np
import requests
from tqdm import tqdm

from geo_utils import (
    DEFAULT_USER_AGENT,
    GeoBBox,
    deduplicate_tile_origins,
    latlng_to_tile_xy,
    load_or_fetch_bogor_osm_buildings,
    query_buildings_in_bbox,
    stitch_esri_patch,
    tile_grid_bbox,
)

# Koridor & zona non-bangunan Bogor (dipindai rapat, lalu disaring ketat 0-bangunan via STRtree)
# Format: (kecamatan, kategori, lat_min, lat_max, lng_min, lng_max, step_m)
SEARCH_ZONES: List[Tuple[str, str, float, float, float, float, float]] = [
    # 1. Landasan pacu aspal/beton & rumput Lanud Atang Sendjaja (kaya tekstur aspal + marka!)
    ("bogor_barat", "runway_aspal_beton", -6.556, -6.535, 106.752, 106.772, 160.0),
    # 2. Koridor Tol Jagorawi & Bocimi (ruas aspal tol yang melewati area hijau)
    ("bogor_timur", "koridor_tol_aspal", -6.655, -6.575, 106.824, 106.848, 160.0),
    # 3. Kebun Raya Bogor (kanopi pohon + jalan setapak paving/aspal dalam kebun)
    ("bogor_tengah", "kebun_raya_paving_pohon", -6.605, -6.592, 106.794, 106.808, 155.0),
    # 4. Hutan CIFOR & Situ Gede (kanopi hutan + badan air danau)
    ("bogor_barat", "hutan_danau_cifor", -6.562, -6.544, 106.736, 106.756, 160.0),
    # 5. Lapangan Golf Rancamaya & koridor selatan hijau
    ("bogor_selatan", "lapangan_golf_hijau", -6.666, -6.646, 106.814, 106.842, 160.0),
    # 6. Persawahan & kebun terbuka Mulyaharja / Bogor Selatan barat
    ("bogor_selatan", "sawah_lahan_terbuka", -6.662, -6.634, 106.764, 106.792, 175.0),
    # 7. Lahan terbuka & sungai utara Tanah Sareal / Bogor Utara
    ("tanah_sareal", "lahan_terbuka_utara", -6.544, -6.523, 106.768, 106.842, 175.0),
]


def scan_zero_building_candidates(
    cache_path: Path,
    zoom: int = 19,
    grid_size: int = 2,
    margin_deg: float = 0.00020,  # ~22 meter buffer pengaman di luar tepi tile!
) -> List[Tuple[str, str, float, float, int, int]]:
    rings, geoms, tree = load_or_fetch_bogor_osm_buildings(cache_path=cache_path)

    raw_points: List[Tuple[str, str, float, float]] = []
    for kec, cat, lat_min, lat_max, lng_min, lng_max, step_m in SEARCH_ZONES:
        dlat = step_m / 111_320.0
        dlng = step_m / (111_320.0 * math.cos(math.radians(-6.59)))
        lat = lat_min
        while lat <= lat_max:
            lng = lng_min
            while lng <= lng_max:
                raw_points.append((kec, cat, lat, lng))
                lng += dlng
            lat += dlat

    unique = deduplicate_tile_origins(raw_points, zoom=zoom, grid_size=grid_size, min_tile_step=grid_size)

    # Saring ketat 0 bangunan (termasuk buffer ~22 m!)
    buckets: Dict[str, List[Tuple[str, str, float, float, int, int]]] = {}
    for item in unique:
        kec, cat, lat, lng, sx, sy = item
        bbox = tile_grid_bbox(sx, sy, grid_size, zoom)
        if len(query_buildings_in_bbox(bbox, rings, geoms, tree, margin_deg=margin_deg)) == 0:
            buckets.setdefault(cat, []).append(item)

    # Susun round-robin agar semua kategori (aspal runway, tol, kebun raya, danau, golf, sawah) terwakili seimbang
    ordered: List[Tuple[str, str, float, float, int, int]] = []
    cats = sorted(buckets.keys())
    idx = 0
    while True:
        added = False
        for cat in cats:
            if idx < len(buckets[cat]):
                ordered.append(buckets[cat][idx])
                added = True
        if not added:
            break
        idx += 1

    print("Distribusi kandidat 100% bebas bangunan (buffer 22m):")
    for cat in cats:
        print(f"  - {cat:<25}: {len(buckets[cat])} tile")
    print(f"Total kandidat bersih: {len(ordered)}")
    return ordered


def build_contact_sheet(records: List[dict], img_dir: Path, out_path: Path, cols: int = 8) -> None:
    """Buat 1 gambar contact sheet agar seluruh hard negative bisa diaudit visual sekaligus."""
    if not records:
        return
    thumb = 160
    rows = math.ceil(len(records) / cols)
    sheet = np.full((rows * thumb, cols * thumb, 3), 24, dtype=np.uint8)
    for i, rec in enumerate(records):
        r, c = divmod(i, cols)
        img = cv2.imread(str(img_dir / rec["filename"]))
        if img is None:
            continue
        t = cv2.resize(img, (thumb, thumb), interpolation=cv2.INTER_AREA)
        cv2.putText(
            t,
            f"#{i+1} {rec['category'][:10]}",
            (4, 14),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.38,
            (0, 255, 255),
            1,
        )
        sheet[r * thumb : (r + 1) * thumb, c * thumb : (c + 1) * thumb] = t
    cv2.imwrite(str(out_path), sheet, [int(cv2.IMWRITE_JPEG_QUALITY), 88])


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Temukan & unduh 80 tile Hard Negative yang 100% bebas bangunan."
    )
    parser.add_argument("--cache-path", type=Path, default=Path("ml/data/bogor_buildings_2026.json"))
    parser.add_argument("--out-dir", type=Path, default=Path("ml/data/hard_negatives_v2"))
    parser.add_argument("--target", type=int, default=75)
    parser.add_argument("--zoom", type=int, default=19)
    parser.add_argument("--grid-size", type=int, default=2)
    parser.add_argument("--delay", type=float, default=0.05)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    ordered = scan_zero_building_candidates(args.cache_path, args.zoom, args.grid_size)
    chosen = ordered[: args.target]
    if args.dry_run:
        by_cat: Dict[str, int] = {}
        for _, cat, _, _, _, _ in chosen:
            by_cat[cat] = by_cat.get(cat, 0) + 1
        print(f"\nRencana {len(chosen)} tile terpilih:")
        for cat, cnt in sorted(by_cat.items()):
            print(f"  - {cat:<25}: {cnt}")
        return

    img_dir = args.out_dir / "images"
    lbl_dir = args.out_dir / "labels"
    img_dir.mkdir(parents=True, exist_ok=True)
    lbl_dir.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update({"User-Agent": DEFAULT_USER_AGENT})

    records: List[dict] = []
    for kec, cat, lat, lng, sx, sy in tqdm(chosen, desc="Unduh Hard Negatives v2 (0-Bangunan)"):
        tile_id = f"hnv2_{cat}_z{args.zoom}_{sx}_{sy}"
        filename = f"{tile_id}.jpg"
        out_img = img_dir / filename
        out_lbl = lbl_dir / f"{tile_id}.txt"

        if not out_img.exists():
            try:
                canvas, bbox, start_x, start_y, footprint_m = stitch_esri_patch(
                    session=session,
                    center_lat=lat,
                    center_lng=lng,
                    zoom=args.zoom,
                    grid_size=args.grid_size,
                    delay_sec=args.delay,
                )
            except Exception as exc:
                print(f"[WARN] Lewati {tile_id}: {exc}")
                continue
            canvas.save(out_img, format="JPEG", quality=92)
            out_lbl.write_text("", encoding="utf-8")
            w, h = canvas.width, canvas.height
        else:
            out_lbl.write_text("", encoding="utf-8")
            bbox = tile_grid_bbox(sx, sy, args.grid_size, args.zoom)
            start_x, start_y = sx, sy
            w, h = args.grid_size * 256, args.grid_size * 256
            footprint_m = 152.0

        records.append(
            {
                "id": tile_id,
                "filename": filename,
                "kecamatan": kec,
                "category": cat,
                "is_hard_negative": True,
                "osm_building_count": 0,
                "center_lat": round(lat, 6),
                "center_lng": round(lng, 6),
                "zoom": args.zoom,
                "grid_size": args.grid_size,
                "start_x": start_x,
                "start_y": start_y,
                "width": w,
                "height": h,
                "bbox": [round(v, 7) for v in bbox.as_list()],
                "footprint_m": round(footprint_m, 2),
            }
        )

    (args.out_dir / "metadata.json").write_text(json.dumps(records, indent=2), encoding="utf-8")
    build_contact_sheet(records, img_dir, args.out_dir / "contact_sheet.jpg", cols=8)
    print(f"\nSelesai! Tersimpan {len(records)} hard negative 100% bebas bangunan di {args.out_dir}")
    print(f"Contact sheet visual: {args.out_dir / 'contact_sheet.jpg'}")


if __name__ == "__main__":
    main()
