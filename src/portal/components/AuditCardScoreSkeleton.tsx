"use client";

import { css } from "../helpers";
import { CategoryBars, type CatBar } from "./AuditCharts";

interface AuditCardScoreSummary {
  overall: number;
  projected: number;
  uplift: number;
  cats: Array<{ label: string; score: number; color: string }>;
}

interface AuditCardScoreSkeletonProps {
  summary: AuditCardScoreSummary;
  scored?: boolean;
  cats?: CatBar[];
  emptyLabels?: string[];
  projectionLabel?: string;
}

export function AuditCardScoreSkeleton({
  summary,
  scored = true,
  cats,
  emptyLabels,
  projectionLabel = "Projected after Winged in a Week",
}: AuditCardScoreSkeletonProps) {
  const bars: CatBar[] = cats?.length
    ? cats
    : scored
      ? summary.cats
      : (emptyLabels?.length ? emptyLabels : summary.cats.map(category => category.label)).map(label => ({
          label,
          score: 0,
          color: "var(--fg-faint)",
        }));

  return (
    <div className="pt-audit-card-score" data-score-state={scored ? "scored" : "empty"} style={css("border:1px solid var(--border-soft);border-radius:0.9rem;background:linear-gradient(180deg,color-mix(in srgb,var(--success) 5%,var(--surface) 95%),var(--surface));padding:0.82rem 0.88rem;display:flex;flex-direction:column;gap:0.62rem")}>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:var(--space-3)")}>
        <div style={css("min-width:0")}>
          <div style={css("font-size:0.7rem;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{projectionLabel}</div>
          <div style={css("display:flex;align-items:baseline;gap:0.4rem;margin-top:0.15rem;flex-wrap:wrap")}>
            <span style={css("font-size:1.55rem;font-weight:500;color:" + (scored ? "var(--fg)" : "var(--fg-faint)") + ";line-height:0.9;font-variant-numeric:tabular-nums")}>{scored ? summary.overall : "—"}</span>
            <span style={css("font-size:0.82rem;color:var(--fg-muted)")}>
              {scored ? <>↗ <strong style={css("font-weight:500;color:var(--success)")}>{summary.projected}</strong></> : "Not scored yet"}
            </span>
          </div>
        </div>
        <span style={css("font-size:var(--text-lg);font-weight:500;color:" + (scored ? "var(--success)" : "var(--fg-faint)") + ";line-height:1;white-space:nowrap")}>{scored ? `+${summary.uplift}` : "Pending"}</span>
      </div>
      <div style={css("position:relative;height:0.38rem;border-radius:999px;background:oklch(0.92 0.006 50)")}>
        {scored && <div style={css("height:100%;width:" + Math.max(2, summary.overall) + "%;border-radius:999px;background:var(--success)")} />}
        {scored && <span style={css("position:absolute;top:-0.16rem;bottom:-0.16rem;left:" + summary.projected + "%;width:2px;border-radius:999px;background:color-mix(in srgb,var(--fg-muted) 65%,transparent 35%)")} />}
      </div>
      <div className="pt-audit-card-score-categories" style={css("border-top:1px solid var(--border-soft);padding-top:0.55rem")}>
        <CategoryBars compact cats={bars} empty={!scored} layout="grid" />
      </div>
    </div>
  );
}
