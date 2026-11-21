import React from "react";

export default function Comparison() {
  const comparisonData = [
    {
      aspect: "Waktu Proses",
      manual: "3–7 hari kerja",
      sunsight: "Hitungan detik",
    },
    {
      aspect: "Keamanan Fisik",
      manual: "Harus naik ke atap secara manual",
      sunsight: "100% digital dari browser",
    },
    {
      aspect: "Biaya Studi Awal",
      manual: "Rp 500 rb – Rp 2 jt per survei",
      sunsight: "Gratis tanpa komitmen",
    },
    {
      aspect: "Akurasi Tata Letak",
      manual: "Perkiraan kasar di kertas",
      sunsight: "CAD skala meter nyata & setback otomatis",
    },
    {
      aspect: "Proyeksi Finansial",
      manual: "Hitungan statis satu arah",
      sunsight: "Kurva arus kas & BEP 25 tahun real-time",
    },
    {
      aspect: "Dokumen Output",
      manual: "Format penawaran tidak seragam",
      sunsight: "Proposal PDF ISO/IEC siap cetak",
    },
  ];

  return (
    <section id="comparison" className="py-18 sm:py-24 px-4 sm:px-6 max-w-5xl mx-auto">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/80 backdrop-blur-xl border border-white/90 text-amber-900 text-xs font-semibold shadow-2xs">
          Efisiensi Nyata
        </span>

        <h2 className="text-3xl sm:text-5xl font-semibold text-slate-900 font-title tracking-tight leading-[1.14]">
          Lebih cepat dari{" "}
          <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
            survei manual.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Perencanaan panel surya yang praktis, aman, dan jelas sejak langkah pertama.
        </p>
      </div>

      <div className="rounded-[28px] bg-white/80 backdrop-blur-2xl saturate-150 border border-white/90 shadow-[0_18px_48px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-900/[0.06] bg-slate-900/[0.03]">
                <th className="p-3.5 sm:p-5 font-semibold text-slate-700 w-1/3 font-title">
                  Aspek
                </th>
                <th className="p-3.5 sm:p-5 font-medium text-slate-400 w-1/3">
                  Konvensional
                </th>
                <th className="p-3.5 sm:p-5 font-semibold text-amber-950 bg-amber-50/75 w-1/3 font-title">
                  SunSight
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/[0.05]">
              {comparisonData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/[0.02] transition-colors">
                  <td className="p-3.5 sm:p-5 font-semibold text-slate-800 font-title">
                    {row.aspect}
                  </td>
                  <td className="p-3.5 sm:p-5 text-slate-500">
                    {row.manual}
                  </td>
                  <td className="p-3.5 sm:p-5 font-medium text-amber-950 bg-amber-50/35">
                    <span className="inline-flex items-start sm:items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5 sm:mt-0">check_circle</span>
                      <span>{row.sunsight}</span>
                    </span>
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
