"use client";

import type { ReactNode } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import type { Ans, Pipeline, StageRenderCtx, ProposalRenderCtx } from "./DiscoveryBuilder";

// ── docs model (ported from Funnel Builder fbDocs) ─────────────────────────────
const cap = (s: string) => { s = (s || "").trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };

const PAGE_ORDER = ["Opt-in / landing", "VSL page", "Sales page", "Application form", "Booking / calendar", "Checkout", "Order bump", "Upsell (OTO)", "Downsell", "Thank-you"];
const PAGE_ICON: Record<string, string> = { "Opt-in / landing": "inbox", "VSL page": "eye", "Sales page": "file", "Application form": "checklist", "Booking / calendar": "history", "Checkout": "wallet", "Order bump": "plus", "Upsell (OTO)": "chart", "Downsell": "chev", "Thank-you": "check" };
const PAGE_STAGE: Record<string, { label: string; title: string; tag: string }> = {
  "Opt-in / landing": { label: "OPT-IN PAGE", title: "Capture the email", tag: "visitor → lead" },
  "VSL page": { label: "VSL PAGE", title: "Show the pitch", tag: "watched" },
  "Sales page": { label: "SALES PAGE", title: "Make the offer", tag: "considering" },
  "Application form": { label: "APPLICATION", title: "Qualify the lead", tag: "qualified" },
  "Booking / calendar": { label: "BOOKING / CALL", title: "Show a booking calendar", tag: "high intent" },
  "Checkout": { label: "CHECKOUT", title: "Take the payment", tag: "purchased" },
  "Thank-you": { label: "THANK-YOU", title: "Confirm & deliver", tag: "converted" },
};
const NEED_FOLDER: Record<string, string> = { "Logo & brand kit": "01 · Brand kit", "Product photos": "02 · Photography", "Headshots / team": "03 · Headshots", "Video (VSL)": "04 · Video", "Testimonials": "05 · Testimonials", "Lead magnet file": "06 · Lead magnet", "Legal / policy pages": "07 · Legal" };

export interface FunnelDocs {
  name: string; objective: string; ftype: string;
  flow: { label: string; icon: string; step: string }[];
  funnelRows: { num: number; label: string; title: string; tag: string; goal: boolean; width: number; bg: string }[];
  blueprint: any;
  wire: any[];
  folders: { label: string }[];
  plan: { phase: string; title: string; owner: string; tasks: string[] }[];
  launch: { label: string; value: string }[];
  brief: { label: string; value: string }[];
  recommendations: { area: string; text: string }[];
  proposal: { pages: number; emails: number; days: number; invest: string; deliverables: { label: string; desc: string; icon: string }[] };
}

export function buildFunnelDocs(data: Ans): FunnelDocs {
  const d = data || {};
  const g = <T,>(k: string, def: T): T => { const v = d[k]; return (v === undefined || v === "" || (Array.isArray(v) && !v.length)) ? def : (v as T); };
  const name = g<string>("name", "Your funnel"), objective = g<string>("objective", "generate leads"), ftype = g<string>("ftype", "Lead magnet → nurture");
  const action = g<string>("action", "take the next step"), offer = g<string>("offer", "your offer"), persona = g<string>("persona", "your ideal customer");
  const problem = g<string>("problem", ""), price = g<string>("price", ""), proof = g<string[]>("proof", []);
  const traffic = g<string[]>("traffic", []), awareness = g<string>("awareness", ""), pagesSel = g<string[]>("pages", []), emails = g<string>("emails", "None");
  const brand = g<string>("brand", "Use existing Brand System"), need = g<string[]>("need", []);
  const platform = g<string>("platform", "Webflow"), domain = g<string>("domain", ""), email = g<string>("email", "Not set up yet"), payment = g<string>("payment", "None (lead gen)"), tracking = g<string[]>("tracking", []);

  const copy = {
    headline: problem ? cap(problem) + " — without the guesswork." : "The simplest way to " + action.toLowerCase() + ".",
    subhead: "For " + persona.toLowerCase() + ". " + cap(offer) + ".",
    cta: cap(action),
    values: [
      { h: "No overwhelm", b: "One clear path from first click to " + objective.toLowerCase() + "." },
      { h: "Built for you", b: offer !== "your offer" ? cap(offer) : "Shaped around your goal, not a template." },
      { h: "Proven", b: proof.length ? "Backed by " + proof[0].toLowerCase() + "." : "A path that’s worked before." },
    ],
    offerBlock: { h: "Here’s the offer", b: cap(offer) + (price && price !== "Free (lead gen)" ? "  ·  " + price : "") },
  };

  const flowPages = (pagesSel.length ? pagesSel : ["Opt-in / landing", "Thank-you"]).slice().sort((a, b) => PAGE_ORDER.indexOf(a) - PAGE_ORDER.indexOf(b));
  const flow = flowPages.map((p, i) => ({ label: p, icon: PAGE_ICON[p] || "file", step: "Step " + (i + 1) }));
  const hasEmail = emails && emails !== "None";

  const wire = [
    { label: "Nav", bars: [30, 14] },
    { label: "Hero", bars: [70, 50], accent: true, text: copy.headline, cta: copy.cta },
    { label: "Social proof", bars: [90] },
    { label: "Value props (3)", cols: 3 },
    { label: "Testimonial", bars: [80, 60] },
    { label: copy.offerBlock.h, bars: [55, 40], accent: true },
    { label: "FAQ", bars: [85, 70, 60] },
    { label: "Final CTA", bars: [45], accent: true, cta: copy.cta },
  ];

  const folders = [{ label: "00 · Copy & content" }, ...need.map(n => ({ label: NEED_FOLDER[n] || n })), { label: String(need.length + 1).padStart(2, "0") + " · Exports" }];
  const plan = [
    { phase: "01", title: "Design & wireframe", owner: "Dev", tasks: ["Skeleton wireframe", "High-fidelity design", "Client design review"] },
    { phase: "02", title: "Build", owner: "Dev", tasks: ["Build pages in " + platform, "Wire forms, " + payment + " & email", "Connect " + (tracking.length ? tracking.join(", ") : "tracking")] },
    { phase: "03", title: "Launch", owner: "Dev", tasks: ["QA every funnel step", "Publish to " + (domain || "domain"), "Handoff & training"] },
  ];
  const brief = [
    { label: "Funnel", value: name }, { label: "Objective", value: cap(objective) }, { label: "Type", value: ftype },
    { label: "Primary action", value: cap(action) }, { label: "Audience", value: cap(persona) },
    { label: "Traffic", value: traffic.length ? traffic.join(", ") : "—" },
    { label: "Pages", value: flowPages.join("  →  ") },
    { label: "Email", value: hasEmail ? emails : "None" },
    { label: "Platform", value: platform + (domain ? "  ·  " + domain : "") },
    { label: "Payments", value: payment }, { label: "Tracking", value: tracking.length ? tracking.join(", ") : "—" },
  ];

  // funnel diagram rows
  const coreOrder = ["Opt-in / landing", "VSL page", "Sales page", "Application form", "Booking / calendar", "Checkout", "Thank-you"];
  let corePages = flowPages.filter(p => coreOrder.includes(p)); if (!corePages.length) corePages = ["Opt-in / landing"];
  const trafficLabel = traffic.length ? traffic.slice(0, 2).join(", ") : "Meta ads, Email list";
  const awMap: Record<string, string> = { "Unaware": "cold audience", "Problem-aware": "cold audience", "Solution-aware": "warm audience", "Product-aware": "warm audience", "Most aware": "hot audience" };
  const funnel: { label: string; title: string; tag: string; goal?: boolean }[] = [{ label: "TRAFFIC", title: trafficLabel, tag: awMap[awareness] || "cold audience" }];
  corePages.forEach(p => { const st = PAGE_STAGE[p]; if (st) { funnel.push({ label: st.label, title: st.title, tag: st.tag }); if (p === "Opt-in / landing" && hasEmail) funnel.push({ label: "LEAD MAGNET + NURTURE", title: "Deliver value, warm them up", tag: "subscribed" }); } });
  const goalTitle = (action && action.toLowerCase() !== "take the next step") ? cap(action) : "Booked strategy call";
  funnel.push({ label: "GOAL", title: goalTitle, tag: "", goal: true });
  const fnN = funnel.length;
  const funnelRows = funnel.map((row, i) => {
    const t = fnN > 1 ? i / (fnN - 1) : 0;
    const width = Math.round(100 - t * 48);
    const L = (0.80 - t * 0.17).toFixed(3);
    const bg = row.goal ? "oklch(0.46 0.11 155)" : "oklch(" + L + " 0.10 20)";
    return { num: i + 1, label: row.label, title: row.title, tag: row.tag, goal: !!row.goal, width, bg };
  });

  // blueprint (drives copy + wireframe + brief final design)
  const featurePool = [
    { h: "Fast to launch", b: "Live in days, not months." },
    { h: "Conversion-first layout", b: "Every section earns the next scroll." },
    { h: "Mobile-perfect", b: "Sharp on every screen size." },
    { h: "Built-in tracking", b: (tracking.length ? tracking.slice(0, 2).join(" & ") : "Analytics") + " wired from day one." },
    { h: "On-brand design", b: (brand === "Studio to create" ? "A fresh brand system, designed for you." : "Matched to your existing brand.") },
    { h: "One clear CTA", b: "No dead ends — a single next step throughout." },
  ];
  const toolList = [platform];
  if (email && email !== "Not set up yet") toolList.push(email);
  if (payment && payment !== "None (lead gen)") toolList.push(payment);
  tracking.slice(0, 3).forEach(t => toolList.push(t));
  const payHead = (price && price !== "Free (lead gen)") ? price : "Free";
  const plans = [
    { name: "Starter", price: (price === "Free (lead gen)" || !price) ? "Free" : "$0", highlight: false, cta: cap(action), lines: 3 },
    { name: "Pro", price: (price && price !== "Free (lead gen)") ? price : "$30/mo", highlight: true, cta: cap(action), lines: 4 },
  ];
  const blueprint = {
    nav: { brand: name, links: ["Benefits", "Features", "Pricing", "FAQ"], cta: (cap(action).length <= 16 ? cap(action) : "Get started") },
    hero: { title: copy.headline, subhead: copy.subhead, cta: cap(action) },
    benefits: { heading: "What you get", items: copy.values },
    forwho: { heading: "For who?", items: [
      { h: "Just getting started", b: "New to this and wants a clear first step." },
      { h: (cap(persona) !== "Your ideal customer" ? cap(persona) : "Ready to commit"), b: "Knows the problem, wants to " + objective.toLowerCase() + " now." },
      { h: "Comparing options", b: "Weighing you against the alternatives." },
    ] },
    features: { heading: "Features you’ll love", items: featurePool.slice(0, 6) },
    testimonials: { heading: "Testimonials", quote: "“" + (problem ? "Finally, " + problem.toLowerCase() + " — sorted." : "Exactly what we needed — simple, and it converts.") + "”", author: "A happy customer", metric: (proof.includes("Testimonials") || proof.includes("Case studies")) ? "Backed by real results" : "5.0 average rating" },
    tools: { heading: "Tools & Integrations", items: toolList },
    pricing: { heading: "Pricing", plans },
    faq: { heading: "FAQ", items: [
      { q: "How does it work?", a: "A guided " + ftype.toLowerCase() + " from first click to " + objective.toLowerCase() + "." },
      { q: "Who is this for?", a: cap(persona) + "." },
      { q: "How much does it cost?", a: payHead === "Free" ? "Getting started is free." : "Plans from " + payHead + "." },
      { q: "What if it’s not for me?", a: proof.includes("Money-back guarantee") ? "You’re covered by a money-back guarantee." : "No lock-in — leave any time." },
      { q: "How do I get started?", a: "Hit “" + cap(action) + "” and you’re in." },
    ] },
    footer: { brand: name, tagline: "© " + name + " — " + cap(objective) + "." },
  };

  const rawL = data || {};
  const trkL = Array.isArray(rawL.tracking) ? (rawL.tracking as string[]) : (rawL.tracking ? [rawL.tracking as string] : []);
  const launch = [
    { label: "Build platform", value: platform || "To confirm" },
    { label: "Domain", value: domain || "To confirm" },
    { label: "Email / CRM", value: (email && email !== "Not set up yet") ? email : "To set up" },
    { label: "Payments", value: (payment && payment !== "None (lead gen)") ? payment : "Not required" },
    { label: "Tracking", value: trkL.length ? trkL.join(", ") : "GA + Meta Pixel (recommended)" },
  ];

  const pageCount = flow.length;
  const emailCount = hasEmail ? (String(emails).match(/\d+/) ? parseInt(String(emails).match(/\d+/)![0], 10) : 3) : 0;
  const days = Math.max(3, Math.round(pageCount * 1.2 + emailCount * 0.4 + 2));
  const invest = "£" + (1800 + pageCount * 350 + emailCount * 120).toLocaleString("en-GB");
  const deliverables = [
    { label: "Conversion copy", desc: "Headline, subhead, CTA and social proof for every page", icon: "file" },
    { label: "Wireframe & design", desc: "High-fidelity layout across " + pageCount + " " + (pageCount === 1 ? "page" : "pages"), icon: "grid" },
    { label: "Funnel flow", desc: flow.map(f => f.label).join(" → "), icon: "funnel" },
    { label: "Build & integrations", desc: "Pages, forms" + (hasEmail ? ", " + emailCount + "-email sequence" : "") + ", tracking & QA", icon: "checklist" },
    { label: "Launch & handoff", desc: "Published live, tested end-to-end, with training", icon: "flag" },
  ];

  // Strategic recommendations drafted from the discovery answers — so the plan
  // says what we'd *do*, not just what exists.
  const coldAudience = awareness === "Unaware" || awareness === "Problem-aware" || !awareness;
  const recommendations = [
    { area: "Conversion focus", text: "Keep one primary action — “" + cap(action) + "” — repeated on every page and strip out competing links so the path stays singular." },
    { area: "Messaging angle", text: coldAudience
      ? "This audience is still " + (awareness ? awareness.toLowerCase() : "cold") + ", so open with the problem and build belief before the pitch — lead with “" + copy.headline + "”."
      : "This audience already knows the solution, so lead with your differentiation and proof rather than the basics." },
    { area: "Risk reversal", text: proof.includes("Money-back guarantee")
      ? "Surface your money-back guarantee right beside every CTA — it’s the strongest objection-crusher you have."
      : "Add a visible risk reversal (guarantee, free trial or “cancel anytime”) next to the primary CTA to lower hesitation at the decision point." },
    { area: "Follow-up", text: hasEmail
      ? "Good call on “" + emails + "” — map a " + (emailCount || 3) + "-email nurture that re-sells the offer and answers the top objection so you recover non-converters."
      : "Add at least a welcome + short nurture sequence; most visitors won’t convert on the first touch and email is how you win them back." },
    { area: "Traffic match", text: (traffic.length ? "For " + traffic.slice(0, 2).join(" & ") + ", match " : "Match ") + "each landing page’s headline to the ad/source angle so message-to-market fit stays tight and quality score stays high." },
    { area: "Measurement", text: tracking.length
      ? "Wire " + tracking.slice(0, 3).join(", ") + " before launch and set the primary conversion event on “" + cap(action) + "” so every optimisation is data-led."
      : "Set up analytics + a conversion pixel before launch and define one primary conversion event on “" + cap(action) + "” — you can’t improve what you don’t measure." },
  ];

  return { name, objective, ftype, flow, funnelRows, blueprint, wire, folders, plan, launch, brief, recommendations, proposal: { pages: pageCount, emails: emailCount, days, invest, deliverables } };
}

// ── renderers ──────────────────────────────────────────────────────────────────
const ACCENT = "var(--accent)";
const sec = (reveal: number, n: number) => reveal >= n;

// Compact funnel summary for picker cards. Keep this intentionally light; the
// full preview owns the visual plan details.
export function FunnelFlowHero({
  direction,
  goal,
  build,
  readyCount,
}: {
  direction: string;
  goal: string;
  build: string;
  readyCount: number;
}) {
  return (
      <div style={css("border:1px solid color-mix(in srgb,var(--accent) 12%,var(--border-soft) 88%);border-radius:0.82rem;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 6%,var(--surface) 94%),var(--surface));padding:0.68rem 0.72rem")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)")}>
        <div style={css("display:flex;align-items:center;gap:0.45rem;min-width:0")}><span style={css("width:1.4rem;height:1.4rem;border-radius:0.46rem;background:color-mix(in srgb,var(--accent) 12%,white 88%);color:" + ACCENT + ";display:grid;place-items:center;flex-shrink:0")}><Icon name="funnel" size={12} /></span><span style={css("font-size:0.74rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>Build direction</span></div>
        <span style={css("font-size:0.6rem;font-weight:500;color:var(--success);background:var(--success-soft);padding:0.13rem 0.44rem;border-radius:999px;white-space:nowrap")}>{readyCount} ready</span>
      </div>
      <div style={css("display:flex;flex-direction:column;gap:0.38rem;margin-top:0.62rem")}>
        {[
          ["Funnel", direction || "Funnel", "var(--fg)"],
          ["Goal", goal || "Convert more visitors", "var(--accent)"],
          ["Stage", build || "Not started", "var(--fg-muted)"],
        ].map(([label, value, color]) => (
          <div key={label} style={css("display:grid;grid-template-columns:4.2rem minmax(0,1fr);align-items:center;gap:0.55rem;min-width:0;border:1px solid color-mix(in srgb,var(--border-soft) 82%,white 18%);border-radius:999px;background:color-mix(in srgb,white 68%,var(--surface-alt) 32%);padding:0.42rem 0.56rem")}>
            <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{label}</div>
            <div style={css("font-size:var(--text-xs);line-height:1.15;font-weight:500;color:" + color + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right")}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WireframeDoc({ bp }: { bp: any }) {
  const navCta = (bp.nav.cta && bp.nav.cta.length <= 16) ? bp.nav.cta : "Get started";
  return (
    <div style={css("width:100%;border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--surface)")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;padding:0.85rem 1.5rem;border-bottom:1px solid var(--border-soft)")}>
        <div style={css("display:flex;align-items:center;gap:0.55rem")}><div style={css("width:1.5rem;height:1.5rem;border-radius:7px;background:var(--fg)")} /><span style={css("font-size:var(--text-md);font-weight:500")}>{bp.nav.brand}</span></div>
        <div style={css("display:flex;gap:1.1rem;align-items:center")}>{bp.nav.links.map((l: string) => <span key={l} style={css("font-size:0.8rem;color:var(--fg-muted)")}>{l}</span>)}</div>
        <span style={css("background:" + ACCENT + ";color:#fff;font-size:0.78rem;font-weight:500;padding:0.42rem 0.95rem;border-radius:999px;flex-shrink:0;white-space:nowrap")}>{navCta}</span>
      </div>
      <div style={css("padding:2.1rem 1.5rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:0.65rem;border-bottom:1px solid var(--border-soft)")}>
        <div style={css("font-size:1.55rem;font-weight:500;max-width:36rem;line-height:1.22")}>{bp.hero.title}</div>
        <div style={css("font-size:0.96rem;color:var(--fg-muted);max-width:32rem;line-height:1.5")}>{bp.hero.subhead}</div>
        <span style={css("margin-top:0.45rem;background:" + ACCENT + ";color:#fff;font-size:0.9rem;font-weight:500;padding:0.62rem 1.6rem;border-radius:999px")}>{bp.hero.cta}</span>
        <div style={css("margin-top:1rem;width:100%;max-width:40rem;height:10rem;border-radius:12px;background:linear-gradient(135deg,var(--accent),oklch(0.72 0.14 32));display:grid;place-items:center;color:rgba(255,255,255,0.9);font-size:var(--text-base);font-weight:500")}>Product demo / hero visual</div>
      </div>
      <div style={css("padding:1.7rem 1.5rem;text-align:center;border-bottom:1px solid var(--border-soft)")}>
        <div style={css("font-size:1.15rem;font-weight:500")}>{bp.benefits.heading}</div>
        <div style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:1.1rem;margin-top:1.15rem")}>
          {bp.benefits.items.map((v: any) => <div key={v.h} style={css("display:flex;flex-direction:column;gap:var(--space-2);text-align:left")}><div style={css("width:100%;height:3.5rem;border-radius:8px;background:linear-gradient(135deg,var(--accent),oklch(0.74 0.13 32))")} /><div style={css("font-size:0.9rem;font-weight:500")}>{v.h}</div><div style={css("font-size:0.78rem;color:var(--fg-muted);line-height:1.45")}>{v.b}</div></div>)}
        </div>
      </div>
      <div style={css("padding:1.7rem 1.5rem;text-align:center;border-bottom:1px solid var(--border-soft)")}>
        <div style={css("font-size:1.15rem;font-weight:500")}>{bp.forwho.heading}</div>
        <div style={css("display:flex;justify-content:center;gap:0.9rem;margin-top:1.15rem")}>
          {bp.forwho.items.map((v: any) => <div key={v.h} style={css("flex:1;border:1px solid var(--border-soft);border-radius:8px;padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-2);align-items:center;text-align:center")}><div style={css("width:2.2rem;height:2.2rem;border-radius:50%;background:" + ACCENT)} /><div style={css("font-size:0.86rem;font-weight:500")}>{v.h}</div><div style={css("font-size:0.76rem;color:var(--fg-muted);line-height:1.4")}>{v.b}</div></div>)}
        </div>
      </div>
      <div style={css("padding:1.7rem 1.5rem;border-bottom:1px solid var(--border-soft)")}>
        <div style={css("font-size:1.15rem;font-weight:500;text-align:center")}>{bp.testimonials.heading}</div>
        <div style={css("margin:1.15rem auto 0;max-width:42rem;background:linear-gradient(135deg,var(--accent),oklch(0.74 0.13 32));border-radius:12px;padding:1.4rem;display:flex;gap:1.1rem;align-items:center")}>
          <div style={css("width:3.6rem;height:3.6rem;border-radius:50%;background:rgba(255,255,255,0.85);flex-shrink:0")} />
          <div style={css("flex:1;text-align:left")}><div style={css("font-size:1rem;color:#fff;line-height:1.45")}>{bp.testimonials.quote}</div><div style={css("font-size:0.78rem;color:rgba(255,255,255,0.85);margin-top:0.5rem")}>{bp.testimonials.author} · {bp.testimonials.metric}</div></div>
        </div>
      </div>
      <div style={css("padding:1.7rem 1.5rem;text-align:center")}>
        <div style={css("font-size:1.15rem;font-weight:500")}>{bp.pricing.heading}</div>
        <div style={css("display:flex;gap:0.9rem;margin:1.15rem auto 0;max-width:32rem")}>
          {bp.pricing.plans.map((p: any) => (
            <div key={p.name} style={css("flex:1;min-width:0;border:1px solid " + (p.highlight ? ACCENT : "var(--border)") + ";border-radius:var(--radius);padding:0.9rem 1rem;background:" + (p.highlight ? "color-mix(in srgb,var(--accent) 12%,white 88%)" : "var(--surface)") + ";text-align:left")}>
              <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + (p.highlight ? ACCENT : "var(--fg-muted)"))}>{p.name}</div>
              <div style={css("font-size:var(--text-3xl);font-weight:500;line-height:1.1;margin-top:0.15rem")}>{p.price}</div>
              <span style={css("margin-top:0.7rem;display:block;text-align:center;border-radius:var(--radius-pill);padding:0.42rem 0;font-size:0.78rem;font-weight:500;" + (p.highlight ? "background:var(--accent);color:#fff" : "background:var(--surface-alt);color:var(--fg)"))}>{p.cta}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderStage(ctx: StageRenderCtx): ReactNode {
  const { stageKey, docs, reveal } = ctx;
  const d = docs as FunnelDocs;
  const bp = d.blueprint;

  if (stageKey === "flow") {
    const rows = reveal === Number.POSITIVE_INFINITY ? d.funnelRows : d.funnelRows.slice(0, reveal);
    return (
      <div style={css("display:flex;flex-direction:column;gap:0.4rem;padding:0.4rem 0")}>
        {rows.map((row, i) => (
          <div key={row.num}>
            {i > 0 && <div style={css("text-align:center;color:var(--fg-faint);font-size:0.7rem;line-height:1;margin-bottom:0.4rem")}>▼</div>}
            <div style={css("width:" + row.width + "%;margin:0 auto;border-radius:12px;padding:0.85rem 1.2rem;background:" + row.bg + ";color:#fff;display:flex;align-items:center;justify-content:" + (row.goal ? "center" : "space-between") + ";gap:var(--space-4);box-sizing:border-box;animation:cocoonFade .38s ease both")}>
              <div style={css("min-width:0" + (row.goal ? ";text-align:center" : ""))}>
                <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:rgba(255,255,255,0.82)")}>{row.num} · {row.label}</div>
                <div style={css("font-size:var(--text-lg);font-weight:500;margin-top:0.12rem;overflow-wrap:anywhere")}>{row.title}</div>
              </div>
              {row.tag && !row.goal && <div style={css("font-size:0.78rem;color:rgba(255,255,255,0.85);text-align:right;max-width:48%;line-height:1.35")}>{row.tag}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (stageKey === "copy") {
    const row = (n: number, num: string, label: string, body: ReactNode) => sec(reveal, n) && (
      <div style={css("display:grid;grid-template-columns:6rem 1fr;gap:1.4rem;padding:1.25rem 0;border-top:1px solid var(--border-soft)")}>
        <div><div style={css("font-size:0.78rem;font-weight:500;color:" + ACCENT)}>{num}</div><div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-top:0.2rem")}>{label}</div></div>
        <div>{body}</div>
      </div>
    );
    const list = (items: any[]) => <div style={css("display:flex;flex-direction:column;gap:0.6rem")}>{items.map((v: any) => <div key={v.h} style={css("font-size:0.92rem;line-height:1.55;color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{v.h}</span> — {v.b}</div>)}</div>;
    return (
      <div style={css("max-width:46rem;margin:0 auto;background:var(--surface);border:1px solid var(--border-soft);border-radius:12px;padding:" + (ctx.mobile ? "1.3rem 1.4rem" : "2rem 2.4rem 2.4rem"))}>
        <div style={css("padding-bottom:0.6rem")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + "")}>Landing page copy</div>
          <div style={css("font-size:var(--text-3xl);font-weight:500;margin-top:0.3rem;line-height:1.2")}>{d.name}</div>
          <div style={css("font-size:var(--text-base);color:var(--fg-faint);margin-top:0.3rem")}>Structured on the high-converting landing page blueprint</div>
        </div>
        {sec(reveal, 1) && (
          <div style={css("display:grid;grid-template-columns:6rem 1fr;gap:1.4rem;padding:1.25rem 0;border-top:1px solid var(--border-soft)")}>
            <div><div style={css("font-size:0.78rem;font-weight:500;color:" + ACCENT)}>01</div><div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-top:0.2rem")}>Hero</div></div>
            <div>
              <div style={css("font-size:1.35rem;font-weight:500;line-height:1.3")}>{bp.hero.title}</div>
              <div style={css("font-size:var(--text-lg);color:var(--fg-muted);line-height:1.6;margin-top:0.5rem")}>{bp.hero.subhead}</div>
              <div style={css("font-size:var(--text-base);color:var(--fg-faint);margin-top:0.7rem")}>Button — <span style={css("color:" + ACCENT + ";font-weight:500")}>{bp.hero.cta}</span></div>
            </div>
          </div>
        )}
        {row(2, "02", bp.benefits.heading, list(bp.benefits.items))}
        {row(3, "03", bp.forwho.heading, list(bp.forwho.items))}
        {row(4, "04", bp.features.heading, <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:0.55rem 1.5rem")}>{bp.features.items.map((v: any) => <div key={v.h} style={css("font-size:0.9rem;line-height:1.5;color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{v.h}</span> — {v.b}</div>)}</div>)}
        {row(5, "05", bp.testimonials.heading, <div style={css("border-left:2px solid var(--accent-dim);padding-left:1rem")}><div style={css("font-size:1.05rem;line-height:1.5")}>{bp.testimonials.quote}</div><div style={css("font-size:0.8rem;color:var(--fg-faint);margin-top:0.5rem")}>{bp.testimonials.author} · {bp.testimonials.metric}</div></div>)}
        {row(6, "06", "Tools", <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem 0.55rem")}>{bp.tools.items.map((t: string) => <span key={t} style={css("font-size:var(--text-md);padding:0.22rem 0.7rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill)")}>{t}</span>)}</div>)}
        {row(7, "07", bp.pricing.heading, <div>{bp.pricing.plans.map((p: any) => <div key={p.name} style={css("display:flex;justify-content:space-between;align-items:baseline;padding:0.55rem 0;border-bottom:1px dashed var(--border-soft)")}><div style={css("font-size:0.92rem;color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{p.name}</span> · CTA: {p.cta}</div><div style={css("font-size:1.05rem;font-weight:500;white-space:nowrap")}>{p.price}</div></div>)}</div>)}
        {row(8, "08", bp.faq.heading, <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>{bp.faq.items.map((q: any) => <div key={q.q}><div style={css("font-size:0.92rem;font-weight:500")}>{q.q}</div><div style={css("font-size:var(--text-md);color:var(--fg-muted);line-height:1.55;margin-top:0.2rem")}>{q.a}</div></div>)}</div>)}
        {row(9, "09", "Footer", <div style={css("font-size:0.9rem;color:var(--fg-muted);line-height:1.55")}>{bp.footer.tagline} Follow us on social.</div>)}
      </div>
    );
  }

  if (stageKey === "wireframe") {
    return sec(reveal, 1) ? <WireframeDoc bp={bp} /> : <div style={css("padding:var(--space-8);text-align:center;color:var(--fg-faint);font-size:0.85rem")}>Drafting the wireframe…</div>;
  }

  // brief — combined one-page development plan
  return (
    <div style={css("max-width:46rem;margin:0 auto;background:var(--surface);border:1px solid var(--border-soft);border-radius:12px;padding:" + (ctx.mobile ? "1.4rem" : "1.9rem 2.2rem 2.2rem") + ";display:flex;flex-direction:column;gap:var(--space-6)")}>
      {sec(reveal, 1) && (
        <div style={{ animation: "cocoonFade .4s ease both" }}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + "")}>Development plan</div>
          <div style={css("font-size:var(--text-3xl);font-weight:500;margin-top:0.3rem;line-height:1.2")}>{d.name}</div>
          <div style={css("font-size:var(--text-base);color:var(--fg-faint);margin-top:0.3rem")}>Final design, build plan and launch checklist — everything to ship, on one page</div>
          <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(11.5rem,1fr));gap:var(--space-2);margin-top:1.1rem")}>
            {d.brief.map(b => <div key={b.label} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.6rem 0.8rem")}><div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>{b.label}</div><div style={css("font-size:0.83rem;margin-top:0.22rem;line-height:1.4")}>{b.value}</div></div>)}
          </div>
        </div>
      )}
      {sec(reveal, 1) && (d.recommendations?.length ?? 0) > 0 && (
        <div style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>Our recommendations</div>
          <div style={css("font-size:0.8rem;color:var(--fg-faint);margin-top:0.3rem")}>What we’d do with this funnel — and why — drawn from your answers.</div>
          <div style={css("display:flex;flex-direction:column;gap:0.55rem;margin-top:0.95rem")}>
            {(d.recommendations ?? []).map(r => (
              <div key={r.area} style={css("display:flex;gap:0.7rem;align-items:flex-start;padding:0.75rem 0.9rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt)")}>
                <span style={css("width:1.5rem;height:1.5rem;flex-shrink:0;border-radius:7px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT + ";display:grid;place-items:center;margin-top:0.05rem")}><Icon name="arrow" size={12} /></span>
                <div style={css("font-size:0.85rem;line-height:1.5;color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{r.area}</span> — {r.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {sec(reveal, 2) && (
        <div style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>01 · Final Design</div>
          <div style={css("margin-top:0.85rem")}><WireframeDoc bp={bp} /></div>
        </div>
      )}
      {sec(reveal, 3) && (
        <div style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>02 · Build</div>
          <div style={css("display:flex;flex-direction:column;gap:var(--space-2);margin-top:0.85rem")}>
            {d.plan.map(p => <div key={p.phase} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.7rem 0.9rem;display:flex;align-items:center;gap:var(--space-2)")}><span style={css("font-size:0.64rem;font-weight:500;padding:0.12rem 0.45rem;border-radius:999px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT + ";flex-shrink:0")}>{p.phase}</span><span style={css("flex:1;font-size:0.85rem;font-weight:500")}>{p.title}</span><span style={css("font-size:0.68rem;color:var(--fg-faint)")}>{p.owner}</span></div>)}
          </div>
        </div>
      )}
      {sec(reveal, 4) && (
        <div style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>03 · Launch</div>
          <div style={css("font-size:var(--text-base);color:var(--fg-faint);margin-top:0.35rem")}>What we wire up to take it live.</div>
          <div style={css("display:flex;flex-direction:column;gap:0.4rem;margin-top:0.85rem")}>
            {d.launch.map(l => <div key={l.label} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.65rem 0.9rem;display:flex;align-items:center;gap:0.7rem")}><span style={css("width:0.5rem;height:0.5rem;border-radius:50%;background:" + ACCENT + ";flex-shrink:0")} /><span style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);width:9rem;flex-shrink:0")}>{l.label}</span><span style={css("flex:1;font-size:0.85rem;min-width:0;overflow-wrap:anywhere")}>{l.value}</span></div>)}
          </div>
        </div>
      )}
      {reveal === Number.POSITIVE_INFINITY && (
        <div style={css("border-top:1px solid var(--border-soft);padding-top:1.2rem;display:flex;gap:var(--space-2);flex-wrap:wrap")}>
          <button type="button" onClick={ctx.onDownload} className="pt-softbtn" style={css("border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.45rem 1rem;font-size:0.8rem;cursor:pointer;font-family:inherit")}>⤢ Preview &amp; download PDF</button>
          <button type="button" onClick={ctx.onCopy} className="pt-softbtn" style={css("border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.45rem 1rem;font-size:0.8rem;cursor:pointer;font-family:inherit")}>Copy brief</button>
          <button type="button" onClick={ctx.onShare} className="pt-op" style={css("margin-left:auto;border:none;border-radius:var(--radius-pill);background:" + ACCENT + ";color:#fff;padding:0.45rem 1.1rem;font-size:0.8rem;font-weight:500;cursor:pointer;font-family:inherit")}>↗ Share with client</button>
        </div>
      )}
    </div>
  );
}

function renderProposal(ctx: ProposalRenderCtx): ReactNode {
  const d = ctx.docs as FunnelDocs;
  const p = d.proposal;
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;animation:cocoonFade .4s ease both")}>
      <div style={css("padding:1.6rem 1.7rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
        <div onClick={ctx.onBack} style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:0.76rem;color:var(--fg-muted);cursor:pointer;margin-bottom:0.9rem")}>← Back to development plan</div>
        <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + ";margin-bottom:0.3rem")}>Overall plan</div>
        <h2 style={css("margin:0;font-size:var(--text-3xl);font-weight:500;line-height:1.18")}>Ready to build {d.name}</h2>
        <p style={css("margin:0.4rem 0 0;font-size:0.85rem;color:var(--fg-muted);line-height:1.5;max-width:36rem")}>Everything below was drafted from your discovery. Hand it to the Baltz team and we’ll design, build and launch the whole funnel for you — you just review at each milestone.</p>
        <div style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2);margin-top:1.2rem")}>
          {[[String(p.pages), "Pages"], [String(p.emails), "Emails"], ["~" + p.days, "Days to launch"]].map(([v, l]) => <div key={l} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.75rem 0.9rem;background:var(--surface-alt)")}><div style={css("font-size:1.45rem;font-weight:500;line-height:1")}>{v}</div><div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-top:0.28rem")}>{l}</div></div>)}
        </div>
      </div>
      <div style={css("padding:1.2rem 1.4rem")}>
        <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.7rem")}>What we’ll build for you</div>
        <div style={css("display:flex;flex-direction:column;border:1px solid var(--border-soft);border-radius:var(--radius);overflow:hidden")}>
          {p.deliverables.map((dv, i) => (
            <div key={dv.label} style={css("display:flex;align-items:flex-start;gap:var(--space-3);padding:0.8rem 0.95rem" + (i < p.deliverables.length - 1 ? ";border-bottom:1px solid var(--border-soft)" : ""))}>
              <span style={css("width:1.9rem;height:1.9rem;border-radius:8px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT + ";display:grid;place-items:center;flex-shrink:0")}><Icon name={dv.icon} size={16} /></span>
              <div style={css("flex:1;min-width:0")}><div style={css("font-size:0.87rem;font-weight:500;line-height:1.3")}>{dv.label}</div><div style={css("font-size:0.77rem;color:var(--fg-muted);margin-top:0.15rem;line-height:1.45")}>{dv.desc}</div></div>
              <span style={css("width:1.3rem;height:1.3rem;border-radius:50%;background:var(--success-soft);color:var(--success);display:grid;place-items:center;flex-shrink:0;margin-top:0.1rem")}><Icon name="checkmark" size={13} /></span>
            </div>
          ))}
        </div>
      </div>
      <div style={css("padding:1.15rem 1.4rem;border-top:1px solid var(--border-soft);background:var(--surface-alt);display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap")}>
        <div style={css("flex:1;min-width:9rem")}><div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>Done-for-you build</div><div style={css("font-size:var(--text-3xl);font-weight:500;line-height:1.1")}>{p.invest}</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>One-off · fixed scope from your brief</div></div>
        <div style={css("display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap")}>
          <button type="button" onClick={ctx.onShare} className="pt-softbtn" style={css("height:2.6rem;padding:0 1.2rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);font-size:var(--text-base);font-weight:500;cursor:pointer;font-family:inherit")}>↗ Share with client</button>
          <button type="button" onClick={ctx.onExit} className="pt-softbtn" style={css("height:2.6rem;padding:0 1.2rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);font-size:var(--text-base);font-weight:500;cursor:pointer;font-family:inherit")}>Save as draft</button>
          <button type="button" onClick={ctx.onRequest} className="pt-op" style={css("height:2.6rem;padding:0 1.5rem;border-radius:var(--radius-pill);border:none;background:" + ACCENT + ";color:#fff;font-size:0.85rem;font-weight:500;cursor:pointer;font-family:inherit")}>Have Baltz build this →</button>
        </div>
      </div>
    </div>
  );
}

function introPreview(): ReactNode {
  // static "development plan" document mock (mirrors the finished deliverable)
  return (
    <div style={css("position:absolute;top:1.5rem;left:1.5rem;right:-2.5rem;bottom:-1.4rem;background:#fff;border:1px solid var(--border-soft);border-radius:12px 0 0 0;box-shadow:0 24px 60px -30px rgba(60,40,30,0.5);padding:1.2rem 1.4rem;display:flex;flex-direction:column;overflow:hidden")}>
      <div style={css("display:flex;align-items:center;gap:0.65rem;padding-bottom:0.75rem")}>
        <span style={css("width:1.85rem;height:1.85rem;border-radius:7px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT + ";display:grid;place-items:center;font-weight:600;font-size:var(--text-base);flex-shrink:0")}>A</span>
        <div style={css("flex:1;min-width:0")}><div style={css("font-size:0.9rem;font-weight:600;line-height:1.2")}>Client</div><div style={css("font-size:0.68rem;color:var(--fg-muted);margin-top:0.08rem")}>Development plan · Prepared by Baltz Studio</div></div>
      </div>
      <div style={css("height:2px;background:" + ACCENT + ";border-radius:2px;margin-bottom:0.9rem")} />
      <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + ";margin-bottom:0.5rem")}>Final design</div>
      <div style={css("border:1px solid var(--border-soft);border-radius:10px;overflow:hidden")}>
        <div style={css("display:flex;align-items:center;gap:0.55rem;padding:0.45rem 0.7rem;border-bottom:1px solid var(--border-soft)")}><span style={css("width:0.8rem;height:0.8rem;border-radius:4px;background:var(--fg)")} /><span style={css("font-size:0.62rem;font-weight:600")}>Aurora</span><span style={css("flex:1")} /><span style={css("background:var(--accent);color:#fff;font-size:0.54rem;font-weight:600;padding:0.2rem 0.5rem;border-radius:999px")}>Get started</span></div>
        <div style={css("text-align:center;padding:1rem 0.9rem;border-bottom:1px solid var(--border-soft)")}><div style={css("font-size:0.86rem;font-weight:600;max-width:14rem;margin:0 auto;line-height:1.25")}>Calmer skin in two weeks, guaranteed.</div><div style={css("font-size:0.64rem;color:var(--fg-muted);margin-top:0.3rem")}>A 3-step ritual set, made simple.</div><span style={css("display:inline-block;margin-top:0.5rem;background:var(--accent);color:#fff;font-size:0.62rem;font-weight:600;padding:0.35rem 0.9rem;border-radius:999px")}>Claim my bundle</span><div style={css("margin:0.6rem auto 0;max-width:15rem;height:2.6rem;border-radius:8px;background:linear-gradient(135deg,var(--accent),oklch(0.72 0.14 32))")} /></div>
        <div style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:0.55rem;padding:var(--space-3)")}>{[0, 1, 2].map(i => <div key={i}><div style={css("width:1.3rem;height:1.3rem;border-radius:6px;background:color-mix(in srgb,var(--accent) 14%,white 86%);margin-bottom:0.3rem")} /><div style={css("height:0.38rem;border-radius:3px;background:var(--border);margin-bottom:0.22rem")} /><div style={css("height:0.38rem;width:60%;border-radius:3px;background:var(--border-soft)")} /></div>)}</div>
      </div>
      <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + ";margin:0.9rem 0 0.5rem")}>Build — phases</div>
      <div style={css("display:flex;flex-direction:column;gap:0.35rem")}>
        {["Design & wireframe", "Build", "Launch"].map((t, i) => <div key={t} style={css("display:flex;align-items:center;gap:var(--space-2);border:1px solid var(--border-soft);border-radius:8px;padding:0.45rem 0.65rem")}><span style={css("font-size:0.56rem;font-weight:700;padding:0.1rem 0.38rem;border-radius:999px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT)}>{"0" + (i + 1)}</span><span style={css("flex:1;font-size:var(--text-xs);font-weight:500")}>{t}</span><span style={css("font-size:0.6rem;color:var(--fg-faint)")}>Dev</span></div>)}
      </div>
    </div>
  );
}

export const FUNNEL_PIPELINE: Pipeline = {
  railTitle: "Build pipeline",
  buildDocs: buildFunnelDocs,
  gen: (k) => ({ total: k === "flow" ? 6 : k === "brief" ? 4 : 9, ms: k === "wireframe" ? 6000 : k === "brief" ? 3800 : 4200, buildLabel: "Building" }),
  genPrompt: (k) => "Generate the " + STAGE_LABEL[k] + " with AI, drafted from everything you shared in discovery.",
  genCta: () => "Generate with AI",
  approveLabel: (_k, isLast) => (isLast ? "Approve & view plan →" : "Approve & continue"),
  beginLabel: "Map the funnel flow →",
  beginMsg: (data) => {
    const nick = cap(String(data.nickname || "").trim());
    return nick
      ? "Perfect, " + nick + " — I have everything I need. I’ll map your funnel flow first; approve each stage to unlock the next."
      : "I have everything I need. I’ll map your funnel flow first — approve each stage to unlock the next.";
  },
  introPreview,
  renderStage,
  renderProposal,
};

const STAGE_LABEL: Record<string, string> = { flow: "funnel flow", copy: "copy", wireframe: "wireframe", brief: "development plan" };
