import React from "react";

export default function SmartFeatures() {
  const features = [
    {
      id: "studio-ai",
      icon: "polyline",
      badge: "CAD Interaktif",
      title: "Studio CAD Atap AI",
      desc: "Deteksi poligon kontur atap otomatis dengan AI, sesuaikan sudut kemiringan (tilt) dan arah azimuth kompas, serta tata letak modul surya secara instan.",
      highlight: "Skala meter nyata & kalkulasi modul real-time",
    },
    {
      id: "webgis-bogor",
      icon: "map",
      badge: "WebGIS Satelit",
      title: "Peta Potensi Radiasi Kota Bogor",
      desc: "Eksplorasi peta satelit beresolusi tinggi dengan data radiasi harian dan sebaran instalasi PLTS aktif di 6 kecamatan Kota Bogor.",
      highlight: "Data iradiasi spesifik iklim tropis Kota Bogor",
    },
    {
      id: "financial-roi",
      icon: "calculate",
      badge: "Analisis Finansial",
      title: "Proyeksi Arus Kas 25 Tahun",
      desc: "Perhitungan nilai investasi (Capex), penghematan tagihan bulanan PLN, dan estimasi waktu balik modal (BEP) secara transparan tanpa biaya tersembunyi.",
      highlight: "Sesuai tarif resmi PLN & regulasi ESDM",
    },
    {
      id: "proposal-pdf",
      icon: "description",
      badge: "Dokumen Resmi",
      title: "Ekspor Proposal PDF Sekali Klik",
      desc: "Dapatkan dokumen proposal tekno-ekonomis berstandar profesional siap cetak (1:1 format print) untuk pengajuan pembiayaan atau instalasi fisik.",
      highlight: "Format A4 rapi lengkap dengan spesifikasi teknis",
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header Section Apple-Style */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 border border-amber-200/70 text-amber-900 text-xs font-bold font-title">
          <span>Kecerdasan SunSight</span>
        </div>
        
        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-title tracking-tight leading-[1.15]">
          Fitur canggih. <br />
          <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
            Dirancang sederhana.
          </span>
        </h2>
        
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Setiap instrumen dirancang untuk memberikan kepastian dan akurasi nyata
          sebelum Anda berinvestasi pada sistem panel surya.
        </p>
      </div>

      {/* Grid Features (Radiant Soft Glow Apple Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {features.map((item) => (
          <div
            key={item.id}
            className="group relative p-7 sm:p-9 rounded-[30px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.04),0_2px_12px_rgba(245,158,11,0.06)] hover:shadow-[0_24px_50px_rgba(245,158,11,0.12)] hover:border-amber-200/80 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200/80 border border-amber-300/60 text-amber-950 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                </div>
                <span className="text-[11px] font-bold text-amber-900/80 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60 font-code-metric">
                  {item.badge}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 font-title tracking-tight">
                {item.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {item.desc}
              </p>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-amber-950/90 font-code-metric">
              <span className="material-symbols-outlined text-[16px] text-amber-600">check_circle</span>
              <span>{item.highlight}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
