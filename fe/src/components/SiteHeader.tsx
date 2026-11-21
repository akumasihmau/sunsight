"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { api, setToken } from "@/lib/api";
import { useHasToken, useStoredBiodata } from "@/lib/profile";

const NAV_LINKS = [
  { href: "/", label: "Beranda", exact: true },
  { href: "/studio", label: "Studio", exact: false },
  { href: "/history", label: "Riwayat", exact: false },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const hasToken = useHasToken();
  const biodata = useStoredBiodata();

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
      // Token mungkin sudah kedaluwarsa; sesi lokal tetap dibersihkan.
    }
    setToken(null);
    router.replace("/login");
  }

  return (
    <header className="w-full border-b border-white/80 bg-white/75 backdrop-blur-2xl saturate-150 sticky top-0 z-40 print:hidden">
      <div className="page-frame h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0" title="SunSight Beranda">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="SunSight Logo" className="h-6 sm:h-7 w-auto" />
          </Link>

          <nav className="hidden sm:flex items-center p-1 rounded-full bg-slate-900/[0.045] border border-white/80" aria-label="Navigasi utama">
            {NAV_LINKS.map((link) => {
              const active = link.exact
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-3.5 py-1.5 rounded-full text-xs transition ${
                    active
                      ? "bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 text-amber-950 font-semibold shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.85)]"
                      : "text-slate-600 hover:text-slate-900 font-medium"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {hasToken ? (
            <>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 p-1 md:px-2.5 md:py-1 rounded-full bg-white/80 hover:bg-white border border-white/90 text-xs text-slate-700 shadow-2xs transition"
                title={biodata?.name ? `${biodata.name} (${biodata.email})` : "Profil & Akun"}
                aria-label="Profil & Akun"
              >
                <span className="w-6 h-6 md:w-5 md:h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {initials}
                </span>
                <span className="hidden md:inline font-semibold max-w-[130px] truncate">
                  {biodata?.name || "Profil"}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-900/[0.045] hover:bg-rose-50 text-xs font-semibold text-slate-600 hover:text-rose-700 transition cursor-pointer inline-flex items-center gap-1.5"
                title="Keluar"
                aria-label="Keluar"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-900/[0.05] transition whitespace-nowrap"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 transition whitespace-nowrap shadow-[0_2px_8px_rgba(245,158,11,0.18)] border border-amber-300/80"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Dedicated mobile navigation row (Beranda · Studio · Riwayat) */}
      <nav
        className="sm:hidden border-t border-slate-900/[0.05] px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
        aria-label="Navigasi seluler"
      >
        {NAV_LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition shrink-0 ${
                active
                  ? "bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 text-amber-950 font-semibold shadow-2xs"
                  : "text-slate-600 hover:bg-slate-900/[0.05] font-medium"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
