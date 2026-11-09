"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";

import { api, getToken, setToken } from "@/lib/api";
import {
  saveStoredBiodata,
  useHasToken,
  useStoredBiodata,
  type PropertyType,
} from "@/lib/profile";

export default function ProfilePage() {
  const router = useRouter();
  const hasToken = useHasToken();
  const biodata = useStoredBiodata();

  const [mounted, setMounted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication once component mounts on client
    if (!getToken()) {
      router.replace("/login");
    } else {
      setMounted(true);
    }
  }, [router]);

  // Edit form state initialized from stored biodata
  const [name, setName] = useState(biodata?.name || "Muhammad Raditya");
  const [email, setEmail] = useState(biodata?.email || "raditya@sunsight.id");
  const [phone, setPhone] = useState(biodata?.phone || "081234567890");
  const [propertyType, setPropertyType] = useState<PropertyType>(
    biodata?.propertyType || "residential"
  );
  const [location, setLocation] = useState(biodata?.location || "Kota Bogor, Jawa Barat");
  const [isSaved, setIsSaved] = useState(false);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }

  async function handleSignOut() {
    try {
      await api.logout();
    } catch {
      // Ignore if session already expired
    }
    setToken(null);
    router.push("/landing");
  }

  function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    saveStoredBiodata({
      name: name.trim() || "Muhammad Raditya",
      email: email.trim() || "raditya@sunsight.id",
      phone: phone.trim() || "081234567890",
      propertyType,
      location: location.trim() || "Kota Bogor, Jawa Barat",
    });
    setIsSaved(true);
    showToast("Profil berhasil disimpan");
    setTimeout(() => setIsSaved(false), 2400);
  }

  const initials = (name || "MR")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (!mounted || !hasToken) {
    return (
      <div className="min-h-screen w-full bg-[#EFF1F4] flex items-center justify-center">
        <div className="w-9 h-9 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#EFF1F4] text-slate-800 font-sans antialiased relative overflow-hidden select-none">
      {/* =======================================================
          AMBIENT RADIANT SOFT GLOW BACKGROUND (SunSight Aura)
          ======================================================= */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Warm Golden Solar Glow Top-Center */}
        <div className="absolute -top-32 left-1/3 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-300/35 via-yellow-200/25 to-transparent blur-[140px]" />
        {/* Soft Sky Blue Light Accent Right */}
        <div className="absolute top-1/4 -right-28 w-[520px] h-[520px] rounded-full bg-gradient-to-bl from-sky-300/25 via-cyan-100/15 to-transparent blur-[140px]" />
        {/* Gentle Warm Aura Bottom-Left */}
        <div className="absolute -bottom-20 left-10 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-200/25 via-orange-100/15 to-transparent blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-3.5 sm:px-6 pb-12 space-y-5 sm:space-y-6">
        {/* =======================================================
            TOP NAVIGATION PILL BAR (Consistent with Beranda)
            ======================================================= */}
        <header className="relative z-30 flex items-center justify-between gap-3 pt-4 sm:pt-5">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="h-11 px-4 rounded-full bg-white/90 hover:bg-white backdrop-blur-md flex items-center justify-center transition shadow-2xs border border-white/80"
              title="SunSight Beranda"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="SunSight" className="h-6 sm:h-7 w-auto object-contain" />
            </Link>

            <Link
              href="/"
              className="w-11 h-11 rounded-full bg-white/90 hover:bg-white backdrop-blur-md flex items-center justify-center transition shadow-2xs border border-white/80 text-slate-600 hover:text-slate-900"
              title="Cari Proyek"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-2" aria-label="Navigasi utama">
            <Link
              href="/"
              className="h-11 px-5 rounded-full text-sm font-medium flex items-center gap-2 bg-white/90 hover:bg-white backdrop-blur-md text-slate-700 hover:text-slate-900 transition shadow-2xs border border-white/80"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
              Beranda
            </Link>
            <Link
              href="/?tab=history"
              className="h-11 px-5 rounded-full text-sm font-medium flex items-center gap-2 bg-white/90 hover:bg-white backdrop-blur-md text-slate-700 hover:text-slate-900 transition shadow-2xs border border-white/80"
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              Riwayat
            </Link>
            <Link
              href="/?tab=calculator"
              className="h-11 px-5 rounded-full text-sm font-medium flex items-center gap-2 bg-white/90 hover:bg-white backdrop-blur-md text-slate-700 hover:text-slate-900 transition shadow-2xs border border-white/80"
            >
              <span className="material-symbols-outlined text-[18px]">calculate</span>
              Kalkulator
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/studio"
              className="h-11 px-4 sm:px-5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md text-slate-700 hover:text-amber-600 text-sm font-semibold flex items-center gap-2 transition shadow-2xs border border-white/80 group"
              title="Buka Studio CAD"
            >
              <span className="material-symbols-outlined text-[19px] text-amber-500 group-hover:scale-110 transition-transform">
                polyline
              </span>
              <span>Studio</span>
            </Link>

            <div
              className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-2xs border border-amber-300/40 relative"
              title="Halaman Profil Aktif"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950 text-xs font-bold flex items-center justify-center shadow-xs">
                {initials}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
          </div>
        </header>

        {/* Mobile secondary tab strip */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-1 -mx-3.5 px-3.5 scrollbar-none">
          <Link
            href="/"
            className="h-9 px-3.5 rounded-full bg-white/90 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            Beranda
          </Link>
          <Link
            href="/?tab=history"
            className="h-9 px-3.5 rounded-full bg-white/90 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            Riwayat
          </Link>
          <Link
            href="/?tab=calculator"
            className="h-9 px-3.5 rounded-full bg-white/90 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">calculate</span>
            Kalkulator
          </Link>
          <Link
            href="/studio"
            className="h-9 px-3.5 rounded-full bg-white/90 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">polyline</span>
            Studio
          </Link>
        </div>

        {/* =======================================================
            HERO CARD: IDENTITAS & STATUS DENGAN RADIANT SOFT GLOW
            ======================================================= */}
        <div className="rounded-[28px] bg-white/85 backdrop-blur-xl p-6 sm:p-7 relative overflow-hidden shadow-[0_12px_36px_rgba(15,23,42,0.04),0_1px_3px_rgba(245,158,11,0.08)] border border-white/90">
          {/* Subtle Ambient Halos Inside Hero */}
          <div className="absolute -top-14 -left-14 w-48 h-48 rounded-full bg-amber-200/40 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-14 -right-14 w-52 h-52 rounded-full bg-sky-200/40 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* User Identity Info */}
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Dual-ring radiant glow avatar */}
              <div className="relative shrink-0">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-amber-400/40 via-yellow-300/50 to-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.25)] flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950 font-bold text-2xl sm:text-3xl flex items-center justify-center shadow-inner tracking-tight">
                    {initials}
                  </div>
                </div>
                {/* Cheerful Sun Icon Badge */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow-xs flex items-center justify-center text-amber-500 border border-amber-200">
                  <span className="material-symbols-outlined text-[15px]">wb_sunny</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {name || "Pengguna SunSight"}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold flex items-center gap-1 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Terverifikasi
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                    {propertyType === "residential"
                      ? "Residensial"
                      : propertyType === "commercial"
                      ? "Komersial"
                      : "Industri"}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-500">
                  {email || "raditya@sunsight.id"} • {phone || "081234567890"}
                </p>

                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 pt-0.5">
                  <span className="material-symbols-outlined text-[15px] text-amber-500">location_on</span>
                  <span>{location || "Kota Bogor, Jawa Barat"}</span>
                </p>
              </div>
            </div>

            {/* Quick Stat Badges */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0 pt-2 lg:pt-0">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/60 text-center min-w-[96px] shadow-2xs">
                <span className="block text-[11px] font-medium text-slate-400">Atap Aktif</span>
                <span className="block text-base sm:text-lg font-bold tracking-tight text-slate-900 mt-0.5">
                  4 Proyek
                </span>
              </div>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 backdrop-blur-md border border-amber-200/60 text-center min-w-[96px] shadow-2xs">
                <span className="block text-[11px] font-medium text-amber-700">Kapasitas</span>
                <span className="block text-base sm:text-lg font-bold tracking-tight text-amber-950 mt-0.5">
                  37.8 kWp
                </span>
              </div>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-50/70 backdrop-blur-md border border-sky-200/60 text-center min-w-[96px] shadow-2xs">
                <span className="block text-[11px] font-medium text-sky-700">Produksi Est.</span>
                <span className="block text-base sm:text-lg font-bold tracking-tight text-sky-950 mt-0.5">
                  54.9 MWh
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================
            2-COLUMN GRID: FORM PROFIL & RINGKASAN PORTOFOLIO
            ======================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Kolom Kiri: Form Data Diri & Properti (7 Kolom) */}
          <div className="lg:col-span-7 rounded-[28px] bg-white/85 backdrop-blur-xl p-6 sm:p-7 relative overflow-hidden shadow-[0_12px_36px_rgba(15,23,42,0.04),0_1px_3px_rgba(245,158,11,0.08)] border border-white/90 flex flex-col justify-between">
            <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-amber-100/40 blur-2xl pointer-events-none" />

            <div>
              <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Data Diri &amp; Properti</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Informasi dasar untuk estimasi simulasi atap.
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600">
                  <span className="material-symbols-outlined text-[19px]">tune</span>
                </div>
              </div>

              <form id="profile-form" onSubmit={handleSaveProfile} className="relative z-10 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nama Lengkap</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Nama lengkap"
                    className="w-full h-11 px-4 rounded-xl bg-slate-50/90 hover:bg-white border border-slate-200/70 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/25 transition shadow-2xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="nama@email.com"
                      className="w-full h-11 px-4 rounded-xl bg-slate-50/90 hover:bg-white border border-slate-200/70 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/25 transition shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">No. WhatsApp</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="081234567890"
                      className="w-full h-11 px-4 rounded-xl bg-slate-50/90 hover:bg-white border border-slate-200/70 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/25 transition shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tipe Bangunan</label>
                    <div className="relative">
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                        className="w-full h-11 px-4 pr-10 rounded-xl bg-slate-50/90 hover:bg-white border border-slate-200/70 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/25 transition shadow-2xs cursor-pointer appearance-none"
                      >
                        <option value="residential">Rumah Tinggal</option>
                        <option value="commercial">Ruko / Komersial</option>
                        <option value="industrial">Pabrik / Industri</option>
                      </select>
                      <span className="material-symbols-outlined text-[20px] text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Lokasi Properti</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      placeholder="Kota Bogor, Jawa Barat"
                      className="w-full h-11 px-4 rounded-xl bg-slate-50/90 hover:bg-white border border-slate-200/70 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/25 transition shadow-2xs"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="relative z-10 pt-5 mt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="submit"
                form="profile-form"
                className={`h-11 px-6 rounded-full font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.98] ${
                  isSaved
                    ? "bg-emerald-600 text-white shadow-emerald-500/20"
                    : "bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/25"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {isSaved ? "check_circle" : "save"}
                </span>
                <span>{isSaved ? "Tersimpan!" : "Simpan Perubahan"}</span>
              </button>

              <span className="text-[11px] text-slate-400">
                Tersimpan di perangkat ini.
              </span>
            </div>
          </div>

          {/* Kolom Kanan: Standar & Keamanan (5 Kolom) */}
          <div className="lg:col-span-5 flex flex-col gap-5 sm:gap-6">
            {/* Card 1: Standar & Sumber Data (Pengganti Estimasi Dampak PLTS) */}
            <div className="rounded-[28px] bg-white/85 backdrop-blur-xl p-6 relative overflow-hidden shadow-[0_12px_36px_rgba(15,23,42,0.04),0_1px_3px_rgba(245,158,11,0.08)] border border-white/90 space-y-4 flex-1 flex flex-col justify-between">
              <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-amber-100/40 blur-2xl pointer-events-none" />

              <div>
                <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 tracking-tight">
                      <span className="material-symbols-outlined text-[19px] text-amber-600">verified</span>
                      <span>Standar &amp; Sumber Data</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Transparansi metodologi ilmiah &amp; regulasi resmi
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200/70 text-[10px] font-bold">
                    Dokumentasi Terbuka
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Kalkulasi potensi energi, estimasi penghematan, dan mitigasi karbon di SunSight dihitung berbasis data observasi iklim Kota Bogor serta regulasi resmi energi surya nasional.
                </p>

                {/* 2x2 Bento Foundation Tiles */}
                <div className="relative z-10 grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">map</span>
                      </span>
                      <span className="text-[11px] text-amber-950 font-bold truncate">Citra Nadir 90°</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Bebas distorsi paralaks, skala 1m = 20px CAD.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/60 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">sunny</span>
                      </span>
                      <span className="text-[11px] text-sky-950 font-bold truncate">NASA &amp; Solargis</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Insolasi 4.2–4.5 kWh/m²/hari iklim Kota Bogor.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">solar_power</span>
                      </span>
                      <span className="text-[11px] text-emerald-950 font-bold truncate">Hardware Tier-1</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Modul 550Wp, inverter sinus &amp; SPD II petir.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/60 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-slate-200/80 text-slate-800 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">gavel</span>
                      </span>
                      <span className="text-[11px] text-slate-900 font-bold truncate">Permen ESDM</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Permen No. 2/2024 &amp; tarif resmi PLN R-1/R-2/R-3.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-3 border-t border-slate-100">
                <Link
                  href="/methodology"
                  className="w-full h-11 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs group"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-400">menu_book</span>
                  <span>Lihat Metodologi &amp; Standar Lengkap</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>

            {/* Card 2: Sesi Akun & Keamanan */}
            <div className="rounded-[28px] bg-white/85 backdrop-blur-xl p-6 relative overflow-hidden shadow-[0_12px_36px_rgba(15,23,42,0.04),0_1px_3px_rgba(245,158,11,0.08)] border border-white/90 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 tracking-tight">
                  <span className="material-symbols-outlined text-[19px] text-slate-600">lock</span>
                  <span>Sesi Akun</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                  Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Keluar dari sesi akun di peramban ini jika sudah selesai.
              </p>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="w-full h-11 px-4 rounded-full bg-slate-50 hover:bg-rose-50 border border-slate-200/70 hover:border-rose-200/80 text-slate-700 hover:text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">logout</span>
                <span>Keluar dari Akun</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-lg flex items-center gap-2.5 border border-slate-800 animate-fadeIn">
          <span className="material-symbols-outlined text-[18px] text-amber-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
