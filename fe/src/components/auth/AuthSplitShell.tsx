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
  | "pwd_away"
  | "pwd_peek";

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
  // "idle": serene buoyant hover, tracks cursor gaze smoothly, natural blink
  // "kepo": leans curiously towards the form when typing regular inputs (email, name, etc.)
  // "pwd_away": turns head away to the left and closes both eyes shyly/respectfully
  // "pwd_peek": sneaks a peek! Left eye stays closed, but right eye pops open looking sideways at password!
  const [mascotState, setMascotState] = useState<MascotState>("idle");
  const [isBlinking, setIsBlinking] = useState(false);
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const mascotStateRef = useRef<MascotState>("idle");
  const pwdCycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mascotStateRef.current = mascotState;
  }, [mascotState]);

  type IdleAction = "none" | "look_left" | "look_right" | "daydream" | "happy";
  const [idleAction, setIdleAction] = useState<IdleAction>("none");
  const idleActionRef = useRef<IdleAction>("none");
  useEffect(() => {
    idleActionRef.current = idleAction;
  }, [idleAction]);

  // Interactive password sneak-peek loop (Smooth, cute & playful!)
  const startPasswordCycle = useCallback(() => {
    if (pwdCycleTimerRef.current) clearTimeout(pwdCycleTimerRef.current);
    setIdleAction("none");

    const stepAway = () => {
      setMascotState("pwd_away");
      pwdCycleTimerRef.current = setTimeout(stepPeek, 3600);
    };

    const stepPeek = () => {
      setMascotState("pwd_peek");
      pwdCycleTimerRef.current = setTimeout(stepAway, 1300);
    };

    stepAway();
  }, []);

  const stopPasswordCycle = useCallback(() => {
    if (pwdCycleTimerRef.current) {
      clearTimeout(pwdCycleTimerRef.current);
      pwdCycleTimerRef.current = null;
    }
    setMascotState("idle");
  }, []);

  // Idle micro-actions director (Activates when mouse is still for 3s)
  useEffect(() => {
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let sequenceTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (sequenceTimer) clearTimeout(sequenceTimer);
    };

    const runIdleSequence = () => {
      if (mascotStateRef.current !== "idle") return;

      const steps: Array<{
        action: IdleAction;
        gaze: { x: number; y: number };
        duration: number;
      }> = [
        { action: "look_left", gaze: { x: -4.5, y: 0.5 }, duration: 2200 },
        { action: "look_right", gaze: { x: 4.5, y: -0.5 }, duration: 2200 },
        { action: "daydream", gaze: { x: 0, y: -4.2 }, duration: 2600 },
        { action: "happy", gaze: { x: 0, y: 0 }, duration: 2400 },
      ];

      let idx = 0;
      const nextStep = () => {
        if (mascotStateRef.current !== "idle") {
          setIdleAction("none");
          return;
        }

        const cur = steps[idx % steps.length];
        setIdleAction(cur.action);
        setGaze(cur.gaze);
        idx++;

        sequenceTimer = setTimeout(nextStep, cur.duration);
      };

      nextStep();
    };

    const resetInactivity = () => {
      clearTimers();
      if (idleActionRef.current !== "none") {
        setIdleAction("none");
      }
      if (mascotStateRef.current === "idle") {
        inactivityTimer = setTimeout(runIdleSequence, 3200);
      }
    };

    const onActivity = () => {
      resetInactivity();
    };

    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });

    inactivityTimer = setTimeout(runIdleSequence, 3200);

    return () => {
      clearTimers();
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, []);

  // Mouse gaze tracking in idle mode
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const current = mascotStateRef.current;
      if (current === "pwd_away" || current === "pwd_peek" || current === "kepo") {
        return; // Fixed gaze for password and kepo modes
      }

      // If user moved mouse while in idle action, cancel idle action immediately
      if (idleActionRef.current !== "none") {
        setIdleAction("none");
      }

      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const mascotCenterX = rect.left + rect.width * 0.5;
      const mascotCenterY = rect.top + rect.height * 0.5;

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
        setGaze({ x: 4.8, y: 1.2 });
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
          setGaze({ x: 4.8, y: 1.2 });
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
        if (cur !== "pwd_away" && cur !== "pwd_peek") {
          startPasswordCycle();
        }
      } else if (el.tagName === "INPUT") {
        if (mascotStateRef.current !== "kepo") {
          setMascotState("kepo");
        }
        setGaze({ x: 4.8, y: 1.2 });
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
          }, 130);
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
  const isPwdAway = mascotState === "pwd_away";
  const isPwdPeek = mascotState === "pwd_peek";

  // Body transformation (Subtle, strictly upright at idle)
  const sunTransform = isPwdAway
    ? "translate(-14px, 0px) rotate(-6deg)"
    : isPwdPeek
    ? "translate(-6px, 0px) rotate(-2deg)"
    : isKepo
    ? "translate(8px, 0px) rotate(2.5deg)"
    : isExcited
    ? "translateY(-12px) scale(1.05)"
    : "translate(0px, 0px) rotate(0deg)";

  // 3D Rotating Face Feature Slide (Creating genuine head rotation across sphere)
  const faceTransform = isPwdAway
    ? "translate(-34px, -2px)"
    : isPwdPeek
    ? "translate(-14px, 0px)"
    : isKepo
    ? "translate(28px, 2px)"
    : isExcited
    ? "translate(0px, -4px)"
    : "translate(0px, 0px)";

  // Pupil offsets:
  // - in peek mode: right pupil looks strongly right towards the password field
  // - in kepo mode: both pupils look towards the form
  // - in idle mode: smooth mouse cursor tracking
  const currentPupilX = isPwdPeek ? 6.0 : isKepo ? 5.5 : gaze.x;
  const currentPupilY = isPwdPeek ? 0.0 : isKepo ? 0.5 : gaze.y;

  return (
    <section
      ref={containerRef}
      className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FAF9F5] select-none relative overflow-x-hidden font-sans text-slate-800"
    >
      {/* =====================================================
          SECTION KIRI: RADIANT SUN MASCOT SHOWCASE (Full Half Section)
          ===================================================== */}
      <div className="w-full lg:w-1/2 min-h-[300px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative overflow-hidden bg-gradient-to-br from-[#FAF9F5] via-amber-50/40 to-amber-100/25 border-b lg:border-b-0 lg:border-r border-amber-200/40">
        {/* Soft Ambient Radiant Glow behind Mascot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-amber-300/25 via-amber-200/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Top Left: Sleek Clean Back Button (Tanpa Kontainer Card) */}
        <div className="relative z-10 w-full flex items-center justify-start">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-amber-900 transition-colors cursor-pointer group p-1 -ml-1"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform text-slate-500 group-hover:text-amber-800">
              arrow_back
            </span>
            <span>{backLabel}</span>
          </Link>
        </div>

        {/* Center Stage: Mascot Tanpa Box Container Terpisah */}
        <div className="relative z-10 my-auto w-full flex items-center justify-center py-4 sm:py-8">
          <div className="w-full max-w-[340px] sm:max-w-[440px] lg:max-w-[480px] flex items-center justify-center">
            <svg
              ref={svgRef}
              viewBox="0 0 460 360"
              className="w-full h-auto overflow-visible select-none drop-shadow-[0_12px_36px_rgba(245,158,11,0.16)]"
              aria-label="Maskot Matahari SunSight"
            >
                <defs>
                  {/* Soft Radial Glow for Wavy Circles (Pendaran Lingkaran Bergelombang) */}
                  <radialGradient id="wavyOuterGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.28" />
                    <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.18" />
                    <stop offset="80%" stopColor="#FDE047" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#FEF08A" stopOpacity="0.02" />
                  </radialGradient>
                  
                  <radialGradient id="wavyInnerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.42" />
                    <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#D97706" stopOpacity="0.05" />
                  </radialGradient>
                  
                  <radialGradient id="softAmbientAura" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FDE047" stopOpacity="0.25" />
                    <stop offset="60%" stopColor="#FBBF24" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#EFF1F4" stopOpacity="0" />
                  </radialGradient>

                  {/* Rich Warm Solar Sun Body Gradient */}
                  <linearGradient id="sunBodyGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="35%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>

                  {/* Inner Rim Sunlight Highlight */}
                  <radialGradient id="sunRimGlow" cx="42%" cy="38%" r="55%">
                    <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.35" />
                    <stop offset="55%" stopColor="#FDE047" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Layer 1: Soft Ambient Background Glow */}
                <circle cx="230" cy="180" r="165" fill="url(#softAmbientAura)" className="sun-wavy-breathe" />

                {/* Layer 2: Lingkaran Semi-Transparan Bergelombang Luar (Outer Organic Wavy Halo) */}
                <g className="sun-wavy-spin-slow">
                  <path
                    d="M 388.00 180.00 C 388.00 207.30, 356.56 198.23, 349.83 218.94 C 343.11 239.64, 373.87 250.78, 357.82 272.87 C 341.78 294.96, 321.67 269.14, 304.06 281.94 C 286.45 294.73, 304.79 321.83, 278.82 330.27 C 252.86 338.70, 251.77 306.00, 230.00 306.00 C 208.23 306.00, 207.14 338.70, 181.18 330.27 C 155.21 321.83, 173.55 294.73, 155.94 281.94 C 138.33 269.14, 118.22 294.96, 102.18 272.87 C 86.13 250.78, 116.89 239.64, 110.17 218.94 C 103.44 198.23, 72.00 207.30, 72.00 180.00 C 72.00 152.70, 103.44 161.77, 110.17 141.06 C 116.89 120.36, 86.13 109.22, 102.18 87.13 C 118.22 65.04, 138.33 90.86, 155.94 78.06 C 173.55 65.27, 155.21 38.17, 181.18 29.73 C 207.14 21.30, 208.23 54.00, 230.00 54.00 C 251.77 54.00, 252.86 21.30, 278.82 29.73 C 304.79 38.17, 286.45 65.27, 304.06 78.06 C 321.67 90.86, 341.78 65.04, 357.82 87.13 C 373.87 109.22, 343.11 120.36, 349.83 141.06 C 356.56 161.77, 388.00 152.70, 388.00 180.00 Z"
                    fill="url(#wavyOuterGlow)"
                  />
                </g>

                {/* Layer 3: Lingkaran Semi-Transparan Bergelombang Dalam (Inner Organic Wavy Halo) */}
                <g className="sun-wavy-spin-reverse">
                  <path
                    d="M 362.00 180.00 C 362.00 199.01, 338.34 192.93, 334.32 207.95 C 330.30 222.97, 353.82 229.54, 344.32 246.00 C 334.81 262.46, 317.36 245.37, 306.37 256.37 C 295.37 267.36, 312.46 284.81, 296.00 294.32 C 279.54 303.82, 272.97 280.30, 257.95 284.32 C 242.93 288.34, 249.01 312.00, 230.00 312.00 C 210.99 312.00, 217.07 288.34, 202.05 284.32 C 187.03 280.30, 180.46 303.82, 164.00 294.32 C 147.54 284.81, 164.63 267.36, 153.63 256.37 C 142.64 245.37, 125.19 262.46, 115.68 246.00 C 106.18 229.54, 129.70 222.97, 125.68 207.95 C 121.66 192.93, 98.00 199.01, 98.00 180.00 C 98.00 160.99, 121.66 167.07, 125.68 152.05 C 129.70 137.03, 106.18 130.46, 115.68 114.00 C 125.19 97.54, 142.64 114.63, 153.63 103.63 C 164.63 92.64, 147.54 75.19, 164.00 65.68 C 180.46 56.18, 187.03 79.70, 202.05 75.68 C 217.07 71.66, 210.99 48.00, 230.00 48.00 C 249.01 48.00, 242.93 71.66, 257.95 75.68 C 272.97 79.70, 279.54 56.18, 296.00 65.68 C 312.46 75.19, 295.37 92.64, 306.37 103.63 C 317.36 114.63, 334.81 97.54, 344.32 114.00 C 353.82 130.46, 330.30 137.03, 334.32 152.05 C 338.34 167.07, 362.00 160.99, 362.00 180.00 Z"
                    fill="url(#wavyInnerGlow)"
                  />
                </g>

                {/* ===================================================
                    THE ADORABLE SUN MASCOT (Clean Circle, Expressive Eyes & Tiny Dot Mouth)
                    =================================================== */}
                <g
                  className={
                    mascotState === "idle"
                      ? idleAction === "happy"
                        ? "mascot-idle-hum"
                        : "sun-gentle-hover"
                      : isKepo
                      ? "mascot-kepo-nod"
                      : ""
                  }
                >
                  <g
                    className="mascot-smooth-transition"
                    style={{
                      transform: sunTransform,
                      transformOrigin: "230px 180px",
                    }}
                  >
                    {/* Warm Radiant Sun Body (Spherical Sun Gradient) */}
                    <circle cx="230" cy="180" r="95" fill="url(#sunBodyGrad)" />
                    {/* Soft Sunlit Highlight Sheen */}
                    <circle cx="230" cy="180" r="95" fill="url(#sunRimGlow)" />

                    {/* =================================================
                        EXPRESSIVE 3D ROTATING FACE FEATURES
                        ================================================= */}
                    <g
                      className="face-smooth-transition"
                      style={{
                        transform: faceTransform,
                        transformOrigin: "230px 180px",
                      }}
                    >
                      {/* LEFT EYE (Horizontal Center 210, 172) */}
                      {isPwdAway || isPwdPeek ? (
                        /* Squeezed > Eye in Password Mode (Kawaii >.<) */
                        <path
                          d="M 203 164 L 215 172 L 203 180"
                          fill="none"
                          stroke="#18181B"
                          strokeWidth="3.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : idleAction === "happy" ? (
                        /* Cheerful curved eye ⌒ when humming */
                        <path
                          d="M 198 174 Q 210 166 222 174"
                          fill="none"
                          stroke="#18181B"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                        />
                      ) : isBlinking ? (
                        /* Quick natural blink slit */
                        <line
                          x1="198"
                          y1="172"
                          x2="222"
                          y2="172"
                          stroke="#18181B"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                        />
                      ) : (
                        /* Open Big Cartoon Sclera + Tracking Pupil */
                        <g>
                          <ellipse cx="210" cy="172" rx="14.5" ry="15.5" fill="#FFFFFF" />
                          <circle
                            cx="210"
                            cy="174"
                            r="7.5"
                            fill="#18181B"
                            className="pupil-smooth-transition"
                            style={{
                              transform: `translate(${currentPupilX}px, ${currentPupilY}px)`,
                            }}
                          />
                        </g>
                      )}

                      {/* RIGHT EYE (Horizontal Center 250, 172 - Level with Left Eye!) */}
                      {isPwdAway ? (
                        /* Squeezed < Eye in Password Mode (Completes >.<) */
                        <path
                          d="M 257 164 L 245 172 L 257 180"
                          fill="none"
                          stroke="#18181B"
                          strokeWidth="3.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : isPwdPeek ? (
                        /* In pwd_peek: RIGHT EYE POPS OPEN TO PEEK AT PASSWORD! 👀 */
                        <g>
                          <ellipse cx="250" cy="172" rx="14.5" ry="15.5" fill="#FFFFFF" />
                          <circle
                            cx="250"
                            cy="174"
                            r="7.5"
                            fill="#18181B"
                            className="pupil-smooth-transition"
                            style={{
                              transform: "translate(6px, 0px)",
                            }}
                          />
                        </g>
                      ) : idleAction === "happy" ? (
                        /* Cheerful curved eye ⌒ when humming */
                        <path
                          d="M 238 174 Q 250 166 262 174"
                          fill="none"
                          stroke="#18181B"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                        />
                      ) : isBlinking ? (
                        /* Quick natural blink slit */
                        <line
                          x1="238"
                          y1="172"
                          x2="262"
                          y2="172"
                          stroke="#18181B"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                        />
                      ) : (
                        /* Open Big Cartoon Sclera + Tracking Pupil */
                        <g>
                          <ellipse cx="250" cy="172" rx="14.5" ry="15.5" fill="#FFFFFF" />
                          <circle
                            cx="250"
                            cy="174"
                            r="7.5"
                            fill="#18181B"
                            className="pupil-smooth-transition"
                            style={{
                              transform: `translate(${currentPupilX}px, ${currentPupilY}px)`,
                            }}
                          />
                        </g>
                      )}

                      {/* ADORABLE DYNAMIC MOUTH SHAPES */}
                      {isPwdAway ? (
                        /* Cute shy / flustered squiggly mouth ~ */
                        <path
                          d="M 224 194 Q 227 191 230 194 Q 233 197 236 194"
                          fill="none"
                          stroke="#18181B"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        />
                      ) : isPwdPeek ? (
                        /* Caught-in-the-act tiny guilty oval :o */
                        <ellipse cx="230" cy="195" rx="3.2" ry="4.2" fill="#18181B" />
                      ) : isKepo ? (
                        /* Curious open oval mouth */
                        <ellipse cx="230" cy="195" rx="3.6" ry="4.6" fill="#18181B" />
                      ) : idleAction === "daydream" ? (
                        /* Daydreaming thoughtful mouth */
                        <ellipse cx="230" cy="195" rx="3.0" ry="3.8" fill="#18181B" />
                      ) : idleAction === "happy" ? (
                        /* Playful whistling / cat-mouth :3 */
                        <path
                          d="M 224 193 Q 227 197 230 193 Q 233 197 236 193"
                          fill="none"
                          stroke="#18181B"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        />
                      ) : (
                        /* Gentle relaxed cute smile */
                        <path
                          d="M 224 193 Q 230 197 236 193"
                          fill="none"
                          stroke="#18181B"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Smooth Anime Sweat Drop in >.< Mode (Smooth drip slide, no bouncing) */}
                      {isPwdAway && (
                        <path
                          d="M 258 150 C 258 150 263 155 263 158 C 263 160.8 260.8 163 258 163 C 255.2 163 253 160.8 253 158 C 253 155 258 150 258 150 Z"
                          fill="#60A5FA"
                          className="mascot-sweat-slide"
                        />
                      )}
                    </g>
                  </g>
                </g>
              </svg>
          </div>
        </div>

        {/* Clean Bottom Spacer */}
        <div className="hidden lg:block h-5" />
      </div>

      {/* =====================================================
          SECTION KANAN: CLEAN FULL-HEIGHT FORM SECTION (Tanpa Card Terpisah)
          ===================================================== */}
      <div className="w-full lg:w-1/2 lg:min-h-screen bg-white flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 py-8 sm:py-12 relative z-10">
        <div className="w-full max-w-[420px] my-auto flex flex-col justify-center">
          {/* Header with SunSight Brand */}
          <div className="text-center pb-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center mb-3.5 hover:scale-102 transition cursor-pointer"
              title="SunSight Beranda"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="SunSight" className="h-8 w-auto" />
            </Link>

            <h1 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 font-title tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5 leading-relaxed max-w-sm mx-auto">{subtitle}</p>
          </div>

          {/* Form Content Slot */}
          <div className="mt-4">{children}</div>

          {/* Footer Slot */}
          {bottomSlot !== undefined && (
            <div className="text-center text-xs text-slate-500 mt-5 pt-4 border-t border-slate-100">
              {bottomSlot}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
