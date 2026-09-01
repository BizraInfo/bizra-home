/**
 * BIZRA — The Seed of Life mark.
 *
 * Geometry: one central circle (the Nuqta — Divine Origin), six circles
 * around it at hexagonal positions (the six days of creation), and where
 * they overlap, the petals of the flower (Ihsān — the bloom).
 *
 * This is the brand's only logo. It is drawn, never stamped.
 */

import { useId } from "react";

interface SeedMarkProps {
  /** Pixel size of the square SVG. */
  size?: number;
  /** Run the full bloom choreography (draw circles → petals → nuqta). */
  animated?: boolean;
  /** Static stroke tone — "full" for crisp small marks, "soft" for backgrounds. */
  tone?: "full" | "soft";
  className?: string;
  /** Descriptive label for screen readers when used as a standalone emblem. */
  label?: string;
}

const SEED_CIRCLES: Array<[number, number, number]> = [
  [0, 0, 0.55],
  [0, -40, 0.45],
  [34.6, -20, 0.45],
  [34.6, 20, 0.45],
  [0, 40, 0.45],
  [-34.6, 20, 0.45],
  [-34.6, -20, 0.45],
];

const PETALS = [
  "M0 -40 Q20 -20 0 0 Q-20 -20 0 -40",
  "M34.6 -20 Q17.3 10 0 0 Q17.3 -10 34.6 -20",
  "M34.6 20 Q17.3 10 0 0 Q17.3 30 34.6 20",
  "M0 40 Q-20 20 0 0 Q20 20 0 40",
  "M-34.6 20 Q-17.3 10 0 0 Q-17.3 30 -34.6 20",
  "M-34.6 -20 Q-17.3 10 0 0 Q-17.3 -10 -34.6 -20",
];

export function SeedMark({
  size = 300,
  animated = false,
  tone = "full",
  className,
  label,
}: SeedMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `bzGold-${uid}`;
  const baseStroke = tone === "full" ? "rgba(201,169,98,0.55)" : "rgba(201,169,98,0.3)";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8a6b2e" />
          <stop offset="50%" stopColor="#c9a962" />
          <stop offset="100%" stopColor="#f9f1d8" />
        </linearGradient>
      </defs>
      <g transform="translate(100, 100)">
        {/* Outer construction ring — the boundary of the world */}
        <circle
          cx={0}
          cy={0}
          r={80}
          fill="none"
          stroke="rgba(201,169,98,0.18)"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
        {/* The seven circles of the Seed of Life */}
        {SEED_CIRCLES.map(([cx, cy, opacity], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={40}
            fill="none"
            stroke={animated ? "rgba(201,169,98,0.45)" : baseStroke}
            strokeWidth={animated ? 0.8 : 1}
            style={
              animated
                ? {
                    strokeDasharray: 252,
                    animation: `bz-draw-seed 2.2s cubic-bezier(.22,1,.36,1) ${0.2 + i * 0.15}s both`,
                  }
                : undefined
            }
          />
        ))}
        {/* The petals — where the circles meet, the flower begins */}
        {PETALS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={1.5}
            strokeLinecap="round"
            style={
              animated
                ? {
                    strokeDasharray: 110,
                    animation: `bz-draw-petal 1.6s cubic-bezier(.22,1,.36,1) ${1.7 + i * 0.15}s both`,
                  }
                : undefined
            }
          />
        ))}
        {/* The Nuqta — the point under the Bāʼ, the beginning of all knowledge */}
        <rect
          x={-4}
          y={-4}
          width={8}
          height={8}
          fill={`url(#${gradId})`}
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            transform: "rotate(45deg)",
            animation: animated
              ? "bz-nuqta 3s ease-in-out 3s infinite"
              : undefined,
          }}
        />
      </g>
    </svg>
  );
}
