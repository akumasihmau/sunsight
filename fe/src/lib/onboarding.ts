/**
 * Status onboarding yang disimpan di peramban.
 *
 * Backend punya `onboarding_completed_at`, tetapi halaman login perlu memutuskan
 * tujuan redirect sebelum `/api/user` sempat dijawab, dan pengguna tanpa jaringan
 * tetap harus dianggap pernah melewati onboarding. Karena itu status dicatat
 * lokal, lalu disalin ke server secara diam-diam.
 */

import { api } from "./api";

/** Kunci tunggal status onboarding; nilai lama per-halaman tidak dipakai lagi. */
export const ONBOARDING_STORAGE_KEY = "sunsight.onboarding_completed";

export type OnboardingState = {
  completedAt: string | null;
  email: string | null;
};

/**
 * Membaca status tersimpan beserta email pemiliknya, supaya dua akun di peramban
 * yang sama tidak saling mewarisi status.
 */
export function readOnboardingState(): OnboardingState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const record = parsed as Record<string, unknown>;

    return {
      completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
      email: typeof record.email === "string" ? record.email : null,
    };
  } catch {
    // Nilai rusak diperlakukan sebagai belum onboarding: pengguna melihat pilihan,
    // bukan terlempar tanpa penjelasan.
    return null;
  }
}

/** Menulis penanda "sudah onboarding" untuk email tertentu. */
export function markOnboardingComplete(email: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  const state: OnboardingState = {
    completedAt: new Date().toISOString(),
    email,
  };

  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Email `null` berarti pemanggil belum tahu akunnya; status apa pun sudah cukup
 * untuk menganggap onboarding pernah dilewati.
 */
export function isOnboardedFor(email: string | null): boolean {
  const state = readOnboardingState();
  if (!state) {
    return false;
  }

  if (email === null) {
    return true;
  }

  if (!state.email) {
    return false;
  }

  // Email tidak case-sensitive, jadi perbandingan dilakukan pada bentuk normalnya.
  return state.email.trim().toLowerCase() === email.trim().toLowerCase();
}

/**
 * Menyalin penanda lokal ke server.
 *
 * Kegagalan jaringan sengaja ditelan: penanda lokal sudah tertulis dan pengguna
 * tidak boleh tertahan di halaman onboarding hanya karena backend tidak terjangkau.
 */
export async function syncOnboardingToServer(): Promise<void> {
  try {
    await api.completeOnboarding();
  } catch {
    // Status lokal tetap menjadi acuan sampai sinkronisasi berikutnya berhasil.
  }
}
