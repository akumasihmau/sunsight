'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuickCalculator() {
  const router = useRouter();
  const [bill, setBill] = useState<number>(500000); // Set default ke 500rb seperti di gambar

  // Logika Kalkulasi (Sesuai rumus dari prototipe HTML)
  const tariff = 1700; // Tarif dasar PLN R-2
  const monthlyKwh = bill / tariff;
  const targetSolarKwh = monthlyKwh * 0.87;
  
  // Kapasitas (kWp)
  let kwpNeeded = Math.max(1.6, Math.round((targetSolarKwh / (4.5 * 30 * 0.8)) * 10) / 10);
  
  // Penghematan & Finansial
  const monthlySaving = Math.round(bill * 0.87);
  const cumulative25 = monthlySaving * 12 * 25;
  const turnkeyCost = kwpNeeded * 13500000;
  const annualSaving = monthlySaving * 12;
  const paybackYears = Math.max(3.8, Math.round((turnkeyCost / annualSaving) * 10) / 10);

  // Estimasi jumlah modul (asumsi 550W per modul = 0.55 kWp)
  const estimatedModules = Math.ceil(kwpNeeded / 0.55);

  const formatRp = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  const handleScan = () => {
    router.push('/studio');
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
          Geser perkiraan tagihan listrik PLN bulanan rumah Anda untuk melihat rekomendasi kapasitas PLTS, estimasi penghematan, dan masa balik modal secara langsung.
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
              {[1500000, 2800000, 5000000, 10000000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBill(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    bill === preset
                      ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                      : 'bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700'
                  }`}
                >
                  Rp {preset >= 1000000 ? preset / 1000000 + ' Jt' : preset / 1000 + ' Rb'}
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
            {/* Metric 1 */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-left">
              <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold mb-1">
                <span className="material-symbols-outlined text-[16px]">savings</span>
                <span>Hemat / Bulan</span>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-800 font-headline-sm block">
                Rp {formatRp(monthlySaving)}
              </span>
              <span className="text-[10px] text-emerald-700 mt-1 block font-medium">Potensi hemat hingga ~87%</span>
            </div>

            {/* Metric 2 */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-left">
              <div className="flex items-center gap-1.5 text-amber-900 text-[11px] font-bold mb-1">
                <span className="material-symbols-outlined text-[16px]">solar_power</span>
                <span>Rekomendasi Kapasitas</span>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-headline-sm block">
                {kwpNeeded.toFixed(1)} kWp
              </span>
              <span className="text-[10px] text-amber-800 mt-1 block font-medium">~{estimatedModules} Modul Surya Tier-1</span>
            </div>

            {/* Metric 3 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
              <div className="flex items-center gap-1.5 text-slate-700 text-[11px] font-bold mb-1">
                <span className="material-symbols-outlined text-[16px]">auto_graph</span>
                <span>Hemat 25 Tahun</span>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-headline-sm block">
                Rp {(cumulative25 / 1000000).toLocaleString('id-ID')} Juta
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block font-medium">Garansi performa modul 25 thn</span>
            </div>

            {/* Metric 4 */}
            <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200/90 text-left">
              <div className="flex items-center gap-1.5 text-sky-800 text-[11px] font-bold mb-1">
                <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                <span>Balik Modal (BEP)</span>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-sky-900 font-headline-sm block">
                ~{paybackYears.toFixed(1)} Tahun
              </span>
              <span className="text-[10px] text-sky-700 mt-1 block font-medium">20+ tahun listrik gratis setelahnya</span>
            </div>
          </div>

          {/* Action Button CTA */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 text-white">
            <div className="text-left">
              <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                Berdasarkan Aturan Tarif PLN & ESDM 2024
              </span>
              <p className="text-xs text-slate-300 mt-0.5">Ingin melihat posisi penataan panel di atap rumah Anda?</p>
            </div>
            <button 
              onClick={handleScan}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-title font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
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