import React from "react";

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: "near_me",
      title: "Cari Alamat Rumah",
      desc: "Masukkan alamat atau nama jalan untuk memuat peta satelit atap Anda, lalu tandai area atap.",
    },
    {
      num: "02",
      icon: "solar_power",
      title: "Atur Tata Letak Panel",
      desc: "Sesuaikan arah dan kemiringan; jumlah modul dan kapasitas langsung terhitung otomatis.",
    },
    {
      num: "03",
      icon: "description",
      title: "Unduh Proposal PDF",
      desc: "Lihat perkiraan hemat bulanan, waktu balik modal, lalu unduh ringkasan proposal siap cetak.",
    },
  ];

  return (
    <section id="how-it-works" className="py-18 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/85 backdrop-blur-xl border border-white/95 text-amber-900 text-xs font-semibold shadow-2xs">
          Cara Kerja
        </span>

        <h2 className="text-3xl sm:text-5xl font-semibold text-slate-900 font-title tracking-tight leading-[1.14]">
          Tiga langkah.{" "}
          <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
            Langsung jadi.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Dari peta satelit hingga dokumen proposal tanpa perlu naik ke atap.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {steps.map((step) => (
          <div
            key={step.num}
            className="p-5 sm:p-6 lg:p-7 rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_12px_32px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_48px_rgba(245,158,11,0.10)] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">{step.icon}</span>
                </div>
                <span className="text-xl font-semibold text-slate-300 font-title font-code-metric tabular-nums">
                  {step.num}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 font-title tracking-tight mb-2">
                {step.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
