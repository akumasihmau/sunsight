"use client";

import { useId } from "react";

type Props = {
  variant?: "hero" | "cta";
};

const SOLAR_PANEL_ROWS = [
  // Distant terrace solar arrays (left & right hillsides)
  { x: 112, y: 314, scale: 0.72, skew: -14 },
  { x: 184, y: 306, scale: 0.72, skew: -12 },
  { x: 256, y: 300, scale: 0.72, skew: -10 },
  { x: 946, y: 300, scale: 0.72, skew: 10 },
  { x: 1018, y: 307, scale: 0.72, skew: 12 },
  { x: 1090, y: 315, scale: 0.72, skew: 14 },
  // Mid terrace solar arrays
  { x: 70, y: 364, scale: 0.94, skew: -16 },
  { x: 164, y: 354, scale: 0.94, skew: -13 },
  { x: 258, y: 347, scale: 0.94, skew: -10 },
  { x: 942, y: 348, scale: 0.94, skew: 10 },
  { x: 1036, y: 355, scale: 0.94, skew: 13 },
  { x: 1130, y: 365, scale: 0.94, skew: 16 },
];

const CONIFER_TREES = [
  { x: 34, y: 300, scale: 0.98, c1: "#059669", c2: "#10B981", delay: "0s" },
  { x: 78, y: 288, scale: 0.74, c1: "#10B981", c2: "#34D399", delay: "-1.5s" },
  { x: 314, y: 286, scale: 0.76, c1: "#10B981", c2: "#34D399", delay: "-2.8s" },
  { x: 356, y: 294, scale: 0.92, c1: "#047857", c2: "#059669", delay: "-0.7s" },
  { x: 846, y: 290, scale: 0.82, c1: "#10B981", c2: "#34D399", delay: "-2.1s" },
  { x: 888, y: 284, scale: 0.68, c1: "#34D399", c2: "#6EE7B7", delay: "-3.4s" },
  { x: 1124, y: 292, scale: 0.92, c1: "#059669", c2: "#10B981", delay: "-1.1s" },
  { x: 1168, y: 302, scale: 1.04, c1: "#047857", c2: "#059669", delay: "-2.5s" },
];

const BROADLEAF_CANOPIES = [
  { x: 146, y: 286, scale: 0.9, c1: "#16A34A", c2: "#4ADE80", delay: "-0.9s" },
  { x: 224, y: 279, scale: 0.72, c1: "#22C55E", c2: "#86EFAC", delay: "-2.4s" },
  { x: 404, y: 304, scale: 0.82, c1: "#10B981", c2: "#6EE7B7", delay: "-1.7s" },
  { x: 794, y: 302, scale: 0.82, c1: "#10B981", c2: "#6EE7B7", delay: "-3.1s" },
  { x: 976, y: 280, scale: 0.76, c1: "#22C55E", c2: "#86EFAC", delay: "-1.3s" },
  { x: 1054, y: 287, scale: 0.94, c1: "#16A34A", c2: "#4ADE80", delay: "-2.9s" },
];

const GRASS_CLUSTERS = [
  { x: 118, y: 388, flower: "#FDE047" },
  { x: 214, y: 376, flower: "#FEF08A" },
  { x: 320, y: 368, flower: null },
  { x: 416, y: 372, flower: "#FDE047" },
  { x: 510, y: 382, flower: null },
  { x: 690, y: 380, flower: "#FEF08A" },
  { x: 786, y: 372, flower: null },
  { x: 890, y: 368, flower: "#FDE047" },
  { x: 988, y: 378, flower: null },
  { x: 1084, y: 388, flower: "#FEF08A" },
];

export function SolarMeadowScene({ variant = "hero" }: Props) {
  const uid = useId().replace(/:/g, "");
  const skyGradId = `sky-${uid}`;
  const sunGlowId = `sun-${uid}`;
  const sunRayId = `sunRay-${uid}`;
  const hillFarId = `hillFar-${uid}`;
  const hillBackId = `hillBack-${uid}`;
  const hillMidId = `hillMid-${uid}`;
  const hillFrontId = `hillFront-${uid}`;
  const panelGradId = `panel-${uid}`;
  const horizonMistId = `mist-${uid}`;

  const maskGradient =
    variant === "hero"
      ? "linear-gradient(to bottom, black 0%, black 78%, transparent 100%)"
      : "linear-gradient(to bottom, transparent 0%, black 16%, black 86%, transparent 100%)";

  const sunCx = variant === "hero" ? 968 : 990;
  const sunCy = variant === "hero" ? 104 : 92;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={{
        maskImage: maskGradient,
        WebkitMaskImage: maskGradient,
      }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1200 470"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Clear Luminous Morning Sky */}
          <linearGradient id={skyGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.65" />
            <stop offset="32%" stopColor="#EFF8FF" stopOpacity="0.88" />
            <stop offset="62%" stopColor="#FEFCE8" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#DCFCE7" stopOpacity="0.92" />
          </linearGradient>

          <radialGradient id={sunGlowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.92" />
            <stop offset="28%" stopColor="#FDE047" stopOpacity="0.45" />
            <stop offset="58%" stopColor="#FDE68A" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FEF9C3" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={sunRayId} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
          </linearGradient>

          {/* Rich Layered Emerald-Sage Rolling Hills */}
          <linearGradient id={hillFarId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id={hillBackId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>

          <linearGradient id={hillMidId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>

          <linearGradient id={hillFrontId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="68%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>

          <linearGradient id={horizonMistId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7F8FA" stopOpacity="0" />
            <stop offset="62%" stopColor="#F7F8FA" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#F7F8FA" stopOpacity="1" />
          </linearGradient>

          <linearGradient id={panelGradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="50%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
        </defs>

        {/* Crisp Sunlit Sky */}
        <rect x="0" y="0" width="1200" height="470" fill={`url(#${skyGradId})`} />

        {/* Subtle Sunbeams Fanning From Top-Right */}
        <polygon
          points={`${sunCx},${sunCy} 520,340 680,340`}
          fill={`url(#${sunRayId})`}
          opacity="0.6"
        />
        <polygon
          points={`${sunCx},${sunCy} 740,340 940,340`}
          fill={`url(#${sunRayId})`}
          opacity="0.45"
        />

        {/* Radiant Solar Halo */}
        <circle cx={sunCx} cy={sunCy} r="210" fill={`url(#${sunGlowId})`} />
        <circle cx={sunCx} cy={sunCy} r="32" fill="#FEF08A" opacity="0.88" />
        <circle cx={sunCx} cy={sunCy} r="17" fill="#FBBF24" opacity="0.96" />

        {/* Layered Fluffy Morning Clouds */}
        <g className="animate-cloud-slow" opacity="0.9">
          <path
            d="M 88 128 Q 108 98, 142 104 Q 168 80, 204 100 Q 232 96, 246 128 Z"
            fill="#FFFFFF"
          />
          <path
            d="M 596 96 Q 612 76, 638 80 Q 658 62, 684 78 Q 706 76, 716 98 Z"
            fill="#FFFFFF"
            opacity="0.82"
          />
        </g>

        <g className="animate-cloud-mid" opacity="0.82">
          <path
            d="M 326 154 Q 342 132, 368 138 Q 390 120, 414 138 Q 434 136, 442 156 Z"
            fill="#FFFFFF"
          />
          <path
            d="M 840 144 Q 856 124, 880 128 Q 900 112, 922 128 Q 938 126, 946 146 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
        </g>

        {/* Breeze Flow Ribbons */}
        <g className="animate-wind-sweep" fill="none" strokeLinecap="round">
          <path
            d="M 110 218 Q 235 202, 360 216 T 595 208"
            stroke="rgba(255,255,255,0.82)"
            strokeWidth="2"
          />
          <path
            d="M 170 232 Q 285 220, 395 230"
            stroke="rgba(125,211,252,0.58)"
            strokeWidth="1.5"
          />
        </g>
        <g className="animate-wind-sweep-delayed" fill="none" strokeLinecap="round">
          <path
            d="M 645 200 Q 765 186, 885 198 T 1110 190"
            stroke="rgba(255,255,255,0.78)"
            strokeWidth="2"
          />
        </g>

        {/* Far Misty Mountain Ridge */}
        <path
          d="M 0 282 Q 190 232, 420 264 T 870 248 T 1200 268 L 1200 470 L 0 470 Z"
          fill={`url(#${hillFarId})`}
        />

        {/* Back Rolling Meadow Hill */}
        <path
          d="M 0 306 Q 220 256, 470 288 T 930 272 T 1200 292 L 1200 470 L 0 470 Z"
          fill={`url(#${hillBackId})`}
        />

        {/* Soft Hedgerows & Broadleaf Trees */}
        {BROADLEAF_CANOPIES.map((tree, idx) => (
          <g key={`bl-${idx}`} transform={`translate(${tree.x}, ${tree.y}) scale(${tree.scale})`}>
            <g className="animate-tree-sway" style={{ animationDelay: tree.delay }}>
              <rect x="-2" y="-12" width="4" height="14" rx="1.5" fill="#78350F" opacity="0.65" />
              <circle cx="-8" cy="-16" r="10" fill={tree.c1} />
              <circle cx="8" cy="-15" r="9" fill={tree.c1} />
              <circle cx="0" cy="-24" r="12" fill={tree.c2} />
            </g>
          </g>
        ))}

        {/* Mid Emerald Meadow Slope */}
        <path
          d="M 0 338 Q 245 286, 545 322 T 1045 298 L 1200 314 L 1200 470 L 0 470 Z"
          fill={`url(#${hillMidId})`}
        />

        {/* Swaying Evergreen / Pine Accents */}
        {CONIFER_TREES.map((tree, idx) => (
          <g key={`cf-${idx}`} transform={`translate(${tree.x}, ${tree.y}) scale(${tree.scale})`}>
            <g className="animate-tree-sway" style={{ animationDelay: tree.delay }}>
              <rect x="-2" y="-10" width="4" height="12" rx="1.2" fill="#78350F" opacity="0.72" />
              <path d="M 0 -36 L -10 -18 L 10 -18 Z" fill={tree.c2} />
              <path d="M 0 -25 L -13 -8 L 13 -8 Z" fill={tree.c1} />
            </g>
          </g>
        ))}

        {/* Sunlit Foreground Grass Hill */}
        <path
          d="M 0 370 Q 290 326, 600 358 T 1200 344 L 1200 470 L 0 470 Z"
          fill={`url(#${hillFrontId})`}
        />

        {/* Ground-Mounted Solar Array Rows Nestled Into Meadow */}
        {SOLAR_PANEL_ROWS.map((p, idx) => (
          <g key={idx} transform={`translate(${p.x}, ${p.y}) scale(${p.scale})`}>
            {/* Ground shadow */}
            <ellipse cx="0" cy="17" rx="28" ry="4" fill="rgba(6,78,59,0.22)" />
            <line x1="-18" y1="6" x2="-16" y2="16" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="18" y1="6" x2="16" y2="16" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" />
            <g transform={`skewX(${p.skew})`}>
              <rect
                x="-30"
                y="-14"
                width="60"
                height="22"
                rx="3"
                fill={`url(#${panelGradId})`}
                stroke="#BAE6FD"
                strokeWidth="1.2"
              />
              <line x1="-10" y1="-14" x2="-10" y2="8" stroke="rgba(186,230,253,0.38)" strokeWidth="0.8" />
              <line x1="10" y1="-14" x2="10" y2="8" stroke="rgba(186,230,253,0.38)" strokeWidth="0.8" />
              <line x1="-30" y1="-3" x2="30" y2="-3" stroke="rgba(186,230,253,0.38)" strokeWidth="0.8" />
              <path
                d="M -22 -12 L -10 -12 L -18 6 L -28 6 Z"
                fill="rgba(255,255,255,0.22)"
              />
            </g>
          </g>
        ))}

        {/* Lush Grass Tufts & Warm Sunlit Meadow Wildflowers */}
        {GRASS_CLUSTERS.map((g, idx) => (
          <g key={`gr-${idx}`} transform={`translate(${g.x}, ${g.y})`}>
            <path
              d="M -5 4 Q -7 -5, -11 -9 M -1 4 Q 0 -7, 3 -10 M 3 4 Q 6 -4, 9 -7"
              stroke="#6EE7B7"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
              opacity="0.72"
            />
            {g.flower && (
              <>
                <circle cx="-10" cy="-9" r="2.2" fill={g.flower} />
                <circle cx="4" cy="-9" r="1.8" fill="#FFFFFF" opacity="0.9" />
              </>
            )}
          </g>
        ))}

        {/* Fluttering Green & Golden Sunlit Leaves */}
        <g className="animate-leaf-a" style={{ transformOrigin: "260px 225px" }}>
          <path d="M 255 227 Q 264 219, 271 225 Q 263 233, 255 227 Z" fill="#22C55E" opacity="0.9" />
        </g>
        <g className="animate-leaf-b" style={{ transformOrigin: "540px 195px" }}>
          <path d="M 536 195 Q 545 187, 552 193 Q 544 201, 536 195 Z" fill="#4ADE80" opacity="0.88" />
        </g>
        <g className="animate-leaf-c" style={{ transformOrigin: "820px 225px" }}>
          <path d="M 816 225 Q 824 217, 830 224 Q 822 232, 816 225 Z" fill="#10B981" opacity="0.9" />
        </g>
        <g className="animate-leaf-b" style={{ transformOrigin: "390px 250px" }}>
          <path d="M 386 250 Q 394 242, 400 248 Q 392 256, 386 250 Z" fill="#FDE047" opacity="0.85" />
        </g>
        <g className="animate-leaf-a" style={{ transformOrigin: "960px 210px" }}>
          <path d="M 956 210 Q 964 202, 970 208 Q 962 216, 956 210 Z" fill="#34D399" opacity="0.9" />
        </g>

        {/* Bottom Horizon Mist */}
        <rect x="0" y="365" width="1200" height="105" fill={`url(#${horizonMistId})`} />
      </svg>

      {/* Soft Localized Center Aura Behind Headline So Sky & Hills Stay Vibrant */}
      {variant === "hero" && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 68% 48% at 50% 34%, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.22) 55%, rgba(255,255,255,0) 100%)",
          }}
        />
      )}
    </div>
  );
}
