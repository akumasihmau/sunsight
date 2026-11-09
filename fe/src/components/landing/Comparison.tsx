import React from "react";

export default function Comparison() {
  const comparisonData = [
    {
      aspect: "Waktu Proses",
      manual: "3 hingga 7 hari kerja",
      sunsight: "Kurang dari 3 detik (Instan)",
    },
    {
      aspect: "Keamanan Fisik",
      manual: "Harus panjat atap genteng secara manual",
      sunsight: "100% digital aman dari browser",
    },
    {
      aspect: "Biaya Studi Awal",
      manual: "Rp 500.000 – Rp 2.000.000 per survei",
      sunsight: "100% gratis tanpa komitmen",
    },
    {
      aspect: "Akurasi Penataan Modul",
      manual: "Perkiraan kasar di atas kertas",
      sunsight: "CAD interaktif dengan skala meter nyata",
    },
    {
      aspect: "Proyeksi Balik Modal (BEP)",
      manual: "Estimasi statis satu arah",
      sunsight: "Kurva finansial real-time 25 tahun",
    },
    {
      aspect: "Format Laporan",
      manual: "Surat penawaran non-standar",
      sunsight: "Ekspor proposal PDF resmi siap cetak",
    },
  ];

  return (
    <section id="comparison" className="py-20 sm:py-28 px-4 sm:px-6 max-w-5xl mx-auto">
      {/* Header Apple-Style */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 border border-amber-200/70 text-amber-900 text-xs font-bold font-title">
          <span>Efisiensi Nyata</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-title tracking-tight leading-[1.15]">
          Cara konvensional vs. <br />
          <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
            SunSight.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Lihat bagaimana kami menyederhanakan proses perencanaan PLTS atap
          menjadi cepat, aman, dan tanpa biaya survei awal.
        </p>
      </div>

      {/* Comparison Table (Apple Minimalist Glass) */}
      <div className="rounded-[32px] bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.06),0_2px_12px_rgba(245,158,11,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="p-4 sm:p-5 font-bold text-slate-700 w-1/3 font-title">
                  Aspek Analisis
                </th>
                <th className="p-4 sm:p-5 font-semibold text-slate-400 w-1/3">
                  Survei Manual Konvensional
                </th>
                <th className="p-4 sm:p-5 font-bold text-amber-950 bg-amber-50/70 border-l border-amber-200/60 w-1/3 font-title">
                  SunSight
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisonData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-slate-800 font-title">
                    {row.aspect}
                  </td>
                  <td className="p-4 sm:p-5 text-slate-500">
                    {row.manual}
                  </td>
                  <td className="p-4 sm:p-5 font-semibold text-amber-950 bg-amber-50/30 border-l border-amber-200/50 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">check_circle</span>
                    <span>{row.sunsight}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
