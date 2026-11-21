"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SimulationDetail, SimulationRoofDetail } from "@/lib/api";
import { buildDashboardRoofLayout, type LayoutSlotState } from "@/lib/roofLayout";

interface Props {
  detail?: SimulationDetail | null;
  fallbackLat: number;
  fallbackLng: number;
  roofCountLabel?: string;
  moduleCount?: number;
  loading?: boolean;
}

type NormPoint = { nx: number; ny: number };

const TWO_PI = Math.PI * 2;
const ESRI_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile";

/** Projects WGS84 `(lng, lat)` into normalized Web Mercator `[0..1] × [0..1]`. */
function toMercatorNorm(lng: number, lat: number): NormPoint {
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const nx = (lng + 180) / 360;
  const ny = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (2 * TWO_PI);
  return { nx, ny };
}

function slotFillAndStroke(state: LayoutSlotState): { fill: string; stroke: string } {
  if (state === "skylight") {
    return { fill: "rgba(245, 158, 11, 0.72)", stroke: "rgba(253, 230, 138, 0.9)" };
  }
  if (state === "hvac") {
    return { fill: "rgba(225, 29, 72, 0.78)", stroke: "rgba(253, 164, 175, 0.9)" };
  }
  if (state === "empty") {
    return { fill: "rgba(15, 23, 42, 0.25)", stroke: "rgba(56, 189, 248, 0.35)" };
  }
  return { fill: "#0B1528", stroke: "rgba(56, 189, 248, 0.55)" };
}

function buildGeoRoof(
  roof: SimulationRoofDetail,
  imagery: SimulationDetail["imagery"],
  fallbackCenter: { lat: number; lng: number }
) {
  const layout = buildDashboardRoofLayout(roof, imagery);
  const mpp = imagery?.meters_per_pixel ?? 0.3;

  // Determine exact world anchor & degree-per-meter scale
  let centerLng = fallbackCenter.lng;
  let centerLat = fallbackCenter.lat;
  let dLngPerM = 1 / (111_320 * Math.max(0.15, Math.cos((centerLat * Math.PI) / 180)));
  let dLatPerM = 1 / 111_320;

  if (
    imagery &&
    imagery.bbox?.length === 4 &&
    imagery.width > 0 &&
    imagery.height > 0 &&
    roof.roof_polygon_px?.length >= 3
  ) {
    const [minLng, minLat, maxLng, maxLat] = imagery.bbox;
    const xs = roof.roof_polygon_px.map(([x]) => x);
    const ys = roof.roof_polygon_px.map(([, y]) => y);
    const avgPxX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const avgPxY = (Math.min(...ys) + Math.max(...ys)) / 2;

    centerLng = minLng + (avgPxX / imagery.width) * (maxLng - minLng);
    centerLat = maxLat - (avgPxY / imagery.height) * (maxLat - minLat);
    dLngPerM = (maxLng - minLng) / (imagery.width * mpp);
    dLatPerM = (maxLat - minLat) / (imagery.height * mpp);
  } else if (roof.roof_polygon?.coordinates?.[0]?.length >= 3) {
    const ring = roof.roof_polygon.coordinates[0];
    const lngs = ring.map(([lng]) => lng);
    const lats = ring.map(([, lat]) => lat);
    centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    dLngPerM = 1 / (111_320 * Math.max(0.15, Math.cos((centerLat * Math.PI) / 180)));
  }

  const polygonNorms =
    roof.roof_polygon?.coordinates?.[0]?.length >= 3 && (!imagery || !roof.roof_polygon_px?.length)
      ? roof.roof_polygon.coordinates[0].slice(0, -1).map(([lng, lat]) => toMercatorNorm(lng, lat))
      : layout.worldPolygon.map((p) =>
          toMercatorNorm(centerLng + p.x * dLngPerM, centerLat - p.y * dLatPerM)
        );

  const slotsNorm = layout.isSolarPopulated
    ? layout.slots.map((slot) => ({
        ...slot,
        norm: toMercatorNorm(centerLng + slot.x * dLngPerM, centerLat - slot.y * dLatPerM),
      }))
    : [];

  return {
    polygonNorms,
    slotsNorm,
    isSolarPopulated: layout.isSolarPopulated,
    refLat: centerLat,
  };
}

/**
 * Lightweight, sub-pixel aligned satellite + CAD polygon preview for History cards.
 * Automatically frames all roof polygons & PV arrays inside the viewport.
 */
export function ProjectPolygonMapPreview({
  detail,
  fallbackLat,
  fallbackLng,
  roofCountLabel,
  moduleCount,
  loading = false,
}: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [boxSize, setBoxSize] = useState<{ w: number; h: number }>({ w: 460, h: 172 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        setBoxSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scene = useMemo(() => {
    const { w, h } = boxSize;
    const centerLat = detail?.center_point.lat ?? fallbackLat;
    const centerLng = detail?.center_point.lng ?? fallbackLng;
    const geoRoofs =
      detail && detail.roofs.length > 0
        ? detail.roofs.map((r) => buildGeoRoof(r, detail.imagery, { lat: centerLat, lng: centerLng }))
        : [];

    const allNorms = geoRoofs.flatMap((r) => r.polygonNorms);

    let centerNx: number;
    let centerNy: number;
    let fitZoom: number;

    if (allNorms.length > 0) {
      let minNx = Infinity;
      let maxNx = -Infinity;
      let minNy = Infinity;
      let maxNy = -Infinity;
      for (const p of allNorms) {
        if (p.nx < minNx) minNx = p.nx;
        if (p.nx > maxNx) maxNx = p.nx;
        if (p.ny < minNy) minNy = p.ny;
        if (p.ny > maxNy) maxNy = p.ny;
      }

      centerNx = (minNx + maxNx) / 2;
      centerNy = (minNy + maxNy) / 2;

      const spanX = Math.max(maxNx - minNx, 1e-7);
      const spanY = Math.max(maxNy - minNy, 1e-7);
      const zoomX = Math.log2((w * 0.72) / (256 * spanX));
      const zoomY = Math.log2((h * 0.72) / (256 * spanY));
      fitZoom = Math.max(15.2, Math.min(19.5, Math.min(zoomX, zoomY)));
    } else {
      const fallbackNorm = toMercatorNorm(centerLng, centerLat);
      centerNx = fallbackNorm.nx;
      centerNy = fallbackNorm.ny;
      fitZoom = 18.5;
    }

    const tileZ = Math.min(19, Math.max(15, Math.floor(fitZoom)));
    const tileCountAtZ = Math.pow(2, tileZ);
    const worldPx = 256 * Math.pow(2, fitZoom);
    const cxWorld = centerNx * worldPx;
    const cyWorld = centerNy * worldPx;
    const tileDisplaySize = worldPx / tileCountAtZ;

    // Meters per pixel at fitZoom & center latitude for rendering PV panels at true physical scale
    const metersPerWorldPx =
      (40_075_016.686 * Math.cos((centerLat * Math.PI) / 180)) / worldPx;
    const pxPerMeter = 1 / Math.max(0.01, metersPerWorldPx);

    // Compute visible XYZ satellite tiles
    const minVisNx = (cxWorld - w / 2) / worldPx;
    const maxVisNx = (cxWorld + w / 2) / worldPx;
    const minVisNy = (cyWorld - h / 2) / worldPx;
    const maxVisNy = (cyWorld + h / 2) / worldPx;

    const minTx = Math.floor(minVisNx * tileCountAtZ);
    const maxTx = Math.floor(maxVisNx * tileCountAtZ);
    const minTy = Math.floor(minVisNy * tileCountAtZ);
    const maxTy = Math.floor(maxVisNy * tileCountAtZ);

    const tiles: Array<{ key: string; url: string; left: number; top: number; size: number }> = [];
    for (let tx = minTx; tx <= maxTx; tx++) {
      for (let ty = minTy; ty <= maxTy; ty++) {
        if (ty < 0 || ty >= tileCountAtZ) continue;
        const wrappedTx = ((tx % tileCountAtZ) + tileCountAtZ) % tileCountAtZ;
        tiles.push({
          key: `${tileZ}-${tx}-${ty}`,
          url: `${ESRI_TILE_URL}/${tileZ}/${ty}/${wrappedTx}`,
          left: w / 2 + ((tx / tileCountAtZ) * worldPx - cxWorld),
          top: h / 2 + ((ty / tileCountAtZ) * worldPx - cyWorld),
          size: tileDisplaySize,
        });
      }
    }

    const screenRoofs = geoRoofs.map((roof, idx) => ({
      id: `preview-roof-${idx}`,
      isSolarPopulated: roof.isSolarPopulated,
      pointsAttr: roof.polygonNorms
        .map((p) => `${(w / 2 + (p.nx * worldPx - cxWorld)).toFixed(1)},${(h / 2 + (p.ny * worldPx - cyWorld)).toFixed(1)}`)
        .join(" "),
      slots: roof.slotsNorm.map((slot) => ({
        key: slot.key,
        cx: w / 2 + (slot.norm.nx * worldPx - cxWorld),
        cy: h / 2 + (slot.norm.ny * worldPx - cyWorld),
        pw: Math.max(1.8, slot.w * pxPerMeter),
        pl: Math.max(2.6, slot.l * pxPerMeter),
        rot: slot.rotationDeg ?? 0,
        state: slot.state ?? "active",
      })),
    }));

    return { tiles, screenRoofs };
  }, [boxSize, detail, fallbackLat, fallbackLng]);

  const totalPanels = detail?.result.installed ?? moduleCount;
  const totalRoofs = detail?.result.roof_count;

  return (
    <div
      ref={boxRef}
      className="relative z-10 w-full h-40 sm:h-44 rounded-2xl overflow-hidden bg-slate-900/90 border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_14px_rgba(15,23,42,0.06)] my-3.5 select-none"
    >
      {/* Esri Satellite XYZ Tiles */}
      <div className="absolute inset-0 pointer-events-none">
        {scene.tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="lazy"
            draggable={false}
            className="absolute max-w-none pointer-events-none"
            style={{
              left: `${tile.left}px`,
              top: `${tile.top}px`,
              width: `${Math.ceil(tile.size) + 1}px`,
              height: `${Math.ceil(tile.size) + 1}px`,
            }}
          />
        ))}
      </div>

      {/* Subtle Dark Vignette for Contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-slate-950/10 pointer-events-none" />

      {/* CAD Polygons & Solar Panel Grid SVG Overlay */}
      <svg
        viewBox={`0 0 ${boxSize.w} ${boxSize.h}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {scene.screenRoofs.map((roof) => (
          <g key={roof.id}>
            <polygon
              points={roof.pointsAttr}
              fill={roof.isSolarPopulated ? "rgba(16, 185, 129, 0.14)" : "rgba(245, 158, 11, 0.18)"}
              stroke={roof.isSolarPopulated ? "#34d399" : "#f59e0b"}
              strokeWidth="1.75"
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />
            {roof.slots.map((slot) => {
              const colors = slotFillAndStroke(slot.state);
              return (
                <rect
                  key={slot.key}
                  x={-slot.pw / 2}
                  y={-slot.pl / 2}
                  width={slot.pw}
                  height={slot.pl}
                  rx="0.8"
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="0.6"
                  transform={`translate(${slot.cx.toFixed(2)}, ${slot.cy.toFixed(2)}) rotate(${slot.rot})`}
                />
              );
            })}
          </g>
        ))}

        {/* Fallback coordinate pin if polygon details aren't loaded yet */}
        {scene.screenRoofs.length === 0 && (
          <g transform={`translate(${boxSize.w / 2}, ${boxSize.h / 2})`}>
            <circle r="10" fill="rgba(251, 191, 36, 0.28)" />
            <circle r="4.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {/* Quiet Apple Frosted Glass Status Badge */}
      <div className="absolute bottom-2.5 left-2.5 max-w-[calc(100%-1.25rem)] truncate px-2.5 py-1 rounded-full bg-white/82 backdrop-blur-xl saturate-150 border border-white/85 shadow-[0_4px_12px_rgba(15,23,42,0.14)] text-[10.5px] font-medium text-slate-800 font-code-metric tabular-nums">
        <span className={loading ? "opacity-75" : ""}>
          {totalRoofs !== undefined ? `${totalRoofs} bidang` : roofCountLabel || "1 bidang"}
          {typeof totalPanels === "number" && totalPanels > 0 ? ` · ${totalPanels} panel` : ""}
        </span>
      </div>
    </div>
  );
}
