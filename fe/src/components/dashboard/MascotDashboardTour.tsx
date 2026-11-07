"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from "react";

export type SunnyTourExpression = "happy" | "pointing" | "kepo" | "celebrating";

interface TourStep {
  targetId: string;
  tabTrigger?: "map" | "calc" | "history";
  badge: string;
  title: string;
  content: string;
  expression: SunnyTourExpression;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "dashboard-bento-hero",
    tabTrigger: "map",
    badge: "1 / 6 • Ringkasan",
    title: "Ringkasan Energi & Hemat PLN",
    content: "Pantau kapasitas kWp sistem, estimasi hemat tagihan bulanan, dan kontribusi reduksi CO2 dalam satu pandangan ringkas.",
    expression: "pointing",
  },
  {
    targetId: "dashboard-map-section",
    tabTrigger: "map",
    badge: "2 / 6 • Peta Satelit",
    title: "Peta Satelit & Radiasi Surya",
    content: "Periksa lokasi atap, intensitas radiasi matahari harian, dan sebaran instalasi PLTS aktif di Kota Bogor.",
    expression: "kepo",
  },
  {
    targetId: "dashboard-studio-btn",
    badge: "3 / 6 • Studio CAD",
    title: "Studio Desain CAD Atap AI",
    content: "Buka kanvas Studio interaktif untuk mendeteksi kontur atap otomatis via AI, merancang tata letak panel surya, dan mengunduh proposal PDF resmi.",
    expression: "happy",
  },
  {
    targetId: "dashboard-calculator-section",
    tabTrigger: "calc",
    badge: "4 / 6 • Finansial",
    title: "Kalkulator Finansial 25 Tahun",
    content: "Simulasikan proyeksi arus kas 25 tahun, nilai investasi solar panel, dan estimasi waktu balik modal (BEP) secara transparan.",
    expression: "pointing",
  },
  {
    targetId: "dashboard-history-section",
    tabTrigger: "history",
    badge: "5 / 6 • Riwayat",
    title: "Riwayat Desain & Proposal Resmi",
    content: "Akses riwayat desain atap tersimpan, buka kembali di Studio CAD, atau unduh dokumen Proposal PDF resmi siap pakai.",
    expression: "kepo",
  },
  {
    targetId: "dashboard-profile-btn",
    badge: "6 / 6 • Profil Akun",
    title: "Profil & Preferensi Listrik",
    content: "Kelola data pribadi, golongan tarif & kapasitas daya PLN rumah/kantor, serta preferensi simulasi agar kalkulasi potensi surya selalu akurat.",
    expression: "celebrating",
  },
];

interface MascotDashboardTourProps {
  onSwitchTab?: (tab: "map" | "calc" | "history") => void;
  forceOpen?: boolean;
  onClose?: () => void;
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Komponen Karakter Maskot Sunny (Pure GPU Animation)
 * Berjalan sepenuhnya di GPU lewat CSS keyframe (@keyframes sunnyBlink, @keyframes sunnyMouthFlap, dsb.)
 * Tanpa setInterval JavaScript berkala yang dapat memicu re-render tak berujung / freeze.
 */
const AnimatedSunnyTourMascot = memo(function AnimatedSunnyTourMascot({
  expression,
  isGliding,
  glideDirection,
}: {
  expression: SunnyTourExpression;
  isGliding: boolean;
  glideDirection: number; // -1: kiri, 1: kanan
}) {
  const isCelebrating = expression === "celebrating";
  const isKepo = expression === "kepo";
  const isPointing = expression === "pointing";

  // Pupil offset statis per ekspresi
  let pupilOffsetX = 0;
  let pupilOffsetY = 0;
  if (isPointing) {
    pupilOffsetX = -4;
    pupilOffsetY = 3;
  } else if (isKepo) {
    pupilOffsetX = 5;
    pupilOffsetY = 1;
  } else if (isGliding) {
    pupilOffsetX = glideDirection * 5;
    pupilOffsetY = -1;
  }

  // Transform kemiringan halus dan luwes saat meluncur antar langkah
  const flightTransform = isGliding
    ? `translate(${glideDirection * 6}px, -8px) rotate(${glideDirection * 8}deg) scale(1.04)`
    : "translate(0px, 0px) rotate(0deg) scale(1)";

  return (
    <div className="relative w-[96px] h-[82px] select-none pointer-events-none drop-shadow-[0_6px_16px_rgba(245,158,11,0.22)]">
      <svg
        viewBox="0 0 460 360"
        className="w-full h-full overflow-visible"
        aria-label="Sunny - Maskot Panduan SunSight"
      >
        <defs>
          {/* Radiant Soft Glow Gradients */}
          <radialGradient id="tourSunnyOuterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.32" />
            <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.18" />
            <stop offset="85%" stopColor="#FDE047" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="tourSunnyInnerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.04" />
          </radialGradient>

          <radialGradient id="tourSunnyAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#FBBF24" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          {/* Badan Matahari Bernuansa Keemasan Lembut */}
          <linearGradient id="tourSunnyBody" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="35%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Kilau Halus di Puncak Lengkungan */}
          <radialGradient id="tourSunnyRim" cx="42%" cy="38%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#FDE047" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Ambient Aura Glow di belakang */}
        <circle cx="230" cy="180" r="165" fill="url(#tourSunnyAura)" className="sun-wavy-breathe" />

        {/* 2. Halo Bergelombang Luar — Berputar Searah Jarum Jam */}
        <g className="sun-wavy-spin-slow">
          <path
            d="M 388.00 180.00 C 388.00 207.30, 356.56 198.23, 349.83 218.94 C 343.11 239.64, 373.87 250.78, 357.82 272.87 C 341.78 294.96, 321.67 269.14, 304.06 281.94 C 286.45 294.73, 304.79 321.83, 278.82 330.27 C 252.86 338.70, 251.77 306.00, 230.00 306.00 C 208.23 306.00, 207.14 338.70, 181.18 330.27 C 155.21 321.83, 173.55 294.73, 155.94 281.94 C 138.33 269.14, 118.22 294.96, 102.18 272.87 C 86.13 250.78, 116.89 239.64, 110.17 218.94 C 103.44 198.23, 72.00 207.30, 72.00 180.00 C 72.00 152.70, 103.44 161.77, 110.17 141.06 C 116.89 120.36, 86.13 109.22, 102.18 87.13 C 118.22 65.04, 138.33 90.86, 155.94 78.06 C 173.55 65.27, 155.21 38.17, 181.18 29.73 C 207.14 21.30, 208.23 54.00, 230.00 54.00 C 251.77 54.00, 252.86 21.30, 278.82 29.73 C 304.79 38.17, 286.45 65.27, 304.06 78.06 C 321.67 90.86, 341.78 65.04, 357.82 87.13 C 373.87 109.22, 343.11 120.36, 349.83 141.06 C 356.56 161.77, 388.00 152.70, 388.00 180.00 Z"
            fill="url(#tourSunnyOuterGlow)"
          />
        </g>

        {/* 3. Halo Bergelombang Dalam — Berputar Berlawanan Arah */}
        <g className="sun-wavy-spin-reverse">
          <path
            d="M 362.00 180.00 C 362.00 199.01, 338.34 192.93, 334.32 207.95 C 330.30 222.97, 353.82 229.54, 344.32 246.00 C 334.81 262.46, 317.36 245.37, 306.37 256.37 C 295.37 267.36, 312.46 284.81, 296.00 294.32 C 279.54 303.82, 272.97 280.30, 257.95 284.32 C 242.93 288.34, 249.01 312.00, 230.00 312.00 C 210.99 312.00, 217.07 288.34, 202.05 284.32 C 187.03 280.30, 180.46 303.82, 164.00 294.32 C 147.54 284.81, 164.63 267.36, 153.63 256.37 C 142.64 245.37, 125.19 262.46, 115.68 246.00 C 106.18 229.54, 129.70 222.97, 125.68 207.95 C 121.66 192.93, 98.00 199.01, 98.00 180.00 C 98.00 160.99, 121.66 167.07, 125.68 152.05 C 129.70 137.03, 106.18 130.46, 115.68 114.00 C 125.19 97.54, 142.64 114.63, 153.63 103.63 C 164.63 92.64, 147.54 75.19, 164.00 65.68 C 180.46 56.18, 187.03 79.70, 202.05 75.68 C 217.07 71.66, 210.99 48.00, 230.00 48.00 C 249.01 48.00, 242.93 71.66, 257.95 75.68 C 272.97 79.70, 279.54 56.18, 296.00 65.68 C 312.46 75.19, 295.37 92.64, 306.37 103.63 C 317.36 114.63, 334.81 97.54, 344.32 114.00 C 353.82 130.46, 330.30 137.03, 334.32 152.05 C 338.34 167.07, 362.00 160.99, 362.00 180.00 Z"
            fill="url(#tourSunnyInnerGlow)"
          />
        </g>

        {/* 4. Efek Jalur Kecepatan Udara saat Terbang / Gliding */}
        {isGliding && (
          <g opacity="0.65" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" className="animate-pulse">
            <line x1="120" y1="210" x2="60" y2="230" />
            <line x1="140" y1="235" x2="75" y2="258" />
            <line x1="130" y1="180" x2="80" y2="195" />
          </g>
        )}

        {/* 5. Kelompok Tubuh Utama Maskot Sunny:
            - Layer Luar: sun-gentle-hover (hanya menangani animasi naik-turun mengapung lembut)
            - Layer Dalam: mascot-smooth-transition (menangani transisi kemiringan saat langkah berpindah) */}
        <g className="sun-gentle-hover">
          <g
            className="mascot-smooth-transition"
            style={{
              transform: flightTransform,
              transformOrigin: "230px 180px",
            }}
          >
            {/* Badan Bulat Hangat */}
            <circle cx="230" cy="180" r="95" fill="url(#tourSunnyBody)" />
            <circle cx="230" cy="180" r="95" fill="url(#tourSunnyRim)" />

          {/* Rona Pipi Merah Muda Hangat (Blushing Cheeks) */}
          <ellipse cx="180" cy="196" rx="14" ry="8" fill="#FB7185" opacity="0.55" />
          <ellipse cx="280" cy="196" rx="14" ry="8" fill="#FB7185" opacity="0.55" />

          {/* MATA (Expressive Eyes dengan Animasi Kedip CSS Alami) */}
          {isCelebrating ? (
            /* Mata Lengkung Bahagia (^.^) */
            <g stroke="#0F172A" strokeWidth="5.5" strokeLinecap="round" fill="none">
              <path d="M 180 174 Q 198 152 216 174" />
              <path d="M 244 174 Q 262 152 280 174" />
            </g>
          ) : (
            /* Mata Kartun Berbinar dengan Kedip GPU CSS */
            <g className="sunny-eye-blink">
              {/* Mata Kiri */}
              <ellipse cx="198" cy="168" rx="16" ry="17.5" fill="#FFFFFF" />
              <circle cx={198 + pupilOffsetX} cy={168 + pupilOffsetY} r="9" fill="#0F172A" />
              <circle cx={198 + pupilOffsetX + 3} cy={168 + pupilOffsetY - 3} r="3.2" fill="#FFFFFF" />

              {/* Mata Kanan */}
              <ellipse cx="262" cy="168" rx="16" ry="17.5" fill="#FFFFFF" />
              <circle cx={262 + pupilOffsetX} cy={168 + pupilOffsetY} r="9" fill="#0F172A" />
              <circle cx={262 + pupilOffsetX + 3} cy={168 + pupilOffsetY - 3} r="3.2" fill="#FFFFFF" />
            </g>
          )}

          {/* MULUT (Animasi Bicara CSS Flap saat Menjelaskan) */}
          {isCelebrating ? (
            /* Mulut Senyum Lebar Bahagia :D */
            <path
              d="M 216 195 Q 230 220 244 195 Z"
              fill="#E11D48"
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
          ) : (
            <g className="sunny-mouth-talk">
              <path
                d="M 218 196 Q 230 214 242 196 Z"
                fill="#E11D48"
                stroke="#0F172A"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            </g>
          )}
          </g>
        </g>
      </svg>
    </div>
  );
});

export const MascotDashboardTour: React.FC<MascotDashboardTourProps> = ({
  onSwitchTab,
  forceOpen = false,
  onClose,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  // Mencegah Hydration Mismatch pada SSR
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Animasi Maskot Gliding State (Hanya diaktifkan saat transisi langkah, lalu mati sendiri)
  const [isGliding, setIsGliding] = useState(false);
  const [glideDirection, setGlideDirection] = useState<number>(1);

  // Simpan callback ke ref agar bebas dari dependency cycle
  const onSwitchTabRef = useRef(onSwitchTab);
  useEffect(() => {
    onSwitchTabRef.current = onSwitchTab;
  }, [onSwitchTab]);

  const prevTriggeredStepRef = useRef<number | null>(null);
  const rafMeasureRef = useRef<number | null>(null);

  // Inisialisasi status tur dari URL / localStorage (Hanya dijalankan sekali saat mount/forceOpen)
  useEffect(() => {
    if (forceOpen) {
      setIsVisible(true);
      setCurrentStepIdx(0);
      prevTriggeredStepRef.current = null;
      return;
    }

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tourParam = urlParams.get("tour");
      const pendingTour = localStorage.getItem("sunsight_tour_pending");
      const completedTour = localStorage.getItem("sunsight_tour_completed");

      if (tourParam === "dashboard" || tourParam === "welcome" || (pendingTour === "true" && !completedTour)) {
        setIsVisible(true);
        setCurrentStepIdx(0);
        prevTriggeredStepRef.current = null;
      }
    }
  }, [forceOpen]);

  // Handler Pindah Tab saat Langkah Berubah (Dijamin HANYA dipanggil 1x per perubahan currentStepIdx)
  useEffect(() => {
    if (!isVisible) return;
    if (prevTriggeredStepRef.current === currentStepIdx) return;
    prevTriggeredStepRef.current = currentStepIdx;

    const targetTab = TOUR_STEPS[currentStepIdx]?.tabTrigger;
    if (targetTab && onSwitchTabRef.current) {
      onSwitchTabRef.current(targetTab);
    }
  }, [currentStepIdx, isVisible]);

  // Pengukuran Bounding Box Target Elemen Secara Aman (Dengan Subpixel Equality Guard)
  const updateTargetRect = useCallback(() => {
    const step = TOUR_STEPS[currentStepIdx];
    if (!step) return false;

    const el = document.getElementById(step.targetId);
    if (!el) return false;

    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setTargetRect((prev) => {
        // Jika posisi belum berubah secara bermakna (< 0.75px), kembalikan prev untuk mencegah re-render!
        if (
          prev &&
          Math.abs(prev.x - rect.left) < 0.75 &&
          Math.abs(prev.y - rect.top) < 0.75 &&
          Math.abs(prev.width - rect.width) < 0.75 &&
          Math.abs(prev.height - rect.height) < 0.75
        ) {
          return prev;
        }
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        };
      });
      return true;
    }
    return false;
  }, [currentStepIdx]);

  // Pengukuran target saat langkah berganti
  useEffect(() => {
    if (!isVisible) return;

    let attempts = 0;
    let cancelled = false;

    const measureWithScroll = () => {
      if (cancelled) return;
      const step = TOUR_STEPS[currentStepIdx];
      const el = step ? document.getElementById(step.targetId) : null;

      if (el) {
        // Cek apakah elemen sudah terlihat nyaman di viewport
        const r = el.getBoundingClientRect();
        const isInView = r.top >= 0 && r.bottom <= window.innerHeight;

        // Hanya scroll jika di luar layar untuk menghindari flood scroll events
        if (!isInView) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        updateTargetRect();
      } else if (attempts < 10) {
        attempts++;
        rafMeasureRef.current = requestAnimationFrame(measureWithScroll);
      }
    };

    // Tunggu 80ms untuk mount tab Next.js
    const timer = setTimeout(measureWithScroll, 80);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (rafMeasureRef.current) {
        cancelAnimationFrame(rafMeasureRef.current);
      }
    };
  }, [currentStepIdx, isVisible, updateTargetRect]);

  // Listener Scroll & Resize dengan Throttling requestAnimationFrame (Maks 1x per frame)
  useEffect(() => {
    if (!isVisible) return;

    let rafId: number | null = null;

    const handleScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateTargetRect();
      });
    };

    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isVisible, updateTargetRect]);

  // Navigasi Langkah
  const handleNext = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setGlideDirection(1);
      setIsGliding(true);
      setTimeout(() => setIsGliding(false), 500);
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setGlideDirection(-1);
      setIsGliding(true);
      setTimeout(() => setIsGliding(false), 500);
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  const handleComplete = useCallback(() => {
    setIsVisible(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sunsight_tour_pending");
      localStorage.setItem("sunsight_tour_completed", "true");
      const url = new URL(window.location.href);
      if (url.searchParams.has("tour")) {
        url.searchParams.delete("tour");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
    onClose?.();
  }, [onClose]);

  if (!isMounted || !isVisible) return null;

  const currentStep = TOUR_STEPS[currentStepIdx];
  const isLastStep = currentStepIdx === TOUR_STEPS.length - 1;

  // Dimensi Padding & Sudut Lingkaran Spotlight
  const pad = 12;
  const radius = 24;

  // Perhitungan Posisi Dialog Card (Clamped dalam batas layar)
  const cardWidth = typeof window !== "undefined" ? Math.min(390, window.innerWidth - 32) : 380;
  const cardHeight = 220;

  let cardTop = 100;
  let cardLeft = 24;
  let placeBelow = true;

  if (targetRect && typeof window !== "undefined") {
    const spaceBelow = window.innerHeight - (targetRect.y + targetRect.height);
    const spaceAbove = targetRect.y;

    if (spaceBelow >= cardHeight + 30) {
      cardTop = targetRect.y + targetRect.height + 16;
      placeBelow = true;
    } else if (spaceAbove >= cardHeight + 30) {
      cardTop = targetRect.y - cardHeight - 16;
      placeBelow = false;
    } else {
      cardTop = Math.max(16, window.innerHeight - cardHeight - 20);
      placeBelow = true;
    }

    // Hitung posisi horizontal sejajar dengan target atau pojok nyaman
    cardLeft = targetRect.x + 16;
    if (cardLeft + cardWidth > window.innerWidth - 16) {
      cardLeft = window.innerWidth - cardWidth - 16;
    }
    if (cardLeft < 16) {
      cardLeft = 16;
    }
  } else if (typeof window !== "undefined") {
    cardTop = window.innerHeight - cardHeight - 32;
    cardLeft = window.innerWidth - cardWidth - 32;
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* ============================================================
          1. LAYER SEMI-TRANSPARAN DENGAN LUBANG SPOTLIGHT BER-GLOW
          ============================================================ */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-40 overflow-hidden">
        <defs>
          <mask id="sunsight-spotlight-mask">
            {/* Latar Putih (Semua area di luar cutout menjadi gelap semi-transparan) */}
            <rect width="100%" height="100%" fill="white" />

            {/* Cutout Hitam (Membuat jendela transparan sempurna pada elemen target) */}
            {targetRect && (
              <rect
                x={targetRect.x - pad}
                y={targetRect.y - pad}
                width={targetRect.width + pad * 2}
                height={targetRect.height + pad * 2}
                rx={radius}
                ry={radius}
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Backdrop Gelap Halus dengan Mask Cutout */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.48)"
          mask="url(#sunsight-spotlight-mask)"
          className="transition-opacity duration-300"
        />
      </svg>

      {/* ============================================================
          2. CINCIN RADIANT SOFT GLOW DI SEKELILING ELEMEN TARGET
          ============================================================ */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            left: `${targetRect.x - pad}px`,
            top: `${targetRect.y - pad}px`,
            width: `${targetRect.width + pad * 2}px`,
            height: `${targetRect.height + pad * 2}px`,
            borderRadius: `${radius}px`,
          }}
          className="pointer-events-none z-[41] ring-2 ring-amber-300/80 shadow-[0_0_32px_rgba(251,191,36,0.36),inset_0_0_18px_rgba(251,191,36,0.12)] transition-all duration-500 ease-out"
        >
          {/* Subtle Golden Radar Ping Animation */}
          <div className="absolute -inset-1 rounded-[28px] border border-amber-200/50 animate-pulse pointer-events-none" />
        </div>
      )}

      {/* ============================================================
          3. KARTU PANDUAN APPLE-STYLE RADIANT SOFT GLOW & MASKOT SUNNY
          ============================================================ */}
      <div
        style={{
          position: "fixed",
          left: `${cardLeft}px`,
          top: `${cardTop}px`,
          width: `${cardWidth}px`,
        }}
        className="z-50 pointer-events-auto transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)"
      >
        <div className="relative rounded-[28px] bg-white/92 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.16),0_4px_20px_rgba(251,191,36,0.14)] p-4 sm:p-5 text-slate-800">
          
          {/* Maskot Sunny yang Bertengger Manis di Sudut Kiri Kartu */}
          <div className="absolute -top-8 left-2 sm:left-3">
            <AnimatedSunnyTourMascot
              expression={currentStep.expression}
              isGliding={isGliding}
              glideDirection={glideDirection}
            />
          </div>

          {/* Header Card: Badge Step & Tombol Tutup */}
          <div className="flex items-center justify-between gap-2 mb-2 pl-16 sm:pl-20">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 bg-amber-50/90 px-2.5 py-0.5 rounded-full border border-amber-200/70 font-code-metric">
                {currentStep.badge}
              </span>
            </div>

            <button
              type="button"
              onClick={handleComplete}
              className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 flex items-center justify-center transition-colors cursor-pointer"
              title="Tutup panduan"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {/* Judul & Penjelasan Ringkas (To the Point) */}
          <div className="pl-1 pt-1 mb-4">
            <h3 className="font-title text-sm sm:text-[15px] font-bold text-slate-900 leading-snug mb-1">
              {currentStep.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {currentStep.content}
            </p>
          </div>

          {/* Footer Bar: Indikator Dots & Tombol Aksi Radiant Soft Glow */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100/80">
            {/* Step Progress Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-400 ${
                    idx === currentStepIdx
                      ? "w-5 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                      : "w-1.5 bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              {currentStepIdx > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="h-8 px-3 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 text-xs font-medium transition-colors cursor-pointer"
                >
                  Kembali
                </button>
              )}

              {/* Tombol Radiant Soft Glow — Bukan Warna Amber Mencolok */}
              <button
                type="button"
                onClick={handleNext}
                className="group relative h-8 px-4 rounded-full bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 text-amber-950 text-xs font-semibold border border-amber-300/80 shadow-[0_2px_14px_rgba(245,158,11,0.20)] hover:from-amber-200 hover:to-amber-300 hover:shadow-[0_4px_20px_rgba(245,158,11,0.30)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer flex items-center gap-1"
              >
                <span>{isLastStep ? "Selesai" : "Lanjut"}</span>
                <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">
                  {isLastStep ? "check" : "arrow_forward"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
