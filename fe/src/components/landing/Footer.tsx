export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs text-slate-500">
        
        {/* Kolom 1: Logo & Deskripsi */}
        <div className="space-y-3">
          {/* Pastikan file logo.svg ada di folder public/ */}
          <img src="/logo.svg" alt="SunSight Logo" className="h-8 w-auto" />
          <p className="leading-relaxed">
            Platform simulasi cerdas PLTS atap Indonesia berbasis computer vision citra satelit dan kalkulasi regulasi energi terbarukan.
          </p>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-code-metric">Versi 2.4.0 (Build 2024)</span>
          </div>
        </div>

        {/* Kolom 2: Fitur Studio */}
        <div className="space-y-2">
          <span className="font-title font-bold text-slate-900 text-xs uppercase tracking-wider block">Fitur Studio</span>
          <ul className="space-y-1.5">
            <li><a href="#features" className="hover:text-amber-600 transition">Ortofoto Nadir 90°</a></li>
            <li><a href="#quick-calculator" className="hover:text-amber-600 transition">Kalkulator Penghematan</a></li>
            <li><a href="#how-it-works" className="hover:text-amber-600 transition">Kompas Azimuth Real-time</a></li>
            <li><a href="#features" className="hover:text-amber-600 transition">Deteksi Rintangan CAD</a></li>
          </ul>
        </div>

        {/* Kolom 3: Regulasi & Data */}
        <div className="space-y-2">
          <span className="font-title font-bold text-slate-900 text-xs uppercase tracking-wider block">Regulasi & Data</span>
          <ul className="space-y-1.5">
            <li><span className="text-slate-600">Permen ESDM No. 2/2024</span></li>
            <li><span className="text-slate-600">Tarif Tenaga Listrik PLN 2024</span></li>
            <li><span className="text-slate-600">Model Radiasi NREL SAM</span></li>
            <li><span className="text-slate-600">Standar Tier-1 BloombergNEF</span></li>
          </ul>
        </div>

        {/* Kolom 4: Kontak & Kemitraan */}
        <div className="space-y-2">
          <span className="font-title font-bold text-slate-900 text-xs uppercase tracking-wider block">Kontak & Kemitraan</span>
          <p className="leading-relaxed">
            Ingin bergabung sebagai mitra kontraktor installer EPC resmi di platform SunSight?
          </p>
          <button type="button" className="inline-flex items-center gap-1.5 text-amber-700 font-bold hover:underline cursor-pointer">
            <span>Hubungi Tim Kemitraan EPC</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Bagian Bawah: Copyright */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>© 2024 SunSight CAD Platform. Hak Cipta Dilindungi Undang-Undang.</span>
        <span>Dikembangkan untuk percepatan adopsi energi surya atap di Indonesia.</span>
      </div>
    </footer>
  );
}