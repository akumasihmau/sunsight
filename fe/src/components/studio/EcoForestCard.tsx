"use client";

import type { SimulationResult } from "@/lib/api";
import { decimal, integer } from "@/lib/format";

type Props = {
  result: SimulationResult;
};

type TreeDef = {
  id: number;
  x: number;
  y: number;
  scale: number;
  layer: "back" | "mid" | "front";
  foliage: string;
};

const DIORAMA_TREES: TreeDef[] = [
  // Back layer (8 trees)
  { id: 1, x: 24, y: 49, scale: 0.65, layer: "back", foliage: "#22c55e" },
  { id: 2, x: 64, y: 45, scale: 0.68, layer: "back", foliage: "#16a34a" },
  { id: 3, x: 105, y: 44, scale: 0.65, layer: "back", foliage: "#22c55e" },
  { id: 4, x: 148, y: 46, scale: 0.7, layer: "back", foliage: "#15803d" },
  { id: 5, x: 188, y: 47, scale: 0.66, layer: "back", foliage: "#22c55e" },
  { id: 6, x: 228, y: 45, scale: 0.68, layer: "back", foliage: "#16a34a" },
  { id: 7, x: 268, y: 43, scale: 0.65, layer: "back", foliage: "#22c55e" },
  { id: 8, x: 312, y: 41, scale: 0.68, layer: "back", foliage: "#15803d" },
  // Mid layer (8 trees)
  { id: 9, x: 38, y: 60, scale: 0.84, layer: "mid", foliage: "#15803d" },
  { id: 10, x: 82, y: 56, scale: 0.88, layer: "mid", foliage: "#166534" },
  { id: 11, x: 124, y: 57, scale: 0.85, layer: "mid", foliage: "#059669" },
  { id: 12, x: 168, y: 58, scale: 0.9, layer: "mid", foliage: "#15803d" },
  { id: 13, x: 208, y: 57, scale: 0.85, layer: "mid", foliage: "#166534" },
  { id: 14, x: 248, y: 55, scale: 0.88, layer: "mid", foliage: "#059669" },
  { id: 15, x: 288, y: 54, scale: 0.84, layer: "mid", foliage: "#15803d" },
  { id: 16, x: 324, y: 53, scale: 0.82, layer: "mid", foliage: "#166534" },
  // Front layer (8 trees)
  { id: 17, x: 18, y: 74, scale: 1.02, layer: "front", foliage: "#047857" },
  { id: 18, x: 58, y: 71, scale: 1.08, layer: "front", foliage: "#065f46" },
  { id: 19, x: 102, y: 70, scale: 1.04, layer: "front", foliage: "#047857" },
  { id: 20, x: 145, y: 71, scale: 1.1, layer: "front", foliage: "#064e3b" },
  { id: 21, x: 192, y: 72, scale: 1.05, layer: "front", foliage: "#047857" },
  { id: 22, x: 236, y: 71, scale: 1.08, layer: "front", foliage: "#065f46" },
  { id: 23, x: 278, y: 70, scale: 1.04, layer: "front", foliage: "#047857" },
  { id: 24, x: 318, y: 69, scale: 1.02, layer: "front", foliage: "#065f46" },
];

function renderTreeGroup(trees: TreeDef[], sproutedCount: number) {
  return trees.map((tree, idx) => {
    const isSprouted = tree.id <= sproutedCount;
    return (
      <g key={tree.id} transform={`translate(${tree.x}, ${tree.y}) scale(${tree.scale})`}>
        <g
          className={`eco-tree-stem ${isSprouted ? "sprouted" : "dormant"}`}
          style={{ transitionDelay: `${idx * 25}ms` }}
        >
          <rect x="-1.4" y="-8" width="2.8" height="9" rx="1" fill="#78350f" />
          <path d="M 0 -24 L -8 -12 L 8 -12 Z" fill={tree.foliage} />
          <path d="M 0 -18 L -9.5 -6 L 9.5 -6 Z" fill={tree.foliage} />
        </g>
      </g>
    );
  });
}

export function EcoForestCard({ result }: Props) {
  const slotRatio =
    result.max_slots > 0 ? Math.min(1, result.installed / result.max_slots) : 0;
  const sproutedCount =
    result.installed === 0
      ? 0
      : Math.max(1, Math.min(24, Math.round(slotRatio * 24)));

  const backTrees = DIORAMA_TREES.filter((t) => t.layer === "back");
  const midTrees = DIORAMA_TREES.filter((t) => t.layer === "mid");
  const frontTrees = DIORAMA_TREES.filter((t) => t.layer === "front");

  return (
    <div className="rounded-2xl bg-gradient-to-b from-sky-100/75 via-emerald-50/60 to-emerald-100/85 border border-emerald-200/90 overflow-hidden shadow-xs relative min-h-36 sm:h-32 flex flex-col justify-between p-3 gap-2">
      {/* Top Sky Badges */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-1.5">
        <span className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-xs border border-emerald-200 px-2 sm:px-2.5 py-0.5 rounded-full text-[10.5px] font-bold text-emerald-900 max-w-full truncate">
          <span className="material-symbols-outlined text-[14px] text-emerald-600 shrink-0">forest</span>
          <span className="truncate">Diorama Dampak Ekologis</span>
        </span>
        <span className="inline-flex items-center gap-1 bg-emerald-800 text-white px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] font-bold max-w-full truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
          <span className="truncate">
            {sproutedCount}/24 Pohon Visual ({integer.format(result.installed)}/
            {integer.format(result.max_slots)} slot)
          </span>
        </span>
      </div>

      {/* 3-Layer Rolling Hills & 24 Sprouting Trees */}
      <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 340 95">
          <defs>
            <linearGradient id="ecoHillBack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bbf7d0" />
              <stop offset="100%" stopColor="#86efac" />
            </linearGradient>
            <linearGradient id="ecoHillMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
            <linearGradient id="ecoHillFront" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>

          <g opacity="0.65">
            <path
              d="M 28 14 Q 34 8, 42 10 Q 50 6, 58 11 Q 65 10, 68 16 L 22 16 Q 22 14, 28 14 Z"
              fill="#ffffff"
            />
            <path
              d="M 160 11 Q 165 7, 172 9 Q 179 5, 185 10 Q 192 9, 194 14 L 155 14 Q 155 11, 160 11 Z"
              fill="#ffffff"
              opacity="0.75"
            />
          </g>

          <g transform="translate(308, 16)">
            <circle cx="0" cy="0" r="13" fill="#fef08a" opacity="0.35" />
            <circle cx="0" cy="0" r="7.5" fill="#fde047" opacity="0.85" />
            <circle cx="0" cy="0" r="5" fill="#f59e0b" />
          </g>

          <path
            d="M 0 52 Q 85 36, 170 46 T 340 40 L 340 95 L 0 95 Z"
            fill="url(#ecoHillBack)"
            opacity="0.85"
          />
          <g>{renderTreeGroup(backTrees, sproutedCount)}</g>

          <path
            d="M 0 64 Q 80 48, 165 58 T 340 52 L 340 95 L 0 95 Z"
            fill="url(#ecoHillMid)"
            opacity="0.95"
          />
          <g>{renderTreeGroup(midTrees, sproutedCount)}</g>

          <path d="M 0 76 Q 95 64, 190 72 T 340 68 L 340 95 L 0 95 Z" fill="url(#ecoHillFront)" />
          <g>{renderTreeGroup(frontTrees, sproutedCount)}</g>
        </svg>
      </div>

      {/* Bottom Telemetry Strip */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold mt-auto">
        <span className="bg-white/90 backdrop-blur-xs text-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-200/80 shadow-2xs">
          Setara {integer.format(result.trees_equivalent)} pohon / tahun
        </span>
        <span className="bg-white/90 backdrop-blur-xs text-emerald-800 px-2.5 py-0.5 rounded-lg border border-emerald-200/80 shadow-2xs font-semibold tracking-tight">
          Reduksi CO₂: {decimal.format(result.co2_reduction_kg_per_year)} kg/tahun
        </span>
      </div>
    </div>
  );
}

