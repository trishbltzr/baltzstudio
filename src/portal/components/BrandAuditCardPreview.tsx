"use client";

import { useEffect, useState } from "react";
import type { BrandVisualEvidence } from "@/lib/aiStageGeneration";
import { css } from "../helpers";

type BrandAuditPreviewStatus = "not_started" | "intake" | "report_ready" | "plan_ready" | "complete";

interface BrandAuditCardPreviewProps {
  status: BrandAuditPreviewStatus;
  websiteUrl?: string;
  colors: [string, string][];
  fonts: string[];
  tones: string[];
}

const STAGES: Record<BrandAuditPreviewStatus, { step: number; label: string; note: string }> = {
  not_started: { step: 0, label: "No visual system yet", note: "Start the audit to build the visual system." },
  intake: { step: 1, label: "Collecting the foundation", note: "The first brand decisions are being documented." },
  report_ready: { step: 2, label: "Brand kit ready to review", note: "Verified visual evidence is available in the report." },
  plan_ready: { step: 3, label: "Action plan ready", note: "Review and approve the final priorities." },
  complete: { step: 3, label: "Brand system ready", note: "The approved system is available across the workspace." },
};

export function BrandAuditCardPreview({ status, websiteUrl, colors, fonts, tones }: BrandAuditCardPreviewProps) {
  const [palette, setPalette] = useState(colors);
  const [observedFonts, setObservedFonts] = useState(fonts);
  const stage = STAGES[status];

  useEffect(() => {
    setPalette(colors);
    setObservedFonts(fonts);
    if (colors.length || !websiteUrl || stage.step < 2) return;
    const controller = new AbortController();
    fetch(`/api/brand/visuals?url=${encodeURIComponent(websiteUrl)}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        const visual = payload?.result as BrandVisualEvidence | undefined;
        if (visual?.status !== "verified") return;
        setPalette(visual.colors.map(color => [color.role, color.hex]));
        setObservedFonts(Array.from(new Set([visual.displayFont, visual.bodyFont].filter((font): font is string => !!font))));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [colors, fonts, stage.step, websiteUrl]);

  if (palette.length) {
    const markerBase = "width:1.42rem;height:1.42rem;border-radius:50%;display:grid;place-items:center;border:2px solid var(--surface);box-shadow:0 0 0 1px var(--border-soft);flex-shrink:0;font-size:var(--text-2xs);font-weight:500";
    const extraMarker = (count: number) => count > 3 ? <span aria-label={`${count - 3} more`} style={css(markerBase + ";margin-left:-0.42rem;background:var(--surface);color:var(--fg-muted)")}>+{count - 3}</span> : null;
    const row = "display:grid;grid-template-columns:4.9rem minmax(0,1fr);align-items:center;gap:0.7rem;min-height:1.55rem";
    const stack = "display:flex;align-items:center;justify-content:flex-end;min-width:0;padding-right:1px";
    const label = "font-size:var(--text-2xs);font-weight:500;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    const textValues = (values: string[], singular: string) => <div aria-label={`${values.length} ${singular}${values.length === 1 ? "" : "s"}`} style={css("display:flex;align-items:center;justify-content:flex-end;gap:0.28rem;min-width:0;overflow:hidden") }>
      {values.length ? <>
        <span title={values[0]} style={css("min-width:0;max-width:6.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-2xs);font-weight:500;color:var(--fg);background:var(--surface);border:1px solid var(--border-soft);border-radius:var(--radius-pill);padding:0.2rem 0.48rem")}>{values[0]}</span>
        {values.length > 1 && <span aria-label={`${values.length - 1} more`} style={css("flex-shrink:0;min-width:1.35rem;height:1.35rem;padding:0 0.28rem;border-radius:999px;display:grid;place-items:center;background:var(--surface);border:1px solid var(--border-soft);font-size:var(--text-2xs);color:var(--fg-muted)")}>+{values.length - 1}</span>}
      </> : <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>—</span>}
    </div>;
    return <div data-brand-card-preview="palette" style={css("height:7rem;border:1px solid var(--border-soft);border-radius:0.9rem;background:var(--surface-alt);padding:0.68rem 0.78rem;display:flex;flex-direction:column;justify-content:center;gap:0.45rem") }>
      <div style={css(row)}>
        <span style={css(label)}>Colours</span>
        <div aria-label={`${palette.length} verified brand colours`} style={css(stack)}>
          {palette.slice(0, 3).map(([role, hex], index) => <span key={`${role}-${hex}`} title={`${role} · ${hex}`} aria-label={`${role} ${hex}`} style={css(markerBase + `;background:${hex};margin-left:${index ? "-0.42rem" : "0"}`)} />)}
          {extraMarker(palette.length)}
        </div>
      </div>
      <div style={css(row)}>
        <span style={css(label)}>Typeface{observedFonts.length === 1 ? "" : "s"}</span>
        {textValues(observedFonts, "typeface")}
      </div>
      <div style={css(row)}>
        <span style={css(label)}>Voice traits</span>
        {textValues(tones, "voice trait")}
      </div>
    </div>;
  }

  return <div data-brand-card-preview={status} style={css("height:7rem;border:1px solid var(--border-soft);border-radius:0.9rem;background:var(--surface-alt);padding:0.78rem 0.82rem;display:flex;flex-direction:column;justify-content:space-between;gap:0.65rem") }>
    <div><div style={css("font-size:var(--text-2xs);font-weight:500;color:" + (stage.step ? "var(--fg)" : "var(--fg-muted)"))}>{stage.label}</div><div style={css("margin-top:0.2rem;font-size:var(--text-2xs);line-height:1.4;color:var(--fg-faint)")}>{stage.note}</div></div>
    <div aria-label={`${stage.step} of 3 brand audit stages complete`} style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:0.35rem")}>{[1, 2, 3].map(step => <span key={step} style={css("height:0.32rem;border-radius:999px;background:" + (step <= stage.step ? "var(--success)" : "var(--border-soft)"))} />)}</div>
  </div>;
}
