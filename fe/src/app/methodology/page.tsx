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
      {/* Radiant Soft Glow Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[750px] h-[380px] bg-gradient-to-b from-amber-200/25 via-amber-100/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar: Bersih, Cukup Tombol Back Tanpa Kontainer / Border */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-amber-200/40 px-4 sm:px-8 h-14 sm:h-16 flex items-center">
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group p-1 -ml-1"
          title="Kembali ke halaman sebelumnya"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform text-slate-500 group-hover:text-slate-900">
            arrow_back
          </span>
          <span>Kembali</span>
        </button>
      </header>

      {/* Hero Headline Section */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full space-y-12">
        
        <div className="text-center max-w-3xl mx-auto space-y-4">
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

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            SunSight dirancang dengan prinsip transparansi ilmiah penuh. Pelajari bagaimana citra satelit,
            data radiasi matahari Kota Bogor, spesifikasi hardware Tier-1, dan regulasi Permen ESDM diintegrasikan
            untuk menghadirkan kalkulasi yang presisi dan dapat dipertanggungjawabkan.
          </p>
        </div>

        {/* Floating Category Navigation Bar (Sticky Pills) */}
        <div className="sticky top-20 z-30 flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto py-2 px-2 -mx-2 [scrollbar-width:none]">
          {[
            { id: "spatial", label: "01 Citra Spasial", icon: "map" },
            { id: "solar", label: "02 Radiasi Bogor", icon: "sunny" },
            { id: "hardware", label: "03 Spesifikasi Komponen", icon: "solar_power" },
            { id: "financial", label: "04 Regulasi & Finansial", icon: "calculate" },
            { id: "emissions", label: "05 Dampak Lingkungan", icon: "forest" },
            { id: "glossary", label: "06 Glosarium Surya", icon: "menu_book" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeSection === item.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white/90 backdrop-blur-xl border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-white"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* =========================================================
            SEKSI 1: CITRA SATELIT & DATA SPASIAL
            ========================================================= */}
        <section
          id="spatial"
          className="rounded-[32px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.04),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-10 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">map</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 01 • Data Geospasial
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title">
                Citra Satelit Ortofoto 90° Nadir Bebas Distorsi
              </h2>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              Pengukuran potensi atap membutuhkan akurasi geometris yang tinggi. Pada citra satelit miring atau foto udara biasa,
              sudut perspektif dan bayangan dinding bangunan sering menyebabkan kesalahan pengukuran hingga 30%.
              SunSight menggunakan pendekatan <strong>Ortorektifikasi Tegak Lurus (90° Nadir)</strong>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">center_focus_strong</span>
                  <span>Koreksi Paralaks Geometris</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Citra satelit telah diproses dengan Digital Elevation Model (DEM) untuk menghilangkan efek paralaks kemiringan lensa.
                  Hasilnya adalah bidang tampak atas murni di mana garis bubungan (*ridge*), tepi atap (*eaves*), dan jurai talang
                  memiliki rasio ukuran yang sejajar dengan kondisi fisik bangunan di lapangan.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">straighten</span>
                  <span>Kalibrasi Skala Piksel ke Meter Nyata</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Setiap koordinat di Studio CAD dikalibrasikan dengan Ground Sampling Distance (GSD).
                  Sistem menetapkan rasio konversi <strong>1 meter fisik = 20 piksel kanvas</strong> pada zoom standar.
                  Hal ini memastikan dimensi modul 550W (2.28m × 1.13m) ditempatkan sesuai ukuran fisik aslinya.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-start gap-3 mt-2">
              <span className="material-symbols-outlined text-amber-700 text-[20px] shrink-0 mt-0.5">travel_explore</span>
              <div className="text-xs text-amber-950 leading-relaxed">
                <strong>Cakupan Wilayah Spesifik Kota Bogor:</strong> Basis data spasial SunSight dioptimalkan untuk topografi
                bergelombang Kota Bogor (elevasi 190 – 330 mdpl) di 6 kecamatan: Bogor Tengah, Bogor Selatan, Bogor Timur,
                Bogor Utara, Bogor Barat, dan Tanah Sareal.
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEKSI 2: DATA RADIASI MATAHARI & METEOROLOGI BOGOR
            ========================================================= */}
        <section
          id="solar"
          className="rounded-[32px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.04),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-10 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">sunny</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 02 • Meteorologi Surya
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title">
                Radiasi Matahari &amp; Mikroklimat Kota Bogor
              </h2>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              Kota Bogor memiliki fenomena iklim unik: curah hujan tinggi (*Kota Hujan*) yang diiringi dengan
              radiasi matahari zenit yang melimpah di pagi hingga siang hari karena letaknya yang berada dekat garis khatulistiwa
              (koordinat 6.59° LS, 106.79° BT). Data radiasi yang kami gunakan bersumber dari:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 font-title">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                  Sumber Data Primer
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">
                  NASA POWER &amp; Global Solar Atlas
                </span>
                <span className="text-xs text-slate-500 mt-1 block font-sans font-normal">
                  Rata-rata observasi satelit multi-dekade (Solargis / Bank Dunia).
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                  Insolasi Harian Rata-rata
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block font-code-metric">
                  4.20 – 4.52 kWh/m²/hari
                </span>
                <span className="text-xs text-slate-500 mt-1 block font-sans font-normal">
                  Peak Sun Hours (PSH) rata-rata tahunan Kota Bogor.
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                  Performance Ratio (PR)
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block font-code-metric">
                  80.0% (0.80)
                </span>
                <span className="text-xs text-slate-500 mt-1 block font-sans font-normal">
                  Faktor koreksi suhu tropis, kabel, dan debu.
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-slate-900 text-sm">
                Faktor Koreksi Kehilangan Daya (Derating Analysis):
              </h4>
              <p>
                Kapasitas nominal panel (kWp) diuji di laboratorium pada suhu 25°C. Di atap tropis Kota Bogor,
                suhu permukaan modul dapat mencapai 45°C – 55°C. SunSight menerapkan koefisien degradasi termal
                sebesar <strong>-0.34% per derajat Celsius</strong> di atas 25°C, rugi-rugi kabel DC/AC (1.5%),
                dan rugi konversi inverter (2.5%) untuk menghasilkan estimasi listrik yang realistis, bukan sekadar angka di atas kertas.
              </p>
              <p>
                <strong>Kurva Puncak Penyinaran Asimetris:</strong> Karena awan konvektif sore hari sering terbentuk di kawasan Gunung Salak/Gede,
                sekitar <strong>72% produksi energi harian PLTS di Bogor terkonsentrasi pada pukul 08.30 – 13.30 WIB</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEKSI 3: STANDAR HARDWARE & KOMPONEN TIER-1
            ========================================================= */}
        <section
          id="hardware"
          className="rounded-[32px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.04),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-10 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">solar_power</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 03 • Standar Komponen &amp; Fisik
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title">
                Spesifikasi Modul Surya, Inverter, &amp; CAD Atap
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
            {/* Card Modul */}
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <span className="material-symbols-outlined text-[19px] text-amber-600">grid_view</span>
                <span>Modul Fotovoltaik Tier-1 (550Wp)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                <li><strong>Tipe Sel:</strong> Monocrystalline Half-Cell PERC / TopCon efisiensi tinggi (~21.3%).</li>
                <li><strong>Dimensi Standar:</strong> 2.278 mm × 1.134 mm × 35 mm (luas bidang ±2.58 m² per modul).</li>
                <li><strong>Sertifikasi Internasional:</strong> IEC 61215 (uji beban mekanis) &amp; IEC 61730 (keselamatan sengatan listrik).</li>
                <li><strong>Garansi Daya Linier 25 Tahun:</strong> Degradasi tahun ke-1 &le; 2.0%, tahun ke-2–25 &le; 0.55%/tahun (output tetap &gt;84.8% pada tahun ke-25).</li>
              </ul>
            </div>

            {/* Card Inverter & Proteksi */}
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <span className="material-symbols-outlined text-[19px] text-amber-600">bolt</span>
                <span>Inverter Grid-Tied &amp; Proteksi Kelistrikan</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                <li><strong>Efisiensi Konversi:</strong> Euro Efficiency &ge; 97.5% (gelombang sinus murni sinkron PLN).</li>
                <li><strong>Fitur Anti-Islanding (IEEE 1547):</strong> Otomatis memutus aliran listrik dalam waktu &lt;2 detik saat jaringan PLN padam untuk keselamatan teknisi.</li>
                <li><strong>Proteksi Petir (SPD Type II):</strong> Surge Protection Device DC dan AC untuk meredam induksi petir Kota Bogor.</li>
                <li><strong>Standar Pembumian (Grounding):</strong> Tahanan pembumian sistem wajib &le; 5 Ohm sesuai regulasi PUIL 2020.</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-600">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-amber-600">architecture</span>
              <span>Standar Tata Letak CAD di Studio:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <strong>Setback Tepi (30–50 cm):</strong> Batas aman dari tepi talang genteng untuk meredam terpaan angin (*wind uplift*) dan jalur pijakan teknisi.
              </div>
              <div>
                <strong>Celah Modul (2–3 cm):</strong> Ruang pasang klem aluminium (*mid-clamp*) dan ruang toleransi pemuaian panas termal.
              </div>
              <div>
                <strong>Sudut Kemiringan (Tilt 10°–22°):</strong> Memastikan air hujan mengalir lancar membersihkan debu secara alami (*self-cleaning effect*).
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEKSI 4: FORMULA FINANSIAL & REGULASI PERMEN ESDM
            ========================================================= */}
        <section
          id="financial"
          className="rounded-[32px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.04),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-10 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">calculate</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 04 • Metodologi Finansial &amp; Regulasi
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title">
                Permen ESDM 2/2024, Tarif PLN, &amp; Rumus ROI
              </h2>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              Seluruh proyeksi rupiah dihitung secara matematis berdasarkan <strong>Katalog Tarif Resmi PT PLN (Persero)</strong> dan
              kebijakan <strong>Peraturan Menteri ESDM No. 2 Tahun 2024</strong>:
            </p>

            {/* Formula Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 shadow-xs">
                <span className="text-amber-400 font-bold block text-[11px] font-sans">1. ESTIMASI PRODUKSI LISTRIK TAHUNAN</span>
                <p className="text-amber-200">
                  E_tahunan (kWh) = P_kWp × PSH × 365 × PR
                </p>
                <p className="text-slate-400 text-[10px] font-sans">
                  Contoh: 8.3 kWp × 4.25 jam × 365 hari × 0.80 = ~10.300 kWh per tahun.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 shadow-xs">
                <span className="text-amber-400 font-bold block text-[11px] font-sans">2. WAKTU BALIK MODAL (PAYBACK / BEP)</span>
                <p className="text-amber-200">
                  BEP (Tahun) = Total Biaya CAPEX (Rp) / Hemat Tahunan (Rp)
                </p>
                <p className="text-slate-400 text-[10px] font-sans">
                  Total CAPEX mencakup paket turnkey (modul, inverter, racking, instalasi, dan sertifikasi).
                </p>
              </div>
            </div>

            {/* Regulasi Permen ESDM 2/2024 */}
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100 space-y-2.5">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">gavel</span>
                <span>Penerapan Regulasi Permen ESDM No. 2 Tahun 2024:</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                <li>
                  <strong>Sistem Kuota Transmisi:</strong> Penghapusan batasan kaku kapasitas 100% daya tersambung. Pelanggan dapat memasang kapasitas optimal sesuai ketersediaan kuota wilayah transmisi PLN.
                </li>
                <li>
                  <strong>Fokus Konsumsi Mandiri (Self-Consumption):</strong> Skema ekspor-impor (net-metering) ditiadakan. Oleh karena itu, algoritma Studio SunSight menyusun kapasitas modul yang pas diserap sendiri oleh beban listrik rumah Anda di siang hari untuk memaksimalkan efisiensi tanpa energi terbuang.
                </li>
                <li>
                  <strong>Tanpa Biaya Beban Tambahan:</strong> Pelanggan Rumah Tangga (golongan tarif R) dibebaskan dari biaya kapasitas (*capacity charge*) bulanan.
                </li>
              </ul>
            </div>

            {/* Tarif PLN Resmi */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <span className="font-bold text-slate-900 block mb-2 font-title">Katalog Tarif Listrik PLN yang Digunakan:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-code-metric">
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">R-1 / 900 VA (RTM)</span>
                  <span className="font-bold text-slate-900">Rp 1.352,00 / kWh</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">R-1 / 1.300 &amp; 2.200 VA</span>
                  <span className="font-bold text-slate-900">Rp 1.444,70 / kWh</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">R-2 / 3.500 – 5.500 VA</span>
                  <span className="font-bold text-slate-900">Rp 1.699,53 / kWh</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">R-3 / &ge; 6.600 VA</span>
                  <span className="font-bold text-slate-900">Rp 1.699,53 / kWh</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEKSI 5: STANDAR REDUKSI EMISI & DAMPAK LINGKUNGAN
            ========================================================= */}
        <section
          id="emissions"
          className="rounded-[32px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.04),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-10 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">forest</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block font-title">
                Pilar 05 • Dampak Ekologis
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title">
                Metrik Karbon &amp; Ekuivalensi Pohon Hutan Tropis
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-2">
              <span className="text-xs font-bold text-emerald-950 block">Faktor Emisi Grid Jamali (Kementerian ESDM)</span>
              <div className="text-2xl font-extrabold text-emerald-900 font-code-metric">
                0.80 kg CO₂ <span className="text-xs font-normal text-slate-600">/ kWh</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Berdasarkan laporan faktor emisi gas rumah kaca jaringan Jawa-Madura-Bali oleh Ditjen Ketenagalistrikan Kementerian ESDM.
                Setiap 1 kWh listrik yang dihasilkan oleh atap surya Anda langsung mencegah emisi pembakaran batu bara di pembangkit termal.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-2">
              <span className="text-xs font-bold text-emerald-950 block">Standar Ekuivalensi Pohon Tropis</span>
              <div className="text-2xl font-extrabold text-emerald-900 font-code-metric">
                21.77 kg CO₂ <span className="text-xs font-normal text-slate-600">/ pohon / tahun</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Standar rata-rata daya serap pohon hutan tropis dewasa. Setiap reduksi 1 ton CO₂ (~1.000 kg)
                diterjemahkan setara dengan menanam dan merawat sekitar 46 batang pohon dewasa setiap tahunnya.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEKSI 6: GLOSARIUM SURYA UNTUK PENGGUNA AWAM
            ========================================================= */}
        <section
          id="glossary"
          className="rounded-[32px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.04),0_2px_12px_rgba(245,158,11,0.06)] p-6 sm:p-10 space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">menu_book</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 06 • Edukasi Konsumen
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title">
                Glosarium Istilah Energi Surya
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-600">
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">kWp (Kilowatt-peak):</strong>
              <p>Ukuran kapasitas maksimal daya yang dapat dihasilkan panel surya pada kondisi penyinaran ideal laboratorium (1.000 W/m²).</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">kWh (Kilowatt-hour):</strong>
              <p>Jumlah energi listrik nyata yang dihasilkan atau dikonsumsi dalam satuan jam. Satuan ini yang tercantum pada tagihan bulanan PLN Anda.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">Tilt &amp; Azimuth:</strong>
              <p><strong>Tilt</strong> adalah sudut kemiringan atap genteng terhadap bidang datar. <strong>Azimuth</strong> adalah arah mata angin hadap bidang atap (Utara 0°, Timur 90°, Selatan 180°, Barat 270°).</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">Inverter:</strong>
              <p>Otak sistem kelistrikan surya yang mengubah arus searah (DC) dari modul surya menjadi arus bolak-balik (AC) yang aman untuk alat elektronik rumah tangga.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">BEP (Break-Even Point):</strong>
              <p>Waktu balik modal, yaitu jumlah tahun yang dibutuhkan agar total penghematan tagihan listrik Anda menyamai seluruh biaya awal pemasangan PLTS.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200/70 space-y-1">
              <strong className="text-slate-900 text-xs block font-title">Self-Consumption:</strong>
              <p>Proporsi listrik surya yang langsung diserap dan digunakan oleh kulkas, AC, lampu, dan peralatan rumah saat matahari bersinar di siang hari.</p>
            </div>
          </div>
        </section>

        {/* Bottom Mascot Card: Sunny Memberi Ringkasan Ramah */}
        <div className="rounded-[32px] bg-gradient-to-r from-amber-100/90 via-amber-200/80 to-amber-100/90 border border-amber-300/80 p-6 sm:p-9 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_16px_40px_rgba(245,158,11,0.14)]">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="hidden sm:block shrink-0">
              <SunnyMascot size={74} expression="happy" animated={true} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-950 font-title">
                Sains yang terbuka untuk keputusan yang tepat.
              </h3>
              <p className="text-xs sm:text-sm text-amber-900/80 mt-1 max-w-xl">
                Dokumentasi ini terus diperbarui seiring diterbitkannya penyesuaian tarif listrik PLN dan regulasi ketenagalistrikan terbaru dari Kementerian ESDM RI.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-auto h-11 px-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-title text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs shrink-0 cursor-pointer"
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
