"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";
import {
  isOnboardedFor,
  markOnboardingComplete,
  markStudioGuideComplete,
  resetStudioGuideComplete,
  syncOnboardingToServer,
} from "@/lib/onboarding";
import { getStoredBiodata } from "@/lib/profile";

export default function OnboardingPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Kawan Surya");
  const [isMounted, setIsMounted] = useState(false);
  // Selama status belum terbaca, kartu pilihan tidak dirender supaya pengguna
  // yang sudah pernah onboarding tidak sempat melihatnya sekilas.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const biodata = getStoredBiodata();

    if (isOnboardedFor(biodata?.email ?? null)) {
      router.replace("/");
      return;
    }

    setIsMounted(true);
    setIsReady(true);

    if (biodata?.name && biodata.name.trim()) {
      setUserName(biodata.name.trim().split(" ")[0]);
    }
  }, [router]);

  // Belum pernah: Simpan status & arahkan ke Beranda dengan tur panduan aktif
  const handleChooseNewUser = () => {
    const email = getStoredBiodata()?.email ?? null;
    markOnboardingComplete(email);
    resetStudioGuideComplete(email);
    if (typeof window !== "undefined") {
      localStorage.setItem("sunsight_tour_pending", "true");
      localStorage.removeItem("sunsight_tour_completed");
    }
    void syncOnboardingToServer();
    router.push("/?tour=dashboard");
  };

  // Sudah pernah: Simpan status & langsung masuk ke Beranda tanpa panduan
  const handleChooseExperiencedUser = () => {
    const email = getStoredBiodata()?.email ?? null;
    markOnboardingComplete(email);
    markStudioGuideComplete(email);
    if (typeof window !== "undefined") {
      localStorage.setItem("sunsight_tour_completed", "true");
      localStorage.removeItem("sunsight_tour_pending");
    }
    void syncOnboardingToServer();
    router.push("/");
  };

  if (!isReady) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] relative flex flex-col justify-between overflow-hidden text-slate-800">
      {/* Radiant Soft Glow Ambient Backdrops */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[550px] h-[320px] bg-gradient-to-b from-amber-200/30 to-amber-100/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 sm:px-10 py-5 flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="SunSight" className="h-7 w-auto object-contain" />
        </Link>
        <button
          type="button"
          onClick={handleChooseExperiencedUser}
          className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          Lewati ke Beranda
        </button>
      </header>

      {/* Main Onboarding Card (Apple-Style Radiant Soft Glow) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg rounded-[32px] bg-white/92 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(245,158,11,0.14),0_2px_12px_rgba(0,0,0,0.03)] p-6 sm:p-9 relative animate-fadeIn">
          
          {/* Maskot Sunny yang Menyapa Hangat */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <SunnyMascot size={84} expression="happy" animated={true} />
            </div>

            <h1 className="font-title text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight mb-2">
              Halo, {isMounted ? userName : "Kawan Surya"}!
            </h1>

            <p className="text-sm text-slate-500 max-w-sm mb-7 leading-relaxed">
              Selamat datang di SunSight. Apakah kamu sudah pernah menggunakan aplikasi ini sebelumnya?
            </p>

            {/* 2 Pilihan Ramah & To The Point */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-2">
              
              {/* Opsi 1: Belum Pernah (Beri Panduan / Tutorial) */}
              <button
                type="button"
                onClick={handleChooseNewUser}
                className="group relative p-5 rounded-2xl bg-gradient-to-b from-amber-50/90 to-amber-100/40 hover:from-amber-100/90 hover:to-amber-200/50 border border-amber-300/80 text-left transition-all duration-300 shadow-[0_2px_14px_rgba(245,158,11,0.12)] hover:shadow-[0_6px_22px_rgba(245,158,11,0.22)] hover:scale-[1.015] active:scale-[0.985] cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-200 to-amber-300 text-amber-950 flex items-center justify-center mb-3 shadow-xs group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[22px]">school</span>
                  </div>
                  <h3 className="text-sm font-bold text-amber-950 mb-1 leading-snug">
                    Belum, baru pertama
                  </h3>
                  <p className="text-xs text-amber-900/70 leading-relaxed">
                    Beri saya tutorial & panduan bersama Sunny untuk mengenal fitur.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-900 group-hover:translate-x-0.5 transition-transform">
                  <span>Mulai Panduan</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
              </button>

              {/* Opsi 2: Sudah Pernah (Langsung Masuk ke Beranda) */}
              <button
                type="button"
                onClick={handleChooseExperiencedUser}
                className="group relative p-5 rounded-2xl bg-white hover:bg-slate-50/90 border border-slate-200/80 hover:border-slate-300 text-left transition-all duration-300 shadow-2xs hover:shadow-xs hover:scale-[1.015] active:scale-[0.985] cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1 leading-snug">
                    Sudah pernah
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Saya sudah paham cara pakainya, langsung bawa ke Beranda.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-transform">
                  <span>Masuk Beranda</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
              </button>

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} SunSight • WebGIS & Estimasi PLTS Atap Kota Bogor
      </footer>
    </div>
  );
}
