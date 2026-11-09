"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";

export default function MethodologyPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("spatial");

  // Handler tombol kembali dinamis: kembali ke halaman sebelumnya (profil/landing), fallback ke "/" jika history kosong
  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 font-body-md antialiased selection:bg-amber-100 selection:text-amber-950 flex flex-col justify-between">
      {/* Radiant Soft Glow Ambient Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[780px] h-[400px] bg-gradient-to-b from-amber-200/30 via-amber-100/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar: Bersih, Cukup Tombol Back Tanpa Kontainer / Border */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-amber-200/40 px-4 sm:px-8 h-14 sm:h-16 flex items-center">
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-amber-900 transition-colors cursor-pointer group p-1 -ml-1"
          title="Kembali ke halaman sebelumnya"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform text-slate-500 group-hover:text-amber-800">
            arrow_back
          </span>
          <span>Kembali</span>
        </button>
      </header>

      {/* Hero Headline Section */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14 w-full space-y-10 sm:space-y-12">
        
        <div className="text-center max-w-3xl mx-auto space-y-3.5 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 backdrop-blur-xl border border-amber-200/80 shadow-[0_2px_12px_rgba(245,158,11,0.08)]">
            <span className="material-symbols-outlined text-amber-600 text-[16px]">verified</span>
            <span className="text-xs font-bold text-amber-950 font-title tracking-tight">
              Metodologi Sains, Geospasial, &amp; Finansial
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-title tracking-tight leading-[1.14]">
            Sumber data &amp; <br />
            <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
              standar perhitungan resmi.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            SunSight mengintegrasikan citra satelit ortofoto, observasi radiasi iklim Kota Bogor,
            spesifikasi komponen Tier-1, dan regulasi Permen ESDM untuk menghasilkan kalkulasi atap surya yang akurat dan transparan.
          </p>
        </div>

        {/* Floating Category Navigation Bar (Sticky Radiant Pills - Anti Kepotong) */}
        <div className="sticky top-14 sm:top-16 z-30 py-2.5 backdrop-blur-xl bg-[#FAF9F5]/90 border-b border-amber-200/40 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1 px-1 justify-start md:justify-center">
            {[
              { id: "spatial", label: "01 Citra Spasial", icon: "map" },
              { id: "solar", label: "02 Radiasi Bogor", icon: "sunny" },
              { id: "hardware", label: "03 Spesifikasi Komponen", icon: "solar_power" },
              { id: "financial", label: "04 Regulasi & Finansial", icon: "calculate" },
              { id: "emissions", label: "05 Dampak Lingkungan", icon: "forest" },
              { id: "glossary", label: "06 Glosarium Surya", icon: "menu_book" },
            ].map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollTo(item.id)}
                  className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 text-white shadow-[0_4px_16px_rgba(245,158,11,0.32)] border border-amber-300/80 scale-[1.02]"
                      : "bg-white/85 hover:bg-white backdrop-blur-xl border border-amber-200/60 hover:border-amber-400/80 text-slate-700 hover:text-amber-950 shadow-2xs hover:shadow-[0_4px_12px_rgba(245,158,11,0.12)]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================
            SEKSI 1: CITRA SATELIT & DATA SPASIAL
            ========================================================= */}
        <section
          id="spatial"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-9 space-y-6 scroll-mt-28"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">map</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 01 • Akurasi Geospasial
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-title">
                Citra Satelit Ortofoto 90° Nadir Bebas Distorsi
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Pengukuran atap membutuhkan akurasi geometris tinggi. Foto udara miring biasa rentan bias sudut hingga 30%.
            SunSight menggunakan ortorektifikasi tegak lurus (90° nadir) untuk memastikan ukuran fisik atap di lapangan sejajar dengan kanvas simulasi.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-[17px]">center_focus_strong</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Koreksi Paralaks 90°</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Diproses dengan Digital Elevation Model (DEM) untuk menghilangkan efek kemiringan lensa dan bayangan dinding bangunan.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-[17px]">straighten</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Skala 1 Meter = 20 Px</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Terkalibrasi Ground Sampling Distance (GSD) sehingga modul 550Wp (2.28m × 1.13m) ditempatkan sesuai dimensi riil atap.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-[17px]">location_city</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Kontur 6 Kecamatan Bogor</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Basis data dioptimalkan untuk elevasi 190–330 mdpl di Bogor Tengah, Selatan, Timur, Utara, Barat, dan Tanah Sareal.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEKSI 2: DATA RADIASI MATAHARI & METEOROLOGI BOGOR
            ========================================================= */}
        <section
          id="solar"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-9 space-y-6 scroll-mt-28"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">sunny</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 02 • Meteorologi Surya
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-title">
                Radiasi Matahari &amp; Mikroklimat Kota Bogor
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Sebagai kawasan tropis dekat khatulistiwa (6.59° LS, 106.79° BT) dengan pola hujan unik, estimasi potensi energi matahari dihitung dari observasi satelit multi-dekade NASA POWER dan Global Solar Atlas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200/70 space-y-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Insolasi Harian</span>
              <div className="text-xl sm:text-2xl font-bold text-amber-950 font-code-metric">
                4.20 – 4.52 <span className="text-xs font-normal text-slate-500">kWh/m²/hari</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                Peak Sun Hours (PSH) rata-rata tahunan Kota Bogor dari data satelit Solargis / Bank Dunia.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200/70 space-y-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Performance Ratio</span>
              <div className="text-xl sm:text-2xl font-bold text-amber-950 font-code-metric">
                80.0% <span className="text-xs font-normal text-slate-500">(PR 0.80)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                Faktor koreksi degradasi termal tropis modul (-0.34%/°C di atas 25°C), kabel, dan debu.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200/70 space-y-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Puncak Radiasi</span>
              <div className="text-xl sm:text-2xl font-bold text-amber-950 font-code-metric">
                72% <span className="text-xs font-normal text-slate-500">jam 08.30–13.30</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                Energi harian terkonsentrasi di pagi-siang sebelum pembentukan awan konvektif sore hari Gunung Salak.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEKSI 3: STANDAR HARDWARE & KOMPONEN TIER-1
            ========================================================= */}
        <section
          id="hardware"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-9 space-y-6 scroll-mt-28"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">solar_power</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 03 • Komponen &amp; Fisik
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-title">
                Spesifikasi Modul Tier-1, Inverter, &amp; CAD Atap
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <span className="material-symbols-outlined text-[18px] text-amber-600">grid_view</span>
                <span>Modul Surya Tier-1 (550Wp)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Tipe Sel:</strong> Monocrystalline Half-Cell PERC / TopCon efisiensi ~21.3%.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Dimensi:</strong> 2.278 × 1.134 × 35 mm (luas bidang ±2.58 m² per modul).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Sertifikasi:</strong> IEC 61215 (uji mekanis) &amp; IEC 61730 (keamanan listrik).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Garansi Daya:</strong> Garansi linier 25 tahun (output tetap &gt;84.8% di tahun ke-25).</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <span className="material-symbols-outlined text-[18px] text-amber-600">bolt</span>
                <span>Inverter Grid-Tied &amp; Proteksi</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Efisiensi Konversi:</strong> Euro Efficiency &ge; 97.5% gelombang sinus murni sinkron PLN.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Anti-Islanding (IEEE 1547):</strong> Otomatis memutus arus &le; 2 detik saat jaringan PLN padam.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Proteksi Petir:</strong> Surge Protection Device (SPD Type II) pada jalur DC dan AC.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Grounding PUIL 2020:</strong> Tahanan pembumian sistem terstandar wajib &le; 5 Ohm.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Standar Tata Letak CAD */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
            <div>
              <strong className="text-slate-900 block font-title">Setback 30–50 cm</strong>
              <span>Jarak batas talang untuk meredam terpaan angin dan jalur pijak teknisi.</span>
            </div>
            <div>
              <strong className="text-slate-900 block font-title">Celah Modul 2–3 cm</strong>
              <span>Ruang pasang klem aluminium (*mid-clamp*) dan ruang toleransi muai panas.</span>
            </div>
            <div>
              <strong className="text-slate-900 block font-title">Tilt Optimal 10°–22°</strong>
              <span>Kemiringan optimal agar air hujan mencuci permukaan panel secara alami.</span>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEKSI 4: FORMULA FINANSIAL & REGULASI PERMEN ESDM
            ========================================================= */}
        <section
          id="financial"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-9 space-y-6 scroll-mt-28"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">calculate</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 04 • Metodologi Finansial &amp; Regulasi
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-title">
                Permen ESDM No. 2/2024, Tarif PLN, &amp; Rumus ROI
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Perhitungan rupiah didasarkan pada kebijakan Peraturan Menteri ESDM No. 2 Tahun 2024 serta tarif listrik resmi PT PLN (Persero).
          </p>

          {/* Formula Cards: Radiant Glass Soft Glow (Tanpa Hitam) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-amber-100/40 to-white/95 border border-amber-300/80 shadow-[0_4px_16px_rgba(245,158,11,0.08)] space-y-2">
              <span className="text-amber-900 font-bold text-xs uppercase tracking-wider block font-title">
                1. Estimasi Produksi Listrik Tahunan
              </span>
              <p className="text-amber-950 font-bold font-mono text-sm sm:text-base">
                E (kWh) = Kapasitas (kWp) × PSH × 365 × PR
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Contoh: 8.3 kWp × 4.25 jam × 365 hari × 0.80 = ±10.300 kWh per tahun.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-amber-100/40 to-white/95 border border-amber-300/80 shadow-[0_4px_16px_rgba(245,158,11,0.08)] space-y-2">
              <span className="text-amber-900 font-bold text-xs uppercase tracking-wider block font-title">
                2. Waktu Balik Modal (Payback / BEP)
              </span>
              <p className="text-amber-950 font-bold font-mono text-sm sm:text-base">
                BEP (Tahun) = Total CAPEX (Rp) / Hemat Tahunan (Rp)
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Total CAPEX mencakup paket turnkey (modul, inverter, racking, instalasi, dan sertifikasi).
              </p>
            </div>
          </div>

          {/* Prinsip Permen ESDM 2/2024 */}
          <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-2.5">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-600">gavel</span>
              <span>Penerapan Regulasi Permen ESDM No. 2 Tahun 2024:</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
              <div>
                <strong className="text-slate-900 block font-title">Sistem Kuota Transmisi</strong>
                <span>Penghapusan batasan kaku 100% daya kontrak PLN, disesuaikan ketersediaan kuota wilayah.</span>
              </div>
              <div>
                <strong className="text-slate-900 block font-title">Fokus Self-Consumption</strong>
                <span>Algoritma mengoptimalkan kapasitas agar terserap penuh di siang hari tanpa energi terbuang.</span>
              </div>
              <div>
                <strong className="text-slate-900 block font-title">Tanpa Biaya Beban</strong>
                <span>Pelanggan rumah tangga (tarif R) dibebaskan dari biaya kapasitas (*capacity charge*) bulanan.</span>
              </div>
            </div>
          </div>

          {/* Tarif PLN Resmi */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Katalog Tarif Resmi PT PLN (Persero):</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-code-metric text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-slate-400 text-[10px] block">R-1 / 900 VA</span>
                <span className="font-bold text-slate-900">Rp 1.352,00 / kWh</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-slate-400 text-[10px] block">R-1 / 1.300 &amp; 2.200 VA</span>
                <span className="font-bold text-slate-900">Rp 1.444,70 / kWh</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-slate-400 text-[10px] block">R-2 / 3.500 – 5.500 VA</span>
                <span className="font-bold text-slate-900">Rp 1.699,53 / kWh</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-slate-400 text-[10px] block">R-3 / &ge; 6.600 VA</span>
                <span className="font-bold text-slate-900">Rp 1.699,53 / kWh</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEKSI 5: STANDAR REDUKSI EMISI & DAMPAK LINGKUNGAN
            ========================================================= */}
        <section
          id="emissions"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-9 space-y-6 scroll-mt-28"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">forest</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block font-title">
                Pilar 05 • Dampak Lingkungan
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-title">
                Faktor Emisi Karbon &amp; Ekuivalensi Pohon
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-white/90 border border-emerald-200/70 space-y-2 shadow-2xs">
              <span className="text-xs font-bold text-emerald-950 block">Faktor Emisi Grid Jamali (Kementerian ESDM)</span>
              <div className="text-2xl font-bold text-emerald-900 font-code-metric">
                0.80 kg CO₂ <span className="text-xs font-normal text-slate-600">/ kWh</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Berdasarkan laporan Ditjen Ketenagalistrikan Kementerian ESDM untuk jaringan interkoneksi Jawa-Madura-Bali.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-white/90 border border-emerald-200/70 space-y-2 shadow-2xs">
              <span className="text-xs font-bold text-emerald-950 block">Serapan Pohon Hutan Tropis</span>
              <div className="text-2xl font-bold text-emerald-900 font-code-metric">
                21.77 kg CO₂ <span className="text-xs font-normal text-slate-600">/ pohon / tahun</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Standar serapan pohon tropis dewasa. Setiap reduksi 1 ton CO₂ setara dengan memelihara sekitar 46 pohon per tahun.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEKSI 6: GLOSARIUM SURYA UNTUK PENGGUNA AWAM
            ========================================================= */}
        <section
          id="glossary"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-9 space-y-6 scroll-mt-28"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">menu_book</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 06 • Glosarium Ramah Pengguna
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-title">
                Glosarium Istilah Energi Surya
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs text-slate-600">
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">kWp (Kilowatt-peak):</strong>
              <p>Kapasitas maksimal daya panel surya pada kondisi pencahayaan matahari ideal laboratorium (1.000 W/m²).</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">kWh (Kilowatt-hour):</strong>
              <p>Jumlah energi listrik nyata yang dihasilkan atau dikonsumsi per jam. Satuan ini yang tercantum di tagihan PLN.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">Tilt &amp; Azimuth:</strong>
              <p><strong>Tilt</strong> adalah sudut kemiringan atap, sedangkan <strong>Azimuth</strong> adalah arah mata angin hadap bidang atap.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">Inverter:</strong>
              <p>Pengubah arus searah (DC) dari modul surya menjadi arus bolak-balik (AC) standar peralatan rumah tangga.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">BEP (Break-Even Point):</strong>
              <p>Waktu balik modal ketika total penghematan tagihan listrik menyamai seluruh biaya awal pemasangan PLTS.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">Self-Consumption:</strong>
              <p>Proporsi listrik surya yang langsung diserap peralatan rumah saat siang hari ketika matahari bersinar.</p>
            </div>
          </div>
        </section>

        {/* Bottom Mascot Card: Sunny Memberi Ringkasan Ramah (Tombol Radiant Soft Glow Glass - Tanpa Hitam) */}
        <div className="rounded-[32px] bg-gradient-to-r from-amber-100/90 via-amber-200/80 to-amber-100/90 border border-amber-300/80 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_16px_40px_rgba(245,158,11,0.14)]">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="hidden sm:block shrink-0">
              <SunnyMascot size={72} expression="happy" animated={true} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-amber-950 font-title">
                Sains terbuka untuk keputusan energi yang tepat.
              </h3>
              <p className="text-xs text-amber-900/80 mt-1 max-w-xl">
                Dokumentasi ini terus diselaraskan dengan penyesuaian tarif listrik resmi PLN dan regulasi ketenagalistrikan terbaru.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-auto h-11 px-6 rounded-full bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-title text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-[0_4px_16px_rgba(245,158,11,0.32)] hover:shadow-[0_6px_22px_rgba(245,158,11,0.42)] border border-amber-300/80 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Kembali ke Halaman Sebelumnya</span>
          </button>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 px-4 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SunSight • Transparansi Metodologi &amp; Standar Data Energi Surya Kota Bogor</p>
      </footer>
    </div>
  );
}