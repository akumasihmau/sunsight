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
    <header className="w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 print:hidden">
      <div className="page-frame h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0" title="SunSight Beranda">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="SunSight Logo" className="h-8 w-auto" />
          </Link>

          <nav className="hidden sm:flex items-center p-1 rounded-full bg-slate-100/90 border border-slate-200/70" aria-label="Navigasi utama">
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
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                pathname.startsWith("/studio")
                  ? "bg-sky-100 text-sky-900"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Studio
            </Link>
            <Link
              href="/history"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                pathname.startsWith("/history")
                  ? "bg-sky-100 text-sky-900"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Riwayat
            </Link>
          </div>

          {hasToken ? (
            <>
              {biodata?.name && (
                <div
                  className="hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700"
                  title={`${biodata.name} (${biodata.email})`}
                >
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {initials}
                  </span>
                  <span className="font-semibold max-w-[130px] truncate">{biodata.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="px-3 py-1.5 rounded-full border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-xs font-semibold text-slate-700 hover:text-rose-700 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
                <span>Keluar</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition shadow-xs shadow-sky-600/20"
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
