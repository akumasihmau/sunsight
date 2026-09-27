/**
 * Satu-satunya tempat pemanggilan HTTP ke backend.
 *
 * Semua halaman memakai modul ini supaya penempelan token dan penerjemahan
 * amplop kesalahan backend hanya ditulis sekali.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

const TOKEN_STORAGE_KEY = "sunsight.token";

export type FieldErrors = Record<string, string[]>;

export type User = { id: number; name: string; email: string };

export type AuthResponse = { token: string; user: User };

export type BoundingBox = [number, number, number, number];

export type Pixel = [number, number];

export type Imagery = {
  image_id: string;
  image_url: string;
  bbox: BoundingBox;
  width: number;
  height: number;
  meters_per_pixel: number;
};

export type RefinedPolygon = {
  refined_polygon: Pixel[];
  mask_image_url: string;
};

export type ShadowAnalysis = {
  usable_area_sqm: number;
  shadow_area_sqm: number;
  total_area_sqm: number;
  shadow_mask_url: string;
};

export type Assumptions = {
  module_efficiency: number;
  performance_ratio: number;
  tilt_deg: number;
  tilt_factor: number;
  irradiance_source: string;
  irradiance_period: string;
  irradiance_kwh_per_sqm_day: number;
};

export type Calculation = {
  usable_area_sqm: number;
  daily_ghi_kwh_per_sqm: number;
  estimated_energy_kwh_per_day: number;
  roof_orientation_deg: number;
  recommended_azimuth_deg: number;
  assumptions: Assumptions;
};

export type AnalysisSummary = {
  id: number;
  center_point: { lat: number; lng: number };
  usable_area_sqm: number;
  shadow_area_sqm: number;
  estimated_energy_kwh_per_day: number;
  roof_orientation_deg: number;
  created_at: string;
};

export type AnalysisDetail = AnalysisSummary & {
  roof_polygon: { type: "Polygon"; coordinates: Pixel[][] };
  recommended_azimuth_deg: number;
  assumptions: Assumptions;
};

export type Paginated<T> = {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
  links: Record<string, string | null>;
};

export type SaveAnalysisPayload = {
  usable_area_sqm: number;
  shadow_area_sqm: number;
  center_point: { lat: number; lng: number };
  polygon: Pixel[];
  estimated_energy_kwh_per_day: number;
  roof_orientation_deg: number;
  recommended_azimuth_deg: number;
  assumptions: Assumptions;
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

  /** Pesan validasi untuk satu field, bila ada. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors[field]?.[0];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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

function fieldErrorsFrom(value: unknown): FieldErrors {
  if (!isRecord(value)) {
    return {};
  }

  const result: FieldErrors = {};

  for (const [field, messages] of Object.entries(value)) {
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
    const message = isRecord(payload) && typeof payload.message === "string"
      ? payload.message
      : `Permintaan gagal (${response.status}).`;

    const errors = isRecord(payload) ? fieldErrorsFrom(payload.errors) : {};

    throw new ApiRequestError(response.status, message, errors);
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

  fetchImagery: (body: { lat: number; lng: number; zoom: number }) =>
    apiRequest<Imagery>("/cv/fetch-osm", { method: "POST", body }),

  refinePolygon: (body: { image_id: string; rough_polygon: Pixel[] }) =>
    apiRequest<RefinedPolygon>("/cv/refine-polygon", { method: "POST", body }),

  detectShadow: (body: { image_id: string; refined_polygon: Pixel[] }) =>
    apiRequest<ShadowAnalysis>("/cv/detect-shadow", { method: "POST", body }),

  calculate: (body: {
    usable_area_sqm: number;
    center_point: { lat: number; lng: number };
    polygon: Pixel[];
  }) => apiRequest<Calculation>("/solar/calculate", { method: "POST", body }),

  saveAnalysis: (body: SaveAnalysisPayload) =>
    apiRequest<{ message: string; id: number }>("/analyses", { method: "POST", body }),

  listAnalyses: (page = 1, perPage = 10) =>
    apiRequest<Paginated<AnalysisSummary>>(`/analyses?page=${page}&per_page=${perPage}`),

  getAnalysis: (id: number) => apiRequest<AnalysisDetail>(`/analyses/${id}`),

  deleteAnalysis: (id: number) =>
    apiRequest<{ message: string }>(`/analyses/${id}`, { method: "DELETE" }),
};
