import {
  ApiRequestError,
  type AuthResponse,
  type BoundingBox,
  type CaptureRegistration,
  type CapturedImage,
  type DetectedRoof,
  type Imagery,
  type GeocodeResponse,
  type GeocodeResult,
  type PixelPoint,
  type Paginated,
  type ReverseGeocodeResponse,
  type RoofDetectionResponse,
  type SimulationAssumptions,
  type SimulationDetail,
  type SimulationOptions,
  type SimulationRequest,
  type SimulationResult,
  type SimulationRoofDetail,
  type SimulationRoofInput,
  type SimulationRoofResult,
  type SimulationSummary,
  type User,
} from "./api";

/**
 * Versi penyimpanan mock dinaikkan karena bentuk `SimulationDetail` berubah ke
 * kontrak multi-bidang; data lama dengan `roof_polygon` tunggal akan salah baca.
 */
const STORAGE_SIMULATIONS_KEY = "sunsight.mock_simulations.v2";

export const MOCK_OPTIONS: SimulationOptions = {
  modules: [
    {
      key: "mono_perc_550",
      label: "550 W Mono PERC Bifacial",
      power_w: 550,
      length_m: 2.278,
      width_m: 1.134,
      efficiency: 0.2129,
      price_idr: 1_850_000,
    },
    {
      key: "compact_450",
      label: "450 W Compact All-Black",
      power_w: 450,
      length_m: 1.906,
      width_m: 1.134,
      efficiency: 0.2082,
      price_idr: 1_520_000,
    },
    {
      key: "bifacial_580",
      label: "580 W Bifacial Dual-Glass",
      power_w: 580,
      length_m: 2.382,
      width_m: 1.134,
      efficiency: 0.2147,
      price_idr: 2_100_000,
    },
  ],
  tariffs: [
    {
      key: "R1",
      label: "R-1 / 1.300 VA",
      idr_per_kwh: 1444.7,
      year: 2024,
    },
    {
      key: "R2",
      label: "R-2 / 3.500-5.500 VA",
      idr_per_kwh: 1700.0,
      year: 2024,
    },
    {
      key: "B2",
      label: "B-2 / Bisnis > 6.600 VA",
      idr_per_kwh: 1444.7,
      year: 2024,
    },
  ],
  defaults: {
    module_key: "mono_perc_550",
    tariff_key: "R2",
    orientation: "portrait",
    inverter_type: "string",
  },
};

const MID_MONTH_DAYS = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const MIN_ELEVATION_DEG = 5.0;

const DAILY_IRRADIANCE = 4.8324;
const PERFORMANCE_RATIO = 0.8;
const DEFAULT_LATITUDE = -6.611;
const DEFAULT_LONGITUDE = 106.815;

/** Dipakai hanya bila mock belum pernah menangkap apa pun di sesi ini. */
const FALLBACK_METERS_PER_PIXEL = 0.2947;

const INSTALLATION_COST_IDR = 15_000_000;
const RACKING_COST_PER_MODULE_IDR = 350_000;
const MICRO_INVERTER_COST_PER_MODULE_IDR = 1_100_000;
const STRING_INVERTER_COST_PER_KWP_IDR = 1_200_000;

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180.0;
}

function rad2deg(rad: number): number {
  return (rad * 180.0) / Math.PI;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

export function calculateIncidenceFactor(
  tiltDeg: number,
  azimuthDeg: number,
  latitude: number,
): number {
  const tilt = deg2rad(tiltDeg);
  const moduleAzimuth = deg2rad(azimuthDeg);
  const latRad = deg2rad(latitude);

  let weighted = 0.0;
  let reference = 0.0;

  for (const dayOfYear of MID_MONTH_DAYS) {
    const declination = deg2rad(23.45 * Math.sin(deg2rad((360.0 / 365.0) * (284 + dayOfYear))));

    for (const hour of HOURS) {
      const hourAngle = deg2rad(15.0 * (hour - 12));

      const sinElevation =
        Math.sin(latRad) * Math.sin(declination) +
        Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);

      const elevation = rad2deg(Math.asin(Math.max(-1.0, Math.min(1.0, sinElevation))));

      if (elevation < MIN_ELEVATION_DEG) {
        continue;
      }

      const zenith = deg2rad(90.0 - elevation);
      const sunAzimuth =
        deg2rad(180.0) +
        Math.atan2(
          Math.sin(hourAngle),
          Math.cos(hourAngle) * Math.sin(latRad) - Math.tan(declination) * Math.cos(latRad),
        );

      const cosIncidence =
        Math.cos(zenith) * Math.cos(tilt) +
        Math.sin(zenith) * Math.sin(tilt) * Math.cos(sunAzimuth - moduleAzimuth);

      const cosZenith = Math.cos(zenith);
      weighted += Math.max(0.0, cosIncidence) * cosZenith;
      reference += cosZenith * cosZenith;
    }
  }

  if (reference <= 0.0) {
    return 1.0;
  }

  return round(weighted / reference, 4);
}

// ---------------------------------------------------------------------------
// Geometri
// ---------------------------------------------------------------------------

/** Luas poligon dengan rumus shoelace; dipakai server untuk `area_sqm`. */
function polygonArea(points: PixelPoint[]): number {
  let area = 0;

  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

function pixelToLngLat(x: number, y: number, image: CapturedImage): PixelPoint {
  const [minLng, minLat, maxLng, maxLat] = image.bbox;

  return [
    minLng + (x / image.width) * (maxLng - minLng),
    maxLat - (y / image.height) * (maxLat - minLat),
  ];
}

function pixelBBox(points: PixelPoint[]) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x1 = Math.min(...xs);
  const y1 = Math.min(...ys);
  const x2 = Math.max(...xs);
  const y2 = Math.max(...ys);

  return { x1, y1, x2, y2 };
}

/**
 * Persegi pembatas minimum (rotating calipers) untuk menirukan `roof_length_m`,
 * `roof_width_m`, dan `rotation_deg` yang dihitung server.
 */
function minimumAreaRect(points: { x: number; y: number }[]) {
  let best = { length: 0, width: 0, rotationDeg: 0, area: Number.POSITIVE_INFINITY };

  for (let i = 0; i < points.length; i += 1) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const point of points) {
      const x = point.x * cos - point.y * sin;
      const y = point.x * sin + point.y * cos;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    const spanX = maxX - minX;
    const spanY = maxY - minY;

    if (spanX * spanY < best.area) {
      best = {
        length: Math.max(spanX, spanY),
        width: Math.min(spanX, spanY),
        rotationDeg: Math.max(-90, Math.min(90, rad2deg(angle))),
        area: spanX * spanY,
      };
    }
  }

  return best;
}

/**
 * Georeferensi tangkapan terakhir per `image_id`. Payload simulasi hanya membawa
 * `image_id` dan poligon piksel, jadi mock perlu mengingat skala tangkapan untuk
 * menirukan konversi yang dilakukan server.
 */
const detectionImages = new Map<string, CapturedImage>();

function centerOfImage(image: CapturedImage) {
  return {
    lat: (image.bbox[1] + image.bbox[3]) / 2,
    lng: (image.bbox[0] + image.bbox[2]) / 2,
  };
}

function createImageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `mock-img-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

/** Persegi contoh di dalam tangkapan, dalam pecahan lebar/tinggi berkas. */
const MOCK_DETECTION_BOXES = [
  { id: "det_utama", x1: 0.26, y1: 0.3, x2: 0.62, y2: 0.56, confidence: 0.94 },
  { id: "det_sayap", x1: 0.63, y1: 0.32, x2: 0.84, y2: 0.45, confidence: 0.88 },
  { id: "det_carport", x1: 0.34, y1: 0.62, x2: 0.54, y2: 0.72, confidence: 0.79 },
];

function buildDetectedRoof(
  box: (typeof MOCK_DETECTION_BOXES)[number],
  image: CapturedImage,
): DetectedRoof {
  const rectangle = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): PixelPoint[] => [
    [round(x1, 1), round(y1, 1)],
    [round(x2, 1), round(y1, 1)],
    [round(x2, 1), round(y2, 1)],
    [round(x1, 1), round(y2, 1)],
  ];

  const polygonPx = rectangle(
    box.x1 * image.width,
    box.y1 * image.height,
    box.x2 * image.width,
    box.y2 * image.height,
  );

  return {
    id: box.id,
    polygon_px: polygonPx,
    polygon_lnglat: polygonPx.map(([x, y]) => pixelToLngLat(x, y, image)),
    bbox_px: pixelBBox(polygonPx),
    confidence: box.confidence,
    area_sqm: round(polygonArea(polygonPx) * image.meters_per_pixel ** 2, 2),
  };
}

// ---------------------------------------------------------------------------
// Perhitungan simulasi
// ---------------------------------------------------------------------------

function slotsThatFit(available: number, panel: number, clearance: number): number {
  if (panel <= 0 || available < panel) {
    return 0;
  }

  return Math.floor((available + clearance) / (panel + clearance));
}

function simulateRoof(
  roof: SimulationRoofInput,
  image: CapturedImage,
  latitude: number,
): SimulationRoofResult {
  const mpp = image.meters_per_pixel;
  const areaSqm = polygonArea(roof.roof_polygon_px) * mpp ** 2;

  const xs = roof.roof_polygon_px.map(([x]) => x);
  const ys = roof.roof_polygon_px.map(([, y]) => y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

  const localMeters = roof.roof_polygon_px.map(([x, y]) => ({
    x: (x - centerX) * mpp,
    y: (y - centerY) * mpp,
  }));
  const rect = minimumAreaRect(localMeters);

  // `gutter_m` tidak pernah diterapkan pada poligon bebas; nilainya hanya
  // tersimpan sebagai maksud pengguna, sama seperti di server.
  const effectiveLength = Math.max(0, rect.length - 2 * roof.setback_m);
  const effectiveWidth = Math.max(0, rect.width - 2 * roof.setback_m);
  const effectiveAreaSqm = Math.min(areaSqm, effectiveLength * effectiveWidth);

  const modSpec =
    MOCK_OPTIONS.modules.find((item) => item.key === roof.module_key) ?? MOCK_OPTIONS.modules[0];
  const isPortrait = roof.orientation !== "landscape";
  const alongLength = isPortrait ? modSpec.length_m : modSpec.width_m;
  const alongWidth = isPortrait ? modSpec.width_m : modSpec.length_m;

  const columns = slotsThatFit(effectiveLength, alongLength, roof.clearance_m);
  const rows = slotsThatFit(effectiveWidth, alongWidth, roof.clearance_m);
  const maxSlots = rows * columns;
  const installed =
    roof.panel_count === null ? maxSlots : Math.max(0, Math.min(roof.panel_count, maxSlots));

  const moduleAreaSqm = installed * modSpec.length_m * modSpec.width_m;
  const densityRatio = effectiveAreaSqm > 0 ? moduleAreaSqm / effectiveAreaSqm : 0;
  const capacityKwp = (installed * modSpec.power_w) / 1000;
  const incidenceFactor = calculateIncidenceFactor(roof.tilt_deg, roof.azimuth_deg, latitude);
  const annualProductionKwh =
    capacityKwp * DAILY_IRRADIANCE * incidenceFactor * 365 * PERFORMANCE_RATIO;

  return {
    roof_length_m: round(rect.length, 2),
    roof_width_m: round(rect.width, 2),
    rotation_deg: round(rect.rotationDeg, 1),
    area_sqm: round(areaSqm, 2),
    effective_area_sqm: round(effectiveAreaSqm, 2),
    max_slots: maxSlots,
    installed,
    rows,
    columns,
    module_area_sqm: round(moduleAreaSqm, 2),
    density_ratio: round(densityRatio, 4),
    capacity_kwp: round(capacityKwp, 3),
    annual_production_kwh: round(annualProductionKwh, 2),
  };
}

/** Georeferensi yang dipakai saat `image_id` tidak dikenal sesi ini. */
function fallbackImage(roofs: SimulationRoofInput[]): CapturedImage {
  const xs = roofs.flatMap((roof) => roof.roof_polygon_px.map(([x]) => x));
  const ys = roofs.flatMap((roof) => roof.roof_polygon_px.map(([, y]) => y));
  const width = Math.max(1280, Math.ceil(Math.max(0, ...xs) + 1));
  const height = Math.max(1280, Math.ceil(Math.max(0, ...ys) + 1));

  const latSpan = (height * FALLBACK_METERS_PER_PIXEL) / 110574;
  const lngSpan =
    (width * FALLBACK_METERS_PER_PIXEL) / (111320 * Math.cos(deg2rad(DEFAULT_LATITUDE)));

  return {
    width,
    height,
    bbox: [
      DEFAULT_LONGITUDE - lngSpan / 2,
      DEFAULT_LATITUDE - latSpan / 2,
      DEFAULT_LONGITUDE + lngSpan / 2,
      DEFAULT_LATITUDE + latSpan / 2,
    ],
    meters_per_pixel: FALLBACK_METERS_PER_PIXEL,
    zoom: 19,
  };
}

/** Bentuk bersama "detail simulasi", dihitung ulang penuh dari masukan. */
function buildDetail(
  payload: SimulationRequest,
  id: number,
  message?: string,
): SimulationDetail {
  const image = detectionImages.get(payload.image_id) ?? fallbackImage(payload.roofs);
  const center = centerOfImage(image);

  const roofs: SimulationRoofDetail[] = payload.roofs.map((roof) => {
    const polygonLngLat = roof.roof_polygon_px.map(([x, y]) => pixelToLngLat(x, y, image));
    const ring = [...polygonLngLat, polygonLngLat[0]];

    return {
      label: roof.label ?? null,
      detection_id: roof.detection_id ?? null,
      confidence: roof.confidence ?? null,
      roof_polygon: { type: "Polygon", coordinates: [ring] },
      roof_polygon_px: roof.roof_polygon_px,
      shape: roof.shape ?? null,
      align_to_azimuth: roof.align_to_azimuth ?? null,
      is_solar_populated: roof.is_solar_populated ?? null,
      has_hvac: roof.has_hvac ?? null,
      has_skylight: roof.has_skylight ?? null,
      slot_overrides: roof.slot_overrides ?? null,
      obstacles: roof.obstacles ?? null,
      facet_rotation_deg: roof.facet_rotation_deg ?? null,
      input: {
        setback_m: roof.setback_m,
        gutter_m: roof.gutter_m,
        tilt_deg: roof.tilt_deg,
        azimuth_deg: roof.azimuth_deg,
        module_key: roof.module_key,
        orientation: roof.orientation,
        clearance_m: roof.clearance_m,
        panel_count: roof.panel_count,
      },
      result: simulateRoof(roof, image, center.lat),
    };
  });

  const tariff =
    MOCK_OPTIONS.tariffs.find((item) => item.key === payload.tariff_key) ?? MOCK_OPTIONS.tariffs[1];

  const totalAreaSqm = roofs.reduce((sum, roof) => sum + roof.result.area_sqm, 0);
  const effectiveAreaSqm = roofs.reduce((sum, roof) => sum + roof.result.effective_area_sqm, 0);
  const maxSlots = roofs.reduce((sum, roof) => sum + roof.result.max_slots, 0);
  const installed = roofs.reduce((sum, roof) => sum + roof.result.installed, 0);
  const moduleAreaSqm = roofs.reduce((sum, roof) => sum + roof.result.module_area_sqm, 0);
  const capacityKwp = roofs.reduce((sum, roof) => sum + roof.result.capacity_kwp, 0);
  const annualProductionKwh = roofs.reduce(
    (sum, roof) => sum + roof.result.annual_production_kwh,
    0,
  );

  const modulesIdr = roofs.reduce((sum, roof) => {
    const modSpec =
      MOCK_OPTIONS.modules.find((item) => item.key === roof.input.module_key) ??
      MOCK_OPTIONS.modules[0];

    return sum + roof.result.installed * modSpec.price_idr;
  }, 0);
  const inverterIdr =
    payload.inverter_type === "micro"
      ? installed * MICRO_INVERTER_COST_PER_MODULE_IDR
      : Math.round(capacityKwp * STRING_INVERTER_COST_PER_KWP_IDR);
  const rackingIdr = installed * RACKING_COST_PER_MODULE_IDR;
  const capexTotalIdr = modulesIdr + inverterIdr + rackingIdr + INSTALLATION_COST_IDR;

  const monthlyProductionIdr = (annualProductionKwh / 12) * tariff.idr_per_kwh;
  const monthlySavingIdr = Math.round(Math.min(monthlyProductionIdr, payload.monthly_bill_idr));
  const annualSavingIdr = monthlySavingIdr * 12;
  const paybackYears = annualSavingIdr > 0 ? round(capexTotalIdr / annualSavingIdr, 2) : null;

  const consumptionKwh =
    tariff.idr_per_kwh > 0 ? (payload.monthly_bill_idr / tariff.idr_per_kwh) * 12 : 0;
  const co2ReductionKg = round(Math.min(annualProductionKwh, consumptionKwh) * 0.8, 2);
  const treesEquivalent = Math.round(co2ReductionKg / 22);

  const tilt = roofs.reduce((sum, roof) => sum + roof.input.tilt_deg, 0) / roofs.length;
  const azimuth = roofs.reduce((sum, roof) => sum + roof.input.azimuth_deg, 0) / roofs.length;

  const assumptions: SimulationAssumptions = {
    daily_irradiance_kwh_per_sqm: DAILY_IRRADIANCE,
    irradiance_source: "NASA POWER",
    irradiance_period: "klimatologi tahunan",
    incidence_factor: calculateIncidenceFactor(tilt, azimuth, center.lat),
    performance_ratio: PERFORMANCE_RATIO,
    tariff_key: tariff.key,
    tariff_label: tariff.label,
    tariff_idr_per_kwh: tariff.idr_per_kwh,
    capex_breakdown: {
      modules_idr: modulesIdr,
      inverter_idr: inverterIdr,
      racking_idr: rackingIdr,
      installation_idr: INSTALLATION_COST_IDR,
    },
  };

  const result: SimulationResult = {
    roof_count: roofs.length,
    total_area_sqm: round(totalAreaSqm, 2),
    effective_area_sqm: round(effectiveAreaSqm, 2),
    max_slots: maxSlots,
    installed,
    module_area_sqm: round(moduleAreaSqm, 2),
    density_ratio: effectiveAreaSqm > 0 ? round(moduleAreaSqm / effectiveAreaSqm, 4) : 0,
    capacity_kwp: round(capacityKwp, 3),
    annual_production_kwh: round(annualProductionKwh, 2),
    capex_total_idr: capexTotalIdr,
    monthly_saving_idr: monthlySavingIdr,
    annual_saving_idr: annualSavingIdr,
    payback_years: paybackYears,
    co2_reduction_kg_per_year: co2ReductionKg,
    trees_equivalent: treesEquivalent,
  };

  const detail: SimulationDetail = {
    id,
    address: payload.address ?? null,
    center_point: center,
    imagery: {
      image_id: payload.image_id,
      width: image.width,
      height: image.height,
      bbox: image.bbox,
      meters_per_pixel: image.meters_per_pixel,
      zoom: image.zoom,
    },
    map_zoom: image.zoom,
    roofs,
    input: {
      inverter_type: payload.inverter_type,
      monthly_bill_idr: payload.monthly_bill_idr,
      tariff_key: payload.tariff_key,
      sun_hour: payload.sun_hour ?? 12,
      extra_tilt: payload.extra_tilt ?? 10,
    },
    result,
    assumptions,
    created_at: new Date().toISOString(),
  };

  if (message !== undefined) {
    detail.message = message;
  }

  return detail;
}

// ---------------------------------------------------------------------------
// Penyimpanan
// ---------------------------------------------------------------------------

/** Tangkapan contoh untuk simulasi bawaan, dengan skala zoom 19 yang wajar. */
const SEED_IMAGE: CapturedImage = (() => {
  const metersPerPixel = FALLBACK_METERS_PER_PIXEL;
  const side = 512;
  const latSpan = (side * metersPerPixel) / 110574;
  const lngSpan = (side * metersPerPixel) / (111320 * Math.cos(deg2rad(DEFAULT_LATITUDE)));

  return {
    width: side,
    height: side,
    bbox: [
      DEFAULT_LONGITUDE - lngSpan / 2,
      DEFAULT_LATITUDE - latSpan / 2,
      DEFAULT_LONGITUDE + lngSpan / 2,
      DEFAULT_LATITUDE + latSpan / 2,
    ],
    meters_per_pixel: metersPerPixel,
    zoom: 19,
  };
})();

const SEED_IMAGE_ID = "mock-seed-image";

function seedSimulations(): SimulationDetail[] {
  detectionImages.set(SEED_IMAGE_ID, SEED_IMAGE);

  const seed = buildDetail(
    {
      image_id: SEED_IMAGE_ID,
      roofs: [
        {
          label: "Bidang Atap Utama",
          detection_id: "det_utama",
          confidence: 0.94,
          roof_polygon_px: [
            [133.1, 153.6],
            [317.4, 153.6],
            [317.4, 286.7],
            [133.1, 286.7],
          ],
          setback_m: 0.5,
          gutter_m: 0.6,
          tilt_deg: 10,
          azimuth_deg: 0,
          module_key: "mono_perc_550",
          orientation: "portrait",
          clearance_m: 0.03,
          panel_count: null,
        },
        {
          label: "Bidang Atap Sayap",
          detection_id: "det_sayap",
          confidence: 0.88,
          roof_polygon_px: [
            [322.6, 163.8],
            [430.1, 163.8],
            [430.1, 230.4],
            [322.6, 230.4],
          ],
          setback_m: 0.4,
          gutter_m: 0.5,
          tilt_deg: 18,
          azimuth_deg: 98,
          module_key: "mono_perc_550",
          orientation: "landscape",
          clearance_m: 0.03,
          panel_count: 8,
        },
      ],
      inverter_type: "string",
      monthly_bill_idr: 2_800_000,
      tariff_key: "R2",
    },
    1,
    "Simulation saved",
  );

  return [seed];
}

function getStoredSimulations(): SimulationDetail[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_SIMULATIONS_KEY);

  if (raw === null) {
    const seed = seedSimulations();
    window.localStorage.setItem(STORAGE_SIMULATIONS_KEY, JSON.stringify(seed));

    return seed;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as SimulationDetail[]) : [];
  } catch {
    return [];
  }
}

function saveSimulations(list: SimulationDetail[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_SIMULATIONS_KEY, JSON.stringify(list));
}

/**
 * Profil contoh untuk mode mock. Dipakai `currentUser` dan `completeOnboarding`
 * supaya bentuk objeknya tidak ditulis ulang di dua tempat.
 */
const MOCK_USER: User = {
  id: 1,
  name: "Pengguna SunSight",
  email: "user@sunsight.id",
  phone: null,
  property_type: null,
  location: null,
  onboarding_completed_at: null,
  avatar_url: null,
};

const reverseGeocodeMemoryCache = new Map<string, string | null>();
const geocodeMemoryCache = new Map<string, GeocodeResult[]>();

const BOGOR_FALLBACK_ZONES = [
  { label: "Baranangsiang Indah, Bogor Timur", lat: -6.611, lng: 106.815 },
  { label: "Jl. Pajajaran, Bogor Tengah", lat: -6.5971, lng: 106.806 },
  { label: "Tanah Sareal, Kota Bogor", lat: -6.561, lng: 106.798 },
  { label: "Bogor Utara, Kota Bogor", lat: -6.578, lng: 106.816 },
  { label: "Bogor Selatan, Kota Bogor", lat: -6.628, lng: 106.801 },
  { label: "Bogor Barat, Kota Bogor", lat: -6.582, lng: 106.766 },
];

const LOCAL_STREET_CATALOG: Array<{ label: string; lat: number; lng: number }> = [
  { label: "Jl. Raya Pajajaran, Bogor Tengah, Kota Bogor", lat: -6.5955, lng: 106.8058 },
  { label: "Jl. Ir. H. Juanda, Pabaton, Bogor Tengah, Kota Bogor", lat: -6.5994, lng: 106.7945 },
  { label: "Jl. Jend. Sudirman, Sempur, Bogor Tengah, Kota Bogor", lat: -6.5882, lng: 106.7966 },
  { label: "Jl. Ahmad Yani, Tanah Sareal, Kota Bogor", lat: -6.5744, lng: 106.8007 },
  { label: "Jl. Sholeh Iskandar (Ring Road Utara), Tanah Sareal, Kota Bogor", lat: -6.5568, lng: 106.7918 },
  { label: "Jl. Suryakencana, Gudang, Bogor Tengah, Kota Bogor", lat: -6.6057, lng: 106.8019 },
  { label: "Jl. Pahlawan, Bondongan, Bogor Selatan, Kota Bogor", lat: -6.6184, lng: 106.8005 },
  { label: "Jl. Raya Tajur, Muarasari, Bogor Selatan, Kota Bogor", lat: -6.6327, lng: 106.8239 },
  { label: "Jl. Pemuda, Kebon Pedes, Tanah Sareal, Kota Bogor", lat: -6.5675, lng: 106.8012 },
  { label: "Jl. Tunjung Biru, Baranangsiang, Bogor Timur, Kota Bogor", lat: -6.611, lng: 106.815 },
  { label: "Perumahan Taman Yasmin, Curugmekar, Bogor Barat, Kota Bogor", lat: -6.5579, lng: 106.7743 },
  { label: "Bantarjati / Villa Indah Pajajaran, Bogor Utara, Kota Bogor", lat: -6.5778, lng: 106.8142 },
  { label: "Sentul City, Babakan Madang, Kab. Bogor", lat: -6.5665, lng: 106.8543 },
  { label: "Jl. Raya Dramaga, Babakan, Dramaga, Kab. Bogor", lat: -6.5624, lng: 106.7327 },
  { label: "Jl. Raya Cibinong, Pakansari, Cibinong, Kab. Bogor", lat: -6.4846, lng: 106.8424 },
  { label: "Jl. Margonda Raya, Beji, Kota Depok", lat: -6.3738, lng: 106.8327 },
  { label: "Jl. Diponegoro No. 24, Menteng, Jakarta Pusat", lat: -6.1985, lng: 106.8326 },
  { label: "Jl. Grand Boulevard, BSD City, Tangerang Selatan", lat: -6.3016, lng: 106.6534 },
  { label: "Jl. Ir. H. Juanda (Dago), Coblong, Kota Bandung", lat: -6.8856, lng: 107.6134 },
  { label: "Bukit Golf Utama, CitraLand, Surabaya Barat", lat: -7.2892, lng: 112.6328 },
];

function bboxAroundPoint(lat: number, lng: number, delta = 0.005): BoundingBox {
  return [
    Number((lng - delta).toFixed(6)),
    Number((lat - delta).toFixed(6)),
    Number((lng + delta).toFixed(6)),
    Number((lat + delta).toFixed(6)),
  ];
}

function searchLocalStreetCatalog(query: string): GeocodeResult[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && t !== "jl" && t !== "jalan" && t !== "kota");

  if (tokens.length === 0) return [];

  return LOCAL_STREET_CATALOG.filter((item) => {
    const hay = item.label.toLowerCase();
    return tokens.every((tok) => hay.includes(tok));
  })
    .slice(0, 6)
    .map((item) => ({
      label: item.label,
      lat: item.lat,
      lng: item.lng,
      bbox: bboxAroundPoint(item.lat, item.lng),
      source: "catalog",
    }));
}

function formatNominatimLabel(item: {
  display_name?: string;
  name?: string;
  address?: Record<string, string | undefined>;
}): string {
  const addr = item.address ?? {};
  const primary =
    addr.road ||
    item.name ||
    addr.residential ||
    addr.neighbourhood ||
    addr.suburb;
  const secondary = [
    addr.suburb || addr.village || addr.neighbourhood,
    addr.city_district || addr.city || addr.town || addr.county || addr.state,
  ].filter((part): part is string => Boolean(part && part.trim() && part.trim() !== primary?.trim()));

  const combined = [primary, ...secondary]
    .filter((part): part is string => Boolean(part && part.trim()))
    .filter((part, idx, arr) => arr.indexOf(part) === idx);

  if (combined.length > 0) {
    return combined.join(", ").slice(0, 140);
  }
  return (item.display_name ?? "Lokasi Tanpa Nama").slice(0, 140);
}

function fallbackBogorAreaLabel(lat: number, lng: number): string {
  let closest = BOGOR_FALLBACK_ZONES[0];
  let bestDist = Infinity;

  for (const zone of BOGOR_FALLBACK_ZONES) {
    const d = (zone.lat - lat) ** 2 + (zone.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      closest = zone;
    }
  }

  return closest.label;
}

export const mockApi = {
  login: async (body: { email: string; password: string }): Promise<AuthResponse> => {
    if (body.password === "salah" || body.password === "wrong") {
      throw new ApiRequestError(401, "Email atau password salah.");
    }
    const name = body.email.split("@")[0].replace(/[._-]/g, " ") || "Pengguna SunSight";
    const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      token: "sunsight_mock_token_" + Date.now(),
      user: {
        id: 1,
        name: capitalName,
        email: body.email,
        phone: null,
        property_type: null,
        location: null,
        onboarding_completed_at: null,
        avatar_url: null,
      },
    };
  },

  register: async (body: { name: string; email: string }): Promise<AuthResponse> => {
    if (body.email === "taken@sunsight.id" || body.email === "admin@sunsight.id") {
      throw new ApiRequestError(422, "The email has already been taken.", {
        email: ["The email has already been taken."],
      });
    }
    return {
      token: "sunsight_mock_token_" + Date.now(),
      user: {
        id: 1,
        name: body.name,
        email: body.email,
        phone: null,
        property_type: null,
        location: null,
        onboarding_completed_at: null,
        avatar_url: null,
      },
    };
  },

  logout: async (): Promise<{ message: string }> => {
    return { message: "Logged out (mock)" };
  },

  forgotPassword: async (email?: string): Promise<{ message: string }> => {
    if (email === "notfound@sunsight.id") {
      throw new ApiRequestError(422, "The selected email is invalid.", {
        email: ["The selected email is invalid."],
      });
    }
    return { message: "Tautan reset password telah dikirim ke email Anda (mock)." };
  },

  resetPassword: async (): Promise<{ message: string }> => {
    return { message: "Password berhasil diperbarui (mock)." };
  },

  currentUser: async (): Promise<User> => ({ ...MOCK_USER }),

  /**
   * Menirukan `POST /onboarding/complete`: profil yang sama dengan
   * `onboarding_completed_at` terisi. Nilainya tidak disimpan karena mode mock
   * tidak punya penyimpanan server.
   */
  completeOnboarding: async (): Promise<User> => ({
    ...MOCK_USER,
    onboarding_completed_at: new Date().toISOString(),
  }),

  fetchLocation: async (body: { lat: number; lng: number; zoom: number }): Promise<Imagery> => {
    return {
      image_id: `mock-img-${body.lat.toFixed(4)}-${body.lng.toFixed(4)}`,
      image_url: "/satellite_map.jpg",
      bbox: [body.lng - 0.002, body.lat - 0.002, body.lng + 0.002, body.lat + 0.002],
      width: 1024,
      height: 1024,
      meters_per_pixel: 0.1483,
      attribution: "© Mapbox Satellite Imagery (Mode FE Standalone)",
    };
  },

  fetchOptions: async (): Promise<SimulationOptions> => MOCK_OPTIONS,

  /**
   * Menirukan `POST /roof-detections`: dua sampai tiga bidang contoh di dalam
   * tangkapan, lengkap dengan poligon lng/lat dan luas yang dihitung dengan
   * rumus kontrak.
   */
  detectRoofs: async (body: {
    blob: Blob;
    bbox: [number, number, number, number];
    width: number;
    height: number;
    zoom?: number;
    minConfidence?: number;
  }): Promise<RoofDetectionResponse> => {
    const metersPerPixel = ((body.bbox[3] - body.bbox[1]) * 110574) / body.height;
    const image: CapturedImage = {
      width: body.width,
      height: body.height,
      bbox: body.bbox,
      meters_per_pixel: metersPerPixel,
      zoom: body.zoom ?? null,
    };
    const imageId = createImageId();
    detectionImages.set(imageId, image);

    const minConfidence = body.minConfidence ?? 0.25;
    const roofs = MOCK_DETECTION_BOXES.map((box) => buildDetectedRoof(box, image))
      .filter((roof) => roof.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);

    return {
      image_id: imageId,
      detection_id: `mock_req_${Date.now().toString(36)}`,
      model: { name: "mock-yolov8n-seg", version: "mock-1.0.0" },
      image,
      roofs,
    };
  },

  /**
   * Menirukan `POST /captures`: hanya mendaftarkan acuan tangkapan, tanpa bidang.
   * Bidang yang digambar pengguna disimpan berdasarkan acuan ini.
   */
  registerCapture: async (body: {
    bbox: [number, number, number, number];
    width: number;
    height: number;
    zoom?: number;
  }): Promise<CaptureRegistration> => {
    const image: CapturedImage = {
      width: body.width,
      height: body.height,
      bbox: body.bbox,
      meters_per_pixel: ((body.bbox[3] - body.bbox[1]) * 110574) / body.height,
      zoom: body.zoom ?? null,
    };
    const imageId = createImageId();
    detectionImages.set(imageId, image);

    return { image_id: imageId, image };
  },

  saveSimulation: async (body: SimulationRequest): Promise<SimulationDetail> => {
    const detail = buildDetail(body, Date.now(), "Simulation saved");
    const existing = getStoredSimulations();

    existing.unshift(detail);
    saveSimulations(existing);

    return detail;
  },

  updateSimulation: async (id: number, body: SimulationRequest): Promise<SimulationDetail> => {
    const detail = buildDetail(body, id, "Simulation updated");
    const list = getStoredSimulations().map((item) => (item.id === id ? detail : item));
    saveSimulations(list);

    return detail;
  },

  renameSimulation: async (id: number, address: string | null): Promise<SimulationDetail> => {
    const list = getStoredSimulations();
    const target = list.find((item) => item.id === id);
    if (!target) {
      throw new ApiRequestError(404, "Simulasi tidak ditemukan");
    }

    const trimmed = address === null ? "" : address.trim();
    const updated: SimulationDetail = {
      ...target,
      address: trimmed === "" ? null : trimmed.slice(0, 160),
      message: "Simulation renamed",
    };

    saveSimulations(list.map((item) => (item.id === id ? updated : item)));
    return updated;
  },

  listSimulations: async (page = 1, perPage = 10): Promise<Paginated<SimulationSummary>> => {
    const list = getStoredSimulations();
    const start = (page - 1) * perPage;
    const paged = list.slice(start, start + perPage);

    const summaries: SimulationSummary[] = paged.map((item) => ({
      id: item.id,
      address: item.address ?? null,
      center_point: item.center_point,
      roof_count: item.result.roof_count,
      total_area_sqm: item.result.total_area_sqm,
      effective_area_sqm: item.result.effective_area_sqm,
      installed: item.result.installed,
      module_key: item.roofs[0]?.input.module_key ?? null,
      roof_length_m: item.roofs[0]?.result.roof_length_m ?? null,
      roof_width_m: item.roofs[0]?.result.roof_width_m ?? null,
      tilt_deg: item.roofs[0]?.input.tilt_deg ?? null,
      co2_reduction_kg_per_year: item.result.co2_reduction_kg_per_year,
      trees_equivalent: item.result.trees_equivalent,
      capacity_kwp: item.result.capacity_kwp,
      annual_production_kwh: item.result.annual_production_kwh,
      monthly_bill_idr: item.input.monthly_bill_idr,
      monthly_saving_idr: item.result.monthly_saving_idr,
      annual_saving_idr: item.result.annual_saving_idr,
      payback_years: item.result.payback_years,
      created_at: item.created_at,
    }));

    return {
      data: summaries,
      meta: {
        current_page: page,
        per_page: perPage,
        total: list.length,
        last_page: Math.max(1, Math.ceil(list.length / perPage)),
      },
      links: {
        first: "?page=1",
        last: `?page=${Math.ceil(list.length / perPage)}`,
        prev: null,
        next: null,
      },
    };
  },

  getSimulation: async (id: number): Promise<SimulationDetail> => {
    const list = getStoredSimulations();
    const found = list.find((item) => item.id === id);
    if (!found) {
      throw new Error("Simulasi tidak ditemukan");
    }
    return found;
  },

  deleteSimulation: async (id: number): Promise<{ message: string }> => {
    const list = getStoredSimulations();
    const filtered = list.filter((item) => item.id !== id);
    saveSimulations(filtered);

    return { message: "Simulation deleted" };
  },

  /**
   * Pencarian alamat & nama jalan dinamis via OpenStreetMap Nominatim (dengan
   * cache memori dan fallback katalog jalan Bogor/Indonesia bila offline).
   */
  geocode: async (query: string): Promise<GeocodeResponse> => {
    const clean = query.trim();
    if (!clean) {
      return { query: clean, results: [] };
    }

    const cacheKey = clean.toLowerCase();
    const cached = geocodeMemoryCache.get(cacheKey);
    if (cached) {
      return { query: clean, results: cached };
    }

    if (typeof window !== "undefined") {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(clean)}&countrycodes=id&addressdetails=1&limit=6&accept-language=id`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const items = (await res.json()) as Array<{
            lat?: string;
            lon?: string;
            display_name?: string;
            name?: string;
            boundingbox?: [string, string, string, string];
            address?: Record<string, string | undefined>;
          }>;
          const mapped: GeocodeResult[] = [];
          for (const item of items) {
            const lat = Number(item.lat);
            const lng = Number(item.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

            let bbox: BoundingBox = bboxAroundPoint(lat, lng);
            if (Array.isArray(item.boundingbox) && item.boundingbox.length === 4) {
              const south = Number(item.boundingbox[0]);
              const north = Number(item.boundingbox[1]);
              const west = Number(item.boundingbox[2]);
              const east = Number(item.boundingbox[3]);
              if ([south, north, west, east].every(Number.isFinite)) {
                bbox = [west, south, east, north];
              }
            }

            mapped.push({
              label: formatNominatimLabel(item),
              lat,
              lng,
              bbox,
              source: "nominatim",
            });
          }

          if (mapped.length > 0) {
            geocodeMemoryCache.set(cacheKey, mapped);
            return { query: clean, results: mapped };
          }
        }
      } catch {
        // Offline / blocked: fall back to local street catalog below.
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    const localMatches = searchLocalStreetCatalog(clean);
    if (localMatches.length > 0) {
      geocodeMemoryCache.set(cacheKey, localMatches);
    }
    return {
      query: clean,
      results: localMatches,
    };
  },

  reverseGeocode: async (lat: number, lng: number): Promise<ReverseGeocodeResponse> => {
    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (reverseGeocodeMemoryCache.has(cacheKey)) {
      return {
        lat,
        lng,
        label: reverseGeocodeMemoryCache.get(cacheKey) ?? fallbackBogorAreaLabel(lat, lng),
        source: "cache",
      };
    }

    if (typeof window !== "undefined") {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=id`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const payload = (await res.json()) as {
            display_name?: string;
            address?: Record<string, string | undefined>;
          };
          const addr = payload.address ?? {};
          const parts: string[] = [];
          for (const key of ["road", "residential", "pedestrian", "neighbourhood", "hamlet", "suburb", "village", "city_district"]) {
            const val = addr[key]?.trim();
            if (val && !parts.includes(val)) {
              parts.push(val);
            }
            if (parts.length >= 2) break;
          }
          if (parts.length === 0 && payload.display_name) {
            parts.push(
              ...payload.display_name
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 2),
            );
          }
          if (parts.length > 0) {
            const formatted = parts.join(", ").slice(0, 120);
            reverseGeocodeMemoryCache.set(cacheKey, formatted);
            return { lat, lng, label: formatted, source: "nominatim" };
          }
        }
      } catch {
        // Offline / blocked: fall back to nearest Bogor area below.
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    const fallback = fallbackBogorAreaLabel(lat, lng);
    reverseGeocodeMemoryCache.set(cacheKey, fallback);
    return { lat, lng, label: fallback, source: "fallback" };
  },

  updateProfile: async (body: {
    name: string;
    email: string;
    phone?: string | null;
    property_type?: string | null;
    location?: string | null;
  }): Promise<User> => ({
    id: 1,
    name: body.name,
    email: body.email,
    phone: body.phone ?? null,
    property_type: body.property_type ?? null,
    location: body.location ?? null,
    onboarding_completed_at: MOCK_USER.onboarding_completed_at,
    avatar_url: MOCK_USER.avatar_url,
  }),

  changePassword: async (): Promise<{ message: string }> => ({
    message: "Password berhasil diperbarui (mock).",
  }),
};
