"use client";

import type { MouseEvent } from "react";

import type { BoundingBox, Pixel } from "@/lib/api";

type Props = {
  imageUrl: string;
  bbox: BoundingBox;
  width: number;
  height: number;
  polygon: Pixel[];
  metersPerPixel: number;
  disabled?: boolean;
  onAddPoint: (point: Pixel) => void;
};

/**
 * Menampilkan citra dan menerjemahkan klik menjadi koordinat piksel.
 *
 * Overlay SVG memakai viewBox seukuran citra sehingga koordinat yang dikirim ke
 * backend sama persis dengan koordinat piksel, berapa pun ukuran tampilannya.
 */
export function ImageryCanvas({
  imageUrl,
  bbox,
  width,
  height,
  polygon,
  metersPerPixel,
  disabled = false,
  onAddPoint,
}: Props) {
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    onAddPoint([
      Math.round(((event.clientX - rect.left) / rect.width) * width),
      Math.round(((event.clientY - rect.top) / rect.height) * height),
    ]);
  }

  const boundary = polygon.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        className={`relative overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700 ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Citra atap"
          width={width}
          height={height}
          draggable={false}
          className="block w-full select-none"
        />
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {polygon.length >= 2 && (
            <polygon
              points={boundary}
              className="fill-sky-500/20 stroke-sky-400"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {polygon.map(([x, y], index) => (
            <circle key={`${index}-${x}-${y}`} cx={x} cy={y} r={4} className="fill-sky-400" />
          ))}
        </svg>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500 sm:grid-cols-4 dark:text-zinc-400">
        <div>
          <dt className="inline">Skala: </dt>
          <dd className="inline">{metersPerPixel.toFixed(4)} m/piksel</dd>
        </div>
        <div>
          <dt className="inline">Piksel: </dt>
          <dd className="inline">
            {polygon.length === 0 ? "belum ada" : polygon.map(([x, y]) => `(${x}, ${y})`).join(" ")}
          </dd>
        </div>
        <div>
          <dt className="inline">Bbox: </dt>
          <dd className="inline">{bbox.map((value) => value.toFixed(5)).join(", ")}</dd>
        </div>
      </dl>
    </div>
  );
}
