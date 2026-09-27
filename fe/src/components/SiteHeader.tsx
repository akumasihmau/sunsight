"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SunIcon } from "@/components/icons";

/** Tautan navigasi utama, urut sesuai alur pemakaian. */
const LINKS = [
  { href: "/studio", label: "Studio" },
  { href: "/history", label: "Riwayat" },
  { href: "/login", label: "Masuk" },
];

/**
 * Kepala halaman dengan penanda halaman aktif.
 *
 * Transense menaruh navigasi di bilah bawah karena sasarannya ponsel; di layar
 * lebar padanannya kepala halaman yang melekat di atas, dengan penanda aksen
 * yang sama untuk halaman yang sedang dibuka.
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="app-header">
      <div className="page-frame app-header__inner">
        <Link href="/" className="app-header__brand">
          <span className="app-header__mark">
            <SunIcon className="icon" />
          </span>
          Sunsight
        </Link>

        <nav className="app-nav" aria-label="Navigasi utama">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "app-nav__link is-active" : "app-nav__link"}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
