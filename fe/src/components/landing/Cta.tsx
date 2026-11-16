"use client";

import Link from "next/link";
import { SunnyMascot } from "@/components/mascot/SunnyMascot";
import { SolarMeadowScene } from "@/components/landing/SolarMeadowScene";

export default function Cta() {
  return (
    <section className="relative w-full py-20 sm:py-28 px-4 sm:px-6 overflow-hidden">
      {/* Full-bleed Seamless Sunlit Meadow Horizon Blending Smoothly Into #F7F8FA & Footer */}
      <SolarMeadowScene variant="cta" />

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="rounded-[32px] bg-white/80 backdrop-blur-2xl saturate-150 border border-white/90 shadow-[0_24px_64px_rgba(15,23,42,0.07),0_6px_28px_rgba(245,158,11,0.12),inset_0_1px_1px_rgba(255,255,255,0.95)] p-7 sm:p-11 text-center space-y-5">
          <div className="flex justify-center">
            <SunnyMascot size={68} expression="celebrating" animated={true} />
          </div>

          <div className="space-y-2.5">
            <h2 className="text-2xl sm:text-4xl font-semibold font-title tracking-tight text-slate-950 leading-[1.14]">
              Siap memetakan{" "}
              <span className="bg-gradient-to-r from-amber-800 via-amber-600 to-emerald-700 bg-clip-text text-transparent">
                atap Anda?
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Coba langsung di browser tanpa biaya dan tanpa survei fisik. Hasil simulasi dan proposal siap diunduh seketika.
            </p>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/studio"
              className="w-full sm:w-auto h-11 px-7 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 font-title font-semibold text-xs sm:text-sm border border-amber-300/80 shadow-[0_6px_20px_rgba(245,158,11,0.22),inset_0_1px_1px_rgba(255,255,255,0.88)] hover:scale-[1.015] active:scale-[0.985] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Mulai Simulasi Gratis</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>

            <Link
              href="/register"
              className="w-full sm:w-auto h-11 px-6 rounded-full bg-white/88 hover:bg-white text-slate-700 hover:text-slate-900 font-title font-semibold text-xs sm:text-sm border border-white/95 shadow-2xs transition flex items-center justify-center cursor-pointer"
            >
              <span>Daftar Akun</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
