"""
Stage 1-v3: Tambahan ~110 Tile Khusus Gedung Luas/Kompleks, Dak Beton, & Atap Cokelat/Kusam Kota Bogor
(Multi-Scale: 3x3 ~228 m DAN 2x2 ~152 m persis skala 'Optimal' Studio!).

Target lokasi nyata di Kota Bogor:
  1. Gedung luas/lebar/kompleks: Botani Square, IPB Baranangsiang, Vokasi IPB, Unpak,
     Mall BTM, Lippo Plaza Ekalokasari, Lippo Plaza Keboen Raya, Transmart Yasmin,
     Jambu Dua, RS PMI, RS Siloam, RS Azra, RSUD Kota Bogor, Stasiun Bogor, Istana/Kantor.
  2. Dak beton & ruko perkantoran: Koridor Jl. Pajajaran, Jl. Ahmad Yani, Jl. Sholeh Iskandar,
     Jl. Surya Kencana.
  3. Atap cokelat tua / genteng kusam / asbes padat: Empang, Panaragan, Babakan, Bondongan,
     Sempur, Gudang, Kebon Pedes.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import List, Tuple

import requests
from tqdm import tqdm

from geo_utils import DEFAULT_USER_AGENT, latlng_to_tile_xy, stitch_esri_patch

# Format: (kecamatan, kategori, lat, lng, radius_grid, grid_size)
V3_ANCHORS: List[Tuple[str, str, float, float, int, int]] = [
    # --- 1. GEDUNG LUAS, KAMPUS, MALL, RS, BENTUK KOMPLEKS (3x3 = ~228 m) ---
    ("bogor_tengah", "gedung_kompleks_mall", -6.6014, 106.8068, 1, 3),     # Botani Square & IPB Baranangsiang
    ("bogor_tengah", "gedung_kompleks_kampus", -6.5892, 106.8062, 1, 3),   # Sekolah Vokasi IPB & Pajajaran
    ("bogor_tengah", "gedung_kompleks_mall", -6.6038, 106.7966, 1, 3),     # Mall BTM & Juanda
    ("bogor_tengah", "gedung_kompleks_rs", -6.5975, 106.8045, 1, 3),       # RS PMI & Lippo Keboen Raya / Siloam
    ("bogor_timur", "gedung_kompleks_kampus", -6.5992, 106.8132, 1, 3),    # Universitas Pakuan & Baranangsiang
    ("bogor_timur", "gedung_kompleks_mall", -6.6176, 106.8145, 1, 3),      # Lippo Plaza Ekalokasari & RS BMC
    ("bogor_utara", "gedung_kompleks_mall", -6.5772, 106.8075, 1, 3),      # Plaza Jambu Dua & RS Azra
    ("tanah_sareal", "gedung_kompleks_mall", -6.5590, 106.7740, 1, 3),     # Transmart Yasmin & RS Hermina
    ("bogor_barat", "gedung_kompleks_rs", -6.5786, 106.7795, 1, 3),        # RSUD Kota Bogor & Cilendek
    ("bogor_tengah", "gedung_kompleks_stasiun", -6.5955, 106.7905, 1, 3),  # Stasiun Bogor & Alun-Alun

    # --- 2. DAK BETON, RUKO, & KANTOR (2x2 = ~152 m, skala Optimal Studio!) ---
    ("bogor_tengah", "dak_beton_koridor", -6.5930, 106.8058, 1, 2),        # Jl. Pajajaran tengah (dak beton/hotel)
    ("tanah_sareal", "dak_beton_koridor", -6.5765, 106.8015, 1, 2),        # Jl. Ahmad Yani / Air Mancur
    ("tanah_sareal", "dak_beton_koridor", -6.5560, 106.7875, 1, 2),        # Jl. Sholeh Iskandar ruko/showroom
    ("bogor_tengah", "dak_beton_koridor", -6.6052, 106.7995, 1, 2),        # Jl. Surya Kencana ruko dak beton

    # --- 3. ATAP COKELAT TUA / KUSAM / ASBES PADAT (2x2 = ~152 m, skala Optimal!) ---
    ("bogor_selatan", "cokelat_kusam_padat", -6.6088, 106.7945, 1, 2),     # Empang (cokelat kusam/asbes padat)
    ("bogor_tengah", "cokelat_kusam_padat", -6.5960, 106.7870, 1, 2),      # Panaragan / Kebon Kalapa
    ("bogor_tengah", "cokelat_kusam_padat", -6.5885, 106.8010, 1, 2),      # Sempur / Babakan
    ("bogor_selatan", "cokelat_kusam_padat", -6.6145, 106.8015, 1, 2),     # Bondongan
    ("tanah_sareal", "cokelat_kusam_padat", -6.5720, 106.7975, 1, 2),      # Kebon Pedes
    ("bogor_timur", "gedung_kompleks_pabrik", -6.6335, 106.8260, 1, 2),    # Gudang/Pabrik Tajur skala rapat
]


def main() -> None:
    raw_dir = Path("ml/data/raw_esri_bogor")
    img_dir = raw_dir / "images"
    meta_path = raw_dir / "metadata.json"

    records: List[dict] = json.loads(meta_path.read_text(encoding="utf-8"))
    existing_ids: set[str] = {r["id"] for r in records}
    # Pisahkan pengecekan tumpang tindih per (grid_size) agar tile 2x2 Optimal tidak diblok oleh 3x3
    origins_by_gs: dict[int, List[Tuple[int, int]]] = {2: [], 3: []}
    for r in records:
        gs = int(r.get("grid_size", 3))
        origins_by_gs.setdefault(gs, []).append((int(r["start_x"]), int(r["start_y"])))

    zoom = 19
    candidates: List[Tuple[str, str, float, float, int, int, int]] = []
    for kec, cat, lat0, lng0, rad, gs in V3_ANCHORS:
        step_m = 165.0 if gs == 2 else 235.0
        dlat = step_m / 111_320.0
        dlng = step_m / (111_320.0 * math.cos(math.radians(-6.59)))
        half = gs // 2
        for dr in range(-rad, rad + 1):
            for dc in range(-rad, rad + 1):
                lat = lat0 + dr * dlat
                lng = lng0 + dc * dlng
                cx, cy = latlng_to_tile_xy(lat, lng, zoom)
                sx, sy = cx - half, cy - half
                tid = f"v3_{kec}_g{gs}_z{zoom}_{sx}_{sy}"
                if tid in existing_ids:
                    continue
                if any(abs(sx - ox) < gs and abs(sy - oy) < gs for ox, oy in origins_by_gs.get(gs, [])):
                    continue
                existing_ids.add(tid)
                origins_by_gs.setdefault(gs, []).append((sx, sy))
                candidates.append((kec, cat, lat, lng, sx, sy, gs))

    print(f"Kandidat tile baru v3 (gedung kompleks + dak beton + cokelat kusam + skala Optimal 2x2): {len(candidates)}")
    if not candidates:
        return

    session = requests.Session()
    session.headers.update({"User-Agent": DEFAULT_USER_AGENT})
    added = 0

    for kec, cat, lat, lng, sx, sy, gs in tqdm(candidates, desc="Unduh Tile v3 Khusus Bogor"):
        tid = f"v3_{kec}_g{gs}_z{zoom}_{sx}_{sy}"
        filename = f"{tid}.jpg"
        try:
            canvas, bbox, start_x, start_y, footprint_m = stitch_esri_patch(
                session=session,
                center_lat=lat,
                center_lng=lng,
                zoom=zoom,
                grid_size=gs,
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
                "grid_size": gs,
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
    print(f"Selesai! Menambahkan {added} tile v3 (total positif mentah sekarang: {len(records)} tile).")


if __name__ == "__main__":
    main()
