"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setPendingScanIntent } from "@/lib/profile";

export default function QuickCalculator() {
  const router = useRouter();
  const [bill, setBill] = useState<number>(2_500_000);

  // Estimasi proporsional indikatif
  const tariff = 1700;
  const monthlyKwh = bill / tariff;
  const targetSolarKwh = monthlyKwh * 0.85;

  const kwpNeeded = Math.max(1.6, Math.round((targetSolarKwh / (4.2 * 30 * 0.8)) * 10) / 10);
  const monthlySaving = Math.round(bill * 0.85);
  const cumulative25 = monthlySaving * 12 * 25;
  const turnkeyCost = kwpNeeded * 13_500_000;
  const annualSaving = monthlySaving * 12;
  const paybackYears = Math.max(2.4, Math.round((turnkeyCost / annualSaving) * 10) / 10);
  const estimatedModules = Math.ceil(kwpNeeded / 0.55);

  const formatRp = (value: number) => new Intl.NumberFormat("id-ID").format(value);

  const handleOpenStudioWithBill = () => {
    setPendingScanIntent({ monthlyBillIdr: bill });
    router.push("/studio");
  };

  return (
    <section id="quick-calculator" className="py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header Apple-Style */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 border border-amber-200/70 text-amber-900 text-xs font-bold font-title">
          <span>Kalkulator Instan</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-title tracking-tight leading-[1.15]">
          Berapa penghematan Anda? <br />
          <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
            Hitung dalam hitungan detik.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Geser perkiraan tagihan listrik bulanan Anda untuk melihat gambaran kapasitas modul,
          penghematan, dan estimasi waktu balik modal.
        </p>
      </div>

      {/* Main Interactive Card (Radiant Soft Glow Apple Style) */}
      <div className="max-w-4xl mx-auto rounded-[32px] sm:rounded-[36px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_24px_60px_rgba(245,158,11,0.10),0_2px_12px_rgba(0,0,0,0.03)] p-6 sm:p-10">
        <div className="space-y-8">
          
          {/* Slider Control Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block font-title">
                Rata-Rata Tagihan Listrik PLN Bulanan
              </span>
              <div className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-title mt-1 font-code-metric">
                Rp {formatRp(bill)} <span className="text-sm sm:text-base font-normal text-slate-500">/ bulan</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1_000_000, 2_500_000, 5_000_000, 10_000_000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBill(preset)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold font-code-metric transition-all cursor-pointer ${
                    bill === preset
                      ? "bg-amber-100 text-amber-950 border border-amber-300/80 shadow-2xs"
                      : "bg-slate-100/80 hover:bg-slate-200/70 text-slate-600"
                  }`}
                >
                  Rp {preset >= 1_000_000 ? `${preset / 1_000_000} Jt` : `${preset / 1000} Rb`}
                </button>
              ))}
            </div>
          </div>

          {/* Range Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min="500000"
              max="15000000"
              step="100000"
              value={bill}
              onChange={(e) => setBill(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-code-metric">
              <span>Rp 500 Rb</span>
              <span>Rp 5 Jt</span>
              <span>Rp 10 Jt</span>
              <span>Rp 15 Jt</span>
            </div>
          </div>

          {/* Results Metric Grid (4 Apple-style Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-2">
            
            {/* Metric 1: Hemat Bulanan */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-50/70 to-amber-100/30 border border-amber-200/70">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block font-title">
                Estimasi Hemat
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-950 font-title mt-1 font-code-metric">
                Rp {formatRp(monthlySaving)}
              </div>
              <span className="text-[10px] text-amber-800 font-medium block mt-0.5">
                Hemat ~85% / bulan
              </span>
            </div>

            {/* Metric 2: Kapasitas Sistem */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-title">
                Kapasitas Sistem
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-title mt-1 font-code-metric">
                {kwpNeeded} <span className="text-xs font-normal text-slate-500">kWp</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                ~{estimatedModules} Modul 550W
              </span>
            </div>

            {/* Metric 3: Balik Modal */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-title">
                Balik Modal (BEP)
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-title mt-1 font-code-metric">
                {paybackYears} <span className="text-xs font-normal text-slate-500">Tahun</span>
              </div>
              <span className="text-[10px] text-emerald-800 font-medium block mt-0.5">
                Titik impas cepat
              </span>
            </div>

            {/* Metric 4: Hemat 25 Tahun */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block font-title">
                Total Hemat 25 Thn
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-title mt-1 font-code-metric">
                Rp {Math.round(cumulative25 / 1_000_000)} Jt
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                Proyeksi arus kas
              </span>
            </div>

          </div>

          {/* CTA Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 leading-relaxed text-center sm:text-left">
              Ingin hasil yang presisi berdasarkan ukuran atap nyata rumah Anda?
            </p>

            <button
              type="button"
              onClick={handleOpenStudioWithBill}
              className="w-full sm:w-auto h-12 px-6 rounded-full bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 hover:from-amber-200 hover:to-amber-300 text-amber-950 font-title text-xs sm:text-sm font-bold border border-amber-300/80 shadow-[0_4px_16px_rgba(245,158,11,0.20)] hover:shadow-[0_6px_22px_rgba(245,158,11,0.30)] hover:scale-[1.015] active:scale-[0.985] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Rancang Atap di Studio CAD</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
