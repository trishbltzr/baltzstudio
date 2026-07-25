"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isAiStageResult, type AiStageResult, type BrandVisualEvidence } from "@/lib/aiStageGeneration";
import { css } from "../helpers";
import { Icon } from "../icons";
import type { Ans, Pipeline, ProposalRenderCtx, StageRenderCtx } from "../discovery/DiscoveryBuilder";
import type { AuditType } from "../types";

type StrategyAuditType = Exclude<AuditType, "website">;

// ── brand kit synthesis ────────────────────────────────────────────────────────
function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(/\r?\n|,|;/).map(s => s.trim()).filter(Boolean);
  return [];
}
function asText(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  return typeof v === "string" ? v.trim() : "";
}
function readable(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#2c211c" : "#ffffff";
}
function conciseSummary(value: string) {
  return compactText(value, 28, 190);
}
function compactText(value: string, maxWords = 24, maxCharacters = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxCharacters && normalized.split(" ").length <= maxWords) return normalized;
  const words = normalized.split(" ");
  const kept: string[] = [];
  for (const word of words) {
    const next = [...kept, word].join(" ");
    if (kept.length >= maxWords || next.length > maxCharacters) break;
    kept.push(word);
  }
  return `${kept.join(" ").replace(/[,:;.!?–—-]+$/, "")}…`;
}
function cleanPriorityTitle(value: string) {
  return value
    .replace(/^priority\s*\d*\s*[—–:.)-]\s*/i, "")
    .replace(/^\d+\s*[.)—–:-]\s*/, "")
    .trim() || value;
}

function auditPreviewFontCss(visual: BrandVisualEvidence) {
  const relevant = new Set([visual.displayFont, visual.bodyFont].filter((font): font is string => !!font).map(font => font.toLowerCase()));
  return (visual.fontFaces || []).flatMap(face => {
    if (!relevant.has(face.family.toLowerCase())) return [];
    let sourceUrl: URL;
    try { sourceUrl = new URL(face.sourceUrl); } catch { return []; }
    if (!["http:", "https:"].includes(sourceUrl.protocol)) return [];
    const family = face.family.replace(/["'\\{};]/g, "").trim();
    const weight = /^\d{3}$/.test(face.weight) ? face.weight : "400";
    const style = /^(normal|italic|oblique)$/i.test(face.style) ? face.style.toLowerCase() : "normal";
    const format = face.format?.replace(/[^a-z0-9-]/gi, "") || "";
    return `@font-face{font-family:"Audit Preview ${family}";src:url("${sourceUrl.href}")${format ? ` format("${format}")` : ""};font-weight:${weight};font-style:${style};font-display:swap;}`;
  }).join("");
}

function KitCard({ icon, label, accent, children }: { icon: string; label: string; accent: string; children: ReactNode }): ReactNode {
  return <section style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:1rem 1.1rem;display:flex;flex-direction:column;gap:var(--space-3)")}>
    <div style={css("display:flex;align-items:center;gap:var(--space-2)")}>
      <span style={css("width:1.7rem;height:1.7rem;border-radius:0.55rem;display:grid;place-items:center;background:color-mix(in srgb," + accent + " 12%,var(--surface-alt));color:" + accent)}><Icon name={icon} size={15} /></span>
      <span style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.05em;color:var(--fg-muted)")}>{label}</span>
    </div>
    {children}
  </section>;
}
function VisualEvidenceLoading({ label, accent }: { label: string; accent: string }): ReactNode {
  return <div style={css("display:flex;align-items:center;gap:0.55rem;min-height:2rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>
    <span className="pt-spin" aria-hidden="true" style={css("--accent:" + accent)} />
    <span>{label}</span>
  </div>;
}
function Chips({ items, accent, muted }: { items: string[]; accent: string; muted?: boolean }): ReactNode {
  if (!items.length) return <span style={css("font-size:var(--text-xs);color:var(--fg-faint)")}>Not specified in intake</span>;
  return <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem")}>{items.map(item => <span key={item} style={css("font-size:var(--text-2xs);font-weight:500;padding:0.28rem 0.6rem;border-radius:999px;border:1px solid " + (muted ? "var(--border-soft)" : "color-mix(in srgb," + accent + " 30%,var(--border-soft))") + ";background:" + (muted ? "var(--surface-alt)" : "color-mix(in srgb," + accent + " 8%,var(--surface))") + ";color:" + (muted ? "var(--fg-muted)" : accent))}>{item}</span>)}</div>;
}

function BrandKitReport({ docs, result, accent, mobile }: { docs: Ans; result: AiStageResult; accent: string; mobile: boolean }): ReactNode {
  const brand = asText(docs.name) || asText(docs.nickname) || "This brand";
  const websiteUrl = asText(docs.url);
  const emptyVisual: BrandVisualEvidence = { status: "unverified", sourceUrl: null, colors: [], displayFont: null, bodyFont: null, logoUrl: null };
  const [visual, setVisual] = useState<BrandVisualEvidence>(result.brandVisuals || emptyVisual);
  const [visualLoading, setVisualLoading] = useState(Boolean(websiteUrl && (!result.brandVisuals || !result.brandVisuals.fontFaces?.length)));
  useEffect(() => {
    if (result.brandVisuals?.status === "verified" && (!websiteUrl || result.brandVisuals.fontFaces?.length)) {
      setVisual(result.brandVisuals);
      setVisualLoading(false);
      return;
    }
    setVisual(result.brandVisuals || emptyVisual);
    if (!websiteUrl) {
      setVisualLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setVisualLoading(true);
    fetch(`/api/brand/visuals?url=${encodeURIComponent(websiteUrl)}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(payload => { if (active && payload?.result?.status) setVisual(payload.result); })
      .catch(() => undefined)
      .finally(() => { if (active) setVisualLoading(false); });
    return () => {
      active = false;
      controller.abort();
    };
  }, [result.brandVisuals, websiteUrl]);
  const palette = visual.colors;
  const previewFontCss = auditPreviewFontCss(visual);
  const displayPreviewFont = visual.displayFont && visual.fontFaces?.some(face => face.family.toLowerCase() === visual.displayFont?.toLowerCase())
    ? `Audit Preview ${visual.displayFont}`
    : null;
  const bodyPreviewFont = visual.bodyFont && visual.fontFaces?.some(face => face.family.toLowerCase() === visual.bodyFont?.toLowerCase())
    ? `Audit Preview ${visual.bodyFont}`
    : null;
  const voice = asList(docs.voice);
  const feel = asList(docs.visualFeel);
  const touchpoints = asList(docs.touchpoints);
  const phrases = asList(docs.phrases);
  const typeCount = new Set([visual.displayFont, visual.bodyFont].filter(Boolean)).size;
  const heroStats: [string, number][] = [["Palette", palette.length], ["Typefaces", typeCount], ["Voice traits", voice.length], ["Touchpoints", touchpoints.length]];
  const twoCol = css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "1fr 1fr") + ";gap:0.9rem");
  const facts: [string, string][] = [
    ["Purpose", asText(docs.purpose)],
    ["Audience", asText(docs.audience)],
    ["Differentiator", asText(docs.difference)],
    ["Promise", asText(docs.promise)],
  ];
  return <div style={css("display:flex;flex-direction:column;gap:var(--space-4)")}>
    {previewFontCss && <style>{previewFontCss}</style>}
    {/* Audit header */}
    <section style={css("border:1px solid color-mix(in srgb," + accent + " 22%,var(--border-soft) 78%);border-radius:1rem;background:color-mix(in srgb," + accent + " 5%,var(--surface) 95%);padding:1.15rem 1.2rem")}>
      {visual.logoUrl && <div style={css("display:flex;align-items:center;min-height:2.75rem;margin-bottom:0.8rem")}><img src={visual.logoUrl} alt={`${brand} logo`} style={css("display:block;max-width:min(10rem,55%);max-height:2.75rem;width:auto;height:auto;object-fit:contain;object-position:left center")} /></div>}
      <div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:" + accent)}>Brand audit · Consolidated</div>
      <h3 style={css("margin:0.25rem 0 0;font-size:var(--text-xl);font-weight:500")}>Brand kit & guidelines</h3>
      <p style={css("margin:0.4rem 0 0;font-size:var(--text-sm);line-height:1.55;color:var(--fg-muted);max-width:48rem")}>{conciseSummary(result.summary)}</p>
      <div style={css("display:grid;grid-template-columns:repeat(" + (mobile ? "2" : "4") + ",minmax(0,1fr));gap:0.55rem;margin-top:1rem")}>{heroStats.map(([label, value]) => <div key={label} style={css("border:1px solid var(--border-soft);border-radius:0.8rem;background:var(--surface);padding:0.65rem 0.75rem")}>
        <div style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{label}</div>
        <div style={css("min-height:1.45rem;display:flex;align-items:center;font-size:var(--text-2xl);font-weight:500;line-height:1.05;margin-top:0.15rem;color:" + (value ? accent : "var(--fg-faint)") + ";font-variant-numeric:tabular-nums")}>{visualLoading && !value && (label === "Palette" || label === "Typefaces") ? <span className="pt-spin" aria-label={`Loading ${label.toLowerCase()}`} style={css("--accent:" + accent)} /> : value || "—"}</div>
      </div>)}</div>
    </section>

    {/* Colour palette */}
    <KitCard icon="palette" label="Colour palette" accent={accent}>
      {palette.length ? <><div style={css("display:grid;grid-template-columns:repeat(" + (mobile ? "3" : Math.min(5, palette.length)) + ",minmax(0,1fr));gap:.85rem .65rem")}>{palette.map(sw => <div key={sw.role} title={sw.evidence} style={css("min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center")}>
        <div style={css("width:min(4.25rem,100%);aspect-ratio:1;border-radius:50%;background:" + sw.hex + ";border:1px solid color-mix(in srgb," + readable(sw.hex) + " 18%,var(--border-soft));box-shadow:0 4px 12px color-mix(in srgb,var(--fg) 8%,transparent)")} />
        <span style={css("margin-top:.45rem;font-size:var(--text-2xs);font-weight:500;color:var(--fg)")}>{sw.role}</span>
        <span className="pt-badge" style={css("margin-top:.12rem;font-size:var(--text-label);color:var(--fg-muted);text-transform:uppercase;letter-spacing:.02em")}>{sw.hex}</span>
      </div>)}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>Observed from computed live-site styles · {visual.sourceUrl || asText(docs.url)}</div></> : <div style={css("border:1px dashed var(--border);border-radius:.75rem;padding:.8rem")}>{visualLoading ? <VisualEvidenceLoading label="Reading colours from the live website…" accent={accent} /> : <span style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>Unverified — regenerate this report with a public website or supplied brand guidelines. No colours were invented.</span>}</div>}
    </KitCard>

    <div style={twoCol}>
      {/* Typography */}
      <KitCard icon="type" label="Typography" accent={accent}>
        {visual.displayFont || visual.bodyFont ? <div style={css("display:flex;flex-direction:column;gap:0.6rem")}>
          <div style={css("padding:0.7rem 0.85rem;border:1px solid var(--border-soft);border-radius:0.7rem;background:var(--surface-alt)")}>
            <div style={css("font-family:'" + (displayPreviewFont || bodyPreviewFont || "inherit") + "',sans-serif;font-size:var(--text-4xl);line-height:1;color:var(--fg)")}>Aa</div>
            <div style={css("margin-top:0.35rem;font-size:var(--text-2xs)")}><strong style={css("font-weight:500")}>{visual.displayFont || visual.bodyFont}</strong> <span style={css("color:var(--fg-faint)")}>· Display & headlines</span></div>
          </div>
          <div style={css("padding:0.7rem 0.85rem;border:1px solid var(--border-soft);border-radius:0.7rem;background:var(--surface-alt)")}>
            <div style={css("font-family:'" + (bodyPreviewFont || displayPreviewFont || "inherit") + "',sans-serif;font-size:var(--text-lg);line-height:1.4;color:var(--fg)")}>The quick brown fox jumps.</div>
            <div style={css("margin-top:0.35rem;font-size:var(--text-2xs)")}><strong style={css("font-weight:500")}>{visual.bodyFont || visual.displayFont}</strong> <span style={css("color:var(--fg-faint)")}>· Body & UI</span></div>
          </div>
        </div> : <div style={css("border:1px dashed var(--border);border-radius:.75rem;padding:.8rem")}>{visualLoading ? <VisualEvidenceLoading label="Loading the website’s font files…" accent={accent} /> : <span style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>Unverified — no live or supplied typography evidence was available. No typeface was seeded.</span>}</div>}
      </KitCard>

      {/* Logo & lockup */}
      <KitCard icon="grid" label="Logo & lockup" accent={accent}>
        {visual.logoUrl ? <div style={css("min-height:6.4rem;border:1px solid var(--border-soft);border-radius:.75rem;background:var(--surface-alt);display:grid;place-items:center;padding:var(--space-4)")}><img src={visual.logoUrl} alt={`${brand} logo observed on the website`} style={css("display:block;max-width:min(15rem,80%);max-height:4rem;width:auto;height:auto")} /></div> : <div style={css("border:1px dashed var(--border);border-radius:.75rem;padding:.8rem")}>{visualLoading ? <VisualEvidenceLoading label="Finding the website logo…" accent={accent} /> : <span style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>Unverified — no usable logo file was observed or supplied. No substitute monogram was generated.</span>}</div>}
        {!visualLoading && <div style={css("font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>{visual.logoUrl ? `Observed on ${visual.sourceUrl || asText(docs.url)}. Clear-space and minimum-size rules still require supplied guidelines.` : "Upload the approved logo suite to document lockups, clear space, and minimum-size rules."}</div>}
      </KitCard>
    </div>

    {/* Positioning & messaging */}
    <KitCard icon="target" label="Positioning & messaging" accent={accent}>
      <p style={css("margin:-0.15rem 0 0;font-size:var(--text-xs);line-height:1.5;color:var(--fg-muted)")}>The strategic foundation guiding how the brand is understood, chosen, and remembered.</p>
      <div style={css("display:flex;flex-direction:column;gap:0.55rem")}>{facts.map(([k, v]) => <div key={k} style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "8.5rem minmax(0,1fr)") + ";gap:" + (mobile ? "0.3rem" : "0.85rem") + ";align-items:start;padding:0.7rem 0.8rem;border:1px solid var(--border-soft);border-radius:0.7rem;background:var(--surface-alt)")}>
        <div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:" + accent)}>{k}</div>
        <div><div style={css("margin-bottom:0.22rem;font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-faint)")}>Summary</div><div style={css("font-size:var(--text-xs);line-height:1.5;color:var(--fg)")}>{v || <span style={css("color:var(--fg-faint)")}>To confirm with client</span>}</div></div>
      </div>)}</div>
      {phrases.length > 0 && <div>
        <div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--fg-muted);margin-bottom:0.35rem")}>Signature language</div>
        <Chips items={phrases} accent={accent} />
      </div>}
    </KitCard>

    <div style={twoCol}>
      {/* Voice & tone */}
      <KitCard icon="msg" label="Voice & tone" accent={accent}>
        <Chips items={voice} accent={accent} />
        {asText(docs.avoid) && <div style={css("font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted);padding-top:0.15rem")}><strong style={css("font-weight:600;color:var(--danger)")}>Avoid:</strong> {asText(docs.avoid)}</div>}
      </KitCard>
      {/* Imagery direction */}
      <KitCard icon="eye" label="Imagery & visual feel" accent={accent}>
        <Chips items={feel} accent={accent} />
        {touchpoints.length > 0 && <div style={css("font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>Must hold up across {touchpoints.join(", ").toLowerCase()}.</div>}
      </KitCard>
    </div>

  </div>;
}

const COPY = {
  brand: {
    railTitle: "Brand audit pipeline",
    reportTitle: "Brand kit & guidelines",
    reportPrompt: "Create a verified brand kit from the intake, client notes, and live website evidence.",
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
  return <div style={css("position:absolute;inset:1.5rem -2.5rem -1.4rem 1.5rem;border:1px solid var(--border-soft);border-radius:12px 0 0;background:var(--surface);box-shadow:0 24px 60px -30px rgba(60,40,30,.5);padding:1.2rem 1.4rem;overflow:hidden") }><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--cocoon)")}>{type === "brand" ? "Brand kit preview" : "SEO report preview"}</div><div style={css("font-size:var(--text-xl);font-weight:500;margin-top:0.25rem")}>{type === "brand" ? "A usable brand system" : "A prioritized search plan"}</div><div style={css("display:flex;flex-direction:column;gap:0.65rem;margin-top:1rem")}>{items.map((item, index) => <div key={item} style={css("display:flex;align-items:center;gap:0.65rem;padding:0.68rem 0.75rem;border:1px solid var(--border-soft);border-radius:0.8rem;background:var(--surface-alt)")}><span style={css("width:1.6rem;height:1.6rem;border-radius:50%;display:grid;place-items:center;background:var(--success-soft);color:var(--success);font-size:var(--text-2xs);font-weight:500")}>{index + 1}</span><span style={css("font-size:var(--text-sm);font-weight:500")}>{item}</span></div>)}</div></div>;
}

function PdfBar({ onDownload }: { onDownload: () => void }): ReactNode {
  return <div style={css("display:flex;justify-content:flex-end")}>
    <button type="button" onClick={onDownload} className="pt-softbtn" style={css("min-height:2.5rem;display:inline-flex;align-items:center;justify-content:center;gap:0.48rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0 1.05rem;font-size:var(--text-sm);font-weight:500;cursor:pointer;font-family:inherit")}><Icon name="print" size={16} /> <span>Print / save PDF</span></button>
  </div>;
}

function BrandActionPlan({ result, accent, mobile, onDownload }: { result: AiStageResult; accent: string; mobile: boolean; onDownload: () => void }): ReactNode {
  const prioritySections = result.sections.filter(section => /priority/i.test(section.heading));
  const roadmap = (prioritySections.length ? prioritySections : result.sections.filter(section => !/starting point|overview|summary/i.test(section.heading))).slice(0, 4);
  const direction = result.sections.find(section => /starting point|direction|preserve|foundation|overview/i.test(section.heading)) || result.sections[0];
  const actions = result.recommendations.slice(0, 3);
  const metrics = [
    { value: roadmap.length || result.sections.length, label: "Priority areas" },
    { value: actions.length, label: "Next actions" },
  ];

  return <div style={css("display:flex;flex-direction:column;gap:var(--space-4)") }>
    <section style={css("border:1px solid color-mix(in srgb," + accent + " 22%,var(--border-soft) 78%);border-radius:1rem;background:color-mix(in srgb," + accent + " 5%,var(--surface) 95%);padding:1.15rem 1.2rem") }>
      <div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:" + accent)}>Brand audit · Action plan</div>
      <h3 style={css("margin:0.25rem 0 0;font-size:var(--text-xl);font-weight:500")}>Priority action plan</h3>
      <p style={css("margin:0.4rem 0 0;font-size:var(--text-sm);line-height:1.55;color:var(--fg-muted);max-width:46rem")}>{compactText(result.summary, 30, 200)}</p>
      <div style={css("display:flex;align-items:center;gap:0.85rem;flex-wrap:wrap;margin-top:0.9rem;padding:0.72rem 0.8rem;border:1px solid var(--border-soft);border-radius:0.9rem;background:var(--surface)") }>
        <div style={css("display:flex;align-items:center;gap:" + (mobile ? "1rem" : "1.4rem") + ";flex:1 1 auto") }>
          {metrics.map(item => <div key={item.label} style={css("display:flex;align-items:baseline;gap:0.38rem;min-width:0")}>
            <strong style={css("font-size:var(--text-xl);line-height:1;font-weight:600;color:" + accent)}>{item.value}</strong>
            <span style={css("font-size:var(--text-2xs);line-height:1.3;color:var(--fg-muted)")}>{item.label}</span>
          </div>)}
        </div>
        <span style={css("display:inline-flex;align-items:center;gap:0.38rem;min-height:1.9rem;padding:0 0.7rem;border-radius:999px;background:var(--success-soft);color:var(--success);font-size:var(--text-2xs);font-weight:500;white-space:nowrap") }><Icon name="checkmark" size={12} />Evidence approved</span>
      </div>
    </section>

    {direction && <section style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:1rem 1.1rem") }>
      <div style={css("display:flex;align-items:center;gap:0.55rem")}><span style={css("width:1.7rem;height:1.7rem;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb," + accent + " 12%,var(--surface-alt));color:" + accent)}><Icon name="target" size={14} /></span><div><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:" + accent)}>Direction to preserve</div><h4 style={css("margin:0.1rem 0 0;font-size:var(--text-lg);font-weight:500")}>{cleanPriorityTitle(direction.heading)}</h4></div></div>
      <p style={css("margin:0.65rem 0 0;font-size:var(--text-xs);line-height:1.5;color:var(--fg-muted)")}>{compactText(direction.body, 24, 165)}</p>
      {direction.bullets.length > 0 && <div style={css("display:flex;flex-wrap:wrap;gap:0.45rem;margin-top:0.7rem")}>{direction.bullets.slice(0, 3).map(bullet => <span key={bullet} style={css("padding:0.38rem 0.65rem;border-radius:999px;background:var(--surface-alt);border:1px solid var(--border-soft);font-size:var(--text-2xs);color:var(--fg)")}>{compactText(bullet, 12, 90)}</span>)}</div>}
    </section>}

    {roadmap.length > 0 && <section style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:1rem 1.1rem") }>
      <div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:" + accent)}>Priority roadmap</div>
      <h4 style={css("margin:0.2rem 0 0;font-size:var(--text-lg);font-weight:500")}>What to focus on next</h4>
      <div style={css("display:flex;flex-direction:column;gap:0.7rem;margin-top:0.8rem") }>{roadmap.map(section => <article key={section.heading} style={css("padding:0.9rem;border:1px solid var(--border-soft);border-radius:0.85rem;background:var(--surface-alt)")}>
        <h5 style={css("margin:0;font-size:var(--text-sm);font-weight:500;line-height:1.35")}>{cleanPriorityTitle(section.heading)}</h5>
        <p style={css("margin:0.32rem 0 0;font-size:var(--text-2xs);line-height:1.45;color:var(--fg-muted)")}>{compactText(section.body, 22, 145)}</p>
        {section.bullets.length > 0 && <div style={css("display:flex;flex-direction:column;gap:0.3rem;margin-top:0.65rem")}>{section.bullets.slice(0, 2).map(bullet => <div key={bullet} style={css("display:grid;grid-template-columns:0.4rem minmax(0,1fr);gap:0.4rem;align-items:start;font-size:var(--text-2xs);line-height:1.4;color:var(--fg)")}><span style={css("width:0.32rem;height:0.32rem;border-radius:50%;background:" + accent + ";margin-top:0.32rem")} /><span>{compactText(bullet, 14, 100)}</span></div>)}</div>}
      </article>)}</div>
    </section>}

    {actions.length > 0 && <section style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:1rem 1.1rem") }>
      <div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:" + accent)}>Next actions</div>
      <h4 style={css("margin:0.2rem 0 0;font-size:var(--text-lg);font-weight:500")}>Ready to assign</h4>
      <div style={css("display:flex;flex-direction:column;gap:var(--space-2);margin-top:0.75rem")}>{actions.map((item, index) => <article key={`${item.title}-${index}`} style={css("display:grid;grid-template-columns:1.7rem minmax(0,1fr);gap:0.65rem;align-items:start;padding:0.72rem 0.8rem;border:1px solid var(--border-soft);border-radius:0.8rem;background:var(--surface-alt)")}><span style={css("width:1.55rem;height:1.55rem;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb," + accent + " 14%,var(--surface));color:" + accent)}><Icon name="arrowup" size={13} /></span><div><div style={css("font-size:var(--text-xs);font-weight:600")}>{compactText(item.title, 10, 74)}</div><div style={css("font-size:var(--text-2xs);line-height:1.45;color:var(--fg-muted);margin-top:0.18rem")}>{compactText(item.action, 18, 125)}</div></div></article>)}</div>
    </section>}

    <PdfBar onDownload={onDownload} />
  </div>;
}

function renderStage(type: StrategyAuditType, ctx: StageRenderCtx): ReactNode {
  const result = isAiStageResult(ctx.aiResult) ? ctx.aiResult : null;
  const title = ctx.stageKey === "plan" ? "Priority action plan" : COPY[type].reportTitle;
  if (!result) return <div style={css("padding:var(--space-4);color:var(--fg-muted);font-size:var(--text-sm)")}>Generate this stage to review the complete {type === "brand" ? "brand system" : "SEO findings"}.</div>;
  if (type === "brand" && ctx.stageKey !== "plan") return <div style={css("display:flex;flex-direction:column;gap:var(--space-4)")}><BrandKitReport docs={ctx.docs} result={result} accent={ctx.accent} mobile={ctx.mobile} /><PdfBar onDownload={ctx.onDownload} /></div>;
  if (type === "brand") return <BrandActionPlan result={result} accent={ctx.accent} mobile={ctx.mobile} onDownload={ctx.onDownload} />;
  return <div style={css("display:flex;flex-direction:column;gap:var(--space-4)") }>
    <PdfBar onDownload={ctx.onDownload} />
    <section style={css("border:1px solid color-mix(in srgb," + ctx.accent + " 22%,var(--border-soft) 78%);border-radius:1rem;background:color-mix(in srgb," + ctx.accent + " 5%,var(--surface) 95%);padding:1.15rem 1.2rem") }><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:" + ctx.accent)}>SEO audit</div><h3 style={css("margin:0.25rem 0 0;font-size:var(--text-xl);font-weight:500")}>{title}</h3><p style={css("margin:0.4rem 0 0;font-size:var(--text-sm);line-height:1.55;color:var(--fg-muted)")}>{result.summary}</p></section>
    {result.sections.map(section => <section key={section.heading} style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:1rem 1.1rem") }><h4 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>{section.heading}</h4><p style={css("margin:0.38rem 0 0;font-size:var(--text-xs);line-height:1.55;color:var(--fg-muted)")}>{section.body}</p><ul style={css("margin:0.65rem 0 0;padding-left:1.1rem;display:flex;flex-direction:column;gap:0.35rem")}>{section.bullets.map(bullet => <li key={bullet} style={css("font-size:var(--text-xs);line-height:1.5;color:var(--fg)")}>{bullet}</li>)}</ul></section>)}
    {result.recommendations.length > 0 && <section style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:1rem 1.1rem") }><h4 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Improvement insights</h4><div style={css("display:flex;flex-direction:column;gap:0.6rem;margin-top:0.75rem")}>{result.recommendations.map(item => <article key={item.title} style={css("padding:0.7rem;border:1px solid var(--border-soft);border-radius:0.8rem;background:var(--surface-alt)")}><div style={css("font-size:var(--text-sm);font-weight:500")}>{item.title}</div><div style={css("font-size:var(--text-2xs);line-height:1.45;color:var(--fg-muted);margin-top:0.2rem")}>{item.rationale}</div><div style={css("font-size:var(--text-2xs);line-height:1.45;margin-top:0.25rem")}><strong style={css("font-weight:500;color:" + ctx.accent)}>Action: </strong>{item.action}</div></article>)}</div></section>}
  </div>;
}

function renderProposal(type: StrategyAuditType, ctx: ProposalRenderCtx): ReactNode {
  const report = isAiStageResult(ctx.aiResults.report) ? ctx.aiResults.report : null;
  return <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.4rem 1.5rem") }><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:" + ctx.accent)}>Audit complete</div><h2 style={css("margin:0.3rem 0 0;font-size:var(--text-2xl);font-weight:500")}>{type === "brand" ? "Brand kit, guidelines, and action plan ready" : "SEO report and action plan ready"}</h2><p style={css("margin:0.45rem 0 0;font-size:var(--text-sm);line-height:1.55;color:var(--fg-muted)")}>{report?.summary || "The approved audit stages are ready to share."}</p><div style={css("display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:1rem") }><button type="button" onClick={ctx.onBack} className="pt-softbtn" style={css("height:2.4rem;padding:0 1rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);font-size:var(--text-xs);cursor:pointer")}>Review action plan</button><button type="button" onClick={ctx.onShare} className="pt-op" style={css("height:2.4rem;padding:0 1.1rem;border:none;border-radius:999px;background:" + ctx.accent + ";color:#fff;font-size:var(--text-xs);font-weight:500;cursor:pointer")}>Share with client</button></div></section>;
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
