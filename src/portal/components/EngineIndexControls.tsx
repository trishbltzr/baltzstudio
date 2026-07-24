"use client";

import { css } from "../helpers";
import { Icon, type IconName } from "../icons";

type MetricTone = "accent" | "success" | "warn" | "muted";

export type EngineIndexMetric = {
  label: string;
  tone?: MetricTone;
  icon?: IconName;
};

const metricColor: Record<MetricTone, string> = {
  accent: "var(--accent)",
  success: "var(--success)",
  warn: "var(--warn)",
  muted: "var(--fg-faint)",
};

export function EngineIndexControls({
  metrics,
  action,
}: {
  metrics: EngineIndexMetric[];
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    color?: string;
    icon?: IconName;
  };
}) {
  return (
    <div style={css("display:flex;align-items:center;justify-content:flex-start;gap:var(--space-2);flex-wrap:wrap;min-width:0")}>
      {metrics.map(metric => {
        const tone = metric.tone || "accent";
        return (
          <span key={metric.label} style={css("display:inline-flex;align-items:center;gap:.35rem;min-height:2rem;padding:0 .72rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:var(--text-2xs);color:var(--fg-muted);white-space:nowrap")}>
            {metric.icon ? <Icon name={metric.icon} size={13}/> : <span aria-hidden="true" style={css(`width:.42rem;height:.42rem;border-radius:50%;background:${metricColor[tone]}`)}/>} 
            {metric.label}
          </span>
        );
      })}
      {action && <button
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
          style={css(`display:inline-flex;align-items:center;justify-content:center;gap:.42rem;min-height:2.3rem;padding:0 .95rem;border:none;border-radius:999px;background:${action.disabled ? "var(--surface-alt)" : action.color || "var(--accent)"};color:${action.disabled ? "var(--fg-faint)" : "#fff"};font-size:var(--text-xs);font-weight:500;cursor:${action.disabled ? "not-allowed" : "pointer"};opacity:${action.disabled ? ".58" : "1"}`)}
        >
          <Icon name={action.icon || "plus"} size={15}/>{action.label}
        </button>}
    </div>
  );
}
