"""Visual diagnostic & confidence threshold analyzer untuk model ONNX SunSight."""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

ML_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_ROOT / "service"))

from app.config import Settings  # noqa: E402
from app.inference import OnnxRoofSegmenter  # noqa: E402


def main() -> None:
    model_path = sys.argv[1] if len(sys.argv) > 1 else "ml/service/weights/best.onnx"
    use_clahe = "--clahe" in sys.argv
    seg = OnnxRoofSegmenter(Settings(model_path=model_path, use_clahe_lab=use_clahe))
    seg.load()

    out = Path("ml/outputs/visual_check")
    out.mkdir(parents=True, exist_ok=True)
    test_imgs = sorted(Path("ml/data/sunsight_yolo11_seg/images/test").glob("*.jpg"))
    pos = [p for p in test_imgs if p.name.startswith("bogor_")][:3]
    neg = [p for p in test_imgs if p.name.startswith("hardneg_")]

    print("=== POSITIF (Sample 3 Test Tiles) ===")
    for p in pos:
        bgr = cv2.imread(str(p))
        dets = seg.predict(bgr, min_confidence=0.25)
        confs = [d["confidence"] for d in dets]
        print(
            f"{p.name}: {len(dets)} dets | max={max(confs, default=0):.3f} "
            f"| >=0.35: {sum(c >= 0.35 for c in confs)} | >=0.45: {sum(c >= 0.45 for c in confs)}"
        )
        vis = bgr.copy()
        for d in dets:
            pts = np.array(d["polygon"], dtype=np.int32)
            cv2.polylines(vis, [pts], True, (0, 255, 255), 2)
        cv2.imwrite(str(out / p.name), vis)

    print("\n=== HARD NEGATIVES (Semua 8 Test Hard Negatives) ===")
    for p in neg:
        bgr = cv2.imread(str(p))
        dets = seg.predict(bgr, min_confidence=0.25)
        confs = [d["confidence"] for d in dets]
        print(
            f"{p.name}: {len(dets)} dets | max={max(confs, default=0):.3f} "
            f"| >=0.35: {sum(c >= 0.35 for c in confs)} | >=0.45: {sum(c >= 0.45 for c in confs)}"
        )
        vis = bgr.copy()
        for d in dets:
            pts = np.array(d["polygon"], dtype=np.int32)
            cv2.polylines(vis, [pts], True, (0, 60, 255), 2)
            cv2.putText(
                vis,
                f"{d['confidence']:.2f}",
                (int(pts[0][0]), max(12, int(pts[0][1]))),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 255, 255),
                1,
            )
        cv2.imwrite(str(out / p.name), vis)


if __name__ == "__main__":
    main()
