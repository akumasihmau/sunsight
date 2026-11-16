"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import { ApiRequestError, api, getToken, setToken } from "@/lib/api";
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
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [portfolioStats, setPortfolioStats] = useState<{
    projects: number;
    totalKwp: number;
    annualMwh: number;
  }>({ projects: 0, totalKwp: 0, annualMwh: 0 });

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }

  /**
   * Profil dibaca dari server saat halaman dibuka.
   *
   * Data lokal hanya dipakai sebagai isi awal selama permintaan berjalan. Setelah
   * server menjawab, formulir dan penyimpanan lokal disamakan dengan akun, sehingga
   * nama yang tampil di header tidak lagi berbeda dari yang tersimpan di server.
   */
  useEffect(() => {
    if (!getToken()) return;

    let cancelled = false;

    void (async () => {
      try {
        const user = await api.currentUser();
        if (cancelled) return;

        const propertyType = (user.property_type as PropertyType | null) ?? "residential";

        setName(user.name);
        setEmail(user.email);
        setPhone(user.phone ?? "");
        setPropertyType(propertyType);
        setLocation(user.location ?? "");
        saveStoredBiodata({
          name: user.name,
          email: user.email,
          phone: user.phone ?? "",
          propertyType,
          location: user.location ?? "",
        });
      } catch {
        // Profil lokal tetap dipakai bila server tidak dapat dihubungi.
      }

      try {
        const sims = await api.listSimulations(1);
        if (cancelled) return;
        const rows = sims.data ?? [];
        const totalKwp = rows.reduce((sum, r) => sum + (r.capacity_kwp ?? 0), 0);
        const annualMwh = rows.reduce((sum, r) => sum + (r.annual_production_kwh ?? 0), 0) / 1000;
        setPortfolioStats({
          projects: sims.meta?.total ?? rows.length,
          totalKwp,
          annualMwh,
        });
      } catch {
        // Statistik portofolio bersifat pelengkap.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    try {
      await api.logout();
    } catch {
      // Ignore if session already expired
    }
    setToken(null);
    router.push("/landing");
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const user = await api.updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() === "" ? null : phone.trim(),
        property_type: propertyType,
        location: location.trim() === "" ? null : location.trim(),
      });

      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone ?? "");
      setLocation(user.location ?? "");
      saveStoredBiodata({
        name: user.name,
        email: user.email,
        phone: user.phone ?? "",
        propertyType: (user.property_type as PropertyType | null) ?? "residential",
        location: user.location ?? "",
      });

      setIsSaved(true);
      showToast("Profil berhasil disimpan ke akun");
      setTimeout(() => setIsSaved(false), 2400);
    } catch (caught) {
      showToast(
        caught instanceof ApiRequestError
          ? caught.message
          : "Gagal menyimpan profil. Periksa koneksi backend."
      );
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Mengganti kata sandi akun. Konfirmasi diperiksa di sini supaya pengguna tidak
   * menunggu perjalanan ke server hanya untuk kesalahan ketik.
   */
  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast("Konfirmasi kata sandi belum sama.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Kata sandi berhasil diperbarui");
    } catch (caught) {
      showToast(
        caught instanceof ApiRequestError
          ? caught.message
          : "Gagal memperbarui kata sandi."
      );
    } finally {
      setIsChangingPassword(false);
    }
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
    <div className="min-h-screen w-full bg-[#EFF1F4] text-slate-800 font-sans antialiased relative overflow-hidden">
      {/* Ambient Soft Radiant Glow Background (pure radial gradients — light on GPU) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-36 left-1/4 w-[620px] h-[620px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(252,211,77,0.28) 0%, rgba(254,240,138,0.12) 42%, transparent 72%)" }}
        />
        <div
          className="absolute top-1/4 -right-24 w-[520px] h-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(125,211,252,0.22) 0%, rgba(207,250,254,0.10) 42%, transparent 72%)" }}
        />
        <div
          className="absolute -bottom-16 left-8 w-[480px] h-[480px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(253,230,138,0.22) 0%, rgba(186,230,253,0.10) 42%, transparent 72%)" }}
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-3.5 sm:px-6 pb-12 space-y-5 sm:space-y-6">
        {/* Top Navigation Pill Bar */}
        <header className="relative z-30 flex items-center justify-between gap-3 pt-4 sm:pt-5">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="h-11 px-4 rounded-full bg-white/85 hover:bg-white backdrop-blur-xl saturate-150 flex items-center justify-center transition shadow-xs border border-white/90"
              title="SunSight Beranda"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="SunSight" className="h-6 sm:h-7 w-auto object-contain" />
            </Link>

            <Link
              href="/"
              className="w-11 h-11 rounded-full bg-white/85 hover:bg-white backdrop-blur-xl saturate-150 flex items-center justify-center transition shadow-xs border border-white/90 text-slate-600 hover:text-slate-900"
              title="Cari Proyek"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-2" aria-label="Navigasi utama">
            <Link
              href="/"
              className="h-11 px-5 rounded-full text-sm font-medium flex items-center gap-2 bg-white/85 hover:bg-white backdrop-blur-xl text-slate-700 hover:text-slate-900 transition shadow-xs border border-white/90"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
              Beranda
            </Link>
            <Link
              href="/?tab=history"
              className="h-11 px-5 rounded-full text-sm font-medium flex items-center gap-2 bg-white/85 hover:bg-white backdrop-blur-xl text-slate-700 hover:text-slate-900 transition shadow-xs border border-white/90"
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              Riwayat
            </Link>
            <Link
              href="/?tab=calculator"
              className="h-11 px-5 rounded-full text-sm font-medium flex items-center gap-2 bg-white/85 hover:bg-white backdrop-blur-xl text-slate-700 hover:text-slate-900 transition shadow-xs border border-white/90"
            >
              <span className="material-symbols-outlined text-[18px]">calculate</span>
              Kalkulator
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/studio"
              className="h-11 px-4 sm:px-5 rounded-full bg-white/85 hover:bg-white backdrop-blur-xl text-slate-700 hover:text-amber-700 text-sm font-semibold flex items-center gap-2 transition shadow-xs border border-white/90 group"
              title="Buka Studio CAD"
            >
              <span className="material-symbols-outlined text-[19px] text-amber-500 group-hover:scale-110 transition-transform">
                polyline
              </span>
              <span>Studio</span>
            </Link>

            <div
              className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-xl flex items-center justify-center shadow-xs border border-amber-300/60 relative"
              title="Halaman Profil Aktif"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950 text-xs font-bold flex items-center justify-center shadow-2xs">
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
            className="h-9 px-3.5 rounded-full bg-white/85 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            Beranda
          </Link>
          <Link
            href="/?tab=history"
            className="h-9 px-3.5 rounded-full bg-white/85 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            Riwayat
          </Link>
          <Link
            href="/?tab=calculator"
            className="h-9 px-3.5 rounded-full bg-white/85 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">calculate</span>
            Kalkulator
          </Link>
          <Link
            href="/studio"
            className="h-9 px-3.5 rounded-full bg-white/85 text-slate-700 text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">polyline</span>
            Studio
          </Link>
        </div>

        {/* Hero Card: Identitas & Portofolio (Frosted Glass + Soft Radiant Glow) */}
        <section className="rounded-[28px] bg-white/78 bg-gradient-to-br from-white/92 via-amber-50/25 to-sky-50/25 backdrop-blur-2xl saturate-150 p-6 sm:p-7 relative overflow-hidden shadow-[0_14px_38px_rgba(15,23,42,0.05),inset_0_1px_1px_rgba(255,255,255,0.92)] border border-white/85">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* User Identity Info */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-amber-300/60 via-yellow-200/70 to-amber-400/40 shadow-[0_6px_22px_rgba(245,158,11,0.22)] flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950 font-bold text-xl sm:text-2xl flex items-center justify-center shadow-inner tracking-tight">
                    {initials}
                  </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white shadow-xs flex items-center justify-center text-amber-500 border border-amber-200/80">
                  <span className="material-symbols-outlined text-[14px]">wb_sunny</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                    {name || "Pengguna SunSight"}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Akun Aktif
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-900/[0.05] text-slate-600 text-[11px] font-medium">
                    {propertyType === "residential"
                      ? "Residensial"
                      : propertyType === "commercial"
                      ? "Komersial"
                      : "Industri"}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-500">
                  {email || "-"} · {phone || "Belum diisi"}
                </p>

                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 pt-0.5">
                  <span className="material-symbols-outlined text-[15px] text-amber-500">location_on</span>
                  <span>{location || "Kota Bogor, Jawa Barat"}</span>
                </p>
              </div>
            </div>

            {/* Unified Grouped Portfolio Metrics Strip */}
            <div className="rounded-2xl bg-slate-900/[0.04] grid grid-cols-3 divide-x divide-slate-900/[0.07] py-3 shrink-0 min-w-[280px] sm:min-w-[330px]">
              <div className="px-4 text-center">
                <span className="block text-[11px] text-slate-500">Simulasi</span>
                <span className="block text-base sm:text-lg font-semibold tracking-tight text-slate-900 font-code-metric tabular-nums mt-0.5">
                  {portfolioStats.projects} Proyek
                </span>
              </div>
              <div className="px-4 text-center">
                <span className="block text-[11px] text-amber-800">Kapasitas</span>
                <span className="block text-base sm:text-lg font-semibold tracking-tight text-amber-950 font-code-metric tabular-nums mt-0.5">
                  {portfolioStats.totalKwp.toFixed(1)} kWp
                </span>
              </div>
              <div className="px-4 text-center">
                <span className="block text-[11px] text-sky-800">Produksi/Thn</span>
                <span className="block text-base sm:text-lg font-semibold tracking-tight text-sky-950 font-code-metric tabular-nums mt-0.5">
                  {portfolioStats.annualMwh.toFixed(1)} MWh
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2-Column Grid: Form Profil & Standar/Keamanan */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Kolom Kiri: Form Data Diri & Properti (7 Kolom) */}
          <section className="lg:col-span-7 rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 p-6 sm:p-7 relative overflow-hidden shadow-[0_12px_32px_rgba(15,23,42,0.04)] border border-white/85 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-900/[0.06] pb-4 mb-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                    Data Diri &amp; Properti
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Digunakan pada pratinjau proposal kelayakan PLTS dan profil akun.
                  </p>
                </div>
                <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[19px]">tune</span>
                </span>
              </div>

              <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Nama Lengkap</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Nama lengkap"
                    className="w-full h-11 px-4 rounded-xl bg-slate-900/[0.04] hover:bg-slate-900/[0.055] border border-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/20 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="nama@email.com"
                      className="w-full h-11 px-4 rounded-xl bg-slate-900/[0.04] hover:bg-slate-900/[0.055] border border-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/20 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">No. WhatsApp</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="081234567890"
                      className="w-full h-11 px-4 rounded-xl bg-slate-900/[0.04] hover:bg-slate-900/[0.055] border border-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/20 transition font-code-metric"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Tipe Bangunan</label>
                    <div className="relative">
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                        className="w-full h-11 px-4 pr-10 rounded-xl bg-slate-900/[0.04] hover:bg-slate-900/[0.055] border border-transparent text-sm font-medium text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/20 transition cursor-pointer appearance-none"
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
                    <label className="text-xs font-medium text-slate-600">Lokasi Properti</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      placeholder="Kota Bogor, Jawa Barat"
                      className="w-full h-11 px-4 rounded-xl bg-slate-900/[0.04] hover:bg-slate-900/[0.055] border border-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/20 transition"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="pt-5 mt-6 border-t border-slate-900/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="submit"
                form="profile-form"
                disabled={isSaving}
                className={`h-11 px-6 rounded-full font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98] border ${
                  isSaved
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 border-amber-300/80 shadow-[0_6px_18px_rgba(245,158,11,0.22),inset_0_1px_1px_rgba(255,255,255,0.88)]"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {isSaved ? "check_circle" : "save"}
                </span>
                <span>{isSaved ? "Tersimpan!" : isSaving ? "Menyimpan..." : "Simpan Perubahan"}</span>
              </button>

              <span className="text-[11px] text-slate-400">
                Disinkronkan ke akun SunSight Anda.
              </span>
            </div>
          </section>

          {/* Kolom Kanan: Standar & Keamanan (5 Kolom) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Card 1: Standar Teknis & Sumber Data (Single Grouped Spec List) */}
            <section className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.04)] border border-white/85 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900/[0.06] pb-3.5">
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-600">verified</span>
                    <span>Standar Teknis &amp; Sumber Data</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rujukan rekayasa dan regulasi resmi energi surya
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900/[0.035] divide-y divide-slate-900/[0.06] text-xs">
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-600 font-medium">Pemetaan Atap</span>
                  <span className="text-slate-900 font-semibold font-code-metric">Nadir 90° · 1 m = 20 px</span>
                </div>
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-600 font-medium">Data Radiasi</span>
                  <span className="text-slate-900 font-semibold font-code-metric">NASA &amp; Solargis (4,2–4,5 kWh/m²)</span>
                </div>
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-600 font-medium">Standar Sistem</span>
                  <span className="text-slate-900 font-semibold">IEC 61215 · IEEE 1547 · PUIL 2020</span>
                </div>
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-600 font-medium">Regulasi &amp; Emisi</span>
                  <span className="text-slate-900 font-semibold">Permen ESDM 2/2024 · ISO 14064</span>
                </div>
              </div>

              <Link
                href="/methodology"
                className="w-full h-10 px-4 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_4px_14px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.85)] border border-amber-300/80 group"
              >
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                <span>Lihat Metodologi Lengkap</span>
                <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </Link>
            </section>

            {/* Card 2: Keamanan & Sesi Akun (Combined Clean Card) */}
            <section className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.04)] border border-white/85 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900/[0.06] pb-3.5">
                <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2 tracking-tight">
                  <span className="material-symbols-outlined text-[18px] text-slate-600">lock</span>
                  <span>Keamanan &amp; Sesi Akun</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-medium">
                  Aktif
                </span>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-2.5">
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Kata sandi saat ini"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-900/[0.04] hover:bg-slate-900/[0.055] border border-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/20 transition"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kata sandi baru (min. 8)"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-900/[0.04] hover:bg-slate-900/[0.055] border border-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/20 transition"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-900/[0.04] hover:bg-slate-900/[0.055] border border-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-300/20 transition"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="flex-1 h-10 px-4 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                    <span>{isChangingPassword ? "Menyimpan..." : "Ubah Kata Sandi"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="h-10 px-4 rounded-full bg-slate-900/[0.045] hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Keluar</span>
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900/90 backdrop-blur-xl text-white text-xs font-semibold shadow-[0_8px_24px_rgba(15,23,42,0.20)] flex items-center gap-2.5 border border-amber-400/30 animate-fadeIn">
          <span className="material-symbols-outlined text-[18px] text-amber-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
