export default function Testimonials() {
  const testimonials = [
    {
      id: 1,
      quote: `"Tagihan listrik PLN saya dari Rp 3,2 juta per bulan sekarang cuma sisa 450 ribuan. Proposal dari SunSight sangat detail dan langsung diterima bank untuk pembiayaan hijau."`,
      initials: "HK",
      avatarColor: "bg-amber-100 text-amber-800",
      name: "Hendra Kusuma",
      details: "Menteng, Jakarta Pusat • Daya 5.500 VA",
    },
    {
      id: 2,
      quote: `"Fitur kompas azimuth dan deteksi bayangan pohonnya luar biasa membantu. Kami bisa menghindari bagian atap yang tertutup bayangan pohon tetangga tanpa perlu keluar biaya survei."`,
      initials: "RD",
      avatarColor: "bg-emerald-100 text-emerald-800",
      name: "Dr. Ratna Dewi",
      details: "BSD City, Tangerang • Daya 3.500 VA",
    },
    {
      id: 3,
      quote: `"Sebagai pengelola ruko komersial, fitur clearance rintangan AC chiller sangat krusial. Dalam 2 menit kami tahu persis kapasitas maksimal atap tanpa perlu membahayakan staf naik ke atas."`,
      initials: "EF",
      avatarColor: "bg-sky-100 text-sky-800",
      name: "Ir. Edwin Firmansyah",
      details: "Cikarang, Jawa Barat • Ruko Komersial 22 kVA",
    },
  ];

  return (
    <section id="testimonials" className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
        <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
          Kisah Nyata
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-headline-lg">
          Dipercaya Ribuan Pemilik Rumah & Bisnis
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Dengar langsung pengalaman mereka yang telah beralih ke energi surya bersama SunSight.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((item) => (
          <div key={item.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex text-amber-400 text-sm">★★★★★</div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
                {item.quote}
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-xs ${item.avatarColor}`}>
                {item.initials}
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xs block">{item.name}</span>
                <span className="text-[11px] text-slate-500">{item.details}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}