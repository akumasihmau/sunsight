"use client";

import React from "react";

export type SunnyExpression =
  | "happy"
  | "waving"
  | "kepo"
  | "pointing"
  | "celebrating"
  | "thinking";

interface SunnyMascotProps {
  size?: number;
  expression?: SunnyExpression;
  animated?: boolean;
  className?: string;
  badgeText?: string;
}

export const SunnyMascot: React.FC<SunnyMascotProps> = ({
  size = 80,
  expression = "happy",
  animated = true,
  className = "",
  badgeText,
}) => {
  // Koordinat pandangan mata & fitur berdasarkan ekspresi
  const isHappy = expression === "happy";
  const isWaving = expression === "waving";
  const isKepo = expression === "kepo";
  const isPointing = expression === "pointing";
  const isCelebrating = expression === "celebrating";
  const isThinking = expression === "thinking";

  // Pergeseran pupil
  let pupilOffsetX = 0;
  let pupilOffsetY = 0;
  if (isKepo || isPointing) {
    pupilOffsetX = 3.5;
    pupilOffsetY = 1;
  } else if (isThinking) {
    pupilOffsetX = -2;
    pupilOffsetY = -3;
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 200 200"
        className={`w-full h-full overflow-visible ${
          animated ? "animate-pulse-gentle transition-transform duration-300 hover:scale-105" : ""
        }`}
        aria-label="Sunny - Maskot SunSight"
      >
        <defs>
          {/* Radial Aura Glow */}
          <radialGradient id="sunnyAuraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.45" />
            <stop offset="65%" stopColor="#F59E0B" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>

          {/* Badan Matahari Utama */}
          <linearGradient id="sunnyBodyGrad" x1="20%" y1="10%" x2="80%" y2="90%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="35%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Kilau Halus di Tepi Atas */}
          <linearGradient id="sunnyRimGlow" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Bayangan Halus di Bawah */}
          <radialGradient id="sunnyBottomShadow" cx="50%" cy="100%" r="50%">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Ambient Glow Ring */}
        <circle cx="100" cy="100" r="94" fill="url(#sunnyAuraGlow)" />

        {/* 2. Scalloped Soft Sun Rays (Pendaran Sinar Berkelopak Halus seperti di Slide PPT) */}
        <g opacity="0.45" className={animated ? "animate-spin-slow origin-center" : ""}>
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <circle
              key={deg}
              cx="100"
              cy="100"
              r="76"
              fill="none"
              stroke="#FDE047"
              strokeWidth="14"
              strokeDasharray="18 21"
              strokeLinecap="round"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
        </g>

        {/* 3. Badan Bulat Maskot Matahari */}
        <circle cx="100" cy="100" r="66" fill="url(#sunnyBodyGrad)" />
        <circle cx="100" cy="100" r="66" fill="url(#sunnyRimGlow)" />
        <circle cx="100" cy="100" r="66" fill="url(#sunnyBottomShadow)" />

        {/* 4. Rona Pipi Manis (Blush) */}
        <ellipse cx="68" cy="112" rx="9" ry="5.5" fill="#FB7185" opacity="0.55" />
        <ellipse cx="132" cy="112" rx="9" ry="5.5" fill="#FB7185" opacity="0.55" />

        {/* 5. MATA (Eyes) */}
        {isCelebrating ? (
          /* Mata Bintang / Ceria Lebar (^.^) */
          <g stroke="#1E293B" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M 66 98 Q 78 84 90 98" />
            <path d="M 110 98 Q 122 84 134 98" />
          </g>
        ) : (
          /* Mata Kartun Bulat Berbinar Menatap Ramah */
          <g>
            {/* Mata Kiri */}
            <ellipse cx="80" cy="94" rx="11.5" ry="12.5" fill="#FFFFFF" />
            <circle
              cx={80 + pupilOffsetX}
              cy={94 + pupilOffsetY}
              r="6.5"
              fill="#0F172A"
            />
            {/* Binar Putih Mata Kiri */}
            <circle
              cx={80 + pupilOffsetX + 2}
              cy={94 + pupilOffsetY - 2}
              r="2.2"
              fill="#FFFFFF"
            />

            {/* Mata Kanan */}
            <ellipse cx="120" cy="94" rx="11.5" ry="12.5" fill="#FFFFFF" />
            <circle
              cx={120 + pupilOffsetX}
              cy={94 + pupilOffsetY}
              r="6.5"
              fill="#0F172A"
            />
            {/* Binar Putih Mata Kanan */}
            <circle
              cx={120 + pupilOffsetX + 2}
              cy={94 + pupilOffsetY - 2}
              r="2.2"
              fill="#FFFFFF"
            />
          </g>
        )}

        {/* 6. MULUT (Mouth) */}
        {isCelebrating ? (
          /* Senyum Lebar Bahagia :D */
          <path
            d="M 91 110 Q 100 125 109 110 Z"
            fill="#E11D48"
            stroke="#1E293B"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        ) : isThinking ? (
          /* Mulut Mungil Berpikir :o */
          <ellipse cx="100" cy="116" rx="3.5" ry="4" fill="#0F172A" />
        ) : (
          /* Senyum Manis Kecil Ramah */
          <path
            d="M 93 112 Q 100 119 107 112"
            fill="none"
            stroke="#0F172A"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        )}

        {/* 7. Tangan / Lambaian Khusus (Waving / Pointing) */}
        {isWaving && (
          <g className="animate-bounce origin-bottom" style={{ animationDuration: "1.2s" }}>
            <ellipse cx="160" cy="80" rx="9" ry="13" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" transform="rotate(35 160 80)" />
            <circle cx="164" cy="73" r="5" fill="#FEF08A" />
          </g>
        )}

        {isPointing && (
          <g className="animate-pulse">
            <path
              d="M 155 110 L 176 104 L 170 116 Z"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Optional Badge Label */}
      {badgeText && (
        <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-amber-500 text-white font-title text-[9px] font-bold shadow-xs whitespace-nowrap">
          {badgeText}
        </span>
      )}
    </div>
  );
};

