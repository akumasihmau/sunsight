"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setPendingScanIntent } from "@/lib/profile";

export default function QuickCalculator() {
  const router = useRouter();
  const [bill, setBill] = useState<number>(2_500_000);

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
    <section id="quick-calculator" className="py-18 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/80 backdrop-blur-xl border border-white/90 text-amber-900 text-xs font-semibold shadow-2xs">
          Kalkulator Instan
        </span>

        <h2 className="text-3xl sm:text-5xl font-semibold text-slate-900 font-title tracking-tight leading-[1.14]">
          Hitung potensi{" "}
          <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
            hemat Anda.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Geser tagihan listrik bulanan untuk cek kapasitas surya dan perkiraan balik modal.
        </p>
      </div>

      {/* Frosted Glass Calculator Card */}
      <div className="max-w-4xl mx-auto rounded-[30px] bg-white/80 backdrop-blur-2xl saturate-150 border border-white/90 shadow-[0_20px_56px_rgba(245,158,11,0.10),0_4px_18px_rgba(15,23,42,0.05),inset_0_1px_1px_rgba(255,255,255,0.92)] p-6 sm:p-9 space-y-7">
        {/* Slider Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-900/[0.06]">
          <div>
            <span className="text-xs font-medium text-slate-500 block">
              Tagihan Listrik PLN per Bulan
            </span>
            <div className="text-2xl sm:text-4xl font-semibold text-slate-900 font-title mt-1 font-code-metric tabular-nums">
              Rp {formatRp(bill)} <span className="text-sm font-normal text-slate-400">/bln</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[1_000_000, 2_500_000, 5_000_000, 10_000_000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setBill(preset)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold font-code-metric tabular-nums transition-all cursor-pointer ${
                  bill === preset
                    ? "bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 text-amber-950 border border-amber-300/80 shadow-2xs"
                    : "bg-slate-900/[0.045] hover:bg-slate-900/[0.08] text-slate-600"
                }`}
              >
                Rp {preset >= 1_000_000 ? `${preset / 1_000_000} jt` : `${preset / 1000} rb`}
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
            aria-label="Tagihan listrik bulanan"
            className="w-full h-2.5 bg-slate-900/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-code-metric tabular-nums">
            <span>Rp 500 rb</span>
            <span>Rp 5 jt</span>
            <span>Rp 10 jt</span>
            <span>Rp 15 jt</span>
          </div>
        </div>

        {/* Unified 4-Cell Metric Strip (Zero Nested Boxes) */}
        <div className="rounded-2xl bg-slate-900/[0.035] grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-900/[0.07]">
          <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/70 to-transparent rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none">
            <span className="text-[11px] font-medium text-amber-900 block">Estimasi Hemat</span>
            <div className="text-xl sm:text-2xl font-semibold text-amber-950 font-title mt-1 font-code-metric tabular-nums">
              Rp {formatRp(monthlySaving)}
            </div>
            <span className="text-[11px] text-amber-800 block mt-0.5">~85% / bulan</span>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-medium text-slate-500 block">Kapasitas</span>
            <div className="text-xl sm:text-2xl font-semibold text-slate-900 font-title mt-1 font-code-metric tabular-nums">
              {kwpNeeded} <span className="text-xs font-normal text-slate-500">kWp</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">~{estimatedModules} panel 550 Wp</span>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-medium text-slate-500 block">Balik Modal</span>
            <div className="text-xl sm:text-2xl font-semibold text-emerald-700 font-title mt-1 font-code-metric tabular-nums">
              {paybackYears} <span className="text-xs font-normal text-slate-500">tahun</span>
            </div>
            <span className="text-[11px] text-emerald-700 block mt-0.5">Titik impas (BEP)</span>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-medium text-slate-500 block">Nilai 25 Tahun</span>
            <div className="text-xl sm:text-2xl font-semibold text-slate-900 font-title mt-1 font-code-metric tabular-nums">
              Rp {Math.round(cumulative25 / 1_000_000)} jt
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Proyeksi kumulatif</span>
          </div>
        </div>

        {/* Action Strip */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-900/[0.06]">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Ingin simulasi akurat sesuai ukuran dan kemiringan atap Anda?
          </p>

          <button
            type="button"
            onClick={handleOpenStudioWithBill}
            className="w-full sm:w-auto h-11 px-6 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 font-title text-xs sm:text-sm font-semibold border border-amber-300/80 shadow-[0_6px_18px_rgba(245,158,11,0.22),inset_0_1px_1px_rgba(255,255,255,0.88)] hover:scale-[1.015] active:scale-[0.985] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>Rancang di Studio CAD</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </section>
  );
}
