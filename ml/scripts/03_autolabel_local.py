"""
Stage 3 (100% Lokal di CPU — Nol Risiko Putus Colab!):
Auto-Labeling 360 Tile Esri Kota Bogor dari Microsoft Global ML Building Footprints (Feb 2026)
+ Koreksi Otomatis Pergeseran Georeferensi (Edge Cross-Correlation Alignment).

Alur kerja:
  1. Ekstrak seluruh poligon bangunan Kota Bogor dari `ml/data/ms_buildings_310012113.csv.gz`
     ke cache lokal `ml/data/bogor_buildings_2026.json` (~5-10 detik).
  2. Proyeksikan poligon bangunan ke tiap tile Esri z19 (768x768 px).
  3. Cari pergeseran halus (dx, dy) dalam rentang +-14 px (+-4,2 m) menggunakan
     korelasi tepi Sobel antara citra Esri dan kontur bangunan sehingga poligon
     otomatis "mengunci" tepat ke tepi atap Esri!
  4. Simpan label YOLO-Seg ke `ml/data/raw_esri_bogor/labels_auto_aligned/*.txt`,
     buat overlay preview, dan hasilkan galeri QC interaktif `qc_autolabel_local.html`.
"""

from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import numpy as np
from shapely.geometry import Polygon, box
from shapely.strtree import STRtree
from tqdm import tqdm

from geo_utils import BOGOR_FULL_BBOX, GeoBBox, latlng_to_pixel_in_grid


def load_or_extract_bogor_buildings(
    gz_path: Path,
    cache_path: Path,
) -> Tuple[List[List[Tuple[float, float]]], STRtree]:
    if cache_path.exists():
        raw = json.loads(cache_path.read_text(encoding="utf-8"))
        rings = [[(float(lat), float(lng)) for lat, lng in ring] for ring in raw]
    else:
        if not gz_path.exists():
            raise FileNotFoundError(
                f"{gz_path} tidak ditemukan. Unduh Microsoft Buildings QuadKey 310012113 dulu."
            )
        min_lng, min_lat = BOGOR_FULL_BBOX.min_lng, BOGOR_FULL_BBOX.min_lat
        max_lng, max_lat = BOGOR_FULL_BBOX.max_lng, BOGOR_FULL_BBOX.max_lat

        rings = []
        print(f"Mengekstrak poligon bangunan Kota Bogor dari {gz_path.name}...", flush=True)
        with gzip.open(gz_path, "rt", encoding="utf-8", errors="ignore") as gz:
            for line in gz:
                if ("106.7" not in line and "106.8" not in line) or (
                    "-6.5" not in line and "-6.6" not in line
                ):
                    continue
                try:
                    feat = json.loads(line)
                except json.JSONDecodeError:
                    continue
                geom = feat.get("geometry") or {}
                if geom.get("type") != "Polygon":
                    continue
                coords = (geom.get("coordinates") or [[]])[0]
                if len(coords) < 3:
                    continue
                lng0, lat0 = float(coords[0][0]), float(coords[0][1])
                if not (min_lng <= lng0 <= max_lng and min_lat <= lat0 <= max_lat):
                    continue
                rings.append([(float(pt[1]), float(pt[0])) for pt in coords])

        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(rings), encoding="utf-8")
        print(f"Tersimpan {len(rings):,} poligon bangunan Kota Bogor di {cache_path}", flush=True)

    geoms: List[Polygon] = []
    valid_rings: List[List[Tuple[float, float]]] = []
    for ring in rings:
        pts = [(lng, lat) for lat, lng in ring]
        if len(pts) < 3:
            continue
        poly = Polygon(pts)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if not poly.is_empty and poly.geom_type == "Polygon":
            geoms.append(poly)
            valid_rings.append(ring)

    return valid_rings, STRtree(geoms)


def estimate_edge_shift(
    bgr_img: np.ndarray,
    raw_pixel_rings: List[List[Tuple[float, float]]],
    max_shift_px: int = 30,
) -> Tuple[int, int, float]:
    """
    Estimasi pergeseran (dx, dy) antara citra Esri dan poligon Microsoft Buildings
    dengan menggabungkan 2 sinyal komplementer pada rentang [-max_shift_px, +max_shift_px]:
      1. Korelasi tepi gradien Sobel citra Esri vs garis batas poligon bangunan (55%).
      2. Korelasi peta 'interior atap' (menghukum kanopi hijau & aspal/bayangan gelap)
         vs isi poligon bangunan (45%) agar deretan rumah perumahan tidak bergeser ke jalan!
    """
    if len(raw_pixel_rings) < 3:
        return 0, 0, 0.0

    h, w = bgr_img.shape[:2]
    m = max_shift_px
    if h <= 2 * m + 32 or w <= 2 * m + 32:
        return 0, 0, 0.0

    # 1. Peta tepi Sobel citra Esri
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    gray_blur = cv2.GaussianBlur(gray, (3, 3), 0)
    gx = cv2.Sobel(gray_blur, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray_blur, cv2.CV_32F, 0, 1, ksize=3)
    edge_map = cv2.GaussianBlur(cv2.magnitude(gx, gy), (5, 5), 0)
    max_val = float(edge_map.max())
    if max_val > 1e-6:
        edge_map /= max_val

    # 2. Peta probabilitas interior atap (non-vegetasi hijau & non-aspal/bayangan gelap)
    b_ch, g_ch, r_ch = cv2.split(bgr_img.astype(np.float32))
    exg = (2.0 * g_ch - r_ch - b_ch) / 255.0  # Excess Green Index (tinggi pada pohon/rumput)
    brightness = np.maximum(np.maximum(r_ch, g_ch), b_ch) / 255.0
    # Atap (merah/putih/biru/abu terang) -> nilai positif; pohon hijau & aspal gelap -> negatif
    roof_prior = (
        np.clip((brightness - 0.28) * 2.2, -1.0, 1.0)
        - np.clip((exg - 0.06) * 4.0, 0.0, 1.5)
    ).astype(np.float32)
    roof_prior = cv2.GaussianBlur(roof_prior, (5, 5), 0)

    # 3. Render kontur & isi poligon bangunan
    poly_edges = np.zeros((h, w), dtype=np.float32)
    poly_fill = np.zeros((h, w), dtype=np.float32)
    for ring in raw_pixel_rings:
        pts = np.array([[int(round(x)), int(round(y))] for x, y in ring], dtype=np.int32)
        if len(pts) >= 3:
            cv2.polylines(poly_edges, [pts], isClosed=True, color=1.0, thickness=2)
            cv2.fillPoly(poly_fill, [pts], color=1.0)
    poly_edges = cv2.GaussianBlur(poly_edges, (5, 5), 0)

    tmpl_edge = poly_edges[m : h - m, m : w - m]
    tmpl_fill = poly_fill[m : h - m, m : w - m]
    if float(tmpl_edge.sum()) < 20.0 or float(tmpl_fill.sum()) < 100.0:
        return 0, 0, 0.0

    res_edge = cv2.matchTemplate(edge_map, tmpl_edge, cv2.TM_CCOEFF_NORMED)
    res_fill = cv2.matchTemplate(roof_prior, tmpl_fill, cv2.TM_CCOEFF_NORMED)
    combined = 0.55 * res_edge + 0.45 * res_fill

    # Prior halus agar tetap memilih pergeseran yang wajar bila skor hampir sama
    yy, xx = np.mgrid[0 : 2 * m + 1, 0 : 2 * m + 1]
    dist2 = ((xx - m) ** 2 + (yy - m) ** 2).astype(np.float32)
    prior = np.exp(-dist2 / (2.0 * (m * 0.95) ** 2))
    scored = combined * (0.90 + 0.10 * prior)

    _, _, _, max_loc = cv2.minMaxLoc(scored)
    dx = int(max_loc[0] - m)
    dy = int(max_loc[1] - m)
    gain = float(combined[max_loc[1], max_loc[0]] - combined[m, m])

    if gain < 0.01:
        return 0, 0, round(gain, 4)
    return dx, dy, round(gain, 4)


def _vegetation_fraction_inside(
    bgr_img: np.ndarray,
    hsv_img: np.ndarray,
    pts_i32: np.ndarray,
) -> float:
    """
    Hitung proporsi piksel vegetasi (rumput/halaman hijau/kanopi pohon) di dalam poligon.
    Memakai HSV Hue hijau-kuning [28..88] + saturasi & Excess Green agar tidak
    salah membuang atap spandek biru/teal.
    """
    x, y, bw, bh = cv2.boundingRect(pts_i32)
    if bw <= 0 or bh <= 0:
        return 1.0
    sub_bgr = bgr_img[y : y + bh, x : x + bw]
    sub_hsv = hsv_img[y : y + bh, x : x + bw]
    local_pts = pts_i32 - np.array([x, y], dtype=np.int32)
    mask = np.zeros((bh, bw), dtype=np.uint8)
    cv2.fillPoly(mask, [local_pts], 255)
    inside = mask > 0
    total = int(np.count_nonzero(inside))
    if total == 0:
        return 1.0

    h_ch = sub_hsv[:, :, 0]
    s_ch = sub_hsv[:, :, 1]
    v_ch = sub_hsv[:, :, 2]
    b_ch = sub_bgr[:, :, 0].astype(np.int16)
    g_ch = sub_bgr[:, :, 1].astype(np.int16)
    r_ch = sub_bgr[:, :, 2].astype(np.int16)

    is_veg = (
        inside
        & (h_ch >= 28)
        & (h_ch <= 86)
        & (s_ch >= 38)
        & (v_ch >= 25)
        & ((g_ch - r_ch) >= 5)
        & ((g_ch - b_ch) >= 10)
    )
    return float(np.count_nonzero(is_veg) / total)


def project_and_format_yolo(
    bgr_img: np.ndarray,
    raw_pixel_rings: List[List[Tuple[float, float]]],
    dx: int,
    dy: int,
    width: int,
    height: int,
    min_area_px: float = 160.0,
    max_veg_fraction: float = 0.42,
    max_aspect_ratio: float = 4.6,
) -> Tuple[List[str], List[np.ndarray], int]:
    frame = box(0.0, 0.0, float(width - 1), float(height - 1))
    hsv_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
    yolo_lines: List[str] = []
    pixel_polys: List[np.ndarray] = []
    filtered_out = 0

    for ring in raw_pixel_rings:
        shifted = [(x + dx, y + dy) for x, y in ring]
        if len(shifted) < 3:
            continue
        poly = Polygon(shifted)
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
            arr_pts = np.array([[int(round(x)), int(round(y))] for x, y in coords], dtype=np.int32)

            # Filter 1: Tolak strip parkiran/jalur sangat sempit memanjang
            (_, _), (rw, rh), _ = cv2.minAreaRect(arr_pts)
            if min(rw, rh) <= 0 or (max(rw, rh) / min(rw, rh)) > max_aspect_ratio:
                filtered_out += 1
                continue

            # Filter 2: Tolak poligon bangunan usang yang kini berupa rumput/halaman/pohon hijau
            if _vegetation_fraction_inside(bgr_img, hsv_img, arr_pts) >= max_veg_fraction:
                filtered_out += 1
                continue

            tokens = ["0"]
            for x, y in coords:
                nx = max(0.0, min(1.0, x / width))
                ny = max(0.0, min(1.0, y / height))
                tokens.append(f"{nx:.6f}")
                tokens.append(f"{ny:.6f}")
            yolo_lines.append(" ".join(tokens))
            pixel_polys.append(arr_pts)

    return yolo_lines, pixel_polys, filtered_out


def save_overlay_preview(
    bgr_img: np.ndarray,
    pixel_polys: List[np.ndarray],
    out_path: Path,
) -> None:
    preview = bgr_img.copy()
    overlay = bgr_img.copy()
    for pts in pixel_polys:
        cv2.fillPoly(overlay, [pts], color=(0, 215, 255))
        cv2.polylines(preview, [pts], isClosed=True, color=(0, 240, 255), thickness=2)
    blended = cv2.addWeighted(overlay, 0.25, preview, 0.75, 0)
    cv2.imwrite(str(out_path), blended, [int(cv2.IMWRITE_JPEG_QUALITY), 85])


def build_qc_html(summary: List[dict], out_html: Path) -> None:
    cards = []
    for rec in summary:
        cards.append(
            f"<div class='card' data-id='{rec['id']}' onclick='toggleCard(this)'>"
            f"<div class='badge'>BUANG</div>"
            f"<img src='previews_aligned/{rec['filename']}' loading='lazy' />"
            f"<div class='meta'><b>{rec['id']}</b><br/>"
            f"{rec['kecamatan']} · <b>{rec['polygons']} atap</b><br/>"
            f"Shift align: ({rec['dx']:+d}, {rec['dy']:+d}) px</div>"
            f"</div>"
        )
    html = (
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<title>SunSight QC — Auto-Label Lokal (Microsoft Buildings 2026 + Edge Align)</title>"
        "<style>"
        "body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:20px;padding-bottom:80px;}"
        ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}"
        ".card{position:relative;background:#1d1d1f;border-radius:10px;overflow:hidden;border:2px solid #333;cursor:pointer;}"
        ".card.marked{border-color:#ef4444;opacity:0.55;}"
        ".badge{display:none;position:absolute;top:8px;right:8px;background:#ef4444;color:#fff;font-weight:700;font-size:11px;padding:4px 8px;border-radius:6px;}"
        ".card.marked .badge{display:block;}"
        ".card img{width:100%;aspect-ratio:1;object-fit:cover;display:block;}"
        ".meta{padding:8px 10px;font-size:12px;line-height:1.4;color:#ccc;}"
        ".bar{position:fixed;bottom:0;left:0;right:0;background:#18181b;border-top:1px solid #333;padding:12px 20px;display:flex;gap:12px;align-items:center;}"
        "button{background:#f59e0b;color:#111;border:none;padding:9px 16px;border-radius:8px;font-weight:700;cursor:pointer;}"
        "#cmd{flex:1;background:#09090b;color:#a7f3d0;border:1px solid #333;border-radius:6px;padding:8px;font-family:monospace;font-size:12px;}"
        "</style></head><body>"
        f"<h2>SunSight Auto-Label Lokal ({len(summary)} tile Esri Kota Bogor)</h2>"
        "<p>Klik kartu mana pun jika hasilnya sangat meleset/kosong untuk membuat perintah hapus otomatis sebelum split dataset.</p>"
        f"<div class='grid'>{''.join(cards)}</div>"
        "<div class='bar'>"
        "<span id='cnt'>0 ditandai buang</span>"
        "<input id='cmd' readonly placeholder='Klik kartu bermasalah untuk salin perintah hapus...' />"
        "<button onclick='copyCmd()'>Salin Perintah Hapus</button>"
        "</div>"
        "<script>"
        "const marked=new Set();"
        "function toggleCard(el){"
        "  const id=el.dataset.id;"
        "  if(marked.has(id)){marked.delete(id);el.classList.remove('marked');}"
        "  else{marked.add(id);el.classList.add('marked');}"
        "  document.getElementById('cnt').textContent=marked.size+' ditandai buang';"
        "  const ids=[...marked];"
        "  document.getElementById('cmd').value=ids.length?"
        "    ids.map(x=>`Remove-Item ml/data/raw_esri_bogor/images/${x}.jpg, ml/data/raw_esri_bogor/labels_auto_aligned/${x}.txt -ErrorAction SilentlyContinue`).join('; '):'';"
        "}"
        "function copyCmd(){const i=document.getElementById('cmd');if(!i.value)return;i.select();navigator.clipboard.writeText(i.value);alert('Perintah hapus disalin!');}"
        "</script></body></html>"
    )
    out_html.write_text(html, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Auto-label 360 tile Esri secara lokal (Microsoft Buildings 2026 + Edge Alignment)."
    )
    parser.add_argument("--raw-dir", type=Path, default=Path("ml/data/raw_esri_bogor"))
    parser.add_argument("--gz-path", type=Path, default=Path("ml/data/ms_buildings_310012113.csv.gz"))
    parser.add_argument("--cache-path", type=Path, default=Path("ml/data/bogor_buildings_2026.json"))
    parser.add_argument("--max-shift-px", type=int, default=30)
    parser.add_argument("--min-polygons", type=int, default=1)
    args = parser.parse_args()

    records = json.loads((args.raw_dir / "metadata.json").read_text(encoding="utf-8"))
    rings, tree = load_or_extract_bogor_buildings(args.gz_path, args.cache_path)

    img_dir = args.raw_dir / "images"
    lbl_dir = args.raw_dir / "labels_auto_aligned"
    prev_dir = args.raw_dir / "previews_aligned"
    lbl_dir.mkdir(parents=True, exist_ok=True)
    prev_dir.mkdir(parents=True, exist_ok=True)

    summary: List[dict] = []
    total_polys = 0
    total_filtered = 0
    zero_tiles = 0
    shifts_applied = 0

    for rec in tqdm(records, desc="Auto-Label & Edge-Align"):
        img_path = img_dir / rec["filename"]
        if not img_path.exists():
            continue
        bgr = cv2.imread(str(img_path))
        if bgr is None:
            continue
        h, w = bgr.shape[:2]

        bbox = GeoBBox(*rec["bbox"])
        qbox = box(bbox.min_lng - 0.00015, bbox.min_lat - 0.00015, bbox.max_lng + 0.00015, bbox.max_lat + 0.00015)
        idxs = tree.query(qbox, predicate="intersects")

        raw_pixel_rings: List[List[Tuple[float, float]]] = []
        for idx in idxs:
            ring = rings[int(idx)]
            pts = [
                latlng_to_pixel_in_grid(lat, lng, rec["start_x"], rec["start_y"], rec["zoom"])
                for lat, lng in ring
            ]
            if len(pts) >= 3:
                raw_pixel_rings.append(pts)

        dx, dy, gain = estimate_edge_shift(bgr, raw_pixel_rings, max_shift_px=args.max_shift_px)
        if dx != 0 or dy != 0:
            shifts_applied += 1

        yolo_lines, pixel_polys, n_filt = project_and_format_yolo(bgr, raw_pixel_rings, dx, dy, w, h)
        total_filtered += n_filt
        if len(yolo_lines) < args.min_polygons:
            zero_tiles += 1

        (lbl_dir / f"{rec['id']}.txt").write_text("\n".join(yolo_lines), encoding="utf-8")
        save_overlay_preview(bgr, pixel_polys, prev_dir / rec["filename"])

        total_polys += len(yolo_lines)
        summary.append(
            {
                "id": rec["id"],
                "filename": rec["filename"],
                "kecamatan": rec["kecamatan"],
                "category": rec["category"],
                "polygons": len(yolo_lines),
                "filtered_noise": n_filt,
                "dx": dx,
                "dy": dy,
                "align_gain": gain,
            }
        )

    (args.raw_dir / "autolabel_stats.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    build_qc_html(summary, args.raw_dir / "qc_autolabel_local.html")

    print("\n=== Ringkasan Auto-Label Lokal SunSight (Cleaned) ===")
    print(f"Total tile diproses        : {len(summary)}")
    print(f"Total poligon atap bersih  : {total_polys:,} (rata-rata {total_polys/max(1,len(summary)):.1f} atap/tile)")
    print(f"Poligon rumput/parkir dibuang: {total_filtered:,}")
    print(f"Tile terkoreksi edge-align : {shifts_applied}/{len(summary)}")
    if zero_tiles:
        print(f"Tile dengan 0 bangunan     : {zero_tiles} (otomatis dilewati saat split positif)")
    print(f"Galeri QC visual           : {args.raw_dir / 'qc_autolabel_local.html'}")


if __name__ == "__main__":
    main()
