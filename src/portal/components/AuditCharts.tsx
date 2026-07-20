"use client";

import { css } from "../helpers";

// Shared inline score charts for the audit surfaces. These replace the
// repeated donut rings (one per category, drawn in every section) with a single
// cohesive small-multiples bar chart, so the six category scores read as one
// graph instead of nineteen scattered rings.

export interface CatBar {
  label: string;
  score: number;
  target?: number;
  color: string;
}

// A compact small-multiples bar chart: one row per category —
// label · fill bar (with a target marker) · score → target · +gain.
export function CategoryBars({ cats, compact = false, labelWidth, empty = false, layout = "list" }: { cats: CatBar[]; compact?: boolean; labelWidth?: string; empty?: boolean; layout?: "list" | "grid" }) {
  const lw = labelWidth || (compact ? "6.6rem" : "8.6rem");
  return (
    <div style={css(layout === "grid"
      ? "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:0.8rem;row-gap:0.58rem"
      : "display:flex;flex-direction:column;gap:" + (compact ? "0.48rem" : "0.6rem"))}>
      {cats.map(c => {
        const target = typeof c.target === "number" ? Math.max(c.score, c.target) : c.score;
        const gain = Math.max(0, target - c.score);
        const barColor = empty ? "var(--border)" : c.color;
        if (layout === "grid") return (
          <div key={c.label} style={css("display:flex;flex-direction:column;gap:0.24rem;min-width:0")}>
            <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:0.4rem;min-width:0")}>
              <span title={c.label} style={css("font-size:0.66rem;font-weight:500;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{c.label}</span>
              <span style={css("font-size:0.63rem;color:" + (empty ? "var(--fg-faint)" : "var(--fg)") + ";white-space:nowrap;font-variant-numeric:tabular-nums")}>{empty ? "—" : gain > 0 ? `${c.score} → ${target}` : `${c.score}`}</span>
            </div>
            <div style={css("position:relative;height:0.34rem;border-radius:999px;background:color-mix(in srgb," + barColor + " 40%,var(--surface-alt) 60%)")}>
              {!empty && <div style={css("position:absolute;inset:0 auto 0 0;height:100%;border-radius:999px;width:" + Math.max(2, c.score) + "%;background:" + c.color + ";transition:width .45s ease")} />}
              {!empty && gain > 0 && <span aria-hidden="true" style={css("position:absolute;top:-0.16rem;bottom:-0.16rem;left:" + target + "%;width:2px;border-radius:1px;background:color-mix(in srgb,var(--fg-muted) 62%,transparent 38%)")} />}
            </div>
          </div>
        );
        return (
          <div key={c.label} style={css("display:grid;grid-template-columns:" + lw + " minmax(0,1fr) auto;gap:" + (compact ? "0.5rem" : "0.7rem") + ";align-items:center")}>
            <span title={c.label} style={css("font-size:" + (compact ? "0.68rem" : "0.76rem") + ";font-weight:500;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{c.label}</span>
            <div style={css("position:relative;height:" + (compact ? "0.4rem" : "0.5rem") + ";border-radius:999px;background:color-mix(in srgb," + barColor + " 40%,var(--surface-alt) 60%)")}>
              {!empty && <div style={css("position:absolute;inset:0 auto 0 0;height:100%;border-radius:999px;width:" + Math.max(2, c.score) + "%;background:" + c.color + ";transition:width .45s ease")} />}
              {!empty && gain > 0 && <span aria-hidden="true" style={css("position:absolute;top:-0.2rem;bottom:-0.2rem;left:" + target + "%;width:2px;border-radius:1px;background:color-mix(in srgb,var(--fg-muted) 62%,transparent 38%)")} />}
            </div>
            <span style={css("display:inline-flex;align-items:baseline;gap:0.28rem;font-size:" + (compact ? "0.66rem" : "0.74rem") + ";white-space:nowrap;font-variant-numeric:tabular-nums")}>
              {empty ? <strong style={css("font-weight:500;color:var(--fg-faint)")}>—</strong> : <>
                <strong style={css("font-weight:500;color:var(--fg)")}>{c.score}</strong>
                {gain > 0
                  ? <><span style={css("color:var(--fg-faint)")}>→{target}</span><span style={css("color:var(--success);font-weight:500")}>+{gain}</span></>
                  : <span style={css("color:var(--fg-faint)")}>/100</span>}
              </>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// A prominent inline overall-score readout: big number + full-width bar with a
// target marker + strong/need-work counts. Replaces the large focal donut.
export function OverallScoreBar({
  overall,
  projected,
  strong,
  needWork,
  color = "var(--success)",
  label,
  caption,
  compact = false,
}: {
  overall: number;
  projected?: number;
  strong?: number;
  needWork?: number;
  color?: string;
  label?: string;
  caption?: string;
  compact?: boolean;
}) {
  const target = typeof projected === "number" ? Math.max(overall, projected) : overall;
  const uplift = target - overall;
  return (
    <div style={css("display:flex;flex-direction:column;gap:" + (compact ? "0.5rem" : "0.65rem") + ";min-width:0;flex:1")}>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:0.8rem;flex-wrap:wrap")}>
        <div style={css("display:flex;align-items:baseline;gap:0.4rem;min-width:0")}>
          <span style={css("font-size:" + (compact ? "2rem" : "2.5rem") + ";font-weight:500;line-height:0.9;color:var(--fg);font-variant-numeric:tabular-nums")}>{overall}</span>
          <span style={css("font-size:0.7rem;color:var(--fg-faint)")}>/100</span>
          {uplift > 0 && <span style={css("display:inline-flex;align-items:baseline;gap:0.22rem;font-size:0.78rem;color:var(--fg-muted);margin-left:0.35rem")}>↗ <strong style={css("font-weight:500;color:" + color)}>{target}</strong></span>}
        </div>
        {uplift > 0 && <span style={css("font-size:" + (compact ? "1rem" : "1.2rem") + ";font-weight:500;color:" + color + ";line-height:1")}>+{uplift}</span>}
      </div>
      <div style={css("position:relative;height:" + (compact ? "0.42rem" : "0.5rem") + ";border-radius:999px;background:color-mix(in srgb," + color + " 12%,var(--surface-alt) 88%)")}>
        <div style={css("position:absolute;inset:0 auto 0 0;height:100%;border-radius:999px;width:" + Math.max(2, overall) + "%;background:" + color + ";transition:width .45s ease")} />
        {uplift > 0 && <span aria-hidden="true" style={css("position:absolute;top:-0.2rem;bottom:-0.2rem;left:" + target + "%;width:2px;border-radius:1px;background:color-mix(in srgb,var(--fg-muted) 62%,transparent 38%)")} />}
      </div>
      {(label || typeof strong === "number") && (
        <div style={css("display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap")}>
          {label && <span style={css("font-size:0.82rem;font-weight:500;color:var(--fg)")}>{label}</span>}
          {typeof strong === "number" && <span style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.68rem;color:var(--fg-faint)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--success)")} />{strong} strong</span>}
          {typeof needWork === "number" && <span style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.68rem;color:var(--fg-faint)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--warn)")} />{needWork} need work</span>}
          {caption && <span style={css("margin-left:auto;font-size:0.66rem;color:var(--fg-faint)")}>{caption}</span>}
        </div>
      )}
    </div>
  );
}
