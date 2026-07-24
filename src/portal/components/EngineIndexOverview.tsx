"use client";

import type { ReactNode } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import type { EngineIndexMetric } from "./EngineIndexControls";

const metricColor: Record<string, string> = {
  accent: "var(--accent)",
  success: "var(--success)",
  warn: "var(--warn)",
  muted: "var(--fg-faint)",
};

// "At a glance" overview for the engine selectors. Renders each metric as a
// scannable stat tile — big tabular figure up top with a tone dot, small label
// below — so the pipeline state reads instantly instead of as a row of tiny
// "1 clients" pills. Shared by every engine (audits, SEO, brand, builders…).
export function EngineIndexOverview({ metrics, insight }: { metrics: EngineIndexMetric[]; insight?: ReactNode }) {
  return (
    <div style={css("display:flex;flex-direction:column;gap:0.5rem;min-width:0")}>
    <div style={css("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:1fr;gap:0.5rem")}>
      {metrics.map(metric => {
        const space = metric.label.indexOf(" ");
        const value = space === -1 ? metric.label : metric.label.slice(0, space);
        const label = space === -1 ? "" : metric.label.slice(space + 1);
        const color = metricColor[metric.tone || "accent"];
        return (
          <div key={metric.label} style={css("min-width:0;display:flex;align-items:center;gap:0.45rem;padding:0.65rem 0.72rem;border:1px solid var(--border-soft);border-radius:0.75rem;background:var(--surface-alt)")}>
            {metric.icon
              ? <span style={css("display:inline-flex;flex-shrink:0;color:" + color)}><Icon name={metric.icon} size={14} /></span>
              : <span aria-hidden="true" style={css("width:0.5rem;height:0.5rem;border-radius:50%;flex-shrink:0;background:" + color)} />}
            <span style={css("font-size:var(--text-2xl);font-weight:500;line-height:1;font-variant-numeric:tabular-nums;color:var(--fg);flex-shrink:0")}>{value}</span>
            {label && <span style={css("min-width:0;font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.2")}>{label}</span>}
          </div>
        );
      })}
    </div>
    {insight && <div style={css("display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.4")}>{insight}</div>}
    </div>
  );
}
