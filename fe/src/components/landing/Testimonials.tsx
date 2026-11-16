import React from "react";

export default function Testimonials() {
  const testimonials = [
    {
      id: 1,
      quote: "Tagihan listrik rumah saya turun signifikan dan dokumen proposal PDF-nya sangat rapi saat kami konsultasikan ke teknisi.",
      initials: "HK",
      name: "Hendra Kusuma",
      details: "Bogor Tengah · Hunian 5.500 VA",
    },
    {
      id: 2,
      quote: "Fitur kompas azimuth dan deteksi atapnya sangat membantu menentukan bidang mana yang paling optimal sebelum survei.",
      initials: "RD",
      name: "Dr. Ratna Dewi",
      details: "Bogor Timur · Hunian 3.500 VA",
    },
    {
      id: 3,
      quote: "Penataan modul di Studio CAD praktis sekali. Dalam hitungan menit kapasitas maksimal dan periode balik modal sudah terlihat.",
      initials: "EF",
      name: "Ir. Edwin Firmansyah",
      details: "Tanah Sareal · Komersial 16,5 kVA",
    },
  ];

  return (
    <section id="testimonials" className="py-18 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/80 backdrop-blur-xl border border-white/90 text-amber-900 text-xs font-semibold shadow-2xs">
          Pengalaman Pengguna
        </span>

        <h2 className="text-3xl sm:text-5xl font-semibold text-slate-900 font-title tracking-tight leading-[1.14]">
          Dipercaya pemilik hunian{" "}
          <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
            &amp; usaha di Bogor.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Pengalaman langsung mereka yang merencanakan transisi energi surya bersama SunSight.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {testimonials.map((item) => (
          <div
            key={item.id}
            className="p-7 rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_12px_32px_rgba(15,23,42,0.04)] flex flex-col justify-between"
          >
            <div className="space-y-3.5">
              <div className="text-amber-500 text-xs tracking-widest">★★★★★</div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-900/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-100 to-yellow-200 text-amber-950 font-semibold flex items-center justify-center text-xs font-title">
                {item.initials}
              </div>
              <div>
                <span className="font-semibold text-slate-900 text-xs sm:text-sm block font-title">
                  {item.name}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {item.details}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
