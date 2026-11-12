"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { ProposalModal } from "@/components/studio/ProposalModal";
import { StudioMascotGuide } from "@/components/studio/StudioMascotGuide";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";
import {
  ApiRequestError,
  api,
  setToken,
  type BoundingBox,
  type CapturedImage,
  type DetectedRoof,
  type PixelPoint,
  type RoofDetectionResponse,
  type SimulationAssumptions,
  type SimulationParameters,
  type SimulationRequest,
  type SimulationResult,
  type SimulationDetail,
  type SimulationRoofInput,
} from "@/lib/api";
import { formatRp } from "@/lib/format";
import { getStoredBiodata, saveStoredBiodata, type UserBiodata } from "@/lib/profile";
import { captureMapForDetection } from "@/lib/roofCapture";

type CvLayer = "satellite" | "cv" | "heatmap";
type RoofShape = "rectangle" | "l-shape" | "trapezoid" | "custom_polygon";
type CadTool = "select" | "edit_polygon" | "pen" | "delete_vertex" | "add_polygon" | "add_obstacle" | "measure";
type Orientation = "portrait" | "landscape";
type InverterType = "string" | "micro";
type SlotState = "active" | "skylight" | "hvac" | "empty";

export interface Point2D {
  x: number;
  y: number;
}

export interface RoofFacet {
  id: string;
  name: string;
  shape: RoofShape;
  ridge: number;
  slope: number;
  pitch: number;
  azimuth: number;
  setback: number;
  gutter: number;
  rotation: number;
  lat: number;
  lng: number;
  offsetX: number;
  offsetY: number;
  hasHvac: boolean;
  hasSkylight: boolean;
  modulePower: number;
  orientation: Orientation;
  panelGap: number;
  slotOverrides: Record<string, SlotState>;
  customModuleCount: number | null;
  vertices?: Point2D[];
  alignToAzimuth?: boolean;
  isSolarPopulated?: boolean;
}

type DragMode = "move" | "rot" | "br" | "r" | "b" | "tl" | "tr" | "bl";
interface DragState {
  facetId: string;
  mode: DragMode;
  startX: number;
  startY: number;
  initRidge: number;
  initSlope: number;
  initRot: number;
  initOx: number;
  initOy: number;
  initLat: number;
  initLng: number;
}

export interface PanelSlotItem {
  r: number;
  c: number;
  key: string;
  x: number;
  y: number;
  w: number;
  l: number;
  rotationDeg?: number;
  state?: SlotState;
}

interface VertexDragState {
  facetId: string;
  vertexIdx: number;
  startX: number;
  startY: number;
  initVertices: Point2D[];
  initOx: number;
  initOy: number;
  initLat?: number;
  initLng?: number;
}

const MODULE_SPECS: Record<
  number,
  { name: string; w: number; l: number; eff: string; tech: string; price: number; desc: string }
> = {
  450: {
    name: "Tier-1 450W Compact All-Black",
    w: 1.04,
    l: 1.76,
    eff: "20.9%",
    tech: "Compact All-Black Mono",
    price: 1_600_000,
    desc: "Compact All-Black",
  },
  550: {
    name: "Tier-1 550W Mono PERC Bifacial",
    w: 1.13,
    l: 2.27,
    eff: "21.5%",
    tech: "Half-Cut Mono PERC",
    price: 1_850_000,
    desc: "Mono PERC Bifacial",
  },
  580: {
    name: "Bifacial 580W Dual-Glass",
    w: 1.13,
    l: 2.38,
    eff: "22.4%",
    tech: "Dual-Glass Bifacial",
    price: 2_150_000,
    desc: "Bifacial Dual-Glass",
  },
};

/**
 * `MODULE_SPECS` memakai daya sebagai kunci internal, sedangkan kontrak memakai
 * kunci katalog `GET /options`; pemetaan ini yang menjembatani keduanya.
 */
const MODULE_KEYS_BY_POWER: Record<number, string> = {
  450: "compact_450",
  550: "mono_perc_550",
  580: "bifacial_580",
};

function moduleKeyForPower(power: number): string {
  return MODULE_KEYS_BY_POWER[power] ?? MODULE_KEYS_BY_POWER[550];
}

const MODULE_POWERS_BY_KEY: Record<string, number> = Object.fromEntries(
  Object.entries(MODULE_KEYS_BY_POWER).map(([power, key]) => [key, Number(power)])
);

/**
 * Golongan tarif studio dipilih lewat harga per kWh, sedangkan server memakai
 * kunci katalog. Opsi yang harganya sama jatuh ke kunci yang sama.
 */
const TARIFF_KEYS_BY_RATE: Record<number, string> = {
  1700: "R2",
  1699.53: "R2",
  1444.7: "R1",
  1444.71: "B2",
  1114.74: "B2",
  996.74: "B2",
};

function tariffKeyForRate(rate: number): string {
  return TARIFF_KEYS_BY_RATE[rate] ?? "R2";
}

const ECO_TREE_CONFIGS = [
  // --- Back Hill Layer (9 trees) ---
  { id: 0, growRank: 3, layer: "back" as const, x: 175, y: 46, scale: 0.7, type: "poplar" as const },
  { id: 1, growRank: 5, layer: "back" as const, x: 118, y: 41, scale: 0.72, type: "pine" as const },
  { id: 2, growRank: 8, layer: "back" as const, x: 210, y: 44, scale: 0.67, type: "poplar" as const },
  { id: 3, growRank: 10, layer: "back" as const, x: 85, y: 38, scale: 0.66, type: "pine" as const },
  { id: 4, growRank: 14, layer: "back" as const, x: 245, y: 42, scale: 0.71, type: "oak" as const },
  { id: 5, growRank: 17, layer: "back" as const, x: 52, y: 42, scale: 0.7, type: "oak" as const },
  { id: 6, growRank: 20, layer: "back" as const, x: 280, y: 41, scale: 0.66, type: "pine" as const },
  { id: 7, growRank: 23, layer: "back" as const, x: 22, y: 49, scale: 0.65, type: "pine" as const },
  { id: 8, growRank: 24, layer: "back" as const, x: 315, y: 43, scale: 0.69, type: "poplar" as const },

  // --- Mid Hill Layer (9 trees) ---
  { id: 9, growRank: 2, layer: "mid" as const, x: 135, y: 56, scale: 0.92, type: "pine" as const },
  { id: 10, growRank: 4, layer: "mid" as const, x: 202, y: 56, scale: 0.9, type: "oak" as const },
  { id: 11, growRank: 7, layer: "mid" as const, x: 70, y: 53, scale: 0.9, type: "oak" as const },
  { id: 12, growRank: 9, layer: "mid" as const, x: 238, y: 54, scale: 0.89, type: "pine" as const },
  { id: 13, growRank: 13, layer: "mid" as const, x: 170, y: 58, scale: 0.88, type: "pine" as const },
  { id: 14, growRank: 16, layer: "mid" as const, x: 102, y: 53, scale: 0.87, type: "poplar" as const },
  { id: 15, growRank: 19, layer: "mid" as const, x: 272, y: 53, scale: 0.91, type: "pine" as const },
  { id: 16, growRank: 21, layer: "mid" as const, x: 35, y: 62, scale: 0.88, type: "poplar" as const },
  { id: 17, growRank: 22, layer: "mid" as const, x: 308, y: 54, scale: 0.87, type: "oak" as const },

  // --- Front Hill Layer (6 focal trees) ---
  { id: 18, growRank: 1, layer: "front" as const, x: 168, y: 75, scale: 1.14, type: "oak" as const },
  { id: 19, growRank: 6, layer: "front" as const, x: 228, y: 74, scale: 1.12, type: "poplar" as const },
  { id: 20, growRank: 11, layer: "front" as const, x: 110, y: 73, scale: 1.16, type: "oak" as const },
  { id: 21, growRank: 12, layer: "front" as const, x: 290, y: 75, scale: 1.15, type: "oak" as const },
  { id: 22, growRank: 15, layer: "front" as const, x: 48, y: 76, scale: 1.1, type: "pine" as const },
  { id: 23, growRank: 18, layer: "front" as const, x: 195, y: 74, scale: 1.08, type: "oak" as const },
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

interface StudioSavedProject {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  capacityKwp: number;
  ridge: number;
  slope: number;
  shape: RoofShape;
  deg: number;
}

const STUDIO_SAVED_PROJECTS: StudioSavedProject[] = [
  {
    id: "proj-baranangsiang",
    name: "Baranangsiang Indah",
    address: "Komp. Baranangsiang Indah Blok C, Bogor Timur",
    lat: -6.6110,
    lon: 106.8150,
    capacityKwp: 12.5,
    ridge: 14.2,
    slope: 8.0,
    shape: "rectangle",
    deg: 8,
  },
  {
    id: "proj-bantarjati",
    name: "Bantarjati Permai",
    address: "Jl. Achmad Adnawijaya No. 15, Bogor Utara",
    lat: -6.5780,
    lon: 106.8080,
    capacityKwp: 10.2,
    ridge: 10.8,
    slope: 6.4,
    shape: "rectangle",
    deg: -6,
  },
  {
    id: "proj-yasmin",
    name: "Taman Yasmin Sektor 3",
    address: "Jl. Yasmin Raya No. 88, Bogor Barat",
    lat: -6.5615,
    lon: 106.7620,
    capacityKwp: 6.5,
    ridge: 11.5,
    slope: 6.8,
    shape: "rectangle",
    deg: 0,
  },
  {
    id: "proj-katulampa",
    name: "Katulampa Residence",
    address: "Jl. Katulampa Raya No. 24, Bogor Timur",
    lat: -6.6230,
    lon: 106.8280,
    capacityKwp: 9.8,
    ridge: 12.0,
    slope: 7.0,
    shape: "rectangle",
    deg: 4,
  },
  {
    id: "proj-menteng",
    name: "Menteng Asri",
    address: "Jl. Terapi Raya No. 12, Menteng, Bogor Barat",
    lat: -6.5825,
    lon: 106.7760,
    capacityKwp: 8.3,
    ridge: 12.48,
    slope: 7.28,
    shape: "rectangle",
    deg: -4,
  },
];

const PRESET_ADDRESSES = STUDIO_SAVED_PROJECTS.map((p) => ({
  label: `${p.name}, ${p.address}`,
  lat: p.lat,
  lon: p.lon,
  ridge: p.ridge,
  slope: p.slope,
  shape: p.shape,
  deg: p.deg,
}));

export function computePolygonArea(vertices: Point2D[]): number {
  if (!vertices || vertices.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

export function pointInPolygon(pt: Point2D, poly: Point2D[]): boolean {
  if (!poly || poly.length < 3) return true;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------------
// Polygon geometry helpers (all coordinates in meters, facet-local frame)
// ---------------------------------------------------------------------------

export function polygonBounds(poly: Point2D[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

export function polygonPerimeter(poly: Point2D[]): number {
  let p = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    p += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return p;
}

function signedArea(poly: Point2D[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    a += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return a / 2;
}

/** 
 * Inward offset of a polygon by distance d.
 * Uses miter offset first, but if lines cross, invert, or collapse on irregular/acute vertices,
 * seamlessly falls back to centroid-directed inward scaling so the setback boundary and usable interior
 * always exist, preserve the polygon's exact shape, and never drop to 0.
 */
export function insetPolygon(poly: Point2D[], d: number): Point2D[] {
  const n = poly.length;
  if (n < 3 || d <= 0) return poly;
  const originalSign = signedArea(poly);
  const origArea = Math.abs(originalSign);
  if (origArea < 1e-4) return poly;

  // Compute centroid as guaranteed fallback reference
  const cx = poly.reduce((s, p) => s + p.x, 0) / n;
  const cy = poly.reduce((s, p) => s + p.y, 0) / n;
  const avgDist = poly.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / n;

  const fallbackScale = (): Point2D[] => {
    const s = Math.max(0.15, 1 - d / Math.max(avgDist, d * 1.25));
    return poly.map((p) => ({
      x: Math.round((cx + (p.x - cx) * s) * 1000) / 1000,
      y: Math.round((cy + (p.y - cy) * s) * 1000) / 1000,
    }));
  };

  // Interior is on the left of each edge for CCW (positive area in y-down screen = CW visually)
  const sign = originalSign > 0 ? 1 : -1;
  const lines: { px: number; py: number; dx: number; dy: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const dx = (b.x - a.x) / len;
    const dy = (b.y - a.y) / len;
    const nx = -dy * sign;
    const ny = dx * sign;
    lines.push({ px: a.x + nx * d, py: a.y + ny * d, dx, dy });
  }

  const out: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n];
    const l2 = lines[i];
    const denom = l1.dx * l2.dy - l1.dy * l2.dx;
    const v = poly[i];
    if (Math.abs(denom) < 1e-7) {
      out.push({ x: l2.px, y: l2.py });
      continue;
    }
    const t = ((l2.px - l1.px) * l2.dy - (l2.py - l1.py) * l2.dx) / denom;
    let x = l1.px + l1.dx * t;
    let y = l1.py + l1.dy * t;
    // Clamp miter spikes on very sharp corners
    const dist = Math.hypot(x - v.x, y - v.y);
    const maxMiter = d * 2.8;
    if (dist > maxMiter) {
      x = v.x + ((x - v.x) / dist) * maxMiter;
      y = v.y + ((y - v.y) / dist) * maxMiter;
    }
    out.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
  }

  // Prevent inverted, collapsed, or distorted insets: fallback to robust centroid-scaled inset
  const newSign = signedArea(out);
  const newArea = Math.abs(newSign);
  if (newSign * sign <= 0 || newArea < 0.1 * origArea || newArea > origArea) {
    return fallbackScale();
  }
  return out;
}

/** Horizontal inside-intervals of the polygon at scanline y. */
function scanlineIntervals(poly: Point2D[], y: number): [number, number][] {
  const xs: number[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y) {
      xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
  }
  xs.sort((p, q) => p - q);
  const res: [number, number][] = [];
  for (let k = 0; k + 1 < xs.length; k += 2) res.push([xs[k], xs[k + 1]]);
  return res;
}

function intersectIntervals(a: [number, number][], b: [number, number][]): [number, number][] {
  const res: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i][0], b[j][0]);
    const hi = Math.min(a[i][1], b[j][1]);
    if (hi > lo) res.push([lo, hi]);
    if (a[i][1] < b[j][1]) i++;
    else j++;
  }
  return res;
}

/** x-intervals where a full-height vertical segment spanning [yTop, yBot] stays inside the polygon. */
function bandIntervals(poly: Point2D[], yTop: number, yBot: number): [number, number][] {
  const eps = 1e-6;
  const samples = [yTop + eps, yBot - eps, (yTop + yBot) / 2];
  for (const v of poly) {
    if (v.y > yTop && v.y < yBot) samples.push(v.y - eps, v.y + eps);
  }
  let res = scanlineIntervals(poly, samples[0]);
  for (let k = 1; k < samples.length && res.length > 0; k++) {
    res = intersectIntervals(res, scanlineIntervals(poly, samples[k]));
  }
  return res;
}

function segmentsIntersect(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): boolean {
  const d = (a: Point2D, b: Point2D, c: Point2D) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Exact test: axis-aligned rectangle fully inside a simple polygon. */
function rectInsidePolygon(poly: Point2D[], x0: number, y0: number, x1: number, y1: number): boolean {
  const corners: Point2D[] = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
  for (const c of corners) if (!pointInPolygon(c, poly)) return false;
  for (const v of poly) {
    if (v.x > x0 && v.x < x1 && v.y > y0 && v.y < y1) return false;
  }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    for (let k = 0; k < 4; k++) {
      if (segmentsIntersect(a, b, corners[k], corners[(k + 1) % 4])) return false;
    }
  }
  return true;
}

interface PackOptions {
  panelW: number;
  panelL: number;
  gap: number;
  margin: number;
  marginBottom: number;
}

const PACK_CACHE = new Map<string, { slots: PanelSlotItem[]; rows: number; cols: number }>();

/**
 * Packs intact solar modules inside an arbitrary polygon (triangles, trapezoids, L-shapes, rectangles).
 * Uses inset polygon clearance for setback, tests multi-phase vertical sweeps and adaptive horizontal alignments
 * (both column-grid snapped and interval-centered) to maximize whole module count without clipping or distortion.
 */
export function packPanelsInPolygon(poly: Point2D[], opts: PackOptions) {
  const key = `${poly.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(";")}|${opts.panelW}|${opts.panelL}|${opts.gap}|${opts.margin}|${opts.marginBottom}`;
  const cached = PACK_CACHE.get(key);
  if (cached) return cached;

  const { panelW, panelL, gap, margin, marginBottom } = opts;
  let usablePoly = margin > 0 ? insetPolygon(poly, margin) : poly;
  if (!usablePoly || usablePoly.length < 3) {
    usablePoly = poly;
  }

  let b = polygonBounds(usablePoly);
  const stepX = panelW + gap;
  const stepY = panelL + gap;
  let extraBottom = Math.max(0, marginBottom - margin);

  // Adaptive margin fallback if polygon bounds are tight
  if (b.height < panelL + extraBottom && margin > 0.1) {
    usablePoly = insetPolygon(poly, margin * 0.4);
    b = polygonBounds(usablePoly);
    extraBottom = 0;
  }
  if (b.height < panelL) {
    usablePoly = poly;
    b = polygonBounds(usablePoly);
    extraBottom = 0;
  }

  const availH = b.height;
  if (availH < panelL - 1e-9) {
    return { slots: [], rows: 0, cols: 0 };
  }

  const maxPossibleRows = Math.max(0, Math.floor((availH - extraBottom + gap) / stepY + 1e-9));
  if (maxPossibleRows <= 0) {
    return { slots: [], rows: 0, cols: 0 };
  }

  const totalGridH = maxPossibleRows * stepY - gap;
  const centeredPhase = Math.max(0, (availH - extraBottom - totalGridH) / 2);

  // Candidate vertical phases: centered first (preserves symmetry), top-flush, bottom-flush, plus intermediate sweeps
  const phases = [centeredPhase, 0, Math.max(0, availH - extraBottom - totalGridH)];
  const PHASE_STEPS = 10;
  for (let k = 1; k < PHASE_STEPS; k++) {
    const ph = (k / PHASE_STEPS) * stepY;
    if (ph < availH - extraBottom - panelL) {
      phases.push(ph);
    }
  }

  const nColsGlobal = Math.max(0, Math.floor((b.width + gap) / stepX + 1e-9));
  const gridX0 = b.minX + Math.max(0, (b.width - (nColsGlobal * stepX - gap)) / 2);

  let best: PanelSlotItem[] = [];
  let bestRows = 0;
  let bestCols = 0;

  for (const phase of phases) {
    for (const alignMode of ["grid", "center"] as const) {
      const slots: PanelSlotItem[] = [];
      let rowIdx = 0;
      let maxCols = 0;

      for (
        let yTop = b.minY + phase;
        yTop + panelL <= b.maxY - extraBottom + 1e-9;
        yTop += stepY
      ) {
        const intervals = bandIntervals(usablePoly, yTop, yTop + panelL);
        let c = 0;

        for (const [l, r] of intervals) {
          const availW = r - l;
          if (availW < panelW - 1e-9) continue;
          const nMax = Math.floor((availW + gap) / stepX + 1e-9);
          if (nMax <= 0) continue;
          const runW = nMax * stepX - gap;
          const slack = availW - runW;

          let start = l + slack / 2; // centered alignment
          if (alignMode === "grid") {
            const snapped = gridX0 + Math.ceil((l - gridX0) / stepX - 1e-9) * stepX;
            if (snapped >= l - 1e-9 && snapped + runW <= r + 1e-9) {
              start = snapped;
            }
          }

          for (let i = 0; i < nMax; i++) {
            const x0 = start + i * stepX;
            const x1 = x0 + panelW;
            if (!rectInsidePolygon(usablePoly, x0, yTop, x1, yTop + panelL)) continue;

            slots.push({
              r: rowIdx,
              c,
              key: `${rowIdx}_${c}`,
              x: x0 + panelW / 2,
              y: yTop + panelL / 2,
              w: panelW,
              l: panelL,
            });
            c++;
          }
        }

        if (c > 0) {
          maxCols = Math.max(maxCols, c);
          rowIdx++;
        }
      }

      if (slots.length > best.length) {
        best = slots;
        bestRows = rowIdx;
        bestCols = maxCols;
      }
    }
  }

  const result = { slots: best, rows: Math.max(1, bestRows), cols: Math.max(1, bestCols) };
  if (PACK_CACHE.size > 300) PACK_CACHE.clear();
  PACK_CACHE.set(key, result);
  return result;
}

export function rotatePoint(p: Point2D, rad: number): Point2D {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  };
}

export function rotatePolygon(poly: Point2D[], rad: number): Point2D[] {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return poly.map((p) => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }));
}

export function getFacetVertices(facet: RoofFacet): Point2D[] {
  if (facet.vertices && facet.vertices.length >= 3) {
    return facet.vertices;
  }
  const w2 = facet.ridge / 2;
  const h2 = facet.slope / 2;
  if (facet.shape === "l-shape") {
    return [
      { x: -w2, y: -h2 },
      { x: w2 * 0.3, y: -h2 },
      { x: w2 * 0.3, y: -h2 * 0.16 },
      { x: w2, y: -h2 * 0.16 },
      { x: w2, y: h2 },
      { x: -w2, y: h2 },
    ];
  }
  if (facet.shape === "trapezoid") {
    return [
      { x: -w2 * 0.7, y: -h2 },
      { x: w2 * 0.7, y: -h2 },
      { x: w2, y: h2 },
      { x: -w2, y: h2 },
    ];
  }
  return [
    { x: -w2, y: -h2 },
    { x: w2, y: -h2 },
    { x: w2, y: h2 },
    { x: -w2, y: h2 },
  ];
}

/**
 * Bidang contoh yang hanya dipakai sebagai bentuk cadangan ketika daftar bidang
 * masih kosong, mis. sebelum pengguna menjalankan pindai AI. Studio sendiri
 * mulai tanpa bidang apa pun supaya seluruh bidang berasal dari hasil deteksi.
 */
const FALLBACK_FACET: RoofFacet = {
  id: "facet-fallback",
  name: "Bidang Atap",
  shape: "rectangle",
  ridge: 12.48,
  slope: 7.28,
  pitch: 22,
  azimuth: 188,
  setback: 0.5,
  gutter: 0.6,
  rotation: 0,
  lat: -6.611,
  lng: 106.815,
  offsetX: 0,
  offsetY: 0,
  hasHvac: false,
  hasSkylight: false,
  modulePower: 550,
  orientation: "portrait",
  panelGap: 3,
  slotOverrides: {},
  customModuleCount: null,
  vertices: [
    { x: -6.24, y: -3.64 },
    { x: 6.24, y: -3.64 },
    { x: 6.24, y: 3.64 },
    { x: -6.24, y: 3.64 },
  ],
  alignToAzimuth: true,
  isSolarPopulated: false,
};


/**
 * Kemiringan dan azimuth adalah masukan pengguna, bukan hasil deteksi: dari satu
 * citra nadir arah kemiringan tidak dapat ditentukan. Keduanya diisi nilai awal
 * studio supaya panel properti langsung punya bentuk yang bisa dibaca.
 */
const DEFAULT_ROOF_TILT_DEG = 22;
const DEFAULT_ROOF_AZIMUTH_DEG = 188;

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Mengubah bidang hasil deteksi menjadi `RoofFacet`.
 *
 * `polygon_px` diterjemahkan langsung memakai `meters_per_pixel` dari respons
 * deteksi, bukan dihitung ulang dari skala peta. Titik tengah `bbox_px` menjadi
 * acuan `lat`/`lng` lewat rumus piksel→geografis kontrak, sehingga konversi balik
 * saat menyimpan simulasi menghasilkan piksel yang sama persis walaupun peta
 * sudah digeser.
 *
 * `rotation` selalu 0 karena `vertices` sudah berada di frame piksel tangkapan.
 */
function buildFacetFromDetectedRoof(
  roof: DetectedRoof,
  image: CapturedImage,
  index: number
): RoofFacet {
  const centerX = (roof.bbox_px.x1 + roof.bbox_px.x2) / 2;
  const centerY = (roof.bbox_px.y1 + roof.bbox_px.y2) / 2;
  const metersPerPixel = image.meters_per_pixel;

  const vertices: Point2D[] = roof.polygon_px.map(([x, y]) => ({
    x: Math.round((x - centerX) * metersPerPixel * 1000) / 1000,
    y: Math.round((y - centerY) * metersPerPixel * 1000) / 1000,
  }));

  const bounds = polygonBounds(vertices);
  const [minLng, minLat, maxLng, maxLat] = image.bbox;

  return {
    id: roof.id,
    name: `Bidang Atap ${index + 1}`,
    shape: "custom_polygon",
    ridge: Math.max(0.1, roundMeters(bounds.width)),
    slope: Math.max(0.1, roundMeters(bounds.height)),
    pitch: DEFAULT_ROOF_TILT_DEG,
    azimuth: DEFAULT_ROOF_AZIMUTH_DEG,
    setback: 0.5,
    gutter: 0.5,
    rotation: 0,
    lat: maxLat - (centerY / image.height) * (maxLat - minLat),
    lng: minLng + (centerX / image.width) * (maxLng - minLng),
    offsetX: 0,
    offsetY: 0,
    hasHvac: false,
    hasSkylight: false,
    modulePower: 550,
    orientation: "portrait",
    panelGap: 3,
    slotOverrides: {},
    customModuleCount: null,
    vertices,
    alignToAzimuth: true,
    // Bidang hasil deteksi sudah punya geometri yang pasti, jadi tata letak panel
    // langsung diisi. Tombol "Susun Tata Letak Panel Otomatis" tetap tersedia untuk
    // menyusun ulang setelah parameter diubah.
    isSolarPopulated: true,
  };
}

/**
 * Membangun kembali bidang studio dari simulasi yang tersimpan.
 *
 * Yang dipakai adalah `roof_polygon_px` asli bersama georeferensi tangkapan, bukan
 * kotak pembatasnya: bentuk atap, termasuk bentuk L dan poligon bebas, kembali
 * persis seperti saat disimpan. Parameter per bidang juga dibaca dari baris
 * tersimpan, sehingga kemiringan, azimuth, modul, dan penanda rintangan tidak
 * perlu diisi ulang.
 */
function buildFacetFromSavedRoof(
  roof: SimulationDetail["roofs"][number],
  imagery: NonNullable<SimulationDetail["imagery"]>,
  index: number
): RoofFacet {
  const metersPerPixel = imagery.meters_per_pixel ?? 0.3;
  const [minLng, , , maxLat] = imagery.bbox;

  // Titik tengah tangkapan menjadi acuan koordinat, sama seperti saat deteksi.
  const centerX = imagery.width / 2;
  const centerY = imagery.height / 2;

  const vertices: Point2D[] = roof.roof_polygon_px.map(([x, y]) => ({
    x: Math.round((x - centerX) * metersPerPixel * 1000) / 1000,
    y: Math.round((y - centerY) * metersPerPixel * 1000) / 1000,
  }));

  const bounds = polygonBounds(vertices);
  const modulePower = MODULE_POWERS_BY_KEY[roof.input.module_key] ?? 550;

  return {
    id: `saved-${roof.detection_id ?? index}-${index}`,
    name: roof.label ?? `Bidang Atap ${index + 1}`,
    shape: roof.shape ?? "custom_polygon",
    ridge: Math.max(0.1, roundMeters(bounds.width)),
    slope: Math.max(0.1, roundMeters(bounds.height)),
    pitch: roof.input.tilt_deg,
    azimuth: roof.input.azimuth_deg,
    setback: roof.input.setback_m,
    gutter: roof.input.gutter_m,
    rotation: 0,
    lat: maxLat - (centerY / imagery.height) * (imagery.bbox[3] - imagery.bbox[1]),
    lng: minLng + (centerX / imagery.width) * (imagery.bbox[2] - imagery.bbox[0]),
    offsetX: 0,
    offsetY: 0,
    hasHvac: roof.has_hvac ?? false,
    hasSkylight: roof.has_skylight ?? false,
    modulePower,
    orientation: roof.input.orientation,
    panelGap: Math.round(roof.input.clearance_m * 100),
    slotOverrides: roof.slot_overrides ?? {},
    customModuleCount: roof.input.panel_count,
    vertices,
    alignToAzimuth: roof.align_to_azimuth ?? true,
    isSolarPopulated: roof.is_solar_populated ?? true,
  };
}

/**
 * Kebalikan `buildFacetFromDetectedRoof`: poligon piksel tangkapan untuk payload
 * simulasi. Sudut `rotation` diterapkan lebih dulu karena tampilan memutar
 * poligon tampilan memakai nilai itu, sedangkan `vertices` disimpan apa adanya.
 */
function facetPolygonPx(facet: RoofFacet, image: CapturedImage): PixelPoint[] {
  const [minLng, minLat, maxLng, maxLat] = image.bbox;
  const centerX = ((facet.lng - minLng) / (maxLng - minLng)) * image.width;
  const centerY = ((maxLat - facet.lat) / (maxLat - minLat)) * image.height;

  const radians = (facet.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const metersPerPixel = image.meters_per_pixel;

  return getFacetVertices(facet).map((vertex) => [
    Math.round((centerX + (vertex.x * cos - vertex.y * sin) / metersPerPixel) * 10) / 10,
    Math.round((centerY + (vertex.x * sin + vertex.y * cos) / metersPerPixel) * 10) / 10,
  ]);
}

/** Kontrak menolak poligon yang keluar dari batas berkas tangkapan. */
function polygonInsideImage(points: PixelPoint[], image: CapturedImage): boolean {
  const tolerance = 1;

  return points.every(
    ([x, y]) =>
      x >= -tolerance &&
      y >= -tolerance &&
      x <= image.width + tolerance &&
      y <= image.height + tolerance
  );
}

function computeFacetMetrics(
  facet: RoofFacet,
  sunHour: number,
  obstacleFilterActive: boolean,
  extraTilt: number,
  inverterType: InverterType
) {
  const peakSunHours = sunHour === 9 ? 3.8 : sunHour === 15 ? 3.9 : 4.85;

  // 1. Pitch & Incident Angle Physics
  const pitchRad = (facet.pitch * Math.PI) / 180;
  const pitchCosine = Math.cos(pitchRad).toFixed(2);
  const pitchFactor = Math.cos(((facet.pitch - 22) * Math.PI) / 180);
  const pitchEff = Math.max(0.85, Math.min(1.0, 0.92 + pitchFactor * 0.08));
  const pitchEffPct = Math.round(pitchEff * 100);

  // 2. Azimuth Compass Physics (188° is optimal SSW in tropical Indonesia)
  const azDev = Math.abs(facet.azimuth - 188);
  const azimuthEff = Math.max(0.82, Math.min(1.0, 1.0 - (azDev / 180) * 0.15));
  const azimuthEffPct = (azimuthEff * 100).toFixed(1);

  // 3. Racking Extra Tilt (Self-cleaning rain runoff bonus)
  const rackingBonus = 1.0 + (extraTilt / 20) * 0.02;

  // 4. Roof Geometry & Usable Area (true polygon geometry for every shape)
  const vertices = getFacetVertices(facet);
  const setback = Math.max(0, facet.setback ?? 0.3);
  const gutter = facet.shape === "rectangle" ? Math.max(0, facet.gutter ?? 0.3) : 0;
  const bounds = polygonBounds(vertices);
  const usableRidge = Math.max(0, bounds.width - 2 * setback);
  const usableSlope = Math.max(0, bounds.height - setback * 2 - gutter);
  const grossArea = computePolygonArea(vertices);
  const insetPoly = insetPolygon(vertices, setback);
  const rawInsetArea = computePolygonArea(insetPoly);
  const fallbackNetArea = grossArea * Math.max(0.45, 1 - (setback * 2) / Math.max(bounds.width, bounds.height, 1));
  const netArea = facet.shape !== "rectangle"
    ? Math.max(0.1, rawInsetArea > 0.05 * grossArea ? rawInsetArea : fallbackNetArea)
    : Math.max(0.1, Math.min(grossArea, usableRidge * usableSlope));
  const netAreaPct = grossArea > 0 ? Math.min(100, Math.round((netArea / grossArea) * 100)) : 0;

  // 5. Module Layout Packing (intact modules fitted to the exact polygon outline)
  const currentSpec = MODULE_SPECS[facet.modulePower] || MODULE_SPECS[550];
  const gapM = facet.panelGap / 100;

  // Azimuth orientation integration:
  // When alignToAzimuth is active (default true), the array grid and individual modules rotate to face solar Azimuth
  const alignToAzimuth = facet.alignToAzimuth ?? true;
  const rawAngle = alignToAzimuth ? facet.azimuth - 180 - (facet.rotation || 0) : 0;
  let panelAngleDeg = ((rawAngle + 180) % 360) - 180;
  if (panelAngleDeg < -180) panelAngleDeg += 360;
  const isAngleActive = Math.abs(panelAngleDeg) >= 0.5;
  const rad = (panelAngleDeg * Math.PI) / 180;

  const targetPoly = isAngleActive ? rotatePolygon(vertices, -rad) : vertices;

  const packOptsPortrait = {
    panelW: currentSpec.w,
    panelL: currentSpec.l,
    gap: gapM,
    margin: setback,
    marginBottom: setback + gutter,
  };

  const packOptsLandscape = {
    panelW: currentSpec.l,
    panelL: currentSpec.w,
    gap: gapM,
    margin: setback,
    marginBottom: setback + gutter,
  };

  const rawPackedPortrait = packPanelsInPolygon(targetPoly, packOptsPortrait);
  const rawPackedLandscape = packPanelsInPolygon(targetPoly, packOptsLandscape);

  const applySlotRotation = (packedRes: { slots: PanelSlotItem[]; rows: number; cols: number }) => {
    if (!isAngleActive) return packedRes;
    const transformedSlots = packedRes.slots.map((slot) => {
      const unrot = rotatePoint({ x: slot.x, y: slot.y }, rad);
      return {
        ...slot,
        x: unrot.x,
        y: unrot.y,
        rotationDeg: Math.round(panelAngleDeg * 10) / 10,
      };
    });
    return {
      ...packedRes,
      slots: transformedSlots,
    };
  };

  const packedPortrait = applySlotRotation(rawPackedPortrait);
  const packedLandscape = applySlotRotation(rawPackedLandscape);

  const portraitSlotsCount = packedPortrait.slots.length;
  const landscapeSlotsCount = packedLandscape.slots.length;
  const bestOrientation: Orientation = landscapeSlotsCount > portraitSlotsCount ? "landscape" : "portrait";

  const packed = facet.orientation === "landscape" ? packedLandscape : packedPortrait;
  const rawSlots: PanelSlotItem[] = packed.slots;
  const cols = packed.cols;
  const rows = packed.rows;
  const obstacleRow = Math.min(rows - 1, 1);
  const obstacleCol = Math.max(1, Math.floor((cols - 2) / 2));

  const totalValidSlots = rawSlots.length;

  // Separate slots into obstacle/fixed overrides vs candidate panel slots
  const candidateIndices: number[] = [];
  const slotStates: SlotState[] = new Array(totalValidSlots);

  rawSlots.forEach((slot, idx) => {
    const override = facet.slotOverrides[slot.key];
    if (override) {
      slotStates[idx] = override;
    } else if (
      facet.hasHvac &&
      obstacleFilterActive &&
      slot.r === obstacleRow &&
      (slot.c === obstacleCol || slot.c === obstacleCol + 1)
    ) {
      slotStates[idx] = "hvac";
    } else if (facet.hasSkylight && slot.r === 0 && slot.c === Math.min(1, cols - 1)) {
      slotStates[idx] = "skylight";
    } else {
      // Unassigned candidate slot
      candidateIndices.push(idx);
    }
  });

  // Count how many are forced active by explicit user slotOverrides
  const forcedActiveCount = slotStates.filter((s) => s === "active").length;
  const totalAvailable = forcedActiveCount + candidateIndices.length;

  const targetTotal =
    facet.customModuleCount !== null
      ? Math.max(0, Math.min(totalAvailable, facet.customModuleCount))
      : totalAvailable;

  const remainingToActivate = Math.max(0, targetTotal - forcedActiveCount);

  candidateIndices.forEach((slotIdx, i) => {
    if (i < remainingToActivate) {
      slotStates[slotIdx] = "active";
    } else {
      slotStates[slotIdx] = "empty";
    }
  });

  const validSlots: PanelSlotItem[] = rawSlots.map((slot, idx) => ({
    ...slot,
    state: slotStates[idx],
  }));

  const isPopulated = facet.isSolarPopulated !== false;
  const potentialModules = validSlots.filter((s) => s.state === "active").length;
  const potentialKwp = (potentialModules * facet.modulePower) / 1000;
  const modulesFitted = isPopulated ? potentialModules : 0;

  const actualKwp = (modulesFitted * facet.modulePower) / 1000;
  const totalPanelAreaM2 = modulesFitted * currentSpec.w * currentSpec.l;
  const densityPct = netArea > 0 ? Math.min(100, Math.round((totalPanelAreaM2 / netArea) * 100)) : 0;

  // 6. Inverter Performance
  const inverterEff = inverterType === "string" ? 0.984 : 0.975;
  const dcAcRatio = actualKwp > 0 ? (actualKwp / Math.max(1, Math.ceil(actualKwp / 5) * 4.5)).toFixed(2) : "1.22";
  const inverterEffPct = inverterType === "string" ? "98.4%" : "97.5%";

  // 7. Energy Production & Load Coverage
  const combinedFactor = pitchEff * azimuthEff * rackingBonus * inverterEff;
  const annualProductionKwh = actualKwp * peakSunHours * 365 * 0.82 * combinedFactor;
  const monthlyGenKwh = annualProductionKwh / 12;

  // 8. Cost Breakdown for this facet
  const costModules = modulesFitted * currentSpec.price;
  const costInverter = inverterType === "string" ? actualKwp * 1_200_000 : modulesFitted * 1_100_000;
  const costRacking = modulesFitted * 350_000;
  const facetCapex = costModules + costInverter + costRacking;

  return {
    grossArea,
    usableRidge,
    usableSlope,
    netArea,
    netAreaPct,
    cols,
    rows,
    validSlots,
    totalValidSlots,
    modulesFitted,
    potentialModules,
    potentialKwp,
    isPopulated,
    actualKwp,
    densityPct,
    pitchCosine,
    pitchEffPct,
    azimuthEffPct,
    dcAcRatio,
    inverterEffPct,
    annualProductionKwh,
    monthlyGenKwh,
    costModules,
    costInverter,
    costRacking,
    facetCapex,
    currentSpec,
    portraitSlotsCount,
    landscapeSlotsCount,
    bestOrientation,
    panelAngleDeg,
    alignToAzimuth,
  };
}

function StudioPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Floating Capsule Navigation State (X-like bubble)
  const [capsuleExpanded, setCapsuleExpanded] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Layers & CAD Tools State
  const [activeLayer, setActiveLayer] = useState<CvLayer>("satellite");
  const [layerDrawerOpen, setLayerDrawerOpen] = useState(false);
  const [obstacleFilterActive, setObstacleFilterActive] = useState(true);
  const [sunHour, setSunHour] = useState<number>(12);
  const [cadTool, setCadTool] = useState<CadTool>("select");
  const [obstacleBrush, setObstacleBrush] = useState<SlotState | null>(null);
  const [cadToast, setCadToast] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"geometry" | "pvarray" | "financials">("geometry");
  const [capexCollapsed, setCapexCollapsed] = useState(true);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [mascotGuideOpen, setMascotGuideOpen] = useState(true);

  // Address search input (Defaulted to Kota Bogor)
  const [addressInput, setAddressInput] = useState("Komp. Baranangsiang Indah Blok C, Bogor Timur, Kota Bogor");

  // Mouse HUD for Radiometer
  const [probePos, setProbePos] = useState<{ x: number; y: number } | null>(null);

  // Multi-Polygon Roof Facets State & Selection
  // Daftar dimulai kosong: seluruh bidang berasal dari hasil deteksi model,
  // ditambah poligon yang digambar sendiri oleh pengguna bila perlu.
  const [facets, setFacets] = useState<RoofFacet[]>([]);
  const [selectedFacetIds, setSelectedFacetIds] = useState<string[]>([]);

  // Active facet ID is the primary focus facet for single-facet properties editing
  const activeFacetId = useMemo(() => {
    if (selectedFacetIds.length > 0) {
      return selectedFacetIds[selectedFacetIds.length - 1];
    }
    return facets[0]?.id || "";
  }, [selectedFacetIds, facets]);

  const setActiveFacetId = useCallback((id: string) => {
    setSelectedFacetIds((prev) => {
      if (prev.includes(id)) {
        return [...prev.filter((x) => x !== id), id];
      }
      return [...prev, id];
    });
  }, []);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [vertexDragState, setVertexDragState] = useState<VertexDragState | null>(null);
  const [penPoints, setPenPoints] = useState<Point2D[]>([]);
  const [penMousePos, setPenMousePos] = useState<Point2D | null>(null);
  const [measurePoints, setMeasurePoints] = useState<Point2D[]>([]);
  const [measureMousePos, setMeasureMousePos] = useState<Point2D | null>(null);
  const [isMeasureClosed, setIsMeasureClosed] = useState(false);

  // Hasil deteksi model: georeferensi tangkapan terakhir, bidang kandidat, dan
  // pilihan sementara sebelum diterapkan menjadi bidang proyek.
  const [detection, setDetection] = useState<RoofDetectionResponse | null>(null);
  /**
   * Angka server untuk simulasi yang dibuka lewat `?analysis=`. Selama terisi,
   * ringkasan di layar memakai angka tersimpan, bukan hasil pratinjau lokal, supaya
   * yang terlihat sama dengan yang tersimpan. Setiap perubahan parameter
   * mengosongkannya kembali menjadi pratinjau.
   */
  const [serverMetrics, setServerMetrics] = useState<SimulationDetail["result"] | null>(null);
  const [detectedRoofs, setDetectedRoofs] = useState<DetectedRoof[]>([]);
  const [selectedDetectedIds, setSelectedDetectedIds] = useState<string[]>([]);
  const [showDetectedRoofs, setShowDetectedRoofs] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [selectionDone, setSelectionDone] = useState(false);

  // Pratinjau tangkapan sebagai object URL; ditampilkan sebagai image overlay
  // pada bbox yang sama dengan yang dikirim ke model.
  const [capturePreviewUrl, setCapturePreviewUrl] = useState<string | null>(null);

  // Map synchronization state for real-time scale & position tracking
  const [mapTick, setMapTick] = useState(0);

  // Background Leaflet Map refs & status
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const esriSatelliteLayerRef = useRef<any>(null);
  const osmStreetLayerRef = useRef<any>(null);
  const labelsLayerRef = useRef<any>(null);

  // Layer bidang kandidat hasil deteksi, dikunci per id bidang.
  const detectionLayersRef = useRef<Map<string, any>>(new Map());

  // Exact Real-World Physical Scale (Pixels per meter based on Web Mercator & Latitude)
  const pixelsPerMeter = useMemo(() => {
    if (mapInstanceRef.current) {
      try {
        const map = mapInstanceRef.current;
        const center = map.getCenter();
        const lat = center.lat;
        const z = map.getZoom();
        const metersPerPixel =
          (40075016.686 * Math.abs(Math.cos((lat * Math.PI) / 180))) / Math.pow(2, z + 8);
        return Math.max(1, 1 / metersPerPixel);
      } catch {
        // fallback
      }
    }
    return 15 * zoomScale;
  }, [mapTick, zoomScale, mapLoaded]);

  // Screen Position Projection from Leaflet Geographic Coordinates
  const getFacetScreenPosition = useCallback(
    (facet: RoofFacet) => {
      if (mapInstanceRef.current && facet.lat && facet.lng) {
        try {
          const pt = mapInstanceRef.current.latLngToContainerPoint([facet.lat, facet.lng]);
          return { x: pt.x, y: pt.y };
        } catch {
          // fallback
        }
      }
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapTick, mapLoaded]
  );

  // Active Facet accessor
  const activeFacet = useMemo(() => {
    return facets.find((f) => f.id === activeFacetId) || facets[0] || FALLBACK_FACET;
  }, [facets, activeFacetId]);

  const updateActiveFacet = useCallback((patch: Partial<RoofFacet>) => {
    // Parameter berubah berarti angka tersimpan tidak lagi mewakili rancangan.
    setServerMetrics(null);
    setFacets((prev) =>
      prev.map((f) => (f.id === activeFacetId ? { ...f, ...patch } : f))
    );
  }, [activeFacetId]);

  /**
   * Normalizes raw polygon vertices (meters, facet-local frame) so they are centered on the facet
   * anchor, and shifts the anchor (lat/lng + offsets) by the same amount so the polygon never jumps.
   * ridge/slope always equal the true bounding box of the vertices.
   */
  const buildPolygonPatch = useCallback(
    (
      raw: Point2D[],
      base: { lat?: number; lng?: number; offsetX: number; offsetY: number; rotation: number }
    ): Partial<RoofFacet> => {
      const b = polygonBounds(raw);
      const cx = (b.minX + b.maxX) / 2;
      const cy = (b.minY + b.maxY) / 2;
      const r3 = (n: number) => Math.round(n * 1000) / 1000;
      const vertices = raw.map((v) => ({ x: r3(v.x - cx), y: r3(v.y - cy) }));

      const rad = (base.rotation * Math.PI) / 180;
      const shiftX = (cx * Math.cos(rad) - cy * Math.sin(rad)) * pixelsPerMeter;
      const shiftY = (cx * Math.sin(rad) + cy * Math.cos(rad)) * pixelsPerMeter;

      let lat = base.lat;
      let lng = base.lng;
      if (mapInstanceRef.current && (window as any).L && base.lat && base.lng && (shiftX || shiftY)) {
        try {
          const L = (window as any).L;
          const pt = mapInstanceRef.current.latLngToContainerPoint([base.lat, base.lng]);
          const ll = mapInstanceRef.current.containerPointToLatLng(L.point(pt.x + shiftX, pt.y + shiftY));
          lat = ll.lat;
          lng = ll.lng;
        } catch {
          // keep base anchor
        }
      }

      return {
        shape: "custom_polygon",
        vertices,
        ridge: Math.max(0.1, Math.round(b.width * 100) / 100),
        slope: Math.max(0.1, Math.round(b.height * 100) / 100),
        lat,
        lng,
        offsetX: Math.round(base.offsetX + shiftX),
        offsetY: Math.round(base.offsetY + shiftY),
      };
    },
    [pixelsPerMeter]
  );

  // Synchronize initial facet & map location from URL query params (e.g. when launched from Dashboard)
  useEffect(() => {
    const pName = searchParams.get("name");
    const pLat = searchParams.get("lat");
    const pLng = searchParams.get("lng");
    const pZoom = searchParams.get("zoom");
    const pRidge = searchParams.get("ridge");
    const pSlope = searchParams.get("slope");
    const pTilt = searchParams.get("tilt");
    const pRot = searchParams.get("rot");
    const pShape = searchParams.get("shape") as RoofShape | null;
    const pPower = searchParams.get("power");

    if (pName || pLat || pRidge) {
      if (pName) {
        setAddressInput(pName);
      }
      const latNum = pLat ? Number(pLat) : null;
      const lngNum = pLng ? Number(pLng) : null;
      const zoomNum = pZoom ? Number(pZoom) : null;

      updateActiveFacet({
        ...(pName ? { name: pName } : {}),
        ...(latNum !== null && !isNaN(latNum) ? { lat: latNum } : {}),
        ...(lngNum !== null && !isNaN(lngNum) ? { lng: lngNum } : {}),
        ...(pRidge && !isNaN(Number(pRidge)) ? { ridge: Number(pRidge) } : {}),
        ...(pSlope && !isNaN(Number(pSlope)) ? { slope: Number(pSlope) } : {}),
        ...(pTilt && !isNaN(Number(pTilt)) ? { pitch: Number(pTilt) } : {}),
        ...(pRot && !isNaN(Number(pRot)) ? { rotation: Number(pRot) } : {}),
        ...(pShape ? { shape: pShape } : {}),
        ...(pPower && !isNaN(Number(pPower)) ? { modulePower: Number(pPower) } : {}),
      });

      if (latNum !== null && lngNum !== null && !isNaN(latNum) && !isNaN(lngNum) && mapInstanceRef.current) {
        // `zoom` berasal dari `map_zoom` respons server, sehingga proyek tersimpan
        // terbuka lagi pada tampilan yang sama.
        const zoom = zoomNum !== null && !isNaN(zoomNum) ? zoomNum : 21;
        mapInstanceRef.current.setView([latNum, lngNum], zoom);
      }
    }
  }, [searchParams, updateActiveFacet]);

  /**
   * Membuka kembali simulasi tersimpan lewat `?analysis=<id>`.
   *
   * Bidang dibangun dari `roof_polygon_px` asli, bukan kotak pembatasnya, dan
   * parameter tiap bidang dibaca dari baris tersimpan. Peta dipindahkan ke titik
   * dan zoom yang tersimpan supaya tampilannya sama seperti saat disimpan.
   */
  useEffect(() => {
    const analysisId = searchParams.get("analysis");
    if (analysisId === null) return;

    let cancelled = false;

    const restore = async () => {
      try {
        const detail = await api.getSimulation(Number(analysisId));
        if (cancelled) return;

        if (detail.imagery === null) {
          showToast("Simulasi ini tidak menyimpan georeferensi, jadi bidang tidak dapat digambar ulang.");
          return;
        }

        const restored = detail.roofs.map((roof, index) =>
          buildFacetFromSavedRoof(roof, detail.imagery!, index)
        );

        if (restored.length === 0) {
          showToast("Simulasi ini tidak memuat bidang atap.");
          return;
        }

        setFacets(restored);
        setServerMetrics(detail.result);
        setSelectedFacetIds(restored.map((facet) => facet.id));
        setActiveFacetId(restored[restored.length - 1].id);
        setSelectionDone(true);
        setShowDetectedRoofs(false);
        setAddressInput(detail.address ?? "Proyek tersimpan");

        // Penanda agar simpan berikutnya tetap memakai acuan tangkapan yang sama.
        setDetection({
          image_id: detail.imagery.image_id,
          detection_id: `simulasi-${detail.id}`,
          model: { name: "yolov8-seg", version: detail.imagery.zoom === null ? "" : String(detail.imagery.zoom) },
          image: {
            width: detail.imagery.width,
            height: detail.imagery.height,
            bbox: detail.imagery.bbox,
            meters_per_pixel: detail.imagery.meters_per_pixel ?? 0.3,
            zoom: detail.imagery.zoom,
          },
          roofs: [],
        });

        const map = mapInstanceRef.current;
        if (map !== null) {
          map.setView([detail.center_point.lat, detail.center_point.lng], detail.map_zoom ?? map.getZoom());
        }

        showToast(
          `Simulasi #${detail.id} dibuka kembali — ${restored.length} bidang, ` +
            `${detail.result.capacity_kwp.toLocaleString("id-ID")} kWp.`
        );
      } catch (caught) {
        if (cancelled) return;
        showToast(
          caught instanceof ApiRequestError && caught.status === 404
            ? "Simulasi tidak ditemukan atau bukan milik akun ini."
            : `Gagal membuka simulasi: ${caught instanceof Error ? caught.message : "tidak diketahui"}`
        );
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
    // `showToast` stabil; `searchParams` berubah saat URL berganti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Toast notification timer
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setCadToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setCadToast(null);
    }, 2400);
  }, []);

  const toggleFacetSelection = useCallback(
    (facetId: string) => {
      setSelectedFacetIds((prev) => {
        if (prev.includes(facetId)) {
          const next = prev.filter((id) => id !== facetId);
          showToast(`Bidang atap dikeluarkan dari seleksi (${next.length} bidang aktif)`);
          return next;
        } else {
          const next = [...prev, facetId];
          showToast(`Bidang atap ditambahkan ke seleksi (${next.length} bidang aktif)`);
          return next;
        }
      });
    },
    [showToast]
  );

  const selectAllFacets = useCallback(() => {
    setSelectedFacetIds(facets.map((f) => f.id));
    showToast(`Semua bidang atap dipilih (${facets.length} bidang aktif)`);
  }, [facets, showToast]);

  const unselectAllFacets = useCallback(() => {
    setSelectedFacetIds([]);
    showToast("Semua seleksi bidang atap dibatalkan (0 bidang dipilih)");
  }, [showToast]);

  const populateFacetWithSolar = useCallback(
    (facetId: string) => {
      setFacets((prev) =>
        prev.map((f) => (f.id === facetId ? { ...f, isSolarPopulated: true } : f))
      );
      setActiveFacetId(facetId);
      showToast("✨ Modul surya berhasil dipasang pada bidang atap!");
    },
    [setActiveFacetId, showToast]
  );

  const populateAllFacetsWithSolar = useCallback(() => {
    setServerMetrics(null);
    setFacets((prev) => prev.map((f) => ({ ...f, isSolarPopulated: true })));
    showToast("⚡ Modul surya dipasang pada semua bidang atap!");
  }, [showToast]);

  const resetAllToRoofOutline = useCallback(() => {
    setFacets((prev) => prev.map((f) => ({ ...f, isSolarPopulated: false })));
    showToast("🏠 Tampilan diubah ke kontur scan bidang atap");
  }, [showToast]);

  // Facets currently participating in Studio calculations & tree growth
  const selectedFacets = useMemo(() => {
    return facets.filter((f) => selectedFacetIds.includes(f.id));
  }, [facets, selectedFacetIds]);

  // Bidang kandidat yang belum diterapkan menjadi bidang proyek.
  const remainingDetectedRoofs = useMemo(
    () => detectedRoofs.filter((roof) => !facets.some((facet) => facet.id === roof.id)),
    [detectedRoofs, facets]
  );

  const selectDetectedRoof = useCallback(
    (roofId: string) => {
      setSelectedDetectedIds((prev) =>
        prev.includes(roofId) ? prev.filter((id) => id !== roofId) : [...prev, roofId]
      );
    },
    []
  );

  /** Pesan kesalahan yang bisa dibaca pengguna, dengan saran per status. */
  const detectionErrorMessage = useCallback((caught: unknown): string => {
    if (caught instanceof ApiRequestError) {
      if (caught.status === 413) {
        return "Tangkapan peta terlalu besar untuk diunggah. Perkecil jendela peramban, lalu pindai ulang.";
      }

      return `Deteksi gagal: ${caught.message}`;
    }

    if (caught instanceof Error && caught.message !== "") {
      return caught.message;
    }

    return "Deteksi atap gagal. Coba pindai ulang.";
  }, []);

  /**
   * Menampilkan seluruh area tangkapan tanpa menggeser titik tengah peta.
   *
   * Tangkapan dibuat pada cakupan 180–230 m, sedangkan tampilan pengguna bisa
   * jauh lebih rapat; tanpa penyesuaian ini poligon hasil deteksi akan meluber
   * keluar layar sehingga tidak bisa dipilih. Zoom hanya diturunkan seperlunya,
   * dan tampilan pengguna tidak disentuh sama sekali bila areanya sudah muat.
   */
  const revealCaptureArea = useCallback((bbox: BoundingBox) => {
    const map = mapInstanceRef.current;

    if (!map) return;

    const [minLng, minLat, maxLng, maxLat] = bbox;
    const view = map.getBounds();
    const alreadyVisible =
      view.getWest() <= minLng &&
      view.getEast() >= maxLng &&
      view.getSouth() <= minLat &&
      view.getNorth() >= maxLat;

    if (alreadyVisible) return;

    // Zoom diturunkan seperlunya dari perbandingan rentang geografis, lalu peta
    // dipusatkan ke titik tengah area tangkapan; tidak ada perhitungan batas
    // Leaflet yang perlu dikonstruksi ulang di sini.
    const lngRatio = (maxLng - minLng) / Math.max(view.getEast() - view.getWest(), 1e-9);
    const latRatio = (maxLat - minLat) / Math.max(view.getNorth() - view.getSouth(), 1e-9);
    const steps = Math.ceil(Math.log2(Math.max(lngRatio, latRatio, 1)));
    const zoom = Math.max(map.getMinZoom(), Math.round(map.getZoom()) - steps);

    map.setView([(minLat + maxLat) / 2, (minLng + maxLng) / 2], zoom);
  }, []);

  /**
   * Menjalankan deteksi sungguhan: menangkap area peta yang tampil, mengirimnya
   * ke `POST /roof-detections` sebagai multipart, lalu menyimpan bidang hasinya
   * untuk dipilih pengguna. Tidak ada kandidat karangan di jalur ini.
   */
  const runRoofDetection = useCallback(async () => {
    const map = mapInstanceRef.current;

    if (!map) {
      showToast("Peta belum siap. Tunggu sebentar, lalu pindai ulang.");
      return;
    }

    setIsAiScanning(true);
    setShowDetectedRoofs(false);
    setSelectionDone(false);
    setSelectedDetectedIds([]);

    try {
      const capture = await captureMapForDetection(map, {
        layer: esriSatelliteLayerRef.current,
      });


      const response = await api.detectRoofs({
        blob: capture.blob,
        bbox: capture.bbox,
        width: capture.width,
        height: capture.height,
        zoom: capture.zoom,
      });

      setDetection(response);
      setDetectedRoofs(response.roofs);
      setSelectedDetectedIds([]);
      setShowDetectedRoofs(response.roofs.length > 0);

      // Pratinjau di peta memakai bbox yang sama dengan yang dikirim ke model,
      // supaya area yang dilihat pengguna identik dengan area yang dipindai.
      revealCaptureArea(response.image.bbox);
      setCapturePreviewUrl(URL.createObjectURL(capture.blob));

      if (response.roofs.length === 0) {
        showToast(
          "Model tidak menemukan bidang atap di area ini. Geser peta ke atap lain, lalu pindai ulang."
        );
      } else {
        showToast(
          `${response.roofs.length} bidang atap terdeteksi. Klik bidang pada peta untuk memilih.`
        );
      }
    } catch (caught) {
      setDetection(null);
      setDetectedRoofs([]);
      setShowDetectedRoofs(false);
      setCapturePreviewUrl(null);
      showToast(detectionErrorMessage(caught));
    } finally {
      setIsAiScanning(false);
    }
  }, [detectionErrorMessage, revealCaptureArea, showToast]);

  const handleRunAiDetection = useCallback(() => {
    showToast("Menjalankan model AI untuk memindai kontur atap...");
    void runRoofDetection();
  }, [runRoofDetection, showToast]);

  /**
   * Memindahkan bidang terpilih dari hasil deteksi menjadi bidang proyek.
   * Kemiringan dan azimuth tetap diisi pengguna setelah bidang diterapkan.
   */
  const commitDetectedSelection = useCallback(() => {
    const image = detection?.image;

    if (!image) {
      setShowDetectedRoofs(false);
      setSelectionDone(true);
      return;
    }

    const chosen = detectedRoofs.filter((roof) => selectedDetectedIds.includes(roof.id));

    if (chosen.length === 0) {
      showToast("Pilih minimal satu bidang atap pada peta terlebih dahulu.");
      return;
    }

    const startIndex = facets.length;
    const added = chosen.map((roof, index) =>
      buildFacetFromDetectedRoof(roof, image, startIndex + index)
    );
    const totalArea = chosen.reduce((sum, roof) => sum + roof.area_sqm, 0);

    setFacets((prev) => [...prev, ...added]);
    setSelectedFacetIds(added.map((facet) => facet.id));
    setActiveFacetId(added[added.length - 1].id);
    setSelectedDetectedIds([]);
    setShowDetectedRoofs(false);
    setSelectionDone(true);
    showToast(
      `${added.length} bidang atap diterapkan (${totalArea.toFixed(1)} m²). Sesuaikan kemiringan dan azimuth sesuai kondisi nyata.`
    );
  }, [
    detection,
    detectedRoofs,
    selectedDetectedIds,
    facets.length,
    showToast,
    setActiveFacetId,
  ]);

  /** Alur GPS: pindah ke koordinat, lalu jalankan deteksi nyata di sana. */
  const triggerGpsDetectionFlow = useCallback(
    (latitude: number, longitude: number) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([latitude, longitude], 21, { duration: 1.2 });
      }

      setAddressInput("Lokasi GPS Terkini");
      setFacets([]);
      setSelectedFacetIds([]);
      setDetection(null);
      setDetectedRoofs([]);
      setSelectedDetectedIds([]);
      setSelectionDone(false);
      setCapturePreviewUrl(null);

      void runRoofDetection();
    },
    [runRoofDetection]
  );

  const startVertexDrag = useCallback(
    (e: ReactMouseEvent, facetId: string, vertexIdx: number) => {
      e.stopPropagation();
      e.preventDefault();
      setActiveFacetId(facetId);
      const facet = facets.find((f) => f.id === facetId) || activeFacet;
      const currentVertices = getFacetVertices(facet);
      setVertexDragState({
        facetId,
        vertexIdx,
        startX: e.clientX,
        startY: e.clientY,
        initVertices: currentVertices.map((v) => ({ ...v })),
        initOx: facet.offsetX,
        initOy: facet.offsetY,
        initLat: facet.lat,
        initLng: facet.lng,
      });
    },
    [facets, activeFacet]
  );

  const addVertexAtEdge = useCallback(
    (edgeIdx: number) => {
      const currentVertices = getFacetVertices(activeFacet);
      const nextIdx = (edgeIdx + 1) % currentVertices.length;
      const p1 = currentVertices[edgeIdx];
      const p2 = currentVertices[nextIdx];
      const midPoint: Point2D = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };

      const newVertices = [
        ...currentVertices.slice(0, edgeIdx + 1),
        midPoint,
        ...currentVertices.slice(edgeIdx + 1),
      ];

      updateActiveFacet({ ...buildPolygonPatch(newVertices, activeFacet), slotOverrides: {} });
      showToast(`✨ Simpul baru ditambahkan (${newVertices.length} titik)`);
    },
    [activeFacet, updateActiveFacet, showToast, buildPolygonPatch]
  );

  const deleteVertex = useCallback(
    (vertexIdx: number) => {
      const currentVertices = getFacetVertices(activeFacet);
      if (currentVertices.length <= 3) {
        showToast("Minimal poligon harus memiliki 3 simpul!");
        return;
      }
      const newVertices = currentVertices.filter((_, i) => i !== vertexIdx);
      updateActiveFacet({ ...buildPolygonPatch(newVertices, activeFacet), slotOverrides: {} });
      showToast(`🗑️ Simpul #${vertexIdx + 1} dihapus (${newVertices.length} titik tersisa)`);
    },
    [activeFacet, updateActiveFacet, showToast, buildPolygonPatch]
  );

  const deleteLastVertex = useCallback(() => {
    const currentVertices = getFacetVertices(activeFacet);
    if (currentVertices.length <= 3) {
      showToast("Minimal poligon harus memiliki 3 simpul!");
      return;
    }
    deleteVertex(currentVertices.length - 1);
  }, [activeFacet, deleteVertex, showToast]);

  const finishPenPolygon = useCallback(
    (points: Point2D[]) => {
      if (points.length < 3) {
        showToast("Minimal butuh 3 titik untuk membuat poligon!");
        return;
      }

      // 1. Calculate true bounding box of drawn points
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // Exact center of the drawn polygon in screen pixels
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      // Real-world physical dimensions in meters (exact bounding box, no artificial minimum)
      const ridge = Math.max(0.1, Math.round(((maxX - minX) / pixelsPerMeter) * 100) / 100);
      const slope = Math.max(0.1, Math.round(((maxY - minY) / pixelsPerMeter) * 100) / 100);

      // Symmetrically centered vertices around (0, 0), millimeter precision
      const vertices: Point2D[] = points.map((p) => ({
        x: Math.round(((p.x - cx) / pixelsPerMeter) * 1000) / 1000,
        y: Math.round(((p.y - cy) / pixelsPerMeter) * 1000) / 1000,
      }));

      const area = computePolygonArea(vertices);

      // Viewport dimensions to calculate exact screen offset so polygon stays where user drew it!
      let offsetX = 0;
      let offsetY = 0;
      const viewportEl = document.getElementById("canvas-viewport-container");
      if (viewportEl) {
        const vRect = viewportEl.getBoundingClientRect();
        offsetX = Math.round(cx - vRect.width / 2);
        offsetY = Math.round(cy - vRect.height / 2);
      }

      // Geo-coordinates projection from Leaflet map
      let targetLat = activeFacet.lat || -6.6110;
      let targetLng = activeFacet.lng || 106.8150;
      if (mapInstanceRef.current && (window as any).L) {
        try {
          const L = (window as any).L;
          const latLng = mapInstanceRef.current.containerPointToLatLng(L.point(cx, cy));
          targetLat = latLng.lat;
          targetLng = latLng.lng;
        } catch {}
      }

      const newNum = facets.length + 1;
      const newId = `facet-custom-${Date.now()}`;
      const newFacet: RoofFacet = {
        id: newId,
        name: `Poligon Manual #${newNum}`,
        shape: "custom_polygon",
        ridge,
        slope,
        pitch: 20,
        azimuth: 188,
        setback: 0.3,
        gutter: 0.3,
        rotation: 0,
        lat: targetLat,
        lng: targetLng,
        offsetX,
        offsetY,
        hasHvac: false,
        hasSkylight: false,
        modulePower: 550,
        orientation: "portrait",
        panelGap: 3,
        slotOverrides: {},
        customModuleCount: null,
        vertices,
      };

      setFacets((prev) => [...prev, newFacet]);
      setActiveFacetId(newId);
      setPenPoints([]);
      setCadTool("edit_polygon");
      showToast(
        `✨ Poligon baru berhasil dibuat (${points.length} simpul, ${area.toFixed(1)} m²)!`
      );
    },
    [pixelsPerMeter, activeFacet, facets.length, showToast]
  );

  const handleCanvasPenClick = (e: ReactMouseEvent) => {
    if (cadTool !== "pen") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pt: Point2D = {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };

    if (penPoints.length >= 3) {
      const p0 = penPoints[0];
      const dist = Math.hypot(pt.x - p0.x, pt.y - p0.y);
      if (dist < 22) {
        finishPenPolygon(penPoints);
        return;
      }
    }

    setPenPoints((prev) => [...prev, pt]);
  };

  const measureTotalDistance = useMemo(() => {
    if (measurePoints.length < 2) return 0;
    let dist = 0;
    for (let i = 0; i < measurePoints.length - 1; i++) {
      dist += Math.hypot(
        measurePoints[i + 1].x - measurePoints[i].x,
        measurePoints[i + 1].y - measurePoints[i].y
      );
    }
    if (isMeasureClosed && measurePoints.length >= 3) {
      dist += Math.hypot(
        measurePoints[0].x - measurePoints[measurePoints.length - 1].x,
        measurePoints[0].y - measurePoints[measurePoints.length - 1].y
      );
    }
    return dist / pixelsPerMeter;
  }, [measurePoints, pixelsPerMeter, isMeasureClosed]);

  const measureArea = useMemo(() => {
    if (measurePoints.length < 3) return 0;
    const meterPts = measurePoints.map((p) => ({
      x: p.x / pixelsPerMeter,
      y: p.y / pixelsPerMeter,
    }));
    return computePolygonArea(meterPts);
  }, [measurePoints, pixelsPerMeter]);

  const measureCentroid = useMemo(() => {
    if (measurePoints.length === 0) return null;
    let sumX = 0;
    let sumY = 0;
    for (const p of measurePoints) {
      sumX += p.x;
      sumY += p.y;
    }
    return {
      x: sumX / measurePoints.length,
      y: sumY / measurePoints.length,
    };
  }, [measurePoints]);

  const handleCanvasMeasureClick = (e: ReactMouseEvent) => {
    if (cadTool !== "measure") return;
    if (isMeasureClosed) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pt: Point2D = {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };

    if (measurePoints.length >= 3) {
      const p0 = measurePoints[0];
      const dist = Math.hypot(pt.x - p0.x, pt.y - p0.y);
      if (dist < 24) {
        setIsMeasureClosed(true);
        showToast("Poligon tertutup! Luas area berhasil dihitung.");
        return;
      }
    }

    setMeasurePoints((prev) => [...prev, pt]);
  };

  const handleConvertMeasureToFacet = () => {
    if (measurePoints.length < 3) return;
    finishPenPolygon(measurePoints);
    setMeasurePoints([]);
    setIsMeasureClosed(false);
  };

  const addNewFacet = useCallback(() => {
    const newId = `facet-${Date.now()}`;
    const newNum = facets.length + 1;
    const newFacet: RoofFacet = {
      id: newId,
      name: `Bidang Atap #${newNum}`,
      shape: "rectangle",
      ridge: 8.5,
      slope: 5.2,
      pitch: 20,
      azimuth: 188,
      setback: 0.5,
      gutter: 0.5,
      rotation: activeFacet.rotation || -4,
      lat: (activeFacet.lat || -6.6110) - 0.00008,
      lng: (activeFacet.lng || 106.8150) + 0.00012,
      offsetX: activeFacet.offsetX + 150,
      offsetY: activeFacet.offsetY + 70,
      hasHvac: false,
      hasSkylight: false,
      modulePower: activeFacet.modulePower || 550,
      orientation: activeFacet.orientation || "portrait",
      panelGap: activeFacet.panelGap || 3,
      slotOverrides: {},
      customModuleCount: null,
    };
    setFacets((prev) => [...prev, newFacet]);
    setActiveFacetId(newId);
    showToast(`Bidang Atap #${newNum} berhasil ditambahkan`);
  }, [facets.length, activeFacet, showToast]);

  const deleteFacet = useCallback((id: string) => {
    if (facets.length <= 1) {
      showToast("Minimal harus ada 1 bidang atap aktif!");
      return;
    }
    setFacets((prev) => {
      const next = prev.filter((f) => f.id !== id);
      return next;
    });
    setSelectedFacetIds((prev) => prev.filter((fid) => fid !== id));
    showToast("Bidang atap dihapus");
  }, [facets.length, showToast]);

  // Backward-compatible field accessors mapped to active facet
  const ridge = activeFacet.ridge;
  const slope = activeFacet.slope;
  const pitch = activeFacet.pitch;
  const azimuth = activeFacet.azimuth;
  const setback = activeFacet.setback;
  const gutter = activeFacet.gutter;
  const roofShape = activeFacet.shape;
  const polygonRotation = activeFacet.rotation;
  const offsetX = activeFacet.offsetX;
  const offsetY = activeFacet.offsetY;
  const hasHvac = activeFacet.hasHvac;
  const hasSkylight = activeFacet.hasSkylight;
  const modulePower = activeFacet.modulePower;
  const orientation = activeFacet.orientation;
  const panelGap = activeFacet.panelGap;
  const slotOverrides = activeFacet.slotOverrides;
  const customModuleCount = activeFacet.customModuleCount;

  // For custom polygons, ridge/slope edits scale the actual vertices so outline & dimensions stay in sync
  const isCustomActive = activeFacet.shape === "custom_polygon" && (activeFacet.vertices?.length ?? 0) >= 3;
  const setRidge = (val: number | ((prev: number) => number)) => {
    const nextVal = Math.max(1, typeof val === "function" ? val(activeFacet.ridge) : val);
    if (isCustomActive && activeFacet.vertices) {
      const b = polygonBounds(activeFacet.vertices);
      const s = b.width > 0 ? nextVal / b.width : 1;
      updateActiveFacet({
        ridge: nextVal,
        vertices: activeFacet.vertices.map((v) => ({ x: Math.round(v.x * s * 1000) / 1000, y: v.y })),
      });
      return;
    }
    updateActiveFacet({ ridge: nextVal });
  };
  const setSlope = (val: number | ((prev: number) => number)) => {
    const nextVal = Math.max(1, typeof val === "function" ? val(activeFacet.slope) : val);
    if (isCustomActive && activeFacet.vertices) {
      const b = polygonBounds(activeFacet.vertices);
      const s = b.height > 0 ? nextVal / b.height : 1;
      updateActiveFacet({
        slope: nextVal,
        vertices: activeFacet.vertices.map((v) => ({ x: v.x, y: Math.round(v.y * s * 1000) / 1000 })),
      });
      return;
    }
    updateActiveFacet({ slope: nextVal });
  };
  const setPitch = (val: number | ((prev: number) => number)) => {
    const nextVal = typeof val === "function" ? val(activeFacet.pitch) : val;
    updateActiveFacet({ pitch: Math.max(0, Math.min(60, nextVal)) });
  };
  const setAzimuth = (val: number | ((prev: number) => number)) => {
    const nextVal = typeof val === "function" ? val(activeFacet.azimuth) : val;
    updateActiveFacet({ azimuth: nextVal });
  };
  const setSetback = (val: number | ((prev: number) => number)) => {
    const nextVal = typeof val === "function" ? val(activeFacet.setback) : val;
    updateActiveFacet({ setback: nextVal });
  };
  const setGutter = (val: number | ((prev: number) => number)) => {
    const nextVal = typeof val === "function" ? val(activeFacet.gutter) : val;
    updateActiveFacet({ gutter: nextVal });
  };
  const alignToAzimuth = activeFacet.alignToAzimuth ?? true;
  const setAlignToAzimuth = (val: boolean) => {
    updateActiveFacet({ alignToAzimuth: val });
    showToast(val ? "Grid panel diselaraskan dengan Azimuth matahari" : "Grid panel disejajarkan dengan kemiringan atap (flush)");
  };

  const setRoofShape = (shape: RoofShape) => {
    if (shape === "custom_polygon") {
      const existingVerts =
        activeFacet.vertices && activeFacet.vertices.length >= 3
          ? activeFacet.vertices
          : getFacetVertices(activeFacet);
      updateActiveFacet({
        shape,
        vertices: existingVerts,
        slotOverrides: {},
        customModuleCount: null,
      });
      setCadTool("edit_polygon");
      showToast("Beralih ke Poligon Bebas (Mode Edit Simpul Figma)");
      return;
    }
    const templateVertices = getFacetVertices({ ...activeFacet, shape, vertices: undefined });
    updateActiveFacet({
      shape,
      vertices: templateVertices,
      slotOverrides: {},
      customModuleCount: null,
    });
    showToast(
      `Bentuk atap diubah ke ${shape === "rectangle" ? "Persegi" : shape === "l-shape" ? "Bentuk L" : "Limasan"}`
    );
  };

  const nudgeFacet = (dx: number, dy: number) => {
    let nextLat = activeFacet.lat;
    let nextLng = activeFacet.lng;

    if (mapInstanceRef.current && (window as any).L && activeFacet.lat && activeFacet.lng) {
      try {
        const L = (window as any).L;
        const currentPt = mapInstanceRef.current.latLngToContainerPoint([activeFacet.lat, activeFacet.lng]);
        const targetPt = L.point(currentPt.x + dx, currentPt.y + dy);
        const targetLatLng = mapInstanceRef.current.containerPointToLatLng(targetPt);
        nextLat = targetLatLng.lat;
        nextLng = targetLatLng.lng;
      } catch {}
    }

    const nextOx = (activeFacet.offsetX || 0) + dx;
    const nextOy = (activeFacet.offsetY || 0) + dy;

    updateActiveFacet({
      offsetX: nextOx,
      offsetY: nextOy,
      lat: nextLat,
      lng: nextLng,
    });
  };

  const centerFacetOnRoof = () => {
    let centerLat = activeFacet.lat;
    let centerLng = activeFacet.lng;
    if (mapInstanceRef.current) {
      try {
        const c = mapInstanceRef.current.getCenter();
        centerLat = c.lat;
        centerLng = c.lng;
      } catch {}
    }
    updateActiveFacet({
      offsetX: 0,
      offsetY: 0,
      lat: centerLat,
      lng: centerLng,
    });
    showToast("Poligon dipusatkan ke titik tengah atap");
  };
  const setPolygonRotation = (rot: number | ((prev: number) => number)) => {
    const nextVal = typeof rot === "function" ? rot(activeFacet.rotation) : rot;
    updateActiveFacet({ rotation: nextVal });
  };
  const setOffsetX = (ox: number | ((prev: number) => number)) => {
    const nextVal = typeof ox === "function" ? ox(activeFacet.offsetX) : ox;
    updateActiveFacet({ offsetX: nextVal });
  };
  const setOffsetY = (oy: number | ((prev: number) => number)) => {
    const nextVal = typeof oy === "function" ? oy(activeFacet.offsetY) : oy;
    updateActiveFacet({ offsetY: nextVal });
  };
  const setHasHvac = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === "function" ? val(activeFacet.hasHvac) : val;
    updateActiveFacet({ hasHvac: nextVal });
  };
  const setHasSkylight = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === "function" ? val(activeFacet.hasSkylight) : val;
    updateActiveFacet({ hasSkylight: nextVal });
  };
  const setModulePower = (p: number) => updateActiveFacet({ modulePower: p });
  const setOrientation = (o: Orientation) => updateActiveFacet({ orientation: o });
  const setPanelGap = (g: number) => updateActiveFacet({ panelGap: g });
  const setSlotOverrides = (val: Record<string, SlotState> | ((prev: Record<string, SlotState>) => Record<string, SlotState>)) => {
    const nextVal = typeof val === "function" ? val(activeFacet.slotOverrides) : val;
    updateActiveFacet({ slotOverrides: nextVal });
  };
  const setCustomModuleCount = (cnt: number | null | ((prev: number | null) => number | null)) => {
    const nextVal = typeof cnt === "function" ? cnt(activeFacet.customModuleCount) : cnt;
    updateActiveFacet({ customModuleCount: nextVal });
  };

  // Other Studio System Parameters
  const [extraTilt, setExtraTilt] = useState(10);
  const [inverterType, setInverterType] = useState<InverterType>("string");
  const [plnTariff, setPlnTariff] = useState(1700);
  const [monthlyBill, setMonthlyBill] = useState(2_800_000);
  const [manualBillInput, setManualBillInput] = useState<string>("");
  const [isTypingBill, setIsTypingBill] = useState(false);

  // ROI Interactive Chart State
  const [roiYear, setRoiYear] = useState(4.8);
  const [roiHoverYear, setRoiHoverYear] = useState<number | null>(null);

  // Studio Nav Hover Expand/Collapse State & Filter Popover
  const [studioNavOpen, setStudioNavOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const navCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNavMouseEnter = useCallback(() => {
    if (navCollapseTimerRef.current) {
      clearTimeout(navCollapseTimerRef.current);
      navCollapseTimerRef.current = null;
    }
    setStudioNavOpen(true);
  }, []);

  const handleNavMouseLeave = useCallback(() => {
    if (navCollapseTimerRef.current) {
      clearTimeout(navCollapseTimerRef.current);
    }
    if (!searchOpen && !filterOpen) {
      navCollapseTimerRef.current = setTimeout(() => {
        setStudioNavOpen(false);
      }, 300);
    }
  }, [searchOpen, filterOpen]);
  const [mounted, setMounted] = useState(false);

  // Biodata state
  const [biodata, setBiodata] = useState<UserBiodata | null>(null);

  useEffect(() => {
    setMounted(true);
    setBiodata(getStoredBiodata());
  }, []);

  const initials = useMemo(() => {
    if (!mounted || !biodata?.name) return "PS";
    const parts = biodata.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [mounted, biodata?.name]);

  const [isGpsLoading, setIsGpsLoading] = useState(false);

  const filteredStudioProjects = useMemo(() => {
    const q = addressInput.trim().toLowerCase();
    if (!q) return STUDIO_SAVED_PROJECTS;
    return STUDIO_SAVED_PROJECTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );
  }, [addressInput]);

  const handleSelectStudioProject = (proj: (typeof STUDIO_SAVED_PROJECTS)[0]) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([proj.lat, proj.lon], 21, { duration: 1.2 });
    }
    updateActiveFacet({
      lat: proj.lat,
      lng: proj.lon,
      ridge: proj.ridge,
      slope: proj.slope,
      shape: proj.shape,
      rotation: proj.deg,
      name: proj.name,
    });
    setAddressInput(proj.address);
    showToast(`Beralih ke proyek: ${proj.name}`);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      showToast("Geolokasi tidak didukung oleh peramban, menggunakan lokasi simulasi.");
      triggerGpsDetectionFlow(-6.6110, 106.8150);
      setSearchOpen(false);
      return;
    }
    setIsGpsLoading(true);
    showToast("Mengakses sensor GPS perangkat...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        triggerGpsDetectionFlow(pos.coords.latitude, pos.coords.longitude);
        setSearchOpen(false);
      },
      (err) => {
        setIsGpsLoading(false);
        showToast("Izin GPS tidak aktif, memuat lokasi simulasi.");
        triggerGpsDetectionFlow(-6.6110, 106.8150);
        setSearchOpen(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    const bio = getStoredBiodata();
    setBiodata(bio);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const mode = sp.get("mode");
      const latParam = sp.get("lat");
      const lngParam = sp.get("lng");

      if (mode === "gps") {
        const lat = latParam ? parseFloat(latParam) : -6.6110;
        const lng = lngParam ? parseFloat(lngParam) : 106.8150;
        triggerGpsDetectionFlow(lat, lng);
        return;
      }

      const addr = sp.get("address");
      const shape = sp.get("shape") as RoofShape | null;
      const ridgeParam = sp.get("ridge");
      const slopeParam = sp.get("slope");
      const degParam = sp.get("deg");

      if (addr) setAddressInput(addr);
      else if (bio?.location) setAddressInput(bio.location);

      if (shape && ["rectangle", "hip", "trapezoid", "l-shape"].includes(shape)) {
        setRoofShape(shape);
      }
      if (ridgeParam) {
        const val = parseFloat(ridgeParam);
        if (!isNaN(val)) setRidge(val);
      }
      if (slopeParam) {
        const val = parseFloat(slopeParam);
        if (!isNaN(val)) setSlope(val);
      }
      if (degParam) {
        const val = parseFloat(degParam);
        if (!isNaN(val)) setPolygonRotation(val);
      }
    }
  }, [triggerGpsDetectionFlow]);

  // Initialize Dynamic OpenStreetMap & Real Earth Satellite Map (CDN, zero npm packages)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;

      const container = document.getElementById("studio-leaflet-map");
      if (!container || mapInstanceRef.current) return;

      try {
        const pLat = searchParams.get("lat") ? Number(searchParams.get("lat")) : -6.6110;
        const pLng = searchParams.get("lng") ? Number(searchParams.get("lng")) : 106.8150;
        const map = L.map("studio-leaflet-map", {
          center: [!isNaN(pLat) ? pLat : -6.6110, !isNaN(pLng) ? pLng : 106.8150],
          zoom: 21,
          maxZoom: 22,
          minZoom: 16,
          zoomControl: false,
          attributionControl: false,
        });

        // Max bounds restricting map to Kota Bogor and surrounding area
        const bogorBounds = L.latLngBounds(
          L.latLng(-6.6800, 106.7200),
          L.latLng(-6.5100, 106.8800)
        );
        map.setMaxBounds(bogorBounds);

        // Update positions on all map pan, zoom, and resize events
        map.on("move zoom viewreset resize", () => {
          setMapTick((t: number) => (t + 1) % 1000000);
        });

        // Real Earth Esri World Imagery (High-resolution satellite nadir tiles)
        // `crossOrigin` wajib: tanpa itu kanvas tangkapan menjadi tainted dan
        // ekspor JPEG untuk deteksi atap akan gagal.
        const esriSatellite = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { maxNativeZoom: 19, maxZoom: 22, crossOrigin: true }
        );

        // OpenStreetMap (OSM) standard vector road tile layer
        const osmStreet = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxNativeZoom: 19,
          maxZoom: 22,
          crossOrigin: true,
        });

        // Hybrid labels layer (Street & City reference)
        const labelsLayer = L.tileLayer(
          "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          { maxNativeZoom: 19, maxZoom: 22, crossOrigin: true }
        );

        esriSatellite.addTo(map);
        labelsLayer.addTo(map);

        mapInstanceRef.current = map;
        esriSatelliteLayerRef.current = esriSatellite;
        osmStreetLayerRef.current = osmStreet;
        labelsLayerRef.current = labelsLayer;
        setMapLoaded(true);
      } catch (err) {
        console.warn("Leaflet init error:", err);
      }
    };

    if (!(window as any).L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => initMap();
      script.onerror = () => {
        console.warn("Failed to load Leaflet CDN, satellite fallback will remain.");
      };
      document.body.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Invalidate map size smoothly whenever right panel toggles (prevents cut-off blank map!)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.invalidateSize();
    setMapTick((t) => (t + 1) % 1000000);

    let start = performance.now();
    const step = () => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.invalidateSize();
      setMapTick((t) => (t + 1) % 1000000);
      if (performance.now() - start < 350) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [rightPanelOpen]);

  // ResizeObserver on the map container
  useEffect(() => {
    const container = document.getElementById("studio-leaflet-map");
    if (!container || typeof window === "undefined" || !("ResizeObserver" in window)) return;

    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        setMapTick((t) => (t + 1) % 1000000);
      }
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [mapLoaded]);

  // Sync Map Layers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const esri = esriSatelliteLayerRef.current;
    const osm = osmStreetLayerRef.current;
    const labels = labelsLayerRef.current;
    if (!esri || !osm || !labels) return;

    if (activeLayer === "satellite") {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(esri)) esri.addTo(map);
      if (!map.hasLayer(labels)) labels.addTo(map);
    } else if (activeLayer === "cv") {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(esri)) esri.addTo(map);
      if (!map.hasLayer(labels)) labels.addTo(map);
    } else if (activeLayer === "heatmap") {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(esri)) esri.addTo(map);
      if (!map.hasLayer(labels)) labels.addTo(map);
    }
  }, [activeLayer, mapLoaded]);

  /**
   * Pratinjau tangkapan: gambar berkas yang benar-benar dikirim ke model pada
   * `bbox` yang sama, sehingga batas area yang dianalisis terlihat langsung di
   * peta. Overlay ikut hilang bersama poligon kandidat.
   */
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;

    if (!map || !L || !mapLoaded || !showDetectedRoofs) return;
    if (capturePreviewUrl === null || detection === null) return;

    const [minLng, minLat, maxLng, maxLat] = detection.image.bbox;
    const overlay = L.imageOverlay(
      capturePreviewUrl,
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { opacity: 0.9, interactive: false }
    ).addTo(map);

    return () => {
      overlay.remove();
    };
  }, [showDetectedRoofs, capturePreviewUrl, detection, mapLoaded]);

  // Object URL pratinjau dilepas saat diganti atau saat halaman ditinggalkan.
  useEffect(() => {
    if (capturePreviewUrl === null) return;

    return () => {
      URL.revokeObjectURL(capturePreviewUrl);
    };
  }, [capturePreviewUrl]);

  /**
   * Poligon hasil deteksi digambar sebagai layer Leaflet dari `polygon_lnglat`
   * apa adanya, jadi posisinya tetap benar di pan/zoom mana pun. Klik poligon
   * menambah atau mencabut pilihannya.
   */
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;

    if (!map || !L || !mapLoaded) return;

    const layers: Map<string, any> = detectionLayersRef.current;
    const visible = showDetectedRoofs ? remainingDetectedRoofs : [];
    const wanted = new Set(visible.map((roof) => roof.id));

    for (const [id, layer] of layers) {
      if (!wanted.has(id)) {
        map.removeLayer(layer);
        layers.delete(id);
      }
    }

    for (const roof of visible) {
      const isSelected = selectedDetectedIds.includes(roof.id);
      const style = {
        color: isSelected ? "#b45309" : "#f59e0b",
        weight: isSelected ? 4 : 2.5,
        dashArray: isSelected ? null : "6 4",
        fillColor: "#f59e0b",
        fillOpacity: isSelected ? 0.34 : 0.18,
      };

      const existing = layers.get(roof.id);

      if (existing) {
        existing.setStyle(style);
        continue;
      }

      // Kontrak memakai urutan GeoJSON `[lng, lat]`, Leaflet memakai `[lat, lng]`.
      const latLngs = roof.polygon_lnglat.map(([lng, lat]) => [lat, lng]);
      const polygon = L.polygon(latLngs, style).addTo(map);
      polygon.on("click", () => selectDetectedRoof(roof.id));
      polygon.bindTooltip(
        `${roof.area_sqm.toFixed(1)} m² · keyakinan ${Math.round(roof.confidence * 100)}%`,
        { sticky: true }
      );
      layers.set(roof.id, polygon);
    }
  }, [
    remainingDetectedRoofs,
    selectedDetectedIds,
    showDetectedRoofs,
    mapLoaded,
    selectDetectedRoof,
  ]);

  // Layer deteksi hanya milik peta yang sedang aktif; bersihkan daftarnya saat
  // komponen dilepas supaya tidak menunjuk layer dari peta yang sudah dihancurkan.
  useEffect(() => {
    const layers: Map<string, any> = detectionLayersRef.current;

    return () => {
      layers.clear();
    };
  }, []);

  // OSM Nominatim Geocoding & Preset Search handler (Focused on Kota Bogor & presets)
  const handleGeocodeSearch = async (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    if (q.includes("gps") || q.includes("lokasi terkini") || q.includes("lokasi saya")) {
      handleUseGps();
      return;
    }

    // Check presets first for instant & accurate jump
    const matchedPreset = PRESET_ADDRESSES.find(
      (p) => p.label.toLowerCase().includes(q) || q.includes(p.label.toLowerCase().slice(0, 10))
    );
    if (matchedPreset) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([matchedPreset.lat, matchedPreset.lon], 21, { duration: 1.2 });
      }
      updateActiveFacet({
        lat: matchedPreset.lat,
        lng: matchedPreset.lon,
        ridge: matchedPreset.ridge,
        slope: matchedPreset.slope,
        shape: matchedPreset.shape,
        rotation: matchedPreset.deg,
        name: matchedPreset.label,
      });
      setAddressInput(matchedPreset.label);
      showToast(`Lokasi diterapkan: ${matchedPreset.label}`);
      return;
    }

    if (q.includes("baranangsiang")) {
      const lat = -6.6110;
      const lon = 106.8150;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lon], 21, { duration: 1.2 });
      }
      updateActiveFacet({ lat, lng: lon, name: "Baranangsiang Indah" });
      setAddressInput("Komp. Baranangsiang Indah Blok C, Bogor Timur");
      showToast("Lokasi: Baranangsiang Indah, Bogor Timur");
      return;
    }

    const searchQuery = q.includes("bogor") ? query : `${query}, Kota Bogor`;
    showToast(`Mencari lokasi: ${searchQuery}...`);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&viewbox=106.72,-6.51,106.88,-6.68&bounded=0&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lon], 21, { duration: 1.2 });
        }
        updateActiveFacet({ lat, lng: lon });
        setAddressInput(data[0].display_name || searchQuery);
        showToast(`Lokasi ditemukan: ${data[0].display_name.split(",")[0]}`);
      } else {
        showToast("Lokasi tidak ditemukan di OSM. Menggunakan preset Bogor.");
      }
    } catch {
      showToast("Pencarian lokasi OSM siap digunakan.");
    }
  };

  const handleResetSearch = () => {
    const defaultAddress = "Komp. Baranangsiang Indah Blok C, Bogor Timur";
    const defaultLat = -6.6110;
    const defaultLng = 106.8150;
    setAddressInput(defaultAddress);
    updateActiveFacet({
      lat: defaultLat,
      lng: defaultLng,
      name: "Baranangsiang Indah",
    });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([defaultLat, defaultLng], 21, { duration: 1.2 });
    }
    showToast("Pencarian & lokasi peta direset ke posisi awal");
  };

  // Calculations (Multi-Polygon Solar Physics & Aggregate Financials based on ALL facets in project)
  const calc = useMemo(() => {
    const monthlyKwh = monthlyBill / plnTariff;
    const hasSelection = selectedFacets.length > 0;

    // Active Facet Specific Metrics (Used by Tab 1 & Grid Inspector)
    const activeMetrics = computeFacetMetrics(
      activeFacet,
      sunHour,
      obstacleFilterActive,
      extraTilt,
      inverterType
    );

    // Selected Facets Metrics (for selection inspection if needed)
    const selectedMetrics = selectedFacets.map((f) =>
      computeFacetMetrics(f, sunHour, obstacleFilterActive, extraTilt, inverterType)
    );

    // ALL Facets Metrics (Studio calculations reflect the ENTIRE PROJECT holistically!)
    const allFacetsMetrics = facets.map((f) =>
      computeFacetMetrics(f, sunHour, obstacleFilterActive, extraTilt, inverterType)
    );

    // Aggregate System Totals for ALL facets in project
    const totalGrossArea = allFacetsMetrics.reduce((s, m) => s + m.grossArea, 0);
    const totalNetArea = allFacetsMetrics.reduce((s, m) => s + m.netArea, 0);
    const totalValidSlots = allFacetsMetrics.reduce((s, m) => s + m.totalValidSlots, 0);
    const totalModulesFitted = allFacetsMetrics.reduce((s, m) => s + m.modulesFitted, 0);
    const totalActualKwp = allFacetsMetrics.reduce((s, m) => s + m.actualKwp, 0);
    const totalAnnualProductionKwh = allFacetsMetrics.reduce((s, m) => s + m.annualProductionKwh, 0);
    const totalMonthlyGenKwh = allFacetsMetrics.reduce((s, m) => s + m.monthlyGenKwh, 0);

    const costModules = allFacetsMetrics.reduce((s, m) => s + m.costModules, 0);
    const costInverter = allFacetsMetrics.reduce((s, m) => s + m.costInverter, 0);
    const costRacking = allFacetsMetrics.reduce((s, m) => s + m.costRacking, 0);
    const costInstall = totalModulesFitted > 0 ? 15_000_000 : 0; // Standar instalasi mekanikal & elektrikal proyek
    const totalCapex = costModules + costInverter + costRacking + costInstall;

    const monthlySaving = Math.min(monthlyBill, totalMonthlyGenKwh * plnTariff);
    const newMonthlyBill = Math.max(0, monthlyBill - monthlySaving);
    const annualSaving = monthlySaving * 12;
    const coveragePct = monthlyKwh > 0 ? Math.min(100, Math.round((totalMonthlyGenKwh / monthlyKwh) * 100)) : 0;

    const paybackYears = annualSaving > 0 && totalCapex > 0 ? totalCapex / annualSaving : null;
    const bepYear = paybackYears ? Math.round(paybackYears * 10) / 10 : 4.8;
    const irr = totalCapex > 0 ? Math.round(((annualSaving / totalCapex) * 100) * 10) / 10 : 0;
    const lcoe = totalAnnualProductionKwh > 0 ? Math.round(totalCapex / (totalAnnualProductionKwh * 25)) : 0;
    const cumulative25 = annualSaving * 25;
    const netProfit25 = cumulative25 - totalCapex * 1.15;

    // Environmental Serapan Karbon & Pohon: Always computed from ALL polygons in the project!
    const co2ReductionKg = totalAnnualProductionKwh * 0.8;
    const co2ReductionTon = co2ReductionKg / 1000;
    const treesEquivalent = Math.round(co2ReductionKg / 22);
    const forestHa = (treesEquivalent * 0.0011).toFixed(2);

    return {
      hasSelection,
      selectedCount: selectedFacets.length,
      projectFacetCount: facets.length,
      // Active Facet Specific (Used by Tab 1 & Grid Inspector)
      grossArea: activeMetrics.grossArea,
      netArea: activeMetrics.netArea,
      netAreaPct: activeMetrics.netAreaPct,
      cols: activeMetrics.cols,
      rows: activeMetrics.rows,
      validSlots: activeMetrics.validSlots,
      totalValidSlots: activeMetrics.totalValidSlots,
      modulesFitted: activeMetrics.modulesFitted,
      densityPct: activeMetrics.densityPct,
      pitchCosine: activeMetrics.pitchCosine,
      pitchEffPct: activeMetrics.pitchEffPct,
      azimuthEffPct: activeMetrics.azimuthEffPct,
      dcAcRatio: activeMetrics.dcAcRatio,
      inverterEffPct: activeMetrics.inverterEffPct,
      currentSpec: activeMetrics.currentSpec,
      portraitSlotsCount: activeMetrics.portraitSlotsCount,
      landscapeSlotsCount: activeMetrics.landscapeSlotsCount,
      bestOrientation: activeMetrics.bestOrientation,

      // Total System Aggregate Metrics across ENTIRE PROJECT (Used by Top Ribbon, Tab 3 & Charts)
      // Saat simulasi tersimpan baru dibuka, angka yang ditampilkan adalah angka
      // server apa adanya, bukan pratinjau yang bisa berbeda beberapa persen.
      isFromServer: serverMetrics !== null,
      totalGrossArea: serverMetrics?.total_area_sqm ?? totalGrossArea,
      totalNetArea: serverMetrics?.effective_area_sqm ?? totalNetArea,
      totalValidSlotsAggregate: totalValidSlots,
      totalModulesFitted: serverMetrics?.installed ?? totalModulesFitted,
      actualKwp: serverMetrics?.capacity_kwp ?? totalActualKwp,
      annualProductionKwh: serverMetrics?.annual_production_kwh ?? totalAnnualProductionKwh,
      monthlyGenKwh: totalMonthlyGenKwh,
      coveragePct,
      totalCapex,
      costModules,
      costInverter,
      costRacking,
      costInstall,
      cappedSaving: monthlySaving,
      newMonthlyBill,
      annualSaving,
      paybackYears,
      bepYear,
      irr,
      lcoe,
      cumulative25,
      netProfit25,
      co2ReductionTon,
      treesEquivalent,
      forestHa,
    };
  }, [
    facets,
    activeFacet,
    selectedFacets,
    monthlyBill,
    plnTariff,
    sunHour,
    obstacleFilterActive,
    extraTilt,
    inverterType,
    serverMetrics,
  ]);

  // Save Simulation to Server State & Action
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSimulation = async () => {
    if (detection === null) {
      showToast("Pindai bidang atap terlebih dahulu supaya bidang punya acuan tangkapan.");
      return;
    }

    const image = detection.image;

    // Bidang yang tersimpan adalah yang dicentang; bila tidak ada yang dicentang,
    // bidang yang sedang aktif saja.
    const targetFacets =
      selectedFacets.length > 0
        ? selectedFacets
        : facets.filter((facet) => facet.id === activeFacetId);

    if (targetFacets.length === 0) {
      showToast("Belum ada bidang atap untuk disimpan. Pilih minimal satu bidang.");
      return;
    }

    const roofs: SimulationRoofInput[] = [];
    const skipped: string[] = [];

    for (const facet of targetFacets) {
      const polygonPx = facetPolygonPx(facet, image);

      // Kontrak menolak poligon yang keluar dari batas berkas tangkapan, jadi
      // bidang yang sudah digeser keluar area dipisahkan agar simpan tidak gagal.
      if (!polygonInsideImage(polygonPx, image)) {
        skipped.push(facet.name);
        continue;
      }

      const detected = detectedRoofs.find((roof) => roof.id === facet.id);

      roofs.push({
        label: facet.name,
        detection_id: detected?.id ?? null,
        confidence: detected?.confidence ?? null,
        roof_polygon_px: polygonPx,
        // Keadaan tampilan ikut dikirim supaya simulasi dapat dibuka kembali persis.
        shape: facet.shape,
        align_to_azimuth: facet.alignToAzimuth ?? null,
        is_solar_populated: facet.isSolarPopulated ?? null,
        has_hvac: facet.hasHvac,
        has_skylight: facet.hasSkylight,
        slot_overrides: facet.slotOverrides,
        setback_m: facet.setback,
        gutter_m: facet.gutter,
        tilt_deg: facet.pitch,
        azimuth_deg: facet.azimuth,
        module_key: moduleKeyForPower(facet.modulePower),
        orientation: facet.orientation,
        clearance_m: facet.panelGap / 100,
        panel_count: facet.customModuleCount,
      });
    }

    if (roofs.length === 0) {
      showToast("Tidak ada bidang di dalam area tangkapan terakhir. Pindai ulang area ini.");
      return;
    }

    const payload: SimulationRequest = {
      image_id: detection.image_id,
      address: addressInput.trim() === "" ? null : addressInput.trim(),
      roofs,
      inverter_type: inverterType,
      monthly_bill_idr: monthlyBill,
      tariff_key: tariffKeyForRate(plnTariff),
    };

    setIsSaving(true);

    try {
      // Seluruh angka pada konfirmasi berasal dari respons server, bukan dari
      // perhitungan lokal `calc`.
      const res = await api.saveSimulation(payload);

      setSaveSuccess(true);

      // Sinkronkan proyek lokal memakai `center_point` dan `map_zoom` dari
      // server supaya peta bisa dibuka kembali pada tampilan yang sama.
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("sunsight_tour_pending", "true");
          const stored = localStorage.getItem("sunsight_saved_projects");
          const arr = stored ? JSON.parse(stored) : [];
          arr.unshift({
            id: res.id,
            name: roofs.length === 1 ? roofs[0].label : `${roofs.length} Bidang Atap`,
            address: addressInput,
            date: res.created_at.split("T")[0],
            lat: res.center_point.lat,
            lon: res.center_point.lng,
            zoom: res.map_zoom,
            capacityKwp: res.result.capacity_kwp,
            annualOutputKwh: Math.round(res.result.annual_production_kwh),
            monthlySavingsRp: res.result.monthly_saving_idr,
            bepYears: res.result.payback_years,
            roofCount: res.result.roof_count,
          });
          localStorage.setItem("sunsight_saved_projects", JSON.stringify(arr));
        } catch {}
      }

      const skippedNote =
        skipped.length > 0
          ? ` ${skipped.length} bidang di luar area tangkapan tidak disertakan.`
          : "";

      showToast(
        `Simulasi #${res.id} tersimpan — ${res.result.capacity_kwp.toLocaleString("id-ID")} kWp, ${
          Math.round(res.result.annual_production_kwh).toLocaleString("id-ID")
        } kWh/tahun.${skippedNote}`
      );
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (caught) {
      showToast(
        `Gagal menyimpan: ${
          caught instanceof Error && caught.message !== ""
            ? caught.message
            : "Periksa koneksi backend"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSlotClick = (key: string) => {
    if (obstacleBrush) {
      const current = slotOverrides[key];
      if (current === obstacleBrush) {
        // Toggle back to active
        const next = { ...slotOverrides };
        delete next[key];
        setSlotOverrides(next);
        showToast("Rintangan dihapus, modul aktif kembali");
      } else {
        setSlotOverrides((prev) => ({ ...prev, [key]: obstacleBrush }));
        showToast(
          `Rintangan manual diterapkan: ${
            obstacleBrush === "hvac"
              ? "AC / Chiller"
              : obstacleBrush === "skylight"
                ? "Skylight Kaca"
                : "Void / Ruang Kosong"
          }`
        );
      }
      return;
    }

    // Interactive direct toggle: click panel on polygon to turn off (empty) or turn on (active)
    const currentSlot = calc.validSlots.find((s: PanelSlotItem) => s.key === key);
    const currentState = currentSlot?.state ?? slotOverrides[key] ?? "active";

    if (currentState === "active") {
      // Turn OFF module into empty candidate slot
      const nextOverrides: Record<string, SlotState> = { ...slotOverrides, [key]: "empty" };
      const newActive = calc.validSlots.filter((s: PanelSlotItem) => {
        if (s.key === key) return false;
        return (nextOverrides[s.key] ?? s.state) === "active";
      }).length;

      updateActiveFacet({
        slotOverrides: nextOverrides,
        customModuleCount: newActive,
      });
      showToast(`Modul dinonaktifkan (${newActive} terpasang)`);
    } else {
      // Turn ON module into active solar panel
      const nextOverrides: Record<string, SlotState> = { ...slotOverrides, [key]: "active" };
      const newActive = calc.validSlots.filter((s: PanelSlotItem) => {
        if (s.key === key) return true;
        return (nextOverrides[s.key] ?? s.state) === "active";
      }).length;

      updateActiveFacet({
        slotOverrides: nextOverrides,
        customModuleCount: newActive,
      });
      showToast(`Modul surya dipasang (${newActive} terpasang)`);
    }
  };

  const azInfo = useMemo(() => {
    let name = "Utara";
    let desc = "Menghadap Utara - Radiasi cukup, terpengaruh deklinasi tahunan.";
    let isOptimal = false;
    if (azimuth >= 337.5 || azimuth < 22.5) {
      name = "Utara (U)";
      desc = "Menghadap Utara Murni (0°). Efisiensi baik untuk bulan Mei-Agustus.";
    } else if (azimuth >= 22.5 && azimuth < 67.5) {
      name = "Timur Laut (TL)";
      desc = "Orientasi pagi optimal, radiasi siang berkurang.";
    } else if (azimuth >= 67.5 && azimuth < 112.5) {
      name = "Timur (T)";
      desc = "Menghadap Timur Murni (90°). Tangkapan sinar pagi maksimal.";
    } else if (azimuth >= 112.5 && azimuth < 157.5) {
      name = "Tenggara (TG)";
      desc = "Peralihan Timur ke Selatan, profil radiasi seimbang.";
    } else if (azimuth >= 157.5 && azimuth < 202.5) {
      name = "Selatan (S)";
      if (azimuth >= 180 && azimuth <= 195) {
        name = "SSW (Selatan-Barat Daya)";
        desc = "⭐ Sudut Emas Indonesia! Menghadap Selatan-Barat Daya (188°) menangkap radiasi puncak siang hingga sore.";
        isOptimal = true;
      } else {
        desc = "Menghadap Selatan. Sangat ideal untuk wilayah khatulistiwa Indonesia.";
      }
    } else if (azimuth >= 202.5 && azimuth < 247.5) {
      name = "Barat Daya (BD)";
      desc = "Menghadap Barat Daya. Tangkapan radiasi sore maksimal saat beban puncak.";
    } else if (azimuth >= 247.5 && azimuth < 292.5) {
      name = "Barat (B)";
      desc = "Menghadap Barat Murni (270°). Efektif mengurangi tagihan saat jam beban puncak PLN sore hari.";
    } else {
      name = "Barat Laut (BL)";
      desc = "Peralihan Barat ke Utara, radiasi bervariasi.";
    }
    return { name, desc, isOptimal };
  }, [azimuth]);

  const adjustModuleCount = (delta: number) => {
    const current = customModuleCount !== null ? customModuleCount : calc.modulesFitted;
    const next = Math.max(1, Math.min(calc.totalValidSlots, current + delta));
    setCustomModuleCount(next);
    showToast(`Jumlah modul: ${next} unit`);
  };

  const setCountPreset = (preset: "max" | "opt" | "min") => {
    if (preset === "max") {
      setCustomModuleCount(calc.totalValidSlots);
      showToast(`Tata letak maksimal: ${calc.totalValidSlots} modul`);
    } else if (preset === "opt") {
      const opt = Math.max(1, Math.round(calc.totalValidSlots * 0.85));
      setCustomModuleCount(opt);
      showToast(`Rekomendasi optimal: ${opt} modul`);
    } else {
      const min = Math.max(1, Math.round(calc.totalValidSlots * 0.6));
      setCustomModuleCount(min);
      showToast(`Paket ekonomis: ${min} modul`);
    }
  };

  const nudgeAzimuth = (delta: number) => {
    setAzimuth((prev) => {
      let next = (prev + delta) % 360;
      if (next < 0) next += 360;
      return next;
    });
  };

  const toggleObstacle = (type: "hvac" | "skylight") => {
    if (type === "hvac") {
      setHasHvac((prev) => {
        const next = !prev;
        showToast(next ? "Rintangan HVAC Chiller ditambahkan" : "Rintangan HVAC Chiller dinonaktifkan");
        return next;
      });
    } else {
      setHasSkylight((prev) => {
        const next = !prev;
        showToast(next ? "Rintangan Skylight Kaca ditambahkan" : "Rintangan Skylight Kaca dinonaktifkan");
        return next;
      });
    }
  };

  const autoPackModules = () => {
    setSlotOverrides({});
    setCustomModuleCount(null);
    showToast("Tata letak modul disusun otomatis secara optimal");
  };

  const pitchRadVal = (pitch * Math.PI) / 180;
  const wedgeEndX = 20 + 32 * Math.cos(pitchRadVal);
  const wedgeEndY = 70 - 32 * Math.sin(pitchRadVal);
  const wedgePathD = `M 20 70 L 52 70 A 32 32 0 0 0 ${wedgeEndX.toFixed(1)} ${wedgeEndY.toFixed(1)} Z`;
  const arcPathD = `M 52 70 A 32 32 0 0 0 ${wedgeEndX.toFixed(1)} ${wedgeEndY.toFixed(1)}`;

  const currentInspectYear = roiHoverYear !== null ? roiHoverYear : (calc.bepYear || 4.8);

  const getCashFlowAtYear = (t: number) => {
    if (t <= 0) return -calc.totalCapex;
    const savings = t * calc.annualSaving;
    const inverterReplacement = t >= 12 ? calc.costInverter * 0.7 : 0;
    return -calc.totalCapex + savings - inverterReplacement;
  };

  const currentInspectCashFlow = getCashFlowAtYear(currentInspectYear);

  // Active Tree Count for Eco-Forest Animation (Live reactive to total installed solar panels across ALL project polygons)
  const activeTreeCount = useMemo(() => {
    // If 0 modules fitted in project: 0 trees sprouted
    if (calc.totalModulesFitted === 0) {
      return 0;
    }

    // 1. If user is actively hovering on ROI financial projection chart: preview 25-year growth
    if (roiHoverYear !== null) {
      const yearRatio = Math.max(0, Math.min(1, roiHoverYear / 25));
      return Math.max(2, Math.min(24, Math.round(2 + yearRatio * 22)));
    }

    // 2. Baseline Studio: Live reactive directly to installed solar panels across ALL project polygons
    const totalSlots = Math.max(1, calc.totalValidSlotsAggregate || calc.totalValidSlots || 1);
    const modRatio = Math.max(0, Math.min(1, calc.totalModulesFitted / totalSlots));
    return Math.max(1, Math.min(24, Math.round(modRatio * 24)));
  }, [calc.totalModulesFitted, calc.totalValidSlotsAggregate, calc.totalValidSlots, roiHoverYear]);

  const displayTreesCount = useMemo(() => {
    if (calc.totalModulesFitted === 0) {
      return 0;
    }
    // Only preview cumulative timeline when user is actively hovering over the ROI projection chart
    if (roiHoverYear !== null) {
      return Math.round(roiHoverYear * calc.treesEquivalent);
    }
    return calc.treesEquivalent;
  }, [calc.totalModulesFitted, roiHoverYear, calc.treesEquivalent]);

  const chartW = 340;
  const chartH = 125;
  const chartPadLeft = 28;
  const chartPadRight = 20;
  const plotW = chartW - chartPadLeft - chartPadRight;
  const minVal = Math.min(-1_000_000, -calc.totalCapex * 1.05);
  const maxVal = Math.max(1_000_000, (calc.cumulative25 - calc.totalCapex) * 1.05);
  const valRange = Math.max(1_000_000, maxVal - minVal);

  const mapChartX = (t: number) => chartPadLeft + (Math.max(0, Math.min(25, t)) / 25) * plotW;
  const mapChartY = (v: number) => chartH - 20 - ((v - minVal) / valRange) * (chartH - 35);
  const zeroY = mapChartY(0);

  const effectiveBep = Math.min(25, Math.max(0, calc.bepYear));
  const bepRatio = Math.max(0.04, Math.min(0.96, effectiveBep / 25));

  const curvePoints = useMemo(() => {
    const pts: { x: number; y: number; t: number; v: number }[] = [];
    for (let t = 0; t <= 25; t += 0.5) {
      const v = getCashFlowAtYear(t);
      pts.push({ x: mapChartX(t), y: mapChartY(v), t, v });
    }
    return pts;
  }, [calc.totalCapex, calc.annualSaving, calc.costInverter, minVal, valRange]);

  const curvePathD = useMemo(() => {
    return curvePoints.reduce(
      (acc, pt, idx) => (idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`),
      "",
    );
  }, [curvePoints]);

  const profitFillD = useMemo(() => {
    if (calc.bepYear >= 25 || calc.annualSaving <= 0) return "";
    const bepX = mapChartX(effectiveBep);
    const endX = mapChartX(25);
    const profitPts = curvePoints.filter((pt) => pt.t >= effectiveBep);
    if (!profitPts.length) return "";
    let d = `M ${bepX.toFixed(1)} ${zeroY.toFixed(1)}`;
    profitPts.forEach((pt) => {
      d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    });
    d += ` L ${endX.toFixed(1)} ${zeroY.toFixed(1)} Z`;
    return d;
  }, [calc.bepYear, effectiveBep, curvePoints, zeroY]);

  const deficitFillD = useMemo(() => {
    const startX = mapChartX(0);
    const bepX = mapChartX(effectiveBep);
    const deficitPts = curvePoints.filter((pt) => pt.t <= effectiveBep);
    let d = `M ${startX.toFixed(1)} ${zeroY.toFixed(1)}`;
    deficitPts.forEach((pt) => {
      d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    });
    d += ` L ${bepX.toFixed(1)} ${zeroY.toFixed(1)} Z`;
    return d;
  }, [calc.bepYear, effectiveBep, curvePoints, zeroY]);

  const handleChartMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const clampedX = Math.max(chartPadLeft, Math.min(chartW - chartPadRight, (relX / rect.width) * chartW));
    const t = Math.max(0, Math.min(25, ((clampedX - chartPadLeft) / plotW) * 25));
    setRoiHoverYear(Math.round(t * 10) / 10);
  };

  const startDrag = (
    e: ReactMouseEvent,
    facetId: string,
    mode: DragMode,
    initRidge: number,
    initSlope: number,
    initRot: number,
    initOx: number,
    initOy: number,
    initLat: number,
    initLng: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveFacetId(facetId);
    setDragState({
      facetId,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      initRidge,
      initSlope,
      initRot,
      initOx,
      initOy,
      initLat,
      initLng,
    });
  };

  const rafRef = useRef<number | null>(null);

  const onViewportMouseMove = (e: ReactMouseEvent) => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    const currentTarget = e.currentTarget;

    if (activeLayer === "heatmap") {
      const rect = currentTarget.getBoundingClientRect();
      setProbePos({ x: clientX - rect.left, y: clientY - rect.top });
    }

    if (vertexDragState) {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const dx = clientX - vertexDragState.startX;
        const dy = clientY - vertexDragState.startY;
        const rotRad = (-activeFacet.rotation * Math.PI) / 180;
        const localDx = (dx * Math.cos(rotRad) - dy * Math.sin(rotRad)) / pixelsPerMeter;
        const localDy = (dx * Math.sin(rotRad) + dy * Math.cos(rotRad)) / pixelsPerMeter;

        const newVertices = vertexDragState.initVertices.map((v, i) => {
          if (i === vertexDragState.vertexIdx) {
            return {
              x: Math.round((v.x + localDx) * 1000) / 1000,
              y: Math.round((v.y + localDy) * 1000) / 1000,
            };
          }
          return v;
        });

        const patch = buildPolygonPatch(newVertices, {
          lat: vertexDragState.initLat,
          lng: vertexDragState.initLng,
          offsetX: vertexDragState.initOx,
          offsetY: vertexDragState.initOy,
          rotation: activeFacet.rotation,
        });

        updateActiveFacet(patch);
      });
      return;
    }

    if (!dragState) return;

    if (rafRef.current !== null) {
      return; // Throttled to next screen refresh frame
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const dx = clientX - dragState.startX;
      const dy = clientY - dragState.startY;

      if (dragState.mode === "move") {
        if (mapInstanceRef.current && (window as any).L && dragState.initLat && dragState.initLng) {
          try {
            const L = (window as any).L;
            const startPt = mapInstanceRef.current.latLngToContainerPoint([dragState.initLat, dragState.initLng]);
            const targetPt = L.point(startPt.x + dx, startPt.y + dy);
            const targetLatLng = mapInstanceRef.current.containerPointToLatLng(targetPt);
            updateActiveFacet({
              lat: targetLatLng.lat,
              lng: targetLatLng.lng,
              offsetX: Math.round(dragState.initOx + dx),
              offsetY: Math.round(dragState.initOy + dy),
            });
          } catch {
            updateActiveFacet({
              offsetX: Math.round(dragState.initOx + dx),
              offsetY: Math.round(dragState.initOy + dy),
            });
          }
        } else {
          updateActiveFacet({
            offsetX: Math.round(dragState.initOx + dx),
            offsetY: Math.round(dragState.initOy + dy),
          });
        }
      } else if (dragState.mode === "br") {
        const dRidge = dx / pixelsPerMeter;
        const dSlope = dy / pixelsPerMeter;
        updateActiveFacet({
          ridge: Math.max(2, Math.round((dragState.initRidge + dRidge) * 100) / 100),
          slope: Math.max(2, Math.round((dragState.initSlope + dSlope) * 100) / 100),
        });
      } else if (dragState.mode === "r") {
        const dRidge = dx / pixelsPerMeter;
        updateActiveFacet({
          ridge: Math.max(2, Math.round((dragState.initRidge + dRidge) * 100) / 100),
        });
      } else if (dragState.mode === "b") {
        const dSlope = dy / pixelsPerMeter;
        updateActiveFacet({
          slope: Math.max(2, Math.round((dragState.initSlope + dSlope) * 100) / 100),
        });
      } else if (dragState.mode === "rot") {
        const dAngle = Math.round(dx * 0.5);
        let nextRot = (dragState.initRot + dAngle) % 360;
        if (nextRot > 180) nextRot -= 360;
        if (nextRot < -180) nextRot += 360;
        updateActiveFacet({ rotation: nextRot });
      }
    });
  };

  const onViewportMouseUp = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (vertexDragState) {
      setVertexDragState(null);
      showToast("Bentuk simpul poligon diperbarui");
    }
    if (dragState) {
      setDragState(null);
      showToast("Geometri poligon berhasil diperbarui");
    }
  };

  const selectedTariffLabel = useMemo(() => {
    if (plnTariff === 1700) return "R-2 / TR (3.500 – 5.500 VA)";
    if (plnTariff === 1444.7) return "R-1 / TR (1.300 – 2.200 VA)";
    if (plnTariff === 1699.53) return "R-3 / TR (> 6.600 VA)";
    if (plnTariff === 1444.71) return "B-2 / TR (Bisnis Menengah)";
    if (plnTariff === 1114.74) return "B-3 / TM (Bisnis Komersial Besar)";
    if (plnTariff === 1114.75) return "I-3 / TM (Industri / Pabrik)";
    if (plnTariff === 996.74) return "I-4 / TT (Industri Skala Besar)";
    return `Golongan Tarif PLN (Rp ${Number(plnTariff).toLocaleString("id-ID")}/kWh)`;
  }, [plnTariff]);

  const simulationResultForModal: SimulationResult = {
    roof_count: facets.length,
    total_area_sqm: calc.totalGrossArea,
    effective_area_sqm: calc.totalNetArea,
    max_slots: calc.totalValidSlotsAggregate || calc.totalValidSlots,
    installed: calc.totalModulesFitted,
    module_area_sqm: calc.totalModulesFitted * calc.currentSpec.w * calc.currentSpec.l,
    density_ratio:
      calc.totalNetArea > 0
        ? (calc.totalModulesFitted * calc.currentSpec.w * calc.currentSpec.l) / calc.totalNetArea
        : 0,
    capacity_kwp: calc.actualKwp,
    annual_production_kwh: calc.annualProductionKwh,
    capex_total_idr: calc.totalCapex,
    monthly_saving_idr: calc.cappedSaving,
    annual_saving_idr: calc.annualSaving,
    payback_years: calc.paybackYears,
    co2_reduction_kg_per_year: calc.co2ReductionTon * 1000,
    trees_equivalent: calc.treesEquivalent,
  };

  const simulationAssumptionsForModal: SimulationAssumptions = {
    daily_irradiance_kwh_per_sqm: 4.85,
    irradiance_source: "Model Radiasi Surya Tropis",
    irradiance_period: "Rata-rata Tahunan",
    incidence_factor: 0.984,
    performance_ratio: 0.8,
    tariff_key: tariffKeyForRate(plnTariff),
    tariff_label: selectedTariffLabel,
    tariff_idr_per_kwh: plnTariff,
    capex_breakdown: {
      modules_idr: calc.costModules,
      inverter_idr: calc.costInverter,
      racking_idr: calc.costRacking,
      installation_idr: calc.costInstall,
    },
  };

  const simulationParamsForModal: SimulationParameters = {
    setback_m: activeFacet.setback ?? 0.5,
    gutter_m: activeFacet.gutter ?? 0.5,
    tilt_deg: activeFacet.pitch ?? 20,
    azimuth_deg: activeFacet.azimuth ?? 188,
    module_key: moduleKeyForPower(modulePower),
    orientation: activeFacet.orientation ?? "portrait",
    clearance_m: (activeFacet.panelGap ?? 3) / 100,
    panel_count: calc.totalModulesFitted,
    inverter_type: inverterType,
    monthly_bill_idr: monthlyBill,
    tariff_key: tariffKeyForRate(plnTariff),
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#FAF9F5] font-body-md text-slate-800 antialiased select-none flex flex-col print:h-auto print:w-auto print:overflow-visible print:bg-[#FAF9F5] print:p-0">
      {/* =======================================================
          EXPANDABLE FLOATING PILL NAVBAR (Horisontal Individual Bubbles)
          ======================================================= */}
      <div
        id="studio-nav-header"
        className="fixed top-4 left-4 z-40 select-none flex items-center gap-2 max-w-[calc(100vw-2rem)] print:hidden group"
        onMouseEnter={handleNavMouseEnter}
        onMouseLeave={handleNavMouseLeave}
      >
        {/* Tombol Navigasi:
            - Pas Ketutup: Cukup Logo SunSight + Tanda '>'
            - Pas Kebuka: Logo berubah jadi Tanda Balik ke Beranda (← Beranda) */}
        <Link
          href="/"
          className={`h-11 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl text-slate-800 flex items-center px-3.5 transition-all duration-300 ease-out shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] border border-white/80 hover:border-amber-300/70 shrink-0 select-none cursor-pointer group/back ${
            studioNavOpen ? "shadow-[0_8px_32px_rgba(245,158,11,0.12)] border-amber-300/80 bg-white/90" : ""
          }`}
          title={studioNavOpen ? "Kembali ke Beranda" : "Buka Menu Studio"}
          aria-label="Kembali ke Beranda"
        >
          {!studioNavOpen ? (
            /* Pas Ketutup: Cukup logo sama tanda > aja */
            <div className="flex items-center gap-1.5 animate-fadeIn">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="SunSight" className="h-6 w-auto object-contain shrink-0" />
              <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover/back:text-amber-600 group-hover/back:translate-x-0.5 transition-all">
                chevron_right
              </span>
            </div>
          ) : (
            /* Pas Kebuka: Logo berubah jadi tanda balik ke beranda */
            <div className="flex items-center gap-1.5 animate-fadeIn">
              <span className="material-symbols-outlined text-[19px] text-slate-600 group-hover/back:text-amber-600 group-hover/back:-translate-x-0.5 transition-all">
                arrow_back
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover/back:text-amber-950 transition-colors whitespace-nowrap">
                Beranda
              </span>
            </div>
          )}
        </Link>

        {/* Action Pills Container (Mengembang mulus saat di-hover, menciut saat mouse menjauh) */}
        <div
          className={`flex items-center gap-2 transition-all duration-300 ease-out ${
            studioNavOpen
              ? "max-w-[750px] opacity-100 translate-x-0 pointer-events-auto"
              : "max-w-0 opacity-0 -translate-x-3 pointer-events-none"
          } ${searchOpen || filterOpen ? "overflow-visible" : "overflow-hidden"}`}
        >

          {/* Pill 2: Pencarian (Frosted Glass & Golden Radiant Active) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((v) => !v);
                setFilterOpen(false);
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border ${
                searchOpen
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border-amber-300/80"
                  : "bg-white/80 hover:bg-white backdrop-blur-xl text-slate-700 hover:text-amber-900 border-white/80 shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] hover:border-amber-300/70"
              }`}
              title="Pencarian Alamat & Lokasi"
              aria-label="Cari proyek atau lokasi"
              aria-expanded={searchOpen}
            >
              <span className="material-symbols-outlined text-[20px]">{searchOpen ? "close" : "search"}</span>
            </button>

            {/* Search Popover (Identik dengan Beranda) */}
            {searchOpen && (
              <>
                <button
                  type="button"
                  aria-label="Tutup pencarian"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setSearchOpen(false)}
                />
                <div className="absolute left-0 top-14 z-40 w-[min(400px,calc(100vw-2rem))] bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.18),0_4px_24px_rgba(245,158,11,0.10)] border border-white/90 p-2.5 animate-fadeIn">
                  {/* Search Bar Input */}
                  <div className="flex items-center gap-1.5 h-11 pl-3.5 pr-1.5 rounded-2xl bg-slate-100">
                    <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">search</span>
                    <input
                      autoFocus
                      type="text"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleGeocodeSearch(addressInput);
                          setSearchOpen(false);
                        }
                      }}
                      placeholder="Cari proyek atau alamat"
                      className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none border-0 border-none focus:ring-0 p-0"
                    />
                    {addressInput && (
                      <button
                        type="button"
                        onClick={() => setAddressInput("")}
                        title="Hapus teks pencarian"
                        className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleUseGps}
                      disabled={isGpsLoading}
                      title="Gunakan lokasi GPS saya"
                      className="w-8 h-8 rounded-xl hover:bg-white text-slate-600 hover:text-amber-600 flex items-center justify-center transition cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isGpsLoading ? "animate-spin" : ""}`}>
                        {isGpsLoading ? "sync" : "my_location"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleGeocodeSearch(addressInput);
                        setSearchOpen(false);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-bold text-xs hover:bg-amber-500 transition cursor-pointer shrink-0"
                    >
                      Cari
                    </button>
                  </div>

                  {/* Subtitle: Lokasi Aktif & Tombol Reset */}
                  <div className="flex items-center justify-between px-2 pt-2.5 pb-1 gap-2">
                    <p className="flex items-center gap-1 text-[11px] text-slate-400 truncate min-w-0">
                      <span className="material-symbols-outlined text-[13px] text-amber-600 shrink-0">location_on</span>
                      <span className="truncate">{activeFacet.name || addressInput || "Kota Bogor, Jawa Barat"}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleResetSearch();
                        setSearchOpen(false);
                      }}
                      className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                      title="Reset posisi peta ke lokasi default"
                    >
                      <span className="material-symbols-outlined text-[14px] text-amber-600">restart_alt</span>
                      Reset
                    </button>
                  </div>

                  {/* List Proyek Tersimpan (Format Persis Beranda) */}
                  <div className="max-h-72 overflow-y-auto mt-1 space-y-1">
                    {filteredStudioProjects.length === 0 ? (
                      <div className="py-5 text-center px-2">
                        <p className="text-xs text-slate-400 m-0">Tidak ada proyek yang cocok</p>
                        {addressInput.toLowerCase().includes("gps") || addressInput.toLowerCase().includes("terkini") ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleUseGps();
                              setSearchOpen(false);
                            }}
                            className="mt-2.5 w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">my_location</span>
                            <span>Deteksi Atap di Lokasi GPS Terkini &rarr;</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleGeocodeSearch(addressInput);
                              setSearchOpen(false);
                            }}
                            className="mt-2 text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                          >
                            Cari &ldquo;{addressInput}&rdquo; di Peta &rarr;
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredStudioProjects.map((proj) => {
                        const isCurrent =
                          activeFacet.name === proj.name ||
                          activeFacet.name === proj.address ||
                          (Math.abs((activeFacet.lat ?? 0) - proj.lat) < 0.0001 &&
                            Math.abs((activeFacet.lng ?? 0) - proj.lon) < 0.0001);
                        return (
                          <button
                            key={proj.id}
                            type="button"
                            onClick={() => {
                              handleSelectStudioProject(proj);
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

          {/* Pill 3: Filter Lapisan (Frosted Glass & Golden Radiant Active) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setFilterOpen((v) => !v);
                setSearchOpen(false);
              }}
              className={`h-11 px-3.5 sm:px-4 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all duration-300 shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer border ${
                filterOpen
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border-amber-300/80"
                  : "bg-white/80 hover:bg-white backdrop-blur-xl text-slate-700 hover:text-amber-900 border-white/80 hover:border-amber-300/70"
              }`}
              title="Filter Lapisan Peta & CAD"
              aria-expanded={filterOpen}
            >
              <span className="material-symbols-outlined text-[18px]">layers</span>
              <span className="hidden sm:inline">Filter</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                filterOpen
                  ? "bg-white/90 text-amber-950 border-amber-300/80"
                  : "bg-amber-100 text-amber-900 border-amber-200"
              }`}>
                {activeLayer === "satellite" ? "Satelit" : activeLayer === "cv" ? "AI" : "Heatmap"}
              </span>
            </button>

            {/* Filter Popover (Modern Frosted Glass) */}
            {filterOpen && (
              <>
                <button
                  type="button"
                  aria-label="Tutup filter"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setFilterOpen(false)}
                />
                <div className="absolute left-0 top-14 z-40 w-60 bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.18),0_4px_24px_rgba(245,158,11,0.10)] border border-white/90 p-2.5 animate-fadeIn space-y-1">
                  <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Lapisan Tampilan
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveLayer("satellite");
                      showToast("Lapisan: Satelit Normal");
                      setFilterOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                      activeLayer === "satellite"
                        ? "bg-gradient-to-r from-amber-200 to-amber-300 text-amber-950 font-bold shadow-2xs"
                        : "text-slate-700 hover:bg-amber-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-amber-700">satellite_alt</span>
                      <span>Satelit Normal</span>
                    </div>
                    {activeLayer === "satellite" && (
                      <span className="material-symbols-outlined text-[16px] text-amber-950">check</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveLayer("cv");
                      showToast("Lapisan: Deteksi AI (Computer Vision)");
                      setFilterOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                      activeLayer === "cv"
                        ? "bg-gradient-to-r from-amber-200 to-amber-300 text-amber-950 font-bold shadow-2xs"
                        : "text-slate-700 hover:bg-amber-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">psychology</span>
                      <span>Deteksi AI (CV)</span>
                    </div>
                    {activeLayer === "cv" && (
                      <span className="material-symbols-outlined text-[16px] text-amber-950">check</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveLayer("heatmap");
                      showToast("Lapisan: Radiasi Sinar Matahari");
                      setFilterOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                      activeLayer === "heatmap"
                        ? "bg-gradient-to-r from-amber-200 to-amber-300 text-amber-950 font-bold shadow-2xs"
                        : "text-slate-700 hover:bg-amber-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-rose-500">wb_sunny</span>
                      <span>Heatmap Radiasi</span>
                    </div>
                    {activeLayer === "heatmap" && (
                      <span className="material-symbols-outlined text-[16px] text-amber-950">check</span>
                    )}
                  </button>

                  <div className="w-full h-px bg-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      updateActiveFacet({
                        ridge: 12.48,
                        slope: 7.28,
                        pitch: 22,
                        rotation: -4,
                        setback: 0.5,
                        gutter: 0.6,
                        lat: -6.595038,
                        lng: 106.797241,
                      });
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([-6.595038, 106.797241], 21);
                      }
                      showToast("Parameter & poligon direset ke standar");
                      setFilterOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-500">restart_alt</span>
                    <span>Reset Parameter Atap</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Pill 4: Proposal PDF (Frosted Glass) */}
          <button
            type="button"
            onClick={() => setProposalOpen(true)}
            className="h-11 px-4 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl text-slate-700 hover:text-amber-950 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all duration-300 shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] shrink-0 cursor-pointer border border-white/80 hover:border-amber-300/70"
            title="Unduh Proposal PDF Resmi"
          >
            <span className="material-symbols-outlined text-[18px] text-amber-700">picture_as_pdf</span>
            <span className="hidden sm:inline">Proposal PDF</span>
          </button>

          {/* Pill 5: Simpan Desain (Radiant Soft Glow Glass) */}
          <button
            type="button"
            onClick={handleSaveSimulation}
            disabled={isSaving}
            className={`h-11 px-4 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all duration-300 shrink-0 cursor-pointer border ${
              saveSuccess
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-[0_2px_12px_rgba(16,185,129,0.2),inset_0_1px_1px_rgba(255,255,255,0.85)]"
                : "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 text-amber-950 active:scale-[0.98] border-amber-300/80 shadow-[0_2px_14px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_4px_18px_rgba(245,158,11,0.3)]"
            }`}
            title="Simpan simulasi desain ke riwayat Anda"
          >
            <span className={`material-symbols-outlined text-[18px] text-amber-800 ${isSaving ? "animate-spin" : ""}`}>
              {isSaving ? "sync" : saveSuccess ? "check_circle" : "save"}
            </span>
            <span className="hidden sm:inline">
              {isSaving ? "Menyimpan..." : saveSuccess ? "Tersimpan" : "Simpan Desain"}
            </span>
            <span className="sm:hidden">
              {isSaving ? "..." : saveSuccess ? "OK" : "Simpan"}
            </span>
          </button>
        </div>
      </div>

      {/* =======================================================
          FULL-SCREEN CANVAS VIEWPORT + INSPECTOR
          ======================================================= */}
      <main className="w-full flex-1 flex flex-col lg:flex-row overflow-hidden relative print:hidden">
        {/* =======================================================
            LEFT: CANVAS VIEWPORT (Truly Edge-to-Edge)
            ======================================================= */}
        <div
          id="canvas-viewport-container"
          className={`relative flex-1 h-[55vh] lg:h-full bg-slate-100 overflow-hidden select-none ${
            cadTool === "pen" ? "cursor-crosshair" : "cursor-default"
          }`}
          onMouseMove={onViewportMouseMove}
          onMouseUp={onViewportMouseUp}
          onClick={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).id === "studio-leaflet-map") {
              if (cadTool === "select") {
                unselectAllFacets();
              }
            }
          }}
        >
          {/* Top Right: Compass Rose (N) + Zoom Controls (+ / -) */}
          <div className="absolute top-4 right-4 z-30 flex flex-col items-center gap-1 p-1 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.08)] pointer-events-auto">
            {/* Compass Rose N */}
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([activeFacet.lat || -6.595038, activeFacet.lng || 106.797241], 21);
                }
                showToast("Peta diorientasikan ke Utara & dipusatkan ke atap");
              }}
              className="w-8 h-8 rounded-xl flex flex-col items-center justify-center text-slate-700 hover:text-amber-600 hover:bg-amber-50/70 transition cursor-pointer"
              title="Orientasi Utara & Pusatkan ke Atap"
            >
              <span className="text-[9px] font-black font-mono text-slate-800 leading-none">N</span>
              <span className="material-symbols-outlined text-[12px] text-amber-500 -mt-0.5">navigation</span>
            </button>

            <div className="w-5 h-px bg-slate-200/80 my-0.5" />

            {/* Zoom In */}
            <button
              type="button"
              onClick={() => {
                setZoomScale((z) => Math.min(2.5, z + 0.15));
                if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:text-amber-600 hover:bg-amber-50/70 transition cursor-pointer"
              title="Perbesar (Zoom In)"
            >
              <span className="material-symbols-outlined text-[17px]">add</span>
            </button>

            {/* Zoom Out */}
            <button
              type="button"
              onClick={() => {
                setZoomScale((z) => Math.max(0.6, z - 0.15));
                if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:text-amber-600 hover:bg-amber-50/70 transition cursor-pointer"
              title="Perkecil (Zoom Out)"
            >
              <span className="material-symbols-outlined text-[17px]">remove</span>
            </button>
          </div>

          {/* Pen Tool Interactive Drawing Overlay */}
          {cadTool === "pen" && (
            <div
              className="absolute inset-0 z-20 pointer-events-auto cursor-crosshair"
              onClick={handleCanvasPenClick}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setPenMousePos({
                  x: Math.round(e.clientX - rect.left),
                  y: Math.round(e.clientY - rect.top),
                });
              }}
            >
              <svg className="w-full h-full overflow-visible pointer-events-none">
                {penPoints.length > 0 && (
                  <>
                    {/* Polyline connecting placed points */}
                    <polyline
                      points={penPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="rgba(34, 211, 238, 0.15)"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                      strokeDasharray="6 3"
                    />

                    {/* Rubberband line to mouse position */}
                    {penMousePos && penPoints.length > 0 && (
                      <line
                        x1={penPoints[penPoints.length - 1].x}
                        y1={penPoints[penPoints.length - 1].y}
                        x2={penMousePos.x}
                        y2={penMousePos.y}
                        stroke="#06b6d4"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Live distance badge on the rubberband line */}
                    {penMousePos && penPoints.length > 0 && (
                      <g
                        transform={`translate(${
                          (penPoints[penPoints.length - 1].x + penMousePos.x) / 2
                        }, ${
                          (penPoints[penPoints.length - 1].y + penMousePos.y) / 2 - 12
                        })`}
                      >
                        <rect
                          x="-30"
                          y="-10"
                          width="60"
                          height="20"
                          rx="6"
                          fill="#0f172a"
                          fillOpacity="0.85"
                          stroke="#22d3ee"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fill="#67e8f9"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {(
                            Math.hypot(
                              penMousePos.x - penPoints[penPoints.length - 1].x,
                              penMousePos.y - penPoints[penPoints.length - 1].y
                            ) / pixelsPerMeter
                          ).toFixed(2)}
                          m
                        </text>
                      </g>
                    )}

                    {/* Placed point vertices */}
                    {penPoints.map((p, idx) => {
                      const isFirst = idx === 0;
                      return (
                        <g key={`pen-pt-${idx}`} transform={`translate(${p.x}, ${p.y})`}>
                          <circle
                            r={isFirst && penPoints.length >= 3 ? 8 : 5}
                            fill={isFirst && penPoints.length >= 3 ? "#10b981" : "#06b6d4"}
                            stroke="#ffffff"
                            strokeWidth="2"
                            className={isFirst && penPoints.length >= 3 ? "animate-pulse" : ""}
                          />
                          <text
                            x="0"
                            y="-9"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="9"
                            fontFamily="sans-serif"
                            fontWeight="bold"
                            stroke="#0f172a"
                            strokeWidth="2"
                            paintOrder="stroke"
                          >
                            P{idx + 1}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}
              </svg>

              {/* Floating Mini Action Pill on Drawn Polygon (✓ and ✕ only, zero clutter) */}
              {penPoints.length > 0 && (
                <div
                  className="absolute z-35 flex items-center gap-1.5 p-1 rounded-full bg-white/95 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.15)] border border-slate-200/90 pointer-events-auto animate-fadeIn"
                  style={{
                    left: `${penPoints[penPoints.length - 1].x}px`,
                    top: `${Math.max(24, penPoints[penPoints.length - 1].y - 36)}px`,
                    transform: "translate(-50%, -100%)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Finish (✓) Button */}
                  <button
                    type="button"
                    disabled={penPoints.length < 3}
                    onClick={(e) => {
                      e.stopPropagation();
                      finishPenPolygon(penPoints);
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      penPoints.length >= 3
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:scale-110 active:scale-95"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                    }`}
                    title={
                      penPoints.length >= 3
                        ? "Selesai Poligon (✓)"
                        : "Tambahkan minimal 3 titik untuk selesai"
                    }
                  >
                    <span className="material-symbols-outlined text-[17px] font-bold">check</span>
                  </button>

                  {/* Cancel (✕) Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPenPoints([]);
                      setCadTool("select");
                      showToast("Pen Tool dibatalkan");
                    }}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    title="Batal (✕)"
                  >
                    <span className="material-symbols-outlined text-[17px]">close</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Measure Tool Interactive Measuring Tape Overlay (Freehand Distance & Area Measurement) */}
          {cadTool === "measure" && (
            <div
              className={`absolute inset-0 cursor-crosshair pointer-events-auto ${
                measurePoints.length > 0 ? "z-30" : "z-20"
              }`}
              onClick={handleCanvasMeasureClick}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMeasureMousePos({
                  x: Math.round(e.clientX - rect.left),
                  y: Math.round(e.clientY - rect.top),
                });
              }}
            >
              <svg className="w-full h-full overflow-visible pointer-events-none">
                {measurePoints.length > 0 && (
                  <>
                    {/* Polyline / Polygon connecting placed measurement points */}
                    {isMeasureClosed && measurePoints.length >= 3 ? (
                      <polygon
                        points={measurePoints.map((p) => `${p.x},${p.y}`).join(" ")}
                        fill="rgba(245, 158, 11, 0.16)"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeDasharray="6 3"
                      />
                    ) : (
                      <>
                        {measurePoints.length >= 3 && (
                          <polygon
                            points={measurePoints.map((p) => `${p.x},${p.y}`).join(" ")}
                            fill="rgba(245, 158, 11, 0.08)"
                            stroke="none"
                          />
                        )}
                        <polyline
                          points={measurePoints.map((p) => `${p.x},${p.y}`).join(" ")}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          strokeDasharray="6 3"
                        />
                      </>
                    )}

                    {/* Rubberband line to mouse position (only if not closed) */}
                    {!isMeasureClosed && measureMousePos && measurePoints.length > 0 && (() => {
                      const pLast = measurePoints[measurePoints.length - 1];
                      const isNearStart = Boolean(
                        measurePoints.length >= 3 &&
                        Math.hypot(measureMousePos.x - measurePoints[0].x, measureMousePos.y - measurePoints[0].y) < 24
                      );
                      const targetX = isNearStart ? measurePoints[0].x : measureMousePos.x;
                      const targetY = isNearStart ? measurePoints[0].y : measureMousePos.y;
                      const distM = (Math.hypot(targetX - pLast.x, targetY - pLast.y) / pixelsPerMeter).toFixed(1);

                      return (
                        <>
                          <line
                            x1={pLast.x}
                            y1={pLast.y}
                            x2={targetX}
                            y2={targetY}
                            stroke={isNearStart ? "#10b981" : "#fbbf24"}
                            strokeWidth={isNearStart ? "2.5" : "2"}
                            strokeDasharray={isNearStart ? "none" : "4 4"}
                          />
                          <g transform={`translate(${(pLast.x + targetX) / 2}, ${(pLast.y + targetY) / 2 - 12})`}>
                            <rect
                              x={isNearStart ? "-44" : "-28"}
                              y="-10"
                              width={isNearStart ? "88" : "56"}
                              height="20"
                              rx="6"
                              fill="#ffffff"
                              fillOpacity="0.95"
                              stroke={isNearStart ? "#10b981" : "#f59e0b"}
                              strokeWidth="1.2"
                            />
                            <text
                              x="0"
                              y="3"
                              textAnchor="middle"
                              fill={isNearStart ? "#065f46" : "#78350f"}
                              fontSize={isNearStart ? "9" : "10"}
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {isNearStart ? `Tutup (${distM}m)` : `${distM}m`}
                            </text>
                          </g>
                        </>
                      );
                    })()}

                    {/* Segment distances along completed lines */}
                    {measurePoints.slice(0, -1).map((p1, idx) => {
                      const p2 = measurePoints[idx + 1];
                      const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y) / pixelsPerMeter;
                      return (
                        <g
                          key={`seg-dist-${idx}`}
                          transform={`translate(${(p1.x + p2.x) / 2}, ${(p1.y + p2.y) / 2 - 12})`}
                        >
                          <rect
                            x="-22"
                            y="-9"
                            width="44"
                            height="18"
                            rx="5"
                            fill="#ffffff"
                            fillOpacity="0.95"
                            stroke="#f59e0b"
                            strokeWidth="1"
                          />
                          <text
                            x="0"
                            y="3"
                            textAnchor="middle"
                            fill="#78350f"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {segDist.toFixed(1)}m
                          </text>
                        </g>
                      );
                    })}

                    {/* Closing segment distance (if closed) */}
                    {isMeasureClosed && measurePoints.length >= 3 && (() => {
                      const pLast = measurePoints[measurePoints.length - 1];
                      const p0 = measurePoints[0];
                      const closingDist = Math.hypot(p0.x - pLast.x, p0.y - pLast.y) / pixelsPerMeter;
                      return (
                        <g transform={`translate(${(pLast.x + p0.x) / 2}, ${(pLast.y + p0.y) / 2 - 12})`}>
                          <rect
                            x="-22"
                            y="-9"
                            width="44"
                            height="18"
                            rx="5"
                            fill="#ffffff"
                            fillOpacity="0.95"
                            stroke="#10b981"
                            strokeWidth="1"
                          />
                          <text
                            x="0"
                            y="3"
                            textAnchor="middle"
                            fill="#065f46"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {closingDist.toFixed(1)}m
                          </text>
                        </g>
                      );
                    })()}

                    {/* Placed point vertices */}
                    {measurePoints.map((p, idx) => {
                      const isFirst = idx === 0;
                      const isNearStart = Boolean(
                        isFirst &&
                        !isMeasureClosed &&
                        measurePoints.length >= 3 &&
                        measureMousePos &&
                        Math.hypot(measureMousePos.x - p.x, measureMousePos.y - p.y) < 24
                      );

                      return (
                        <g key={`ms-pt-${idx}`} transform={`translate(${p.x}, ${p.y})`}>
                          {isNearStart && (
                            <circle
                              r="15"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2"
                              strokeDasharray="4 2"
                              className="animate-spin"
                            />
                          )}
                          <circle
                            r={isNearStart ? 9 : isFirst && measurePoints.length >= 3 && !isMeasureClosed ? 8 : 5}
                            fill={isNearStart ? "#10b981" : isFirst && measurePoints.length >= 3 && !isMeasureClosed ? "#059669" : "#f59e0b"}
                            stroke="#ffffff"
                            strokeWidth="2"
                            className={isFirst && measurePoints.length >= 3 && !isMeasureClosed ? "animate-pulse" : ""}
                          />
                          <text
                            x="0"
                            y="-9"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="9"
                            fontFamily="sans-serif"
                            fontWeight="bold"
                            stroke="#0f172a"
                            strokeWidth="2"
                            paintOrder="stroke"
                          >
                            {isFirst && !isMeasureClosed && measurePoints.length >= 3 ? "Tutup" : `M${idx + 1}`}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}
              </svg>

              {/* Centroid Area Card for Closed Polygon */}
              {isMeasureClosed && measureCentroid && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-35 p-2.5 px-3.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-amber-300 shadow-[0_8px_24px_rgba(245,158,11,0.22)] text-center pointer-events-none select-none animate-fadeIn"
                  style={{ left: `${measureCentroid.x}px`, top: `${measureCentroid.y}px` }}
                >
                  <div className="flex items-center justify-center gap-1 text-[8.5px] font-bold text-amber-800 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[13px] text-amber-600">square_foot</span>
                    <span>Luas Area Terukur</span>
                  </div>
                  <div className="font-title text-base font-extrabold text-slate-900 font-code-metric mt-0.5">
                    {measureArea.toFixed(1)} <span className="text-xs font-normal text-slate-500">m²</span>
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 font-code-metric mt-0.5">
                    Keliling: {measureTotalDistance.toFixed(1)}m • {measurePoints.length} Sisi
                  </div>
                </div>
              )}

              {/* Floating Action Bar */}
              {measurePoints.length > 0 && (
                <div
                  className="absolute z-35 flex items-center gap-1.5 p-1.5 rounded-full bg-white/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(245,158,11,0.18)] border border-amber-200/90 pointer-events-auto animate-fadeIn select-none"
                  style={{
                    left: `${measurePoints[measurePoints.length - 1].x}px`,
                    top: `${Math.max(24, measurePoints[measurePoints.length - 1].y - 36)}px`,
                    transform: "translate(-50%, -100%)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Stats Pill */}
                  <div className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-950 border border-amber-200 text-[10px] font-code-metric flex items-center gap-1.5 font-bold">
                    <span>📏 {measureTotalDistance.toFixed(1)}m</span>
                    {measurePoints.length >= 3 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-800">📐 {measureArea.toFixed(1)}m²</span>
                      </>
                    )}
                  </div>

                  {/* Close Polygon Button (if >= 3 points and not closed) */}
                  {!isMeasureClosed && measurePoints.length >= 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMeasureClosed(true);
                        showToast("Poligon tertutup! Luas area berhasil dihitung.");
                      }}
                      className="px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Tutup Titik Ujung ke Ujung untuk Menghitung Luas Area"
                    >
                      <span className="material-symbols-outlined text-[13px]">polyline</span>
                      <span>Tutup Area</span>
                    </button>
                  )}

                  {/* Convert to Roof Facet Button (if closed) */}
                  {isMeasureClosed && measurePoints.length >= 3 && (
                    <button
                      type="button"
                      onClick={handleConvertMeasureToFacet}
                      className="px-2.5 py-1 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs border border-amber-300"
                      title="Ubah Hasil Pengukuran Menjadi Bidang Atap Proyek"
                    >
                      <span className="material-symbols-outlined text-[13px]">add_circle</span>
                      <span>Jadikan Bidang Atap</span>
                    </button>
                  )}

                  {/* Reset (↺) Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMeasurePoints([]);
                      setIsMeasureClosed(false);
                      showToast("Pengukuran direset");
                    }}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    title="Reset Titik Pengukuran (↺)"
                  >
                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                  </button>

                  {/* Finish (✓) Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMeasurePoints([]);
                      setIsMeasureClosed(false);
                      setCadTool("select");
                      showToast("Pengukuran selesai");
                    }}
                    className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-xs"
                    title="Selesai Pengukuran (✓)"
                  >
                    <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Real Earth Satellite & OpenStreetMap (OSM) Live Map Container */}
          <div id="studio-leaflet-map" className="absolute inset-0 w-full h-full z-0 pointer-events-auto" />

          {/* Instant Satellite Image Fallback */}
          {!mapLoaded && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/satellite_map.jpg"
              alt="Satellite map fallback"
              className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out select-none z-0"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: "center center",
              }}
              draggable={false}
            />
          )}

          {/* CV Layer: Segmentasi Otsu + Tepi Canny + Deteksi Halangan */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-500 z-10 ${
              activeLayer === "cv" ? "opacity-100" : "opacity-0"
            }`}
          >
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="neonGlowCanny" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <polygon
                points="calc(50% - 130px),calc(50% - 75px) calc(50% + 125px),calc(50% - 92px) calc(50% + 135px),calc(50% + 65px) calc(50% - 120px),calc(50% + 82px)"
                fill="rgba(16, 185, 129, 0.32)"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="8,4"
              />
              <circle cx="calc(50% - 130px)" cy="calc(50% - 75px)" r="4" fill="#34d399" />
              <circle cx="calc(50% + 125px)" cy="calc(50% - 92px)" r="4" fill="#34d399" />
              <circle cx="calc(50% + 135px)" cy="calc(50% + 65px)" r="4" fill="#34d399" />
              <circle cx="calc(50% - 120px)" cy="calc(50% + 82px)" r="4" fill="#34d399" />

              <line
                x1="calc(50% - 110px)"
                y1="calc(50% - 15px)"
                x2="calc(50% + 115px)"
                y2="calc(50% - 31px)"
                stroke="#00f0ff"
                strokeWidth="2.5"
                strokeDasharray="8,4"
                filter="url(#neonGlowCanny)"
              />
              <polygon
                points="calc(50% - 130px),calc(50% - 75px) calc(50% + 125px),calc(50% - 92px) calc(50% + 135px),calc(50% + 65px) calc(50% - 120px),calc(50% + 82px)"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                filter="url(#neonGlowCanny)"
              />

              <polygon
                points="calc(50% - 145px),calc(50% + 78px) calc(50% + 145px),calc(50% + 60px) calc(50% + 150px),calc(50% + 95px) calc(50% - 140px),calc(50% + 115px)"
                fill="rgba(99, 102, 241, 0.3)"
                stroke="#818cf8"
                strokeWidth="1.5"
                strokeDasharray="4,3"
              />

              {/* Interactive HVAC Obstacle */}
              <g
                className="pointer-events-auto cursor-pointer"
                onClick={() => {
                  setHasHvac((prev) => !prev);
                  showToast(!hasHvac ? "Rintangan HVAC Chiller diaktifkan" : "Rintangan HVAC dinonaktifkan");
                }}
              >
                <rect
                  x="calc(50% + 30px)"
                  y="calc(50% - 30px)"
                  width="38"
                  height="26"
                  rx="4"
                  fill="rgba(239, 68, 68, 0.55)"
                  stroke="#ef4444"
                  strokeWidth="2"
                />
                <text x="calc(50% + 37px)" y="calc(50% - 14px)" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  HVAC
                </text>
                <rect
                  x="calc(50% + 24px)"
                  y="calc(50% - 36px)"
                  width="50"
                  height="38"
                  rx="6"
                  fill="none"
                  stroke="#fca5a5"
                  strokeWidth="1"
                  strokeDasharray="3,2"
                />
              </g>

              {/* Interactive Skylight */}
              <g
                className="pointer-events-auto cursor-pointer"
                onClick={() => {
                  setHasSkylight((prev) => !prev);
                  showToast(!hasSkylight ? "Skylight kaca diaktifkan" : "Skylight dinonaktifkan");
                }}
              >
                <rect
                  x="calc(50% - 80px)"
                  y="calc(50% - 45px)"
                  width="28"
                  height="24"
                  rx="4"
                  fill="rgba(245, 158, 11, 0.55)"
                  stroke="#f59e0b"
                  strokeWidth="2"
                />
                <text x="calc(50% - 76px)" y="calc(50% - 30px)" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  SKY
                </text>
              </g>
            </svg>
          </div>

          {/* Heatmap Overlay */}
          <div
            className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/40 via-rose-500/20 to-transparent mix-blend-overlay transition-opacity duration-700 pointer-events-none z-10 ${
              activeLayer === "heatmap" ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Live Cursor Radiometer Probe HUD */}
          {activeLayer === "heatmap" && probePos && (
            <div
              className="absolute z-30 pointer-events-none px-3 py-1.5 rounded-xl bg-white/95 text-amber-900 font-semibold tracking-tight text-[11px] border border-amber-300 shadow-xl backdrop-blur-md flex items-center gap-2 -translate-x-1/2 -translate-y-12 transition-transform duration-75"
              style={{ left: probePos.x, top: probePos.y }}
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">wb_sunny</span>
              <span>4.85 kWh/m²/hari</span>
              <span className="text-[9px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                98.4% Puncak
              </span>
            </div>
          )}

          {/* Blueprint CAD Grid */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25 z-10">
            <defs>
              <pattern id="cadGrid2" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-sky-300/30" />
                <circle cx="0" cy="0" r="1" className="fill-sky-400/50" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cadGrid2)" />
          </svg>

          {/* Floating Toast Notification */}
          {cadToast && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-slate-800 border border-amber-200/80 shadow-[0_4px_20px_rgba(245,158,11,0.12)] text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-amber-500 text-[15px]">info</span>
              <span>{cadToast}</span>
            </div>
          )}

          {/* Floating Tool Banner: Delete Vertex Mode */}
          {cadTool === "delete_vertex" && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-rose-200/90 shadow-[0_8px_30px_rgba(244,63,94,0.12),0_2px_8px_rgba(0,0,0,0.04)] text-slate-800 text-xs animate-fadeIn max-w-[calc(100vw-2rem)]">
              <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[13px]">remove_circle</span>
              </div>
              <span className="font-medium text-slate-700">
                Hapus Simpul • <strong className="text-rose-900 font-bold">{getFacetVertices(activeFacet).length} titik</strong> (klik simpul merah)
              </span>
              <button
                type="button"
                disabled={getFacetVertices(activeFacet).length <= 3}
                onClick={() => deleteLastVertex()}
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold transition flex items-center gap-1 ${
                  getFacetVertices(activeFacet).length > 3
                    ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50"
                }`}
                title="Hapus simpul terakhir yang dibuat"
              >
                <span className="material-symbols-outlined text-[12px]">backspace</span>
                <span>Hapus Terakhir</span>
              </button>
              <button
                type="button"
                onClick={() => setCadTool("select")}
                className="px-2.5 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-bold transition cursor-pointer"
              >
                Selesai
              </button>
            </div>
          )}

          {/* Floating Tool Banner: Measure / CAD Overview Mode */}
          {cadTool === "measure" && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xl border border-amber-200/90 shadow-[0_8px_30px_rgba(245,158,11,0.14),0_2px_8px_rgba(0,0,0,0.04)] text-slate-800 text-xs animate-fadeIn max-w-[calc(100vw-2rem)]">
              <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[13px]">straighten</span>
              </div>
              <span className="font-medium text-slate-700">
                {isMeasureClosed ? (
                  <>
                    Poligon Terukur • Luas: <strong className="font-code-metric text-emerald-800 font-bold">{measureArea.toFixed(1)} m²</strong> • Keliling: <strong className="font-code-metric text-amber-900 font-bold">{measureTotalDistance.toFixed(1)}m</strong>
                  </>
                ) : measurePoints.length > 0 ? (
                  <>
                    Ukur Garis Bebas • Jarak: <strong className="font-code-metric text-amber-900 font-bold">{measureTotalDistance.toFixed(1)}m</strong>
                    {measurePoints.length >= 3 && (
                      <span className="text-[11px] text-slate-500 ml-1">(Klik titik awal untuk menutup area)</span>
                    )}
                  </>
                ) : selectedFacetIds.length > 0 ? (
                  <>
                    Dimensi CAD • <strong className="text-slate-900">{activeFacet.name}</strong>
                  </>
                ) : (
                  "Mode Penggaris • Klik peta untuk ukur panjang/luas atau pilih bidang atap"
                )}
              </span>
              {isMeasureClosed && measurePoints.length >= 3 && (
                <button
                  type="button"
                  onClick={handleConvertMeasureToFacet}
                  className="px-2.5 py-0.5 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950 text-[10.5px] font-bold transition cursor-pointer border border-amber-300"
                >
                  + Jadikan Bidang Atap
                </button>
              )}
              {measurePoints.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMeasurePoints([]);
                    setIsMeasureClosed(false);
                  }}
                  className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10.5px] font-semibold transition cursor-pointer"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMeasurePoints([]);
                  setIsMeasureClosed(false);
                  setCadTool("select");
                }}
                className="px-2.5 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300/80 text-[10.5px] font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {/* AI Model Scanning Radar Animation Overlay */}
          {isAiScanning && (
            <div className="absolute inset-0 pointer-events-none z-35 flex flex-col items-center justify-center bg-slate-950/20 backdrop-blur-[1.5px] animate-fadeIn">
              <div className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white/95 backdrop-blur-xl border border-amber-300 shadow-[0_12px_40px_rgba(245,158,11,0.25)] text-slate-800 text-center max-w-xs animate-scaleIn">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-inner">
                  <span className="material-symbols-outlined text-[28px] animate-spin">radar</span>
                </div>
                <div>
                  <h4 className="font-title font-extrabold text-sm text-slate-900 m-0">Memindai Citra Satelit AI...</h4>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">Mendeteksi kontur dan luas bidang atap secara otomatis</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full w-2/3 animate-pulse rounded-full" />
                </div>
              </div>
            </div>
          )}

          {/* Panduan seleksi bidang hasil deteksi model */}
          {showDetectedRoofs && remainingDetectedRoofs.length > 0 && !isAiScanning && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-35 flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-xl border border-amber-300 shadow-[0_8px_30px_rgba(245,158,11,0.2)] text-slate-800 text-xs animate-fadeIn max-w-[calc(100vw-2rem)] pointer-events-auto">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                <span className="material-symbols-outlined text-[15px]">psychology</span>
              </span>
              <span className="font-medium text-slate-800 truncate">
                <strong>{remainingDetectedRoofs.length} bidang atap terdeteksi</strong>
                {selectedDetectedIds.length > 0
                  ? ` · ${selectedDetectedIds.length} dipilih`
                  : " · klik bidang pada peta untuk memilih"}
              </span>
              <button
                type="button"
                onClick={commitDetectedSelection}
                disabled={selectedDetectedIds.length === 0}
                className={`px-3 py-1 rounded-xl font-bold text-[11px] shadow-xs border transition shrink-0 ${
                  selectedDetectedIds.length > 0
                    ? "bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 border-amber-300 cursor-pointer"
                    : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                }`}
                title="Jadikan bidang terpilih sebagai bidang atap proyek"
              >
                Selesai Memilih
              </button>
            </div>
          )}

          {/* Deteksi selesai tanpa bidang: peta tetap bisa dipakai */}
          {detection !== null && detectedRoofs.length === 0 && !isAiScanning && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-35 flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/95 backdrop-blur-xl border border-slate-300 shadow-[0_8px_30px_rgba(15,23,42,0.12)] text-slate-800 text-xs animate-fadeIn max-w-[calc(100vw-2rem)] pointer-events-auto">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                <span className="material-symbols-outlined text-[15px]">search_off</span>
              </span>
              <span className="font-medium text-slate-700">
                Model tidak menemukan bidang atap di area ini. Geser peta ke atas atap, lalu tekan tombol pindai AI.
              </span>
            </div>
          )}

          {/* Interactive Multi-Roof Surface Polygons & Solar Arrays */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-25">

            {/* 2. Active Facets & Solar PV Arrays */}
            {facets.map((facet) => {
              const isSelected = selectedFacetIds.includes(facet.id);
              const isActive = facet.id === activeFacetId;
              const fMetrics = computeFacetMetrics(
                facet,
                sunHour,
                obstacleFilterActive,
                extraTilt,
                inverterType
              );

              // Real physical scale & geo-anchored pixel positions (never shifts when panel closes!)
              const screenPos = getFacetScreenPosition(facet);
              const styleLeft = screenPos ? `${screenPos.x}px` : `calc(50% + ${facet.offsetX}px)`;
              const styleTop = screenPos ? `${screenPos.y}px` : `calc(50% + ${facet.offsetY}px)`;
              const facetVerts = getFacetVertices(facet);
              const bounds = polygonBounds(facetVerts);
              const realRidge = Math.max(facet.ridge, bounds.width);
              const realSlope = Math.max(facet.slope, bounds.height);
              const polyWidth = Math.max(16, Math.round(realRidge * pixelsPerMeter));
              const polyHeight = Math.max(16, Math.round(realSlope * pixelsPerMeter));
              const polyClipPath = `polygon(${facetVerts
                .map(
                  (v) =>
                    `${Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(((polyWidth / 2 + v.x * pixelsPerMeter) / polyWidth) * 100)
                      )
                    )}% ${Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(((polyHeight / 2 + v.y * pixelsPerMeter) / polyHeight) * 100)
                      )
                    )}%`
                )
                .join(",")})`;

              return (
                <div
                  key={facet.id}
                  id={isActive ? "studio-roof-facet" : undefined}
                  className="absolute pointer-events-auto select-none"
                  style={{
                    left: styleLeft,
                    top: styleTop,
                    width: `${polyWidth}px`,
                    height: `${polyHeight}px`,
                    transform: `translate(-50%, -50%) rotate(${facet.rotation}deg)`,
                    cursor:
                      cadTool === "select"
                        ? dragState?.facetId === facet.id && dragState.mode === "move"
                          ? "grabbing"
                          : "grab"
                        : cadTool === "edit_polygon"
                          ? "crosshair"
                          : "default",
                    zIndex: isSelected ? 25 : 15,
                  }}
                  onMouseDown={(e) => {
                    if (cadTool === "select" || cadTool === "edit_polygon") {
                      startDrag(
                        e,
                        facet.id,
                        "move",
                        facet.ridge,
                        facet.slope,
                        facet.rotation,
                        facet.offsetX,
                        facet.offsetY,
                        facet.lat || -6.595038,
                        facet.lng || 106.797241
                      );
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFacetIds((prev) => (prev.includes(facet.id) ? prev : [...prev, facet.id]));
                    setActiveFacetId(facet.id);
                    if (facet.isSolarPopulated === false) {
                      populateFacetWithSolar(facet.id);
                    } else {
                      showToast(`Memilih ${facet.name || "bidang atap"}`);
                    }
                  }}
                >
                  {/* Outer Roof Boundary */}
                  <div className="absolute inset-0 transition-all duration-200 pointer-events-auto">
                    {/* SVG Outline for the exact polygon boundary (Universal for Rectangle, Trapezoid, L-shape, Custom Polygon) */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-10">
                      {/* Exact Roof Perimeter Polygon */}
                      <polygon
                        points={facetVerts
                          .map(
                            (v) =>
                              `${polyWidth / 2 + v.x * pixelsPerMeter},${
                                polyHeight / 2 + v.y * pixelsPerMeter
                              }`
                          )
                          .join(" ")}
                        fill={
                          isSelected
                            ? isActive
                              ? facet.isSolarPopulated === false
                                ? "rgba(245, 158, 11, 0.16)"
                                : "rgba(14, 165, 233, 0.12)"
                              : "rgba(14, 165, 233, 0.06)"
                            : facet.isSolarPopulated === false
                            ? "rgba(245, 158, 11, 0.12)"
                            : "rgba(15, 23, 42, 0.35)"
                        }
                        stroke={
                          facet.isSolarPopulated === false
                            ? "#f59e0b"
                            : isSelected
                            ? "#38bdf8"
                            : "#10b981"
                        }
                        strokeWidth={facet.isSolarPopulated === false ? "2.5" : isSelected ? "2" : "1.5"}
                        strokeDasharray={
                          facet.isSolarPopulated === false
                            ? "6 4"
                            : isSelected
                            ? "none"
                            : "4 3"
                        }
                        strokeLinejoin="round"
                        className={
                          facet.isSolarPopulated === false
                            ? "transition-all duration-300 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                            : isSelected
                            ? "filter drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                            : ""
                        }
                      />

                      {/* Setback dashed outline (Yellow dashed inset polygon, perfectly follows the exact shape for ALL templates & custom polygons!) */}
                      {isSelected && facet.setback > 0 && (() => {
                        const setbackPoly = insetPolygon(facetVerts, facet.setback);
                        if (!setbackPoly || setbackPoly.length < 3) return null;
                        return (
                          <polygon
                            points={setbackPoly
                              .map(
                                (v) =>
                                  `${polyWidth / 2 + v.x * pixelsPerMeter},${
                                    polyHeight / 2 + v.y * pixelsPerMeter
                                  }`
                              )
                              .join(" ")}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                            strokeLinejoin="round"
                          />
                        );
                      })()}
                    </svg>

                    {/* Top Ridge Tag (Scaled cleanly without clutter - rectangular roofs only) */}
                    {isSelected && facet.shape === "rectangle" && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white/95 text-slate-800 shadow-sm flex items-center gap-1.5 pointer-events-none border border-slate-200/90 backdrop-blur-md whitespace-nowrap z-25">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="font-code-metric text-[10px] font-bold text-slate-900">
                          {facet.ridge.toFixed(1)} m
                        </span>
                        {pixelsPerMeter >= 20 && (
                          <span className="text-[9px] text-slate-400">Panjang</span>
                        )}
                      </div>
                    )}

                    {/* Right Slope Tag (Scaled cleanly without clutter - rectangular roofs only) */}
                    {isSelected && facet.shape === "rectangle" && (
                      <div className="absolute -right-20 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-white/95 text-slate-800 shadow-sm flex items-center gap-1.5 pointer-events-none border border-slate-200/90 backdrop-blur-md whitespace-nowrap z-25">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        <span className="font-code-metric text-[10px] font-bold text-slate-900">
                          {facet.slope.toFixed(1)} m
                        </span>
                        {pixelsPerMeter >= 20 && (
                          <span className="text-[9px] text-slate-400">Lebar</span>
                        )}
                      </div>
                    )}

                    {/* Gutter Strip (Scaled physically to meters) - for standard rectangular roofs only */}
                    {facet.shape === "rectangle" && facet.gutter > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-sky-500/20 border-t border-dashed border-sky-400/80 flex items-center justify-center px-2 pointer-events-none transition-all duration-200 overflow-hidden"
                        style={{ height: `${Math.max(4, Math.round(facet.gutter * pixelsPerMeter))}px` }}
                      >
                        {pixelsPerMeter >= 22 && (
                          <span className="text-[7.5px] font-bold text-sky-200 uppercase tracking-wider flex items-center gap-1 truncate">
                            <span className="material-symbols-outlined text-[10px]">water_drop</span>
                            TALANG ({facet.gutter.toFixed(2)}M)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Dynamic PV Solar Panels (Only rendered when populated) */}
                    {facet.isSolarPopulated !== false && (
                      <div className="absolute inset-0 pointer-events-none z-20">
                        {fMetrics.validSlots.map((slot) => {
                          const pixelCenterLeft = polyWidth / 2 + slot.x * pixelsPerMeter;
                          const pixelCenterTop = polyHeight / 2 + slot.y * pixelsPerMeter;
                          const pixelW = slot.w * pixelsPerMeter;
                          const pixelH = slot.l * pixelsPerMeter;
                          const slotRot = slot.rotationDeg || 0;
                          const key = slot.key;

                          const state: SlotState = slot.state ?? facet.slotOverrides[key] ?? "active";

                          const showCellWattage = pixelsPerMeter >= 26;
                          const isMicroCell = pixelsPerMeter < 16;

                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (isActive) {
                                  handleSlotClick(key);
                                } else {
                                  setActiveFacetId(facet.id);
                                }
                              }}
                              className={`absolute rounded-[1.5px] transition-all flex items-center justify-center border overflow-hidden pointer-events-auto ${
                                obstacleBrush ? "cursor-crosshair ring-1 ring-amber-300" : "cursor-pointer"
                              } ${
                                state === "active"
                                  ? "bg-gradient-to-b from-[#0B1528] via-[#0F1C36] to-[#0A1325] border-sky-400/50 hover:border-amber-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] hover:scale-[1.02]"
                                  : state === "skylight"
                                    ? "bg-amber-500/50 border-amber-400"
                                    : state === "hvac"
                                      ? "bg-rose-600/70 border-rose-400"
                                      : "bg-slate-900/35 border-2 border-dashed border-sky-400/40 hover:border-amber-400 hover:bg-amber-400/15"
                              }`}
                              style={{
                                left: `${Math.round(pixelCenterLeft)}px`,
                                top: `${Math.round(pixelCenterTop)}px`,
                                width: `${Math.max(4, Math.round(pixelW))}px`,
                                height: `${Math.max(4, Math.round(pixelH))}px`,
                                transform: `translate(-50%, -50%) rotate(${slotRot}deg)`,
                              }}
                              title={
                                state === "active"
                                  ? `Panel Aktif (${slot.r + 1},${slot.c + 1}): ${facet.modulePower}W • Klik untuk matikan`
                                  : state === "empty"
                                    ? `Slot Kosong (${slot.r + 1},${slot.c + 1}) • Klik untuk pasang modul surya`
                                    : `Rintangan Atap: ${state.toUpperCase()}`
                              }
                            >
                              {state === "active" ? (
                                <div className="w-full h-full flex flex-col justify-center items-center relative pointer-events-none">
                                  {/* Silicon Wafer Busbar Lines */}
                                  <div className="w-full h-[0.5px] bg-sky-300/20 my-auto" />
                                  {showCellWattage && (
                                    <span className="text-[6.5px] font-bold text-sky-200/95 tracking-tighter truncate px-0.5 leading-none">
                                      {facet.modulePower}W
                                    </span>
                                  )}
                                  <div className="w-full h-[0.5px] bg-sky-300/20 my-auto" />
                                </div>
                              ) : state === "skylight" ? (
                                <span className={`${isMicroCell ? "w-1 h-1 rounded-full bg-amber-300" : "text-[6.5px] font-bold text-amber-200"}`}>
                                  {!isMicroCell && "SKY"}
                                </span>
                              ) : state === "hvac" ? (
                                <span className={`${isMicroCell ? "w-1 h-1 rounded-full bg-rose-300" : "text-[6.5px] font-bold text-white"}`}>
                                  {!isMicroCell && "AC"}
                                </span>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center pointer-events-none opacity-60 hover:opacity-100">
                                  <span className="material-symbols-outlined text-[10px] text-sky-400/70">add</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Mode Kontur Atap: Sleek Minimalist Dark Badge (Sesuai Desain: [🏠] 24 m²) */}
                    {facet.isSolarPopulated === false && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-25">
                        <div
                          onClick={(ev) => {
                            ev.stopPropagation();
                            populateFacetWithSolar(facet.id);
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-[#1A202C]/95 backdrop-blur-md border border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_22px_rgba(245,158,11,0.35)] hover:border-amber-400 flex items-center gap-2 pointer-events-auto cursor-pointer transition-all duration-200 hover:scale-[1.05] active:scale-[0.96]"
                          title="Klik bidang atap ini untuk pasang panel surya"
                        >
                          <span className="material-symbols-outlined text-[16px] text-amber-400 shrink-0">
                            roofing
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-100 tracking-tight">
                            {Math.round(fMetrics.grossArea)} m²
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Unselected Facet Area in Center */}
                    {!isSelected && facet.isSolarPopulated !== false && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 text-amber-200 font-mono text-[10px] font-bold shadow-xs whitespace-nowrap border border-white/10 backdrop-blur-xs">
                          {Math.round(fMetrics.grossArea)} m²
                        </span>
                      </div>
                    )}

                    {/* Single Clean Floating Array Capacity Badge */}
                    {isSelected && cadTool !== "measure" && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/90 text-white shadow-sm border border-white/20 backdrop-blur-md flex items-center gap-1.5 pointer-events-none whitespace-nowrap z-25 text-[10px]">
                        {facet.isSolarPopulated === false ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="font-medium text-slate-200">Kontur Atap</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-amber-300 font-code-metric">{fMetrics.potentialModules} Panel</span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-amber-300">{fMetrics.modulesFitted} Panel</span>
                            <span className="text-slate-500">•</span>
                            <span className="font-semibold text-sky-200 font-code-metric">{(fMetrics.actualKwp).toFixed(2)} kWp</span>
                          </>
                        )}
                        {selectedFacetIds.length > 1 && (
                          <span className="text-[8.5px] font-bold text-emerald-400 bg-emerald-950/80 px-1 rounded">✓</span>
                        )}
                      </div>
                    )}

                    {/* CAD Measure Overview (Edge Dimensions & Radiant Soft Glow Specs Card) */}
                    {isSelected && cadTool === "measure" && (() => {
                      const shapeLabel =
                        facet.shape === "rectangle"
                          ? "Persegi"
                          : facet.shape === "trapezoid"
                          ? "Trapesium / Limas"
                          : facet.shape === "l-shape"
                          ? "Bentuk L"
                          : facet.shape === "custom_polygon"
                          ? `Poligon Bebas (${facetVerts.length} Titik)`
                          : `Bentuk ${facet.shape}`;
                      const totalPerimeter = polygonPerimeter(facetVerts);

                      return (
                        <>
                          {/* 1. Subtle, Sleek Edge Length Badges along Perimeter */}
                          {facetVerts.map((v1, idx) => {
                            const v2 = facetVerts[(idx + 1) % facetVerts.length];
                            const mx = polyWidth / 2 + ((v1.x + v2.x) / 2) * pixelsPerMeter;
                            const my = polyHeight / 2 + ((v1.y + v2.y) / 2) * pixelsPerMeter;
                            const edgeLen = Math.hypot(v2.x - v1.x, v2.y - v1.y);
                            return (
                              <div
                                key={`cad-edge-${idx}`}
                                className="absolute -translate-x-1/2 -translate-y-1/2 z-35 pointer-events-none"
                                style={{ left: `${mx}px`, top: `${my}px` }}
                              >
                                <span className="px-1.5 py-0.5 rounded-full bg-white/95 text-slate-800 border border-amber-300/80 shadow-2xs font-mono text-[8.5px] font-bold whitespace-nowrap backdrop-blur-md">
                                  {edgeLen.toFixed(1)}m
                                </span>
                              </div>
                            );
                          })}

                          {/* 2. Streamlined, Non-Overwhelming CAD Dimension Card */}
                          <div
                            className="absolute top-[calc(100%+20px)] left-1/2 -translate-x-1/2 z-40 w-72 p-3.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-amber-200/90 shadow-[0_8px_30px_rgba(245,158,11,0.14),0_2px_8px_rgba(0,0,0,0.04)] text-slate-800 pointer-events-auto animate-fadeIn select-none"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-100">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-5 h-5 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                                  <span className="material-symbols-outlined text-[13px]">architecture</span>
                                </span>
                                <span className="font-title text-xs font-bold text-slate-900 truncate">
                                  {facet.name}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[8.5px] font-bold font-code-metric shrink-0">
                                {fMetrics.grossArea.toFixed(1)} m²
                              </span>
                            </div>

                            {/* Hero Area Display (Shoelace Polygon Method) */}
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-50/70 via-white to-emerald-50/40 border border-amber-200/60 mb-2">
                              <div className="flex items-baseline justify-between text-[9px] font-bold">
                                <span className="text-slate-500 uppercase tracking-wider">Luas Riil Poligon</span>
                                <span className="text-emerald-800 font-code-metric">Efektif: {fMetrics.netArea.toFixed(1)} m²</span>
                              </div>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="font-title text-xl font-extrabold text-slate-900 font-code-metric">
                                  {fMetrics.grossArea.toFixed(1)}
                                </span>
                                <span className="text-xs font-bold text-slate-500">m²</span>
                              </div>
                              <span className="text-[8.5px] text-slate-400 block mt-0.5">
                                Dihitung presisi dari {facetVerts.length} titik koordinat bidang
                              </span>
                            </div>

                            {/* 2-Column Minimal Dimension Grid */}
                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              <div className="bg-[#FAF9F5] p-2 rounded-xl border border-amber-150">
                                <span className="text-slate-400 block text-[8px] font-bold uppercase tracking-wider">Total Keliling</span>
                                <span className="font-bold text-slate-800 font-code-metric text-[11px] block mt-0.5">
                                  {totalPerimeter.toFixed(1)} m
                                </span>
                                <span className="text-[8px] text-slate-400">Keliling batas atap</span>
                              </div>

                              <div className="bg-[#FAF9F5] p-2 rounded-xl border border-amber-150">
                                <span className="text-slate-400 block text-[8px] font-bold uppercase tracking-wider">Bentang Rentang</span>
                                <span className="font-bold text-slate-800 font-code-metric text-[11px] block mt-0.5">
                                  {bounds.width.toFixed(1)}m × {bounds.height.toFixed(1)}m
                                </span>
                                <span className="text-[8px] text-slate-400">Span terluar bidang</span>
                              </div>
                            </div>

                            {/* Compact Parameter Footnote */}
                            <div className="flex items-center justify-between text-[9px] text-slate-500 pt-2 mt-2 border-t border-slate-100 font-code-metric">
                              <span>Setback: {(facet.setback || 0.5).toFixed(1)}m</span>
                              <span>•</span>
                              <span>Celah: {((facet.panelGap ?? 0.02) * 100).toFixed(0)}cm</span>
                              <span>•</span>
                              <span className="font-bold text-amber-900">{fMetrics.modulesFitted} Modul ({fMetrics.actualKwp.toFixed(1)} kWp)</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Precision Handles (Selected Only) */}
                  {isSelected && (
                    <>
                      {/* Top Rotation Handle */}
                      <div
                        className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center group cursor-grab active:cursor-grabbing z-20"
                        title="Putar sudut atap"
                        onMouseDown={(e) =>
                          startDrag(
                            e,
                            facet.id,
                            "rot",
                            facet.ridge,
                            facet.slope,
                            facet.rotation,
                            facet.offsetX,
                            facet.offsetY,
                            facet.lat || -6.6110,
                            facet.lng || 106.8150
                          )
                        }
                      >
                        <span className="px-2 py-0.5 rounded-full bg-white/95 text-amber-800 font-code-metric text-[10px] font-bold shadow-xs whitespace-nowrap mb-1 border border-amber-300">
                          {facet.rotation}°
                        </span>
                        <div className="w-7 h-7 rounded-full bg-white shadow-lg border border-slate-300 flex items-center justify-center text-slate-600 group-hover:text-amber-600 group-hover:border-amber-400 group-hover:scale-110 transition-all">
                          <span className="material-symbols-outlined text-[15px]">rotate_right</span>
                        </div>
                        <div className="w-px h-3 bg-slate-400/80" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Minimalist CAD Toolbar (Modern Frosted Glass) */}
          <div
            id="studio-left-toolbar"
            className="absolute top-1/2 -translate-y-1/2 left-4 z-30 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] border border-white/80"
          >
            {/* 1. Select / Move */}
            <button
              type="button"
              onClick={() => {
                setCadTool("select");
                showToast("Mode Pilih & Geser aktif");
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "select"
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
              }`}
              title="Pilih & Geser Poligon"
            >
              <span className="material-symbols-outlined text-[19px]">near_me</span>
            </button>

            {/* 2. Edit Polygon / Vertices */}
            <button
              type="button"
              onClick={() => {
                setCadTool("edit_polygon");
                setActiveTab("geometry");
                showToast("Mode Edit Simpul aktif");
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "edit_polygon"
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
              }`}
              title="Edit Bentuk & Simpul Poligon"
            >
              <span className="material-symbols-outlined text-[19px]">polyline</span>
            </button>

            {/* 3. Pen Tool (Custom Polygon Point-by-Point) */}
            <button
              type="button"
              onClick={() => {
                setCadTool("pen");
                setPenPoints([]);
                showToast("Mode Pen Tool aktif");
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "pen"
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
              }`}
              title="Pen Tool: Gambar Poligon Bebas"
            >
              <span className="material-symbols-outlined text-[19px]">edit</span>
            </button>

            {/* 4. Delete Vertex Tool (Hapus Titik Poligon) */}
            <button
              type="button"
              onClick={() => {
                const nextTool = cadTool === "delete_vertex" ? "select" : "delete_vertex";
                setCadTool(nextTool);
                showToast(
                  nextTool === "delete_vertex"
                    ? "Mode Hapus Simpul aktif"
                    : "Mode Hapus Simpul dinonaktifkan"
                );
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "delete_vertex"
                  ? "bg-gradient-to-r from-rose-200 via-amber-200 to-rose-200 text-rose-950 font-bold shadow-[0_2px_8px_rgba(244,63,94,0.25),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-rose-300/80"
                  : "text-slate-600 hover:text-rose-600 hover:bg-rose-50/70"
              }`}
              title="Hapus Titik Simpul Poligon"
            >
              <span className="material-symbols-outlined text-[19px]">remove_circle_outline</span>
            </button>

            {/* 5. Measure & CAD Overview Tool */}
            <button
              type="button"
              onClick={() => {
                const nextTool = cadTool === "measure" ? "select" : "measure";
                setCadTool(nextTool);
                if (nextTool !== "measure") {
                  setMeasurePoints([]);
                  setIsMeasureClosed(false);
                }
                showToast(
                  nextTool === "measure"
                    ? "Mode Penggaris & Dimensi CAD aktif"
                    : "Mode pengukuran dinonaktifkan"
                );
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "measure"
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
              }`}
              title="Penggaris & Dimensi CAD"
            >
              <span className="material-symbols-outlined text-[19px]">straighten</span>
            </button>

            {/* 6. AI Rooftop Detection Tool (Under Ruler) */}
            <button
              type="button"
              onClick={handleRunAiDetection}
              disabled={isAiScanning}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                isAiScanning ? "cursor-progress opacity-70" : "cursor-pointer"
              } ${
                detection !== null || isAiScanning
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.25),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-amber-700 hover:bg-amber-50/70"
              }`}
              title="Pindai Bidang Atap dengan Model AI (Computer Vision)"
            >
              <span className={`material-symbols-outlined text-[19px] ${isAiScanning ? "animate-spin text-amber-900" : "text-amber-800"}`}>
                {isAiScanning ? "sync" : "psychology"}
              </span>
            </button>

            {/* Divider */}
            <div className="w-5 h-px bg-slate-200 my-0.5" />

            {/* 7. Panduan Studio bersama Sunny (Ikon '?') */}
            <button
              type="button"
              onClick={() => setMascotGuideOpen((prev) => !prev)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                mascotGuideOpen
                  ? "bg-amber-100 text-amber-950 border border-amber-300/80 shadow-2xs font-bold"
                  : "bg-white text-slate-700 hover:bg-slate-100 hover:text-amber-800"
              }`}
              title="Panduan Studio bersama Sunny"
              aria-label="Panduan Studio"
            >
              <span className="material-symbols-outlined text-[19px] text-amber-600 font-bold">
                help
              </span>
            </button>
          </div>

          {/* Interactive Studio Mascot Guide (Sunny) */}
          <StudioMascotGuide
            isOpen={mascotGuideOpen}
            onOpen={() => setMascotGuideOpen(true)}
            onClose={() => setMascotGuideOpen(false)}
            onPopulateActiveFacet={() => {
              if (activeFacet) {
                populateFacetWithSolar(activeFacet.id);
              } else {
                populateAllFacetsWithSolar();
              }
            }}
            onSetSolarPopulated={(populated) => {
              if (populated) {
                populateAllFacetsWithSolar();
              } else {
                resetAllToRoofOutline();
              }
            }}
            onSwitchTab={(tab) => {
              setActiveTab(tab);
            }}
            onOpenRightPanel={() => {
              setRightPanelOpen(true);
            }}
            hasActiveSolar={activeFacet?.isSolarPopulated !== false}
          />
        </div>

        {/* =======================================================
            RIGHT: INSPECTOR & PARAMETER STUDIO
            ======================================================= */}
        <div
          id="studio-sidebar-inspector"
          className={`relative h-[45vh] lg:h-full shrink-0 bg-white border-l border-slate-200 shadow-[-4px_0_16px_rgba(15,23,42,0.03)] z-30 transition-all duration-300 overflow-visible flex flex-col ${
            rightPanelOpen ? "w-full lg:w-[380px]" : "w-full lg:w-0"
          }`}
        >
          {/* Desktop Panel Toggle */}
          <button
            type="button"
            onClick={() => setRightPanelOpen((prev) => !prev)}
            className="absolute -left-7 top-1/2 -translate-y-1/2 w-7 h-14 bg-white border border-slate-200 border-r-0 rounded-l-lg shadow-[-2px_0_8px_rgba(0,0,0,0.04)] hidden lg:flex items-center justify-center text-slate-400 hover:text-amber-600 transition-colors z-40 cursor-pointer"
            aria-label="Toggle Panel"
          >
            <span className="material-symbols-outlined text-[20px]">
              {rightPanelOpen ? "chevron_right" : "chevron_left"}
            </span>
          </button>

          <div className="w-full lg:w-[380px] shrink-0 h-full flex flex-col overflow-hidden bg-[#FAF9F5]">
            {/* Eco-Forest Diorama & Ribbon */}
            <div className="p-3 pb-2.5 bg-white/80 border-b border-amber-200/50 shrink-0">
              <div className="relative w-full h-28 rounded-xl bg-gradient-to-b from-sky-200/90 via-sky-100/60 to-emerald-100/80 border border-sky-200/80 overflow-hidden shadow-inner flex flex-col justify-between p-2">
                <div className="relative z-10 w-full">
                  {roiHoverYear !== null ? (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-emerald-950 block leading-tight">
                          Proyeksi Kumulatif Pohon
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-950 border border-emerald-400/40 text-[9px] font-bold">
                          Tahun ke-{roiHoverYear.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-[11px] text-emerald-900/70 leading-tight">
                          serapan karbon setara
                        </span>
                        <span className="text-[13px] font-bold text-emerald-950 tracking-tight font-code-metric">
                          {displayTreesCount.toLocaleString("id-ID")} pohon
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-semibold text-sky-950/70 block leading-tight">
                        Dampak ekologis proyek
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-[11px] text-sky-900/70 leading-tight">
                          reduksi emisi setara
                        </span>
                        <span className="text-[13px] font-bold text-slate-900 tracking-tight font-code-metric">
                          {calc.treesEquivalent.toLocaleString("id-ID")} pohon / thn
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 340 95">
                    <defs>
                      <linearGradient id="hillGradBack" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#bbf7d0" />
                        <stop offset="100%" stopColor="#86efac" />
                      </linearGradient>
                      <linearGradient id="hillGradMid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#16a34a" />
                      </linearGradient>
                      <linearGradient id="hillGradFront" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                    </defs>

                    {/* Fluffy drifting clouds - continuous right to left */}
                    <g className="eco-cloud-top-1">
                      <path
                        d="M -24,4 Q -18,-4 -8,-2 Q 0,-8 10,-2 Q 18,-4 22,4 L -28,4 Z"
                        fill="#ffffff"
                        opacity="0.95"
                      />
                    </g>
                    <g className="eco-cloud-top-2">
                      <path
                        d="M -30,6 Q -22,-5 -10,-2 Q 2,-9 14,-3 Q 24,-5 28,6 L -34,6 Z"
                        fill="#ffffff"
                        opacity="0.9"
                      />
                    </g>
                    <g className="eco-cloud-mid-1">
                      <path
                        d="M -16,3 Q -12,-3 -5,-1 Q 0,-5 7,-1 Q 12,-3 15,3 L -18,3 Z"
                        fill="#ffffff"
                        opacity="0.85"
                      />
                    </g>

                    {/* Sun with pulsing halo */}
                    <g transform="translate(305, 16)">
                      <circle cx="0" cy="0" r="13" fill="#fef08a" className="eco-sun-halo" />
                      <circle cx="0" cy="0" r="7.5" fill="#fde047" opacity="0.85" />
                      <circle cx="0" cy="0" r="5" fill="#f59e0b" />
                    </g>

                    <path d="M 0 52 Q 85 36, 170 46 T 340 40 L 340 95 L 0 95 Z" fill="url(#hillGradBack)" opacity="0.85" />
                    <g>
                      {ECO_TREE_CONFIGS.filter((t) => t.layer === "back").map((cfg) => {
                        const isSprouted = cfg.growRank <= activeTreeCount;
                        return (
                          <g key={cfg.id} transform={`translate(${cfg.x}, ${cfg.y}) scale(${cfg.scale})`}>
                            <g
                              className={`eco-tree-stem ${isSprouted ? "sprouted" : "dormant"}`}
                              style={{ transitionDelay: isSprouted ? `${((cfg.growRank - 1) % 4) * 60}ms` : "0ms" }}
                            >
                              <g className={`eco-breeze-${(cfg.id % 3) + 1}`}>
                                {renderTreeSvg(cfg.type)}
                              </g>
                            </g>
                          </g>
                        );
                      })}
                    </g>

                    <path d="M 0 64 Q 80 48, 165 58 T 340 52 L 340 95 L 0 95 Z" fill="url(#hillGradMid)" opacity="0.95" />
                    <g>
                      {ECO_TREE_CONFIGS.filter((t) => t.layer === "mid").map((cfg) => {
                        const isSprouted = cfg.growRank <= activeTreeCount;
                        return (
                          <g key={cfg.id} transform={`translate(${cfg.x}, ${cfg.y}) scale(${cfg.scale})`}>
                            <g
                              className={`eco-tree-stem ${isSprouted ? "sprouted" : "dormant"}`}
                              style={{ transitionDelay: isSprouted ? `${((cfg.growRank - 1) % 4) * 60}ms` : "0ms" }}
                            >
                              <g className={`eco-breeze-${(cfg.id % 3) + 1}`}>
                                {renderTreeSvg(cfg.type)}
                              </g>
                            </g>
                          </g>
                        );
                      })}
                    </g>

                    <path d="M 0 76 Q 95 64, 190 72 T 340 68 L 340 95 L 0 95 Z" fill="url(#hillGradFront)" />
                    <g>
                      {ECO_TREE_CONFIGS.filter((t) => t.layer === "front").map((cfg) => {
                        const isSprouted = cfg.growRank <= activeTreeCount;
                        return (
                          <g key={cfg.id} transform={`translate(${cfg.x}, ${cfg.y}) scale(${cfg.scale})`}>
                            <g
                              className={`eco-tree-stem ${isSprouted ? "sprouted" : "dormant"}`}
                              style={{ transitionDelay: isSprouted ? `${((cfg.growRank - 1) % 4) * 60}ms` : "0ms" }}
                            >
                              <g className={`eco-breeze-${(cfg.id % 3) + 1}`}>
                                {renderTreeSvg(cfg.type)}
                              </g>
                            </g>
                          </g>
                        );
                      })}
                    </g>

                    {/* Drifting Falling Leaves */}
                    <g className="pointer-events-none">
                      <g className="eco-falling-leaf-1">
                        <path d="M 0,-3 C 3,-3 5,-1 4,2 C 2,4 -1,3 -2,1 C -3,-1 -1,-3 0,-3 Z" fill="#059669" opacity="0.85" />
                      </g>
                      <g className="eco-falling-leaf-2">
                        <path d="M 0,-3.5 C 3.5,-3.5 5,-1.5 4,2 C 2,4.5 -1.5,3.5 -2.5,1.5 C -3.5,-1.5 -1,-3.5 0,-3.5 Z" fill="#10b981" opacity="0.9" />
                      </g>
                      <g className="eco-falling-leaf-3">
                        <path d="M 0,-2.8 C 2.8,-2.8 4.2,-1 3.5,1.8 C 1.8,3.6 -1,2.8 -1.8,1 C -2.8,-1 -0.8,-2.8 0,-2.8 Z" fill="#34d399" opacity="0.8" />
                      </g>
                      <g className="eco-falling-leaf-4">
                        <path d="M 0,-3.2 C 3.2,-3.2 4.8,-1 4,2.2 C 2,4 -1,3.2 -2,1.2 C -3.2,-1 -0.8,-3.2 0,-3.2 Z" fill="#6ee7b7" opacity="0.85" />
                      </g>
                    </g>
                  </svg>
                </div>

              </div>

              {/* Metrics Ribbon */}
              <div className="grid grid-cols-4 divide-x divide-amber-200/60 bg-white rounded-2xl border border-amber-200/50 shadow-2xs py-2 px-0.5 mt-2">
                <div className="flex flex-col items-center text-center px-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kapasitas</span>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-[13px] font-extrabold text-slate-900 tracking-tight">
                      {calc.actualKwp.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-bold text-amber-600">kWp</span>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center px-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Produksi</span>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-[13px] font-extrabold text-slate-900 tracking-tight">
                      {(calc.annualProductionKwh / 1000).toFixed(1)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">MWh</span>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center px-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hemat/Bln</span>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-[13px] font-extrabold text-emerald-600 tracking-tight">
                      {(calc.cappedSaving / 1_000_000).toFixed(2)}M
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center px-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payback</span>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-[13px] font-extrabold text-amber-600 tracking-tight">
                      {calc.paybackYears ? calc.paybackYears.toFixed(1) : "—"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">Thn</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (Unified Soft Amber Pills) */}
            <div className="grid grid-cols-3 bg-[#FAF9F5] border-b border-amber-200/50 p-2 gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("geometry")}
                className={`py-2 px-1 rounded-xl text-center font-title text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "geometry"
                    ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                    : "bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/70 font-medium shadow-2xs"
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${activeTab === "geometry" ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-500"}`}>
                  1
                </span>
                <span>Geometri</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pvarray")}
                className={`py-2 px-1 rounded-xl text-center font-title text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "pvarray"
                    ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                    : "bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/70 font-medium shadow-2xs"
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${activeTab === "pvarray" ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-500"}`}>
                  2
                </span>
                <span>Modul Surya</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("financials")}
                className={`py-2 px-1 rounded-xl text-center font-title text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "financials"
                    ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                    : "bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/70 font-medium shadow-2xs"
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${activeTab === "financials" ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-500"}`}>
                  3
                </span>
                <span>Finansial</span>
              </button>
            </div>

            {/* TAB PANES */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "geometry" && (
                <div id="studio-pane-geometry" className="p-4 space-y-4">
                  {/* Multi-Polygon Facet Switcher Strip */}
                  <div className="rounded-2xl bg-white/80 p-3 border border-amber-200/50 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-amber-600">layers</span>
                        <span className="font-title text-xs font-bold text-slate-900">
                          Bidang Atap ({selectedFacetIds.length}/{facets.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={selectedFacetIds.length === facets.length ? unselectAllFacets : selectAllFacets}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold border border-slate-200 transition cursor-pointer"
                          title={selectedFacetIds.length === facets.length ? "Batal pilih semua bidang" : "Pilih semua bidang atap"}
                        >
                          {selectedFacetIds.length === facets.length ? "Batal Pilih" : "Pilih Semua"}
                        </button>
                        <button
                          type="button"
                          onClick={addNewFacet}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:brightness-105 active:scale-95 text-amber-950 text-[10.5px] font-bold flex items-center gap-1 transition shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.75)] border border-amber-200/90 cursor-pointer"
                          title="Tambah Bidang Atap Baru"
                        >
                          <span className="material-symbols-outlined text-[14px] text-amber-900">add</span>
                          <span>Tambah Bidang</span>
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Pill Strip for Facets */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scrollbar-none">
                      {facets.map((facet, idx) => {
                        const isSelected = selectedFacetIds.includes(facet.id);
                        const isActive = facet.id === activeFacetId;
                        return (
                          <div
                            key={facet.id}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium shrink-0 transition-all ${
                              isSelected
                                ? isActive
                                  ? "bg-amber-100/90 text-amber-950 border-amber-300 font-bold shadow-2xs"
                                  : "bg-amber-50/70 hover:bg-amber-100/70 text-amber-900 border-amber-200/90 font-semibold"
                                : "bg-white/90 hover:bg-white text-slate-500 border-slate-200/90 opacity-80"
                            }`}
                          >
                            {/* Tombol Centang untuk Multiselect */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFacetSelection(facet.id);
                              }}
                              className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-amber-500 text-white shadow-2xs hover:bg-amber-600"
                                  : "border-2 border-slate-300 hover:border-amber-400 bg-white"
                              }`}
                              title={isSelected ? "Batalkan centang bidang ini" : "Centang bidang ini untuk multiselect"}
                            >
                              {isSelected && (
                                <span className="material-symbols-outlined text-[12px] font-black">check</span>
                              )}
                            </button>

                            {/* Label & Dimensi (Klik untuk fokus aktif ke bidang ini) */}
                            <div
                              className="flex items-center gap-1.5 cursor-pointer select-none"
                              onClick={() => {
                                setSelectedFacetIds((prev) => (prev.includes(facet.id) ? prev : [...prev, facet.id]));
                                setActiveFacetId(facet.id);
                                showToast(`Fokus ke ${facet.name || `Bidang #${idx + 1}`}`);
                              }}
                              title="Klik untuk memilih & mengedit parameter bidang ini"
                            >
                              <span className="font-bold text-slate-800">{facet.name || `Bidang #${idx + 1}`}</span>
                              <span className={`text-[10px] ${isSelected ? "text-amber-800 font-medium" : "text-slate-400"}`}>
                                ({facet.ridge.toFixed(1)}m × {facet.slope.toFixed(1)}m)
                              </span>
                            </div>

                            {facets.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteFacet(facet.id);
                                }}
                                className="p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition ml-0.5 cursor-pointer"
                                title="Hapus bidang atap ini"
                              >
                                <span className="material-symbols-outlined text-[13px]">delete</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Panduan & daftar bidang kandidat hasil deteksi */}
                    {facets.length === 0 ? (
                      <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 text-xs space-y-2 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[16px]">psychology</span>
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">Deteksi Bidang Atap AI</span>
                            <span className="text-[10.5px] text-slate-500 block">
                              Tekan tombol pindai AI untuk memindai area atap yang tampil di peta
                            </span>
                          </div>
                        </div>
                        {remainingDetectedRoofs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-amber-200/60">
                            {remainingDetectedRoofs.map((detected) => {
                              const isPicked = selectedDetectedIds.includes(detected.id);

                              return (
                                <button
                                  key={detected.id}
                                  type="button"
                                  onClick={() => selectDetectedRoof(detected.id)}
                                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                                    isPicked
                                      ? "bg-amber-400 text-amber-950 border-amber-400"
                                      : "bg-white hover:bg-amber-100 text-amber-950 border-amber-200"
                                  }`}
                                  title={`${detected.area_sqm.toFixed(1)} m² · keyakinan ${Math.round(detected.confidence * 100)}%`}
                                >
                                  <span className="material-symbols-outlined text-[14px] text-amber-700">
                                    {isPicked ? "check_circle" : "roofing"}
                                  </span>
                                  <span>{detected.area_sqm.toFixed(1)} m²</span>
                                  <span className="text-amber-800 text-[10px] font-mono">
                                    {Math.round(detected.confidence * 100)}%
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {detection !== null && detectedRoofs.length === 0 && (
                          <p className="text-[10.5px] text-slate-500 pt-1 border-t border-amber-200/60">
                            Model tidak menemukan bidang atap di area ini. Geser peta ke atas atap, lalu pindai ulang.
                          </p>
                        )}
                      </div>
                    ) : (
                      selectedFacetIds.length === 0 && (
                        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-300/80 text-amber-950 text-xs flex items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-amber-600 text-[18px]">info</span>
                            <span className="text-[11px] font-medium">Belum ada bidang dipilih. Klik centang pada bidang di atas atau klik atap di peta untuk kalkulasi &amp; pohon.</span>
                          </div>
                          <button
                            type="button"
                            onClick={selectAllFacets}
                            className="px-2 py-1 rounded-lg bg-amber-300 hover:bg-amber-400 text-amber-950 font-bold text-[10.5px] transition shrink-0 cursor-pointer"
                          >
                            Pilih Semua
                          </button>
                        </div>
                      )
                    )}

                    {/* Bidang kandidat yang belum diterapkan menjadi bidang proyek */}
                    {showDetectedRoofs && facets.length > 0 && remainingDetectedRoofs.length > 0 && (
                      <div className="pt-2 border-t border-amber-100/70 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-bold text-slate-500 block">
                            Bidang Terdeteksi Belum Diterapkan:
                          </span>
                          <button
                            type="button"
                            onClick={commitDetectedSelection}
                            disabled={selectedDetectedIds.length === 0}
                            className={`text-[10.5px] font-bold hover:underline ${
                              selectedDetectedIds.length > 0
                                ? "text-amber-800 cursor-pointer"
                                : "text-slate-300 cursor-not-allowed"
                            }`}
                          >
                            Selesai Memilih ✕
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {remainingDetectedRoofs.map((detected) => {
                            const isPicked = selectedDetectedIds.includes(detected.id);

                            return (
                              <button
                                key={detected.id}
                                type="button"
                                onClick={() => selectDetectedRoof(detected.id)}
                                className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                                  isPicked
                                    ? "bg-amber-400 text-amber-950 border-amber-400 font-bold"
                                    : "bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-200/80"
                                }`}
                                title={`${detected.area_sqm.toFixed(1)} m² · keyakinan ${Math.round(detected.confidence * 100)}%`}
                              >
                                <span className="material-symbols-outlined text-[14px] text-amber-700">
                                  {isPicked ? "check_circle" : "roofing"}
                                </span>
                                <span className="font-semibold">{detected.area_sqm.toFixed(1)} m²</span>
                                <span className="text-amber-700 font-mono text-[10px]">
                                  {Math.round(detected.confidence * 100)}%
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shape Presets & Polygon Editing */}
                  <div className="rounded-2xl bg-white/80 p-3.5 border border-amber-200/50 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-title text-xs font-bold text-slate-900">Alat Edit Poligon &amp; Bentuk</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold font-code-metric">
                        {roofShape === "rectangle"
                          ? "Persegi"
                          : roofShape === "l-shape"
                            ? "Bentuk L"
                            : roofShape === "trapezoid"
                              ? "Limasan"
                              : "Poligon Bebas"}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRoofShape("rectangle")}
                        className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          roofShape === "rectangle"
                            ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                            : "bg-white/80 text-slate-700 border-slate-200/80 hover:bg-slate-50"
                        }`}
                        title="Ubah ke bentuk atap Persegi Panjang standar"
                      >
                        <span className="material-symbols-outlined text-[16px]">crop_landscape</span>
                        <span className="text-[10px] font-bold">Persegi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoofShape("l-shape")}
                        className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          roofShape === "l-shape"
                            ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                            : "bg-white/80 text-slate-700 border-slate-200/80 hover:bg-slate-50"
                        }`}
                        title="Ubah ke bentuk atap Bentuk L bersudut"
                      >
                        <span className="material-symbols-outlined text-[16px]">rounded_corner</span>
                        <span className="text-[10px] font-bold">Bentuk L</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoofShape("trapezoid")}
                        className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          roofShape === "trapezoid"
                            ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                            : "bg-white/80 text-slate-700 border-slate-200/80 hover:bg-slate-50"
                        }`}
                        title="Ubah ke bentuk atap Limasan / Trapesium miring"
                      >
                        <span className="material-symbols-outlined text-[16px]">change_history</span>
                        <span className="text-[10px] font-bold">Limasan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoofShape("custom_polygon")}
                        className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          roofShape === "custom_polygon"
                            ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                            : "bg-white/80 text-slate-700 border-slate-200/80 hover:bg-slate-50"
                        }`}
                        title="Bebas edit setiap sudut poligon mirip Figma"
                      >
                        <span className="material-symbols-outlined text-[16px]">polyline</span>
                        <span className="text-[10px] font-bold">Bebas</span>
                      </button>
                    </div>

                    {/* Rotation */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-200/70">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">Rotasi Poligon Atap</span>
                        <span className="font-code-metric font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                          {polygonRotation}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={polygonRotation}
                        onChange={(e) => setPolygonRotation(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                      <div className="grid grid-cols-4 gap-1 pt-0.5 font-code-metric text-[9.5px]">
                        {[
                          { label: "Optimal (+8°)", val: 8 },
                          { label: "Datar (0°)", val: 0 },
                          { label: "Miring (45°)", val: 45 },
                          { label: "Tegak (90°)", val: 90 },
                        ].map((rot) => (
                          <button
                            key={rot.val}
                            type="button"
                            onClick={() => setPolygonRotation(rot.val)}
                            className={`py-1 px-1 rounded border text-center transition cursor-pointer font-bold ${
                              polygonRotation === rot.val
                                ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.15),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                                : "bg-white/80 hover:bg-white text-slate-700 border-slate-200/80"
                            }`}
                          >
                            {rot.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Nudge D-Pad */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-200/70">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">Posisi Koordinat Poligon</span>
                        <span className="font-code-metric text-[10px] text-slate-500">
                          X: {activeFacet.offsetX || 0}px, Y: {activeFacet.offsetY || 0}px
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => nudgeFacet(-10, 0)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-amber-100 hover:text-amber-950 active:scale-95 transition cursor-pointer"
                            title="Geser Kiri (10px)"
                          >
                            <span className="material-symbols-outlined text-[14px]">arrow_left</span>
                          </button>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => nudgeFacet(0, -10)}
                              className="w-6 h-3 rounded flex items-center justify-center text-slate-600 hover:bg-amber-100 hover:text-amber-950 active:scale-95 transition cursor-pointer"
                              title="Geser Atas (10px)"
                            >
                              <span className="material-symbols-outlined text-[12px]">arrow_drop_up</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => nudgeFacet(0, 10)}
                              className="w-6 h-3 rounded flex items-center justify-center text-slate-600 hover:bg-amber-100 hover:text-amber-950 active:scale-95 transition cursor-pointer"
                              title="Geser Bawah (10px)"
                            >
                              <span className="material-symbols-outlined text-[12px]">arrow_drop_down</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => nudgeFacet(10, 0)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-amber-100 hover:text-amber-950 active:scale-95 transition cursor-pointer"
                            title="Geser Kanan (10px)"
                          >
                            <span className="material-symbols-outlined text-[14px]">arrow_right</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={centerFacetOnRoof}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-950 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                          title="Pusatkan poligon ke titik tengah atap"
                        >
                          <span className="material-symbols-outlined text-[14px]">filter_center_focus</span>
                          <span>Pusatkan ke Atap</span>
                        </button>
                      </div>
                    </div>

                    {/* Obstacles Detection & Management */}
                    <div className="space-y-2 pt-1 border-t border-slate-200/70">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">Deteksi &amp; Rintangan Atap</span>
                        <span className="font-code-metric text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          {(hasHvac ? 1 : 0) +
                            (hasSkylight ? 1 : 0) +
                            Object.values(activeFacet.slotOverrides || {}).filter((s) => s !== "active").length}{" "}
                          Rintangan Aktif
                        </span>
                      </div>

                      {/* AI Automatic Detection */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-semibold block">Deteksi Otomatis AI:</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleObstacle("hvac")}
                            className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              hasHvac
                                ? "bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">{hasHvac ? "check" : "ac_unit"}</span>
                            <span>{hasHvac ? "AC / HVAC Aktif" : "+ AC / HVAC"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleObstacle("skylight")}
                            className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              hasSkylight
                                ? "bg-sky-50 text-sky-900 border-sky-300 shadow-2xs"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">{hasSkylight ? "check" : "grid_4x4"}</span>
                            <span>{hasSkylight ? "Skylight Aktif" : "+ Skylight Kaca"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Manual Add Obstacles (Interactive Canvas Brush) */}
                      <div className="space-y-1 pt-1.5 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-semibold">Tambah Manual (Kuas Interaktif):</span>
                          {Object.keys(activeFacet.slotOverrides || {}).length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSlotOverrides({});
                                showToast("Semua rintangan manual direset");
                              }}
                              className="text-rose-600 hover:underline cursor-pointer font-bold flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[12px]">restart_alt</span>
                              Reset Manual
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const next = obstacleBrush === "hvac" ? null : "hvac";
                              setObstacleBrush(next);
                              if (next) showToast("Kuas AC Aktif: Klik slot panel di peta untuk pasang/hapus");
                            }}
                            className={`py-1.5 px-1 rounded-lg border text-center transition cursor-pointer flex flex-col items-center gap-0.5 ${
                              obstacleBrush === "hvac"
                                ? "bg-amber-100 text-amber-950 border-amber-400 font-bold shadow-2xs ring-1 ring-amber-400"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                            title="Tandai AC / Outdoor Chiller manual"
                          >
                            <span className="material-symbols-outlined text-[14px] text-amber-600">ac_unit</span>
                            <span className="text-[9.5px]">Kuas AC</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = obstacleBrush === "skylight" ? null : "skylight";
                              setObstacleBrush(next);
                              if (next) showToast("Kuas Skylight Aktif: Klik slot panel di peta untuk pasang/hapus");
                            }}
                            className={`py-1.5 px-1 rounded-lg border text-center transition cursor-pointer flex flex-col items-center gap-0.5 ${
                              obstacleBrush === "skylight"
                                ? "bg-sky-100 text-sky-950 border-sky-400 font-bold shadow-2xs ring-1 ring-sky-400"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                            title="Tandai Skylight Kaca manual"
                          >
                            <span className="material-symbols-outlined text-[14px] text-sky-600">grid_4x4</span>
                            <span className="text-[9.5px]">Kuas Kaca</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = obstacleBrush === "empty" ? null : "empty";
                              setObstacleBrush(next);
                              if (next) showToast("Kuas Void Aktif: Klik slot panel untuk dikosongkan");
                            }}
                            className={`py-1.5 px-1 rounded-lg border text-center transition cursor-pointer flex flex-col items-center gap-0.5 ${
                              obstacleBrush === "empty"
                                ? "bg-slate-200 text-slate-900 border-slate-400 font-bold shadow-2xs ring-1 ring-slate-400"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                            title="Hapus / Kosongkan slot panel (Void)"
                          >
                            <span className="material-symbols-outlined text-[14px] text-slate-500">block</span>
                            <span className="text-[9.5px]">Kuas Kosong</span>
                          </button>
                        </div>
                        {obstacleBrush && (
                          <div className="p-1.5 rounded-lg bg-amber-50/90 border border-amber-300 text-[10px] text-amber-950 flex items-center justify-between animate-fadeIn">
                            <span className="truncate">
                              Klik panel di atap: <strong>{obstacleBrush === "hvac" ? "AC" : obstacleBrush === "skylight" ? "Skylight" : "Void"}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => setObstacleBrush(null)}
                              className="text-amber-800 hover:text-amber-950 font-bold shrink-0 ml-1 cursor-pointer"
                            >
                              ✕ Tutup
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Surface Dimensions */}
                  <div className="rounded-2xl bg-white/80 p-3.5 border border-amber-200/50 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-title text-xs font-bold text-slate-900">Dimensi &amp; Parameter Bidang</span>
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-code-metric text-[10px] font-bold">
                        {activeFacet.name}
                      </span>
                    </div>

                    {/* Rename active facet */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">Nama Bidang Aktif</label>
                      <input
                        type="text"
                        value={activeFacet.name}
                        onChange={(e) => updateActiveFacet({ name: e.target.value })}
                        className="w-full rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500">Panjang Atap (Ridge)</label>
                        <div className="flex items-center rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                          <input
                            type="number"
                            step="0.1"
                            value={ridge}
                            onChange={(e) => setRidge(Number(e.target.value))}
                            className="seamless-input w-full bg-transparent font-code-metric text-xs font-bold text-slate-900 border-0 p-0"
                          />
                          <span className="font-code-metric text-xs text-slate-400">m</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-500">Lebar Kemiringan (Slope)</label>
                        <div className="flex items-center rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                          <input
                            type="number"
                            step="0.1"
                            value={slope}
                            onChange={(e) => setSlope(Number(e.target.value))}
                            className="seamless-input w-full bg-transparent font-code-metric text-xs font-bold text-slate-900 border-0 p-0"
                          />
                          <span className="font-code-metric text-xs text-slate-400">m</span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-sky-50 border border-sky-200 p-2 space-y-0.5">
                        <span className="text-[10px] text-sky-800 font-semibold block">Luas Efektif Panel</span>
                        <p className="font-title text-sm font-extrabold text-sky-700">
                          {calc.netArea.toFixed(2)} <span className="text-xs font-normal">m²</span>
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-100 border border-slate-200 p-2 space-y-0.5">
                        <span className="text-[10px] text-slate-600 font-semibold block">Luas Total Bidang Atap</span>
                        <p className="font-title text-sm font-extrabold text-slate-800">
                          {calc.grossArea.toFixed(2)} <span className="text-xs font-normal text-slate-500">m²</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pitch Calibration & Vector CAD Diagram */}
                  <div className="rounded-2xl bg-white/80 p-3.5 border border-amber-200/50 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-600 text-[18px]">architecture</span>
                        <span className="font-title text-xs font-bold text-slate-900">Kemiringan Bidang Atap</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-code-metric text-xs font-bold">
                        {pitch}° Kemiringan
                      </span>
                    </div>

                    {/* Range Slider with Synchronized Ticks */}
                    <div className="space-y-1.5">
                      <div className="relative flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="45"
                          step="1"
                          value={pitch}
                          onChange={(e) => setPitch(Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600 focus:outline-none"
                        />
                      </div>
                      <div className="relative w-full h-4 font-code-metric text-[10px] text-slate-400 select-none">
                        <span className="absolute left-0 cursor-pointer hover:text-amber-600" onClick={() => setPitch(0)}>0°</span>
                        <span className="absolute -translate-x-1/2 cursor-pointer hover:text-amber-600" style={{ left: "11.11%" }} onClick={() => setPitch(5)}>5°</span>
                        <span className="absolute -translate-x-1/2 cursor-pointer hover:text-amber-600 font-bold text-slate-800" style={{ left: "33.33%" }} onClick={() => setPitch(15)}>15°</span>
                        <span className="absolute -translate-x-1/2 cursor-pointer hover:text-amber-600 font-bold text-amber-700" style={{ left: "48.89%" }} onClick={() => setPitch(22)}>22°</span>
                        <span className="absolute -translate-x-1/2 cursor-pointer hover:text-amber-600" style={{ left: "66.67%" }} onClick={() => setPitch(30)}>30°</span>
                        <span className="absolute -translate-x-1/2 cursor-pointer hover:text-amber-600 font-bold text-slate-800" style={{ left: "88.89%" }} onClick={() => setPitch(40)}>40°</span>
                        <span className="absolute right-0 cursor-pointer hover:text-amber-600" onClick={() => setPitch(45)}>45°</span>
                      </div>
                    </div>

                    {/* Preset Buttons */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {[
                        { label: "Datar 5°", val: 5 },
                        { label: "Landai 15°", val: 15 },
                        { label: "Standar 22°", val: 22 },
                        { label: "Curam 40°", val: 40 },
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setPitch(p.val)}
                          className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-bold text-center transition-all cursor-pointer ${
                            pitch === p.val
                              ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.15),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                              : "bg-white/80 hover:bg-white text-slate-700 border-slate-200/80"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Interactive Profile Vector Diagram (Rich Architectural CAD Simulation) */}
                    <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          Visualisasi Sudut Datang Sinar Surya
                        </span>
                        <span className="font-code-metric text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          Kemiringan: {pitch}°
                        </span>
                      </div>
                      <div className="flex items-center gap-3 bg-gradient-to-br from-slate-50 to-amber-50/20 p-2.5 rounded-lg border border-slate-200/90">
                        {/* SVG Technical Vector */}
                        <div className="relative w-36 h-22 shrink-0 bg-white rounded-lg border border-slate-200/60 p-1 shadow-2xs overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 145 85">
                            <defs>
                              <pattern id="cad-grid-pitch" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
                              </pattern>
                              <linearGradient id="solarGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#0284c7" />
                                <stop offset="50%" stopColor="#0369a1" />
                                <stop offset="100%" stopColor="#0284c7" />
                              </linearGradient>
                              <linearGradient id="amberWedgeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                              </linearGradient>
                            </defs>

                            <rect width="145" height="85" fill="url(#cad-grid-pitch)" />

                            {/* Concrete wall support */}
                            <polygon points="12,70 24,70 24,82 12,82" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                            <line x1="12" y1="74" x2="24" y2="74" stroke="#94a3b8" strokeWidth="0.5" />
                            <line x1="12" y1="78" x2="24" y2="78" stroke="#94a3b8" strokeWidth="0.5" />

                            {/* Horizontal Baseline */}
                            <line x1="8" y1="70" x2="138" y2="70" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
                            <text x="135" y="73" fontSize="7.5" fill="#94a3b8" fontFamily="Inter" fontWeight="600">0°</text>

                            {/* Shaded Angle Wedge Sector */}
                            <path d={wedgePathD} fill="url(#amberWedgeGrad)" />

                            {/* Rotating Roof & PV Assembly */}
                            <g transform={`rotate(-${pitch}, 20, 70)`} style={{ transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                              <line x1="18" y1="70" x2="118" y2="70" stroke="#475569" strokeWidth="4.5" strokeLinecap="round" />
                              <line x1="36" y1="70" x2="36" y2="63" stroke="#64748b" strokeWidth="2" />
                              <line x1="74" y1="70" x2="74" y2="63" stroke="#64748b" strokeWidth="2" />
                              <line x1="106" y1="70" x2="106" y2="63" stroke="#64748b" strokeWidth="2" />
                              <rect x="26" y="58" width="88" height="5.5" rx="1.5" fill="url(#solarGlassGrad)" stroke="#0284c7" strokeWidth="1" />
                              <rect x="25" y="57.5" width="90" height="6.5" rx="1.5" fill="none" stroke="#38bdf8" strokeWidth="0.6" opacity="0.8" />
                              <line x1="48" y1="58.5" x2="48" y2="63" stroke="#ffffff" strokeWidth="0.75" opacity="0.7" />
                              <line x1="70" y1="58.5" x2="70" y2="63" stroke="#ffffff" strokeWidth="0.75" opacity="0.7" />
                              <line x1="92" y1="58.5" x2="92" y2="63" stroke="#ffffff" strokeWidth="0.75" opacity="0.7" />
                              <line x1="70" y1="58" x2="70" y2="34" stroke="#d97706" strokeWidth="1.5" strokeDasharray="2 2" />
                              <polygon points="70,30 67.5,35 72.5,35" fill="#d97706" />
                            </g>

                            <path d={arcPathD} fill="none" stroke="#d97706" strokeWidth="2" />
                            <circle cx="20" cy="70" r="3.5" fill="#d97706" stroke="#ffffff" strokeWidth="1" />

                            {/* Sun Vector */}
                            <g transform="translate(108, 16)">
                              <circle cx="0" cy="0" r="10" fill="#f59e0b" opacity="0.15" />
                              <circle cx="0" cy="0" r="7" fill="#f59e0b" opacity="0.3" />
                              <circle cx="0" cy="0" r="4.5" fill="#f59e0b" />
                              <line x1="-7" y1="7" x2="-26" y2="28" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
                              <polygon points="-29,32 -22,27 -25,24" fill="#f59e0b" />
                              <line x1="-3" y1="9" x2="-14" y2="24" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />
                            </g>
                          </svg>
                        </div>

                        {/* Real-time HUD Stats */}
                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                            Faktor Sudut Datang Sinar
                          </span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-title text-sm font-extrabold text-slate-900">
                              Cos {pitch}° = {calc.pitchCosine}
                            </span>
                          </div>
                          <div
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              pitch >= 15 && pitch <= 25
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : pitch < 15
                                ? "text-amber-700 bg-amber-50 border-amber-200"
                                : "text-slate-700 bg-slate-100 border-slate-200"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>
                            <span>
                              {pitch >= 15 && pitch <= 25
                                ? `Tangkapan Surya Optimal (${calc.pitchEffPct}%)`
                                : pitch < 15
                                ? `Kemiringan Landai (${calc.pitchEffPct}%)`
                                : `Kemiringan Curam (${calc.pitchEffPct}%)`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Kemiringan optimal di Indonesia: <strong className="text-slate-700">15° – 22°</strong> untuk mencuci mandiri debu saat hujan. Efisiensi Tangkapan: <strong className="text-amber-700 font-code-metric">{calc.pitchEffPct}%</strong>
                      </p>
                    </div>
                  </div>

                  {/* Azimuth Dial Section (Interactive Navigational Compass 3D) */}
                  <div className="rounded-2xl bg-white/80 p-3.5 border border-amber-200/50 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0">explore</span>
                        <span className="font-title text-xs font-bold text-slate-900 truncate">Orientasi &amp; Azimuth Kompas 3D</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-code-metric text-xs font-bold shrink-0">
                        {azimuth}° {azInfo.name}
                      </span>
                    </div>

                    {/* Compass Interactive Dial Container */}
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                      {/* 3D Bezel & Dynamic Compass Instrument */}
                      <div className="relative w-22 h-22 sm:w-24 sm:h-24 shrink-0 rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-1 border-2 border-slate-700 shadow-md flex items-center justify-center select-none overflow-hidden">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="46" fill="none" stroke="#334155" strokeWidth="1.5" />
                          <circle cx="50" cy="50" r="39" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                          <g stroke="#64748b" strokeWidth="1.2" opacity="0.85">
                            <line x1="50" y1="8" x2="50" y2="12" />
                            <line x1="50" y1="88" x2="50" y2="92" />
                            <line x1="8" y1="50" x2="12" y2="50" />
                            <line x1="88" y1="50" x2="92" y2="50" />
                            <line x1="71" y1="13.6" x2="69" y2="17.1" />
                            <line x1="29" y1="86.4" x2="31" y2="82.9" />
                            <line x1="86.4" y1="29" x2="82.9" y2="31" />
                            <line x1="13.6" y1="71" x2="17.1" y2="69" />
                            <line x1="86.4" y1="71" x2="82.9" y2="69" />
                            <line x1="13.6" y1="29" x2="17.1" y2="31" />
                            <line x1="71" y1="86.4" x2="69" y2="82.9" />
                            <line x1="29" y1="13.6" x2="31" y2="17.1" />
                          </g>
                          <text x="50" y="20" fill="#f43f5e" fontSize="8.5" fontWeight="900" fontFamily="monospace" textAnchor="middle" dominantBaseline="central">N</text>
                          <text x="50" y="80" fill="#f59e0b" fontSize="8.5" fontWeight="900" fontFamily="monospace" textAnchor="middle" dominantBaseline="central">S</text>
                          <text x="80" y="50" fill="#94a3b8" fontSize="7.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle" dominantBaseline="central">E</text>
                          <text x="20" y="50" fill="#94a3b8" fontSize="7.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle" dominantBaseline="central">W</text>
                        </svg>

                        {/* Dynamic Rotating Needle */}
                        <div
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          style={{
                            transform: `rotate(${azimuth}deg)`,
                            transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                          }}
                        >
                          <svg className="w-18 h-18 sm:w-20 sm:h-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" viewBox="0 0 80 80">
                            <polygon points="40,11 36.5,40 40,37" fill="#f43f5e" />
                            <polygon points="40,11 43.5,40 40,37" fill="#be123c" />
                            <polygon points="40,69 36.5,40 40,43" fill="#fbbf24" />
                            <polygon points="40,69 43.5,40 40,43" fill="#d97706" />
                            <circle cx="40" cy="40" r="4.5" fill="#f8fafc" stroke="#64748b" strokeWidth="1.2" />
                            <circle cx="40" cy="40" r="2" fill="#0f172a" />
                          </svg>
                        </div>
                        <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none"></div>
                      </div>

                      {/* Compass Readout Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xl font-extrabold text-slate-900 font-headline-sm leading-none">{azimuth}°</span>
                          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md leading-none border ${azInfo.isOptimal ? "text-amber-800 bg-amber-100 border-amber-300" : "text-slate-700 bg-slate-100 border-slate-200"}`}>
                            {azInfo.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                          {azInfo.desc}
                        </p>
                        <div className="pt-0.5 flex items-center gap-1.5 text-emerald-700 text-[10px] font-semibold">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          <span>{calc.azimuthEffPct}% Efisiensi Azimuth</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Azimuth Slider & Quick Controls */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-amber-600">navigation</span>
                          Atur Sudut Kompas (0° – 360°)
                        </span>
                        <span className="font-code-metric font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                          {azimuth}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={azimuth}
                        onChange={(e) => setAzimuth(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />

                      {/* Quick Preset Buttons & Nudge */}
                      <div className="flex items-center gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => nudgeAzimuth(-10)}
                          className="py-1 px-1.5 rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-center transition flex items-center justify-center shrink-0 cursor-pointer"
                          title="Putar -10°"
                        >
                          <span className="material-symbols-outlined text-[13px]">rotate_left</span>
                        </button>

                        <div className="grid grid-cols-5 gap-1 flex-1 font-code-metric text-[9.5px]">
                          {[
                            { label: "0° U", val: 0 },
                            { label: "90° T", val: 90 },
                            { label: "180° S", val: 180 },
                            { label: "188° ⭐", val: 188 },
                            { label: "270° B", val: 270 },
                          ].map((p) => (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => setAzimuth(p.val)}
                              className={`py-1 px-0.5 rounded border text-center transition cursor-pointer font-bold ${
                                azimuth === p.val
                                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.15),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                                  : "bg-white/80 hover:bg-white text-slate-700 border-slate-200/80"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => nudgeAzimuth(10)}
                          className="py-1 px-1.5 rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-center transition flex items-center justify-center shrink-0 cursor-pointer"
                          title="Putar +10°"
                        >
                          <span className="material-symbols-outlined text-[13px]">rotate_right</span>
                        </button>
                      </div>

                      {/* Grid Integration to Compass Azimuth Toggle */}
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-amber-600">sync</span>
                            Integrasikan Grid ke Azimuth
                          </span>
                          <span className="text-[9.5px] text-slate-500 leading-tight">
                            {alignToAzimuth
                              ? "Grid susunan & sudut tiap panel otomatis berputar searah jarum kompas"
                              : "Grid sejajar rusuk atap (flush mounted tanpa rotasi azimuth)"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAlignToAzimuth(!alignToAzimuth)}
                          className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                            alignToAzimuth
                              ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300 shadow-2xs"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Klik untuk menyalakan/mematikan penyesuaian rotasi grid otomatis mengikuti kompas"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {alignToAzimuth ? "check_circle" : "cancel"}
                          </span>
                          <span>{alignToAzimuth ? "Aktif" : "Mati"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Batas Keamanan & Jalur Talang */}
                  <div className="rounded-2xl bg-white/80 p-3.5 border border-amber-200/50 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sky-600 text-[18px]">crop_free</span>
                        <span className="font-title text-xs font-bold text-slate-900">Batas Keamanan &amp; Jalur Talang</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-[10px] font-bold">
                        Zonasi Aman PLN
                      </span>
                    </div>

                    {/* Perimeter Setback */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">Batas Keamanan Tepi (Setback Keliling)</span>
                        <span className="font-code-metric font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                          {setback.toFixed(2)} m
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="0.8"
                        step="0.05"
                        value={setback}
                        onChange={(e) => setSetback(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                      />
                      <div className="relative w-full flex justify-between font-code-metric text-[9.5px] text-slate-400 pt-0.5">
                        <button type="button" onClick={() => setSetback(0.2)} className="hover:text-sky-600 transition cursor-pointer">
                          Min (0.2m)
                        </button>
                        <button type="button" onClick={() => setSetback(0.5)} className="hover:text-sky-600 transition font-semibold text-slate-700 cursor-pointer">
                          Standar PLN (0.5m)
                        </button>
                        <button type="button" onClick={() => setSetback(0.8)} className="hover:text-sky-600 transition cursor-pointer">
                          Aman (0.8m)
                        </button>
                      </div>
                    </div>

                    {/* Gutter Margin */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">Jalur Talang Air &amp; Akses Pemeliharaan (Bawah)</span>
                        <span className="font-code-metric font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                          {gutter.toFixed(2)} m
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="0.9"
                        step="0.05"
                        value={gutter}
                        onChange={(e) => setGutter(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                      <div className="relative w-full flex justify-between font-code-metric text-[9.5px] text-slate-400 pt-0.5">
                        <button type="button" onClick={() => setGutter(0.3)} className="hover:text-amber-600 transition cursor-pointer">
                          Ringkas (0.3m)
                        </button>
                        <button type="button" onClick={() => setGutter(0.6)} className="hover:text-amber-600 transition font-semibold text-slate-700 cursor-pointer">
                          Standar Talang (0.6m)
                        </button>
                        <button type="button" onClick={() => setGutter(0.9)} className="hover:text-amber-600 transition cursor-pointer">
                          Walkway (0.9m)
                        </button>
                      </div>
                    </div>

                    {/* Area Breakdown Info */}
                    <div className="p-2 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-600 flex justify-between items-center">
                      <span>Area Bebas Penghalang Bersih:</span>
                      <span className="font-bold text-slate-900 font-code-metric">
                        {calc.netArea.toFixed(2)} m² ({calc.netAreaPct}%)
                      </span>
                    </div>
                  </div>

                  {/* Primary Action Button: Modern Soft Golden Glass Gradient */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={autoPackModules}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:brightness-105 active:scale-[0.98] text-amber-950 font-title text-sm font-bold shadow-[0_3px_14px_rgba(245,158,11,0.22),inset_0_1px_1px_rgba(255,255,255,0.75)] border border-amber-200/90 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-amber-900">auto_awesome</span>
                      <span>Susun Tata Letak Panel Otomatis</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "pvarray" && (
                <div id="studio-pane-pvarray" className="p-4 space-y-4">
                  {/* Module Selection Card */}
                  <div className="rounded-2xl bg-white/80 p-3.5 border border-amber-200/50 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-title text-xs font-bold text-slate-900">Pilihan Modul Surya</span>
                      <span className="material-symbols-outlined text-amber-600 text-[18px]">solar_power</span>
                    </div>
                    <div className="relative">
                      <select
                        value={modulePower}
                        onChange={(e) => setModulePower(Number(e.target.value))}
                        className="w-full pl-3 pr-8 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer transition-all"
                      >
                        <option value="550">Tier-1 550W Mono PERC (Bifacial) — 2.27m x 1.13m</option>
                        <option value="450">Tier-1 450W Compact All-Black — 1.76m x 1.04m</option>
                        <option value="580">Bifacial 580W Dual-Glass — 2.38m x 1.13m</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                    </div>
                    {/* Spec Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-code-metric text-[10px] font-bold">
                        {calc.currentSpec.eff} Efisiensi
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-code-metric text-[10px] font-medium">
                        {calc.currentSpec.l}m × {calc.currentSpec.w}m
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-code-metric text-[10px] font-semibold">
                        {calc.currentSpec.tech}
                      </span>
                    </div>
                  </div>

                  {/* Penyesuaian Jumlah Modul Surya */}
                  <div className="rounded-2xl bg-white/80 p-3.5 border border-amber-200/50 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-600 text-[18px]">tune</span>
                        <span className="font-title text-xs font-bold text-slate-900">Penyesuaian Jumlah Panel Surya</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-code-metric text-[10px] font-bold">
                        {calc.modulesFitted} Terpasang
                      </span>
                    </div>

                    {/* Stepper & Direct Range Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => adjustModuleCount(-1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">remove</span>
                        </button>
                        <div className="text-center">
                          <span className="font-title text-base font-extrabold text-slate-900 block">
                            {calc.modulesFitted} Modul
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-code-metric">
                            dari maks {calc.totalValidSlots} slot
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => adjustModuleCount(1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                        </button>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max={Math.max(1, calc.totalValidSlots)}
                        value={calc.modulesFitted}
                        onChange={(e) => setCustomModuleCount(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                      <div className="grid grid-cols-3 gap-1.5 font-code-metric text-[9.5px]">
                        <button
                          type="button"
                          onClick={() => setCountPreset("max")}
                          className="py-1 px-1 rounded bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 text-center font-semibold transition-all cursor-pointer"
                        >
                          Maksimal (Full)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCountPreset("opt")}
                          className="py-1 px-1 rounded bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 text-center font-semibold transition-all cursor-pointer"
                        >
                          Rekomendasi
                        </button>
                        <button
                          type="button"
                          onClick={() => setCountPreset("min")}
                          className="py-1 px-1 rounded bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 text-center font-semibold transition-all cursor-pointer"
                        >
                          Ekonomis
                        </button>
                      </div>

                      {/* Eco Integration in Tab 2 */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/80 border border-emerald-200/70 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[17px] text-emerald-600">park</span>
                          <div>
                            <span className="text-[9.5px] text-slate-500 font-medium block">Estimasi Serapan Lingkungan</span>
                            <span className="font-bold text-emerald-800 text-xs">
                              {calc.treesEquivalent.toLocaleString("id-ID")} Pohon (~{calc.co2ReductionTon.toFixed(1)} Ton CO2/thn)
                            </span>
                          </div>
                        </div>
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {calc.forestHa} Ha
                        </span>
                      </div>

                      {/* Guidance Box */}
                      <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[10px] text-amber-900 flex items-start gap-1.5 leading-snug">
                        <span className="material-symbols-outlined text-amber-600 text-[14px] shrink-0 mt-0.5">info</span>
                        <span><strong>Tips Seleksi Interaktif:</strong> Klik langsung modul di kanvas atap untuk mematikan/menyalakan panel individu.</span>
                      </div>
                    </div>
                  </div>

                  {/* Pengaturan Tata Letak Modul */}
                  <div className="rounded-2xl bg-white/80 p-3.5 border border-amber-200/50 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-title text-xs font-bold text-slate-900">Pengaturan Tata Letak Modul</span>
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">grid_view</span>
                    </div>

                    {/* Orientasi */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-slate-600 block">Orientasi Modul</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOrientation("portrait")}
                          className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            orientation === "portrait"
                              ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                              : "bg-white/80 text-slate-700 border-slate-200/80 hover:bg-slate-50"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">stay_current_portrait</span>
                          <span>Potret ({calc.portraitSlotsCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrientation("landscape")}
                          className={`py-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            orientation === "landscape"
                              ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                              : "bg-white/80 text-slate-700 border-slate-200/80 hover:bg-slate-50"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">stay_current_landscape</span>
                          <span>Lanskap ({calc.landscapeSlotsCount})</span>
                        </button>
                      </div>

                      {calc.portraitSlotsCount !== calc.landscapeSlotsCount && (
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[10.5px] text-amber-950">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-amber-600">auto_awesome</span>
                            <span>
                              {calc.bestOrientation === "portrait" ? "Potret" : "Lanskap"} muat lebih banyak (+{Math.abs(calc.portraitSlotsCount - calc.landscapeSlotsCount)} panel)
                            </span>
                          </span>
                          {orientation !== calc.bestOrientation && (
                            <button
                              type="button"
                              onClick={() => setOrientation(calc.bestOrientation)}
                              className="font-bold underline text-amber-700 hover:text-amber-950 cursor-pointer ml-1"
                            >
                              Terapkan
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Clearance Gap */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">Jarak Antar Modul (Clearance Gap)</span>
                        <span className="font-code-metric font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                          {panelGap} cm
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="10"
                        step="1"
                        value={panelGap}
                        onChange={(e) => setPanelGap(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                      <div className="flex justify-between font-code-metric text-[9.5px] text-slate-400">
                        <span>Rapat (2cm)</span>
                        <span>Standar Racking (3cm)</span>
                        <span>Aman Angin (10cm)</span>
                      </div>
                    </div>

                    {/* Racking Extra Tilt */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                      <div className="flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-medium text-slate-600 block">Sudut Ekstra Dudukan (Racking Tilt)</span>
                          <span className="text-[9.5px] text-slate-400">Self-cleaning debu saat hujan</span>
                        </div>
                        <span className="font-code-metric font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                          +{extraTilt}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={extraTilt}
                        onChange={(e) => setExtraTilt(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                      <div className="flex justify-between font-code-metric text-[9.5px] text-slate-400">
                        <span>Flush (0°)</span>
                        <span>Rekomendasi (+10°)</span>
                        <span>Tinggi (+20°)</span>
                      </div>
                    </div>
                  </div>

                  {/* Arsitektur Inverter */}
                  <div className="rounded-2xl bg-white/80 p-3.5 border border-amber-200/50 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-title text-xs font-bold text-slate-900">Arsitektur Inverter</span>
                      <span className="material-symbols-outlined text-amber-600 text-[18px]">electric_meter</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInverterType("string")}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          inverterType === "string"
                            ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.15),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs font-bold block">Central String</span>
                        <span className={`text-[9.5px] block mt-0.5 ${inverterType === "string" ? "text-amber-900 font-semibold" : "text-slate-500"}`}>
                          Solis / Sungrow 3-Phase
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInverterType("micro")}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          inverterType === "micro"
                            ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.15),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs font-bold block">Microinverter</span>
                        <span className={`text-[9.5px] block mt-0.5 ${inverterType === "micro" ? "text-amber-900 font-semibold" : "text-slate-500"}`}>
                          Enphase IQ8+ Per Panel
                        </span>
                      </button>
                    </div>
                    <div className="flex gap-1.5 pt-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-code-metric text-[10px] font-semibold">
                        Rasio DC/AC: {calc.dcAcRatio}x
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-code-metric text-[10px] font-bold">
                        Efisiensi CEC: {calc.inverterEffPct}
                      </span>
                    </div>
                  </div>

                  {/* Bento Summary Card */}
                  <div className="rounded-xl bg-gradient-to-br from-sky-50/40 via-white to-white text-slate-900 p-3.5 space-y-2.5 shadow-2xs border border-slate-200/90">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                        <span className="material-symbols-outlined text-sky-600 text-[16px]">developer_board</span>
                        Ringkasan Konfigurasi Array PV
                      </span>
                      <span className="font-code-metric text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Optimal
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Total Modul Terpilih</span>
                        <span className="font-bold text-slate-900 text-sm font-code-metric">{calc.totalModulesFitted} Unit</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Formasi Grid</span>
                        <span className="font-bold text-slate-900 text-sm">{calc.cols} × {calc.rows} Modul</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Kapasitas Puncak</span>
                        <span className="font-bold text-sky-700 text-sm font-code-metric">{calc.actualKwp.toFixed(2)} kWp</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Luas Total Array</span>
                        <span className="font-bold text-slate-900 text-sm font-code-metric">{(calc.totalModulesFitted * calc.currentSpec.w * calc.currentSpec.l).toFixed(1)} m²</span>
                      </div>
                    </div>
                    <div className="pt-1 border-t border-slate-100 flex justify-between items-center text-[10px]">
                      <span className="text-slate-500">Kerapatan Panel terhadap Atap:</span>
                      <span className="font-bold text-emerald-700 font-code-metric">{calc.densityPct}% Terpakai</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 space-y-2">
                    <button
                      type="button"
                      onClick={autoPackModules}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:brightness-105 active:scale-[0.98] text-amber-950 font-title text-xs font-bold shadow-[0_3px_14px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.75)] border border-amber-200/90 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px] text-amber-900">auto_awesome</span>
                      <span>Tata Otomatis Modul</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => showToast("Konfigurasi modul berhasil diterapkan")}
                      className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-title text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px] text-amber-600">check_circle</span>
                      <span>Terapkan Konfigurasi</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "financials" && (
                <div id="studio-pane-financials" className="p-4 space-y-4">
                  {/* Card 1: Parameter Tarif & Tagihan PLN */}
                  <div className="rounded-2xl bg-white/90 backdrop-blur-md p-4 border border-amber-200/60 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                          <span className="material-symbols-outlined text-[17px]">bolt</span>
                        </span>
                        <div>
                          <span className="font-title text-xs font-bold text-slate-900 block">Parameter Tarif &amp; Tagihan PLN</span>
                          <span className="text-[10px] text-slate-400">Sesuaikan golongan tarif &amp; rekening listrik Anda</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-code-metric">
                        {plnTariff ? `Rp ${Number(plnTariff).toLocaleString("id-ID")}/kWh` : ""}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 block">Golongan Tarif Listrik</label>
                      <select
                        value={plnTariff}
                        onChange={(e) => setPlnTariff(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200/50 transition"
                      >
                        <option value="1700">R-2 / TR (3.500 – 5.500 VA Rumah Tangga) — Rp 1.700/kWh</option>
                        <option value="1444.7">R-1 / TR (1.300 – 2.200 VA Rumah Tangga) — Rp 1.444,70/kWh</option>
                        <option value="1699.53">R-3 / TR (&gt; 6.600 VA Rumah Tangga Besar) — Rp 1.699,53/kWh</option>
                        <option value="1444.7">B-2 / TR (6.600 VA – 200 kVA Bisnis Menengah) — Rp 1.444,70/kWh</option>
                        <option value="1114.74">B-3 / TM (&gt; 200 kVA Bisnis / Mall / Hotel) — Rp 1.114,74/kWh</option>
                        <option value="1114.74">I-3 / TM (&gt; 200 kVA Industri / Pabrik / Gudang) — Rp 1.114,74/kWh</option>
                        <option value="996.74">I-4 / TT (&gt; 30.000 kVA Industri Skala Besar) — Rp 996,74/kWh</option>
                      </select>
                    </div>

                    {/* Dual Input: Manual Numeric Field + Interactive Slider up to 100M */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700">Tagihan Listrik per Bulan</label>
                        <span className="text-[9.5px] text-slate-400 font-medium">Batas s/d Rp 100 Juta</span>
                      </div>

                      {/* Manual Currency Input */}
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-amber-700 select-none">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={isTypingBill ? manualBillInput : monthlyBill.toLocaleString("id-ID")}
                          onFocus={() => {
                            setIsTypingBill(true);
                            setManualBillInput(monthlyBill.toString());
                          }}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            setManualBillInput(raw);
                            const num = Number(raw);
                            if (!isNaN(num) && num > 0) {
                              setMonthlyBill(Math.min(100_000_000, num));
                            }
                          }}
                          onBlur={() => {
                            setIsTypingBill(false);
                            const num = Number(manualBillInput.replace(/\D/g, ""));
                            if (!isNaN(num) && num >= 100_000) {
                              setMonthlyBill(Math.min(100_000_000, Math.max(100_000, num)));
                            } else if (!num) {
                              setMonthlyBill(500_000);
                            }
                          }}
                          className="w-full pl-9 pr-14 py-2 rounded-xl bg-white border border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/50 text-right font-code-metric text-sm font-extrabold text-slate-900 tracking-wide transition shadow-2xs"
                          placeholder="2.800.000"
                        />
                        <span className="absolute right-3 text-[10px] text-slate-400 font-semibold select-none">/ bulan</span>
                      </div>

                      {/* Interactive Range Slider */}
                      <div className="pt-1">
                        <input
                          type="range"
                          min="500000"
                          max="100000000"
                          step="250000"
                          value={monthlyBill}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setMonthlyBill(val);
                            setManualBillInput(val.toString());
                          }}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-code-metric pt-0.5">
                          <span>Rp 500 Rb</span>
                          <span>Rp 25 Jt</span>
                          <span>Rp 50 Jt</span>
                          <span>Rp 100 Jt</span>
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { label: "2 Jt", val: 2_000_000 },
                          { label: "5 Jt", val: 5_000_000 },
                          { label: "15 Jt", val: 15_000_000 },
                          { label: "35 Jt", val: 35_000_000 },
                          { label: "50 Jt", val: 50_000_000 },
                          { label: "100 Jt (Industri)", val: 100_000_000 },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => {
                              setMonthlyBill(preset.val);
                              setManualBillInput(preset.val.toString());
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold border transition cursor-pointer ${
                              monthlyBill === preset.val
                                ? "bg-amber-100 text-amber-900 border-amber-300 shadow-2xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Summary Footnote */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100 font-code-metric">
                        <span>Konsumsi: ~{Math.round(monthlyBill / plnTariff).toLocaleString("id-ID")} kWh / bln</span>
                        <span>Pengeluaran PLN: <strong>{formatRp(monthlyBill * 12)}</strong> / thn</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Komparasi Tagihan & Penghematan Listrik */}
                  <div className="rounded-2xl bg-white/90 backdrop-blur-md p-4 border border-amber-200/60 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-title text-xs font-bold text-slate-900 block">
                          Komparasi Tagihan &amp; Penghematan
                        </span>
                        <span className="text-[10px] text-slate-400">Sebelum vs Pasca Pemasangan PLTS Atap</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-code-metric ${
                        calc.coveragePct > 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {calc.coveragePct > 0 ? `Hemat ${calc.coveragePct}%` : "0% PLTS"}
                      </span>
                    </div>

                    {/* Side-by-Side Comparison */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-500">Sebelum PLTS</span>
                          <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">PLN Penuh</span>
                        </div>
                        <div className="font-title text-sm font-extrabold text-slate-900 font-code-metric">
                          {formatRp(monthlyBill)}
                        </div>
                        <div className="text-[9.5px] text-slate-400 font-code-metric">
                          ~{Math.round(monthlyBill / plnTariff).toLocaleString("id-ID")} kWh / bln
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-emerald-900">Tagihan Baru PLN</span>
                          <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900">
                            Hemat {calc.coveragePct}%
                          </span>
                        </div>
                        <div className="font-title text-sm font-extrabold text-emerald-700 font-code-metric">
                          {formatRp(calc.newMonthlyBill)}
                        </div>
                        <div className="text-[9.5px] text-emerald-800 font-code-metric">
                          Turun {formatRp(calc.cappedSaving)} / bln
                        </div>
                      </div>
                    </div>

                    {/* Stacked Comparative Progress Bar */}
                    <div className="space-y-1 pt-0.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-600 font-medium">
                        <span>Porsi Penghematan Mandiri:</span>
                        <span className="font-bold text-emerald-700 font-code-metric">
                          {formatRp(calc.cappedSaving)} / bln ({calc.coveragePct}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                        {calc.coveragePct > 0 && (
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 flex items-center justify-center text-[8.5px] font-bold text-white tracking-tight"
                            style={{ width: `${calc.coveragePct}%` }}
                            title={`Produksi Surya: ${Math.round(calc.monthlyGenKwh)} kWh (${formatRp(calc.cappedSaving)})`}
                          >
                            {calc.coveragePct >= 20 ? `${calc.coveragePct}% PLTS` : ""}
                          </div>
                        )}
                        <div
                          className="h-full bg-slate-200/90 transition-all duration-500 flex items-center justify-center text-[8.5px] font-bold text-slate-600 tracking-tight"
                          style={{ width: `${100 - calc.coveragePct}%` }}
                          title={`Sisa Tagihan PLN: ${formatRp(calc.newMonthlyBill)}`}
                        >
                          {100 - calc.coveragePct >= 25 ? `Sisa PLN (${100 - calc.coveragePct}%)` : ""}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-code-metric pt-0.5">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Produksi: ~{Math.round(calc.monthlyGenKwh)} kWh</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Sisa Tagihan: {formatRp(calc.newMonthlyBill)}</span>
                        </span>
                      </div>
                    </div>

                    {/* 3-Column Cumulative Summary */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Hemat / Bulan</span>
                        <span className="font-title text-xs font-extrabold text-emerald-700 block mt-0.5 font-code-metric">
                          {formatRp(calc.cappedSaving)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Hemat 1 Tahun</span>
                        <span className="font-title text-xs font-extrabold text-emerald-700 block mt-0.5 font-code-metric">
                          {formatRp(calc.annualSaving)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                        <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider block">Hemat 25 Tahun</span>
                        <span className="font-title text-xs font-extrabold text-emerald-800 block mt-0.5 font-code-metric">
                          {formatRp(calc.cumulative25)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Proyeksi Arus Kas & Titik Impas (BEP) */}
                  <div className="rounded-2xl bg-white/90 backdrop-blur-md p-4 border border-amber-200/60 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-emerald-600 text-[18px]">trending_up</span>
                          Proyeksi Arus Kas &amp; BEP
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Analisis Finansial 25 Tahun &amp; Titik Impas</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/90 px-2.5 py-1 rounded-full text-emerald-800 text-[10px] font-bold shadow-2xs whitespace-nowrap shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>
                          {calc.bepYear > 0 && calc.bepYear <= 25
                            ? `BEP: Thn ${calc.bepYear.toFixed(1)}`
                            : calc.totalCapex === 0
                            ? "Tanpa Modal"
                            : "BEP &gt; 25 Thn"}
                        </span>
                      </div>
                    </div>

                    {/* Interactive 2x2 Real-time Inspector Stat Strip */}
                    <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
                      <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Tahun Proyeksi</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                            currentInspectCashFlow >= 0
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : currentInspectYear === calc.bepYear
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                            {currentInspectCashFlow >= 0 ? "Profit" : currentInspectYear === calc.bepYear ? "BEP" : "Investasi"}
                          </span>
                        </div>
                        <span className="font-title text-xs font-extrabold text-slate-900 block mt-1">
                          Tahun {currentInspectYear.toFixed(1)} {currentInspectYear === calc.bepYear ? "(BEP)" : ""}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                        <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider block">Arus Kas Bersih</span>
                        <span className={`font-title text-xs font-extrabold block mt-1 font-code-metric ${
                          currentInspectCashFlow >= 0 ? "text-emerald-600" : "text-amber-600"
                        }`}>
                          {formatRp(currentInspectCashFlow)}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                        <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider block">Total Hemat Listrik</span>
                        <span className="font-code-metric text-xs font-extrabold text-slate-800 block mt-1">
                          {formatRp(currentInspectYear * calc.annualSaving)}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                        <span className="text-[8.5px] text-emerald-600 font-bold uppercase tracking-wider block">Serapan Lingkungan</span>
                        <span className="font-title text-xs font-extrabold text-emerald-700 block mt-1">
                          {Math.round(currentInspectYear * (calc.treesEquivalent / 25) * 25).toLocaleString("id-ID")} Pohon
                        </span>
                      </div>
                    </div>

                    {/* Interactive SVG Chart */}
                    <div
                      className="relative w-full h-44 bg-gradient-to-b from-slate-50/60 via-white to-slate-50/60 rounded-xl border border-slate-200/90 p-2 overflow-hidden select-none cursor-crosshair shadow-2xs"
                      onMouseMove={handleChartMouseMove}
                      onMouseLeave={() => setRoiHoverYear(null)}
                    >
                      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartW} ${chartH}`}>
                        <defs>
                          <linearGradient id="roiProfitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                          </linearGradient>
                          <linearGradient id="roiDeficitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.05" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                          </linearGradient>
                          <linearGradient id="roiCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset={`${Math.max(0, (bepRatio - 0.04) * 100).toFixed(1)}%`} stopColor="#f59e0b" />
                            <stop offset={`${(bepRatio * 100).toFixed(1)}%`} stopColor="#10b981" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        <line x1="28" y1="20" x2="320" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" />
                        <line x1="28" y1="46" x2="320" y2="46" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" />
                        <line x1="28" y1="72" x2="320" y2="72" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" />

                        <line x1="86.4" y1="14" x2="86.4" y2="108" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" />
                        <line x1="144.8" y1="14" x2="144.8" y2="108" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" />
                        <line x1="203.2" y1="14" x2="203.2" y2="108" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" />
                        <line x1="261.6" y1="14" x2="261.6" y2="108" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" />

                        {/* Zero baseline */}
                        <line x1="28" y1={zeroY} x2="320" y2={zeroY} stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="3 3" />
                        <rect x="290" y={zeroY - 7} width="30" height="12" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.8" />
                        <text x="305" y={zeroY + 2} textAnchor="middle" fontSize="7" fill="#64748b" fontFamily="Inter" fontWeight="700">Rp 0</text>

                        {deficitFillD && <path d={deficitFillD} fill="url(#roiDeficitGrad)" />}
                        {profitFillD && <path d={profitFillD} fill="url(#roiProfitGrad)" />}
                        <path d={curvePathD} fill="none" stroke="url(#roiCurveGrad)" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Year 12 Inverter Replacement */}
                        <g transform={`translate(${mapChartX(12)}, 0)`}>
                          <line x1="0" y1="18" x2="0" y2="106" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />
                          <rect x="-12" y="22" width="24" height="11" rx="2" fill="#fffbeb" stroke="#f59e0b" strokeWidth="0.8" />
                          <text x="0" y="30" textAnchor="middle" fontSize="6.5" fill="#b45309" fontFamily="Inter" fontWeight="700">Thn 12</text>
                        </g>

                        {/* BEP Marker */}
                        {calc.bepYear > 0 && calc.bepYear <= 25 && calc.annualSaving > 0 && (
                          <g transform={`translate(${mapChartX(effectiveBep)}, ${zeroY})`}>
                            <circle cx="0" cy="0" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                            <rect x="-24" y="-19" width="48" height="13" rx="4" fill="#fffbeb" stroke="#f59e0b" strokeWidth="0.8" />
                            <text x="0" y="-10" textAnchor="middle" fontSize="7" fill="#b45309" fontFamily="Inter" fontWeight="800">
                              ⭐ BEP {calc.bepYear.toFixed(1)} Thn
                            </text>
                          </g>
                        )}

                        {/* Interactive crosshair */}
                        <line
                          x1={mapChartX(currentInspectYear)}
                          y1="12"
                          x2={mapChartX(currentInspectYear)}
                          y2="108"
                          stroke="#0284c7"
                          strokeWidth="1.2"
                          strokeDasharray="2 2"
                        />
                        <circle
                          cx={mapChartX(currentInspectYear)}
                          cy={mapChartY(currentInspectCashFlow)}
                          r="4.5"
                          fill="#0284c7"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />

                        <text x="28" y="119" fontSize="7.5" fill="#94a3b8" fontFamily="Inter" fontWeight="600">Thn 0</text>
                        <text x="144.8" y="119" fontSize="7.5" fill="#94a3b8" fontFamily="Inter" fontWeight="600" textAnchor="middle">Thn 10</text>
                        <text x="320" y="119" fontSize="7.5" fill="#94a3b8" fontFamily="Inter" fontWeight="600" textAnchor="end">Thn 25</text>
                      </svg>
                    </div>

                    {/* Quick Jump Buttons */}
                    <div className="grid grid-cols-5 gap-1 pt-0.5">
                      {[
                        { label: "Thn 5", sub: "Titik Balik", yr: 5 },
                        { label: "Thn 10", sub: "Laba 100%", yr: 10 },
                        { label: "Thn 15", sub: "Pasca Inv", yr: 15 },
                        { label: "Thn 20", sub: "Ekspansi", yr: 20 },
                        { label: "Thn 25", sub: "Puncak", yr: 25 },
                      ].map((btn) => (
                        <button
                          key={btn.yr}
                          type="button"
                          onClick={() => setRoiHoverYear(btn.yr)}
                          className={`p-1 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                            currentInspectYear === btn.yr
                              ? "bg-amber-100/80 border-amber-300 text-amber-900 shadow-2xs"
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span className="text-[9.5px] font-bold">{btn.label}</span>
                          <span className="text-[8px] text-slate-400">{btn.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card 4: Rincian Modal CAPEX Proyek (Collapsible) */}
                  <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200/60 overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCapexCollapsed((c) => !c)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-title text-xs font-bold text-slate-900 block">Rincian Modal CAPEX Proyek</span>
                        <span className="font-code-metric text-[11px] text-slate-500 font-semibold">Total: {formatRp(calc.totalCapex)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-code-metric">
                          {calc.totalModulesFitted} Modul ({calc.actualKwp.toFixed(2)} kWp)
                        </span>
                        <span
                          className={`material-symbols-outlined text-slate-400 transition-transform duration-200 text-[20px] ${
                            capexCollapsed ? "" : "rotate-180"
                          }`}
                        >
                          expand_more
                        </span>
                      </div>
                    </button>

                    {!capexCollapsed && (
                      <div className="px-3.5 pb-3.5 space-y-2 border-t border-slate-100 animate-fadeIn">
                        <div className="pt-2 divide-y divide-slate-100 text-xs">
                          <div className="py-1.5 flex justify-between items-center">
                            <span className="text-slate-600">Modul Surya ({calc.totalModulesFitted}x Modul {modulePower}W)</span>
                            <span className="font-code-metric font-semibold text-slate-900">{formatRp(calc.costModules)}</span>
                          </div>
                          <div className="py-1.5 flex justify-between items-center">
                            <span className="text-slate-600">Inverter &amp; Kelistrikan AC/DC ({inverterType === "string" ? "Central String" : "Microinverter"})</span>
                            <span className="font-code-metric font-semibold text-slate-900">{formatRp(calc.costInverter)}</span>
                          </div>
                          <div className="py-1.5 flex justify-between items-center">
                            <span className="text-slate-600">Sistem Racking Aluminium</span>
                            <span className="font-code-metric font-semibold text-slate-900">{formatRp(calc.costRacking)}</span>
                          </div>
                          <div className="py-1.5 flex justify-between items-center">
                            <span className="text-slate-600">Instalasi, Net-Metering &amp; Sertifikat SLO</span>
                            <span className="font-code-metric font-semibold text-slate-900">{formatRp(calc.costInstall)}</span>
                          </div>
                          <div className="pt-2.5 mt-1.5 flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-bold">
                            <div>
                              <span className="text-slate-950 block text-xs">Total Modal Investasi</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                Payback: {calc.paybackYears ? `${calc.paybackYears.toFixed(1)} Thn` : "—"} • IRR: {calc.irr}%
                              </span>
                            </div>
                            <span className="font-code-metric text-sm text-sky-700">{formatRp(calc.totalCapex)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-1 space-y-2">
                    <button
                      type="button"
                      onClick={handleSaveSimulation}
                      disabled={isSaving}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-amber-950 font-title text-xs font-bold shadow-xs border border-amber-300 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <span className={`material-symbols-outlined text-[17px] text-amber-950 ${isSaving ? "animate-spin" : ""}`}>
                        {isSaving ? "sync" : saveSuccess ? "check_circle" : "cloud_upload"}
                      </span>
                      <span>
                        {isSaving ? "Menyimpan ke Server..." : saveSuccess ? "Simulasi Berhasil Disimpan!" : "Simpan Simulasi ke Akun"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProposalOpen(true)}
                      className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-800 font-title text-xs font-bold shadow-2xs border border-slate-200 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px] text-amber-600">file_download</span>
                      <span>Unduh Proposal PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => showToast("Permintaan penawaran EPC terkirim ke mitra resmi!")}
                      className="w-full py-2.5 px-4 rounded-xl bg-white/80 hover:bg-white border border-amber-200/80 text-slate-800 font-title text-xs font-bold shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px] text-amber-600">verified</span>
                      <span>Ajukan Penawaran Mitra EPC</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* =======================================================
          RIWAYAT POLIGON DRAWER (From History Button in Capsule)
          ======================================================= */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fadeIn print:hidden">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[22px]">history</span>
                <h3 className="font-title font-bold text-slate-900 text-sm">Riwayat Poligon &amp; Desain Atap</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 flex-1 overflow-y-auto">
              {PRESET_ADDRESSES.map((item, idx) => (
                <div
                  key={item.label}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 bg-slate-50 hover:bg-amber-50/40 transition cursor-pointer space-y-2"
                  onClick={() => {
                    setAddressInput(item.label);
                    setRidge(item.ridge);
                    setSlope(item.slope);
                    setRoofShape(item.shape);
                    setPolygonRotation(item.deg);
                    setHistoryDrawerOpen(false);
                    showToast(`Desain diterapkan: ${item.label}`);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{item.label}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9.5px] font-bold">
                      {item.shape}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 font-code-metric">
                    <div>
                      <span className="text-slate-400 block">Dimensi</span>
                      <span className="font-bold text-slate-800">{item.ridge}m × {item.slope}m</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Kapasitas</span>
                      <span className="font-bold text-slate-800">12.6 kWp</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Payback</span>
                      <span className="font-bold text-emerald-600">4.8 Thn</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:brightness-105 active:scale-[0.98] text-amber-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-[0_2px_10px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.75)] border border-amber-200/90 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px] text-amber-900">draw</span>
                    <span>Terapkan ke Studio CAD</span>
                  </button>
                </div>
              ))}
            </div>

            <Link
              href="/history"
              className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold text-center transition block"
            >
              Buka Halaman Riwayat Lengkap ➜
            </Link>
          </div>
        </div>
      )}

      {/* =======================================================
          PENGATURAN PROFIL MODAL
          ======================================================= */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn print:hidden">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[20px]">person</span>
                <h3 className="font-title font-bold text-slate-900 text-sm">Profil &amp; Pengaturan Akun</h3>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF9F5] border border-amber-200/50">
                <div className="w-12 h-12 rounded-full bg-amber-200 text-amber-950 font-bold text-sm flex items-center justify-center border border-amber-300">
                  {initials}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{biodata?.name || "Pengguna SunSight"}</h4>
                  <p className="text-slate-500">{biodata?.email || "user@sunsight.id"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Nama Lengkap</label>
                <input
                  type="text"
                  value={biodata?.name || "Pengguna SunSight"}
                  onChange={(e) => setBiodata((b) => (b ? { ...b, name: e.target.value } : null))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:bg-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Email Akun</label>
                <input
                  type="email"
                  disabled
                  value={biodata?.email || "user@sunsight.id"}
                  className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-200 font-medium text-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Alamat Properti Rujukan</label>
                <input
                  type="text"
                  value={biodata?.location || addressInput}
                  onChange={(e) => setBiodata((b) => (b ? { ...b, location: e.target.value } : null))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:bg-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (biodata) saveStoredBiodata(biodata);
                    setProfileModalOpen(false);
                    showToast("Profil berhasil diperbarui!");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:brightness-105 active:scale-[0.98] text-amber-950 font-title text-xs font-bold transition cursor-pointer shadow-[0_2px_10px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.75)] border border-amber-200/90"
                >
                  Simpan Perubahan
                </button>
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.logout();
                  } catch {}
                  setToken(null);
                  setProfileModalOpen(false);
                  router.replace("/login");
                }}
                className="w-full py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Keluar dari Akun (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proposal PDF Modal */}
      <ProposalModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        result={simulationResultForModal}
        assumptions={simulationAssumptionsForModal}
        parameters={simulationParamsForModal}
        latitude={activeFacet.lat ? activeFacet.lat.toFixed(6) : "-6.595500"}
        longitude={activeFacet.lng ? activeFacet.lng.toFixed(6) : "106.799500"}
        biodata={biodata}
        cumulative25={calc.cumulative25}
        irr={calc.irr}
        newMonthlyBill={calc.newMonthlyBill}
        coveragePct={calc.coveragePct}
        totalFacetsCount={facets.length}
        modulePower={modulePower}
        activeFacetName={activeFacet.name}
        monthlyGenKwh={calc.monthlyGenKwh}
      />
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#f8fafc]" />}>
      <StudioPageContent />
    </Suspense>
  );
}
