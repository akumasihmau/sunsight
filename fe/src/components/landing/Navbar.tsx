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
      setIsScrolled(window.scrollY > 30);
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
      <header
        className={`w-full z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isScrolled
            ? "fixed top-3 sm:top-4 inset-x-0 px-3 sm:px-6 pointer-events-none flex justify-center"
            : "sticky top-0 bg-white/80 backdrop-blur-md border-b border-amber-200/50 px-4 sm:px-6"
        }`}
      >
        <div
          className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isScrolled
              ? "pointer-events-auto max-w-5xl w-full rounded-full bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-lg px-4 sm:px-6 h-13 sm:h-14 flex items-center justify-between"
              : "max-w-7xl mx-auto h-16 sm:h-18 flex items-center justify-between"
          }`}
        >
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center group" title="SunSight Beranda">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="SunSight Logo"
                className="h-7.5 sm:h-8.5 w-auto transition-transform group-hover:scale-102"
              />
            </Link>
          </div>

          {/* Center Navigation Links (Hidden on mobile) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a className="hover:text-amber-800 transition-colors" href="#features">
              Fitur Cerdas
            </a>
            <a className="hover:text-amber-800 transition-colors" href="#quick-calculator">
              Kalkulator Hemat
            </a>
            <a className="hover:text-amber-800 transition-colors" href="#how-it-works">
              Cara Kerja
            </a>
            <a className="hover:text-amber-800 transition-colors" href="#comparison">
              Komparasi
            </a>
            <a className="hover:text-amber-800 transition-colors" href="#faq">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {hasToken ? (
              <>
                <Link
                  href="/"
                  className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 hover:from-amber-200 hover:to-amber-300 text-amber-950 transition inline-flex items-center gap-1.5 shadow-xs border border-amber-300/80 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-950">dashboard</span>
                  <span>Ke Beranda</span>
                </Link>

                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="px-3 py-1.5 rounded-full border border-slate-200/80 hover:border-rose-200 bg-white/80 hover:bg-rose-50 text-xs font-medium text-slate-600 hover:text-rose-700 transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
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
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-amber-50/60 transition cursor-pointer"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 hover:from-amber-200 hover:to-amber-300 text-amber-950 transition shadow-xs border border-amber-300/80 cursor-pointer"
                >
                  Daftar Akun
                </Link>
              </>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
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
        <div className="lg:hidden fixed inset-x-3 top-20 z-50 bg-white/95 backdrop-blur-2xl rounded-3xl border border-amber-200/80 shadow-2xl p-5 space-y-3 animate-fadeIn">
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
      )}
    </>
  );
}
