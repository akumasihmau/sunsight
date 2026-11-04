export default function HowItWorks() {
  const steps = [
    {
      num: 1,
      colorClass: "bg-amber-500 shadow-amber-500/20",
      title: "Masukkan Koordinat Lokasi",
      desc: "Pilih contoh lokasi atau masukkan lintang dan bujur rumah Anda untuk memuat citra satelit beresolusi tinggi beserta skala pikselnya.",
    },
    {
      num: 2,
      colorClass: "bg-slate-900 shadow-slate-900/20",
      title: "Tandai Bidang & Sudut Atap",
      desc: "Geser dan ubah ukuran persegi bidang atap pada kanvas, lalu masukkan kemiringan bidang, arah hadap kompas azimuth, setback, dan talang.",
    },
    {
      num: 3,
      colorClass: "bg-emerald-600 shadow-emerald-600/20",
      title: "Simulasi Kisi Modul & ROI",
      desc: "Server menghitung jumlah modul terpasang, iradiasi NASA POWER, rincian CAPEX, penghematan tagihan PLN, dan masa balik modal secara real-time.",
    },
    {
      num: 4,
      colorClass: "bg-sky-600 shadow-sky-600/20",
      title: "Simpan Riwayat & Cetak Proposal",
      desc: "Simpan hasil analisis ke riwayat akun Anda dan cetak ringkasan proposal teknis siap pakai kapan saja.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-slate-100/60 border-y border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
            Proses Cepat &amp; Presisi
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-headline-lg">
            4 Langkah Mudah Menuju Listrik Mandiri
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Dari citra satelit hingga proposal teknis siap cetak, semua dapat diselesaikan langsung
            melalui browser Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative group hover:-translate-y-1 transition-transform"
            >
              <div
                className={`w-12 h-12 rounded-xl text-white font-title font-extrabold text-lg flex items-center justify-center mb-4 shadow-md ${step.colorClass}`}
              >
                {step.num}
              </div>
              <h3 className="font-title font-bold text-slate-900 text-base mb-2">{step.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
