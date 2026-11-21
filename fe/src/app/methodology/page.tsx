"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";

const NAV_ITEMS = [
  { id: "spatial", label: "Citra & AI", icon: "satellite_alt" },
  { id: "solar", label: "Cuaca & Radiasi", icon: "sunny" },
  { id: "hardware", label: "Perangkat & CAD", icon: "solar_power" },
  { id: "financial", label: "Rumus & Tarif", icon: "calculate" },
  { id: "emissions", label: "Emisi ISO 14064", icon: "forest" },
  { id: "directory", label: "Referensi Resmi", icon: "account_balance" },
  { id: "faq", label: "Tanya Jawab", icon: "help_outline" },
] as const;

const OFFICIAL_SOURCES = [
  {
    category: "Standar Internasional (ISO · IEC · IEEE)",
    items: [
      {
        title: "ISO 9060 & IEC 61724-1",
        institution: "ISO / International Electrotechnical Commission",
        badge: "Radiasi & PR",
        desc: "Klasifikasi pengukuran radiasi surya (GHI) dan evaluasi Performance Ratio sistem PV.",
        url: "https://www.iso.org/standard/67464.html",
      },
      {
        title: "ISO 14064-1 & ISO 19157",
        institution: "International Organization for Standardization",
        badge: "GRK & Geospasial",
        desc: "Kuantifikasi reduksi emisi gas rumah kaca dan kualitas akurasi data poligon spasial.",
        url: "https://www.iso.org/standard/66453.html",
      },
      {
        title: "IEEE 1547 & IEC 61215",
        institution: "IEEE / IEC Standards",
        badge: "Inverter & Modul",
        desc: "Proteksi anti-islanding (< 2 detik) serta kualifikasi ketahanan modul fotovoltaik.",
        url: "https://standards.ieee.org/",
      },
    ],
  },
  {
    category: "Meteorologi Surya & Geospasial Kota Bogor",
    items: [
      {
        title: "NASA POWER Climatology",
        institution: "NASA Langley Research Center",
        badge: "GHI 2001–2024",
        desc: "Data insolasi all-sky harian (termasuk tutupan awan) dan suhu permukaan Kota Bogor.",
        url: "https://power.larc.nasa.gov/data-access-viewer/",
      },
      {
        title: "Global Solar Atlas — Bogor",
        institution: "World Bank Group & Solargis",
        badge: "Peta PVOUT",
        desc: "Validasi silang radiasi harian (4,20–4,52 kWh/m²/hari) di koordinat 6,6° LS.",
        url: "https://globalsolaratlas.info/map?c=-6.5971,106.806,11&s=-6.5971,106.806&m=site",
      },
      {
        title: "Esri World Imagery",
        institution: "Esri, Maxar, Earthstar Geographics",
        badge: "Zoom 19",
        desc: "Citra satelit resolusi tinggi (~0,296 m/px) sebagai dasar segmentasi atap dan CAD.",
        url: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
      },
    ],
  },
  {
    category: "Regulasi Nasional, Tarif PLN & Emisi",
    items: [
      {
        title: "Permen ESDM No. 2/2024",
        institution: "JDIH BPK RI / Kementerian ESDM",
        badge: "PLTS Atap",
        desc: "Aturan kuota wilayah, fokus self-consumption, dan bebas biaya kapasitas rumah tangga.",
        url: "https://peraturan.bpk.go.id/Details/288519/permen-esdm-no-2-tahun-2024",
      },
      {
        title: "Permen ESDM No. 7/2024 & PLN",
        institution: "Kementerian ESDM / PT PLN (Persero)",
        badge: "Tarif Listrik",
        desc: "Dasar tarif tenaga listrik per kWh untuk golongan R-1, R-2, dan B-2 nonsubsidi.",
        url: "https://peraturan.bpk.go.id/Details/294347/permen-esdm-no-7-tahun-2024",
      },
      {
        title: "Kepmen ESDM 163/2021 & PUIL 2020",
        institution: "Kementerian ESDM RI",
        badge: "Emisi & Keselamatan",
        desc: "Faktor emisi grid Jamali (0,80 kg CO₂/kWh) dan standar instalasi SNI 0225:2020.",
        url: "https://peraturan.bpk.go.id/Details/180040/permen-esdm-no-7-tahun-2021",
      },
    ],
  },
] as const;

const FAQS = [
  {
    q: "Bagaimana cuaca hujan dan awan Kota Bogor diperhitungkan?",
    a: "Basis radiasi harian 4,42 kWh/m²/hari diambil dari data all-sky NASA POWER & Global Solar Atlas (2001–2024) yang sudah memasukkan curah hujan serta awan konvektif sore Bogor — bukan angka langit cerah ideal. Anda juga dapat membandingkan skenario pagi/berawan (3,82) dan sore (3,95) langsung di Studio.",
  },
  {
    q: "Bagaimana dengan bayangan pohon atau bangunan di samping rumah?",
    a: "Karena citra satelit 2D belum memiliki elevasi 3D, SunSight menyediakan dua lapis kendali: preset Bayangan Samping (Terbuka 0%, Ringan -10%, Padat -20%) di tab Modul dan kuas manual Rintangan Atap untuk mengecualikan slot panel yang tertutup pohon, AC, atau skylight.",
  },
  {
    q: "Mengapa arah optimal di Bogor menghadap Utara (0°) dengan sudut ~10°?",
    a: "Kota Bogor berada di 6,6° Lintang Selatan. Di belahan bumi selatan, lintasan tahunan matahari sedikit condong ke utara sehingga kemiringan landai ~10° ke Utara memaksimalkan energi tahunan sekaligus menjaga air hujan membilas debu secara alami.",
  },
  {
    q: "Apa perbedaan kWp dan kWh pada hasil simulasi?",
    a: "kWp (kilowatt-peak) adalah kapasitas terpasang panel pada kondisi uji standar, sedangkan kWh (kilowatt-hour) adalah energi listrik nyata yang dihasilkan dan mengurangi tagihan PLN bulanan Anda.",
  },
  {
    q: "Berapa estimasi balik modal (Payback) yang realistis?",
    a: "Payback dihitung dari total investasi sistem dibagi penghematan tahunan (dibatasi maksimal sebesar tagihan listrik Anda sesuai skema self-consumption Permen ESDM 2/2024). Untuk rumah tangga & komersial di Bogor, rata-rata balik modal berada di kisaran 4–8 tahun.",
  },
] as const;

export default function MethodologyPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("spatial");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const programmaticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  useEffect(() => {
    const sectionIds = NAV_ITEMS.map((item) => item.id);

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
      if (scrolledToBottom) {
        setActiveSection("faq");
        return;
      }

      const triggerLine = 180;
      let currentId: string = sectionIds[0];

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= triggerLine) {
          currentId = id;
        }
      }

      setActiveSection((prev) => (prev !== currentId ? currentId : prev));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (programmaticTimeoutRef.current) {
        clearTimeout(programmaticTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const container = navScrollRef.current;
    const activeBtn = pillRefs.current[activeSection];
    if (!container || !activeBtn) return;

    const targetScrollLeft =
      activeBtn.offsetLeft - container.clientWidth / 2 + activeBtn.offsetWidth / 2;

    container.scrollTo({
      left: Math.max(0, targetScrollLeft),
      behavior: "smooth",
    });
  }, [activeSection]);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    isProgrammaticScrollRef.current = true;
    if (programmaticTimeoutRef.current) {
      clearTimeout(programmaticTimeoutRef.current);
    }
    programmaticTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 750);

    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#EFF1F4] text-slate-800 font-body-md antialiased selection:bg-amber-100 selection:text-amber-950 flex flex-col justify-between relative overflow-x-clip">
      {/* Soft Radiant Glow Ambient Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-36 left-1/3 w-[680px] h-[680px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(252,211,77,0.28) 0%, rgba(254,240,138,0.12) 42%, transparent 72%)",
          }}
        />
        <div
          className="absolute top-1/3 -right-24 w-[540px] h-[540px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(125,211,252,0.22) 0%, rgba(207,250,254,0.10) 42%, transparent 72%)",
          }}
        />
        <div
          className="absolute bottom-8 left-12 w-[500px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(253,230,138,0.20) 0%, rgba(186,230,253,0.10) 42%, transparent 72%)",
          }}
        />
      </div>

      {/* Back Button */}
      <header className="relative xl:fixed xl:top-5 xl:left-4 2xl:left-8 z-40 px-4 sm:px-8 xl:px-0 pt-5 xl:pt-0 flex items-center">
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-white/90 shadow-xs text-xs sm:text-sm font-semibold text-slate-700 hover:text-amber-950 transition cursor-pointer group"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform text-slate-500 group-hover:text-amber-800">
            arrow_back
          </span>
          <span>Kembali</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-30 flex-1 max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-12 sm:py-12 w-full space-y-8 sm:space-y-10">
        {/* Clean Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/85 backdrop-blur-xl border border-white/90 shadow-[0_4px_16px_rgba(245,158,11,0.10)]">
            <span className="material-symbols-outlined text-amber-600 text-[16px]">verified</span>
            <span className="text-xs font-semibold text-amber-950 font-title tracking-tight">
              Standar ISO · IEC · Regulasi ESDM
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold text-slate-900 font-title tracking-tight leading-[1.14]">
            Metodologi &amp; sumber{" "}
            <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
              data terbuka.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Ringkasan transparan standar geospasial, klimatologi surya Kota Bogor, faktor bayangan, dan regulasi energi di balik setiap angka SunSight.
          </p>
        </div>

        {/* Sticky Frosted Glass Capsule Nav */}
        <nav className="sticky top-4 z-40 flex justify-center pointer-events-none">
          <div
            ref={navScrollRef}
            className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-white/78 backdrop-blur-2xl saturate-150 border border-white/90 shadow-[0_12px_36px_rgba(15,23,42,0.07),0_2px_12px_rgba(245,158,11,0.10)] max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    pillRefs.current[item.id] = el;
                  }}
                  type="button"
                  onClick={() => scrollTo(item.id)}
                  className={`h-9 px-3.5 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer border ${
                    isActive
                      ? "bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 text-amber-950 shadow-[0_2px_10px_rgba(245,158,11,0.22),inset_0_1px_1px_rgba(255,255,255,0.88)] border-amber-300/80"
                      : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.04] border-transparent"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* 01 · CITRA SATELIT & SEGMENTASI AI (ISO 19157) */}
        <section
          id="spatial"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-5 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 block">
                01 · Geospasial &amp; Segmentasi AI (ISO 19157)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Deteksi Atap Satelit &amp; Regularisasi Poligon
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 text-[11px] font-semibold text-amber-900 font-code-metric w-fit">
              Esri z19 · ~0,30 m/px
            </span>
          </div>

          <div className="rounded-2xl bg-slate-900/[0.035] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900/[0.07]">
            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Model Segmentasi</span>
              <div className="text-xl font-semibold text-slate-900 font-code-metric">YOLO11m-Seg</div>
              <p className="text-[11px] text-slate-500">
                Dilatih pada 563 citra Esri Kota Bogor + CLAHE LAB untuk atap gelap &amp; dak beton.
              </p>
            </div>
            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Regularisasi Sudut</span>
              <div className="text-xl font-semibold text-slate-900 font-code-metric tabular-nums">−92,2%</div>
              <p className="text-[11px] text-slate-500">
                Kontur mentah dirapikan menjadi poligon ortogonal siap CAD tanpa mengubah luas.
              </p>
            </div>
            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Skala Metrik</span>
              <div className="text-xl font-semibold text-slate-900 font-code-metric">Web Mercator</div>
              <p className="text-[11px] text-slate-500">
                Konversi piksel ke meter persegi dihitung otomatis di server sesuai lintang lokasi.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Batasan citra 2D:</strong> Foto satelit nadir tidak menyimpan tinggi objek 3D; hambatan lokal (AC, kaca, pohon) disempurnakan melalui kuas rintangan manual dan preset bayangan samping.
          </p>
        </section>

        {/* 02 · RADIASI SURYA, CUACA & BAYANGAN (ISO 9060 & IEC 61724-1) */}
        <section
          id="solar"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-5 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 block">
                02 · Klimatologi &amp; Bayangan (ISO 9060 · IEC 61724-1)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Radiasi Mikroklimat Kota Bogor &amp; Faktor Lingkungan
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50/90 text-[11px] font-semibold text-sky-900 w-fit">
              NASA POWER · Solargis
            </span>
          </div>

          <div className="rounded-2xl bg-slate-900/[0.035] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900/[0.07]">
            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">GHI All-Sky Bogor</span>
              <div className="text-2xl font-semibold text-slate-900 font-code-metric tabular-nums">
                4,42 <span className="text-xs font-normal text-slate-500">kWh/m²/hr</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Klimatologi 2001–2024 mencakup curah hujan &amp; awan konvektif (pagi 3,82 · sore 3,95).
              </p>
            </div>

            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Sudut Optimal (6,6° LS)</span>
              <div className="text-2xl font-semibold text-slate-900 font-code-metric tabular-nums">
                10° <span className="text-xs font-normal text-slate-500">Utara (0°)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Menghadap Utara sesuai belahan bumi selatan dengan jarak sudut melingkar 360°.
              </p>
            </div>

            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Performance Ratio Dasar</span>
              <div className="text-2xl font-semibold text-emerald-700 font-code-metric tabular-nums">
                80,7%
              </div>
              <p className="text-[11px] text-slate-500">
                Rugi suhu tropis (−0,34%/°C), kabel, debu (0,82) × efisiensi inverter (98,4%).
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-amber-50/75 via-white/75 to-sky-50/45 border border-amber-200/60 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <strong className="text-slate-900 block">Terbuka · 0% rugi</strong>
              <span className="text-slate-600">Atap bebas halangan pohon atau bangunan tinggi di sekeliling.</span>
            </div>
            <div>
              <strong className="text-slate-900 block">Bayangan Ringan · −10%</strong>
              <span className="text-slate-600">Terdapat pepohonan atau bangunan tetangga di satu sisi atap.</span>
            </div>
            <div>
              <strong className="text-slate-900 block">Bayangan Padat · −20%</strong>
              <span className="text-slate-600">Lingkungan padat atau bersebelahan dengan gedung bertingkat.</span>
            </div>
          </div>
        </section>

        {/* 03 · PERANGKAT TIER-1 & ATURAN CAD */}
        <section
          id="hardware"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-5 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 block">
                03 · Perangkat &amp; Keselamatan (IEC 61215 · IEEE 1547 · PUIL 2020)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Spesifikasi Hardware &amp; Aturan Tata Letak CAD
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-5 rounded-2xl bg-slate-900/[0.035] space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">solar_power</span>
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Modul Surya Tier-1</h3>
                  <span className="text-[11px] text-slate-500">450 Wp · 550 Wp · 580 Wp (IEC 61215/61730)</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Standar acuan 550 Wp Mono PERC berukuran 2,278 × 1,134 m (±2,58 m², efisiensi ~21,3%) dengan garansi daya 25 tahun.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/[0.035] space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Inverter &amp; Proteksi</h3>
                  <span className="text-[11px] text-slate-500">IEEE 1547 · SNI PUIL 2020</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pilihan Central String (98,4%) atau Microinverter (97,5%) dengan anti-islanding &lt; 2 detik, SPD Type II, dan grounding ≤ 5 Ohm.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/[0.035] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900/[0.07] text-xs">
            <div className="p-4">
              <strong className="text-slate-900 block">Setback Tepi (0,5 m)</strong>
              <span className="text-slate-600">Zona bebas angin &amp; jalur perawatan teknisi.</span>
            </div>
            <div className="p-4">
              <strong className="text-slate-900 block">Celah Panel (3 cm)</strong>
              <span className="text-slate-600">Ruang mid-clamp aluminium &amp; muai termal.</span>
            </div>
            <div className="p-4">
              <strong className="text-slate-900 block">Ekstra Racking (0°–20°)</strong>
              <span className="text-slate-600">Bonus self-cleaning hujan hingga +2%.</span>
            </div>
          </div>
        </section>

        {/* 04 · FORMULA PRODUKSI & FINANSIAL */}
        <section
          id="financial"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-5 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 block">
                04 · Regulasi &amp; Finansial (Permen ESDM No. 2 &amp; 7/2024)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Formula Energi &amp; Penghematan Tagihan PLN
              </h2>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/85 via-white/80 to-sky-50/45 border border-amber-200/70 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-950 font-code-metric">
              <span className="px-3 py-1.5 rounded-xl bg-white/90 shadow-2xs">Kapasitas (kWp)</span>
              <span>×</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/90 shadow-2xs">4,42 PSH</span>
              <span>×</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/90 shadow-2xs">365 Hari</span>
              <span>×</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/90 shadow-2xs">Faktor Sudut</span>
              <span>×</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/90 shadow-2xs">PR Efektif</span>
              <span>=</span>
              <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 text-amber-950 border border-amber-300/80 shadow-xs">
                kWh / Tahun
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Contoh (Terbuka, optimal):</strong> Sistem{" "}
              <strong className="text-slate-900">4,4 kWp</strong> (8 × 550 Wp) menghasilkan 4,4 × 4,42 × 365 × 0,807 ≈{" "}
              <strong className="text-slate-900">5.728 kWh/tahun</strong> (~Rp 9,7 jt/tahun pada golongan R-2, dibatasi oleh tagihan bulanan sesuai skema self-consumption).
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden bg-slate-900/[0.035] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900/[0.07] font-code-metric text-xs">
            <div className="p-4">
              <span className="text-slate-500 text-[10.5px] block">R-1 · 1.300 VA</span>
              <span className="font-semibold text-slate-900 tabular-nums">Rp 1.444,70 / kWh</span>
            </div>
            <div className="p-4">
              <span className="text-slate-500 text-[10.5px] block">R-2 · 3.500–5.500 VA</span>
              <span className="font-semibold text-slate-900 tabular-nums">Rp 1.700,00 / kWh</span>
            </div>
            <div className="p-4">
              <span className="text-slate-500 text-[10.5px] block">B-2 · Bisnis &gt; 6.600 VA</span>
              <span className="font-semibold text-slate-900 tabular-nums">Rp 1.444,70 / kWh</span>
            </div>
          </div>
        </section>

        {/* 05 · DAMPAK LINGKUNGAN (ISO 14064-1) */}
        <section
          id="emissions"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-5 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-emerald-800 block">
                05 · Dekarbonisasi (ISO 14064-1 · Kepmen ESDM 163/2021)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Reduksi Emisi CO₂ &amp; Ekuivalensi Pohon
              </h2>
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/70 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-emerald-200/60">
            <div className="p-5 space-y-1">
              <span className="text-xs font-semibold text-emerald-950 block">Faktor Emisi Grid Jamali</span>
              <div className="text-2xl font-semibold text-emerald-900 font-code-metric tabular-nums">
                0,80 kg CO₂ <span className="text-xs font-normal text-slate-600">/ kWh</span>
              </div>
              <p className="text-xs text-slate-600">Acuan interkoneksi Jawa-Madura-Bali (ESDM).</p>
            </div>

            <div className="p-5 space-y-1">
              <span className="text-xs font-semibold text-emerald-950 block">Serapan Pohon Dewasa</span>
              <div className="text-2xl font-semibold text-emerald-900 font-code-metric tabular-nums">
                22,0 kg CO₂ <span className="text-xs font-normal text-slate-600">/ pohon / thn</span>
              </div>
              <p className="text-xs text-slate-600">Tiap 1 ton CO₂ terhindar setara ±45 pohon/tahun.</p>
            </div>
          </div>
        </section>

        {/* 06 · REFERENSI RESMI */}
        <section
          id="directory"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-5 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="border-b border-slate-900/[0.06] pb-4">
            <span className="text-[11px] font-semibold text-amber-800 block">
              06 · Direktori Referensi
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
              Standar &amp; Dokumen Sumber
            </h2>
          </div>

          <div className="space-y-6">
            {OFFICIAL_SOURCES.map((cat, catIdx) => (
              <div key={catIdx} className="space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>{cat.category}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {cat.items.map((item, itemIdx) => (
                    <a
                      key={itemIdx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-2xl bg-slate-900/[0.03] hover:bg-white/95 border border-transparent hover:border-amber-200/80 transition-all duration-200 hover:shadow-[0_8px_24px_rgba(245,158,11,0.10)] flex flex-col justify-between space-y-2.5 group cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100/80 text-[10px] font-semibold text-amber-900">
                            {item.badge}
                          </span>
                          <span className="material-symbols-outlined text-[15px] text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all">
                            north_east
                          </span>
                        </div>
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-900 pt-0.5">
                          {item.title}
                        </h4>
                        <span className="text-[10.5px] text-slate-400 font-medium block">
                          {item.institution}
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 07 · TANYA JAWAB */}
        <section
          id="faq"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-5 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="border-b border-slate-900/[0.06] pb-4">
            <span className="text-[11px] font-semibold text-amber-800 block">
              07 · Tanya Jawab
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
              Pertanyaan Umum
            </h2>
          </div>

          <div className="rounded-2xl bg-slate-900/[0.03] divide-y divide-slate-900/[0.06] overflow-hidden">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/50 transition-colors"
                  >
                    <span className="font-semibold text-xs sm:text-sm text-slate-900 font-title">
                      {item.q}
                    </span>
                    <span
                      className={`material-symbols-outlined text-[20px] text-amber-700 transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed animate-fadeIn">
                      <p className="m-0">{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Mascot Card */}
        <div className="rounded-[28px] bg-white/80 bg-gradient-to-r from-amber-50/90 via-yellow-50/70 to-sky-50/60 backdrop-blur-2xl border border-white/90 p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_14px_38px_rgba(245,158,11,0.12)]">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="hidden sm:block shrink-0">
              <SunnyMascot size={64} expression="happy" animated={true} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 font-title tracking-tight">
                Transparansi sains untuk keputusan energi yang tepat.
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                Seluruh rumus dan faktor di halaman ini terhubung langsung dengan mesin simulasi SunSight.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-auto h-11 px-6 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 font-title text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition shadow-[0_6px_18px_rgba(245,158,11,0.22),inset_0_1px_1px_rgba(255,255,255,0.88)] border border-amber-300/80 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Kembali</span>
          </button>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/80 bg-white/70 backdrop-blur-xl py-6 px-4 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} SunSight · Standar Metodologi &amp; Data Energi Surya</p>
      </footer>
    </div>
  );
}
