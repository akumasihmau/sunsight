"""
Tambahan terarah (~20 tile Esri z19):
  - Villa Duta & Danau Bogor Raya (bundaran/jalan perumahan tertutup pohon + atap gelap/oranye)
  - Bukit Cimanggu City & Taman Cimanggu (perumahan berpohon + bundaran/klaster modern)
  - Koridor gudang/pabrik Tajur & Kedung Halang (atap seng putih/abu + jalan beton lebar di sampingnya)

Semua tile baru ditambahkan ke `ml/data/raw_esri_bogor/` tanpa duplikat tile yang sudah ada.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Dict, List, Tuple

import requests
from tqdm import tqdm

from geo_utils import DEFAULT_USER_AGENT, latlng_to_tile_xy, stitch_esri_patch

TARGETED_ANCHORS: List[Tuple[str, str, float, float, int]] = [
    # Villa Duta Bogor (jalan berpohon lebat + bundaran + rumah modern)
    ("bogor_timur", "villa_duta_pohon_bundaran", -6.6075, 106.8215, 1),
    # Danau Bogor Raya (boulevard berpohon + bundaran + atap gelap/oranye)
    ("bogor_timur", "perumahan_pohon_bundaran", -6.5975, 106.8235, 1),
    # Bukit Cimanggu City & Taman Cimanggu (perumahan klaster atap gelap + jalan paving)
    ("tanah_sareal", "klaster_atap_gelap_paving", -6.5465, 106.7855, 1),
    # Pabrik / gudang seng putih-abu + jalan beton lebar (Tajur & Kedung Halang)
    ("bogor_timur", "pabrik_seng_jalan_beton", -6.6350, 106.8275, 1),
    ("bogor_utara", "pabrik_seng_jalan_beton", -6.5600, 106.8155, 1),
]


def main() -> None:
    raw_dir = Path("ml/data/raw_esri_bogor")
    img_dir = raw_dir / "images"
    meta_path = raw_dir / "metadata.json"

    records: List[dict] = json.loads(meta_path.read_text(encoding="utf-8"))
    existing_ids: set[str] = {r["id"] for r in records}
    existing_origins: List[Tuple[int, int]] = [(int(r["start_x"]), int(r["start_y"])) for r in records]

    zoom = 19
    grid_size = 3
    step_m = 240.0
    dlat = step_m / 111_320.0
    dlng = step_m / (111_320.0 * math.cos(math.radians(-6.59)))

    candidates: List[Tuple[str, str, float, float, int, int]] = []
    for kec, cat, lat0, lng0, rad in TARGETED_ANCHORS:
        for dr in range(-rad, rad + 1):
            for dc in range(-rad, rad + 1):
                lat = lat0 + dr * dlat
                lng = lng0 + dc * dlng
                cx, cy = latlng_to_tile_xy(lat, lng, zoom)
                sx, sy = cx - 1, cy - 1
                tid = f"bogor_{kec}_z{zoom}_{sx}_{sy}"
                if tid in existing_ids:
                    continue
                if any(abs(sx - ox) < 3 and abs(sy - oy) < 3 for ox, oy in existing_origins):
                    continue
                existing_ids.add(tid)
                existing_origins.append((sx, sy))
                candidates.append((kec, cat, lat, lng, sx, sy))

    print(f"Kandidat tile baru non-duplikat (Villa Duta / Klaster / Pabrik): {len(candidates)}")
    if not candidates:
        print("Semua titik sudah ada di dataset.")
        return

    session = requests.Session()
    session.headers.update({"User-Agent": DEFAULT_USER_AGENT})
    added = 0

    for kec, cat, lat, lng, sx, sy in tqdm(candidates, desc="Unduh Tile Tambahan Villa Duta & Pabrik"):
        tid = f"bogor_{kec}_z{zoom}_{sx}_{sy}"
        filename = f"{tid}.jpg"
        try:
            canvas, bbox, start_x, start_y, footprint_m = stitch_esri_patch(
                session=session,
                center_lat=lat,
                center_lng=lng,
                zoom=zoom,
                grid_size=grid_size,
                delay_sec=0.05,
            )
        except Exception as exc:
            print(f"[WARN] Lewati {tid}: {exc}")
            continue

        canvas.save(img_dir / filename, format="JPEG", quality=92)
        records.append(
            {
                "id": tid,
                "filename": filename,
                "kecamatan": kec,
                "category": cat,
                "is_hard_negative": False,
                "center_lat": round(lat, 6),
                "center_lng": round(lng, 6),
                "zoom": zoom,
                "grid_size": grid_size,
                "start_x": start_x,
                "start_y": start_y,
                "width": canvas.width,
                "height": canvas.height,
                "bbox": [round(v, 7) for v in bbox.as_list()],
                "footprint_m": round(footprint_m, 2),
            }
        )
        added += 1

    meta_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Selesai! Menambahkan {added} tile baru (total sekarang: {len(records)} tile).")


if __name__ == "__main__":
    main()
