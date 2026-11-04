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
  // "idle": shines happily alone (no cloud in the way!), tracks cursor gaze & blinks naturally
  // "kepo": leans curiously toward form when typing name/email/phone
  // "pwd_hidden": cloud flies in to cover sun; sun ducks down behind cloud with closed sleepy eyes (︶ ︶)
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

  // Interactive password hide-and-seek loop
  const startPasswordCycle = useCallback(() => {
    if (pwdCycleTimerRef.current) clearTimeout(pwdCycleTimerRef.current);

    const stepHidden = () => {
      setMascotState("pwd_hidden");
      pwdCycleTimerRef.current = setTimeout(stepPeek, 1500);
    };

    const stepPeek = () => {
      setMascotState("pwd_peek");
      pwdCycleTimerRef.current = setTimeout(stepApprove, 1000);
    };

    const stepApprove = () => {
      setMascotState("pwd_approve");
      pwdCycleTimerRef.current = setTimeout(stepRetreat, 1400);
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
        return; // Password loop handles pupil position
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

      const maxPupilOffset = 4.5;
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
        setGaze({ x: 4.5, y: 1.2 });
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
          setGaze({ x: 4.5, y: 1.2 });
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
        setGaze({ x: 4.5, y: 1.2 });
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
  // - hidden: sunken low behind cloud (58px)
  // - peek: pops up with head tilted (10px, rotate 5deg), clearing the cloud top dip!
  // - approve: elevated and nodding up & down with sun-nodding class
  // - retreat: slides back down into the cloud (55px)
  const sunTransform = isPwdHidden
    ? "translate(0px, 58px) scale(0.95)"
    : isPwdPeek
    ? "translate(10px, 10px) rotate(5deg)"
    : isPwdApprove
    ? "translate(10px, 8px)"
    : isPwdRetreat
    ? "translate(0px, 55px) scale(0.95)"
    : isKepo
    ? "translate(16px, -4px) rotate(4deg)"
    : isExcited
    ? "translateY(-14px) scale(1.06)"
    : "translate(0px, 0px)";

  // Cloud ONLY appears in password mode! In idle / kepo it stays hidden down below with opacity 0.
  const cloudTransform = isPasswordMode ? "translateY(0px) scale(1)" : "translateY(75px) scale(0.85)";

  // Pupil offsets: in peeking, looks hard right (+5.5px) towards the password field
  const currentPupilX = isPwdPeek ? 5.5 : isKepo ? 4.5 : gaze.x;
  const currentPupilY = isPwdPeek ? 1.0 : isKepo ? 1.2 : gaze.y;

  return (
    <section
      ref={containerRef}
      className="min-h-screen w-full bg-gradient-to-br from-[#FAF8F5] via-[#F6F2EA] to-[#FAF7F2] p-4 sm:p-6 lg:p-8 flex flex-col justify-between select-none relative overflow-x-hidden font-sans text-slate-800"
    >
      {/* Soft Ambient Warm Sunlight Glows in Background */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-20 w-80 h-80 bg-yellow-100/30 rounded-full blur-3xl pointer-events-none" />

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
            <div className="w-full max-w-[500px] p-6 sm:p-8 rounded-[36px] bg-white/45 backdrop-blur-xl border border-white/80 shadow-[0_12px_40px_rgba(245,158,11,0.04)] flex items-center justify-center">
              
              <svg
                ref={svgRef}
                viewBox="0 0 500 370"
                className="w-full h-auto overflow-visible select-none"
                aria-label="Maskot Matahari SunSight"
              >
                <defs>
                  {/* Rich Warm Honey Sun Gradient */}
                  <linearGradient id="sunBodyGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FEF08A" />
                    <stop offset="45%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>

                  {/* Soft Pure Cloud Gradient */}
                  <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="65%" stopColor="#F8FAFC" />
                    <stop offset="100%" stopColor="#E2E8F0" />
                  </linearGradient>

                  {/* Soft Warm Radial Aura */}
                  <radialGradient id="sunAura" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.45" />
                    <stop offset="65%" stopColor="#FDE68A" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Soft Warm Radial Aura behind Sun */}
                <circle cx="250" cy="155" r="140" fill="url(#sunAura)" />

                {/* Whimsical Background Sparkle Stars */}
                <path
                  d="M 105 75 Q 105 85 95 85 Q 105 85 105 95 Q 105 85 115 85 Q 105 85 105 75 Z"
                  fill="#FBBF24"
                  opacity="0.35"
                />
                <path
                  d="M 400 85 Q 400 95 390 95 Q 400 95 400 105 Q 400 95 410 95 Q 400 95 400 85 Z"
                  fill="#FBBF24"
                  opacity="0.35"
                />

                {/* Ambient Mini Floating Clouds */}
                <g transform="translate(45, 115)" opacity="0.45" className="cloud-gentle-float">
                  <path
                    d="M 20 25 C 10 25 5 18 12 12 C 15 5 28 5 32 10 C 38 6 48 10 46 18 C 52 20 50 25 42 25 Z"
                    fill="#FFFFFF"
                  />
                </g>
                <g transform="translate(390, 150)" opacity="0.45" className="cloud-gentle-float">
                  <path
                    d="M 20 25 C 10 25 5 18 12 12 C 15 5 28 5 32 10 C 38 6 48 10 46 18 C 52 20 50 25 42 25 Z"
                    fill="#FFFFFF"
                  />
                </g>

                {/* ===================================================
                    1. THE CHIBI SUN (Sunny)
                    =================================================== */}
                <g
                  className={`mascot-transition ${isPwdApprove ? "sun-nodding" : ""}`}
                  style={{
                    transform: sunTransform,
                    transformOrigin: "250px 155px",
                  }}
                >
                  {/* Chubby Pill Capsule Sun Rays (Soft, Rounded, Premium) */}
                  <g className="sun-rays-spinner">
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
                      <rect
                        key={deg}
                        x="243"
                        y="66"
                        width="14"
                        height="26"
                        rx="7"
                        fill={i % 2 === 0 ? "#F59E0B" : "#FBBF24"}
                        stroke="#D97706"
                        strokeWidth="1.2"
                        transform={`rotate(${deg} 250 155)`}
                      />
                    ))}
                  </g>

                  {/* Sun Body Circle */}
                  <circle
                    cx="250"
                    cy="155"
                    r="64"
                    fill="url(#sunBodyGrad)"
                    stroke="#D97706"
                    strokeWidth="3.2"
                  />

                  {/* Soft Light Highlight Sheen on Top-Left */}
                  <ellipse
                    cx="228"
                    cy="124"
                    rx="18"
                    ry="9"
                    fill="#FFFFFF"
                    opacity="0.36"
                    transform="rotate(-28 228 124)"
                  />

                  {/* =================================================
                      FACE ELEMENTS
                      ================================================= */}
                  <g>
                    {/* Cute Rosy Peach Blush Cheeks */}
                    <ellipse
                      cx="214"
                      cy="164"
                      rx="9.5"
                      ry="6"
                      fill="#FB7185"
                      className="mascot-transition"
                      opacity={isPwdApprove ? 0.95 : isKepo ? 0.85 : 0.7}
                    />
                    <ellipse
                      cx="286"
                      cy="164"
                      rx="9.5"
                      ry="6"
                      fill="#FB7185"
                      className="mascot-transition"
                      opacity={isPwdApprove ? 0.95 : isKepo ? 0.85 : 0.7}
                    />

                    {/* EYES */}
                    {isSleeping ? (
                      /* Sleepy Closed Arcs (︶ ︶) while hidden behind cloud */
                      <g className="mascot-transition">
                        <path
                          d="M 218 149 Q 228 159 238 149"
                          fill="none"
                          stroke="#78350F"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 262 149 Q 272 159 282 149"
                          fill="none"
                          stroke="#78350F"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                        />
                      </g>
                    ) : isPwdApprove ? (
                      /* Joyful Happy Squint Arcs (^‿^) while approving */
                      <g className="mascot-transition">
                        <path
                          d="M 218 153 Q 228 141 238 153"
                          fill="none"
                          stroke="#78350F"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 262 153 Q 272 141 282 153"
                          fill="none"
                          stroke="#78350F"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                      </g>
                    ) : (
                      /* Open Eyes (Idle, Kepo, or Peeking) */
                      <g>
                        {/* Left Eye */}
                        <g>
                          <ellipse
                            cx="228"
                            cy="147"
                            rx="10.5"
                            ry={isBlinking ? 1.5 : 12.5}
                            fill="#FFFFFF"
                            stroke="#D97706"
                            strokeWidth="1.2"
                            className="mascot-transition"
                          />
                          {!isBlinking && (
                            <g
                              className="mascot-pupil-transition"
                              transform={`translate(${currentPupilX}, ${currentPupilY})`}
                              style={{
                                transform: `translate(${currentPupilX}px, ${currentPupilY}px)`,
                              }}
                            >
                              <circle cx="228" cy="147" r={isPwdPeek ? 6.2 : 5.2} fill="#18191C" />
                              <circle cx="230.2" cy="145" r="1.8" fill="#FFFFFF" />
                              <circle cx="226.5" cy="149" r="0.9" fill="#FFFFFF" />
                            </g>
                          )}
                        </g>

                        {/* Right Eye */}
                        <g>
                          <ellipse
                            cx="272"
                            cy="147"
                            rx="10.5"
                            ry={isBlinking ? 1.5 : 12.5}
                            fill="#FFFFFF"
                            stroke="#D97706"
                            strokeWidth="1.2"
                            className="mascot-transition"
                          />
                          {!isBlinking && (
                            <g
                              className="mascot-pupil-transition"
                              transform={`translate(${currentPupilX}, ${currentPupilY})`}
                              style={{
                                transform: `translate(${currentPupilX}px, ${currentPupilY}px)`,
                              }}
                            >
                              <circle cx="272" cy="147" r={isPwdPeek ? 6.2 : 5.2} fill="#18191C" />
                              <circle cx="274.2" cy="145" r="1.8" fill="#FFFFFF" />
                              <circle cx="270.5" cy="149" r="0.9" fill="#FFFFFF" />
                            </g>
                          )}
                        </g>
                      </g>
                    )}

                    {/* MOUTH */}
                    {isSleeping ? (
                      <path
                        d="M 246 166 Q 250 169 254 166"
                        fill="none"
                        stroke="#78350F"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    ) : isPwdApprove ? (
                      <g className="mascot-transition">
                        <path d="M 240 163 Q 250 178 260 163 Z" fill="#78350F" />
                        <path d="M 244 171 Q 250 177 256 171 Z" fill="#FB7185" />
                      </g>
                    ) : isPwdPeek ? (
                      <ellipse cx="252" cy="166" rx="3.5" ry="3.5" fill="#78350F" />
                    ) : isKepo ? (
                      <ellipse cx="251" cy="166" rx="4.5" ry="5.5" fill="#78350F" />
                    ) : (
                      <path
                        d="M 241 162 Q 250 171 259 162"
                        fill="none"
                        stroke="#78350F"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    )}
                  </g>

                  {/* APPROVAL SPARKLES & BADGE (During pwd_approve) */}
                  {isPwdApprove && (
                    <g className="sparkle-pop">
                      {/* Top Right Sparkle Star */}
                      <path
                        d="M 315 95 Q 315 103 307 103 Q 315 103 315 111 Q 315 103 323 103 Q 315 103 315 95 Z"
                        fill="#F59E0B"
                      />
                      {/* Top Left Sparkle Star */}
                      <path
                        d="M 185 100 Q 185 107 178 107 Q 185 107 185 114 Q 185 107 192 107 Q 185 107 185 100 Z"
                        fill="#F59E0B"
                      />
                      {/* Green Approved Check Badge */}
                      <g transform="translate(305, 116)">
                        <circle cx="10" cy="10" r="10" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                        <path
                          d="M 6 10 L 9 13 L 14 7"
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    </g>
                  )}
                </g>

                {/* ===================================================
                    2. FLUFFY CLOUD (ONLY APPEARS IN PASSWORD MODE)
                    =================================================== */}
                <g
                  className="cloud-transition"
                  style={{
                    transform: cloudTransform,
                    opacity: isPasswordMode ? 1 : 0,
                    pointerEvents: "none",
                  }}
                >
                  {/* Soft Ground Shadow below Cloud */}
                  <ellipse cx="250" cy="305" rx="140" ry="9" fill="#78350F" opacity="0.08" />

                  {/* Plump Cloud Silhouette */}
                  <path
                    d="M 145 275
                       C 125 275 110 260 110 238
                       C 110 216 126 200 148 202
                       C 158 174 192 160 225 172
                       C 240 152 280 152 300 172
                       C 322 165 352 178 358 202
                       C 380 212 388 238 375 260
                       C 366 274 350 278 332 278
                       L 160 278
                       C 150 278 145 275 145 275 Z"
                    fill="url(#cloudGrad)"
                    stroke="#BAE6FD"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                  />

                  {/* Cloud Top Puff Highlight Shines */}
                  <path
                    d="M 205 170 C 217 162 235 164 245 172"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 276 164 C 288 160 302 164 310 172"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 138 210 C 142 202 152 200 160 204"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Soft Pink Blush on the Cloud */}
                  <ellipse cx="172" cy="248" rx="8" ry="4.5" fill="#FDA4AF" opacity="0.4" />
                  <ellipse cx="328" cy="248" rx="8" ry="4.5" fill="#FDA4AF" opacity="0.4" />

                  {/* =================================================
                      3. CUTE CHUBBY PAWS (Holding the Cloud Top Rim)
                      Visible specifically when PEAKING & APPROVING!
                      ================================================= */}
                  <g
                    className="mascot-transition"
                    style={{
                      opacity: isPeekingOrApproving ? 1 : 0,
                      transform: isPeekingOrApproving ? "translateY(0px)" : "translateY(12px)",
                    }}
                  >
                    {/* Left Paw */}
                    <g transform="translate(210, 180)">
                      <ellipse cx="0" cy="0" rx="11" ry="8" fill="#FBBF24" stroke="#D97706" strokeWidth="2.4" />
                      <circle cx="-3" cy="-2" r="2.2" fill="#FEF08A" />
                    </g>
                    {/* Right Paw */}
                    <g transform="translate(288, 180)">
                      <ellipse cx="0" cy="0" rx="11" ry="8" fill="#FBBF24" stroke="#D97706" strokeWidth="2.4" />
                      <circle cx="3" cy="-2" r="2.2" fill="#FEF08A" />
                    </g>
                  </g>
                </g>
              </svg>
            </div>
          </div>

          {/* Clean Bottom Spacer */}
          <div className="h-6" />
        </div>

        {/* =====================================================
            RIGHT: MODERN CRISP AUTH CARD (Docked in the Right Corner)
            ===================================================== */}
        <div className="w-full lg:w-[460px] xl:w-[490px] bg-white/95 backdrop-blur-2xl rounded-[32px] border border-white/90 shadow-[0_16px_48px_rgba(245,158,11,0.06)] px-6 sm:px-10 py-7 sm:py-8 flex flex-col justify-between shrink-0">
          
          {/* Header with SunSight Brand */}
          <div className="text-center pb-1">
            <Link
              href="/"
              className="inline-flex items-center justify-center mb-4 hover:scale-102 transition cursor-pointer"
              title="SunSight Beranda"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="SunSight" className="h-8.5 w-auto" />
            </Link>

            <h1 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 font-title tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-1">{subtitle}</p>
          </div>

          {/* Form Content Slot */}
          <div className="my-auto py-2">{children}</div>

          {/* Footer Slot */}
          {bottomSlot !== undefined && (
            <div className="text-center text-xs text-slate-500 pt-3 border-t border-slate-100/80">
              {bottomSlot}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
