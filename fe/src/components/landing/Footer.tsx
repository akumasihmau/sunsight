import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs text-slate-500">
        {/* Kolom 1: Logo & Deskripsi */}
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="SunSight Logo" className="h-8 w-auto" />
          <p className="leading-relaxed">
            Platform simulasi cerdas PLTS atap Indonesia berbasis citra satelit terkalibrasi dan
            kalkulasi regulasi energi terbarukan.
          </p>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-code-metric">SunSight Studio Platform</span>
          </div>
        </div>

        {/* Kolom 2: Navigasi Produk */}
        <div className="space-y-2">
          <span className="font-title font-bold text-slate-900 text-xs uppercase tracking-wider block">
            Navigasi Produk
          </span>
          <ul className="space-y-1.5">
            <li>
              <Link href="/studio" className="hover:text-amber-800 transition">
                Studio CAD Atap AI
              </Link>
            </li>
            <li>
              <a href="#quick-calculator" className="hover:text-amber-800 transition">
                Kalkulator Hemat
              </a>
            </li>
            <li>
              <a href="#features" className="hover:text-amber-800 transition">
                Fitur Unggulan
              </a>
            </li>
            <li>
              <Link href="/methodology" className="hover:text-amber-800 transition">
                Sumber Data &amp; Metodologi
              </Link>
            </li>
            <li>
              <a href="#faq" className="hover:text-amber-800 transition">
                Tanya Jawab (FAQ)
              </a>
            </li>
          </ul>
        </div>

        {/* Kolom 3: Regulasi & Data */}
        <div className="space-y-2">
          <span className="font-title font-bold text-slate-900 text-xs uppercase tracking-wider block">
            Regulasi &amp; Data
          </span>
          <ul className="space-y-1.5">
            <li>
              <Link href="/methodology" className="text-amber-900 font-semibold hover:underline inline-flex items-center gap-1">
                <span>Standar Perhitungan Resmi</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </Link>
            </li>
            <li>
              <span className="text-slate-600">Permen ESDM No. 2/2024</span>
            </li>
            <li>
              <span className="text-slate-600">Katalog Tarif Resmi PLN</span>
            </li>
            <li>
              <span className="text-slate-600">Data Iradiasi NASA POWER</span>
            </li>
            <li>
              <span className="text-slate-600">Standar Modul Surya Tier-1</span>
            </li>
          </ul>
        </div>

        {/* Kolom 4: Mulai Simulasi */}
        <div className="space-y-2">
          <span className="font-title font-bold text-slate-900 text-xs uppercase tracking-wider block">
            Mulai Sekarang
          </span>
          <p className="leading-relaxed">
            Sudah siap memetakan potensi energi surya di atap rumah, ruko, atau fasilitas bisnis
            Anda?
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-amber-700 font-bold hover:underline"
          >
            <span>Daftar Akun Gratis</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Bagian Bawah: Copyright */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>© {new Date().getFullYear()} SunSight Platform. Hak Cipta Dilindungi.</span>
        <span>Dikembangkan untuk percepatan adopsi energi surya atap di Indonesia.</span>
      </div>
    </footer>
  );
}
