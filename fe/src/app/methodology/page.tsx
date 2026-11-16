"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";

const NAV_ITEMS = [
  { id: "spatial", label: "Citra Satelit", icon: "satellite_alt" },
  { id: "solar", label: "Radiasi Bogor", icon: "sunny" },
  { id: "hardware", label: "Komponen Tier-1", icon: "solar_power" },
  { id: "financial", label: "Finansial & Regulasi", icon: "calculate" },
  { id: "emissions", label: "Dampak Lingkungan", icon: "forest" },
  { id: "directory", label: "Dokumen Resmi", icon: "account_balance" },
  { id: "faq", label: "Tanya Jawab", icon: "help_outline" },
] as const;

export default function MethodologyPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("spatial");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const programmaticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handler tombol kembali dinamis: kembali ke halaman sebelumnya (profil/landing), fallback ke "/" jika history kosong
  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  // Scroll-spy otomatis mengikuti posisi scroll halaman
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
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= triggerLine) {
            currentId = id;
          }
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

  // Geser horizontal kapsul navbar secara mulus agar pill aktif selalu berada di tengah kapsul
  useEffect(() => {
    const container = navScrollRef.current;
    const activeBtn = pillRefs.current[activeSection];
    if (!container || !activeBtn) return;

    const containerWidth = container.clientWidth;
    const btnLeft = activeBtn.offsetLeft;
    const btnWidth = activeBtn.offsetWidth;
    const targetScrollLeft = btnLeft - containerWidth / 2 + btnWidth / 2;

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
      const yOffset = -84;
      const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

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
    <div className="min-h-screen bg-[#EFF1F4] text-slate-800 font-body-md antialiased selection:bg-amber-100 selection:text-amber-950 flex flex-col justify-between relative overflow-x-clip">
      {/* Radiant Soft Glow Ambient Background (pure radial gradients — light on GPU) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-36 left-1/3 w-[680px] h-[680px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(252,211,77,0.28) 0%, rgba(254,240,138,0.12) 42%, transparent 72%)" }}
        />
        <div
          className="absolute top-1/3 -right-24 w-[540px] h-[540px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(125,211,252,0.22) 0%, rgba(207,250,254,0.10) 42%, transparent 72%)" }}
        />
        <div
          className="absolute bottom-8 left-12 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(253,230,138,0.20) 0%, rgba(186,230,253,0.10) 42%, transparent 72%)" }}
        />
      </div>

      {/* Header Bar */}
      <header className="relative xl:fixed xl:top-5 xl:left-8 z-40 px-4 sm:px-8 xl:px-0 pt-5 xl:pt-0 flex items-center">
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-xl border border-white/90 shadow-xs text-xs sm:text-sm font-semibold text-slate-700 hover:text-amber-950 transition cursor-pointer group"
          title="Kembali ke halaman sebelumnya"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform text-slate-500 group-hover:text-amber-800">
            arrow_back
          </span>
          <span>Kembali</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-30 flex-1 max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-12 sm:py-12 w-full space-y-8 sm:space-y-10">
        {/* Apple-style Clean Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/85 backdrop-blur-xl border border-white/90 shadow-[0_4px_16px_rgba(245,158,11,0.10)]">
            <span className="material-symbols-outlined text-amber-600 text-[16px]">verified</span>
            <span className="text-xs font-semibold text-amber-950 font-title tracking-tight">
              Standar Teknis IEC / ISO &amp; Regulasi ESDM
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold text-slate-900 font-title tracking-tight leading-[1.15]">
            Sumber data &amp; standar{" "}
            <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
              perhitungan terbuka.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Setiap angka potensi energi, biaya investasi, dan reduksi emisi di SunSight mengacu pada standar teknik internasional (IEC, IEEE, ISO) serta regulasi resmi Kementerian ESDM &amp; PT PLN.
          </p>
        </div>

        {/* Floating Capsule Nav: Frosted Glass */}
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

        {/* PILAR 1: CITRA SATELIT & PRESISI ATAP */}
        <section
          id="spatial"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 block">
                01 · Akurasi Geospasial (Ortofoto Nadir)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Citra Satelit Tegak Lurus 90° Bebas Distorsi
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 text-[11px] font-semibold text-amber-900 font-code-metric w-fit">
              <span className="material-symbols-outlined text-[15px]">straighten</span>
              Skala 1 m = 20 px
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            Citra ortorektifikasi 90° tegak lurus (*nadir view*) memastikan ukuran panjang dan lebar bidang atap di Studio CAD sebanding dengan ukuran fisik di lapangan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/[0.035] space-y-2">
              <div className="flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <span className="material-symbols-outlined text-[17px]">cancel</span>
                <span>Foto Udara Miring Biasa</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sudut kamera miring menampakkan dinding bangunan dan mengaburkan garis talang, sehingga estimasi luas atap dapat meleset hingga 30%.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/85 via-white/80 to-sky-50/50 border border-amber-200/70 space-y-2">
              <div className="flex items-center gap-2 text-amber-950 text-xs font-semibold">
                <span className="material-symbols-outlined text-[17px] text-amber-600">check_circle</span>
                <span>Ortofoto Nadir 90° + DEMNAS</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Koreksi elevasi DEM (190–330 mdpl di 6 kecamatan Kota Bogor) menghilangkan distorsi sudut agar modul 550 Wp tersusun akurat.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="https://tanahair.indonesia.go.id/demnas/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/[0.045] hover:bg-amber-50 text-xs font-semibold text-slate-700 hover:text-amber-950 transition group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">map</span>
              <span>Portal DEMNAS (Badan Informasi Geospasial)</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 transition-transform">
                north_east
              </span>
            </a>
          </div>
        </section>

        {/* PILAR 2: RADIASI SURYA & MIKROKLIMAT */}
        <section
          id="solar"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 block">
                02 · Meteorologi Surya (IEC 61724)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Radiasi Matahari Mikroklimat Kota Bogor
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50/90 text-[11px] font-semibold text-sky-900 w-fit">
              <span className="material-symbols-outlined text-[15px]">sunny</span>
              NASA POWER &amp; Solargis
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
            Data historis multi-dekade NASA POWER dan Global Solar Atlas (World Bank/Solargis) disesuaikan dengan pola awan konvektif sore hari serta faktor suhu tropis Kota Bogor.
          </p>

          <div className="rounded-2xl bg-slate-900/[0.035] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900/[0.07]">
            <div className="p-5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Insolasi Harian</span>
              <div className="text-2xl font-semibold text-slate-900 font-code-metric tabular-nums">
                4,20–4,52
              </div>
              <div className="text-xs font-medium text-slate-700">kWh/m²/hari (Peak Sun Hours)</div>
              <p className="text-[11px] text-slate-500 pt-1">
                Rata-rata radiasi surya tahunan Kota Bogor.
              </p>
            </div>

            <div className="p-5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Puncak Penyinaran</span>
              <div className="text-2xl font-semibold text-slate-900 font-code-metric tabular-nums">
                72%
              </div>
              <div className="text-xs font-medium text-slate-700">Pukul 08.30 – 13.30 WIB</div>
              <p className="text-[11px] text-slate-500 pt-1">
                Terkonsentrasi sebelum awan konvektif sore terbentuk.
              </p>
            </div>

            <div className="p-5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Performance Ratio</span>
              <div className="text-2xl font-semibold text-emerald-700 font-code-metric tabular-nums">
                80,0%
              </div>
              <div className="text-xs font-medium text-slate-700">Standar IEC 61724 (PR 0,80)</div>
              <p className="text-[11px] text-slate-500 pt-1">
                Mencakup rugi suhu tropis (-0,34%/°C), kabel, dan debu.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="https://power.larc.nasa.gov/data-access-viewer/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/[0.045] hover:bg-amber-50 text-xs font-semibold text-slate-700 hover:text-amber-950 transition group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">public</span>
              <span>NASA POWER Data Viewer</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 transition-transform">
                north_east
              </span>
            </a>

            <a
              href="https://globalsolaratlas.info/map?c=-6.5971,106.806,11&s=-6.5971,106.806&m=site"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/[0.045] hover:bg-amber-50 text-xs font-semibold text-slate-700 hover:text-amber-950 transition group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">wb_sunny</span>
              <span>Global Solar Atlas — Bogor</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 transition-transform">
                north_east
              </span>
            </a>
          </div>
        </section>

        {/* PILAR 3: HARDWARE TIER-1 & ATURAN CAD */}
        <section
          id="hardware"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 block">
                03 · Perangkat &amp; Keselamatan (IEC / IEEE / PUIL)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Standar Hardware Tier-1 &amp; Aturan CAD
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 text-[11px] font-semibold text-amber-900 w-fit">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              IEC 61215 · IEEE 1547 · PUIL 2020
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-5 rounded-2xl bg-slate-900/[0.035] space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">solar_power</span>
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Modul Surya Tier-1 (550 Wp)</h3>
                  <span className="text-[11px] text-slate-500">IEC 61215 &amp; IEC 61730 · Mono PERC</span>
                </div>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc">
                <li>Efisiensi sel ~21,3%, dimensi standar 2,278 × 1,134 m (±2,58 m²).</li>
                <li>Garansi degradasi linier 25 tahun (daya tersisa ≥ 84,8% di tahun ke-25).</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/[0.035] space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Inverter &amp; Proteksi Jaringan</h3>
                  <span className="text-[11px] text-slate-500">IEEE 1547 &amp; SNI PUIL 2020</span>
                </div>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc">
                <li>Euro Efficiency ≥ 97,5% dengan pemutus anti-islanding &lt; 2 detik saat PLN padam.</li>
                <li>Wajib Surge Protection Device (SPD Type II) DC/AC &amp; grounding ≤ 5 Ohm.</li>
              </ul>
            </div>
          </div>

          {/* 3 Aturan Penataan CAD (Grouped Inset Strip) */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-50/75 via-white/70 to-sky-50/45 border border-amber-200/60 p-4 space-y-2.5">
            <span className="text-xs font-semibold text-amber-950 block">
              Aturan Penataan Panel di Studio CAD
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div>
                <strong className="text-slate-900 block">1. Setback Tepi (30–50 cm)</strong>
                <span>Jarak aman dari tepi atap untuk tahanan angin dan akses teknisi.</span>
              </div>
              <div>
                <strong className="text-slate-900 block">2. Celah Panel (2–3 cm)</strong>
                <span>Ruang klem aluminium (*mid-clamp*) dan toleransi muai panas.</span>
              </div>
              <div>
                <strong className="text-slate-900 block">3. Kemiringan (10°–22°)</strong>
                <span>Sudut alami air hujan membersihkan debu (*self-cleaning*).</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="https://peraturan.bpk.go.id/Details/180040/permen-esdm-no-7-tahun-2021"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/[0.045] hover:bg-amber-50 text-xs font-semibold text-slate-700 hover:text-amber-950 transition group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">verified</span>
              <span>Permen ESDM No. 7/2021 — PUIL 2020</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 transition-transform">
                north_east
              </span>
            </a>

            <a
              href="https://standards.ieee.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/[0.045] hover:bg-amber-50 text-xs font-semibold text-slate-700 hover:text-amber-950 transition group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">electric_bolt</span>
              <span>Standar IEEE 1547</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:translate-x-0.5 transition-transform">
                north_east
              </span>
            </a>
          </div>
        </section>

        {/* PILAR 4: FORMULA FINANSIAL & REGULASI */}
        <section
          id="financial"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 block">
                04 · Regulasi &amp; Finansial
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Kalkulasi Penghematan (Permen ESDM 2/2024)
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 text-[11px] font-semibold text-amber-900 w-fit">
              <span className="material-symbols-outlined text-[15px]">gavel</span>
              Permen ESDM No. 2 &amp; 7/2024
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/85 via-white/80 to-sky-50/45 border border-amber-200/70 space-y-3">
            <span className="text-xs font-semibold text-amber-950 block font-title">
              Rumus Produksi Energi Tahunan
            </span>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-950 font-code-metric">
              <span className="px-3 py-1.5 rounded-xl bg-white/90 shadow-2xs">Kapasitas (kWp)</span>
              <span>×</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/90 shadow-2xs">4,25 Jam PSH</span>
              <span>×</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/90 shadow-2xs">365 Hari</span>
              <span>×</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/90 shadow-2xs">0,80 PR</span>
              <span>=</span>
              <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 text-amber-950 border border-amber-300/80 shadow-xs">
                Energi (kWh/Thn)
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Contoh:</strong> Sistem <strong>4,4 kWp</strong> (8 panel) menghasilkan 4,4 × 4,25 × 365 × 0,80 ≈{" "}
              <strong>5.460 kWh/tahun</strong> (~Rp 7,8 juta/tahun pada tarif R-1 Rp 1.444,70/kWh).
            </p>
          </div>

          {/* 3 Pokok Permen ESDM 2/2024 */}
          <div className="rounded-2xl bg-slate-900/[0.035] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900/[0.07] text-xs">
            <div className="p-4 space-y-1">
              <strong className="text-slate-900 block">Sistem Kuota Wilayah</strong>
              <p className="text-slate-600 leading-relaxed">
                Menggantikan batas kaku 100% daya terpasang dengan mekanisme kuota sistem distribusi PLN.
              </p>
            </div>
            <div className="p-4 space-y-1">
              <strong className="text-slate-900 block">Fokus Self-Consumption</strong>
              <p className="text-slate-600 leading-relaxed">
                Kapasitas dioptimalkan untuk pemakaian siang hari langsung agar tidak ada daya terbuang.
              </p>
            </div>
            <div className="p-4 space-y-1">
              <strong className="text-slate-900 block">Bebas Biaya Kapasitas</strong>
              <p className="text-slate-600 leading-relaxed">
                Pelanggan rumah tangga dibebaskan dari *capacity charge* bulanan PLN.
              </p>
            </div>
          </div>

          {/* Katalog Tarif Resmi PLN */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Tarif Listrik Resmi PT PLN (Persero):</span>
            <div className="rounded-2xl bg-slate-900/[0.035] grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-900/[0.07] font-code-metric text-xs">
              <div className="p-3.5">
                <span className="text-slate-500 text-[10.5px] block">R-1 / 900 VA RTM</span>
                <span className="font-semibold text-slate-900 tabular-nums">Rp 1.352,00/kWh</span>
              </div>
              <div className="p-3.5">
                <span className="text-slate-500 text-[10.5px] block">R-1 / 1.300–2.200 VA</span>
                <span className="font-semibold text-slate-900 tabular-nums">Rp 1.444,70/kWh</span>
              </div>
              <div className="p-3.5">
                <span className="text-slate-500 text-[10.5px] block">R-2 / 3.500–5.500 VA</span>
                <span className="font-semibold text-slate-900 tabular-nums">Rp 1.699,53/kWh</span>
              </div>
              <div className="p-3.5">
                <span className="text-slate-500 text-[10.5px] block">R-3 / ≥ 6.600 VA</span>
                <span className="font-semibold text-slate-900 tabular-nums">Rp 1.699,53/kWh</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="https://peraturan.bpk.go.id/Details/288519/permen-esdm-no-2-tahun-2024"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 font-semibold text-xs border border-amber-300/80 transition group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-800">description</span>
              <span>Naskah Permen ESDM No. 2/2024</span>
              <span className="material-symbols-outlined text-[14px]">north_east</span>
            </a>
            <a
              href="https://peraturan.bpk.go.id/Details/294347/permen-esdm-no-7-tahun-2024"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/[0.045] hover:bg-amber-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600">gavel</span>
              <span>Permen ESDM No. 7/2024</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400">north_east</span>
            </a>
            <a
              href="https://www.pln.co.id/penyesuaian-tarif-id"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/[0.045] hover:bg-slate-900/[0.08] text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-500">payments</span>
              <span>Tarif Resmi PLN</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400">north_east</span>
            </a>
          </div>
        </section>

        {/* PILAR 5: DAMPAK LINGKUNGAN (ISO 14064) */}
        <section
          id="emissions"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-emerald-800 block">
                05 · Dekarbonisasi (ISO 14064)
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Standar Reduksi Emisi CO₂ &amp; Ekuivalensi Pohon
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-800 w-fit">
              <span className="material-symbols-outlined text-[15px]">forest</span>
              Kepmen ESDM 163/2021
            </span>
          </div>

          <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/70 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-emerald-200/60">
            <div className="p-5 space-y-1.5">
              <span className="text-xs font-semibold text-emerald-950 block">Faktor Emisi Grid Jamali</span>
              <div className="text-2xl sm:text-3xl font-semibold text-emerald-900 font-code-metric tabular-nums">
                0,80 kg CO₂ <span className="text-xs font-normal text-slate-600">/ kWh</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sesuai Kepmen ESDM No. 163.K/HK.02/MEM.S/2021 dan Permen ESDM No. 22/2019 untuk jaringan Jawa-Madura-Bali.
              </p>
            </div>

            <div className="p-5 space-y-1.5">
              <span className="text-xs font-semibold text-emerald-950 block">Serapan Karbon Pohon Tropis</span>
              <div className="text-2xl sm:text-3xl font-semibold text-emerald-900 font-code-metric tabular-nums">
                21,77 kg CO₂ <span className="text-xs font-normal text-slate-600">/ pohon / thn</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Setiap penurunan 1 ton emisi CO₂ setara dengan penyerapan ~46 pohon dewasa per tahun.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="https://peraturan.bpk.go.id/Details/142358/permen-esdm-no-22-tahun-2019"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/[0.045] hover:bg-emerald-50 text-xs font-semibold text-slate-700 hover:text-emerald-900 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-600">co2</span>
              <span>Permen ESDM No. 22/2019 (GRK Energi)</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400">north_east</span>
            </a>

            <a
              href="https://jdih.esdm.go.id/dokumen/download?id=Abstrak+Kepmen+ESDM+No.+163.K_HK.02_MEM.S_2021.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/[0.045] hover:bg-emerald-50 text-xs font-semibold text-slate-700 hover:text-emerald-900 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-600">picture_as_pdf</span>
              <span>Kepmen ESDM 163/2021 (PDF)</span>
              <span className="material-symbols-outlined text-[14px] text-slate-400">north_east</span>
            </a>
          </div>
        </section>

        {/* PILAR 6: PUSAT DOKUMEN RESMI */}
        <section
          id="directory"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 block">
                06 · Direktori Referensi
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Tautan Dokumen Asli &amp; Regulasi
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 text-[11px] font-semibold text-amber-900 w-fit">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
              JDIH BPK · ESDM · PLN · NASA
            </span>
          </div>

          <div className="space-y-6">
            {officialSources.map((cat, catIdx) => (
              <div key={catIdx} className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>{cat.category}</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {cat.items.map((item, itemIdx) => (
                    <a
                      key={itemIdx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-2xl bg-slate-900/[0.03] hover:bg-white/95 border border-transparent hover:border-amber-200/80 transition-all duration-200 hover:shadow-[0_8px_24px_rgba(245,158,11,0.10)] flex flex-col justify-between space-y-3 group cursor-pointer"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100/80 text-[10px] font-semibold text-amber-900">
                            {item.badge}
                          </span>
                          <span className="material-symbols-outlined text-[15px] text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all">
                            north_east
                          </span>
                        </div>
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-900">
                          {item.title}
                        </h4>
                        <span className="text-[10.5px] text-slate-400 font-medium block">
                          {item.institution}
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                          {item.desc}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-900/[0.06] flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                        <span>Buka Dokumen</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PILAR 7: TANYA JAWAB (Single Apple Grouped Accordion) */}
        <section
          id="faq"
          className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_14px_38px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-5 scroll-mt-24"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900/[0.06] pb-4">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 block">
                07 · Tanya Jawab &amp; Glosarium
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 font-title tracking-tight mt-0.5">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/[0.03] divide-y divide-slate-900/[0.06] overflow-hidden">
            {faqs.map((item, idx) => {
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
              <SunnyMascot size={68} expression="happy" animated={true} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 font-title tracking-tight">
                Sains terbuka untuk keputusan energi yang tepat.
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                Dokumentasi ini diselaraskan berkala mengikuti regulasi Permen ESDM, tarif resmi PLN, dan standar teknik IEC/ISO.
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
        <p>© {new Date().getFullYear()} SunSight · Transparansi Metodologi &amp; Standar Data Energi Surya</p>
      </footer>
    </div>
  );
}
