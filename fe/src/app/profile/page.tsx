"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";

import { ProposalModal } from "@/components/studio/ProposalModal";
import { api, getToken, setToken, type SimulationParameters, type SimulationResult } from "@/lib/api";
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
  const [proposalOpen, setProposalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
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
      // Ignore if session expired
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
    showToast("Data profil berhasil diperbarui!");
    setTimeout(() => setIsSaved(false), 2400);
  }

  const initials = (name || "MR")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const simulationResultForModal: SimulationResult = {
    geometry: {
      roof_width_m: 12.48,
      roof_length_m: 7.28,
      total_area_sqm: 12.48 * 7.28,
      effective_area_sqm: 11.48 * 6.18,
    },
    layout: {
      max_slots: 40,
      installed: 36,
      rows: 2,
      columns: 18,
      module_area_sqm: 2.56,
      density_ratio: 0.78,
    },
    energy: {
      capacity_kwp: 8.3,
      annual_production_kwh: 14400,
      daily_irradiance_kwh_per_sqm: 4.85,
      incidence_factor: 0.98,
      performance_ratio: 0.8,
      irradiance_source: "NASA POWER Climatology (Kota Bogor)",
      irradiance_period: "2024",
    },
    finance: {
      capex_total_idr: 103750000,
      capex_breakdown: {
        modules_idr: 53950000,
        inverter_idr: 20750000,
        racking_idr: 12450000,
        installation_idr: 16600000,
      },
      monthly_saving_idr: 2040000,
      annual_saving_idr: 24480000,
      payback_years: 2.4,
      tariff_key: "R2",
      tariff_label: "R-2 / 3.500-5.500 VA (PLN)",
      tariff_idr_per_kwh: 1699.53,
      monthly_bill_idr: 2500000,
      co2_reduction_kg_per_year: 11500,
      trees_equivalent: 523,
    },
  };

  const simulationParamsForModal: SimulationParameters = {
    setback_m: 0.5,
    gutter_m: 0.6,
    tilt_deg: 22,
    azimuth_deg: 188,
    module_key: "module_550",
    orientation: "portrait",
    clearance_m: 0.02,
    panel_count: 36,
    inverter_type: "string",
    monthly_bill_idr: 2500000,
    tariff_key: "R2",
  };

  if (!mounted || !hasToken) {
    return (
      <div className="min-h-screen w-full bg-[#EFF1F4] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#EFF1F4] text-slate-900 font-sans antialiased relative overflow-hidden">
      {/* Ambient soft glow radiant kuning & aksen biru */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-36 left-1/4 w-[560px] h-[560px] rounded-full bg-gradient-to-br from-amber-300/35 via-yellow-200/25 to-transparent blur-[130px]" />
        <div className="absolute top-1/4 -right-24 w-[520px] h-[520px] rounded-full bg-gradient-to-bl from-sky-300/30 via-cyan-100/20 to-transparent blur-[140px]" />
        <div className="absolute bottom-12 left-10 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-amber-200/30 via-sky-200/20 to-transparent blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-3 sm:px-5 pb-10 space-y-5 sm:space-y-6">
        {/* =======================================================
            TOP NAVIGATION (Matching Beranda Pill Header)
            ======================================================= */}
        <header className="relative z-30 flex items-center justify-between gap-3 pt-4 sm:pt-5">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="h-11 px-4 rounded-full bg-white flex items-center justify-center hover:bg-slate-50 transition shadow-xs border border-slate-200/60"
              title="SunSight Beranda"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="SunSight" className="h-6 sm:h-7 w-auto object-contain" />
            </Link>

            <Link
              href="/"
              className="w-11 h-11 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center transition shadow-xs border border-slate-200/60 text-slate-700 hover:text-slate-900"
              title="Cari di Beranda"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-2" aria-label="Navigasi utama">
            <Link
              href="/"
              className="h-11 px-5 rounded-full text-sm font-medium flex items-center gap-2 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs border border-slate-200/60"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
              Beranda
            </Link>
            <Link
              href="/?tab=history"
              className="h-11 px-5 rounded-full text-sm font-medium flex items-center gap-2 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs border border-slate-200/60"
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              Riwayat
            </Link>
            <Link
              href="/?tab=calculator"
              className="h-11 px-5 rounded-full text-sm font-medium flex items-center gap-2 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs border border-slate-200/60"
            >
              <span className="material-symbols-outlined text-[18px]">calculate</span>
              Kalkulator
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/studio"
              className="h-11 px-4 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center gap-2 transition shadow-xs hover:text-amber-600 group border border-slate-200/60"
              title="Buka Studio CAD"
            >
              <span className="material-symbols-outlined text-[19px] text-amber-500 group-hover:scale-110 transition-transform">
                polyline
              </span>
              <span>Studio</span>
            </Link>

            <div
              className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-xs border border-amber-300/40"
              title="Profil Pengguna Aktif"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 text-amber-950 text-xs font-bold flex items-center justify-center shadow-2xs">
                {initials}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile secondary tab strip */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-none">
          <Link
            href="/"
            className="h-9 px-3.5 rounded-full bg-white text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            Beranda
          </Link>
          <Link
            href="/?tab=history"
            className="h-9 px-3.5 rounded-full bg-white text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            Riwayat
          </Link>
          <Link
            href="/?tab=calculator"
            className="h-9 px-3.5 rounded-full bg-white text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">calculate</span>
            Kalkulator
          </Link>
          <Link
            href="/studio"
            className="h-9 px-3.5 rounded-full bg-white text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">polyline</span>
            Studio
          </Link>
        </div>

        {/* =======================================================
            USER IDENTITY HERO CARD (Clean white with soft bubble accents)
            ======================================================= */}
        <div className="rounded-[22px] bg-white p-6 sm:p-7 relative overflow-hidden shadow-xs border border-slate-200/60">
          {/* Soft corner bubble orbs */}
          <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-amber-200/50 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-sky-200/50 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-sm border border-amber-300/40 tracking-tight">
                {initials}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {name || "Pengguna SunSight"}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Akun Terverifikasi
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

                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">location_on</span>
                  <span>{location || "Kota Bogor, Jawa Barat"}</span>
                </p>
              </div>
            </div>

            {/* Quick Stat Badges */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 border border-slate-200/60 text-center min-w-[96px]">
                <span className="block text-[11px] font-medium text-slate-400">Proyek</span>
                <span className="block text-lg font-bold tracking-tight text-slate-900 mt-0.5">4 Poligon</span>
              </div>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-center min-w-[96px]">
                <span className="block text-[11px] font-medium text-amber-700">Kapasitas</span>
                <span className="block text-lg font-bold tracking-tight text-amber-950 mt-0.5">37.8 kWp</span>
              </div>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-50/70 border border-sky-200/60 text-center min-w-[96px]">
                <span className="block text-[11px] font-medium text-sky-700">Produksi</span>
                <span className="block text-lg font-bold tracking-tight text-sky-950 mt-0.5">54.9 MWh</span>
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================
            2-COLUMN LAYOUT: Formulir Profil + Portofolio & Keamanan
            ======================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left Column: Form Edit Profil & Properti (7 Cols) */}
          <div className="lg:col-span-7 rounded-[22px] bg-white p-6 sm:p-7 relative overflow-hidden shadow-xs border border-slate-200/60 flex flex-col justify-between">
            <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-amber-100/50 blur-xl pointer-events-none" />

            <div>
              <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Profil &amp; Properti</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Informasi pemilik dan jenis properti untuk estimasi simulasi.
                  </p>
                </div>
                <span className="material-symbols-outlined text-[22px] text-amber-500">manage_accounts</span>
              </div>

              <form id="profile-form" onSubmit={handleSaveProfile} className="relative z-10 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nama Lengkap</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Nama lengkap Anda"
                    className="w-full h-11 px-4 rounded-xl bg-slate-100 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none border-0 border-none focus:ring-0 focus:bg-white focus:shadow-xs transition"
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
                      className="w-full h-11 px-4 rounded-xl bg-slate-100 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none border-0 border-none focus:ring-0 focus:bg-white focus:shadow-xs transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">No. Telepon / WhatsApp</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="081234567890"
                      className="w-full h-11 px-4 rounded-xl bg-slate-100 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none border-0 border-none focus:ring-0 focus:bg-white focus:shadow-xs transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tipe Bangunan</label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                      className="w-full h-11 px-4 rounded-xl bg-slate-100 text-sm font-semibold text-slate-900 outline-none border-0 border-none focus:ring-0 focus:bg-white focus:shadow-xs transition cursor-pointer"
                    >
                      <option value="residential">Rumah Tinggal</option>
                      <option value="commercial">Ruko / Komersial</option>
                      <option value="industrial">Pabrik / Industri</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Kota / Wilayah Domisili</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      placeholder="Kota Bogor, Jawa Barat"
                      className="w-full h-11 px-4 rounded-xl bg-slate-100 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none border-0 border-none focus:ring-0 focus:bg-white focus:shadow-xs transition"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="relative z-10 pt-5 mt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="submit"
                form="profile-form"
                className={`h-11 px-6 rounded-full font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                  isSaved
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {isSaved ? "check_circle" : "save"}
                </span>
                <span>{isSaved ? "Tersimpan!" : "Simpan Profil"}</span>
              </button>

              <span className="text-[11px] text-slate-400">
                Tersimpan otomatis di peramban ini.
              </span>
            </div>
          </div>

          {/* Right Column: Ringkasan Portofolio & Keamanan (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5 sm:gap-6">
            {/* Card 1: Dampak Portofolio */}
            <div className="rounded-[22px] bg-white p-6 relative overflow-hidden shadow-xs border border-slate-200/60 space-y-4 flex-1 flex flex-col justify-between">
              <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-sky-100/60 blur-xl pointer-events-none" />

              <div>
                <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 tracking-tight">
                      <span className="material-symbols-outlined text-[19px] text-amber-500">solar_power</span>
                      <span>Dampak Portofolio</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ringkasan 4 proyek atap aktif
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100/80 text-amber-800 text-[11px] font-semibold">
                    Optimal
                  </span>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100/80">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">savings</span>
                      </span>
                      <span className="text-[11px] text-amber-900/80 font-medium">Hemat Tagihan</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 mt-2 block">
                      Rp 2,04 jt<span className="text-xs font-normal text-slate-400">/bln</span>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100/80">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">co2</span>
                      </span>
                      <span className="text-[11px] text-sky-900/80 font-medium">Reduksi Emisi</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 mt-2 block">
                      11.5 ton<span className="text-xs font-normal text-slate-400">/thn</span>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">forest</span>
                      </span>
                      <span className="text-[11px] text-emerald-900/80 font-medium">Setara Pohon</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 mt-2 block">
                      523<span className="text-xs font-normal text-slate-400"> pohon</span>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">trending_up</span>
                      </span>
                      <span className="text-[11px] text-slate-600 font-medium">Balik Modal</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 mt-2 block">
                      2.4<span className="text-xs font-normal text-slate-400"> tahun</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">36 modul · Efisiensi area 84%</span>
                <button
                  type="button"
                  onClick={() => setProposalOpen(true)}
                  className="font-semibold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 cursor-pointer transition"
                >
                  <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                  <span>Unduh Proposal PDF</span>
                </button>
              </div>
            </div>

            {/* Card 2: Keamanan & Sesi */}
            <div className="rounded-[22px] bg-white p-6 relative overflow-hidden shadow-xs border border-rose-100/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 tracking-tight">
                  <span className="material-symbols-outlined text-[19px] text-rose-600">lock</span>
                  <span>Sesi &amp; Keamanan</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                  Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Akhiri sesi login akun SunSight di perangkat ini.
              </p>

              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="w-full h-11 px-4 rounded-full bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">logout</span>
                <span>Keluar Akun</span>
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

      {/* Proposal PDF Modal */}
      <ProposalModal
        open={proposalOpen}
        onClose={() => setProposalOpen(false)}
        result={simulationResultForModal}
        parameters={simulationParamsForModal}
        latitude="-6.5950"
        longitude="106.7972"
        biodata={biodata}
      />
    </div>
  );
}
