import React from "react";

export default function SmartFeatures() {
  const features = [
    {
      id: "studio-ai",
      icon: "polyline",
      badge: "Studio CAD",
      title: "Pemetaan Atap Instan",
      desc: "Kenali kontur atap dari peta satelit, atur arah dan kemiringan, lalu susun panel otomatis sesuai ukuran asli.",
      highlight: "Ukuran meter nyata & tata letak instan",
    },
    {
      id: "webgis-bogor",
      icon: "map",
      badge: "Data Satelit",
      title: "Intensitas Surya Akurat",
      desc: "Menggunakan data radiasi NASA POWER & Global Solar Atlas agar estimasi produksi listrik tetap realistis sepanjang tahun.",
      highlight: "Terukur sesuai iklim lokal Bogor",
    },
    {
      id: "financial-roi",
      icon: "calculate",
      badge: "Finansial",
      title: "Hitung Balik Modal 25 Tahun",
      desc: "Lihat perkiraan biaya awal, penghematan tagihan listrik PLN, serta waktu balik modal secara transparan.",
      highlight: "Mengacu tarif resmi Permen ESDM 2024",
    },
    {
      id: "proposal-pdf",
      icon: "description",
      badge: "Siap Cetak",
      title: "Proposal PDF Lengkap",
      desc: "Unduh laporan kelayakan rapi dalam format A4 berisi spesifikasi modul, rancangan sistem, dan pengurangan emisi CO₂.",
      highlight: "Format standar siap diskusi ke teknisi",
    },
  ];

  return (
    <section id="features" className="py-18 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/85 backdrop-blur-xl border border-white/95 text-amber-900 text-xs font-semibold shadow-2xs">
          Fitur Utama
        </span>

        <h2 className="text-3xl sm:text-5xl font-semibold text-slate-900 font-title tracking-tight leading-[1.14]">
          Presisi tinggi.{" "}
          <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
            Tetap sederhana.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Semua yang Anda perlukan sebelum memutuskan memasang panel surya di satu tempat.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {features.map((item) => (
          <div
            key={item.id}
            className="group p-5 sm:p-8 rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_12px_32px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_48px_rgba(245,158,11,0.12)] transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 border border-amber-200/70 text-amber-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                </div>
                <span className="text-[11px] font-medium text-amber-900 bg-amber-50/90 px-2.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 font-title tracking-tight">
                {item.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {item.desc}
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-900/[0.06] flex items-center gap-2 text-xs font-medium text-amber-900">
              <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">check_circle</span>
              <span>{item.highlight}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
