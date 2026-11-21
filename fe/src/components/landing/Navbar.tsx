"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, setToken } from "@/lib/api";
import { useHasToken, useStoredBiodata } from "@/lib/profile";

export default function Navbar() {
  const router = useRouter();
  const hasToken = useHasToken();
  const biodata = useStoredBiodata();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const y = window.scrollY;
      setIsScrolled((prev) => {
        if (!prev && y > 28) return true;
        if (prev && y < 12) return false;
        return prev;
      });
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const initials = biodata?.name
    ? biodata.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : "SS";

  async function handleSignOut() {
    try {
      await api.logout();
    } catch {
      // Ignore if session is already expired
    }
    setToken(null);
    router.refresh();
  }

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 px-3 sm:px-6 pt-3 sm:pt-3.5 pointer-events-none flex justify-center">
        <div
          className={`pointer-events-auto w-full h-14 rounded-full flex items-center justify-between border will-change-[max-width,background-color,box-shadow] transition-[max-width,padding,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isScrolled
              ? "max-w-5xl px-4 sm:px-6 bg-white/84 backdrop-blur-2xl saturate-150 border-white/90 shadow-[0_12px_36px_rgba(15,23,42,0.08),0_2px_12px_rgba(245,158,11,0.08)]"
              : "max-w-7xl px-2 sm:px-4 bg-white/0 border-white/0 shadow-[0_0_0_rgba(255,255,255,0)]"
          }`}
        >
          {/* Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/" className="flex items-center group shrink-0" title="SunSight Beranda">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="SunSight Logo"
                className="h-6.5 sm:h-8.5 w-auto transition-transform group-hover:scale-102"
              />
            </Link>
          </div>

          {/* Center Navigation Links (Hidden on mobile) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a className="hover:text-slate-950 transition-colors" href="#features">
              Fitur
            </a>
            <a className="hover:text-slate-950 transition-colors" href="#quick-calculator">
              Kalkulator
            </a>
            <a className="hover:text-slate-950 transition-colors" href="#how-it-works">
              Cara Kerja
            </a>
            <a className="hover:text-slate-950 transition-colors" href="#comparison">
              Komparasi
            </a>
            <a className="hover:text-slate-950 transition-colors" href="#faq">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {hasToken ? (
              <>
                <Link
                  href="/"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 hover:from-amber-200 hover:to-amber-300 text-amber-950 transition inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs border border-amber-300/80 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-950">dashboard</span>
                  <span>Ke Beranda</span>
                </Link>

                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-200/80 hover:border-rose-200 bg-white/80 hover:bg-rose-50 text-xs font-medium text-slate-600 hover:text-rose-700 transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                  title="Keluar dari akun"
                >
                  <span className="material-symbols-outlined text-[15px]">logout</span>
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-amber-50/60 transition whitespace-nowrap cursor-pointer"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 hover:from-amber-200 hover:to-amber-300 text-amber-950 transition whitespace-nowrap shadow-xs border border-amber-300/80 cursor-pointer"
                >
                  Daftar Akun
                </Link>
              </>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Buka Menu"
            >
              <span className="material-symbols-outlined text-[20px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Tutup Menu"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 z-40 cursor-default"
          />
          <div className="lg:hidden fixed inset-x-3 sm:left-auto sm:right-6 sm:w-72 top-20 z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto bg-white/95 backdrop-blur-2xl rounded-3xl border border-amber-200/80 shadow-2xl p-5 space-y-3 animate-fadeIn">
          <nav className="flex flex-col space-y-2 text-xs font-semibold text-slate-700">
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-amber-50/70 hover:text-amber-900 transition"
              href="#quick-calculator"
            >
              Kalkulator Hemat
            </a>
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-amber-50/70 hover:text-amber-900 transition"
              href="#how-it-works"
            >
              Cara Kerja
            </a>
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-amber-50/70 hover:text-amber-900 transition"
              href="#features"
            >
              Fitur Cerdas
            </a>
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-amber-50/70 hover:text-amber-900 transition"
              href="#comparison"
            >
              Komparasi
            </a>
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-amber-50/70 hover:text-amber-900 transition"
              href="#testimonials"
            >
              Testimoni
            </a>
            <a
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-amber-50/70 hover:text-amber-900 transition"
              href="#faq"
            >
              FAQ
            </a>
          </nav>
        </div>
        </>
      )}
    </>
  );
}
