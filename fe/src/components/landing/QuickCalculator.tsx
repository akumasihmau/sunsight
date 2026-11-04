"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setPendingScanIntent } from "@/lib/profile";

export default function QuickCalculator() {
  const router = useRouter();
  const [bill, setBill] = useState<number>(2_800_000);

  // Estimasi cepat indikatif di halaman beranda (perhitungan resmi dilakukan server di /studio)
  const tariff = 1700;
  const monthlyKwh = bill / tariff;
  const targetSolarKwh = monthlyKwh * 0.87;

  const kwpNeeded = Math.max(1.6, Math.round((targetSolarKwh / (4.5 * 30 * 0.8)) * 10) / 10);

  const monthlySaving = Math.round(bill * 0.87);
  const cumulative25 = monthlySaving * 12 * 25;
  const turnkeyCost = kwpNeeded * 13_500_000;
  const annualSaving = monthlySaving * 12;
  const paybackYears = Math.max(3.8, Math.round((turnkeyCost / annualSaving) * 10) / 10);

  const estimatedModules = Math.ceil(kwpNeeded / 0.55);

  const formatRp = (value: number) => new Intl.NumberFormat("id-ID").format(value);

  const handleOpenStudioWithBill = () => {
    setPendingScanIntent({ monthlyBillIdr: bill });
    router.push("/studio");
  };

  return (
    <section id="quick-calculator" className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
        <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          Kalkulator Instan
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-headline-lg">
          Berapa Penghematan yang Bisa Anda Dapatkan?
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Geser perkiraan tagihan listrik PLN bulanan rumah Anda untuk melihat gambaran awal
          kapasitas PLTS, lalu lanjutkan ke Studio untuk perhitungan server yang presisi sesuai
          ukuran atap Anda.
        </p>
      </div>

      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="space-y-6">
          {/* Slider Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Rata-rata Tagihan Listrik PLN / Bulan
              </label>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-headline-sm">
                Rp {formatRp(bill)} / bulan
              </span>
            </div>
            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1_500_000, 2_800_000, 5_000_000, 10_000_000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBill(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    bill === preset
                      ? "bg-amber-100 text-amber-900 font-bold border border-amber-300"
                      : "bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700"
                  }`}
                >
                  Rp {preset >= 1_000_000 ? `${preset / 1_000_000} Jt` : `${preset / 1000} Rb`}
                </button>
              ))}
            </div>
          </div>

          {/* Range Input */}
          <div className="space-y-2">
            <input
              type="range"
              min="500000"
              max="15000000"
              step="100000"
              value={bill}
              onChange={(e) => setBill(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <div className="flex justify-between font-code-metric text-[10px] text-slate-400">
              <span>Min (Rp 500 Ribu)</span>
              <span>Standar Rumah (Rp 2,8 Juta)</span>
              <span>Maks (Rp 15 Juta)</span>
            </div>
          </div>

          {/* Output Metric Cards (4 Grid) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-left">
              <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold mb-1">
                <span className="material-symbols-outlined text-[16px]">savings</span>
                <span>Estimasi Hemat / Bln</span>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-800 font-headline-sm block">
                Rp {formatRp(monthlySaving)}
              </span>
              <span className="text-[10px] text-emerald-700 mt-1 block font-medium">
                Gambaran awal sebelum batas luas atap
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-left">
              <div className="flex items-center gap-1.5 text-amber-900 text-[11px] font-bold mb-1">
                <span className="material-symbols-outlined text-[16px]">solar_power</span>
                <span>Target Kapasitas</span>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-headline-sm block">
                {kwpNeeded.toFixed(1)} kWp
              </span>
              <span className="text-[10px] text-amber-800 mt-1 block font-medium">
                ~{estimatedModules} Modul Surya Tier-1
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
              <div className="flex items-center gap-1.5 text-slate-700 text-[11px] font-bold mb-1">
                <span className="material-symbols-outlined text-[16px]">auto_graph</span>
                <span>Akumulasi 25 Tahun</span>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-headline-sm block">
                Rp {(cumulative25 / 1_000_000).toLocaleString("id-ID")} Juta
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                Masa pakai performa modul 25 thn
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-left">
              <div className="flex items-center gap-1.5 text-amber-900 text-[11px] font-bold mb-1">
                <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                <span>Estimasi Payback</span>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-headline-sm block">
                ~{paybackYears.toFixed(1)} Tahun
              </span>
              <span className="text-[10px] text-amber-800 mt-1 block font-medium">
                Dihitung presisi di Studio
              </span>
            </div>
          </div>

          {/* Action Button CTA */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 via-white/80 to-amber-50/50 backdrop-blur-md border border-amber-200/80 text-slate-900 shadow-sm">
            <div className="text-left">
              <span className="text-xs text-amber-800 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                Terhubung Langsung ke Mesin Simulasi Studio
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                Tagihan Rp {formatRp(bill)} akan otomatis dibawa ke parameter simulasi atap Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenStudioWithBill}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-title font-semibold text-xs sm:text-sm shadow-sm shadow-amber-500/25 border border-amber-400/40 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Desain Tata Letak Atap Ini</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
