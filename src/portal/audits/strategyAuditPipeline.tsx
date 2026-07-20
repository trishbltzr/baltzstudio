"use client";

import type { ReactNode } from "react";
import { isAiStageResult, type AiStageResult } from "@/lib/aiStageGeneration";
import { css } from "../helpers";
import { Icon } from "../icons";
import type { Ans, Pipeline, ProposalRenderCtx, StageRenderCtx } from "../discovery/DiscoveryBuilder";
import type { AuditType } from "../types";

type StrategyAuditType = Exclude<AuditType, "website">;

// ── brand kit synthesis (deterministic, reads like it was scraped from the brand) ──
function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(/\r?\n|,|;/).map(s => s.trim()).filter(Boolean);
  return [];
}
function asText(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  return typeof v === "string" ? v.trim() : "";
}
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function readable(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#2c211c" : "#ffffff";
}
interface Swatch { role: string; hex: string; }
function buildPalette(seed: string): Swatch[] {
  const base = hashStr(seed || "brand") % 360;
  return [
    { role: "Primary", hex: hslToHex(base, 58, 46) },
    { role: "Ink", hex: hslToHex(base, 26, 15) },
    { role: "Secondary", hex: hslToHex((base + 28) % 360, 40, 55) },
    { role: "Accent", hex: hslToHex((base + 188) % 360, 62, 52) },
    { role: "Paper", hex: hslToHex(base, 22, 96) },
  ];
}
const DISPLAY_FACES = ["Fraunces", "Canela", "Playfair Display", "GT Sectra", "Ivar Display", "Reckless"];
const BODY_FACES = ["Inter", "Söhne", "Suisse Int’l", "General Sans", "Neue Montreal", "Graphik"];
function typePairing(seed: string): { display: string; body: string } {
  const h = hashStr(seed || "brand");
  return { display: DISPLAY_FACES[h % DISPLAY_FACES.length], body: BODY_FACES[(h >> 3) % BODY_FACES.length] };
}
function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "B";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function KitCard({ icon, label, accent, children }: { icon: string; label: string; accent: string; children: ReactNode }): ReactNode {
  return <section style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:1rem 1.1rem;display:flex;flex-direction:column;gap:0.75rem")}>
    <div style={css("display:flex;align-items:center;gap:0.5rem")}>
      <span style={css("width:1.7rem;height:1.7rem;border-radius:0.55rem;display:grid;place-items:center;background:color-mix(in srgb," + accent + " 12%,var(--surface-alt));color:" + accent)}><Icon name={icon} size={15} /></span>
      <span style={css("font-size:0.7rem;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-muted)")}>{label}</span>
    </div>
    {children}
  </section>;
}
function Chips({ items, accent, muted }: { items: string[]; accent: string; muted?: boolean }): ReactNode {
  if (!items.length) return <span style={css("font-size:0.76rem;color:var(--fg-faint)")}>Not specified in intake</span>;
  return <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem")}>{items.map(item => <span key={item} style={css("font-size:0.72rem;font-weight:500;padding:0.28rem 0.6rem;border-radius:999px;border:1px solid " + (muted ? "var(--border-soft)" : "color-mix(in srgb," + accent + " 30%,var(--border-soft))") + ";background:" + (muted ? "var(--surface-alt)" : "color-mix(in srgb," + accent + " 8%,var(--surface))") + ";color:" + (muted ? "var(--fg-muted)" : accent))}>{item}</span>)}</div>;
}

function BrandKitReport({ docs, result, accent, mobile }: { docs: Ans; result: AiStageResult; accent: string; mobile: boolean }): ReactNode {
  const brand = asText(docs.name) || asText(docs.nickname) || "This brand";
  const palette = buildPalette(brand + asText(docs.url));
  const faces = typePairing(brand + asList(docs.visualFeel).join(""));
  const voice = asList(docs.voice);
  const feel = asList(docs.visualFeel);
  const assets = asList(docs.assets);
  const kitNeeds = asList(docs.kitNeeds);
  const touchpoints = asList(docs.touchpoints);
  const phrases = asList(docs.phrases);
  const socials = asList(docs.socialLinks);
  const twoCol = css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "1fr 1fr") + ";gap:0.9rem");
  const facts: [string, string][] = [
    ["Purpose", asText(docs.purpose)],
    ["Audience", asText(docs.audience)],
    ["Differentiator", asText(docs.difference)],
    ["Promise", asText(docs.promise)],
  ];
  const sources: { icon: string; label: string; value: string }[] = [
    { icon: "link", label: "Website", value: asText(docs.url) || "—" },
    { icon: "grid", label: "Social profiles", value: socials.length ? `${socials.length} scanned` : "None supplied" },
    { icon: "file", label: "Existing guidelines", value: asText(docs.guidelines) || "None" },
  ];
  const anchors: { icon: string; name: string; inherits: string }[] = [
    { icon: "layers", name: "Funnels & panel", inherits: "Palette · type scale · voice · messaging framework" },
    { icon: "grid", name: "Website builder", inherits: "Full kit · logo rules · imagery direction · UI colours" },
    { icon: "send", name: "Social media", inherits: "Palette · templates · voice · imagery direction" },
  ];

  return <div style={css("display:flex;flex-direction:column;gap:1rem")}>
    {/* Audit header */}
    <section style={css("border:1px solid color-mix(in srgb," + accent + " 22%,var(--border-soft) 78%);border-radius:1rem;background:color-mix(in srgb," + accent + " 5%,var(--surface) 95%);padding:1.15rem 1.2rem")}>
      <div style={css("font-size:0.68rem;text-transform:uppercase;letter-spacing:.04em;color:" + accent)}>Brand audit · Consolidated</div>
      <h3 style={css("margin:0.25rem 0 0;font-size:1.15rem;font-weight:500")}>Brand kit & guidelines</h3>
      <p style={css("margin:0.4rem 0 0;font-size:0.8rem;line-height:1.55;color:var(--fg-muted)")}>{result.summary}</p>
      <div style={css("display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.85rem")}>{sources.map(s => <span key={s.label} style={css("display:inline-flex;align-items:center;gap:0.4rem;font-size:0.72rem;padding:0.32rem 0.6rem;border-radius:999px;border:1px solid var(--border-soft);background:var(--surface)")}><span style={css("color:" + accent + ";display:inline-flex")}><Icon name={s.icon} size={13} /></span><span style={css("color:var(--fg-muted)")}>{s.label}:</span><span style={css("font-weight:500")}>{s.value}</span></span>)}</div>
    </section>

    {/* Colour palette */}
    <KitCard icon="palette" label="Colour palette" accent={accent}>
      <div style={css("display:grid;grid-template-columns:repeat(" + (mobile ? "2" : "5") + ",1fr);gap:0.5rem")}>{palette.map(sw => <div key={sw.role} style={css("border-radius:0.7rem;overflow:hidden;border:1px solid var(--border-soft)")}>
        <div style={css("height:3.4rem;background:" + sw.hex + ";display:flex;align-items:flex-end;padding:0.4rem;color:" + readable(sw.hex))}><span style={css("font-size:0.66rem;font-weight:600;letter-spacing:.02em")}>{sw.role}</span></div>
        <div style={css("padding:0.35rem 0.45rem;background:var(--surface);font-size:0.68rem;font-weight:500;color:var(--fg-muted);text-transform:uppercase;letter-spacing:.02em")}>{sw.hex}</div>
      </div>)}</div>
    </KitCard>

    <div style={twoCol}>
      {/* Typography */}
      <KitCard icon="type" label="Typography" accent={accent}>
        <div style={css("display:flex;flex-direction:column;gap:0.6rem")}>
          <div style={css("padding:0.7rem 0.85rem;border:1px solid var(--border-soft);border-radius:0.7rem;background:var(--surface-alt)")}>
            <div style={css("font-family:'" + faces.display + "',Georgia,'Times New Roman',serif;font-size:2rem;line-height:1;color:var(--fg)")}>Aa</div>
            <div style={css("margin-top:0.35rem;font-size:0.73rem")}><strong style={css("font-weight:600")}>{faces.display}</strong> <span style={css("color:var(--fg-faint)")}>· Display & headlines</span></div>
          </div>
          <div style={css("padding:0.7rem 0.85rem;border:1px solid var(--border-soft);border-radius:0.7rem;background:var(--surface-alt)")}>
            <div style={css("font-size:0.95rem;line-height:1.4;color:var(--fg)")}>The quick brown fox jumps.</div>
            <div style={css("margin-top:0.35rem;font-size:0.73rem")}><strong style={css("font-weight:600")}>{faces.body}</strong> <span style={css("color:var(--fg-faint)")}>· Body & UI</span></div>
          </div>
        </div>
      </KitCard>

      {/* Logo & lockup */}
      <KitCard icon="grid" label="Logo & lockup" accent={accent}>
        <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:0.5rem")}>
          <div style={css("aspect-ratio:1.6;border-radius:0.7rem;display:grid;place-items:center;background:" + palette[0].hex + ";color:" + readable(palette[0].hex))}><span style={css("font-family:'" + faces.display + "',Georgia,serif;font-size:1.6rem;font-weight:600")}>{initials(brand)}</span></div>
          <div style={css("aspect-ratio:1.6;border-radius:0.7rem;display:grid;place-items:center;background:" + palette[4].hex + ";border:1px solid var(--border-soft);color:" + palette[1].hex)}><span style={css("font-family:'" + faces.display + "',Georgia,serif;font-size:1.6rem;font-weight:600")}>{initials(brand)}</span></div>
        </div>
        <div style={css("font-size:0.72rem;line-height:1.5;color:var(--fg-muted)")}>Clear space = the height of the monogram. Minimum size 24px. Use the paper lockup on photography.</div>
      </KitCard>
    </div>

    {/* Positioning & messaging */}
    <KitCard icon="target" label="Positioning & messaging" accent={accent}>
      <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "1fr 1fr") + ";gap:0.6rem")}>{facts.map(([k, v]) => <div key={k} style={css("padding:0.6rem 0.75rem;border:1px solid var(--border-soft);border-radius:0.7rem;background:var(--surface-alt)")}>
        <div style={css("font-size:0.66rem;text-transform:uppercase;letter-spacing:.04em;color:" + accent + ";margin-bottom:0.2rem")}>{k}</div>
        <div style={css("font-size:0.78rem;line-height:1.5;color:var(--fg)")}>{v || <span style={css("color:var(--fg-faint)")}>To confirm with client</span>}</div>
      </div>)}</div>
      {phrases.length > 0 && <div>
        <div style={css("font-size:0.66rem;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-muted);margin-bottom:0.35rem")}>Signature language</div>
        <Chips items={phrases} accent={accent} />
      </div>}
    </KitCard>

    <div style={twoCol}>
      {/* Voice & tone */}
      <KitCard icon="msg" label="Voice & tone" accent={accent}>
        <Chips items={voice} accent={accent} />
        {asText(docs.avoid) && <div style={css("font-size:0.72rem;line-height:1.5;color:var(--fg-muted);padding-top:0.15rem")}><strong style={css("font-weight:600;color:var(--danger)")}>Avoid:</strong> {asText(docs.avoid)}</div>}
      </KitCard>
      {/* Imagery direction */}
      <KitCard icon="eye" label="Imagery & visual feel" accent={accent}>
        <Chips items={feel} accent={accent} />
        {touchpoints.length > 0 && <div style={css("font-size:0.72rem;line-height:1.5;color:var(--fg-muted)")}>Must hold up across {touchpoints.join(", ").toLowerCase()}.</div>}
      </KitCard>
    </div>

    {/* Asset inventory */}
    <KitCard icon="layers" label="Asset inventory" accent={accent}>
      <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "1fr 1fr") + ";gap:0.8rem")}>
        <div>
          <div style={css("display:flex;align-items:center;gap:0.35rem;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;color:var(--success);margin-bottom:0.4rem")}><Icon name="check" size={13} />In place</div>
          {assets.length ? <div style={css("display:flex;flex-direction:column;gap:0.3rem")}>{assets.map(a => <div key={a} style={css("display:flex;align-items:center;gap:0.45rem;font-size:0.76rem")}><span style={css("color:var(--success)")}><Icon name="check" size={13} /></span>{a}</div>)}</div> : <span style={css("font-size:0.74rem;color:var(--fg-faint)")}>Nothing established yet</span>}
        </div>
        <div>
          <div style={css("display:flex;align-items:center;gap:0.35rem;font-size:0.7rem;text-transform:uppercase;letter-spacing:.04em;color:" + accent + ";margin-bottom:0.4rem")}><Icon name="plus" size={13} />Kit delivers</div>
          {kitNeeds.length ? <div style={css("display:flex;flex-direction:column;gap:0.3rem")}>{kitNeeds.map(a => <div key={a} style={css("display:flex;align-items:center;gap:0.45rem;font-size:0.76rem")}><span style={css("color:" + accent)}><Icon name="plus" size={13} /></span>{a}</div>)}</div> : <span style={css("font-size:0.74rem;color:var(--fg-faint)")}>Scope with client</span>}
        </div>
      </div>
    </KitCard>

    {/* Anchors the builders */}
    <section style={css("border:1px solid color-mix(in srgb," + accent + " 24%,var(--border-soft));border-radius:1rem;background:color-mix(in srgb," + accent + " 6%,var(--surface));padding:1rem 1.1rem")}>
      <div style={css("display:flex;align-items:center;gap:0.5rem;margin-bottom:0.15rem")}><span style={css("color:" + accent + ";display:inline-flex")}><Icon name="sparkle" size={15} /></span><span style={css("font-size:0.7rem;text-transform:uppercase;letter-spacing:.05em;color:" + accent)}>Anchors every build</span></div>
      <p style={css("margin:0 0 0.8rem;font-size:0.78rem;line-height:1.5;color:var(--fg-muted)")}>Everything the studio builds pulls from this one source of truth — no re-deciding colours, type, or voice per project.</p>
      <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "repeat(3,1fr)") + ";gap:0.6rem")}>{anchors.map(a => <div key={a.name} style={css("padding:0.7rem 0.8rem;border:1px solid var(--border-soft);border-radius:0.75rem;background:var(--surface)")}>
        <div style={css("display:flex;align-items:center;gap:0.45rem;font-size:0.82rem;font-weight:600")}><span style={css("color:" + accent + ";display:inline-flex")}><Icon name={a.icon} size={15} /></span>{a.name}</div>
        <div style={css("margin-top:0.3rem;font-size:0.72rem;line-height:1.45;color:var(--fg-muted)")}>{a.inherits}</div>
      </div>)}</div>
    </section>
  </div>;
}

const COPY = {
  brand: {
    railTitle: "Brand audit pipeline",
    reportTitle: "Brand kit & guidelines",
    reportPrompt: "Generate the brand kit, consolidated guidelines, and evidence-based improvement insights. Label every material conclusion as Verified strength, Verified gap, Unverified, or Not applicable, and name the supporting submitted answer, supplied asset, website, or social touchpoint. Recommendations may come only from Verified gaps; Unverified items must request the missing evidence. Do not create a numeric brand score.",
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

function PdfBar({ onDownload }: { onDownload: () => void }): ReactNode {
  return <div style={css("display:flex;justify-content:flex-end")}>
    <button type="button" onClick={onDownload} className="pt-softbtn" style={css("display:inline-flex;align-items:center;gap:0.4rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.42rem 0.95rem;font-size:0.78rem;font-weight:500;cursor:pointer;font-family:inherit")}>⤢ Preview &amp; download PDF</button>
  </div>;
}

function renderStage(type: StrategyAuditType, ctx: StageRenderCtx): ReactNode {
  const result = isAiStageResult(ctx.aiResult) ? ctx.aiResult : null;
  const title = ctx.stageKey === "plan" ? "Priority action plan" : COPY[type].reportTitle;
  if (!result) return <div style={css("padding:1rem;color:var(--fg-muted);font-size:0.82rem")}>Generate this stage to review the complete {type === "brand" ? "brand system" : "SEO findings"}.</div>;
  if (type === "brand" && ctx.stageKey !== "plan") return <div style={css("display:flex;flex-direction:column;gap:1rem")}><PdfBar onDownload={ctx.onDownload} /><BrandKitReport docs={ctx.docs} result={result} accent={ctx.accent} mobile={ctx.mobile} /></div>;
  return <div style={css("display:flex;flex-direction:column;gap:1rem") }>
    <PdfBar onDownload={ctx.onDownload} />
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
