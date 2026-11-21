"""
Utilitas Web Mercator & Esri World Imagery untuk pipeline dataset SunSight.

Menyamakan persis perhitungan proyeksi tile z19 (256x256 px) yang dipakai
antarmuka Studio (Leaflet) dan backend Laravel (TileImageryProvider / PixelGeoMapper).
"""

from __future__ import annotations

import csv
import gzip
import io
import json
import math
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple

import numpy as np
import requests
from PIL import Image
from shapely.geometry import Polygon, box
from shapely.strtree import STRtree

TILE_SIZE = 256
ESRI_WORLD_IMAGERY_URL = (
    "https://server.arcgisonline.com/ArcGIS/rest/services/"
    "World_Imagery/MapServer/tile/{z}/{y}/{x}"
)
OVERPASS_URLS = (
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)
DEFAULT_USER_AGENT = "SunSight-ML-DatasetBuilder/1.0 (+research-kota-bogor)"


@dataclass(frozen=True)
class GeoBBox:
    """Bounding box geografis dalam urutan [min_lng, min_lat, max_lng, max_lat]."""

    min_lng: float
    min_lat: float
    max_lng: float
    max_lat: float

    def as_list(self) -> list[float]:
        return [self.min_lng, self.min_lat, self.max_lng, self.max_lat]

    def overpass_bbox(self) -> str:
        """Format Overpass: (south,west,north,east)."""
        return f"{self.min_lat:.7f},{self.min_lng:.7f},{self.max_lat:.7f},{self.max_lng:.7f}"


def latlng_to_tile_xy(lat: float, lng: float, zoom: int) -> Tuple[int, int]:
    """Konversi (lat, lng) ke indeks ubin Web Mercator integer (x, y)."""
    n = 2**zoom
    lat_rad = math.radians(lat)
    x = int(math.floor((lng + 180.0) / 360.0 * n))
    y = int(
        math.floor(
            (1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi)
            / 2.0
            * n
        )
    )
    return max(0, min(n - 1, x)), max(0, min(n - 1, y))


def tile_xy_to_latlng(x: float, y: float, zoom: int) -> Tuple[float, float]:
    """Konversi koordinat ubin Web Mercator (bisa pecahan) ke (lat, lng)."""
    n = 2**zoom
    lng = x / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / n)))
    lat = math.degrees(lat_rad)
    return lat, lng


def tile_grid_bbox(start_x: int, start_y: int, grid_size: int, zoom: int) -> GeoBBox:
    """Hitung bbox tepat untuk grid ubin [start_x..start_x+grid_size, start_y..start_y+grid_size]."""
    max_lat, min_lng = tile_xy_to_latlng(start_x, start_y, zoom)
    min_lat, max_lng = tile_xy_to_latlng(start_x + grid_size, start_y + grid_size, zoom)
    return GeoBBox(min_lng=min_lng, min_lat=min_lat, max_lng=max_lng, max_lat=max_lat)


def meters_per_pixel(lat: float, zoom: int) -> float:
    """Resolusi tanah (meter/piksel) Web Mercator pada lintang & zoom tertentu."""
    return 156543.03392 * math.cos(math.radians(lat)) / (2**zoom)


def latlng_to_pixel_in_grid(
    lat: float,
    lng: float,
    start_x: int,
    start_y: int,
    zoom: int,
) -> Tuple[float, float]:
    """Proyeksi (lat, lng) ke koordinat piksel (px, py) relatif terhadap sudut kiri-atas grid."""
    n = 2**zoom
    lat_rad = math.radians(lat)
    fx = (lng + 180.0) / 360.0 * n
    fy = (
        (1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi)
        / 2.0
        * n
    )
    px = (fx - start_x) * TILE_SIZE
    py = (fy - start_y) * TILE_SIZE
    return px, py


def is_blank_or_placeholder_tile(img: Image.Image) -> bool:
    """Deteksi ubin Esri kosong / abu-abu ('Map data not yet available')."""
    arr = np.asarray(img.convert("RGB"), dtype=np.float32)
    # Standar deviasi sangat rendah menandakan warna solid / placeholder abu-abu
    if float(arr.std()) < 8.0:
        return True
    return False


def fetch_esri_tile(
    session: requests.Session,
    z: int,
    x: int,
    y: int,
    timeout: int = 20,
    retries: int = 3,
) -> Image.Image:
    """Unduh satu ubin Esri World Imagery (256x256) dengan retry otomatis."""
    url = ESRI_WORLD_IMAGERY_URL.format(z=z, x=x, y=y)
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            resp = session.get(url, timeout=timeout)
            resp.raise_for_status()
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            if img.size != (TILE_SIZE, TILE_SIZE):
                img = img.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.BILINEAR)
            return img
        except Exception as exc:
            last_err = exc
            time.sleep(0.6 * (attempt + 1))
    raise RuntimeError(f"Gagal mengunduh ubin Esri z={z} x={x} y={y}: {last_err}")


def stitch_esri_patch(
    session: requests.Session,
    center_lat: float,
    center_lng: float,
    zoom: int = 19,
    grid_size: int = 3,
    delay_sec: float = 0.08,
) -> Tuple[Image.Image, GeoBBox, int, int, float]:
    """
    Gabungkan grid_size x grid_size ubin Esri z19 di sekitar (center_lat, center_lng).

    Untuk grid_size=3 pada z=19 di Kota Bogor:
      - Ukuran citra: 768 x 768 px
      - Cakupan geografis: ~228 m x 228 m (sesuai rentang optimal SunSight 180-230 m)
    """
    cx, cy = latlng_to_tile_xy(center_lat, center_lng, zoom)
    half = grid_size // 2
    start_x = cx - half
    start_y = cy - half

    canvas = Image.new("RGB", (grid_size * TILE_SIZE, grid_size * TILE_SIZE))
    blank_count = 0

    for row in range(grid_size):
        for col in range(grid_size):
            tile = fetch_esri_tile(session, zoom, start_x + col, start_y + row)
            if is_blank_or_placeholder_tile(tile):
                blank_count += 1
            canvas.paste(tile, (col * TILE_SIZE, row * TILE_SIZE))
            if delay_sec > 0:
                time.sleep(delay_sec)

    if blank_count > 0:
        raise ValueError(
            f"Patch ({center_lat:.5f}, {center_lng:.5f}) memiliki {blank_count} ubin kosong/placeholder."
        )

    bbox = tile_grid_bbox(start_x, start_y, grid_size, zoom)
    mpp = meters_per_pixel(center_lat, zoom)
    footprint_m = mpp * grid_size * TILE_SIZE
    return canvas, bbox, start_x, start_y, footprint_m


def query_overpass(
    session: requests.Session,
    query: str,
    timeout: int = 45,
    retries: int = 3,
) -> dict:
    """Jalankan query Overpass OSM dengan fallback antar mirror & backoff."""
    last_err: Exception | None = None
    for attempt in range(retries):
        for endpoint in OVERPASS_URLS:
            try:
                resp = session.post(
                    endpoint,
                    data={"data": query},
                    timeout=timeout,
                    headers={"User-Agent": DEFAULT_USER_AGENT},
                )
                if resp.status_code == 429 or resp.status_code >= 500:
                    last_err = RuntimeError(f"HTTP {resp.status_code} from {endpoint}")
                    time.sleep(2.0 * (attempt + 1))
                    continue
                resp.raise_for_status()
                return resp.json()
            except Exception as exc:
                last_err = exc
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Query Overpass gagal setelah {retries} percobaan: {last_err}")


def deduplicate_tile_origins(
    candidates: Iterable[Tuple[str, str, float, float]],
    zoom: int,
    grid_size: int,
    min_tile_step: int = 3,
) -> list[Tuple[str, str, float, float, int, int]]:
    """
    Hilangkan kandidat yang saling tumpang tindih berlebihan pada grid ubin z19.
    min_tile_step=3 memastikan patch 3x3 hampir tidak tumpang tindih (data leakage = 0).
    """
    selected: list[Tuple[str, str, float, float, int, int]] = []
    half = grid_size // 2

    for kecamatan, category, lat, lng in candidates:
        cx, cy = latlng_to_tile_xy(lat, lng, zoom)
        sx, sy = cx - half, cy - half
        overlap = any(
            abs(sx - ox) < min_tile_step and abs(sy - oy) < min_tile_step
            for _, _, _, _, ox, oy in selected
        )
        if not overlap:
            selected.append((kecamatan, category, lat, lng, sx, sy))
    return selected


# Bounding box penuh Kota Bogor (+ margin koridor pinggiran)
BOGOR_FULL_BBOX = GeoBBox(min_lng=106.730, min_lat=-6.670, max_lng=106.855, max_lat=-6.520)
MS_BUILDINGS_LINKS_URL = (
    "https://minedbuildings.z5.web.core.windows.net/global-buildings/dataset-links.csv"
)


def _latlng_to_quadkey(lat: float, lng: float, zoom: int = 9) -> str:
    n = 2**zoom
    x = int((lng + 180.0) / 360.0 * n)
    rad = math.radians(lat)
    y = int((1.0 - math.log(math.tan(rad) + 1.0 / math.cos(rad)) / math.pi) / 2.0 * n)
    digits = []
    for i in range(zoom, 0, -1):
        d = 0
        mask = 1 << (i - 1)
        if x & mask:
            d += 1
        if y & mask:
            d += 2
        digits.append(str(d))
    return "".join(digits)


def _download_file_resumable(
    session: requests.Session,
    url: str,
    dest: Path,
    max_retries: int = 8,
) -> Path:
    """Unduh berkas besar langsung ke disk dengan dukungan HTTP Range resume otomatis."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")

    # Ambil total ukuran berkas (Content-Length) via HEAD
    total_size = 0
    try:
        head = session.head(url, timeout=30, allow_redirects=True)
        total_size = int(head.headers.get("Content-Length", 0))
    except Exception:
        pass

    if dest.exists() and (total_size == 0 or dest.stat().st_size == total_size):
        return dest

    for attempt in range(1, max_retries + 1):
        existing_bytes = tmp.stat().st_size if tmp.exists() else 0
        if total_size > 0 and existing_bytes >= total_size:
            tmp.replace(dest)
            return dest

        headers = {"Range": f"bytes={existing_bytes}-"} if existing_bytes > 0 else {}
        try:
            with session.get(url, headers=headers, timeout=60, stream=True) as resp:
                if resp.status_code == 416:
                    tmp.replace(dest)
                    return dest
                resp.raise_for_status()
                mode = "ab" if (existing_bytes > 0 and resp.status_code == 206) else "wb"
                if mode == "wb":
                    existing_bytes = 0
                with tmp.open(mode) as fh:
                    downloaded = existing_bytes
                    for chunk in resp.iter_content(chunk_size=1024 * 512):
                        if chunk:
                            fh.write(chunk)
                            downloaded += len(chunk)
                if total_size == 0 or downloaded >= total_size:
                    tmp.replace(dest)
                    return dest
        except Exception as exc:
            print(
                f"[Buildings Cache] Koneksi terputus (percobaan {attempt}/{max_retries}): {exc}. Melanjutkan resume...",
                flush=True,
            )
            time.sleep(2.0 * attempt)

    raise RuntimeError(f"Gagal menyelesaikan unduhan {url} setelah {max_retries} percobaan.")


def _fetch_microsoft_bogor_buildings(
    session: requests.Session,
    work_dir: Path,
) -> List[List[Tuple[float, float]]]:
    """
    Unduh poligon bangunan Kota Bogor dari Microsoft Global ML Building Footprints
    berdasarkan Bing QuadKey z=9 (Region Indonesia saja, unduh resumable ke disk dulu,
    lalu parse lokal agar super cepat & tidak pernah putus koneksi).
    """
    target_quadkeys = {
        _latlng_to_quadkey(lat, lng, 9)
        for lat in (BOGOR_FULL_BBOX.min_lat, BOGOR_FULL_BBOX.max_lat)
        for lng in (BOGOR_FULL_BBOX.min_lng, BOGOR_FULL_BBOX.max_lng)
    }
    print(
        f"[Buildings Cache] Mencari berkas Microsoft Building Footprints untuk QuadKey {sorted(target_quadkeys)}...",
        flush=True,
    )
    resp = session.get(MS_BUILDINGS_LINKS_URL, timeout=45)
    resp.raise_for_status()

    # Pilih 1 URL per QuadKey (utamakan Location=Indonesia agar tidak dobel unduh Asia+Indonesia)
    by_qk: dict[str, str] = {}
    reader = csv.DictReader(io.StringIO(resp.text))
    for row in reader:
        qk = (row.get("QuadKey") or "").strip()
        loc = (row.get("Location") or "").strip().lower()
        url = (row.get("Url") or "").strip()
        if qk in target_quadkeys and url:
            if qk not in by_qk or "indonesia" in loc or "regionname=indonesia" in url.lower():
                by_qk[qk] = url

    if not by_qk:
        raise RuntimeError(f"Tidak menemukan URL Microsoft Buildings untuk QuadKey {target_quadkeys}")

    rings: List[List[Tuple[float, float]]] = []
    min_lng, min_lat = BOGOR_FULL_BBOX.min_lng, BOGOR_FULL_BBOX.min_lat
    max_lng, max_lat = BOGOR_FULL_BBOX.max_lng, BOGOR_FULL_BBOX.max_lat

    for qk, url in sorted(by_qk.items()):
        gz_path = work_dir / f"ms_buildings_{qk}.csv.gz"
        print(f"[Buildings Cache] Mengunduh {url} -> {gz_path.name} ...", flush=True)
        _download_file_resumable(session, url, gz_path)
        size_mb = gz_path.stat().st_size / (1024 * 1024)
        print(f"[Buildings Cache] Selesai unduh ({size_mb:.1f} MB). Memfilter poligon Kota Bogor...", flush=True)

        with gzip.open(gz_path, "rt", encoding="utf-8", errors="ignore") as gz:
            for line in gz:
                # Filter string super cepat sebelum json.loads (hanya koordinat sekitar -6.5/-6.6 & 106.7/106.8)
                if "106.7" not in line and "106.8" not in line:
                    continue
                if "-6.5" not in line and "-6.6" not in line:
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

    return rings


def load_or_fetch_bogor_osm_buildings(
    cache_path: Path = Path("ml/data/osm_bogor_buildings.json"),
    grid_splits: int = 5,
) -> Tuple[List[List[Tuple[float, float]]], List[Polygon], STRtree]:
    """
    Muat atau unduh cache lokal poligon bangunan Kota Bogor (utama: Microsoft Global ML
    Building Footprints CDN statis, sangat cepat & lengkap tanpa rate-limit Overpass),
    lalu bangun indeks spasial Shapely STRtree untuk pengecekan instan (< 1 detik).
    """
    del grid_splits
    rings: List[List[Tuple[float, float]]] = []
    if cache_path.exists():
        raw_rings = json.loads(cache_path.read_text(encoding="utf-8"))
        rings = [[(float(lat), float(lng)) for lat, lng in ring] for ring in raw_rings]
    else:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        session = requests.Session()
        session.headers.update({"User-Agent": DEFAULT_USER_AGENT})
        rings = _fetch_microsoft_bogor_buildings(session, cache_path.parent)
        cache_path.write_text(json.dumps(rings), encoding="utf-8")
        print(
            f"[Buildings Cache] Tersimpan {len(rings)} poligon bangunan Kota Bogor di {cache_path}",
            flush=True,
        )

    # Bangun poligon Shapely (x=lng, y=lat) & indeks spasial STRtree
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

    tree = STRtree(geoms)
    return valid_rings, geoms, tree


def query_buildings_in_bbox(
    bbox: GeoBBox,
    rings: List[List[Tuple[float, float]]],
    geoms: List[Polygon],
    tree: STRtree,
    margin_deg: float = 0.0,
) -> List[List[Tuple[float, float]]]:
    """Ambil semua poligon bangunan (lat, lng) yang berpotongan dengan bbox secara instan."""
    query_box = box(
        bbox.min_lng - margin_deg,
        bbox.min_lat - margin_deg,
        bbox.max_lng + margin_deg,
        bbox.max_lat + margin_deg,
    )
    idxs = tree.query(query_box, predicate="intersects")
    return [rings[int(i)] for i in idxs]

