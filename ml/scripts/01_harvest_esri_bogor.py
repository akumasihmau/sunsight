"""
Stage 1: Auto-Harvesting 250-450 Tile Esri World Imagery Kota Bogor (6 Kecamatan).

Menghasilkan citra 768x768 px (grid 3x3 pada zoom 19, cakupan ~228 m x 228 m)
yang mewakili berbagai tipe penutup atap (genteng merah, spandek biru/hijau/silver,
dak beton, asbes permukiman padat) di seluruh 6 kecamatan Kota Bogor.

Contoh penggunaan:
    python ml/scripts/01_harvest_esri_bogor.py --target 350
    python ml/scripts/01_harvest_esri_bogor.py --target 12 --dry-run
"""

from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path
from typing import Dict, List, Tuple

import requests
from tqdm import tqdm

from geo_utils import (
    DEFAULT_USER_AGENT,
    deduplicate_tile_origins,
    stitch_esri_patch,
)

# Titik-titik jangkar (anchor) nyata di 6 kecamatan Kota Bogor yang sengaja
# mendiversifikasi material atap agar model tidak bias ke genteng oranye saja.
# Format: (kecamatan, kategori_atap, lat, lng, radius_grid_langkah)
BOGOR_ANCHORS: List[Tuple[str, str, float, float, int]] = [
    # --- 1. BOGOR TENGAH (campuran perumahan, ruko spandek, perkantoran dak beton) ---
    ("bogor_tengah", "komersial_dak_spandek", -6.5972, 106.7946, 2),   # Jl. Juanda / Pabaton
    ("bogor_tengah", "padat_campuran", -6.6048, 106.8006, 2),          # Surya Kencana / Gudang
    ("bogor_tengah", "perumahan_campuran", -6.5882, 106.8016, 2),      # Babakan / Sempur
    ("bogor_tengah", "perumahan_genteng", -6.5976, 106.8096, 2),       # Tegallega / IPB Baranangsiang
    ("bogor_tengah", "padat_asbes", -6.5958, 106.7874, 2),             # Panaragan / Kebon Kalapa
    ("bogor_tengah", "ruko_spandek", -6.5902, 106.7918, 2),            # Ciwaringin / Stasiun Bogor

    # --- 2. BOGOR TIMUR (kawasan industri/ruko spandek Tajur, perumahan Baranangsiang) ---
    ("bogor_timur", "perumahan_campuran", -6.6062, 106.8142, 2),       # Baranangsiang
    ("bogor_timur", "komersial_spandek", -6.6156, 106.8118, 2),        # Sukasari / Pajajaran Selatan
    ("bogor_timur", "industri_spandek", -6.6312, 106.8242, 3),         # Koridor Tajur (banyak spandek biru/silver)
    ("bogor_timur", "perumahan_beton", -6.6332, 106.8348, 2),          # Katulampa
    ("bogor_timur", "padat_campuran", -6.6252, 106.8208, 2),           # Sindangrasa
    ("bogor_timur", "industri_spandek", -6.6388, 106.8318, 2),         # Sindangsari / Ciawi border

    # --- 3. BOGOR UTARA (gudang Kedung Halang, perumahan Bantarjati & Villa Bogor Indah) ---
    ("bogor_utara", "perumahan_genteng", -6.5802, 106.8112, 2),        # Bantarjati / Indraprasta
    ("bogor_utara", "perumahan_campuran", -6.5752, 106.8192, 2),       # Tegal Gundil
    ("bogor_utara", "industri_spandek", -6.5622, 106.8142, 3),         # Kedung Halang (gudang/pabrik spandek)
    ("bogor_utara", "perumahan_beton", -6.5578, 106.8218, 2),          # Villa Bogor Indah / Ciparigi
    ("bogor_utara", "perumahan_campuran", -6.5782, 106.8318, 2),       # Cimahpar
    ("bogor_utara", "padat_campuran", -6.5824, 106.8252, 2),           # Tanah Baru

    # --- 4. BOGOR SELATAN (padat Empang/Bondongan asbes, modern Rancamaya, Batutulis) ---
    ("bogor_selatan", "padat_asbes", -6.6086, 106.7946, 2),            # Empang (atap padat asbes & seng)
    ("bogor_selatan", "padat_campuran", -6.6142, 106.8012, 2),         # Bondongan
    ("bogor_selatan", "perumahan_genteng", -6.6212, 106.8072, 2),      # Batutulis / Lawanggintung
    ("bogor_selatan", "perumahan_campuran", -6.6322, 106.8082, 2),     # Cipaku
    ("bogor_selatan", "perumahan_campuran", -6.6362, 106.7972, 2),     # Pamoyanan
    ("bogor_selatan", "perumahan_beton", -6.6528, 106.8178, 2),        # Rancamaya Estate

    # --- 5. BOGOR BARAT (hanggar/spandek Semplak, perumahan Menteng/Cilendek, Bubulak) ---
    ("bogor_barat", "perumahan_genteng", -6.5882, 106.7792, 2),        # Menteng / Taman Cimanggu
    ("bogor_barat", "perumahan_campuran", -6.5792, 106.7732, 2),       # Cilendek
    ("bogor_barat", "industri_spandek", -6.5672, 106.7682, 3),         # Semplak / Koridor Atang Sendjaja
    ("bogor_barat", "padat_asbes", -6.5842, 106.7622, 2),              # Sindangbarang
    ("bogor_barat", "komersial_spandek", -6.5712, 106.7532, 2),        # Bubulak / Terminal
    ("bogor_barat", "padat_campuran", -6.5972, 106.7794, 2),           # Gunung Batu / Loji

    # --- 6. TANAH SAREAL (koridor komersial Sholeh Iskandar, Yasmin modern, Kedung Badak) ---
    ("tanah_sareal", "komersial_dak_spandek", -6.5592, 106.7762, 3),   # Taman Yasmin & Transmart/ruko
    ("tanah_sareal", "industri_spandek", -6.5512, 106.7812, 3),        # Cibadak / Jl. Sholeh Iskandar
    ("tanah_sareal", "perumahan_genteng", -6.5722, 106.7982, 2),       # Kebon Pedes
    ("tanah_sareal", "perumahan_campuran", -6.5632, 106.7942, 2),      # Kedung Badak / Cimanggu
    ("tanah_sareal", "perumahan_beton", -6.5442, 106.7882, 2),         # Mekarwangi / Bukit Cimanggu City
    ("tanah_sareal", "perumahan_campuran", -6.5352, 106.7962, 2),      # Kencana / Kayumanis
]


def expand_anchor_grid(
    anchors: List[Tuple[str, str, float, float, int]],
    step_meters: float = 250.0,
) -> List[Tuple[str, str, float, float]]:
    """
    Kembangkan setiap anchor menjadi grid titik yang berjarak ~step_meters
    agar tile 3x3 (~228 m) tidak saling tumpang tindih (menghindari data leakage).
    """
    candidates: List[Tuple[str, str, float, float]] = []
    # 1 derajat lat ~ 111.320 m; 1 derajat lng di Bogor (-6.6 deg) ~ 110.580 m
    dlat_unit = step_meters / 111_320.0
    dlng_unit = step_meters / (111_320.0 * math.cos(math.radians(-6.59)))

    for kec, cat, lat, lng, radius in anchors:
        for dr in range(-radius, radius + 1):
            for dc in range(-radius, radius + 1):
                candidates.append((kec, cat, lat + dr * dlat_unit, lng + dc * dlng_unit))
    return candidates


def stratified_sample(
    items: List[Tuple[str, str, float, float, int, int]],
    target: int,
    seed: int,
) -> List[Tuple[str, str, float, float, int, int]]:
    """Ambil sampel seimbang per kecamatan (masing-masing ~target/6)."""
    rng = random.Random(seed)
    by_kec: Dict[str, List[Tuple[str, str, float, float, int, int]]] = {}
    for item in items:
        by_kec.setdefault(item[0], []).append(item)

    for lst in by_kec.values():
        rng.shuffle(lst)

    selected: List[Tuple[str, str, float, float, int, int]] = []
    kec_names = sorted(by_kec.keys())
    idx = 0
    while len(selected) < target:
        added_any = False
        for kec in kec_names:
            bucket = by_kec[kec]
            if idx < len(bucket) and len(selected) < target:
                selected.append(bucket[idx])
                added_any = True
        if not added_any:
            break
        idx += 1

    return selected


def build_qc_html(records: List[dict], out_html: Path) -> None:
    """Buat galeri HTML lokal agar seluruh tile bisa dicek visual dalam 1-2 menit."""
    cards = []
    for rec in records:
        rel_img = f"images/{rec['filename']}"
        cards.append(
            f"<div class='card'>"
            f"<img src='{rel_img}' loading='lazy' />"
            f"<div class='meta'><b>{rec['id']}</b><br/>"
            f"{rec['kecamatan']} · {rec['category']}<br/>"
            f"{rec['center_lat']:.5f}, {rec['center_lng']:.5f} (~{rec['footprint_m']:.0f} m)</div>"
            f"</div>"
        )
    html = (
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<title>SunSight QC — Tile Esri Kota Bogor</title>"
        "<style>"
        "body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:20px;}"
        ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;}"
        ".card{background:#1d1d1f;border-radius:10px;overflow:hidden;border:1px solid #333;}"
        ".card img{width:100%;aspect-ratio:1;object-fit:cover;display:block;}"
        ".meta{padding:8px 10px;font-size:12px;line-height:1.4;color:#ccc;}"
        "</style></head><body>"
        f"<h2>SunSight Esri World Imagery Kota Bogor ({len(records)} tile)</h2>"
        "<p>Periksa cepat apakah ada tile buram, berawan, atau bukan area atap. "
        "Hapus file gambar yang tidak layak sebelum masuk ke tahap auto-labeling.</p>"
        f"<div class='grid'>{''.join(cards)}</div></body></html>"
    )
    out_html.write_text(html, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Auto-download & stitch tile Esri World Imagery z19 Kota Bogor."
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("ml/data/raw_esri_bogor"),
        help="Folder keluaran gambar & metadata JSON.",
    )
    parser.add_argument(
        "--target",
        type=int,
        default=360,
        help="Jumlah target tile positif yang diunduh (default: 360 = 60 per kecamatan).",
    )
    parser.add_argument("--zoom", type=int, default=19, help="Zoom native Esri (default: 19).")
    parser.add_argument(
        "--grid-size",
        type=int,
        default=3,
        help="Ukuran grid ubin per sisi (3 -> 768x768 px ~ 228 m).",
    )
    parser.add_argument("--seed", type=int, default=42, help="Seed pengacakan terstratifikasi.")
    parser.add_argument(
        "--delay",
        type=float,
        default=0.06,
        help="Jeda (detik) antar request ubin Esri agar sopan terhadap server.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Hanya hitung & tampilkan rencana titik per kecamatan tanpa mengunduh gambar.",
    )
    args = parser.parse_args()

    raw_candidates = expand_anchor_grid(BOGOR_ANCHORS, step_meters=250.0)
    unique_candidates = deduplicate_tile_origins(
        raw_candidates, zoom=args.zoom, grid_size=args.grid_size, min_tile_step=args.grid_size
    )
    chosen = stratified_sample(unique_candidates, target=args.target, seed=args.seed)

    counts: Dict[str, int] = {}
    for kec, _, _, _, _, _ in chosen:
        counts[kec] = counts.get(kec, 0) + 1

    print(f"Total kandidat unik tanpa tumpang tindih : {len(unique_candidates)}")
    print(f"Total terpilih untuk diunduh             : {len(chosen)}")
    for kec, cnt in sorted(counts.items()):
        print(f"  - {kec:<15}: {cnt} tile")

    if args.dry_run:
        print("Mode --dry-run selesai. Tidak ada berkas yang diunduh.")
        return

    img_dir = args.out_dir / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    meta_path = args.out_dir / "metadata.json"

    existing: Dict[str, dict] = {}
    if meta_path.exists():
        for rec in json.loads(meta_path.read_text(encoding="utf-8")):
            existing[rec["id"]] = rec

    session = requests.Session()
    session.headers.update({"User-Agent": DEFAULT_USER_AGENT})

    records: List[dict] = list(existing.values())
    skipped_blank = 0

    for idx, (kec, cat, lat, lng, sx, sy) in enumerate(
        tqdm(chosen, desc="Unduh Esri Bogor z19"), start=1
    ):
        tile_id = f"bogor_{kec}_z{args.zoom}_{sx}_{sy}"
        filename = f"{tile_id}.jpg"
        out_img = img_dir / filename

        if tile_id in existing and out_img.exists():
            continue

        try:
            canvas, bbox, start_x, start_y, footprint_m = stitch_esri_patch(
                session=session,
                center_lat=lat,
                center_lng=lng,
                zoom=args.zoom,
                grid_size=args.grid_size,
                delay_sec=args.delay,
            )
        except ValueError:
            skipped_blank += 1
            continue
        except Exception as exc:
            print(f"[WARN] Lewati {tile_id}: {exc}")
            continue

        canvas.save(out_img, format="JPEG", quality=92)
        rec = {
            "id": tile_id,
            "filename": filename,
            "kecamatan": kec,
            "category": cat,
            "is_hard_negative": False,
            "center_lat": round(lat, 6),
            "center_lng": round(lng, 6),
            "zoom": args.zoom,
            "grid_size": args.grid_size,
            "start_x": start_x,
            "start_y": start_y,
            "width": canvas.width,
            "height": canvas.height,
            "bbox": [round(v, 7) for v in bbox.as_list()],
            "footprint_m": round(footprint_m, 2),
        }
        existing[tile_id] = rec
        records = list(existing.values())

        if idx % 10 == 0:
            meta_path.write_text(json.dumps(records, indent=2), encoding="utf-8")

    meta_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    build_qc_html(records, args.out_dir / "qc_gallery.html")

    print(f"\nSelesai! Tersimpan {len(records)} tile di {args.out_dir}")
    if skipped_blank:
        print(f"Dilewati {skipped_blank} tile kosong/placeholder Esri.")
    print(f"Buka {args.out_dir / 'qc_gallery.html'} di browser untuk pengecekan visual cepat.")


if __name__ == "__main__":
    main()
