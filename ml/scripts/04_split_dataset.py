"""
Stage 4: Stratified Dataset Splitter (Train / Val / Test) + Validator YOLO-Seg.

Menggabungkan:
  - Tile positif Esri Kota Bogor (berlabel poligon hasil SAM 2 / QC manual / OSM)
  - Tile Hard Negative (berlabel .txt kosong)
menjadi struktur standar Ultralytics YOLO-Seg (`images/{train,val,test}`,
`labels/{train,val,test}`, `dataset.yaml`) dengan stratifikasi seimbang
per kecamatan dan per kategori hard negative, serta memvalidasi integritas label.

Contoh penggunaan:
    python ml/scripts/04_split_dataset.py ^
      --pos-images ml/data/raw_esri_bogor/images ^
      --pos-labels ml/data/raw_esri_bogor/labels_sam2_verified ^
      --pos-meta   ml/data/raw_esri_bogor/metadata.json ^
      --neg-images ml/data/hard_negatives/images ^
      --neg-labels ml/data/hard_negatives/labels ^
      --neg-meta   ml/data/hard_negatives/metadata.json ^
      --out-dir    ml/data/sunsight_yolo11_seg
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import yaml


@dataclass
class SampleItem:
    sample_id: str
    image_path: Path
    label_path: Path
    stratum: str
    is_hard_negative: bool
    polygon_count: int


def validate_yolo_seg_label(label_path: Path, allow_empty: bool) -> Tuple[bool, int, str]:
    """Validasi sintaks file YOLO-Seg (`class_id x1 y1 x2 y2 x3 y3 ...` dalam [0, 1])."""
    if not label_path.exists():
        return False, 0, "file label tidak ada"

    lines = [ln.strip() for ln in label_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    if not lines:
        if allow_empty:
            return True, 0, "ok (hard negative kosong)"
        return False, 0, "label kosong pada citra positif"

    for idx, line in enumerate(lines, start=1):
        parts = line.split()
        if len(parts) < 7 or (len(parts) - 1) % 2 != 0:
            return False, 0, f"baris {idx}: jumlah koordinat tidak valid ({len(parts)} token)"
        if parts[0] != "0":
            return False, 0, f"baris {idx}: class_id harus 0 (roof), ditemukan {parts[0]}"
        try:
            coords = [float(v) for v in parts[1:]]
        except ValueError:
            return False, 0, f"baris {idx}: nilai non-numerik"
        if any(c < -0.001 or c > 1.001 for c in coords):
            return False, 0, f"baris {idx}: koordinat di luar rentang [0, 1]"

    return True, len(lines), "ok"


def collect_samples(
    images_dir: Path,
    labels_dir: Path,
    meta_path: Path | None,
    is_hard_negative: bool,
) -> Tuple[List[SampleItem], List[str]]:
    meta_map: Dict[str, dict] = {}
    if meta_path and meta_path.exists():
        for rec in json.loads(meta_path.read_text(encoding="utf-8")):
            meta_map[rec["id"]] = rec

    samples: List[SampleItem] = []
    warnings: List[str] = []

    if not images_dir.exists():
        return samples, [f"Folder gambar tidak ditemukan: {images_dir}"]

    image_files = sorted(
        p for p in images_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    for img_path in image_files:
        sid = img_path.stem
        lbl_path = labels_dir / f"{sid}.txt"
        ok, poly_count, reason = validate_yolo_seg_label(lbl_path, allow_empty=is_hard_negative)
        if not ok:
            warnings.append(f"Lewati {img_path.name}: {reason}")
            continue
        if is_hard_negative and poly_count > 0:
            warnings.append(f"Lewati hard negative {img_path.name}: label tidak kosong ({poly_count} poligon)")
            continue

        rec = meta_map.get(sid, {})
        stratum = (
            f"hardneg::{rec.get('category', 'general')}"
            if is_hard_negative
            else f"pos::{rec.get('kecamatan', 'bogor')}"
        )
        samples.append(
            SampleItem(
                sample_id=sid,
                image_path=img_path,
                label_path=lbl_path,
                stratum=stratum,
                is_hard_negative=is_hard_negative,
                polygon_count=poly_count,
            )
        )

    return samples, warnings


def stratified_split(
    samples: List[SampleItem],
    train_ratio: float,
    val_ratio: float,
    seed: int,
) -> Dict[str, List[SampleItem]]:
    rng = random.Random(seed)
    by_stratum: Dict[str, List[SampleItem]] = {}
    for s in samples:
        by_stratum.setdefault(s.stratum, []).append(s)

    splits: Dict[str, List[SampleItem]] = {"train": [], "val": [], "test": []}
    for stratum, items in sorted(by_stratum.items()):
        rng.shuffle(items)
        n = len(items)
        n_test = max(1, int(round(n * (1.0 - train_ratio - val_ratio)))) if n >= 5 else 0
        n_val = max(1, int(round(n * val_ratio))) if n >= 3 else 0
        n_train = max(0, n - n_val - n_test)

        splits["train"].extend(items[:n_train])
        splits["val"].extend(items[n_train : n_train + n_val])
        splits["test"].extend(items[n_train + n_val :])

    return splits


def main() -> None:
    parser = argparse.ArgumentParser(description="Split terstratifikasi dataset YOLO-Seg SunSight.")
    parser.add_argument("--pos-images", type=Path, default=Path("ml/data/raw_esri_bogor/images"))
    parser.add_argument(
        "--pos-labels",
        type=Path,
        default=Path("ml/data/raw_esri_bogor/labels_sam2_verified"),
    )
    parser.add_argument("--pos-meta", type=Path, default=Path("ml/data/raw_esri_bogor/metadata.json"))
    parser.add_argument("--neg-images", type=Path, default=Path("ml/data/hard_negatives/images"))
    parser.add_argument("--neg-labels", type=Path, default=Path("ml/data/hard_negatives/labels"))
    parser.add_argument("--neg-meta", type=Path, default=Path("ml/data/hard_negatives/metadata.json"))
    parser.add_argument("--out-dir", type=Path, default=Path("ml/data/sunsight_yolo11_seg"))
    parser.add_argument("--train-ratio", type=float, default=0.75)
    parser.add_argument("--val-ratio", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    pos_samples, pos_warns = collect_samples(
        args.pos_images, args.pos_labels, args.pos_meta, is_hard_negative=False
    )
    neg_samples, neg_warns = collect_samples(
        args.neg_images, args.neg_labels, args.neg_meta, is_hard_negative=True
    )

    for w in pos_warns[:15] + neg_warns[:15]:
        print(f"[WARN] {w}")
    if len(pos_warns) + len(neg_warns) > 30:
        print(f"[WARN] ... dan {len(pos_warns) + len(neg_warns) - 30} peringatan lainnya.")

    all_samples = pos_samples + neg_samples
    if not all_samples:
        raise RuntimeError("Tidak ada sampel valid yang ditemukan untuk di-split.")

    splits = stratified_split(all_samples, args.train_ratio, args.val_ratio, args.seed)

    if args.out_dir.exists():
        shutil.rmtree(args.out_dir)

    manifest: Dict[str, List[dict]] = {}
    for split_name, items in splits.items():
        img_out = args.out_dir / "images" / split_name
        lbl_out = args.out_dir / "labels" / split_name
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        manifest[split_name] = []
        for item in items:
            shutil.copy2(item.image_path, img_out / item.image_path.name)
            shutil.copy2(item.label_path, lbl_out / item.label_path.name)
            manifest[split_name].append(
                {
                    "id": item.sample_id,
                    "stratum": item.stratum,
                    "is_hard_negative": item.is_hard_negative,
                    "polygons": item.polygon_count,
                }
            )

    dataset_yaml = {
        "path": ".",
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {0: "roof"},
    }
    (args.out_dir / "dataset.yaml").write_text(
        yaml.safe_dump(dataset_yaml, sort_keys=False), encoding="utf-8"
    )
    (args.out_dir / "split_manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    print("\n=== Ringkasan Dataset YOLO-Seg SunSight ===")
    total_pos = len(pos_samples)
    total_neg = len(neg_samples)
    neg_pct = (total_neg / max(1, total_pos + total_neg)) * 100.0
    print(f"Total Positif      : {total_pos} citra ({sum(s.polygon_count for s in pos_samples)} poligon atap)")
    print(f"Total Hard Negative: {total_neg} citra ({neg_pct:.1f}% dari total)")
    for split_name, items in splits.items():
        n_pos = sum(1 for s in items if not s.is_hard_negative)
        n_neg = sum(1 for s in items if s.is_hard_negative)
        print(f"  - {split_name:<5}: {len(items):>3} citra ({n_pos} positif, {n_neg} hard negative)")
    print(f"\nDataset siap di: {args.out_dir}")
    print("Siap di-zip untuk diunggah ke Google Colab / Kaggle GPU atau Roboflow!")


if __name__ == "__main__":
    main()
