export default function Features() {
  const features = [
    {
      id: 1,
      icon: "satellite_alt",
      iconColor: "bg-sky-50 text-sky-600",
      title: "Citra Ortofoto 90° Nadir Bebas Distorsi",
      desc: "Menggunakan citra satelit ortorektifikasi tegak lurus (90° nadir) tanpa kemiringan sudut perspektif. Ukuran bubungan (*ridge*) dan lereng (*slope*) terukur dengan presisi tinggi setara pengukuran meteran fisik.",
      checkText: "Akurasi kalibrasi skala 1 meter = 20px CAD",
      checkColor: "text-sky-700"
    },
    {
      id: 2,
      icon: "explore",
      iconColor: "bg-amber-50 text-amber-600",
      title: "Kompas Navigasi Azimuth Dua Arah",
      desc: "Dilengkapi dial kompas navigasi presisi 3D dengan sinkronisasi dua arah ke poligon atap. Menghitung penalti deviasi sudut hadap terhadap garis khatulistiwa dan pola radiasi matahari tropis Indonesia.",
      checkText: "Preset 188° Optimal SSW (98.4% Efisiensi)",
      checkColor: "text-amber-700"
    },
    {
      id: 3,
      icon: "account_balance_wallet",
      iconColor: "bg-emerald-50 text-emerald-600",
      title: "Kalkulasi Finansial Sesuai Regulasi ESDM 2024",
      desc: "Perhitungan CAPEX transparan mulai dari modul Tier-1 550W, inverter modular/string, racking, hingga biaya instalasi. Menghitung BEP, IRR, serta grafik kumulatif arus kas hingga 25 tahun tanpa biaya tersembunyi.",
      checkText: "Tarif PLN Resmi R-1, R-2, R-3, B-2 & B-3",
      checkColor: "text-emerald-700"
    },
    {
      id: 4,
      icon: "forest",
      iconColor: "bg-teal-50 text-teal-600",
      title: "Diorama Hutan Lestari & Dampak Ekologis",
      desc: "Lihat dampak nyata transisi hijau rumah Anda! Visualisasi 24 pohon ekologis pada diorama 3 lapis tumbuh merekah seiring penambahan kapasitas PLTS dan reduksi emisi karbon tahunan.",
      checkText: "Faktor Grid ESDM 0.80 kg CO2 / kWh terintegrasi",
      checkColor: "text-teal-700"
    }
  ];

  return (
    <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
        <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold uppercase tracking-wider">
          Keunggulan Utama
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-headline-lg">
          Teknologi Studio AI Tercanggih di Kelasnya
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Dirancang khusus untuk karakteristik arsitektur atap hunian dan komersial di Indonesia.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((item) => (
          <div key={item.id} className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.iconColor}`}>
                <span className="material-symbols-outlined text-[28px]">{item.icon}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-title">{item.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {item.desc}
              </p>
            </div>
            <div className={`pt-2 flex items-center gap-2 text-xs font-semibold ${item.checkColor}`}>
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{item.checkText}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}