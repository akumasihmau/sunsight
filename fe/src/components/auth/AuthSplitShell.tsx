"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type AuthSplitShellProps = {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
  isExcited?: boolean;
  bottomSlot?: ReactNode;
  children: ReactNode;
};

type MascotState =
  | "idle"
  | "kepo"
  | "pwd_hidden"
  | "pwd_peek"
  | "pwd_approve"
  | "pwd_retreat";

export function AuthSplitShell({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Kembali ke Beranda",
  isExcited = false,
  bottomSlot,
  children,
}: AuthSplitShellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Mascot interaction states:
  // "idle": shines happily alone, buoyant hover, tracks cursor gaze & blinks naturally
  // "kepo": leans curiously toward form when typing name/email/phone
  // "pwd_hidden": cloud slides in to cover sun; sun ducks down behind cloud with closed sleepy eyes (◡ ◡)
  // "pwd_peek": sun tilts head & pops up over the cloud crest with cute little paws holding the cloud rim!
  // "pwd_approve": sun nods up & down happily (^‿^) approving the password with sparkles & green check!
  // "pwd_retreat": sun ducks back down into the cloud, paws retract, and closes eyes again
  const [mascotState, setMascotState] = useState<MascotState>("idle");
  const [isBlinking, setIsBlinking] = useState(false);
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const mascotStateRef = useRef<MascotState>("idle");
  const pwdCycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mascotStateRef.current = mascotState;
  }, [mascotState]);

  // Interactive password hide-and-seek loop (Smooth, cute & playful!)
  const startPasswordCycle = useCallback(() => {
    if (pwdCycleTimerRef.current) clearTimeout(pwdCycleTimerRef.current);

    const stepHidden = () => {
      setMascotState("pwd_hidden");
      pwdCycleTimerRef.current = setTimeout(stepPeek, 1400);
    };

    const stepPeek = () => {
      setMascotState("pwd_peek");
      pwdCycleTimerRef.current = setTimeout(stepApprove, 1100);
    };

    const stepApprove = () => {
      setMascotState("pwd_approve");
      pwdCycleTimerRef.current = setTimeout(stepRetreat, 1300);
    };

    const stepRetreat = () => {
      setMascotState("pwd_retreat");
      pwdCycleTimerRef.current = setTimeout(stepHidden, 650);
    };

    stepHidden();
  }, []);

  const stopPasswordCycle = useCallback(() => {
    if (pwdCycleTimerRef.current) {
      clearTimeout(pwdCycleTimerRef.current);
      pwdCycleTimerRef.current = null;
    }
    setMascotState("idle");
  }, []);

  // Mouse gaze tracking in idle mode
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const current = mascotStateRef.current;
      if (
        current === "pwd_hidden" ||
        current === "pwd_peek" ||
        current === "pwd_approve" ||
        current === "pwd_retreat"
      ) {
        return; // Password loop handles pupil positions
      }

      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const mascotCenterX = rect.left + rect.width * 0.5;
      const mascotCenterY = rect.top + rect.height * 0.45;

      const dx = e.clientX - mascotCenterX;
      const dy = e.clientY - mascotCenterY;
      const angle = Math.atan2(dy, dx);
      const distRatio = Math.min(1, Math.hypot(dx, dy) / 240);

      const maxPupilOffset = 4.2;
      const targetX = Math.cos(angle) * maxPupilOffset * distRatio;
      const targetY = Math.sin(angle) * (maxPupilOffset * 0.75) * distRatio;

      setGaze({
        x: Number(targetX.toFixed(2)),
        y: Number(targetY.toFixed(2)),
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Form input & focus detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      const isPassword =
        el.dataset?.mascotPassword === "true" || (el as HTMLInputElement).type === "password";

      if (isPassword) {
        startPasswordCycle();
      } else if (el.tagName === "INPUT" || el.tagName === "SELECT") {
        stopPasswordCycle();
        setMascotState("kepo");
        setGaze({ x: 4.2, y: 0.8 });
      }
    };

    const onFocusOut = () => {
      requestAnimationFrame(() => {
        const active = document.activeElement as HTMLElement | null;
        const stillInPassword =
          active?.dataset?.mascotPassword === "true" ||
          (active as HTMLInputElement)?.type === "password";
        const stillInInput = active?.tagName === "INPUT" || active?.tagName === "SELECT";

        if (stillInPassword) {
          // Remain in password mode
        } else if (stillInInput) {
          stopPasswordCycle();
          setMascotState("kepo");
          setGaze({ x: 4.2, y: 0.8 });
        } else {
          stopPasswordCycle();
          setMascotState("idle");
          setGaze({ x: 0, y: 0 });
        }
      });
    };

    const onInput = (e: Event) => {
      const el = e.target as HTMLInputElement | null;
      if (!el) return;

      const isPassword =
        el.dataset?.mascotPassword === "true" || el.type === "password";

      if (isPassword) {
        const cur = mascotStateRef.current;
        if (
          cur !== "pwd_hidden" &&
          cur !== "pwd_peek" &&
          cur !== "pwd_approve" &&
          cur !== "pwd_retreat"
        ) {
          startPasswordCycle();
        }
      } else if (el.tagName === "INPUT") {
        if (mascotStateRef.current !== "kepo") {
          setMascotState("kepo");
        }
        setGaze({ x: 4.2, y: 0.8 });
      }
    };

    container.addEventListener("focusin", onFocusIn);
    container.addEventListener("focusout", onFocusOut);
    container.addEventListener("input", onInput);

    // Natural blinking loop (ONLY in idle or kepo mode)
    let blinkTimer: ReturnType<typeof setTimeout> | null = null;
    let unblinkTimer: ReturnType<typeof setTimeout> | null = null;

    const runBlink = () => {
      const nextDelay = 3200 + Math.random() * 2600;
      blinkTimer = setTimeout(() => {
        const cur = mascotStateRef.current;
        if (cur === "idle" || cur === "kepo") {
          setIsBlinking(true);
          unblinkTimer = setTimeout(() => {
            setIsBlinking(false);
            runBlink();
          }, 140);
        } else {
          runBlink();
        }
      }, nextDelay);
    };
    runBlink();

    return () => {
      container.removeEventListener("focusin", onFocusIn);
      container.removeEventListener("focusout", onFocusOut);
      container.removeEventListener("input", onInput);
      if (pwdCycleTimerRef.current) clearTimeout(pwdCycleTimerRef.current);
      if (blinkTimer) clearTimeout(blinkTimer);
      if (unblinkTimer) clearTimeout(unblinkTimer);
    };
  }, [startPasswordCycle, stopPasswordCycle]);

  // Mascot state flags
  const isKepo = mascotState === "kepo";
  const isPwdHidden = mascotState === "pwd_hidden";
  const isPwdPeek = mascotState === "pwd_peek";
  const isPwdApprove = mascotState === "pwd_approve";
  const isPwdRetreat = mascotState === "pwd_retreat";
  const isPasswordMode = isPwdHidden || isPwdPeek || isPwdApprove || isPwdRetreat;
  const isSleeping = isPwdHidden || isPwdRetreat;
  const isPeekingOrApproving = isPwdPeek || isPwdApprove;

  // Sun transforms:
  // - idle: cheerful buoyant tilt (-14deg) matching reference photo
  // - kepo: leans forward towards form (rotate 4deg)
  // - hidden: ducked down behind cloud
  // - peek: pops up with head tilted (rotate 5deg)
  // - approve: happy upright nod
  // - retreat: slides back down into the cloud
  const sunTransform = isPwdHidden
    ? "translate(0px, 58px) scale(0.95)"
    : isPwdPeek
    ? "translate(8px, 12px) rotate(5deg)"
    : isPwdApprove
    ? "translate(0px, 8px) rotate(0deg)"
    : isPwdRetreat
    ? "translate(0px, 55px) scale(0.95)"
    : isKepo
    ? "translate(14px, -4px) rotate(4deg)"
    : isExcited
    ? "translateY(-14px) rotate(-14deg) scale(1.06)"
    : "translate(0px, 0px) rotate(-14deg)";

  // Cloud ONLY appears in password mode! In idle / kepo it stays hidden down below with opacity 0.
  const cloudTransform = isPasswordMode ? "translateY(0px) scale(1)" : "translateY(80px) scale(0.85)";

  // Pupil offsets: in peeking, looks warmly right towards the password field
  const currentPupilX = isPwdPeek ? 4.8 : isKepo ? 4.2 : gaze.x;
  const currentPupilY = isPwdPeek ? 0.8 : isKepo ? 0.8 : gaze.y;

  return (
    <section
      ref={containerRef}
      className="min-h-screen w-full bg-gradient-to-br from-[#FAF5EC] via-[#F6F0E4] to-[#FAF4EB] p-4 sm:p-6 lg:p-8 flex flex-col justify-between select-none relative overflow-x-hidden font-sans text-slate-800"
    >
      {/* Soft Ambient Warm Sunlight Glows in Background */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-20 w-80 h-80 bg-orange-100/25 rounded-full blur-3xl pointer-events-none" />

      {/* Main Split Layout: Stretches corner to corner across full screen */}
      <div className="w-full flex-1 flex flex-col lg:flex-row items-stretch justify-between gap-6 lg:gap-10 relative z-10">
        
        {/* =====================================================
            LEFT: ADORABLE CHIBI SUN & CLOUD MASCOT
            ===================================================== */}
        <div className="flex-1 flex flex-col justify-between relative min-h-[400px] lg:min-h-0">
          
          {/* Top Left: Sleek Clean Back Button */}
          <div className="w-full flex items-center justify-start pt-1 px-1">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition py-1.5 px-3.5 rounded-full bg-white/70 hover:bg-white backdrop-blur-md border border-amber-200/60 shadow-2xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>{backLabel}</span>
            </Link>
          </div>

          {/* Center Stage: Frosted Glass Mascot Canvas */}
          <div className="my-auto w-full flex items-center justify-center p-2 sm:p-6">
            <div className="w-full max-w-[500px] p-6 sm:p-8 rounded-[36px] bg-white/50 backdrop-blur-xl border border-white/80 shadow-[0_12px_40px_rgba(235,94,40,0.05)] flex items-center justify-center">
              
              <svg
                ref={svgRef}
                viewBox="0 0 500 370"
                className="w-full h-auto overflow-visible select-none"
                aria-label="Maskot Matahari SunSight"
              >
                <defs>
                  {/* Soft Warm Radial Aura behind Sun */}
                  <radialGradient id="sunAura" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FB923C" stopOpacity="0.28" />
                    <stop offset="60%" stopColor="#FDBA74" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#FED7AA" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Soft Warm Radial Aura behind Sun */}
                <circle cx="250" cy="160" r="145" fill="url(#sunAura)" />

                {/* ===================================================
                    FLUFFY CARTOON CLOUDS (BACKGROUND)
                    =================================================== */}
                {/* Top Left Cloud */}
                <g className="cloud-puffy-1" opacity="0.95">
                  <path
                    d="M 40 65 
                       C 25 65 15 50 25 38 
                       C 25 24 40 18 52 25 
                       C 62 14 80 16 88 28 
                       C 98 28 106 36 104 46 
                       C 112 55 106 65 92 65 Z"
                    fill="#FFFFFF"
                  />
                </g>

                {/* Top Right Cloud */}
                <g className="cloud-puffy-2" opacity="0.95">
                  <path
                    d="M 390 68 
                       C 375 68 368 54 376 44 
                       C 376 30 392 24 404 30 
                       C 414 18 434 20 442 32 
                       C 452 32 462 42 458 52 
                       C 466 60 460 68 446 68 Z"
                    fill="#FFFFFF"
                  />
                </g>

                {/* Mid-Left Fluffy Cloud */}
                <g className="cloud-puffy-3" opacity="0.88">
                  <path
                    d="M 25 240 
                       C 12 240 5 228 14 218 
                       C 14 206 28 200 38 206 
                       C 46 196 64 198 70 208 
                       C 80 208 86 216 84 224 
                       C 90 232 84 240 72 240 Z"
                    fill="#FFFFFF"
                  />
                </g>

                {/* Mid-Right Fluffy Cloud */}
                <g className="cloud-puffy-2" opacity="0.88">
                  <path
                    d="M 410 245 
                       C 398 245 390 234 398 225 
                       C 398 214 410 208 420 214 
                       C 428 204 444 206 450 215 
                       C 458 215 464 222 462 230 
                       C 468 237 462 245 450 245 Z"
                    fill="#FFFFFF"
                  />
                </g>

                {/* Whimsical Ambient Sparkle Stars */}
                <path
                  d="M 115 80 Q 115 88 107 88 Q 115 88 115 96 Q 115 88 123 88 Q 115 88 115 80 Z"
                  fill="#FBBF24"
                  opacity="0.45"
                />
                <path
                  d="M 390 95 Q 390 103 382 103 Q 390 103 390 111 Q 390 103 398 103 Q 390 103 390 95 Z"
                  fill="#FBBF24"
                  opacity="0.45"
                />

                {/* ===================================================
                    1. THE ADORABLE SUN MASCOT (Starburst Corona & Smiling Face)
                    =================================================== */}
                <g className={mascotState === "idle" ? "sun-gentle-hover" : isPwdApprove ? "sun-gentle-nod" : ""}>
                  <g
                    className="mascot-smooth-transition"
                    style={{
                      transform: sunTransform,
                      transformOrigin: "250px 160px",
                    }}
                  >
                    {/* 8-Pointed Starburst Corona with Smooth Inward Curved Scoops */}
                    <path
                      d="M 250.0 54.0 A 60 60 0 0 0 325.0 85.0 A 60 60 0 0 0 356.0 160.0 A 60 60 0 0 0 325.0 235.0 A 60 60 0 0 0 250.0 266.0 A 60 60 0 0 0 175.0 235.0 A 60 60 0 0 0 144.0 160.0 A 60 60 0 0 0 175.0 85.0 A 60 60 0 0 0 250.0 54.0 Z"
                      fill="#FA8223"
                      className="sun-corona-breathe"
                    />

                    {/* Concentric Sunshine Yellow Face Circle */}
                    <circle cx="250" cy="160" r="70" fill="#FFDA27" />

                    {/* =================================================
                        FACE ELEMENTS (Cute, Expressive & Lively)
                        ================================================= */}
                    <g>
                      {/* Big Warm Orange Round Blush Cheeks */}
                      <circle cx="206" cy="168" r="13" fill="#FA8223" />
                      <circle cx="294" cy="168" r="13" fill="#FA8223" />

                      {/* EYES */}
                      {isSleeping ? (
                        /* Sleepy Closed Arcs (◡ ◡) while hidden behind cloud */
                        <g>
                          <path
                            d="M 215 150 Q 222 157 229 150"
                            fill="none"
                            stroke="#1F1D1A"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M 271 150 Q 278 157 285 150"
                            fill="none"
                            stroke="#1F1D1A"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                          />
                        </g>
                      ) : isBlinking ? (
                        /* Natural Quick Blink Slits */
                        <g>
                          <line
                            x1="215"
                            y1="150"
                            x2="229"
                            y2="150"
                            stroke="#1F1D1A"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                          />
                          <line
                            x1="271"
                            y1="150"
                            x2="285"
                            y2="150"
                            stroke="#1F1D1A"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                          />
                        </g>
                      ) : isPwdApprove ? (
                        /* Joyful squint happy curves (^‿^) */
                        <g>
                          <path
                            d="M 215 150 Q 222 143 229 150"
                            fill="none"
                            stroke="#1F1D1A"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M 271 150 Q 278 143 285 150"
                            fill="none"
                            stroke="#1F1D1A"
                            strokeWidth="3.2"
                            strokeLinecap="round"
                          />
                        </g>
                      ) : (
                        /* Open Cute Round Black Bead Eyes with Smooth Gaze Tracking */
                        <g
                          className="pupil-smooth-transition"
                          style={{
                            transform: `translate(${currentPupilX}px, ${currentPupilY}px)`,
                          }}
                        >
                          <circle cx="222" cy="150" r="6.5" fill="#1F1D1A" />
                          <circle cx="278" cy="150" r="6.5" fill="#1F1D1A" />
                        </g>
                      )}

                      {/* MOUTH */}
                      {isSleeping ? (
                        <path
                          d="M 244 168 Q 250 171 256 168"
                          fill="none"
                          stroke="#1F1D1A"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      ) : isPwdApprove ? (
                        <path
                          d="M 235 165 Q 250 184 265 165"
                          fill="none"
                          stroke="#1F1D1A"
                          strokeWidth="4.2"
                          strokeLinecap="round"
                        />
                      ) : (
                        /* Sweet Clean Curved Line Smile (◡) */
                        <path
                          d="M 235 165 Q 250 182 265 165"
                          fill="none"
                          stroke="#1F1D1A"
                          strokeWidth="4.2"
                          strokeLinecap="round"
                        />
                      )}
                    </g>

                    {/* Celebratory sparkles when password is approved */}
                    {isPwdApprove && (
                      <g className="sparkle-pop">
                        <path
                          d="M 210 110 Q 210 118 202 118 Q 210 118 210 126 Q 210 118 218 118 Q 210 118 210 110 Z"
                          fill="#F59E0B"
                        />
                        <path
                          d="M 290 110 Q 290 118 282 118 Q 290 118 290 126 Q 290 118 298 118 Q 290 118 290 110 Z"
                          fill="#F59E0B"
                        />
                      </g>
                    )}
                  </g>
                </g>

                {/* ===================================================
                    2. FLUFFY CARTOON CLOUD (ACTIVE IN PASSWORD MODE)
                    =================================================== */}
                <g
                  className="cloud-spring-transition"
                  style={{
                    transform: cloudTransform,
                    opacity: isPasswordMode ? 1 : 0,
                    pointerEvents: "none",
                  }}
                >
                  {/* Soft Warm Ground Shadow */}
                  <ellipse cx="250" cy="315" rx="145" ry="9" fill="#FA8223" opacity="0.1" />

                  {/* Fluffy Bubbly Puffy Cloud Body */}
                  <path
                    d="M 130 285
                       C 105 285 90 262 105 242
                       C 105 220 126 205 148 214
                       C 162 190 196 182 220 196
                       C 235 186 265 186 280 196
                       C 304 182 338 190 352 214
                       C 374 205 395 220 395 242
                       C 410 262 395 285 370 285 Z"
                    fill="#FFFFFF"
                    stroke="#FDE68A"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />

                  {/* Soft Tactile Cloud Puffs Highlights */}
                  <path d="M 195 194 C 205 188 220 190 228 196" fill="none" stroke="#FEF3C7" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 272 196 C 280 190 295 188 305 194" fill="none" stroke="#FEF3C7" strokeWidth="3" strokeLinecap="round" />

                  {/* Soft Pink Blush on the Cloud */}
                  <ellipse cx="150" cy="250" rx="10" ry="6" fill="#FDA4AF" opacity="0.5" />
                  <ellipse cx="350" cy="250" rx="10" ry="6" fill="#FDA4AF" opacity="0.5" />

                  {/* Cute Yellow Paws Resting on Cloud Rim */}
                  <g
                    className={`mascot-smooth-transition ${isPwdPeek ? "paws-wiggle" : ""}`}
                    style={{
                      opacity: isPwdPeek ? 1 : 0,
                      transform: isPwdPeek ? "translateY(0px)" : "translateY(12px)",
                    }}
                  >
                    {/* Left Paw */}
                    <ellipse cx="204" cy="198" rx="12" ry="8.5" fill="#FFDA27" stroke="#FA8223" strokeWidth="2.5" />
                    {/* Right Paw */}
                    <ellipse cx="296" cy="198" rx="12" ry="8.5" fill="#FFDA27" stroke="#FA8223" strokeWidth="2.5" />
                  </g>
                </g>
              </svg>
            </div>
          </div>

          {/* Clean Bottom Spacer */}
          <div className="h-6" />
        </div>

        {/* =====================================================
            RIGHT: MODERN CRISP AUTH CARD (Compact, Balanced & Centered)
            ===================================================== */}
        <div className="w-full lg:w-[450px] xl:w-[480px] self-center my-auto bg-white/95 backdrop-blur-2xl rounded-[32px] border border-white/90 shadow-[0_16px_48px_rgba(245,158,11,0.06)] px-6 sm:px-9 py-7 sm:py-8 flex flex-col justify-center shrink-0">
          
          {/* Header with SunSight Brand */}
          <div className="text-center pb-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center mb-3 hover:scale-102 transition cursor-pointer"
              title="SunSight Beranda"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="SunSight" className="h-8 w-auto" />
            </Link>

            <h1 className="text-2xl sm:text-[25px] font-extrabold text-slate-900 font-title tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5 leading-relaxed max-w-sm mx-auto">{subtitle}</p>
          </div>

          {/* Form Content Slot */}
          <div className="mt-3">{children}</div>

          {/* Footer Slot */}
          {bottomSlot !== undefined && (
            <div className="text-center text-xs text-slate-500 mt-4 pt-3.5 border-t border-slate-100">
              {bottomSlot}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
