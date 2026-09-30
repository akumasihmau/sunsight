'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Hero() {
  const router = useRouter();
  const [address, setAddress] = useState('Jl. Diponegoro No. 24, Menteng, Jakarta Pusat');

  const handleScan = () => {
    // Nanti ini akan kita arahkan ke halaman loading AI sebelum masuk studio
    router.push('/studio'); 
  };

  return (
    <div className="relative overflow-hidden pt-8 sm:pt-14 pb-12 sm:pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Atmospheric Ambient Glows */}
      <div className="absolute -top-24 left-1/3 -translate-x-1/2 w-[650px] h-[350px] bg-gradient-to-b from-amber-200/40 via-amber-100/20 to-transparent blur-3xl pointer-events-none rounded-full"></div>
      <div className="absolute top-48 right-0 w-96 h-96 bg-sky-200/30 blur-3xl pointer-events-none rounded-full"></div>
      
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <h1 className="text-3xl sm:text-5xl lg:text-[44px] xl:text-[50px] font-extrabold text-slate-900 tracking-tight leading-[1.14] font-headline-lg">
            Pangkas Tagihan Listrik PLN hingga <br className="hidden sm:inline"/>
            <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 bg-clip-text text-transparent">85% Melalui Analisis Citra Satelit</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-xl">
            Simulasi pintar PLTS Atap otomatis dari ortofoto 90° nadir. Rekonstruksi kontur poligon atap, deteksi halangan bayangan (HVAC), kompas azimuth surya, dan estimasi ROI presisi tanpa perlu survei manual.
          </p>

          <div className="pt-1 max-w-xl">
            <div className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-200 flex flex-col sm:flex-row gap-2 focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10 transition-all">
              <div className="flex-1 relative flex items-center pl-3">
                <span className="material-symbols-outlined text-amber-500 text-[22px] shrink-0">location_on</span>
                <input 
                  className="seamless-input w-full px-3 py-2 text-sm text-slate-800 placeholder-slate-400 bg-transparent border-0 font-medium" 
                  placeholder="Masukkan alamat rumah atau perumahan..." 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <button 
                onClick={handleScan}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] text-white font-title text-sm font-bold shadow-md shadow-amber-600/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span>Mulai Analisis</span>
              </button>
            </div>

            {/* Quick Location Chips */}
            <div className="mt-3.5 flex items-center gap-2 flex-wrap text-xs text-slate-500">
              <span className="font-semibold text-slate-400 text-[11.5px]">Pilih Contoh:</span>
              <button onClick={() => setAddress('Jl. Diponegoro No. 24, Menteng')} className="px-3 py-1.5 rounded-full bg-gradient-to-b from-white to-slate-50 border border-slate-200 text-slate-700 hover:text-amber-900 font-semibold shadow-xs hover:shadow transition-all duration-200 active:scale-95 cursor-pointer">📍 Menteng</button>
              <button onClick={() => setAddress('Jl. Grand Boulevard, BSD City')} className="px-3 py-1.5 rounded-full bg-gradient-to-b from-white to-slate-50 border border-slate-200 text-slate-700 hover:text-amber-900 font-semibold shadow-xs hover:shadow transition-all duration-200 active:scale-95 cursor-pointer">📍 BSD City</button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Static Mockup untuk Landing Page */}
        <div className="lg:col-span-5 w-full">
          <div className="relative rounded-2xl p-2.5 sm:p-3 bg-gradient-to-b from-slate-200 via-slate-100 to-white shadow-2xl border border-slate-200/90 group">
            <div className="flex items-center justify-between gap-2 px-1 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                <span className="text-[11px] font-bold text-slate-800 font-mono tracking-tight">CV Simulasi: Tata Letak Surya</span>
              </div>
            </div>

            <div className="relative h-72 sm:h-96 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
              {/* Note: Pastikan file satellite_map.jpg dipindahkan ke folder public/ */}
              <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: "url('/satellite_map.jpg')" }}></div>
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_16px_rgba(251,191,36,0.95)] animate-radar pointer-events-none z-10"></div>
              
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200/90 shadow-lg flex items-center gap-2.5 z-20 animate-gentle-float">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </div>
                <div>
                  <span className="text-[9.5px] text-slate-500 font-semibold block">Estimasi Penghematan</span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-700 font-headline-sm">Rp 2,45 Jt / bln</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}