"use client";

import { useId, useState } from "react";
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
  unscoredProgress?: number;
  unscoredDetail?: string;
  unscoredStatus?: string;
  unscoredBlank?: boolean;
  showCategories?: boolean;
}

export function AuditCardScoreSkeleton({
  summary,
  scored = true,
  cats,
  emptyLabels,
  unscoredProgress = 0,
  unscoredDetail = "Not scored yet",
  unscoredStatus = "Pending",
  unscoredBlank = false,
  showCategories = true,
}: AuditCardScoreSkeletonProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const tooltipId = useId();
  const bars: CatBar[] = cats?.length
    ? cats
    : scored
      ? summary.cats
      : (emptyLabels?.length ? emptyLabels : summary.cats.map(category => category.label)).map(label => ({
          label,
          score: 0,
          color: "var(--fg-faint)",
        }));
  const hasProjectedChange = scored && summary.projected > summary.overall && summary.uplift > 0;

  if (!scored) {
    const parts = (unscoredDetail || "In progress").split(" · ");
    const stage = parts[0];
    const statusText = parts.slice(1).join(" · ");
    const active = unscoredProgress > 0;
    const tone = active ? "var(--accent)" : "var(--fg-faint)";
    return (
      <div className="pt-audit-card-score" data-score-state="empty" aria-label={unscoredBlank ? "Audit scores are not available yet" : undefined} style={css("border:1px solid var(--border-soft);border-radius:0.9rem;background:var(--surface);padding:0.85rem 0.9rem;display:flex;flex-direction:column;gap:0.65rem")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)")}>
          {unscoredBlank ? <>
            <span aria-hidden="true" style={css("width:7.4rem;height:1rem;border-radius:999px;background:var(--surface-alt)")} />
            <span aria-hidden="true" style={css("width:2.2rem;height:1.35rem;border-radius:0.35rem;background:var(--surface-alt)")} />
          </> : <>
            <div style={css("min-width:0")}>
              <div style={css("font-size:var(--text-sm);font-weight:500;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{stage}</div>
              {statusText && <div style={css("margin-top:0.14rem;display:inline-flex;align-items:center;gap:0.32rem;font-size:var(--text-2xs);color:var(--fg-muted)")}><span aria-hidden="true" style={css("width:0.4rem;height:0.4rem;border-radius:50%;background:" + tone)} />{statusText}</div>}
            </div>
            <span style={css("font-size:var(--text-2xl);font-weight:500;line-height:1;font-variant-numeric:tabular-nums;flex-shrink:0;color:" + tone)}>{active ? unscoredProgress + "%" : "—"}</span>
          </>}
        </div>
        <div style={css("height:0.4rem;border-radius:999px;background:var(--surface-alt);overflow:hidden")}>
          {active && <div style={css("height:100%;width:" + Math.max(3, unscoredProgress) + "%;border-radius:999px;background:var(--accent)")} />}
        </div>
        {showCategories && <div className="pt-audit-card-score-categories" style={css("border-top:1px solid var(--border-soft);padding-top:0.55rem")}>
          <CategoryBars compact cats={bars} empty layout="grid" />
        </div>}
      </div>
    );
  }

  return (
    <div className="pt-audit-card-score" data-score-state={scored ? "scored" : "empty"} style={css("border:1px solid var(--border-soft);border-radius:0.9rem;background:linear-gradient(180deg,color-mix(in srgb,var(--success) 5%,var(--surface) 95%),var(--surface));padding:0.82rem 0.88rem;display:flex;flex-direction:column;gap:0.62rem")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)")}>
        <div style={css("min-width:0")}>
          <div style={css("display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap")}>
            <span className="pt-audit-score-number" style={css("font-weight:500;color:" + (scored || unscoredProgress ? "var(--fg)" : "var(--fg-faint)") + ";font-variant-numeric:tabular-nums")}>{scored ? summary.overall : unscoredProgress ? `${unscoredProgress}%` : "—"}</span>
            {hasProjectedChange && <span style={css("display:inline-flex;align-items:center;gap:0.28rem;color:var(--fg-muted)")}>
              <span className="pt-audit-score-arrow">↗</span><strong className="pt-audit-score-number" style={css("font-weight:500;color:var(--success);font-variant-numeric:tabular-nums")}>{summary.projected}</strong>
            </span>}
            {!scored && <span style={css("font-size:var(--text-sm);color:var(--fg-muted)")}>{unscoredDetail}</span>}
            {hasProjectedChange && <span className="pt-score-info">
              <button
                type="button"
                className="pt-score-info-button"
                aria-label="Explain the projected score"
                aria-describedby={tooltipId}
                aria-expanded={infoOpen}
                onClick={() => setInfoOpen(open => !open)}
                onKeyDown={event => {
                  if (event.key === "Escape") setInfoOpen(false);
                }}
              >
                i
              </button>
              <span id={tooltipId} role="tooltip" className="pt-score-info-tooltip" data-open={infoOpen ? "true" : "false"}>
                The second number is the estimated score after the recommended improvements are completed.
              </span>
            </span>}
          </div>
        </div>
        {(hasProjectedChange || !scored) && <span style={css("font-size:var(--text-lg);font-weight:500;color:" + (scored || unscoredProgress ? "var(--success)" : "var(--fg-faint)") + ";line-height:1;white-space:nowrap")}>{scored ? `+${summary.uplift}` : unscoredStatus}</span>}
      </div>
      <div style={css("position:relative;height:0.38rem;border-radius:999px;background:oklch(0.92 0.006 50)")}>
        {scored && <div style={css("height:100%;width:" + Math.max(2, summary.overall) + "%;border-radius:999px;background:var(--success)")} />}
        {!scored && unscoredProgress > 0 && <div style={css("height:100%;width:" + unscoredProgress + "%;border-radius:999px;background:var(--success)")} />}
        {hasProjectedChange && <span style={css("position:absolute;top:-0.16rem;bottom:-0.16rem;left:" + summary.projected + "%;width:2px;border-radius:999px;background:color-mix(in srgb,var(--fg-muted) 65%,transparent 35%)")} />}
      </div>
      {showCategories && <div className="pt-audit-card-score-categories" style={css("border-top:1px solid var(--border-soft);padding-top:0.55rem")}>
        <CategoryBars compact cats={bars} empty={!scored} layout="grid" />
      </div>}
    </div>
  );
}
