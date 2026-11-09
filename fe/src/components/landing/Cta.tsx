"use client";

import Link from "next/link";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";

export default function Cta() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="relative rounded-[36px] bg-gradient-to-br from-white/95 via-amber-50/50 to-amber-100/30 backdrop-blur-2xl p-8 sm:p-16 text-center text-slate-900 overflow-hidden shadow-[0_24px_70px_rgba(245,158,11,0.10)] border border-amber-200/80">
        
        {/* Soft Radiant Ambient Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-amber-300/20 blur-3xl pointer-events-none rounded-full" />
        
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          
          {/* Maskot Sunny yang Mengapung Ceria */}
          <div className="flex justify-center">
            <SunnyMascot size={76} expression="celebrating" animated={true} />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-extrabold font-title tracking-tight text-slate-950 leading-[1.15]">
              Mulai simulasi atap Anda <br />
              <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-amber-700 bg-clip-text text-transparent">
                hari ini.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg mx-auto">
              Ketahui potensi penghematan tagihan listrik rumah Anda di Kota Bogor.
              Gratis, tanpa survei fisik, dan selesai dalam hitungan detik.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <Link
              href="/studio"
              className="w-full sm:w-auto h-12 px-7 rounded-full bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 hover:from-amber-200 hover:to-amber-300 text-amber-950 font-title font-bold text-xs sm:text-sm border border-amber-300/80 shadow-[0_4px_16px_rgba(245,158,11,0.22)] hover:shadow-[0_6px_22px_rgba(245,158,11,0.32)] hover:scale-[1.015] active:scale-[0.985] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Buka Studio CAD</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>

            <Link
              href="/register"
              className="w-full sm:w-auto h-12 px-6 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 font-title font-semibold text-xs sm:text-sm border border-slate-200/80 shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Daftar Akun Baru</span>
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
