import React from "react";

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: "near_me",
      title: "Pilih Lokasi & Atap",
      desc: "Ketik alamat rumah Anda di Kota Bogor untuk memuat citra satelit beresolusi tinggi dan tentukan bidang atap yang ingin dianalisis.",
    },
    {
      num: "02",
      icon: "solar_power",
      title: "Simulasi Tata Letak Panel",
      desc: "AI otomatis mendeteksi kontur bidang atap, menghitung kapasitas modul surya maksimal, dan menyesuaikan sudut kemiringan (tilt & azimuth).",
    },
    {
      num: "03",
      icon: "request_quote",
      title: "Ketahui Hemat & Unduh Proposal",
      desc: "Lihat proyeksi penghematan tagihan PLN, estimasi waktu balik modal 25 tahun, dan unduh dokumen proposal PDF resmi siap pakai.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[#F4F3EE]/60 border-y border-amber-200/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Header Apple-Style */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 border border-amber-200/70 text-amber-900 text-xs font-bold font-title">
            <span>Alur Kerja Cepat</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-title tracking-tight leading-[1.15]">
            Tiga langkah mudah. <br />
            <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
              Hasil langsung di tangan.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Dari citra satelit hingga proposal tekno-ekonomis siap cetak,
            semua dapat diselesaikan tanpa perlu naik ke atap.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative p-8 rounded-[30px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.05)] hover:shadow-[0_20px_50px_rgba(245,158,11,0.10)] transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">{step.icon}</span>
                  </div>
                  <span className="text-2xl font-extrabold text-slate-200 font-title font-code-metric">
                    {step.num}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 font-title mb-2.5">
                  {step.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100/80 flex items-center gap-1.5 text-xs font-bold text-amber-900 font-title">
                <span>Langkah {step.num}</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
