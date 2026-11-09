import React from "react";

export default function Testimonials() {
  const testimonials = [
    {
      id: 1,
      quote: "Tagihan listrik rumah saya di Bogor Tengah turun dari Rp 2,8 juta menjadi sekitar 400 ribuan per bulan. Dokumen proposalnya sangat rapi dan detail saat kami konsultasikan ke teknisi.",
      initials: "HK",
      name: "Hendra Kusuma",
      details: "Pajajaran, Bogor Tengah • Rumah Tinggal 5.500 VA",
    },
    {
      id: 2,
      quote: "Fitur kompas arah azimuth dan deteksi atapnya sangat membantu. Kami langsung tahu bagian atap mana yang menerima radiasi matahari Kota Bogor paling optimal tanpa perlu biaya survei.",
      initials: "RD",
      name: "Dr. Ratna Dewi",
      details: "Baranangsiang, Bogor Timur • Rumah Tinggal 3.500 VA",
    },
    {
      id: 3,
      quote: "Sebagai pengelola ruko komersial, simulasi kisi modul di Studio CAD sangat praktis. Dalam hitungan menit kapasitas maksimal atap sudah terhitung beserta proyeksi waktu balik modalnya.",
      initials: "EF",
      name: "Ir. Edwin Firmansyah",
      details: "Sholeh Iskandar, Tanah Sareal • Ruko Komersial 16.5 kVA",
    },
  ];

  return (
    <section id="testimonials" className="py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header Apple-Style */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/90 border border-amber-200/70 text-amber-900 text-xs font-bold font-title">
          <span>Pengalaman Pengguna</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-title tracking-tight leading-[1.15]">
          Dipercaya pemilik hunian <br />
          <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
            dan usaha di Kota Bogor.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Dengar langsung pengalaman mereka yang telah merencanakan peralihan
          ke energi surya bersama SunSight.
        </p>
      </div>

      {/* Testimonials Grid (Apple Minimalist Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {testimonials.map((item) => (
          <div
            key={item.id}
            className="p-7 sm:p-8 rounded-[30px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.03),0_2px_12px_rgba(245,158,11,0.05)] hover:shadow-[0_20px_50px_rgba(245,158,11,0.10)] transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-1 text-amber-500 text-sm">
                {"★★★★★"}
              </div>
              
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                &ldquo;{item.quote}&rdquo;
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-amber-950 font-bold flex items-center justify-center text-xs font-title shadow-2xs">
                {item.initials}
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xs sm:text-sm block font-title">
                  {item.name}
                </span>
                <span className="text-[11px] text-slate-400 block">
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
