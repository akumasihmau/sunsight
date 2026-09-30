import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SunSight - Solusi Pintar Simulasi Potensi PLTS Atap",
  description: "Platform simulasi cerdas PLTS atap Indonesia berbasis computer vision citra satelit dan kalkulasi regulasi energi terbarukan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <head>
        {/* Preconnect untuk mempercepat pemuatan font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Google Fonts: Inter & Plus Jakarta Sans */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" 
          rel="stylesheet" 
        />
        
        {/* Google Material Symbols */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" 
          rel="stylesheet" 
        />
      </head>
      <body className="bg-slate-50 font-body-md text-on-surface antialiased selection:bg-amber-100 selection:text-amber-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}