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
      <div className="page-frame h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0" title="SunSight Beranda">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="SunSight Logo" className="h-7 w-auto" />
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

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Mobile quick nav */}
          <div className="flex sm:hidden items-center gap-1">
            <Link
              href="/studio"
              className={`px-2.5 py-1.5 rounded-full text-xs font-semibold ${
                pathname.startsWith("/studio")
                  ? "bg-amber-100 text-amber-950"
                  : "text-slate-600 hover:bg-slate-900/[0.05]"
              }`}
            >
              Studio
            </Link>
            <Link
              href="/history"
              className={`px-2.5 py-1.5 rounded-full text-xs font-semibold ${
                pathname.startsWith("/history")
                  ? "bg-amber-100 text-amber-950"
                  : "text-slate-600 hover:bg-slate-900/[0.05]"
              }`}
            >
              Riwayat
            </Link>
          </div>

          {hasToken ? (
            <>
              {biodata?.name && (
                <Link
                  href="/profile"
                  className="hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/80 hover:bg-white border border-white/90 text-xs text-slate-700 shadow-2xs transition"
                  title={`${biodata.name} (${biodata.email})`}
                >
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 font-bold text-[10px] flex items-center justify-center">
                    {initials}
                  </span>
                  <span className="font-semibold max-w-[130px] truncate">{biodata.name}</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="px-3 py-1.5 rounded-full bg-slate-900/[0.045] hover:bg-rose-50 text-xs font-semibold text-slate-600 hover:text-rose-700 transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                <span>Keluar</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-900/[0.05] transition"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 transition shadow-[0_2px_8px_rgba(245,158,11,0.18)] border border-amber-300/80"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
