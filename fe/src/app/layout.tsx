import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

/**
 * Plus Jakarta Sans adalah huruf sistem desain, diambil dari Transense.
 * Dimuat lewat pengoptimal huruf Next supaya berkasnya disajikan dari domain
 * sendiri tanpa perlu menyimpan berkas huruf di repositori.
 */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

/** Huruf berspasi tetap untuk angka teknis: koordinat, ukuran, dan hasil hitung. */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sunsight",
  description: "Simulasi kelayakan PLTS atap: kapasitas, produksi tahunan, penghematan, dan payback",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="app-shell">
        <SiteHeader />
        <main className="page-frame page-content flex-1">{children}</main>
        <footer className="app-footer">
          <div className="page-frame app-footer__inner">
            <span>Sunsight — tugas akhir Pemrosesan Citra dan Visual Komputer Cerdas.</span>
            <Link href="/design" className="ml-auto">
              Sistem desain
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
