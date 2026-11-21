"""
Stage 2: Auto-Generator Hard Negative Images (Jalan, Paving, Pepohonan, Sungai, Lapangan).

Menggunakan cache lokal poligon bangunan OSM Kota Bogor (`STRtree` spatial index)
sehingga penyaringan 0-bangunan untuk 295 kandidat selesai dalam < 1 detik!
Kategori di-interleave (round-robin) agar 80 hard negative berisi campuran seimbang:
jalan tol/aspal, kanopi pohon, lapangan paving, runway aspal, sungai/danau, dan lahan terbuka.

Contoh penggunaan:
    python ml/scripts/02_harvest_hard_negatives.py --target 80
    python ml/scripts/02_harvest_hard_negatives.py --target 80 --dry-run
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Dict, List, Tuple

import requests
from tqdm import tqdm

from geo_utils import (
    DEFAULT_USER_AGENT,
    deduplicate_tile_origins,
    latlng_to_tile_xy,
    load_or_fetch_bogor_osm_buildings,
    query_buildings_in_bbox,
    stitch_esri_patch,
    tile_grid_bbox,
)

# Zona non-bangunan nyata di Kota Bogor & pinggiran koridor jalan utama:
# Format: (kecamatan, tipe_hard_negative, lat, lng, radius_grid)
HARD_NEGATIVE_ANCHORS: List[Tuple[str, str, float, float, int]] = [
    # 1. Jalan tol & koridor aspal lebar
    ("bogor_timur", "jalan_tol_aspal", -6.6155, 106.8270, 2),          # Tol Jagorawi (Katulampa/Baranangsiang)
    ("bogor_utara", "jalan_tol_aspal", -6.5880, 106.8350, 2),          # Koridor Tol Jagorawi / Cimahpar
    ("tanah_sareal", "jalan_tol_aspal", -6.5485, 106.7985, 2),         # Tol BORR koridor utara
    ("bogor_selatan", "jalan_tol_aspal", -6.6470, 106.8340, 2),        # Koridor Tol Bocimi / Ciawi

    # 2. Kanopi pohon lebat & taman (anti false positive kanopi/bayangan)
    ("bogor_tengah", "kanopi_pohon", -6.5978, 106.7995, 2),            # Kebun Raya Bogor (tengah)
    ("bogor_tengah", "kanopi_pohon", -6.6012, 106.8030, 1),            # Kebun Raya Bogor (selatan)
    ("bogor_barat", "kanopi_pohon", -6.5525, 106.7450, 2),             # Hutan Penelitian CIFOR
    ("bogor_barat", "air_danau_pohon", -6.5515, 106.7502, 1),          # Situ Gede

    # 3. Lapangan terbuka, rumput, paving, landasan (anti false positive beton/paving terang)
    ("bogor_tengah", "lapangan_paving", -6.5905, 106.8012, 1),         # Lapangan Sempur
    ("bogor_barat", "runway_aspal_rumput", -6.5448, 106.7630, 2),      # Landasan & lapangan Lanud Atang Sendjaja
    ("bogor_selatan", "lapangan_hijau", -6.6575, 106.8260, 2),         # Lapangan Golf Rancamaya
    ("bogor_selatan", "sawah_terbuka", -6.6440, 106.7830, 2),          # Area persawahan Mulyaharja
    ("bogor_utara", "lahan_terbuka", -6.5655, 106.8335, 2),            # Lahan terbuka Bogor Utara timur
    ("tanah_sareal", "lahan_terbuka", -6.5315, 106.7745, 2),           # Lahan terbuka utara Kayumanis
]


def expand_candidates(
    anchors: List[Tuple[str, str, float, float, int]],
    step_meters: float = 175.0,
) -> List[Tuple[str, str, float, float]]:
    candidates: List[Tuple[str, str, float, float]] = []
    dlat_unit = step_meters / 111_320.0
    dlng_unit = step_meters / (111_320.0 * math.cos(math.radians(-6.59)))
    for kec, cat, lat, lng, radius in anchors:
        for dr in range(-radius, radius + 1):
            for dc in range(-radius, radius + 1):
                candidates.append((kec, cat, lat + dr * dlat_unit, lng + dc * dlng_unit))
    return candidates


def interleave_by_category(
    items: List[Tuple[str, str, float, float, int, int]],
) -> List[Tuple[str, str, float, float, int, int]]:
    """Susun round-robin antar kategori agar hard negative seimbang (jalan, pohon, paving, air, sawah)."""
    buckets: Dict[str, List[Tuple[str, str, float, float, int, int]]] = {}
    for item in items:
        buckets.setdefault(item[1], []).append(item)

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
    return ordered


def build_qc_html(records: List[dict], out_html: Path) -> None:
    cards = []
    for rec in records:
        rel_img = f"images/{rec['filename']}"
        cards.append(
            f"<div class='card' data-id='{rec['id']}' onclick='toggleCard(this)'>"
            f"<div class='badge'>HAPUS</div>"
            f"<img src='{rel_img}' loading='lazy' />"
            f"<div class='meta'><b>{rec['id']}</b><br/>"
            f"{rec['category']} ({rec['kecamatan']})<br/>"
            f"~{rec['footprint_m']:.0f} m</div>"
            f"</div>"
        )
    html = (
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<title>SunSight QC — Hard Negative Images</title>"
        "<style>"
        "body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:20px;padding-bottom:80px;}"
        ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;}"
        ".card{position:relative;background:#1d1d1f;border-radius:10px;overflow:hidden;border:2px solid #333;cursor:pointer;transition:.15s;}"
        ".card:hover{border-color:#f59e0b;}"
        ".card.marked{border-color:#ef4444;opacity:0.55;}"
        ".badge{display:none;position:absolute;top:8px;right:8px;background:#ef4444;color:#fff;font-weight:700;font-size:11px;padding:4px 8px;border-radius:6px;}"
        ".card.marked .badge{display:block;}"
        ".card img{width:100%;aspect-ratio:1;object-fit:cover;display:block;}"
        ".meta{padding:8px 10px;font-size:12px;line-height:1.4;color:#ccc;}"
        ".warn{background:#3a2200;border:1px solid #b45309;padding:12px 16px;border-radius:8px;margin-bottom:16px;}"
        ".bar{position:fixed;bottom:0;left:0;right:0;background:#18181b;border-top:1px solid #333;padding:12px 20px;display:flex;gap:12px;align-items:center;justify-content:space-between;}"
        "button{background:#f59e0b;color:#111;border:none;padding:9px 16px;border-radius:8px;font-weight:700;cursor:pointer;}"
        "button:hover{background:#fbbf24;}"
        "#cmd{flex:1;background:#09090b;color:#a7f3d0;border:1px solid #333;border-radius:6px;padding:8px;font-family:monospace;font-size:12px;}"
        "</style></head><body>"
        f"<h2>SunSight Hard Negatives ({len(records)} tile berlabel kosong)</h2>"
        "<div class='warn'><b>Checklist QC Interaktif (1 Menit):</b> "
        "<b>Klik</b> setiap gambar yang masih memiliki atap bangunan di dalamnya (akan ditandai merah). "
        "Lalu klik <b>Salin Perintah Hapus</b> di bawah dan tempel di terminal PowerShell (atau kirim daftarnya ke AI).</div>"
        f"<div class='grid'>{''.join(cards)}</div>"
        "<div class='bar'>"
        "<span id='cnt'>0 ditandai hapus</span>"
        "<input id='cmd' readonly placeholder='Klik kartu yang ada atapnya untuk membuat perintah hapus otomatis...' />"
        "<button onclick='copyCmd()'>Salin Perintah Hapus</button>"
        "</div>"
        "<script>"
        "const marked=new Set();"
        "function toggleCard(el){"
        "  const id=el.dataset.id;"
        "  if(marked.has(id)){marked.delete(id);el.classList.remove('marked');}"
        "  else{marked.add(id);el.classList.add('marked');}"
        "  document.getElementById('cnt').textContent=marked.size+' ditandai hapus';"
        "  const ids=[...marked];"
        "  document.getElementById('cmd').value=ids.length?"
        "    ids.map(x=>`Remove-Item ml/data/hard_negatives/images/${x}.jpg, ml/data/hard_negatives/labels/${x}.txt -ErrorAction SilentlyContinue`).join('; '):'';"
        "}"
        "function copyCmd(){const i=document.getElementById('cmd');if(!i.value)return;i.select();navigator.clipboard.writeText(i.value);alert('Perintah hapus disalin!');}"
        "</script></body></html>"
    )
    out_html.write_text(html, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Auto-harvest hard negative Esri tiles (0 bangunan via cache OSM lokal)."
    )
    parser.add_argument("--out-dir", type=Path, default=Path("ml/data/hard_negatives"))
    parser.add_argument("--osm-cache", type=Path, default=Path("ml/data/osm_bogor_buildings.json"))
    parser.add_argument("--target", type=int, default=80)
    parser.add_argument("--zoom", type=int, default=19)
    parser.add_argument("--grid-size", type=int, default=2)
    parser.add_argument("--delay", type=float, default=0.06)
    parser.add_argument(
        "--skip-building-check",
        action="store_true",
        help="Langsung unduh tile dari zona non-bangunan terkurasi tanpa menunggu unduhan cache bangunan besar (cek visual via qc_hard_negatives.html).",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    step_m = 175.0 if args.grid_size == 2 else 250.0
    raw = expand_candidates(HARD_NEGATIVE_ANCHORS, step_meters=step_m)
    unique = deduplicate_tile_origins(
        raw, zoom=args.zoom, grid_size=args.grid_size, min_tile_step=args.grid_size
    )
    ordered = interleave_by_category(unique)

    print(f"Kandidat zona non-bangunan unik : {len(ordered)}")
    print(f"Target hard negative            : {args.target}")
    if args.dry_run:
        by_cat: Dict[str, int] = {}
        for _, cat, _, _, _, _ in ordered:
            by_cat[cat] = by_cat.get(cat, 0) + 1
        for cat, cnt in sorted(by_cat.items()):
            print(f"  - {cat:<22}: {cnt} kandidat")
        return

    if args.skip_building_check:
        clean_candidates = ordered
        rejected_has_building = 0
        print(
            f"Mode cepat (--skip-building-check): mengunduh {min(args.target, len(clean_candidates))} "
            "tile dari zona non-bangunan terkurasi (~2 menit). Cek visual di qc_hard_negatives.html."
        )
    else:
        # 1. Muat / unduh cache poligon bangunan Kota Bogor SEKALI saja
        rings, geoms, tree = load_or_fetch_bogor_osm_buildings(cache_path=args.osm_cache)

        # 2. Saring seluruh kandidat secara instan di memori (< 1 detik)
        clean_candidates = []
        rejected_has_building = 0
        for item in ordered:
            kec, cat, lat, lng, sx, sy = item
            cx, cy = latlng_to_tile_xy(lat, lng, args.zoom)
            half = args.grid_size // 2
            bbox = tile_grid_bbox(cx - half, cy - half, args.grid_size, args.zoom)
            hits = query_buildings_in_bbox(bbox, rings, geoms, tree, margin_deg=0.00012)
            if len(hits) == 0:
                clean_candidates.append(item)
            else:
                rejected_has_building += 1

        print(
            f"Lolos filter 0-bangunan         : {len(clean_candidates)} kandidat "
            f"(ditolak {rejected_has_building} karena dekat bangunan)"
        )

    img_dir = args.out_dir / "images"
    lbl_dir = args.out_dir / "labels"
    img_dir.mkdir(parents=True, exist_ok=True)
    lbl_dir.mkdir(parents=True, exist_ok=True)
    meta_path = args.out_dir / "metadata.json"

    existing: Dict[str, dict] = {}
    if meta_path.exists():
        for rec in json.loads(meta_path.read_text(encoding="utf-8")):
            existing[rec["id"]] = rec

    session = requests.Session()
    session.headers.update({"User-Agent": DEFAULT_USER_AGENT})

    chosen = clean_candidates[: args.target]
    for kec, cat, lat, lng, sx, sy in tqdm(chosen, desc="Unduh Hard Negatives Esri"):
        tile_id = f"hardneg_{cat}_z{args.zoom}_{sx}_{sy}"
        filename = f"{tile_id}.jpg"
        out_img = img_dir / filename
        out_lbl = lbl_dir / f"{tile_id}.txt"

        if tile_id in existing and out_img.exists():
            if not out_lbl.exists():
                out_lbl.write_text("", encoding="utf-8")
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
        except Exception as exc:
            print(f"[WARN] Gagal unduh {tile_id}: {exc}")
            continue

        canvas.save(out_img, format="JPEG", quality=92)
        out_lbl.write_text("", encoding="utf-8")

        existing[tile_id] = {
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
            "width": canvas.width,
            "height": canvas.height,
            "bbox": [round(v, 7) for v in bbox.as_list()],
            "footprint_m": round(footprint_m, 2),
        }

    records = list(existing.values())
    meta_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    build_qc_html(records, args.out_dir / "qc_hard_negatives.html")

    by_cat_saved: Dict[str, int] = {}
    for r in records:
        by_cat_saved[r["category"]] = by_cat_saved.get(r["category"], 0) + 1
    print(f"\nSelesai! Tersimpan {len(records)} hard negative di {args.out_dir}:")
    for cat, cnt in sorted(by_cat_saved.items()):
        print(f"  - {cat:<22}: {cnt} tile")
    print(f"WAJIB buka {args.out_dir / 'qc_hard_negatives.html'} untuk cek cepat visual.")


if __name__ == "__main__":
    main()
