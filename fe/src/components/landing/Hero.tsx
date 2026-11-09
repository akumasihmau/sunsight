"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";
import {
  LOCATION_PRESETS,
  resolveCoordinatesFromAddress,
  setPendingScanIntent,
} from "@/lib/profile";

export default function Hero() {
  const router = useRouter();
  const [address, setAddress] = useState("Jl. Pajajaran No. 42, Bogor Tengah, Kota Bogor");

  const handleStartSimulation = (e?: FormEvent) => {
    e?.preventDefault();
    const cleanAddress = address.trim() || LOCATION_PRESETS[0]?.address || "Kota Bogor";
    const coords = resolveCoordinatesFromAddress(cleanAddress);

    setPendingScanIntent({
      address: cleanAddress,
      lat: coords.lat,
      lng: coords.lng,
    });

    // Wajib daftar / masuk terlebih dahulu sebelum mengakses Studio
    router.push("/register?redirect=/studio");
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
      {/* Radiant Soft Glow Ambient Backdrops (Subtle & Elegant) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-amber-200/25 via-amber-100/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-48 left-1/4 w-[360px] h-[360px] bg-amber-300/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
        {/* Primary Headline: Apple Declarative Typography */}
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12] max-w-3xl mx-auto font-title">
          Potensi surya presisi. <br />
          <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
            Langsung dari atap Anda.
          </span>
        </h1>

        {/* Concise & Crystal-Clear Subheadline */}
        <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Deteksi kontur atap otomatis dengan AI, simulasikan tata letak panel surya,
          dan ketahui estimasi penghematan tagihan listrik Anda dalam hitungan detik.
        </p>

        {/* Search & Action Bar (Radiant Soft Glow) */}
        <div className="max-w-xl mx-auto pt-2">
          <form
            onSubmit={handleStartSimulation}
            className="p-1.5 sm:p-2 rounded-full bg-white/95 backdrop-blur-2xl border border-amber-200/80 shadow-[0_12px_36px_rgba(245,158,11,0.12),0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-2 transition-all focus-within:border-amber-400 focus-within:ring-3 focus-within:ring-amber-200/50"
          >
            <div className="flex-1 flex items-center pl-3 sm:pl-4 gap-2.5">
              <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0">
                location_on
              </span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Masukkan alamat atau nama perumahan di Bogor..."
                className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none font-medium truncate"
              />
            </div>
            
            <button
              type="submit"
              className="h-10 sm:h-11 px-5 sm:px-6 rounded-full bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 hover:from-amber-200 hover:to-amber-300 text-amber-950 font-title text-xs sm:text-sm font-bold border border-amber-300/80 shadow-[0_2px_12px_rgba(245,158,11,0.20)] hover:shadow-[0_4px_16px_rgba(245,158,11,0.30)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Mulai Simulasi</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </form>

          {/* Subtle Auth Hint */}
          <div className="mt-2.5 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <span>Daftar gratis untuk mulai simulasi</span>
            <span className="text-slate-300">•</span>
            <Link href="/login?redirect=/studio" className="font-bold text-amber-900 hover:underline">
              Sudah punya akun? Masuk
            </Link>
          </div>

          {/* Quick Location Chips (Kota Bogor Context) */}
          <div className="mt-3.5 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap text-xs text-slate-500">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Contoh Wilayah:</span>
            {[
              { label: "Bogor Tengah", addr: "Jl. Pajajaran No. 42, Bogor Tengah, Kota Bogor" },
              { label: "Bogor Selatan", addr: "Jl. Pahlawan, Bogor Selatan, Kota Bogor" },
              { label: "Bogor Timur", addr: "Jl. Pajajaran Indah, Bogor Timur, Kota Bogor" },
              { label: "Tanah Sareal", addr: "Jl. Sholeh Iskandar, Tanah Sareal, Kota Bogor" },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setAddress(chip.addr)}
                className="px-3 py-1 rounded-full bg-white/80 hover:bg-amber-50/80 border border-slate-200/80 hover:border-amber-300 text-slate-600 hover:text-amber-900 text-[11px] sm:text-xs font-medium transition cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* =========================================================
            SHOWCASE PREVIEW: Apple-Style Studio Product Canvas
            ========================================================= */}
        <div className="pt-8 sm:pt-12 max-w-4xl mx-auto">
          <div className="relative rounded-[28px] sm:rounded-[36px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08),0_4px_24px_rgba(245,158,11,0.10)] p-2.5 sm:p-3.5 transition-all">
            
            {/* Window Top Bar (Apple-style minimalism) */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100/90 mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <span className="ml-2 text-[11px] font-semibold text-slate-400 font-mono">
                  sunsight.app/studio
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200/80 font-code-metric">
                  Citra Satelit Bogor 90° Nadir
                </span>
              </div>
            </div>

            {/* Canvas Frame with Satellite Map & Solar Polygon Overlay */}
            <div className="relative h-[280px] sm:h-[380px] rounded-[22px] sm:rounded-[28px] overflow-hidden bg-slate-900 border border-slate-200/60">
              {/* Background Satellite Image */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-85"
                style={{ backgroundImage: "url('/satellite_map.jpg')" }}
              />
              
              {/* Subtle Grid Lines Overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />

              {/* Poligon Kontur Atap AI & Modul Surya (Showcase) */}
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="relative w-64 sm:w-80 h-40 sm:h-52 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-400/15 backdrop-blur-[2px] p-2.5 flex flex-col justify-between shadow-[0_0_32px_rgba(251,191,36,0.30)]">
                  
                  {/* Badge Dimensi Atap Minimalis */}
                  <div className="self-start px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold flex items-center gap-1.5 font-code-metric shadow-xs">
                    <span className="material-symbols-outlined text-[13px] text-amber-400">roofing</span>
                    <span>Pelana Utama • 84 m²</span>
                  </div>

                  {/* Kisi Panel Surya Realistis */}
                  <div className="grid grid-cols-6 gap-1 sm:gap-1.5 my-auto px-1">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-6 sm:h-8 rounded-[3px] bg-gradient-to-br from-sky-900 via-slate-800 to-sky-950 border border-sky-300/60 shadow-xs relative overflow-hidden group"
                      >
                        <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
                        <div className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
                      </div>
                    ))}
                  </div>

                  {/* Badge Azimuth & Sudut Kemiringan */}
                  <div className="self-end px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold font-code-metric shadow-xs">
                    Tilt 22° • Azimuth 188° SSW
                  </div>
                </div>
              </div>

              {/* Floating Metric 1: Kapasitas Sistem (Top-Left) */}
              <div className="absolute top-4 left-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)] text-left hidden sm:block animate-fadeIn">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-title">
                  Kapasitas Sistem
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-extrabold text-slate-900 font-code-metric">8.3</span>
                  <span className="text-xs font-semibold text-slate-500">kWp</span>
                </div>
                <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 mt-1 inline-block">
                  36 Modul 550W Tier-1
                </span>
              </div>

              {/* Floating Metric 2: Estimasi Hemat Bulanan (Bottom-Right) */}
              <div className="absolute bottom-4 right-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)] text-left hidden sm:block animate-fadeIn">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-title">
                  Hemat Tagihan PLN
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-extrabold text-slate-900 font-code-metric">Rp 2,04 Jt</span>
                  <span className="text-xs font-semibold text-slate-500">/ bln</span>
                </div>
                <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 mt-1 inline-block">
                  Balik Modal: 2.4 Tahun
                </span>
              </div>

              {/* Maskot Sunny Peeking di Sudut Bawah Kiri */}
              <div className="absolute -bottom-2 left-4 sm:left-8 flex items-center gap-2 pointer-events-none select-none">
                <SunnyMascot size={74} expression="happy" animated={true} />
              </div>
            </div>

            {/* Quick Action Bar under Showcase */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 px-2 sm:px-4">
              <p className="text-xs text-slate-500 text-left">
                Tandai atap rumah, atur arah hadap, dan lihat susunan modul surya Anda secara langsung.
              </p>
              <Link
                href="/register?redirect=/studio"
                className="w-full sm:w-auto px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Daftar &amp; Buka Studio</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
