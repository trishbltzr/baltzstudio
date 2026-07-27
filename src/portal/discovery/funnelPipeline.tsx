"use client";

import { useState, type ReactNode } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import type { Ans, Pipeline, StageRenderCtx, ProposalRenderCtx } from "./DiscoveryBuilder";
import { isAiStageResult, isFunnelCopyResult, type FunnelCopyResult, type FunnelCopySection } from "@/lib/aiStageGeneration";
import { FUNNEL_COPY_BUDGETS } from "@/lib/copywritingAgent";
import { BuilderTaskPanel } from "../builders/BuilderTaskPanel";
import type { TaskImportDraft } from "../types";

// ── docs model (ported from Funnel Builder fbDocs) ─────────────────────────────
const cap = (s: string) => { s = (s || "").trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };

export interface UploadedLandingCopy {
  sourceName: string;
  headline: string;
  subhead: string;
  cta: string;
  sections: { label: string; heading: string; body: string; bullets: string[] }[];
}

function parseUploadedLandingCopy(value: Ans[string]): UploadedLandingCopy | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value) as UploadedLandingCopy;
    if (!parsed || typeof parsed.headline !== "string" || typeof parsed.subhead !== "string" || typeof parsed.cta !== "string" || !Array.isArray(parsed.sections)) return undefined;
    return {
      sourceName: typeof parsed.sourceName === "string" ? parsed.sourceName : "Uploaded copy",
      headline: parsed.headline,
      subhead: parsed.subhead,
      cta: parsed.cta,
      sections: parsed.sections.filter(section => section && typeof section.heading === "string" && typeof section.body === "string").map(section => ({
        label: typeof section.label === "string" ? section.label : "Section",
        heading: section.heading,
        body: section.body,
        bullets: Array.isArray(section.bullets) ? section.bullets.filter(item => typeof item === "string") : [],
      })),
    };
  } catch { return undefined; }
}

const PAGE_ORDER = ["POV / manifesto", "Content hub / home", "Resource / pillar page", "Comparison / proof", "High-intent CTA", "Newsletter / community", "Thank-you / next value"];
const PAGE_ICON: Record<string, string> = { "POV / manifesto": "eye", "Content hub / home": "inbox", "Resource / pillar page": "file", "Comparison / proof": "chart", "High-intent CTA": "checklist", "Newsletter / community": "history", "Thank-you / next value": "check" };
const PAGE_STAGE: Record<string, { label: string; title: string; tag: string }> = {
  "POV / manifesto": { label: "POINT OF VIEW", title: "Publish what you stand for", tag: "reach" },
  "Content hub / home": { label: "CONTENT HUB", title: "Lead with value", tag: "visitor → audience" },
  "Resource / pillar page": { label: "RESOURCE", title: "Give it away, ungated", tag: "engaged" },
  "Comparison / proof": { label: "PROOF", title: "Earn the ready buyer’s trust", tag: "considering" },
  "High-intent CTA": { label: "HIGH-INTENT CTA", title: "One clear action", tag: "high intent" },
  "Newsletter / community": { label: "NURTURE", title: "Stay useful over time", tag: "nurtured" },
  "Thank-you / next value": { label: "THANK-YOU", title: "Deliver & point to more", tag: "returning" },
};
const NEED_FOLDER: Record<string, string> = { "Logo & brand kit": "01 · Brand kit", "Product photos": "02 · Photography", "Headshots / team": "03 · Headshots", "POV / thesis doc": "04 · Point of view", "Video / content clips": "05 · Content", "Testimonials": "06 · Testimonials", "Ungated resources": "07 · Resources", "Legal / policy pages": "08 · Legal" };

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
  uploadedLandingCopy?: UploadedLandingCopy;
  proposal: { pages: number; emails: number; days: number; invest: string; deliverables: { label: string; desc: string; icon: string }[] };
}

export function funnelTaskDrafts(docs: FunnelDocs, clientName: string): TaskImportDraft[] {
  const sourceBase = clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "client";
  return docs.plan.flatMap((phase, phaseIndex) => phase.tasks.map((title, taskIndex) => ({
    title,
    description: `${phase.title} task from the approved ${docs.name} funnel build plan.`,
    project: clientName,
    assignee: "Studio",
    owner: "studio",
    priority: phaseIndex === 0 ? "high" : "med",
    due: "To schedule",
    milestone: phase.title,
    source: "manual",
    sourceId: `funnel-builder-${sourceBase}-${phase.phase}-${taskIndex + 1}`,
  })));
}

export function buildFunnelDocs(data: Ans): FunnelDocs {
  const d = data || {};
  const g = <T,>(k: string, def: T): T => { const v = d[k]; return (v === undefined || v === "" || (Array.isArray(v) && !v.length)) ? def : (v as T); };
  const name = g<string>("name", "Your funnel"), objective = g<string>("objective", "create qualified demand"), ftype = g<string>("ftype", "Content engine → high-intent CTA");
  const brandName = g<string>("brandName", name);
  const rewriteDepth = g<string>("rewriteDepth", "Improve");
  const pov = g<string>("pov", ""), ungated = g<string>("ungated", "");
  const action = g<string>("action", "take the next step"), offer = g<string>("offer", "your offer"), persona = g<string>("persona", "your ideal customer");
  const problem = g<string>("problem", ""), price = g<string>("price", ""), proof = g<string[]>("proof", []);
  const traffic = g<string[]>("traffic", []), awareness = g<string>("awareness", ""), pagesSel = g<string[]>("pages", []), emails = g<string>("emails", "None");
  const need = g<string[]>("need", []);
  const platform = g<string>("platform", "Webflow"), domain = g<string>("domain", ""), email = g<string>("email", "Not set up yet"), payment = g<string>("payment", "None (audience-building)"), tracking = g<string[]>("tracking", []);

  const offerName = offer.replace(/^\d+\s*(?:lb\.?|kg|oz\.?)\s*(?:bags?|packs?)?\s+of\s+/i, "").replace(/[.]$/, "");
  const isFeedOffer = /feed|poultry|livestock/i.test(`${offer} ${problem}`);
  const salesCta = isFeedOffer ? "Shop Feed" : /cart|checkout|buy|purchase|order/i.test(action) ? `Shop ${cap(offerName)}` : cap(action);
  const salesPrice = price && price !== "Free — ungated value" && !/^(under|from|starting|budget|range)/i.test(price.trim()) ? price : "Final price to approve";
  const copy = {
    headline: isFeedOffer
      ? `Feed with confidence. Choose dependable ${offerName}.`
      : `A clearer way to get ${offerName}.`,
    subhead: isFeedOffer
      ? `${cap(offer)} for backyard flocks, homesteads, and small farms.`
      : `${cap(offer)} for ${persona.toLowerCase()}, with the details and reassurance needed to make a confident decision.`,
    cta: salesCta,
    values: isFeedOffer ? [
      { h: "Know what you’re feeding", b: "See the approved Non-GMO product details in one place, so you know exactly what you’re choosing." },
      { h: "Choose the right feed", b: "Compare poultry and livestock options and find the feed that matches the animals in your care." },
      { h: "Order without the runaround", b: "Go from product details to checkout through one clear, direct order path." },
    ] : [
      { h: "See the value clearly", b: `Show exactly how ${offerName} helps the buyer move toward ${objective.toLowerCase()}.` },
      { h: "Know what to expect", b: "Put the offer, delivery details, and decision-making information in one clear place." },
      { h: "Take the next step", b: `Make “${salesCta}” the single, unmistakable action throughout the page.` },
    ],
    offerBlock: { h: "Choose the right feed for your animals", b: cap(offer) + (salesPrice !== "Final price to approve" ? "  ·  " + salesPrice : "") },
  };

  const flowPages = (pagesSel.length ? pagesSel : ["Content hub / home", "Thank-you / next value"]).slice().sort((a, b) => PAGE_ORDER.indexOf(a) - PAGE_ORDER.indexOf(b));
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
    { phase: "01", title: "Design & wireframe", owner: "Studio", tasks: ["Skeleton wireframe", "High-fidelity design", "Client design review"] },
    { phase: "02", title: "Build", owner: "Studio", tasks: ["Build pages in " + platform, "Wire forms, " + payment + " & email", "Connect " + (tracking.length ? tracking.join(", ") : "tracking")] },
    { phase: "03", title: "Launch", owner: "Studio", tasks: ["QA every funnel step", "Publish to " + (domain || "domain"), "Handoff & training"] },
  ];
  const brief = [
    { label: "Brand", value: brandName }, { label: "Funnel", value: name }, { label: "Rewrite depth", value: rewriteDepth },
    { label: "Objective", value: cap(objective) }, { label: "Journey", value: ftype },
    { label: "Point of view", value: pov || "—" },
    { label: "Ungated value", value: ungated || "—" },
    { label: "High-intent action", value: cap(action) }, { label: "Audience", value: cap(persona) },
    { label: "Distribution", value: traffic.length ? traffic.join(", ") : "—" },
    { label: "Pages", value: flowPages.join("  →  ") },
    { label: "Nurture", value: hasEmail ? emails : "None" },
    { label: "Platform", value: platform + (domain ? "  ·  " + domain : "") },
    { label: "Payments", value: payment }, { label: "Measurement", value: tracking.length ? tracking.join(", ") : "—" },
  ];

  // funnel diagram rows
  const coreOrder = ["POV / manifesto", "Content hub / home", "Resource / pillar page", "Comparison / proof", "High-intent CTA", "Newsletter / community", "Thank-you / next value"];
  let corePages = flowPages.filter(p => coreOrder.includes(p)); if (!corePages.length) corePages = ["Content hub / home"];
  const trafficLabel = traffic.length ? traffic.slice(0, 2).join(", ") : "LinkedIn, Newsletter";
  const awMap: Record<string, string> = { "Unaware": "not in-market yet", "Problem-aware": "not in-market yet", "Solution-aware": "warming audience", "Product-aware": "warming audience", "Most aware": "in-market now" };
  const funnel: { label: string; title: string; tag: string; goal?: boolean }[] = [{ label: "DISTRIBUTION", title: trafficLabel, tag: awMap[awareness] || "create demand" }];
  const hasNurturePage = corePages.includes("Newsletter / community");
  corePages.forEach(p => { const st = PAGE_STAGE[p]; if (st) { funnel.push({ label: st.label, title: st.title, tag: st.tag }); if (p === "Content hub / home" && hasEmail && !hasNurturePage) funnel.push({ label: "NURTURE", title: "Keep delivering value", tag: "engaged" }); } });
  const goalTitle = (action && action.toLowerCase() !== "take the next step") ? cap(action) : "High-intent action";
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
  const featurePool = isFeedOffer ? [
    { h: "40 lb. bag format", b: "Available in 40 lb. bags, with the size shown clearly before checkout." },
    { h: "Non-GMO feed", b: "A clearly labeled Non-GMO option for buyers who care about what goes into every bag." },
    { h: "Poultry and livestock options", b: "Feed choices organized around the animals you care for." },
    { h: "Clear product guidance", b: "Find ingredients, feeding guidance, and storage information in one place." },
    { h: "Straightforward ordering", b: `Choose “${salesCta}” whenever you’re ready to order.` },
    { h: "Fulfilment details", b: "See availability and fulfilment expectations before checkout." },
  ] : [
    { h: "The offer", b: cap(offer) },
    { h: "The right fit", b: cap(persona) },
    { h: "The promised outcome", b: cap(objective) },
    { h: "What is included", b: "List the approved deliverables, components, or product details." },
    { h: "How it is delivered", b: "State the approved delivery, fulfilment, or access details." },
    { h: "The next step", b: salesCta },
  ];
  const payHead = salesPrice;
  const plans = [
    { name: cap(offerName), price: salesPrice, highlight: true, cta: salesCta, lines: 4 },
  ];
  const blueprint = {
    nav: { brand: name, links: ["Why it works", "What you get", "Reviews", "FAQ"], cta: salesCta },
    hero: { eyebrow: isFeedOffer ? "NON-GMO FEED FOR BACKYARD FLOCKS & SMALL FARMS" : "A CLEARER WAY TO CHOOSE", title: copy.headline, subhead: copy.subhead, cta: salesCta, note: salesPrice === "Final price to approve" ? "Final price and fulfilment details confirmed before checkout" : `${salesPrice} · Fulfilment details confirmed before checkout` },
    promotions: isFeedOffer ? [
      { eyebrow: "Featured feed", heading: "Non-GMO feed for flocks, homesteads, and small farms.", body: "Compare the approved options and choose the right feed.", cta: salesCta },
      { eyebrow: "Ready to order", heading: "Choose the right feed and check out with confidence.", body: "Review the product and fulfilment details before you buy.", cta: salesCta },
    ] : [
      { eyebrow: "Featured offer", heading: `A clearer path to ${objective.toLowerCase()}.`, body: `See what is included in ${offerName} and decide with confidence.`, cta: salesCta },
      { eyebrow: "Your next step", heading: `Ready to ${action.toLowerCase()}?`, body: "Review the offer details, get your remaining questions answered, and move forward.", cta: salesCta },
    ],
    problem: { heading: isFeedOffer ? "Your animals depend on what goes into every bag." : "Choosing the right offer should not feel this complicated.", body: problem ? `${cap(problem)}. Get the clarity you need to choose with confidence.` : isFeedOffer ? "When quality, sourcing, or fit is unclear, choosing the right bag can feel like a gamble. Get straightforward details before you stock up." : `Get the offer details, proof, and reassurance you need before you commit.` },
    benefits: { heading: isFeedOffer ? "A more confident way to buy feed" : "Why buyers choose this offer", items: copy.values },
    forwho: { heading: isFeedOffer ? "For flocks, homesteads, and small farms" : "Who this is for", items: [
      { h: isFeedOffer ? "Backyard flock keepers" : "Has the problem now", b: problem ? cap(problem) : isFeedOffer ? "Wants dependable feed details without the guesswork." : `Wants to ${objective.toLowerCase()} without more delay.` },
      { h: isFeedOffer ? "Homesteads and small farms" : "Needs the details", b: isFeedOffer ? `Needs clear information about ${offerName}, availability, and fulfilment.` : `Wants to understand ${offerName}, what is included, and whether it fits.` },
      { h: isFeedOffer ? "Poultry and livestock owners" : "Is ready for a clear next step", b: isFeedOffer ? `Is ready to compare the approved options and order the right feed.` : `Needs one direct path to ${action.toLowerCase()}.` },
    ] },
    features: { heading: isFeedOffer ? "Everything you need to choose the right feed" : "What the buyer gets", items: featurePool.slice(0, 6) },
    process: { heading: isFeedOffer ? "How to order" : "How ordering works", items: [
      { h: isFeedOffer ? "Find your feed" : "Choose the right option", b: `Review the product details for ${offerName}.` },
      { h: isFeedOffer ? "Check the details" : "Order with confidence", b: isFeedOffer ? "Compare the information that matters for your animals and your routine." : `Use “${salesCta}” when the offer fits what you need.` },
      { h: isFeedOffer ? "Add to cart and check out" : "Know what happens next", b: isFeedOffer ? "Choose your option, add it to cart, and complete checkout." : "See the confirmed fulfilment, access, or delivery expectations before checkout." },
    ] },
    offer: { heading: copy.offerBlock.h, body: copy.offerBlock.b, bullets: [cap(offer), cap(persona), salesPrice] },
    testimonials: { heading: "Let customers make the claim", quote: "Add one approved customer quote that names the specific problem, product experience, and result.", author: "Verified customer name required", metric: "Source and permission required" },
    pricing: { heading: "The offer", plans },
    faq: { heading: "Questions buyers ask before they order", items: [
      { q: "What am I buying?", a: cap(offer) + "." },
      { q: "Who is this for?", a: cap(persona) + "." },
      { q: "How much does it cost?", a: payHead === "Final price to approve" ? "Confirm the final price before launch." : payHead + "." },
      { q: "What should I know before ordering?", a: "Add the approved product, delivery, support, and policy details needed to remove last-minute uncertainty." },
      { q: "How do I get started?", a: `Choose “${salesCta},” review the final details, and complete the approved checkout path.` },
    ] },
    finalCta: { heading: isFeedOffer ? "Ready to choose feed with confidence?" : `Ready to ${action.toLowerCase()}?`, body: isFeedOffer ? `Review the approved feed details, choose the right option, and complete your order.` : `Review the offer, get the remaining questions answered, and take the next step toward ${objective.toLowerCase()}.`, cta: salesCta },
    footer: { brand: name, tagline: "© " + name + " — " + cap(objective) + "." },
  };

  const rawL = data || {};
  const trkL = Array.isArray(rawL.tracking) ? (rawL.tracking as string[]) : (rawL.tracking ? [rawL.tracking as string] : []);
  const launch = [
    { label: "Build platform", value: platform || "To confirm" },
    { label: "Domain", value: domain || "To confirm" },
    { label: "Email / CRM", value: (email && email !== "Not set up yet") ? email : "To set up" },
    { label: "Payments", value: (payment && payment !== "None (audience-building)") ? payment : "Not required" },
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
    { area: "Conversion focus", text: "Keep one primary action — “" + salesCta + "” — repeated after the promise, product details, proof, offer, and final objection handling." },
    { area: "Messaging angle", text: coldAudience
      ? "This audience is still " + (awareness ? awareness.toLowerCase() : "cold") + ", so open with the problem and build belief before the pitch — lead with “" + copy.headline + "”."
      : "This audience already knows the solution, so lead with your differentiation and proof rather than the basics." },
    { area: "Purchase confidence", text: proof.includes("Money-back guarantee")
      ? "Place the approved money-back guarantee beside the purchase CTA and link to its exact terms."
      : isFeedOffer
        ? "Answer the practical buying questions beside the offer: product fit, approved ingredients or sourcing details, availability, fulfilment, and the real return or support policy. Do not imply a guarantee that was not provided."
        : "Reduce hesitation with the approved delivery, support, cancellation, or return policy. Do not add a guarantee unless the client actually offers one." },
    { area: "Follow-up", text: hasEmail
      ? "Good call on “" + emails + "” — map a " + (emailCount || 3) + "-email nurture that re-sells the offer and answers the top objection so you recover non-converters."
      : "Add at least a welcome + short nurture sequence; most visitors won’t convert on the first touch and email is how you win them back." },
    { area: "Traffic match", text: (traffic.length ? "For " + traffic.slice(0, 2).join(" & ") + ", match " : "Match ") + "each landing page’s headline to the ad/source angle so message-to-market fit stays tight and quality score stays high." },
    { area: "Measurement", text: tracking.length
      ? "Wire " + tracking.slice(0, 3).join(", ") + " before launch and set the primary conversion event on “" + cap(action) + "” so every optimisation is data-led."
      : "Set up analytics + a conversion pixel before launch and define one primary conversion event on “" + cap(action) + "” — you can’t improve what you don’t measure." },
  ];

  const uploadedLandingCopy = parseUploadedLandingCopy(d.uploadedLandingCopy);
  return { name, objective, ftype, flow, funnelRows, blueprint, wire, folders, plan, launch, brief, recommendations, uploadedLandingCopy, proposal: { pages: pageCount, emails: emailCount, days, invest, deliverables } };
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
      <div style={css("border:1px solid color-mix(in srgb,var(--accent) 12%,var(--border-soft) 88%);border-radius:0.82rem;background:color-mix(in srgb,var(--accent) 6%,var(--surface) 94%);padding:0.68rem 0.72rem")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)")}>
        <div style={css("display:flex;align-items:center;gap:0.45rem;min-width:0")}><span style={css("width:1.4rem;height:1.4rem;border-radius:0.46rem;background:color-mix(in srgb,var(--accent) 12%,white 88%);color:" + ACCENT + ";display:grid;place-items:center;flex-shrink:0")}><Icon name="funnel" size={12} /></span><span style={css("font-size:var(--text-2xs);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>Build direction</span></div>
        <span style={css("font-size:var(--text-label);font-weight:500;color:var(--success);background:var(--success-soft);padding:0.13rem 0.44rem;border-radius:999px;white-space:nowrap")}>{readyCount} ready</span>
      </div>
      <div style={css("display:flex;flex-direction:column;gap:0.38rem;margin-top:0.62rem")}>
        {[
          ["Funnel", direction || "Funnel", "var(--fg)"],
          ["Goal", goal || "Convert more visitors", "var(--accent)"],
          ["Stage", build || "Not started", "var(--fg-muted)"],
        ].map(([label, value, color]) => (
          <div key={label} style={css("display:grid;grid-template-columns:4.2rem minmax(0,1fr);align-items:center;gap:0.55rem;min-width:0;border:1px solid color-mix(in srgb,var(--border-soft) 82%,white 18%);border-radius:999px;background:color-mix(in srgb,white 68%,var(--surface-alt) 32%);padding:0.42rem 0.56rem")}>
            <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{label}</div>
            <div style={css("font-size:var(--text-xs);line-height:1.15;font-weight:500;color:" + color + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right")}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const WIREFRAME_SECTION_KEYS = ["promoTop", "hero", "stakes", "benefits", "audience", "details", "promoMid", "process", "testimonial", "offer", "price", "faq", "finalCta"] as const;
type WireframeSectionKey = typeof WIREFRAME_SECTION_KEYS[number];
type WireframeRecipe = Record<WireframeSectionKey, number>;
// Five rich, distinct landing-page design languages. One shared render honours
// the copy slots; the style config recomposes the whole page (hero treatment,
// card style, colour bands, alignment, type scale, density) — not just a swap.
type WireframeStyle = {
  label: string;
  heroKind: "split" | "editorial" | "dark" | "compact" | "airy";
  cards: "card" | "plain" | "row";
  band: boolean; dense: boolean; roomy: boolean; center: boolean; minimal: boolean;
  heroScale: string; pad: string; heroPad: string;
};
const WIREFRAME_STYLES: WireframeStyle[] = [
  { label: "Classic split",       heroKind: "split",     cards: "card",  band: false, dense: false, roomy: false, center: false, minimal: false, heroScale: "2.2rem", pad: "2.4rem 1.7rem", heroPad: "3rem 1.7rem" },
  { label: "Centered editorial",  heroKind: "editorial", cards: "plain", band: false, dense: false, roomy: false, center: true,  minimal: true,  heroScale: "3.1rem", pad: "2.6rem 1.9rem", heroPad: "3.8rem 1.9rem" },
  { label: "Bold bands",          heroKind: "dark",      cards: "card",  band: true,  dense: false, roomy: false, center: true,  minimal: false, heroScale: "2.9rem", pad: "2.2rem 1.7rem", heroPad: "3.4rem 1.7rem" },
  { label: "Compact / dense",     heroKind: "compact",   cards: "row",   band: false, dense: true,  roomy: false, center: false, minimal: true,  heroScale: "1.5rem", pad: "1.3rem 1.2rem", heroPad: "1.5rem 1.2rem" },
  { label: "Spacious & calm",     heroKind: "airy",      cards: "plain", band: false, dense: false, roomy: true,  center: true,  minimal: true,  heroScale: "2.5rem", pad: "3.8rem 2.4rem", heroPad: "5rem 2.4rem" },
];

function briefValue(docs: FunnelDocs, label: string, fallback = ""): string {
  return docs.brief.find(item => item.label === label)?.value || fallback;
}


function salesPageRecommendations(docs: FunnelDocs): FunnelDocs["recommendations"] {
  const primaryAction = briefValue(docs, "Primary action", "take the next step");
  const isFeedOffer = /feed|poultry|livestock/i.test(`${docs.name} ${primaryAction} ${docs.blueprint?.offer?.body || ""}`);
  const cta = isFeedOffer ? "Shop Feed" : cap(primaryAction);
  return (docs.recommendations || []).map(recommendation => {
    if (recommendation.area === "Conversion focus") return {
      area: recommendation.area,
      text: `Keep one primary action — “${cta}” — repeated after the promise, offer details, proof, price, and final objection handling.`,
    };
    if (recommendation.area === "Risk reversal" || recommendation.area === "Purchase confidence") return {
      area: "Purchase confidence",
      text: isFeedOffer
        ? "Answer the practical buying questions beside the offer: product fit, approved ingredients or sourcing details, availability, fulfilment, and the real return or support policy. Do not imply a guarantee that was not provided."
        : "Use only the approved delivery, support, cancellation, return, or guarantee terms to reduce hesitation at the decision point.",
    };
    return recommendation;
  });
}

const COPY_ROLE_LABEL: Record<FunnelCopySection["role"], string> = {
  hero: "Hero",
  problem: "Problem",
  benefit: "Benefit",
  solution: "Solution",
  differentiation: "Differentiation",
  proof: "Proof",
  objections: "Objections",
  faq: "FAQs",
  cta: "CTA",
};

function fitCopyText(value: string, maxWords: number): string {
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([.!?])\1+/g, "$1")
    .trim();
  if (!normalized || maxWords <= 0) return "";
  const words = normalized.split(" ");
  if (words.length <= maxWords) return normalized;
  const clipped = words.slice(0, maxWords).join(" ").replace(/[,:;.!?–—-]+$/, "");
  return `${clipped}…`;
}

function layoutFitCopySection(section: FunnelCopySection): FunnelCopySection {
  const budget = FUNNEL_COPY_BUDGETS[section.role];
  return {
    ...section,
    eyebrow: fitCopyText(section.eyebrow, 5),
    heading: fitCopyText(section.heading, budget.headingWords),
    body: fitCopyText(section.body, budget.bodyWords),
    bullets: section.bullets
      .slice(0, budget.bulletCount)
      .map(bullet => fitCopyText(bullet, budget.bulletWords)),
    cta: section.cta ? fitCopyText(section.cta, budget.ctaWords) : null,
  };
}

function CopyDraftDocument({ result, brandName, mobile }: { result: FunnelCopyResult; brandName: string; mobile: boolean }) {
  const fittedSections = result.sections.map(layoutFitCopySection);
  return (
    <article data-funnel-copy-source="ai-result" data-copy-presentation="layout-fit" style={css("max-width:58rem;margin:0 auto;display:flex;flex-direction:column;gap:var(--space-3)")}>
      <header style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "1.15rem" : "1.45rem 1.6rem"))}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap")}>
          <div>
            <div style={css("font-size:var(--text-label);letter-spacing:.08em;text-transform:uppercase;color:" + ACCENT)}>Copy draft</div>
            <h2 style={css("margin:.35rem 0 0;font-size:var(--text-2xl);line-height:1.2;font-weight:500;text-wrap:balance")}>{result.title}</h2>
          </div>
          <div style={css("display:flex;align-items:center;gap:.4rem;flex-wrap:wrap")}>
            <span style={css("border:1px solid var(--border-soft);border-radius:999px;background:var(--surface-alt);color:var(--fg-muted);padding:.3rem .7rem;font-size:var(--text-xs);font-weight:500")}>Layout-fit edit</span>
            <span style={css("border:1px solid color-mix(in srgb,var(--accent) 24%,var(--border) 76%);border-radius:999px;background:var(--accent-soft);color:var(--accent);padding:.3rem .7rem;font-size:var(--text-xs);font-weight:500")}>{result.rewriteDepth}</span>
          </div>
        </div>
        <p style={css("margin:.65rem 0 0;max-width:42rem;font-size:var(--text-sm);line-height:1.55;color:var(--fg-muted)")}>{fitCopyText(result.summary, 24)}</p>
        <div style={css("margin-top:.6rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>Prepared for {brandName} · Generated result, edited to the approved component budgets · Agent {result.agentVersion}</div>
      </header>
      <div style={css("display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))") + ";gap:var(--space-3);align-items:stretch")}>
      {fittedSections.map(section => (
        <section key={section.role} data-copy-role={section.role} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "1.05rem" : "1.2rem 1.3rem") + ";display:flex;flex-direction:column;min-height:" + (section.role === "hero" || section.role === "cta" ? "auto" : "15rem") + (section.role === "hero" || section.role === "cta" ? ";grid-column:1/-1" : ""))}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap")}>
            <span style={css("font-size:var(--text-label);letter-spacing:.08em;text-transform:uppercase;color:" + ACCENT)}>{COPY_ROLE_LABEL[section.role]}</span>
            <span style={css("font-size:var(--text-2xs);color:" + (section.sourceStatus === "needs_approval" ? "var(--warning)" : "var(--fg-faint)"))}>{section.sourceStatus === "needs_approval" ? "Needs approval" : section.sourceStatus === "sourced" ? "Source-backed" : "Positioning"}</span>
          </div>
          {section.eyebrow && <div style={css("margin-top:.65rem;font-size:var(--text-label);letter-spacing:.08em;text-transform:uppercase;color:var(--fg-faint)")}>{section.eyebrow}</div>}
          <h3 style={css("margin:.3rem 0 0;font-size:" + (section.role === "hero" ? "var(--text-3xl)" : "var(--text-xl)") + ";line-height:1.2;font-weight:500;text-wrap:balance")}>{section.heading}</h3>
          <p style={css("margin:.55rem 0 0;max-width:42rem;font-size:var(--text-base);line-height:1.55;color:var(--fg-muted)")}>{section.body}</p>
          {section.bullets.length > 0 && (
            <ul style={css("margin:.75rem 0 0;padding-left:1.15rem;display:grid;gap:.35rem")}>
              {section.bullets.map(bullet => <li key={bullet} style={css("font-size:var(--text-sm);line-height:1.5;color:var(--fg-muted)")}>{bullet}</li>)}
            </ul>
          )}
          {section.cta && <span style={css("display:inline-flex;align-self:flex-start;margin-top:auto;border-radius:999px;background:" + ACCENT + ";color:#fff;padding:.5rem .9rem;font-size:var(--text-sm);font-weight:500")}>{section.cta}</span>}
        </section>
      ))}
      </div>
    </article>
  );
}


// ── Wireframe ────────────────────────────────────────────────────────────────
// A usable, build-ready wireframe: the approved copy mapped into the page
// structure. The AI Copy stage's output is overlaid by role; the blueprint copy
// is the always-present fallback, so the wireframe is never empty placeholders.
// Layout is recipe-driven ("Shuffle layout" recomposes it) and fully responsive:
// the strategy rail sits beside each section on desktop and stacks below on
// mobile. The only page colour is the primary CTA — the one action to make obvious.
const SK_MEDIA = "color-mix(in srgb,var(--fg) 6%,var(--surface) 94%)";
const STAGE_META: Record<string, { color: string; label: string }> = {
  create: { color: "var(--warn)", label: "Create demand" },
  capture: { color: ACCENT, label: "Capture" },
  expand: { color: "var(--success)", label: "Expand" },
};
type WireStage = keyof typeof STAGE_META;

function WChip({ children }: { children: ReactNode }) {
  return <span style={css("align-self:flex-start;font-size:var(--text-label);font-weight:600;letter-spacing:0.09em;text-transform:uppercase;color:var(--fg-faint);background:var(--surface-alt);border:1px solid var(--border-soft);border-radius:6px;padding:0.1rem 0.4rem")}>{children}</span>;
}
function WEyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <div style={css("font-size:var(--text-label);letter-spacing:0.09em;text-transform:uppercase;font-weight:600;color:" + (light ? "rgba(255,255,255,.72)" : ACCENT))}>{children}</div>;
}
function WHead({ children, size = "var(--text-xl)", light = false }: { children: ReactNode; size?: string; light?: boolean }) {
  return <div style={css("font-size:" + size + ";font-weight:500;line-height:1.18;letter-spacing:-0.015em;color:" + (light ? "#fff" : "var(--fg)") + ";text-wrap:balance")}>{children}</div>;
}
function WBody({ children, light = false, max = "34rem" }: { children: ReactNode; light?: boolean; max?: string }) {
  return <div style={css("font-size:var(--text-sm);line-height:1.55;color:" + (light ? "rgba(255,255,255,.82)" : "var(--fg-muted)") + ";max-width:" + max + ";text-wrap:pretty")}>{children}</div>;
}
function WCta({ label, light = false, big = false }: { label: string; light?: boolean; big?: boolean }) {
  return <span style={css("display:inline-flex;align-items:center;align-self:flex-start;border-radius:999px;background:" + (light ? "#fff" : ACCENT) + ";color:" + (light ? ACCENT : "#fff") + ";padding:" + (big ? "0.62rem 1.4rem" : "0.5rem 1rem") + ";font-size:var(--text-sm);font-weight:500;white-space:nowrap")}>{label}</span>;
}
function WMedia({ h, label = "Image / media" }: { h: string; label?: string }) {
  return <div style={css("width:100%;height:" + h + ";background:" + SK_MEDIA + ";border:1px dashed var(--border);border-radius:14px;display:flex;align-items:flex-end;padding:0.7rem;color:var(--fg-faint);font-size:var(--text-2xs);font-weight:500")}>{label}</div>;
}
function WGallery({ mobile }: { mobile: boolean }) {
  const tiles = ["Primary story", "Detail", "In use", "Proof", "Behind the scenes"];
  return (
    <div data-wireframe-gallery style={css("width:100%;display:grid;grid-template-columns:" + (mobile ? "repeat(2,minmax(0,1fr))" : "1.35fr repeat(2,minmax(0,.65fr))") + ";grid-template-rows:" + (mobile ? "repeat(3,7rem)" : "repeat(2,8rem)") + ";gap:.65rem")}>
      {tiles.map((label, index) => (
        <div key={label} style={css("min-width:0;border:1px dashed var(--border);border-radius:14px;background:" + (index === 0 ? "color-mix(in srgb,var(--accent-soft) 36%,var(--surface) 64%)" : SK_MEDIA) + ";display:flex;align-items:flex-end;padding:.72rem;color:var(--fg-faint);font-size:var(--text-2xs);font-weight:500;" + (index === 0 ? (mobile ? "grid-column:1/-1" : "grid-row:1/3") : ""))}>{label}</div>
      ))}
    </div>
  );
}
function WItems({ items, cols, mobile, tone }: { items: { h: string; b?: string }[]; cols: string; mobile: boolean; tone?: (i: number) => string }) {
  return (
    <div style={css("width:100%;display:grid;grid-template-columns:" + (mobile ? "1fr" : cols) + ";grid-auto-rows:1fr;gap:0.7rem;margin-top:0.5rem")}>
      {items.map((it, i) => (
        <div key={i} data-wireframe-card style={css("height:100%;border:1px solid var(--border-soft);border-radius:12px;padding:0.85rem;text-align:left;min-width:0;background:" + (tone ? tone(i) : "var(--surface)"))}>
          <div style={css("font-size:var(--text-md);font-weight:500;line-height:1.3")}>{it.h}</div>
          {it.b ? <div style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.5;margin-top:0.25rem")}>{it.b}</div> : null}
        </div>
      ))}
    </div>
  );
}

function WRow({ label, layout, stage, noteTitle, note, mobile, tone, pad, center = false, copyRole, children }: {
  label: string; layout: string; stage: WireStage; noteTitle: string; note: ReactNode;
  mobile: boolean; tone?: string; pad?: string; center?: boolean; copyRole?: FunnelCopySection["role"]; children: ReactNode;
}) {
  const meta = STAGE_META[stage];
  const padding = pad || (mobile ? "1.3rem 1.1rem" : "1.6rem 1.6rem");
  const [showRationale, setShowRationale] = useState(false);
  return (
    <div data-report-wireframe-block data-section-layout={layout} data-copy-role={copyRole} style={css("border-bottom:1px solid var(--border-soft)")}>
      <div style={css("display:flex;flex-direction:column;gap:0.6rem;padding:" + padding + ";min-width:0;background:" + (tone || "var(--surface)") + (center && !mobile ? ";align-items:center;text-align:center" : ""))}>
        <div style={css("width:100%;display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap")}>
          <WChip>{label}</WChip>
          <div data-wireframe-rationale style={css("position:relative;text-align:left")}>
            <button type="button" aria-label={`Why this section: ${label}`} aria-expanded={showRationale} onClick={() => setShowRationale(open => !open)} style={css("width:1.55rem;height:1.55rem;display:grid;place-items:center;cursor:pointer;font:inherit;font-size:var(--text-2xs);font-weight:600;color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 38%,var(--border) 62%);border-radius:50%;background:var(--accent-soft);padding:0;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-soft) 38%,transparent)")}>i</button>
            {showRationale && <div role="note" aria-label={`Why ${label} is included`} style={css("position:absolute;z-index:12;right:0;top:calc(100% + .45rem);width:min(18rem,70vw);border:1px solid var(--border-soft);border-radius:12px;background:var(--surface);box-shadow:var(--shadow-lg);padding:.7rem .75rem")}>
              <span style={css("display:inline-flex;align-items:center;gap:.34rem;font-size:var(--text-label);font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-faint)")}><span style={css("width:.45rem;height:.45rem;border-radius:50%;background:" + meta.color)} />{meta.label}</span>
              <div style={css("margin-top:.3rem;font-size:var(--text-sm);font-weight:600")}>{noteTitle}</div>
              <div style={css("margin-top:.18rem;font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>{note}</div>
            </div>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Rich landing-page furniture (shared across all five styles) ──────────────
function WFrame({ h, label }: { h: string; label: string }) {
  return (
    <div style={css("width:100%;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:" + SK_MEDIA + ";box-shadow:0 10px 30px color-mix(in srgb,var(--fg) 8%,transparent)")}>
      <div style={css("display:flex;align-items:center;gap:.35rem;padding:.45rem .65rem;border-bottom:1px solid var(--border-soft);background:var(--surface-alt)")}>
        <span style={css("width:.5rem;height:.5rem;border-radius:50%;background:var(--border)")} /><span style={css("width:.5rem;height:.5rem;border-radius:50%;background:var(--border)")} /><span style={css("width:.5rem;height:.5rem;border-radius:50%;background:var(--border)")} />
        <span style={css("margin-left:.4rem;font-size:var(--text-label);color:var(--fg-faint)")}>{label}</span>
      </div>
      <div style={css("padding:.7rem;display:flex;flex-direction:column;gap:.45rem;min-height:" + h)}>
        <div style={css("display:flex;gap:.45rem")}><div style={css("height:.55rem;width:35%;border-radius:4px;background:color-mix(in srgb,var(--fg) 9%,transparent)")} /><div style={css("height:.55rem;width:18%;border-radius:4px;margin-left:auto;background:color-mix(in srgb,var(--accent) 40%,transparent)")} /></div>
        <div style={css("display:flex;gap:.45rem;flex:1")}><div style={css("flex:1;border-radius:6px;background:color-mix(in srgb,var(--fg) 6%,transparent)")} /><div style={css("flex:0 0 32%;display:flex;flex-direction:column;gap:.4rem")}><div style={css("height:.5rem;border-radius:4px;background:color-mix(in srgb,var(--fg) 8%,transparent)")} /><div style={css("height:.5rem;width:70%;border-radius:4px;background:color-mix(in srgb,var(--fg) 8%,transparent)")} /><div style={css("height:.5rem;width:84%;border-radius:4px;background:color-mix(in srgb,var(--fg) 8%,transparent)")} /></div></div>
      </div>
    </div>
  );
}
function WLogoStrip({ mobile }: { mobile?: boolean }) {
  return (
    <div style={css("width:100%;margin-top:1.4rem;text-align:center")}>
      <div style={css("font-size:var(--text-label);letter-spacing:.06em;color:var(--fg-faint);text-transform:uppercase")}>Trusted by teams like yours</div>
      <div style={css("display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;margin-top:.7rem")}>
        {Array.from({ length: mobile ? 4 : 6 }).map((_, i) => <span key={i} style={css("height:1.7rem;min-width:5rem;border-radius:7px;background:color-mix(in srgb,var(--fg) 6%,transparent);display:grid;place-items:center;font-size:var(--text-label);color:var(--fg-faint)")}>Logo</span>)}
      </div>
    </div>
  );
}
function WStats({ mobile }: { mobile?: boolean }) {
  const items = [{ n: "—", l: "customers" }, { n: "—", l: "rating" }, { n: "—", l: "result metric" }, { n: "—", l: "time to value" }];
  return (
    <div style={css("width:100%;display:grid;grid-template-columns:repeat(" + (mobile ? 2 : 4) + ",1fr);gap:1rem;margin-top:1.3rem;max-width:44rem;margin-inline:auto")}>
      {items.map((s, i) => <div key={i} style={css("text-align:center")}><div style={css("font-size:var(--text-2xl);font-weight:700;letter-spacing:-.02em")}>{s.n}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:.1rem")}>{s.l}</div></div>)}
    </div>
  );
}
function WCompare({ brand, rows }: { brand: string; rows: string[] }) {
  const use = rows.length ? rows : ["The key capability", "Another advantage", "A third differentiator", "The support model"];
  return (
    <div style={css("width:100%;border:1px solid var(--border-soft);border-radius:14px;overflow:hidden;margin-top:1rem;font-size:var(--text-xs);text-align:left")}>
      <div style={css("display:grid;grid-template-columns:1.4fr 1fr 1fr")}>
        <div style={css("padding:.6rem .8rem;background:var(--surface-alt)")} />
        <div style={css("padding:.6rem .8rem;background:var(--surface-alt);font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.04em;font-size:var(--text-label)")}>{brand}</div>
        <div style={css("padding:.6rem .8rem;background:var(--surface-alt);font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:var(--text-label);color:var(--fg-muted)")}>The alternative</div>
      </div>
      {use.slice(0, 4).map((r, i) => <div key={i} style={css("display:grid;grid-template-columns:1.4fr 1fr 1fr;border-top:1px solid var(--border-soft)")}><div style={css("padding:.6rem .8rem;font-weight:600")}>{r}</div><div style={css("padding:.6rem .8rem;text-align:center;color:var(--accent);font-weight:700")}>✓</div><div style={css("padding:.6rem .8rem;text-align:center;color:var(--fg-faint)")}>✕</div></div>)}
    </div>
  );
}
function WQuote({ quote, author, metric, big }: { quote: string; author: string; metric?: string; big?: boolean }) {
  return (
    <div style={css("border:1px " + (big ? "dashed color-mix(in srgb,var(--accent) 42%,var(--border) 58%)" : "solid var(--border-soft)") + ";border-radius:16px;padding:1.1rem;background:" + (big ? "color-mix(in srgb,var(--accent-soft) 22%,var(--surface) 78%)" : "var(--surface)") + ";text-align:left")}>
      <div style={css("font-size:" + (big ? "var(--text-lg)" : "var(--text-md)") + ";line-height:1.5")}>{quote}</div>
      <div style={css("display:flex;align-items:center;gap:.55rem;margin-top:.8rem")}>
        <span style={css("width:2.1rem;height:2.1rem;border-radius:50%;background:linear-gradient(135deg,var(--accent-soft)," + SK_MEDIA + ");border:1px solid var(--border-soft);flex-shrink:0")} />
        <div style={css("min-width:0")}><div style={css("font-size:var(--text-2xs);font-weight:600")}>{author}</div>{metric && <div style={css("font-size:var(--text-label);color:var(--fg-muted)")}>{metric}</div>}</div>
      </div>
    </div>
  );
}
function WCards({ items, S, mobile, cols }: { items: { h: string; b?: string }[]; S: WireframeStyle; mobile: boolean; cols?: string }) {
  if (S.cards === "row") return (
    <div style={css("width:100%;display:flex;flex-direction:column;margin-top:.6rem")}>
      {items.map((it, i) => <div key={i} data-wireframe-card style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "12rem 1fr") + ";gap:.8rem;padding:.6rem 0;border-bottom:" + (i === items.length - 1 ? "0" : "1px solid var(--border-soft)"))}><div style={css("font-size:var(--text-md);font-weight:600;line-height:1.3")}>{it.h}</div>{it.b ? <div style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.5")}>{it.b}</div> : null}</div>)}
    </div>
  );
  if (S.cards === "plain") return (
    <div style={css("width:100%;max-width:34rem;margin:.8rem auto 0;display:flex;flex-direction:column;gap:1.1rem;text-align:left")}>
      {items.map((it, i) => <div key={i} data-wireframe-card>{i > 0 && <div style={css("height:1px;background:var(--border-soft);margin-bottom:1.1rem")} />}<div style={css("font-size:var(--text-lg);font-weight:600")}>{it.h}</div>{it.b ? <div style={css("font-size:var(--text-sm);color:var(--fg-muted);margin-top:.25rem;line-height:1.55")}>{it.b}</div> : null}</div>)}
    </div>
  );
  return (
    <div style={css("width:100%;display:grid;grid-template-columns:" + (mobile ? "1fr" : cols || "repeat(3,1fr)") + ";grid-auto-rows:1fr;gap:.7rem;margin-top:.7rem;text-align:left")}>
      {items.map((it, i) => <div key={i} data-wireframe-card style={css("border:1px solid var(--border-soft);border-radius:14px;padding:1rem;background:" + (i === 0 ? "color-mix(in srgb,var(--accent-soft) 32%,var(--surface) 68%)" : "var(--surface)"))}><div style={css("width:2rem;height:2rem;border-radius:9px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-size:var(--text-md);margin-bottom:.5rem")}>◎</div><div style={css("font-size:var(--text-md);font-weight:600;line-height:1.3")}>{it.h}</div>{it.b ? <div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:.28rem;line-height:1.55")}>{it.b}</div> : null}</div>)}
    </div>
  );
}
function WGhost({ label, light }: { label: string; light?: boolean }) {
  return <span style={css("display:inline-flex;align-items:center;gap:.35rem;border-radius:999px;padding:.55rem 1rem;font-size:var(--text-sm);font-weight:500;border:1px solid " + (light ? "rgba(255,255,255,.28)" : "var(--border)") + ";color:" + (light ? "#fff" : "var(--fg)"))}>{label}</span>;
}
function WPill({ children }: { children: ReactNode }) {
  return <span style={css("display:inline-flex;align-items:center;gap:.35rem;border:1px solid var(--accent-dim);border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:var(--text-2xs);font-weight:600;padding:.22rem .6rem")}>{children}</span>;
}

function WireframeDoc({ bp: rawBp, copy, mobile = false, compact = false }: { bp?: any; docs?: FunnelDocs; copy?: FunnelCopyResult | null; mobile?: boolean; compact?: boolean }) {
  const bp = rawBp || {};
  const [layoutVersion, setLayoutVersion] = useState(0);
  const S = WIREFRAME_STYLES[layoutVersion];

  // Merge: overlay the AI copy (by role) onto the always-present blueprint copy.
  const ai = (role: FunnelCopySection["role"]) => {
    const section = copy?.sections.find(item => item.role === role);
    return section ? layoutFitCopySection(section) : null;
  };
  const heroAi = ai("hero"), problemAi = ai("problem"), benefitAi = ai("benefit"), solutionAi = ai("solution"), diffAi = ai("differentiation"), proofAi = ai("proof"), objectionsAi = ai("objections"), faqAi = ai("faq"), ctaAi = ai("cta");
  const toItems = (bullets: string[] | undefined, fallback: any[]) => (bullets && bullets.length ? bullets.map(b => ({ h: b, b: "" })) : (fallback || [])).map((v: any) => ({ h: v.h ?? v, b: v.b ?? "" }));
  const navCta = heroAi?.cta || bp.nav?.cta || bp.hero?.cta || "Get started";
  const fitH = (value: string, role: keyof typeof FUNNEL_COPY_BUDGETS) => fitCopyText(value, FUNNEL_COPY_BUDGETS[role].headingWords);
  const fitB = (value: string, role: keyof typeof FUNNEL_COPY_BUDGETS) => fitCopyText(value, FUNNEL_COPY_BUDGETS[role].bodyWords);
  const C = {
    brand: bp.nav?.brand || bp.footer?.brand || "Brand",
    navLinks: (bp.nav?.links || ["Why it works", "What you get", "Reviews", "FAQ"]).slice(0, 4),
    navCta,
    promoTop: bp.promotions?.[0] || { eyebrow: "Featured", heading: bp.hero?.subhead || "See the full offer in one place.", cta: navCta },
    hero: {
      eyebrow: fitCopyText(heroAi?.eyebrow || bp.hero?.eyebrow || "A CLEARER WAY TO CHOOSE", 5),
      title: fitH(heroAi?.heading || bp.hero?.title || "Your headline goes here", "hero"),
      subhead: fitB(heroAi?.body || bp.hero?.subhead || "The supporting subhead that frames the offer for the right buyer.", "hero"),
      cta: heroAi?.cta || bp.hero?.cta || navCta,
      note: bp.hero?.note || "",
    },
    stakes: { heading: fitH(problemAi?.heading || bp.problem?.heading || "The stakes", "problem"), body: fitB(problemAi?.body || bp.problem?.body || "Name what's at risk if they don't act.", "problem") },
    benefits: { heading: fitH(benefitAi?.heading || bp.benefits?.heading || "Why buyers choose this", "benefit"), items: toItems(benefitAi?.bullets, bp.benefits?.items).slice(0, 3) },
    solution: { heading: fitH(solutionAi?.heading || bp.offer?.heading || "The solution", "solution"), body: fitB(solutionAi?.body || bp.offer?.body || "Show the clearest path from problem to outcome.", "solution"), items: toItems(solutionAi?.bullets, bp.offer?.bullets).slice(0, 3) },
    differentiation: { heading: fitH(diffAi?.heading || bp.features?.heading || "Why this approach", "differentiation"), body: fitB(diffAi?.body || "Explain what makes the offer meaningfully different.", "differentiation"), items: toItems(diffAi?.bullets, bp.features?.items).slice(0, 4) },
    proof: { heading: fitH(proofAi?.heading || bp.testimonials?.heading || "Proof", "proof"), quote: fitB(proofAi?.body || bp.testimonials?.quote || "Add one approved customer quote naming the problem, experience, and result.", "proof"), author: bp.testimonials?.author || "Verified customer", metric: bp.testimonials?.metric || "Source required" },
    objections: { heading: fitH(objectionsAi?.heading || "What buyers need to know", "objections"), body: fitB(objectionsAi?.body || "Answer the last practical questions before asking for action.", "objections"), items: toItems(objectionsAi?.bullets, []).slice(0, 4) },
    faq: { heading: fitH(faqAi?.heading || bp.faq?.heading || "Questions buyers ask", "faq"), items: (faqAi?.bullets?.length ? faqAi.bullets.map(b => ({ q: b, a: "" })) : (bp.faq?.items || [])).slice(0, 6) },
    finalCta: { heading: fitH(ctaAi?.heading || bp.finalCta?.heading || "Ready to take the next step?", "cta"), body: fitB(ctaAi?.body || bp.finalCta?.body || "Use the primary action to continue.", "cta"), cta: ctaAi?.cta || bp.finalCta?.cta || navCta },
    footer: { brand: bp.footer?.brand || bp.nav?.brand || "Brand", tagline: bp.footer?.tagline || "" },
  };
  const aiSourced = !!copy;
  const ink = "var(--ink,oklch(0.23 0.02 30))";
  const heroDark = S.heroKind === "dark";
  const heroSplit = S.heroKind === "split" && !mobile;
  const navCentered = S.heroKind === "editorial" || S.heroKind === "airy";
  const showLogos = S.heroKind === "split" || S.heroKind === "dark";
  // Per-style tokens threaded through EVERY section so each version recomposes the
  // whole page — not just the hero. Type scale, alignment, and a tone rhythm.
  const H2 = S.dense ? "var(--text-xl)" : S.roomy ? "var(--text-3xl)" : "var(--text-2xl)";
  const H3 = S.dense ? "var(--text-lg)" : S.roomy ? "var(--text-2xl)" : "var(--text-xl)";
  const ctr = S.center && !mobile;                 // centre body sections in centred/calm styles
  // alternating band tones: Bold bands paints dramatic dark/accent blocks; others stay quiet.
  const toneA = S.band ? "var(--accent-soft)" : "var(--surface-alt)";   // light band
  const toneDark = S.band ? ink : "var(--surface-alt)";                 // dark/quiet band
  const onDark = S.band;                                                // light text on dark bands

  const legend = (
    <div style={css("display:flex;align-items:center;gap:0.7rem;flex-wrap:wrap")}>
      {(["create", "capture", "expand"] as WireStage[]).map(s => (
        <span key={s} style={css("display:inline-flex;align-items:center;gap:0.32rem;font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:0.05em;color:var(--fg-muted)")}>
          <span style={css("width:0.5rem;height:0.5rem;border-radius:50%;background:" + STAGE_META[s].color)} />{STAGE_META[s].label}
        </span>
      ))}
    </div>
  );

  return (
    <div style={css("width:100%;display:flex;flex-direction:column;gap:0.7rem")}>
      <div style={css("display:flex;flex-direction:column;gap:0.6rem;border:1px solid var(--border-soft);border-radius:12px;background:var(--surface-alt);padding:0.7rem 0.8rem")}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:0.7rem;flex-wrap:wrap")}>
          <div style={css("min-width:0")}>
            <div style={css("display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap")}><span style={css("font-size:var(--text-sm);font-weight:600")}>Wireframe — 5 design directions</span><span style={css("font-size:var(--text-label);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:" + (aiSourced ? ACCENT : "var(--fg-faint)") + ";border:1px solid " + (aiSourced ? "color-mix(in srgb,var(--accent) 30%,var(--border) 70%)" : "var(--border-soft)") + ";border-radius:999px;padding:0.06rem 0.4rem")}>{aiSourced ? "AI copy" : "Draft copy"}</span></div>
            <div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:0.15rem")}>{compact ? "Pick a design. Copy is the only editable layer; frames, gallery and stats are placeholders for client assets." : "Pick a design below — click to compare. Copy is the only editable layer; the greyscale frames, gallery and stat tiles are reserved for the client's real assets."}</div>
          </div>
          {!mobile && legend}
        </div>
        <div role="tablist" aria-label="Wireframe design" style={css("display:flex;gap:0.4rem;flex-wrap:wrap")}>
          {WIREFRAME_STYLES.map((style, index) => {
            const active = index === layoutVersion;
            return <button key={style.label} type="button" role="tab" aria-selected={active} onClick={() => setLayoutVersion(index)} style={css("display:inline-flex;align-items:center;gap:0.4rem;border-radius:999px;cursor:pointer;font:inherit;font-size:var(--text-2xs);font-weight:600;padding:0.36rem 0.75rem;white-space:nowrap;border:1px solid " + (active ? "var(--accent)" : "var(--border-soft)") + ";background:" + (active ? "var(--accent)" : "var(--surface)") + ";color:" + (active ? "#fff" : "var(--fg-muted)"))}><span style={css("display:grid;place-items:center;width:1.15rem;height:1.15rem;border-radius:50%;font-size:var(--text-label);font-weight:700;background:" + (active ? "rgba(255,255,255,.22)" : "var(--surface-alt)") + ";color:" + (active ? "#fff" : "var(--fg-faint)"))}>{index + 1}</span>{style.label}</button>;
          })}
        </div>
      </div>

      <div data-wireframe-layout="mixed" data-wireframe-copy-source={aiSourced ? "ai-result" : "blueprint"} data-wireframe-style={S.label} style={css("width:100%;border:1px solid var(--border);border-radius:20px;overflow:hidden;background:var(--surface);box-shadow:0 18px 50px color-mix(in srgb,var(--fg) 7%,transparent)")}>

        {/* Announcement */}
        <WRow label="Announcement" layout="promoTop" stage="create" mobile={mobile} tone={S.band ? ink : "var(--surface-alt)"} pad={mobile ? "0.7rem 1.1rem" : "0.7rem 1.6rem"} noteTitle="Lead with value" note="Surface the newest point of view or an ungated resource — not a hard sell.">
          <div style={css("width:100%;display:flex;align-items:center;justify-content:center;gap:0.6rem;flex-wrap:wrap")}>
            <span style={css("font-size:var(--text-label);color:var(--gold,oklch(0.78 0.11 75))")}>★ NEW</span>
            <span style={css("font-size:var(--text-xs);font-weight:500;color:" + (S.band ? "rgba(255,255,255,.9)" : "var(--fg)"))}>{C.promoTop.heading}</span>
            <span style={css("font-size:var(--text-xs);font-weight:600;color:" + (S.band ? "#fff" : "var(--accent)"))}>{C.promoTop.cta || "Read more"} →</span>
          </div>
        </WRow>

        {/* Nav */}
        <WRow label="Nav" layout="nav" stage="capture" mobile={mobile} pad={mobile ? "0.75rem 1.1rem" : "0.85rem 1.6rem"} noteTitle="One emphasis only" note="Keep the nav quiet — the primary action is the single highlighted element.">
          <div style={css("width:100%;display:flex;align-items:center;justify-content:" + (navCentered ? "center" : "space-between") + ";gap:1rem")}>
            <div style={css("display:flex;align-items:center;gap:0.5rem;min-width:0")}><div style={css("width:1.5rem;height:1.5rem;border-radius:7px;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:var(--text-2xs);font-weight:700;flex-shrink:0")}>{C.brand.charAt(0)}</div><span style={css("font-size:var(--text-md);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{C.brand}</span></div>
            {!navCentered && !mobile && <div style={css("display:flex;gap:0.9rem;min-width:0;overflow:hidden")}>{C.navLinks.map((l: string) => <span key={l} style={css("font-size:var(--text-xs);color:var(--fg-muted);white-space:nowrap")}>{l}</span>)}</div>}
            {!navCentered && <div style={css("display:flex;align-items:center;gap:0.6rem")}>{!mobile && <span style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>Log in</span>}<WCta label={C.navCta} /></div>}
          </div>
        </WRow>

        {/* Hero */}
        <WRow label="Hero" copyRole="hero" layout={"hero-" + S.heroKind} stage="create" mobile={mobile} tone={heroDark ? ink : "var(--surface)"} pad={mobile ? "1.8rem 1.1rem" : S.heroPad} center={S.heroKind !== "split" && S.heroKind !== "compact"} noteTitle="Point of view + outcome" note="Earn attention with the idea you're known for and the result — before any pitch.">
          {heroSplit ? (
            /* CLASSIC — copy left, product shot right, logo strip below */
            <div style={css("width:100%")}>
              <div style={css("display:grid;grid-template-columns:1.05fr 0.95fr;gap:2rem;align-items:center")}>
                <div style={css("display:flex;flex-direction:column;gap:0.7rem;max-width:28rem")}>
                  <WPill>★★★★★ &nbsp;Loved by clients</WPill>
                  <WHead size={S.heroScale}>{C.hero.title}</WHead>
                  <WBody max="26rem">{C.hero.subhead}</WBody>
                  <div style={css("display:flex;gap:0.55rem;flex-wrap:wrap;margin-top:0.4rem")}><WCta label={C.hero.cta} big /><WGhost label="▸ Watch tour" /></div>
                </div>
                <WFrame h="11rem" label={"app." + C.brand.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com"} />
              </div>
              <WLogoStrip mobile={mobile} />
            </div>
          ) : S.heroKind === "compact" ? (
            /* COMPACT — dense, left, twin CTAs, inline metric row, no big image */
            <div style={css("width:100%;max-width:42rem;display:flex;flex-direction:column;gap:0.45rem")}>
              <WEyebrow>{C.hero.eyebrow}</WEyebrow>
              <WHead size={mobile ? "1.5rem" : S.heroScale}>{C.hero.title}</WHead>
              <WBody max="34rem">{C.hero.subhead}</WBody>
              <div style={css("display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.35rem")}><WCta label={C.hero.cta} /><WGhost label="See how it works" /></div>
              <div style={css("display:flex;gap:1.6rem;flex-wrap:wrap;margin-top:0.7rem;padding-top:0.7rem;border-top:1px solid var(--border-soft)")}>{[0, 1, 2].map(i => <div key={i}><span style={css("font-size:var(--text-lg);font-weight:700")}>—</span> <span style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>proof metric</span></div>)}</div>
            </div>
          ) : S.heroKind === "editorial" ? (
            /* EDITORIAL — centred magazine, giant type, hairline rules, no image, single CTA */
            <div style={css("width:100%;display:flex;flex-direction:column;align-items:center;text-align:center;gap:0.7rem;max-width:38rem")}>
              <span style={css("width:2.4rem;height:2px;border-radius:2px;background:var(--accent)")} />
              <WEyebrow>{C.hero.eyebrow}</WEyebrow>
              <WHead size={mobile ? "2rem" : S.heroScale}>{C.hero.title}</WHead>
              <WBody max="30rem">{C.hero.subhead}</WBody>
              <div style={css("margin-top:0.5rem")}><WCta label={C.hero.cta} big /></div>
              <div style={css("width:100%;max-width:24rem;height:1px;background:var(--border-soft);margin-top:1rem")} />
            </div>
          ) : S.heroKind === "airy" ? (
            /* SPACIOUS — centred, enormous whitespace, minimal, single CTA */
            <div style={css("width:100%;display:flex;flex-direction:column;align-items:center;text-align:center;gap:1.1rem;max-width:30rem")}>
              <WEyebrow>{C.hero.eyebrow}</WEyebrow>
              <WHead size={mobile ? "1.9rem" : S.heroScale}>{C.hero.title}</WHead>
              <WBody max="26rem">{C.hero.subhead}</WBody>
              <div style={css("margin-top:1rem")}><WCta label={C.hero.cta} big /></div>
            </div>
          ) : (
            /* BOLD — dark band, big white type, centred, dual CTA */
            <div style={css("width:100%;display:flex;flex-direction:column;align-items:center;text-align:center;gap:0.7rem;max-width:34rem")}>
              <WPill>★★★★★ &nbsp;Loved by clients</WPill>
              <WHead size={mobile ? "1.9rem" : S.heroScale} light>{C.hero.title}</WHead>
              <WBody max="30rem" light>{C.hero.subhead}</WBody>
              <div style={css("display:flex;gap:0.55rem;flex-wrap:wrap;justify-content:center;margin-top:0.4rem")}><WCta label={C.hero.cta} big light /><WGhost label="▸ Watch tour" light /></div>
            </div>
          )}
        </WRow>

        {/* Problem */}
        <WRow label="Problem" copyRole="problem" layout="stakes" stage="capture" mobile={mobile} tone={toneA} pad={mobile ? "1.5rem 1.1rem" : S.pad} noteTitle="Name the stakes" note="Make the in-market buyer feel understood — the real cost of waiting.">
          <div style={css("width:100%;display:grid;grid-template-columns:" + (mobile ? "1fr" : "1.1fr 0.9fr") + ";gap:1.3rem;align-items:center")}>
            <div style={css("display:flex;flex-direction:column;gap:0.45rem")}><WEyebrow>The stakes</WEyebrow><WHead size={H2}>{C.stakes.heading}</WHead><WBody>{C.stakes.body}</WBody></div>
            <div style={css("border:1px solid var(--border-soft);border-radius:14px;background:var(--surface);padding:1.1rem;text-align:left")}>
              <div style={css("font-size:var(--text-2xl);font-weight:700;color:var(--accent);letter-spacing:-.02em")}>—</div>
              <div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:.1rem")}>the cost of the status quo (add a number)</div>
              <div style={css("height:1px;background:var(--border-soft);margin:.8rem 0")} />
              <div style={css("font-size:var(--text-sm);font-weight:600")}>&ldquo;Why this, and why now?&rdquo;</div>
            </div>
          </div>
        </WRow>

        {/* Benefit */}
        <WRow label="Benefit" copyRole="benefit" layout="benefit" stage="create" mobile={mobile} pad={mobile ? "1.5rem 1.1rem" : S.pad} center={ctr} noteTitle="Turn POV into gains" note="Concrete benefits that make the thesis tangible and repeatable.">
          <WEyebrow>Why it matters</WEyebrow>
          <WHead size={H3}>{C.benefits.heading}</WHead>
          <WCards items={C.benefits.items} S={S} mobile={mobile} />
        </WRow>

        {/* Solution */}
        <WRow label="Solution" copyRole="solution" layout="solution" stage="capture" mobile={mobile} tone={S.band ? "var(--accent-soft)" : "var(--surface)"} pad={mobile ? "1.5rem 1.1rem" : S.pad} center={ctr} noteTitle="Present the path" note="Show how the offer solves the stated problem without repeating the hero.">
          <WEyebrow>How it works</WEyebrow>
          <WHead size={H2}>{C.solution.heading}</WHead>
          <WBody max="34rem">{C.solution.body}</WBody>
          {S.cards !== "card" || mobile ? (
            <WCards items={C.solution.items} S={S} mobile={mobile} />
          ) : (
            <div style={css("width:100%;display:flex;flex-direction:column;gap:1.2rem;margin-top:1rem;text-align:left")}>
              {C.solution.items.slice(0, 3).map((it, i) => (
                <div key={i} style={css("display:grid;grid-template-columns:" + (i % 2 ? "1fr 1.05fr" : "1.05fr 1fr") + ";gap:1.2rem;align-items:center")}>
                  <div style={css("order:" + (i % 2 ? 2 : 1) + ";display:flex;flex-direction:column;gap:.35rem")}><WPill>{"0" + (i + 1)}</WPill><div style={css("font-size:var(--text-lg);font-weight:600")}>{it.h}</div>{it.b && <div style={css("font-size:var(--text-sm);color:var(--fg-muted);line-height:1.55")}>{it.b}</div>}</div>
                  <div style={css("order:" + (i % 2 ? 1 : 2))}><WFrame h="5.5rem" label={it.h} /></div>
                </div>
              ))}
            </div>
          )}
        </WRow>

        {/* Differentiation */}
        <WRow label="Differentiation" copyRole="differentiation" layout="differentiation" stage="create" mobile={mobile} tone={toneA} pad={mobile ? "1.5rem 1.1rem" : S.pad} center={ctr} noteTitle="Make the choice clear" note="Give the buyer concrete reasons to choose this approach over the familiar alternative.">
          <WEyebrow>Why this, not that</WEyebrow>
          <WHead size={H3}>{C.differentiation.heading}</WHead>
          <WCompare brand={C.brand} rows={C.differentiation.items.map(it => it.h).filter(Boolean)} />
        </WRow>

        {/* Gallery */}
        <WRow label="Gallery" layout="gallery-mosaic" stage="expand" mobile={mobile} tone={S.band ? "var(--surface)" : "var(--surface)"} pad={mobile ? "1.5rem 1.1rem" : S.pad} center={ctr} noteTitle="Show, do not over-explain" note="A flexible media grid for product, process, people, proof, or campaign imagery supplied by the client.">
          <WEyebrow>See it in context</WEyebrow>
          <WHead size={H2}>The whole story, at a glance</WHead>
          <div style={css("margin-top:1rem;width:100%")}><WGallery mobile={mobile} /></div>
        </WRow>

        {/* Proof */}
        <WRow label="Proof" copyRole="proof" layout="proof" stage="capture" mobile={mobile} tone={S.band ? ink : "var(--surface-alt)"} pad={mobile ? "1.5rem 1.1rem" : S.pad} center={ctr} noteTitle="Let customers claim it" note="An honest comparison and real stories that earn the ready buyer's trust.">
          <WEyebrow light={S.band}>Proof</WEyebrow>
          <WHead size={H3} light={S.band}>{C.proof.heading}</WHead>
          {!S.band && !S.minimal && <WStats mobile={mobile} />}
          <div style={css("width:100%;max-width:40rem;margin:1.2rem auto 0")}><WQuote quote={C.proof.quote} author={C.proof.author} metric={C.proof.metric} big /></div>
        </WRow>

        {/* Objections */}
        <WRow label="Objections" copyRole="objections" layout="objections" stage="capture" mobile={mobile} tone="color-mix(in srgb,var(--accent-soft) 26%,var(--surface) 74%)" pad={mobile ? "1.5rem 1.1rem" : S.pad} noteTitle="Remove the last friction" note="Address the practical concern that can still stop a ready buyer.">
          <div style={css("width:100%;display:grid;grid-template-columns:" + (mobile ? "1fr" : "0.85fr 1.15fr") + ";gap:1.3rem;align-items:start")}>
            <div style={css("display:flex;flex-direction:column;gap:.45rem")}><WEyebrow>Before you decide</WEyebrow><WHead size={H3}>{C.objections.heading}</WHead><WBody max="24rem">{C.objections.body}</WBody><div style={css("margin-top:.4rem")}><WGhost label="Book a no-pressure demo" /></div></div>
            <div style={css("display:flex;flex-direction:column;gap:.6rem")}>{(C.objections.items.length ? C.objections.items : [{ h: "A common concern", b: "" }, { h: "Another worry", b: "" }, { h: "The last hesitation", b: "" }]).slice(0, 4).map((it, i) => <div key={i} style={css("border:1px solid var(--border-soft);border-radius:12px;background:var(--surface);padding:.8rem .9rem")}><div style={css("font-size:var(--text-sm);font-weight:600")}>{it.h}</div>{it.b && <div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:.24rem;line-height:1.55")}>{it.b}</div>}</div>)}</div>
          </div>
        </WRow>

        {/* FAQ */}
        <WRow label="FAQ" copyRole="faq" layout="faq" stage="capture" mobile={mobile} tone={toneA} pad={mobile ? "1.5rem 1.1rem" : S.pad} center={ctr} noteTitle="Clear the last doubts" note="Answer the buying questions that sit between interest and the final action.">
          <WEyebrow>Good to know</WEyebrow>
          <WHead size={H3}>{C.faq.heading}</WHead>
          <div style={css("width:100%;max-width:44rem;display:grid;grid-template-columns:" + (mobile ? "1fr" : "1fr 1fr") + ";gap:0.6rem;margin:1rem auto 0;text-align:left")}>
            {C.faq.items.map((q: any, i: number) => <div key={i} style={css("border:1px solid var(--border-soft);border-radius:12px;padding:0.8rem 0.9rem;background:var(--surface)")}><div style={css("font-size:var(--text-sm);font-weight:600;line-height:1.35")}>{q.q}</div>{q.a && <div style={css("font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.5;margin-top:0.2rem")}>{q.a}</div>}</div>)}
          </div>
        </WRow>

        {/* Final CTA */}
        <WRow label="CTA" copyRole="cta" layout="finalCta" stage="capture" mobile={mobile} tone={ink} pad={mobile ? "2rem 1.1rem" : S.heroPad} center noteTitle="One high-intent action" note="The single next step for buyers ready now — repeated, never competing.">
          <WEyebrow light>Ready when you are</WEyebrow>
          <WHead size="var(--text-3xl)" light>{C.finalCta.heading}</WHead>
          <WBody max="30rem" light>{C.finalCta.body}</WBody>
          <div style={css("display:flex;gap:0.55rem;flex-wrap:wrap;justify-content:center;margin-top:0.6rem")}><WCta label={C.finalCta.cta} big light /><WGhost label="▸ Watch the tour" light /></div>
        </WRow>

        {/* Footer */}
        <div data-report-wireframe-block style={css("padding:" + (mobile ? "1.4rem 1.1rem" : "1.8rem 1.6rem") + ";background:var(--surface-alt)")}>
          <div style={css("width:100%;display:grid;grid-template-columns:" + (mobile ? "1fr 1fr" : "1.5fr 1fr 1fr 1fr") + ";gap:1.2rem")}>
            <div><div style={css("display:flex;align-items:center;gap:0.5rem;font-weight:600")}><span style={css("width:1.4rem;height:1.4rem;border-radius:6px;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:var(--text-label)")}>{C.brand.charAt(0)}</span>{C.footer.brand}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:0.5rem;max-width:14rem")}>{C.footer.tagline || "One clear system for the work that matters."}</div></div>
            {[["Product", ["Overview", "Features", "Pricing"]], ["Company", ["About", "Stories", "Contact"]], ["Resources", ["Guides", "Help", "Status"]]].map(([h, links]) => (
              <div key={h as string}><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:0.06em;color:var(--fg-faint);margin-bottom:0.5rem")}>{h as string}</div>{(links as string[]).map(l => <div key={l} style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-bottom:0.3rem")}>{l}</div>)}</div>
            ))}
          </div>
          <div style={css("display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding-top:0.9rem;margin-top:0.9rem;border-top:1px solid var(--border-soft);font-size:var(--text-label);color:var(--fg-muted)")}><span>© {C.footer.brand}</span><span>Privacy · Terms · Contact</span></div>
        </div>

      </div>
    </div>
  );
}

function CopyModeSwitcher({ uploaded, mobile, children }: { uploaded?: UploadedLandingCopy; mobile: boolean; children: ReactNode }) {
  const [mode, setMode] = useState<"blueprint" | "ready">(() => uploaded ? "ready" : "blueprint");
  const control = (id: "blueprint" | "ready", label: string, disabled = false) => (
    <button type="button" disabled={disabled} aria-pressed={mode === id} onClick={() => setMode(id)} style={css("min-height:2.1rem;border:1px solid " + (mode === id ? ACCENT : "var(--border)") + ";border-radius:999px;background:" + (mode === id ? "color-mix(in srgb,var(--accent) 11%,white 89%)" : "var(--surface)") + ";color:" + (disabled ? "var(--fg-faint)" : mode === id ? ACCENT : "var(--fg-muted)") + ";padding:0 0.8rem;font:inherit;font-size:var(--text-2xs);font-weight:500;cursor:" + (disabled ? "not-allowed" : "pointer") + ";opacity:" + (disabled ? ".65" : "1"))}>{label}</button>
  );
  return (
    <div style={css("display:flex;flex-direction:column;gap:var(--space-3)")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.7rem;flex-wrap:wrap;border:1px solid var(--border-soft);border-radius:12px;background:var(--surface-alt);padding:0.65rem 0.75rem;max-width:46rem;width:100%;box-sizing:border-box;margin:0 auto")}>
        <div><div style={css("font-size:var(--text-xs);font-weight:500")}>Copy format</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:0.1rem")}>{uploaded ? `Using ${uploaded.sourceName}` : "Upload working copy during source review to unlock the page-ready version."}</div></div>
        <div style={css("display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap")}>{control("blueprint", "Blueprint draft")}{control("ready", "Uploaded → page-ready", !uploaded)}</div>
      </div>
      {mode === "blueprint" || !uploaded ? children : (
        <article style={css("max-width:46rem;width:100%;box-sizing:border-box;margin:0 auto;background:var(--surface);border:1px solid var(--border-soft);border-radius:12px;padding:" + (mobile ? "1.3rem 1.4rem" : "2rem 2.4rem 2.4rem"))}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.7rem;flex-wrap:wrap;padding-bottom:1rem")}>
            <div><div style={css("text-transform:uppercase;font-size:var(--text-label);letter-spacing:0.04em;color:" + ACCENT)}>Landing-page ready</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:0.25rem")}>Reformatted from {uploaded.sourceName}; claims and voice kept grounded in the upload.</div></div>
            <span style={css("font-size:var(--text-2xs);font-weight:500;color:var(--success);background:var(--success-soft);border-radius:999px;padding:0.25rem 0.6rem")}>Ready to paste</span>
          </div>
          <section style={css("border-top:1px solid var(--border-soft);padding:1.35rem 0") }>
            <div style={css("font-size:" + (mobile ? "1.45rem" : "1.8rem") + ";font-weight:500;line-height:1.18")}>{uploaded.headline}</div>
            <div style={css("font-size:var(--text-lg);color:var(--fg-muted);line-height:1.55;margin-top:0.55rem")}>{uploaded.subhead}</div>
            <div style={css("display:inline-flex;margin-top:0.85rem;border-radius:999px;background:" + ACCENT + ";color:#fff;padding:0.55rem 1.05rem;font-size:var(--text-sm);font-weight:500")}>{uploaded.cta}</div>
          </section>
          {uploaded.sections.map((section, index) => <section key={`${section.label}-${index}`} style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "6rem minmax(0,1fr)") + ";gap:" + (mobile ? ".45rem" : "1.4rem") + ";padding:1.25rem 0;border-top:1px solid var(--border-soft)")}>
            <div><div style={css("font-size:var(--text-2xs);font-weight:500;color:" + ACCENT)}>{String(index + 2).padStart(2, "0")}</div><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--fg-faint);margin-top:.15rem")}>{section.label}</div></div>
            <div><h3 style={css("margin:0;font-size:var(--text-xl);font-weight:500;line-height:1.3")}>{section.heading}</h3><p style={css("margin:.45rem 0 0;font-size:var(--text-md);color:var(--fg-muted);line-height:1.65;white-space:pre-line")}>{section.body}</p>{section.bullets.length > 0 && <ul style={css("margin:.7rem 0 0;padding-left:1.1rem;font-size:var(--text-base);color:var(--fg-muted);line-height:1.6")}>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}</div>
          </section>)}
        </article>
      )}
    </div>
  );
}

function renderStage(ctx: StageRenderCtx): ReactNode {
  const { stageKey, docs, reveal } = ctx;
  const d = docs as FunnelDocs;
  const bp = d.blueprint;
  const toolItems: string[] = Array.isArray(bp.tools?.items)
    ? bp.tools.items
    : d.launch
        .filter(item => ["Build platform", "Email / CRM", "Payments", "Tracking"].includes(item.label))
        .map(item => `${item.label}: ${item.value}`);
  const recommendations = salesPageRecommendations(d);
  const generatedTitle = isAiStageResult(ctx.aiResult) ? ctx.aiResult.title.trim() : "";
  const genericTitles = new Set(["development plan", "build direction", "funnel development plan", d.name.toLowerCase()]);
  const finalTitle = generatedTitle && !genericTitles.has(generatedTitle.toLowerCase())
    ? generatedTitle
    : `${cap(d.objective)} through a ${d.ftype.toLowerCase()} funnel`;

  if (stageKey === "flow") {
    const rows = reveal === Number.POSITIVE_INFINITY ? d.funnelRows : d.funnelRows.slice(0, reveal);
    return (
      <div style={css("display:flex;flex-direction:column;gap:0.4rem;padding:0.4rem 0")}>
        {rows.map((row, i) => (
          <div key={row.num}>
            {i > 0 && <div style={css("text-align:center;color:var(--fg-faint);font-size:var(--text-2xs);line-height:1;margin-bottom:0.4rem")}>▼</div>}
            <div style={css("width:" + row.width + "%;margin:0 auto;border-radius:12px;padding:0.85rem 1.2rem;background:" + row.bg + ";color:#fff;display:flex;align-items:center;justify-content:" + (row.goal ? "center" : "space-between") + ";gap:var(--space-4);box-sizing:border-box;animation:cocoonFade .38s ease both")}>
              <div style={css("min-width:0" + (row.goal ? ";text-align:center" : ""))}>
                <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:rgba(255,255,255,0.82)")}>{row.num} · {row.label}</div>
                <div style={css("font-size:var(--text-lg);font-weight:500;margin-top:0.12rem;overflow-wrap:anywhere")}>{row.title}</div>
              </div>
              {row.tag && !row.goal && <div style={css("font-size:var(--text-xs);color:rgba(255,255,255,0.85);text-align:right;max-width:48%;line-height:1.35")}>{row.tag}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (stageKey === "copy") {
    if (isFunnelCopyResult(ctx.aiResult)) {
      return <CopyDraftDocument result={ctx.aiResult} brandName={briefValue(d, "Brand", d.name)} mobile={ctx.mobile} />;
    }
    const row = (n: number, num: string, label: string, body: ReactNode) => sec(reveal, n) && (
      <div style={css("display:grid;grid-template-columns:6rem 1fr;gap:1.4rem;padding:1.25rem 0;border-top:1px solid var(--border-soft)")}>
        <div><div style={css("font-size:var(--text-xs);font-weight:500;color:" + ACCENT)}>{num}</div><div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-top:0.2rem")}>{label}</div></div>
        <div>{body}</div>
      </div>
    );
    const list = (items: any[]) => <div style={css("display:flex;flex-direction:column;gap:0.6rem")}>{items.map((v: any) => <div key={v.h} style={css("font-size:var(--text-lg);line-height:1.55;color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{v.h}</span> — {v.b}</div>)}</div>;
    const blueprintDraft = (
      <div style={css("max-width:46rem;margin:0 auto;background:var(--surface);border:1px solid var(--border-soft);border-radius:12px;padding:" + (ctx.mobile ? "1.3rem 1.4rem" : "2rem 2.4rem 2.4rem"))}>
        <div style={css("padding-bottom:0.6rem")}>
          <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + "")}>Landing page copy</div>
          <div style={css("font-size:var(--text-3xl);font-weight:500;margin-top:0.3rem;line-height:1.2")}>{finalTitle}</div>
          <div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:.3rem")}>Prepared for {d.name}</div>
          <div style={css("font-size:var(--text-base);color:var(--fg-faint);margin-top:0.3rem")}>Structured on the high-converting landing page blueprint</div>
        </div>
        {sec(reveal, 1) && (
          <div style={css("display:grid;grid-template-columns:6rem 1fr;gap:1.4rem;padding:1.25rem 0;border-top:1px solid var(--border-soft)")}>
            <div><div style={css("font-size:var(--text-xs);font-weight:500;color:" + ACCENT)}>01</div><div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-top:0.2rem")}>Hero</div></div>
            <div>
              <div style={css("font-size:var(--text-2xl);font-weight:500;line-height:1.3")}>{bp.hero.title}</div>
              <div style={css("font-size:var(--text-lg);color:var(--fg-muted);line-height:1.6;margin-top:0.5rem")}>{bp.hero.subhead}</div>
              <div style={css("font-size:var(--text-base);color:var(--fg-faint);margin-top:0.7rem")}>Button — <span style={css("color:" + ACCENT + ";font-weight:500")}>{bp.hero.cta}</span></div>
            </div>
          </div>
        )}
        {row(2, "02", bp.benefits.heading, list(bp.benefits.items))}
        {row(3, "03", bp.forwho.heading, list(bp.forwho.items))}
        {row(4, "04", bp.features.heading, <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:0.55rem 1.5rem")}>{bp.features.items.map((v: any) => <div key={v.h} style={css("font-size:var(--text-md);line-height:1.5;color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{v.h}</span> — {v.b}</div>)}</div>)}
        {row(5, "05", bp.testimonials.heading, <div style={css("border-left:2px solid var(--accent-dim);padding-left:1rem")}><div style={css("font-size:var(--text-xl);line-height:1.5")}>{bp.testimonials.quote}</div><div style={css("font-size:var(--text-sm);color:var(--fg-faint);margin-top:0.5rem")}>{bp.testimonials.author} · {bp.testimonials.metric}</div></div>)}
        {row(6, "06", "Build stack", <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem 0.55rem")}>{toolItems.map((t: string) => <span key={t} className="pt-badge" style={css("font-size:var(--text-md);padding:0.22rem 0.7rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill)")}>{t}</span>)}</div>)}
        {row(7, "07", bp.pricing.heading, <div>{bp.pricing.plans.map((p: any) => <div key={p.name} style={css("display:flex;justify-content:space-between;align-items:baseline;padding:0.55rem 0;border-bottom:1px dashed var(--border-soft)")}><div style={css("font-size:var(--text-lg);color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{p.name}</span> · CTA: {p.cta}</div><div style={css("font-size:var(--text-xl);font-weight:500;white-space:nowrap")}>{p.price}</div></div>)}</div>)}
        {row(8, "08", bp.faq.heading, <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>{bp.faq.items.map((q: any) => <div key={q.q}><div style={css("font-size:var(--text-lg);font-weight:500")}>{q.q}</div><div style={css("font-size:var(--text-md);color:var(--fg-muted);line-height:1.55;margin-top:0.2rem")}>{q.a}</div></div>)}</div>)}
        {row(9, "09", "Footer", <div style={css("font-size:var(--text-md);color:var(--fg-muted);line-height:1.55")}>{bp.footer.tagline} Follow us on social.</div>)}
      </div>
    );
    return <CopyModeSwitcher uploaded={d.uploadedLandingCopy} mobile={ctx.mobile}>{blueprintDraft}</CopyModeSwitcher>;
  }

  if (stageKey === "wireframe") {
    const approvedCopy = isFunnelCopyResult(ctx.aiResults.copy) ? ctx.aiResults.copy : null;
    return sec(reveal, 1)
      ? <WireframeDoc bp={bp} docs={d} copy={approvedCopy} mobile={ctx.mobile} />
      : <div style={css("padding:var(--space-8);text-align:center;color:var(--fg-faint);font-size:var(--text-base)")}>Drafting the wireframe…</div>;
  }

  // brief — combined one-page development plan
  const developmentPlan = isAiStageResult(ctx.aiResult) ? ctx.aiResult : null;
  return (
    <div data-report-plan-body style={css("max-width:46rem;margin:0 auto;background:var(--surface);border:1px solid var(--border-soft);border-radius:12px;padding:" + (ctx.mobile ? "1.4rem" : "1.9rem 2.2rem 2.2rem") + ";display:flex;flex-direction:column;gap:var(--space-6);overflow:hidden")}>
      {sec(reveal, 1) && (
        <div data-report-section="overview" style={{ animation: "cocoonFade .4s ease both" }}>
          <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + "")}>Development plan</div>
          <div style={css("font-size:var(--text-3xl);font-weight:500;margin-top:0.3rem;line-height:1.2")}>{d.name}</div>
          <div style={css("font-size:var(--text-base);color:var(--fg-faint);margin-top:0.3rem")}>Final design, build plan and launch checklist — everything to ship, on one page</div>
          <div data-report-summary-grid style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(11.5rem,1fr));gap:var(--space-2);margin-top:1.1rem")}>
            {d.brief.map(b => <div data-report-card key={b.label} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.6rem 0.8rem")}><div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>{b.label}</div><div style={css("font-size:var(--text-base);margin-top:0.22rem;line-height:1.4")}>{b.value}</div></div>)}
          </div>
        </div>
      )}
      {sec(reveal, 1) && developmentPlan && (
        <div data-report-section="generated-development-plan" style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("font-size:var(--text-sm);line-height:1.55;color:var(--fg-muted);max-width:42rem")}>{developmentPlan.summary}</div>
          <div style={css("display:grid;gap:.65rem;margin-top:.9rem")}>
            {developmentPlan.sections.map(section => (
              <section key={section.heading} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:.85rem .95rem;background:var(--surface-alt)")}>
                <h3 style={css("margin:0;font-size:var(--text-base);line-height:1.3;font-weight:500")}>{section.heading}</h3>
                <p style={css("margin:.35rem 0 0;font-size:var(--text-sm);line-height:1.5;color:var(--fg-muted)")}>{section.body}</p>
                <ul style={css("margin:.55rem 0 0;padding-left:1.1rem;display:grid;gap:.25rem")}>{section.bullets.map(bullet => <li key={bullet} style={css("font-size:var(--text-xs);line-height:1.45;color:var(--fg-muted)")}>{bullet}</li>)}</ul>
              </section>
            ))}
          </div>
        </div>
      )}
      {sec(reveal, 1) && !developmentPlan && recommendations.length > 0 && (
        <div data-report-section="recommendations" style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>Our recommendations</div>
          <div style={css("font-size:var(--text-sm);color:var(--fg-faint);margin-top:0.3rem")}>What we’d do with this funnel — and why — drawn from your answers.</div>
          <div style={css("display:flex;flex-direction:column;gap:0.55rem;margin-top:0.95rem")}>
            {recommendations.map(r => (
              <div data-report-card key={r.area} style={css("display:flex;gap:0.7rem;align-items:flex-start;padding:0.75rem 0.9rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt)")}>
                <span style={css("width:1.5rem;height:1.5rem;flex-shrink:0;border-radius:7px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT + ";display:grid;place-items:center;margin-top:0.05rem")}><Icon name="arrow" size={12} /></span>
                <div style={css("font-size:var(--text-base);line-height:1.5;color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{r.area}</span> — {r.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {sec(reveal, 2) && (
        <div data-report-section="wireframe" style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>01 · Final Design</div>
          <div style={css("margin-top:0.85rem")}>
            <WireframeDoc bp={bp} docs={d} copy={isFunnelCopyResult(ctx.aiResults.copy) ? ctx.aiResults.copy : null} mobile={ctx.mobile} compact />
          </div>
        </div>
      )}
      {sec(reveal, 3) && (
        <div data-report-section="build" style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>02 · Build</div>
          <div style={css("display:flex;flex-direction:column;gap:var(--space-2);margin-top:0.85rem")}>
            {d.plan.map(p => <div data-report-card key={p.phase} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.7rem 0.9rem;display:flex;align-items:center;gap:var(--space-2)")}><span style={css("font-size:var(--text-2xs);font-weight:500;padding:0.12rem 0.45rem;border-radius:999px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT + ";flex-shrink:0")}>{p.phase}</span><span style={css("flex:1;font-size:var(--text-base);font-weight:500")}>{p.title}</span><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{p.owner}</span></div>)}
          </div>
        </div>
      )}
      {sec(reveal, 4) && (
        <div data-report-section="launch" style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>03 · Launch</div>
          <div style={css("font-size:var(--text-base);color:var(--fg-faint);margin-top:0.35rem")}>What we wire up to take it live.</div>
          <div style={css("display:flex;flex-direction:column;gap:0.4rem;margin-top:0.85rem")}>
            {d.launch.map(l => <div data-report-card key={l.label} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.65rem 0.9rem;display:flex;align-items:center;gap:0.7rem")}><span style={css("width:0.5rem;height:0.5rem;border-radius:50%;background:" + ACCENT + ";flex-shrink:0")} /><span style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);width:9rem;flex-shrink:0")}>{l.label}</span><span style={css("flex:1;font-size:var(--text-base);min-width:0;overflow-wrap:anywhere")}>{l.value}</span></div>)}
          </div>
        </div>
      )}
      {reveal === Number.POSITIVE_INFINITY && (
        <div data-report-actions style={css("border-top:1px solid var(--border-soft);padding-top:1.2rem;display:flex;gap:var(--space-2);flex-wrap:wrap")}>
          <button type="button" onClick={ctx.onDownload} className="pt-softbtn" style={css("border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.45rem 1rem;font-size:var(--text-sm);cursor:pointer;font-family:inherit")}>⤢ Print / save PDF</button>
          <button type="button" onClick={ctx.onCopy} className="pt-softbtn" style={css("border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.45rem 1rem;font-size:var(--text-sm);cursor:pointer;font-family:inherit")}>Copy brief</button>
          <button type="button" onClick={ctx.onShare} className="pt-op" style={css("margin-left:auto;border:none;border-radius:var(--radius-pill);background:" + ACCENT + ";color:#fff;padding:0.45rem 1.1rem;font-size:var(--text-sm);font-weight:500;cursor:pointer;font-family:inherit")}>↗ Share with client</button>
        </div>
      )}
      {reveal === Number.POSITIVE_INFINITY && ctx.afterActions && (
        <div data-report-task-wrap style={css("margin:" + (ctx.mobile ? "0 -1.4rem -1.4rem" : "0 -2.2rem -2.2rem") + ";border-top:1px solid var(--border-soft)")}>{ctx.afterActions}</div>
      )}
    </div>
  );
}

function renderProposal(ctx: ProposalRenderCtx): ReactNode {
  const d = ctx.docs as FunnelDocs;
  const p = d.proposal;
  const finalResult = isAiStageResult(ctx.aiResults.brief) ? ctx.aiResults.brief : null;
  const sourceBase = ctx.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "client";
  const taskDrafts = funnelTaskDrafts(d, ctx.clientName);
  const fallbackSummary = `The ${d.ftype.toLowerCase()} direction for ${d.name} is approved and ready for design, build, and launch.`;
  const summaryWords = (finalResult?.summary || fallbackSummary).trim().split(/\s+/);
  const compactSummary = summaryWords.length > 24 ? `${summaryWords.slice(0, 24).join(" ").replace(/[,:;]$/, "")}…` : summaryWords.join(" ");
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;animation:cocoonFade .4s ease both")}>
      <div style={css("padding:1.6rem 1.7rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
        <div onClick={ctx.onBack} style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:var(--text-xs);color:var(--fg-muted);cursor:pointer;margin-bottom:0.9rem")}>← Back to development plan</div>
        <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + ";margin-bottom:0.3rem")}>Overall plan</div>
        <h2 style={css("margin:0;font-size:var(--text-3xl);font-weight:500;line-height:1.18")}>Turn {cap(d.objective)} into a live funnel</h2>
        <p style={css("margin:0.4rem 0 0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.5;max-width:34rem")}>{compactSummary}</p>
        <div style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2);margin-top:1.2rem")}>
          {[[String(p.pages), "Pages"], [String(p.emails), "Emails"], ["~" + p.days, "Days to launch"]].map(([v, l]) => <div key={l} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.75rem 0.9rem;background:var(--surface-alt)")}><div style={css("font-size:var(--text-3xl);font-weight:500;line-height:1")}>{v}</div><div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-top:0.28rem")}>{l}</div></div>)}
        </div>
      </div>
      <div style={css("padding:1.2rem 1.4rem")}>
        <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.7rem")}>What we’ll build for you</div>
        <div style={css("display:flex;flex-direction:column;border:1px solid var(--border-soft);border-radius:var(--radius);overflow:hidden")}>
          {p.deliverables.map((dv, i) => (
            <div key={dv.label} style={css("display:flex;align-items:flex-start;gap:var(--space-3);padding:0.8rem 0.95rem" + (i < p.deliverables.length - 1 ? ";border-bottom:1px solid var(--border-soft)" : ""))}>
              <span style={css("width:1.9rem;height:1.9rem;border-radius:8px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT + ";display:grid;place-items:center;flex-shrink:0")}><Icon name={dv.icon} size={16} /></span>
              <div style={css("flex:1;min-width:0")}><div style={css("font-size:var(--text-md);font-weight:500;line-height:1.3")}>{dv.label}</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.15rem;line-height:1.45")}>{dv.desc}</div></div>
              <span style={css("width:1.3rem;height:1.3rem;border-radius:50%;background:var(--success-soft);color:var(--success);display:grid;place-items:center;flex-shrink:0;margin-top:0.1rem")}><Icon name="checkmark" size={13} /></span>
            </div>
          ))}
        </div>
      </div>
      <BuilderTaskPanel embedded drafts={taskDrafts} fileName={`${sourceBase}-funnel-tasks.csv`} mobile={ctx.mobile} onImport={ctx.onImportTasks}/>
    </div>
  );
}

function introPreview(): ReactNode {
  // static "development plan" document mock (mirrors the finished deliverable)
  return (
    <div style={css("position:absolute;top:1.5rem;left:1.5rem;right:-2.5rem;bottom:-1.4rem;background:#fff;border:1px solid var(--border-soft);border-radius:12px 0 0 0;box-shadow:0 24px 60px -30px rgba(60,40,30,0.5);padding:1.2rem 1.4rem;display:flex;flex-direction:column;overflow:hidden")}>
      <div style={css("display:flex;align-items:center;gap:0.65rem;padding-bottom:0.75rem")}>
        <span style={css("width:1.85rem;height:1.85rem;border-radius:7px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT + ";display:grid;place-items:center;font-weight:600;font-size:var(--text-base);flex-shrink:0")}>A</span>
        <div style={css("flex:1;min-width:0")}><div style={css("font-size:var(--text-md);font-weight:600;line-height:1.2")}>Client</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:0.08rem")}>Development plan · Prepared by Baltz Studio</div></div>
      </div>
      <div style={css("height:2px;background:" + ACCENT + ";border-radius:2px;margin-bottom:0.9rem")} />
      <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + ";margin-bottom:0.5rem")}>Final design</div>
      <div style={css("border:1px solid var(--border-soft);border-radius:10px;overflow:hidden")}>
        <div style={css("display:flex;align-items:center;gap:0.55rem;padding:0.45rem 0.7rem;border-bottom:1px solid var(--border-soft)")}><span style={css("width:0.8rem;height:0.8rem;border-radius:4px;background:var(--fg)")} /><span style={css("font-size:var(--text-2xs);font-weight:600")}>Aurora</span><span style={css("flex:1")} /><span style={css("background:var(--accent);color:#fff;font-size:var(--text-2xs);font-weight:600;padding:0.2rem 0.5rem;border-radius:999px")}>Get started</span></div>
        <div style={css("text-align:center;padding:1rem 0.9rem;border-bottom:1px solid var(--border-soft)")}><div style={css("font-size:var(--text-base);font-weight:600;max-width:14rem;margin:0 auto;line-height:1.25")}>Calmer skin in two weeks, guaranteed.</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:0.3rem")}>A 3-step ritual set, made simple.</div><span style={css("display:inline-block;margin-top:0.5rem;background:var(--accent);color:#fff;font-size:var(--text-2xs);font-weight:600;padding:0.35rem 0.9rem;border-radius:999px")}>Claim my bundle</span><div style={css("margin:0.6rem auto 0;max-width:15rem;height:2.6rem;border-radius:8px;background:var(--accent-soft)")} /></div>
        <div style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:0.55rem;padding:var(--space-3)")}>{[0, 1, 2].map(i => <div key={i}><div style={css("width:1.3rem;height:1.3rem;border-radius:6px;background:color-mix(in srgb,var(--accent) 14%,white 86%);margin-bottom:0.3rem")} /><div style={css("height:0.38rem;border-radius:3px;background:var(--border);margin-bottom:0.22rem")} /><div style={css("height:0.38rem;width:60%;border-radius:3px;background:var(--border-soft)")} /></div>)}</div>
      </div>
      <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + ";margin:0.9rem 0 0.5rem")}>Build — phases</div>
      <div style={css("display:flex;flex-direction:column;gap:0.35rem")}>
        {["Design & wireframe", "Build", "Launch"].map((t, i) => <div key={t} style={css("display:flex;align-items:center;gap:var(--space-2);border:1px solid var(--border-soft);border-radius:8px;padding:0.45rem 0.65rem")}><span style={css("font-size:var(--text-2xs);font-weight:700;padding:0.1rem 0.38rem;border-radius:999px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT)}>{"0" + (i + 1)}</span><span style={css("flex:1;font-size:var(--text-xs);font-weight:500")}>{t}</span><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>Studio</span></div>)}
      </div>
    </div>
  );
}

export const FUNNEL_PIPELINE: Pipeline = {
  railTitle: "Build pipeline",
  buildDocs: buildFunnelDocs,
  gen: (k) => ({ total: k === "flow" ? 6 : k === "brief" ? 4 : 9, ms: k === "wireframe" ? 6000 : k === "brief" ? 3800 : 4200, buildLabel: "Building" }),
  genPrompt: (k) => "Generate the " + STAGE_LABEL[k] + " from everything you shared in discovery.",
  genCta: () => "Generate draft",
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
