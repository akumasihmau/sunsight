"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { ProposalModal } from "@/components/studio/ProposalModal";
import { api, setToken, type SimulationInput, type SimulationParameters, type SimulationResult } from "@/lib/api";
import { formatRp } from "@/lib/format";
import { getStoredBiodata, saveStoredBiodata } from "@/lib/profile";

type CvLayer = "satellite" | "cv" | "heatmap";
type RoofShape = "rectangle" | "l-shape" | "trapezoid";
type CadTool = "select" | "edit_polygon" | "add_polygon" | "add_obstacle" | "measure";
type Orientation = "portrait" | "landscape";
type InverterType = "string" | "micro";
type SlotState = "active" | "skylight" | "hvac" | "empty";

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

const ECO_TREE_CONFIGS = [
  { id: 0, layer: "front" as const, x: 168, y: 75, scale: 1.14, type: "oak" as const, delay: 20 },
  { id: 1, layer: "mid" as const, x: 135, y: 56, scale: 0.92, type: "pine" as const, delay: 40 },
  { id: 2, layer: "back" as const, x: 175, y: 46, scale: 0.7, type: "poplar" as const, delay: 60 },
  { id: 3, layer: "mid" as const, x: 202, y: 56, scale: 0.9, type: "oak" as const, delay: 80 },
  { id: 4, layer: "front" as const, x: 228, y: 74, scale: 1.12, type: "poplar" as const, delay: 100 },
  { id: 5, layer: "back" as const, x: 118, y: 41, scale: 0.72, type: "pine" as const, delay: 120 },
  { id: 6, layer: "mid" as const, x: 70, y: 53, scale: 0.9, type: "oak" as const, delay: 140 },
  { id: 7, layer: "front" as const, x: 110, y: 73, scale: 1.16, type: "oak" as const, delay: 160 },
  { id: 8, layer: "back" as const, x: 210, y: 44, scale: 0.67, type: "poplar" as const, delay: 180 },
  { id: 9, layer: "mid" as const, x: 238, y: 54, scale: 0.89, type: "pine" as const, delay: 200 },
  { id: 10, layer: "back" as const, x: 85, y: 38, scale: 0.66, type: "pine" as const, delay: 220 },
  { id: 11, layer: "front" as const, x: 290, y: 75, scale: 1.15, type: "oak" as const, delay: 240 },
  { id: 12, layer: "mid" as const, x: 170, y: 58, scale: 0.88, type: "pine" as const, delay: 260 },
  { id: 13, layer: "back" as const, x: 245, y: 42, scale: 0.71, type: "oak" as const, delay: 280 },
  { id: 14, layer: "mid" as const, x: 102, y: 53, scale: 0.87, type: "poplar" as const, delay: 300 },
  { id: 15, layer: "front" as const, x: 48, y: 76, scale: 1.1, type: "pine" as const, delay: 320 },
  { id: 16, layer: "back" as const, x: 52, y: 42, scale: 0.7, type: "oak" as const, delay: 340 },
  { id: 17, layer: "mid" as const, x: 272, y: 53, scale: 0.91, type: "pine" as const, delay: 360 },
  { id: 18, layer: "back" as const, x: 280, y: 41, scale: 0.66, type: "pine" as const, delay: 380 },
  { id: 19, layer: "mid" as const, x: 35, y: 62, scale: 0.88, type: "poplar" as const, delay: 400 },
  { id: 20, layer: "back" as const, x: 22, y: 49, scale: 0.65, type: "pine" as const, delay: 420 },
  { id: 21, layer: "back" as const, x: 150, y: 44, scale: 0.68, type: "pine" as const, delay: 440 },
  { id: 22, layer: "mid" as const, x: 308, y: 54, scale: 0.87, type: "oak" as const, delay: 460 },
  { id: 23, layer: "back" as const, x: 315, y: 43, scale: 0.69, type: "poplar" as const, delay: 480 },
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

const PRESET_ADDRESSES = [
  {
    label: "Jl. Pajajaran No. 42, Bogor Tengah",
    lat: -6.5975,
    lon: 106.8045,
    ridge: 12.48,
    slope: 7.28,
    shape: "rectangle" as RoofShape,
    deg: -4,
  },
  {
    label: "Baranangsiang Indah, Bogor Timur",
    lat: -6.6110,
    lon: 106.8160,
    ridge: 14.2,
    slope: 8.0,
    shape: "l-shape" as RoofShape,
    deg: 8,
  },
  {
    label: "Taman Yasmin Sektor 3, Bogor Barat",
    lat: -6.5615,
    lon: 106.7620,
    ridge: 11.5,
    slope: 6.8,
    shape: "trapezoid" as RoofShape,
    deg: 0,
  },
  {
    label: "Jl. Ir. H. Juanda (Kebun Raya), Bogor",
    lat: -6.5980,
    lon: 106.7950,
    ridge: 15.0,
    slope: 8.5,
    shape: "rectangle" as RoofShape,
    deg: 12,
  },
  {
    label: "Bantarjati, Bogor Utara",
    lat: -6.5780,
    lon: 106.8080,
    ridge: 10.8,
    slope: 6.4,
    shape: "rectangle" as RoofShape,
    deg: -6,
  },
];

const INITIAL_FACETS: RoofFacet[] = [
  {
    id: "facet-1",
    name: "Bidang Atap Utama",
    shape: "rectangle",
    ridge: 12.48,
    slope: 7.28,
    pitch: 22,
    azimuth: 188,
    setback: 0.5,
    gutter: 0.6,
    rotation: -4,
    lat: -6.595038,
    lng: 106.797241,
    offsetX: 0,
    offsetY: 0,
    hasHvac: true,
    hasSkylight: true,
    modulePower: 550,
    orientation: "portrait",
    panelGap: 3,
    slotOverrides: {},
    customModuleCount: null,
  },
  {
    id: "facet-2",
    name: "Bidang Atap Sayap",
    shape: "rectangle",
    ridge: 7.5,
    slope: 4.8,
    pitch: 18,
    azimuth: 98,
    setback: 0.4,
    gutter: 0.5,
    rotation: -4,
    lat: -6.59495,
    lng: 106.79742,
    offsetX: 160,
    offsetY: 45,
    hasHvac: false,
    hasSkylight: false,
    modulePower: 550,
    orientation: "portrait",
    panelGap: 3,
    slotOverrides: {},
    customModuleCount: null,
  },
];

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

  // 4. Roof Geometry & Usable Area
  const usableRidge = Math.max(1, facet.ridge - 2 * facet.setback);
  const usableSlope = Math.max(1, facet.slope - facet.setback - facet.gutter);
  const grossArea = facet.ridge * facet.slope;
  const netArea = usableRidge * usableSlope;
  const netAreaPct = grossArea > 0 ? Math.round((netArea / grossArea) * 100) : 0;

  // 5. Module Layout Grid Packing
  const currentSpec = MODULE_SPECS[facet.modulePower] || MODULE_SPECS[550];
  const panelW = facet.orientation === "portrait" ? currentSpec.w : currentSpec.l;
  const panelL = facet.orientation === "portrait" ? currentSpec.l : currentSpec.w;
  const gapM = facet.panelGap / 100;

  let cols = Math.floor((usableRidge + gapM) / (panelW + gapM));
  let rows = Math.floor((usableSlope + gapM) / (panelL + gapM));
  if (cols < 1) cols = 1;
  if (rows < 1) rows = 1;

  function isOutOfBounds(r: number, c: number) {
    if (facet.shape === "l-shape") {
      return c >= Math.ceil(cols * 0.65) && r < Math.floor(rows * 0.42);
    }
    if (facet.shape === "trapezoid") {
      return r === 0 && (c === 0 || c === cols - 1);
    }
    return false;
  }

  const validSlots: { r: number; c: number; key: string }[] = [];
  const obstacleRow = Math.min(rows - 1, 1);
  const obstacleCol = Math.max(1, Math.floor((cols - 2) / 2));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isOutOfBounds(r, c)) {
        validSlots.push({ r, c, key: `${r}_${c}` });
      }
    }
  }

  const totalValidSlots = validSlots.length;

  let activeCount = 0;
  validSlots.forEach((slot) => {
    let state = facet.slotOverrides[slot.key];
    if (!state) {
      if (
        facet.hasHvac &&
        obstacleFilterActive &&
        slot.r === obstacleRow &&
        (slot.c === obstacleCol || slot.c === obstacleCol + 1)
      ) {
        state = "hvac";
      } else if (facet.hasSkylight && slot.r === 0 && slot.c === Math.min(1, cols - 1)) {
        state = "skylight";
      } else {
        state = "active";
      }
    }
    if (state === "active") activeCount++;
  });

  let modulesFitted =
    facet.customModuleCount !== null ? Math.min(facet.customModuleCount, totalValidSlots) : activeCount;
  if (modulesFitted < 0) modulesFitted = 0;

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
  const [cadToast, setCadToast] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"geometry" | "pvarray" | "financials">("geometry");
  const [capexCollapsed, setCapexCollapsed] = useState(true);
  const [proposalOpen, setProposalOpen] = useState(false);

  // Address search input (Defaulted to Kota Bogor)
  const [addressInput, setAddressInput] = useState("Jl. Pajajaran No. 42, Bogor Tengah, Kota Bogor");

  // Mouse HUD for Radiometer
  const [probePos, setProbePos] = useState<{ x: number; y: number } | null>(null);

  // Multi-Polygon Roof Facets State
  const [facets, setFacets] = useState<RoofFacet[]>(INITIAL_FACETS);
  const [activeFacetId, setActiveFacetId] = useState<string>("facet-1");
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Map synchronization state for real-time scale & position tracking
  const [mapTick, setMapTick] = useState(0);

  // Background Leaflet Map refs & status
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const esriSatelliteLayerRef = useRef<any>(null);
  const osmStreetLayerRef = useRef<any>(null);
  const labelsLayerRef = useRef<any>(null);

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
    return facets.find((f) => f.id === activeFacetId) || facets[0] || INITIAL_FACETS[0];
  }, [facets, activeFacetId]);

  const updateActiveFacet = useCallback((patch: Partial<RoofFacet>) => {
    setFacets((prev) =>
      prev.map((f) => (f.id === activeFacetId ? { ...f, ...patch } : f))
    );
  }, [activeFacetId]);

  // Synchronize initial facet & map location from URL query params (e.g. when launched from Dashboard)
  useEffect(() => {
    const pName = searchParams.get("name");
    const pLat = searchParams.get("lat");
    const pLng = searchParams.get("lng");
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
        mapInstanceRef.current.setView([latNum, lngNum], 21);
      }
    }
  }, [searchParams, updateActiveFacet]);

  // Toast notification timer
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setCadToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setCadToast(null);
    }, 2400);
  }, []);

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
      lat: (activeFacet.lat || -6.595038) - 0.00008,
      lng: (activeFacet.lng || 106.797241) + 0.00012,
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
      if (activeFacetId === id) {
        setActiveFacetId(next[0].id);
      }
      return next;
    });
    showToast("Bidang atap dihapus");
  }, [facets.length, activeFacetId, showToast]);

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

  const setRidge = (val: number | ((prev: number) => number)) => {
    const nextVal = typeof val === "function" ? val(activeFacet.ridge) : val;
    updateActiveFacet({ ridge: Math.max(1, nextVal) });
  };
  const setSlope = (val: number | ((prev: number) => number)) => {
    const nextVal = typeof val === "function" ? val(activeFacet.slope) : val;
    updateActiveFacet({ slope: Math.max(1, nextVal) });
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
  const setRoofShape = (shape: RoofShape) => updateActiveFacet({ shape, slotOverrides: {}, customModuleCount: null });
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

  // ROI Interactive Chart State
  const [roiYear, setRoiYear] = useState(4.8);
  const [roiHoverYear, setRoiHoverYear] = useState<number | null>(null);

  // Biodata state
  const [biodata, setBiodata] = useState(getStoredBiodata());

  useEffect(() => {
    const bio = getStoredBiodata();
    setBiodata(bio);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
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
  }, []);

  // Initialize Dynamic OpenStreetMap & Real Earth Satellite Map (CDN, zero npm packages)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;

      const container = document.getElementById("studio-leaflet-map");
      if (!container || mapInstanceRef.current) return;

      try {
        const pLat = searchParams.get("lat") ? Number(searchParams.get("lat")) : -6.595038;
        const pLng = searchParams.get("lng") ? Number(searchParams.get("lng")) : 106.797241;
        const map = L.map("studio-leaflet-map", {
          center: [!isNaN(pLat) ? pLat : -6.595038, !isNaN(pLng) ? pLng : 106.797241],
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
        const esriSatellite = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { maxNativeZoom: 19, maxZoom: 22 }
        );

        // OpenStreetMap (OSM) standard vector road tile layer
        const osmStreet = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxNativeZoom: 19,
          maxZoom: 22,
        });

        // Hybrid labels layer (Street & City reference)
        const labelsLayer = L.tileLayer(
          "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          { maxNativeZoom: 19, maxZoom: 22 }
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

  // OSM Nominatim Geocoding API handler (Focused strictly on Kota Bogor)
  const handleGeocodeSearch = async (query: string) => {
    if (!query.trim()) return;
    const searchQuery = query.toLowerCase().includes("bogor") ? query : `${query}, Kota Bogor`;
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
          mapInstanceRef.current.flyTo([lat, lon], 21, { duration: 1.5 });
        }
        updateActiveFacet({ lat, lng: lon });
        setAddressInput(data[0].display_name || searchQuery);
        showToast(`Lokasi Kota Bogor: ${data[0].display_name.split(",")[0]}`);
      } else {
        showToast("Lokasi tidak ditemukan di OSM. Menggunakan preset Bogor.");
      }
    } catch {
      showToast("Pencarian lokasi OSM siap digunakan.");
    }
  };

  // Calculations (Multi-Polygon Solar Physics & Aggregate Financials)
  const calc = useMemo(() => {
    const monthlyKwh = monthlyBill / plnTariff;

    // Active Facet Specific Metrics
    const activeMetrics = computeFacetMetrics(
      activeFacet,
      sunHour,
      obstacleFilterActive,
      extraTilt,
      inverterType
    );

    // All Facets Metrics
    const allMetrics = facets.map((f) =>
      computeFacetMetrics(f, sunHour, obstacleFilterActive, extraTilt, inverterType)
    );

    // Aggregate System Totals
    const totalGrossArea = allMetrics.reduce((s, m) => s + m.grossArea, 0);
    const totalNetArea = allMetrics.reduce((s, m) => s + m.netArea, 0);
    const totalValidSlots = allMetrics.reduce((s, m) => s + m.totalValidSlots, 0);
    const totalModulesFitted = allMetrics.reduce((s, m) => s + m.modulesFitted, 0);
    const totalActualKwp = allMetrics.reduce((s, m) => s + m.actualKwp, 0);
    const totalAnnualProductionKwh = allMetrics.reduce((s, m) => s + m.annualProductionKwh, 0);
    const totalMonthlyGenKwh = allMetrics.reduce((s, m) => s + m.monthlyGenKwh, 0);

    const costModules = allMetrics.reduce((s, m) => s + m.costModules, 0);
    const costInverter = allMetrics.reduce((s, m) => s + m.costInverter, 0);
    const costRacking = allMetrics.reduce((s, m) => s + m.costRacking, 0);
    const costInstall = 15_000_000; // Standar instalasi mekanikal & elektrikal
    const totalCapex = costModules + costInverter + costRacking + costInstall;

    const monthlySaving = Math.min(monthlyBill, totalMonthlyGenKwh * plnTariff);
    const annualSaving = monthlySaving * 12;
    const coveragePct = Math.min(100, Math.round((totalMonthlyGenKwh / Math.max(1, monthlyKwh)) * 100));

    const paybackYears = annualSaving > 0 ? totalCapex / annualSaving : null;
    const bepYear = paybackYears ? Math.round(paybackYears * 10) / 10 : 4.8;
    const irr = totalCapex > 0 ? Math.round(((annualSaving / totalCapex) * 100) * 10) / 10 : 0;
    const lcoe = totalAnnualProductionKwh > 0 ? Math.round(totalCapex / (totalAnnualProductionKwh * 25)) : 0;
    const cumulative25 = annualSaving * 25;
    const netProfit25 = cumulative25 - totalCapex * 1.15;

    const co2ReductionKg = totalAnnualProductionKwh * 0.8;
    const co2ReductionTon = co2ReductionKg / 1000;
    const treesEquivalent = Math.round(co2ReductionKg / 22);
    const forestHa = (treesEquivalent * 0.0011).toFixed(2);

    return {
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

      // Total System Aggregate Metrics (Used by Top Ribbon, Tab 3 & Charts)
      totalGrossArea,
      totalNetArea,
      totalModulesFitted,
      actualKwp: totalActualKwp,
      annualProductionKwh: totalAnnualProductionKwh,
      monthlyGenKwh: totalMonthlyGenKwh,
      coveragePct,
      totalCapex,
      costModules,
      costInverter,
      costRacking,
      costInstall,
      cappedSaving: monthlySaving,
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
    activeFacet,
    facets,
    monthlyBill,
    plnTariff,
    sunHour,
    obstacleFilterActive,
    extraTilt,
    inverterType,
  ]);

  const activeTreeCount = useMemo(() => {
    const minBenchmark = 120;
    const maxBenchmark = 3850;
    const ratio = Math.max(0, Math.min(1, (calc.treesEquivalent - minBenchmark) / (maxBenchmark - minBenchmark)));
    return Math.max(2, Math.min(24, Math.round(2 + ratio * 22)));
  }, [calc.treesEquivalent]);

  // Save Simulation to Server State & Action
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSimulation = async () => {
    setIsSaving(true);
    try {
      const payload: SimulationInput = {
        image_id: "default-bogor-orthophoto",
        roof_rect: {
          x: Math.round(activeFacet.offsetX || 100),
          y: Math.round(activeFacet.offsetY || 100),
          width: Math.round(activeFacet.ridge * 10),
          height: Math.round(activeFacet.slope * 10),
          rotation_deg: activeFacet.rotation || 0,
        },
        setback_m: activeFacet.setback,
        gutter_m: activeFacet.gutter,
        tilt_deg: activeFacet.pitch,
        azimuth_deg: activeFacet.azimuth,
        module_key: `module_${activeFacet.modulePower}`,
        orientation: activeFacet.orientation,
        clearance_m: activeFacet.panelGap / 100,
        panel_count: calc.modulesFitted,
        inverter_type: inverterType,
        monthly_bill_idr: monthlyBill,
        tariff_key: "R2",
      };

      const res = await api.saveSimulation(payload);
      setIsSaving(false);
      setSaveSuccess(true);
      showToast(`✅ Desain simulasi tersimpan ke akun! (ID #${res.id})`);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setIsSaving(false);
      showToast(`Gagal menyimpan: ${err?.message || "Periksa koneksi backend"}`);
    }
  };

  const handleSlotClick = (key: string) => {
    const cycle: Record<SlotState, SlotState> = {
      active: "skylight",
      skylight: "hvac",
      hvac: "empty",
      empty: "active",
    };
    const current = slotOverrides[key] || "active";
    const next = cycle[current];
    setSlotOverrides((prev) => ({ ...prev, [key]: next }));
    showToast(`Slot Atap diubah: ${next.toUpperCase()}`);
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

  const currentInspectYear = roiHoverYear !== null ? roiHoverYear : roiYear;

  const getCashFlowAtYear = (t: number) => {
    if (t <= 0) return -calc.totalCapex;
    const savings = t * calc.annualSaving;
    const inverterReplacement = t >= 12 ? calc.costInverter * 0.7 : 0;
    return -calc.totalCapex + savings - inverterReplacement;
  };

  const currentInspectCashFlow = getCashFlowAtYear(currentInspectYear);

  const chartW = 340;
  const chartH = 125;
  const chartPadLeft = 28;
  const chartPadRight = 20;
  const plotW = chartW - chartPadLeft - chartPadRight;
  const minVal = -calc.totalCapex * 1.05;
  const maxVal = Math.max(1, calc.cumulative25 - calc.totalCapex) * 1.05;
  const valRange = maxVal - minVal;

  const mapChartX = (t: number) => chartPadLeft + (t / 25) * plotW;
  const mapChartY = (v: number) => chartH - 20 - ((v - minVal) / valRange) * (chartH - 35);
  const zeroY = mapChartY(0);

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
    const bepX = mapChartX(calc.bepYear);
    const endX = mapChartX(25);
    const profitPts = curvePoints.filter((pt) => pt.t >= calc.bepYear);
    if (!profitPts.length) return "";
    let d = `M ${bepX.toFixed(1)} ${zeroY.toFixed(1)}`;
    profitPts.forEach((pt) => {
      d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    });
    d += ` L ${endX.toFixed(1)} ${zeroY.toFixed(1)} Z`;
    return d;
  }, [calc.bepYear, curvePoints, zeroY]);

  const deficitFillD = useMemo(() => {
    const startX = mapChartX(0);
    const bepX = mapChartX(calc.bepYear);
    const deficitPts = curvePoints.filter((pt) => pt.t <= calc.bepYear);
    let d = `M ${startX.toFixed(1)} ${zeroY.toFixed(1)}`;
    deficitPts.forEach((pt) => {
      d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    });
    d += ` L ${bepX.toFixed(1)} ${zeroY.toFixed(1)} Z`;
    return d;
  }, [calc.bepYear, curvePoints, zeroY]);

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
    if (dragState) {
      setDragState(null);
      showToast("Geometri poligon berhasil diperbarui");
    }
  };

  const simulationResultForModal: SimulationResult = {
    geometry: {
      roof_width_m: slope,
      roof_length_m: ridge,
      total_area_sqm: calc.totalGrossArea,
      effective_area_sqm: calc.totalNetArea,
    },
    layout: {
      max_slots: calc.totalValidSlots,
      installed: calc.totalModulesFitted,
      rows: calc.rows,
      columns: calc.cols,
      module_area_sqm: calc.totalModulesFitted * calc.currentSpec.w * calc.currentSpec.l,
      density_ratio: calc.totalNetArea > 0 ? (calc.totalModulesFitted * calc.currentSpec.w * calc.currentSpec.l) / calc.totalNetArea : 0,
    },
    energy: {
      capacity_kwp: calc.actualKwp,
      annual_production_kwh: calc.annualProductionKwh,
      daily_irradiance_kwh_per_sqm: 4.85,
      incidence_factor: 0.984,
      performance_ratio: 0.8,
      irradiance_source: "NASA POWER / PVGIS",
      irradiance_period: "klimatologi tahunan",
    },
    finance: {
      capex_total_idr: calc.totalCapex,
      capex_breakdown: {
        modules_idr: calc.costModules,
        inverter_idr: calc.costInverter,
        racking_idr: calc.costRacking,
        installation_idr: calc.costInstall,
      },
      monthly_saving_idr: calc.cappedSaving,
      annual_saving_idr: calc.annualSaving,
      payback_years: calc.paybackYears,
      tariff_key: "R2",
      tariff_label: "R-2 / 3.500-5.500 VA",
      tariff_idr_per_kwh: plnTariff,
      monthly_bill_idr: monthlyBill,
      co2_reduction_kg_per_year: calc.co2ReductionTon * 1000,
      trees_equivalent: calc.treesEquivalent,
    },
  };

  const simulationParamsForModal: SimulationParameters = {
    setback_m: setback,
    gutter_m: gutter,
    tilt_deg: pitch,
    azimuth_deg: azimuth,
    module_key: `module_${modulePower}`,
    orientation,
    clearance_m: panelGap / 100,
    panel_count: calc.totalModulesFitted,
    inverter_type: inverterType,
    monthly_bill_idr: monthlyBill,
    tariff_key: "R2",
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#f8fafc] font-body-md text-slate-800 antialiased select-none flex flex-col">
      {/* =======================================================
          TOP STUDIO HEADER (Modern Soft Gradient + Glassmorphism)
          ======================================================= */}
      <header className="h-14 w-full bg-white/80 backdrop-blur-xl border-b border-amber-200/50 px-4 flex items-center justify-between z-40 shrink-0 shadow-[0_2px_16px_rgba(245,158,11,0.03)]">
        {/* Left: Back button, Logo, Project name badge */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-8 h-8 rounded-xl border border-amber-200/60 bg-white/75 hover:bg-white backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-slate-900 transition shadow-2xs"
            title="Kembali ke Beranda"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>

          <Link href="/" className="flex items-center gap-2" title="SunSight Studio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="SunSight" className="h-7 w-auto" />
          </Link>

          <div className="h-4 w-px bg-amber-200/60 mx-1 hidden sm:block" />

          <span className="px-2.5 py-1 rounded-xl bg-amber-50/80 text-amber-950 text-xs font-semibold border border-amber-200/60 hidden sm:inline-flex items-center gap-1.5 shadow-2xs">
            <span>{activeFacet.name || "Proyek Menteng #06"}</span>
          </span>
        </div>

        {/* Center: Search input */}
        <div className="relative w-64 md:w-80 max-w-sm">
          <div className="flex items-center rounded-xl bg-white/75 backdrop-blur-md border border-amber-200/60 px-2.5 py-1.5 focus-within:bg-white focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all shadow-2xs">
            <span className="material-symbols-outlined text-amber-500 text-[18px] mr-2">search</span>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleGeocodeSearch(addressInput);
                }
              }}
              placeholder="Menteng, Jakarta Pusat atau Kota Bogor..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            {addressInput && (
              <button
                type="button"
                onClick={() => setAddressInput("")}
                className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Layer Selector, Reset, Ekspor Proposal PDF, User Avatar */}
        <div className="flex items-center gap-2">
          {/* Layer Selector Dropdown */}
          <button
            type="button"
            onClick={() => {
              const next: Record<CvLayer, CvLayer> = { satellite: "cv", cv: "heatmap", heatmap: "satellite" };
              const n = next[activeLayer];
              setActiveLayer(n);
              showToast(`Layer: ${n === "cv" ? "Satelit RGB (CV)" : n === "heatmap" ? "Iradiasi Heatmap" : "Satelit Normal"}`);
            }}
            className="h-8 px-2.5 rounded-xl border border-amber-200/60 bg-white/75 hover:bg-white backdrop-blur-md flex items-center gap-1.5 text-xs font-medium text-slate-700 transition cursor-pointer shadow-2xs"
            title="Ganti Lapisan Peta"
          >
            <span className="material-symbols-outlined text-amber-500 text-[16px]">satellite_alt</span>
            <span className="hidden md:inline text-slate-500">Layer:</span>
            <span className="font-semibold text-slate-800 text-[11px]">
              {activeLayer === "cv" ? "Satelit RGB" : activeLayer === "heatmap" ? "Heatmap" : "Satelit"}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold border border-amber-200/60">cv</span>
            <span className="material-symbols-outlined text-slate-400 text-[14px]">expand_more</span>
          </button>

          {/* Reset */}
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
            }}
            className="h-8 px-2.5 rounded-xl border border-slate-200/80 bg-white/75 hover:bg-white backdrop-blur-md flex items-center gap-1 text-xs font-medium text-slate-700 transition cursor-pointer shadow-2xs"
            title="Reset Parameter Atap"
          >
            <span className="material-symbols-outlined text-slate-500 text-[16px]">restart_alt</span>
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Simpan Desain Button: Modern Soft Amber with Status Indicator */}
          <button
            type="button"
            onClick={handleSaveSimulation}
            disabled={isSaving}
            className={`h-8 px-3.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition cursor-pointer shadow-xs border ${
              saveSuccess
                ? "bg-emerald-500 text-white border-emerald-600"
                : "bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 border-amber-300"
            }`}
            title="Simpan simulasi desain atap ini ke akun Anda"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSaving ? "animate-spin" : ""}`}>
              {isSaving ? "sync" : saveSuccess ? "check_circle" : "save"}
            </span>
            <span className="hidden sm:inline">
              {isSaving ? "Menyimpan..." : saveSuccess ? "Tersimpan" : "Simpan Desain"}
            </span>
          </button>

          {/* Ekspor Proposal PDF Button: Modern Soft Amber Glass Gradient */}
          <button
            type="button"
            onClick={() => setProposalOpen(true)}
            className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-amber-100/95 via-amber-200/80 to-amber-100/95 hover:from-amber-200 hover:to-amber-300 active:scale-95 text-amber-950 flex items-center gap-1.5 text-xs font-bold shadow-[0_2px_10px_rgba(245,158,11,0.12),inset_0_1px_1px_rgba(255,255,255,0.85)] border border-amber-300/80 transition cursor-pointer"
            title="Ekspor Proposal PDF Resmi"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-700">picture_as_pdf</span>
            <span className="hidden sm:inline">Proposal PDF</span>
          </button>

          {/* User Avatar */}
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-amber-200/90 border border-amber-300/80 hover:ring-2 hover:ring-amber-400 text-amber-950 font-bold text-xs flex items-center justify-center transition cursor-pointer shadow-xs"
            title="Profil Pengguna & Logout"
          >
            MR
          </button>

          {/* Quick Logout Button */}
          <button
            type="button"
            onClick={async () => {
              try {
                await api.logout();
              } catch {}
              setToken(null);
              router.replace("/login");
            }}
            className="h-8 px-2.5 rounded-xl border border-slate-200/80 hover:border-rose-300 bg-white/75 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Keluar dari Akun"
          >
            <span className="material-symbols-outlined text-[15px]">logout</span>
            <span className="hidden md:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* =======================================================
          FULL-SCREEN CANVAS VIEWPORT + INSPECTOR
          ======================================================= */}
      <main className="w-full flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* =======================================================
            LEFT: CANVAS VIEWPORT (Truly Edge-to-Edge)
            ======================================================= */}
        <div
          className="relative flex-1 h-[55vh] lg:h-full bg-slate-100 overflow-hidden select-none cursor-default"
          onMouseMove={onViewportMouseMove}
          onMouseUp={onViewportMouseUp}
        >
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
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200/90 shadow-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-amber-500 text-[16px]">info</span>
              <span>{cadToast}</span>
            </div>
          )}

          {/* Interactive Multi-Roof Surface Polygons & Solar Arrays */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
            {facets.map((facet) => {
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
              const polyWidth = Math.max(16, Math.round(facet.ridge * pixelsPerMeter));
              const polyHeight = Math.max(16, Math.round(facet.slope * pixelsPerMeter));

              return (
                <div
                  key={facet.id}
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
                    zIndex: isActive ? 25 : 15,
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
                    if (!isActive) {
                      setActiveFacetId(facet.id);
                      showToast(`Beralih ke ${facet.name}`);
                    }
                  }}
                >
                  {/* Outer Roof Boundary */}
                  <div
                    className={`absolute inset-0 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-sky-950/35 border-2 border-sky-400/90 shadow-[0_0_35px_rgba(2,132,199,0.45)] ring-1 ring-sky-300/40"
                        : "bg-slate-900/40 border-2 border-dashed border-emerald-400/60 hover:border-amber-400/80 hover:bg-slate-900/60 cursor-pointer"
                    } ${
                      facet.shape === "l-shape"
                        ? "[clip-path:polygon(0_0,65%_0,65%_42%,100%_42%,100%_100%,0_100%)]"
                        : facet.shape === "trapezoid"
                          ? "[clip-path:polygon(15%_0,85%_0,100%_100%,0_100%)]"
                          : ""
                    }`}
                  >
                    {/* Top Ridge Tag */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-white/95 text-slate-800 shadow-md flex items-center gap-1.5 pointer-events-none border border-slate-200/90 backdrop-blur-md whitespace-nowrap z-10">
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <span className="font-code-metric text-[11px] font-bold text-slate-900">
                        {facet.ridge.toFixed(2)} m
                      </span>
                      <span className="text-[9.5px] text-slate-400">
                        Panjang Atap
                      </span>
                    </div>

                    {/* Right Slope Tag */}
                    {isActive && (
                      <div className="absolute -right-28 top-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-white/95 text-slate-800 shadow-md flex items-center gap-1.5 pointer-events-none border border-slate-200/90 backdrop-blur-md whitespace-nowrap z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        <span className="font-code-metric text-[11px] font-bold text-slate-900">
                          {facet.slope.toFixed(2)} m
                        </span>
                        <span className="text-[9.5px] text-slate-400">Lebar Atap</span>
                      </div>
                    )}

                    {/* Setback Boundary (Scaled physically to meters) */}
                    <div
                      className="absolute rounded-md border-2 border-dashed border-amber-400/80 bg-emerald-500/[0.02] pointer-events-none transition-all duration-200 z-20"
                      style={{
                        top: `${Math.round(facet.setback * pixelsPerMeter)}px`,
                        left: `${Math.round(facet.setback * pixelsPerMeter)}px`,
                        right: `${Math.round(facet.setback * pixelsPerMeter)}px`,
                        bottom: `${Math.round((facet.setback + facet.gutter) * pixelsPerMeter)}px`,
                      }}
                    >
                      {isActive && (
                        <div className="absolute -top-2.5 left-2 px-1.5 py-0.5 rounded bg-amber-500 text-white font-code-metric text-[8px] font-bold shadow-md flex items-center gap-1 backdrop-blur-xs border border-amber-300/60 z-20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-200" />
                          <span>Setback {facet.setback.toFixed(2)}m</span>
                        </div>
                      )}
                    </div>

                    {/* Gutter Strip (Scaled physically to meters) */}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-sky-500/20 border-t border-dashed border-sky-400/80 flex items-center justify-center px-2 pointer-events-none transition-all duration-200 overflow-hidden"
                      style={{ height: `${Math.max(6, Math.round(facet.gutter * pixelsPerMeter))}px` }}
                    >
                      <span className="text-[7.5px] font-bold text-sky-200 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">water_drop</span>
                        (JALUR TALANG AIR ({facet.gutter.toFixed(2)}M))
                      </span>
                    </div>

                    {/* Dynamic PV Solar Grid (Scaled physically to meters) */}
                    <div
                      className="absolute p-0.5 grid gap-1 z-20"
                      style={{
                        top: `${Math.round(facet.setback * pixelsPerMeter)}px`,
                        left: `${Math.round(facet.setback * pixelsPerMeter)}px`,
                        right: `${Math.round(facet.setback * pixelsPerMeter)}px`,
                        bottom: `${Math.round((facet.setback + facet.gutter) * pixelsPerMeter)}px`,
                        gridTemplateColumns: `repeat(${fMetrics.cols}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${fMetrics.rows}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: fMetrics.rows }).map((_, r) =>
                        Array.from({ length: fMetrics.cols }).map((__, c) => {
                          const key = `${r}_${c}`;
                          const isOut =
                            (facet.shape === "l-shape" &&
                              c >= Math.ceil(fMetrics.cols * 0.65) &&
                              r < Math.floor(fMetrics.rows * 0.42)) ||
                            (facet.shape === "trapezoid" && r === 0 && (c === 0 || c === fMetrics.cols - 1));

                          if (isOut) return <div key={key} className="opacity-0 pointer-events-none" />;

                          let state: SlotState = facet.slotOverrides[key] || "active";
                          const obstacleRow = Math.min(fMetrics.rows - 1, 1);
                          const obstacleCol = Math.max(1, Math.floor((fMetrics.cols - 2) / 2));

                          if (!facet.slotOverrides[key]) {
                            if (
                              facet.hasHvac &&
                              obstacleFilterActive &&
                              r === obstacleRow &&
                              (c === obstacleCol || c === obstacleCol + 1)
                            ) {
                              state = "hvac";
                            } else if (facet.hasSkylight && r === 0 && c === Math.min(1, fMetrics.cols - 1)) {
                              state = "skylight";
                            }
                          }

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
                              className={`rounded-xs transition-all flex items-center justify-center cursor-pointer border ${
                                state === "active"
                                  ? "bg-slate-900/90 border-sky-400 hover:border-amber-400 shadow-2xs"
                                  : state === "skylight"
                                    ? "bg-amber-500/50 border-amber-400"
                                    : state === "hvac"
                                      ? "bg-rose-600/70 border-rose-400"
                                      : "bg-slate-800/20 border-dashed border-slate-600"
                              }`}
                              title={`Slot (${r + 1},${c + 1}): ${state}`}
                            >
                              {state === "active" ? (
                                <div className="w-full h-full flex flex-col justify-center items-center py-0.5">
                                  <div className="w-full h-px bg-sky-300/30 mb-0.5" />
                                  <span className="text-[6.5px] font-bold text-sky-200">{facet.modulePower}W</span>
                                </div>
                              ) : state === "skylight" ? (
                                <span className="text-[6.5px] font-bold text-amber-200">SKY</span>
                              ) : state === "hvac" ? (
                                <span className="text-[6.5px] font-bold text-white">AC</span>
                              ) : null}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Diagonal Measure Overlay */}
                    {isActive && cadTool === "measure" && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
                        <line x1="0" y1="0" x2="100%" y2="100%" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
                        <rect x="35%" y="45%" width="90" height="20" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
                        <text x="50%" y="56%" textAnchor="middle" fontSize="10" fill="#fef08a" fontFamily="Inter" fontWeight="700">
                          Diag: {Math.sqrt(facet.ridge * facet.ridge + facet.slope * facet.slope).toFixed(2)}m
                        </text>
                      </svg>
                    )}
                  </div>

                  {/* Precision Handles (Active Only) */}
                  {isActive && (
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
                            facet.lat || -6.595038,
                            facet.lng || 106.797241
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

                      {/* Corner Handles (Exact match Image 2: Cyan circle with white dot) */}
                      <div
                        className={`cad-handle absolute -top-2 -left-2 w-4 h-4 rounded-full bg-cyan-400 shadow-md flex items-center justify-center cursor-nwse-resize group border-2 border-white hover:scale-125 transition-all z-20 ${
                          cadTool === "edit_polygon" ? "ring-4 ring-cyan-300/80 animate-pulse scale-110" : ""
                        }`}
                        title="Tarik Sudut Kiri-Atas"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                      <div
                        className={`cad-handle absolute -top-2 -right-2 w-4 h-4 rounded-full bg-cyan-400 shadow-md flex items-center justify-center cursor-nesw-resize group border-2 border-white hover:scale-125 transition-all z-20 ${
                          cadTool === "edit_polygon" ? "ring-4 ring-cyan-300/80 animate-pulse scale-110" : ""
                        }`}
                        title="Tarik Sudut Kanan-Atas"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                      <div
                        className={`cad-handle absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-cyan-400 shadow-md flex items-center justify-center cursor-nesw-resize group border-2 border-white hover:scale-125 transition-all z-20 ${
                          cadTool === "edit_polygon" ? "ring-4 ring-cyan-300/80 animate-pulse scale-110" : ""
                        }`}
                        title="Tarik Sudut Kiri-Bawah"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Bottom-Right Handle (Active Resizer for Ridge and Slope) */}
                      <div
                        className={`cad-handle absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-cyan-400 shadow-md flex items-center justify-center cursor-nwse-resize group border-2 border-white hover:scale-125 transition-all z-20 ${
                          cadTool === "edit_polygon" ? "ring-4 ring-cyan-300/90 animate-pulse scale-125" : ""
                        }`}
                        title="Tarik Sudut Kanan-Bawah untuk Merubah Panjang & Lebar Atap"
                        onMouseDown={(e) =>
                          startDrag(
                            e,
                            facet.id,
                            "br",
                            facet.ridge,
                            facet.slope,
                            facet.rotation,
                            facet.offsetX,
                            facet.offsetY,
                            facet.lat || -6.595038,
                            facet.lng || 106.797241
                          )
                        }
                      >
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>

                      {/* Right Edge Handle (Length Resizer) */}
                      <div
                        className="cad-handle absolute top-1/2 -right-2.5 -translate-y-1/2 w-4 h-6 rounded bg-sky-500 border border-white shadow-md flex items-center justify-center cursor-ew-resize hover:scale-110 transition-all z-20"
                        title="Tarik Sisi Kanan (Ubah Panjang/Ridge)"
                        onMouseDown={(e) =>
                          startDrag(
                            e,
                            facet.id,
                            "r",
                            facet.ridge,
                            facet.slope,
                            facet.rotation,
                            facet.offsetX,
                            facet.offsetY,
                            facet.lat || -6.595038,
                            facet.lng || 106.797241
                          )
                        }
                      >
                        <div className="w-0.5 h-3 bg-white rounded-full" />
                      </div>

                      {/* Bottom Edge Handle (Width Resizer) */}
                      <div
                        className="cad-handle absolute left-1/2 -bottom-2.5 -translate-x-1/2 w-6 h-4 rounded bg-sky-500 border border-white shadow-md flex items-center justify-center cursor-ns-resize hover:scale-110 transition-all z-20"
                        title="Tarik Sisi Bawah (Ubah Lebar/Slope)"
                        onMouseDown={(e) =>
                          startDrag(
                            e,
                            facet.id,
                            "b",
                            facet.ridge,
                            facet.slope,
                            facet.rotation,
                            facet.offsetX,
                            facet.offsetY,
                            facet.lat || -6.595038,
                            facet.lng || 106.797241
                          )
                        }
                      >
                        <div className="w-3 h-0.5 bg-white rounded-full" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Minimalist CAD Toolbar (Modern Frosted Glass) */}
          <div className="absolute top-1/2 -translate-y-1/2 left-4 z-30 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] border border-white/80">
            {/* 1. Select / Move */}
            <button
              type="button"
              onClick={() => {
                setCadTool("select");
                showToast("Mode Pilih & Geser Poligon Aktif");
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "select"
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
              }`}
              title="Pilih & Geser Poligon (Move)"
            >
              <span className="material-symbols-outlined text-[19px]">near_me</span>
            </button>

            {/* 2. Edit Polygon / Vertices */}
            <button
              type="button"
              onClick={() => {
                setCadTool("edit_polygon");
                setActiveTab("geometry");
                showToast("Mode Edit Simpul & Dimensi Poligon");
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

            {/* 3. Rectangle Tool */}
            <button
              type="button"
              onClick={() => {
                setRoofShape("rectangle");
                showToast("Bentuk Poligon: Persegi (Gable)");
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                activeFacet.shape === "rectangle" && cadTool !== "select" && cadTool !== "edit_polygon" && cadTool !== "measure"
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
              }`}
              title="Bentuk Persegi Standar"
            >
              <span className="material-symbols-outlined text-[19px]">crop_landscape</span>
            </button>

            {/* 4. Measure */}
            <button
              type="button"
              onClick={() => {
                setCadTool(cadTool === "measure" ? "select" : "measure");
                showToast(cadTool === "measure" ? "Mode pengukuran dimatikan" : "Mode Penggaris & Ukur Dimensi CAD");
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "measure"
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
              }`}
              title="Ukur Jarak & Dimensi Diagonal"
            >
              <span className="material-symbols-outlined text-[19px]">straighten</span>
            </button>

            <div className="w-6 h-px bg-slate-200 my-0.5" />

            {/* Zoom In, Zoom Out */}
            <button
              type="button"
              onClick={() => {
                setZoomScale((z) => Math.min(2.2, z + 0.15));
                if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              title="Perbesar (Zoom In)"
            >
              <span className="material-symbols-outlined text-[19px]">add</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setZoomScale((z) => Math.max(0.6, z - 0.15));
                if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              title="Perkecil (Zoom Out)"
            >
              <span className="material-symbols-outlined text-[19px]">remove</span>
            </button>
          </div>

          {/* Bottom Left: Compass Rose (Exact Match Image 2) */}
          <div className="absolute bottom-6 left-4 z-30">
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([activeFacet.lat || -6.595038, activeFacet.lng || 106.797241], 21);
                }
                showToast("Peta diorientasikan ke Utara & dipusatkan ke atap");
              }}
              className="w-10 h-10 rounded-full bg-white/95 text-slate-800 border border-slate-200 shadow-md flex flex-col items-center justify-center hover:border-amber-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Orientasi Utara & Pusatkan ke Atap"
            >
              <span className="text-[10px] font-black font-mono text-slate-900 leading-none">N</span>
              <span className="material-symbols-outlined text-[13px] text-amber-500 -mt-0.5">navigation</span>
            </button>
          </div>
        </div>

        {/* =======================================================
            RIGHT: INSPECTOR & PARAMETER STUDIO
            ======================================================= */}
        <div
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

          <div className="w-full lg:w-[380px] shrink-0 h-full flex flex-col overflow-hidden bg-white">
            {/* Eco-Forest Diorama & Ribbon */}
            <div className="p-3 pb-2.5 bg-slate-50/70 border-b border-slate-200 shrink-0">
              <div className="relative w-full h-28 rounded-xl bg-gradient-to-b from-sky-200/90 via-sky-100/60 to-emerald-100/80 border border-sky-200/80 overflow-hidden shadow-inner flex flex-col justify-between p-2">
                <div className="relative z-10 flex items-start justify-between w-full">
                  <div>
                    <span className="text-[10px] font-semibold text-sky-950/70 block leading-tight">Dampak ekologis</span>
                    <span className="text-[11px] text-sky-900/60 block leading-tight mt-0.5">reduksi emisi setara</span>
                    <span className="text-[15px] font-bold text-slate-900 tracking-tight leading-none mt-0.5 block">
                      {calc.treesEquivalent.toLocaleString("id-ID")} pohon
                    </span>
                  </div>
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
                      {ECO_TREE_CONFIGS.filter((t) => t.layer === "back").map((cfg, idx) => (
                        <g key={cfg.id} transform={`translate(${cfg.x}, ${cfg.y}) scale(${cfg.scale})`}>
                          <g
                            className={`eco-tree-stem ${idx < activeTreeCount / 3 ? "sprouted" : "dormant"}`}
                          >
                            <g className={`eco-breeze-${(cfg.id % 3) + 1}`}>
                              {renderTreeSvg(cfg.type)}
                            </g>
                          </g>
                        </g>
                      ))}
                    </g>

                    <path d="M 0 64 Q 80 48, 165 58 T 340 52 L 340 95 L 0 95 Z" fill="url(#hillGradMid)" opacity="0.95" />
                    <g>
                      {ECO_TREE_CONFIGS.filter((t) => t.layer === "mid").map((cfg, idx) => (
                        <g key={cfg.id} transform={`translate(${cfg.x}, ${cfg.y}) scale(${cfg.scale})`}>
                          <g
                            className={`eco-tree-stem ${idx < activeTreeCount / 3 ? "sprouted" : "dormant"}`}
                          >
                            <g className={`eco-breeze-${(cfg.id % 3) + 1}`}>
                              {renderTreeSvg(cfg.type)}
                            </g>
                          </g>
                        </g>
                      ))}
                    </g>

                    <path d="M 0 76 Q 95 64, 190 72 T 340 68 L 340 95 L 0 95 Z" fill="url(#hillGradFront)" />
                    <g>
                      {ECO_TREE_CONFIGS.filter((t) => t.layer === "front").map((cfg, idx) => (
                        <g key={cfg.id} transform={`translate(${cfg.x}, ${cfg.y}) scale(${cfg.scale})`}>
                          <g
                            className={`eco-tree-stem ${idx < activeTreeCount / 3 ? "sprouted" : "dormant"}`}
                          >
                            <g className={`eco-breeze-${(cfg.id % 3) + 1}`}>
                              {renderTreeSvg(cfg.type)}
                            </g>
                          </g>
                        </g>
                      ))}
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
              <div className="grid grid-cols-4 divide-x divide-slate-200 bg-white rounded-xl border border-slate-200 shadow-xs py-2 px-0.5 mt-2">
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

            {/* Navigation Tabs */}
            <div className="grid grid-cols-3 bg-white border-b border-slate-200 px-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("geometry")}
                className={`pb-2.5 text-center font-title text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "geometry"
                    ? "text-amber-600 font-bold border-b-2 border-amber-600"
                    : "text-slate-500 hover:text-slate-800 font-medium border-b-2 border-transparent"
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${activeTab === "geometry" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                  1
                </span>
                <span>Geometri</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pvarray")}
                className={`pb-2.5 text-center font-title text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "pvarray"
                    ? "text-amber-600 font-bold border-b-2 border-amber-600"
                    : "text-slate-500 hover:text-slate-800 font-medium border-b-2 border-transparent"
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${activeTab === "pvarray" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                  2
                </span>
                <span>Modul Surya</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("financials")}
                className={`pb-2.5 text-center font-title text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "financials"
                    ? "text-amber-600 font-bold border-b-2 border-amber-600"
                    : "text-slate-500 hover:text-slate-800 font-medium border-b-2 border-transparent"
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${activeTab === "financials" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                  3
                </span>
                <span>Finansial</span>
              </button>
            </div>

            {/* TAB PANES */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "geometry" && (
                <div className="p-4 space-y-4">
                  {/* Multi-Polygon Facet Switcher Strip */}
                  <div className="rounded-xl bg-slate-100/90 p-2.5 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-amber-600">layers</span>
                        <span className="font-title text-xs font-bold text-slate-900">Bidang Atap ({facets.length})</span>
                      </div>
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

                    {/* Horizontal Pill Strip for Facets */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {facets.map((facet, idx) => {
                        const isActive = facet.id === activeFacetId;
                        return (
                          <div
                            key={facet.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium shrink-0 transition-all cursor-pointer ${
                              isActive
                                ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.15),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                                : "bg-white/80 hover:bg-white text-slate-700 border-slate-200/80"
                            }`}
                            onClick={() => setActiveFacetId(facet.id)}
                          >
                            <span className={`w-2 h-2 rounded-full ${isActive ? "bg-amber-600" : "bg-slate-400"}`} />
                            <span className="font-bold">{facet.name || `Bidang #${idx + 1}`}</span>
                            <span className={`text-[10px] ${isActive ? "text-amber-900" : "text-slate-400"}`}>
                              ({facet.ridge.toFixed(1)}m × {facet.slope.toFixed(1)}m)
                            </span>
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
                  </div>

                  {/* Shape Presets & Polygon Editing */}
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-title text-xs font-bold text-slate-900">Alat Edit Poligon &amp; Bentuk</span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold font-code-metric">
                        {roofShape}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRoofShape("rectangle")}
                        className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          roofShape === "rectangle"
                            ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                            : "bg-white/80 text-slate-700 border-slate-200/80 hover:bg-slate-50"
                        }`}
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
                      >
                        <span className="material-symbols-outlined text-[16px]">change_history</span>
                        <span className="text-[10px] font-bold">Limasan</span>
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
                          X: {offsetX}px, Y: {offsetY}px
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setOffsetX((x) => x - 10)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Geser Kiri"
                          >
                            <span className="material-symbols-outlined text-[14px]">arrow_left</span>
                          </button>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => setOffsetY((y) => y - 10)}
                              className="w-6 h-3 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                              title="Geser Atas"
                            >
                              <span className="material-symbols-outlined text-[12px]">arrow_drop_up</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setOffsetY((y) => y + 10)}
                              className="w-6 h-3 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                              title="Geser Bawah"
                            >
                              <span className="material-symbols-outlined text-[12px]">arrow_drop_down</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setOffsetX((x) => x + 10)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Geser Kanan"
                          >
                            <span className="material-symbols-outlined text-[14px]">arrow_right</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOffsetX(0);
                            setOffsetY(0);
                            showToast("Poligon dipusatkan ke atap");
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">filter_center_focus</span>
                          <span>Pusatkan ke Atap</span>
                        </button>
                      </div>
                    </div>

                    {/* Obstacles Detection & Management */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-200/70">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">Deteksi &amp; Rintangan Atap</span>
                        <span className="font-code-metric text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          {(hasHvac ? 1 : 0) + (hasSkylight ? 1 : 0)} Rintangan Aktif
                        </span>
                      </div>
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
                          <span>{hasHvac ? "HVAC Aktif (AC)" : "+ HVAC Chiller"}</span>
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
                  </div>

                  {/* Surface Dimensions */}
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
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
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
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
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
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
                    </div>
                  </div>

                  {/* Batas Keamanan & Jalur Talang */}
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
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
                <div className="p-4 space-y-4">
                  {/* Module Selection Card */}
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
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
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
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
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
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
                          className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            orientation === "portrait"
                              ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                              : "bg-white/80 text-slate-700 border-slate-200/80 hover:bg-slate-50"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">stay_current_portrait</span>
                          <span>Potret (Tegak)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrientation("landscape")}
                          className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            orientation === "landscape"
                              ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold"
                              : "bg-white/80 text-slate-700 border-slate-200/80 hover:bg-slate-50"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">stay_current_landscape</span>
                          <span>Lanskap (Mendatar)</span>
                        </button>
                      </div>
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
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
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
                        <span className="text-[10px] text-slate-500 block">Total Modul</span>
                        <span className="font-bold text-slate-900 text-sm">{calc.modulesFitted} Unit</span>
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
                        <span className="font-bold text-slate-900 text-sm font-code-metric">{(calc.modulesFitted * calc.currentSpec.w * calc.currentSpec.l).toFixed(1)} m²</span>
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
                <div className="p-4 space-y-4">
                  {/* Tariff & Bill */}
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-title text-xs font-bold text-slate-900">Parameter Tarif &amp; Tagihan PLN</span>
                      <span className="material-symbols-outlined text-amber-600 text-[18px]">bolt</span>
                    </div>
                    <select
                      value={plnTariff}
                      onChange={(e) => setPlnTariff(Number(e.target.value))}
                      className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="1700">R-2 / TR (3.500 – 5.500 VA) — Rp 1.700/kWh</option>
                      <option value="1444.7">R-1 / TR (1.300 – 2.200 VA) — Rp 1.444,70/kWh</option>
                      <option value="1444.7">B-2 / TR Bisnis Komersial — Rp 1.444,70/kWh</option>
                    </select>

                    <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">Tagihan Listrik Bulanan</span>
                        <span className="font-code-metric font-extrabold text-slate-900">{formatRp(monthlyBill)}</span>
                      </div>
                      <input
                        type="range"
                        min="500000"
                        max="15000000"
                        step="100000"
                        value={monthlyBill}
                        onChange={(e) => setMonthlyBill(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                        <span>Pengeluaran Listrik PLN Tahunan:</span>
                        <span className="font-bold text-slate-800 font-code-metric">{formatRp(monthlyBill * 12)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dampak Lingkungan & Penyerapan Karbon */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-600 text-[18px]">forest</span>
                        <span className="font-title text-xs font-bold text-emerald-950">Dampak Lingkungan &amp; Penyerapan Karbon</span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Standar ESDM 2024
                      </span>
                    </div>

                    <div className="p-3 grid grid-cols-2 gap-3 divide-x divide-slate-200 bg-white">
                      <div className="flex flex-col items-center text-center gap-0.5">
                        <p className="text-[10px] text-slate-500 font-semibold">Reduksi Emisi CO2</p>
                        <p className="text-sm font-extrabold text-emerald-700">
                          {calc.co2ReductionTon.toFixed(1)} <span className="text-xs font-normal text-slate-500">Ton / thn</span>
                        </p>
                        <span className="text-[9px] text-emerald-600 font-medium">Berdasarkan 0.80 kg/kWh</span>
                      </div>
                      <div className="flex flex-col items-center text-center gap-0.5">
                        <p className="text-[10px] text-slate-500 font-semibold">Ekivalen Penanaman Pohon</p>
                        <p className="text-sm font-extrabold text-sky-700">
                          {calc.treesEquivalent.toLocaleString("id-ID")} <span className="text-xs font-normal text-slate-500">Pohon</span>
                        </p>
                        <span className="text-[9px] text-sky-600 font-medium">Serapan ~22 kg/pohon/thn</span>
                      </div>
                    </div>

                    <div className="px-3 py-2 bg-emerald-50/70 border-t border-emerald-100 flex items-center justify-between text-[10px] text-emerald-900 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">park</span>
                        <span>Simulasi hutan hidup aktif pada visualizer atas</span>
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Live Studio
                      </span>
                    </div>
                  </div>

                  {/* Savings & Payback */}
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-title text-xs font-bold text-slate-900">Performa Finansial &amp; ROI</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        -{calc.coveragePct}% Beban PLN
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
                        <span className="text-[10px] text-emerald-800 font-semibold block">Penghematan Bulanan</span>
                        <span className="font-title text-sm font-extrabold text-emerald-700 block mt-0.5">
                          {formatRp(calc.cappedSaving)}
                        </span>
                        <span className="font-code-metric text-[9px] text-emerald-800">/ bulan rata-rata</span>
                      </div>
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
                        <span className="text-[10px] text-amber-800 font-semibold block">Payback Period</span>
                        <span className="font-title text-sm font-extrabold text-amber-700 block mt-0.5">
                          {calc.paybackYears ? calc.paybackYears.toFixed(1) : "—"} Tahun
                        </span>
                        <span className="font-code-metric text-[9px] text-amber-800">IRR {calc.irr}%</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-2.5 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-medium">Estimasi Hemat 25 Tahun</span>
                        <span className="font-title text-sm font-extrabold text-slate-900">{formatRp(calc.cumulative25)}</span>
                      </div>
                      <span className="material-symbols-outlined text-emerald-600 text-[24px]">savings</span>
                    </div>
                  </div>

                  {/* Interactive ROI Chart & 2x2 Strip */}
                  <div className="rounded-xl bg-white border border-slate-200 p-3.5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-emerald-600 text-[17px]">trending_up</span>
                          Proyeksi Arus Kas Bersih Kumulatif
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Analisis Finansial 25 Tahun &amp; Titik Impas (BEP)</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/90 px-2.5 py-1 rounded-full text-emerald-800 text-[10px] font-bold shadow-2xs whitespace-nowrap shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>BEP: Thn {calc.bepYear}</span>
                      </div>
                    </div>

                    {/* Spacious 2x2 Real-time Inspector Stat Strip */}
                    <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/90 text-left">
                      <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Tahun Proyeksi</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                            currentInspectCashFlow >= 0 ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : currentInspectYear === calc.bepYear ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-rose-100 text-rose-800 border border-rose-200"
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
                        <span className={`font-title text-xs font-extrabold block mt-1 ${
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

                    {/* Interactive Chart */}
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
                            <stop offset="18%" stopColor="#f59e0b" />
                            <stop offset="22%" stopColor="#10b981" />
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
                        <g transform={`translate(${mapChartX(calc.bepYear)}, ${zeroY})`}>
                          <circle cx="0" cy="0" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                          <text x="0" y="-8" textAnchor="middle" fontSize="7.5" fill="#b45309" fontFamily="Inter" fontWeight="800">
                            ⭐ BEP
                          </text>
                        </g>

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
                          className={`p-1 rounded border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                            currentInspectYear === btn.yr
                              ? "bg-amber-50 border-amber-300 text-amber-900"
                              : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span className="text-[9.5px] font-bold">{btn.label}</span>
                          <span className="text-[8px] text-slate-400">{btn.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collapsible CAPEX Cost Breakdown */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCapexCollapsed((c) => !c)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-title text-xs font-bold text-slate-900 block">Rincian Investasi CAPEX</span>
                        <span className="font-code-metric text-[11px] text-slate-500 font-semibold">Total: {formatRp(calc.totalCapex)}</span>
                      </div>
                      <span
                        className={`material-symbols-outlined text-slate-400 transition-transform duration-200 text-[20px] ${
                          capexCollapsed ? "" : "rotate-180"
                        }`}
                      >
                        expand_more
                      </span>
                    </button>

                    {!capexCollapsed && (
                      <div className="px-3.5 pb-3.5 space-y-1.5 border-t border-slate-200/80 animate-fadeIn">
                        <div className="pt-2 divide-y divide-slate-200/70 text-xs">
                          <div className="py-1 flex justify-between items-center">
                            <span className="text-slate-600">Modul Surya ({calc.modulesFitted}x {modulePower}W)</span>
                            <span className="font-code-metric font-semibold text-slate-900">{formatRp(calc.costModules)}</span>
                          </div>
                          <div className="py-1 flex justify-between items-center">
                            <span className="text-slate-600">Inverter &amp; Kelistrikan AC/DC ({inverterType === "string" ? "Central String" : "Microinverter"})</span>
                            <span className="font-code-metric font-semibold text-slate-900">{formatRp(calc.costInverter)}</span>
                          </div>
                          <div className="py-1 flex justify-between items-center">
                            <span className="text-slate-600">Sistem Racking Aluminium</span>
                            <span className="font-code-metric font-semibold text-slate-900">{formatRp(calc.costRacking)}</span>
                          </div>
                          <div className="py-1 flex justify-between items-center">
                            <span className="text-slate-600">Instalasi, Net-Metering &amp; SLO</span>
                            <span className="font-code-metric font-semibold text-slate-900">{formatRp(calc.costInstall)}</span>
                          </div>
                          <div className="pt-2 mt-1 flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 font-bold">
                            <span className="text-slate-950">Total Investasi</span>
                            <span className="font-code-metric text-sky-700">{formatRp(calc.totalCapex)}</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-[20px]">person</span>
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
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center border border-amber-300">
                  {biodata?.name ? biodata.name.slice(0, 2).toUpperCase() : "MR"}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{biodata?.name || "Mabirizky"}</h4>
                  <p className="text-slate-500">{biodata?.email || "mabirizky05@gmail.com"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Nama Lengkap</label>
                <input
                  type="text"
                  value={biodata?.name || "Mabirizky"}
                  onChange={(e) => setBiodata((b) => (b ? { ...b, name: e.target.value } : null))}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Email Akun</label>
                <input
                  type="email"
                  disabled
                  value={biodata?.email || "mabirizky05@gmail.com"}
                  className="w-full p-2 rounded-lg bg-slate-100 border border-slate-200 font-medium text-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Alamat Properti Rujukan</label>
                <input
                  type="text"
                  value={biodata?.location || addressInput}
                  onChange={(e) => setBiodata((b) => (b ? { ...b, location: e.target.value } : null))}
                  className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 font-medium"
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
        parameters={simulationParamsForModal}
        latitude="-6.5955"
        longitude="106.7995"
        biodata={biodata}
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
