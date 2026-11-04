import { useSyncExternalStore } from "react";

import { getToken } from "@/lib/api";

export type PropertyType = "residential" | "commercial" | "industrial";

export type UserBiodata = {
  name: string;
  email: string;
  phone: string;
  propertyType: PropertyType;
  location: string;
};

export type LocationPreset = {
  label: string;
  address: string;
  lat: string;
  lng: string;
  zoom: string;
};

export const LOCATION_PRESETS: LocationPreset[] = [
  {
    label: "Menteng, Jakarta",
    address: "Jl. Diponegoro No. 24, Menteng, Jakarta Pusat",
    lat: "-6.1985",
    lng: "106.8326",
    zoom: "19",
  },
  {
    label: "BSD City",
    address: "Jl. Grand Boulevard, BSD City, Tangerang Selatan",
    lat: "-6.3016",
    lng: "106.6534",
    zoom: "19",
  },
  {
    label: "Dago, Bandung",
    address: "Jl. Dago Pakar Permai No. 12, Bandung",
    lat: "-6.8705",
    lng: "107.6253",
    zoom: "19",
  },
  {
    label: "CitraLand, Surabaya",
    address: "Bukit Golf Utama, CitraLand, Surabaya Barat",
    lat: "-7.2892",
    lng: "112.6328",
    zoom: "19",
  },
  {
    label: "Bogor Tengah",
    address: "Jl. Pajajaran, Bogor Tengah, Kota Bogor",
    lat: "-6.5955",
    lng: "106.7995",
    zoom: "19",
  },
];

const BIODATA_STORAGE_KEY = "sunsight.biodata";
const PENDING_SCAN_STORAGE_KEY = "sunsight.pending_scan";
const STORAGE_CHANGE_EVENT = "sunsight:storage";

export type PendingScanIntent = {
  address?: string;
  lat?: string;
  lng?: string;
  monthlyBillIdr?: number;
};

let cachedBiodataRaw: string | null = null;
let cachedBiodataParsed: UserBiodata | null = null;

export function notifyStorageChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
  }
}

function subscribeStorage(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_CHANGE_EVENT, onStoreChange);
  };
}

export function getStoredBiodata(): UserBiodata | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(BIODATA_STORAGE_KEY);
    if (!raw) {
      cachedBiodataRaw = null;
      cachedBiodataParsed = null;
      return null;
    }
    if (raw === cachedBiodataRaw) {
      return cachedBiodataParsed;
    }
    cachedBiodataRaw = raw;
    cachedBiodataParsed = JSON.parse(raw) as UserBiodata;
    return cachedBiodataParsed;
  } catch {
    return null;
  }
}

export function saveStoredBiodata(biodata: UserBiodata): void {
  if (typeof window === "undefined") {
    return;
  }
  const serialized = JSON.stringify(biodata);
  cachedBiodataRaw = serialized;
  cachedBiodataParsed = biodata;
  window.localStorage.setItem(BIODATA_STORAGE_KEY, serialized);
  notifyStorageChange();
}

export function useHasToken(): boolean {
  return useSyncExternalStore(
    subscribeStorage,
    () => getToken() !== null,
    () => false,
  );
}

export function useStoredBiodata(): UserBiodata | null {
  return useSyncExternalStore(
    subscribeStorage,
    getStoredBiodata,
    () => null,
  );
}

export function setPendingScanIntent(intent: PendingScanIntent): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(PENDING_SCAN_STORAGE_KEY, JSON.stringify(intent));
}

export function consumePendingScanIntent(): PendingScanIntent | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(PENDING_SCAN_STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_SCAN_STORAGE_KEY);
    return JSON.parse(raw) as PendingScanIntent;
  } catch {
    return null;
  }
}

export function resolveCoordinatesFromAddress(address: string): {
  lat: string;
  lng: string;
  zoom: string;
} {
  const lower = address.toLowerCase();
  if (lower.includes("menteng") || lower.includes("diponegoro") || lower.includes("jakarta")) {
    return { lat: "-6.1985", lng: "106.8326", zoom: "19" };
  }
  if (lower.includes("bsd") || lower.includes("tangerang") || lower.includes("serpong")) {
    return { lat: "-6.3016", lng: "106.6534", zoom: "19" };
  }
  if (lower.includes("bandung") || lower.includes("dago")) {
    return { lat: "-6.8705", lng: "107.6253", zoom: "19" };
  }
  if (lower.includes("surabaya") || lower.includes("citraland")) {
    return { lat: "-7.2892", lng: "112.6328", zoom: "19" };
  }
  return { lat: "-6.5955", lng: "106.7995", zoom: "19" };
}
