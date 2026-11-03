'use client';

import Link from 'next/link'; 

export default function Navbar() {
  return (
    <header className="w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="SunSight Logo" className="h-9 w-auto" />
        </div>
        
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <a className="hover:text-amber-600 transition-colors" href="#quick-calculator">Kalkulator Hemat</a>
          <a className="hover:text-amber-600 transition-colors" href="#how-it-works">Cara Kerja</a>
          <a className="hover:text-amber-600 transition-colors" href="#features">Fitur Cerdas</a>
          <a className="hover:text-amber-600 transition-colors" href="#comparison">Komparasi</a>
          <a className="hover:text-amber-600 transition-colors" href="#testimonials">Testimoni</a>
          <a className="hover:text-amber-600 transition-colors" href="#faq">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm cursor-pointer"
          >
            <span>Masuk</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </header>
  );
}