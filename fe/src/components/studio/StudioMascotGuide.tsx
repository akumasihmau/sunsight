"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from "react";

export type SunnyStudioExpression = "happy" | "pointing" | "kepo" | "celebrating";

interface StudioTourStep {
  targetId: string;
  badge: string;
  title: string;
  content: string;
  expression: SunnyStudioExpression;
  tabTrigger?: "geometry" | "pvarray" | "financials";
  setSolarMode?: boolean; // false: mode kontur atap AI, true: pasang panel surya
  requireOpenRightPanel?: boolean;
}

const STUDIO_STEPS: StudioTourStep[] = [
  {
    targetId: "studio-nav-header",
    badge: "1 / 7 • Navigasi",
    title: "1. Bilah Navigasi & Lokasi",
    content: "Arahkan kursor ke tombol kiri atas untuk mencari alamat bangunan lain di Kota Bogor atau kembali ke Beranda kapan saja.",
    expression: "kepo",
  },
  {
    targetId: "studio-left-toolbar",
    badge: "2 / 7 • Alat CAD",
    title: "2. Bilah Alat Kanvas & Bantuan",
    content: "Gunakan tombol di sisi kiri untuk memutar sudut pandang kanvas atap, mengukur jarak bangunan, atau membuka panduan bantuan (?) ini kapan saja.",
    expression: "happy",
  },
  {
    targetId: "studio-roof-facet",
    badge: "3 / 7 • Atap AI",
    title: "3. Deteksi Kontur Atap Otomatis",
    content: "AI telah mendeteksi batas bidang atap dari citra satelit. Bidang ditandai dengan garis putus-putus amber dan badge luas area [🏠].",
    expression: "pointing",
    setSolarMode: false,
  },
  {
    targetId: "studio-roof-facet",
    badge: "4 / 7 • Pasang Panel",
    title: "4. Praktek Pasang Panel Surya",
    content: "Saat bidang atap diklik, panel surya langsung terpasang otomatis memenuhi atap dengan modul silikon fotovoltaik berkapasitas optimal!",
    expression: "celebrating",
    setSolarMode: true,
  },
  {
    targetId: "studio-pane-geometry",
    badge: "5 / 7 • Tab 1: Geometri",
    title: "5. Tab Geometri & Kemiringan Atap",
    content: "Di panel kanan Tab 1, sesuaikan ukuran bidang atap, kemiringan atap (tilt), arah hadap matahari (azimuth), dan batas jarak talang air.",
    expression: "kepo",
    requireOpenRightPanel: true,
    tabTrigger: "geometry",
  },
  {
    targetId: "studio-pane-pvarray",
    badge: "6 / 7 • Tab 2: Modul Surya",
    title: "6. Tab Spesifikasi & Tata Letak Panel",
    content: "Di Tab 2, tentukan tipe panel surya (Tier-1 Monocrystalline 580W), atur orientasi (portrait/landscape), serta jarak kerapatan antar modul.",
    expression: "pointing",
    requireOpenRightPanel: true,
    tabTrigger: "pvarray",
  },
  {
    targetId: "studio-pane-financials",
    badge: "7 / 7 • Tab 3: Finansial",
    title: "7. Tab Finansial & Unduh Proposal PDF",
    content: "Di Tab 3, periksa simulasi hemat tagihan listrik PLN, estimasi balik modal (BEP 4-5 tahun), dan unduh dokumen Proposal PDF resmi siap cetak!",
    expression: "celebrating",
    requireOpenRightPanel: true,
    tabTrigger: "financials",
  },
];

interface StudioMascotGuideProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPopulateActiveFacet?: () => void;
  onSetSolarPopulated?: (populated: boolean) => void;
  onSwitchTab?: (tab: "geometry" | "pvarray" | "financials") => void;
  onOpenRightPanel?: () => void;
  hasActiveSolar?: boolean;
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Maskot Sunny Hidup dengan Pure GPU CSS Animation
 * Gerakan mengapung (hover) terisolasi pada layer luar, dan gerakan kemiringan (glide)
 * terisolasi pada layer dalam, sehingga animasinya 100% mulus tanpa saling menimpa transform.
 */
const AnimatedSunnyStudioMascot = memo(function AnimatedSunnyStudioMascot({
  expression,
  isGliding,
  glideDirection,
}: {
  expression: SunnyStudioExpression;
  isGliding: boolean;
  glideDirection: number;
}) {
  const isCelebrating = expression === "celebrating";
  const isKepo = expression === "kepo";
  const isPointing = expression === "pointing";

  let pupilOffsetX = 0;
  let pupilOffsetY = 0;
  if (isPointing) {
    pupilOffsetX = -4;
    pupilOffsetY = 3;
  } else if (isKepo) {
    pupilOffsetX = 5;
    pupilOffsetY = 1;
  } else if (isGliding) {
    pupilOffsetX = glideDirection * 4;
    pupilOffsetY = -1;
  }

  // Transform kemiringan halus dan luwes saat meluncur antar langkah
  const flightTransform = isGliding
    ? `translate(${glideDirection * 6}px, -8px) rotate(${glideDirection * 8}deg) scale(1.04)`
    : "translate(0px, 0px) rotate(0deg) scale(1)";

  return (
    <div className="relative w-[88px] h-[76px] select-none pointer-events-none drop-shadow-[0_6px_16px_rgba(245,158,11,0.22)]">
      <svg
        viewBox="0 0 460 360"
        className="w-full h-full overflow-visible"
        aria-label="Sunny - Maskot Studio SunSight"
      >
        <defs>
          <radialGradient id="studioSunnyOuterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.30" />
            <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.16" />
            <stop offset="85%" stopColor="#FDE047" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="studioSunnyInnerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.42" />
            <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.04" />
          </radialGradient>

          <radialGradient id="studioSunnyAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.32" />
            <stop offset="60%" stopColor="#FBBF24" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="studioSunnyBody" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="35%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          <radialGradient id="studioSunnyRim" cx="42%" cy="38%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#FDE047" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Ambient Aura Glow */}
        <circle cx="230" cy="180" r="165" fill="url(#studioSunnyAura)" className="sun-wavy-breathe" />

        {/* 2. Halo Bergelombang Luar (Putaran Searah Jarum Jam) */}
        <g className="sun-wavy-spin-slow">
          <path
            d="M 388.00 180.00 C 388.00 207.30, 356.56 198.23, 349.83 218.94 C 343.11 239.64, 373.87 250.78, 357.82 272.87 C 341.78 294.96, 321.67 269.14, 304.06 281.94 C 286.45 294.73, 304.79 321.83, 278.82 330.27 C 252.86 338.70, 251.77 306.00, 230.00 306.00 C 208.23 306.00, 207.14 338.70, 181.18 330.27 C 155.21 321.83, 173.55 294.73, 155.94 281.94 C 138.33 269.14, 118.22 294.96, 102.18 272.87 C 86.13 250.78, 116.89 239.64, 110.17 218.94 C 103.44 198.23, 72.00 207.30, 72.00 180.00 C 72.00 152.70, 103.44 161.77, 110.17 141.06 C 116.89 120.36, 86.13 109.22, 102.18 87.13 C 118.22 65.04, 138.33 90.86, 155.94 78.06 C 173.55 65.27, 155.21 38.17, 181.18 29.73 C 207.14 21.30, 208.23 54.00, 230.00 54.00 C 251.77 54.00, 252.86 21.30, 278.82 29.73 C 304.79 38.17, 286.45 65.27, 304.06 78.06 C 321.67 90.86, 341.78 65.04, 357.82 87.13 C 373.87 109.22, 343.11 120.36, 349.83 141.06 C 356.56 161.77, 388.00 152.70, 388.00 180.00 Z"
            fill="url(#studioSunnyOuterGlow)"
          />
        </g>

        {/* 3. Halo Bergelombang Dalam (Putaran Berlawanan Jarum Jam) */}
        <g className="sun-wavy-spin-reverse">
          <path
            d="M 362.00 180.00 C 362.00 199.01, 338.34 192.93, 334.32 207.95 C 330.30 222.97, 353.82 229.54, 344.32 246.00 C 334.81 262.46, 317.36 245.37, 306.37 256.37 C 295.37 267.36, 312.46 284.81, 296.00 294.32 C 279.54 303.82, 272.97 280.30, 257.95 284.32 C 242.93 288.34, 249.01 312.00, 230.00 312.00 C 210.99 312.00, 217.07 288.34, 202.05 284.32 C 187.03 280.30, 180.46 303.82, 164.00 294.32 C 147.54 284.81, 164.63 267.36, 153.63 256.37 C 142.64 245.37, 125.19 262.46, 115.68 246.00 C 106.18 229.54, 129.70 222.97, 125.68 207.95 C 121.66 192.93, 98.00 199.01, 98.00 180.00 C 98.00 160.99, 121.66 167.07, 125.68 152.05 C 129.70 137.03, 106.18 130.46, 115.68 114.00 C 125.19 97.54, 142.64 114.63, 153.63 103.63 C 164.63 92.64, 147.54 75.19, 164.00 65.68 C 180.46 56.18, 187.03 79.70, 202.05 75.68 C 217.07 71.66, 210.99 48.00, 230.00 48.00 C 249.01 48.00, 242.93 71.66, 257.95 75.68 C 272.97 79.70, 279.54 56.18, 296.00 65.68 C 312.46 75.19, 295.37 92.64, 306.37 103.63 C 317.36 114.63, 334.81 97.54, 344.32 114.00 C 353.82 130.46, 330.30 137.03, 334.32 152.05 C 338.34 167.07, 362.00 160.99, 362.00 180.00 Z"
            fill="url(#studioSunnyInnerGlow)"
          />
        </g>

        {/* 4. Efek Jalur Kecepatan Udara saat Terbang */}
        {isGliding && (
          <g opacity="0.55" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse">
            <line x1="120" y1="210" x2="65" y2="228" />
            <line x1="138" y1="235" x2="80" y2="255" />
          </g>
        )}

        {/* 5. Kelompok Tubuh Utama Sunny:
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
            <circle cx="230" cy="180" r="95" fill="url(#studioSunnyBody)" />
            <circle cx="230" cy="180" r="95" fill="url(#studioSunnyRim)" />

            {/* Rona Pipi Manis */}
            <ellipse cx="180" cy="196" rx="14" ry="8" fill="#FB7185" opacity="0.55" />
            <ellipse cx="280" cy="196" rx="14" ry="8" fill="#FB7185" opacity="0.55" />

            {/* MATA dengan Kedip Alami GPU CSS */}
            {isCelebrating ? (
              <g stroke="#0F172A" strokeWidth="5.5" strokeLinecap="round" fill="none">
                <path d="M 180 174 Q 198 152 216 174" />
                <path d="M 244 174 Q 262 152 280 174" />
              </g>
            ) : (
              <g className="sunny-eye-blink">
                <ellipse cx="198" cy="168" rx="16" ry="17.5" fill="#FFFFFF" />
                <circle cx={198 + pupilOffsetX} cy={168 + pupilOffsetY} r="9" fill="#0F172A" />
                <circle cx={198 + pupilOffsetX + 3} cy={168 + pupilOffsetY - 3} r="3.2" fill="#FFFFFF" />

                <ellipse cx="262" cy="168" rx="16" ry="17.5" fill="#FFFFFF" />
                <circle cx={262 + pupilOffsetX} cy={168 + pupilOffsetY} r="9" fill="#0F172A" />
                <circle cx={262 + pupilOffsetX + 3} cy={168 + pupilOffsetY - 3} r="3.2" fill="#FFFFFF" />
              </g>
            )}

            {/* MULUT dengan Animasi Bicara Alami GPU CSS */}
            {isCelebrating ? (
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

export const StudioMascotGuide: React.FC<StudioMascotGuideProps> = ({
  isOpen,
  onOpen,
  onClose,
  onPopulateActiveFacet,
  onSetSolarPopulated,
  onSwitchTab,
  onOpenRightPanel,
  hasActiveSolar = false,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  // Mencegah Hydration Mismatch pada SSR
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Gliding Flight State saat transisi langkah
  const [isGliding, setIsGliding] = useState(false);
  const [glideDirection, setGlideDirection] = useState<number>(1);

  const rafMeasureRef = useRef<number | null>(null);

  // Refs untuk mencegah stale closure & render cycles
  const onSetSolarPopulatedRef = useRef(onSetSolarPopulated);
  useEffect(() => {
    onSetSolarPopulatedRef.current = onSetSolarPopulated;
  }, [onSetSolarPopulated]);

  const onSwitchTabRef = useRef(onSwitchTab);
  useEffect(() => {
    onSwitchTabRef.current = onSwitchTab;
  }, [onSwitchTab]);

  const onOpenRightPanelRef = useRef(onOpenRightPanel);
  useEffect(() => {
    onOpenRightPanelRef.current = onOpenRightPanel;
  }, [onOpenRightPanel]);

  // Eksekusi aksi interaktif saat langkah berubah
  useEffect(() => {
    if (!isOpen) return;
    const step = STUDIO_STEPS[currentStepIdx];
    if (!step) return;

    // 1. Buka panel kanan jika langkah membahas panel kanan
    if (step.requireOpenRightPanel) {
      onOpenRightPanelRef.current?.();
    }

    // 2. Praktek pasang panel surya atau reset ke kontur deteksi
    if (step.setSolarMode !== undefined) {
      onSetSolarPopulatedRef.current?.(step.setSolarMode);
    }

    // 3. Alihkan tab panel kanan secara otomatis
    if (step.tabTrigger) {
      onSwitchTabRef.current?.(step.tabTrigger);
    }
  }, [currentStepIdx, isOpen]);

  // Pengukuran Bounding Box Target Elemen Secara Aman (Dengan Subpixel Equality Guard)
  const updateTargetRect = useCallback(() => {
    const step = STUDIO_STEPS[currentStepIdx];
    if (!step) return false;

    const el = document.getElementById(step.targetId);
    if (!el) return false;

    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setTargetRect((prev) => {
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

  // Pengukuran target saat langkah berganti (tunggu jeda render DOM)
  useEffect(() => {
    if (!isOpen) return;

    let attempts = 0;
    let cancelled = false;

    const measureWithScroll = () => {
      if (cancelled) return;
      const step = STUDIO_STEPS[currentStepIdx];
      const el = step ? document.getElementById(step.targetId) : null;

      if (el) {
        updateTargetRect();
      } else if (attempts < 12) {
        attempts++;
        rafMeasureRef.current = requestAnimationFrame(measureWithScroll);
      }
    };

    const timer = setTimeout(measureWithScroll, 75);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (rafMeasureRef.current) {
        cancelAnimationFrame(rafMeasureRef.current);
      }
    };
  }, [currentStepIdx, isOpen, updateTargetRect]);

  // Listener Resize & Scroll dengan Throttling RAF
  useEffect(() => {
    if (!isOpen) return;

    let rafId: number | null = null;
    const handleUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateTargetRect();
      });
    };

    window.addEventListener("scroll", handleUpdate, { passive: true });
    window.addEventListener("resize", handleUpdate);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isOpen, updateTargetRect]);

  // Navigasi Langkah
  const handleNext = () => {
    if (currentStepIdx < STUDIO_STEPS.length - 1) {
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
    if (typeof window !== "undefined") {
      localStorage.setItem("sunsight_studio_tour_completed", "true");
    }
    onClose();
  }, [onClose]);

  // Cegah render di SSR untuk menghilangkan 100% hydration mismatch
  if (!isMounted || !isOpen) {
    return null;
  }

  const currentStep = STUDIO_STEPS[currentStepIdx];
  const isLastStep = currentStepIdx === STUDIO_STEPS.length - 1;

  // Dimensi Padding & Sudut Lingkaran Spotlight
  const pad = 12;
  const radius = 24;

  // Perhitungan Posisi Dialog Card yang Adaptif terhadap Posisi Target
  const cardWidth = typeof window !== "undefined" ? Math.min(380, window.innerWidth - 32) : 380;
  const cardHeight = 220;

  let cardTop = 100;
  let cardLeft = 24;

  if (targetRect && typeof window !== "undefined") {
    const isTargetOnRightSide = targetRect.x > window.innerWidth / 2;

    if (isTargetOnRightSide) {
      // Jika target berada di panel kanan (Tab 1, Tab 2, Tab 3), letakkan kartu di sebelah KIRI panel
      cardLeft = Math.max(16, targetRect.x - cardWidth - 20);
      cardTop = Math.max(80, Math.min(window.innerHeight - cardHeight - 30, targetRect.y + 20));
    } else {
      // Jika target berada di kanvas tengah (atap), posisikan di bawah atau di atas bidang atap
      const spaceBelow = window.innerHeight - (targetRect.y + targetRect.height);
      const spaceAbove = targetRect.y;

      if (spaceBelow >= cardHeight + 30) {
        cardTop = targetRect.y + targetRect.height + 16;
      } else if (spaceAbove >= cardHeight + 30) {
        cardTop = targetRect.y - cardHeight - 16;
      } else {
        cardTop = Math.max(16, window.innerHeight - cardHeight - 20);
      }

      cardLeft = targetRect.x + (targetRect.width / 2) - (cardWidth / 2);
      if (cardLeft + cardWidth > window.innerWidth - 16) {
        cardLeft = window.innerWidth - cardWidth - 16;
      }
      if (cardLeft < 16) {
        cardLeft = 16;
      }
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
          <mask id="sunsight-studio-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
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

        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.48)"
          mask="url(#sunsight-studio-spotlight-mask)"
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
          
          {/* Maskot Sunny yang Bertengger Manis di Sudut Kiri Kartu (Sejajar Badge & Bebas Tabrakan Teks) */}
          <div className="absolute -top-2.5 sm:-top-3 left-2 sm:left-2.5">
            <AnimatedSunnyStudioMascot
              expression={currentStep.expression}
              isGliding={isGliding}
              glideDirection={glideDirection}
            />
          </div>

          {/* Header Card: Badge Step & Tombol Tutup */}
          <div className="flex items-center justify-between gap-2 mb-3.5 pl-16 sm:pl-[74px]">
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
          <div className="pl-1 pt-1.5 mb-4">
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
              {STUDIO_STEPS.map((_, idx) => (
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

              {/* Tombol Radiant Soft Glow */}
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
