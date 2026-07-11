"use client";

import type { ReactNode } from "react";

// A clean arc gauge: a light track ring with a score-proportional coloured arc,
// number centred inside. Replaces the solid-outline "circle around a number"
// with a gauge that reads the score at a glance.
export function ScoreGauge({
  score,
  color,
  size = 44,
  stroke = 4,
  track,
  label,
  labelSize = "0.92rem",
}: {
  score: number;
  color: string;
  size?: number;
  stroke?: number;
  track?: string;
  label?: ReactNode;
  labelSize?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const filled = pct * circ;
  const trackColor = track || "color-mix(in srgb, var(--fg) 9%, transparent 91%)";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: trackColor }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          style={{ stroke: color, transition: "stroke-dasharray .45s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", lineHeight: 1, textAlign: "center" }}>
        {label ?? <span style={{ fontSize: labelSize, fontWeight: 500, color: "var(--fg)" }}>{score}</span>}
      </div>
    </div>
  );
}
