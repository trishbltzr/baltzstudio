"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { css } from "../helpers";
import { CategoryBars, OverallScoreBar } from "../components/AuditCharts";
import { Icon } from "../icons";
import type { Ans, Pipeline, StageRenderCtx, ProposalRenderCtx } from "./DiscoveryBuilder";
import { auditPrioritiesFromEvidence, isAuditScoreResult, specificAuditCourseOfAction, type AuditCheckResult, type AuditIssue, type AuditScoreResult, type LighthouseRun } from "@/lib/auditChecklist";
import { isAiStageResult } from "@/lib/aiStageGeneration";

// ── scoring model (ported from Audit Builder) ──────────────────────────────────
const AREAS = [
  { key: "conv", label: "Conversion Path" },
  { key: "exp", label: "Website Experience" },
  { key: "msg", label: "Messaging & Voice" },
  { key: "find", label: "Findability" },
  { key: "vis", label: "Visual Identity" },
  { key: "brand", label: "Brand Foundation" },
];

const catColor = (score: number) => score < 50 ? "var(--danger)" : (score < 65 ? "var(--warn)" : "var(--success)");
const catStatus = (score: number) => score < 50 ? "Priority" : (score < 65 ? "Needs work" : (score < 80 ? "Good" : "Strong"));
const badgeStyle = (score: number) => "font-size:var(--text-2xs);font-weight:500;padding:0.15rem 0.5rem;border-radius:999px;background:color-mix(in srgb," + catColor(score) + " 14%,white 86%);color:" + catColor(score);
const CHECKLIST_DIALOG_EVENT = "baltazar:checklist-dialog-open";

export interface AuditCat { key: string; label: string; score: number; projected: number; gain: number; status: string; color: string; rec: string; findings: string[]; short: string; issues?: AuditIssue[]; checks?: AuditCheckResult[]; passed?: number; failed?: number; unverified?: number; notApplicable?: number; strengths?: string[] }
export interface AuditDocs { name: string; cats: AuditCat[]; overall: number; projected: number; uplift: number; strong: number; needWork: number; label: string; invest: string }

export function buildAuditDocs(data: Ans): AuditDocs {
  const d = data || {};
  const cats: AuditCat[] = AREAS.map(area => ({
    key: area.key,
    label: area.label,
    score: 0,
    projected: 0,
    gain: 0,
    status: "Unverified",
    color: "var(--fg-faint)",
    rec: "Complete the evidence-backed checklist before recommending an implementation change.",
    findings: [],
    short: "No verified score is available yet.",
  }));
  return { name: (d.name as string) || "New audit", cats, overall: 0, projected: 0, uplift: 0, strong: 0, needWork: 0, label: "Not scored", invest: "Scoped after review" };
}

export function auditScoreToDocs(result: AuditScoreResult, fallbackName = "Website audit"): AuditDocs {
  const cats = result.categories.map(category => {
    const courseOfAction = specificAuditCourseOfAction(category);
    const issues = category.issues.filter(issue => category.checks.some(check => check.status === "fail" && (check.id === issue.criterion || check.label === issue.criterion)));
    return {
      key: category.key, label: category.label, score: category.score, projected: Math.max(category.score, category.target),
      gain: Math.max(0, category.target - category.score), status: catStatus(category.score), color: catColor(category.score),
      rec: courseOfAction, findings: issues.map(issue => issue.finding), short: courseOfAction,
      issues, checks: category.checks, passed: category.passed, failed: category.failed,
      unverified: category.unverified, notApplicable: category.notApplicable, strengths: category.strengths,
    };
  });
  const overall = result.overallScore;
  const projected = Math.max(overall, result.targetScore);
  const strong = cats.filter(category => category.score >= 65).length;
  const label = overall < 50 ? "Needs attention" : overall < 65 ? "Fair foundation" : overall < 80 ? "Solid footing" : "Strong foundation";
  return { name: result.title || fallbackName, cats, overall, projected, uplift: Math.max(0, projected - overall), strong, needWork: cats.length - strong, label, invest: "Scoped after review" };
}

// ── renderers ──────────────────────────────────────────────────────────────────
function CatCard({ c, accent, big }: { c: AuditCat; accent: string; big?: boolean }) {
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:16px;padding:" + (big ? "1.3rem 1.4rem" : "1rem 1.1rem") + ";display:flex;flex-direction:column;gap:0.65rem;background:var(--surface);animation:cocoonFade .34s ease both;content-visibility:auto;contain-intrinsic-size:auto 28rem")}>
      <div style={css("display:flex;align-items:center;gap:0.7rem")}>
        <span style={css("width:" + (big ? "2.7rem" : "2.4rem") + ";height:" + (big ? "2.7rem" : "2.4rem") + ";border-radius:0.62rem;display:grid;place-items:center;font-size:" + (big ? "1.05rem" : "0.95rem") + ";font-weight:500;flex-shrink:0;background:color-mix(in srgb," + c.color + " 13%,var(--surface) 87%);color:" + c.color + ";font-variant-numeric:tabular-nums")}>{c.score}</span>
        <div style={css("flex:1;min-width:0")}><div style={css("font-size:" + (big ? "1.05rem" : "0.95rem") + ";font-weight:500;line-height:1.2")}>{c.label}</div><span style={css(badgeStyle(c.score) + ";display:inline-block;margin-top:0.3rem")}>{c.status}</span></div>
      </div>
      <div>
        <div style={css("position:relative;height:0.4rem;border-radius:999px;background:oklch(0.92 0.006 50)")}><div style={css("height:100%;border-radius:999px;background:" + c.color + ";width:" + c.score + "%")} /><div style={css("position:absolute;top:-0.12rem;bottom:-0.12rem;left:" + c.projected + "%;width:2px;border-radius:1px;background:var(--fg-faint)")} /></div>
        <div style={css("display:flex;justify-content:space-between;align-items:center;margin-top:0.4rem;font-size:var(--text-2xs)")}><span style={css("color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{c.score}</span> <span style={css("color:var(--success)")}>↗</span> target {c.projected}</span><span style={css("font-weight:500;color:var(--success)")}>+{c.gain}</span></div>
      </div>
      <div style={css("display:flex;flex-direction:column;gap:0.35rem")}>
        {c.issues?.length ? c.issues.map((issue, i) => <article key={`${issue.criterion}-${i}`} style={css("border-top:1px solid var(--border-soft);padding-top:0.65rem;margin-top:0.15rem")}>
          <div style={css("display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap")}><span style={css("font-size:var(--text-label);font-weight:500;text-transform:uppercase;padding:0.16rem 0.45rem;border-radius:999px;background:" + (issue.severity === "critical" || issue.severity === "high" ? "var(--danger-soft)" : "var(--warn-soft)") + ";color:" + (issue.severity === "critical" || issue.severity === "high" ? "var(--danger)" : "var(--warn)"))}>{issue.severity}</span><strong style={css("font-size:var(--text-sm);font-weight:500")}>{issue.criterion}</strong></div>
          <div style={css("font-size:var(--text-sm);color:var(--fg);line-height:1.45;margin-top:0.35rem")}>{issue.finding}</div>
          <div style={css("font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.45;margin-top:0.25rem")}><span style={css("font-weight:500")}>Evidence:</span> {issue.evidence}</div>
          {issue.sourceUrl && <div style={css("font-size:var(--text-2xs);color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:0.2rem")}>{issue.sourceUrl}</div>}
          <div style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.45;margin-top:0.32rem")}><span style={css("font-weight:500;color:" + accent)}>Fix:</span> {issue.fix}</div>
        </article>) : c.findings.map((f, i) => <div key={i} style={css("display:flex;gap:var(--space-2);font-size:var(--text-xs);color:var(--fg-muted);line-height:1.45")}><span style={css("width:0.32rem;height:0.32rem;border-radius:50%;background:" + c.color + ";margin-top:0.42rem;flex-shrink:0")} /><span style={css("flex:1;min-width:0")}>{f}</span></div>)}
      </div>
      <div style={css("background:var(--surface-alt);border-radius:9px;padding:0.7rem 0.85rem;font-size:var(--text-sm);color:var(--fg-muted);line-height:1.5")}><span style={css("color:" + accent + ";font-weight:500")}>Course of action</span> — {c.rec}</div>
      {!!c.strengths?.length && <details style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}><summary style={css("cursor:pointer;color:var(--fg-faint)")}>What is already working ({c.strengths.length})</summary><ul style={css("margin:0.45rem 0 0;padding-left:1.1rem;line-height:1.45")}>{c.strengths.map(strength => <li key={strength}>{strength}</li>)}</ul></details>}
    </div>
  );
}

const checkTone = (status: AuditCheckResult["status"]) => status === "pass"
  ? { label: "Passed", color: "var(--success)", bg: "var(--success-soft)", icon: "✓" }
  : status === "fail" ? { label: "Failed", color: "var(--danger)", bg: "var(--danger-soft)", icon: "×" }
    : status === "not_applicable" ? { label: "N/A", color: "var(--fg-muted)", bg: "var(--surface-alt)", icon: "–" }
      : { label: "Unverified", color: "var(--warn)", bg: "var(--warn-soft)", icon: "?" };

function PagesAudited({ pages, lighthouse }: { pages: string[]; lighthouse: LighthouseRun[] }) {
  const lighthouseUrls = new Set(lighthouse.map(run => run.testedUrl));
  const visiblePages = pages.slice(0, 5);
  const remainingPages = pages.slice(5);
  const pageRow = (page: string, index: number) => <div key={page} style={css("display:flex;align-items:center;gap:0.6rem;padding:0.55rem 0.65rem;border-radius:0.7rem;background:var(--surface-alt)")}>
    <span style={css("width:1.35rem;height:1.35rem;border-radius:50%;display:grid;place-items:center;background:var(--surface);border:1px solid var(--border-soft);font-size:var(--text-2xs);color:var(--fg-muted);flex-shrink:0")}>{index + 1}</span>
    <span title={page} style={css("min-width:0;flex:1;font-size:var(--text-xs);color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{page.replace(/^https?:\/\/(?:www\.)?/i, "")}</span>
    {lighthouseUrls.has(page) && <span style={css("font-size:var(--text-2xs);font-weight:500;color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:0.15rem 0.45rem;white-space:nowrap")}>Lighthouse tested</span>}
  </div>;
  return (
    <section style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1.05rem 1.15rem;content-visibility:auto;contain-intrinsic-size:auto 32rem")}>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4)")}><div><div style={css("font-size:var(--text-lg);font-weight:500")}>Pages audited</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.2rem")}>Every page used as evidence is listed here. Lighthouse performance was run on the marked page.</div></div><span style={css("font-size:var(--text-2xs);color:var(--fg-muted);white-space:nowrap")}>{pages.length} pages</span></div>
      <div style={css("display:flex;flex-direction:column;gap:0.42rem;margin-top:0.8rem")}>
        {visiblePages.map(pageRow)}
        {remainingPages.length > 0 && <details className="pt-audited-pages-disclosure">
          <summary>
            <span className="pt-audited-pages-disclosure-copy">
              <span className="pt-audited-pages-disclosure-closed">Show {remainingPages.length} more pages</span>
              <span className="pt-audited-pages-disclosure-open">Hide additional pages</span>
              <span className="pt-audited-pages-disclosure-note">Complete evidence list</span>
            </span>
            <span className="pt-audited-pages-disclosure-icon" aria-hidden="true"><Icon name="chev" size={14} /></span>
          </summary>
          <div style={css("display:flex;flex-direction:column;gap:0.42rem;margin-top:0.42rem")}>{remainingPages.map((page, index) => pageRow(page, index + visiblePages.length))}</div>
        </details>}
      </div>
    </section>
  );
}

function LighthouseReport({ runs }: { runs: LighthouseRun[] }) {
  if (!runs.length) return <section style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface-alt);padding:1rem 1.1rem;font-size:var(--text-xs);color:var(--fg-muted)")}><strong style={css("display:block;color:var(--fg);font-weight:500")}>Google Lighthouse</strong><span style={css("display:block;margin-top:0.25rem")}>Lighthouse was unavailable for this run. Performance checks remain marked unverified.</span></section>;
  const scoreColor = (score: number) => score >= 90 ? "var(--success)" : score >= 50 ? "var(--warn)" : "var(--danger)";
  const metricLabels: Record<string, string> = { "first-contentful-paint": "FCP", "largest-contentful-paint": "LCP", "speed-index": "SI", "total-blocking-time": "TBT", "cumulative-layout-shift": "CLS" };
  const metricIds = Object.keys(metricLabels);
  return (
    <section style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1.1rem 1.15rem;content-visibility:auto;contain-intrinsic-size:auto 42rem")}>
      <div><div style={css("font-size:var(--text-lg);font-weight:500")}>Google Lighthouse lab report</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.2rem;line-height:1.45")}>Official PageSpeed Insights Lighthouse data. Lab values are estimates and can vary between runs.</div></div>
      <div style={css("display:flex;flex-direction:column;gap:0.8rem;margin-top:0.9rem")}>
        {runs.map(run => <article key={run.strategy} style={css("border:1px solid var(--border-soft);border-radius:13px;padding:0.85rem 0.9rem")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.7rem")}><strong style={css("font-size:var(--text-base);font-weight:500;text-transform:capitalize")}>{run.strategy}</strong><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>Lighthouse {run.lighthouseVersion}</span></div>
          <div style={css("display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0.55rem;margin-top:0.75rem")}>
            {[["Performance", run.scores.performance], ["Accessibility", run.scores.accessibility], ["Best practices", run.scores.bestPractices], ["SEO", run.scores.seo]].map(([label, value]) => <div key={String(label)} style={css("text-align:center;padding:0.6rem 0.35rem;border-radius:0.7rem;background:var(--surface-alt)")}><div style={css("width:2.55rem;height:2.55rem;margin:0 auto;border-radius:50%;display:grid;place-items:center;border:3px solid " + scoreColor(Number(value)) + ";font-size:var(--text-xs);font-weight:500;color:" + scoreColor(Number(value)))}>{value}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:0.35rem;line-height:1.2")}>{label}</div></div>)}
          </div>
          <div style={css("display:grid;grid-template-columns:repeat(5,minmax(5.5rem,1fr));gap:0.4rem;margin-top:0.65rem;overflow-x:auto;padding-bottom:0.1rem")}>
            {metricIds.map(metricId => { const metric = run.metrics.find(item => item.id === metricId); return <div key={metricId} style={css("min-width:5.5rem;text-align:center;padding:0.55rem 0.45rem;border:1px solid var(--border-soft);border-radius:0.7rem;background:var(--surface-alt)")}><div style={css("font-size:var(--text-2xs);font-weight:500;color:var(--fg-faint)")}>{metricLabels[metricId]}</div><div style={css("font-size:var(--text-2xs);font-weight:500;color:var(--fg);margin-top:0.2rem")}>{metric?.displayValue || "—"}</div></div>; })}
          </div>
          {!!run.insights?.length && <div style={css("border-top:1px solid var(--border-soft);margin-top:0.75rem;padding-top:0.7rem")}><div style={css("font-size:var(--text-2xs);font-weight:500;color:var(--fg)")}>Insights from this lab report</div><div style={css("display:flex;flex-direction:column;gap:0.45rem;margin-top:0.5rem")}>{run.insights.slice(0, 5).map(insight => <div key={insight.id} style={css("display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0.6rem;align-items:start;padding:0.55rem 0.6rem;border-radius:0.7rem;background:var(--surface-alt)")}><div><div style={css("font-size:var(--text-2xs);font-weight:500")}>{insight.title}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.4;margin-top:0.18rem")}>{insight.description}</div></div><span style={css("font-size:var(--text-2xs);font-weight:500;color:" + scoreColor(insight.score) + ";white-space:nowrap")}>{insight.displayValue || `${insight.score}/100`}</span></div>)}</div></div>}
        </article>)}
      </div>
    </section>
  );
}

function nextCheckStatus(status: AuditCheckResult["status"]): AuditCheckResult["status"] {
  if (status === "fail") return "pass";
  if (status === "pass") return "unverified";
  return "fail";
}

function ChecklistScoreCard({ category, onStatusChange }: {
  category: AuditScoreResult["categories"][number];
  onStatusChange?: (categoryKey: string, checkId: string, status: AuditCheckResult["status"]) => void;
}) {
  const color = catColor(category.score);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const closeOtherDialog = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== category.key) setOpen(false);
    };
    window.addEventListener(CHECKLIST_DIALOG_EVENT, closeOtherDialog);
    return () => window.removeEventListener(CHECKLIST_DIALOG_EVENT, closeOtherDialog);
  }, [category.key]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);
  const openDialog = () => {
    window.dispatchEvent(new CustomEvent(CHECKLIST_DIALOG_EVENT, { detail: category.key }));
    setOpen(true);
  };
  const counts = [[category.passed,"Passed","var(--success)","var(--success-soft)"],[category.failed,"Failed","var(--danger)","var(--danger-soft)"],[category.unverified,"Unverified","var(--warn)","var(--warn-soft)"],[category.notApplicable,"N/A","var(--fg-muted)","var(--surface-alt)"]] as const;
  const segColors = ["var(--success)", "var(--danger)", "var(--warn)", "color-mix(in srgb,var(--fg-muted) 30%,var(--surface-alt) 70%)"] as const;
  const segTotal = Math.max(1, category.passed + category.failed + category.unverified + category.notApplicable);
  return (
    <section style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1rem 1.1rem;content-visibility:auto;contain-intrinsic-size:auto 8rem")}>
      <div style={css("display:flex;align-items:center;gap:0.7rem;flex-wrap:wrap")}><span style={css("width:2.1rem;height:2.1rem;border-radius:50%;display:grid;place-items:center;font-size:var(--text-sm);font-weight:500;flex-shrink:0;background:color-mix(in srgb," + color + " 13%,var(--surface) 87%);color:" + color + ";font-variant-numeric:tabular-nums")}>{category.score}</span><div style={css("min-width:8rem;flex:1")}><div style={css("font-size:var(--text-lg);font-weight:500")}>{category.label}</div></div><button ref={triggerRef} type="button" aria-haspopup="dialog" onClick={openDialog} className="pt-softbtn" style={css("min-height:2rem;padding:0 0.72rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500;cursor:pointer;white-space:nowrap")}>View {category.checks.length} checks</button></div>
      <div style={css("display:flex;height:0.62rem;border-radius:999px;overflow:hidden;background:var(--surface-alt);margin-top:0.8rem")}>{counts.map(([count, label], index) => count > 0 ? <div key={label} title={count + " " + label} style={css("height:100%;width:" + (count / segTotal * 100) + "%;background:" + segColors[index])} /> : null)}</div>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem;flex-wrap:wrap;margin-top:0.6rem")}><div style={css("display:flex;gap:var(--space-3);flex-wrap:wrap")}>{counts.map(([count, label, tone]) => <span key={label} style={css("display:inline-flex;align-items:center;gap:0.32rem;font-size:var(--text-2xs);font-weight:500;color:" + (count ? "var(--fg)" : "var(--fg-faint)"))}><span style={css("width:0.5rem;height:0.5rem;border-radius:50%;background:" + tone + ";opacity:" + (count ? "1" : "0.4"))} />{count} {label}</span>)}</div><span style={css("font-size:var(--text-2xs);color:var(--fg-faint);white-space:nowrap")}>{category.checks.length} check{category.checks.length === 1 ? "" : "s"} evaluated · {Math.max(0, category.score)}% pass rate</span></div>
      {open && createPortal(<div role="dialog" aria-modal="true" aria-labelledby={`checklist-${category.key}-title`} onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }} style={css("position:fixed;inset:0;z-index:140;background:rgba(35,25,18,.42);padding:var(--space-4);display:grid;place-items:center")}>
        <article style={css("width:min(46rem,100%);max-height:min(44rem,calc(100dvh - 2rem));display:flex;flex-direction:column;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface);box-shadow:0 24px 70px rgba(35,24,22,.24);overflow:hidden")}>
          <header style={css("padding:0.9rem 1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4)")}><div><div style={css("display:flex;align-items:center;gap:var(--space-2)")}><span style={css("font-size:var(--text-lg);font-weight:500;color:" + color)}>{category.score}</span><h3 id={`checklist-${category.key}-title`} style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>{category.label} checks</h3></div><div style={css("display:flex;gap:0.35rem;flex-wrap:wrap;margin-top:0.5rem")}>{counts.map(([count,label,tone,bg]) => <span key={label} style={css("font-size:var(--text-2xs);font-weight:500;color:" + tone + ";background:" + bg + ";border-radius:999px;padding:0.17rem 0.44rem")}>{count} {label}</span>)}</div></div><button ref={closeRef} type="button" aria-label={`Close ${category.label} checks`} onClick={() => setOpen(false)} className="pt-softbtn" style={css("width:2rem;height:2rem;border:1px solid var(--border);border-radius:50%;background:var(--surface);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer;flex-shrink:0")}>×</button></header>
          <div style={css("min-height:0;overflow-y:auto;display:flex;flex-direction:column")}>{category.checks.map(check => { const tone = checkTone(check.status); return <div key={check.id} style={css("display:grid;grid-template-columns:1.55rem minmax(0,1fr) auto;gap:0.6rem;align-items:start;padding:0.75rem 1rem;border-bottom:1px solid var(--border-soft)")}><span style={css("width:1.45rem;height:1.45rem;border-radius:50%;display:grid;place-items:center;background:" + tone.bg + ";color:" + tone.color + ";font-size:var(--text-2xs);font-weight:500")}>{tone.icon}</span><div style={css("min-width:0")}><div style={css("font-size:var(--text-xs);font-weight:500;line-height:1.4")}>{check.label}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.45;margin-top:0.22rem")}>{check.evidence}</div>{check.sourceUrl && <div title={check.sourceUrl} style={css("font-size:var(--text-2xs);color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:0.18rem")}>{check.sourceUrl}</div>}</div><button type="button" disabled={!onStatusChange} aria-label={`${check.label}: ${tone.label}. Click to change status.`} title={onStatusChange ? "Click to change status" : tone.label} onClick={() => onStatusChange?.(category.key, check.id, nextCheckStatus(check.status))} className="pt-softbtn" style={css("border:0;font-family:inherit;font-size:var(--text-2xs);font-weight:500;color:" + tone.color + ";background:" + tone.bg + ";border-radius:999px;padding:0.22rem 0.5rem;white-space:nowrap;cursor:" + (onStatusChange ? "pointer" : "default"))}>{tone.label}</button></div>; })}</div>
        </article>
      </div>, document.body)}
    </section>
  );
}

function LighthouseRecommendations({ runs }: { runs: LighthouseRun[] }) {
  const categoryActions = [
    { key: "performance" as const, label: "Performance", action: "Prioritize the slowest loading metrics, compress heavy media, reduce render-blocking work, and retest mobile first." },
    { key: "accessibility" as const, label: "Accessibility", action: "Resolve Lighthouse accessibility failures, then manually verify keyboard navigation, labels, focus, and contrast." },
    { key: "bestPractices" as const, label: "Best practices", action: "Fix browser-console, security, image, and deprecated-API findings reported by Lighthouse." },
    { key: "seo" as const, label: "Technical SEO", action: "Resolve Lighthouse SEO failures, then validate metadata, crawlability, canonical URLs, and structured data." },
  ];
  const categoryRecommendations = categoryActions.map(item => {
    const scored = runs.map(run => ({ strategy: run.strategy, score: run.scores[item.key] }));
    const lowest = scored.sort((left, right) => left.score - right.score)[0];
    return lowest && lowest.score < 90 ? { id: item.key, title: item.label, action: item.action, ...lowest } : null;
  }).filter((item): item is NonNullable<typeof item> => !!item);
  const detailedById = new Map<string, { id: string; title: string; action: string; strategy: "mobile" | "desktop"; score: number }>();
  runs.forEach(run => (run.insights || []).forEach(insight => {
    const current = detailedById.get(insight.id);
    if (!current || insight.score < current.score) detailedById.set(insight.id, { id: insight.id, title: insight.title, action: insight.description, strategy: run.strategy, score: insight.score });
  }));
  const detailedRecommendations = [...detailedById.values()].sort((left, right) => left.score - right.score).slice(0, 8);
  const recommendations = detailedRecommendations.length ? detailedRecommendations : categoryRecommendations;
  return (
    <section style={css("border:1px solid color-mix(in srgb,#6b5bd2 24%,var(--border-soft) 76%);border-radius:16px;background:color-mix(in srgb,#6b5bd2 5%,white 95%);padding:1.15rem 1.25rem") }>
      <div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:#6b5bd2")}>Lighthouse recommendations</div>
      <h3 style={css("margin:0.25rem 0 0;font-size:var(--text-xl);font-weight:500")}>Technical actions from mobile and desktop testing</h3>
      {!runs.length ? <p style={css("margin:0.55rem 0 0;font-size:var(--text-xs);color:var(--fg-muted);line-height:1.5")}>Lighthouse did not return a result, so no Lighthouse recommendation is being presented as verified. Run the technical test again before completing this section.</p> : recommendations.length ? (
        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:0.6rem;margin-top:0.8rem") }>
          {recommendations.map(item => <article key={item.id} style={css("border:1px solid var(--border-soft);border-radius:0.85rem;background:var(--surface);padding:0.75rem 0.8rem") }><div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)")}><strong style={css("font-size:var(--text-sm);font-weight:500")}>{item.title}</strong><span style={css("font-size:var(--text-2xs);font-weight:500;color:" + catColor(item.score))}>{item.strategy} {item.score}/100</span></div><p style={css("margin:0.35rem 0 0;font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.45")}>{item.action}</p></article>)}
        </div>
      ) : <p style={css("margin:0.55rem 0 0;font-size:var(--text-xs);color:var(--fg-muted)")}>All recorded Lighthouse categories scored at least 90. Keep monitoring them after implementation changes.</p>}
    </section>
  );
}

function renderStage(ctx: StageRenderCtx): ReactNode {
  const { stageKey, docs, reveal, accent } = ctx;
  const fallback = docs as AuditDocs;
  const scoreResult = isAuditScoreResult(ctx.aiResult) ? ctx.aiResult : isAuditScoreResult(ctx.aiResults.report) ? ctx.aiResults.report : null;
  const d = scoreResult ? auditScoreToDocs(scoreResult, fallback.name) : fallback;

  if (stageKey === "report") {
    if (!scoreResult) return <div style={css("padding:var(--space-4);color:var(--fg-muted)")}>Generate the checklist report to see the scoring evidence.</div>;
    const totalPassed = scoreResult.categories.reduce((sum, category) => sum + category.passed, 0);
    const totalFailed = scoreResult.categories.reduce((sum, category) => sum + category.failed, 0);
    const totalUnverified = scoreResult.categories.reduce((sum, category) => sum + category.unverified, 0);
    const applicableChecks = scoreResult.applicableChecks ?? totalPassed + totalFailed + totalUnverified;
    const verifiedChecks = scoreResult.verifiedChecks ?? totalPassed + totalFailed;
    const evidenceCoverage = scoreResult.evidenceCoverage ?? (applicableChecks ? Math.round((verifiedChecks / applicableChecks) * 100) : 0);
    const coverageThreshold = scoreResult.coverageThreshold ?? 75;
    const reliable = evidenceCoverage >= coverageThreshold;
    return (
      <div style={css("display:flex;flex-direction:column;gap:1.1rem")}>
        <section className="pt-audit-report-summary" style={css("display:grid;grid-template-columns:" + (ctx.mobile ? "1fr" : "repeat(2,minmax(0,1fr))") + ";gap:0.8rem")}>
          <article style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1.15rem 1.25rem;display:flex;align-items:center;gap:1.1rem;flex-wrap:wrap")}>
          <div style={css("min-width:12rem;flex:1")}><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--cocoon)")}>Internal audit report</div><div style={css("font-size:var(--text-xl);font-weight:500;margin-top:0.2rem")}>Our guidelines score</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.5;margin-top:0.3rem")}>Calculated only from the original checklist: passed ÷ passed plus failed. Lighthouse never changes this score.</div><div style={css("font-size:var(--text-2xs);font-weight:500;color:" + (reliable ? "var(--success)" : "var(--warn)") + ";margin-top:0.45rem")}>{evidenceCoverage}% evidence coverage · {verifiedChecks} of {applicableChecks} applicable checks verified</div><div style={css("display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.6rem")}><span style={css("font-size:var(--text-2xs);color:var(--success);background:var(--success-soft);border-radius:999px;padding:0.2rem 0.5rem")}>{totalPassed} passed</span><span style={css("font-size:var(--text-2xs);color:var(--danger);background:var(--danger-soft);border-radius:999px;padding:0.2rem 0.5rem")}>{totalFailed} failed</span><span style={css("font-size:var(--text-2xs);color:var(--warn);background:var(--warn-soft);border-radius:999px;padding:0.2rem 0.5rem")}>{totalUnverified} unverified</span></div></div>
          </article>
          <article style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1.15rem 1.25rem")}>
            <div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:#6b5bd2")}>Lighthouse report</div><div style={css("font-size:var(--text-xl);font-weight:500;margin-top:0.2rem")}>Separate technical scores</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.5;margin-top:0.3rem")}>Mobile and desktop stay independent so one result cannot hide the other.</div>
            <div style={css("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.55rem;margin-top:0.8rem")}>{(["mobile","desktop"] as const).map(strategy => { const run = scoreResult.lighthouse.find(item => item.strategy === strategy); return <div key={strategy} style={css("border:1px solid var(--border-soft);border-radius:0.8rem;background:var(--surface-alt);padding:0.65rem 0.75rem")}><div style={css("font-size:var(--text-2xs);text-transform:capitalize;color:var(--fg-faint)")}>{strategy}</div><div style={css("font-size:var(--text-2xl);font-weight:500;margin-top:0.12rem")}>{run ? run.scores.performance : "—"}<span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}> /100 performance</span></div></div>; })}</div>
          </article>
        </section>
        <section style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1.1rem 1.25rem")}>
          <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-4);margin-bottom:0.85rem")}><div style={css("font-size:var(--text-lg);font-weight:500")}>Category scores</div><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>current → target</span></div>
          <CategoryBars cats={scoreResult.categories.map(category => ({ label: category.label, score: category.score, target: category.target, color: catColor(category.score) }))} />
        </section>
        <PagesAudited pages={scoreResult.pagesReviewed} lighthouse={scoreResult.lighthouse}/>
        <div><div style={css("font-size:var(--text-xl);font-weight:500")}>Lighthouse technical report</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.2rem")}>Independent technical measurements. These numbers do not affect the internal checklist score.</div></div>
        <LighthouseReport runs={scoreResult.lighthouse}/>
        <div style={css("display:flex;align-items:end;justify-content:space-between;gap:var(--space-4);margin-top:0.2rem")}><div><div style={css("font-size:var(--text-xl);font-weight:500")}>Original Audit Checklist results</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.2rem")}>Every item from the reference checklist is shown below with its evidence and scoring status.</div></div></div>
        <div style={css("display:grid;grid-template-columns:1fr;gap:var(--space-3)")}>{scoreResult.categories.map(category => <ChecklistScoreCard key={category.key} category={category} onStatusChange={ctx.onAuditCheckStatusChange}/>)}</div>
      </div>
    );
  }

  // action plan
  const planResult = isAiStageResult(ctx.aiResult) ? ctx.aiResult : null;
  const evidencePriorities = scoreResult ? auditPrioritiesFromEvidence(scoreResult.categories) : [];
  const planPriorities = ctx.onAuditCheckStatusChange && scoreResult
    ? evidencePriorities
    : planResult?.recommendations.map(item => ({
        title: item.title,
        why: item.rationale,
        action: item.action,
      })) || evidencePriorities;
  const need = d.cats.filter(c => c.score < 65).sort((a, b) => a.score - b.score);
  const strong = d.cats.filter(c => c.score >= 65);
  const needShown = reveal === Number.POSITIVE_INFINITY ? need : need.slice(0, reveal);
  return (
    <div style={css("display:flex;flex-direction:column;gap:1.2rem")}>
      <section style={css("border:1px solid color-mix(in srgb," + accent + " 24%,var(--border-soft) 76%);border-radius:16px;background:color-mix(in srgb," + accent + " 5%,white 95%);padding:1.2rem 1.3rem")}>
        <div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:" + accent)}>Action plan</div>
        <h3 style={css("margin:0.25rem 0 0;font-size:var(--text-xl);font-weight:500")}>Priority action plan</h3>
        <p style={css("margin:0.3rem 0 0;font-size:var(--text-xs);color:var(--fg-muted);line-height:1.5")}>Start here. These actions are ordered by impact so the team can move from findings to implementation.</p>
        <div style={css("display:flex;flex-direction:column;gap:0.6rem;margin-top:0.9rem")}>
          {planPriorities.map((priority, index) => <article key={priority.title} style={css("display:grid;grid-template-columns:1.65rem minmax(0,1fr);gap:0.65rem;border:1px solid var(--border-soft);border-radius:0.85rem;background:var(--surface);padding:0.75rem 0.8rem")}><span style={css("width:1.55rem;height:1.55rem;border-radius:50%;display:grid;place-items:center;background:" + accent + ";color:#fff;font-size:var(--text-2xs);font-weight:500")}>{index + 1}</span><div><div style={css("font-size:var(--text-sm);font-weight:500")}>{priority.title}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.45;margin-top:0.2rem")}>{priority.why}</div><div style={css("font-size:var(--text-2xs);line-height:1.45;margin-top:0.28rem")}><strong style={css("font-weight:500;color:" + accent)}>Action: </strong>{priority.action}</div></div></article>)}
        </div>
      </section>
      <LighthouseRecommendations runs={scoreResult?.lighthouse || []} />
      <div style={css("display:grid;grid-template-columns:1fr;gap:1.1rem;align-items:stretch")}>
        <div style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1.3rem 1.4rem")}>
          <OverallScoreBar overall={d.overall} projected={d.projected} strong={d.strong} needWork={d.needWork} label={d.label} caption="Projected after a one-week sprint" color="var(--success)" />
        </div>
      </div>
      <div style={css("display:flex;flex-direction:column;gap:var(--space-4)")}>
        {needShown.map(c => <CatCard key={c.key} c={c} accent={accent} big />)}
      </div>
      {reveal === Number.POSITIVE_INFINITY && strong.length > 0 && (
        <div>
          <div style={css("display:flex;align-items:center;gap:0.4rem;font-size:var(--text-xs);font-weight:500;color:var(--success);margin-bottom:0.7rem")}><span>✓</span> Already strong</div>
          <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:0.8rem")}>
            {strong.map(c => (
              <div key={c.key} style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1.1rem 1.2rem")}>
                <div style={css("display:flex;align-items:center;gap:0.65rem")}>
                  <span style={css("width:2.2rem;height:2.2rem;border-radius:0.55rem;display:grid;place-items:center;font-size:var(--text-sm);font-weight:500;flex-shrink:0;background:color-mix(in srgb," + c.color + " 13%,var(--surface) 87%);color:" + c.color + ";font-variant-numeric:tabular-nums")}>{c.score}</span>
                  <div style={css("flex:1;min-width:0")}><div style={css("font-size:var(--text-lg);font-weight:500;line-height:1.2")}>{c.label}</div><span style={css(badgeStyle(c.score) + ";display:inline-block;margin-top:0.25rem")}>{c.status}</span></div>
                </div>
                <div style={css("font-size:var(--text-base);color:var(--fg-muted);margin-top:0.7rem;line-height:1.45")}>{c.short}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function renderProposal(ctx: ProposalRenderCtx): ReactNode {
  const fallback = ctx.docs as AuditDocs;
  if (!isAuditScoreResult(ctx.aiResults.report)) return <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.2rem;color:var(--fg-muted)")}>The evidence-backed audit score is not ready. Return to the report stage and regenerate it before preparing the proposal.</section>;
  const d = auditScoreToDocs(ctx.aiResults.report, fallback.name);
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;animation:cocoonFade .4s ease both")}>
      <div style={css("padding:1.6rem 1.7rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
        <div onClick={ctx.onBack} style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:var(--text-xs);color:var(--fg-muted);cursor:pointer;margin-bottom:0.9rem")}>← Back to action plan</div>
        <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ctx.accent + ";margin-bottom:0.3rem")}>Audit summary</div>
        <h2 style={css("margin:0;font-size:var(--text-3xl);font-weight:500;line-height:1.18")}>{d.name} scored {d.overall}/100</h2>
        <p style={css("margin:0.4rem 0 0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.5;max-width:36rem")}>{d.label} today, with a clear path to {d.projected}. Share the full report with your client, or have Baltz action the fixes.</p>
        <div style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2);margin-top:1.2rem")}>
          {[[String(d.overall), "Score today", "var(--fg)"], [String(d.projected), "Projected", "var(--success)"], [String(d.needWork), "Areas to fix", "var(--fg)"]].map(([v, l, col]) => <div key={l} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.75rem 0.9rem;background:var(--surface-alt)")}><div style={css("font-size:var(--text-3xl);font-weight:500;line-height:1;color:" + col)}>{v}</div><div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-top:0.28rem")}>{l}</div></div>)}
        </div>
      </div>
      <div style={css("padding:1.15rem 1.4rem;background:var(--surface-alt);display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap")}>
        <div style={css("flex:1;min-width:9rem")}><div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>Website Lab sprint</div><div style={css("font-size:var(--text-3xl);font-weight:500;line-height:1.1")}>{d.invest}</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>Fixed scope from your Checkup</div></div>
        <div style={css("display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap")}>
          <button type="button" onClick={ctx.onShare} className="pt-softbtn" style={css("height:2.6rem;padding:0 1.2rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);font-size:var(--text-base);font-weight:500;cursor:pointer;font-family:inherit")}>↗ Share with client</button>
          <button type="button" onClick={ctx.onRequest} className="pt-op" style={css("height:2.6rem;padding:0 1.5rem;border-radius:var(--radius-pill);border:none;background:" + ctx.accent + ";color:#fff;font-size:var(--text-base);font-weight:500;cursor:pointer;font-family:inherit")}>Have Baltz fix this →</button>
        </div>
      </div>
    </div>
  );
}

function introPreview(): ReactNode {
  const cats = [
    { label: "Content", score: 48, color: "var(--danger)" },
    { label: "Design & Typography", score: 55, color: "var(--warn)" },
    { label: "Navigation & Structure", score: 61, color: "var(--warn)" },
    { label: "Accessibility", score: 68, color: "var(--success)" },
  ];
  return (
    <div style={css("position:absolute;top:1.5rem;left:1.5rem;right:-2.5rem;bottom:-1.4rem;background:#fff;border:1px solid var(--border-soft);border-radius:12px 0 0 0;box-shadow:0 24px 60px -30px rgba(60,40,30,0.5);padding:1.2rem 1.4rem;display:flex;flex-direction:column;overflow:hidden")}>
      <div style={css("display:flex;align-items:flex-start;gap:0.65rem;padding-bottom:0.75rem")}>
        <span style={css("width:1.85rem;height:1.85rem;border-radius:7px;background:var(--success-soft);color:var(--success);display:grid;place-items:center;font-weight:500;font-size:var(--text-base);flex-shrink:0")}>B</span>
        <div style={css("flex:1;min-width:0")}><div style={css("font-size:var(--text-md);font-weight:500;line-height:1.2")}>Client</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:0.08rem")}>Website Audit — Discovery Report</div></div>
      </div>
      <div style={css("height:2px;background:var(--success);border-radius:2px;margin-bottom:0.9rem")} />
      <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.55rem")}>Overall score</div>
      <div style={css("display:flex;align-items:center;gap:0.9rem;margin-bottom:1rem")}>
        <span style={css("width:3.1rem;height:3.1rem;border-radius:0.7rem;display:grid;place-items:center;font-size:var(--text-xl);font-weight:500;flex-shrink:0;background:var(--success-soft);color:var(--success)")}>65</span>
        <div style={css("min-width:0")}><div style={css("font-size:var(--text-lg);font-weight:500")}>Fair foundation</div><div style={css("display:flex;gap:0.3rem;margin-top:0.3rem;flex-wrap:wrap")}><span style={css("font-size:var(--text-2xs);font-weight:500;padding:0.15rem 0.45rem;border-radius:999px;background:var(--success-soft);color:var(--success)")}>3 strong</span><span style={css("font-size:var(--text-2xs);font-weight:500;padding:0.15rem 0.45rem;border-radius:999px;background:var(--warn-soft);color:var(--warn)")}>3 need work</span></div></div>
      </div>
      <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.5rem")}>Category scores</div>
      <div style={css("display:flex;flex-direction:column;gap:0.55rem")}>
        {cats.map(c => (
          <div key={c.label} style={css("display:flex;align-items:center;gap:0.6rem")}>
            <span style={css("width:1.5rem;height:1.5rem;border-radius:50%;border:2px solid " + c.color + ";display:grid;place-items:center;font-size:var(--text-2xs);font-weight:500;flex-shrink:0")}>{c.score}</span>
            <div style={css("flex:1;min-width:0")}><div style={css("font-size:var(--text-xs);font-weight:500")}>{c.label}</div><div style={css("height:0.28rem;border-radius:999px;background:oklch(0.92 0.006 50);margin-top:0.2rem;overflow:hidden")}><div style={css("height:100%;border-radius:999px;background:" + c.color + ";width:" + c.score + "%")} /></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STAGE_PROMPT: Record<string, string> = {
  report: "Rescan the website and score all six Audit Checklist categories. Every issue will include evidence, the affected page, and a specific fix.",
  plan: "Turn the internal audit findings and Lighthouse results into a prioritised implementation action plan.",
};
const STAGE_CTA: Record<string, string> = { report: "Score my site", plan: "Build action plan" };

export const AUDIT_PIPELINE: Pipeline = {
  railTitle: "Audit pipeline",
  buildDocs: buildAuditDocs,
  gen: (k) => ({ total: k === "report" ? 1 + AREAS.length : 3, ms: k === "report" ? 8000 : 5000, buildLabel: k === "report" ? "Scoring" : "Building" }),
  genPrompt: (k) => STAGE_PROMPT[k] || "Generate this stage from the approved evidence.",
  genCta: (k) => STAGE_CTA[k] || "Generate draft",
  approveLabel: (_k, isLast) => (isLast ? "Finish & share →" : "Approve & continue →"),
  beginLabel: "Score my site →",
  beginMsg: (data) => {
    const nick = String(data.nickname || "").trim();
    const nickCap = nick ? nick.charAt(0).toUpperCase() + nick.slice(1) : "";
    const name = String(data.name || "").trim() || "your site";
    return nickCap
      ? "Perfect, " + nickCap + " — I have everything I need to score " + name + "."
      : "I have everything I need to score your site.";
  },
  introPreview,
  renderStage,
  renderProposal,
};
