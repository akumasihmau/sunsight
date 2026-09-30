export default function Comparison() {
  const comparisonData = [
    {
      id: 1,
      aspect: "Waktu Proses Analisis",
      manual: "3 s.d. 7 Hari Kerja",
      manualColor: "text-slate-500",
      sunsight: "⚡ < 3 Detik (Instan)",
    },
    {
      id: 2,
      aspect: "Risiko Keamanan Fisik",
      manual: "Tinggi (Harus panjat atap genteng)",
      manualColor: "text-rose-600 font-medium",
      sunsight: "🛡️ 100% Aman Digital dari Browser",
    },
    {
      id: 3,
      aspect: "Biaya Studi Awal",
      manual: "Rp 500.000 - Rp 2.000.000",
      manualColor: "text-slate-500",
      sunsight: "🎁 100% Gratis Tanpa Komitmen",
    },
    {
      id: 4,
      aspect: "Penataan Modul & Rintangan",
      manual: "Sketsa perkiraan kasar",
      manualColor: "text-slate-500",
      sunsight: "📐 CAD Interaktif (Chiller & Skylight)",
    },
    {
      id: 5,
      aspect: "Kalkulasi Titik Impas (BEP)",
      manual: "Estimasi tabel statis",
      manualColor: "text-slate-500",
      sunsight: "📊 Kurva Finansial Real-time 25 Thn",
    },
    {
      id: 6,
      aspect: "Format Laporan Penawaran",
      manual: "Format surat penawaran manual",
      manualColor: "text-slate-500",
      sunsight: "📄 Ekspor Proposal PDF Resmi 1-Klik",
    },
  ];

  return (
    <section id="comparison" className="py-16 sm:py-20 bg-slate-100/60 border-y border-slate-200/70">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider">
            Komparasi Efisiensi
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-headline-lg">
            Mengapa Memilih SunSight AI?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Lihat bagaimana platform digital kami merevolusi cara pemilik rumah dan EPC merencanakan PLTS atap.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-900 text-white font-title">
                  <th className="p-4 sm:p-5 font-bold w-1/3">Aspek Penilaian</th>
                  <th className="p-4 sm:p-5 font-bold w-1/3 text-slate-300">Survei Manual Tradisional</th>
                  <th className="p-4 sm:p-5 font-bold w-1/3 text-amber-400 bg-slate-800/80">SunSight AI Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonData.map((row) => (
                  <tr key={row.id}>
                    <td className="p-4 sm:p-5 font-semibold text-slate-800">
                      {row.aspect}
                    </td>
                    <td className={`p-4 sm:p-5 ${row.manualColor}`}>
                      {row.manual}
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-700 bg-amber-50/40">
                      {row.sunsight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}