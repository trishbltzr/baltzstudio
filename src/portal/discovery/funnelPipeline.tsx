"use client";

import { useState, type ReactNode } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import type { Ans, Pipeline, StageRenderCtx, ProposalRenderCtx } from "./DiscoveryBuilder";
import { isAiStageResult } from "@/lib/aiStageGeneration";
import { BuilderTaskPanel } from "../builders/BuilderTaskPanel";
import type { TaskImportDraft } from "../types";

// ── docs model (ported from Funnel Builder fbDocs) ─────────────────────────────
const cap = (s: string) => { s = (s || "").trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };

function conciseHeroCopy(value: unknown, maxWords: number, maxCharacters: number): string {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const words = normalized.split(" ");
  if (words.length <= maxWords && normalized.length <= maxCharacters) return normalized;
  const kept: string[] = [];
  for (const word of words) {
    const next = [...kept, word].join(" ");
    if (kept.length >= maxWords || next.length > maxCharacters) break;
    kept.push(word);
  }
  return `${kept.join(" ").replace(/[,:;.!?–—-]+$/, "")}…`;
}

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
  const name = g<string>("name", "Your funnel"), objective = g<string>("objective", "generate leads"), ftype = g<string>("ftype", "Lead magnet → nurture");
  const action = g<string>("action", "take the next step"), offer = g<string>("offer", "your offer"), persona = g<string>("persona", "your ideal customer");
  const problem = g<string>("problem", ""), price = g<string>("price", ""), proof = g<string[]>("proof", []);
  const traffic = g<string[]>("traffic", []), awareness = g<string>("awareness", ""), pagesSel = g<string[]>("pages", []), emails = g<string>("emails", "None");
  const need = g<string[]>("need", []);
  const platform = g<string>("platform", "Webflow"), domain = g<string>("domain", ""), email = g<string>("email", "Not set up yet"), payment = g<string>("payment", "None (lead gen)"), tracking = g<string[]>("tracking", []);

  const offerName = offer.replace(/^\d+\s*(?:lb\.?|kg|oz\.?)\s*(?:bags?|packs?)?\s+of\s+/i, "").replace(/[.]$/, "");
  const isFeedOffer = /feed|poultry|livestock/i.test(`${offer} ${problem}`);
  const salesCta = isFeedOffer ? "Shop Feed" : /cart|checkout|buy|purchase|order/i.test(action) ? `Shop ${cap(offerName)}` : cap(action);
  const salesPrice = price && price !== "Free (lead gen)" && !/^(under|from|starting|budget|range)/i.test(price.trim()) ? price : "Final price to approve";
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
    { phase: "01", title: "Design & wireframe", owner: "Studio", tasks: ["Skeleton wireframe", "High-fidelity design", "Client design review"] },
    { phase: "02", title: "Build", owner: "Studio", tasks: ["Build pages in " + platform, "Wire forms, " + payment + " & email", "Connect " + (tracking.length ? tracking.join(", ") : "tracking")] },
    { phase: "03", title: "Launch", owner: "Studio", tasks: ["QA every funnel step", "Publish to " + (domain || "domain"), "Handoff & training"] },
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

const WIREFRAME_SECTION_KEYS = ["promoTop", "hero", "stakes", "benefits", "audience", "details", "promoMid", "process", "testimonial", "offer", "price", "faq", "finalCta"] as const;
type WireframeSectionKey = typeof WIREFRAME_SECTION_KEYS[number];
type WireframeRecipe = Record<WireframeSectionKey, number>;
const WIREFRAME_VARIANT_COUNTS: WireframeRecipe = { promoTop: 3, hero: 4, stakes: 3, benefits: 3, audience: 3, details: 3, promoMid: 3, process: 3, testimonial: 3, offer: 3, price: 3, faq: 3, finalCta: 3 };

function seededRecipe(bp: any): WireframeRecipe {
  let seed = Array.from(`${bp?.nav?.brand || ""}:${bp?.hero?.title || ""}`).reduce((total, character) => total + character.charCodeAt(0), 0) || 1;
  return Object.fromEntries(WIREFRAME_SECTION_KEYS.map(key => {
    seed = (seed * 9301 + 49297) % 233280;
    return [key, seed % WIREFRAME_VARIANT_COUNTS[key]];
  })) as WireframeRecipe;
}

function shuffledRecipe(current: WireframeRecipe): WireframeRecipe {
  return Object.fromEntries(WIREFRAME_SECTION_KEYS.map(key => {
    const count = WIREFRAME_VARIANT_COUNTS[key];
    return [key, (current[key] + 1 + Math.floor(Math.random() * (count - 1))) % count];
  })) as WireframeRecipe;
}

function briefValue(docs: FunnelDocs, label: string, fallback = ""): string {
  return docs.brief.find(item => item.label === label)?.value || fallback;
}

function salesPageBlueprint(docs: FunnelDocs, raw: any): any {
  const legacy = raw?.features?.items?.some((item: any) => ["Fast to launch", "Mobile-perfect", "Built-in tracking", "On-brand design"].includes(item?.h))
    || raw?.testimonials?.author === "A happy customer"
    || raw?.pricing?.plans?.some((plan: any) => plan?.name === "Starter" || plan?.name === "Pro");
  if (!legacy) return raw;

  const offer = String(raw?.offer?.body || raw?.benefits?.items?.[1]?.b || "the approved offer").split(/\s+·\s+/)[0].trim();
  const offerName = offer.replace(/^\d+\s*(?:lb\.?|kg|oz\.?)\s*(?:bags?|packs?)?\s+of\s+/i, "").replace(/[.]$/, "");
  const audience = briefValue(docs, "Audience", "the right-fit buyer");
  const action = briefValue(docs, "Primary action", raw?.hero?.cta || "Get started");
  const problem = String(raw?.problem?.body || "").replace(/[.]$/, "");
  const isFeedOffer = /feed|poultry|livestock/i.test(`${offer} ${problem}`);
  const cta = isFeedOffer ? "Shop Feed" : /cart|checkout|buy|purchase|order/i.test(action) ? `Shop ${cap(offerName)}` : cap(action);
  const rawPrice = raw?.pricing?.plans?.map((plan: any) => String(plan?.price || "")).find((value: string) => value && !/^\$?0$|^free$/i.test(value)) || "";
  const selectedPrice = rawPrice && !/^(under|from|starting|budget|range)/i.test(rawPrice.trim()) ? rawPrice : "Final price to approve";
  const benefits = isFeedOffer ? [
    { h: "Know what you’re feeding", b: "See the approved Non-GMO product details in one place, so you know exactly what you’re choosing." },
    { h: "Choose the right feed", b: "Compare poultry and livestock options and find the feed that matches the animals in your care." },
    { h: "Order without the runaround", b: "Go from product details to checkout through one clear, direct order path." },
  ] : [
    { h: "See the value clearly", b: `Show exactly how ${offerName} helps the buyer move toward ${docs.objective.toLowerCase()}.` },
    { h: "Know what to expect", b: "Put the offer, delivery details, and decision-making information in one clear place." },
    { h: "Take the next step", b: `Make “${cta}” the single, unmistakable action throughout the page.` },
  ];
  const features = isFeedOffer ? [
    { h: "40 lb. bag format", b: "Available in 40 lb. bags, with the size shown clearly before checkout." },
    { h: "Non-GMO feed", b: "A clearly labeled Non-GMO option for buyers who care about what goes into every bag." },
    { h: "Poultry and livestock options", b: "Feed choices organized around the animals you care for." },
    { h: "Clear product guidance", b: "Find ingredients, feeding guidance, and storage information in one place." },
    { h: "Straightforward ordering", b: `Choose “${cta}” whenever you’re ready to order.` },
    { h: "Fulfilment details", b: "See availability and fulfilment expectations before checkout." },
  ] : [
    { h: "The offer", b: cap(offer) }, { h: "The right fit", b: cap(audience) }, { h: "The promised outcome", b: cap(docs.objective) },
    { h: "What is included", b: "List the approved product, service, or deliverable details." }, { h: "How it is delivered", b: "State the approved delivery, fulfilment, or access details." }, { h: "The next step", b: cta },
  ];

  return {
    ...raw,
    nav: { ...raw.nav, links: ["Why it works", "What you get", "Reviews", "FAQ"], cta },
    hero: {
      eyebrow: isFeedOffer ? "NON-GMO FEED FOR BACKYARD FLOCKS & SMALL FARMS" : "A CLEARER WAY TO CHOOSE",
      title: isFeedOffer ? `Feed with confidence. Choose dependable ${offerName}.` : `A clearer way to get ${offerName}.`,
      subhead: isFeedOffer ? `${cap(offer)} for backyard flocks, homesteads, and small farms.` : `${cap(offer)} for ${audience.toLowerCase()}, with the details and reassurance needed to make a confident decision.`,
      cta,
      note: selectedPrice === "Final price to approve" ? "Final price and fulfilment details confirmed before checkout" : `${selectedPrice} · Fulfilment details confirmed before checkout`,
    },
    promotions: isFeedOffer ? [
      { eyebrow: "Featured feed", heading: "Non-GMO feed for flocks, homesteads, and small farms.", body: "Compare the approved options and choose the right feed.", cta },
      { eyebrow: "Ready to order", heading: "Choose the right feed and check out with confidence.", body: "Review the product and fulfilment details before you buy.", cta },
    ] : [
      { eyebrow: "Featured offer", heading: `A clearer path to ${docs.objective.toLowerCase()}.`, body: `See what is included in ${offerName} and decide with confidence.`, cta },
      { eyebrow: "Your next step", heading: `Ready to ${action.toLowerCase()}?`, body: "Review the offer details, get your remaining questions answered, and move forward.", cta },
    ],
    problem: { heading: isFeedOffer ? "Your animals depend on what goes into every bag." : "Choosing the right offer should not feel this complicated.", body: problem ? `${cap(problem)}. Get the clarity you need to choose with confidence.` : isFeedOffer ? "When quality, sourcing, or fit is unclear, choosing the right bag can feel like a gamble. Get straightforward details before you stock up." : "Get the offer details, proof, and reassurance you need before you commit." },
    benefits: { heading: isFeedOffer ? "A more confident way to buy feed" : "Why buyers choose this offer", items: benefits },
    forwho: { heading: isFeedOffer ? "For flocks, homesteads, and small farms" : "Who this is for", items: [
      { h: isFeedOffer ? "Backyard flock keepers" : "Has the problem now", b: problem ? cap(problem) : isFeedOffer ? "Wants dependable feed details without the guesswork." : `Wants to ${docs.objective.toLowerCase()} without more delay.` },
      { h: isFeedOffer ? "Homesteads and small farms" : "Needs the details", b: isFeedOffer ? `Needs clear information about ${offerName}, availability, and fulfilment.` : `Wants to understand ${offerName}, what is included, and whether it fits.` },
      { h: isFeedOffer ? "Poultry and livestock owners" : "Is ready for a clear next step", b: isFeedOffer ? "Is ready to compare the approved options and order the right feed." : `Needs one direct path to ${action.toLowerCase()}.` },
    ] },
    features: { heading: isFeedOffer ? "Everything you need to choose the right feed" : "What the buyer gets", items: features },
    process: { heading: isFeedOffer ? "How to order" : "How ordering works", items: [
      { h: isFeedOffer ? "Find your feed" : "Choose the right option", b: `Review the product details for ${offerName}.` },
      { h: isFeedOffer ? "Check the details" : "Order with confidence", b: isFeedOffer ? "Compare the information that matters for your animals and your routine." : `Use “${cta}” when the offer fits what you need.` },
      { h: isFeedOffer ? "Add to cart and check out" : "Know what happens next", b: isFeedOffer ? "Choose your option, add it to cart, and complete checkout." : "See the confirmed fulfilment, access, or delivery expectations before checkout." },
    ] },
    offer: { heading: isFeedOffer ? "Choose the right feed for your animals" : "Choose your offer", body: `${cap(offer)}${selectedPrice !== "Final price to approve" ? ` · ${selectedPrice}` : ""}`, bullets: [cap(offer), cap(audience), selectedPrice] },
    testimonials: { heading: "Let customers make the claim", quote: "Add one approved customer quote that names the specific problem, product experience, and result.", author: "Verified customer name required", metric: "Source and permission required" },
    pricing: { heading: "The offer", plans: [{ name: cap(offerName), price: selectedPrice, highlight: true, cta, lines: 4 }] },
    faq: { heading: "Questions buyers ask before they order", items: [
      { q: "What am I buying?", a: `${cap(offer)}.` }, { q: "Who is this for?", a: `${cap(audience)}.` }, { q: "How much does it cost?", a: selectedPrice === "Final price to approve" ? "Confirm the final price before launch." : `${selectedPrice}.` },
      { q: "What should I know before ordering?", a: "Add the approved product, delivery, support, and policy details needed to remove last-minute uncertainty." }, { q: "How do I get started?", a: `Choose “${cta},” review the final details, and complete the approved checkout path.` },
    ] },
    finalCta: { heading: isFeedOffer ? "Ready to choose feed with confidence?" : `Ready to ${action.toLowerCase()}?`, body: isFeedOffer ? "Review the approved feed details, choose the right option, and complete your order." : `Review the offer, get the remaining questions answered, and move toward ${docs.objective.toLowerCase()}.`, cta },
  };
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

type PromotionCopy = { eyebrow: string; heading: string; body: string; cta: string };

function PromotionBanner({ promotion, variant, mobile, position }: { promotion: PromotionCopy; variant: number; mobile: boolean; position: "promoTop" | "promoMid" }) {
  const dark = variant === 1;
  const filled = variant === 0;
  const background = dark
    ? "var(--fg)"
    : filled
      ? "var(--accent)"
      : "var(--accent-soft)";
  const foreground = dark || filled ? "#fff" : "var(--fg)";
  const muted = dark || filled ? "rgba(255,255,255,.74)" : "var(--fg-muted)";
  return (
    <section
      data-report-wireframe-block
      data-promotional-banner={position}
      data-section-layout={`${position}-${variant}`}
      style={css("display:grid;grid-template-columns:" + (mobile || variant === 2 ? "1fr" : "minmax(0,1fr) auto") + ";align-items:center;gap:" + (mobile ? ".8rem" : "1.2rem") + ";padding:" + (position === "promoTop" ? (mobile ? ".85rem 1rem" : ".8rem 1.5rem") : (mobile ? "1.2rem 1.1rem" : "1.35rem 1.7rem")) + ";border-bottom:1px solid " + (dark || filled ? "rgba(255,255,255,.12)" : "var(--border-soft)") + ";background:" + background + ";color:" + foreground + ";text-align:" + (variant === 2 ? "center" : "left"))}
    >
      <div style={css("min-width:0;display:flex;flex-direction:column;align-items:" + (variant === 2 ? "center" : "flex-start") + ";gap:.2rem")}>
        <span style={css("font-size:.61rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:" + muted)}>{promotion.eyebrow}</span>
        <strong style={css("font-size:" + (position === "promoTop" ? ".86rem" : "1.02rem") + ";line-height:1.3;font-weight:500;text-wrap:balance")}>{promotion.heading}</strong>
        {position === "promoMid" && <span style={css("font-size:.72rem;line-height:1.45;color:" + muted + ";max-width:34rem")}>{promotion.body}</span>}
      </div>
      <span style={css("justify-self:" + (mobile || variant === 2 ? "center" : "end") + ";display:inline-flex;align-items:center;justify-content:center;min-height:2.05rem;border:1px solid " + (dark || filled ? "rgba(255,255,255,.28)" : "color-mix(in srgb,var(--accent) 32%,var(--border) 68%)") + ";border-radius:999px;background:" + (dark || filled ? "#fff" : "var(--surface)") + ";color:" + (dark || filled ? ACCENT : "var(--accent)") + ";padding:0 .9rem;font-size:.7rem;font-weight:600;white-space:nowrap")}>{promotion.cta}</span>
    </section>
  );
}

function WireframeDoc({ bp: rawBlueprint, docs, mobile = false, compact = false }: { bp: any; docs: FunnelDocs; mobile?: boolean; compact?: boolean }) {
  const sourceBlueprint = salesPageBlueprint(docs, rawBlueprint);
  const sourceHeroTitle = String(sourceBlueprint.hero?.title || "");
  const compactFeedTitle = /non-gmo/i.test(sourceHeroTitle) && /feed|poultry|livestock/i.test(sourceHeroTitle)
    ? "Feed with confidence. Choose dependable Non-GMO feed."
    : sourceHeroTitle;
  const bp = {
    ...sourceBlueprint,
    hero: {
      ...sourceBlueprint.hero,
      title: conciseHeroCopy(compactFeedTitle, 9, 64),
      subhead: conciseHeroCopy(sourceBlueprint.hero?.subhead, 22, 132),
    },
  };
  const [recipe, setRecipe] = useState<WireframeRecipe>(() => seededRecipe(bp));
  const navCta = (bp.nav.cta && bp.nav.cta.length <= 16) ? bp.nav.cta : "Get started";
  const promotionIsFeed = /feed|poultry|livestock/i.test(`${docs.name} ${bp.hero.title} ${bp.hero.subhead}`);
  const defaultPromotions: PromotionCopy[] = promotionIsFeed ? [
    { eyebrow: "Featured feed", heading: "Non-GMO feed for flocks, homesteads, and small farms.", body: "Compare the approved options and choose the right feed.", cta: bp.hero.cta || navCta },
    { eyebrow: "Ready to order", heading: "Choose the right feed and check out with confidence.", body: "Review the product and fulfilment details before you buy.", cta: bp.finalCta?.cta || navCta },
  ] : [
    { eyebrow: "Featured offer", heading: "See the complete offer in one clear place.", body: bp.hero.subhead, cta: bp.hero.cta || navCta },
    { eyebrow: "Your next step", heading: bp.finalCta?.heading || "Ready to move forward?", body: bp.finalCta?.body || "Review the offer and take the next step.", cta: bp.finalCta?.cta || navCta },
  ];
  const promotions: PromotionCopy[] = Array.isArray(bp.promotions) && bp.promotions.length >= 2 ? bp.promotions.slice(0, 2) : defaultPromotions;
  const problem = bp.problem || { heading: "The problem we are solving", body: "Clarify the visitor's current challenge and why it matters now." };
  const features = bp.features || { heading: "The solution", items: bp.benefits?.items || [] };
  const process = bp.process || { heading: "How it works", items: [{ h: "Start", b: "Take the first clear step." }, { h: "Move forward", b: "Follow the approved conversion path." }, { h: "Reach the outcome", b: "Complete the primary action." }] };
  const offer = bp.offer || { heading: "The offer", body: "Confirm the offer contents and delivery details.", bullets: ["Core offer details", "Delivery and access", "Support or next steps"] };
  const faq = bp.faq || { heading: "FAQ", items: [{ q: "What happens next?", a: "Confirm the final delivery and next-step details before launch." }] };
  const finalCta = bp.finalCta || { heading: "Ready to take the next step?", body: "Use the approved primary action to continue.", cta: navCta };
  const footer = bp.footer || { brand: bp.nav.brand, tagline: "Footer copy to approve." };
  const split = recipe.hero === 1 && !mobile;
  const editorial = recipe.hero === 2;
  const immersive = recipe.hero === 3;
  const shuffle = () => setRecipe(shuffledRecipe);
  return (
    <div style={css("width:100%;display:flex;flex-direction:column;gap:0.7rem")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.7rem;flex-wrap:wrap;border:1px solid var(--border-soft);border-radius:12px;background:var(--surface-alt);padding:0.65rem 0.75rem")}>
        <div><div style={css("font-size:0.78rem;font-weight:500")}>Page formatting</div><div style={css("font-size:0.68rem;color:var(--fg-muted);margin-top:0.1rem")}>{compact ? "Every section has its own layout. Shuffle to recompose the full page." : "The hero, promotional banners, benefits, offer, FAQ, and every other section format independently."}</div></div>
        <button type="button" onClick={shuffle} aria-label="Shuffle page formatting" style={css("min-height:2rem;display:inline-flex;align-items:center;gap:0.38rem;border:1px solid var(--accent);border-radius:999px;background:color-mix(in srgb,var(--accent) 10%,white 90%);color:var(--accent);padding:0 0.8rem;font:inherit;font-size:0.7rem;font-weight:500;cursor:pointer")}><Icon name="replay" size={12} /> Shuffle page layout</button>
      </div>
      <div data-wireframe-layout="mixed" data-wireframe-recipe={WIREFRAME_SECTION_KEYS.map(key => recipe[key]).join("-")} style={css("width:100%;border:1px solid var(--border);border-radius:20px;overflow:hidden;background:var(--surface);box-shadow:0 18px 50px color-mix(in srgb,var(--fg) 7%,transparent)")}>
      <PromotionBanner promotion={promotions[0]} variant={recipe.promoTop} mobile={mobile} position="promoTop" />
      <div data-report-wireframe-block style={css("display:flex;align-items:center;justify-content:space-between;gap:0.7rem;padding:" + (mobile ? "0.75rem 0.85rem" : "0.85rem 1.5rem") + ";border-bottom:1px solid var(--border-soft);min-width:0")}>
        <div style={css("display:flex;align-items:center;gap:0.55rem;flex:1;min-width:0")}><div style={css("width:1.5rem;height:1.5rem;border-radius:7px;background:var(--fg);flex-shrink:0")} /><span style={css("font-size:var(--text-md);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{bp.nav.brand}</span></div>
        {!mobile && !editorial && <div style={css("display:flex;gap:0.75rem;align-items:center;max-width:34%;overflow:hidden;flex-shrink:1")}>{bp.nav.links.map((l: string) => <span key={l} style={css("font-size:0.76rem;color:var(--fg-muted);white-space:nowrap")}>{l}</span>)}</div>}
        <span style={css("background:" + ACCENT + ";color:#fff;font-size:0.78rem;font-weight:500;padding:0.42rem 0.95rem;border-radius:999px;flex-shrink:0;white-space:nowrap")}>{navCta}</span>
      </div>
      <div data-report-wireframe-block data-section-layout={`hero-${recipe.hero}`} style={css("padding:" + (mobile ? "1.8rem 1.1rem" : immersive ? "4rem 2.6rem" : editorial ? "3.2rem 2.3rem" : "2.8rem 2rem") + ";text-align:" + (split || editorial ? "left" : "center") + ";display:grid;grid-template-columns:" + (split ? "1.08fr 0.92fr" : "1fr") + ";align-items:center;gap:" + (split ? "2rem" : "0.8rem") + ";border-bottom:1px solid var(--border-soft);background:" + (immersive ? "var(--fg);color:#fff" : editorial ? "var(--accent-soft)" : "var(--surface)"))}>
        <div style={css("display:flex;flex-direction:column;align-items:" + (split || editorial ? "flex-start" : "center") + ";gap:0.65rem") }>
          <span style={css("font-size:0.64rem;text-transform:uppercase;letter-spacing:.11em;color:" + (immersive ? "rgba(255,255,255,.72)" : ACCENT) + ";font-weight:600")}>{bp.hero.eyebrow || "THE OFFER"}</span>
          <div data-hero-title style={css("font-size:" + ((editorial || split) && !mobile ? "2.15rem" : "1.8rem") + ";font-weight:500;max-width:" + (editorial ? "31rem" : "34rem") + ";letter-spacing:-.025em;line-height:1.08;text-wrap:balance")}>{bp.hero.title}</div>
          <div data-hero-subhead style={css("font-size:0.94rem;color:" + (immersive ? "rgba(255,255,255,.78)" : "var(--fg-muted)") + ";max-width:29rem;line-height:1.48;text-wrap:pretty")}>{bp.hero.subhead}</div>
          <span style={css("margin-top:0.45rem;background:" + ACCENT + ";color:#fff;font-size:0.9rem;font-weight:500;padding:0.62rem 1.6rem;border-radius:999px")}>{bp.hero.cta}</span>
          {bp.hero.note && <span style={css("font-size:.66rem;color:" + (immersive ? "rgba(255,255,255,.62)" : "var(--fg-faint)"))}>{bp.hero.note}</span>}
        </div>
        <div style={css("margin:" + (split ? "0" : "1.2rem auto 0") + ";width:100%;max-width:" + (editorial ? "48rem" : "40rem") + ";height:" + (immersive ? "14rem" : editorial ? "8rem" : "11rem") + ";border:1px solid color-mix(in srgb,var(--accent) 24%,var(--border-soft) 76%);border-radius:" + (immersive ? "28px" : editorial ? "999px 22px 22px 999px" : "18px") + ";background:color-mix(in srgb,var(--accent-soft) 72%,var(--surface) 28%);display:flex;align-items:flex-end;justify-content:flex-start;padding:1rem;color:var(--fg-muted);font-size:.72rem;font-weight:500")}>Approved product or lifestyle image</div>
      </div>
      <section data-report-wireframe-block data-section-layout={`stakes-${recipe.stakes}`} style={css("display:grid;grid-template-columns:" + (mobile || recipe.stakes === 1 ? "1fr" : recipe.stakes === 2 ? ".85fr 1.15fr" : "1.15fr .85fr") + ";gap:1.4rem;padding:2.4rem 2rem;border-bottom:1px solid var(--border-soft);align-items:center;text-align:" + (recipe.stakes === 1 ? "center" : "left")) }><div style={{ order: recipe.stakes === 2 && !mobile ? 2 : 1 }}><div style={css("font-size:.66rem;text-transform:uppercase;letter-spacing:.08em;color:" + ACCENT)}>The stakes</div><h3 style={css("margin:.4rem 0 0;font-size:1.45rem;line-height:1.18;letter-spacing:-.015em;font-weight:500")}>{problem.heading}</h3><p style={css("margin:.65rem 0 0;font-size:.82rem;line-height:1.6;color:var(--fg-muted)")}>{problem.body}</p></div><aside style={{ ...css("border-radius:" + (recipe.stakes === 2 ? "26px 10px 26px 10px" : "18px") + ";background:var(--surface-alt);border:1px solid var(--border-soft);padding:1.25rem;text-align:left"), order: recipe.stakes === 2 && !mobile ? 1 : 2 }}><div style={css("font-size:.64rem;text-transform:uppercase;letter-spacing:.08em;color:var(--fg-faint)")}>The decision</div><div style={css("font-size:1.05rem;line-height:1.35;font-weight:500;margin-top:.45rem")}>“Why should I choose this—and why now?”</div><div style={css("font-size:.72rem;line-height:1.5;color:var(--fg-muted);margin-top:.55rem")}>Because the right choice should feel clear before you buy.</div></aside></section>
      <div data-report-wireframe-block data-section-layout={`benefits-${recipe.benefits}`} style={css("padding:1.7rem 1.5rem;text-align:" + (recipe.benefits === 1 ? "left" : "center") + ";border-bottom:1px solid var(--border-soft)")}>
        <div style={css("font-size:1.15rem;font-weight:500")}>{bp.benefits.heading}</div>
        <div style={css("display:grid;grid-template-columns:" + (mobile || recipe.benefits === 2 ? "1fr" : recipe.benefits === 1 ? "1.2fr .9fr .9fr" : "repeat(3,1fr)") + ";gap:1.1rem;margin-top:1.15rem")}>
          {bp.benefits.items.map((v: any, index: number) => <div key={v.h} style={css("display:flex;flex-direction:" + (recipe.benefits === 2 ? "row" : "column") + ";align-items:" + (recipe.benefits === 2 ? "flex-start" : "stretch") + ";gap:.45rem;text-align:left;padding:1rem;border:1px solid var(--border-soft);border-radius:" + (recipe.benefits === 1 && index === 0 ? "20px 8px 20px 8px" : "14px") + ";background:" + (index === 0 ? "color-mix(in srgb,var(--accent-soft) 38%,var(--surface) 62%)" : "var(--surface)"))}><span style={css("font-size:.63rem;color:" + ACCENT + ";font-weight:600")}>0{index + 1}</span><div style={css("flex:1")}><div style={css("font-size:0.9rem;font-weight:500")}>{v.h}</div><div style={css("font-size:0.76rem;color:var(--fg-muted);line-height:1.5;margin-top:.25rem")}>{v.b}</div></div></div>)}
        </div>
      </div>
      <div data-report-wireframe-block data-section-layout={`audience-${recipe.audience}`} style={css("padding:1.7rem 1.5rem;text-align:" + (recipe.audience === 1 ? "left" : "center") + ";border-bottom:1px solid var(--border-soft);background:" + (recipe.audience === 2 ? "var(--surface-alt)" : "var(--surface)"))}>
        <div style={css("font-size:1.15rem;font-weight:500")}>{bp.forwho.heading}</div>
        <div style={css("display:grid;grid-template-columns:" + (mobile || recipe.audience === 1 ? "1fr" : recipe.audience === 2 ? "1.15fr .85fr 1.15fr" : "repeat(3,1fr)") + ";justify-content:center;gap:0.9rem;margin-top:1.15rem")}>
          {bp.forwho.items.map((v: any, index: number) => <div key={v.h} style={css("flex:1;border:" + (recipe.audience === 1 ? "1px solid var(--border-soft)" : "0") + ";border-top:" + (recipe.audience === 1 ? "1px solid var(--border-soft)" : "2px solid " + ACCENT) + ";border-radius:" + (recipe.audience === 1 ? "14px" : "0") + ";padding:" + (recipe.audience === 1 ? ".9rem 1rem" : "1rem .4rem .2rem") + ";display:grid;grid-template-columns:" + (recipe.audience === 1 && !mobile ? "2.2rem minmax(0,1fr)" : "1fr") + ";gap:" + (recipe.audience === 1 ? ".2rem .7rem" : ".35rem") + ";text-align:left;background:" + (recipe.audience === 1 && index === 0 ? "color-mix(in srgb,var(--accent-soft) 34%,var(--surface) 66%)" : "transparent"))}><span style={css("display:" + (recipe.audience === 1 ? "grid" : "none") + ";grid-row:1 / span 2;width:2rem;height:2rem;border-radius:50%;place-items:center;background:var(--accent-soft);color:" + ACCENT + ";font-size:.66rem;font-weight:600")}>0{index + 1}</span><div style={css("font-size:0.86rem;font-weight:500")}>{v.h}</div><div style={css("font-size:0.74rem;color:var(--fg-muted);line-height:1.5")}>{v.b}</div></div>)}
        </div>
      </div>
      <section data-report-wireframe-block data-section-layout={`details-${recipe.details}`} style={css("padding:1.7rem 1.5rem;border-bottom:1px solid var(--border-soft)") }><div style={css("font-size:1.15rem;font-weight:500;text-align:" + (recipe.details === 2 ? "left" : "center"))}>{features.heading}</div><div style={css("display:grid;grid-template-columns:" + (mobile || recipe.details === 2 ? "1fr" : recipe.details === 1 ? "repeat(3,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))") + ";gap:.7rem;margin-top:1rem")}>{features.items.map((item: any, index: number) => <div key={item.h} style={css("border:1px solid var(--border-soft);border-radius:" + (recipe.details === 1 && index % 3 === 0 ? "18px" : "10px") + ";padding:.85rem;background:" + (recipe.details === 1 && index % 2 === 0 ? "var(--surface-alt)" : "var(--surface)") + ";display:" + (recipe.details === 2 ? "grid" : "block") + ";grid-template-columns:minmax(9rem,.6fr) 1.4fr;gap:.8rem;align-items:start") }><div style={css("font-size:.84rem;font-weight:500")}>{item.h}</div><div style={css("font-size:.74rem;line-height:1.45;color:var(--fg-muted);margin-top:" + (recipe.details === 2 ? "0" : ".25rem"))}>{item.b}</div></div>)}</div></section>
      <PromotionBanner promotion={promotions[1]} variant={recipe.promoMid} mobile={mobile} position="promoMid" />
      <section data-report-wireframe-block data-section-layout={`process-${recipe.process}`} style={css("padding:1.7rem 1.5rem;border-bottom:1px solid var(--border-soft);text-align:" + (recipe.process === 1 ? "left" : "center") + ";background:" + (recipe.process === 1 ? "var(--surface-alt)" : "var(--surface)")) }><div style={css("font-size:1.15rem;font-weight:500")}>{process.heading}</div><div style={css("display:grid;grid-template-columns:" + (mobile || recipe.process === 1 ? "1fr" : recipe.process === 2 ? "1fr 1.2fr 1fr" : "repeat(3,1fr)") + ";gap:.8rem;margin-top:1rem")}>{process.items.map((item: any, index: number) => <div key={item.h} style={css("border:1px solid " + (recipe.process === 2 && index === 1 ? ACCENT : "var(--border-soft)") + ";border-left:" + (recipe.process === 1 ? "3px solid " + ACCENT : "1px solid " + (recipe.process === 2 && index === 1 ? ACCENT : "var(--border-soft)")) + ";border-radius:" + (recipe.process === 1 ? "14px" : "12px") + ";padding:" + (recipe.process === 1 ? ".85rem 1rem" : "1rem") + ";text-align:left;background:" + (recipe.process === 2 && index === 1 ? "var(--accent-soft)" : "var(--surface)")) }><span style={css("font-size:.65rem;color:" + ACCENT + ";font-weight:600")}>0{index + 1}</span><div style={css("font-size:.86rem;font-weight:500;margin-top:.25rem")}>{item.h}</div><div style={css("font-size:.74rem;color:var(--fg-muted);line-height:1.45;margin-top:.2rem")}>{item.b}</div></div>)}</div></section>
      <div data-report-wireframe-block data-section-layout={`testimonial-${recipe.testimonial}`} style={css("padding:2.1rem 1.8rem;border-bottom:1px solid var(--border-soft);text-align:" + (recipe.testimonial === 2 ? "left" : "center") + ";background:" + (recipe.testimonial === 2 ? "var(--surface-alt)" : "var(--surface)"))}>
        <div style={css("font-size:1.15rem;font-weight:500;text-align:center")}>{bp.testimonials.heading}</div>
        <div style={css("margin:1.15rem auto 0;max-width:" + (recipe.testimonial === 2 ? "100%" : "42rem") + ";border:1px dashed color-mix(in srgb,var(--accent) 42%,var(--border) 58%);border-radius:" + (recipe.testimonial === 1 ? "28px" : "18px") + ";padding:1.4rem;display:flex;flex-direction:" + (recipe.testimonial === 1 ? "column" : "row") + ";gap:1.1rem;align-items:center;background:color-mix(in srgb,var(--accent-soft) 25%,var(--surface) 75%)")}>
          <div style={css("width:3.4rem;height:3.4rem;border-radius:50%;border:1px dashed var(--accent);background:var(--surface);flex-shrink:0")} />
          <div style={css("flex:1;text-align:" + (recipe.testimonial === 1 ? "center" : "left"))}><div style={css("font-size:.92rem;color:var(--fg);line-height:1.5")}>{bp.testimonials.quote}</div><div style={css("font-size:0.7rem;color:var(--fg-muted);margin-top:0.55rem")}>{bp.testimonials.author} · {bp.testimonials.metric}</div></div>
        </div>
      </div>
      <section data-report-wireframe-block data-section-layout={`offer-${recipe.offer}`} style={css("padding:2.2rem 1.8rem;border-bottom:1px solid var(--border-soft);background:" + (recipe.offer === 2 ? "var(--accent-soft)" : "var(--fg)") + ";color:" + (recipe.offer === 2 ? "var(--fg)" : "#fff") + ";text-align:" + (recipe.offer === 1 ? "left" : "center")) }><div style={css("font-size:.68rem;text-transform:uppercase;letter-spacing:.09em;color:" + (recipe.offer === 2 ? ACCENT : "color-mix(in srgb,var(--accent) 75%,white 25%)"))}>Everything needed to decide</div><div style={css("font-size:1.4rem;font-weight:500;margin-top:.45rem")}>{offer.heading}</div><p style={css("font-size:.82rem;color:" + (recipe.offer === 2 ? "var(--fg-muted)" : "rgba(255,255,255,.7)") + ";margin:.5rem " + (recipe.offer === 1 ? "0" : "auto") + " 0;max-width:34rem;line-height:1.55")}>{offer.body}</p><div style={css("display:flex;justify-content:" + (recipe.offer === 1 ? "flex-start" : "center") + ";gap:.45rem;flex-wrap:wrap;margin-top:1rem")}>{offer.bullets.map((item: string) => <span key={item} style={css("border:1px solid " + (recipe.offer === 2 ? "var(--border)" : "rgba(255,255,255,.18)") + ";border-radius:999px;background:" + (recipe.offer === 2 ? "var(--surface)" : "rgba(255,255,255,.07)") + ";padding:.4rem .7rem;font-size:.7rem;color:" + (recipe.offer === 2 ? "var(--fg-muted)" : "rgba(255,255,255,.82)"))}>{item}</span>)}</div></section>
      <div data-report-wireframe-block data-section-layout={`price-${recipe.price}`} style={css("padding:2.2rem 1.5rem;text-align:" + (recipe.price === 1 ? "left" : "center") + ";background:" + (recipe.price === 2 ? "var(--surface-alt)" : "var(--surface)"))}>
        <div style={css("font-size:1.15rem;font-weight:500")}>{bp.pricing.heading}</div>
        <div style={css("display:grid;grid-template-columns:1fr;gap:0.9rem;margin:1.15rem " + (recipe.price === 1 ? "0" : "auto") + " 0;max-width:" + (recipe.price === 1 ? "100%" : "28rem"))}>
          {bp.pricing.plans.map((p: any) => (
            <div key={p.name} style={css("flex:1;min-width:0;border:1px solid " + (p.highlight ? ACCENT : "var(--border)") + ";border-radius:" + (recipe.price === 2 ? "28px 10px 28px 10px" : "18px") + ";padding:1.2rem 1.25rem;background:" + (p.highlight ? "color-mix(in srgb,var(--accent) 9%,white 91%)" : "var(--surface)") + ";text-align:left;box-shadow:0 12px 30px color-mix(in srgb,var(--accent) 10%,transparent)")}>
              <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + (p.highlight ? ACCENT : "var(--fg-muted)"))}>{p.name}</div>
              <div style={css("font-size:var(--text-3xl);font-weight:500;line-height:1.1;margin-top:0.15rem")}>{p.price}</div>
              <span style={css("margin-top:0.7rem;display:block;text-align:center;border-radius:var(--radius-pill);padding:0.42rem 0;font-size:0.78rem;font-weight:500;" + (p.highlight ? "background:var(--accent);color:#fff" : "background:var(--surface-alt);color:var(--fg)"))}>{p.cta}</span>
            </div>
          ))}
        </div>
      </div>
      <section data-report-wireframe-block data-section-layout={`faq-${recipe.faq}`} style={css("padding:1.7rem 1.5rem;border-top:1px solid var(--border-soft);background:" + (recipe.faq === 2 ? "var(--surface-alt)" : "var(--surface)")) }><div style={css("font-size:1.15rem;font-weight:500;text-align:" + (recipe.faq === 2 ? "left" : "center"))}>{faq.heading}</div><div style={css("max-width:" + (recipe.faq === 1 ? "100%" : "38rem") + ";margin:1rem auto 0;display:grid;grid-template-columns:" + (!mobile && recipe.faq === 1 ? "repeat(2,1fr)" : "1fr") + ";gap:.6rem")}>{faq.items.map((item: any, index: number) => <div key={item.q} style={css("border:1px solid var(--border-soft);border-radius:" + (recipe.faq === 2 ? "16px" : "10px") + ";padding:" + (recipe.faq === 2 ? ".9rem 1rem" : ".75rem .85rem") + ";background:" + (recipe.faq === 2 ? (index === 0 ? "color-mix(in srgb,var(--accent-soft) 30%,var(--surface) 70%)" : "var(--surface)") : "var(--surface)")) }><div style={css("font-size:.8rem;font-weight:500")}>{item.q}</div><div style={css("font-size:.73rem;color:var(--fg-muted);line-height:1.45;margin-top:.22rem")}>{item.a}</div></div>)}</div></section>
      <section data-report-wireframe-block data-section-layout={`finalCta-${recipe.finalCta}`} style={css("padding:2rem 1.5rem;text-align:" + (recipe.finalCta === 1 ? "left" : "center") + ";background:" + (recipe.finalCta === 2 ? "var(--accent);color:#fff" : recipe.finalCta === 1 ? "var(--surface)" : "var(--accent-soft)")) }><div style={css("font-size:1.25rem;font-weight:500")}>{finalCta.heading}</div><p style={css("font-size:.78rem;margin:.35rem " + (recipe.finalCta === 1 ? "0" : "auto") + " 0;max-width:30rem;color:" + (recipe.finalCta === 2 ? "rgba(255,255,255,.78)" : "var(--fg-muted)"))}>{finalCta.body}</p><span style={css("display:inline-flex;margin-top:.85rem;border-radius:999px;background:" + (recipe.finalCta === 2 ? "#fff" : ACCENT) + ";color:" + (recipe.finalCta === 2 ? ACCENT : "#fff") + ";padding:.55rem 1rem;font-size:.78rem;font-weight:500")}>{finalCta.cta}</span></section>
      <footer data-report-wireframe-block style={css("display:flex;justify-content:space-between;gap:.8rem;flex-wrap:wrap;padding:1rem 1.5rem;border-top:1px solid var(--border-soft);font-size:.7rem;color:var(--fg-muted)") }><strong style={css("color:var(--fg);font-weight:500")}>{footer.brand}</strong><span>{footer.tagline}</span><span>Privacy · Terms · Contact</span></footer>
    </div>
    </div>
  );
}

function CopyModeSwitcher({ uploaded, mobile, children }: { uploaded?: UploadedLandingCopy; mobile: boolean; children: ReactNode }) {
  const [mode, setMode] = useState<"blueprint" | "ready">(() => uploaded ? "ready" : "blueprint");
  const control = (id: "blueprint" | "ready", label: string, disabled = false) => (
    <button type="button" disabled={disabled} aria-pressed={mode === id} onClick={() => setMode(id)} style={css("min-height:2.1rem;border:1px solid " + (mode === id ? ACCENT : "var(--border)") + ";border-radius:999px;background:" + (mode === id ? "color-mix(in srgb,var(--accent) 11%,white 89%)" : "var(--surface)") + ";color:" + (disabled ? "var(--fg-faint)" : mode === id ? ACCENT : "var(--fg-muted)") + ";padding:0 0.8rem;font:inherit;font-size:0.72rem;font-weight:500;cursor:" + (disabled ? "not-allowed" : "pointer") + ";opacity:" + (disabled ? ".65" : "1"))}>{label}</button>
  );
  return (
    <div style={css("display:flex;flex-direction:column;gap:0.75rem")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.7rem;flex-wrap:wrap;border:1px solid var(--border-soft);border-radius:12px;background:var(--surface-alt);padding:0.65rem 0.75rem;max-width:46rem;width:100%;box-sizing:border-box;margin:0 auto")}>
        <div><div style={css("font-size:0.78rem;font-weight:500")}>Copy format</div><div style={css("font-size:0.68rem;color:var(--fg-muted);margin-top:0.1rem")}>{uploaded ? `Using ${uploaded.sourceName}` : "Upload working copy during source review to unlock the page-ready version."}</div></div>
        <div style={css("display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap")}>{control("blueprint", "Blueprint draft")}{control("ready", "Uploaded → page-ready", !uploaded)}</div>
      </div>
      {mode === "blueprint" || !uploaded ? children : (
        <article style={css("max-width:46rem;width:100%;box-sizing:border-box;margin:0 auto;background:var(--surface);border:1px solid var(--border-soft);border-radius:12px;padding:" + (mobile ? "1.3rem 1.4rem" : "2rem 2.4rem 2.4rem"))}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.7rem;flex-wrap:wrap;padding-bottom:1rem")}>
            <div><div style={css("text-transform:uppercase;font-size:0.68rem;letter-spacing:0.04em;color:" + ACCENT)}>Landing-page ready</div><div style={css("font-size:0.72rem;color:var(--fg-muted);margin-top:0.25rem")}>Reformatted from {uploaded.sourceName}; claims and voice kept grounded in the upload.</div></div>
            <span style={css("font-size:0.68rem;font-weight:500;color:var(--success);background:var(--success-soft);border-radius:999px;padding:0.25rem 0.6rem")}>Ready to paste</span>
          </div>
          <section style={css("border-top:1px solid var(--border-soft);padding:1.35rem 0") }>
            <div style={css("font-size:" + (mobile ? "1.45rem" : "1.8rem") + ";font-weight:500;line-height:1.18")}>{uploaded.headline}</div>
            <div style={css("font-size:0.96rem;color:var(--fg-muted);line-height:1.55;margin-top:0.55rem")}>{uploaded.subhead}</div>
            <div style={css("display:inline-flex;margin-top:0.85rem;border-radius:999px;background:" + ACCENT + ";color:#fff;padding:0.55rem 1.05rem;font-size:0.82rem;font-weight:500")}>{uploaded.cta}</div>
          </section>
          {uploaded.sections.map((section, index) => <section key={`${section.label}-${index}`} style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "6rem minmax(0,1fr)") + ";gap:" + (mobile ? ".45rem" : "1.4rem") + ";padding:1.25rem 0;border-top:1px solid var(--border-soft)")}>
            <div><div style={css("font-size:0.74rem;font-weight:500;color:" + ACCENT)}>{String(index + 2).padStart(2, "0")}</div><div style={css("font-size:0.66rem;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-faint);margin-top:.15rem")}>{section.label}</div></div>
            <div><h3 style={css("margin:0;font-size:1.08rem;font-weight:500;line-height:1.3")}>{section.heading}</h3><p style={css("margin:.45rem 0 0;font-size:.88rem;color:var(--fg-muted);line-height:1.65;white-space:pre-line")}>{section.body}</p>{section.bullets.length > 0 && <ul style={css("margin:.7rem 0 0;padding-left:1.1rem;font-size:.84rem;color:var(--fg-muted);line-height:1.6")}>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}</div>
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
    const blueprintDraft = (
      <div style={css("max-width:46rem;margin:0 auto;background:var(--surface);border:1px solid var(--border-soft);border-radius:12px;padding:" + (ctx.mobile ? "1.3rem 1.4rem" : "2rem 2.4rem 2.4rem"))}>
        <div style={css("padding-bottom:0.6rem")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + "")}>Landing page copy</div>
          <div style={css("font-size:var(--text-3xl);font-weight:500;margin-top:0.3rem;line-height:1.2")}>{finalTitle}</div>
          <div style={css("font-size:.78rem;color:var(--fg-muted);margin-top:.3rem")}>Prepared for {d.name}</div>
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
        {row(6, "06", "Build stack", <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem 0.55rem")}>{toolItems.map((t: string) => <span key={t} className="pt-badge" style={css("font-size:var(--text-md);padding:0.22rem 0.7rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill)")}>{t}</span>)}</div>)}
        {row(7, "07", bp.pricing.heading, <div>{bp.pricing.plans.map((p: any) => <div key={p.name} style={css("display:flex;justify-content:space-between;align-items:baseline;padding:0.55rem 0;border-bottom:1px dashed var(--border-soft)")}><div style={css("font-size:0.92rem;color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{p.name}</span> · CTA: {p.cta}</div><div style={css("font-size:1.05rem;font-weight:500;white-space:nowrap")}>{p.price}</div></div>)}</div>)}
        {row(8, "08", bp.faq.heading, <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>{bp.faq.items.map((q: any) => <div key={q.q}><div style={css("font-size:0.92rem;font-weight:500")}>{q.q}</div><div style={css("font-size:var(--text-md);color:var(--fg-muted);line-height:1.55;margin-top:0.2rem")}>{q.a}</div></div>)}</div>)}
        {row(9, "09", "Footer", <div style={css("font-size:0.9rem;color:var(--fg-muted);line-height:1.55")}>{bp.footer.tagline} Follow us on social.</div>)}
      </div>
    );
    return <CopyModeSwitcher uploaded={d.uploadedLandingCopy} mobile={ctx.mobile}>{blueprintDraft}</CopyModeSwitcher>;
  }

  if (stageKey === "wireframe") {
    return sec(reveal, 1) ? <WireframeDoc bp={bp} docs={d} mobile={ctx.mobile} /> : <div style={css("padding:var(--space-8);text-align:center;color:var(--fg-faint);font-size:0.85rem")}>Drafting the wireframe…</div>;
  }

  // brief — combined one-page development plan
  return (
    <div data-report-plan-body style={css("max-width:46rem;margin:0 auto;background:var(--surface);border:1px solid var(--border-soft);border-radius:12px;padding:" + (ctx.mobile ? "1.4rem" : "1.9rem 2.2rem 2.2rem") + ";display:flex;flex-direction:column;gap:var(--space-6);overflow:hidden")}>
      {sec(reveal, 1) && (
        <div data-report-section="overview" style={{ animation: "cocoonFade .4s ease both" }}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + "")}>Development plan</div>
          <div style={css("font-size:var(--text-3xl);font-weight:500;margin-top:0.3rem;line-height:1.2")}>{d.name}</div>
          <div style={css("font-size:var(--text-base);color:var(--fg-faint);margin-top:0.3rem")}>Final design, build plan and launch checklist — everything to ship, on one page</div>
          <div data-report-summary-grid style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(11.5rem,1fr));gap:var(--space-2);margin-top:1.1rem")}>
            {d.brief.map(b => <div data-report-card key={b.label} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.6rem 0.8rem")}><div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>{b.label}</div><div style={css("font-size:0.83rem;margin-top:0.22rem;line-height:1.4")}>{b.value}</div></div>)}
          </div>
        </div>
      )}
      {sec(reveal, 1) && recommendations.length > 0 && (
        <div data-report-section="recommendations" style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>Our recommendations</div>
          <div style={css("font-size:0.8rem;color:var(--fg-faint);margin-top:0.3rem")}>What we’d do with this funnel — and why — drawn from your answers.</div>
          <div style={css("display:flex;flex-direction:column;gap:0.55rem;margin-top:0.95rem")}>
            {recommendations.map(r => (
              <div data-report-card key={r.area} style={css("display:flex;gap:0.7rem;align-items:flex-start;padding:0.75rem 0.9rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt)")}>
                <span style={css("width:1.5rem;height:1.5rem;flex-shrink:0;border-radius:7px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT + ";display:grid;place-items:center;margin-top:0.05rem")}><Icon name="arrow" size={12} /></span>
                <div style={css("font-size:0.85rem;line-height:1.5;color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{r.area}</span> — {r.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {sec(reveal, 2) && (
        <div data-report-section="wireframe" style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>01 · Final Design</div>
          <div style={css("margin-top:0.85rem")}><WireframeDoc bp={bp} docs={d} mobile={ctx.mobile} compact /></div>
        </div>
      )}
      {sec(reveal, 3) && (
        <div data-report-section="build" style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>02 · Build</div>
          <div style={css("display:flex;flex-direction:column;gap:var(--space-2);margin-top:0.85rem")}>
            {d.plan.map(p => <div data-report-card key={p.phase} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.7rem 0.9rem;display:flex;align-items:center;gap:var(--space-2)")}><span style={css("font-size:0.64rem;font-weight:500;padding:0.12rem 0.45rem;border-radius:999px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT + ";flex-shrink:0")}>{p.phase}</span><span style={css("flex:1;font-size:0.85rem;font-weight:500")}>{p.title}</span><span style={css("font-size:0.68rem;color:var(--fg-faint)")}>{p.owner}</span></div>)}
          </div>
        </div>
      )}
      {sec(reveal, 4) && (
        <div data-report-section="launch" style={css("border-top:1px solid var(--border-soft);padding-top:1.3rem")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT)}>03 · Launch</div>
          <div style={css("font-size:var(--text-base);color:var(--fg-faint);margin-top:0.35rem")}>What we wire up to take it live.</div>
          <div style={css("display:flex;flex-direction:column;gap:0.4rem;margin-top:0.85rem")}>
            {d.launch.map(l => <div data-report-card key={l.label} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.65rem 0.9rem;display:flex;align-items:center;gap:0.7rem")}><span style={css("width:0.5rem;height:0.5rem;border-radius:50%;background:" + ACCENT + ";flex-shrink:0")} /><span style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);width:9rem;flex-shrink:0")}>{l.label}</span><span style={css("flex:1;font-size:0.85rem;min-width:0;overflow-wrap:anywhere")}>{l.value}</span></div>)}
          </div>
        </div>
      )}
      {reveal === Number.POSITIVE_INFINITY && (
        <div data-report-actions style={css("border-top:1px solid var(--border-soft);padding-top:1.2rem;display:flex;gap:var(--space-2);flex-wrap:wrap")}>
          <button type="button" onClick={ctx.onDownload} className="pt-softbtn" style={css("border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.45rem 1rem;font-size:0.8rem;cursor:pointer;font-family:inherit")}>⤢ Print / save PDF</button>
          <button type="button" onClick={ctx.onCopy} className="pt-softbtn" style={css("border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.45rem 1rem;font-size:0.8rem;cursor:pointer;font-family:inherit")}>Copy brief</button>
          <button type="button" onClick={ctx.onShare} className="pt-op" style={css("margin-left:auto;border:none;border-radius:var(--radius-pill);background:" + ACCENT + ";color:#fff;padding:0.45rem 1.1rem;font-size:0.8rem;font-weight:500;cursor:pointer;font-family:inherit")}>↗ Share with client</button>
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
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;animation:cocoonFade .4s ease both")}>
      <div style={css("padding:1.6rem 1.7rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
        <div onClick={ctx.onBack} style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:0.76rem;color:var(--fg-muted);cursor:pointer;margin-bottom:0.9rem")}>← Back to development plan</div>
        <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + ";margin-bottom:0.3rem")}>Overall plan</div>
        <h2 style={css("margin:0;font-size:var(--text-3xl);font-weight:500;line-height:1.18")}>Turn {cap(d.objective)} into a live funnel</h2>
        <p style={css("margin:0.4rem 0 0;font-size:0.85rem;color:var(--fg-muted);line-height:1.5;max-width:36rem")}>{finalResult?.summary || `The ${d.ftype.toLowerCase()} direction for ${d.name} is approved and ready to move into design, build, and launch.`}</p>
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
        <div style={css("flex:1;min-width:0")}><div style={css("font-size:0.9rem;font-weight:600;line-height:1.2")}>Client</div><div style={css("font-size:0.68rem;color:var(--fg-muted);margin-top:0.08rem")}>Development plan · Prepared by Baltz Studio</div></div>
      </div>
      <div style={css("height:2px;background:" + ACCENT + ";border-radius:2px;margin-bottom:0.9rem")} />
      <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + ";margin-bottom:0.5rem")}>Final design</div>
      <div style={css("border:1px solid var(--border-soft);border-radius:10px;overflow:hidden")}>
        <div style={css("display:flex;align-items:center;gap:0.55rem;padding:0.45rem 0.7rem;border-bottom:1px solid var(--border-soft)")}><span style={css("width:0.8rem;height:0.8rem;border-radius:4px;background:var(--fg)")} /><span style={css("font-size:0.62rem;font-weight:600")}>Aurora</span><span style={css("flex:1")} /><span style={css("background:var(--accent);color:#fff;font-size:0.54rem;font-weight:600;padding:0.2rem 0.5rem;border-radius:999px")}>Get started</span></div>
        <div style={css("text-align:center;padding:1rem 0.9rem;border-bottom:1px solid var(--border-soft)")}><div style={css("font-size:0.86rem;font-weight:600;max-width:14rem;margin:0 auto;line-height:1.25")}>Calmer skin in two weeks, guaranteed.</div><div style={css("font-size:0.64rem;color:var(--fg-muted);margin-top:0.3rem")}>A 3-step ritual set, made simple.</div><span style={css("display:inline-block;margin-top:0.5rem;background:var(--accent);color:#fff;font-size:0.62rem;font-weight:600;padding:0.35rem 0.9rem;border-radius:999px")}>Claim my bundle</span><div style={css("margin:0.6rem auto 0;max-width:15rem;height:2.6rem;border-radius:8px;background:var(--accent-soft)")} /></div>
        <div style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:0.55rem;padding:var(--space-3)")}>{[0, 1, 2].map(i => <div key={i}><div style={css("width:1.3rem;height:1.3rem;border-radius:6px;background:color-mix(in srgb,var(--accent) 14%,white 86%);margin-bottom:0.3rem")} /><div style={css("height:0.38rem;border-radius:3px;background:var(--border);margin-bottom:0.22rem")} /><div style={css("height:0.38rem;width:60%;border-radius:3px;background:var(--border-soft)")} /></div>)}</div>
      </div>
      <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ACCENT + ";margin:0.9rem 0 0.5rem")}>Build — phases</div>
      <div style={css("display:flex;flex-direction:column;gap:0.35rem")}>
        {["Design & wireframe", "Build", "Launch"].map((t, i) => <div key={t} style={css("display:flex;align-items:center;gap:var(--space-2);border:1px solid var(--border-soft);border-radius:8px;padding:0.45rem 0.65rem")}><span style={css("font-size:0.56rem;font-weight:700;padding:0.1rem 0.38rem;border-radius:999px;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:" + ACCENT)}>{"0" + (i + 1)}</span><span style={css("flex:1;font-size:var(--text-xs);font-weight:500")}>{t}</span><span style={css("font-size:0.6rem;color:var(--fg-faint)")}>Studio</span></div>)}
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
