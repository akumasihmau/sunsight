/**
 * Shared 2D roof geometry & solar module packing helpers used identically by
 * Studio CAD and the Dashboard roof visualization (`Bidang Atap Utama`).
 */

import type { SimulationDetail, SimulationRoofDetail } from "./api";

export type LayoutPoint2D = {
  x: number;
  y: number;
};

export type LayoutOrientation = "portrait" | "landscape";
export type LayoutSlotState = "active" | "skylight" | "hvac" | "empty";

export interface LayoutPanelSlot {
  r: number;
  c: number;
  key: string;
  x: number;
  y: number;
  w: number;
  l: number;
  rotationDeg?: number;
  state?: LayoutSlotState;
}

export interface ModuleSpecInfo {
  name: string;
  w: number;
  l: number;
  eff: string;
  tech: string;
  price: number;
  desc: string;
}

export const MODULE_SPECS_BY_POWER: Record<number, ModuleSpecInfo> = {
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

export function computePolygonArea(vertices: LayoutPoint2D[]): number {
  if (!vertices || vertices.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

export function pointInPolygon(pt: LayoutPoint2D, poly: LayoutPoint2D[]): boolean {
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

export function polygonBounds(poly: LayoutPoint2D[]) {
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

export function polygonPerimeter(poly: LayoutPoint2D[]): number {
  let p = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    p += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return p;
}

export function signedArea(poly: LayoutPoint2D[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    a += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return a / 2;
}

export function insetPolygon(poly: LayoutPoint2D[], d: number): LayoutPoint2D[] {
  const n = poly.length;
  if (n < 3 || d <= 0) return poly;
  const originalSign = signedArea(poly);
  const origArea = Math.abs(originalSign);
  if (origArea < 1e-4) return poly;

  const cx = poly.reduce((s, p) => s + p.x, 0) / n;
  const cy = poly.reduce((s, p) => s + p.y, 0) / n;
  const avgDist = poly.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / n;

  const fallbackScale = (): LayoutPoint2D[] => {
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

  const out: LayoutPoint2D[] = [];
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

function scanlineIntervals(poly: LayoutPoint2D[], y: number): [number, number][] {
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

function bandIntervals(poly: LayoutPoint2D[], yTop: number, yBot: number): [number, number][] {
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

function segmentsIntersect(
  p1: LayoutPoint2D,
  p2: LayoutPoint2D,
  p3: LayoutPoint2D,
  p4: LayoutPoint2D
): boolean {
  const d = (a: LayoutPoint2D, b: LayoutPoint2D, c: LayoutPoint2D) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function rectInsidePolygon(
  poly: LayoutPoint2D[],
  x0: number,
  y0: number,
  x1: number,
  y1: number
): boolean {
  const corners: LayoutPoint2D[] = [
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

export interface PackOptions {
  panelW: number;
  panelL: number;
  gap: number;
  margin: number;
  marginBottom: number;
}

const PACK_CACHE = new Map<string, { slots: LayoutPanelSlot[]; rows: number; cols: number }>();

export function packPanelsInPolygon(poly: LayoutPoint2D[], opts: PackOptions) {
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

  let best: LayoutPanelSlot[] = [];
  let bestRows = 0;
  let bestCols = 0;

  for (const phase of phases) {
    for (const alignMode of ["grid", "center"] as const) {
      const slots: LayoutPanelSlot[] = [];
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

export function rotatePoint(p: LayoutPoint2D, rad: number): LayoutPoint2D {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  };
}

export function rotatePolygon(poly: LayoutPoint2D[], rad: number): LayoutPoint2D[] {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return poly.map((p) => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }));
}

/**
 * Reconstructs exact Studio metric geometry (world-rotated polygon, setback outline,
 * and every solar/obstacle/empty slot in world meters) from a saved simulation roof.
 */
export function buildDashboardRoofLayout(
  roof: SimulationRoofDetail,
  imagery: SimulationDetail["imagery"]
): {
  worldPolygon: LayoutPoint2D[];
  insetPolygon: LayoutPoint2D[];
  slots: LayoutPanelSlot[];
  rows: number;
  cols: number;
  isSolarPopulated: boolean;
} {
  const metersPerPixel = imagery?.meters_per_pixel ?? 0.3;
  const cxPx = imagery ? imagery.width / 2 : 0;
  const cyPx = imagery ? imagery.height / 2 : 0;

  const rawWorld: LayoutPoint2D[] =
    roof.roof_polygon_px && roof.roof_polygon_px.length >= 3
      ? roof.roof_polygon_px.map(([x, y]) => ({
          x: (x - cxPx) * metersPerPixel,
          y: (y - cyPx) * metersPerPixel,
        }))
      : [
          { x: -roof.result.roof_length_m / 2, y: -roof.result.roof_width_m / 2 },
          { x: roof.result.roof_length_m / 2, y: -roof.result.roof_width_m / 2 },
          { x: roof.result.roof_length_m / 2, y: roof.result.roof_width_m / 2 },
          { x: -roof.result.roof_length_m / 2, y: roof.result.roof_width_m / 2 },
        ];

  const wb = polygonBounds(rawWorld);
  const localCenterX = wb.minX + wb.width / 2;
  const localCenterY = wb.minY + wb.height / 2;

  // Centered polygon in screen/world orientation
  const worldPolygon = rawWorld.map((p) => ({
    x: p.x - localCenterX,
    y: p.y - localCenterY,
  }));

  // Recover the unrotated facet-local frame matching Studio (`buildFacetFromSavedRoof`)
  const facetRotationDeg = roof.facet_rotation_deg ?? 0;
  const facetRad = (facetRotationDeg * Math.PI) / 180;
  const localVertices =
    Math.abs(facetRotationDeg) >= 0.01 ? rotatePolygon(worldPolygon, -facetRad) : worldPolygon;

  const setback = Math.max(0, roof.input.setback_m ?? 0.3);
  const gutter = (roof.shape ?? "custom_polygon") === "rectangle" ? Math.max(0, roof.input.gutter_m ?? 0.3) : 0;
  const modulePower = MODULE_POWERS_BY_KEY[roof.input.module_key] ?? 550;
  const spec = MODULE_SPECS_BY_POWER[modulePower] ?? MODULE_SPECS_BY_POWER[550];
  const gapM = Math.max(0, roof.input.clearance_m ?? 0.03);

  const alignToAzimuth = roof.align_to_azimuth ?? true;
  const rawPanelAngle = alignToAzimuth ? roof.input.azimuth_deg - 180 - facetRotationDeg : 0;
  let panelAngleDeg = ((rawPanelAngle + 180) % 360) - 180;
  if (panelAngleDeg < -180) panelAngleDeg += 360;
  const isAngleActive = Math.abs(panelAngleDeg) >= 0.5;
  const panelRad = (panelAngleDeg * Math.PI) / 180;

  const targetPoly = isAngleActive ? rotatePolygon(localVertices, -panelRad) : localVertices;
  const packOpts: PackOptions =
    roof.input.orientation === "landscape"
      ? { panelW: spec.l, panelL: spec.w, gap: gapM, margin: setback, marginBottom: setback + gutter }
      : { panelW: spec.w, panelL: spec.l, gap: gapM, margin: setback, marginBottom: setback + gutter };

  const rawPacked = packPanelsInPolygon(targetPoly, packOpts);
  const rotatedSlots = isAngleActive
    ? rawPacked.slots.map((slot) => {
        const unrot = rotatePoint({ x: slot.x, y: slot.y }, panelRad);
        return {
          ...slot,
          x: unrot.x,
          y: unrot.y,
          rotationDeg: Math.round(panelAngleDeg * 10) / 10,
        };
      })
    : rawPacked.slots;

  // Apply slotOverrides, hasHvac, hasSkylight, saved obstacle geometry, and custom panel_count
  const slotOverrides = roof.slot_overrides ?? {};
  const obstacleRow = Math.min(rawPacked.rows - 1, 1);
  const obstacleCol = Math.max(1, Math.floor((rawPacked.cols - 2) / 2));

  // Optional saved geometry obstacles (fallback when slot_overrides isn't present)
  const worldObstacles = (roof.obstacles ?? []).map((obs) => ({
    type: obs.type,
    poly: obs.polygon_px.map(([ox, oy]) => ({
      x: (ox - cxPx) * metersPerPixel - localCenterX,
      y: (oy - cyPx) * metersPerPixel - localCenterY,
    })),
  }));

  const candidateIndices: number[] = [];
  const slotStates: LayoutSlotState[] = new Array(rotatedSlots.length);

  rotatedSlots.forEach((slot, idx) => {
    const override = slotOverrides[slot.key];
    if (override) {
      slotStates[idx] = override;
      return;
    }

    const worldCenter =
      Math.abs(facetRotationDeg) >= 0.01 ? rotatePoint({ x: slot.x, y: slot.y }, facetRad) : { x: slot.x, y: slot.y };
    const hitObs = worldObstacles.find((obs) => pointInPolygon(worldCenter, obs.poly));
    if (hitObs) {
      slotStates[idx] = hitObs.type;
      return;
    }

    if (
      roof.has_hvac &&
      slot.r === obstacleRow &&
      (slot.c === obstacleCol || slot.c === obstacleCol + 1)
    ) {
      slotStates[idx] = "hvac";
    } else if (roof.has_skylight && slot.r === 0 && slot.c === Math.min(1, rawPacked.cols - 1)) {
      slotStates[idx] = "skylight";
    } else {
      candidateIndices.push(idx);
    }
  });

  const forcedActiveCount = slotStates.filter((s) => s === "active").length;
  const totalAvailable = forcedActiveCount + candidateIndices.length;
  const targetTotal =
    roof.input.panel_count !== null && roof.input.panel_count !== undefined
      ? Math.max(0, Math.min(totalAvailable, roof.input.panel_count))
      : totalAvailable;
  const remainingToActivate = Math.max(0, targetTotal - forcedActiveCount);

  candidateIndices.forEach((slotIdx, i) => {
    slotStates[slotIdx] = i < remainingToActivate ? "active" : "empty";
  });

  // Transform every slot from facet-local frame back into north-up world frame
  const worldSlots: LayoutPanelSlot[] = rotatedSlots.map((slot, idx) => {
    const worldPt =
      Math.abs(facetRotationDeg) >= 0.01 ? rotatePoint({ x: slot.x, y: slot.y }, facetRad) : { x: slot.x, y: slot.y };
    return {
      ...slot,
      x: worldPt.x,
      y: worldPt.y,
      rotationDeg: Math.round(((slot.rotationDeg ?? 0) + facetRotationDeg) * 10) / 10,
      state: slotStates[idx],
    };
  });

  const localInset = setback > 0 ? insetPolygon(localVertices, setback) : localVertices;
  const worldInset =
    Math.abs(facetRotationDeg) >= 0.01 ? rotatePolygon(localInset, facetRad) : localInset;

  return {
    worldPolygon,
    insetPolygon: worldInset,
    slots: worldSlots,
    rows: rawPacked.rows,
    cols: rawPacked.cols,
    isSolarPopulated: roof.is_solar_populated !== false,
  };
}
