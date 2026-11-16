import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 w-full border-t border-white/85 bg-white/78 backdrop-blur-2xl saturate-150 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs text-slate-500">
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="SunSight Logo" className="h-7.5 w-auto" />
          <p className="leading-relaxed">
            Platform simulasi PLTS atap Indonesia berbasis citra satelit terkalibrasi dan standar rekayasa energi terbarukan.
          </p>
        </div>

        <div className="space-y-2">
          <span className="font-title font-semibold text-slate-900 text-xs block">
            Produk
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
                Tanya Jawab
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <span className="font-title font-semibold text-slate-900 text-xs block">
            Standar &amp; Regulasi
          </span>
          <ul className="space-y-1.5">
            <li>
              <Link href="/methodology" className="text-amber-900 font-semibold hover:underline inline-flex items-center gap-1">
                <span>Standar Perhitungan Resmi</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </Link>
            </li>
            <li className="text-slate-600">Permen ESDM No. 2 &amp; 7/2024</li>
            <li className="text-slate-600">IEC 61215 · IEC 61724 · IEEE 1547</li>
            <li className="text-slate-600">PUIL 2020 &amp; ISO 14064</li>
          </ul>
        </div>

        <div className="space-y-2">
          <span className="font-title font-semibold text-slate-900 text-xs block">
            Mulai Sekarang
          </span>
          <p className="leading-relaxed">
            Petakan potensi energi surya di atap rumah, ruko, atau gedung Anda dalam hitungan detik.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-amber-800 font-semibold hover:underline"
          >
            <span>Daftar Akun Gratis</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900/[0.06] flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>© {new Date().getFullYear()} SunSight Platform · Hak Cipta Dilindungi</span>
        <span>Energi Surya Atap Indonesia</span>
      </div>
    </footer>
  );
}
