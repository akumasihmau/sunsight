"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  LOCATION_PRESETS,
  resolveCoordinatesFromAddress,
  setPendingScanIntent,
  useStoredBiodata,
} from "@/lib/profile";

const SCAN_STEPS = [
  {
    phase: "PASS 1: UNDUH ORTOFOTO NADIR",
    detail: "Menyiapkan koordinat citra satelit & atribusi peta...",
    percent: 35,
  },
  {
    phase: "PASS 2: KALIBRASI SKALA PIKSEL",
    detail: "Menyelaraskan skala meter per piksel & batas bidang...",
    percent: 72,
  },
  {
    phase: "PASS 3: MEMBUKA STUDIO PLTS",
    detail: "Mengarahkan ke kanvas interaktif SunSight Studio...",
    percent: 100,
  },
];

export default function Hero() {
  const router = useRouter();
  const biodata = useStoredBiodata();

  const [address, setAddress] = useState("Jl. Diponegoro No. 24, Menteng, Jakarta Pusat");
  const [scanning, setScanning] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);

  const [epcModalOpen, setEpcModalOpen] = useState(false);
  const [epcSent, setEpcSent] = useState(false);

  const startScan = (event?: FormEvent) => {
    event?.preventDefault();
    if (scanning) return;

    const cleanAddress = address.trim() || LOCATION_PRESETS[0].address;
    const coords = resolveCoordinatesFromAddress(cleanAddress);

    setPendingScanIntent({
      address: cleanAddress,
      lat: coords.lat,
      lng: coords.lng,
    });

    setScanning(true);
    setScanStepIndex(0);

    window.setTimeout(() => setScanStepIndex(1), 420);
    window.setTimeout(() => setScanStepIndex(2), 860);
    window.setTimeout(() => {
      router.push("/studio");
    }, 1250);
  };

  const activeStep = SCAN_STEPS[scanStepIndex] ?? SCAN_STEPS[0];

  return (
    <div className="relative overflow-hidden pt-10 pb-12 sm:pt-14 sm:pb-16">
      {/* Subtle Calming Warm Sunrise Aura Glow */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-amber-100/40 via-amber-50/15 to-transparent pointer-events-none" />

      {/* Centered Editorial Value Proposition */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span>Platform Pintar Simulasi PLTS Atap Indonesia</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.18] font-headline-lg max-w-3xl mx-auto">
          Rancang PLTS Atap Rumah Anda <br className="hidden sm:inline" />
          dengan{" "}
          <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
            Tenang, Presisi, &amp; Instan
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Ketahui berapa rupiah tagihan listrik PLN yang bisa Anda hemat setiap bulan langsung dari
          citra satelit — terukur berdasarkan skala nyata tanpa perlu naik ke atap.
        </p>

        {/* Interactive Address Search Bar */}
        <div className="max-w-xl mx-auto pt-2">
          <form
            onSubmit={startScan}
            className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200 flex flex-col sm:flex-row gap-2 focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10 transition-all"
          >
            <div className="flex-1 relative flex items-center pl-3">
              <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0">
                location_on
              </span>
              <input
                className="seamless-input w-full px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent border-0 font-medium"
                placeholder="Masukkan alamat rumah atau perumahan..."
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={scanning}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-title text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm shadow-amber-500/25 border border-amber-400/40 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">search</span>
              <span>{scanning ? "Memuat..." : "Mulai Analisis"}</span>
            </button>
          </form>

          {/* Quick Location Chips */}
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="text-slate-400 text-[11px] font-medium">Contoh Simulasi:</span>
            {LOCATION_PRESETS.slice(0, 4).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setAddress(preset.address)}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 text-xs font-medium transition cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bento Showcase: 3 Pilar Utama */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1 (Spans 2 cols): Studio Desain Atap */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => startScan()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") startScan();
            }}
            className="md:col-span-2 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between min-h-[230px] border border-sky-100 bg-[#f0f6fe] transition-all hover:shadow-md group cursor-pointer"
          >
            <div className="relative z-10 max-w-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full inline-block mb-2 font-title">
                Studio Citra Satelit
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug group-hover:text-sky-950 transition">
                Desain tata letak panel langsung di atap rumah Anda.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
                Tandai bidang atap di atas citra satelit nyata, sesuaikan arah kompas azimuth,
                setback tepi, dan jalur talang untuk melihat susunan kisi panel secara langsung.
              </p>
              <div className="mt-5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sky-200 text-sky-900 text-xs font-bold shadow-2xs group-hover:bg-sky-50 transition">
                  <span>Coba Studio Sekarang</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </div>

            {/* Satellite + Blueprint Preview Card */}
            <div className="hidden sm:block absolute right-5 bottom-5 w-48 opacity-95 group-hover:scale-105 transition-all duration-300 pointer-events-none">
              <div className="rounded-2xl border border-sky-200 bg-slate-950 overflow-hidden shadow-lg relative h-36">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-60"
                  style={{ backgroundImage: "url('/satellite_map.jpg')" }}
                />
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-radar" />
                <div className="relative z-10 p-2.5 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[8.5px] font-mono text-amber-300 font-bold bg-black/65 px-2 py-0.5 rounded">
                    <span>BIDANG ATAP</span>
                    <span>12m × 8m</span>
                  </div>
                  <div className="mx-auto w-28 p-1.5 rounded border border-amber-400/80 bg-sky-950/55 grid grid-cols-4 gap-1">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-3 rounded-[2px] bg-sky-400/85 border border-sky-200/40" />
                    ))}
                  </div>
                  <div className="text-[8.5px] font-mono text-emerald-300 font-bold text-right bg-black/65 px-2 py-0.5 rounded">
                    ✓ Kalkulasi Real-time
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 2: Kalkulator Tagihan PLN */}
          <a
            href="#quick-calculator"
            className="rounded-3xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between min-h-[230px] border border-amber-100 bg-[#fdfaf3] transition-all hover:shadow-md group"
          >
            <div className="relative z-10 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block font-title">
                Kalkulator Tagihan
              </span>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-900 transition">
                Estimasi penghematan listrik bulanan instan.
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Perhitungan balik modal (payback) dan rincian CAPEX berdasarkan katalog tarif resmi
                PLN.
              </p>
            </div>
            <div className="pt-4">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:text-amber-800">
                <span>Hitung Potensi Hemat</span>
                <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              </span>
            </div>
          </a>

          {/* Pillar 3: Proposal Teknis & Kontraktor EPC */}
          <div className="md:col-span-3 rounded-3xl p-6 sm:p-7 border border-slate-200/90 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-title">
                  Proposal Teknis Resmi &amp; Mitra EPC Terverifikasi
                </h3>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  Cetak ringkasan kelayakan teknis dan rincian CAPEX langsung dari hasil simulasi
                  server, serta konsultasikan pemasangan dengan mitra kontraktor EPC bersertifikasi.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => startScan()}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-title text-xs font-semibold shadow-sm shadow-amber-500/25 border border-amber-400/40 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">description</span>
                <span>Buka Studio &amp; Proposal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEpcSent(false);
                  setEpcModalOpen(true);
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-title text-xs font-semibold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">handshake</span>
                <span>Mitra EPC</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Satellite Scanning HUD Overlay */}
      {scanning && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {activeStep.phase}
              </span>
              <span className="text-xs font-mono text-amber-400 font-bold">
                {activeStep.percent}%
              </span>
            </div>

            <div className="relative h-40 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-55"
                style={{ backgroundImage: "url('/satellite_map.jpg')" }}
              />
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_16px_rgba(251,191,36,0.95)] animate-radar" />
              <div className="absolute bottom-2.5 left-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-black/80 border border-slate-800 text-[11px] font-mono text-slate-200 truncate">
                📍 {address}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-300 font-medium">{activeStep.detail}</p>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-sky-400 transition-all duration-300 rounded-full"
                  style={{ width: `${activeStep.percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mitra EPC Consultation Modal */}
      {epcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[20px]">verified</span>
                <h3 className="font-title font-bold text-slate-900 text-sm">
                  Konsultasi Mitra Kontraktor EPC
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEpcModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {epcSent ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[28px]">check_circle</span>
                </div>
                <h4 className="font-title font-bold text-slate-900 text-base">
                  Permintaan Konsultasi Tercatat!
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lanjutkan ke <strong>Studio PLTS</strong> untuk menghitung kapasitas atap secara
                  presisi dan mencetak dokumen proposal teknis resmi Anda.
                </p>
                <div className="pt-2 flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setEpcModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEpcModalOpen(false);
                      startScan();
                    }}
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold font-title cursor-pointer shadow-sm shadow-amber-500/25 border border-amber-400/40"
                  >
                    Buka Studio Sekarang
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEpcSent(true);
                }}
                className="p-5 space-y-3.5 text-left"
              >
                <p className="text-xs text-slate-600 bg-amber-50 border border-amber-200/80 rounded-xl p-3 leading-relaxed">
                  Mitra EPC resmi bersertifikat ESDM siap membantu survei fisik dan pengurusan
                  perizinan PLN setelah Anda membuat simulasi atap di Studio.
                </p>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    defaultValue={biodata?.name ?? ""}
                    placeholder="Contoh: Budi Santoso"
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    defaultValue={biodata?.phone ?? ""}
                    placeholder="Contoh: 0812-8899-7722"
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Lokasi Pemasangan
                  </label>
                  <input
                    type="text"
                    required
                    defaultValue={biodata?.location ?? address}
                    className="input"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-title font-bold text-xs transition cursor-pointer"
                >
                  Kirim Permintaan Penawaran
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
