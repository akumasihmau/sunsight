"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";

type Props = {
  azimuthDeg: number;
  tiltDeg: number;
  disabled?: boolean;
  onChangeAzimuth: (azimuthDeg: number) => void;
};

const COMPASS_PRESETS = [
  { label: "Utara (0°)", deg: 0 },
  { label: "Timur (90°)", deg: 90 },
  { label: "Selatan (180°)", deg: 180 },
  { label: "Barat (270°)", deg: 270 },
];

function cardinalLabel(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "Utara (N)";
  if (normalized < 67.5) return "Timur Laut (NE)";
  if (normalized < 112.5) return "Timur (E)";
  if (normalized < 157.5) return "Tenggara (SE)";
  if (normalized < 202.5) return "Selatan (S)";
  if (normalized < 247.5) return "Barat Daya (SW)";
  if (normalized < 292.5) return "Barat (W)";
  return "Barat Laut (NW)";
}

export function AzimuthCompass({ azimuthDeg, tiltDeg, disabled = false, onChangeAzimuth }: Props) {
  const dialRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);

  function updateFromPointer(clientX: number, clientY: number) {
    const svg = dialRef.current;
    if (!svg || disabled) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // 0° berada di Utara (atas), bertambah searah jarum jam
    const rawDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const normalized = Math.round(((rawDeg % 360) + 360) % 360);
    onChangeAzimuth(normalized);
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (disabled) return;
    event.preventDefault();
    draggingRef.current = true;
    dialRef.current?.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX, event.clientY);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!draggingRef.current || disabled) return;
    updateFromPointer(event.clientX, event.clientY);
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    draggingRef.current = false;
    if (dialRef.current?.hasPointerCapture(event.pointerId)) {
      dialRef.current.releasePointerCapture(event.pointerId);
    }
  }

  const tiltRad = (Math.min(60, Math.max(0, tiltDeg)) * Math.PI) / 180;
  const roofEndX = 16 + Math.cos(tiltRad) * 52;
  const roofEndY = 48 - Math.sin(tiltRad) * 40;

  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200/90 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-amber-600 text-[18px]">explore</span>
          <span className="text-xs font-bold text-slate-900 font-title">
            Kompas Azimuth &amp; Profil Sudut
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 text-[11px] font-bold tracking-tight">
          {azimuthDeg}° · {cardinalLabel(azimuthDeg)}
        </span>
      </div>

      <div className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
        <div className="flex items-center justify-center">
          <svg
            ref={dialRef}
            viewBox="0 0 120 120"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`w-28 h-28 select-none ${
              disabled
                ? "opacity-60 cursor-not-allowed"
                : "cursor-grab active:cursor-grabbing touch-none"
            }`}
            aria-label="Dial Kompas Azimuth Atap"
          >
            <circle cx="60" cy="60" r="54" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            <text x="60" y="17" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#EF4444">
              U
            </text>
            <text x="105" y="63" textAnchor="middle" fontSize="9" fontWeight="700" fill="#64748B">
              T
            </text>
            <text x="60" y="110" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0F172A">
              S
            </text>
            <text x="15" y="63" textAnchor="middle" fontSize="9" fontWeight="700" fill="#64748B">
              B
            </text>

            <g transform={`rotate(${azimuthDeg} 60 60)`}>
              <path d="M 60 60 L 46 24 A 40 40 0 0 1 74 24 Z" fill="#FEF3C7" opacity="0.85" />
              <line
                x1="60"
                y1="60"
                x2="60"
                y2="22"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="60" cy="22" r="5.5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1.8" />
            </g>

            <circle cx="60" cy="60" r="6" fill="#0F172A" />
            <circle cx="60" cy="60" r="2.2" fill="#FBBF24" />
          </svg>
        </div>

        <div className="space-y-2">
          <div className="rounded-xl bg-white border border-slate-200/80 p-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 mb-1">
              <span>Profil Kemiringan</span>
              <span className="font-bold text-sky-700 tracking-tight">{tiltDeg}°</span>
            </div>
            <svg viewBox="0 0 84 56" className="w-full h-11">
              <line
                x1="10"
                y1="48"
                x2="76"
                y2="48"
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <path
                d={`M 16 48 L 38 48 A 22 22 0 0 0 ${16 + Math.cos(tiltRad) * 22} ${
                  48 - Math.sin(tiltRad) * 22
                } Z`}
                fill="#FDE68A"
                opacity="0.65"
              />
              <line
                x1="16"
                y1="48"
                x2={roofEndX}
                y2={roofEndY}
                stroke="#0284C7"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx="16" cy="48" r="2.8" fill="#0F172A" />
              <circle cx="70" cy="12" r="5" fill="#F59E0B" />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {COMPASS_PRESETS.map((preset) => (
              <button
                key={preset.deg}
                type="button"
                disabled={disabled}
                onClick={() => onChangeAzimuth(preset.deg)}
                className={`py-1 px-1.5 rounded-lg text-[10.5px] font-semibold border transition cursor-pointer ${
                  azimuthDeg === preset.deg
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white hover:bg-amber-50 text-slate-700 border-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="m-0 text-[10.5px] text-slate-500 leading-snug">
        Putar jarum kompas untuk memilih arah hadap lereng atap (masukan pengguna, bukan deteksi
        otomatis dari citra nadir).
      </p>
    </div>
  );
}

