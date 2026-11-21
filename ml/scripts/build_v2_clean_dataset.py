"""Purge 14 tile hard negative yang terdeteksi punya bangunan baru saat audit contact sheet."""

import json
import zipfile
from pathlib import Path
import subprocess
import sys

ROOT = Path("ml/data/hard_negatives_v2")
DROP_1BASED = {4, 13, 22, 23, 24, 25, 29, 32, 36, 38, 43, 49, 63, 64}

recs = json.loads((ROOT / "metadata.json").read_text(encoding="utf-8"))
kept = []
removed = 0
for idx, r in enumerate(recs, start=1):
    if idx in DROP_1BASED:
        (ROOT / "images" / r["filename"]).unlink(missing_ok=True)
        (ROOT / "labels" / f"{r['id']}.txt").unlink(missing_ok=True)
        removed += 1
    else:
        kept.append(r)

(ROOT / "metadata.json").write_text(json.dumps(kept, indent=2), encoding="utf-8")
print(f"Purged {removed} newly-built tiles. Remaining 100% pure hard negatives: {len(kept)}")

subprocess.run(
    [
        sys.executable,
        "ml/scripts/04_split_dataset.py",
        "--pos-images", "ml/data/raw_esri_bogor/images",
        "--pos-labels", "ml/data/raw_esri_bogor/labels_auto_aligned",
        "--pos-meta", "ml/data/raw_esri_bogor/metadata.json",
        "--neg-images", "ml/data/hard_negatives_v2/images",
        "--neg-labels", "ml/data/hard_negatives_v2/labels",
        "--neg-meta", "ml/data/hard_negatives_v2/metadata.json",
        "--out-dir", "ml/data/sunsight_yolo11_seg_v2_clean",
    ],
    check=True,
)

ds_root = Path("ml/data/sunsight_yolo11_seg_v2_clean")
out_zip = Path("ml/data/sunsight_yolo11_seg_v2_clean.zip")
with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zf:
    for p in sorted(ds_root.rglob("*")):
        if p.is_file():
            zf.write(p, p.relative_to(ds_root).as_posix())

print(f"Packaged clean v2 ZIP: {out_zip} ({out_zip.stat().st_size / 1e6:.1f} MB)")
