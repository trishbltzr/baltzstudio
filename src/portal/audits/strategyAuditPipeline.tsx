"use client";

import type { ReactNode } from "react";
import { isAiStageResult } from "@/lib/aiStageGeneration";
import { css } from "../helpers";
import type { Ans, Pipeline, ProposalRenderCtx, StageRenderCtx } from "../discovery/DiscoveryBuilder";
import type { AuditType } from "../types";

type StrategyAuditType = Exclude<AuditType, "website">;

const COPY = {
  brand: {
    railTitle: "Brand audit pipeline",
    reportTitle: "Brand kit & guidelines",
    reportPrompt: "Generate the brand kit, consolidated guidelines, and evidence-based improvement insights.",
    reportCta: "Generate brand audit",
    begin: "Build brand kit →",
    complete: "I have everything I need to build the brand kit and guidelines.",
  },
  seo: {
    railTitle: "SEO audit pipeline",
    reportTitle: "SEO audit report",
    reportPrompt: "Generate the SEO report from the website, technical context, and available GA4 evidence.",
    reportCta: "Generate SEO audit",
    begin: "Build SEO report →",
    complete: "I have everything I need to prepare the SEO report.",
  },
} as const;

function preview(type: StrategyAuditType): ReactNode {
  const items = type === "brand"
    ? ["Brand foundation", "Messaging & voice", "Visual identity", "Brand system"]
    : ["Technical SEO", "On-page SEO", "Content & intent", "Measurement"];
  return <div style={css("position:absolute;inset:1.5rem -2.5rem -1.4rem 1.5rem;border:1px solid var(--border-soft);border-radius:12px 0 0;background:var(--surface);box-shadow:0 24px 60px -30px rgba(60,40,30,.5);padding:1.2rem 1.4rem;overflow:hidden") }><div style={css("font-size:0.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--cocoon)")}>{type === "brand" ? "Brand kit preview" : "SEO report preview"}</div><div style={css("font-size:1.05rem;font-weight:500;margin-top:0.25rem")}>{type === "brand" ? "A usable brand system" : "A prioritized search plan"}</div><div style={css("display:flex;flex-direction:column;gap:0.65rem;margin-top:1rem")}>{items.map((item, index) => <div key={item} style={css("display:flex;align-items:center;gap:0.65rem;padding:0.68rem 0.75rem;border:1px solid var(--border-soft);border-radius:0.8rem;background:var(--surface-alt)")}><span style={css("width:1.6rem;height:1.6rem;border-radius:50%;display:grid;place-items:center;background:var(--success-soft);color:var(--success);font-size:0.68rem;font-weight:500")}>{index + 1}</span><span style={css("font-size:0.8rem;font-weight:500")}>{item}</span></div>)}</div></div>;
}

function renderStage(type: StrategyAuditType, ctx: StageRenderCtx): ReactNode {
  const result = isAiStageResult(ctx.aiResult) ? ctx.aiResult : null;
  const title = ctx.stageKey === "plan" ? "Priority action plan" : COPY[type].reportTitle;
  if (!result) return <div style={css("padding:1rem;color:var(--fg-muted);font-size:0.82rem")}>Generate this stage to review the complete {type === "brand" ? "brand system" : "SEO findings"}.</div>;
  return <div style={css("display:flex;flex-direction:column;gap:1rem") }>
    <section style={css("border:1px solid color-mix(in srgb," + ctx.accent + " 22%,var(--border-soft) 78%);border-radius:1rem;background:color-mix(in srgb," + ctx.accent + " 5%,var(--surface) 95%);padding:1.15rem 1.2rem") }><div style={css("font-size:0.68rem;text-transform:uppercase;letter-spacing:.04em;color:" + ctx.accent)}>{type === "brand" ? "Brand audit" : "SEO audit"}</div><h3 style={css("margin:0.25rem 0 0;font-size:1.15rem;font-weight:500")}>{title}</h3><p style={css("margin:0.4rem 0 0;font-size:0.8rem;line-height:1.55;color:var(--fg-muted)")}>{result.summary}</p></section>
    {result.sections.map(section => <section key={section.heading} style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:1rem 1.1rem") }><h4 style={css("margin:0;font-size:0.95rem;font-weight:500")}>{section.heading}</h4><p style={css("margin:0.38rem 0 0;font-size:0.78rem;line-height:1.55;color:var(--fg-muted)")}>{section.body}</p><ul style={css("margin:0.65rem 0 0;padding-left:1.1rem;display:flex;flex-direction:column;gap:0.35rem")}>{section.bullets.map(bullet => <li key={bullet} style={css("font-size:0.76rem;line-height:1.5;color:var(--fg)")}>{bullet}</li>)}</ul></section>)}
    {result.recommendations.length > 0 && <section style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:1rem 1.1rem") }><h4 style={css("margin:0;font-size:0.95rem;font-weight:500")}>Improvement insights</h4><div style={css("display:flex;flex-direction:column;gap:0.6rem;margin-top:0.75rem")}>{result.recommendations.map((item, index) => <article key={item.title} style={css("display:grid;grid-template-columns:1.55rem minmax(0,1fr);gap:0.65rem;padding:0.7rem;border:1px solid var(--border-soft);border-radius:0.8rem;background:var(--surface-alt)")}><span style={css("width:1.45rem;height:1.45rem;border-radius:50%;display:grid;place-items:center;background:" + ctx.accent + ";color:#fff;font-size:0.65rem;font-weight:500")}>{index + 1}</span><div><div style={css("font-size:0.8rem;font-weight:500")}>{item.title}</div><div style={css("font-size:0.72rem;line-height:1.45;color:var(--fg-muted);margin-top:0.2rem")}>{item.rationale}</div><div style={css("font-size:0.72rem;line-height:1.45;margin-top:0.25rem")}><strong style={css("font-weight:500;color:" + ctx.accent)}>Action: </strong>{item.action}</div></div></article>)}</div></section>}
  </div>;
}

function renderProposal(type: StrategyAuditType, ctx: ProposalRenderCtx): ReactNode {
  const report = isAiStageResult(ctx.aiResults.report) ? ctx.aiResults.report : null;
  return <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.4rem 1.5rem") }><div style={css("font-size:0.68rem;text-transform:uppercase;letter-spacing:.04em;color:" + ctx.accent)}>Audit complete</div><h2 style={css("margin:0.3rem 0 0;font-size:1.35rem;font-weight:500")}>{type === "brand" ? "Brand kit, guidelines, and action plan ready" : "SEO report and action plan ready"}</h2><p style={css("margin:0.45rem 0 0;font-size:0.82rem;line-height:1.55;color:var(--fg-muted)")}>{report?.summary || "The approved audit stages are ready to share."}</p><div style={css("display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:1rem") }><button type="button" onClick={ctx.onBack} className="pt-softbtn" style={css("height:2.4rem;padding:0 1rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);font-size:0.78rem;cursor:pointer")}>Review action plan</button><button type="button" onClick={ctx.onShare} className="pt-op" style={css("height:2.4rem;padding:0 1.1rem;border:none;border-radius:999px;background:" + ctx.accent + ";color:#fff;font-size:0.78rem;font-weight:500;cursor:pointer")}>Share with client</button></div></section>;
}

export function createStrategyAuditPipeline(type: StrategyAuditType): Pipeline {
  const copy = COPY[type];
  return {
    railTitle: copy.railTitle,
    buildDocs: (data: Ans) => data,
    gen: key => ({ total: key === "report" ? 6 : 5, ms: 6000, buildLabel: key === "report" ? "Preparing" : "Building" }),
    genPrompt: key => key === "report" ? copy.reportPrompt : "Turn the approved findings into a specific, prioritized action plan.",
    genCta: key => key === "report" ? copy.reportCta : "Build action plan",
    approveLabel: (_key, last) => last ? "Finish & share →" : "Approve & continue →",
    beginLabel: copy.begin,
    beginMsg: () => copy.complete,
    introPreview: () => preview(type),
    renderStage: ctx => renderStage(type, ctx),
    renderProposal: ctx => renderProposal(type, ctx),
  };
}
