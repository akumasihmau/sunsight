'use client';

import { useRouter } from 'next/navigation';

export default function Cta() {
  const router = useRouter();

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="relative rounded-3xl bg-gradient-to-br from-white/90 via-amber-50/60 to-amber-100/30 backdrop-blur-xl p-8 sm:p-14 text-center text-slate-900 overflow-hidden shadow-[0_12px_40px_rgba(245,158,11,0.06)] border border-amber-200/70">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-300/20 blur-3xl pointer-events-none rounded-full" />
        <div className="relative z-10 max-w-2xl mx-auto space-y-5">
          <span className="px-3.5 py-1 rounded-full bg-amber-100/80 border border-amber-300/70 text-amber-900 text-xs font-bold uppercase tracking-wider shadow-2xs">
            Mulai Hari Ini
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-headline-lg leading-tight text-slate-950">
            Siap Menghitung Potensi Penghematan Listrik Atap Anda?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Dapatkan estimasi daya listrik surya dan proyeksi pengembalian modal yang presisi untuk wilayah Kota Bogor.
          </p>
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button 
              type="button"
              onClick={() => router.push('/studio')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-title font-semibold text-sm shadow-sm shadow-amber-500/25 border border-amber-400/40 transition flex items-center justify-center gap-2 cursor-pointer hover:scale-102 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              <span>Mulai Analisis Atap Gratis</span>
            </button>
            <button 
              type="button"
              onClick={() => router.push('/studio')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/80 hover:bg-white text-slate-800 font-title font-bold text-sm border border-amber-200/80 shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Buka Studio CAD</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
