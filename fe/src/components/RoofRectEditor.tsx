"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { ROTATION_LIMIT_DEG, type RoofRect } from "@/lib/api";
import { decimal } from "@/lib/format";

/**
 * Editor persegi bidang atap di atas citra satelit.
 *
 * Seluruh geometri dihitung dalam koordinat piksel citra. Lapisan SVG memakai
 * `viewBox` seukuran citra dan `preserveAspectRatio="none"` sehingga satu satuan
 * SVG sama dengan satu piksel citra, dan yang berubah hanyalah skala tampilannya.
 * Rotasi dipasang sebagai transform pada grup, jadi `rect` tetap tersimpan
 * sebagai sudut kiri-atas beserta ukurannya sebelum diputar.
 */

/** Ukuran terkecil persegi dalam piksel citra, supaya persegi tidak pernah hilang saat diubah ukurannya. */
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

/** Pembulatan dua desimal; menahan derau koma panjang pada payload dan tampilan. */
function round2(value: number): number {
  const factor = 100;
  return Math.round(value * factor) / factor;
}

/** Ukuran bidang atap awal, dalam meter: satu bidang atap rumah yang lazim. */
const DEFAULT_ROOF_LENGTH_M = 12;

const DEFAULT_ROOF_WIDTH_M = 8;

/** Ukuran terkecil yang masih nyaman disentuh, dalam piksel. */
const MIN_RECT_PX = 24;

/**
 * Persegi awal di tengah citra, berukuran bidang atap rumah yang lazim.
 *
 * Ukurannya dihitung dari skala citra, bukan dari sebagian ukuran citra: pada zoom
 * kerja satu citra meliputi ratusan meter, sehingga persegi yang proporsional
 * terhadap citra akan menghasilkan bidang atap yang tidak masuk akal.
 */
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

/** Menjaga ukuran tetap dapat disentuh sekaligus tetap di dalam citra. */
function clampToImage(size: number, limit: number): number {
  return round2(Math.max(MIN_RECT_PX, Math.min(size, limit * 0.9)));
}

/** Memastikan persegi tidak keluar dari batas citra, termasuk saat ia diputar. */
function clampInside(rect: RoofRect, imageWidth: number, imageHeight: number): RoofRect {
  const radians = (rect.rotation_deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  // Bingkai sejajar sumbu dari persegi yang diputar; bingkai inilah yang harus muat di citra.
  const frameWidth = rect.width * cos + rect.height * sin;
  const frameHeight = rect.width * sin + rect.height * cos;
  // Margin satu piksel menyerap pembulatan dua desimal pada ukuran di bawah.
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

/** Memindahkan persegi tanpa mengubah ukuran maupun putarannya. */
function moveRect(
  origin: RoofRect,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number,
): RoofRect {
  return clampInside({ ...origin, x: origin.x + deltaX, y: origin.y + deltaY }, imageWidth, imageHeight);
}

/**
 * Mengubah ukuran persegi dengan sudut yang berlawanan tetap di tempatnya.
 *
 * Titik penunjuk diproyeksikan ke sumbu lokal persegi, sehingga rumusnya tetap
 * benar untuk persegi yang sedang diputar.
 */
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
  // Sudut seberang yang digeser: titik ini yang harus tetap diam.
  const anchorX = centerX - (corner.x * origin.width) / 2 * axisWidth.x - (corner.y * origin.height) / 2 * axisHeight.x;
  const anchorY = centerY - (corner.x * origin.width) / 2 * axisWidth.y - (corner.y * origin.height) / 2 * axisHeight.y;
  const alongWidth = (pointer.x - anchorX) * axisWidth.x + (pointer.y - anchorY) * axisWidth.y;
  const alongHeight = (pointer.x - anchorX) * axisHeight.x + (pointer.y - anchorY) * axisHeight.y;
  const width = Math.max(MIN_SIZE_PX, corner.x * alongWidth);
  const height = Math.max(MIN_SIZE_PX, corner.y * alongHeight);
  const nextCenterX = anchorX + (corner.x * width) / 2 * axisWidth.x + (corner.y * height) / 2 * axisHeight.x;
  const nextCenterY = anchorY + (corner.x * width) / 2 * axisWidth.y + (corner.y * height) / 2 * axisHeight.y;

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

type Props = {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  metersPerPixel: number;
  attribution: string;
  rect: RoofRect;
  disabled?: boolean;
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
  onChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  /** Mengubah koordinat layar menjadi koordinat piksel citra. */
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
    if (disabled) {
      return;
    }

    event.preventDefault();
    dragRef.current = drag;
    // Penangkapan penunjuk membuat gerakan tetap terkirim walau kursor keluar dari SVG.
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
  // Ketebalan garis dan jari-jari handle mengikuti ukuran citra supaya tampilannya
  // sama di semua zoom, bukan mengecil di citra yang lebih besar.
  const strokeWidth = imageWidth / 500;
  const handleRadius = imageWidth / 56;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Citra harus tampil apa adanya pada rasio aslinya: lapisan SVG di atasnya
            memetakan koordinat penunjuk ke piksel citra, dan pengoptimal Next tidak
            diperlukan untuk citra dari server yang sudah berukuran tetap. */}
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
          className={`absolute inset-0 h-full w-full ${disabled ? "" : "touch-none"}`}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <g transform={`rotate(${rect.rotation_deg} ${centerX} ${centerY})`}>
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill="rgba(14, 165, 233, 0.22)"
              stroke="#0284c7"
              strokeWidth={strokeWidth}
              className={disabled ? undefined : "cursor-move"}
              onPointerDown={startMove}
            />
            {CORNERS.map((corner) => (
              <circle
                key={`${corner.x}:${corner.y}`}
                cx={centerX + (corner.x * rect.width) / 2}
                cy={centerY + (corner.y * rect.height) / 2}
                r={handleRadius}
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth={strokeWidth}
                className={disabled ? undefined : "cursor-crosshair"}
                onPointerDown={(event) => startResize(event, corner)}
              />
            ))}
          </g>
        </svg>

        {imageFailed && (
          <p className="absolute inset-0 flex items-center justify-center bg-zinc-100/95 p-4 text-center text-sm text-red-700 dark:bg-zinc-900/95 dark:text-red-300">
            Citra tidak dapat dimuat. Coba ambil citra ulang atau periksa koneksi ke server.
          </p>
        )}

        {attribution !== "" && !imageFailed && (
          <p className="pointer-events-none absolute right-1 bottom-1 rounded bg-zinc-900/70 px-1.5 py-0.5 text-[10px] text-zinc-100">
            {attribution}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span>
          Lebar atap:{" "}
          <strong className="font-mono">{decimal.format(rect.width * metersPerPixel)} m</strong>
        </span>
        <span>
          Panjang atap:{" "}
          <strong className="font-mono">{decimal.format(rect.height * metersPerPixel)} m</strong>
        </span>
        <span className="text-zinc-500 dark:text-zinc-400">
          Luas bidang:{" "}
          <span className="font-mono">
            {decimal.format(rect.width * rect.height * metersPerPixel * metersPerPixel)} m²
          </span>
        </span>
        <label className="ml-auto flex items-center gap-2 text-xs font-medium">
          Putaran
          <input
            type="range"
            min={-ROTATION_LIMIT_DEG}
            max={ROTATION_LIMIT_DEG}
            step={1}
            value={Math.round(rect.rotation_deg)}
            disabled={disabled}
            onChange={(event) => onChange({ ...rect, rotation_deg: Number(event.target.value) })}
            className="w-40 accent-sky-600"
          />
          <span className="w-10 font-mono text-zinc-500 dark:text-zinc-400">
            {Math.round(rect.rotation_deg)}°
          </span>
        </label>
      </div>
    </div>
  );
}
