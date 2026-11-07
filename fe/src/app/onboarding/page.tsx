"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";
import { getStoredBiodata } from "@/lib/profile";

export default function OnboardingPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Kawan Surya");
  const [step, setStep] = useState<1 | 2>(1);

  const [selectedBill, setSelectedBill] = useState("1.5jt-3jt");

  useEffect(() => {
    const biodata = getStoredBiodata();
    if (biodata?.name && biodata.name.trim()) {
      setUserName(biodata.name.trim().split(" ")[0]);
    }
  }, []);

  const handleFinishToStudio = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sunsight_onboarding_completed", "true");
      localStorage.setItem("sunsight_pref_bill", selectedBill);
      localStorage.setItem("sunsight_tour_pending", "true");
    }
    router.push("/studio?from=onboarding");
  };

  const handleSkipToDashboard = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sunsight_onboarding_completed", "true");
      localStorage.setItem("sunsight_tour_pending", "true");
    }
    router.push("/?tour=dashboard");
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] relative flex flex-col justify-between overflow-hidden text-slate-800">
      {/* Radiant Soft Glow Ambient Backdrops */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 sm:px-10 py-5 flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="SunSight" className="h-7 w-auto object-contain" />
        </Link>
        <button
          type="button"
          onClick={handleSkipToDashboard}
          className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          Lewati ke Beranda
        </button>
      </header>

      {/* Center Stage Card (Apple-Style Minimalist) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/80 shadow-[0_20px_50px_rgba(245,158,11,0.12),0_2px_12px_rgba(0,0,0,0.03)] p-6 sm:p-8 relative">
          {/* Progress Indicator (2 Steps) */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {[1, 2].map((s) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-6 bg-gradient-to-r from-amber-200 to-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                    : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* =========================================================
              LANGKAH 1: TAGIHAN LISTRIK BULANAN
              ========================================================= */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center animate-fadeIn">
              <SunnyMascot size={72} expression="kepo" animated={false} className="mb-3" />

              <h1 className="font-title text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-1.5">
                Halo, {userName}.
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 max-w-xs mb-6 leading-relaxed">
                Berapa rata-rata tagihan listrik PLN rumahmu setiap bulan?
              </p>

              {/* Pilihan Tagihan */}
              <div className="w-full grid grid-cols-3 gap-2 mb-6">
                {[
                  { id: "dibawah-1jt", label: "< 1 Juta", sub: "900-1300VA" },
                  { id: "1.5jt-3jt", label: "1 - 3 Juta", sub: "Rekomendasi" },
                  { id: "diatas-3jt", label: "> 3 Juta", sub: "Daya Besar" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedBill(item.id)}
                    className={`py-3 px-2 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                      selectedBill === item.id
                        ? "bg-amber-50/90 border-amber-400 text-amber-950 shadow-2xs ring-1 ring-amber-400"
                        : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{item.sub}</div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-title text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Lanjut</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          )}

          {/* =========================================================
              LANGKAH 2: AJAK BIKIN SIMULASI SOLAR PANEL
              ========================================================= */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center animate-fadeIn">
              <SunnyMascot size={80} expression="celebrating" animated={false} className="mb-4" />

              <h2 className="font-title text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
                Yuk, buat simulasi panel surya!
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 max-w-xs mb-7 leading-relaxed">
                Sunny sudah menyiapkan atap rumahmu di Studio CAD. Kita coba pasang panel surya biar langsung tahu potensi hemat listriknya.
              </p>

              {/* Tombol Utama: Mulai Simulasi (Radiant Soft Glow) */}
              <button
                type="button"
                onClick={handleFinishToStudio}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 hover:from-amber-200 hover:to-amber-300 text-amber-950 font-title text-sm font-bold border border-amber-300/80 shadow-[0_4px_20px_rgba(245,158,11,0.20)] hover:shadow-[0_6px_24px_rgba(245,158,11,0.30)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer mb-2.5"
              >
                <span>Mulai Simulasi Panel Surya</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>

              <button
                type="button"
                onClick={handleSkipToDashboard}
                className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors py-1 cursor-pointer"
              >
                Lihat Beranda Dulu
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} SunSight • WebGIS & Estimasi PLTS Atap Kota Bogor
      </footer>
    </div>
  );
}
