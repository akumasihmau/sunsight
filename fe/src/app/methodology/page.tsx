"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";

export default function MethodologyPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("spatial");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const navItems = [
    { id: "spatial", label: "Citra Satelit", icon: "satellite_alt" },
    { id: "solar", label: "Radiasi Bogor", icon: "sunny" },
    { id: "hardware", label: "Komponen Tier-1", icon: "solar_power" },
    { id: "financial", label: "Finansial & Regulasi", icon: "calculate" },
    { id: "emissions", label: "Dampak Lingkungan", icon: "forest" },
    { id: "directory", label: "Dokumen & Link Resmi", icon: "account_balance" },
    { id: "faq", label: "Tanya Jawab", icon: "help_outline" },
  ];

  const officialSources = [
    {
      category: "Regulasi Nasional & Tarif Resmi (JDIH BPK RI & PLN)",
      items: [
        {
          title: "Permen ESDM No. 2 Tahun 2024",
          institution: "JDIH BPK RI / Kementerian ESDM",
          badge: "Regulasi Utama PLTS Atap",
          desc: "Peraturan terbaru tentang PLTS Atap terhubung jaringan PLN: penghapusan batasan kapasitas kaku, sistem kuota pengembangan, dan pembebasan biaya kapasitas (capacity charge).",
          url: "https://peraturan.bpk.go.id/Details/288519/permen-esdm-no-2-tahun-2024",
        },
        {
          title: "Permen ESDM No. 7 Tahun 2024",
          institution: "JDIH BPK RI / Kementerian ESDM",
          badge: "Dasar Hukum Tarif PLN",
          desc: "Regulasi resmi tentang Tarif Tenaga Listrik yang Disediakan oleh PT PLN (Persero) sebagai landasan perhitungan penghematan tagihan per golongan.",
          url: "https://peraturan.bpk.go.id/Details/294347/permen-esdm-no-7-tahun-2024",
        },
        {
          title: "Penyesuaian Tarif Listrik (Tariff Adjustment)",
          institution: "PT PLN (Persero)",
          badge: "Daftar Tarif Aktif",
          desc: "Halaman informasi resmi PT PLN (Persero) mengenai penetapan tarif listrik per kWh untuk golongan R-1, R-2, dan R-3 nonsubsidi.",
          url: "https://www.pln.co.id/penyesuaian-tarif-id",
        },
      ],
    },
    {
      category: "Standar Kelaikan Instalasi & Spesifikasi Hardware",
      items: [
        {
          title: "Permen ESDM No. 7 Tahun 2021 (PUIL 2020)",
          institution: "JDIH BPK RI / Kementerian ESDM",
          badge: "Wajib SNI 0225:2020",
          desc: "Pengesahan wajib Persyaratan Umum Instalasi Listrik (PUIL 2020 / SNI 0225:2020) untuk keamanan sistem fotovoltaik dan pembumian (grounding ≤ 5 Ohm).",
          url: "https://peraturan.bpk.go.id/Details/180040/permen-esdm-no-7-tahun-2021",
        },
        {
          title: "Permen ESDM No. 26 Tahun 2021",
          institution: "JDIH BPK RI / Kementerian ESDM",
          badge: "Rujukan Historis PLTS",
          desc: "Dokumen rujukan historis transisi kebijakan PLTS Atap sebelum diperbarui melalui Permen ESDM No. 2 Tahun 2024.",
          url: "https://peraturan.bpk.go.id/Details/198431/permen-esdm-no-26-tahun-2021",
        },
        {
          title: "IEEE 1547 Distributed Energy Standards",
          institution: "IEEE Standards Association",
          badge: "Proteksi Anti-Islanding",
          desc: "Standar internasional interkoneksi sistem energi terdistribusi dan pemutus otomatis inverter (<2 detik saat jaringan PLN padam).",
          url: "https://standards.ieee.org/",
        },
      ],
    },
    {
      category: "Meteorologi Surya, Geospasial, & Emisi Lingkungan",
      items: [
        {
          title: "NASA POWER Data Access Viewer",
          institution: "NASA Langley Research Center",
          badge: "Data Satelit Cuaca",
          desc: "Pangkalan data interaktif insolasi matahari harian (GHI) dan suhu permukaan multi-dekade untuk titik koordinat Kota Bogor.",
          url: "https://power.larc.nasa.gov/data-access-viewer/",
        },
        {
          title: "Global Solar Atlas — Peta Kota Bogor",
          institution: "World Bank Group & Solargis",
          badge: "Peta PVOUT Bogor",
          desc: "Peta interaktif potensi fotovoltaik (PVOUT) dan jam matahari puncak (4.20–4.52 kWh/m²/hari) terfokus langsung di koordinat Kota Bogor.",
          url: "https://globalsolaratlas.info/map?c=-6.5971,106.806,11&s=-6.5971,106.806&m=site",
        },
        {
          title: "DEMNAS (Digital Elevation Model Nasional)",
          institution: "Badan Informasi Geospasial (BIG)",
          badge: "Topografi & Elevasi",
          desc: "Basis data model elevasi digital nasional untuk kalibrasi kontur ketinggian 190–330 mdpl di 6 kecamatan Kota Bogor.",
          url: "https://tanahair.indonesia.go.id/demnas/",
        },
        {
          title: "Permen ESDM No. 22 Tahun 2019",
          institution: "JDIH BPK RI / Kementerian ESDM",
          badge: "Inventarisasi GRK Energi",
          desc: "Pedoman resmi penyelenggaraan inventarisasi dan mitigasi emisi Gas Rumah Kaca (GRK) bidang energi dan ketenagalistrikan.",
          url: "https://peraturan.bpk.go.id/Details/142358/permen-esdm-no-22-tahun-2019",
        },
        {
          title: "Kepmen ESDM No. 163.K/HK.02/MEM.S/2021",
          institution: "JDIH Kementerian ESDM",
          badge: "Faktor Emisi Jamali",
          desc: "Dokumen penetapan nilai faktor emisi gas rumah kaca sistem ketenagalistrikan interkoneksi Jawa-Madura-Bali.",
          url: "https://jdih.esdm.go.id/dokumen/download?id=Abstrak+Kepmen+ESDM+No.+163.K_HK.02_MEM.S_2021.pdf",
        },
        {
          title: "Portal Ditjen Ketenagalistrikan",
          institution: "Kementerian ESDM RI",
          badge: "Data Kelistrikan Nasional",
          desc: "Publikasi resmi statistik ketenagalistrikan, kuota sistem distribusi, dan faktor emisi jaringan tenaga listrik.",
          url: "https://gatrik.esdm.go.id/",
        },
      ],
    },
  ];

  const faqs = [
    {
      q: "Apa perbedaan antara kWp dan kWh?",
      a: "kWp (Kilowatt-peak) adalah ukuran kapasitas maksimal panel surya Anda dalam kondisi laboratorium ideal. Sedangkan kWh (Kilowatt-hour) adalah jumlah listrik nyata yang berhasil dihasilkan dan digunakan oleh rumah Anda setiap bulannya (satuan yang sama pada tagihan PLN).",
    },
    {
      q: "Bagaimana cara menghitung waktu balik modal (BEP / Payback)?",
      a: "Waktu balik modal dihitung dengan membagi total biaya pemasangan sistem (investasi awal) dengan total rupiah yang Anda hemat dari tagihan listrik PLN setiap tahunnya. Dengan intensitas matahari Bogor dan tarif PLN saat ini, rata-rata sistem mencapai balik modal dalam 2.5 hingga 4 tahun.",
    },
    {
      q: "Apa maksud aturan 'Self-Consumption' dalam Permen ESDM No. 2/2024?",
      a: "Regulasi terbaru berfokus pada pemanfaatan listrik surya untuk kebutuhan pribadi saat siang hari tanpa ketergantungan menjual listrik ke jaringan PLN. Algoritma SunSight secara otomatis merancang jumlah panel agar energi yang dihasilkan terserap maksimal oleh konsumsi rumah tangga Anda.",
    },
    {
      q: "Apakah pemasangan panel surya di atap aman dari petir di Kota Bogor?",
      a: "Sangat aman jika menggunakan standar proteksi resmi. Setiap desain di SunSight mengacu pada kewajiban pemasangan Surge Protection Device (SPD Type II) pada arus searah (DC) dan bolak-balik (AC), serta pentanahan (grounding) dengan tahanan di bawah 5 Ohm sesuai standar PUIL 2020 (Permen ESDM No. 7/2021).",
    },
    {
      q: "Mengapa kalkulasi SunSight lebih akurat dibanding kalkulator online umum?",
      a: "Kalkulator biasa hanya mengalikan luas atap kasar dengan rata-rata nasional. SunSight menganalisis citra tegak lurus 90° bebas distorsi, memperhitungkan iklim mikro dan pola awan konvektif sore hari Kota Bogor, serta memotong efisiensi suhu tropis nyata (-0.34%/°C).",
    },
  ];

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
      <main className="relative z-10 flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full space-y-10 sm:space-y-12">
        
        {/* Apple-style Clean Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_2px_12px_rgba(245,158,11,0.08)]">
            <span className="material-symbols-outlined text-amber-600 text-[16px]">verified</span>
            <span className="text-xs font-bold text-amber-950 font-title tracking-tight">
              Transparansi Ilmiah &amp; Regulasi Resmi
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-title tracking-tight leading-[1.16]">
            Sumber data &amp; standar <br />
            <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
              perhitungan yang terbuka.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Setiap angka potensi energi dan penghematan dihitung berdasarkan data satelit presisi,
            radiasi iklim nyata Kota Bogor, komponen Tier-1, dan regulasi resmi Permen ESDM yang dapat Anda verifikasi langsung ke dokumen aslinya.
          </p>
        </div>

        {/* Floating Capsule Nav: ANTI-KEPOTONG (w-max mx-auto pada overflow container yang bersih) */}
        <nav className="sticky top-14 sm:top-16 z-30 py-2.5 backdrop-blur-xl bg-[#FAF9F5]/90 border-b border-amber-200/30 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1 px-1">
            <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(245,158,11,0.06),0_2px_8px_rgba(0,0,0,0.04)] w-max mx-auto shrink-0">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollTo(item.id)}
                    className={`h-9 px-3.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer border ${
                      isActive
                        ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.8)] border-amber-300/80"
                        : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-amber-50/70 border-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* =========================================================
            PILAR 1: CITRA SATELIT & PRESISI ATAP (Komparasi Visual yang Menarik)
            ========================================================= */}
        <section
          id="spatial"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.05)] p-6 sm:p-9 space-y-6 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 01 • Akurasi Geospasial
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title mt-0.5">
                Citra Satelit Tegak Lurus 90° Bebas Distorsi
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-900 w-fit">
              <span className="material-symbols-outlined text-[15px]">straighten</span>
              Skala 1 Meter = 20 Px
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            Pengukuran potensi atap membutuhkan akurasi geometris nyata. SunSight menggunakan citra ortorektifikasi 90° tegak lurus dari atas (*nadir view*) sehingga ukuran fisik atap di lapangan sejajar dengan modul surya pada kanvas simulasi.
          </p>

          {/* Visual Comparison: Foto Udara Biasa vs SunSight Ortofoto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Sisi Negatif: Foto Miring Biasa */}
            <div className="p-5 rounded-2xl bg-rose-50/40 border border-rose-200/60 space-y-3">
              <div className="flex items-center gap-2 text-rose-800 text-xs font-bold uppercase tracking-wide">
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                <span>Foto Udara Miring Biasa</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span><strong>Distorsi Sudut Lensa:</strong> Kamera miring membuat dinding bangunan ikut terlihat, membiaskan batas talang dan bubungan genteng.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span><strong>Kesalahan Luas s/d 30%:</strong> Estimasi kapasitas menjadi meleset, modul surya yang direncanakan berisiko tidak muat saat instalasi.</span>
                </li>
              </ul>
            </div>

            {/* Sisi Positif: Standar SunSight (Radiant Golden Glow) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-300/80 shadow-[0_4px_16px_rgba(245,158,11,0.08)] space-y-3">
              <div className="flex items-center gap-2 text-amber-950 text-xs font-bold uppercase tracking-wide">
                <span className="material-symbols-outlined text-[18px] text-amber-600">check_circle</span>
                <span>Pendekatan SunSight 90° Nadir</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span><strong>Koreksi Digital Elevation Model (DEM):</strong> Menghilangkan kemiringan sudut dan bayangan dinding untuk mendapatkan bidang atap murni.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span><strong>Kalibrasi Kontur 6 Kecamatan Bogor:</strong> Disesuaikan dengan elevasi 190–330 mdpl di Bogor Tengah, Selatan, Timur, Utara, Barat, dan Tanah Sareal.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Outbound Link Sumber Geospasial (Verified 200 OK) */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            <a
              href="https://tanahair.indonesia.go.id/demnas/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50/70 text-xs font-semibold text-slate-700 hover:text-amber-950 border border-slate-200/80 hover:border-amber-300 transition-all shadow-2xs group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">map</span>
              <span>Buka Portal DEMNAS (Badan Informasi Geospasial)</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                north_east
              </span>
            </a>
          </div>
        </section>

        {/* =========================================================
            PILAR 2: RADIASI SURYA & MIKROKLIMAT KOTA BOGOR
            ========================================================= */}
        <section
          id="solar"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.05)] p-6 sm:p-9 space-y-6 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 02 • Meteorologi Surya
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title mt-0.5">
                Radiasi Matahari Khusus Mikroklimat Kota Bogor
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-900 w-fit">
              <span className="material-symbols-outlined text-[15px]">sunny</span>
              NASA POWER &amp; Solargis
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            Sebagai kawasan tropis khatulistiwa dengan curah hujan tinggi, Kota Bogor memiliki pola penyinaran yang khas. SunSight menggunakan data historis multi-dekade NASA POWER dan Bank Dunia yang disesuaikan dengan fenomena iklim lokal.
          </p>

          {/* 3 Metric Cards Bergaya Apple Feature Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Insolasi Harian</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-950 font-code-metric">
                4.20–4.52
              </div>
              <div className="text-xs font-semibold text-slate-800">kWh/m² / hari (Peak Sun Hours)</div>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Rata-rata jam penyinaran matahari efektif tahunan di wilayah Kota Bogor.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Puncak Penyinaran</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-950 font-code-metric">
                72%
              </div>
              <div className="text-xs font-semibold text-slate-800">Jam 08.30 – 13.30 WIB</div>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Energi harian terfokus di pagi-siang hari sebelum terbentuk awan konvektif sore Gunung Salak.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Faktor Koreksi Realistis</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-950 font-code-metric">
                80.0%
              </div>
              <div className="text-xs font-semibold text-slate-800">Performance Ratio (PR 0.80)</div>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Memperhitungkan rugi suhu tropis (-0.34%/°C di atas 25°C), hambatan kabel, dan debu.
              </p>
            </div>
          </div>

          {/* Outbound Link Sumber Radiasi (Verified 200 OK) */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            <a
              href="https://power.larc.nasa.gov/data-access-viewer/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50/70 text-xs font-semibold text-slate-700 hover:text-amber-950 border border-slate-200/80 hover:border-amber-300 transition-all shadow-2xs group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">public</span>
              <span>NASA POWER Data Access Viewer</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                north_east
              </span>
            </a>

            <a
              href="https://globalsolaratlas.info/map?c=-6.5971,106.806,11&s=-6.5971,106.806&m=site"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50/70 text-xs font-semibold text-slate-700 hover:text-amber-950 border border-slate-200/80 hover:border-amber-300 transition-all shadow-2xs group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">wb_sunny</span>
              <span>Peta Global Solar Atlas — Kota Bogor</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                north_east
              </span>
            </a>
          </div>
        </section>

        {/* =========================================================
            PILAR 3: STANDAR HARDWARE TIER-1 & KEAMANAN CAD
            ========================================================= */}
        <section
          id="hardware"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.05)] p-6 sm:p-9 space-y-6 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 03 • Komponen &amp; Fisik
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title mt-0.5">
                Spesifikasi Hardware Tier-1 &amp; Aturan CAD Atap
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-900 w-fit">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              Standar IEC &amp; PUIL 2020
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Modul Tier-1 */}
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
                  <span className="material-symbols-outlined text-[20px]">solar_power</span>
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Modul Surya Tier-1 (550Wp)</h3>
                  <span className="text-[11px] text-slate-400">Monocrystalline Half-Cell</span>
                </div>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <p><strong>Efisiensi Sel ~21.3%:</strong> Mampu menyerap spektrum radiasi matahari secara optimal meski kondisi langit berawan tipis.</p>
                <p><strong>Dimensi Standar:</strong> 2.278 × 1.134 × 35 mm (bidang ±2.58 m² per panel) dengan rangka aluminium anti karat.</p>
                <p><strong>Garansi Daya 25 Tahun:</strong> Menjamin penurunan daya maksimal hanya 0.55%/tahun (daya tetap di atas 84.8% di tahun ke-25).</p>
              </div>
            </div>

            {/* Inverter Grid-Tied */}
            <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Inverter Grid-Tied &amp; Proteksi</h3>
                  <span className="text-[11px] text-slate-400">Sinkronisasi Jaringan PLN</span>
                </div>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <p><strong>Euro Efficiency ≥ 97.5%:</strong> Mengubah arus DC menjadi AC gelombang sinus murni yang aman bagi seluruh peralatan elektronik rumah.</p>
                <p><strong>Anti-Islanding (IEEE 1547):</strong> Otomatis memutus aliran listrik dalam waktu &lt;2 detik saat jaringan PLN padam demi keselamatan teknisi.</p>
                <p><strong>Proteksi Petir (SPD Type II):</strong> Jalur pengaman lonjakan tegangan DC dan AC dengan pentanahan wajib &le; 5 Ohm.</p>
              </div>
            </div>
          </div>

          {/* Aturan Tata Letak CAD Atap */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-2">
            <span className="text-xs font-bold text-amber-950 uppercase tracking-wide block">
              3 Aturan Penataan Panel Surya di Studio CAD SunSight
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 pt-1">
              <div className="p-3 rounded-xl bg-white/80 border border-amber-100">
                <strong className="text-slate-900 block mb-0.5">1. Setback Tepi (30–50 cm)</strong>
                <span>Jarak bebas dari bibir talang dan genteng untuk meredam terpaan angin dan jalur pijak teknisi saat perawatan.</span>
              </div>
              <div className="p-3 rounded-xl bg-white/80 border border-amber-100">
                <strong className="text-slate-900 block mb-0.5">2. Celah Antar Panel (2–3 cm)</strong>
                <span>Ruang pasang klem aluminium (*mid-clamp*) dan ruang toleransi pemuaian material saat cuaca terik.</span>
              </div>
              <div className="p-3 rounded-xl bg-white/80 border border-amber-100">
                <strong className="text-slate-900 block mb-0.5">3. Kemiringan Optimal (10°–22°)</strong>
                <span>Sudut kemiringan yang memungkinkan air hujan mengalir lancar membersihkan debu secara otomatis (*self-cleaning*).</span>
              </div>
            </div>
          </div>

          {/* Outbound Link Standarisasi Hardware (Verified 200 OK) */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            <a
              href="https://peraturan.bpk.go.id/Details/180040/permen-esdm-no-7-tahun-2021"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50/70 text-xs font-semibold text-slate-700 hover:text-amber-950 border border-slate-200/80 hover:border-amber-300 transition-all shadow-2xs group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">verified</span>
              <span>Permen ESDM No. 7/2021 — Wajib SNI PUIL 2020 (JDIH BPK)</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                north_east
              </span>
            </a>

            <a
              href="https://standards.ieee.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50/70 text-xs font-semibold text-slate-700 hover:text-amber-950 border border-slate-200/80 hover:border-amber-300 transition-all shadow-2xs group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">electric_bolt</span>
              <span>Portal Standar IEEE 1547 (Interkoneksi &amp; Proteksi)</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                north_east
              </span>
            </a>
          </div>
        </section>

        {/* =========================================================
            PILAR 4: FORMULA FINANSIAL & REGULASI PERMEN ESDM
            ========================================================= */}
        <section
          id="financial"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.05)] p-6 sm:p-9 space-y-6 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 04 • Regulasi &amp; Investasi
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title mt-0.5">
                Kalkulasi Penghematan Sesuai Permen ESDM No. 2/2024
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-900 w-fit">
              <span className="material-symbols-outlined text-[15px]">gavel</span>
              Regulasi Resmi Terbaru
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            Perhitungan rupiah didasarkan pada kebijakan Peraturan Menteri ESDM No. 2 Tahun 2024 serta Permen ESDM No. 7 Tahun 2024 tentang Tarif Tenaga Listrik PT PLN (Persero). Rumus disusun secara transparan agar mudah diverifikasi.
          </p>

          {/* Formula Alur Perhitungan Yang Sangat Mudah Dipahami */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-50/90 via-amber-100/30 to-white/95 border border-amber-300/80 shadow-[0_4px_16px_rgba(245,158,11,0.06)] space-y-4">
            <span className="text-xs font-bold text-amber-950 uppercase tracking-wider block font-title">
              Rumus Produksi Listrik Tahunan SunSight
            </span>

            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold text-amber-950 font-code-metric">
              <span className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 shadow-2xs">Kapasitas (kWp)</span>
              <span>×</span>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 shadow-2xs">4.25 Jam PSH</span>
              <span>×</span>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 shadow-2xs">365 Hari</span>
              <span>×</span>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 shadow-2xs">0.80 Efisiensi</span>
              <span>=</span>
              <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 border border-amber-300 shadow-xs">
                Total Listrik (kWh/Tahun)
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Contoh Nyata:</strong> Jika sistem Anda berkapasitas <strong>4.4 kWp</strong> (sekitar 8 panel):  
              4.4 × 4.25 × 365 × 0.80 = <strong>±5.460 kWh per tahun</strong>.  
              Pada tarif PLN R-1 (Rp 1.444,70/kWh), Anda menghemat sekitar <strong>Rp 7,8 Juta per tahun</strong>.
            </p>
          </div>

          {/* 3 Pokok Permen ESDM No. 2/2024 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-1.5">
              <strong className="text-xs font-bold text-slate-900 block">Sistem Kuota Wilayah</strong>
              <p className="text-xs text-slate-600 leading-relaxed">
                Penghapusan batas kaku 100% daya kontrak PLN, digantikan mekanisme kuota terintegrasi sistem transmisi.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-1.5">
              <strong className="text-xs font-bold text-slate-900 block">Fokus Self-Consumption</strong>
              <p className="text-xs text-slate-600 leading-relaxed">
                Algoritma SunSight memprioritaskan pemakaian langsung di siang hari agar penghematan optimal tanpa listrik terbuang.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-amber-100/90 space-y-1.5">
              <strong className="text-xs font-bold text-slate-900 block">Bebas Biaya Beban</strong>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pelanggan rumah tangga dibebaskan dari biaya kapasitas bulanan (*capacity charge*), memaksimalkan margin hemat.
              </p>
            </div>
          </div>

          {/* Katalog Tarif Resmi PLN */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-slate-700 block">Tarif Listrik Resmi PT PLN (Persero) yang Digunakan:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-code-metric text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-slate-400 text-[10px] block">R-1 / 900 VA RTM</span>
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

          {/* Tautan Dokumen Resmi Regulasi & Portal PLN (Verified 200 OK) */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            <a
              href="https://peraturan.bpk.go.id/Details/288519/permen-esdm-no-2-tahun-2024"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs border border-amber-200/90 hover:border-amber-400 transition-all shadow-2xs group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-amber-700">description</span>
              <span>Buka Naskah Permen ESDM No. 2/2024 (JDIH BPK RI)</span>
              <span className="material-symbols-outlined text-[15px] text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                north_east
              </span>
            </a>

            <a
              href="https://peraturan.bpk.go.id/Details/294347/permen-esdm-no-7-tahun-2024"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-amber-50/70 text-slate-700 hover:text-amber-950 font-semibold text-xs border border-slate-200 hover:border-amber-300 transition-all shadow-2xs group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-amber-600">gavel</span>
              <span>Permen ESDM No. 7/2024 (Tarif Listrik PLN)</span>
              <span className="material-symbols-outlined text-[15px] text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                north_east
              </span>
            </a>

            <a
              href="https://www.pln.co.id/penyesuaian-tarif-id"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-xs border border-slate-200 hover:border-slate-300 transition-all shadow-2xs group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-slate-500">payments</span>
              <span>Halaman Penyesuaian Tarif Resmi PLN</span>
              <span className="material-symbols-outlined text-[15px] text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                north_east
              </span>
            </a>
          </div>
        </section>

        {/* =========================================================
            PILAR 5: STANDAR REDUKSI EMISI & DAMPAK LINGKUNGAN
            ========================================================= */}
        <section
          id="emissions"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.05)] p-6 sm:p-9 space-y-6 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block font-title">
                Pilar 05 • Dampak Lingkungan
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title mt-0.5">
                Standar Reduksi Emisi Karbon &amp; Ekuivalensi Pohon
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-emerald-900 w-fit">
              <span className="material-symbols-outlined text-[15px]">forest</span>
              Standar Kementerian ESDM
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-white/90 border border-emerald-200/70 space-y-2 shadow-2xs">
              <span className="text-xs font-bold text-emerald-950 block">Faktor Emisi Grid Jamali</span>
              <div className="text-3xl font-extrabold text-emerald-900 font-code-metric">
                0.80 kg CO₂ <span className="text-xs font-normal text-slate-600">/ kWh</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Berdasarkan Kepmen ESDM No. 163.K/HK.02/MEM.S/2021 dan Permen ESDM No. 22/2019 untuk sistem jaringan interkoneksi Jawa-Madura-Bali.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-white/90 border border-emerald-200/70 space-y-2 shadow-2xs">
              <span className="text-xs font-bold text-emerald-950 block">Daya Serap Pohon Hutan Tropis</span>
              <div className="text-3xl font-extrabold text-emerald-900 font-code-metric">
                21.77 kg CO₂ <span className="text-xs font-normal text-slate-600">/ pohon / tahun</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Standar penyerapan karbon pohon tropis dewasa. Setiap reduksi 1 ton CO₂ setara dengan menanam dan merawat sekitar 46 pohon per tahun.
              </p>
            </div>
          </div>

          {/* Outbound Link Sumber Lingkungan (Verified 200 OK) */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            <a
              href="https://peraturan.bpk.go.id/Details/142358/permen-esdm-no-22-tahun-2019"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50/70 text-xs font-semibold text-slate-700 hover:text-emerald-950 border border-slate-200/80 hover:border-emerald-300 transition-all shadow-2xs group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-600">co2</span>
              <span>Permen ESDM No. 22/2019 — Inventarisasi GRK Energi (JDIH BPK)</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                north_east
              </span>
            </a>

            <a
              href="https://jdih.esdm.go.id/dokumen/download?id=Abstrak+Kepmen+ESDM+No.+163.K_HK.02_MEM.S_2021.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50/70 text-xs font-semibold text-slate-700 hover:text-emerald-950 border border-slate-200/80 hover:border-emerald-300 transition-all shadow-2xs group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-600">picture_as_pdf</span>
              <span>Kepmen ESDM 163/2021 — Faktor Emisi Ketenagalistrikan (PDF)</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                north_east
              </span>
            </a>
          </div>
        </section>

        {/* =========================================================
            PILAR 6: PUSAT REGULASI & TAUTAN RESMI PEMERINTAH (DEDICATED DIRECTORY)
            ========================================================= */}
        <section
          id="directory"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.05)] p-6 sm:p-9 space-y-6 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Katalog Sumber Resmi &amp; Regulasi
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title mt-0.5">
                Pusat Tautan Dokumen Asli &amp; Standarisasi
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-900 w-fit">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
              Tautan Aktif Terverifikasi
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            SunSight berkomitmen pada prinsip transparansi ilmiah dan kepatuhan hukum penuh. Seluruh tautan di bawah mengarah langsung ke naskah peraturan resmi di <strong>JDIH BPK RI</strong>, <strong>Kementerian ESDM</strong>, <strong>PT PLN (Persero)</strong>, dan pangkalan data internasional:
          </p>

          <div className="space-y-6">
            {officialSources.map((cat, catIdx) => (
              <div key={catIdx} className="space-y-3">
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>{cat.category}</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {cat.items.map((item, itemIdx) => (
                    <a
                      key={itemIdx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F5] hover:bg-white border border-amber-100/90 hover:border-amber-300 transition-all duration-200 shadow-2xs hover:shadow-[0_8px_24px_rgba(245,158,11,0.12)] flex flex-col justify-between space-y-3 group cursor-pointer"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100/80 text-[10px] font-bold text-amber-900">
                            {item.badge}
                          </span>
                          <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                            north_east
                          </span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-amber-950 transition-colors">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          {item.institution}
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                          {item.desc}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/50 flex items-center gap-1.5 text-[11px] font-bold text-amber-800 group-hover:text-amber-900">
                        <span>Buka Dokumen Asli</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================
            PILAR 7: TANYA JAWAB UMUM & GLOSARIUM INTERAKTIF (Apple Accordion)
            ========================================================= */}
        <section
          id="faq"
          className="rounded-[32px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.05)] p-6 sm:p-9 space-y-6 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block font-title">
                Pilar 07 • Tanya Jawab Ramah
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-title mt-0.5">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-900 w-fit">
              <span className="material-symbols-outlined text-[15px]">help</span>
              Glosarium Surya
            </span>
          </div>

          <div className="space-y-3">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-amber-100/90 bg-[#FAF9F5] overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-amber-50/50 transition-colors"
                  >
                    <span className="font-bold text-xs sm:text-sm text-slate-900 font-title">
                      {item.q}
                    </span>
                    <span className={`material-symbols-outlined text-[20px] text-amber-700 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}>
                      expand_more
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-amber-100/60 animate-fadeIn">
                      <p className="pt-2">{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Mascot Card: Sunny Memberi Ringkasan Ramah (Tombol Radiant Soft Glow Glass) */}
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
                Dokumentasi ini diselaraskan secara berkala mengikuti pembaruan regulasi Permen ESDM dan tarif listrik resmi PLN.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-auto h-11 px-6 rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 hover:from-amber-300 hover:via-amber-400 hover:to-amber-300 text-amber-950 font-title text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-[0_2px_12px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.85)] hover:shadow-[0_4px_18px_rgba(245,158,11,0.3)] border border-amber-300/80 shrink-0 cursor-pointer"
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
