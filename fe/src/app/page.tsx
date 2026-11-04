"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useRef, useState, type ReactNode } from "react";

import { BogorProjectsMap } from "@/components/BogorProjectsMap";
import { LandingView } from "@/components/landing/LandingView";
import { ProposalModal } from "@/components/studio/ProposalModal";
import { type SimulationParameters, type SimulationResult } from "@/lib/api";
import { useHasToken, useStoredBiodata } from "@/lib/profile";

type DashboardNavTab = "overview" | "history" | "calculator";

interface ProjectObstacle {
  name: string;
  type: "hvac" | "skylight" | "tank" | "vent";
  icon: string;
  xPct: number;
  yPct: number;
  label: string;
}

interface SavedRoofProject {
  id: string;
  name: string;
  address: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  roofShape: "rectangle" | "l-shape" | "trapezoid" | "hip";
  shapeLabel: string;
  dimensions: string;
  ridgeM: number;
  slopeM: number;
  tiltDeg: number;
  rotationDeg: number;
  capacityKwp: number;
  moduleCount: number;
  modulePower: number;
  annualProdMwh: number;
  monthlySavingIdr: number;
  paybackYears: number;
  treesCount: number;
  co2ReductionTon: number;
  statusBadge: string;
  date: string;
  facetsSummary: string;
  effectiveAreaPct: number;
  obstacles: ProjectObstacle[];
  polygonPoints?: [number, number][];
}

const SAVED_PROJECTS: SavedRoofProject[] = [
  {
    id: "proj-bogor-tengah",
    name: "Menteng Residence",
    address: "Jl. Pajajaran No. 42, Bogor Tengah",
    district: "Bogor Tengah",
    city: "Kota Bogor",
    lat: -6.595038,
    lng: 106.797241,
    roofShape: "rectangle",
    shapeLabel: "Pelana (Gable)",
    dimensions: "12.48 m × 7.28 m",
    ridgeM: 12.48,
    slopeM: 7.28,
    tiltDeg: 22,
    rotationDeg: -4,
    capacityKwp: 8.3,
    moduleCount: 36,
    modulePower: 550,
    annualProdMwh: 14.4,
    monthlySavingIdr: 2040000,
    paybackYears: 2.4,
    treesCount: 523,
    co2ReductionTon: 11.5,
    statusBadge: "Optimal",
    date: "04 Nov 2026",
    facetsSummary: "2 Poligon (Pelana)",
    effectiveAreaPct: 84,
    polygonPoints: [
      [10, 15],
      [90, 15],
      [90, 85],
      [10, 85],
    ],
    obstacles: [
      { name: "HVAC", type: "hvac", icon: "mode_fan", xPct: 68, yPct: 35, label: "Outdoor AC 2PK" },
      { name: "Skylight", type: "skylight", icon: "window", xPct: 32, yPct: 65, label: "Skylight Kaca" },
    ],
  },
  {
    id: "proj-baranangsiang",
    name: "Baranangsiang Indah",
    address: "Komp. Baranangsiang Indah Blok C, Bogor Timur",
    district: "Bogor Timur",
    city: "Kota Bogor",
    lat: -6.6110,
    lng: 106.8150,
    roofShape: "l-shape",
    shapeLabel: "Bentuk L (Corner)",
    dimensions: "15.20 m × 8.50 m",
    ridgeM: 15.2,
    slopeM: 8.5,
    tiltDeg: 18,
    rotationDeg: 12,
    capacityKwp: 12.5,
    moduleCount: 25,
    modulePower: 580,
    annualProdMwh: 17.5,
    monthlySavingIdr: 2700000,
    paybackYears: 4.4,
    treesCount: 630,
    co2ReductionTon: 14.0,
    statusBadge: "Siap Survei",
    date: "01 Nov 2026",
    facetsSummary: "2 Poligon (Bentuk L)",
    effectiveAreaPct: 79,
    polygonPoints: [
      [12, 14],
      [52, 14],
      [52, 46],
      [88, 46],
      [88, 86],
      [12, 86],
    ],
    obstacles: [
      { name: "Toren Air", type: "tank", icon: "water_drop", xPct: 74, yPct: 68, label: "Toren 1000L" },
      { name: "Pipa Vent", type: "vent", icon: "air", xPct: 32, yPct: 30, label: "Pipa Ventilasi" },
    ],
  },
  {
    id: "proj-yasmin",
    name: "Taman Yasmin Sektor 3",
    address: "Jl. Wijaya Kusuma Raya No. 18, Bogor Barat",
    district: "Bogor Barat",
    city: "Kota Bogor",
    lat: -6.5615,
    lng: 106.7640,
    roofShape: "rectangle",
    shapeLabel: "Persegi Standar",
    dimensions: "10.50 m × 6.20 m",
    ridgeM: 10.5,
    slopeM: 6.2,
    tiltDeg: 15,
    rotationDeg: 0,
    capacityKwp: 6.8,
    moduleCount: 18,
    modulePower: 450,
    annualProdMwh: 9.8,
    monthlySavingIdr: 1550000,
    paybackYears: 3.2,
    treesCount: 380,
    co2ReductionTon: 7.8,
    statusBadge: "Optimal",
    date: "28 Okt 2026",
    facetsSummary: "1 Poligon (Persegi)",
    effectiveAreaPct: 88,
    polygonPoints: [
      [14, 18],
      [86, 18],
      [86, 82],
      [14, 82],
    ],
    obstacles: [
      { name: "Exhaust", type: "vent", icon: "mode_fan", xPct: 60, yPct: 45, label: "Exhaust Fan Dapur" },
    ],
  },
  {
    id: "proj-bantarjati",
    name: "Bantarjati Modern House",
    address: "Jl. Bangbarung Raya No. 09, Bogor Utara",
    district: "Bogor Utara",
    city: "Kota Bogor",
    lat: -6.5780,
    lng: 106.8080,
    roofShape: "hip",
    shapeLabel: "Limasan (Hip)",
    dimensions: "14.00 m × 7.50 m",
    ridgeM: 14.0,
    slopeM: 7.5,
    tiltDeg: 25,
    rotationDeg: 8,
    capacityKwp: 10.2,
    moduleCount: 28,
    modulePower: 550,
    annualProdMwh: 13.2,
    monthlySavingIdr: 1950000,
    paybackYears: 3.8,
    treesCount: 490,
    co2ReductionTon: 10.5,
    statusBadge: "Optimal",
    date: "24 Okt 2026",
    facetsSummary: "4 Poligon (Limasan)",
    effectiveAreaPct: 76,
    polygonPoints: [
      [18, 16],
      [82, 16],
      [90, 50],
      [84, 84],
      [16, 84],
      [10, 50],
    ],
    obstacles: [
      { name: "VRV Outdoor", type: "hvac", icon: "mode_fan", xPct: 62, yPct: 36, label: "VRV AC Multi-Split" },
      { name: "Petir", type: "vent", icon: "bolt", xPct: 32, yPct: 64, label: "Penyalur Petir" },
    ],
  },
];

const BOGOR_MAP_SPOTS = [
  { id: "bogor-tengah", name: "Bogor Tengah", landmark: "Jl. Pajajaran & Kebun Raya", lat: -6.5975, lng: 106.7970, irr: 4.85, x: 50, y: 48 },
  { id: "bogor-timur", name: "Bogor Timur", landmark: "Komp. Baranangsiang Indah", lat: -6.6110, lng: 106.8150, irr: 4.89, x: 68, y: 62 },
  { id: "bogor-barat", name: "Bogor Barat", landmark: "Taman Yasmin Sektor 3", lat: -6.5615, lng: 106.7640, irr: 4.82, x: 28, y: 35 },
  { id: "bogor-utara", name: "Bogor Utara", landmark: "Bantarjati & Bangbarung", lat: -6.5780, lng: 106.8080, irr: 4.86, x: 56, y: 26 },
  { id: "bogor-selatan", name: "Bogor Selatan", landmark: "Batutulis & Cipaku", lat: -6.6190, lng: 106.8110, irr: 4.87, x: 60, y: 76 },
  { id: "sentul", name: "Sentul Babakan", landmark: "Bukit Sentul City", lat: -6.5500, lng: 106.8700, irr: 4.92, x: 82, y: 18 },
];

const PROJECT_TONES = [
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-slate-100 text-slate-700",
  "bg-emerald-100 text-emerald-700",
];

const ECO_TREE_CONFIGS = [
  // --- Back Hill Layer (7 trees, growRank indicates sequential growth order) ---
  { id: 0, growRank: 2, layer: "back" as const, x: 102, y: 137, scale: 0.95, type: "oak" as const },
  { id: 1, growRank: 3, layer: "back" as const, x: 252, y: 148, scale: 1.02, type: "pine" as const },
  { id: 2, growRank: 4, layer: "back" as const, x: 345, y: 141, scale: 0.98, type: "oak" as const },
  { id: 3, growRank: 5, layer: "back" as const, x: 30, y: 148, scale: 0.88, type: "pine" as const },
  { id: 4, growRank: 11, layer: "back" as const, x: 215, y: 147, scale: 0.92, type: "poplar" as const },
  { id: 5, growRank: 14, layer: "back" as const, x: 122, y: 140, scale: 0.82, type: "pine" as const },
  { id: 6, growRank: 17, layer: "back" as const, x: 305, y: 145, scale: 0.85, type: "pine" as const },

  // --- Mid Hill Layer (6 trees) ---
  { id: 7, growRank: 6, layer: "mid" as const, x: 55, y: 168, scale: 1.25, type: "oak" as const },
  { id: 8, growRank: 7, layer: "mid" as const, x: 232, y: 173, scale: 1.3, type: "oak" as const },
  { id: 9, growRank: 8, layer: "mid" as const, x: 332, y: 167, scale: 1.25, type: "pine" as const },
  { id: 10, growRank: 10, layer: "mid" as const, x: 178, y: 172, scale: 1.28, type: "pine" as const },
  { id: 11, growRank: 13, layer: "mid" as const, x: 138, y: 165, scale: 1.15, type: "poplar" as const },
  { id: 12, growRank: 18, layer: "mid" as const, x: 368, y: 165, scale: 1.18, type: "poplar" as const },

  // --- Front Hill Layer (5 foreground focal trees) ---
  { id: 13, growRank: 1, layer: "front" as const, x: 112, y: 196, scale: 1.62, type: "oak" as const },
  { id: 14, growRank: 9, layer: "front" as const, x: 248, y: 204, scale: 1.68, type: "oak" as const },
  { id: 15, growRank: 12, layer: "front" as const, x: 42, y: 206, scale: 1.5, type: "poplar" as const },
  { id: 16, growRank: 15, layer: "front" as const, x: 360, y: 200, scale: 1.58, type: "oak" as const },
  { id: 17, growRank: 16, layer: "front" as const, x: 278, y: 202, scale: 1.45, type: "poplar" as const },
];

function renderTreeSvg(type: "pine" | "oak" | "poplar") {
  if (type === "pine") {
    return (
      <>
        <ellipse cx="0" cy="0.5" rx="4" ry="1.2" fill="#047857" opacity="0.35" />
        <rect x="-1" y="-6" width="2" height="6.5" rx="0.5" fill="#78350f" />
        <polygon points="0,-11 -7,-1 7,-1" fill="#059669" />
        <polygon points="0,-15 -6,-5 6,-5" fill="#047857" />
        <polygon points="0,-20 -5,-10 5,-10" fill="#065f46" />
        <polygon points="0,-20 0,-10 5,-10" fill="#10b981" opacity="0.35" />
      </>
    );
  }
  if (type === "oak") {
    return (
      <>
        <ellipse cx="0" cy="0.5" rx="4.5" ry="1.5" fill="#047857" opacity="0.35" />
        <rect x="-1.2" y="-7" width="2.4" height="7.5" rx="0.5" fill="#78350f" />
        <circle cx="0" cy="-13" r="8" fill="#047857" />
        <circle cx="-4" cy="-12" r="5.5" fill="#059669" />
        <circle cx="4" cy="-12" r="5.5" fill="#10b981" />
        <circle cx="0" cy="-16" r="6" fill="#34d399" />
      </>
    );
  }
  return (
    <>
      <ellipse cx="0" cy="0.5" rx="3.5" ry="1.2" fill="#047857" opacity="0.35" />
      <rect x="-1" y="-7" width="2" height="7.5" rx="0.5" fill="#a16207" />
      <ellipse cx="0" cy="-15" rx="5.5" ry="9.5" fill="#0f766e" />
      <ellipse cx="-1.5" cy="-15" rx="4" ry="8" fill="#14b8a6" />
      <circle cx="1" cy="-18" r="3.5" fill="#5eead4" />
    </>
  );
}

function isPointInPoly(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function RoofGridCardVisual({ proj }: { proj: SavedRoofProject }) {
  const points = useMemo(() => {
    const raw =
      proj.polygonPoints && proj.polygonPoints.length >= 3
        ? proj.polygonPoints
        : [
            [10, 15],
            [90, 15],
            [90, 85],
            [10, 85],
          ];
    return raw.map(([u, v]) => [36 + (u / 100) * 288, 18 + (v / 100) * 140] as [number, number]);
  }, [proj.polygonPoints]);

  const { polygonStr, insetStr, minX, maxX, minY, maxY, modules, bestDim } = useMemo(() => {
    const polygonStr = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const cx = points.reduce((acc, p) => acc + p[0], 0) / points.length;
    const cy = points.reduce((acc, p) => acc + p[1], 0) / points.length;

    const insetPoints = points.map(([x, y]) => [
      cx + (x - cx) * 0.9,
      cy + (y - cy) * 0.88,
    ] as [number, number]);
    const insetStr = insetPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const obstacles = proj.obstacles.map((obs) => ({
      ...obs,
      ox: 36 + (obs.xPct / 100) * 288,
      oy: 18 + (obs.yPct / 100) * 140,
    }));

    let bestPlaced: { x: number; y: number }[] = [];
    let bestDim = { mw: 13, mh: 17 };

    // Adaptive module packing to naturally fit the project's module count
    for (let s = 15; s >= 10.5; s -= 0.5) {
      const mw = s * 0.85;
      const mh = s * 1.15;
      const dx = mw + 1.8;
      const dy = mh + 2.0;
      const margin = 2.5;

      const cols = Math.floor((maxX - minX) / dx);
      const rows = Math.floor((maxY - minY) / dy);
      const startX = minX + (maxX - minX - cols * dx) / 2 + (dx - mw) / 2;
      const startY = minY + (maxY - minY - rows * dy) / 2 + (dy - mh) / 2;

      const placed: { x: number; y: number }[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const mx = startX + c * dx;
          const my = startY + r * dy;
          const mcx = mx + mw / 2;
          const mcy = my + mh / 2;

          if (
            !isPointInPoly(mx - margin, my - margin, points) ||
            !isPointInPoly(mx + mw + margin, my - margin, points) ||
            !isPointInPoly(mx + mw + margin, my + mh + margin, points) ||
            !isPointInPoly(mx - margin, my + mh + margin, points)
          ) {
            continue;
          }

          const collides = obstacles.some(
            (o) => Math.abs(mcx - o.ox) < 18 && Math.abs(mcy - o.oy) < 16
          );
          if (collides) continue;

          placed.push({ x: mx, y: my });
        }
      }

      if (placed.length >= proj.moduleCount) {
        bestPlaced = placed.slice(0, proj.moduleCount);
        bestDim = { mw, mh };
        break;
      } else if (placed.length > bestPlaced.length) {
        bestPlaced = placed;
        bestDim = { mw, mh };
      }
    }

    return {
      polygonStr,
      insetStr,
      minX,
      maxX,
      minY,
      maxY,
      modules: bestPlaced,
      bestDim,
    };
  }, [points, proj.obstacles, proj.moduleCount]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        className="w-full h-full max-h-[185px]"
        viewBox="0 0 360 175"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="cadDotGrid" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="7" cy="7" r="0.75" fill="#e2e8f0" />
          </pattern>
          <filter id="roofVectorShadow" x="-8%" y="-8%" width="116%" height="116%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.07" />
          </filter>
        </defs>

        {/* CAD Blueprint subtle dot grid */}
        <rect width="100%" height="100%" fill="url(#cadDotGrid)" opacity="0.65" />

        <g filter="url(#roofVectorShadow)">
          {/* User-drawn roof polygon */}
          <polygon
            points={polygonStr}
            fill="#ffffff"
            stroke="#64748b"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Setback boundary (garis sempadan) */}
          <polygon
            points={insetStr}
            fill="#f8fafc"
            fillOpacity="0.5"
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 2.5"
          />

          {/* Solar PV Modules */}
          {modules.map((m, idx) => (
            <g key={`module-${idx}`}>
              <rect
                x={m.x}
                y={m.y}
                width={bestDim.mw}
                height={bestDim.mh}
                rx="1.5"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="0.5"
              />
              <line
                x1={m.x + bestDim.mw / 2}
                y1={m.y}
                x2={m.x + bestDim.mw / 2}
                y2={m.y + bestDim.mh}
                stroke="#1e293b"
                strokeWidth="0.4"
              />
              <line
                x1={m.x}
                y1={m.y + bestDim.mh / 2}
                x2={m.x + bestDim.mw}
                y2={m.y + bestDim.mh / 2}
                stroke="#1e293b"
                strokeWidth="0.4"
              />
              <rect
                x={m.x + 1}
                y={m.y + 1}
                width={Math.max(1, bestDim.mw - 2)}
                height="1"
                fill="#f59e0b"
                opacity="0.75"
              />
            </g>
          ))}

          {/* Obstacles with keep-out clearance safety buffer */}
          {proj.obstacles.map((obs) => {
            const ox = 36 + (obs.xPct / 100) * 288;
            const oy = 18 + (obs.yPct / 100) * 140;
            const isRed = obs.type === "hvac" || obs.type === "tank";

            return (
              <g key={obs.name} transform={`translate(${ox}, ${oy})`}>
                {/* Keep-out buffer zone */}
                <rect
                  x="-18"
                  y="-15"
                  width="36"
                  height="30"
                  rx="4"
                  fill={isRed ? "#fff1f2" : "#f0f9ff"}
                  fillOpacity="0.8"
                  stroke={isRed ? "#fb7185" : "#38bdf8"}
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
                {/* Inner obstacle badge */}
                <rect
                  x="-13"
                  y="-10.5"
                  width="26"
                  height="21"
                  rx="3"
                  fill={isRed ? "#ffe4e6" : "#e0f2fe"}
                  stroke={isRed ? "#f43f5e" : "#0284c7"}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fontSize="6.5"
                  fontWeight="700"
                  fill={isRed ? "#9f1239" : "#0369a1"}
                >
                  {obs.name}
                </text>
                <text
                  x="0"
                  y="20"
                  textAnchor="middle"
                  fontSize="5.5"
                  fontWeight="600"
                  fill={isRed ? "#e11d48" : "#0284c7"}
                  letterSpacing="0.02em"
                >
                  buffer 0.5m
                </text>
              </g>
            );
          })}

          {/* Setback label */}
          <text
            x={minX + 8}
            y={maxY - 5}
            fontSize="6.5"
            fontWeight="600"
            fill="#64748b"
            letterSpacing="0.02em"
          >
            Setback 0.5m
          </text>
        </g>

        {/* Dimension annotation lines */}
        <g stroke="#94a3b8" strokeWidth="0.8" opacity="0.9">
          <line x1={minX} y1="9" x2={maxX} y2="9" />
          <line x1={minX} y1="6" x2={minX} y2="12" />
          <line x1={maxX} y1="6" x2={maxX} y2="12" />
          <text
            x={(minX + maxX) / 2}
            y="7.5"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="600"
            fill="#64748b"
          >
            {proj.ridgeM} m
          </text>

          <line x1="22" y1={minY} x2="22" y2={maxY} />
          <line x1="19" y1={minY} x2="25" y2={minY} />
          <line x1="19" y1={maxY} x2="25" y2={maxY} />
          <text
            x="19"
            y={(minY + maxY) / 2}
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="600"
            fill="#64748b"
            transform={`rotate(-90 19 ${(minY + maxY) / 2})`}
          >
            {proj.slopeM} m
          </text>
        </g>

        {/* CAD Vector Vertices (Control points created by user) */}
        {points.map(([x, y], idx) => (
          <g key={`vertex-${idx}`} className="cursor-pointer">
            <circle cx={x} cy={y} r="4.5" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
            <circle cx={x} cy={y} r="1.8" fill="#2563eb" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Compact rupiah, e.g. "Rp 2,0 jt" / "Rp 612 jt". */
function formatJt(value: number): string {
  const jt = value / 1_000_000;
  return `Rp ${jt >= 100 ? Math.round(jt) : jt.toFixed(1).replace(".", ",")} jt`;
}

function CardHeader({
  title,
  subtitle,
  onAction,
  actionLabel,
}: {
  title: string;
  subtitle: ReactNode;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-[13px] font-medium text-slate-900 leading-tight">{title}</h3>
        <div className="text-[13px] text-slate-400 leading-tight mt-0.5 truncate">{subtitle}</div>
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          title={actionLabel}
          aria-label={actionLabel}
          className="w-7 h-7 -mr-1.5 -mt-1 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      )}
    </div>
  );
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasToken = useHasToken();
  const biodata = useStoredBiodata();

  const tabParam = searchParams.get("tab") as DashboardNavTab | null;
  const [activeTab, setActiveTabState] = useState<DashboardNavTab>(
    tabParam === "history" || tabParam === "calculator" ? tabParam : "overview"
  );

  // Sync tab state when the ?tab= URL param changes (adjust state during render, no effect)
  const [prevTabParam, setPrevTabParam] = useState(tabParam);
  if (tabParam !== prevTabParam) {
    setPrevTabParam(tabParam);
    if (tabParam === "overview" || tabParam === "history" || tabParam === "calculator") {
      setActiveTabState(tabParam);
    }
  }

  const setActiveTab = useCallback((tab: DashboardNavTab) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "overview") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(SAVED_PROJECTS[0].id);
  const [shapeFilter, setShapeFilter] = useState<string>("all");
  const [proposalOpen, setProposalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Interactive Location & Geolocation States
  const [activeLocation, setActiveLocation] = useState({
    name: "Kota Bogor, Jawa Barat",
    district: "Bogor Tengah",
    lat: -6.5950,
    lng: 106.7972,
    irradiance: 4.85,
    source: "Default Regional" as "GPS" | "Search" | "Map" | "Default Regional",
  });
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 3200);
  }, []);

  function handleUseGps() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      showToast("Browser tidak mendukung sensor GPS.");
      return;
    }
    setIsGpsLoading(true);
    showToast("Mengakses sensor GPS perangkat...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        const { latitude, longitude } = pos.coords;
        setActiveLocation({
          name: `Titik GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          district: "Lokasi GPS Terdeteksi",
          lat: Number(latitude.toFixed(6)),
          lng: Number(longitude.toFixed(6)),
          irradiance: 4.88,
          source: "GPS",
        });
        showToast(`📍 Lokasi GPS terdeteksi: Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`);
      },
      (err) => {
        setIsGpsLoading(false);
        showToast(`Gagal mendeteksi GPS: ${err.message}. Tetap di Kota Bogor.`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  // Calculator State
  const [calcMonthlyBill, setCalcMonthlyBill] = useState(2500000);
  const [calcTariff, setCalcTariff] = useState(1699.53);

  const openProjectInStudio = useCallback(
    (proj: SavedRoofProject) => {
      setSelectedProjectId(proj.id);
      const params = new URLSearchParams({
        proj: proj.id,
        name: proj.name,
        lat: String(proj.lat),
        lng: String(proj.lng),
        ridge: String(proj.ridgeM),
        slope: String(proj.slopeM),
        tilt: String(proj.tiltDeg),
        rot: String(proj.rotationDeg),
        shape: proj.roofShape,
        power: String(proj.modulePower),
      });
      router.push(`/studio?${params.toString()}`);
    },
    [router]
  );

  const initials = biodata?.name
    ? biodata.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : "MR";

  // Active Project for Bento display
  const activeProj = useMemo(() => {
    return SAVED_PROJECTS.find((p) => p.id === selectedProjectId) || SAVED_PROJECTS[0];
  }, [selectedProjectId]);

  // Filtered projects for history list
  const filteredProjects = useMemo(() => {
    return SAVED_PROJECTS.filter((p) => {
      const matchQuery =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.district.toLowerCase().includes(searchQuery.toLowerCase());

      const matchShape = shapeFilter === "all" || p.roofShape === shapeFilter;

      return matchQuery && matchShape;
    });
  }, [searchQuery, shapeFilter]);

  // Dynamic Calculator Metrics
  const calcMetrics = useMemo(() => {
    const monthlyKwh = calcMonthlyBill / calcTariff;
    const recommendedKwp = Math.min(20, Math.max(2, Number(((monthlyKwh / 30 / 3.8) * 0.85).toFixed(1))));
    const annualProdKwh = Math.round(recommendedKwp * 1420);
    const estimatedMonthlySavings = Math.min(calcMonthlyBill * 0.85, Math.round((annualProdKwh / 12) * calcTariff));
    const totalCapex = recommendedKwp * 12_500_000;
    const paybackYears = Number((totalCapex / (estimatedMonthlySavings * 12)).toFixed(1));
    const cumulative25Years = estimatedMonthlySavings * 12 * 25 - totalCapex;
    const co2Ton = Number(((annualProdKwh * 0.8) / 1000).toFixed(1));
    const trees = Math.round(annualProdKwh * 0.036);

    return {
      monthlyKwh,
      recommendedKwp,
      annualProdKwh,
      estimatedMonthlySavings,
      totalCapex,
      paybackYears,
      cumulative25Years,
      co2Ton,
      trees,
    };
  }, [calcMonthlyBill, calcTariff]);

  // Mock Result & Params for Proposal Export Modal
  const simulationResultForModal: SimulationResult = {
    geometry: {
      roof_width_m: activeProj.ridgeM,
      roof_length_m: activeProj.slopeM,
      total_area_sqm: activeProj.ridgeM * activeProj.slopeM,
      effective_area_sqm: (activeProj.ridgeM - 1.0) * (activeProj.slopeM - 1.1),
    },
    layout: {
      max_slots: activeProj.moduleCount + 4,
      installed: activeProj.moduleCount,
      rows: 2,
      columns: Math.ceil(activeProj.moduleCount / 2),
      module_area_sqm: 2.56,
      density_ratio: 0.78,
    },
    energy: {
      capacity_kwp: activeProj.capacityKwp,
      annual_production_kwh: activeProj.annualProdMwh * 1000,
      daily_irradiance_kwh_per_sqm: 4.85,
      incidence_factor: 0.98,
      performance_ratio: 0.8,
      irradiance_source: "NASA POWER Climatology (Kota Bogor)",
      irradiance_period: "2024",
    },
    finance: {
      capex_total_idr: activeProj.capacityKwp * 12_500_000,
      capex_breakdown: {
        modules_idr: activeProj.capacityKwp * 6_500_000,
        inverter_idr: activeProj.capacityKwp * 2_500_000,
        racking_idr: activeProj.capacityKwp * 1_500_000,
        installation_idr: activeProj.capacityKwp * 2_000_000,
      },
      monthly_saving_idr: activeProj.monthlySavingIdr,
      annual_saving_idr: activeProj.monthlySavingIdr * 12,
      payback_years: activeProj.paybackYears,
      tariff_key: "R2",
      tariff_label: "R-2 / 3.500-5.500 VA (PLN)",
      tariff_idr_per_kwh: 1699.53,
      monthly_bill_idr: calcMonthlyBill,
      co2_reduction_kg_per_year: activeProj.co2ReductionTon * 1000,
      trees_equivalent: activeProj.treesCount,
    },
  };

  const simulationParamsForModal: SimulationParameters = {
    setback_m: 0.5,
    gutter_m: 0.6,
    tilt_deg: activeProj.tiltDeg,
    azimuth_deg: 188,
    module_key: `module_${activeProj.modulePower}`,
    orientation: "portrait",
    clearance_m: 0.02,
    panel_count: activeProj.moduleCount,
    inverter_type: "string",
    monthly_bill_idr: calcMonthlyBill,
    tariff_key: "R2",
  };

  // Active Tree count for Eco-Forest diorama:
  // Dynamically maps treesCount (300..700+) to distinct active tree counts (9..18)
  // so each project in the saved list has an immediate, noticeable change of 3+ trees.
  const activeTreeCount = useMemo(() => {
    const count = activeProj.treesCount;
    if (count <= 420) return 9; // e.g. Taman Yasmin (380 pohon) -> 9 pohon
    if (count <= 505) return 12; // e.g. Bantarjati (490 pohon) -> 12 pohon (+3 pohon)
    if (count <= 580) return 15; // e.g. Menteng Residence (523 pohon) -> 15 pohon (+3 pohon)
    return 18; // e.g. Baranangsiang Indah (630 pohon) -> 18 pohon (+3 pohon)
  }, [activeProj.treesCount]);

  if (!hasToken) {
    return <LandingView />;
  }

  const lifetimeSaving = activeProj.monthlySavingIdr * 12 * 25;
  const roofScore = Math.min(99, Math.round(100 - activeProj.paybackYears * 2.5));

  const navItems: { id: DashboardNavTab; label: string; icon: string }[] = [
    { id: "overview", label: "Beranda", icon: "grid_view" },
    { id: "history", label: "Riwayat", icon: "history" },
    { id: "calculator", label: "Kalkulator", icon: "calculate" },
  ];

  const navPillClass = (active: boolean) =>
    `h-11 px-5 rounded-full text-sm font-medium flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 ${
      active
        ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_10px_rgba(245,158,11,0.22),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
        : "bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
    }`;

  const navPills = (
    <>
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setActiveTab(item.id)}
          className={navPillClass(activeTab === item.id)}
        >
          <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
          {item.label}
        </button>
      ))}
      <Link href="/studio" className={navPillClass(false)}>
        <span className="material-symbols-outlined text-[18px]">polyline</span>
        Studio
      </Link>
    </>
  );

  const stats = [
    {
      title: "Kapasitas",
      subtitle: "Sistem panel",
      value: String(activeProj.capacityKwp),
      unit: "kWp",
      badge: `${activeProj.moduleCount} panel`,
      tone: "bg-slate-100 text-slate-600",
    },
    {
      title: "Tagihan",
      subtitle: "Lebih hemat",
      value: "85",
      unit: "%",
      badge: `−${formatJt(activeProj.monthlySavingIdr)}`,
      tone: "bg-amber-100 text-amber-800",
    },
    {
      title: "Balik modal",
      subtitle: "Estimasi",
      value: String(activeProj.paybackYears),
      unit: "thn",
      badge: `+${formatJt(lifetimeSaving)}`,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Emisi CO₂",
      subtitle: "Berkurang per tahun",
      value: String(activeProj.co2ReductionTon),
      unit: "ton",
      badge: `${activeProj.treesCount} pohon`,
      tone: "bg-sky-100 text-sky-700",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#EFF1F4] text-slate-900 font-sans antialiased relative overflow-hidden">
      {/* Ambient soft glow radiant kuning & aksen biru */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-36 left-1/4 w-[560px] h-[560px] rounded-full bg-gradient-to-br from-amber-300/35 via-yellow-200/25 to-transparent blur-[130px]" />
        <div className="absolute top-1/4 -right-24 w-[520px] h-[520px] rounded-full bg-gradient-to-bl from-sky-300/30 via-cyan-100/20 to-transparent blur-[140px]" />
        <div className="absolute bottom-12 left-10 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-amber-200/30 via-sky-200/20 to-transparent blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-3 sm:px-5 pb-8">
        {/* =======================================================
            TOP NAVIGATION (logo, search, pill tabs, profile)
            ======================================================= */}
        <header className="relative z-30 flex items-center justify-between gap-3 pt-4 sm:pt-5">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="w-11 h-11 rounded-full bg-white flex items-center justify-center hover:bg-slate-50 transition"
              title="SunSight"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.svg" alt="SunSight" className="w-6 h-6 object-contain" />
            </Link>

            {/* Search (popover with GPS & map inside) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
                  searchOpen ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
                aria-label="Cari proyek"
                aria-expanded={searchOpen}
              >
                <span className="material-symbols-outlined text-[20px]">{searchOpen ? "close" : "search"}</span>
              </button>

              {searchOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Tutup pencarian"
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setSearchOpen(false)}
                  />
                  <div className="absolute left-0 top-14 z-40 w-[min(400px,calc(100vw-1.5rem))] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] p-2.5 animate-fadeIn">
                    <div className="flex items-center gap-1.5 h-11 pl-3.5 pr-1.5 rounded-2xl bg-slate-100">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
                      <input
                        autoFocus
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari proyek atau alamat"
                        className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none border-0 border-none focus:ring-0 p-0"
                      />
                      <button
                        type="button"
                        onClick={handleUseGps}
                        disabled={isGpsLoading}
                        title="Gunakan lokasi GPS"
                        className="w-8 h-8 rounded-xl hover:bg-white text-slate-600 hover:text-amber-600 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                      >
                        <span className={`material-symbols-outlined text-[18px] ${isGpsLoading ? "animate-spin" : ""}`}>
                          {isGpsLoading ? "sync" : "my_location"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setMapPickerOpen(true);
                        }}
                        title="Pilih di peta"
                        className="w-8 h-8 rounded-xl hover:bg-white text-slate-600 hover:text-amber-600 flex items-center justify-center transition cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">map</span>
                      </button>
                    </div>

                    <p className="flex items-center gap-1 px-2 pt-2.5 pb-1 text-[11px] text-slate-400 truncate">
                      <span className="material-symbols-outlined text-[13px]">location_on</span>
                      <span className="truncate">{activeLocation.name}</span>
                    </p>

                    <div className="max-h-72 overflow-y-auto">
                      {filteredProjects.length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-slate-400">Tidak ada hasil</p>
                      ) : (
                        filteredProjects.map((proj) => {
                          const isCurrent = proj.id === selectedProjectId;
                          return (
                            <button
                              key={proj.id}
                              type="button"
                              onClick={() => {
                                setSelectedProjectId(proj.id);
                                setActiveTab("overview");
                                setSearchOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition cursor-pointer ${
                                isCurrent
                                  ? "bg-gradient-to-r from-amber-100/90 via-amber-200/80 to-amber-100/90 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs"
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                  isCurrent ? "bg-amber-300/80 text-amber-950" : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[18px]">roofing</span>
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm font-semibold truncate text-slate-900">{proj.name}</span>
                                <span className="block text-xs text-slate-400 truncate">{proj.address}</span>
                              </span>
                              <span className="text-xs font-semibold text-slate-700 shrink-0">{proj.capacityKwp} kWp</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2" aria-label="Navigasi utama">
            {navPills}
          </nav>

          <Link
            href="/profile"
            className="flex items-center gap-2.5 h-12 pl-1.5 pr-1.5 sm:pr-4 rounded-full bg-white hover:bg-slate-50 transition"
            title="Profil & akun"
          >
            <span className="w-9 h-9 rounded-full bg-amber-200 text-amber-950 text-xs font-semibold flex items-center justify-center">
              {initials}
            </span>
            <span className="hidden sm:block leading-tight">
              <span className="block text-sm font-medium text-slate-900 max-w-[140px] truncate">
                {biodata?.name || "Muhammad Raditya"}
              </span>
              <span className="block text-[11px] text-slate-400">Lihat profil</span>
            </span>
          </Link>
        </header>

        {/* Mobile pill navigation */}
        <nav
          className="md:hidden flex items-center gap-2 overflow-x-auto pt-3 pb-1 -mx-3 px-3 [scrollbar-width:none]"
          aria-label="Navigasi utama"
        >
          {navPills}
        </nav>

        <main className="pt-3 sm:pt-4 space-y-6">
        {/* =====================================================
            TAB 1: BERANDA (Bento dashboard)
            ===================================================== */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 animate-fadeIn">
            {/* Card A — Proyek aktif */}
            <section className="xl:col-span-4 h-[260px] bg-white rounded-[22px] p-5 flex flex-col justify-between relative overflow-hidden">
              <CardHeader
                title="Proyek aktif"
                subtitle={activeProj.name}
                onAction={() => openProjectInStudio(activeProj)}
                actionLabel="Buka di Studio"
              />

              <h2 className="relative text-[26px] sm:text-[30px] font-medium leading-[1.15] tracking-tight text-slate-900 max-w-[13ch]">
                Ubah atap jadi sumber listrik.
              </h2>

              <div className="absolute right-5 bottom-14 flex flex-col items-end pointer-events-none select-none">
                <span className="-rotate-[14deg] inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 border border-amber-300 text-amber-800 text-xs font-medium shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  Hemat
                </span>
                <span className="-rotate-[6deg] -mt-0.5 translate-x-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-100 border border-sky-300 text-sky-800 text-xs font-medium shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">solar_power</span>
                  Mandiri
                </span>
                <span className="-rotate-[10deg] -mt-0.5 -translate-x-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">eco</span>
                  Bersih
                </span>
              </div>
            </section>

            {/* Card B — Tata Letak Atap */}
            <section className="xl:col-span-4 h-[260px] bg-white rounded-[22px] p-5 flex flex-col justify-between relative overflow-hidden shadow-2xs">
              <div className="relative z-10 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-slate-900 leading-tight">Tata letak atap</p>
                  <p className="text-[12px] text-slate-400 leading-tight mt-0.5">
                    {activeProj.dimensions} · {activeProj.capacityKwp} kWp
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[24px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-none whitespace-nowrap">
                    {activeProj.moduleCount}{" "}
                    <span className="text-sm font-semibold text-slate-500">panel</span>
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {activeProj.effectiveAreaPct}% area efektif
                  </p>
                </div>
              </div>

              {/* Roof visual directly on card canvas (no nested box container, full height available) */}
              <div className="w-full flex-1 min-h-0 relative flex items-center justify-center pt-1">
                <RoofGridCardVisual proj={activeProj} />
              </div>
            </section>

            {/* Card C — Dampak Ekologis (Full container eco-forest with breeze & falling leaves) */}
            <section className="md:col-span-2 xl:col-span-4 h-[260px] rounded-[22px] bg-gradient-to-b from-sky-200/90 via-sky-100/60 to-emerald-100/85 border border-sky-100/90 p-5 flex flex-col justify-between relative overflow-hidden shadow-2xs">
              <div className="relative z-10 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-sky-950/70 leading-tight">Dampak ekologis</p>
                  <p className="text-[12px] text-sky-900/60 leading-tight mt-0.5">reduksi emisi setara</p>
                </div>
                <div className="text-right">
                  <p className="text-[24px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-none whitespace-nowrap">
                    {activeProj.treesCount.toLocaleString("id-ID")}{" "}
                    <span className="text-sm font-semibold text-slate-500">pohon</span>
                  </p>
                </div>
              </div>

              {/* Full-bleed interactive landscape: 55% sky, 45% rolling hills with trees, moving clouds & windblown falling leaves */}
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 260">
                  <defs>
                    <linearGradient id="hillGradBackHome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#bbf7d0" />
                      <stop offset="100%" stopColor="#86efac" />
                    </linearGradient>
                    <linearGradient id="hillGradMidHome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>
                    <linearGradient id="hillGradFrontHome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                  </defs>

                  {/* 5 Fluffy drifting clouds across altitudes (from top of sky to horizon) */}
                  <g className="eco-cloud-top-1">
                    <path
                      d="M -30,0 Q -22,-9 -10,-4 Q 0,-12 14,-4 Q 24,-8 30,0 L -34,0 Z"
                      fill="#ffffff"
                      opacity="0.95"
                    />
                  </g>
                  <g className="eco-cloud-top-2">
                    <path
                      d="M -22,0 Q -16,-7 -6,-3 Q 0,-9 10,-3 Q 18,-6 24,0 L -26,0 Z"
                      fill="#ffffff"
                      opacity="0.88"
                    />
                  </g>
                  <g className="eco-cloud-mid-1">
                    <path
                      d="M -34,0 Q -25,-10 -12,-4 Q 2,-14 16,-4 Q 28,-9 36,0 L -38,0 Z"
                      fill="#ffffff"
                      opacity="0.92"
                    />
                  </g>
                  <g className="eco-cloud-mid-2">
                    <path
                      d="M -26,0 Q -18,-7 -8,-3 Q 2,-10 12,-3 Q 20,-6 26,0 L -28,0 Z"
                      fill="#ffffff"
                      opacity="0.85"
                    />
                  </g>
                  <g className="eco-cloud-low-1">
                    <path
                      d="M -20,0 Q -14,-6 -6,-2 Q 0,-7 8,-2 Q 14,-5 18,0 L -22,0 Z"
                      fill="#ffffff"
                      opacity="0.8"
                    />
                  </g>

                  {/* Sun with pulsing halo - positioned comfortably below the '523 pohon' header */}
                  <g transform="translate(330, 84)">
                    <circle cx="0" cy="0" r="18" fill="#fef08a" className="eco-sun-halo" />
                    <circle cx="0" cy="0" r="10" fill="#fde047" opacity="0.9" />
                    <circle cx="0" cy="0" r="6" fill="#f59e0b" />
                  </g>

                  {/* Back Hill (~55% sky, 45% land; base starts at Y=152) */}
                  <path d="M 0 152 Q 100 134, 200 146 T 400 138 L 400 260 L 0 260 Z" fill="url(#hillGradBackHome)" opacity="0.88" />
                  <g>
                    {ECO_TREE_CONFIGS.filter((t) => t.layer === "back").map((cfg) => {
                      const isSprouted = cfg.growRank <= activeTreeCount;
                      return (
                        <g key={cfg.id} transform={`translate(${cfg.x}, ${cfg.y}) scale(${cfg.scale})`}>
                          <g
                            className={`eco-tree-stem ${isSprouted ? "sprouted" : "dormant"}`}
                            style={{ transitionDelay: isSprouted ? `${((cfg.growRank - 1) % 4) * 70}ms` : "0ms" }}
                          >
                            <g className={`eco-breeze-${(cfg.id % 3) + 1}`}>
                              {renderTreeSvg(cfg.type)}
                            </g>
                          </g>
                        </g>
                      );
                    })}
                  </g>

                  {/* Mid Hill (crest around Y=168..178) */}
                  <path d="M 0 178 Q 95 158, 195 172 T 400 164 L 400 260 L 0 260 Z" fill="url(#hillGradMidHome)" opacity="0.95" />
                  <g>
                    {ECO_TREE_CONFIGS.filter((t) => t.layer === "mid").map((cfg) => {
                      const isSprouted = cfg.growRank <= activeTreeCount;
                      return (
                        <g key={cfg.id} transform={`translate(${cfg.x}, ${cfg.y}) scale(${cfg.scale})`}>
                          <g
                            className={`eco-tree-stem ${isSprouted ? "sprouted" : "dormant"}`}
                            style={{ transitionDelay: isSprouted ? `${((cfg.growRank - 1) % 4) * 70}ms` : "0ms" }}
                          >
                            <g className={`eco-breeze-${(cfg.id % 3) + 1}`}>
                              {renderTreeSvg(cfg.type)}
                            </g>
                          </g>
                        </g>
                      );
                    })}
                  </g>

                  {/* Front Hill (crest around Y=196..208) */}
                  <path d="M 0 208 Q 115 190, 225 202 T 400 196 L 400 260 L 0 260 Z" fill="url(#hillGradFrontHome)" />
                  <g>
                    {ECO_TREE_CONFIGS.filter((t) => t.layer === "front").map((cfg) => {
                      const isSprouted = cfg.growRank <= activeTreeCount;
                      return (
                        <g key={cfg.id} transform={`translate(${cfg.x}, ${cfg.y}) scale(${cfg.scale})`}>
                          <g
                            className={`eco-tree-stem ${isSprouted ? "sprouted" : "dormant"}`}
                            style={{ transitionDelay: isSprouted ? `${((cfg.growRank - 1) % 4) * 70}ms` : "0ms" }}
                          >
                            <g className={`eco-breeze-${(cfg.id % 3) + 1}`}>
                              {renderTreeSvg(cfg.type)}
                            </g>
                          </g>
                        </g>
                      );
                    })}
                  </g>

                  {/* 5 Wind-blown Falling Leaves dropping from across top ceiling and drifting diagonally down-left */}
                  <g className="pointer-events-none">
                    <g className="eco-falling-leaf-1">
                      <path d="M 0,-4 C 4,-4 6,-1 5,3 C 3,5 -1,4 -3,1 C -4,-1 -1,-4 0,-4 Z" fill="#059669" opacity="0.9" />
                      <line x1="0" y1="-2.5" x2="1" y2="2.5" stroke="#047857" strokeWidth="0.6" />
                    </g>
                    <g className="eco-falling-leaf-2">
                      <path d="M 0,-4.5 C 4.5,-4.5 6,-2 5,3 C 2.5,5.5 -2,4.5 -3.5,2 C -4.5,-2 -1.5,-4.5 0,-4.5 Z" fill="#10b981" opacity="0.9" />
                      <line x1="0" y1="-3" x2="1" y2="2.5" stroke="#065f46" strokeWidth="0.6" />
                    </g>
                    <g className="eco-falling-leaf-3">
                      <path d="M 0,-3.5 C 3.5,-3.5 5,-1 4,2.5 C 2,4.5 -1,3.5 -2.2,1.2 C -3.5,-1 -1,-3.5 0,-3.5 Z" fill="#34d399" opacity="0.85" />
                      <line x1="0" y1="-2.2" x2="0.8" y2="1.8" stroke="#047857" strokeWidth="0.5" />
                    </g>
                    <g className="eco-falling-leaf-4">
                      <path d="M 0,-4 C 4,-4 5.5,-1.5 4.5,2.5 C 2.2,5 -1.5,4 -2.8,1.5 C -4,-1.5 -1,-4 0,-4 Z" fill="#15803d" opacity="0.88" />
                      <line x1="0" y1="-2.5" x2="0.7" y2="2" stroke="#14532d" strokeWidth="0.5" />
                    </g>
                    <g className="eco-falling-leaf-5">
                      <path d="M 0,-3.8 C 3.8,-3.8 5.2,-1.2 4.2,2.2 C 2,4.2 -1.2,3.2 -2.5,1 C -3.8,-1.2 -1,-3.8 0,-3.8 Z" fill="#22c55e" opacity="0.85" />
                      <line x1="0" y1="-2.4" x2="0.7" y2="1.7" stroke="#15803d" strokeWidth="0.5" />
                    </g>
                  </g>
                </svg>
              </div>
            </section>

            {/* Stats — 2×2 small cards */}
            <div className="md:col-span-2 xl:col-span-4 grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <section
                  key={s.title}
                  className="h-[170px] sm:h-[186px] bg-white rounded-[22px] p-5 flex flex-col justify-between"
                >
                  <CardHeader title={s.title} subtitle={s.subtitle} />
                  <div className="flex items-end gap-2 flex-wrap">
                    <span className="text-[36px] sm:text-[42px] font-medium tracking-tight leading-none text-slate-900">
                      {s.value}
                      <span className="ml-1 text-base font-normal text-slate-400">{s.unit}</span>
                    </span>
                    <span className={`mb-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap ${s.tone}`}>
                      {s.badge}
                    </span>
                  </div>
                </section>
              ))}
            </div>

            {/* Projects list + map */}
            <section className="md:col-span-2 xl:col-span-8 bg-white rounded-[22px] p-3 grid grid-cols-1 lg:grid-cols-2 gap-3 xl:h-[384px]">
              <div className="flex flex-col p-2 min-h-0">
                <CardHeader
                  title="Proyek"
                  subtitle={`${SAVED_PROJECTS.length} tersimpan`}
                  onAction={() => setActiveTab("history")}
                  actionLabel="Lihat semua proyek"
                />

                <ul className="mt-3 space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
                  {SAVED_PROJECTS.map((proj, idx) => {
                    const active = proj.id === selectedProjectId;
                    return (
                      <li key={proj.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedProjectId(proj.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedProjectId(proj.id);
                            }
                          }}
                          className={`relative overflow-hidden flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                            active
                              ? "bg-gradient-to-r from-amber-100/75 via-amber-50/40 to-white border-transparent"
                              : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-900 hover:bg-slate-50/60"
                          }`}
                        >
                          {/* Soft round bubbles: amber in top-left, sky blue in bottom-right */}
                          {active && (
                            <>
                              <div className="pointer-events-none absolute -top-6 -left-6 w-20 h-20 rounded-full bg-amber-200/60 blur-lg" />
                              <div className="pointer-events-none absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-sky-200/60 blur-lg" />
                            </>
                          )}

                          <span
                            className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              active ? "bg-amber-200/90 text-amber-950 font-bold" : PROJECT_TONES[idx % PROJECT_TONES.length]
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">roofing</span>
                          </span>
                          <span className="relative z-10 flex-1 min-w-0">
                            <span className="block text-[13px] font-semibold truncate text-slate-900">{proj.name}</span>
                            <span className="block text-[11px] text-slate-500 truncate">
                              {proj.date} · {proj.district}
                            </span>
                          </span>
                          <span className="relative z-10 text-right shrink-0">
                            <span className="block text-[13px] font-bold text-slate-900">{proj.capacityKwp} kWp</span>
                            <span
                              className={`flex items-center justify-end gap-0.5 text-[11px] font-medium ${
                                active ? "text-amber-700 font-semibold" : "text-emerald-600 font-medium"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                              {proj.annualProdMwh} MWh
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openProjectInStudio(proj);
                            }}
                            title="Buka di Studio"
                            aria-label={`Buka ${proj.name} di Studio`}
                            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition cursor-pointer ${
                              active ? "bg-amber-400 hover:bg-amber-500 text-amber-950 shadow-xs" : "hover:bg-slate-100 text-slate-500"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">arrow_outward</span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Real Leaflet Map of Kota Bogor */}
              <div className="relative min-h-[300px] h-full rounded-[18px] overflow-hidden">
                <BogorProjectsMap
                  projects={SAVED_PROJECTS}
                  selectedProjectId={selectedProjectId}
                  onSelectProject={setSelectedProjectId}
                  roofScore={roofScore}
                  irradiance={activeLocation.irradiance}
                />
              </div>
            </section>
          </div>
        )}

        {/* =====================================================
            TAB 2: RIWAYAT POLIGON & DESAIN ATAP
            ===================================================== */}
        {activeTab === "history" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Top Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-[22px] p-3.5 shadow-xs">
              <div className="flex items-center gap-2 pl-2">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">history</span>
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 leading-tight">Riwayat Proyek</h2>
                  <p className="text-[11px] text-slate-400 leading-tight">{SAVED_PROJECTS.length} rancangan atap tersimpan</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Shape Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs">
                  {[
                    { id: "all", label: "Semua" },
                    { id: "rectangle", label: "Pelana" },
                    { id: "l-shape", label: "Sudut L" },
                    { id: "hip", label: "Limasan" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setShapeFilter(s.id)}
                      className={`h-7 px-3.5 rounded-full text-xs transition cursor-pointer ${
                        shapeFilter === s.id
                          ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                          : "text-slate-500 hover:text-slate-900 font-medium"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Quick Search */}
                <div className="relative w-48 sm:w-56">
                  <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari proyek atau alamat..."
                    className="w-full h-9 pl-8 pr-3 rounded-full bg-slate-100 text-xs text-slate-900 placeholder:text-slate-400 outline-none border-0 border-none focus:ring-0"
                  />
                </div>

                {/* Add New Studio Link */}
                <Link
                  href="/studio"
                  className="h-9 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Proyek Baru</span>
                </Link>
              </div>
            </div>

            {/* Project Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProjects.length === 0 ? (
                <div className="md:col-span-2 bg-white rounded-[22px] p-10 text-center text-slate-400 text-sm shadow-xs">
                  Tidak ada proyek yang sesuai dengan pencarian &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredProjects.map((proj, idx) => {
                  const isSelected = proj.id === selectedProjectId;
                  return (
                    <div
                      key={proj.id}
                      className={`relative overflow-hidden rounded-[22px] p-5 flex flex-col justify-between transition-all border ${
                        isSelected
                          ? "bg-gradient-to-br from-amber-50/90 via-white to-sky-50/30 border-amber-300/60 shadow-xs"
                          : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-900 shadow-xs"
                      }`}
                    >
                      {/* Soft round bubbles: amber in top-left, sky blue in bottom-right */}
                      {isSelected && (
                        <>
                          <div className="pointer-events-none absolute -top-8 -left-8 w-28 h-28 rounded-full bg-amber-200/50 blur-xl" />
                          <div className="pointer-events-none absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-sky-200/50 blur-xl" />
                        </>
                      )}

                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-amber-200/90 text-amber-950 font-bold shadow-2xs"
                                : PROJECT_TONES[idx % PROJECT_TONES.length]
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">roofing</span>
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-slate-900 truncate">{proj.name}</h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                {proj.statusBadge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{proj.address}</p>
                          </div>
                        </div>

                        <span className="text-[11px] font-medium text-slate-400 shrink-0">{proj.date}</span>
                      </div>

                      {/* Specs Row */}
                      <div className="relative z-10 grid grid-cols-3 gap-2 my-4 pt-3 border-t border-slate-100/80 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Dimensi</span>
                          <span className="font-medium text-slate-900 block truncate">{proj.dimensions}</span>
                          <span className="text-[10px] text-slate-400">{proj.shapeLabel}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Kapasitas</span>
                          <span className="font-semibold text-slate-900 tracking-tight block">{proj.capacityKwp} kWp</span>
                          <span className="text-[10px] text-slate-400">{proj.annualProdMwh} MWh/thn</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Penghematan</span>
                          <span className="font-semibold text-emerald-700 block">{formatJt(proj.monthlySavingIdr)}/bln</span>
                          <span className="text-[10px] text-slate-400">BEP {proj.paybackYears} thn</span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="relative z-10 flex items-center justify-between gap-2 pt-2 border-t border-slate-100/80">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setActiveTab("overview");
                          }}
                          className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                            isSelected
                              ? "bg-amber-400 text-amber-950 font-semibold"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {isSelected ? "Sedang Aktif" : "Tampilkan di Beranda"}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProjectId(proj.id);
                              setProposalOpen(true);
                            }}
                            className="h-8 px-3 rounded-full hover:bg-slate-100 text-slate-600 text-xs font-medium transition cursor-pointer"
                          >
                            Proposal PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => openProjectInStudio(proj)}
                            className="h-8 px-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                          >
                            <span>Buka Studio</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* =====================================================
            TAB 3: KALKULATOR TARIF & ANALISIS ROI
            ===================================================== */}
        {activeTab === "calculator" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Header Strip: Clean, focused, without redundant duplicate buttons */}
            <div className="bg-white rounded-[22px] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Kalkulator Finansial</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Estimasi penghematan listrik PLN, periode balik modal, dan proyeksi arus kas 25 tahun.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-950 border border-amber-200/80 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Tarif Subsidi &amp; Non-Subsidi PLN
                </span>
              </div>
            </div>

            {/* Main 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Left Column: Parameter Input (5 Cols) */}
              <section className="lg:col-span-5 bg-white rounded-[22px] p-5 flex flex-col justify-between shadow-xs space-y-4">
                <CardHeader
                  title="Parameter Listrik"
                  subtitle="Pilih golongan tarif dan pengeluaran bulanan"
                />

                {/* Tariff Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 block">Golongan Tarif PLN</label>
                  <select
                    value={calcTariff}
                    onChange={(e) => setCalcTariff(Number(e.target.value))}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-400 transition cursor-pointer"
                  >
                    <option value={1444.70}>R-1 / 900-2.200 VA (Rp 1.444,70/kWh)</option>
                    <option value={1699.53}>R-2 / 3.500-5.500 VA (Rp 1.699,53/kWh)</option>
                    <option value={1699.53}>R-3 / 6.600 VA ke atas (Rp 1.699,53/kWh)</option>
                    <option value={1444.70}>B-2 / Bisnis 6.600-200 kVA (Rp 1.444,70/kWh)</option>
                  </select>
                </div>

                {/* Monthly Bill Input & Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="calc-bill-input" className="font-medium text-slate-600">
                      Tagihan Listrik per Bulan
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1.5 transition">
                      <span className="text-slate-500 font-semibold text-xs">Rp</span>
                      <input
                        id="calc-bill-input"
                        type="number"
                        min={100000}
                        max={30000000}
                        step={50000}
                        value={calcMonthlyBill}
                        onChange={(e) => setCalcMonthlyBill(Math.max(100000, Number(e.target.value) || 0))}
                        className="w-24 text-right font-bold tracking-tight text-slate-900 text-xs bg-transparent outline-none border-0 border-none focus:ring-0 p-0"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="500000"
                    max="15000000"
                    step="100000"
                    value={calcMonthlyBill}
                    onChange={(e) => setCalcMonthlyBill(Number(e.target.value))}
                    aria-label="Penggeser tagihan"
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Rp 500 rb</span>
                    <span>Rp 7,5 jt</span>
                    <span>Rp 15 jt</span>
                  </div>
                </div>

                {/* System Recommendation Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/80 via-yellow-50/50 to-sky-50/60 border border-amber-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">
                      Rekomendasi Kapasitas
                    </span>
                    <span className="text-[11px] font-bold text-amber-800">
                      ~{Math.ceil(calcMetrics.recommendedKwp / 0.55)} panel
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">
                      {calcMetrics.recommendedKwp}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">kWp kapasitas ideal</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Menutupi ~85% konsumsi bulanan ({Math.round(calcMetrics.monthlyKwh)} kWh) dengan modul 550W.
                  </p>
                </div>

                {/* Primary CTA Studio CAD Button */}
                <Link
                  href="/studio"
                  className="w-full h-11 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[17px]">polyline</span>
                  <span>Buka Desain di Studio CAD</span>
                </Link>
              </section>

              {/* Right Column: 4 Metrics & Timeline (7 Cols) */}
              <div className="lg:col-span-7 space-y-3">
                {/* 4 Stat Cards in 2x2 Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <section className="bg-white rounded-[22px] p-5 flex flex-col justify-between shadow-xs h-[135px]">
                    <span className="text-[11px] text-slate-400 font-medium">Hemat Bulanan</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold tracking-tight text-emerald-700">
                        {formatJt(calcMetrics.estimatedMonthlySavings)}
                      </span>
                      <span className="text-xs text-slate-400">/bln</span>
                    </div>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md w-fit font-medium">
                      Hemat 85% tagihan
                    </span>
                  </section>

                  <section className="bg-white rounded-[22px] p-5 flex flex-col justify-between shadow-xs h-[135px]">
                    <span className="text-[11px] text-slate-400 font-medium">Balik Modal (BEP)</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold tracking-tight text-slate-900">
                        {calcMetrics.paybackYears}
                      </span>
                      <span className="text-xs text-slate-400">tahun</span>
                    </div>
                    <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md w-fit font-medium">
                      Impas di tahun ke-{Math.ceil(calcMetrics.paybackYears)}
                    </span>
                  </section>

                  <section className="bg-white rounded-[22px] p-5 flex flex-col justify-between shadow-xs h-[135px]">
                    <span className="text-[11px] text-slate-400 font-medium">Investasi Awal (Capex)</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold tracking-tight text-slate-900">
                        {formatJt(calcMetrics.totalCapex)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md w-fit font-medium">
                      Termasuk instalasi
                    </span>
                  </section>

                  <section className="bg-white rounded-[22px] p-5 flex flex-col justify-between shadow-xs h-[135px]">
                    <span className="text-[11px] text-slate-400 font-medium">Total Laba 25 Tahun</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold tracking-tight text-slate-900">
                        {formatJt(calcMetrics.cumulative25Years)}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md w-fit font-medium">
                      Keuntungan bersih
                    </span>
                  </section>
                </div>

                {/* 25-Year Timeline & Environmental Summary */}
                <section className="bg-white rounded-[22px] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Proyeksi Arus Kas 25 Tahun</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Estimasi imbal hasil investasi selama masa garansi modul surya</p>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      BEP Tahun ke-{Math.ceil(calcMetrics.paybackYears)}
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {[
                      { year: 1, label: "Tahun 1 · Fase Awal Investasi", returnPct: 25 },
                      { year: 3, label: `Tahun ${Math.ceil(calcMetrics.paybackYears)} · Titik Impas (BEP)`, returnPct: 100 },
                      { year: 10, label: "Tahun 10 · Laba Bersih Akumulatif", returnPct: 280 },
                      { year: 25, label: "Tahun 25 · Total Akumulasi Penghematan", returnPct: 550 },
                    ].map((item) => (
                      <div key={item.year} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 font-medium">{item.label}</span>
                          <span className="font-bold tracking-tight text-slate-900">+{item.returnPct}% ROI</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.returnPct >= 100 ? "bg-emerald-500" : "bg-amber-400"
                            }`}
                            style={{ width: `${Math.min(100, item.returnPct / 5.5)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Eco Stats & Primary Proposal Trigger */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-slate-600">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">park</span>
                        {calcMetrics.trees} pohon lestari
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[16px] text-sky-600">eco</span>
                        {calcMetrics.co2Ton} ton emisi CO₂ ditekan
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setProposalOpen(true)}
                      className="h-9 px-4 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:brightness-105 active:scale-95 text-amber-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                    >
                      <span className="material-symbols-outlined text-[15px] text-amber-950">picture_as_pdf</span>
                      <span>Unduh Proposal PDF</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* =======================================================
          5. INTERACTIVE MAP PICKER MODAL (Pilih Titik di Peta)
          ======================================================= */}
      {mapPickerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setMapPickerOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-[32px] border border-amber-200/80 shadow-2xl p-6 space-y-4 z-10 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shadow-2xs">
                  <span className="material-symbols-outlined text-[20px]">map</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Pilih Lokasi di Peta
                  </h3>
                  <p className="text-xs text-slate-500">
                    Klik titik wilayah di bawah atau pilih hotspot Kota Bogor
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMapPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Interactive Map Visual Stage */}
            <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-amber-200/70 shadow-inner bg-slate-100">
              {/* Satellite Background */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/satellite_map.jpg"
                alt="Peta Satelit Regional"
                className="w-full h-full object-cover opacity-80"
              />

              {/* Radial Fade Overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(15,23,42,0.6)_100%)] pointer-events-none" />

              {/* Clickable Hotspot Markers */}
              {BOGOR_MAP_SPOTS.map((spot) => {
                const isCurrent = activeLocation.name.includes(spot.name);
                return (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => {
                      setActiveLocation({
                        name: `${spot.name} (${spot.landmark})`,
                        district: spot.name,
                        lat: spot.lat,
                        lng: spot.lng,
                        irradiance: spot.irr,
                        source: "Map",
                      });
                      setMapPickerOpen(false);
                      showToast(`📍 Lokasi dipilih: ${spot.name} (${spot.lat}, ${spot.lng})`);
                    }}
                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all group cursor-pointer ${
                      isCurrent
                        ? "bg-amber-400 text-amber-950 scale-125 ring-4 ring-amber-300/50 z-20"
                        : "bg-white/90 hover:bg-amber-100 text-slate-800 hover:scale-110 shadow-md z-10"
                    }`}
                    title={`${spot.name} - ${spot.landmark}`}
                  >
                    <span className="material-symbols-outlined text-[14px] block">place</span>
                    
                    {/* Hover Tooltip */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-md text-slate-800 text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md border border-amber-200">
                      {spot.name} ({spot.irr} kWh/m²)
                    </span>
                  </button>
                );
              })}

              {/* Map Footer Indicator */}
              <div className="absolute bottom-2.5 left-3 px-3 py-1 rounded-lg bg-white/95 backdrop-blur-md text-[10px] font-medium text-slate-800 flex items-center gap-1.5 shadow-xs border border-amber-200/80">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Titik Aktif: {activeLocation.lat.toFixed(4)}, {activeLocation.lng.toFixed(4)}</span>
              </div>
            </div>

            {/* Quick Hotspot Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                Hotspot Kawasan Potensi Surya Bogor:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BOGOR_MAP_SPOTS.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => {
                      setActiveLocation({
                        name: `${spot.name} (${spot.landmark})`,
                        district: spot.name,
                        lat: spot.lat,
                        lng: spot.lng,
                        irradiance: spot.irr,
                        source: "Map",
                      });
                      setMapPickerOpen(false);
                      showToast(`📍 Lokasi dipilih: ${spot.name}`);
                    }}
                    className="p-2 rounded-xl text-left border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/70 transition cursor-pointer text-xs"
                  >
                    <span className="font-bold text-slate-900 block truncate">{spot.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{spot.landmark}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-xl text-slate-900 text-xs font-bold shadow-[0_12px_36px_rgba(245,158,11,0.2)] flex items-center gap-2.5 border border-amber-300 animate-fadeIn">
          <span className="material-symbols-outlined text-[19px] text-amber-600">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Proposal PDF Modal */}
      <ProposalModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        result={simulationResultForModal}
        parameters={simulationParamsForModal}
        latitude="-6.5950"
        longitude="106.7972"
        biodata={biodata}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[#F4F5F8]" />}>
      <HomePageContent />
    </Suspense>
  );
}
