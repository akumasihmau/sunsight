/**
 * Satu-satunya tempat pemanggilan HTTP ke backend.
 *
 * Semua halaman memakai modul ini supaya penempelan token dan penerjemahan
 * amplop kesalahan backend hanya ditulis sekali. Bentuk setiap permintaan dan
 * respons mengikuti `API CONTRACT.md`; klien hanya mengirim masukan, tidak
 * pernah angka hasil.
 */

import { mockApi } from "./mock";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

const TOKEN_STORAGE_KEY = "sunsight.token";

export type FieldErrors = Record<string, string[]>;

export type User = { id: number; name: string; email: string };

export type AuthResponse = { token: string; user: User };

/** Urutan selalu `[minLng, minLat, maxLng, maxLat]`. */
export type BoundingBox = [number, number, number, number];

export type Orientation = "portrait" | "landscape";

export type InverterType = "string" | "micro";

export type Imagery = {
  image_id: string;
  image_url: string;
  bbox: BoundingBox;
  width: number;
  height: number;
  meters_per_pixel: number;
  attribution: string;
};

/** Titik dalam koordinat piksel tangkapan: `[x, y]`, origin kiri-atas, y ke bawah. */
export type PixelPoint = [number, number];

/** Kotak pembatas satu bidang atap dalam piksel tangkapan. */
export type PixelBBox = { x1: number; y1: number; x2: number; y2: number };

/** Poligon GeoJSON WGS84; koordinat `[[lng, lat], …]` dan cincin pertama tertutup. */
export type GeoJsonPolygon = { type: "Polygon"; coordinates: number[][][] };

/** Satu bidang atap hasil `POST /roof-detections`. */
export type DetectedRoof = {
  id: string;
  polygon_px: PixelPoint[];
  polygon_lnglat: PixelPoint[];
  bbox_px: PixelBBox;
  confidence: number;
  /** Luas dihitung server dari shoelace poligon piksel × `meters_per_pixel`². */
  area_sqm: number;
};

/**
 * Georeferensi tangkapan yang dikembalikan server. Berkas citranya sendiri tidak
 * pernah disimpan; hanya angka inilah yang dipakai memuat ulang tampilan.
 */
export type CapturedImage = {
  width: number;
  height: number;
  /** Urutan selalu `[minLng, minLat, maxLng, maxLat]`. */
  bbox: BoundingBox;
  meters_per_pixel: number;
  zoom: number | null;
};

/** Respons `POST /roof-detections`; `roofs` boleh kosong dengan status `200`. */
export type RoofDetectionResponse = {
  image_id: string;
  detection_id: string;
  model: { name: string; version: string };
  image: CapturedImage;
  roofs: DetectedRoof[];
};

export type ModulePreset = {
  key: string;
  label: string;
  power_w: number;
  length_m: number;
  width_m: number;
  efficiency: number;
  price_idr: number;
};

export type Tariff = {
  key: string;
  label: string;
  idr_per_kwh: number;
  year: number;
};

export type SimulationOptions = {
  modules: ModulePreset[];
  tariffs: Tariff[];
  defaults: {
    module_key: string;
    tariff_key: string;
    orientation: Orientation;
    inverter_type: InverterType;
  };
};

/**
 * Masukan simulasi seperti yang dipegang formulir: parameter satu bidang atap
 * digabung dengan masukan tingkat proyek.
 *
 * `panel_count` bernilai `null` selama pengguna belum menentukan sendiri, yang
 * berarti "isi sampai slot maksimum"; bentuk kiriman ke server memakai
 * `SimulationRoofInput` dan `SimulationRequest`.
 */
export type SimulationParameters = {
  setback_m: number;
  gutter_m: number;
  tilt_deg: number;
  azimuth_deg: number;
  module_key: string;
  orientation: Orientation;
  clearance_m: number;
  panel_count: number | null;
  inverter_type: InverterType;
  monthly_bill_idr: number;
  tariff_key: string;
};

/** Masukan satu bidang atap; dimensi semua dalam meter. */
export type SimulationRoofParameters = {
  setback_m: number;
  gutter_m: number;
  tilt_deg: number;
  azimuth_deg: number;
  module_key: string;
  orientation: Orientation;
  clearance_m: number;
  panel_count: number | null;
};

/** Satu bidang atap pada payload `POST /simulate` dan `POST /analyses`. */
export type RoofShapeKey = "rectangle" | "l-shape" | "trapezoid" | "custom_polygon";

export type SlotStateKey = "active" | "skylight" | "hvac" | "empty";

/**
 * Keadaan tampilan studio per bidang. Dikirim saat menyimpan supaya simulasi dapat
 * dibuka kembali persis seperti saat disimpan: bentuk, rintangan per slot, dan
 * apakah tata letak sudah disusun.
 */
export type SimulationRoofViewState = {
  shape?: RoofShapeKey | null;
  align_to_azimuth?: boolean | null;
  is_solar_populated?: boolean | null;
  has_hvac?: boolean | null;
  has_skylight?: boolean | null;
  slot_overrides?: Record<string, SlotStateKey> | null;
};

export type SimulationRoofInput = SimulationRoofParameters &
  SimulationRoofViewState & {
    label?: string | null;
    detection_id?: string | null;
    confidence?: number | null;
    roof_polygon_px: PixelPoint[];
  };

/** Payload `POST /simulate` dan `POST /analyses`; hanya berisi masukan. */
export type SimulationRequest = {
  image_id: string;
  /** Label lokasi seperti yang diketik pengguna; tidak memengaruhi hitungan. */
  address?: string | null;
  /** 1 s.d. 12 bidang. */
  roofs: SimulationRoofInput[];
  inverter_type: InverterType;
  monthly_bill_idr: number;
  tariff_key: string;
};

/** Hasil per bidang; seluruh angka dihitung server. */
export type SimulationRoofResult = {
  roof_length_m: number;
  roof_width_m: number;
  rotation_deg: number;
  area_sqm: number;
  effective_area_sqm: number;
  max_slots: number;
  installed: number;
  rows: number;
  columns: number;
  module_area_sqm: number;
  density_ratio: number;
  capacity_kwp: number;
  annual_production_kwh: number;
};

export type CapexBreakdown = {
  modules_idr: number;
  inverter_idr: number;
  racking_idr: number;
  installation_idr: number;
};

/** Agregat seluruh bidang pada satu simulasi; selalu dihitung server. */
export type SimulationResult = {
  roof_count: number;
  total_area_sqm: number;
  effective_area_sqm: number;
  max_slots: number;
  installed: number;
  module_area_sqm: number;
  density_ratio: number;
  capacity_kwp: number;
  annual_production_kwh: number;
  capex_total_idr: number;
  monthly_saving_idr: number;
  annual_saving_idr: number;
  payback_years: number | null;
  co2_reduction_kg_per_year: number;
  trees_equivalent: number;
};

export type SimulationSummary = {
  id: number;
  address: string | null;
  center_point: { lat: number; lng: number };
  roof_count: number;
  total_area_sqm: number;
  effective_area_sqm: number;
  installed: number;
  co2_reduction_kg_per_year: number;
  trees_equivalent: number;
  capacity_kwp: number;
  annual_production_kwh: number;
  monthly_saving_idr: number;
  payback_years: number | null;
  created_at: string;
};

/** Masukan simulasi tingkat proyek pada bentuk bersama "detail simulasi". */
export type SimulationInputSummary = {
  inverter_type: InverterType;
  monthly_bill_idr: number;
  tariff_key: string;
};

export type SimulationAssumptions = {
  daily_irradiance_kwh_per_sqm: number;
  irradiance_source: string;
  irradiance_period: string;
  incidence_factor: number;
  performance_ratio: number;
  tariff_key: string;
  tariff_label: string;
  tariff_idr_per_kwh: number;
  capex_breakdown: CapexBreakdown;
};

/** Satu bidang atap pada bentuk bersama "detail simulasi". */
export type SimulationRoofDetail = {
  label: string | null;
  detection_id: string | null;
  confidence: number | null;
  roof_polygon: GeoJsonPolygon;
  roof_polygon_px: PixelPoint[];
  shape: RoofShapeKey | null;
  align_to_azimuth: boolean | null;
  is_solar_populated: boolean | null;
  has_hvac: boolean | null;
  has_skylight: boolean | null;
  slot_overrides: Record<string, SlotStateKey> | null;
  input: SimulationRoofParameters;
  result: SimulationRoofResult;
};

/** Georeferensi tangkapan; dipakai untuk mengembalikan `roof_polygon_px` ke posisi aslinya. */
export type SimulationImagery = {
  image_id: string;
  width: number;
  height: number;
  bbox: BoundingBox;
  meters_per_pixel: number | null;
  zoom: number | null;
};

/**
 * Bentuk bersama "detail simulasi", dipakai `POST /simulate` (tanpa `id` dan
 * `message`), `POST /analyses` (keduanya ada), dan `GET /analyses/{id}`.
 */
export type SimulationDetail = {
  id: number;
  message?: string;
  address: string | null;
  center_point: { lat: number; lng: number };
  imagery: SimulationImagery | null;
  /** `null` bila pemanggil tidak mengirim zoom; antarmuka memakai zoom bawaannya. */
  map_zoom: number | null;
  roofs: SimulationRoofDetail[];
  input: SimulationInputSummary;
  result: SimulationResult;
  assumptions: SimulationAssumptions;
  created_at: string;
};

export type Paginated<T> = {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
  links: Record<string, string | null>;
};

/** Kegagalan yang sudah diterjemahkan dari amplop kesalahan backend. */
export class ApiRequestError extends Error {
  readonly status: number;

  readonly fieldErrors: FieldErrors;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token && USE_MOCK && window.sessionStorage.getItem("sunsight.explicit_logout") !== "true") {
    const defaultToken = "sunsight_mock_token";
    window.localStorage.setItem(TOKEN_STORAGE_KEY, defaultToken);
    return defaultToken;
  }

  return token;
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (token === null) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.sessionStorage.setItem("sunsight.explicit_logout", "true");
    window.dispatchEvent(new Event("sunsight:storage"));
    return;
  }

  window.sessionStorage.removeItem("sunsight.explicit_logout");
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.dispatchEvent(new Event("sunsight:storage"));
}

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
};

function parseJson(text: string): unknown {
  if (text === "") {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Pesan dari amplop kesalahan backend, dengan cadangan bila bentuknya tak terduga. */
/**
 * Cadangan pesan per status. Dipakai saat backend tidak sempat mengembalikan
 * amplop JSON (mis. `413` dari lapisan web server atau `504` dari proxy),
 * sehingga pengguna tetap membaca penyebabnya, bukan kode status mentah.
 */
const STATUS_FALLBACK_MESSAGES: Record<number, string> = {
  0: "Tidak dapat menghubungi server. Pastikan backend berjalan.",
  401: "Sesi Anda sudah berakhir. Silakan masuk kembali.",
  404: "Sumber daya tidak ditemukan.",
  413: "Berkas tangkapan melebihi batas ukuran unggah.",
  422: "Data yang dikirim tidak valid.",
  500: "Terjadi kesalahan di server.",
  503: "Layanan model atap sedang tidak dapat dihubungi. Coba beberapa saat lagi.",
  504: "Layanan model atap melewati batas waktu. Coba area yang lebih kecil.",
};

function errorMessageFrom(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const { message } = payload;

    if (typeof message === "string" && message.trim() !== "") {
      return message;
    }
  }

  return STATUS_FALLBACK_MESSAGES[status] ?? `Permintaan gagal (${status}).`;
}

/** Validasi per-field dari amplop `422`, bila ada. */
function fieldErrorsFrom(payload: unknown): FieldErrors {
  if (typeof payload !== "object" || payload === null || !("errors" in payload)) {
    return {};
  }

  const { errors } = payload;

  if (typeof errors !== "object" || errors === null) {
    return {};
  }

  const result: FieldErrors = {};

  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages)) {
      result[field] = messages.map((message) => String(message));
    }
  }

  return result;
}

/** Mengubah respons gagal menjadi `ApiRequestError` yang sudah diterjemahkan. */
async function throwFailedResponse(response: Response): Promise<void> {
  const payload = parseJson(await response.text());

  throw new ApiRequestError(
    response.status,
    errorMessageFrom(payload, response.status),
    fieldErrorsFrom(payload),
  );
}

async function sendRequest(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiRequestError(0, STATUS_FALLBACK_MESSAGES[0]);
  }
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await sendRequest(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    await throwFailedResponse(response);
  }

  return parseJson(await response.text()) as T;
}

/**
 * Permintaan `multipart/form-data`. `Content-Type` sengaja tidak diisi supaya
 * peramban yang menuliskan boundary; hanya `Accept` dan token yang dikirim.
 */
async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await sendRequest(path, { method: "POST", headers, body: form });

  if (!response.ok) {
    await throwFailedResponse(response);
  }

  return parseJson(await response.text()) as T;
}

export const api = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => (USE_MOCK ? mockApi.register(body) : apiRequest<AuthResponse>("/register", { method: "POST", body })),

  login: (body: { email: string; password: string }) =>
    USE_MOCK ? mockApi.login(body) : apiRequest<AuthResponse>("/login", { method: "POST", body }),

  logout: () => (USE_MOCK ? mockApi.logout() : apiRequest<{ message: string }>("/logout", { method: "POST" })),

  forgotPassword: (body: { email: string }) =>
    USE_MOCK
      ? mockApi.forgotPassword(body.email)
      : apiRequest<{ message: string }>("/forgot-password", { method: "POST", body }),

  resetPassword: (body: {
    email: string;
    password: string;
    password_confirmation: string;
    token: string;
  }) =>
    USE_MOCK
      ? mockApi.resetPassword()
      : apiRequest<{ message: string }>("/reset-password", { method: "POST", body }),

  currentUser: () => (USE_MOCK ? mockApi.currentUser() : apiRequest<User>("/user")),

  fetchLocation: (body: { lat: number; lng: number; zoom: number }) =>
    USE_MOCK
      ? mockApi.fetchLocation(body)
      : apiRequest<Imagery>("/location", { method: "POST", body }),

  fetchOptions: () => (USE_MOCK ? mockApi.fetchOptions() : apiRequest<SimulationOptions>("/options")),

  /**
   * Mengirim tangkapan peta ke model segmentasi sebagai `multipart/form-data`.
   * `bbox` dikirim sebagai string JSON sesuai kontrak, dan `zoom` hanya ikut
   * bila pemanggil punya nilainya.
   */
  detectRoofs: (body: {
    blob: Blob;
    bbox: BoundingBox;
    width: number;
    height: number;
    zoom?: number;
    minConfidence?: number;
  }) => {
    if (USE_MOCK) {
      return mockApi.detectRoofs(body);
    }

    const form = new FormData();
    form.append("file", body.blob, "tangkapan-peta.jpg");
    form.append("bbox", JSON.stringify(body.bbox));
    form.append("width", String(body.width));
    form.append("height", String(body.height));

    if (body.zoom !== undefined) {
      form.append("zoom", String(body.zoom));
    }

    if (body.minConfidence !== undefined) {
      form.append("min_confidence", String(body.minConfidence));
    }

    return apiUpload<RoofDetectionResponse>("/roof-detections", form);
  },

  saveSimulation: (body: SimulationRequest) =>
    USE_MOCK
      ? mockApi.saveSimulation(body)
      : apiRequest<SimulationDetail>("/analyses", { method: "POST", body }),

  listSimulations: (page = 1, perPage = 10) =>
    USE_MOCK
      ? mockApi.listSimulations(page, perPage)
      : apiRequest<Paginated<SimulationSummary>>(`/analyses?page=${page}&per_page=${perPage}`),

  getSimulation: (id: number) =>
    USE_MOCK ? mockApi.getSimulation(id) : apiRequest<SimulationDetail>(`/analyses/${id}`),

  deleteSimulation: (id: number) =>
    USE_MOCK ? mockApi.deleteSimulation(id) : apiRequest<{ message: string }>(`/analyses/${id}`, { method: "DELETE" }),
};
