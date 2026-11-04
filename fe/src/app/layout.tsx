import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SunSight - Solusi Pintar Simulasi Potensi PLTS Atap",
  description:
    "Platform simulasi cerdas PLTS atap Indonesia berbasis citra satelit terkalibrasi dan kalkulasi regulasi energi terbarukan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth" suppressHydrationWarning>
      {/* eslint-disable @next/next/no-page-custom-font */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />

        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
      </head>
      {/* eslint-enable @next/next/no-page-custom-font */}
      <body
        suppressHydrationWarning
        className="bg-slate-50 font-sans text-slate-900 antialiased selection:bg-amber-200 selection:text-amber-950 min-h-screen"
      >
        {children}
      </body>
    </html>
  );
}
