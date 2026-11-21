"use client";

import type * as LeafletNS from "leaflet";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { ConfirmDialog } from "@/components/studio/ConfirmDialog";
import { FinancialTab } from "@/components/studio/FinancialTab";
import { GeometryTab } from "@/components/studio/GeometryTab";
import { ModuleTab } from "@/components/studio/ModuleTab";
import { ProposalModal } from "@/components/studio/ProposalModal";
import { StudioMascotGuide } from "@/components/studio/StudioMascotGuide";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";
import {
  ApiRequestError,
  api,
  getToken,
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
  type GeocodeResult,
  type SimulationDetail,
  type SimulationSummary,
  type RoofObstacleInput,
  type SimulationRoofInput,
} from "@/lib/api";
import { formatRp } from "@/lib/format";
import { hasCompletedStudioGuide, markStudioGuideComplete } from "@/lib/onboarding";
import { getStoredBiodata, type UserBiodata } from "@/lib/profile";
import {
  MAX_FOOTPRINT_M,
  RECOMMENDED_MAX_FOOTPRINT_M,
  RECOMMENDED_MIN_FOOTPRINT_M,
  captureGeometry,
  captureMapForDetection,
  measureMapViewportScale,
  type CapturedMap,
  type MapScaleInfo,
} from "@/lib/roofCapture";
import {
  DEFAULT_ROOF_AZIMUTH_DEG,
  DEFAULT_ROOF_TILT_DEG,
  FALLBACK_FACET,
  GEOCODE_TARGET_ZOOM,
  MODULE_SPECS,
  PRESET_ADDRESSES,
  STUDIO_SAVED_PROJECTS,
  TARIFF_RATES_BY_KEY,
  buildFacetFromDetectedRoof,
  buildFacetFromSavedRoof,
  computeFacetMetrics,
  computePolygonArea,
  designSignatureOf,
  facetPolygonPx,
  getFacetVertices,
  insetPolygon,
  moduleKeyForPower,
  optimizeFacetConfiguration,
  pointInPolygon,
  polygonBounds,
  polygonInsideImage,
  polygonPerimeter,
  roundMeters,
  slotPolygonPx,
  tariffKeyForRate,
  type CadTool,
  type CvLayer,
  type DragGroupTarget,
  type DragMode,
  type DragState,
  type EdgeDragState,
  type EdgeHoverState,
  type InverterType,
  type ModuleRecommendation,
  type Orientation,
  type PanelSlotItem,
  type Point2D,
  type RoofFacet,
  type RoofShape,
  type SlotState,
  type VertexDragState,
} from "@/lib/studioPhysics";

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

type WindowWithLeaflet = Window & { L?: typeof LeafletNS };

function getWindowLeaflet(): typeof LeafletNS | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as WindowWithLeaflet).L;
}

function StudioPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Studio memanggil endpoint terlindungi (geocode, deteksi, simpan). Tanpa token,
   * arahkan ke halaman masuk sebelum peta dan permintaan dimulai.
   */
  useEffect(() => {
    if (getToken() === null) {
      router.replace("/login");
    }
  }, [router]);

  // Floating Capsule Navigation State (X-like bubble)
  const [capsuleExpanded, setCapsuleExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Layers & CAD Tools State
  const [activeLayer, setActiveLayer] = useState<CvLayer>("satellite");
  const [baseMap, setBaseMap] = useState<"satellite" | "osm">("satellite");
  const [showStreetLabels, setShowStreetLabels] = useState(true);
  const [showCadGrid, setShowCadGrid] = useState(true);
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
  // Panduan dibuka setelah hidrasi bila pengguna belum pernah menutup/melewatinya
  // dan sedang tidak membuka simulasi tersimpan (`?analysis=…`).
  const [mascotGuideOpen, setMascotGuideOpen] = useState(false);
  const [studioGuideCompleted, setStudioGuideCompleted] = useState(false);

  // Address search input (Defaulted to Kota Bogor)
  const [addressInput, setAddressInput] = useState("Komp. Baranangsiang Indah Blok C, Bogor Timur, Kota Bogor");
  const [projectName, setProjectName] = useState("");
  const [hasCustomProjectName, setHasCustomProjectName] = useState(false);
  const searchAnchorRef = useRef<{ label: string; lat: number; lng: number } | null>(null);
  const hasCustomProjectNameRef = useRef(false);
  useEffect(() => {
    hasCustomProjectNameRef.current = hasCustomProjectName;
  }, [hasCustomProjectName]);

  // Mouse HUD for Radiometer (real GHI & polygon POA calculation)
  const [probePos, setProbePos] = useState<{
    x: number;
    y: number;
    ghi: number;
    pct: number;
    label: string;
  } | null>(null);

  // Multi-Polygon Roof Facets State & Selection
  // Daftar dimulai kosong: seluruh bidang berasal dari hasil deteksi model,
  // ditambah poligon yang digambar sendiri oleh pengguna bila perlu.
  const [facets, setFacets] = useState<RoofFacet[]>([]);
  const facetsCountRef = useRef(0);
  useEffect(() => {
    facetsCountRef.current = facets.length;
  }, [facets.length]);
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
  const [edgeHover, setEdgeHover] = useState<EdgeHoverState | null>(null);
  const [edgeDragState, setEdgeDragState] = useState<EdgeDragState | null>(null);
  // Menandai tarikan sisi yang benar-benar berpindah; tanpa ini klik biasa pada sisi
  // akan dianggap tarikan dan simpul baru tidak pernah disisipkan.
  const edgeDragMovedRef = useRef(false);
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

  /**
   * Rincian lengkap simulasi yang dibuka. Dipakai proposal supaya angka yang
   * dicetak adalah angka tersimpan, termasuk asumsi dan rincian CAPEX.
   */
  const [serverDetail, setServerDetail] = useState<SimulationDetail | null>(null);

  /**
   * Id simulasi yang sedang diedit. Selama terisi, tombol simpan memperbarui baris
   * itu, bukan membuat salinan baru setiap kali.
   */
  const [openedSimulationId, setOpenedSimulationId] = useState<number | null>(null);

  /**
   * Tanda masukan global terakhir yang sudah diterapkan. Dipakai efek di bawah
   * untuk membedakan perubahan pengguna dari nilai yang baru dipulihkan, supaya
   * membuka simulasi tidak langsung mengosongkan angka servernya.
   */
  const lastGlobalInputSignature = useRef<string | null>(null);

  /** Hasil pencarian alamat yang menunggu dipilih pengguna (lebih dari satu). */
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [detectedRoofs, setDetectedRoofs] = useState<DetectedRoof[]>([]);
  const [selectedDetectedIds, setSelectedDetectedIds] = useState<string[]>([]);
  const [showDetectedRoofs, setShowDetectedRoofs] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [selectionDone, setSelectionDone] = useState(false);
  /** Skala meter & cakupan viewport peta saat ini (diperbarui saat pan/zoom/resize). */
  const [viewportScale, setViewportScale] = useState<MapScaleInfo | null>(null);

  /** Tangkapan di luar cakupan terbaik yang menunggu persetujuan pengguna. */
  const [scanConfirm, setScanConfirm] = useState<{ capture: CapturedMap } | null>(null);

  // Pratinjau tangkapan sebagai object URL; ditampilkan sebagai image overlay
  // pada bbox yang sama dengan yang dikirim ke model.
  const [capturePreviewUrl, setCapturePreviewUrl] = useState<string | null>(null);

  // Map synchronization state for real-time scale & position tracking
  const [mapTick, setMapTick] = useState(0);

  // Background Leaflet Map refs & status
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<LeafletNS.Map | null>(null);
  const mapInstanceRef = useRef<LeafletNS.Map | null>(null);
  const esriSatelliteLayerRef = useRef<LeafletNS.TileLayer | null>(null);
  const osmStreetLayerRef = useRef<LeafletNS.TileLayer | null>(null);
  const labelsLayerRef = useRef<LeafletNS.TileLayer | null>(null);

  // Layer bidang kandidat hasil deteksi, dikunci per id bidang.
  const detectionLayersRef = useRef<Map<string, LeafletNS.Polygon>>(new Map());

  // Other Studio System Parameters (dideklarasikan di atas efek pemulihan `?analysis=`)
  const [extraTilt, setExtraTilt] = useState(10);
  const [shadingLossPct, setShadingLossPct] = useState(0);
  const [inverterType, setInverterType] = useState<InverterType>("string");
  const [plnTariff, setPlnTariff] = useState(1700);
  const [monthlyBill, setMonthlyBill] = useState(2_800_000);

  /*
   * Pembanding rancangan tersimpan (`null` = belum ditetapkan; ditetapkan sekali saat
   * mount dari rancangan kosong, lalu diperbarui saat simpan atau pemulihan `?analysis=`).
   */
  const savedDesignSignatureRef = useRef<string | null>(null);

  // Toast notification timer
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setCadToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setCadToast(null);
    }, 3400);
  }, []);

  // Exact Real-World Physical Scale (Pixels per meter based on Web Mercator & Latitude)
  const pixelsPerMeter = useMemo(() => {
    void mapTick;
    void mapLoaded;
    if (mapInstance) {
      try {
        const center = mapInstance.getCenter();
        const lat = center.lat;
        const z = mapInstance.getZoom();
        const metersPerPixel =
          (40075016.686 * Math.abs(Math.cos((lat * Math.PI) / 180))) / Math.pow(2, z + 8);
        return Math.max(1, 1 / metersPerPixel);
      } catch {
        // fallback
      }
    }
    return 15 * zoomScale;
  }, [mapInstance, mapTick, zoomScale, mapLoaded]);

  // Screen Position Projection from Leaflet Geographic Coordinates
  const getFacetScreenPosition = useCallback(
    (facet: RoofFacet) => {
      void mapTick;
      void mapLoaded;
      if (mapInstance && facet.lat && facet.lng) {
        try {
          const pt = mapInstance.latLngToContainerPoint([facet.lat, facet.lng]);
          return { x: pt.x, y: pt.y };
        } catch {
          // fallback
        }
      }
      return null;
    },
    [mapInstance, mapTick, mapLoaded]
  );

  // Active Facet accessor
  const activeFacet = useMemo(() => {
    return facets.find((f) => f.id === activeFacetId) || facets[0] || FALLBACK_FACET;
  }, [facets, activeFacetId]);

  const updateActiveFacet = useCallback((patch: Partial<RoofFacet>) => {
    // Parameter berubah berarti angka tersimpan tidak lagi mewakili rancangan.
    setServerMetrics(null);
    setServerDetail(null);
    setFacets((prev) =>
      prev.map((f) => (f.id === activeFacetId ? { ...f, ...patch } : f))
    );
  }, [activeFacetId]);

  /**
   * Sama seperti `updateActiveFacet`, tetapi menunjuk bidang lewat id.
   *
   * Dipakai saat menggeser simpul: bidang yang diseret belum tentu bidang aktif pada
   * render pertama sesudah mousedown, jadi menulis ke "yang aktif" dapat mengubah
   * bentuk bidang lain.
   */
  const updateFacetById = useCallback((facetId: string, patch: Partial<RoofFacet>) => {
    setServerMetrics(null);
    setServerDetail(null);
    setFacets((prev) => prev.map((f) => (f.id === facetId ? { ...f, ...patch } : f)));
  }, []);

  /**
   * Membuat strip daftar bidang dapat digulir mendatar dengan roda tetikus.
   *
   * Strip-nya memang `overflow-x-auto`, tetapi roda tetikus hanya mengirim `deltaY`,
   * sehingga daftar tidak bergerak sama sekali ketika bidangnya melebihi lebar panel
   * dan satu-satunya cara adalah menarik scrollbar setinggi enam piksel. Pendengar
   * dipasang native karena React mendaftarkan `wheel` sebagai passive, dan
   * `preventDefault` dari `onWheel` diabaikan.
   */
  const bindFacetStripScroll = useCallback((node: HTMLDivElement | null) => {
    if (node === null) return;

    node.addEventListener(
      "wheel",
      (event: WheelEvent) => {
        if (node.scrollWidth <= node.clientWidth) return;

        // Geseran mendatar dari trackpad dibiarkan apa adanya; roda tetikus yang
        // hanya punya `deltaY` diterjemahkan menjadi gulir mendatar.
        const delta =
          Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

        if (delta === 0) return;

        event.preventDefault();
        node.scrollLeft += delta;
      },
      { passive: false }
    );
  }, []);

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
      const leaflet = getWindowLeaflet();
      if (mapInstanceRef.current && leaflet && base.lat && base.lng && (shiftX || shiftY)) {
        try {
          const pt = mapInstanceRef.current.latLngToContainerPoint([base.lat, base.lng]);
          const ll = mapInstanceRef.current.containerPointToLatLng(leaflet.point(pt.x + shiftX, pt.y + shiftY));
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

  const lastAppliedParamsKeyRef = useRef<string | null>(null);

  // Synchronize initial map location from URL query params (runs once per URL search change,
  // never re-applying when the user draws/switches polygons).
  useEffect(() => {
    const paramsKey = searchParams.toString();
    if (lastAppliedParamsKeyRef.current === paramsKey) return;

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

    const rafId = requestAnimationFrame(() => {
      lastAppliedParamsKeyRef.current = paramsKey;
      if (pName || pLat || pRidge) {
        if (pName) {
          setAddressInput(pName);
        }
        const latNum = pLat ? Number(pLat) : null;
        const lngNum = pLng ? Number(pLng) : null;
        const zoomNum = pZoom ? Number(pZoom) : null;

        if (pRidge || pSlope || pTilt || pRot || pShape || pPower) {
          setFacets((prev) => {
            if (prev.length === 0) return prev;
            const targetId = prev[0].id;
            return prev.map((f) =>
              f.id === targetId
                ? {
                    ...f,
                    ...(pName ? { name: pName } : {}),
                    ...(latNum !== null && !isNaN(latNum) ? { lat: latNum } : {}),
                    ...(lngNum !== null && !isNaN(lngNum) ? { lng: lngNum } : {}),
                    ...(pRidge && !isNaN(Number(pRidge)) ? { ridge: Number(pRidge) } : {}),
                    ...(pSlope && !isNaN(Number(pSlope)) ? { slope: Number(pSlope) } : {}),
                    ...(pTilt && !isNaN(Number(pTilt)) ? { pitch: Number(pTilt) } : {}),
                    ...(pRot && !isNaN(Number(pRot)) ? { rotation: Number(pRot) } : {}),
                    ...(pShape ? { shape: pShape } : {}),
                    ...(pPower && !isNaN(Number(pPower)) ? { modulePower: Number(pPower) } : {}),
                  }
                : f
            );
          });
        }

        if (latNum !== null && lngNum !== null && !isNaN(latNum) && !isNaN(lngNum) && mapInstanceRef.current) {
          // `zoom` berasal dari `map_zoom` respons server, sehingga proyek tersimpan
          // terbuka lagi pada tampilan yang sama.
          const zoom = zoomNum !== null && !isNaN(zoomNum) ? zoomNum : 21;
          mapInstanceRef.current.setView([latNum, lngNum], zoom);
        }
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [searchParams]);

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

        // Masukan global ikut dipulihkan: tanpa ini simulasi lama tampil dengan
        // tagihan, tarif, dan inverter bawaan, lalu tersimpan ulang dengan nilai
        // yang berbeda dari aslinya.
        const restoredSunHour = detail.input.sun_hour ?? 12;
        const restoredExtraTilt = detail.input.extra_tilt ?? 10;
        const restoredRate = TARIFF_RATES_BY_KEY[detail.input.tariff_key] ?? 1700;
        const basePr = 0.82 * (detail.input.inverter_type === "string" ? 0.984 : 0.975);
        const inferredShadingRaw =
          detail.assumptions?.performance_ratio && basePr > 0
            ? Math.round((1 - detail.assumptions.performance_ratio / basePr) * 100)
            : 0;
        const restoredShading =
          inferredShadingRaw >= 15 ? 20 : inferredShadingRaw >= 5 ? 10 : 0;

        setInverterType(detail.input.inverter_type);
        setMonthlyBill(detail.input.monthly_bill_idr);
        setPlnTariff(restoredRate);
        setSunHour(restoredSunHour);
        setExtraTilt(restoredExtraTilt);
        setShadingLossPct(restoredShading);

        // Tandai nilai ini sudah dipulihkan supaya efek pengosong metrik tidak
        // menganggapnya perubahan pengguna.
        lastGlobalInputSignature.current =
          `${detail.input.monthly_bill_idr}|${restoredRate}|` +
          `${detail.input.inverter_type}|${restoredSunHour}|${restoredExtraTilt}|${restoredShading}`;

        const restoredAddress = detail.address ?? "Proyek tersimpan";
        const savedLabel = detail.address?.trim() ?? "";

        setFacets(restored);
        setServerMetrics(detail.result);
        setServerDetail(detail);
        setOpenedSimulationId(detail.id);
        setSelectedFacetIds(restored.map((facet) => facet.id));
        setActiveFacetId(restored[restored.length - 1].id);
        setSelectionDone(true);
        setShowDetectedRoofs(false);
        setAddressInput(restoredAddress);
        setProjectName(savedLabel);
        setHasCustomProjectName(savedLabel !== "");
        searchAnchorRef.current = savedLabel
          ? { label: savedLabel, lat: detail.center_point.lat, lng: detail.center_point.lng }
          : null;
        if (savedLabel === "") {
          void api
            .reverseGeocode(detail.center_point.lat, detail.center_point.lng)
            .then((rev) => {
              if (rev.label && !hasCustomProjectNameRef.current) {
                setProjectName(rev.label);
              }
            })
            .catch(() => {});
        }

        // Perbarui pembanding rancangan tersimpan agar membuka simulasi lama tanpa
        // modifikasi tidak langsung memicu konfirmasi "Keluar tanpa menyimpan?".
        savedDesignSignatureRef.current = designSignatureOf({
          facets: restored,
          addressInput: restoredAddress,
          monthlyBill: detail.input.monthly_bill_idr,
          plnTariff: restoredRate,
          inverterType: detail.input.inverter_type,
          sunHour: restoredSunHour,
          extraTilt: restoredExtraTilt,
          shadingLossPct: restoredShading,
        });

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
    setServerDetail(null);
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
   *
   * Tangkapan yang cakupannya di luar rentang terbaik tidak langsung dikirim: hasil
   * model menurun tajam di luar 180–230 m (`RECOMMENDED_MIN_FOOTPRINT_M`), jadi
   * pengguna diberi pilihan lewat dialog. Tangkapan yang sudah dibuat disimpan di
   * `scanConfirm` agar konfirmasi tidak mengulang pengambilan ubin.
   */
  const runRoofDetection = useCallback(
    async (confirmedCapture?: CapturedMap) => {
      const map = mapInstanceRef.current;

      if (!map && confirmedCapture === undefined) {
        showToast("Peta belum siap. Tunggu sebentar, lalu pindai ulang.");
        return;
      }

      setIsAiScanning(true);
      setShowDetectedRoofs(false);
      setSelectionDone(false);
      setSelectedDetectedIds([]);

      try {
        // Pastikan layer satelit Esri aktif bila pengguna sedang melihat peta jalan OSM
        if (
          confirmedCapture === undefined &&
          map &&
          esriSatelliteLayerRef.current &&
          !map.hasLayer(esriSatelliteLayerRef.current)
        ) {
          if (osmStreetLayerRef.current && map.hasLayer(osmStreetLayerRef.current)) {
            map.removeLayer(osmStreetLayerRef.current);
          }
          esriSatelliteLayerRef.current.addTo(map);
          setBaseMap("satellite");
        }

        const capture =
          confirmedCapture ??
          (map
            ? await captureMapForDetection(map, {
                layer: esriSatelliteLayerRef.current,
              })
            : null);
        if (!capture) return;

        // Cakupan yang tampil diperiksa, bukan dipaksakan: zoom tidak diubah, jadi
        // pengguna yang memutuskan apakah area seluas ini masih layak dipindai.
        const footprintOutOfRange =
          capture.footprintM < RECOMMENDED_MIN_FOOTPRINT_M ||
          capture.footprintM > RECOMMENDED_MAX_FOOTPRINT_M;

        if (confirmedCapture === undefined && footprintOutOfRange) {
          // Cakupan di luar rentang bukan alasan menolak, tetapi hasilnya memang
          // menurun tajam: pada 90 m model hanya menemukan satu bidang (confidence
          // 0,45) sedangkan pada 150-300 m ditemukan 8-12 bidang (0,72-0,78).
          setScanConfirm({ capture });
          return;
        }

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
    },
    [detectionErrorMessage, revealCaptureArea, showToast]
  );

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

    // Bidang yang ditambahkan mengubah rancangan, jadi angka tersimpan tidak
    // lagi mewakili apa yang tampil.
    setServerMetrics(null);
    setServerDetail(null);
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
        mapInstanceRef.current.flyTo([latitude, longitude], GEOCODE_TARGET_ZOOM, { duration: 1.2 });
      }

      setAddressInput("Lokasi GPS Terkini");
      searchAnchorRef.current = null;
      if (!hasCustomProjectNameRef.current) {
        setProjectName("");
      }
      setFacets([]);
      setSelectedFacetIds([]);
      setServerMetrics(null);
      setServerDetail(null);
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
    (e: ReactMouseEvent | ReactPointerEvent, facetId: string, vertexIdx: number) => {
      if (cadTool === "measure") return;
      e.stopPropagation();
      e.preventDefault();
      try {
        mapInstanceRef.current?.dragging?.disable();
      } catch {}
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
        rotation: facet.rotation,
      });
    },
    [cadTool, facets, activeFacet]
  );

  /**
   * Memulai tarikan pada satu sisi poligon.
   *
   * Sisi tidak punya titik sendiri, jadi menyeretnya menggeser kedua simpul ujungnya
   * dengan vektor yang sama: panjang sisi tetap, tetapi karena simpul lain diam, luas
   * bidang justru membesar atau mengecil ke arah tarikan. `insertAt` menyimpan titik di
   * sisi yang ditunjuk saat mousedown, sehingga mode `insert` masih bisa menambah simpul
   * ketika tarikan berakhir tanpa perpindahan (yaitu klik).
   */
  const startEdgeDrag = useCallback(
    (
      e: ReactMouseEvent | ReactPointerEvent,
      facetId: string,
      edgeIdx: number
    ) => {
      if (cadTool === "measure") return;
      e.stopPropagation();
      e.preventDefault();
      try {
        mapInstanceRef.current?.dragging?.disable();
      } catch {}
      setActiveFacetId(facetId);

      const facet = facets.find((f) => f.id === facetId) ?? activeFacet;

      edgeDragMovedRef.current = false;
      setEdgeDragState({
        facetId,
        edgeIdx,
        startX: e.clientX,
        startY: e.clientY,
        initVertices: getFacetVertices(facet).map((v) => ({ ...v })),
        initOx: facet.offsetX,
        initOy: facet.offsetY,
        initLat: facet.lat,
        initLng: facet.lng,
        rotation: facet.rotation,
      });
    },
    [cadTool, facets, activeFacet, setActiveFacetId]
  );

  /**
   * Menyisipkan simpul baru pada satu sisi poligon yang sudah ada (khusus Pen Tool).
   */
  const insertVertexOnEdge = useCallback(
    (facetId: string, edgeIdx: number, point: Point2D) => {
      const target = facets.find((facet) => facet.id === facetId) ?? activeFacet;
      const currentVertices = getFacetVertices(target);

      const newVertices = [
        ...currentVertices.slice(0, edgeIdx + 1),
        {
          x: Math.round(point.x * 1000) / 1000,
          y: Math.round(point.y * 1000) / 1000,
        },
        ...currentVertices.slice(edgeIdx + 1),
      ];

      updateFacetById(facetId, {
        ...buildPolygonPatch(newVertices, target),
        slotOverrides: {},
      });
      setEdgeHover(null);
      showToast(`Simpul baru ditambahkan (${newVertices.length} titik)`);
    },
    [facets, activeFacet, updateFacetById, showToast, buildPolygonPatch]
  );

  const deleteVertex = useCallback(
    (vertexIdx: number, facetId?: string) => {
      // Handle simpul dapat berada di bidang yang dipilih tetapi bukan bidang aktif,
      // jadi penghapusan menunjuk bidang lewat id bila pemanggilnya tahu.
      const target =
        facetId === undefined
          ? activeFacet
          : facets.find((facet) => facet.id === facetId) ?? activeFacet;
      const currentVertices = getFacetVertices(target);

      if (currentVertices.length <= 3) {
        showToast("Minimal poligon harus memiliki 3 simpul!");
        return;
      }

      const patch = {
        ...buildPolygonPatch(currentVertices.filter((_, i) => i !== vertexIdx), target),
        slotOverrides: {},
      };

      if (facetId === undefined) {
        updateActiveFacet(patch);
      } else {
        updateFacetById(facetId, patch);
      }

      showToast(`🗑️ Simpul #${vertexIdx + 1} dihapus (${currentVertices.length - 1} titik tersisa)`);
    },
    [activeFacet, facets, updateActiveFacet, updateFacetById, showToast, buildPolygonPatch]
  );

  const deleteLastVertex = useCallback(() => {
    const currentVertices = getFacetVertices(activeFacet);
    if (currentVertices.length <= 3) {
      showToast("Minimal poligon harus memiliki 3 simpul!");
      return;
    }
    deleteVertex(currentVertices.length - 1);
  }, [activeFacet, deleteVertex, showToast]);

  /**
   * Menghapus satu sisi poligon.
   *
   * Sisi tidak punya identitas sendiri pada ring, jadi menghapus sisi berarti
   * meruntuhkan salah satu sudutnya: simpul ujung sisi itu dibuang dan kedua sisi
   * tetangganya menyatu menjadi satu garis. Itu yang dimaksud pengguna ketika ia
   * menunjuk sisi yang tidak diinginkan — bentuknya menjadi lebih sederhana, bukan
   * berlubang di tengah.
   */
  const deleteEdge = useCallback(
    (facetId: string, edgeIdx: number) => {
      const target =
        facets.find((facet) => facet.id === facetId) ?? activeFacet;
      const currentVertices = getFacetVertices(target);

      if (currentVertices.length <= 3) {
        showToast("Minimal poligon harus memiliki 3 simpul!");
        return;
      }

      // Simpul ujung sisi yang diklik ikut dibuang, sehingga sisi itu benar-benar
      // hilang dan bukan hanya bergeser.
      const removeIdx = (edgeIdx + 1) % currentVertices.length;
      const patch = {
        ...buildPolygonPatch(
          currentVertices.filter((_, i) => i !== removeIdx),
          target
        ),
        slotOverrides: {},
      };

      updateFacetById(facetId, patch);
      showToast(`🗑️ Sisi #${edgeIdx + 1} dihapus (${currentVertices.length - 1} simpul tersisa)`);
    },
    [facets, activeFacet, updateFacetById, showToast, buildPolygonPatch]
  );

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

      // Geo-coordinates projection from Leaflet map at the exact drawn screen center (cx, cy)
      let targetLat = activeFacet.lat || -6.6110;
      let targetLng = activeFacet.lng || 106.8150;
      if (mapInstanceRef.current) {
        try {
          const latLng = mapInstanceRef.current.containerPointToLatLng([cx, cy]);
          if (latLng && Number.isFinite(latLng.lat) && Number.isFinite(latLng.lng)) {
            targetLat = latLng.lat;
            targetLng = latLng.lng;
          }
        } catch {
          try {
            const center = mapInstanceRef.current.getCenter();
            if (center) {
              targetLat = center.lat;
              targetLng = center.lng;
            }
          } catch {}
        }
      }

      const newNum = facets.length + 1;
      const newId = `facet-custom-${Date.now()}`;
      const newFacet: RoofFacet = {
        id: newId,
        name: `Poligon Manual #${newNum}`,
        shape: "custom_polygon",
        ridge,
        slope,
        pitch: 10,
        azimuth: 0,
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
    let spawnLat = (activeFacet.lat || -6.6110) - 0.00008;
    let spawnLng = (activeFacet.lng || 106.8150) + 0.00012;
    let spawnOx = activeFacet.offsetX + 150;
    let spawnOy = activeFacet.offsetY + 70;

    if (facets.length === 0 && mapInstanceRef.current) {
      try {
        const center = mapInstanceRef.current.getCenter();
        spawnLat = center.lat;
        spawnLng = center.lng;
        spawnOx = 0;
        spawnOy = 0;
      } catch {}
    }

    const newFacet: RoofFacet = {
      id: newId,
      name: `Bidang Atap #${newNum}`,
      shape: "rectangle",
      ridge: 8.5,
      slope: 5.2,
      pitch: 10,
      azimuth: 0,
      setback: 0.5,
      gutter: 0.5,
      rotation: activeFacet.rotation || -4,
      lat: spawnLat,
      lng: spawnLng,
      offsetX: spawnOx,
      offsetY: spawnOy,
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
  }, [facets.length, activeFacet, setActiveFacetId, showToast]);

  const deleteFacet = useCallback((id: string) => {
    setServerMetrics(null);
    setServerDetail(null);
    setFacets((prev) => prev.filter((f) => f.id !== id));
    setSelectedFacetIds((prev) => prev.filter((fid) => fid !== id));
    showToast("Bidang atap dihapus");
  }, [showToast]);

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
    const leaflet = getWindowLeaflet();

    if (mapInstanceRef.current && leaflet && activeFacet.lat && activeFacet.lng) {
      try {
        const currentPt = mapInstanceRef.current.latLngToContainerPoint([activeFacet.lat, activeFacet.lng]);
        const targetPt = leaflet.point(currentPt.x + dx, currentPt.y + dy);
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

  /**
   * Angka tersimpan tidak lagi mewakili rancangan begitu masukan global berubah.
   * Efek ini menyamakan perlakuan tagihan, tarif, inverter, posisi matahari, dan
   * sudut dudukan dengan perubahan parameter bidang: ringkasan kembali ke
   * pratinjau lokal, bukan mencampur angka server lama dengan masukan baru.
   */
  useEffect(() => {
    const signature = `${monthlyBill}|${plnTariff}|${inverterType}|${sunHour}|${extraTilt}|${shadingLossPct}`;

    if (lastGlobalInputSignature.current === null) {
      lastGlobalInputSignature.current = signature;
      return;
    }

    if (lastGlobalInputSignature.current === signature) {
      return;
    }

    lastGlobalInputSignature.current = signature;
    setServerMetrics(null);
    setServerDetail(null);
  }, [monthlyBill, plnTariff, inverterType, sunHour, extraTilt, shadingLossPct]);

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
    const rafId = requestAnimationFrame(() => {
      setMounted(true);
      const storedBio = getStoredBiodata();
      setBiodata(storedBio);
      const completed = hasCompletedStudioGuide(storedBio?.email ?? null);
      setStudioGuideCompleted(completed);
      const hasAnalysisParam =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("analysis") !== null;
      if (!completed && !hasAnalysisParam) {
        setMascotGuideOpen(true);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  const closeStudioGuide = useCallback(() => {
    markStudioGuideComplete(biodata?.email ?? null);
    setStudioGuideCompleted(true);
    setMascotGuideOpen(false);
  }, [biodata?.email]);

  const initials = useMemo(() => {
    if (!mounted || !biodata?.name) return "PS";
    const parts = biodata.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [mounted, biodata?.name]);

  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [userSavedSimulations, setUserSavedSimulations] = useState<SimulationSummary[]>([]);

  const refreshUserSimulations = useCallback(async () => {
    if (getToken() === null) {
      setUserSavedSimulations([]);
      return;
    }
    try {
      const page = await api.listSimulations(1, 50);
      setUserSavedSimulations(page.data);
    } catch {
      // Abaikan bila sesi belum siap/offline; preset Bogor tetap tersedia
    }
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      void refreshUserSimulations();
    });
    return () => cancelAnimationFrame(rafId);
  }, [refreshUserSimulations]);

  const filteredUserSimulations = useMemo(() => {
    const q = addressInput.trim().toLowerCase();
    if (!q) return userSavedSimulations;
    return userSavedSimulations.filter((sim) => {
      const label = (sim.address || `Simulasi #${sim.id}`).toLowerCase();
      return label.includes(q) || `simulasi #${sim.id}`.includes(q);
    });
  }, [addressInput, userSavedSimulations]);

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
      mapInstanceRef.current.flyTo([proj.lat, proj.lon], GEOCODE_TARGET_ZOOM, { duration: 1.2 });
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
    searchAnchorRef.current = { label: proj.address, lat: proj.lat, lng: proj.lon };
    if (!hasCustomProjectNameRef.current) {
      setProjectName(proj.address);
    }
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

  const lastAppliedWindowSearchRef = useRef<string | null>(null);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      const bio = getStoredBiodata();
      setBiodata(bio);
      if (typeof window !== "undefined") {
        const rawSearch = window.location.search;
        if (lastAppliedWindowSearchRef.current === rawSearch) return;
        lastAppliedWindowSearchRef.current = rawSearch;

        const sp = new URLSearchParams(rawSearch);
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
    });
    return () => cancelAnimationFrame(rafId);
  }, [triggerGpsDetectionFlow]);

  // Initialize Dynamic OpenStreetMap & Real Earth Satellite Map from local bundled Leaflet
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let moveRafId: number | null = null;

    const initMap = async () => {
      const L: typeof LeafletNS = getWindowLeaflet() ?? (await import("leaflet")).default;
      if (!L || cancelled) return;
      (window as WindowWithLeaflet).L = L;

      const container = document.getElementById("studio-leaflet-map");
      if (!container || mapInstanceRef.current) return;

      try {
        const pLat = searchParams.get("lat") ? Number(searchParams.get("lat")) : -6.6110;
        const pLng = searchParams.get("lng") ? Number(searchParams.get("lng")) : 106.8150;
        const map = L.map("studio-leaflet-map", {
          center: [!isNaN(pLat) ? pLat : -6.6110, !isNaN(pLng) ? pLng : 106.8150],
          zoom: GEOCODE_TARGET_ZOOM,
          maxZoom: 21,
          minZoom: 16,
          preferCanvas: true,
          zoomControl: false,
          attributionControl: false,
        });

        // Max bounds restricting map to Kota Bogor and surrounding area
        const bogorBounds = L.latLngBounds(
          L.latLng(-6.6800, 106.7200),
          L.latLng(-6.5100, 106.8800)
        );
        map.setMaxBounds(bogorBounds);

        // Throttle polygon sync to RAF only when polygons exist; update meter scale only when pan/zoom settles
        const schedulePolygonSync = () => {
          if (facetsCountRef.current === 0 || moveRafId !== null) return;
          moveRafId = requestAnimationFrame(() => {
            moveRafId = null;
            setMapTick((t: number) => (t + 1) % 1000000);
          });
        };
        const syncMapSettled = () => {
          if (facetsCountRef.current > 0) {
            setMapTick((t: number) => (t + 1) % 1000000);
          }
          const nextScale = measureMapViewportScale(map);
          setViewportScale(nextScale);
          if (nextScale?.status === "optimal") {
            setScanConfirm(null);
          }
        };
        map.on("move zoom", schedulePolygonSync);
        map.on("moveend zoomend viewreset resize", syncMapSettled);

        // Real Earth Esri World Imagery (High-resolution satellite nadir tiles)
        // `crossOrigin` wajib: tanpa itu kanvas tangkapan menjadi tainted dan
        // ekspor JPEG untuk deteksi atap akan gagal.
        const esriSatellite = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxNativeZoom: 19,
            maxZoom: 22,
            crossOrigin: true,
            updateWhenIdle: true,
            updateWhenZooming: false,
            keepBuffer: 2,
          }
        );

        // OpenStreetMap (OSM) standard vector road tile layer
        const osmStreet = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxNativeZoom: 19,
          maxZoom: 22,
          crossOrigin: true,
          updateWhenIdle: true,
          updateWhenZooming: false,
          keepBuffer: 2,
        });

        // Hybrid labels layer (Street & City reference)
        const labelsLayer = L.tileLayer(
          "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          {
            maxNativeZoom: 19,
            maxZoom: 22,
            crossOrigin: true,
            updateWhenIdle: true,
            updateWhenZooming: false,
            keepBuffer: 1,
          }
        );

        esriSatellite.addTo(map);
        labelsLayer.addTo(map);

        mapInstanceRef.current = map;
        esriSatelliteLayerRef.current = esriSatellite;
        osmStreetLayerRef.current = osmStreet;
        labelsLayerRef.current = labelsLayer;
        setMapInstance(map);
        setMapLoaded(true);
        setViewportScale(measureMapViewportScale(map));
      } catch (err) {
        console.warn("Leaflet init error:", err);
      }
    };

    void initMap();

    return () => {
      cancelled = true;
      if (moveRafId !== null) cancelAnimationFrame(moveRafId);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMapInstance(null);
    };
  }, []);

  // Invalidate map size smoothly whenever right panel toggles (prevents cut-off blank map!)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.invalidateSize();
    setMapTick((t) => (t + 1) % 1000000);

    const start = performance.now();
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

  // Sync Map Base Layer (Esri Satellite vs OSM Street) & Street Labels
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const esri = esriSatelliteLayerRef.current;
    const osm = osmStreetLayerRef.current;
    const labels = labelsLayerRef.current;
    if (!esri || !osm || !labels) return;

    if (baseMap === "osm") {
      if (map.hasLayer(esri)) map.removeLayer(esri);
      if (!map.hasLayer(osm)) osm.addTo(map);
      if (map.hasLayer(labels)) map.removeLayer(labels);
    } else {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(esri)) esri.addTo(map);
      if (showStreetLabels) {
        if (!map.hasLayer(labels)) labels.addTo(map);
      } else {
        if (map.hasLayer(labels)) map.removeLayer(labels);
      }
    }
  }, [baseMap, showStreetLabels, mapLoaded]);

  /**
   * Pratinjau tangkapan: gambar berkas yang benar-benar dikirim ke model pada
   * `bbox` yang sama, sehingga batas area yang dianalisis terlihat langsung di
   * peta. Overlay ikut hilang bersama poligon kandidat.
   */
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = getWindowLeaflet();

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
    const L = getWindowLeaflet();

    if (!map || !L || !mapLoaded) return;

    const layers: Map<string, LeafletNS.Polygon> = detectionLayersRef.current;
    const visible = showDetectedRoofs ? remainingDetectedRoofs : [];
    const wanted = new Set(visible.map((roof) => roof.id));

    for (const [id, layer] of layers) {
      if (!wanted.has(id)) {
        map.removeLayer(layer);
        layers.delete(id);
      }
    }

    // Urutkan dari luas terbesar ke terkecil agar poligon kecil berada di atas
    // dan tidak tertutup kliknya oleh poligon besar di sekitarnya.
    const sortedVisible = [...visible].sort((a, b) => b.area_sqm - a.area_sqm);

    for (const roof of sortedVisible) {
      const isSelected = selectedDetectedIds.includes(roof.id);
      const style: LeafletNS.PathOptions = {
        color: isSelected ? "#b45309" : "#f59e0b",
        weight: isSelected ? 4 : 2.5,
        dashArray: isSelected ? undefined : "6 4",
        fillColor: "#f59e0b",
        fillOpacity: isSelected ? 0.34 : 0.18,
        interactive: true,
        bubblingMouseEvents: false,
      };

      const existing = layers.get(roof.id);

      if (existing) {
        existing.setStyle(style);
        continue;
      }

      // Kontrak memakai urutan GeoJSON `[lng, lat]`, Leaflet memakai `[lat, lng]`.
      const latLngs: LeafletNS.LatLngExpression[] = roof.polygon_lnglat.map(([lng, lat]) => [lat, lng]);
      const polygon = L.polygon(latLngs, style).addTo(map);
      polygon.on("click", (ev: LeafletNS.LeafletMouseEvent) => {
        if (ev?.originalEvent) {
          L.DomEvent.stopPropagation(ev);
        }
        selectDetectedRoof(roof.id);
      });
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
    const layers: Map<string, LeafletNS.Polygon> = detectionLayersRef.current;

    return () => {
      layers.clear();
    };
  }, []);

  const formatProjectLocationLabel = useCallback((rawLabel: string): string => {
    const parts = rawLabel
      .split(",")
      .map((part) => part.trim())
      .filter(
        (part) =>
          part !== "" &&
          !/^(kota bogor|jawa barat|indonesia|\d{5})$/i.test(part)
      );
    const concise = parts.slice(0, 2).join(", ");
    return (concise || rawLabel.trim()).slice(0, 120);
  }, []);

  const getTargetFacetsCentroid = useCallback((targetFacets: RoofFacet[]): { lat: number; lng: number } => {
    const valid = targetFacets.filter(
      (facet) => typeof facet.lat === "number" && Number.isFinite(facet.lat) && typeof facet.lng === "number" && Number.isFinite(facet.lng)
    );
    if (valid.length > 0) {
      const sumLat = valid.reduce((sum, facet) => sum + (facet.lat as number), 0);
      const sumLng = valid.reduce((sum, facet) => sum + (facet.lng as number), 0);
      return { lat: sumLat / valid.length, lng: sumLng / valid.length };
    }
    if (mapInstanceRef.current) {
      try {
        const center = mapInstanceRef.current.getCenter();
        return { lat: center.lat, lng: center.lng };
      } catch {}
    }
    return { lat: -6.611, lng: 106.815 };
  }, []);

  const resolveDefaultProjectName = useCallback(
    async (targetFacets: RoofFacet[], forceReverse = false): Promise<string> => {
      const { lat, lng } = getTargetFacetsCentroid(targetFacets);
      const anchor = searchAnchorRef.current;

      if (!forceReverse && anchor) {
        const dLat = (lat - anchor.lat) * 111_320;
        const dLng = (lng - anchor.lng) * 111_320 * Math.cos((lat * Math.PI) / 180);
        if (Math.hypot(dLat, dLng) < 350 && anchor.label.trim() !== "") {
          return anchor.label.trim();
        }
      }

      try {
        const rev = await api.reverseGeocode(lat, lng);
        if (rev.label && rev.label.trim() !== "") {
          return rev.label.trim();
        }
      } catch {
        // Fallback smoothly below if reverse geocode is temporarily unreachable.
      }

      const fallback = formatProjectLocationLabel(addressInput);
      return fallback !== "" ? fallback : "Proyek PLTS Bogor";
    },
    [addressInput, formatProjectLocationLabel, getTargetFacetsCentroid]
  );

  // OSM Nominatim Geocoding & Preset Search handler (Focused on Kota Bogor & presets)
  /**
   * Mengeksekusi hasil pencarian alamat: peta digeser ke titik itu.
   *
   * Yang dipindahkan hanya pusat peta. Bidang atap tetap harus dipindai ulang,
   * karena hasil pencarian alamat menunjukkan lokasi, bukan bentuk atapnya.
   */
  const applyGeocodeResult = useCallback(
    (result: GeocodeResult) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([result.lat, result.lng], GEOCODE_TARGET_ZOOM, { duration: 1.2 });
      }

      const concise = formatProjectLocationLabel(result.label);
      setAddressInput(result.label);
      searchAnchorRef.current = { label: concise, lat: result.lat, lng: result.lng };
      if (!hasCustomProjectNameRef.current) {
        setProjectName(concise);
      }
      setGeocodeResults([]);
      setSearchOpen(false);
      setDetection(null);
      setDetectedRoofs([]);
      setSelectedDetectedIds([]);
      setShowDetectedRoofs(false);
      setCapturePreviewUrl(null);

      const firstPart = result.label.split(",")[0];
      showToast(`Peta digeser ke ${firstPart}. Tekan pindai untuk memilih bidang atap.`);
    },
    [formatProjectLocationLabel, showToast]
  );

  /**
   * Mencari alamat lewat backend, bukan langsung ke Nominatim: identitas pemanggil
   * dan batas laju ditangani server, dan hasil yang sama dijawab dari cache.
   */
  const handleGeocodeSearch = async (query: string) => {
    const q = query.trim();
    if (!q) return;

    if (q.toLowerCase().includes("gps") || q.toLowerCase().includes("lokasi terkini") || q.toLowerCase().includes("lokasi saya")) {
      handleUseGps();
      return;
    }

    // Preset Bogor tetap diutamakan: instan, dan tidak membebani layanan luar.
    const matchedPreset = PRESET_ADDRESSES.find(
      (p) => p.label.toLowerCase().includes(q.toLowerCase()) || q.toLowerCase().includes(p.label.toLowerCase().slice(0, 10))
    );
    if (matchedPreset) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([matchedPreset.lat, matchedPreset.lon], GEOCODE_TARGET_ZOOM, { duration: 1.2 });
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
      searchAnchorRef.current = { label: matchedPreset.label, lat: matchedPreset.lat, lng: matchedPreset.lon };
      if (!hasCustomProjectNameRef.current) {
        setProjectName(matchedPreset.label);
      }
      setGeocodeResults([]);
      setSearchOpen(false);
      setDetection(null);
      setDetectedRoofs([]);
      setSelectedDetectedIds([]);
      setShowDetectedRoofs(false);
      setCapturePreviewUrl(null);
      showToast(`Lokasi diterapkan: ${matchedPreset.label}`);
      return;
    }

    if (q.length < 3) {
      showToast("Tulis minimal tiga huruf untuk mencari alamat.");
      return;
    }

    setIsGeocoding(true);

    try {
      const response = await api.geocode(q);

      if (response.results.length === 0) {
        setGeocodeResults([]);
        showToast("Alamat tidak ditemukan di Kota Bogor. Geser peta secara manual atau pakai salah satu preset.");
        return;
      }

      // Satu hasil langsung diterapkan; lebih dari satu ditawarkan sebagai pilihan.
      if (response.results.length === 1) {
        applyGeocodeResult(response.results[0]);
        return;
      }

      setGeocodeResults(response.results);
    } catch (caught) {
      setGeocodeResults([]);
      showToast(
        caught instanceof ApiRequestError
          ? `Pencarian alamat gagal: ${caught.message}`
          : "Pencarian alamat gagal. Coba lagi sebentar."
      );
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleResetSearch = () => {
    const defaultAddress = "Komp. Baranangsiang Indah Blok C, Bogor Timur";
    const defaultLat = -6.6110;
    const defaultLng = 106.8150;
    setAddressInput(defaultAddress);
    searchAnchorRef.current = null;
    setProjectName("");
    setHasCustomProjectName(false);
    updateActiveFacet({
      lat: defaultLat,
      lng: defaultLng,
      name: "Baranangsiang Indah",
    });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([defaultLat, defaultLng], GEOCODE_TARGET_ZOOM, { duration: 1.2 });
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
      inverterType,
      shadingLossPct
    );

    // Selected Facets Metrics (for selection inspection if needed)
    const selectedMetrics = selectedFacets.map((f) =>
      computeFacetMetrics(f, sunHour, obstacleFilterActive, extraTilt, inverterType, shadingLossPct)
    );

    // ALL Facets Metrics (Studio calculations reflect the ENTIRE PROJECT holistically!)
    const allFacetsMetrics = facets.map((f) =>
      computeFacetMetrics(f, sunHour, obstacleFilterActive, extraTilt, inverterType, shadingLossPct)
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
    shadingLossPct,
    inverterType,
    serverMetrics,
  ]);

  // Save Simulation to Server State & Action
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalName, setSaveModalName] = useState("");
  const [isResolvingProjectName, setIsResolvingProjectName] = useState(false);
  const saveModalDirtyRef = useRef(false);

  // Resolves a smart default name automatically when roof facets are created/detected
  useEffect(() => {
    if (facets.length === 0 || hasCustomProjectNameRef.current) return;
    const targetFacets =
      selectedFacets.length > 0
        ? selectedFacets
        : facets.filter((facet) => facet.id === activeFacetId);
    if (targetFacets.length === 0) return;

    let cancelled = false;
    void resolveDefaultProjectName(targetFacets).then((resolved) => {
      if (cancelled || hasCustomProjectNameRef.current) return;
      setProjectName(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [facets.length, activeFacetId, selectedFacetIds.length, resolveDefaultProjectName]);

  const openSaveModal = () => {
    const targetFacets =
      selectedFacets.length > 0
        ? selectedFacets
        : facets.filter((facet) => facet.id === activeFacetId);

    if (targetFacets.length === 0) {
      showToast("Belum ada bidang atap untuk disimpan. Pilih minimal satu bidang.");
      return;
    }

    saveModalDirtyRef.current = false;
    const immediateName =
      projectName.trim() ||
      searchAnchorRef.current?.label ||
      formatProjectLocationLabel(addressInput) ||
      "Proyek PLTS Bogor";
    setSaveModalName(immediateName);
    setSaveModalOpen(true);

    if (!hasCustomProjectName) {
      setIsResolvingProjectName(true);
      void resolveDefaultProjectName(targetFacets)
        .then((resolved) => {
          if (!saveModalDirtyRef.current && resolved.trim() !== "") {
            setSaveModalName(resolved);
            setProjectName(resolved);
          }
        })
        .finally(() => {
          setIsResolvingProjectName(false);
        });
    }
  };

  const performSaveSimulation = async (explicitName: string) => {
    // Bidang boleh digambar sendiri tanpa memindai atap. Simpan tetap membutuhkan
    // acuan tangkapan untuk mengubah poligon layar menjadi meter, jadi acuan itu
    // dicatat dari tampilan peta saat ini lewat `POST /captures` — tanpa model dan
    // tanpa menunggu ubin satelit selesai dimuat.
    let activeDetection = detection;

    if (activeDetection === null) {
      const map = mapInstanceRef.current;

      if (!map) {
        showToast("Peta belum siap. Tunggu peta selesai dimuat, lalu simpan lagi.");
        return;
      }

      try {
        const geometry = captureGeometry(map);
        const registration = await api.registerCapture(geometry);

        activeDetection = {
          image_id: registration.image_id,
          detection_id: `capture-${registration.image_id}`,
          model: { name: "manual", version: "" },
          image: registration.image,
          roofs: [],
        };

        setDetection(activeDetection);
      } catch (caught) {
        showToast(
          caught instanceof Error
            ? caught.message
            : "Acuan tangkapan gagal dibuat. Geser peta sedikit, lalu simpan lagi."
        );
        return;
      }
    }

    const image = activeDetection.image;

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

      // Rintangan dikirim sebagai geometri slot. Slot yang kosong karena batas
      // jumlah panel bukan rintangan; hanya slot yang ditandai pengguna atau
      // berasal dari penanda HVAC/skylight yang mengecualikan modul di server.
      const facetMetrics = computeFacetMetrics(
        facet,
        sunHour,
        obstacleFilterActive,
        extraTilt,
        inverterType,
        shadingLossPct
      );
      const obstacles: RoofObstacleInput[] = [];

      for (const slot of facetMetrics.validSlots) {
        const isObstacle =
          slot.state === "hvac" ||
          slot.state === "skylight" ||
          (slot.state === "empty" && facet.slotOverrides[slot.key] === "empty");

        if (!isObstacle) continue;

        obstacles.push({
          type: slot.state as RoofObstacleInput["type"],
          polygon_px: slotPolygonPx(slot, facet, image),
        });
      }

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
        facet_rotation_deg: facet.rotation,
        obstacles,
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
      showToast("Tidak ada bidang di dalam area tangkapan. Geser peta ke atas atap, lalu simpan lagi.");
      return;
    }

    const finalProjectName =
      explicitName.trim() ||
      projectName.trim() ||
      formatProjectLocationLabel(addressInput) ||
      "Proyek PLTS Bogor";

    const payload: SimulationRequest = {
      image_id: activeDetection.image_id,
      address: finalProjectName.slice(0, 160),
      roofs,
      inverter_type: inverterType,
      monthly_bill_idr: monthlyBill,
      tariff_key: tariffKeyForRate(plnTariff),
      sun_hour: sunHour,
      extra_tilt: extraTilt,
      shading_loss_pct: shadingLossPct,
    };

    setIsSaving(true);

    try {
      // Simulasi yang dibuka lewat `?analysis=` diperbarui di tempat; tanpa ini
      // setiap penyimpanan membuat salinan baru dan riwayat penuh duplikat.
      const res =
        openedSimulationId !== null
          ? await api.updateSimulation(openedSimulationId, payload)
          : await api.saveSimulation(payload);

      setSaveSuccess(true);
      setSaveModalOpen(false);
      setOpenedSimulationId(res.id);
      setServerMetrics(res.result);
      setServerDetail(res);
      setProjectName(finalProjectName);
      setHasCustomProjectName(true);
      setAddressInput(finalProjectName);
      void refreshUserSimulations();

      // Penanda tur aplikasi; tidak ada data proyek yang ditulis ke peramban.
      if (typeof window !== "undefined") {
        localStorage.setItem("sunsight_tour_pending", "true");
      }

      const skippedNote =
        skipped.length > 0
          ? ` ${skipped.length} bidang di luar area tangkapan tidak disertakan.`
          : "";
      const verb = openedSimulationId !== null ? "diperbarui" : "tersimpan";

      showToast(
        `Proyek "${finalProjectName}" ${verb} — ${res.result.capacity_kwp.toLocaleString("id-ID")} kWp, ${
          Math.round(res.result.annual_production_kwh).toLocaleString("id-ID")
        } kWh/tahun.${skippedNote}`
      );
      // Rancangan yang baru saja dikirim ke server menjadi pembanding baru, sehingga
      // perubahan berikutnya tetap terdeteksi sebagai belum tersimpan.
      savedDesignSignatureRef.current = designSignatureOf({
        facets,
        addressInput: finalProjectName,
        monthlyBill,
        plnTariff,
        inverterType,
        sunHour,
        extraTilt,
        shadingLossPct,
      });
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


  /*
   * Rancangan dianggap berubah bila tanda tangannya berbeda dari tanda tangan saat
   * terakhir dimuat atau disimpan. Membandingkan state secara dangkal tidak cukup:
   * perubahan bisa terjadi pada salah satu dari puluhan bidang, dan membandingkan
   * angka satu per satu akan menyalin seluruh logika penyimpanan.
   *
   * Tanda tangan dihitung saat dibutuhkan, bukan di-memo: nilainya hanya dipakai pada
   * klik keluar dan saat tab ditutup, sementara satu memo lagi per render tidak
   * sepadan dengan manfaatnya.
   */
  const readDesignSignature = () =>
    designSignatureOf({
      facets,
      addressInput,
      monthlyBill,
      plnTariff,
      inverterType,
      sunHour,
      extraTilt,
      shadingLossPct,
    });

  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  const hasUnsavedChanges = () => {
    const saved = savedDesignSignatureRef.current;
    return saved !== null && saved !== readDesignSignature();
  };

  // Tanda tangan pertama diambil setelah mount: bidang awal dan masukan bawaan memang
  // belum berisi pekerjaan yang bisa hilang.
  useEffect(() => {
    if (savedDesignSignatureRef.current !== null) return;

    savedDesignSignatureRef.current = readDesignSignature();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facets, addressInput, monthlyBill, plnTariff, inverterType, sunHour, extraTilt]);

  // Menutup tab atau memuat ulang juga membuang perubahan, jadi peramban diberi tahu.
  // Pemeriksaannya di dalam handler, bukan saat efek dipasang, karena perubahan bisa
  // terjadi kapan pun setelah listener terpasang.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const saved = savedDesignSignatureRef.current;
      if (saved === null || saved === readDesignSignature()) return;

      event.preventDefault();
      // Peramban modern mengabaikan teks kustom, tetapi mengisinya tetap diperlukan
      // agar dialog bawaan muncul pada peramban yang masih memeriksanya.
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facets, addressInput, monthlyBill, plnTariff, inverterType, sunHour, extraTilt]);

  const leaveStudio = useCallback(() => {
    router.push("/");
  }, [router]);


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
    let name = "Utara (U)";
    let desc = "Optimal untuk Kota Bogor (6,6° LS) — menangkap radiasi matahari tahunan maksimal.";
    let isOptimal = false;
    if (azimuth >= 337.5 || azimuth < 22.5) {
      name = "Utara (U)";
      if (azimuth >= 345 || azimuth <= 15) {
        desc = "Optimal Kota Bogor (6,6° LS)! Menghadap Utara (0°) memaksimalkan energi tahunan.";
        isOptimal = true;
      } else {
        desc = "Menghadap Utara, sangat ideal untuk lintang selatan Kota Bogor.";
        isOptimal = true;
      }
    } else if (azimuth >= 22.5 && azimuth < 67.5) {
      name = "Timur Laut (TL)";
      desc = "Tangkapan sinar pagi hingga siang tinggi sebelum awan konvektif sore.";
    } else if (azimuth >= 67.5 && azimuth < 112.5) {
      name = "Timur (T)";
      desc = "Menghadap Timur (90°). Optimal untuk penyinaran pagi di Kota Bogor.";
    } else if (azimuth >= 112.5 && azimuth < 157.5) {
      name = "Tenggara (TG)";
      desc = "Peralihan Timur ke Selatan, profil radiasi moderat.";
    } else if (azimuth >= 157.5 && azimuth < 202.5) {
      name = "Selatan (S)";
      desc = "Menghadap Selatan (180°). Efisiensi sedikit lebih rendah di lintang 6,6° LS.";
    } else if (azimuth >= 202.5 && azimuth < 247.5) {
      name = "Barat Daya (BD)";
      desc = "Menghadap Barat Daya, puncak radiasi sore lebih terpengaruh awan Bogor.";
    } else if (azimuth >= 247.5 && azimuth < 292.5) {
      name = "Barat (B)";
      desc = "Menghadap Barat (270°). Membantu pasokan listrik pada beban puncak sore.";
    } else {
      name = "Barat Laut (BL)";
      desc = "Peralihan Barat ke Utara, profil radiasi seimbang sepanjang tahun.";
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

  const [moduleRecommendation, setModuleRecommendation] = useState<ModuleRecommendation | null>(null);

  const findOptimalModuleRecommendation = () => {
    setModuleRecommendation(
      optimizeFacetConfiguration(
        activeFacet,
        sunHour,
        obstacleFilterActive,
        extraTilt,
        inverterType,
        shadingLossPct
      )
    );
  };

  const applyModuleRecommendation = () => {
    if (!moduleRecommendation || moduleRecommendation.facetId !== activeFacet.id) return;
    const gridChanged =
      moduleRecommendation.modulePower !== activeFacet.modulePower ||
      moduleRecommendation.orientation !== activeFacet.orientation ||
      moduleRecommendation.panelGap !== activeFacet.panelGap ||
      moduleRecommendation.alignToAzimuth !== (activeFacet.alignToAzimuth ?? true) ||
      (moduleRecommendation.alignToAzimuth && moduleRecommendation.azimuth !== activeFacet.azimuth);

    updateActiveFacet({
      modulePower: moduleRecommendation.modulePower,
      orientation: moduleRecommendation.orientation,
      panelGap: moduleRecommendation.panelGap,
      pitch: moduleRecommendation.pitch,
      azimuth: moduleRecommendation.azimuth,
      alignToAzimuth: moduleRecommendation.alignToAzimuth,
      customModuleCount: null,
      isSolarPopulated: true,
      ...(gridChanged ? { slotOverrides: {} } : {}),
    });

    showToast(
      `Rekomendasi diterapkan: ${moduleRecommendation.modulePower}W ${
        moduleRecommendation.orientation === "landscape" ? "Landscape" : "Portrait"
      } · ${Math.round(moduleRecommendation.annualProductionKwh).toLocaleString("id-ID")} kWh/thn`
    );
    setModuleRecommendation(null);
  };

  const pitchRadVal = (pitch * Math.PI) / 180;
  const wedgeEndX = 20 + 32 * Math.cos(pitchRadVal);
  const wedgeEndY = 70 - 32 * Math.sin(pitchRadVal);
  const wedgePathD = `M 20 70 L 52 70 A 32 32 0 0 0 ${wedgeEndX.toFixed(1)} ${wedgeEndY.toFixed(1)} Z`;
  const arcPathD = `M 52 70 A 32 32 0 0 0 ${wedgeEndX.toFixed(1)} ${wedgeEndY.toFixed(1)}`;

  const hasValidBep =
    calc.paybackYears !== null &&
    Number.isFinite(calc.paybackYears) &&
    calc.paybackYears > 0 &&
    calc.annualSaving > 0 &&
    calc.totalCapex > 0;

  // Skala tahun grafik dinamis: default 25 tahun (umur garansi modul),
  // otomatis meluas rapi bila BEP > 25 tahun agar titik balik modal tetap terlihat.
  const chartMaxYear = useMemo(() => {
    if (!hasValidBep || calc.paybackYears === null || calc.paybackYears <= 25) {
      return 25;
    }
    const target = calc.paybackYears * 1.2;
    const step = target > 60 ? 10 : 5;
    return Math.min(300, Math.ceil(target / step) * step);
  }, [hasValidBep, calc.paybackYears]);

  const chartQuickYears = useMemo(() => {
    const step = chartMaxYear / 5;
    return [1, 2, 3, 4, 5].map((i) => Math.round(step * i));
  }, [chartMaxYear]);

  const currentInspectYear =
    roiHoverYear !== null
      ? Math.min(chartMaxYear, Math.max(0, roiHoverYear))
      : hasValidBep && calc.paybackYears !== null
        ? Math.min(chartMaxYear, Math.round(calc.paybackYears * 10) / 10)
        : 0;

  // Arus kas kumulatif diselaraskan penuh dengan FinanceModel.php (Simple Payback):
  // -CAPEX + (tahun × penghematan tahunan), sehingga perpotongan Rp 0 tepat di titik BEP.
  const getCashFlowAtYear = (t: number) => {
    if (t <= 0) return -calc.totalCapex;
    return -calc.totalCapex + t * calc.annualSaving;
  };

  const currentInspectCashFlow = getCashFlowAtYear(currentInspectYear);

  // Active Tree Count for Eco-Forest Animation (Live reactive to total installed solar panels across ALL project polygons)
  const activeTreeCount = useMemo(() => {
    // If 0 modules fitted in project: 0 trees sprouted
    if (calc.totalModulesFitted === 0) {
      return 0;
    }

    // 1. If user is actively hovering on ROI financial projection chart: preview growth across chart timeline
    if (roiHoverYear !== null) {
      const yearRatio = Math.max(0, Math.min(1, roiHoverYear / chartMaxYear));
      return Math.max(2, Math.min(24, Math.round(2 + yearRatio * 22)));
    }

    // 2. Baseline Studio: Live reactive directly to installed solar panels across ALL project polygons
    const totalSlots = Math.max(1, calc.totalValidSlotsAggregate || calc.totalValidSlots || 1);
    const modRatio = Math.max(0, Math.min(1, calc.totalModulesFitted / totalSlots));
    return Math.max(1, Math.min(24, Math.round(modRatio * 24)));
  }, [calc.totalModulesFitted, calc.totalValidSlotsAggregate, calc.totalValidSlots, roiHoverYear, chartMaxYear]);

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
  const endCashFlow = getCashFlowAtYear(chartMaxYear);
  const minVal = Math.min(-1_000_000, -calc.totalCapex * 1.08);
  const maxVal = Math.max(1_000_000, endCashFlow * 1.08);
  const valRange = Math.max(1_000_000, maxVal - minVal);

  const mapChartX = (t: number) =>
    chartPadLeft + (Math.max(0, Math.min(chartMaxYear, t)) / chartMaxYear) * plotW;
  const mapChartY = (v: number) => chartH - 20 - ((v - minVal) / valRange) * (chartH - 35);
  const zeroY = mapChartY(0);

  const effectiveBep =
    hasValidBep && calc.paybackYears !== null
      ? Math.min(chartMaxYear, Math.max(0, calc.paybackYears))
      : chartMaxYear;
  const bepRatio = Math.max(0.04, Math.min(0.96, effectiveBep / chartMaxYear));

  const curvePoints = useMemo(() => {
    const pts: { x: number; y: number; t: number; v: number }[] = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * chartMaxYear;
      const v = getCashFlowAtYear(t);
      pts.push({ x: mapChartX(t), y: mapChartY(v), t, v });
    }
    return pts;
  }, [calc.totalCapex, calc.annualSaving, chartMaxYear, minVal, valRange]);

  const curvePathD = useMemo(() => {
    return curvePoints.reduce(
      (acc, pt, idx) => (idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`),
      "",
    );
  }, [curvePoints]);

  const profitFillD = useMemo(() => {
    if (!hasValidBep || effectiveBep >= chartMaxYear) return "";
    const bepX = mapChartX(effectiveBep);
    const endX = mapChartX(chartMaxYear);
    const profitPts = curvePoints.filter((pt) => pt.t >= effectiveBep);
    if (!profitPts.length) return "";
    let d = `M ${bepX.toFixed(1)} ${zeroY.toFixed(1)}`;
    profitPts.forEach((pt) => {
      d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    });
    d += ` L ${endX.toFixed(1)} ${zeroY.toFixed(1)} Z`;
    return d;
  }, [hasValidBep, effectiveBep, chartMaxYear, curvePoints, zeroY]);

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
  }, [effectiveBep, curvePoints, zeroY]);

  const handleChartMouseMove = (e: ReactMouseEvent<HTMLDivElement> | ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const clampedX = Math.max(chartPadLeft, Math.min(chartW - chartPadRight, (relX / rect.width) * chartW));
    const t = Math.max(0, Math.min(chartMaxYear, ((clampedX - chartPadLeft) / plotW) * chartMaxYear));
    setRoiHoverYear(Math.round(t * 10) / 10);
  };

  const dragMovedRef = useRef(false);

  const startDrag = (
    e: ReactMouseEvent | ReactPointerEvent,
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
    try {
      mapInstanceRef.current?.dragging?.disable();
    } catch {}
    dragMovedRef.current = false;

    const isMultiMove =
      mode === "move" &&
      selectedFacetIds.includes(facetId) &&
      selectedFacetIds.length > 1;

    if (!isMultiMove) {
      setActiveFacetId(facetId);
    }

    const groupTargets: DragGroupTarget[] | undefined = isMultiMove
      ? facets
          .filter((f) => selectedFacetIds.includes(f.id))
          .map((f) => ({
            id: f.id,
            initOx: f.offsetX,
            initOy: f.offsetY,
            initLat: f.lat,
            initLng: f.lng,
          }))
      : undefined;

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
      groupTargets,
    });
  };

  const rafRef = useRef<number | null>(null);

  const onViewportMouseMove = (e: ReactMouseEvent | ReactPointerEvent) => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    const currentTarget = e.currentTarget;

    if (activeLayer === "heatmap") {
      const rect = currentTarget.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      // Real solar irradiance computed from Bogor NASA POWER baseline & sunHour curve
      const baseGhi = sunHour === 9 ? 3.82 : sunHour === 15 ? 3.95 : 4.42;
      const rackingBonus = 1.0 + (extraTilt / 20) * 0.02;
      const shadingFactor = Math.max(0.5, Math.min(1.0, 1.0 - shadingLossPct / 100));

      // Hit-test cursor against existing roof polygons (world meters -> screen pixels)
      const hitFacet = facets.find((facet) => {
        const sp = getFacetScreenPosition(facet);
        const cx = sp ? sp.x : rect.width / 2 + facet.offsetX;
        const cy = sp ? sp.y : rect.height / 2 + facet.offsetY;
        const rotRad = (-facet.rotation * Math.PI) / 180;
        const dx = (px - cx) / pixelsPerMeter;
        const dy = (py - cy) / pixelsPerMeter;
        const localPt = {
          x: dx * Math.cos(rotRad) - dy * Math.sin(rotRad),
          y: dx * Math.sin(rotRad) + dy * Math.cos(rotRad),
        };
        return pointInPolygon(localPt, getFacetVertices(facet));
      });

      if (hitFacet) {
        const pitchFactor = Math.cos(((hitFacet.pitch - 10) * Math.PI) / 180);
        const pitchEff = Math.max(0.85, Math.min(1.0, 0.92 + pitchFactor * 0.08));
        const rawAzDiff = Math.abs(((hitFacet.azimuth % 360) + 360) % 360);
        const azDev = Math.min(rawAzDiff, 360 - rawAzDiff);
        const azEff = Math.max(0.82, Math.min(1.0, 1.0 - (azDev / 180) * 0.15));
        const factor = pitchEff * azEff * rackingBonus * shadingFactor;
        setProbePos({
          x: px,
          y: py,
          ghi: Math.round(baseGhi * factor * 100) / 100,
          pct: Math.min(100, Math.round(factor * 100)),
          label: `${hitFacet.name} (${hitFacet.pitch}°)`,
        });
      } else {
        setProbePos({
          x: px,
          y: py,
          ghi: baseGhi,
          pct: Math.round((baseGhi / 4.42) * 100),
          label: `Permukaan Datar (${sunHour}:00)`,
        });
      }
    } else if (probePos !== null) {
      setProbePos(null);
    }

    if (edgeDragState) {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const dx = clientX - edgeDragState.startX;
        const dy = clientY - edgeDragState.startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          edgeDragMovedRef.current = true;
        }

        const rotRad = (-edgeDragState.rotation * Math.PI) / 180;
        const localDx = (dx * Math.cos(rotRad) - dy * Math.sin(rotRad)) / pixelsPerMeter;
        const localDy = (dx * Math.sin(rotRad) + dy * Math.cos(rotRad)) / pixelsPerMeter;

        const count = edgeDragState.initVertices.length;
        const startIdx = edgeDragState.edgeIdx;
        const endIdx = (edgeDragState.edgeIdx + 1) % count;

        // Hanya dua simpul ujung sisi yang bergerak; sisanya diam sehingga panjang
        // sisi dan bentuk poligon tidak berubah, hanya posisinya.
        const newVertices = edgeDragState.initVertices.map((vertex, idx) => {
          if (idx !== startIdx && idx !== endIdx) return vertex;

          return {
            x: Math.round((vertex.x + localDx) * 1000) / 1000,
            y: Math.round((vertex.y + localDy) * 1000) / 1000,
          };
        });

        updateFacetById(edgeDragState.facetId, {
          ...buildPolygonPatch(newVertices, {
            lat: edgeDragState.initLat,
            lng: edgeDragState.initLng,
            offsetX: edgeDragState.initOx,
            offsetY: edgeDragState.initOy,
            rotation: edgeDragState.rotation,
          }),
          slotOverrides: {},
        });
      });
      return;
    }

    if (vertexDragState) {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const dx = clientX - vertexDragState.startX;
        const dy = clientY - vertexDragState.startY;
        const rotRad = (-vertexDragState.rotation * Math.PI) / 180;
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
          rotation: vertexDragState.rotation,
        });

        updateFacetById(vertexDragState.facetId, patch);
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

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragMovedRef.current = true;
      }

      if (dragState.mode === "move") {
        // Jika beberapa bidang terpilih sekaligus, geser semua bidang terpilih bersama-sama.
        if (dragState.groupTargets && dragState.groupTargets.length > 1) {
          const map = mapInstanceRef.current;
          const L = getWindowLeaflet();
          const updates = new Map<string, Partial<RoofFacet>>();
          for (const item of dragState.groupTargets) {
            let nextLat = item.initLat;
            let nextLng = item.initLng;
            if (map && L && item.initLat && item.initLng) {
              try {
                const startPt = map.latLngToContainerPoint([item.initLat, item.initLng]);
                const targetLatLng = map.containerPointToLatLng(L.point(startPt.x + dx, startPt.y + dy));
                nextLat = targetLatLng.lat;
                nextLng = targetLatLng.lng;
              } catch {}
            }
            updates.set(item.id, {
              lat: nextLat,
              lng: nextLng,
              offsetX: Math.round(item.initOx + dx),
              offsetY: Math.round(item.initOy + dy),
            });
          }
          setServerMetrics(null);
          setServerDetail(null);
          setFacets((prev) =>
            prev.map((f) => {
              const patch = updates.get(f.id);
              return patch ? { ...f, ...patch } : f;
            })
          );
          return;
        }

        const leaflet = getWindowLeaflet();
        if (mapInstanceRef.current && leaflet && dragState.initLat && dragState.initLng) {
          try {
            const startPt = mapInstanceRef.current.latLngToContainerPoint([dragState.initLat, dragState.initLng]);
            const targetPt = leaflet.point(startPt.x + dx, startPt.y + dy);
            const targetLatLng = mapInstanceRef.current.containerPointToLatLng(targetPt);
            updateFacetById(dragState.facetId, {
              lat: targetLatLng.lat,
              lng: targetLatLng.lng,
              offsetX: Math.round(dragState.initOx + dx),
              offsetY: Math.round(dragState.initOy + dy),
            });
          } catch {
            updateFacetById(dragState.facetId, {
              offsetX: Math.round(dragState.initOx + dx),
              offsetY: Math.round(dragState.initOy + dy),
            });
          }
        } else {
          updateFacetById(dragState.facetId, {
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
    if (edgeDragState || vertexDragState || dragState) {
      try {
        mapInstanceRef.current?.dragging?.enable();
      } catch {}
    }
    if (edgeDragState) {
      if (edgeDragMovedRef.current) {
        showToast("Ukuran sisi poligon diperbarui");
      }

      edgeDragMovedRef.current = false;
      setEdgeDragState(null);
    }
    if (vertexDragState) {
      setVertexDragState(null);
      showToast("Bentuk simpul poligon diperbarui");
    }
    if (dragState) {
      const moved = dragMovedRef.current;
      const wasGroup = Boolean(dragState.groupTargets && dragState.groupTargets.length > 1);
      setDragState(null);
      if (moved) {
        showToast(wasGroup ? "Posisi bidang terpilih diperbarui bersama" : "Geometri poligon berhasil diperbarui");
      }
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
    daily_irradiance_kwh_per_sqm: sunHour === 9 ? 3.82 : sunHour === 15 ? 3.95 : 4.42,
    irradiance_source: "NASA POWER & Global Solar Atlas (Kota Bogor)",
    irradiance_period: "Klimatologi 2001–2024",
    incidence_factor:
      (calc.pitchEffPct / 100) *
      (Number(calc.azimuthEffPct) / 100) *
      (1 + (extraTilt / 20) * 0.02),
    performance_ratio:
      0.82 * (inverterType === "string" ? 0.984 : 0.975) * (1 - shadingLossPct / 100),
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
    tilt_deg: activeFacet.pitch ?? 10,
    azimuth_deg: activeFacet.azimuth ?? 0,
    module_key: moduleKeyForPower(modulePower),
    orientation: activeFacet.orientation ?? "portrait",
    clearance_m: (activeFacet.panelGap ?? 3) / 100,
    panel_count: calc.totalModulesFitted,
    inverter_type: inverterType,
    monthly_bill_idr: monthlyBill,
    tariff_key: tariffKeyForRate(plnTariff),
  };
  /*
   * Saat simulasi tersimpan dibuka, proposal memakai hasil dan asumsi dari server.
   * Pratinjau lokal hanya dipakai untuk rancangan yang belum pernah disimpan.
   */
  const modalResult = serverDetail?.result ?? simulationResultForModal;
  const modalAssumptions = serverDetail?.assumptions ?? simulationAssumptionsForModal;
  const modalParameters =
    serverDetail?.roofs[0] !== undefined
      ? {
          ...serverDetail.roofs[0].input,
          inverter_type: serverDetail.input.inverter_type,
          monthly_bill_idr: serverDetail.input.monthly_bill_idr,
          tariff_key: serverDetail.input.tariff_key,
        }
      : simulationParamsForModal;

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-[#FAF9F5] font-body-md text-slate-800 antialiased select-none flex flex-col print:h-auto print:w-auto print:overflow-visible print:bg-[#FAF9F5] print:p-0">
      {/* =======================================================
          EXPANDABLE FLOATING PILL NAVBAR (Horisontal Individual Bubbles)
          ======================================================= */}
      <div
        id="studio-nav-header"
        className="fixed top-3 left-3 sm:top-4 sm:left-4 z-40 select-none flex items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)] print:hidden group"
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") handleNavMouseEnter();
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") handleNavMouseLeave();
        }}
      >
        {/* Tombol Navigasi:
            - Pas Ketutup: Cukup Logo SunSight + Tanda '>' (tap di layar sentuh membuka menu)
            - Pas Kebuka: Logo berubah jadi Tanda Balik ke Beranda (← Beranda) */}
        <button
          type="button"
          onClick={() => {
            if (!studioNavOpen) {
              setStudioNavOpen(true);
              return;
            }
            // Rancangan yang belum tersimpan tidak boleh hilang karena satu klik.
            if (hasUnsavedChanges()) {
              setExitConfirmOpen(true);
              return;
            }

            leaveStudio();
          }}
          className={`h-10 sm:h-11 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl text-slate-800 flex items-center px-2.5 sm:px-3.5 transition-all duration-300 ease-out shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] border border-white/80 hover:border-amber-300/70 shrink-0 select-none cursor-pointer group/back ${
            studioNavOpen ? "shadow-[0_8px_32px_rgba(245,158,11,0.12)] border-amber-300/80 bg-white/90" : ""
          }`}
          title={studioNavOpen ? "Kembali ke Beranda" : "Buka Menu Studio"}
          aria-label={studioNavOpen ? "Kembali ke Beranda" : "Buka Menu Studio"}
        >
          {!studioNavOpen ? (
            /* Pas Ketutup: Cukup logo sama tanda > aja */
            <div className="flex items-center gap-1 sm:gap-1.5 animate-fadeIn">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="SunSight" className="h-5 sm:h-6 w-auto object-contain shrink-0" />
              <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover/back:text-amber-600 group-hover/back:translate-x-0.5 transition-all">
                chevron_right
              </span>
            </div>
          ) : (
            /* Pas Kebuka: Logo berubah jadi tanda balik ke beranda */
            <div className="flex items-center gap-1 sm:gap-1.5 animate-fadeIn">
              <span className="material-symbols-outlined text-[18px] sm:text-[19px] text-slate-600 group-hover/back:text-amber-600 group-hover/back:-translate-x-0.5 transition-all">
                arrow_back
              </span>
              <span className="hidden sm:inline text-xs font-bold text-slate-800 group-hover/back:text-amber-950 transition-colors whitespace-nowrap">
                Beranda
              </span>
            </div>
          )}
        </button>

        {/* Action Pills Container (Mengembang mulus saat di-hover / di-tap di layar sentuh) */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2 transition-all duration-300 ease-out ${
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
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border ${
                searchOpen
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border-amber-300/80"
                  : "bg-white/80 hover:bg-white backdrop-blur-xl text-slate-700 hover:text-amber-900 border-white/80 shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] hover:border-amber-300/70"
              }`}
              title="Pencarian Alamat & Lokasi"
              aria-label="Cari proyek atau lokasi"
              aria-expanded={searchOpen}
            >
              <span className="material-symbols-outlined text-[19px] sm:text-[20px]">{searchOpen ? "close" : "search"}</span>
            </button>

            {/* Search Popover (Identik dengan Beranda — viewport-anchored pada mobile) */}
            {searchOpen && (
              <>
                <button
                  type="button"
                  aria-label="Tutup pencarian"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setSearchOpen(false)}
                />
                <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-0 sm:right-auto sm:top-14 z-40 w-auto sm:w-[400px] max-h-[calc(100dvh-5.5rem)] overflow-y-auto bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.18),0_4px_24px_rgba(245,158,11,0.10)] border border-white/90 p-2.5 animate-fadeIn">
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
                          // Popover tidak ditutup di sini: hasil pencarian bisa lebih
                          // dari satu dan perlu dipilih lebih dulu.
                          handleGeocodeSearch(addressInput);
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
                      disabled={isGeocoding}
                      onClick={() => handleGeocodeSearch(addressInput)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-bold text-xs hover:bg-amber-500 transition cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      {isGeocoding ? "Mencari..." : "Cari"}
                    </button>
                  </div>

                  {/* Subtitle: Lokasi Aktif & Tombol Reset */}
                  <div className="flex items-center justify-between px-2 pt-2.5 pb-1 gap-2">
                    <p className="flex items-center gap-1 text-[11px] text-slate-400 truncate min-w-0">
                      <span className="material-symbols-outlined text-[13px] text-amber-600 shrink-0">location_on</span>
                      <span className="truncate">{projectName || activeFacet.name || addressInput || "Kota Bogor, Jawa Barat"}</span>
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

                  {/* Hasil pencarian alamat: pilih salah satu untuk menggeser peta */}
                  {geocodeResults.length > 0 && (
                    <div className="mt-2 rounded-2xl border border-amber-200/80 bg-amber-50/60 overflow-hidden">
                      <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Hasil pencarian alamat
                      </p>
                      <ul className="max-h-56 overflow-y-auto">
                        {geocodeResults.map((result, index) => (
                          <li key={`${result.lat}-${result.lng}-${index}`}>
                            <button
                              type="button"
                              onClick={() => applyGeocodeResult(result)}
                              className="w-full text-left px-3 py-2 hover:bg-amber-100/70 transition flex items-start gap-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px] text-amber-700 mt-0.5 shrink-0">
                                place
                              </span>
                              <span className="min-w-0">
                                <span className="block text-xs font-semibold text-slate-800 truncate">
                                  {result.label.split(",")[0]}
                                </span>
                                <span className="block text-[11px] text-slate-500 truncate">
                                  {result.label}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className="px-3 py-1.5 text-[10px] text-slate-400 border-t border-amber-200/60">
                        Pencarian alamat © OpenStreetMap contributors
                      </p>
                    </div>
                  )}

                  {/* List Proyek Tersimpan Asli User + Area Contoh Kota Bogor */}
                  <div className="max-h-72 overflow-y-auto mt-1 space-y-2">
                    {filteredUserSimulations.length === 0 && filteredStudioProjects.length === 0 ? (
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
                      <>
                        {filteredUserSimulations.length > 0 && (
                          <div className="space-y-1">
                            <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Proyek Tersimpan Saya ({filteredUserSimulations.length})
                            </p>
                            {filteredUserSimulations.map((sim) => {
                              const isCurrent = openedSimulationId === sim.id;
                              const title = sim.address || `Simulasi #${sim.id}`;
                              return (
                                <button
                                  key={`user-sim-${sim.id}`}
                                  type="button"
                                  onClick={() => {
                                    setSearchOpen(false);
                                    router.push(`/studio?analysis=${sim.id}`);
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
                                    <span className="material-symbols-outlined text-[18px]">folder_special</span>
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold truncate text-slate-900">{title}</span>
                                    <span className="block text-xs text-slate-400 truncate">
                                      {sim.roof_count} bidang · {sim.installed} modul · {Math.round(sim.total_area_sqm)} m²
                                    </span>
                                  </span>
                                  <span className="text-xs font-semibold text-slate-700 shrink-0">
                                    {sim.capacity_kwp.toFixed(1)} kWp
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {filteredStudioProjects.length > 0 && (
                          <div className="space-y-1">
                            <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Area Contoh Kota Bogor
                            </p>
                            {filteredStudioProjects.map((proj) => {
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
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Pill 3: Filter Lapisan & Tampilan (Apple Glass + Soft Radiant Glow) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setFilterOpen((v) => !v);
                setSearchOpen(false);
              }}
              className={`h-10 sm:h-11 px-2.5 sm:px-4 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all duration-300 shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer border ${
                filterOpen
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border-amber-300/80"
                  : "bg-white/80 hover:bg-white backdrop-blur-xl text-slate-700 hover:text-amber-900 border-white/80 hover:border-amber-300/70"
              }`}
              title="Filter Peta & Lapisan Analisis"
              aria-expanded={filterOpen}
            >
              <span className="material-symbols-outlined text-[18px]">layers</span>
              <span className="hidden sm:inline">Filter</span>
              <span className={`hidden sm:inline text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                filterOpen
                  ? "bg-white/90 text-amber-950 border-amber-300/80"
                  : "bg-amber-100 text-amber-900 border-amber-200"
              }`}>
                {baseMap === "osm"
                  ? "OSM"
                  : activeLayer === "cv"
                    ? "AI"
                    : activeLayer === "heatmap"
                      ? "Radiasi"
                      : "Satelit"}
              </span>
            </button>

            {/* Filter Popover (Real Controls — Apple Glass & Soft Radiant Glow) */}
            {filterOpen && (
              <>
                <button
                  type="button"
                  aria-label="Tutup filter"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setFilterOpen(false)}
                />
                <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-0 sm:right-auto sm:top-14 z-40 w-auto sm:w-68 max-h-[calc(100dvh-5.5rem)] overflow-y-auto bg-white/88 bg-gradient-to-br from-white/95 via-amber-50/35 to-sky-50/30 backdrop-blur-2xl saturate-150 rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.18),0_8px_28px_rgba(253,224,71,0.14),inset_0_1px_1px_rgba(255,255,255,0.95)] border border-white/90 p-3 animate-fadeIn space-y-3">
                  {/* 1. Peta Dasar */}
                  <div className="space-y-1.5">
                    <span className="px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Peta Dasar
                    </span>
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-900/[0.04] border border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => {
                          setBaseMap("satellite");
                          showToast("Peta dasar: Citra Satelit");
                        }}
                        className={`h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          baseMap === "satellite"
                            ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 text-amber-950 shadow-[0_2px_8px_rgba(251,191,36,0.2)] border border-amber-200/90"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">satellite_alt</span>
                        <span>Satelit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBaseMap("osm");
                          showToast("Peta dasar: Peta Jalan (OpenStreetMap)");
                        }}
                        className={`h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          baseMap === "osm"
                            ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 text-amber-950 shadow-[0_2px_8px_rgba(251,191,36,0.2)] border border-amber-200/90"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">map</span>
                        <span>Peta OSM</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Overlay Analisis */}
                  <div className="space-y-1">
                    <span className="px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Overlay Analisis
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = activeLayer === "cv" ? "satellite" : "cv";
                        setActiveLayer(next);
                        if (next === "cv") {
                          if (detectedRoofs.length > 0) {
                            setShowDetectedRoofs(true);
                            showToast(`Overlay AI aktif (${detectedRoofs.length} kontur terdeteksi)`);
                          } else {
                            showToast("Overlay AI aktif — tekan Pindai AI di toolbar kiri untuk memindai");
                          }
                        } else {
                          showToast("Overlay AI dinonaktifkan");
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                        activeLayer === "cv"
                          ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/85 to-amber-100/95 text-amber-950 border border-amber-200/90 shadow-2xs"
                          : "text-slate-700 hover:bg-slate-900/[0.04]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">psychology</span>
                        <span>Kontur Deteksi AI</span>
                      </span>
                      <span className={`w-2 h-2 rounded-full ${activeLayer === "cv" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-slate-300"}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = activeLayer === "heatmap" ? "satellite" : "heatmap";
                        setActiveLayer(next);
                        if (next === "heatmap") {
                          showToast("Radiometer Surya aktif — arahkan kursor ke atap");
                        } else {
                          setProbePos(null);
                          showToast("Radiometer Surya dinonaktifkan");
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                        activeLayer === "heatmap"
                          ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/85 to-amber-100/95 text-amber-950 border border-amber-200/90 shadow-2xs"
                          : "text-slate-700 hover:bg-slate-900/[0.04]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-amber-600">wb_sunny</span>
                        <span>Radiasi Surya (POA)</span>
                      </span>
                      <span className={`w-2 h-2 rounded-full ${activeLayer === "heatmap" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]" : "bg-slate-300"}`} />
                    </button>
                  </div>

                  {/* 3. Elemen Kanvas */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                    <span className="px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Tampilan Kanvas
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={baseMap === "osm"}
                        onClick={() => {
                          setShowStreetLabels((prev) => {
                            const next = !prev;
                            showToast(next ? "Label jalan ditampilkan" : "Label jalan disembunyikan");
                            return next;
                          });
                        }}
                        className={`flex-1 h-8 px-2.5 rounded-xl text-[11px] font-semibold border transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          showStreetLabels && baseMap === "satellite"
                            ? "bg-white text-slate-800 border-amber-200/90 shadow-2xs"
                            : "bg-slate-900/[0.03] text-slate-500 border-transparent hover:text-slate-800"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">signpost</span>
                        <span>Label Jalan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowCadGrid((prev) => {
                            const next = !prev;
                            showToast(next ? "Grid referensi CAD aktif" : "Grid referensi CAD disembunyikan");
                            return next;
                          });
                        }}
                        className={`flex-1 h-8 px-2.5 rounded-xl text-[11px] font-semibold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          showCadGrid
                            ? "bg-white text-slate-800 border-amber-200/90 shadow-2xs"
                            : "bg-slate-900/[0.03] text-slate-500 border-transparent hover:text-slate-800"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">grid_4x4</span>
                        <span>Grid CAD</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setBaseMap("satellite");
                      setActiveLayer("satellite");
                      setShowStreetLabels(true);
                      setShowCadGrid(true);
                      setProbePos(null);
                      if (mapInstanceRef.current) {
                        const targetLat = activeFacet?.lat || -6.6110;
                        const targetLng = activeFacet?.lng || 106.8150;
                        mapInstanceRef.current.setView([targetLat, targetLng], GEOCODE_TARGET_ZOOM);
                      }
                      showToast("Tampilan peta & lapisan direset ke standar");
                      setFilterOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.04] border-t border-slate-100 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px] text-slate-500">restart_alt</span>
                    <span>Reset Tampilan Peta</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Pill 4: Proposal PDF (Frosted Glass) */}
          <button
            type="button"
            onClick={() => setProposalOpen(true)}
            className="h-10 sm:h-11 px-2.5 sm:px-4 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl text-slate-700 hover:text-amber-950 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all duration-300 shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] shrink-0 cursor-pointer border border-white/80 hover:border-amber-300/70"
            title="Unduh Proposal PDF Resmi"
          >
            <span className="material-symbols-outlined text-[18px] text-amber-700">picture_as_pdf</span>
            <span className="hidden sm:inline">Proposal PDF</span>
          </button>

          {/* Pill 5: Simpan Desain (Radiant Soft Glow Glass) */}
          <button
            type="button"
            onClick={openSaveModal}
            disabled={isSaving}
            className={`h-10 sm:h-11 px-3 sm:px-4 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all duration-300 shrink-0 cursor-pointer border ${
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
              {isSaving
                ? "Menyimpan..."
                : saveSuccess
                  ? "Tersimpan"
                  : openedSimulationId !== null
                    ? "Perbarui"
                    : "Simpan Desain"}
            </span>
            <span className="sm:hidden">
              {isSaving ? "..." : saveSuccess ? "OK" : "Simpan"}
            </span>
          </button>

          {/* Mobile/Tablet Touch Collapse Button */}
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setFilterOpen(false);
              setStudioNavOpen(false);
            }}
            className="lg:hidden w-9 h-9 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl text-slate-500 hover:text-slate-800 flex items-center justify-center border border-white/80 shadow-xs shrink-0 cursor-pointer"
            title="Tutup Menu"
            aria-label="Tutup Menu"
          >
            <span className="material-symbols-outlined text-[17px]">chevron_left</span>
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
          className={`relative flex-1 min-h-0 lg:h-full bg-slate-100 overflow-hidden select-none ${
            cadTool === "pen" ? "cursor-crosshair" : "cursor-default"
          }`}
          onPointerMove={onViewportMouseMove}
          onPointerUp={onViewportMouseUp}
          onPointerCancel={onViewportMouseUp}
          onMouseLeave={() => {
            if (probePos !== null) setProbePos(null);
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).id === "studio-leaflet-map") {
              if (cadTool === "select") {
                unselectAllFacets();
              }
            }
          }}
        >
          {/* Top Right: Compass Rose (N) + Zoom Controls (+ / -) */}
          <div className={`absolute right-3 sm:right-4 z-30 flex flex-col items-center gap-1 p-1 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.08)] pointer-events-auto transition-all duration-300 ${
            studioNavOpen ? "top-15 sm:top-4" : "top-3 sm:top-4"
          }`}>
            {/* Compass Rose N */}
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([activeFacet.lat || -6.6110, activeFacet.lng || 106.8150], GEOCODE_TARGET_ZOOM);
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
                setScanConfirm(null);
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
                setScanConfirm(null);
                if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:text-amber-600 hover:bg-amber-50/70 transition cursor-pointer"
              title="Perkecil (Zoom Out)"
            >
              <span className="material-symbols-outlined text-[17px]">remove</span>
            </button>
          </div>

          {/* Pen Tool Interactive Drawing Overlay (Sits below selected edges when idle so '+' hover works, above facets once drawing starts) */}
          {cadTool === "pen" && (
            <div
              className={`absolute inset-0 pointer-events-auto cursor-crosshair ${
                penPoints.length > 0 ? "z-[28]" : "z-20"
              }`}
              onClick={handleCanvasPenClick}
              onPointerMove={(e) => {
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
                    {/* Polyline & soft blue polygon fill matching Penggaris CAD dashed style */}
                    {penPoints.length >= 3 && (
                      <polygon
                        points={penPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                        fill="rgba(56, 189, 248, 0.12)"
                        stroke="none"
                      />
                    )}
                    <polyline
                      points={penPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeDasharray="6 3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Rubberband line to mouse position with snap-to-close preview (Penggaris style, blue theme) */}
                    {penMousePos && (() => {
                      const pLast = penPoints[penPoints.length - 1];
                      const isNearStart = Boolean(
                        penPoints.length >= 3 &&
                        Math.hypot(penMousePos.x - penPoints[0].x, penMousePos.y - penPoints[0].y) < 22
                      );
                      const targetX = isNearStart ? penPoints[0].x : penMousePos.x;
                      const targetY = isNearStart ? penPoints[0].y : penMousePos.y;
                      const distM = (Math.hypot(targetX - pLast.x, targetY - pLast.y) / pixelsPerMeter).toFixed(1);

                      return (
                        <>
                          <line
                            x1={pLast.x}
                            y1={pLast.y}
                            x2={targetX}
                            y2={targetY}
                            stroke={isNearStart ? "#10b981" : "#67e8f9"}
                            strokeWidth={isNearStart ? "2.5" : "2"}
                            strokeDasharray={isNearStart ? "none" : "4 4"}
                            strokeLinecap="round"
                          />
                          <text
                            x={(pLast.x + targetX) / 2}
                            y={(pLast.y + targetY) / 2 - 10}
                            textAnchor="middle"
                            fill={isNearStart ? "#6ee7b7" : "#ffffff"}
                            fontSize="10"
                            fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                            fontWeight="700"
                            letterSpacing="0.02em"
                            stroke="#0f172a"
                            strokeWidth="2.4"
                            strokeLinejoin="round"
                            paintOrder="stroke"
                            className="pointer-events-none"
                          >
                            {isNearStart ? (
                              <>
                                Tutup ({distM}
                                <tspan dx="2" fontSize="9" fontWeight="600">m</tspan>)
                              </>
                            ) : (
                              <>
                                {distM}
                                <tspan dx="2.5" fontSize="9" fontWeight="600">m</tspan>
                              </>
                            )}
                          </text>
                        </>
                      );
                    })()}

                    {/* Pill-less segment distances along placed blue lines (matching Penggaris style) */}
                    {penPoints.slice(0, -1).map((p1, idx) => {
                      const p2 = penPoints[idx + 1];
                      const lenM = Math.hypot(p2.x - p1.x, p2.y - p1.y) / pixelsPerMeter;
                      return (
                        <text
                          key={`pen-seg-${idx}`}
                          x={(p1.x + p2.x) / 2}
                          y={(p1.y + p2.y) / 2 - 9}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                          fontWeight="700"
                          letterSpacing="0.02em"
                          stroke="#0f172a"
                          strokeWidth="2.4"
                          strokeLinejoin="round"
                          paintOrder="stroke"
                          className="pointer-events-none"
                        >
                          {lenM.toFixed(1)}
                          <tspan dx="2.5" fontSize="9" fontWeight="600">m</tspan>
                        </text>
                      );
                    })}

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
                    left: `clamp(48px, ${penPoints[penPoints.length - 1].x}px, calc(100% - 48px))`,
                    top:
                      penPoints[penPoints.length - 1].y < 76
                        ? `${penPoints[penPoints.length - 1].y + 18}px`
                        : `${Math.max(44, penPoints[penPoints.length - 1].y - 36)}px`,
                    transform:
                      penPoints[penPoints.length - 1].y < 76
                        ? "translate(-50%, 0)"
                        : "translate(-50%, -100%)",
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
              onPointerMove={(e) => {
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
                          <text
                            x={(pLast.x + targetX) / 2}
                            y={(pLast.y + targetY) / 2 - 10}
                            textAnchor="middle"
                            fill={isNearStart ? "#6ee7b7" : "#ffffff"}
                            fontSize="10"
                            fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                            fontWeight="700"
                            letterSpacing="0.02em"
                            stroke="#0f172a"
                            strokeWidth="2.4"
                            strokeLinejoin="round"
                            paintOrder="stroke"
                            className="pointer-events-none"
                          >
                            {isNearStart ? (
                              <>
                                Tutup ({distM}
                                <tspan dx="2" fontSize="9" fontWeight="600">m</tspan>)
                              </>
                            ) : (
                              <>
                                {distM}
                                <tspan dx="2.5" fontSize="9" fontWeight="600">m</tspan>
                              </>
                            )}
                          </text>
                        </>
                      );
                    })()}

                    {/* Segment distances along completed lines (pill-less, Pen Tool style) */}
                    {measurePoints.slice(0, -1).map((p1, idx) => {
                      const p2 = measurePoints[idx + 1];
                      const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y) / pixelsPerMeter;
                      return (
                        <text
                          key={`seg-dist-${idx}`}
                          x={(p1.x + p2.x) / 2}
                          y={(p1.y + p2.y) / 2 - 9}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="10"
                          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                          fontWeight="700"
                          letterSpacing="0.02em"
                          stroke="#0f172a"
                          strokeWidth="2.4"
                          strokeLinejoin="round"
                          paintOrder="stroke"
                          className="pointer-events-none"
                        >
                          {segDist.toFixed(1)}
                          <tspan dx="2.5" fontSize="9" fontWeight="600">m</tspan>
                        </text>
                      );
                    })}

                    {/* Closing segment distance (if closed, pill-less) */}
                    {isMeasureClosed && measurePoints.length >= 3 && (() => {
                      const pLast = measurePoints[measurePoints.length - 1];
                      const p0 = measurePoints[0];
                      const closingDist = Math.hypot(p0.x - pLast.x, p0.y - pLast.y) / pixelsPerMeter;
                      return (
                        <text
                          x={(pLast.x + p0.x) / 2}
                          y={(pLast.y + p0.y) / 2 - 9}
                          textAnchor="middle"
                          fill="#6ee7b7"
                          fontSize="10"
                          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                          fontWeight="700"
                          letterSpacing="0.02em"
                          stroke="#0f172a"
                          strokeWidth="2.4"
                          strokeLinejoin="round"
                          paintOrder="stroke"
                          className="pointer-events-none"
                        >
                          {closingDist.toFixed(1)}
                          <tspan dx="2.5" fontSize="9" fontWeight="600">m</tspan>
                        </text>
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

              {/* Floating Action Bar (sembunyikan setelah poligon ditutup agar tidak ganda dengan pil bawah) */}
              {measurePoints.length > 0 && !isMeasureClosed && (() => {
                const lastMeasurePt = measurePoints[measurePoints.length - 1];
                const flipBelow = lastMeasurePt.y < 82;
                return (
                <div
                  className="absolute z-35 flex items-center gap-1.5 p-1.5 rounded-full bg-white/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(245,158,11,0.18)] border border-amber-200/90 pointer-events-auto animate-fadeIn select-none max-w-[calc(100%-1.5rem)]"
                  style={{
                    left: `clamp(115px, ${lastMeasurePt.x}px, calc(100% - 115px))`,
                    top: flipBelow ? `${lastMeasurePt.y + 18}px` : `${Math.max(46, lastMeasurePt.y - 36)}px`,
                    transform: flipBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
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
                );
              })()}
            </div>
          )}

          {/* Real Earth Satellite & OpenStreetMap (OSM) Live Map Container */}
          <div id="studio-leaflet-map" className="absolute inset-0 w-full h-full z-0 pointer-events-auto" />

          {/*
           * Atribusi penyedia ubin. Kontrol bawaan Leaflet sengaja dimatikan agar
           * tidak menutupi tombol studio, jadi kewajibannya dipenuhi elemen ini.
           * `pointer-events-none` menjaga area peta tetap dapat dipindai/diklik.
           */}
          <div className="absolute bottom-1 right-1 z-20 px-1.5 py-0.5 rounded bg-slate-900/45 text-[8px] sm:text-[9px] leading-tight text-white/85 pointer-events-none select-none max-w-[calc(100%-10.5rem)] sm:max-w-none truncate">
            © Esri, Maxar, Earthstar Geographics · © OpenStreetMap contributors
          </div>

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

          {/* Subtle Grid Tint when CV / Detection Overlay Mode is Selected */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-500 z-10 bg-sky-950/15 ${
              activeLayer === "cv" ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Solar Irradiance Canopy Tint driven by active sunHour */}
          <div
            className={`absolute inset-0 transition-opacity duration-500 pointer-events-none z-10 mix-blend-soft-light ${
              activeLayer === "heatmap"
                ? sunHour >= 11 && sunHour <= 13
                  ? "opacity-100 bg-gradient-to-tr from-amber-400/35 via-yellow-300/25 to-orange-400/30"
                  : "opacity-100 bg-gradient-to-tr from-sky-300/25 via-amber-300/25 to-rose-300/25"
                : "opacity-0"
            }`}
          />

          {/* Live Cursor Radiometer Probe HUD (Real GHI & Facet POA Efficiency) */}
          {activeLayer === "heatmap" && probePos && (
            <div
              className="absolute z-30 pointer-events-none px-3 py-1.5 rounded-full bg-white/88 bg-gradient-to-r from-white/95 via-amber-50/50 to-sky-50/40 text-slate-800 font-medium tracking-tight text-[11px] border border-white/90 shadow-[0_8px_24px_rgba(251,191,36,0.20),0_2px_8px_rgba(15,23,42,0.08)] backdrop-blur-2xl flex items-center gap-2 -translate-x-1/2 -translate-y-11 transition-transform duration-75 whitespace-nowrap"
              style={{ left: probePos.x, top: probePos.y }}
            >
              <span className="material-symbols-outlined text-[15px] text-amber-600">wb_sunny</span>
              <span className="font-code-metric font-bold text-slate-900">
                {probePos.ghi.toFixed(2)} kWh/m²
              </span>
              <span className="text-[10px] text-slate-500">· {probePos.label}</span>
              <span className="text-[10px] font-semibold text-emerald-700">
                {probePos.pct}%
              </span>
            </div>
          )}

          {/* Blueprint CAD Grid (Toggleable via Filter) */}
          {showCadGrid && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25 z-10">
              <defs>
                <pattern id="cadGrid2" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-sky-300/30" />
                  <circle cx="0" cy="0" r="1" className="fill-sky-400/50" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cadGrid2)" />
            </svg>
          )}

          {/* Floating Toast Notification */}
          {cadToast && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] sm:max-w-md px-3.5 py-1.5 rounded-2xl sm:rounded-full bg-white/82 bg-gradient-to-r from-white/90 via-amber-50/40 to-sky-50/35 backdrop-blur-2xl saturate-150 text-slate-800 border border-white/85 shadow-[0_8px_28px_rgba(251,191,36,0.16),0_2px_10px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] text-xs font-medium flex items-center gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-amber-600 text-[15px] shrink-0">info</span>
              <span className="truncate">{cadToast}</span>
            </div>
          )}

          {/* Floating Tool Banner: Delete Vertex Mode */}
          {cadTool === "delete_vertex" && (
            <div className="absolute bottom-12 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-1.5 rounded-2xl sm:rounded-full bg-white/82 bg-gradient-to-r from-white/90 via-rose-50/35 to-amber-50/30 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_8px_28px_rgba(244,63,94,0.12),0_2px_10px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] text-slate-800 text-xs animate-fadeIn max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)]">
              <span className="w-5 h-5 rounded-full bg-rose-100/90 text-rose-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[13px]">remove_circle</span>
              </span>
              <span className="font-medium text-slate-700 whitespace-nowrap">
                Hapus Simpul · <strong className="text-slate-900 font-semibold">{getFacetVertices(activeFacet).length} titik</strong>
              </span>
              <button
                type="button"
                disabled={getFacetVertices(activeFacet).length <= 3}
                onClick={() => deleteLastVertex()}
                className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold transition flex items-center gap-1 shrink-0 whitespace-nowrap ${
                  getFacetVertices(activeFacet).length > 3
                    ? "bg-rose-50/90 text-rose-700 border border-rose-200/80 hover:bg-rose-100 cursor-pointer"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50"
                }`}
                title="Hapus simpul terakhir"
              >
                <span className="material-symbols-outlined text-[12px]">backspace</span>
                <span>Hapus Terakhir</span>
              </button>
              <button
                type="button"
                onClick={() => setCadTool("select")}
                className="px-2.5 py-0.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-[10.5px] font-semibold transition cursor-pointer shrink-0 whitespace-nowrap"
              >
                Selesai
              </button>
            </div>
          )}

          {/* Floating Tool Banner: Multi-Select Move Hint */}
          {cadTool === "select" && selectedFacetIds.length > 1 && !showDetectedRoofs && !scanConfirm && (
            <div className="absolute bottom-12 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/82 bg-gradient-to-r from-white/90 via-amber-50/35 to-sky-50/35 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_8px_28px_rgba(251,191,36,0.14),0_2px_10px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] text-slate-800 text-xs animate-fadeIn max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)]">
              <span className="w-5 h-5 rounded-full bg-amber-100/90 text-amber-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[13px]">select_all</span>
              </span>
              <span className="font-medium text-slate-700 truncate">
                <strong className="text-slate-900 font-semibold">{selectedFacetIds.length} bidang dipilih</strong> · Seret untuk geser
              </span>
              <button
                type="button"
                onClick={unselectAllFacets}
                className="px-2.5 py-0.5 rounded-full bg-slate-900/5 hover:bg-slate-900/10 text-slate-700 text-[10.5px] font-semibold transition cursor-pointer shrink-0 whitespace-nowrap"
              >
                Batal
              </button>
            </div>
          )}

          {/* Floating Tool Banner: Edit Polygon Hint */}
          {cadTool === "edit_polygon" && !showDetectedRoofs && !scanConfirm && (
            <div className="absolute bottom-12 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/82 bg-gradient-to-r from-white/90 via-amber-50/40 to-sky-50/35 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_8px_28px_rgba(251,191,36,0.16),0_2px_10px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] text-slate-800 text-xs animate-fadeIn max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)]">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-100 to-yellow-200 text-amber-900 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[13px]">polyline</span>
              </span>
              <span className="font-medium text-slate-700 truncate">
                Edit Poligon · Seret sudut atau garis
              </span>
              <button
                type="button"
                onClick={() => setCadTool("select")}
                className="px-2.5 py-0.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-[10.5px] font-semibold transition cursor-pointer shrink-0 whitespace-nowrap"
              >
                Selesai
              </button>
            </div>
          )}

          {/* Floating Tool Banner: Measure / CAD Overview Mode */}
          {cadTool === "measure" && (
            <div className="absolute bottom-12 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-3.5 py-1.5 rounded-2xl sm:rounded-full bg-white/82 bg-gradient-to-r from-white/90 via-amber-50/40 to-sky-50/35 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_8px_28px_rgba(251,191,36,0.16),0_2px_10px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] text-slate-800 text-xs animate-fadeIn max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)]">
              <span className="w-5 h-5 rounded-full bg-amber-100/90 text-amber-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[13px]">straighten</span>
              </span>
              <span className="font-medium text-slate-700 truncate min-w-0">
                {isMeasureClosed ? (
                  <>
                    Luas Terukur <strong className="font-code-metric text-emerald-700 font-semibold">{measureArea.toFixed(1)} m²</strong> · Keliling <strong className="font-code-metric text-slate-900 font-semibold">{measureTotalDistance.toFixed(1)} m</strong> · <strong className="font-code-metric text-slate-900 font-semibold">{measurePoints.length}</strong> sisi
                  </>
                ) : measurePoints.length > 0 ? (
                  <>
                    Jarak <strong className="font-code-metric text-slate-900 font-semibold">{measureTotalDistance.toFixed(1)} m</strong>
                    {measurePoints.length >= 3 && (
                      <span className="text-[11px] text-slate-500 ml-1">· Klik titik awal untuk tutup</span>
                    )}
                  </>
                ) : selectedFacetIds.length > 0 ? (
                  <>
                    Dimensi · <strong className="text-slate-900 font-semibold">{activeFacet.name}</strong>
                  </>
                ) : (
                  "Penggaris · Klik peta untuk ukur"
                )}
              </span>
              {isMeasureClosed && measurePoints.length >= 3 && (
                <button
                  type="button"
                  onClick={handleConvertMeasureToFacet}
                  className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 hover:from-amber-200 hover:to-amber-200 text-amber-950 text-[10.5px] font-semibold transition cursor-pointer border border-amber-200/90 shadow-[0_2px_8px_rgba(251,191,36,0.18),inset_0_1px_1px_rgba(255,255,255,0.9)] shrink-0 whitespace-nowrap"
                >
                  + Jadikan Atap
                </button>
              )}
              {measurePoints.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMeasurePoints([]);
                    setIsMeasureClosed(false);
                  }}
                  className="px-2 py-0.5 rounded-full bg-slate-900/5 hover:bg-slate-900/10 text-slate-600 text-[10.5px] font-semibold transition cursor-pointer shrink-0 whitespace-nowrap"
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
                className="px-2.5 py-0.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-[10.5px] font-semibold transition cursor-pointer shrink-0 whitespace-nowrap"
              >
                Selesai
              </button>
            </div>
          )}

          {/* Minimalist Apple Glass Scale Pill (Soft Radiant Glow) */}
          {viewportScale && (
            <div
              className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-25 pointer-events-auto select-none flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/75 bg-gradient-to-r from-white/88 via-amber-50/35 to-sky-50/35 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_6px_22px_rgba(251,191,36,0.14),0_2px_10px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] text-slate-800 cursor-default"
              title={
                viewportScale.status === "optimal"
                  ? `Cakupan ~${viewportScale.footprintM} m • Skala optimal untuk pindai atap`
                  : viewportScale.status === "too-close"
                    ? `Cakupan ~${viewportScale.footprintM} m • Terlalu dekat, zoom out agar atap utuh`
                    : viewportScale.status === "too-wide-warn"
                      ? `Cakupan ~${viewportScale.footprintM} m • Terlalu jauh, zoom in agar detail tajam`
                      : `Cakupan ~${viewportScale.footprintM} m • Terlalu jauh (maks. ${MAX_FOOTPRINT_M} m), zoom in terlebih dahulu`
              }
            >
              {/* Hairline Architectural Scale Bar */}
              <div className="flex flex-col items-center gap-[3px] pr-2.5 border-r border-slate-900/10">
                <span className="font-code-metric text-[10px] font-semibold text-slate-700 leading-none tracking-tight">
                  {viewportScale.barMeters} m
                </span>
                <div
                  className="h-[3.5px] border-x border-b border-slate-700/75"
                  style={{ width: `${viewportScale.barPx}px` }}
                />
              </div>

              {/* Minimal Scan Readiness Status */}
              <div className="flex items-center gap-1.5 text-[11px] leading-none">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    viewportScale.status === "optimal"
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.55)]"
                      : viewportScale.status === "too-wide-blocked"
                        ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]"
                        : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.65)]"
                  }`}
                />
                <span
                  className={`font-medium tracking-tight ${
                    viewportScale.status === "optimal"
                      ? "text-emerald-800"
                      : viewportScale.status === "too-wide-blocked"
                        ? "text-rose-800"
                        : "text-amber-900"
                  }`}
                >
                  {viewportScale.status === "optimal"
                    ? "Optimal"
                    : viewportScale.status === "too-close"
                      ? "Too close"
                      : "Too far"}
                </span>
              </div>
            </div>
          )}

          {/* Non-blocking Floating Pill: Konfirmasi Cakupan di Luar Rentang Ideal (Apple Glass + Soft Radiant Glow) */}
          {scanConfirm !== null && !isAiScanning && (
            <div className="absolute bottom-12 sm:bottom-5 left-1/2 -translate-x-1/2 z-35 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-2xl sm:rounded-full bg-white/82 bg-gradient-to-r from-white/90 via-amber-50/40 to-sky-50/35 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_12px_36px_rgba(251,191,36,0.18),0_4px_16px_rgba(56,189,248,0.10),inset_0_1px_1px_rgba(255,255,255,0.92)] text-slate-800 text-xs animate-fadeIn max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)] pointer-events-auto">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-100 via-yellow-100 to-amber-200/80 text-amber-900 border border-white/90 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[13px]">straighten</span>
              </span>
              <span className="font-medium text-slate-700 truncate">
                {scanConfirm.capture.footprintM < RECOMMENDED_MIN_FOOTPRINT_M
                  ? "Terlalu dekat untuk pindai"
                  : "Area terlalu luas untuk pindai"}
              </span>
              <button
                type="button"
                onClick={() => {
                  const map = mapInstanceRef.current;
                  const isTooClose = scanConfirm.capture.footprintM < RECOMMENDED_MIN_FOOTPRINT_M;
                  setScanConfirm(null);
                  if (map) {
                    if (isTooClose) {
                      map.zoomOut();
                    } else {
                      map.zoomIn();
                    }
                    showToast(
                      isTooClose
                        ? "Zoom diperkecil mendekati rentang ideal"
                        : "Zoom diperbesar mendekati rentang ideal"
                    );
                  }
                }}
                className="px-2.5 py-1 rounded-full bg-slate-900/5 hover:bg-slate-900/10 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition cursor-pointer shrink-0"
              >
                {scanConfirm.capture.footprintM < RECOMMENDED_MIN_FOOTPRINT_M ? "Zoom Out" : "Zoom In"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const pending = scanConfirm;
                  setScanConfirm(null);
                  void runRoofDetection(pending.capture);
                }}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 hover:from-amber-200 hover:to-amber-200 text-amber-950 border border-amber-200/90 shadow-[0_2px_10px_rgba(251,191,36,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] text-[11px] font-bold transition cursor-pointer shrink-0"
              >
                Tetap Pindai
              </button>
              <button
                type="button"
                onClick={() => setScanConfirm(null)}
                title="Tutup"
                aria-label="Tutup"
                className="w-6 h-6 rounded-full hover:bg-slate-900/5 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            </div>
          )}

          {/* AI Model Scanning Radar Animation Overlay */}
          {isAiScanning && (
            <div className="absolute inset-0 pointer-events-none z-35 flex flex-col items-center justify-center bg-slate-950/20 backdrop-blur-[1.5px] animate-fadeIn">
              <div className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white/88 bg-gradient-to-br from-white/95 via-amber-50/40 to-sky-50/35 backdrop-blur-2xl saturate-150 border border-white/90 shadow-[0_16px_44px_rgba(251,191,36,0.22),0_4px_18px_rgba(15,23,42,0.12),inset_0_1px_1px_rgba(255,255,255,0.95)] text-slate-800 text-center max-w-xs animate-scaleIn">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-200/80 flex items-center justify-center text-amber-800 border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
                  <span className="material-symbols-outlined text-[24px] animate-spin">radar</span>
                </div>
                <div>
                  <h4 className="font-title font-bold text-sm text-slate-900 m-0">Memindai Atap...</h4>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">Mendeteksi kontur bidang dari citra satelit</p>
                </div>
                <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 h-full w-2/3 animate-pulse rounded-full" />
                </div>
              </div>
            </div>
          )}

          {/* Panduan seleksi bidang hasil deteksi model */}
          {showDetectedRoofs && remainingDetectedRoofs.length > 0 && !isAiScanning && (
            <div className="absolute bottom-12 sm:bottom-5 left-1/2 -translate-x-1/2 z-35 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/82 bg-gradient-to-r from-white/90 via-amber-50/40 to-sky-50/35 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_10px_32px_rgba(251,191,36,0.18),0_2px_10px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] text-slate-800 text-xs animate-fadeIn max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)] pointer-events-auto">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-100 to-yellow-200/90 text-amber-900 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[13px]">psychology</span>
              </span>
              <span className="font-medium text-slate-700 truncate">
                <strong className="text-slate-900 font-semibold">{remainingDetectedRoofs.length} atap terdeteksi</strong>
                {selectedDetectedIds.length > 0
                  ? ` · ${selectedDetectedIds.length} dipilih`
                  : " · Klik atap pada peta"}
              </span>
              <button
                type="button"
                onClick={commitDetectedSelection}
                disabled={selectedDetectedIds.length === 0}
                className={`px-3 py-1 rounded-full font-semibold text-[11px] border transition shrink-0 ${
                  selectedDetectedIds.length > 0
                    ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 hover:from-amber-200 hover:to-amber-200 active:scale-95 text-amber-950 border-amber-200/90 shadow-[0_2px_10px_rgba(251,191,36,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] cursor-pointer"
                    : "bg-slate-900/5 text-slate-400 border-transparent cursor-not-allowed"
                }`}
                title="Terapkan bidang terpilih ke kanvas"
              >
                Terapkan
              </button>
            </div>
          )}

          {/* Deteksi selesai tanpa bidang */}
          {detection !== null && detectedRoofs.length === 0 && !isAiScanning && (
            <div className="absolute bottom-12 sm:bottom-5 left-1/2 -translate-x-1/2 z-35 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/82 bg-gradient-to-r from-white/90 via-amber-50/30 to-sky-50/30 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_8px_28px_rgba(15,23,42,0.10),inset_0_1px_1px_rgba(255,255,255,0.92)] text-slate-800 text-xs animate-fadeIn max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)] pointer-events-auto">
              <span className="w-5 h-5 rounded-full bg-slate-900/5 text-slate-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[13px]">search_off</span>
              </span>
              <span className="font-medium text-slate-700 truncate">
                Tidak ada atap ditemukan · Arahkan peta ke area atap
              </span>
              <button
                type="button"
                onClick={() => setDetection(null)}
                title="Tutup"
                aria-label="Tutup"
                className="w-6 h-6 rounded-full hover:bg-slate-900/5 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
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
                inverterType,
                shadingLossPct
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
              // Titik poligon dalam koordinat layar SVG, dipakai bersama oleh
              // perimeter, sisi, dan handle simpul. Harus setelah `polyWidth` dan
              // `polyHeight` karena keduanya menjadi titik tengah bidang.
              const facetPoints = facetVerts.map((vertex) => ({
                x: polyWidth / 2 + vertex.x * pixelsPerMeter,
                y: polyHeight / 2 + vertex.y * pixelsPerMeter,
              }));
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
                  className={`absolute select-none ${
                    cadTool === "pen" ? "pointer-events-none" : "pointer-events-auto"
                  }`}
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
                    touchAction: cadTool === "select" || cadTool === "edit_polygon" ? "none" : undefined,
                  }}
                  onPointerDown={(e) => {
                    if ((cadTool === "select" || cadTool === "edit_polygon") && !e.shiftKey) {
                      startDrag(
                        e,
                        facet.id,
                        "move",
                        facet.ridge,
                        facet.slope,
                        facet.rotation,
                        facet.offsetX,
                        facet.offsetY,
                        facet.lat || -6.6110,
                        facet.lng || 106.8150
                      );
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragMovedRef.current) {
                      dragMovedRef.current = false;
                      return;
                    }
                    if (e.shiftKey) {
                      toggleFacetSelection(facet.id);
                      return;
                    }
                    if (!selectedFacetIds.includes(facet.id)) {
                      setSelectedFacetIds([facet.id]);
                    } else {
                      setActiveFacetId(facet.id);
                    }
                    if (facet.isSolarPopulated === false) {
                      populateFacetWithSolar(facet.id);
                    } else {
                      showToast(`Memilih ${facet.name || "bidang atap"}`);
                    }
                  }}
                >
                  {/* Outer Roof Boundary */}
                  <div
                    className={`absolute inset-0 transition-all duration-200 ${
                      cadTool === "pen" ? "pointer-events-none" : "pointer-events-auto"
                    }`}
                  >
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

                      {/*
                        Sisi & simpul tampil di mode `edit_polygon`, `pen`, `delete_vertex`, dan `measure`:
                        - `edit_polygon`: geser simpul sudut & seret sisi/kotak tengah garis (tanpa +)
                        - `pen`: tampilkan simpul poligon yang ada + indikator `+` saat hover sisi untuk tambah titik
                        - `delete_vertex`: hapus simpul atau sisi
                        - `measure`: tampilkan garis, angka sisi tanpa pil, dan titik sudut identik dengan Pen Tool (hanya baca, titik tidak bisa digeser)
                      */}
                      {(isSelected || isActive) &&
                        (cadTool === "edit_polygon" ||
                          cadTool === "pen" ||
                          cadTool === "delete_vertex" ||
                          cadTool === "measure") && (
                        <g>
                          {facetVerts.map((_, edgeIdx) => {
                            const from = facetPoints[edgeIdx];
                            const to = facetPoints[(edgeIdx + 1) % facetPoints.length];
                            const midX = (from.x + to.x) / 2;
                            const midY = (from.y + to.y) / 2;
                            const edgeAngleDeg = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
                            const edgeLenM = Math.hypot(to.x - from.x, to.y - from.y) / pixelsPerMeter;
                            const canDeleteEdge =
                              cadTool === "delete_vertex" && facetVerts.length > 3;
                            const canResizeEdge = cadTool === "edit_polygon";
                            const canInsertVertex = cadTool === "pen";
                            const isMeasureEdgeView = cadTool === "measure";
                            const hoveredEdge =
                              edgeHover !== null &&
                              edgeHover.facetId === facet.id &&
                              edgeHover.edgeIdx === edgeIdx
                                ? edgeHover
                                : null;
                            const isEdgeHovered =
                              hoveredEdge !== null ||
                              (edgeDragState !== null &&
                                edgeDragState.facetId === facet.id &&
                                edgeDragState.edgeIdx === edgeIdx);

                            return (
                              <g key={`edge-${facet.id}-${edgeIdx}`}>
                                <line
                                  x1={from.x}
                                  y1={from.y}
                                  x2={to.x}
                                  y2={to.y}
                                  stroke={
                                    cadTool === "delete_vertex"
                                      ? "#fb7185"
                                      : isEdgeHovered
                                        ? "#0ea5e9"
                                        : "#fbbf24"
                                  }
                                  strokeWidth={isEdgeHovered ? 3.5 : 2.5}
                                  strokeLinecap="round"
                                  opacity={cadTool === "delete_vertex" ? 0.95 : 0.85}
                                  className="pointer-events-none transition-colors"
                                />

                                {canDeleteEdge && (
                                  <line
                                    x1={from.x}
                                    y1={from.y}
                                    x2={to.x}
                                    y2={to.y}
                                    stroke="transparent"
                                    strokeWidth={22}
                                    strokeLinecap="round"
                                    style={{ cursor: "pointer", touchAction: "none" }}
                                    className="pointer-events-auto"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteEdge(facet.id, edgeIdx);
                                    }}
                                  />
                                )}

                                {/* Mode Pen Tool: hover sisi memunculkan tanda `+` dan klik menyisipkan titik baru */}
                                {canInsertVertex && (
                                  <>
                                    <line
                                      x1={from.x}
                                      y1={from.y}
                                      x2={to.x}
                                      y2={to.y}
                                      stroke="transparent"
                                      strokeWidth={22}
                                      strokeLinecap="round"
                                      style={{ cursor: "crosshair" }}
                                      className="pointer-events-auto"
                                      onMouseMove={(e: ReactMouseEvent<SVGLineElement>) => {
                                        const svg = e.currentTarget.ownerSVGElement;
                                        const ctm = svg?.getScreenCTM();
                                        if (!svg || !ctm) return;

                                        const cursor = svg.createSVGPoint();
                                        cursor.x = e.clientX;
                                        cursor.y = e.clientY;
                                        const local = cursor.matrixTransform(ctm.inverse());

                                        const dx = to.x - from.x;
                                        const dy = to.y - from.y;
                                        const lenSq = dx * dx + dy * dy;
                                        const t =
                                          lenSq === 0
                                            ? 0.5
                                            : Math.max(
                                                0,
                                                Math.min(
                                                  1,
                                                  ((local.x - from.x) * dx + (local.y - from.y) * dy) / lenSq
                                                )
                                              );

                                        if (t < 0.04 || t > 0.96) {
                                          setEdgeHover(null);
                                          return;
                                        }

                                        const point = {
                                          x: from.x + t * dx,
                                          y: from.y + t * dy,
                                        };
                                        setEdgeHover({
                                          facetId: facet.id,
                                          edgeIdx,
                                          point,
                                          localPoint: {
                                            x: (point.x - polyWidth / 2) / pixelsPerMeter,
                                            y: (point.y - polyHeight / 2) / pixelsPerMeter,
                                          },
                                        });
                                      }}
                                      onMouseLeave={() =>
                                        setEdgeHover((prev) =>
                                          prev !== null &&
                                          prev.facetId === facet.id &&
                                          prev.edgeIdx === edgeIdx
                                            ? null
                                            : prev
                                        )
                                      }
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const insertPt = hoveredEdge?.localPoint ?? {
                                          x: ((from.x + to.x) / 2 - polyWidth / 2) / pixelsPerMeter,
                                          y: ((from.y + to.y) / 2 - polyHeight / 2) / pixelsPerMeter,
                                        };
                                        insertVertexOnEdge(facet.id, edgeIdx, insertPt);
                                      }}
                                    />

                                    {hoveredEdge?.point && (
                                      <g className="pointer-events-none">
                                        <circle
                                          cx={hoveredEdge.point.x}
                                          cy={hoveredEdge.point.y}
                                          r={9}
                                          fill="#ffffff"
                                          fillOpacity={0.92}
                                          stroke="#0ea5e9"
                                          strokeWidth={1.6}
                                          strokeDasharray="3 2"
                                          className="drop-shadow-sm"
                                        />
                                        <line
                                          x1={hoveredEdge.point.x - 4}
                                          y1={hoveredEdge.point.y}
                                          x2={hoveredEdge.point.x + 4}
                                          y2={hoveredEdge.point.y}
                                          stroke="#0369a1"
                                          strokeWidth={2}
                                          strokeLinecap="round"
                                        />
                                        <line
                                          x1={hoveredEdge.point.x}
                                          y1={hoveredEdge.point.y - 4}
                                          x2={hoveredEdge.point.x}
                                          y2={hoveredEdge.point.y + 4}
                                          stroke="#0369a1"
                                          strokeWidth={2}
                                          strokeLinecap="round"
                                        />
                                      </g>
                                    )}
                                  </>
                                )}

                                {/*
                                  Mode Edit Poligon: seret garis atau kotak di tengah sisi
                                  untuk menggeser sisi & mengubah ukuran poligon (tanpa tambah simpul).
                                */}
                                {canResizeEdge && (
                                  <>
                                    <line
                                      x1={from.x}
                                      y1={from.y}
                                      x2={to.x}
                                      y2={to.y}
                                      stroke="transparent"
                                      strokeWidth={22}
                                      strokeLinecap="round"
                                      style={{ cursor: "grab", touchAction: "none" }}
                                      className="pointer-events-auto"
                                      onMouseEnter={() =>
                                        setEdgeHover({ facetId: facet.id, edgeIdx })
                                      }
                                      onMouseLeave={() =>
                                        setEdgeHover((prev) =>
                                          prev !== null &&
                                          prev.facetId === facet.id &&
                                          prev.edgeIdx === edgeIdx
                                            ? null
                                            : prev
                                        )
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      onPointerDown={(e) => startEdgeDrag(e, facet.id, edgeIdx)}
                                    />

                                    {/* Kotak tarik di tengah garis saat di-hover atau sedang diseret */}
                                    {isEdgeHovered && (
                                      <g
                                        transform={`translate(${midX}, ${midY}) rotate(${edgeAngleDeg})`}
                                        className="pointer-events-auto"
                                        style={{ cursor: "ns-resize", touchAction: "none" }}
                                        onMouseEnter={() =>
                                          setEdgeHover({ facetId: facet.id, edgeIdx })
                                        }
                                        onMouseLeave={() =>
                                          setEdgeHover((prev) =>
                                            prev !== null &&
                                            prev.facetId === facet.id &&
                                            prev.edgeIdx === edgeIdx
                                              ? null
                                              : prev
                                          )
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => startEdgeDrag(e, facet.id, edgeIdx)}
                                      >
                                        <rect
                                          x="-6"
                                          y="-6"
                                          width="12"
                                          height="12"
                                          rx="2.5"
                                          fill="#ffffff"
                                          stroke="#0284c7"
                                          strokeWidth="2"
                                          className="drop-shadow-sm"
                                        />
                                        <line
                                          x1="-3"
                                          y1="0"
                                          x2="3"
                                          y2="0"
                                          stroke="#0284c7"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                        />
                                      </g>
                                    )}
                                  </>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      )}

                      {/* Simpul poligon tampil pada mode edit_polygon, pen, delete_vertex, dan measure (read-only pada mode measure). */}
                      {(isSelected || isActive) &&
                        (cadTool === "edit_polygon" ||
                          cadTool === "pen" ||
                          cadTool === "delete_vertex" ||
                          cadTool === "measure") && (
                        <g className={cadTool === "measure" ? "pointer-events-none" : "pointer-events-auto"}>
                          {facetPoints.map((point, vertexIdx) => {
                            const isDeleteMode = cadTool === "delete_vertex";
                            const isReadOnlyVertex = cadTool === "measure";
                            const canDeleteVertex = isDeleteMode && facetVerts.length > 3;

                            return (
                              <g key={`vertex-${facet.id}-${vertexIdx}`}>
                                {!isReadOnlyVertex && (
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={isDeleteMode ? 16 : 15}
                                    fill="transparent"
                                    style={{ cursor: isDeleteMode ? "pointer" : "grab", touchAction: "none" }}
                                    onPointerDown={
                                      isDeleteMode
                                        ? (e) => e.stopPropagation()
                                        : (e) => startVertexDrag(e, facet.id, vertexIdx)
                                    }
                                    onClick={
                                      canDeleteVertex
                                        ? (e) => {
                                            e.stopPropagation();
                                            deleteVertex(vertexIdx, facet.id);
                                          }
                                        : undefined
                                    }
                                    onDoubleClick={
                                      isDeleteMode
                                        ? undefined
                                        : (e) => {
                                            e.stopPropagation();
                                            deleteVertex(vertexIdx, facet.id);
                                          }
                                    }
                                  />
                                )}
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={isDeleteMode ? 6 : 5}
                                  fill={isDeleteMode ? "#f43f5e" : "#ffffff"}
                                  stroke={
                                    isDeleteMode
                                      ? "#881337"
                                      : isActive
                                        ? "#0284c7"
                                        : "#f59e0b"
                                  }
                                  strokeWidth={2.5}
                                  className="pointer-events-none"
                                />
                              </g>
                            );
                          })}
                        </g>
                      )}
                    </svg>

                    {/* Top Ridge Tag (Scaled cleanly without clutter - rectangular roofs only, hidden in measure mode) */}
                    {isSelected && cadTool !== "measure" && facet.shape === "rectangle" && (
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

                    {/* Right Slope Tag (Scaled cleanly without clutter - rectangular roofs only, hidden in measure mode) */}
                    {isSelected && cadTool !== "measure" && facet.shape === "rectangle" && (
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

                          const isLargeArray = fMetrics.validSlots.length > 400;
                          const showCellWattage = !isLargeArray && pixelsPerMeter >= 26;
                          const isMicroCell = isLargeArray || pixelsPerMeter < 16;

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
                              className={`absolute rounded-[1.5px] ${isLargeArray ? "" : "transition-all"} flex items-center justify-center border overflow-hidden ${
                                cadTool === "pen" ? "pointer-events-none" : "pointer-events-auto"
                              } ${
                                obstacleBrush ? "cursor-crosshair ring-1 ring-amber-300" : "cursor-pointer"
                              } ${
                                state === "active"
                                  ? isLargeArray
                                    ? "bg-[#0F1C36] border-sky-400/50 hover:border-amber-400"
                                    : "bg-gradient-to-b from-[#0B1528] via-[#0F1C36] to-[#0A1325] border-sky-400/50 hover:border-amber-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] hover:scale-[1.02]"
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
                                isLargeArray ? null : (
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
                                )
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

                    {/* Label Panjang Garis Poligon di Lapisan Teratas (z-30) & Digeser Keluar Bidang agar Tidak Tertutup Panel */}
                    {(isSelected || isActive) &&
                      (cadTool === "edit_polygon" || cadTool === "pen" || cadTool === "measure") &&
                      facetPoints.length >= 3 && (() => {
                        let signedArea = 0;
                        for (let i = 0; i < facetPoints.length; i++) {
                          const p1 = facetPoints[i];
                          const p2 = facetPoints[(i + 1) % facetPoints.length];
                          signedArea += p1.x * p2.y - p2.x * p1.y;
                        }
                        const outSign = signedArea >= 0 ? 1 : -1;
                        const minEdgeM = cadTool === "measure" ? 0.2 : 1;

                        return (
                          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-30">
                            {facetPoints.map((from, edgeIdx) => {
                              const to = facetPoints[(edgeIdx + 1) % facetPoints.length];
                              const pxLen = Math.hypot(to.x - from.x, to.y - from.y);
                              const edgeLenM = pxLen / pixelsPerMeter;
                              if (edgeLenM < minEdgeM || pxLen < 1) return null;

                              const midX = (from.x + to.x) / 2;
                              const midY = (from.y + to.y) / 2;
                              // Normal luar poligon berbasis arah putaran simpul (selalu keluar bidang)
                              const nx = ((to.y - from.y) / pxLen) * outSign;
                              const ny = (-(to.x - from.x) / pxLen) * outSign;
                              const outwardPx = 14;

                              return (
                                <text
                                  key={`dim-out-${facet.id}-${edgeIdx}`}
                                  x={midX + nx * outwardPx}
                                  y={midY + ny * outwardPx}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill="#ffffff"
                                  fontSize="10"
                                  fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                                  fontWeight="700"
                                  letterSpacing="0.02em"
                                  stroke="#0f172a"
                                  strokeWidth="2.4"
                                  strokeLinejoin="round"
                                  paintOrder="stroke"
                                >
                                  {edgeLenM.toFixed(1)}
                                  <tspan dx="2.5" fontSize="9" fontWeight="600">m</tspan>
                                </text>
                              );
                            })}
                          </svg>
                        );
                      })()}

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
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/90 text-white shadow-sm border border-white/20 backdrop-blur-md flex items-center gap-1.5 pointer-events-none whitespace-nowrap z-25 text-[10px] ${
                          cadTool === "edit_polygon" || cadTool === "pen" ? "-bottom-9" : "-bottom-6"
                        }`}
                      >
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

                    {/* CAD Measure Overview Card (Apple Glass + Soft Radiant Glow, zero pill edge clutter) */}
                    {isSelected && cadTool === "measure" && (() => {
                      const totalPerimeter = polygonPerimeter(facetVerts);

                      return (
                        <div
                          className="absolute top-[calc(100%+18px)] left-1/2 -translate-x-1/2 z-40 w-56 sm:w-64 max-w-[calc(100vw-2rem)] p-3 sm:p-3.5 rounded-2xl bg-white/82 bg-gradient-to-br from-white/92 via-amber-50/35 to-sky-50/30 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(245,158,11,0.16),0_4px_14px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] text-slate-800 pointer-events-auto animate-fadeIn select-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Header: Nama Bidang & Jumlah Titik */}
                          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-900/[0.06]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-700 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
                                <span className="material-symbols-outlined text-[14px]">architecture</span>
                              </span>
                              <span className="text-[12.5px] font-semibold text-slate-900 tracking-tight truncate">
                                {facet.name}
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-slate-400 shrink-0 tabular-nums">
                              {facetVerts.length} titik
                            </span>
                          </div>

                          {/* Hero Metric: Luas Atap & Area Efektif */}
                          <div className="flex items-end justify-between gap-2 py-2.5">
                            <div>
                              <span className="text-[11px] font-medium text-slate-500 block">
                                Luas atap
                              </span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-[22px] leading-none font-semibold tracking-tight text-slate-900 font-code-metric tabular-nums">
                                  {fMetrics.grossArea.toFixed(1)}
                                </span>
                                <span className="text-xs font-medium text-slate-400">m²</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10.5px] text-slate-400 block">Efektif</span>
                              <span className="text-[12.5px] font-semibold text-emerald-700 font-code-metric tabular-nums">
                                {fMetrics.netArea.toFixed(1)} m²
                              </span>
                            </div>
                          </div>

                          {/* Grouped Dimensions Strip (Single inset surface, zero nested boxes) */}
                          <div className="grid grid-cols-2 divide-x divide-slate-900/[0.07] rounded-xl bg-slate-900/[0.04] py-2">
                            <div className="px-2.5">
                              <span className="text-[10.5px] text-slate-500 block">Keliling</span>
                              <span className="text-[12.5px] font-semibold text-slate-900 font-code-metric tabular-nums">
                                {totalPerimeter.toFixed(1)} m
                              </span>
                            </div>
                            <div className="px-2.5">
                              <span className="text-[10.5px] text-slate-500 block">Dimensi</span>
                              <span className="text-[12.5px] font-semibold text-slate-900 font-code-metric tabular-nums">
                                {bounds.width.toFixed(1)} × {bounds.height.toFixed(1)} m
                              </span>
                            </div>
                          </div>

                          {/* Quiet Parameter Summary */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2.5 mt-2.5 border-t border-slate-900/[0.06] font-code-metric">
                            <span>
                              Setback {(facet.setback ?? 0.5).toFixed(1)}m · Celah {Math.round(facet.panelGap ?? 3)}cm
                            </span>
                            <span className="font-semibold text-amber-800">
                              {fMetrics.modulesFitted} panel ({fMetrics.actualKwp.toFixed(1)} kWp)
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Precision Handles (Selected Only) */}
                  {isSelected && (
                    <>
                      {/* Top Rotation Handle */}
                      <div
                        className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center group cursor-grab active:cursor-grabbing z-20 touch-none"
                        title="Putar sudut atap"
                        onPointerDown={(e) =>
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
                        <div className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-white shadow-lg border border-slate-300 flex items-center justify-center text-slate-600 group-hover:text-amber-600 group-hover:border-amber-400 group-hover:scale-110 transition-all">
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
            className="absolute top-15 sm:top-1/2 sm:-translate-y-1/2 left-2.5 sm:left-4 z-30 flex flex-col items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] border border-white/80"
          >
            {/* 1. Select / Move */}
            <button
              type="button"
              onClick={() => {
                setCadTool("select");
                showToast("Mode Pilih & Geser aktif");
              }}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "select"
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
              }`}
              title="Pilih & Geser Poligon"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[19px]">near_me</span>
            </button>

            {/* 2. Edit Polygon / Vertices & Edges */}
            <button
              type="button"
              onClick={() => {
                setCadTool("edit_polygon");
                setActiveTab("geometry");
                showToast("Mode Edit Poligon aktif — seret titik sudut atau kotak di tengah sisi untuk ubah ukuran");
              }}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "edit_polygon"
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
              }`}
              title="Edit Poligon: Seret Titik Sudut atau Tengah Garis"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[19px]">polyline</span>
            </button>

            {/* 3. Pen Tool (Custom Polygon Point-by-Point) */}
            <button
              type="button"
              onClick={() => {
                setCadTool("pen");
                setPenPoints([]);
                showToast("Mode Pen Tool aktif — klik peta untuk membuat titik & panjang sisi poligon");
              }}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "pen"
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
              }`}
              title="Pen Tool: Gambar Poligon Baru & Panjang Garis"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[19px]">edit</span>
            </button>

            {/* 5. Delete Vertex Tool (Hapus Titik Poligon) */}
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
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "delete_vertex"
                  ? "bg-gradient-to-r from-rose-200 via-amber-200 to-rose-200 text-rose-950 font-bold shadow-[0_2px_8px_rgba(244,63,94,0.25),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-rose-300/80"
                  : "text-slate-600 hover:text-rose-600 hover:bg-rose-50/70"
              }`}
              title="Hapus Titik Simpul Poligon"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[19px]">remove_circle_outline</span>
            </button>

            {/* 6. Measure & CAD Overview Tool */}
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
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                cadTool === "measure"
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-50/70"
              }`}
              title="Penggaris & Dimensi CAD"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[19px]">straighten</span>
            </button>

            {/* 7. AI Rooftop Detection Tool (Under Ruler) */}
            <button
              id="studio-ai-scan-btn"
              type="button"
              onClick={handleRunAiDetection}
              disabled={isAiScanning}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition ${
                isAiScanning ? "cursor-progress opacity-70" : "cursor-pointer"
              } ${
                detection !== null || isAiScanning
                  ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.25),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-amber-300/80"
                  : "text-slate-600 hover:text-amber-700 hover:bg-amber-50/70"
              }`}
              title="Pindai Bidang Atap dengan Model AI (Computer Vision)"
            >
              <span className={`material-symbols-outlined text-[18px] sm:text-[19px] ${isAiScanning ? "animate-spin text-amber-900" : "text-amber-800"}`}>
                {isAiScanning ? "sync" : "psychology"}
              </span>
            </button>

            {/* Divider */}
            <div className="w-5 h-px bg-slate-200 my-0.5" />

            {/* 8. Panduan Studio bersama Sunny */}
            <button
              type="button"
              onClick={() => {
                if (mascotGuideOpen) {
                  closeStudioGuide();
                } else {
                  setMascotGuideOpen(true);
                }
              }}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${
                mascotGuideOpen
                  ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 text-amber-950 border border-amber-200/90 shadow-[0_2px_10px_rgba(251,191,36,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] font-bold"
                  : "bg-white/90 text-slate-700 hover:bg-amber-50/70 hover:text-amber-900"
              }`}
              title="Panduan Studio bersama Sunny"
              aria-label="Panduan Studio"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[19px] text-amber-700 font-bold">
                help
              </span>
              {!studioGuideCompleted && (
                <span
                  aria-hidden="true"
                  className="absolute top-1 right-1 w-2 h-2 rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 ring-2 ring-white shadow-[0_0_8px_rgba(251,191,36,0.75)] animate-pulse"
                />
              )}
            </button>
          </div>

          {/* Interactive Studio Mascot Guide (Sunny) */}
          <StudioMascotGuide
            isOpen={mascotGuideOpen}
            onOpen={() => setMascotGuideOpen(true)}
            onClose={closeStudioGuide}
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
            RIGHT: INSPECTOR & PARAMETER STUDIO (Apple Glass + Soft Radiant Glow)
            ======================================================= */}
        <div
          id="studio-sidebar-inspector"
          className={`relative shrink-0 bg-white/82 bg-gradient-to-b from-white/92 via-amber-50/20 to-sky-50/25 backdrop-blur-2xl saturate-150 border-t lg:border-t-0 lg:border-l border-white/85 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] lg:shadow-[-8px_0_32px_rgba(15,23,42,0.06)] z-30 transition-all duration-300 overflow-visible flex flex-col ${
            rightPanelOpen
              ? "h-[52dvh] sm:h-[46dvh] lg:h-full w-full lg:w-[340px] xl:w-[380px]"
              : "h-12 lg:h-full w-full lg:w-0"
          }`}
        >
          {/* Desktop Panel Toggle */}
          <button
            type="button"
            onClick={() => setRightPanelOpen((prev) => !prev)}
            className="absolute -left-7 top-1/2 -translate-y-1/2 w-7 h-14 bg-white/88 backdrop-blur-xl border border-white/90 border-r-0 rounded-l-xl shadow-[-4px_0_16px_rgba(15,23,42,0.08)] hidden lg:flex items-center justify-center text-slate-400 hover:text-amber-700 transition-colors z-40 cursor-pointer"
            aria-label="Toggle Panel"
          >
            <span className="material-symbols-outlined text-[20px]">
              {rightPanelOpen ? "chevron_right" : "chevron_left"}
            </span>
          </button>

          {/* Mobile & Tablet Collapsible Sheet Toggle Bar */}
          <button
            type="button"
            onClick={() => setRightPanelOpen((prev) => !prev)}
            className="flex lg:hidden items-center justify-between gap-2 w-full h-12 px-3.5 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 shrink-0 cursor-pointer text-left"
            aria-label={rightPanelOpen ? "Ciutkan Panel Parameter" : "Buka Panel Parameter"}
            aria-expanded={rightPanelOpen}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">tune</span>
              </span>
              <span className="text-xs font-bold text-slate-900 truncate">
                Parameter &amp; Simulasi
              </span>
              <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full font-code-metric shrink-0">
                {calc.actualKwp.toFixed(1)} kWp · {calc.totalModulesFitted} panel
              </span>
            </div>
            <span className="w-7 h-7 rounded-full bg-slate-900/[0.05] text-slate-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                {rightPanelOpen ? "expand_more" : "expand_less"}
              </span>
            </span>
          </button>

          <div
            className={`w-full lg:w-[340px] xl:w-[380px] shrink-0 flex-1 min-h-0 lg:h-full flex flex-col overflow-hidden bg-transparent ${
              rightPanelOpen ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Eco-Forest Diorama & Compact Glass Metrics */}
            <div className="p-2.5 sm:p-3 pb-2 sm:pb-2.5 bg-white/55 border-b border-slate-200/60 shrink-0">
              <div className="hidden sm:flex relative w-full h-22 lg:h-26 rounded-2xl bg-gradient-to-b from-sky-200/85 via-sky-100/55 to-emerald-100/80 border border-white/90 overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_4px_14px_rgba(15,23,42,0.04)] flex-col justify-between p-2.5">
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

              {/* Minimal Metrics Ribbon (Frosted Glass) */}
              <div className="grid grid-cols-4 divide-x divide-slate-200/70 bg-white/80 backdrop-blur-md rounded-2xl border border-white/95 shadow-[0_2px_10px_rgba(15,23,42,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] py-1.5 sm:py-2 px-0.5 sm:mt-2">
                <div className="flex flex-col items-center text-center px-0.5 sm:px-1 min-w-0">
                  <span className="text-[8.5px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 truncate max-w-full">Kapasitas</span>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight font-code-metric">
                      {calc.actualKwp.toFixed(1)}
                    </span>
                    <span className="text-[9px] sm:text-[9.5px] font-semibold text-amber-700">kWp</span>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center px-0.5 sm:px-1 min-w-0">
                  <span className="text-[8.5px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 truncate max-w-full">Produksi</span>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight font-code-metric">
                      {(calc.annualProductionKwh / 1000).toFixed(1)}
                    </span>
                    <span className="text-[9px] sm:text-[9.5px] font-semibold text-slate-500">MWh</span>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center px-0.5 sm:px-1 min-w-0">
                  <span className="text-[8.5px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 truncate max-w-full">Hemat/Bln</span>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xs sm:text-[13px] font-bold text-emerald-700 tracking-tight font-code-metric">
                      {(calc.cappedSaving / 1_000_000).toFixed(2)}M
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center px-0.5 sm:px-1 min-w-0">
                  <span className="text-[8.5px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 truncate max-w-full">Payback</span>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xs sm:text-[13px] font-bold text-amber-800 tracking-tight font-code-metric">
                      {calc.paybackYears ? calc.paybackYears.toFixed(1) : "—"}
                    </span>
                    <span className="text-[9px] sm:text-[9.5px] font-semibold text-slate-500">Thn</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Apple Segmented Control Tabs (Soft Radiant Glow Active) */}
            <div className="px-3 py-2 bg-white/40 border-b border-slate-200/60 shrink-0">
              <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-900/[0.045] gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("geometry")}
                  className={`py-1.5 px-2 rounded-xl text-center font-title text-xs transition-all cursor-pointer ${
                    activeTab === "geometry"
                      ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 text-amber-950 font-semibold border border-amber-200/90 shadow-[0_2px_10px_rgba(251,191,36,0.20),inset_0_1px_1px_rgba(255,255,255,0.9)]"
                      : "text-slate-600 hover:text-slate-900 font-medium"
                  }`}
                >
                  Geometri
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pvarray")}
                  className={`py-1.5 px-2 rounded-xl text-center font-title text-xs transition-all cursor-pointer ${
                    activeTab === "pvarray"
                      ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 text-amber-950 font-semibold border border-amber-200/90 shadow-[0_2px_10px_rgba(251,191,36,0.20),inset_0_1px_1px_rgba(255,255,255,0.9)]"
                      : "text-slate-600 hover:text-slate-900 font-medium"
                  }`}
                >
                  Modul
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("financials")}
                  className={`py-1.5 px-2 rounded-xl text-center font-title text-xs transition-all cursor-pointer ${
                    activeTab === "financials"
                      ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 text-amber-950 font-semibold border border-amber-200/90 shadow-[0_2px_10px_rgba(251,191,36,0.20),inset_0_1px_1px_rgba(255,255,255,0.9)]"
                      : "text-slate-600 hover:text-slate-900 font-medium"
                  }`}
                >
                  Finansial
                </button>
              </div>
            </div>

            {/* TAB PANES */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "geometry" && (
                <GeometryTab
                  facets={facets}
                  selectedFacetIds={selectedFacetIds}
                  activeFacetId={activeFacetId}
                  activeFacet={activeFacet}
                  bindFacetStripScroll={bindFacetStripScroll}
                  onSelectAllFacets={selectAllFacets}
                  onUnselectAllFacets={unselectAllFacets}
                  onAddNewFacet={addNewFacet}
                  onToggleFacetSelection={toggleFacetSelection}
                  onFocusFacet={(id) => {
                    setSelectedFacetIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                    setActiveFacetId(id);
                  }}
                  onDeleteFacet={deleteFacet}
                  isAiScanning={isAiScanning}
                  onRunAiDetection={handleRunAiDetection}
                  showDetectedRoofs={showDetectedRoofs}
                  remainingDetectedRoofs={remainingDetectedRoofs}
                  selectedDetectedIds={selectedDetectedIds}
                  onSelectDetectedRoof={selectDetectedRoof}
                  onCommitDetectedSelection={commitDetectedSelection}
                  roofShape={roofShape}
                  setRoofShape={setRoofShape}
                  polygonRotation={polygonRotation}
                  setPolygonRotation={setPolygonRotation}
                  onNudgeFacet={nudgeFacet}
                  onCenterFacetOnRoof={centerFacetOnRoof}
                  obstacleBrush={obstacleBrush}
                  setObstacleBrush={setObstacleBrush}
                  onResetManualObstacles={() => {
                    setSlotOverrides({});
                    showToast("Rintangan manual direset");
                  }}
                  onSelectBrushToast={(label) => showToast(`Kuas ${label}: klik slot panel di peta`)}
                  netArea={calc.netArea}
                  onUpdateFacetName={(name) => updateActiveFacet({ name })}
                  ridge={ridge}
                  setRidge={setRidge}
                  slope={slope}
                  setSlope={setSlope}
                  setback={setback}
                  setSetback={setSetback}
                  gutter={gutter}
                  setGutter={setGutter}
                  pitch={pitch}
                  setPitch={setPitch}
                  wedgePathD={wedgePathD}
                  arcPathD={arcPathD}
                  pitchCosine={calc.pitchCosine}
                  pitchEffPct={calc.pitchEffPct}
                  azimuth={azimuth}
                  setAzimuth={setAzimuth}
                  onNudgeAzimuth={nudgeAzimuth}
                  azInfo={azInfo}
                  azimuthEffPct={calc.azimuthEffPct}
                  alignToAzimuth={alignToAzimuth}
                  setAlignToAzimuth={setAlignToAzimuth}
                  onNextTab={() => setActiveTab("pvarray")}
                />
              )}

              {activeTab === "pvarray" && (
                <ModuleTab
                  activeFacetId={activeFacet.id}
                  modulePower={modulePower}
                  setModulePower={setModulePower}
                  adjustModuleCount={adjustModuleCount}
                  setCustomModuleCount={setCustomModuleCount}
                  setCountPreset={setCountPreset}
                  orientation={orientation}
                  setOrientation={setOrientation}
                  panelGap={panelGap}
                  setPanelGap={setPanelGap}
                  extraTilt={extraTilt}
                  setExtraTilt={setExtraTilt}
                  shadingLossPct={shadingLossPct}
                  setShadingLossPct={setShadingLossPct}
                  inverterType={inverterType}
                  setInverterType={setInverterType}
                  calc={calc}
                  moduleRecommendation={moduleRecommendation}
                  onDismissRecommendation={() => setModuleRecommendation(null)}
                  onFindOptimalRecommendation={findOptimalModuleRecommendation}
                  onApplyRecommendation={applyModuleRecommendation}
                  onNextTab={() => setActiveTab("financials")}
                />
              )}

              {activeTab === "financials" && (
                <FinancialTab
                  plnTariff={plnTariff}
                  setPlnTariff={setPlnTariff}
                  monthlyBill={monthlyBill}
                  setMonthlyBill={setMonthlyBill}
                  isTypingBill={isTypingBill}
                  setIsTypingBill={setIsTypingBill}
                  manualBillInput={manualBillInput}
                  setManualBillInput={setManualBillInput}
                  modulePower={modulePower}
                  inverterType={inverterType}
                  calc={calc}
                  hasValidBep={hasValidBep}
                  chartW={chartW}
                  chartH={chartH}
                  chartPadLeft={chartPadLeft}
                  plotW={plotW}
                  chartMaxYear={chartMaxYear}
                  chartQuickYears={chartQuickYears}
                  currentInspectYear={currentInspectYear}
                  currentInspectCashFlow={currentInspectCashFlow}
                  effectiveBep={effectiveBep}
                  bepRatio={bepRatio}
                  zeroY={zeroY}
                  deficitFillD={deficitFillD}
                  profitFillD={profitFillD}
                  curvePathD={curvePathD}
                  mapChartX={mapChartX}
                  mapChartY={mapChartY}
                  onChartPointer={handleChartMouseMove}
                  onSelectInspectYear={setRoiHoverYear}
                  capexCollapsed={capexCollapsed}
                  onToggleCapexCollapsed={() => setCapexCollapsed((c) => !c)}
                  isSaving={isSaving}
                  saveSuccess={saveSuccess}
                  openedSimulationId={openedSimulationId}
                  onSave={openSaveModal}
                  onOpenProposal={() => setProposalOpen(true)}
                  onRequestEpcQuote={() => showToast("Permintaan penawaran EPC terkirim!")}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Proposal PDF Modal */}
      <ProposalModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        result={modalResult}
        assumptions={modalAssumptions}
        parameters={modalParameters}
        latitude={activeFacet.lat ? activeFacet.lat.toFixed(6) : "-6.611000"}
        longitude={activeFacet.lng ? activeFacet.lng.toFixed(6) : "106.815000"}
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

      {/* Save Project Name Dialog (Apple Glass + Soft Radiant Glow) */}
      {saveModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-project-title"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !isSaving) {
              e.preventDefault();
              setSaveModalOpen(false);
            }
          }}
        >
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs animate-fadeIn"
            onClick={() => {
              if (!isSaving) setSaveModalOpen(false);
            }}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isSaving) {
                void performSaveSimulation(saveModalName);
              }
            }}
            className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-[24px] sm:rounded-[28px] bg-white/88 bg-gradient-to-br from-white/95 via-amber-50/35 to-sky-50/30 backdrop-blur-2xl saturate-150 border border-white/90 shadow-[0_24px_64px_rgba(15,23,42,0.16),0_8px_28px_rgba(253,224,71,0.18),inset_0_1px_1px_rgba(255,255,255,0.95)] p-5 sm:p-6 space-y-4 animate-scaleIn"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="save-project-title" className="font-title font-bold text-slate-900 text-base">
                  {openedSimulationId !== null ? "Perbarui Proyek" : "Simpan Proyek"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nama bawaan mengikuti lokasi atap atau pencarian Anda.
                </p>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setSaveModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-900/5 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
                aria-label="Tutup"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="save-project-name-input" className="text-xs font-semibold text-slate-700">
                  Nama Proyek
                </label>
                <button
                  type="button"
                  disabled={isResolvingProjectName || isSaving}
                  onClick={() => {
                    const targetFacets =
                      selectedFacets.length > 0
                        ? selectedFacets
                        : facets.filter((facet) => facet.id === activeFacetId);
                    saveModalDirtyRef.current = false;
                    setIsResolvingProjectName(true);
                    void resolveDefaultProjectName(targetFacets, true)
                      .then((resolved) => {
                        setSaveModalName(resolved);
                      })
                      .finally(() => {
                        setIsResolvingProjectName(false);
                      });
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 hover:text-amber-950 transition cursor-pointer disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[13px] ${isResolvingProjectName ? "animate-spin" : ""}`}>
                    {isResolvingProjectName ? "sync" : "my_location"}
                  </span>
                  <span>{isResolvingProjectName ? "Mencari alamat..." : "Ambil dari titik atap"}</span>
                </button>
              </div>
              <input
                id="save-project-name-input"
                autoFocus
                type="text"
                maxLength={160}
                value={saveModalName}
                onChange={(e) => {
                  saveModalDirtyRef.current = true;
                  setSaveModalName(e.target.value);
                }}
                placeholder="Contoh: Jl. Pajajaran No. 42, Bogor Tengah"
                className="w-full h-11 px-3.5 rounded-2xl bg-white/90 border border-slate-200/90 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-200/60 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <span className="px-2.5 py-1 rounded-full bg-white/80 border border-slate-200/80 font-medium">
                {selectedFacets.length > 0 ? selectedFacets.length : 1} bidang atap
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/80 border border-slate-200/80 font-code-metric font-semibold text-slate-800">
                {calc.totalModulesFitted} panel · {calc.actualKwp.toFixed(1)} kWp
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setSaveModalOpen(false)}
                className="h-9 px-4 rounded-full bg-slate-900/5 hover:bg-slate-900/10 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving || saveModalName.trim() === ""}
                className="h-9 px-5 rounded-full bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 hover:from-amber-200 hover:to-amber-200 text-amber-950 border border-amber-200/90 shadow-[0_3px_14px_rgba(251,191,36,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[15px] ${isSaving ? "animate-spin" : ""}`}>
                  {isSaving ? "sync" : "check"}
                </span>
                <span>
                  {isSaving
                    ? "Menyimpan..."
                    : openedSimulationId !== null
                      ? "Simpan Perubahan"
                      : "Simpan Proyek"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Konfirmasi keluar dengan rancangan yang belum tersimpan */}
      <ConfirmDialog
        open={exitConfirmOpen}
        title="Keluar tanpa menyimpan?"
        description="Perubahan pada bidang atap, parameter, dan rintangan belum tersimpan. Keluar sekarang akan membuang perubahan itu."
        confirmLabel="Buang & keluar"
        cancelLabel="Lanjut mengatur"
        tone="danger"
        onCancel={() => setExitConfirmOpen(false)}
        onConfirm={() => {
          setExitConfirmOpen(false);
          leaveStudio();
        }}
      />
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="h-[100dvh] w-full bg-[#f8fafc]" />}>
      <StudioPageContent />
    </Suspense>
  );
}
