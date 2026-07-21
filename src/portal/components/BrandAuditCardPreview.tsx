"use client";

import { useEffect, useState } from "react";
import type { BrandVisualEvidence } from "@/lib/aiStageGeneration";
import { css } from "../helpers";

type BrandAuditPreviewStatus = "not_started" | "intake" | "report_ready" | "plan_ready" | "complete";

interface BrandAuditCardPreviewProps {
  status: BrandAuditPreviewStatus;
  websiteUrl?: string;
  colors: [string, string][];
  fontCount: number;
  toneCount: number;
}

const STAGES: Record<BrandAuditPreviewStatus, { step: number; label: string; note: string }> = {
  not_started: { step: 0, label: "No visual system yet", note: "Start the audit to build the visual system." },
  intake: { step: 1, label: "Collecting the foundation", note: "The first brand decisions are being documented." },
  report_ready: { step: 2, label: "Brand kit ready to review", note: "Verified visual evidence is available in the report." },
  plan_ready: { step: 3, label: "Action plan ready", note: "Review and approve the final priorities." },
  complete: { step: 3, label: "Brand system ready", note: "The approved system is available across the workspace." },
};

export function BrandAuditCardPreview({ status, websiteUrl, colors, fontCount, toneCount }: BrandAuditCardPreviewProps) {
  const [palette, setPalette] = useState(colors);
  const [observedFontCount, setObservedFontCount] = useState(fontCount);
  const stage = STAGES[status];

  useEffect(() => {
    setPalette(colors);
    setObservedFontCount(fontCount);
    if (colors.length || !websiteUrl || stage.step < 2) return;
    const controller = new AbortController();
    fetch(`/api/brand/visuals?url=${encodeURIComponent(websiteUrl)}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        const visual = payload?.result as BrandVisualEvidence | undefined;
        if (visual?.status !== "verified") return;
        setPalette(visual.colors.map(color => [color.role, color.hex]));
        setObservedFontCount(new Set([visual.displayFont, visual.bodyFont].filter(Boolean)).size);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [colors, fontCount, stage.step, websiteUrl]);

  if (palette.length) {
    return <div data-brand-card-preview="palette" style={css("height:7rem;border:1px solid var(--border-soft);border-radius:0.9rem;background:var(--surface-alt);padding:0.78rem 0.82rem;display:flex;flex-direction:column;justify-content:space-between;gap:0.7rem") }>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem") }>
        <span style={css("font-size:0.68rem;font-weight:500;color:var(--fg-muted)")}>Brand system preview</span>
        <span style={css("font-size:0.62rem;color:var(--fg-faint)")}>{palette.length} verified colours</span>
      </div>
      <div aria-label="Verified brand colours" style={css("display:flex;align-items:center;gap:0.48rem") }>
        {palette.slice(0, 5).map(([role, hex]) => <span key={`${role}-${hex}`} title={`${role} · ${hex}`} aria-label={`${role} ${hex}`} style={css("width:1.72rem;height:1.72rem;border-radius:50%;background:" + hex + ";border:2px solid var(--surface);box-shadow:0 0 0 1px var(--border-soft)")} />)}
        {palette.length > 5 && <span style={css("width:1.72rem;height:1.72rem;border-radius:50%;display:grid;place-items:center;background:var(--surface);border:1px solid var(--border-soft);font-size:0.58rem;color:var(--fg-muted)")}>+{palette.length - 5}</span>}
      </div>
      <div style={css("display:flex;align-items:center;gap:0.4rem;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.64rem;color:var(--fg-muted)")}>
        <span>{observedFontCount || "—"} typeface{observedFontCount === 1 ? "" : "s"}</span><span aria-hidden="true">·</span><span>{toneCount || "—"} voice trait{toneCount === 1 ? "" : "s"}</span>
      </div>
    </div>;
  }

  return <div data-brand-card-preview={status} style={css("height:7rem;border:1px solid var(--border-soft);border-radius:0.9rem;background:var(--surface-alt);padding:0.78rem 0.82rem;display:flex;flex-direction:column;justify-content:space-between;gap:0.65rem") }>
    <div><div style={css("font-size:0.74rem;font-weight:500;color:" + (stage.step ? "var(--fg)" : "var(--fg-muted)"))}>{stage.label}</div><div style={css("margin-top:0.2rem;font-size:0.65rem;line-height:1.4;color:var(--fg-faint)")}>{stage.note}</div></div>
    <div aria-label={`${stage.step} of 3 brand audit stages complete`} style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:0.35rem")}>{[1, 2, 3].map(step => <span key={step} style={css("height:0.32rem;border-radius:999px;background:" + (step <= stage.step ? "var(--success)" : "var(--border-soft)"))} />)}</div>
  </div>;
}
