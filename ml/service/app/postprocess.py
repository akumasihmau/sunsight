"""
Pipeline Post-Processing 'Anti-Blobby' & Filter Anti-Jalan SunSight.

Implementasi spesifikasi CLAUDE.md Bagian 4.C.4:
  1. Pembersihan mask morfologis (MORPH_CLOSE lalu MORPH_OPEN, kernel 3x3).
  2. Filter geometri anti-jalan & noise (minAreaRect aspect_ratio > 4.5 atau area < 200 px^2).
  3. Regularisasi poligon:
     - rectangularity >= 0.80 -> snap ke 4 sudut 90 derajat (cv2.boxPoints).
     - 0.55 <= rectangularity < 0.80 -> approxPolyDP + orthogonal edge snapping ke sudut dominan.
     - < 0.55 -> approxPolyDP rapi.
  4. Hitung ulang area_px (Shoelace) dan bbox (x1, y1, x2, y2) dari poligon final.

Modul ini juga dipakai langsung oleh script uji ablasi Jurnal SINTA 4
(`ml/scripts/05_evaluate_ablation.py`) agar metode produksi & paper 100% identik.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Literal, Optional, Tuple

import cv2
import numpy as np

RegularizationMode = Literal["raw", "douglas_peucker", "orthogonal"]


@dataclass
class RegularizedPolygon:
    points: List[List[float]]
    bbox: dict[str, float]
    area_px: float
    rectangularity: float
    aspect_ratio: float
    strategy: str


def apply_clahe_lab(bgr_image: np.ndarray, clip_limit: float = 2.0, tile_grid: int = 8) -> np.ndarray:
    """Normalisasi luminansi adaptif CLAHE pada kanal L ruang warna CIE-LAB."""
    lab = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_grid, tile_grid))
    l_eq = clahe.apply(l_chan)
    merged = cv2.merge((l_eq, a_chan, b_chan))
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def shoelace_area(points: List[List[float]]) -> float:
    """Luas poligon 2D (piksel^2) menggunakan rumus Shoelace."""
    n = len(points)
    if n < 3:
        return 0.0
    acc = 0.0
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        acc += x1 * y2 - x2 * y1
    return abs(acc) * 0.5


def compute_bbox(points: List[List[float]]) -> dict[str, float]:
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return {
        "x1": round(float(min(xs)), 2),
        "y1": round(float(min(ys)), 2),
        "x2": round(float(max(xs)), 2),
        "y2": round(float(max(ys)), 2),
    }


def _dedupe_consecutive(pts: np.ndarray, tol: float = 1.0) -> np.ndarray:
    if len(pts) < 3:
        return pts
    cleaned = [pts[0]]
    for pt in pts[1:]:
        if float(np.linalg.norm(pt - cleaned[-1])) >= tol:
            cleaned.append(pt)
    if len(cleaned) >= 2 and float(np.linalg.norm(cleaned[0] - cleaned[-1])) < tol:
        cleaned.pop()
    return np.array(cleaned, dtype=np.float32)


def _remove_collinear(pts: np.ndarray, angle_tol_deg: float = 8.0) -> np.ndarray:
    """Hapus titik sudut berlebih yang hampir segaris (180 derajat)."""
    if len(pts) <= 4:
        return pts
    keep: List[np.ndarray] = []
    n = len(pts)
    cos_thresh = math.cos(math.radians(angle_tol_deg))
    for i in range(n):
        prev_pt = pts[(i - 1) % n]
        curr_pt = pts[i]
        next_pt = pts[(i + 1) % n]
        v1 = curr_pt - prev_pt
        v2 = next_pt - curr_pt
        n1 = float(np.linalg.norm(v1))
        n2 = float(np.linalg.norm(v2))
        if n1 < 1e-3 or n2 < 1e-3:
            continue
        cos_a = float(np.dot(v1, v2) / (n1 * n2))
        if cos_a < cos_thresh:
            keep.append(curr_pt)
    return np.array(keep, dtype=np.float32) if len(keep) >= 3 else pts


def _dominant_edge_angle_deg(pts: np.ndarray) -> float:
    """
    Hitung sudut orientasi dominan (modulo 90 derajat) berdasarkan bobot panjang
    seluruh sisi poligon (jauh lebih akurat daripada sudut minAreaRect untuk atap L/U/kompleks).
    """
    if len(pts) < 3:
        return 0.0
    cos4_sum = 0.0
    sin4_sum = 0.0
    n = len(pts)
    for i in range(n):
        v = pts[(i + 1) % n] - pts[i]
        length = float(np.linalg.norm(v))
        if length < 3.0:
            continue
        ang = math.atan2(float(v[1]), float(v[0]))
        # 4*theta memetakan orientasi 0, 90, 180, 270 deg ke vektor yang sama!
        weight = length * length
        cos4_sum += weight * math.cos(4.0 * ang)
        sin4_sum += weight * math.sin(4.0 * ang)
    if abs(cos4_sum) < 1e-6 and abs(sin4_sum) < 1e-6:
        return 0.0
    return math.degrees(0.25 * math.atan2(sin4_sum, cos4_sum))


def _polygon_mask_iou(pts: np.ndarray, orig_mask_u8: np.ndarray) -> float:
    """Hitung IoU tepat antara poligon kandidat dengan mask biner asli."""
    h, w = orig_mask_u8.shape[:2]
    cand = np.zeros((h, w), dtype=np.uint8)
    poly_i32 = np.round(pts).astype(np.int32)
    if len(poly_i32) < 3:
        return 0.0
    cv2.fillPoly(cand, [poly_i32], 255)
    inter = int(np.count_nonzero((cand > 0) & (orig_mask_u8 > 0)))
    union = int(np.count_nonzero((cand > 0) | (orig_mask_u8 > 0)))
    return float(inter / union) if union > 0 else 0.0


def orthogonal_edge_snap(
    pts: np.ndarray,
    center: Tuple[float, float],
    angle_deg: float,
) -> np.ndarray:
    """
    Lakukan orthogonal edge snapping pada poligon kompleks (bentuk L/T/U):
    1. Putar poligon ke kerangka orientasi dominan atap (-angle_deg).
    2. Setiap tepi diklasifikasikan sebagai horizontal (0 deg) atau vertikal (90 deg),
       lalu koordinat garisnya dirata-ratakan sehingga setiap sudut bertemu tegak lurus 90 deg.
    3. Putar kembali ke ruang piksel asli citra.
    """
    if len(pts) < 4:
        return pts

    cx, cy = center
    theta = math.radians(angle_deg)
    c, s = math.cos(theta), math.sin(theta)
    rot_fwd = np.array([[c, s], [-s, c]], dtype=np.float32)
    rot_inv = np.array([[c, -s], [s, c]], dtype=np.float32)

    local = (pts - np.array([cx, cy], dtype=np.float32)) @ rot_fwd.T
    n = len(local)

    # Tentukan orientasi setiap sisi (H = horizontal, V = vertikal)
    edge_dirs: List[str] = []
    edge_vals: List[float] = []
    for i in range(n):
        p1 = local[i]
        p2 = local[(i + 1) % n]
        dx = abs(float(p2[0] - p1[0]))
        dy = abs(float(p2[1] - p1[1]))
        if dx >= dy:
            edge_dirs.append("H")
            edge_vals.append(float(0.5 * (p1[1] + p2[1])))
        else:
            edge_dirs.append("V")
            edge_vals.append(float(0.5 * (p1[0] + p2[0])))

    # Gabungkan sisi berurutan yang berorientasi sama (mengurangi tangga mikro)
    merged_edges: List[Tuple[str, float]] = []
    for d, v in zip(edge_dirs, edge_vals):
        if merged_edges and merged_edges[-1][0] == d:
            prev_d, prev_v = merged_edges[-1]
            merged_edges[-1] = (prev_d, 0.5 * (prev_v + v))
        else:
            merged_edges.append((d, v))

    if len(merged_edges) >= 2 and merged_edges[0][0] == merged_edges[-1][0]:
        d0, v0 = merged_edges[0]
        _, vn = merged_edges.pop()
        merged_edges[0] = (d0, 0.5 * (v0 + vn))

    # Minimal butuh 4 sisi bergantian H/V untuk membentuk poligon ortogonal tertutup
    if len(merged_edges) < 4 or len(merged_edges) % 2 != 0:
        return pts

    # Hitung titik potong antar sisi H dan V yang bersebelahan
    snapped_local: List[List[float]] = []
    m = len(merged_edges)
    for i in range(m):
        d1, v1 = merged_edges[i]
        d2, v2 = merged_edges[(i + 1) % m]
        if d1 == "H" and d2 == "V":
            snapped_local.append([v2, v1])
        elif d1 == "V" and d2 == "H":
            snapped_local.append([v1, v2])
        else:
            return pts

    snapped_arr = np.array(snapped_local, dtype=np.float32)
    world = (snapped_arr @ rot_inv.T) + np.array([cx, cy], dtype=np.float32)
    world = _dedupe_consecutive(world, tol=1.5)
    world = _remove_collinear(world)
    return world if len(world) >= 3 else pts


def regularize_binary_mask(
    binary_mask: np.ndarray,
    image_width: int,
    image_height: int,
    mode: RegularizationMode = "orthogonal",
    min_area_px: float = 140.0,
    max_aspect_ratio: float = 4.5,
    rectangularity_snap_threshold: float = 0.80,
    orthogonal_min_rectangularity: float = 0.55,
    approx_epsilon_ratio: float = 0.015,
) -> Optional[RegularizedPolygon]:
    """
    Konversi satu mask biner (0/255) menjadi poligon atap ter-regularisasi.
    Mengembalikan None bila kandidat adalah noise atau ruas jalan memanjang.
    """
    mask_u8 = (binary_mask > 0).astype(np.uint8) * 255

    if mode != "raw":
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        mask_u8 = cv2.morphologyEx(mask_u8, cv2.MORPH_CLOSE, kernel)
        mask_u8 = cv2.morphologyEx(mask_u8, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    contour = max(contours, key=cv2.contourArea)
    contour_area = float(cv2.contourArea(contour))
    if contour_area < min_area_px:
        return None

    rect = cv2.minAreaRect(contour)
    (rcx, rcy), (rw, rh), rangle = rect
    min_side = min(rw, rh)
    max_side = max(rw, rh)
    if min_side <= 0.0:
        return None

    aspect_ratio = float(max_side / min_side)
    # Filter geometri anti-jalan (hanya aktif pada mode non-raw atau selalu aman menjaga batas wajar)
    if mode != "raw" and aspect_ratio > max_aspect_ratio:
        return None

    rect_area = float(rw * rh)
    rectangularity = contour_area / rect_area if rect_area > 0 else 0.0
    perimeter = float(cv2.arcLength(contour, True))

    if mode == "raw":
        pts = contour.reshape(-1, 2).astype(np.float32)
        strategy = "raw_contour"
    elif mode == "douglas_peucker":
        eps = approx_epsilon_ratio * perimeter
        approx = cv2.approxPolyDP(contour, eps, True).reshape(-1, 2).astype(np.float32)
        pts = approx if len(approx) >= 3 else contour.reshape(-1, 2).astype(np.float32)
        strategy = "douglas_peucker"
    else:
        # Mode produksi: Orthogonal Architectural Regularization (Area-Preserving)
        # - Atap kecil/sedang (<= 3500 px^2): tegas snap 4 sudut 90 deg (anti-blobby di permukiman padat!)
        # - Atap besar/kompleks (> 3500 px^2, mis. mall/kampus/villa): pakai IoU gate >= 0.85 agar bentuk L/U tetap akurat
        is_large_complex = contour_area > 3500.0
        if rectangularity >= rectangularity_snap_threshold:
            raw_box = cv2.boxPoints(rect).astype(np.float32)
            area_scale = max(0.88, min(1.0, math.sqrt(max(0.01, contour_area / rect_area))))
            center = np.array([rcx, rcy], dtype=np.float32)
            cand_box = center + (raw_box - center) * area_scale
            if (not is_large_complex) or (_polygon_mask_iou(cand_box, mask_u8) >= 0.85):
                pts = cand_box
                strategy = "min_area_rect_90deg"
            else:
                eps = min(approx_epsilon_ratio, 0.010) * perimeter
                approx = cv2.approxPolyDP(contour, eps, True).reshape(-1, 2).astype(np.float32)
                pts = _remove_collinear(approx) if len(approx) >= 3 else cand_box
                strategy = "approx_poly_complex"
        elif rectangularity >= orthogonal_min_rectangularity:
            eps = min(approx_epsilon_ratio, 0.012 if not is_large_complex else 0.010) * perimeter
            approx = cv2.approxPolyDP(contour, eps, True).reshape(-1, 2).astype(np.float32)
            approx = _remove_collinear(approx) if len(approx) >= 3 else approx
            dom_angle = _dominant_edge_angle_deg(approx)
            snapped = orthogonal_edge_snap(approx, (rcx, rcy), dom_angle)
            snapped_area = shoelace_area(snapped.tolist())
            iou_gate = 0.86 if is_large_complex else 0.78
            if (
                0.70 * contour_area <= snapped_area <= 1.30 * contour_area
                and _polygon_mask_iou(snapped, mask_u8) >= iou_gate
            ):
                if snapped_area > 1.0:
                    s_scale = max(0.92, min(1.08, math.sqrt(contour_area / snapped_area)))
                    c_snap = snapped.mean(axis=0)
                    snapped = c_snap + (snapped - c_snap) * s_scale
                pts = snapped
                strategy = "orthogonal_snap"
            else:
                pts = approx if len(approx) >= 3 else contour.reshape(-1, 2).astype(np.float32)
                strategy = "approx_poly_complex"
        else:
            eps = min(approx_epsilon_ratio, 0.009) * perimeter
            approx = cv2.approxPolyDP(contour, eps, True).reshape(-1, 2).astype(np.float32)
            pts = _remove_collinear(approx) if len(approx) >= 3 else contour.reshape(-1, 2).astype(np.float32)
            strategy = "approx_poly_complex"

    # Clamp ke batas citra [0, W-1] x [0, H-1]
    pts[:, 0] = np.clip(pts[:, 0], 0.0, float(image_width - 1))
    pts[:, 1] = np.clip(pts[:, 1], 0.0, float(image_height - 1))
    pts = _dedupe_consecutive(pts, tol=0.5)
    if len(pts) < 3:
        return None

    points_list = [[round(float(x), 2), round(float(y), 2)] for x, y in pts]
    final_area = round(shoelace_area(points_list), 2)
    if final_area < min_area_px * 0.5:
        return None

    return RegularizedPolygon(
        points=points_list,
        bbox=compute_bbox(points_list),
        area_px=final_area,
        rectangularity=round(float(rectangularity), 4),
        aspect_ratio=round(float(aspect_ratio), 3),
        strategy=strategy,
    )
