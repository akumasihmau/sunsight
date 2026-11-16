"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, setToken } from "@/lib/api";
import { markOnboardingComplete } from "@/lib/onboarding";
import { saveStoredBiodata, type PropertyType } from "@/lib/profile";

/**
 * Titik balik alur OAuth Google.
 *
 * Backend mengirim token di fragment URL (`#token=…&onboarded=…`) supaya token
 * tidak pernah masuk log server atau header `Referer`. Fragment itu dibaca di
 * klien, disimpan lewat `setToken`, lalu dibersihkan dari address bar.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("token");

    if (!token) {
      setIsInvalid(true);
      return;
    }

    setToken(token);

    // Token tidak boleh tertinggal di riwayat peramban atau ikut tersalin pengguna.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

    const onboardedFlag = params.get("onboarded") === "1";

    let cancelled = false;

    void (async () => {
      let alreadyOnboarded = onboardedFlag;

      try {
        const user = await api.currentUser();
        if (cancelled) return;

        const propType: PropertyType =
          user.property_type === "commercial" ||
          user.property_type === "industrial" ||
          user.property_type === "residential"
            ? user.property_type
            : "residential";

        saveStoredBiodata({
          name: user.name,
          email: user.email,
          phone: user.phone ?? "",
          propertyType: propType,
          location: user.location ?? "Kota Bogor, Jawa Barat",
        });

        alreadyOnboarded = onboardedFlag || user.onboarding_completed_at !== null;
        if (alreadyOnboarded) {
          markOnboardingComplete(user.email);
        }
      } catch {
        // Jika profil gagal dimuat sementara, tetap lanjutkan navigasi dengan status flag URL.
      }

      if (!cancelled) {
        router.replace(alreadyOnboarded ? "/" : "/onboarding");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white/92 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(245,158,11,0.14),0_2px_12px_rgba(0,0,0,0.03)] p-7 text-center">
        {isInvalid ? (
          <>
            <div className="mx-auto mb-4 w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">link_off</span>
            </div>
            <h1 className="font-title text-lg font-bold text-slate-900 mb-1.5">Tautan masuk tidak valid</h1>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Token masuk tidak ditemukan pada tautan ini. Silakan mulai lagi dari halaman masuk.
            </p>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center py-2.5 px-4 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 text-amber-950 font-title font-bold text-xs transition shadow-[0_2px_12px_rgba(245,158,11,0.2)] border border-amber-300/80"
            >
              Kembali ke Halaman Masuk
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px] animate-spin">progress_activity</span>
            </div>
            <h1 className="font-title text-lg font-bold text-slate-900 mb-1.5">Menghubungkan akun Google…</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sebentar lagi Anda akan diarahkan ke halaman berikutnya.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
