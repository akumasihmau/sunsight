/**
 * Satu-satunya tempat pemanggilan HTTP ke backend.
 *
 * Semua halaman memakai modul ini supaya penempelan token dan penerjemahan
 * amplop kesalahan backend hanya ditulis sekali. Bentuk setiap permintaan dan
 * respons mengikuti `API CONTRACT.md`; klien hanya mengirim masukan, tidak
 * pernah angka hasil.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const TOKEN_STORAGE_KEY = "sunsight.token";

/**
 * Batas putaran persegi bidang atap menurut kontrak, dalam derajat.
 */
export const ROTATION_LIMIT_DEG = 45;

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

/** Persegi bidang atap dalam koordinat piksel citra; `rotation_deg` mengelilingi titik tengahnya. */
export type RoofRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation_deg: number;
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
 * Masukan simulasi seperti yang dipegang formulir.
 *
 * `panel_count` bernilai `null` selama pengguna belum menentukan sendiri, yang
 * berarti "isi sampai slot maksimum"; bentuk kiriman ke server memakai
 * `SimulationInput` di bawah.
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

/** Payload `POST /simulate` dan `POST /analyses`; hanya berisi masukan. */
export type SimulationInput = SimulationParameters & {
  image_id: string;
  roof_rect: RoofRect;
};

export type CapexBreakdown = {
  modules_idr: number;
  inverter_idr: number;
  racking_idr: number;
  installation_idr: number;
};

export type SimulationResult = {
  geometry: {
    roof_width_m: number;
    roof_length_m: number;
    total_area_sqm: number;
    effective_area_sqm: number;
  };
  layout: {
    max_slots: number;
    installed: number;
    rows: number;
    columns: number;
    module_area_sqm: number;
    density_ratio: number;
  };
  energy: {
    capacity_kwp: number;
    annual_production_kwh: number;
    daily_irradiance_kwh_per_sqm: number;
    incidence_factor: number;
    performance_ratio: number;
    irradiance_source: string;
    irradiance_period: string;
  };
  finance: {
    capex_total_idr: number;
    capex_breakdown: CapexBreakdown;
    monthly_saving_idr: number;
    annual_saving_idr: number;
    payback_years: number | null;
    tariff_key: string;
    tariff_label: string;
    tariff_idr_per_kwh: number;
    monthly_bill_idr: number;
    co2_reduction_kg_per_year: number;
    trees_equivalent: number;
  };
};

export type SaveSimulationResponse = {
  message: string;
  id: number;
  capacity_kwp: number;
  payback_years: number | null;
};

export type SimulationSummary = {
  id: number;
  center_point: { lat: number; lng: number };
  capacity_kwp: number;
  annual_production_kwh: number;
  monthly_saving_idr: number;
  payback_years: number | null;
  created_at: string;
};

/** Masukan yang tersimpan pada detail simulasi; dimensi sudah dalam meter. */
export type StoredSimulationInput = {
  roof_width_m: number;
  roof_length_m: number;
  rotation_deg: number;
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

export type StoredSimulationResult = {
  total_area_sqm: number;
  effective_area_sqm: number;
  max_slots: number;
  installed: number;
  rows: number;
  columns: number;
  capacity_kwp: number;
  annual_production_kwh: number;
  capex_total_idr: number;
  monthly_saving_idr: number;
  annual_saving_idr: number;
  payback_years: number | null;
  co2_reduction_kg_per_year: number;
  trees_equivalent: number;
};

export type SimulationAssumptions = {
  daily_irradiance_kwh_per_sqm: number;
  irradiance_source: string;
  irradiance_period: string;
  incidence_factor: number;
  performance_ratio: number;
  tariff_label: string;
  tariff_idr_per_kwh: number;
  capex_breakdown: CapexBreakdown;
};

export type SimulationDetail = {
  id: number;
  center_point: { lat: number; lng: number };
  roof_polygon: { type: "Polygon"; coordinates: number[][][] };
  input: StoredSimulationInput;
  result: StoredSimulationResult;
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

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (token === null) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
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
function errorMessageFrom(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const { message } = payload;

    if (typeof message === "string") {
      return message;
    }
  }

  return `Permintaan gagal (${status}).`;
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

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiRequestError(0, "Tidak dapat menghubungi server. Pastikan backend berjalan.");
  }

  const payload = parseJson(await response.text());

  if (!response.ok) {
    // Pesan backend ditampilkan apa adanya, termasuk pesan konfigurasi penyedia citra.
    throw new ApiRequestError(
      response.status,
      errorMessageFrom(payload, response.status),
      fieldErrorsFrom(payload),
    );
  }

  return payload as T;
}

export const api = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => apiRequest<AuthResponse>("/register", { method: "POST", body }),

  login: (body: { email: string; password: string }) =>
    apiRequest<AuthResponse>("/login", { method: "POST", body }),

  logout: () => apiRequest<{ message: string }>("/logout", { method: "POST" }),

  currentUser: () => apiRequest<User>("/user"),

  fetchLocation: (body: { lat: number; lng: number; zoom: number }) =>
    apiRequest<Imagery>("/location", { method: "POST", body }),

  fetchOptions: () => apiRequest<SimulationOptions>("/options"),

  simulate: (body: SimulationInput) =>
    apiRequest<SimulationResult>("/simulate", { method: "POST", body }),

  saveSimulation: (body: SimulationInput) =>
    apiRequest<SaveSimulationResponse>("/analyses", { method: "POST", body }),

  listSimulations: (page = 1, perPage = 10) =>
    apiRequest<Paginated<SimulationSummary>>(`/analyses?page=${page}&per_page=${perPage}`),

  getSimulation: (id: number) => apiRequest<SimulationDetail>(`/analyses/${id}`),

  deleteSimulation: (id: number) =>
    apiRequest<{ message: string }>(`/analyses/${id}`, { method: "DELETE" }),
};
