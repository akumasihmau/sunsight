'use client';

import { useRouter } from 'next/navigation';

export default function Cta() {
  const router = useRouter();

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 sm:p-14 text-center text-white overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/20 blur-3xl pointer-events-none rounded-full"></div>
        <div className="relative z-10 max-w-2xl mx-auto space-y-5">
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            Mulai Hari Ini
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-headline-lg leading-tight">
            Siap Mengubah Atap Rumah Menjadi Sumber Penghematan Mandiri?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Dapatkan analisis akurat potensi daya listrik surya dan estimasi penghematan tagihan PLN secara instan.
          </p>
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button 
              onClick={() => router.push('/studio')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-title font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              <span>Mulai Analisis Atap Gratis</span>
            </button>
            <button 
              onClick={() => router.push('/studio')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-title font-semibold text-sm border border-white/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Buka Studio CAD Langsung</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}