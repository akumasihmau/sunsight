"""
Mesin inferensi ONNX Runtime CPU-only untuk YOLO11-Seg / YOLOv8-Seg SunSight.

Menghindari dependensi PyTorch CUDA multi-GB di server produksi sehingga
container Docker tetap ringan (~400-500 MB) dan cepat di CPU (AWS EC2 / HF Spaces).
"""

from __future__ import annotations

import logging
import uuid
from pathlib import Path
from typing import Any, List, Optional, Tuple

import cv2
import numpy as np
import onnxruntime as ort
from shapely.geometry import Polygon as ShapelyPolygon

from .config import Settings
from .postprocess import RegularizationMode, apply_clahe_lab, regularize_binary_mask

logger = logging.getLogger(__name__)


def letterbox(
    image: np.ndarray,
    new_shape: int = 1280,
    color: Tuple[int, int, int] = (114, 114, 114),
) -> Tuple[np.ndarray, float, Tuple[float, float]]:
    """Resize citra dengan menjaga rasio aspek + padding simetris (standar Ultralytics)."""
    h, w = image.shape[:2]
    scale = min(new_shape / h, new_shape / w)
    new_w, new_h = int(round(w * scale)), int(round(h * scale))
    pad_w = (new_shape - new_w) / 2.0
    pad_h = (new_shape - new_h) / 2.0

    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    top, bottom = int(round(pad_h - 0.1)), int(round(pad_h + 0.1))
    left, right = int(round(pad_w - 0.1)), int(round(pad_w + 0.1))
    padded = cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
    return padded, scale, (pad_w, pad_h)


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -60.0, 60.0)))


class OnnxRoofSegmenter:
    """Wrapper ONNX Runtime untuk model segmentasi atap 1 kelas (`roof`)."""

    def __init__(self, cfg: Settings) -> None:
        self.cfg = cfg
        self.session: Optional[ort.InferenceSession] = None
        self.input_name: str = ""
        self.input_size: int = cfg.model_image_size
        self.class_names: dict[int, str] = {0: "roof"}

    @property
    def is_loaded(self) -> bool:
        return self.session is not None

    def load(self) -> None:
        model_file = Path(self.cfg.model_path)
        if not model_file.is_absolute() and not model_file.exists():
            candidate = Path(__file__).resolve().parents[1] / model_file
            if candidate.exists():
                model_file = candidate
        if not model_file.exists():
            raise FileNotFoundError(
                f"Berkas bobot ONNX tidak ditemukan di '{model_file.resolve()}'. "
                "Ekspor bobot YOLO11s-Seg ke ONNX lalu set MODEL_PATH."
            )

        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        self.session = ort.InferenceSession(
            str(model_file),
            sess_options=opts,
            providers=["CPUExecutionProvider"],
        )
        inp = self.session.get_inputs()[0]
        self.input_name = inp.name
        if len(inp.shape) == 4 and isinstance(inp.shape[2], int) and inp.shape[2] > 0:
            self.input_size = int(inp.shape[2])

        # Warm-up singkat agar permintaan pertama ke Laravel tidak timeout
        dummy = np.zeros((1, 3, self.input_size, self.input_size), dtype=np.float32)
        self.session.run(None, {self.input_name: dummy})
        logger.info(
            "Model ONNX berhasil dimuat: %s (imgsz=%d)",
            model_file,
            self.input_size,
        )

    def predict(
        self,
        bgr_image: np.ndarray,
        min_confidence: Optional[float] = None,
        roi: Optional[Tuple[int, int, int, int]] = None,
        regularization_mode: RegularizationMode = "orthogonal",
    ) -> List[dict[str, Any]]:
        if not self.session:
            raise RuntimeError("Model ONNX belum dimuat.")

        orig_h, orig_w = bgr_image.shape[:2]
        conf_thresh = float(
            min_confidence if min_confidence is not None else self.cfg.model_confidence
        )

        work_img = apply_clahe_lab(bgr_image) if self.cfg.use_clahe_lab else bgr_image
        padded, scale, (pad_w, pad_h) = letterbox(work_img, self.input_size)

        rgb = cv2.cvtColor(padded, cv2.COLOR_BGR2RGB)
        blob = np.transpose(rgb.astype(np.float32) / 255.0, (2, 0, 1))[None, ...]

        outputs = self.session.run(None, {self.input_name: blob})
        if len(outputs) < 2:
            raise RuntimeError(
                "Output ONNX tidak berisi tensor prototipe mask (pastikan model YOLO-Seg, bukan YOLO-Det)."
            )

        # output0: (1, 4 + nc + 32, num_anchors) -> transpose ke (num_anchors, 4 + nc + 32)
        pred = outputs[0][0].T
        protos = outputs[1][0]  # (32, mask_h, mask_w)
        num_masks, mask_h, mask_w = protos.shape
        num_classes = pred.shape[1] - 4 - num_masks
        if num_classes < 1:
            raise RuntimeError(f"Dimensi output ONNX tidak valid: {outputs[0].shape}")

        boxes_xywh = pred[:, :4]
        class_scores = pred[:, 4 : 4 + num_classes]
        mask_coeffs = pred[:, 4 + num_classes :]

        class_ids = np.argmax(class_scores, axis=1)
        confidences = class_scores[np.arange(len(pred)), class_ids]

        keep = confidences >= conf_thresh
        if not np.any(keep):
            return []

        boxes_xywh = boxes_xywh[keep]
        confidences = confidences[keep]
        class_ids = class_ids[keep]
        mask_coeffs = mask_coeffs[keep]

        # Konversi cx,cy,w,h (ruang letterbox) -> x1,y1,w,h untuk cv2.dnn.NMSBoxes
        x1 = boxes_xywh[:, 0] - boxes_xywh[:, 2] * 0.5
        y1 = boxes_xywh[:, 1] - boxes_xywh[:, 3] * 0.5
        w = boxes_xywh[:, 2]
        h = boxes_xywh[:, 3]
        nms_boxes = np.stack([x1, y1, w, h], axis=1).tolist()

        indices = cv2.dnn.NMSBoxes(
            nms_boxes,
            confidences.tolist(),
            conf_thresh,
            self.cfg.model_iou_threshold,
        )
        if len(indices) == 0:
            return []

        selected_idx = np.array(indices).reshape(-1)
        protos_flat = protos.reshape(num_masks, -1)  # (32, mask_h * mask_w)

        # Hitung batas konten citra asli di dalam ruang prototipe mask
        gain_x = mask_w / float(self.input_size)
        gain_y = mask_h / float(self.input_size)
        mx1_pad = int(round(pad_w * gain_x))
        my1_pad = int(round(pad_h * gain_y))
        mx2_pad = int(round((self.input_size - pad_w) * gain_x))
        my2_pad = int(round((self.input_size - pad_h) * gain_y))

        detections: List[dict[str, Any]] = []
        for idx in selected_idx:
            score = float(confidences[idx])
            cid = int(class_ids[idx])

            # Proyeksikan bbox dari ruang letterbox ke piksel citra penuh asli
            bx1 = max(0.0, min(float(orig_w - 1), (x1[idx] - pad_w) / scale))
            by1 = max(0.0, min(float(orig_h - 1), (y1[idx] - pad_h) / scale))
            bx2 = max(0.0, min(float(orig_w - 1), (x1[idx] + w[idx] - pad_w) / scale))
            by2 = max(0.0, min(float(orig_h - 1), (y1[idx] + h[idx] - pad_h) / scale))

            # Penyaringan ROI kasar berdasarkan titik tengah bbox (sesuai docs/ml-service-design.md)
            if roi is not None:
                rx1, ry1, rx2, ry2 = roi
                cx = 0.5 * (bx1 + bx2)
                cy = 0.5 * (by1 + by2)
                if not (rx1 <= cx <= rx2 and ry1 <= cy <= ry2):
                    continue

            # Dekode mask instans dari kombinasi linear prototipe
            raw_mask = _sigmoid(mask_coeffs[idx] @ protos_flat).reshape(mask_h, mask_w)
            cropped_proto = raw_mask[
                max(0, my1_pad) : min(mask_h, max(my1_pad + 1, my2_pad)),
                max(0, mx1_pad) : min(mask_w, max(mx1_pad + 1, mx2_pad)),
            ]
            full_mask = cv2.resize(cropped_proto, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)

            # Margin proporsional (6% sisi terbesar, min 4 px) agar bangunan luas/miring
            # (mall/kampus) tidak pernah terpotong dinding bbox lurus horizontal/vertikal
            bin_mask = np.zeros((orig_h, orig_w), dtype=np.uint8)
            pad_clip = max(4, int(round(0.06 * max(bx2 - bx1, by2 - by1))))
            ix1 = max(0, int(np.floor(bx1)) - pad_clip)
            iy1 = max(0, int(np.floor(by1)) - pad_clip)
            ix2 = min(orig_w, int(np.ceil(bx2)) + pad_clip)
            iy2 = min(orig_h, int(np.ceil(by2)) + pad_clip)
            bin_mask[iy1:iy2, ix1:ix2] = (full_mask[iy1:iy2, ix1:ix2] >= 0.55).astype(np.uint8) * 255

            # Untuk bangunan besar (> 4500 px^2, mis. mall/kampus/villa besar), naikkan ambang
            # snap persegi ke 0.90 agar bentuk majemuk (L/U/sayap) tetap memeluk atap aslinya
            approx_px_area = float(np.count_nonzero(bin_mask))
            rect_thresh = (
                max(self.cfg.rectangularity_snap_threshold, 0.90)
                if approx_px_area > 4500.0
                else self.cfg.rectangularity_snap_threshold
            )

            reg = regularize_binary_mask(
                binary_mask=bin_mask,
                image_width=orig_w,
                image_height=orig_h,
                mode=regularization_mode,
                min_area_px=self.cfg.min_contour_area_px,
                max_aspect_ratio=self.cfg.max_aspect_ratio,
                rectangularity_snap_threshold=rect_thresh,
                orthogonal_min_rectangularity=self.cfg.orthogonal_min_rectangularity,
                approx_epsilon_ratio=self.cfg.approx_epsilon_ratio,
            )
            if reg is None:
                continue

            detections.append(
                {
                    "id": f"det_{uuid.uuid4().hex[:8]}",
                    "class_id": cid,
                    "class_name": self.class_names.get(cid, "roof"),
                    "confidence": round(score, 4),
                    "bbox": reg.bbox,
                    "polygon": reg.points,
                    "area_px": reg.area_px,
                }
            )

        detections.sort(key=lambda d: d["confidence"], reverse=True)
        return _suppress_overlapping_polygons(detections)


def _suppress_overlapping_polygons(
    detections: List[dict[str, Any]],
    iou_threshold: float = 0.30,
    containment_threshold: float = 0.35,
) -> List[dict[str, Any]]:
    """
    Hapus poligon duplikat / tumpang tindih (terutama pada bangunan besar/panjang seperti
    mall, sekolah, atau gudang) yang lolos dari Box NMS biasa.
    """
    if len(detections) <= 1:
        return detections

    kept: List[dict[str, Any]] = []
    kept_polys: List[ShapelyPolygon] = []

    for det in detections:
        poly = ShapelyPolygon(det["polygon"])
        if not poly.is_valid:
            poly = poly.buffer(0)
        if poly.is_empty or poly.area <= 1.0:
            continue

        is_duplicate = False
        for prev in kept_polys:
            if not poly.bounds or not prev.bounds:
                continue
            # Cek cepat bbox overlap dulu sebelum intersection penuh
            if (
                poly.bounds[2] < prev.bounds[0]
                or prev.bounds[2] < poly.bounds[0]
                or poly.bounds[3] < prev.bounds[1]
                or prev.bounds[3] < poly.bounds[1]
            ):
                continue
            inter = poly.intersection(prev).area
            if inter <= 0.0:
                continue
            union = poly.area + prev.area - inter
            iou = inter / union if union > 0 else 0.0
            containment = inter / min(poly.area, prev.area)
            if iou >= iou_threshold or containment >= containment_threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            kept.append(det)
            kept_polys.append(poly)

    return kept
