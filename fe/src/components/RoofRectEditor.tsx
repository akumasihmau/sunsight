"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { ROTATION_LIMIT_DEG, type RoofRect } from "@/lib/api";
import { decimal, integer } from "@/lib/format";

/**
 * Editor persegi bidang atap di atas citra satelit.
 *
 * Seluruh geometri dihitung dalam koordinat piksel citra. Lapisan SVG memakai
 * `viewBox` seukuran citra dan `preserveAspectRatio="none"` sehingga satu satuan
 * SVG sama dengan satu piksel citra, dan yang berubah hanyalah skala tampilannya.
 * Rotasi dipasang sebagai transform pada grup, jadi `rect` tetap tersimpan
 * sebagai sudut kiri-atas beserta ukurannya sebelum diputar.
 */

const MIN_SIZE_PX = 24;

type Corner = { x: -1 | 1; y: -1 | 1 };

const CORNERS: Corner[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
];

type Drag =
  | { kind: "move"; pointerX: number; pointerY: number; origin: RoofRect }
  | { kind: "resize"; corner: Corner; origin: RoofRect };

function round2(value: number): number {
  const factor = 100;
  return Math.round(value * factor) / factor;
}

const DEFAULT_ROOF_LENGTH_M = 12;
const DEFAULT_ROOF_WIDTH_M = 8;
const MIN_RECT_PX = 24;

export function centeredRect(
  imageWidth: number,
  imageHeight: number,
  metersPerPixel: number,
): RoofRect {
  const scale = Math.max(metersPerPixel, 1e-6);

  const width = clampToImage(DEFAULT_ROOF_LENGTH_M / scale, imageWidth);
  const height = clampToImage(DEFAULT_ROOF_WIDTH_M / scale, imageHeight);

  return {
    x: round2((imageWidth - width) / 2),
    y: round2((imageHeight - height) / 2),
    width,
    height,
    rotation_deg: 0,
  };
}

function clampToImage(size: number, limit: number): number {
  return round2(Math.max(MIN_RECT_PX, Math.min(size, limit * 0.9)));
}

function clampInside(rect: RoofRect, imageWidth: number, imageHeight: number): RoofRect {
  const radians = (rect.rotation_deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const frameWidth = rect.width * cos + rect.height * sin;
  const frameHeight = rect.width * sin + rect.height * cos;
  const scale = Math.min(1, (imageWidth - 1) / frameWidth, (imageHeight - 1) / frameHeight);
  const width = round2(rect.width * scale);
  const height = round2(rect.height * scale);
  const halfWidth = (width * cos + height * sin) / 2;
  const halfHeight = (width * sin + height * cos) / 2;
  const centerX = Math.min(Math.max(rect.x + rect.width / 2, halfWidth), imageWidth - halfWidth);
  const centerY = Math.min(Math.max(rect.y + rect.height / 2, halfHeight), imageHeight - halfHeight);

  return {
    x: round2(centerX - width / 2),
    y: round2(centerY - height / 2),
    width,
    height,
    rotation_deg: rect.rotation_deg,
  };
}

function moveRect(
  origin: RoofRect,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
): RoofRect {
  return clampInside(
    { ...origin, x: origin.x + deltaX, y: origin.y + deltaY },
    imageWidth,
    imageHeight,
  );
}

function resizeRect(
  origin: RoofRect,
  corner: Corner,
  pointer: { x: number; y: number },
  imageWidth: number,
  imageHeight: number,
): RoofRect {
  const radians = (origin.rotation_deg * Math.PI) / 180;
  const axisWidth = { x: Math.cos(radians), y: Math.sin(radians) };
  const axisHeight = { x: -Math.sin(radians), y: Math.cos(radians) };
  const centerX = origin.x + origin.width / 2;
  const centerY = origin.y + origin.height / 2;
  const anchorX =
    centerX -
    ((corner.x * origin.width) / 2) * axisWidth.x -
    ((corner.y * origin.height) / 2) * axisHeight.x;
  const anchorY =
    centerY -
    ((corner.x * origin.width) / 2) * axisWidth.y -
    ((corner.y * origin.height) / 2) * axisHeight.y;
  const alongWidth = (pointer.x - anchorX) * axisWidth.x + (pointer.y - anchorY) * axisWidth.y;
  const alongHeight = (pointer.x - anchorX) * axisHeight.x + (pointer.y - anchorY) * axisHeight.y;
  const width = Math.max(MIN_SIZE_PX, corner.x * alongWidth);
  const height = Math.max(MIN_SIZE_PX, corner.y * alongHeight);
  const nextCenterX =
    anchorX + ((corner.x * width) / 2) * axisWidth.x + ((corner.y * height) / 2) * axisHeight.x;
  const nextCenterY =
    anchorY + ((corner.x * width) / 2) * axisWidth.y + ((corner.y * height) / 2) * axisHeight.y;

  return clampInside(
    {
      x: round2(nextCenterX - width / 2),
      y: round2(nextCenterY - height / 2),
      width: round2(width),
      height: round2(height),
      rotation_deg: origin.rotation_deg,
    },
    imageWidth,
    imageHeight,
  );
}

type LayoutPreview = {
  rows: number;
  columns: number;
  installed: number;
};

type Props = {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  metersPerPixel: number;
  attribution: string;
  rect: RoofRect;
  disabled?: boolean;
  setbackM?: number;
  gutterM?: number;
  tiltDeg?: number;
  layoutPreview?: LayoutPreview | null;
  onChange: (rect: RoofRect) => void;
};

export function RoofRectEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  metersPerPixel,
  attribution,
  rect,
  disabled = false,
  setbackM = 0,
  gutterM = 0,
  tiltDeg = 20,
  layoutPreview = null,
  onChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [showModules, setShowModules] = useState(true);

  const interactionLocked = disabled || viewMode === "3d";

  function toImagePoint(clientX: number, clientY: number): { x: number; y: number } {
    const bounds = svgRef.current?.getBoundingClientRect();

    if (bounds === undefined || bounds.width === 0 || bounds.height === 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: ((clientX - bounds.left) / bounds.width) * imageWidth,
      y: ((clientY - bounds.top) / bounds.height) * imageHeight,
    };
  }

  function startDrag(event: ReactPointerEvent<SVGElement>, drag: Drag) {
    if (interactionLocked) {
      return;
    }

    event.preventDefault();
    dragRef.current = drag;
    svgRef.current?.setPointerCapture(event.pointerId);
  }

  function startMove(event: ReactPointerEvent<SVGElement>) {
    const point = toImagePoint(event.clientX, event.clientY);
    startDrag(event, { kind: "move", pointerX: point.x, pointerY: point.y, origin: rect });
  }

  function startResize(event: ReactPointerEvent<SVGElement>, corner: Corner) {
    startDrag(event, { kind: "resize", corner, origin: rect });
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;

    if (drag === null) {
      return;
    }

    const point = toImagePoint(event.clientX, event.clientY);

    if (drag.kind === "move") {
      onChange(
        moveRect(
          drag.origin,
          point.x - drag.pointerX,
          point.y - drag.pointerY,
          imageWidth,
          imageHeight,
        ),
      );
      return;
    }

    onChange(resizeRect(drag.origin, drag.corner, point, imageWidth, imageHeight));
  }

  function endDrag(event: ReactPointerEvent<SVGSVGElement>) {
    dragRef.current = null;

    if (svgRef.current?.hasPointerCapture(event.pointerId) === true) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
  }

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const strokeWidth = imageWidth / 500;
  const handleRadius = imageWidth / 56;

  // Geometri visual lapisan dalam (setback, jalur talang, dan kisi modul PV)
  const scale = Math.max(metersPerPixel, 1e-6);
  const setbackPx = Math.min(rect.width * 0.45, Math.max(0, setbackM / scale));
  const gutterPx = Math.min(rect.height * 0.45, Math.max(0, gutterM / scale));

  const innerX = rect.x + setbackPx;
  const innerY = rect.y + setbackPx;
  const innerW = Math.max(0, rect.width - setbackPx * 2);
  const innerH = Math.max(0, rect.height - setbackPx * 2 - gutterPx);

  const moduleRects: Array<{ key: string; x: number; y: number; w: number; h: number }> = [];
  if (
    showModules &&
    layoutPreview !== null &&
    layoutPreview.rows > 0 &&
    layoutPreview.columns > 0 &&
    layoutPreview.installed > 0 &&
    innerW > 4 &&
    innerH > 4
  ) {
    const cols = layoutPreview.columns;
    const rows = layoutPreview.rows;
    const maxRender = Math.min(layoutPreview.installed, 400);
    const gapX = Math.min(innerW * 0.02, strokeWidth * 1.1);
    const gapY = Math.min(innerH * 0.02, strokeWidth * 1.1);
    const modW = Math.max(1, (innerW - gapX * (cols + 1)) / cols);
    const modH = Math.max(1, (innerH - gapY * (rows + 1)) / rows);

    let count = 0;
    for (let r = 0; r < rows && count < maxRender; r += 1) {
      for (let c = 0; c < cols && count < maxRender; c += 1) {
        moduleRects.push({
          key: `${r}:${c}`,
          x: innerX + gapX + c * (modW + gapX),
          y: innerY + gapY + r * (modH + gapY),
          w: modW,
          h: modH,
        });
        count += 1;
      }
    }
  }

  const perspectiveTransform =
    viewMode === "3d"
      ? `perspective(1100px) rotateX(${Math.min(44, 18 + tiltDeg * 0.45).toFixed(1)}deg) rotateZ(-4deg) scale(0.93)`
      : "none";

  return (
    <div className="grid gap-2.5">
      {/* Top Canvas Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("2d")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${
              viewMode === "2d"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">grid_on</span>
            <span>2D Edit Nadir</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("3d")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${
              viewMode === "3d"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">view_in_ar</span>
            <span>Pratinjau 3D ({tiltDeg}°)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {layoutPreview !== null && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-[11px] font-bold text-sky-900">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span>
                Kisi: {integer.format(layoutPreview.rows)} × {integer.format(layoutPreview.columns)}{" "}
                ({integer.format(layoutPreview.installed)} modul)
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowModules((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1 ${
              showModules
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">solar_power</span>
            <span>{showModules ? "Modul Tampil" : "Modul Sembunyi"}</span>
          </button>
        </div>
      </div>

      {/* Satellite Canvas */}
      <div className="map-canvas bg-slate-900">
        <div
          className="relative w-full transition-transform duration-500 ease-out"
          style={{ transform: perspectiveTransform }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Citra satelit lokasi atap"
            width={imageWidth}
            height={imageHeight}
            draggable={false}
            onLoad={() => setImageFailed(false)}
            onError={() => setImageFailed(true)}
            className="block w-full select-none"
          />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            preserveAspectRatio="none"
            className={`absolute inset-0 h-full w-full ${interactionLocked ? "" : "touch-none"}`}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <g transform={`rotate(${rect.rotation_deg} ${centerX} ${centerY})`}>
              {/* Outer Roof Selection */}
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                strokeWidth={strokeWidth}
                className={interactionLocked ? "roof-selection" : "roof-selection cursor-move"}
                onPointerDown={startMove}
              />

              {/* Gutter Strip on Bottom Edge */}
              {gutterPx > 0.5 && (
                <rect
                  x={rect.x}
                  y={rect.y + rect.height - gutterPx}
                  width={rect.width}
                  height={gutterPx}
                  fill="rgba(14, 165, 233, 0.24)"
                  stroke="rgba(56, 189, 248, 0.85)"
                  strokeWidth={strokeWidth * 0.75}
                  strokeDasharray={`${strokeWidth * 3} ${strokeWidth * 2}`}
                  pointerEvents="none"
                />
              )}

              {/* Setback Inner Perimeter */}
              {innerW > 2 && innerH > 2 && (setbackPx > 0.5 || gutterPx > 0.5) && (
                <rect
                  x={innerX}
                  y={innerY}
                  width={innerW}
                  height={innerH}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={strokeWidth * 0.85}
                  strokeDasharray={`${strokeWidth * 3.5} ${strokeWidth * 2.5}`}
                  pointerEvents="none"
                />
              )}

              {/* Packed Solar PV Modules Preview */}
              {moduleRects.map((mod) => (
                <g key={mod.key} pointerEvents="none">
                  <rect
                    x={mod.x}
                    y={mod.y}
                    width={mod.w}
                    height={mod.h}
                    rx={strokeWidth * 0.4}
                    fill="rgba(15, 23, 42, 0.84)"
                    stroke="#38bdf8"
                    strokeWidth={strokeWidth * 0.55}
                  />
                  <line
                    x1={mod.x + mod.w / 2}
                    y1={mod.y}
                    x2={mod.x + mod.w / 2}
                    y2={mod.y + mod.h}
                    stroke="rgba(148, 163, 184, 0.35)"
                    strokeWidth={strokeWidth * 0.35}
                  />
                </g>
              ))}

              {/* 4 Resize Corner Handles (Hidden in 3D preview mode) */}
              {viewMode === "2d" &&
                CORNERS.map((corner) => (
                  <circle
                    key={`${corner.x}:${corner.y}`}
                    cx={centerX + (corner.x * rect.width) / 2}
                    cy={centerY + (corner.y * rect.height) / 2}
                    r={handleRadius}
                    strokeWidth={strokeWidth}
                    className={disabled ? "roof-handle" : "roof-handle cursor-crosshair"}
                    onPointerDown={(event) => startResize(event, corner)}
                  />
                ))}
            </g>
          </svg>
        </div>

        {viewMode === "3d" && !imageFailed && (
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-xs text-amber-300 text-[11px] font-medium border border-amber-400/30 pointer-events-none">
            Pratinjau 3D Miring · Kembali ke &ldquo;2D Edit Nadir&rdquo; untuk menggeser sudut atap
          </div>
        )}

        {imageFailed && (
          <p className="map-canvas__failure">
            Citra tidak dapat dimuat. Coba ambil citra ulang atau periksa koneksi ke server.
          </p>
        )}

        {/* Attribution wajib tetap terlihat di kanvas */}
        {attribution !== "" && !imageFailed && (
          <p className="map-canvas__attribution">{attribution}</p>
        )}
      </div>

      {/* Bottom Dimension & Rotation Toolbar */}
      <div className="map-toolbar rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 shadow-2xs">
        <span>
          Lebar atap:{" "}
          <span className="map-toolbar__value">
            {decimal.format(rect.width * metersPerPixel)} m
          </span>
        </span>
        <span>
          Panjang atap:{" "}
          <span className="map-toolbar__value">
            {decimal.format(rect.height * metersPerPixel)} m
          </span>
        </span>
        <span className="text-ink-tertiary">
          Luas bidang:{" "}
          <span className="map-toolbar__value">
            {decimal.format(rect.width * rect.height * metersPerPixel * metersPerPixel)} m²
          </span>
        </span>
        <label className="field--inline ml-auto">
          <span className="field__label">Putaran</span>
          <input
            type="range"
            min={-ROTATION_LIMIT_DEG}
            max={ROTATION_LIMIT_DEG}
            step={1}
            value={Math.round(rect.rotation_deg)}
            disabled={disabled}
            onChange={(event) => onChange({ ...rect, rotation_deg: Number(event.target.value) })}
            className="range-input w-36"
          />
          <span className="field__value w-9 text-right">{Math.round(rect.rotation_deg)}°</span>
        </label>
      </div>
    </div>
  );
}
