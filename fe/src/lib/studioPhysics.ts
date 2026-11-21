import type {
  CapturedImage,
  DetectedRoof,
  PixelPoint,
  SimulationDetail,
} from "./api";

export type CvLayer = "satellite" | "cv" | "heatmap";
export type RoofShape = "rectangle" | "l-shape" | "trapezoid" | "custom_polygon";
export type CadTool =
  | "select"
  | "edit_polygon"
  | "pen"
  | "delete_vertex"
  | "add_polygon"
  | "add_obstacle"
  | "measure";
export type Orientation = "portrait" | "landscape";
export type InverterType = "string" | "micro";
export type SlotState = "active" | "skylight" | "hvac" | "empty";

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

export type DragMode = "move" | "rot" | "br" | "r" | "b" | "tl" | "tr" | "bl";

export interface DragGroupTarget {
  id: string;
  initOx: number;
  initOy: number;
  initLat: number;
  initLng: number;
}

export interface DragState {
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
  groupTargets?: DragGroupTarget[];
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

export interface VertexDragState {
  facetId: string;
  vertexIdx: number;
  startX: number;
  startY: number;
  initVertices: Point2D[];
  initOx: number;
  initOy: number;
  initLat?: number;
  initLng?: number;
  rotation: number;
}

export interface EdgeHoverState {
  facetId: string;
  edgeIdx: number;
  point?: Point2D;
  localPoint?: Point2D;
}

export interface EdgeDragState {
  facetId: string;
  edgeIdx: number;
  startX: number;
  startY: number;
  initVertices: Point2D[];
  initOx: number;
  initOy: number;
  initLat?: number;
  initLng?: number;
  rotation: number;
}

export interface StudioSavedProject {
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

export interface ModuleRecommendation {
  facetId: string;
  modulePower: number;
  orientation: Orientation;
  panelGap: number;
  pitch: number;
  azimuth: number;
  alignToAzimuth: boolean;
  modulesFitted: number;
  actualKwp: number;
  annualProductionKwh: number;
  currentAnnualKwh: number;
  gainKwh: number;
  gainPct: number;
  isAlreadyOptimal: boolean;
}

export const MODULE_SPECS: Record<
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

export const MODULE_KEYS_BY_POWER: Record<number, string> = {
  450: "compact_450",
  550: "mono_perc_550",
  580: "bifacial_580",
};

export function moduleKeyForPower(power: number): string {
  return MODULE_KEYS_BY_POWER[power] ?? MODULE_KEYS_BY_POWER[550];
}

export const MODULE_POWERS_BY_KEY: Record<string, number> = Object.fromEntries(
  Object.entries(MODULE_KEYS_BY_POWER).map(([power, key]) => [key, Number(power)])
);

export const TARIFF_KEYS_BY_RATE: Record<number, string> = {
  1700: "R2",
  1699.53: "R2",
  1444.7: "R1",
  1444.71: "B2",
  1114.74: "B2",
  996.74: "B2",
};

export function tariffKeyForRate(rate: number): string {
  return TARIFF_KEYS_BY_RATE[rate] ?? "R2";
}

export const TARIFF_RATES_BY_KEY: Record<string, number> = {
  R1: 1444.7,
  R2: 1700,
  B2: 1444.71,
};

export const STUDIO_SAVED_PROJECTS: StudioSavedProject[] = [
  {
    id: "proj-baranangsiang",
    name: "Baranangsiang Indah",
    address: "Komp. Baranangsiang Indah Blok C, Bogor Timur",
    lat: -6.611,
    lon: 106.815,
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
    lat: -6.578,
    lon: 106.808,
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
    lon: 106.762,
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
    lat: -6.623,
    lon: 106.828,
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
    lon: 106.776,
    capacityKwp: 8.3,
    ridge: 12.48,
    slope: 7.28,
    shape: "rectangle",
    deg: -4,
  },
];

export const PRESET_ADDRESSES = STUDIO_SAVED_PROJECTS.map((p) => ({
  label: `${p.name}, ${p.address}`,
  lat: p.lat,
  lon: p.lon,
  ridge: p.ridge,
  slope: p.slope,
  shape: p.shape,
  deg: p.deg,
}));

export const GEOCODE_TARGET_ZOOM = 19;
export const DEFAULT_ROOF_TILT_DEG = 10;
export const DEFAULT_ROOF_AZIMUTH_DEG = 0;

export const FALLBACK_FACET: RoofFacet = {
  id: "facet-fallback",
  name: "Bidang Atap",
  shape: "rectangle",
  ridge: 12.48,
  slope: 7.28,
  pitch: DEFAULT_ROOF_TILT_DEG,
  azimuth: DEFAULT_ROOF_AZIMUTH_DEG,
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

export function designSignatureOf(input: {
  facets: RoofFacet[];
  addressInput: string;
  monthlyBill: number;
  plnTariff: number;
  inverterType: InverterType;
  sunHour: number;
  extraTilt: number;
  shadingLossPct?: number;
}): string {
  return JSON.stringify({
    facets: input.facets.map((facet) => ({
      id: facet.id,
      vertices: getFacetVertices(facet),
      shape: facet.shape,
      ridge: facet.ridge,
      slope: facet.slope,
      pitch: facet.pitch,
      azimuth: facet.azimuth,
      setback: facet.setback,
      gutter: facet.gutter,
      rotation: facet.rotation,
      lat: facet.lat,
      lng: facet.lng,
      modulePower: facet.modulePower,
      orientation: facet.orientation,
      panelGap: facet.panelGap,
      customModuleCount: facet.customModuleCount,
      isSolarPopulated: facet.isSolarPopulated,
      slotOverrides: facet.slotOverrides,
    })),
    addressInput: input.addressInput,
    monthlyBill: input.monthlyBill,
    plnTariff: input.plnTariff,
    inverterType: input.inverterType,
    sunHour: input.sunHour,
    extraTilt: input.extraTilt,
    shadingLossPct: input.shadingLossPct ?? 0,
  });
}

// ---------------------------------------------------------------------------
// Polygon geometry helpers (all coordinates in meters, facet-local frame)
// ---------------------------------------------------------------------------

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

export function signedArea(poly: Point2D[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    a += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return a / 2;
}

export function insetPolygon(poly: Point2D[], d: number): Point2D[] {
  const n = poly.length;
  if (n < 3 || d <= 0) return poly;
  const originalSign = signedArea(poly);
  const origArea = Math.abs(originalSign);
  if (origArea < 1e-4) return poly;

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
    const dist = Math.hypot(x - v.x, y - v.y);
    const maxMiter = d * 2.8;
    if (dist > maxMiter) {
      x = v.x + ((x - v.x) / dist) * maxMiter;
      y = v.y + ((y - v.y) / dist) * maxMiter;
    }
    out.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
  }

  const newSign = signedArea(out);
  const newArea = Math.abs(newSign);
  if (newSign * sign <= 0 || newArea < 0.1 * origArea || newArea > origArea) {
    return fallbackScale();
  }
  return out;
}

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
  const d = (a: Point2D, b: Point2D, c: Point2D) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

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

          let start = l + slack / 2;
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

export function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildFacetFromDetectedRoof(
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
    isSolarPopulated: true,
  };
}

export function buildFacetFromSavedRoof(
  roof: SimulationDetail["roofs"][number],
  imagery: NonNullable<SimulationDetail["imagery"]>,
  index: number
): RoofFacet {
  const metersPerPixel = imagery.meters_per_pixel ?? 0.3;
  const [minLng, , , maxLat] = imagery.bbox;
  const centerX = imagery.width / 2;
  const centerY = imagery.height / 2;

  const captured: Point2D[] = roof.roof_polygon_px.map(([x, y]) => ({
    x: (x - centerX) * metersPerPixel,
    y: (y - centerY) * metersPerPixel,
  }));
  const capturedBounds = polygonBounds(captured);
  const localCenterX = capturedBounds.minX + capturedBounds.width / 2;
  const localCenterY = capturedBounds.minY + capturedBounds.height / 2;
  const anchorX = centerX + localCenterX / metersPerPixel;
  const anchorY = centerY + localCenterY / metersPerPixel;

  const rotation = roof.facet_rotation_deg ?? 0;
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const vertices: Point2D[] = captured.map((point) => {
    const dx = point.x - localCenterX;
    const dy = point.y - localCenterY;

    return {
      x: Math.round((dx * cos + dy * sin) * 1000) / 1000,
      y: Math.round((-dx * sin + dy * cos) * 1000) / 1000,
    };
  });

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
    rotation,
    lat: maxLat - (anchorY / imagery.height) * (imagery.bbox[3] - imagery.bbox[1]),
    lng: minLng + (anchorX / imagery.width) * (imagery.bbox[2] - imagery.bbox[0]),
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

export function facetPointToPx(point: Point2D, facet: RoofFacet, image: CapturedImage): PixelPoint {
  const [minLng, minLat, maxLng, maxLat] = image.bbox;
  const anchorX = ((facet.lng - minLng) / (maxLng - minLng)) * image.width;
  const anchorY = ((maxLat - facet.lat) / (maxLat - minLat)) * image.height;
  const radians = (facet.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const metersPerPixel = image.meters_per_pixel;

  return [
    Math.round((anchorX + (point.x * cos - point.y * sin) / metersPerPixel) * 1000) / 1000,
    Math.round((anchorY + (point.x * sin + point.y * cos) / metersPerPixel) * 1000) / 1000,
  ];
}

export function facetPolygonPx(facet: RoofFacet, image: CapturedImage): PixelPoint[] {
  return getFacetVertices(facet).map((vertex) => facetPointToPx(vertex, facet, image));
}

export function slotPolygonPx(slot: PanelSlotItem, facet: RoofFacet, image: CapturedImage): PixelPoint[] {
  const radians = ((slot.rotationDeg ?? 0) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const halfWidth = slot.w / 2;
  const halfLength = slot.l / 2;

  return [
    [-halfWidth, -halfLength],
    [halfWidth, -halfLength],
    [halfWidth, halfLength],
    [-halfWidth, halfLength],
  ].map(([dx, dy]) =>
    facetPointToPx(
      {
        x: slot.x + dx * cos - dy * sin,
        y: slot.y + dx * sin + dy * cos,
      },
      facet,
      image
    )
  );
}

export function polygonInsideImage(points: PixelPoint[], image: CapturedImage): boolean {
  const tolerance = 1;

  return points.every(
    ([x, y]) =>
      x >= -tolerance &&
      y >= -tolerance &&
      x <= image.width + tolerance &&
      y <= image.height + tolerance
  );
}

// ---------------------------------------------------------------------------
// Solar physics & facet optimization (synchronized 1:1 with Laravel EnergyModel)
// ---------------------------------------------------------------------------

export function computeFacetMetrics(
  facet: RoofFacet,
  sunHour: number,
  obstacleFilterActive: boolean,
  extraTilt: number,
  inverterType: InverterType,
  shadingLossPct: number = 0
) {
  // Klimatologi NASA POWER & Global Solar Atlas Kota Bogor (6,6° LS, 2001–2024)
  const peakSunHours = sunHour === 9 ? 3.82 : sunHour === 15 ? 3.95 : 4.42;

  // 1. Pitch & Incident Angle Physics (optimal ~10° untuk Kota Bogor 6,6° LS)
  const pitchRad = (facet.pitch * Math.PI) / 180;
  const pitchCosine = Math.cos(pitchRad).toFixed(2);
  const pitchFactor = Math.cos(((facet.pitch - 10) * Math.PI) / 180);
  const pitchEff = Math.max(0.85, Math.min(1.0, 0.92 + pitchFactor * 0.08));
  const pitchEffPct = Math.round(pitchEff * 100);

  // 2. Azimuth Compass Physics (optimal Utara 0° di belahan bumi selatan 6,6° LS)
  const rawAzDiff = Math.abs(((facet.azimuth % 360) + 360) % 360);
  const azDev = Math.min(rawAzDiff, 360 - rawAzDiff);
  const azimuthEff = Math.max(0.82, Math.min(1.0, 1.0 - (azDev / 180) * 0.15));
  const azimuthEffPct = (azimuthEff * 100).toFixed(1);

  // 3. Racking Extra Tilt (Self-cleaning rain runoff bonus)
  const rackingBonus = 1.0 + (extraTilt / 20) * 0.02;

  // 4. Roof Geometry & Usable Area
  const vertices = getFacetVertices(facet);
  const setback = Math.max(0, facet.setback ?? 0.3);
  const gutter = facet.shape === "rectangle" ? Math.max(0, facet.gutter ?? 0.3) : 0;
  const bounds = polygonBounds(vertices);
  const usableRidge = Math.max(0, bounds.width - 2 * setback);
  const usableSlope = Math.max(0, bounds.height - setback * 2 - gutter);
  const grossArea = computePolygonArea(vertices);
  const insetPoly = insetPolygon(vertices, setback);
  const rawInsetArea = computePolygonArea(insetPoly);
  const fallbackNetArea =
    grossArea * Math.max(0.45, 1 - (setback * 2) / Math.max(bounds.width, bounds.height, 1));
  const netArea =
    facet.shape !== "rectangle"
      ? Math.max(0.1, rawInsetArea > 0.05 * grossArea ? rawInsetArea : fallbackNetArea)
      : Math.max(0.1, Math.min(grossArea, usableRidge * usableSlope));
  const netAreaPct = grossArea > 0 ? Math.min(100, Math.round((netArea / grossArea) * 100)) : 0;

  // 5. Module Layout Packing
  const currentSpec = MODULE_SPECS[facet.modulePower] || MODULE_SPECS[550];
  const gapM = facet.panelGap / 100;

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
  const bestOrientation: Orientation =
    landscapeSlotsCount > portraitSlotsCount ? "landscape" : "portrait";

  const packed = facet.orientation === "landscape" ? packedLandscape : packedPortrait;
  const rawSlots: PanelSlotItem[] = packed.slots;
  const cols = packed.cols;
  const rows = packed.rows;
  const obstacleRow = Math.min(rows - 1, 1);
  const obstacleCol = Math.max(1, Math.floor((cols - 2) / 2));

  const totalValidSlots = rawSlots.length;
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
      candidateIndices.push(idx);
    }
  });

  const forcedActiveCount = slotStates.filter((s) => s === "active").length;
  const totalAvailable = forcedActiveCount + candidateIndices.length;

  const targetTotal =
    facet.customModuleCount !== null
      ? Math.max(0, Math.min(totalAvailable, facet.customModuleCount))
      : totalAvailable;

  const remainingToActivate = Math.max(0, targetTotal - forcedActiveCount);

  candidateIndices.forEach((slotIdx, i) => {
    slotStates[slotIdx] = i < remainingToActivate ? "active" : "empty";
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
  const dcAcRatio =
    actualKwp > 0 ? (actualKwp / Math.max(1, Math.ceil(actualKwp / 5) * 4.5)).toFixed(2) : "1.22";
  const inverterEffPct = inverterType === "string" ? "98.4%" : "97.5%";

  // 7. Energy Production (IEC 61724-1 PR termasuk rugi bayangan samping)
  const shadingFactor = Math.max(0.5, Math.min(1.0, 1.0 - shadingLossPct / 100));
  const combinedFactor = pitchEff * azimuthEff * rackingBonus * inverterEff * shadingFactor;
  const annualProductionKwh = actualKwp * peakSunHours * 365 * 0.82 * combinedFactor;
  const monthlyGenKwh = annualProductionKwh / 12;

  // 8. Cost Breakdown
  const costModules = modulesFitted * currentSpec.price;
  const costInverter =
    inverterType === "string" ? actualKwp * 1_200_000 : modulesFitted * 1_100_000;
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

export function optimizeFacetConfiguration(
  activeFacet: RoofFacet,
  sunHour: number,
  obstacleFilterActive: boolean,
  extraTilt: number,
  inverterType: InverterType,
  shadingLossPct: number = 0
): ModuleRecommendation {
  const currentMetrics = computeFacetMetrics(
    activeFacet,
    sunHour,
    obstacleFilterActive,
    extraTilt,
    inverterType,
    shadingLossPct
  );

  const modulePowers = [450, 550, 580];
  const orientations: Orientation[] = ["portrait", "landscape"];
  const gaps = [3, 2];
  const alignModes = [false, true];
  const azimuths = Array.from(new Set([0, activeFacet.azimuth]));
  const optimalPitch = DEFAULT_ROOF_TILT_DEG;

  let best = {
    modulePower: activeFacet.modulePower,
    orientation: activeFacet.orientation,
    panelGap: activeFacet.panelGap,
    pitch: activeFacet.pitch,
    azimuth: activeFacet.azimuth,
    alignToAzimuth: activeFacet.alignToAzimuth ?? true,
    modulesFitted: currentMetrics.modulesFitted,
    actualKwp: currentMetrics.actualKwp,
    annualProductionKwh: currentMetrics.annualProductionKwh,
  };

  for (const mp of modulePowers) {
    for (const ori of orientations) {
      for (const gap of gaps) {
        for (const align of alignModes) {
          const azList = align ? azimuths : [0];
          for (const az of azList) {
            const candidateFacet: RoofFacet = {
              ...activeFacet,
              modulePower: mp,
              orientation: ori,
              panelGap: gap,
              pitch: optimalPitch,
              azimuth: az,
              alignToAzimuth: align,
              customModuleCount: null,
              slotOverrides: {},
              isSolarPopulated: true,
            };
            const m = computeFacetMetrics(
              candidateFacet,
              sunHour,
              obstacleFilterActive,
              extraTilt,
              inverterType,
              shadingLossPct
            );
            if (m.annualProductionKwh > best.annualProductionKwh + 1) {
              best = {
                modulePower: mp,
                orientation: ori,
                panelGap: gap,
                pitch: optimalPitch,
                azimuth: az,
                alignToAzimuth: align,
                modulesFitted: m.modulesFitted,
                actualKwp: m.actualKwp,
                annualProductionKwh: m.annualProductionKwh,
              };
            }
          }
        }
      }
    }
  }

  const gainKwh = Math.max(0, best.annualProductionKwh - currentMetrics.annualProductionKwh);
  const gainPct =
    currentMetrics.annualProductionKwh > 0
      ? (gainKwh / currentMetrics.annualProductionKwh) * 100
      : best.annualProductionKwh > 0
        ? 100
        : 0;
  const isAlreadyOptimal = gainKwh < 10 || gainPct < 0.5;

  return {
    facetId: activeFacet.id,
    ...best,
    currentAnnualKwh: currentMetrics.annualProductionKwh,
    gainKwh,
    gainPct,
    isAlreadyOptimal,
  };
}
