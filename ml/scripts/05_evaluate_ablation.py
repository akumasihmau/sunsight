"""
Stage 5: Evaluator Otomatis Uji Ablasi untuk Jurnal SINTA 4 (Tabel 1 & Tabel 2).

Menjalankan model ONNX yang sudah dilatih pada Test Set (`images/test` & `labels/test`)
untuk membandingkan 3 metode post-processing:
  1. `raw`              (mask kontur mentah / blobby)
  2. `douglas_peucker`  (penyederhanaan Douglas-Peucker saja)
  3. `orthogonal`       (Regularisasi Poligon Ortogonal + Filter Anti-Jalan)

Metrik yang otomatis dihitung dan disimpan ke CSV & Markdown:
  - Precision, Recall, F1 (IoU >= 0.50)
  - Hard-Negative / Road False Positive Rate (% gambar kosong yang terkena false positive)
  - Mean Polygon IoU
  - Rata-rata Jumlah Titik Sudut (Vertex)
  - Mean % Galat Luas (m^2) terhadap ground truth manual
  - Rata-rata Galat Jumlah Modul PLTS (550 Wp) & Kapasitas (kWp)

Contoh penggunaan:
    python ml/scripts/05_evaluate_ablation.py ^
      --model ml/service/weights/best.onnx ^
      --dataset-dir ml/data/sunsight_yolo11_seg ^
      --out-dir ml/outputs/ablation_report
"""

from __future__ import annotations

import argparse
import csv
import math
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import numpy as np
from shapely.geometry import Polygon
from tqdm import tqdm

# Izinkan import langsung dari ml/service/app
ROOT_ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_ML / "service"))

from app.config import Settings  # noqa: E402
from app.inference import OnnxRoofSegmenter  # noqa: E402
from app.postprocess import RegularizationMode  # noqa: E402

# Parameter fisik Kota Bogor z19 & panel surya standar SunSight (550 Wp, ~2.58 m^2, rasio pakai 0.65)
BOGOR_MPP_Z19 = 156543.03392 * math.cos(math.radians(-6.59)) / (2**19)  # ~0.2966 m/px
PANEL_AREA_SQM = 2.58
USABLE_ROOF_FACTOR = 0.65
PANEL_WP = 550.0


def load_gt_polygons(label_path: Path, width: int, height: int) -> List[Polygon]:
    if not label_path.exists():
        return []
    polys: List[Polygon] = []
    for raw in label_path.read_text(encoding="utf-8").splitlines():
        parts = raw.strip().split()
        if len(parts) < 7:
            continue
        coords = [float(v) for v in parts[1:]]
        pts = [(coords[i] * width, coords[i + 1] * height) for i in range(0, len(coords), 2)]
        poly = Polygon(pts)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if not poly.is_empty and poly.area > 1.0:
            polys.append(poly)
    return polys


def polygon_iou(a: Polygon, b: Polygon) -> float:
    inter = a.intersection(b).area
    if inter <= 0:
        return 0.0
    union = a.union(b).area
    return float(inter / union) if union > 0 else 0.0


def estimate_panels_and_kwp(area_sqm: float) -> Tuple[int, float]:
    n_panels = max(0, int(math.floor((area_sqm * USABLE_ROOF_FACTOR) / PANEL_AREA_SQM)))
    kwp = (n_panels * PANEL_WP) / 1000.0
    return n_panels, kwp


def evaluate_mode(
    segmenter: OnnxRoofSegmenter,
    image_paths: List[Path],
    labels_dir: Path,
    mode: RegularizationMode,
    conf: float,
    iou_match_thresh: float = 0.50,
) -> Dict[str, float | str]:
    tp = 0
    fp = 0
    fn = 0
    hard_neg_total = 0
    hard_neg_fp_images = 0
    hard_neg_fp_objects = 0

    matched_ious: List[float] = []
    vertex_counts: List[int] = []
    area_errors_pct: List[float] = []
    panel_errors: List[int] = []
    kwp_errors: List[float] = []

    sqm_per_px2 = BOGOR_MPP_Z19**2

    for img_path in tqdm(image_paths, desc=f"Evaluasi mode={mode}", leave=False):
        bgr = cv2.imread(str(img_path))
        if bgr is None:
            continue
        h, w = bgr.shape[:2]
        gt_polys = load_gt_polygons(labels_dir / f"{img_path.stem}.txt", w, h)
        dets = segmenter.predict(bgr, min_confidence=conf, regularization_mode=mode)

        pred_polys: List[Polygon] = []
        for det in dets:
            pts = det["polygon"]
            vertex_counts.append(len(pts))
            p = Polygon(pts)
            if not p.is_valid:
                p = p.buffer(0)
            if not p.is_empty and p.area > 1.0:
                pred_polys.append(p)

        # Evaluasi khusus gambar Hard Negative (0 GT bangunan)
        if len(gt_polys) == 0:
            hard_neg_total += 1
            if len(pred_polys) > 0:
                hard_neg_fp_images += 1
                hard_neg_fp_objects += len(pred_polys)
            fp += len(pred_polys)
            continue

        # Greedy bipartite matching berdasarkan IoU tertinggi
        used_gt: set[int] = set()
        for pred in pred_polys:
            best_iou = 0.0
            best_j = -1
            for j, gt in enumerate(gt_polys):
                if j in used_gt:
                    continue
                score = polygon_iou(pred, gt)
                if score > best_iou:
                    best_iou = score
                    best_j = j

            if best_iou >= iou_match_thresh and best_j >= 0:
                used_gt.add(best_j)
                tp += 1
                matched_ious.append(best_iou)

                gt_area_sqm = gt_polys[best_j].area * sqm_per_px2
                pred_area_sqm = pred.area * sqm_per_px2
                if gt_area_sqm > 1.0:
                    err_pct = abs(pred_area_sqm - gt_area_sqm) / gt_area_sqm * 100.0
                    area_errors_pct.append(err_pct)

                    gt_n, gt_kwp = estimate_panels_and_kwp(gt_area_sqm)
                    pr_n, pr_kwp = estimate_panels_and_kwp(pred_area_sqm)
                    panel_errors.append(abs(pr_n - gt_n))
                    kwp_errors.append(abs(pr_kwp - gt_kwp))
            else:
                fp += 1

        fn += len(gt_polys) - len(used_gt)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    hn_fpr = (hard_neg_fp_images / hard_neg_total * 100.0) if hard_neg_total > 0 else 0.0

    return {
        "mode": mode,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "mean_iou": round(float(np.mean(matched_ious)) if matched_ious else 0.0, 4),
        "avg_vertices": round(float(np.mean(vertex_counts)) if vertex_counts else 0.0, 2),
        "area_error_pct": round(float(np.mean(area_errors_pct)) if area_errors_pct else 0.0, 2),
        "mae_panels": round(float(np.mean(panel_errors)) if panel_errors else 0.0, 2),
        "mae_kwp": round(float(np.mean(kwp_errors)) if kwp_errors else 0.0, 3),
        "hardneg_fpr_pct": round(hn_fpr, 2),
        "hardneg_fp_objects": hard_neg_fp_objects,
        "tp": tp,
        "fp": fp,
        "fn": fn,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Uji ablasi otomatis untuk Tabel Jurnal SINTA 4.")
    parser.add_argument("--model", type=Path, required=True, help="Path bobot ONNX (.onnx).")
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path("ml/data/sunsight_yolo11_seg"),
        help="Folder dataset hasil Stage 4 (berisi images/test & labels/test).",
    )
    parser.add_argument("--split", type=str, default="test", choices=["val", "test"])
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--use-clahe", action="store_true", help="Aktifkan CLAHE LAB saat inferensi.")
    parser.add_argument("--out-dir", type=Path, default=Path("ml/outputs/ablation_report"))
    args = parser.parse_args()

    cfg = Settings(model_path=str(args.model), use_clahe_lab=args.use_clahe)
    segmenter = OnnxRoofSegmenter(cfg)
    segmenter.load()

    images_dir = args.dataset_dir / "images" / args.split
    labels_dir = args.dataset_dir / "labels" / args.split
    image_paths = sorted(
        p for p in images_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    if not image_paths:
        raise RuntimeError(f"Tidak ada citra di {images_dir}")

    modes: List[RegularizationMode] = ["raw", "douglas_peucker", "orthogonal"]
    rows = [evaluate_mode(segmenter, image_paths, labels_dir, m, args.conf) for m in modes]

    args.out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = args.out_dir / f"ablation_{args.split}.csv"
    md_path = args.out_dir / f"ablation_{args.split}.md"

    with csv_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    md_lines = [
        f"# Hasil Uji Ablasi Regularisasi Poligon SunSight (`{args.split}` split, {len(image_paths)} citra)\n",
        "| Mode Post-Processing | Precision | Recall | F1 | Mean IoU | Rata-rata Vertex | % Galat Luas (m²) | MAE Panel | MAE kWp | Road/HN FPR (%) |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]
    for r in rows:
        md_lines.append(
            f"| `{r['mode']}` | {r['precision']:.4f} | {r['recall']:.4f} | {r['f1_score']:.4f} | "
            f"{r['mean_iou']:.4f} | {r['avg_vertices']:.2f} | {r['area_error_pct']:.2f}% | "
            f"{r['mae_panels']:.2f} | {r['mae_kwp']:.3f} | {r['hardneg_fpr_pct']:.2f}% |"
        )
    md_text = "\n".join(md_lines) + "\n"
    md_path.write_text(md_text, encoding="utf-8")

    print("\n" + md_text)
    print(f"Laporan disimpan ke:\n  - {csv_path}\n  - {md_path}")


if __name__ == "__main__":
    main()
