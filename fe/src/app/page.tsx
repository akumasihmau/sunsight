"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { BogorProjectsMap } from "@/components/BogorProjectsMap";
import { LandingView } from "@/components/landing/LandingView";
import { ProposalModal } from "@/components/studio/ProposalModal";
import { MascotDashboardTour } from "@/components/dashboard/MascotDashboardTour";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";
import { api, type SimulationParameters, type SimulationResult } from "@/lib/api";
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

interface ProjectFacet {
  id: string;
  name: string;
  shapeLabel: string;
  dimensions: string;
  ridgeM: number;
  slopeM: number;
  capacityKwp: number;
  moduleCount: number;
  effectiveAreaPct: number;
  polygonPoints: [number, number][];
  obstacles: ProjectObstacle[];
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
  facets?: ProjectFacet[];
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
    facets: [
      {
        id: "menteng-f1",
        name: "Bidang Atap Utama",
        shapeLabel: "Pelana Sisi Selatan",
        dimensions: "12.48 m × 7.28 m",
        ridgeM: 12.48,
        slopeM: 7.28,
        capacityKwp: 8.3,
        moduleCount: 36,
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
        id: "menteng-f2",
        name: "Bidang Atap Sayap (Carport)",
        shapeLabel: "Pelana Depan",
        dimensions: "7.50 m × 4.80 m",
        ridgeM: 7.50,
        slopeM: 4.80,
        capacityKwp: 3.3,
        moduleCount: 12,
        effectiveAreaPct: 88,
        polygonPoints: [
          [14, 18],
          [86, 18],
          [86, 82],
          [14, 82],
        ],
        obstacles: [
          { name: "Pipa Vent", type: "vent", icon: "air", xPct: 64, yPct: 40, label: "Ventilasi Udara" },
        ],
      },
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
    facets: [
      {
        id: "baranangsiang-f1",
        name: "Bidang Atap Utama Barat",
        shapeLabel: "Persegi Panjang",
        dimensions: "11.20 m × 6.50 m",
        ridgeM: 11.20,
        slopeM: 6.50,
        capacityKwp: 7.5,
        moduleCount: 15,
        effectiveAreaPct: 80,
        polygonPoints: [
          [12, 16],
          [88, 16],
          [88, 84],
          [12, 84],
        ],
        obstacles: [
          { name: "Toren Air", type: "tank", icon: "water_drop", xPct: 70, yPct: 65, label: "Toren 1000L" },
        ],
      },
      {
        id: "baranangsiang-f2",
        name: "Bidang Sayap L-Extension",
        shapeLabel: "Sayap Timur (L)",
        dimensions: "7.60 m × 5.20 m",
        ridgeM: 7.60,
        slopeM: 5.20,
        capacityKwp: 5.0,
        moduleCount: 10,
        effectiveAreaPct: 78,
        polygonPoints: [
          [15, 20],
          [85, 20],
          [85, 80],
          [15, 80],
        ],
        obstacles: [
          { name: "Pipa Vent", type: "vent", icon: "air", xPct: 35, yPct: 45, label: "Pipa Pembuangan" },
        ],
      },
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
    facets: [
      {
        id: "yasmin-f1",
        name: "Bidang Atap Utama",
        shapeLabel: "Persegi Standar",
        dimensions: "10.50 m × 6.20 m",
        ridgeM: 10.50,
        slopeM: 6.20,
        capacityKwp: 6.8,
        moduleCount: 18,
        effectiveAreaPct: 88,
        polygonPoints: [
          [12, 18],
          [88, 18],
          [88, 82],
          [12, 82],
        ],
        obstacles: [
          { name: "Exhaust", type: "vent", icon: "mode_fan", xPct: 60, yPct: 45, label: "Exhaust Fan Dapur" },
        ],
      },
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
    facets: [
      {
        id: "bantarjati-f1",
        name: "Bidang Trapesium Depan",
        shapeLabel: "Limasan Depan",
        dimensions: "14.00 m × 5.20 m",
        ridgeM: 14.00,
        slopeM: 5.20,
        capacityKwp: 4.8,
        moduleCount: 12,
        effectiveAreaPct: 80,
        polygonPoints: [
          [22, 18],
          [78, 18],
          [92, 82],
          [8, 82],
        ],
        obstacles: [
          { name: "VRV Outdoor", type: "hvac", icon: "mode_fan", xPct: 60, yPct: 45, label: "VRV AC Multi-Split" },
        ],
      },
      {
        id: "bantarjati-f2",
        name: "Bidang Trapesium Belakang",
        shapeLabel: "Limasan Belakang",
        dimensions: "14.00 m × 5.20 m",
        ridgeM: 14.00,
        slopeM: 5.20,
        capacityKwp: 4.0,
        moduleCount: 10,
        effectiveAreaPct: 76,
        polygonPoints: [
          [8, 18],
          [92, 18],
          [78, 82],
          [22, 82],
        ],
        obstacles: [
          { name: "Petir", type: "vent", icon: "bolt", xPct: 35, yPct: 55, label: "Penyalur Petir" },
        ],
      },
      {
        id: "bantarjati-f3",
        name: "Bidang Segitiga Timur",
        shapeLabel: "Limasan Timur",
        dimensions: "7.50 m × 4.80 m",
        ridgeM: 7.50,
        slopeM: 4.80,
        capacityKwp: 1.2,
        moduleCount: 3,
        effectiveAreaPct: 68,
        polygonPoints: [
          [50, 16],
          [88, 84],
          [12, 84],
        ],
        obstacles: [],
      },
      {
        id: "bantarjati-f4",
        name: "Bidang Segitiga Barat",
        shapeLabel: "Limasan Barat",
        dimensions: "7.50 m × 4.80 m",
        ridgeM: 7.50,
        slopeM: 4.80,
        capacityKwp: 1.2,
        moduleCount: 3,
        effectiveAreaPct: 68,
        polygonPoints: [
          [50, 16],
          [88, 84],
          [12, 84],
        ],
        obstacles: [],
      },
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

function FacetRoofVisual({ facet }: { facet: ProjectFacet }) {
  const points = useMemo(() => {
    const raw =
      facet.polygonPoints && facet.polygonPoints.length >= 3
        ? facet.polygonPoints
        : [
            [10, 15],
            [90, 15],
            [90, 85],
            [10, 85],
          ];
    return raw.map(([u, v]) => [36 + (u / 100) * 288, 18 + (v / 100) * 140] as [number, number]);
  }, [facet.polygonPoints]);

  const {
    polygonStr,
    insetStr,
    minX,
    maxX,
    minY,
    maxY,
    sMinX,
    sMaxY,
    modules,
    bestDim,
    obstacles,
  } = useMemo(() => {
    const polygonStr = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const cx = points.reduce((acc, p) => acc + p[0], 0) / points.length;
    const cy = points.reduce((acc, p) => acc + p[1], 0) / points.length;

    // Setback boundary points (smooth inward scaling)
    const insetPoints = points.map(([x, y]) => [
      cx + (x - cx) * 0.90,
      cy + (y - cy) * 0.88,
    ] as [number, number]);
    const insetStr = insetPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const sXs = insetPoints.map((p) => p[0]);
    const sYs = insetPoints.map((p) => p[1]);
    const sMinX = Math.min(...sXs);
    const sMaxX = Math.max(...sXs);
    const sMinY = Math.min(...sYs);
    const sMaxY = Math.max(...sYs);

    const obstacles = (facet.obstacles || []).map((obs) => ({
      ...obs,
      ox: 36 + (obs.xPct / 100) * 288,
      oy: 18 + (obs.yPct / 100) * 140,
    }));

    // Symmetrical, perfectly structured module grid packing
    const targetCount = facet.moduleCount || 12;
    const sWidth = Math.max(30, sMaxX - sMinX);
    const sHeight = Math.max(20, sMaxY - sMinY);

    // Find optimal rows and cols so modules are arranged in pristine, neat arrays
    let bestCols = 1;
    let bestRows = 1;
    let bestScore = Infinity;

    for (let r = 1; r <= 4; r++) {
      for (let c = 1; c <= 16; c++) {
        if (r * c >= targetCount) {
          const testMw = (sWidth - (c - 1) * 2) / c;
          const testMh = (sHeight - (r - 1) * 2.2) / r;
          if (testMw > 5 && testMh > 8) {
            const ratio = testMh / testMw;
            // Target portrait aspect ratio ~1.8 - 2.0
            const score = Math.abs(ratio - 1.85) + (r * c - targetCount) * 0.15;
            if (score < bestScore) {
              bestScore = score;
              bestCols = c;
              bestRows = r;
            }
          }
        }
      }
    }

    const gapX = 2.0;
    const gapY = 2.2;
    const mw = Math.max(6, (sWidth - (bestCols - 1) * gapX) / bestCols);
    const mh = Math.max(8, (sHeight - (bestRows - 1) * gapY) / bestRows);

    const gridW = bestCols * mw + (bestCols - 1) * gapX;
    const gridH = bestRows * mh + (bestRows - 1) * gapY;
    const startX = sMinX + Math.max(0, (sWidth - gridW) / 2);
    const startY = sMinY + Math.max(0, (sHeight - gridH) / 2);

    const placed: { x: number; y: number }[] = [];
    for (let r = 0; r < bestRows; r++) {
      for (let c = 0; c < bestCols; c++) {
        const mx = startX + c * (mw + gapX);
        const my = startY + r * (mh + gapY);
        const mcx = mx + mw / 2;
        const mcy = my + mh / 2;

        // Verify inside polygon
        const inPoly =
          isPointInPoly(mcx, mcy, points) &&
          isPointInPoly(mx + 1, my + 1, points) &&
          isPointInPoly(mx + mw - 1, my + mh - 1, points);

        if (!inPoly) continue;

        // Verify obstacle buffer clearance
        const collides = obstacles.some(
          (o) => Math.abs(mcx - o.ox) < 18 && Math.abs(mcy - o.oy) < 16
        );
        if (collides) continue;

        placed.push({ x: mx, y: my });
        if (placed.length >= targetCount) break;
      }
      if (placed.length >= targetCount) break;
    }

    return {
      polygonStr,
      insetStr,
      minX,
      maxX,
      minY,
      maxY,
      sMinX,
      sMaxY,
      modules: placed,
      bestDim: { mw, mh },
      obstacles,
    };
  }, [points, facet.obstacles, facet.moduleCount]);

  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <svg
        className="w-full h-full max-h-[178px]"
        viewBox="0 0 360 175"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id={`cadDotGrid-${facet.id}`} width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="7" cy="7" r="0.75" fill="#e2e8f0" />
          </pattern>
          <filter id={`roofVectorShadow-${facet.id}`} x="-8%" y="-8%" width="116%" height="116%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.07" />
          </filter>
        </defs>

        {/* CAD Blueprint subtle dot grid */}
        <rect width="100%" height="100%" fill={`url(#cadDotGrid-${facet.id})`} opacity="0.65" />

        <g filter={`url(#roofVectorShadow-${facet.id})`}>
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
          {obstacles.map((obs) => {
            const isRed = obs.type === "hvac" || obs.type === "tank";

            return (
              <g key={obs.name} transform={`translate(${obs.ox}, ${obs.oy})`}>
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
            x={sMinX + 6}
            y={sMaxY - 4}
            fontSize="6"
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
            {facet.ridgeM} m
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
            {facet.slopeM} m
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

function RoofLayoutBentoCard({ proj }: { proj: SavedRoofProject }) {
  const [activeFacetIdx, setActiveFacetIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const facets = useMemo(() => {
    if (proj.facets && proj.facets.length > 0) {
      return proj.facets;
    }
    return [
      {
        id: `${proj.id}-f1`,
        name: "Bidang Atap Utama",
        shapeLabel: proj.shapeLabel,
        dimensions: proj.dimensions,
        ridgeM: proj.ridgeM,
        slopeM: proj.slopeM,
        capacityKwp: proj.capacityKwp,
        moduleCount: proj.moduleCount,
        effectiveAreaPct: proj.effectiveAreaPct,
        polygonPoints: proj.polygonPoints || [
          [10, 15],
          [90, 15],
          [90, 85],
          [10, 85],
        ],
        obstacles: proj.obstacles || [],
      },
    ];
  }, [proj]);

  const scrollToFacet = (idx: number) => {
    setActiveFacetIdx(idx);
    if (carouselRef.current) {
      const el = carouselRef.current.children[idx] as HTMLElement;
      if (el) {
        carouselRef.current.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
      }
    }
  };

  // Reset slide if project changes
  useEffect(() => {
    setActiveFacetIdx(0);
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, [proj.id]);

  const hasMultiple = facets.length > 1;

  // Autoplay carousel if multiple polygons/facets exist, pausing on hover/interaction
  useEffect(() => {
    if (!hasMultiple || isHovered) return;

    const timer = setInterval(() => {
      const nextIdx = (activeFacetIdx + 1) % facets.length;
      scrollToFacet(nextIdx);
    }, 4000);

    return () => clearInterval(timer);
  }, [hasMultiple, isHovered, activeFacetIdx, facets.length]);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    if (clientWidth > 0) {
      const idx = Math.round(scrollLeft / clientWidth);
      if (idx !== activeFacetIdx && idx >= 0 && idx < facets.length) {
        setActiveFacetIdx(idx);
      }
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIdx = activeFacetIdx > 0 ? activeFacetIdx - 1 : facets.length - 1;
    scrollToFacet(prevIdx);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = activeFacetIdx < facets.length - 1 ? activeFacetIdx + 1 : 0;
    scrollToFacet(nextIdx);
  };

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      className="xl:col-span-4 h-[260px] bg-white rounded-[22px] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-2xs group"
    >
      {/* Carousel Track */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="w-full flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
      >
        {facets.map((facet) => (
          <div
            key={facet.id}
            className="w-full h-full flex-shrink-0 snap-center flex flex-col justify-between"
          >
            {/* Slide Header */}
            <div className="relative z-10 flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-slate-900 leading-tight">
                  {facet.name}
                </p>
                <p className="text-[11.5px] text-slate-400 leading-tight mt-0.5">
                  {facet.dimensions} · {facet.capacityKwp} kWp
                </p>
              </div>
              <div className="text-right">
                <p className="text-[22px] sm:text-[26px] font-bold text-slate-900 tracking-tight leading-none whitespace-nowrap">
                  {facet.moduleCount}{" "}
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">panel</span>
                </p>
                <p className="text-[10.5px] font-medium text-slate-400 mt-0.5">
                  {facet.effectiveAreaPct}% area efektif
                </p>
              </div>
            </div>

            {/* CAD Blueprint SVG */}
            <div className="w-full flex-1 min-h-0 relative flex items-center justify-center pt-0.5">
              <FacetRoofVisual facet={facet} />
            </div>
          </div>
        ))}
      </div>

      {/* Carousel Arrow Controls (Visible when facets > 1 on hover) */}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Poligon sebelumnya"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md flex items-center justify-center text-slate-700 hover:text-slate-950 hover:bg-white hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Poligon berikutnya"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md flex items-center justify-center text-slate-700 hover:text-slate-950 hover:bg-white hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>

          {/* Dots Indicator (Clean, no container box) */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {facets.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToFacet(i)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeFacetIdx === i ? "w-3.5 bg-amber-500" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                }`}
                title={`Lihat ${facets[i].name}`}
                aria-label={`Lihat slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      const currentParam = url.searchParams.get("tab") || "overview";
      if (currentParam !== tab) {
        if (tab === "overview") {
          url.searchParams.delete("tab");
        } else {
          url.searchParams.set("tab", tab);
        }
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, []);

  const handleTourSwitchTab = useCallback(
    (target: "map" | "calc" | "history") => {
      const tab: DashboardNavTab =
        target === "map" ? "overview" : target === "calc" ? "calculator" : "history";
      setActiveTab(tab);
    },
    [setActiveTab]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [savedProjects, setSavedProjects] = useState<SavedRoofProject[]>(SAVED_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(SAVED_PROJECTS[0].id);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [activePillarModal, setActivePillarModal] = useState<"hemat" | "mandiri" | "bersih" | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  // Sync saved projects with localStorage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("sunsight.saved_projects");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedProjects(parsed);
          }
        }
      } catch {
        // Fallback to initial projects
      }
    }
  }, []);

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
      router.push("/studio?mode=gps");
      return;
    }
    setIsGpsLoading(true);
    showToast("Mengakses sensor GPS untuk Studio CAD...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        const { latitude, longitude } = pos.coords;
        showToast(`📍 Lokasi GPS terdeteksi! Membuka Studio...`);
        router.push(`/studio?mode=gps&lat=${latitude.toFixed(6)}&lng=${longitude.toFixed(6)}`);
      },
      (err) => {
        setIsGpsLoading(false);
        showToast(`Membuka Studio CAD dengan koordinat GPS default...`);
        router.push("/studio?mode=gps&lat=-6.595038&lng=106.797241");
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

  const initials = mounted && biodata?.name
    ? biodata.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : "PS";

  // Delete project from saved projects
  const handleDeleteProject = useCallback(
    (id: string, name: string) => {
      if (!window.confirm(`Hapus proyek "${name}" dari riwayat?`)) return;

      setSavedProjects((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("sunsight.saved_projects", JSON.stringify(updated));
          } catch {
            // Ignore error
          }
        }
        if (selectedProjectId === id) {
          if (updated.length > 0) {
            setSelectedProjectId(updated[0].id);
          }
        }
        return updated;
      });

      const numId = Number(id);
      if (!Number.isNaN(numId) && numId > 0) {
        // If it's a backend saved simulation, trigger API delete
        api.deleteSimulation(numId).catch(() => {});
      }

      showToast(`Proyek "${name}" berhasil dihapus dari riwayat.`);
    },
    [selectedProjectId, showToast]
  );

  // Active Project for Bento display
  const activeProj = useMemo(() => {
    return savedProjects.find((p) => p.id === selectedProjectId) || savedProjects[0] || SAVED_PROJECTS[0];
  }, [savedProjects, selectedProjectId]);

  // Filtered projects for history list (without category/shape filter)
  const filteredProjects = useMemo(() => {
    return savedProjects.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q)
      );
    });
  }, [savedProjects, searchQuery]);

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
              className="h-11 px-3.5 rounded-full bg-white flex items-center justify-center hover:bg-slate-50 transition shadow-xs"
              title="SunSight"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="SunSight" className="h-6 sm:h-7 w-auto object-contain" />
            </Link>

            {/* Search (popover with GPS & map inside) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
                  searchOpen ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
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
                          router.push("/studio");
                        }}
                        title="Buka & Pilih di Peta Studio CAD"
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

          <div className="flex items-center gap-2">
            {/* Tombol Panduan Sunny (?) */}
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              className="w-11 h-11 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-amber-800 flex items-center justify-center transition shadow-xs border border-slate-200/60 cursor-pointer group"
              title="Bantuan & Panduan Beranda bersama Sunny"
              aria-label="Panduan Beranda"
            >
              <span className="material-symbols-outlined text-[20px] text-slate-600 group-hover:text-amber-600 transition-colors">
                help
              </span>
            </button>

            <Link
              id="dashboard-studio-btn"
              href="/studio"
              className="h-11 px-4 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center gap-2 transition shadow-xs hover:text-amber-600 group"
              title="Buka Studio CAD"
            >
              <span className="material-symbols-outlined text-[19px] text-amber-500 group-hover:scale-110 transition-transform">
                polyline
              </span>
              <span>Studio</span>
            </Link>

            <Link
              id="dashboard-profile-btn"
              href="/profile"
              className="w-11 h-11 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center transition shadow-xs group border border-slate-200/60"
              title="Profil & akun"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 text-amber-950 text-xs font-bold flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                {mounted ? initials : "PS"}
              </span>
            </Link>
          </div>
        </header>

        {/* Mobile pill navigation */}
        <nav
          className="md:hidden flex items-center gap-2 overflow-x-auto pt-3 pb-1 -mx-3 px-3 [scrollbar-width:none]"
          aria-label="Navigasi utama"
        >
          {navPills}
          <Link href="/studio" className={navPillClass(false)}>
            <span className="material-symbols-outlined text-[18px]">polyline</span>
            Studio
          </Link>
        </nav>

        <main className="pt-3 sm:pt-4 space-y-6">
        {/* =====================================================
            TAB 1: BERANDA (Bento dashboard)
            ===================================================== */}
        {activeTab === "overview" && (
          <div id="dashboard-bento-hero" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 animate-fadeIn">
            {/* Card A — Proyek aktif */}
            <section className="xl:col-span-4 h-[260px] bg-white rounded-[22px] p-5 flex flex-col justify-between relative overflow-hidden">
              <CardHeader
                title="Proyek aktif"
                subtitle={activeProj.name}
                onAction={() => openProjectInStudio(activeProj)}
                actionLabel="Buka di Studio"
              />

              <h2 className="relative text-[24px] sm:text-[28px] font-semibold leading-[1.15] tracking-tight text-slate-900 max-w-[11ch] sm:max-w-[12ch] z-10">
                Ubah atap jadi sumber listrik.
              </h2>

              {/* Fanned Value Cards Stack (Hemat, Mandiri, Bersih - Radiant Soft Glow) */}
              <div
                className="absolute -right-1 sm:right-2 -bottom-2 w-[180px] sm:w-[195px] h-[160px] sm:h-[170px] pointer-events-auto select-none"
                aria-label="Kartu nilai proyek: Bersih, Mandiri, Hemat"
              >
                {/* 1. Bersih Card (Back layer - Radiant Soft Sage/Emerald Glow) */}
                <button
                  type="button"
                  onClick={() => setActivePillarModal("bersih")}
                  title="Lihat penjelasan: Kenapa Bersih?"
                  className="group absolute -bottom-1.5 right-12 sm:right-14 z-10 w-[104px] sm:w-[114px] h-[134px] sm:h-[144px] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between text-left bg-gradient-to-br from-emerald-100/95 via-teal-100/90 to-emerald-200/85 -rotate-[18deg] -translate-x-3 translate-y-0 hover:z-40 hover:-translate-y-7 hover:-rotate-4 hover:scale-105 hover:shadow-[0_16px_32px_rgba(16,185,129,0.32)] transition-all duration-300 ease-out border border-emerald-300/80 shadow-[0_8px_20px_rgba(16,185,129,0.18),inset_0_1px_1px_rgba(255,255,255,0.95)] cursor-pointer overflow-hidden outline-none"
                >
                  {/* Subtle soft radiant ambient glow */}
                  <div className="absolute -right-5 -bottom-5 w-16 h-16 rounded-full bg-emerald-300/30 pointer-events-none blur-xs" />
                  <div className="absolute -left-3 -top-3 w-10 h-10 rounded-full bg-white/50 pointer-events-none blur-[0.5px]" />

                  {/* Top: Category Tag + Icon */}
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[7.5px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-1.5 py-0.5 rounded-md">03 · Eko</span>
                    <span className="material-symbols-outlined text-[15px] text-emerald-700">eco</span>
                  </div>

                  {/* Title & Stat */}
                  <div className="relative z-10">
                    <h3 className="text-[15px] sm:text-[16px] font-extrabold tracking-tight leading-none text-emerald-950">Bersih</h3>
                    <p className="text-[9px] font-semibold text-emerald-800/90 leading-tight mt-1">11.5t CO₂</p>
                  </div>

                  {/* Bottom CTA Pill */}
                  <div className="relative z-10 pt-0.5">
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-950 bg-emerald-200/80 border border-emerald-300/60 px-1.5 py-0.5 rounded-full group-hover:bg-emerald-300 transition-colors shadow-2xs">
                      <span>Kenapa?</span>
                      <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                    </span>
                  </div>
                </button>

                {/* 2. Mandiri Card (Middle layer - Radiant Soft Sky Glow) */}
                <button
                  type="button"
                  onClick={() => setActivePillarModal("mandiri")}
                  title="Lihat penjelasan: Kenapa Mandiri?"
                  className="group absolute -bottom-1.5 right-6 sm:right-7 z-20 w-[104px] sm:w-[114px] h-[134px] sm:h-[144px] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between text-left bg-gradient-to-br from-sky-100/95 via-sky-200/90 to-blue-200/85 -rotate-[6deg] -translate-x-1 translate-y-1.5 hover:z-40 hover:-translate-y-7 hover:rotate-0 hover:scale-105 hover:shadow-[0_16px_32px_rgba(14,165,233,0.32)] transition-all duration-300 ease-out border border-sky-300/80 shadow-[0_8px_20px_rgba(14,165,233,0.18),inset_0_1px_1px_rgba(255,255,255,0.95)] cursor-pointer overflow-hidden outline-none"
                >
                  {/* Subtle soft radiant ambient glow */}
                  <div className="absolute -right-5 -bottom-5 w-16 h-16 rounded-full bg-sky-300/30 pointer-events-none blur-xs" />
                  <div className="absolute -left-3 -top-3 w-10 h-10 rounded-full bg-white/50 pointer-events-none blur-[0.5px]" />

                  {/* Top: Category Tag + Icon */}
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[7.5px] font-bold uppercase tracking-wider text-sky-800 bg-sky-200/70 px-1.5 py-0.5 rounded-md">02 · Otonom</span>
                    <span className="material-symbols-outlined text-[15px] text-sky-700">solar_power</span>
                  </div>

                  {/* Title & Stat */}
                  <div className="relative z-10">
                    <h3 className="text-[15px] sm:text-[16px] font-extrabold tracking-tight leading-none text-sky-950">Mandiri</h3>
                    <p className="text-[9px] font-semibold text-sky-800/90 leading-tight mt-1">78% daya</p>
                  </div>

                  {/* Bottom CTA Pill */}
                  <div className="relative z-10 pt-0.5">
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-sky-950 bg-sky-200/80 border border-sky-300/60 px-1.5 py-0.5 rounded-full group-hover:bg-sky-300 transition-colors shadow-2xs">
                      <span>Kenapa?</span>
                      <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                    </span>
                  </div>
                </button>

                {/* 3. Hemat Card (Front layer - Radiant Soft Amber/Gold Glow) */}
                <button
                  type="button"
                  onClick={() => setActivePillarModal("hemat")}
                  title="Lihat penjelasan: Kenapa Hemat?"
                  className="group absolute -bottom-1.5 -right-0.5 sm:right-0 z-30 w-[104px] sm:w-[114px] h-[134px] sm:h-[144px] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between text-left bg-gradient-to-br from-amber-100/95 via-amber-200/90 to-yellow-200/85 rotate-[6deg] translate-x-1 translate-y-3 hover:z-40 hover:-translate-y-7 hover:rotate-2 hover:scale-105 hover:shadow-[0_16px_32px_rgba(245,158,11,0.35)] transition-all duration-300 ease-out border border-amber-300/80 shadow-[0_8px_20px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.95)] cursor-pointer overflow-hidden outline-none"
                >
                  {/* Subtle soft radiant ambient glow */}
                  <div className="absolute -right-5 -bottom-5 w-16 h-16 rounded-full bg-amber-300/35 pointer-events-none blur-xs" />
                  <div className="absolute -left-3 -top-3 w-10 h-10 rounded-full bg-white/50 pointer-events-none blur-[0.5px]" />

                  {/* Top: Category Tag + Icon */}
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[7.5px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/70 px-1.5 py-0.5 rounded-md">01 · Hemat</span>
                    <span className="material-symbols-outlined text-[15px] text-amber-800">bolt</span>
                  </div>

                  {/* Title & Stat */}
                  <div className="relative z-10">
                    <h3 className="text-[15px] sm:text-[16px] font-extrabold tracking-tight leading-none text-amber-950">Hemat</h3>
                    <p className="text-[9px] font-semibold text-amber-900/90 leading-tight mt-1">s.d 85%</p>
                  </div>

                  {/* Bottom CTA Pill */}
                  <div className="relative z-10 pt-0.5">
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-950 bg-amber-200/80 border border-amber-300/60 px-1.5 py-0.5 rounded-full group-hover:bg-amber-300 transition-colors shadow-2xs">
                      <span>Kenapa?</span>
                      <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                    </span>
                  </div>
                </button>
              </div>
            </section>

            {/* Card B — Tata Letak Atap (Multi-Facet Carousel & Pristine CAD Grid) */}
            <RoofLayoutBentoCard key={activeProj.id} proj={activeProj} />

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

            {/* Stats — 2×2 small cards with Gemini Star Center Slice */}
            <div className="md:col-span-2 xl:col-span-4 relative">
              <div className="grid grid-cols-2 gap-3">
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

              {/* Star Cutout Slice that shapes the 4 Bento cards to follow the Gemini star with an exact 12px gap */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[76px] h-[76px] pointer-events-none z-10 select-none"
                aria-hidden="true"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path
                    d="M 50 4 C 50 26, 74 50, 96 50 C 74 50, 50 74, 50 96 C 50 74, 26 50, 4 50 C 26 50, 50 26, 50 4 Z"
                    fill="#EFF1F4"
                  />
                </svg>
              </div>

              {/* Center Floating Gemini Star Button (Yellow Radiant Soft Glow, Borderless) */}
              <button
                type="button"
                onClick={() => setProposalOpen(true)}
                title="Buka Proposal Detail Hasil Studio"
                aria-label="Buka Proposal Detail Hasil Studio"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[52px] h-[52px] flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer z-20 group border-0 outline-none select-none"
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full overflow-visible filter drop-shadow-[0_0_18px_rgba(251,191,36,0.65)] drop-shadow-[0_4px_12px_rgba(245,158,11,0.3)] group-hover:drop-shadow-[0_0_28px_rgba(251,191,36,0.9)] transition-all duration-300"
                >
                  <defs>
                    {/* Yellow Radiant Soft Glow Gradient */}
                    <linearGradient id="yellow-radiant-soft-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FEF08A" />
                      <stop offset="35%" stopColor="#FDE047" />
                      <stop offset="70%" stopColor="#FACC15" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>

                    {/* Center Luminous Shimmer */}
                    <radialGradient id="yellow-shimmer" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.9" />
                      <stop offset="60%" stopColor="#FDE047" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Ambient Glow Halo behind */}
                  <path
                    d="M 50 4 C 50 26, 74 50, 96 50 C 74 50, 50 74, 50 96 C 50 74, 26 50, 4 50 C 26 50, 50 26, 50 4 Z"
                    fill="url(#yellow-radiant-soft-glow)"
                    className="opacity-45 blur-sm scale-105 transform origin-center transition-opacity group-hover:opacity-75"
                  />

                  {/* Main Star-Shaped Body (Gemini Silhouette) */}
                  <path
                    d="M 50 4 C 50 26, 74 50, 96 50 C 74 50, 50 74, 50 96 C 50 74, 26 50, 4 50 C 26 50, 50 26, 50 4 Z"
                    fill="url(#yellow-radiant-soft-glow)"
                    className="transition-transform duration-300 origin-center"
                  />

                  {/* Center Core Glow */}
                  <circle cx="50" cy="50" r="22" fill="url(#yellow-shimmer)" pointerEvents="none" />

                  {/* Pure 'i' Detail Symbol (Borderless, no white circle, 100% vector inside star) */}
                  <g className="transition-transform duration-300 group-hover:scale-115 origin-center pointer-events-none">
                    {/* Dot of 'i' */}
                    <circle cx="50" cy="38" r="3.2" fill="#78350F" />
                    {/* Stem of 'i' */}
                    <line
                      x1="50"
                      y1="46"
                      x2="50"
                      y2="62"
                      stroke="#78350F"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
              </button>
            </div>

            {/* Projects list + map */}
            <section id="dashboard-map-section" className="md:col-span-2 xl:col-span-8 bg-white rounded-[22px] p-3 grid grid-cols-1 lg:grid-cols-2 gap-3 xl:h-[384px]">
              <div className="flex flex-col p-2 min-h-0">
                <CardHeader
                  title="Proyek"
                  subtitle={`${savedProjects.length} tersimpan`}
                  onAction={() => setActiveTab("history")}
                  actionLabel="Lihat semua proyek"
                />

                <ul className="mt-3 space-y-2 flex-1 min-h-0 overflow-y-auto pr-1.5">
                  {savedProjects.map((proj, idx) => {
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
                          className={`relative overflow-hidden flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer shadow-none ${
                            active
                              ? "bg-gradient-to-r from-amber-100/90 via-amber-50/60 to-white border-0"
                              : "bg-white border border-slate-200/80 hover:border-slate-300 text-slate-900 hover:bg-slate-50/60"
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
                              <span className="material-symbols-outlined text-[13px]">bolt</span>
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
                              active
                                ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:brightness-105 text-amber-950 font-bold border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                                : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[19px]">chevron_right</span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Real Leaflet Map of Kota Bogor (Fokus Citra Satelit) */}
              <div className="relative min-h-[300px] h-full rounded-[18px] overflow-hidden">
                <BogorProjectsMap
                  projects={savedProjects}
                  selectedProjectId={selectedProjectId}
                  onSelectProject={setSelectedProjectId}
                  onOpenStudio={(id) => {
                    const target = savedProjects.find((p) => p.id === id) || activeProj;
                    openProjectInStudio(target);
                  }}
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
          <div id="dashboard-history-section" className="space-y-4 animate-fadeIn">
            {/* Top Search & Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-[22px] p-3.5 shadow-xs">
              <div className="flex items-center gap-2 pl-2">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">history</span>
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 leading-tight">Riwayat Proyek</h2>
                  <p className="text-[11px] text-slate-400 leading-tight">{savedProjects.length} rancangan atap tersimpan</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {/* Quick Search */}
                <div className="relative flex-1 sm:w-72">
                  <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama proyek atau alamat..."
                    className="w-full h-9 pl-8 pr-3 rounded-full bg-slate-100 text-xs text-slate-900 placeholder:text-slate-400 outline-none border-0 border-none focus:ring-0"
                  />
                </div>

                {/* Add New Studio Link */}
                <Link
                  href="/studio"
                  className="h-9 px-4 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:brightness-105 text-amber-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)]"
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
                            onClick={() => handleDeleteProject(proj.id, proj.name)}
                            className="w-8 h-8 rounded-full border border-slate-200/80 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                            title="Hapus proyek ini dari riwayat"
                            aria-label="Hapus proyek"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
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
                            className="h-8 px-3.5 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:brightness-105 text-amber-950 text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                          >
                            <span>Buka Studio</span>
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
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
          <div id="dashboard-calculator-section" className="space-y-4 animate-fadeIn">
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
                  className="w-full h-11 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:brightness-105 text-amber-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-amber-300/80 shadow-[0_4px_14px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)]"
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

      {/* Detail Explanation Modal for Hemat, Mandiri, Bersih */}
      {activePillarModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActivePillarModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Radiant Soft Glow matching the pillar */}
            <div
              className={`p-6 bg-gradient-to-br ${
                activePillarModal === "hemat"
                  ? "from-amber-200 via-amber-300 to-yellow-200 text-amber-950 border-b border-amber-300/80"
                  : activePillarModal === "mandiri"
                  ? "from-sky-200 via-sky-300 to-blue-200 text-sky-950 border-b border-sky-300/80"
                  : "from-emerald-200 via-emerald-300 to-teal-200 text-emerald-950 border-b border-emerald-300/80"
              } relative overflow-hidden`}
            >
              {/* Decorative background circle */}
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/30 pointer-events-none blur-xs" />

              <div className="flex items-center justify-between relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur-md text-xs font-bold shadow-2xs">
                  <span className="material-symbols-outlined text-[16px]">
                    {activePillarModal === "hemat"
                      ? "bolt"
                      : activePillarModal === "mandiri"
                      ? "solar_power"
                      : "eco"}
                  </span>
                  <span>
                    {activePillarModal === "hemat"
                      ? "Solusi Finansial"
                      : activePillarModal === "mandiri"
                      ? "Solusi Otonomi"
                      : "Solusi Ekologis"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePillarModal(null)}
                  className="w-8 h-8 rounded-full bg-white/60 hover:bg-white/90 text-slate-800 flex items-center justify-center transition cursor-pointer shadow-2xs border border-white/80"
                  title="Tutup"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Title & Headline */}
              <div className="mt-4 relative z-10">
                <h3 className="text-2xl font-bold tracking-tight">
                  {activePillarModal === "hemat"
                    ? "Kenapa Bisa Lebih Hemat?"
                    : activePillarModal === "mandiri"
                    ? "Kenapa Bisa Lebih Mandiri?"
                    : "Kenapa Disebut Energi Bersih?"}
                </h3>
                <p className="text-sm font-medium opacity-90 mt-1">
                  {activePillarModal === "hemat"
                    ? "Memangkas tagihan listrik PLN hingga 85% dengan energi surya."
                    : activePillarModal === "mandiri"
                    ? "Penuhi hingga 78% kebutuhan listrik mandiri dari atap Anda sendiri."
                    : "Kurangi 11.5 ton emisi karbon per tahun tanpa polusi operasional."}
                </p>
              </div>

              {/* Tab Selector inside modal to easily browse all three */}
              <div className="flex items-center gap-1.5 mt-5 bg-white/40 p-1 rounded-2xl relative z-10 border border-white/60">
                <button
                  type="button"
                  onClick={() => setActivePillarModal("hemat")}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    activePillarModal === "hemat"
                      ? "bg-white text-amber-950 shadow-sm border border-amber-200/80"
                      : "text-slate-700 hover:text-slate-950"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  Hemat
                </button>
                <button
                  type="button"
                  onClick={() => setActivePillarModal("mandiri")}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    activePillarModal === "mandiri"
                      ? "bg-white text-sky-950 shadow-sm border border-sky-200/80"
                      : "text-slate-700 hover:text-slate-950"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">solar_power</span>
                  Mandiri
                </button>
                <button
                  type="button"
                  onClick={() => setActivePillarModal("bersih")}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    activePillarModal === "bersih"
                      ? "bg-white text-emerald-950 shadow-sm border border-emerald-200/80"
                      : "text-slate-700 hover:text-slate-950"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">eco</span>
                  Bersih
                </button>
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Highlight Metric Card */}
              <div
                className={`p-4 rounded-2xl border flex items-center gap-4 ${
                  activePillarModal === "hemat"
                    ? "bg-amber-50/70 border-amber-200"
                    : activePillarModal === "mandiri"
                    ? "bg-sky-50/70 border-sky-200"
                    : "bg-emerald-50/70 border-emerald-200"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    activePillarModal === "hemat"
                      ? "bg-amber-500 text-white"
                      : activePillarModal === "mandiri"
                      ? "bg-sky-500 text-white"
                      : "bg-emerald-500 text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {activePillarModal === "hemat"
                      ? "savings"
                      : activePillarModal === "mandiri"
                      ? "offline_bolt"
                      : "energy_savings_leaf"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Metrik Proyek ({activeProj.name})</p>
                  <p className="text-base font-bold text-slate-900">
                    {activePillarModal === "hemat" && "Hemat Rp 2,0 jt / bulan · ROI 2.4 tahun"}
                    {activePillarModal === "mandiri" && `${activeProj.capacityKwp} kWp (${activeProj.moduleCount} Panel) · Area Atap ${activeProj.effectiveAreaPct}%`}
                    {activePillarModal === "bersih" && "11.5 Ton CO₂ / thn · Setara 523 Pohon Rimbun"}
                  </p>
                </div>
              </div>

              {/* Explanation Points */}
              <div className="space-y-3 pt-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Faktor Utama Kenapa Bisa Terjadi
                </p>

                {activePillarModal === "hemat" && (
                  <>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Pemanfaatan Surya Gratis Saat Jam Puncak</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                          Listrik diproduksi secara maksimal pada pukul 09:00 - 15:00 saat peralatan rumah tangga (seperti AC dan kulkas) aktif, langsung memotong konsumsi berbayar dari PLN.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Mekanisme Net-Metering PLN</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                          Kelebihan daya yang tidak terpakai dikirim balik ke jaringan PLN sebagai kredit pengurang tagihan bulanan berikutnya sesuai regulasi resmi ESDM.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Perlindungan Kenaikan Tarif (Tariff Hedge)</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                          Investasi balik modal dalam 2.4 tahun, setelah itu seluruh listrik yang dihasilkan menjadi bebas biaya selama sisa umur panel (25+ tahun).
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activePillarModal === "mandiri" && (
                  <>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Menjadi Prosumer (Produsen Mandiri)</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                          Atap bangunan Anda bertransformasi menjadi unit pembangkit listrik mikro pribadi, mengurangi ketergantungan total pada gardu PLN.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Desain Terkalibrasi Orientasi Atap</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                          Simulasi SunSight menata panel di orientasi atap paling optimal (sudut kemiringan dan azimut matahari) untuk hasil produksi daya harian maksimal.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Dukungan Sistem Baterai (Hybrid-Ready)</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                          Dapat dipadukan dengan modul baterai ESS untuk cadangan listrik otomatis saat terjadi gangguan pemadaman pada jaringan listrik umum.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activePillarModal === "bersih" && (
                  <>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Nol Emisi Operasional (Zero Emission)</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                          Sinar foton matahari diubah langsung menjadi energi listrik tanpa proses pembakaran bahan bakar fosil, tanpa asap knalpot, dan tanpa polusi suara.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Menggantikan Pasokan PLTU Batubara</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                          Setiap kWh listrik bersih dari atap mencegah sekitar ~0.87 kg emisi karbon yang biasanya dilepaskan pembangkit listrik fosil ke udara.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Dampak Nyata Menuju Net-Zero 2060</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                          Mereduksi 11.5 ton CO₂ per tahun sama efektifnya dengan menanam 523 pohon rimbun dewasa di sekitar properti Anda.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActivePillarModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePillarModal(null);
                  openProjectInStudio(activeProj);
                }}
                className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:brightness-105 text-amber-950 flex items-center gap-1 transition border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] cursor-pointer"
              >
                <span>Buka Detail di Studio</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Mascot Dashboard Tour (Sunny) */}
      <MascotDashboardTour
        forceOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onSwitchTab={handleTourSwitchTab}
      />

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
