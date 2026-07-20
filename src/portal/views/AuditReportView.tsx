"use client";

import { useMemo, useState } from "react";
import { portalClientId } from "@/lib/portalWorkspacePersistence";
import { Icon } from "../icons";
import { css } from "../helpers";
import { CategoryBars } from "../components/AuditCharts";
import { STUDIO_CLIENTS } from "../clients";
import type { PortalActions, PortalState } from "../store";
import type { Priority, TaskImportDraft } from "../types";

export interface Theme { name: string; score: number; target: number; band: string; summary: string; findings: string[]; rec: string }
interface AuditReportData {
  overall: number;
  target: number;
  headline: string;
  sprintIntro: string;
  themes: Theme[];
}

const REPORTS: Record<string, AuditReportData> = {
  bloom: {
    overall: 65,
    target: 84,
    headline: "Fair foundation",
    sprintIntro: "Two areas are holding your score back. A one-week sprint tackles them first.",
    themes: [
      { name: "Brand Foundation", score: 84, target: 90, band: "Strong", summary: "Clear positioning; logo & story hold up well.", findings: ["Positioning statement is distinct and memorable", "Logo works across light and dark backgrounds", "Origin story lands emotionally on the About page"], rec: "Maintain — carry this clarity into weaker areas." },
      { name: "Messaging & Voice", score: 61, target: 85, band: "Needs work", summary: "Value prop is buried below the fold on key pages.", findings: ["Value proposition sits below the fold on 3 key pages", "Tone drifts between playful and formal across sections", "No single, repeated tagline anchoring the brand"], rec: "Rewrite hero messaging; set one voice guide." },
      { name: "Visual Identity", score: 78, target: 88, band: "Good", summary: "Consistent palette; type hierarchy could be bolder.", findings: ["Colour palette applied consistently sitewide", "Type hierarchy is flat — headings and body too close", "Imagery style is cohesive and on-brand"], rec: "Introduce a bolder display scale for headings." },
      { name: "Website Experience", score: 55, target: 86, band: "Needs work", summary: "Navigation is deep; mobile menu hides primary actions.", findings: ["Primary actions are buried in a deep nav", "Mobile menu hides the main CTA behind two taps", "Page load is slow on the gallery pages"], rec: "Flatten nav; surface key actions on mobile." },
      { name: "Conversion Path", score: 48, target: 84, band: "Priority", summary: "No clear CTA on 4 of 6 landing pages.", findings: ["4 of 6 landing pages have no clear call to action", "Contact form asks for 9 fields — high drop-off", "No trust signals near the point of decision"], rec: "Add one primary CTA per page; trim the form." },
      { name: "Findability", score: 66, target: 82, band: "Good", summary: "Solid basics; missing meta & alt text in places.", findings: ["Core pages are indexed and titled well", "Meta descriptions and alt text missing in places", "No structured data on services or reviews"], rec: "Fill meta gaps; add service schema." },
    ],
  },
  flora: {
    overall: 72,
    target: 88,
    headline: "Strong visual pull",
    sprintIntro: "The florals already feel premium. The sprint should focus on booking clarity and stronger search visibility.",
    themes: [
      { name: "Brand Foundation", score: 82, target: 90, band: "Strong", summary: "The studio point of view is clear and aspirational.", findings: ["The brand promise lands fast on the homepage", "The product mix reinforces a premium perception", "Seasonal collections already feel cohesive"], rec: "Keep the positioning steady while sharpening proof." },
      { name: "Messaging & Voice", score: 74, target: 87, band: "Good", summary: "The tone is elegant, but service benefits could be clearer.", findings: ["Collection language feels polished and elevated", "Copy leans descriptive before clarifying practical outcomes", "FAQ answers could do more reassurance work"], rec: "Tighten service-first copy on booking and delivery surfaces." },
      { name: "Visual Identity", score: 88, target: 92, band: "Strong", summary: "The art direction already feels refined and ownable.", findings: ["Photography and palette feel consistent across the site", "Typography reinforces the product aesthetic", "Packaging visuals reinforce quality"], rec: "Protect the art direction and use it to anchor landing-page updates." },
      { name: "Website Experience", score: 69, target: 86, band: "Good", summary: "Navigation is calm, but key paths take too many steps.", findings: ["Delivery details are not visible early enough", "Mobile shoppers need faster paths into popular collections", "Booking and care info are separated too far apart"], rec: "Shorten the path to purchase and pull trust details higher." },
      { name: "Conversion Path", score: 58, target: 85, band: "Needs work", summary: "The path from browsing to booking is still too soft.", findings: ["Primary CTAs compete with secondary collection browsing", "Consultation and order-next-step messaging feels passive", "There is limited urgency around booking windows"], rec: "Clarify the main conversion path and make booking the obvious next step." },
      { name: "Findability", score: 63, target: 84, band: "Needs work", summary: "Search basics are present, but local discovery is underpowered.", findings: ["Collection pages need richer metadata", "Location intent is weak on key service pages", "Image alt text is inconsistent"], rec: "Rebuild local SEO signals around delivery areas and signature services." },
    ],
  },
  hazel: {
    overall: 79,
    target: 91,
    headline: "Healthy momentum",
    sprintIntro: "Most of the foundation is solid. The best next move is tightening conversion cues without disrupting what already works.",
    themes: [
      { name: "Brand Foundation", score: 86, target: 92, band: "Strong", summary: "The studio positioning already feels assured and distinctive.", findings: ["The brand story is emotionally consistent", "Service hierarchy is easy to understand", "Offer framing feels premium without overexplaining"], rec: "Keep the strategic framing intact as you refine the weaker pages." },
      { name: "Messaging & Voice", score: 80, target: 90, band: "Good", summary: "Copy is warm and expert-led, with only a few dull patches.", findings: ["Hero and about-page voice feel aligned", "Benefit language stays grounded and persuasive", "A few service sections drift toward generic phrasing"], rec: "Sharpen the service-page copy so every page sounds equally ownable." },
      { name: "Visual Identity", score: 83, target: 90, band: "Strong", summary: "The visual system is steady and polished across the main pages.", findings: ["Spacing and color treatment feel intentional", "Backing imagery fits the brand promise", "Buttons and form components stay visually consistent"], rec: "Carry the same polish into smaller utility pages." },
      { name: "Website Experience", score: 76, target: 88, band: "Good", summary: "The site is easy to use, but a few friction points still cost attention.", findings: ["Core navigation is straightforward", "Secondary pages create extra scroll before action", "Mobile form spacing could be lighter"], rec: "Trim friction in the surrounding flows instead of overhauling the core structure." },
      { name: "Conversion Path", score: 67, target: 86, band: "Good", summary: "The offer path is sensible, but action moments could feel more decisive.", findings: ["Main CTAs are visible but not always reinforced", "Trust elements are present but not concentrated near decision points", "Service pages could surface outcomes faster"], rec: "Make the decision path feel more guided and more obviously outcome-led." },
      { name: "Findability", score: 71, target: 84, band: "Good", summary: "The basics are in place, but search intent can be made more explicit.", findings: ["Page titles are generally clean", "Service-specific metadata is only partially filled out", "Internal linking could do more to reinforce priority pages"], rec: "Strengthen the search layer around your highest-value pages." },
    ],
  },
  wren: {
    overall: 68,
    target: 86,
    headline: "Clear craft, uneven path",
    sprintIntro: "The visual quality is there, but the path from interest to inquiry still asks the client to do too much work.",
    themes: [
      { name: "Brand Foundation", score: 81, target: 90, band: "Strong", summary: "The brand world feels memorable and highly crafted.", findings: ["The studio perspective feels distinctive", "The offer positioning is niche in a helpful way", "The brand story already reinforces premium pricing"], rec: "Keep the distinctiveness and use it to make the offer even easier to buy." },
      { name: "Messaging & Voice", score: 59, target: 84, band: "Needs work", summary: "The copy sounds beautiful, but it sometimes obscures the practical offer.", findings: ["Headlines prioritize atmosphere over clarity", "The core offer takes too long to decode", "Process copy assumes too much prior trust"], rec: "Balance the poetic tone with more direct, benefit-led framing." },
      { name: "Visual Identity", score: 86, target: 91, band: "Strong", summary: "The visual system is already one of the site’s biggest strengths.", findings: ["The palette feels elevated and cohesive", "Editorial layout choices reinforce the brand", "Photography and whitespace feel intentional"], rec: "Preserve the visual language while simplifying the buying path." },
      { name: "Website Experience", score: 57, target: 85, band: "Needs work", summary: "Key information is buried inside too much exploration.", findings: ["Navigation labels do not always match user intent", "Mobile browsing requires too much back-and-forth", "Inquiry paths are not surfaced often enough"], rec: "Simplify wayfinding and reduce decision fatigue on mobile." },
      { name: "Conversion Path", score: 53, target: 83, band: "Priority", summary: "The site invites curiosity, but not enough confident action.", findings: ["Primary CTAs are sparse in longer sections", "Trust proof is separated from the inquiry moment", "The inquiry path asks for commitment before reassurance"], rec: "Rebuild the inquiry flow so it feels guided, credible, and low-friction." },
      { name: "Findability", score: 72, target: 84, band: "Good", summary: "Search health is decent, but the content structure can do more work.", findings: ["Core pages have solid title coverage", "Image and service metadata are uneven", "Priority offerings need clearer internal linking"], rec: "Back the main offer with stronger semantic structure and metadata coverage." },
    ],
  },
  marigold: {
    overall: 74,
    target: 89,
    headline: "Balanced and credible",
    sprintIntro: "This site already feels trustworthy. The biggest lift comes from making the offer path and authority cues more concentrated.",
    themes: [
      { name: "Brand Foundation", score: 83, target: 91, band: "Strong", summary: "The business feels established and easy to trust.", findings: ["The service framing is confident and mature", "The site speaks clearly to the right client stage", "The story and offer feel aligned"], rec: "Use the strong strategic base to create more decisive conversion moments." },
      { name: "Messaging & Voice", score: 76, target: 88, band: "Good", summary: "The tone is clear and capable, with room for stronger specificity.", findings: ["Most of the site sounds consistent", "Outcome language could be more concrete", "Some pages rely on broad descriptors instead of proof"], rec: "Layer in more specific promise and proof around the highest-value services." },
      { name: "Visual Identity", score: 79, target: 89, band: "Good", summary: "The design is steady, though a touch conservative in places.", findings: ["The palette and typography feel coherent", "Page sections are visually dependable", "A few pages need stronger emphasis hierarchy"], rec: "Add a clearer visual rhythm so key sections stand out faster." },
      { name: "Website Experience", score: 73, target: 87, band: "Good", summary: "The experience is smooth, but key pages could surface the next step earlier.", findings: ["Users can orient themselves quickly", "Some pages bury their strongest proof too low", "Mobile spacing on longer pages feels heavy"], rec: "Tighten the page rhythm and bring action moments higher." },
      { name: "Conversion Path", score: 61, target: 85, band: "Needs work", summary: "The offer is credible, but the invite to act still feels too quiet.", findings: ["Calls to action do not repeat often enough", "Service pages do not always bridge into the next step", "Proof and CTA moments are not closely paired"], rec: "Make each page guide toward a clearer and more repeated next action." },
      { name: "Findability", score: 70, target: 84, band: "Good", summary: "Search readiness is decent and could become a stronger acquisition channel.", findings: ["Core titles and headings are in reasonable shape", "Service page metadata needs a fuller pass", "Location and specialty terms are not used consistently"], rec: "Use search structure to better lift the services that should grow first." },
    ],
  },
  saffron: {
    overall: 60,
    target: 82,
    headline: "Promising but diffuse",
    sprintIntro: "The ingredients are there, but the site needs a tighter offer story and clearer next steps before it can convert confidently.",
    themes: [
      { name: "Brand Foundation", score: 76, target: 88, band: "Good", summary: "The brand intent is visible, but the positioning still needs sharper edges.", findings: ["The ethos feels thoughtful and distinctive", "Service promise is present but not tightly framed", "The story needs a stronger repeated anchor"], rec: "Distill the positioning into a line the whole site can rally around." },
      { name: "Messaging & Voice", score: 58, target: 82, band: "Needs work", summary: "The tone is warm, but the message doesn’t land fast enough.", findings: ["Key headers take too long to clarify the offer", "Benefits are implied instead of stated cleanly", "Voice consistency drops between pages"], rec: "Create a tighter top-line message and repeat it with more discipline." },
      { name: "Visual Identity", score: 74, target: 87, band: "Good", summary: "The visual language is charming, but hierarchy can be stronger.", findings: ["Color use feels considered", "Some pages need more contrast and emphasis", "Spacing choices are not always helping the reading flow"], rec: "Use typography and spacing to make the offer easier to scan." },
      { name: "Website Experience", score: 56, target: 84, band: "Needs work", summary: "The experience feels longer and murkier than it needs to be.", findings: ["Key service information sits too deep in the page", "Users must bounce between pages to piece together next steps", "Mobile rhythm is more fatiguing than helpful"], rec: "Simplify the experience around one strongest path to action." },
      { name: "Conversion Path", score: 47, target: 81, band: "Priority", summary: "The site rarely turns interest into a confident next step.", findings: ["Primary CTA language is too soft", "Proof and reassurance are not concentrated near action", "The site asks for trust before making the value obvious"], rec: "Rebuild the conversion path around one offer, one action, and stronger proof." },
      { name: "Findability", score: 62, target: 80, band: "Good", summary: "There is enough structure to build on, but discovery is still underpowered.", findings: ["Page titles need stronger keyword intent", "Image and schema coverage are incomplete", "Priority pages need clearer internal linking"], rec: "Strengthen search basics once the offer hierarchy is cleaner." },
    ],
  },
  plume: {
    overall: 54,
    target: 79,
    headline: "Early-stage foundation",
    sprintIntro: "This report should stay anchored to the client’s confirmed priorities and current reality.",
    themes: [
      { name: "Brand Foundation", score: 71, target: 86, band: "Good", summary: "The creative taste is there, but the strategic frame still feels early.", findings: ["The studio aesthetic is recognizable", "The offer promise is not yet distilled into one memorable line", "The brand story needs a stronger point of differentiation"], rec: "Lock a sharper brand promise before expanding the site further." },
      { name: "Messaging & Voice", score: 49, target: 80, band: "Priority", summary: "The site hints at the right tone, but the message is still too vague to sell.", findings: ["Headlines describe atmosphere more than the actual offer", "The core service promise is inconsistent across pages", "Proof language is too light for a premium studio"], rec: "Rewrite the top-line message around one clear offer and one clear outcome." },
      { name: "Visual Identity", score: 74, target: 88, band: "Good", summary: "The visual direction is promising, though hierarchy needs more control.", findings: ["The palette feels modern and intentional", "Some sections need stronger contrast and type scale", "Backing imagery is not yet doing enough trust work"], rec: "Use the visual system to emphasize proof and decision points more clearly." },
      { name: "Website Experience", score: 46, target: 82, band: "Priority", summary: "Visitors have to work too hard to understand where to go next.", findings: ["Navigation does not funnel attention toward the main service", "Long-scroll sections bury the strongest information", "Mobile pacing feels heavy and indecisive"], rec: "Tighten the page structure around one primary journey and reduce friction fast." },
      { name: "Conversion Path", score: 42, target: 78, band: "Priority", summary: "There is not yet a confident path from interest to inquiry.", findings: ["Primary calls to action are too sparse and too soft", "The inquiry path lacks enough proof and reassurance", "Key service pages do not clearly ladder into the next step"], rec: "Build a more explicit inquiry path with stronger proof, clearer CTA language, and repeated action moments." },
      { name: "Findability", score: 43, target: 74, band: "Priority", summary: "Search readiness is still very light, which limits discoverability.", findings: ["Metadata coverage is inconsistent", "Service pages do not use strong search intent language", "Image alt text and structured data are still missing"], rec: "Treat SEO as foundational cleanup once the service hierarchy and messaging are aligned." },
    ],
  },
};

const DEFAULT_REPORT = REPORTS.bloom;
export function getAuditReportDetail(clientId: string) {
  return REPORTS[clientId] || DEFAULT_REPORT;
}
export function getAuditReportSummary(clientId: string) {
  const report = REPORTS[clientId] || DEFAULT_REPORT;
  return {
    overall: report.overall,
    target: report.target,
    headline: report.headline,
  };
}
export function getAuditProposalConfig(clientId: string) {
  const report = REPORTS[clientId] || DEFAULT_REPORT;
  const sorted = [...report.themes].sort((a, b) => bandRank[a.band] - bandRank[b.band] || a.score - b.score);
  const priority = sorted.filter(t => t.band === "Priority" || t.band === "Needs work");
  const lines = priority.map(t => {
    const d = t.band === "Priority" ? 2 : (t.target - t.score >= 25 ? 1.5 : 1);
    return {
      name: t.name,
      work: t.rec,
      color: bandColor(t.band),
      daysLabel: (d % 1 ? d.toFixed(1) : String(d)) + (d === 1 ? " day" : " days"),
      days: d,
    };
  });
  const totalDays = lines.reduce((a, line) => a + line.days, 0);
  return {
    scoreNow: report.overall,
    scoreTarget: report.target,
    headline: report.headline,
    lines,
    sprintDays: (totalDays % 1 ? totalDays.toFixed(1) : String(totalDays)),
    priorityCount: priority.length,
  };
}
const bandColor = (b: string) => ({ Strong: "var(--success)", Good: "var(--iff)", "Needs work": "var(--warn)", Priority: "var(--danger)" }[b] || "var(--fg-muted)");
const bandRank: Record<string, number> = { Priority: 0, "Needs work": 1, Good: 2, Strong: 3 };
const pill = (b: string) => css("display:inline-flex;align-items:center;font-size:0.62rem;font-weight:500;padding:0.12rem 0.5rem;border-radius:999px;background:color-mix(in srgb," + bandColor(b) + " 16%,white 84%);color:color-mix(in srgb," + bandColor(b) + " 55%,black 45%)");

// Flat score chip (was a donut ring) — keeps the call sites but drops the
// repeated ring in favour of a tabular number tile that pairs with the bars.
function Ring({ score, band, size }: { score: number; band: string; size: number }) {
  const color = bandColor(band);
  const rem = (size * 0.92).toFixed(2);
  return <span style={css("width:" + rem + "rem;height:" + rem + "rem;border-radius:0.6rem;display:grid;place-items:center;flex-shrink:0;font-weight:500;font-size:" + (size >= 2.7 ? "0.92rem" : "0.78rem") + ";background:color-mix(in srgb," + color + " 14%,var(--surface) 86%);color:" + color + ";font-variant-numeric:tabular-nums")}>{score}</span>;
}

export function recommendationPlan(theme: Theme) {
  const plans: Record<string, string[]> = {
    "Conversion Path": [
      "Choose one primary CTA for each landing page.",
      "Reduce form fields and remove secondary competing actions.",
      "Add trust proof beside the booking or enquiry point.",
    ],
    "Findability": [
      "Rewrite key metadata around service and location intent.",
      "Add missing image alt text on high-intent pages.",
      "Strengthen internal links into the main conversion path.",
    ],
    "Website Experience": [
      "Surface the main action earlier on mobile.",
      "Shorten the route from product interest to purchase.",
      "Pull delivery, care, and proof details closer to decisions.",
    ],
    "Messaging & Voice": [
      "Clarify the hero promise and next-step language.",
      "Tighten service-first copy on booking and delivery surfaces.",
      "Create one voice guide for repeated page sections.",
    ],
    "Brand Foundation": [
      "Protect the current positioning and sharpen supporting proof.",
      "Use customer-facing language to make the promise easier to repeat.",
      "Keep the strongest brand cues consistent across conversion pages.",
    ],
    "Visual Identity": [
      "Anchor landing-page updates with the strongest art direction.",
      "Make typography hierarchy clearer around decision moments.",
      "Keep photography, palette, and packaging cues consistent.",
    ],
  };
  return plans[theme.name] || [theme.rec, ...theme.findings.slice(0, 2)];
}

function auditTaskPriority(band: string): Priority {
  if (band === "Priority") return "high";
  if (band === "Needs work") return "high";
  if (band === "Good") return "med";
  return "low";
}

function auditTaskDue(index: number) {
  const due = new Date();
  due.setDate(due.getDate() + 3 + index * 2);
  return due.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export function getAuditTaskDrafts(clientId: string, clientName: string, themes: Theme[]): TaskImportDraft[] {
  const client = STUDIO_CLIENTS.find(item => item.id === clientId || item.name === clientName);
  const assignee = client?.owner && client.owner !== "Unassigned" ? client.owner : "Trish Baltazar";
  return themes.flatMap((theme, themeIndex) => recommendationPlan(theme).map((title, itemIndex) => {
    const index = themeIndex * 3 + itemIndex;
    return {
      title,
      project: clientName,
      assignee,
      owner: "studio" as const,
      priority: auditTaskPriority(theme.band),
      due: auditTaskDue(index),
      source: "audit" as const,
      sourceId: `audit:${clientId}:${theme.name}:${itemIndex}`,
      milestone: theme.name,
    };
  }));
}

function AuditTaskImportModal({
  clientName,
  drafts,
  selected,
  onToggle,
  onSelectAll,
  onClose,
  onImport,
}: {
  clientName: string;
  drafts: TaskImportDraft[];
  selected: Set<string>;
  onToggle: (sourceId: string) => void;
  onSelectAll: () => void;
  onClose: () => void;
  onImport: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Import audit tasks" onClick={onClose} style={css("position:fixed;inset:0;z-index:100;background:rgba(30,22,15,.42);display:flex;align-items:center;justify-content:center;padding:1rem")}>
      <div onClick={event => event.stopPropagation()} style={css("width:min(42rem,100%);max-height:88vh;overflow:hidden;display:flex;flex-direction:column;border-radius:var(--radius-panel);background:var(--surface);box-shadow:0 1.4rem 4rem rgba(48,34,31,.2)")}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1.2rem 1.3rem;border-bottom:1px solid var(--border-soft)")}>
          <div>
            <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:.03em;color:var(--cocoon);text-transform:uppercase")}>Audit to To-do</div>
            <h2 style={css("margin:.18rem 0 0;font-size:1.25rem;font-weight:500")}>Import recommendations for {clientName}</h2>
            <p style={css("margin:.35rem 0 0;font-size:.8rem;line-height:1.45;color:var(--fg-muted)")}>Selected items become real tasks in Board and Calendar, with milestones shown inside the client details.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="pt-iconbtn" style={css("width:2rem;height:2rem;border-radius:50%;border:1px solid var(--border-soft);background:var(--surface);display:grid;place-items:center;cursor:pointer;color:var(--fg-muted);flex-shrink:0")}><Icon name="x" size={15} /></button>
        </div>
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1.3rem;border-bottom:1px solid var(--border-soft);background:var(--surface-alt)")}>
          <span style={css("font-size:.76rem;color:var(--fg-muted)")}>{selected.size} of {drafts.length} selected</span>
          <button type="button" onClick={onSelectAll} style={css("border:none;background:transparent;color:var(--accent);font-size:.76rem;font-weight:500;cursor:pointer")}>{selected.size === drafts.length ? "Clear all" : "Select all"}</button>
        </div>
        <div style={css("overflow-y:auto;padding:.65rem 1.3rem")}>{drafts.map(draft => {
          const sourceId = draft.sourceId || draft.title;
          const checked = selected.has(sourceId);
          return <button key={sourceId} type="button" onClick={() => onToggle(sourceId)} style={css("width:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:.75rem;padding:.72rem .2rem;border:none;border-bottom:1px solid var(--border-soft);background:transparent;text-align:left;cursor:pointer;color:var(--fg)")}>
            <span style={css("width:1.15rem;height:1.15rem;margin-top:.08rem;border-radius:.32rem;border:1.5px solid " + (checked ? "var(--accent)" : "var(--border)") + ";background:" + (checked ? "var(--accent)" : "var(--surface)") + ";color:#fff;display:grid;place-items:center")}>{checked && <Icon name="checkmark" size={12} />}</span>
            <span><span style={css("display:block;font-size:.82rem;font-weight:500;line-height:1.35")}>{draft.title}</span><span style={css("display:block;margin-top:.18rem;font-size:.68rem;color:var(--fg-faint)")}>{draft.milestone} · due {draft.due}</span></span>
            <span style={css("font-size:.62rem;font-weight:500;padding:.15rem .45rem;border-radius:999px;background:var(--surface-alt);color:var(--fg-muted);text-transform:capitalize")}>{draft.priority}</span>
          </button>;
        })}</div>
        <div style={css("display:flex;justify-content:flex-end;gap:.55rem;padding:1rem 1.3rem;border-top:1px solid var(--border-soft)")}>
          <button type="button" onClick={onClose} style={css("height:2.25rem;padding:0 .95rem;border-radius:999px;border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);font-size:.78rem;font-weight:500;cursor:pointer")}>Cancel</button>
          <button type="button" disabled={!selected.size} onClick={onImport} className="pt-op" style={css("height:2.25rem;padding:0 1rem;border-radius:999px;border:none;background:var(--accent);color:#fff;font-size:.78rem;font-weight:500;cursor:" + (selected.size ? "pointer" : "not-allowed") + ";opacity:" + (selected.size ? "1" : ".45"))}>Import {selected.size} task{selected.size === 1 ? "" : "s"}</button>
        </div>
      </div>
    </div>
  );
}

function PriorityPlanCards({ themes, mobile }: { themes: Theme[]; mobile: boolean }) {
  return (
    <>
      {themes.map(t => {
        const plan = recommendationPlan(t);
        return (
          <div key={t.name} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "0.95rem" : "1.1rem 1.2rem"))}>
            <div style={css("display:flex;align-items:center;gap:var(--space-3);margin-bottom:0.7rem;flex-wrap:" + (mobile ? "wrap" : "nowrap"))}>
              <Ring score={t.score} band={t.band} size={2.8} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={css("font-weight:500;font-size:var(--text-lg)")}>{t.name}</div><span style={{ marginTop: "0.2rem", ...pill(t.band) }}>{t.band}</span></div>
              <div style={css("text-align:right;flex-shrink:0;margin-left:auto")}><div style={css("font-size:0.78rem;color:var(--fg-muted);display:flex;align-items:center;justify-content:flex-end;gap:0.3rem;white-space:nowrap")}>{t.score}<span style={{ color: "var(--cocoon)" }}><Icon name="arrow" size={13} /></span><strong style={{ fontWeight: 500, color: "var(--cocoon)" }}>{t.target}</strong></div><div style={css("font-size:var(--text-2xs);color:var(--success);font-weight:500;white-space:nowrap")}>+{t.target - t.score} projected</div></div>
            </div>
            <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin:0.2rem 0 0.5rem")}>Recommendation plan</div>
            <div style={css("display:flex;flex-direction:column;gap:0.4rem")}>
              {plan.map((item, index) => (
                <div key={item} style={css("display:grid;grid-template-columns:auto minmax(0,1fr);gap:0.55rem;align-items:flex-start;font-size:0.8rem;line-height:1.42;padding:0.58rem 0.68rem;border-radius:0.78rem;background:color-mix(in srgb,var(--cocoon) 6%,var(--surface-alt) 94%);border:1px solid color-mix(in srgb,var(--cocoon) 10%,var(--border-soft) 90%)")}>
                  <span style={css("width:1.25rem;height:1.25rem;border-radius:0.42rem;background:color-mix(in srgb,var(--cocoon) 14%,white 86%);color:var(--cocoon);display:grid;place-items:center;flex-shrink:0;font-size:0.58rem;font-weight:500")}>{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function BrandAuditPanel({ themes, mobile }: { themes: Theme[]; mobile: boolean }) {
  const brandThemes = ["Brand Foundation", "Messaging & Voice", "Visual Identity"]
    .map(name => themes.find(theme => theme.name === name))
    .filter((theme): theme is Theme => !!theme);
  const brandScore = brandThemes.length
    ? Math.round(brandThemes.reduce((total, theme) => total + theme.score, 0) / brandThemes.length)
    : 0;

  return (
    <section data-brand-audit style={css("border:1px solid color-mix(in srgb,var(--cocoon) 24%,var(--border-soft) 76%);border-radius:var(--radius-panel);background:linear-gradient(135deg,color-mix(in srgb,var(--cocoon) 7%,white 93%),var(--surface));padding:" + (mobile ? "1rem" : "1.15rem 1.25rem"))}>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap")}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--cocoon)")}>Brand audit</div>
          <h3 style={css("margin:0.3rem 0 0;font-size:1.05rem;font-weight:500;color:var(--fg)")}>Suggested brand direction</h3>
          <p style={css("margin:0.3rem 0 0;font-size:0.78rem;color:var(--fg-muted);line-height:1.5;max-width:40rem")}>A focused recommendation for how the positioning, voice, and visual system should evolve alongside the website action plan.</p>
        </div>
        <div style={css("min-width:4.2rem;padding:0.55rem 0.7rem;border:1px solid color-mix(in srgb,var(--cocoon) 18%,var(--border-soft) 82%);border-radius:0.8rem;background:rgba(255,255,255,.72);text-align:center")}><div style={css("font-size:1.25rem;font-weight:500;color:var(--cocoon);line-height:1")}>{brandScore}</div><div style={css("font-size:0.62rem;color:var(--fg-faint);margin-top:0.18rem")}>brand score</div></div>
      </div>
      <div style={css("display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:0.55rem;margin-top:0.9rem")}>
        {brandThemes.map(theme => (
          <div key={theme.name} style={css("padding:0.75rem 0.8rem;border:1px solid var(--border-soft);border-radius:0.82rem;background:rgba(255,255,255,.72)")}>
            <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.5rem")}><span style={css("font-size:0.78rem;font-weight:500;color:var(--fg)")}>{theme.name}</span><span style={css("font-size:0.7rem;font-weight:500;color:" + bandColor(theme.band))}>{theme.score}</span></div>
            <div style={css("font-size:0.74rem;color:var(--fg-muted);line-height:1.45;margin-top:0.42rem")}>{theme.rec}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InlineAuditProposal({
  client,
  scoreNow,
  scoreTarget,
  priorityThemes,
  mobile,
  lines,
  sprintDays,
  iffOn,
  sent,
  onToggleIff,
  onSend,
}: {
  client: string;
  scoreNow: number;
  scoreTarget: number;
  priorityThemes: Theme[];
  mobile: boolean;
  lines: ReturnType<typeof getAuditProposalConfig>["lines"];
  sprintDays: string;
  iffOn: boolean;
  sent: boolean;
  onToggleIff?: () => void;
  onSend?: () => void;
}) {
  const deliverables = [
    { icon: "target", title: "Priority fixes", note: "Turn the weakest audit themes into a focused implementation backlog." },
    { icon: "palette", title: "Brand direction", note: "Package positioning, voice, and visual suggestions into a clear brand recommendation." },
    { icon: "edit", title: "Messaging pass", note: "Rewrite the high-leverage sections that are blocking clarity and conversion." },
    { icon: "map", title: "Experience pass", note: "Tighten hierarchy, proof placement, CTA rhythm, and mobile decision flow." },
    { icon: "checklist", title: "Launch handoff", note: "Package the sprint checklist so the team knows what ships and what follows." },
  ];
  const timeline = [
    { label: "Kickoff", note: "Confirm scope and priority order" },
    { label: "Build", note: lines.length + " focused workstreams" },
    { label: "Handoff", note: "QA notes and next-step checklist" },
  ];

  return (
    <section style={css("margin-top:1rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
      <div style={css("padding:1rem 1.2rem 1.2rem;display:flex;flex-direction:column;gap:var(--space-4)")}>
        <div style={css("padding:1.05rem 1.1rem;border:1px solid var(--border-soft);border-radius:0.95rem;background:linear-gradient(135deg,color-mix(in srgb,var(--cocoon) 8%,white 92%),var(--surface));display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "minmax(0,1.15fr) minmax(16rem,0.85fr)") + ";gap:var(--space-4);align-items:stretch")}>
          <div style={css("display:flex;flex-direction:column;gap:0.85rem;min-width:0")}>
            <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;display:flex;align-items:center;gap:0.42rem;color:var(--cocoon)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--cocoon)")} />Build proposal</div>
            <h3 style={css("margin:0.35rem 0 0;font-size:1.25rem;font-weight:500;letter-spacing:-0.015em")}>Winged in a Week for {client}</h3>
            <p style={css("margin:0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.5")}>A focused {sprintDays}-day implementation sprint built from the audit recommendations, with the highest-impact fixes shipped first and a clear handoff at the end.</p>
            <div style={css("display:grid;grid-template-columns:" + (mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))") + ";gap:0.45rem")}>
              {[
                ["Timeline", sprintDays + " days"],
                ["Format", "Sprint"],
                ["Focus", priorityThemes.length + " fixes"],
                ["Delivery", "Handoff"],
              ].map(([label, value]) => (
                <div key={label} style={css("border:1px solid var(--border-soft);border-radius:0.78rem;background:rgba(255,255,255,.7);padding:0.58rem 0.62rem")}>
                  <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>{label}</div>
                  <div style={css("font-size:var(--text-base);font-weight:500;color:var(--fg);margin-top:0.18rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={css("border:1px solid var(--border-soft);border-radius:0.9rem;background:rgba(255,255,255,.72);padding:var(--space-3);display:flex;flex-direction:column;gap:0.65rem;justify-content:space-between")}>
            <div style={css("display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0.4rem")}>
              {[
                ["Now", String(scoreNow), "warn"],
                ["Target", String(scoreTarget), "success"],
                ["Lift", "+" + (scoreTarget - scoreNow), "accent"],
              ].map(([label, value, tone]) => (
                <div key={label} style={css("border:1px solid var(--border-soft);border-radius:0.72rem;background:var(--surface);padding:0.55rem 0.45rem;text-align:center")}>
                  <div style={css("font-size:1rem;font-weight:500;line-height:1;color:var(--" + tone + ")")}>{value}</div>
                  <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-top:0.26rem")}>{label}</div>
                </div>
              ))}
            </div>
            <div style={css("display:flex;flex-direction:column;gap:0.42rem")}>
              {timeline.map((item, index) => (
                <div key={item.label} style={css("display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--space-2);align-items:flex-start")}>
                  <span style={css("width:1.35rem;height:1.35rem;border-radius:50%;background:" + (index === 0 ? "var(--fg)" : "var(--surface-alt)") + ";color:" + (index === 0 ? "#fff" : "var(--fg-muted)") + ";display:grid;place-items:center;font-size:0.58rem;font-weight:500")}>{index + 1}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={css("display:block;font-size:0.76rem;font-weight:500;color:var(--fg)")}>{item.label}</span>
                    <span style={css("display:block;font-size:0.68rem;color:var(--fg-muted);line-height:1.35;margin-top:0.03rem")}>{item.note}</span>
                  </span>
                </div>
              ))}
            </div>
            <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem;border-top:1px solid var(--border-soft);padding-top:0.62rem")}>
              <span style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>Sprint length</span>
              <span style={css("font-size:0.92rem;font-weight:500;color:var(--fg)")}>{sprintDays} working days</span>
            </div>
          </div>
        </div>
        <div style={css("border:1px solid var(--border-soft);border-radius:0.95rem;background:color-mix(in srgb,var(--surface-alt) 72%,white 28%);padding:" + (mobile ? "0.85rem" : "0.9rem 1rem") + ";display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:0.55rem")}>
          {[
            ["Outcome", "Move the score from " + scoreNow + " to " + scoreTarget + " by resolving the weakest audit themes."],
            ["Included", "Copy, hierarchy, CTA path, proof placement, and handoff notes."],
            ["Timing", sprintDays + " working days once scope is approved."],
          ].map(([label, text]) => (
            <div key={label} style={css("display:flex;gap:0.55rem;align-items:flex-start;min-width:0")}>
              <span style={css("width:1.35rem;height:1.35rem;border-radius:0.45rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0")}><Icon name="checkmark" size={12} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>{label}</div>
                <div style={css("font-size:0.74rem;color:var(--fg-muted);line-height:1.45;margin-top:0.08rem")}>{text}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={css("display:flex;flex-direction:column;gap:0.7rem")}>
          <PriorityPlanCards themes={priorityThemes} mobile={mobile} />
        </div>
        <div>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);margin-bottom:0.65rem")}>
            <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;display:flex;align-items:center;gap:0.4rem;color:var(--fg-faint)")}><span style={css("width:0.4rem;height:0.4rem;border-radius:50%;background:var(--warn)")} />Implementation timeline</div>
            <span style={css("font-size:var(--text-xs);color:var(--fg-muted);font-weight:500")}>{sprintDays} working days</span>
          </div>
          <div style={css("display:flex;flex-direction:column;border:1px solid var(--border-soft);border-radius:0.9rem;overflow:hidden")}>
            {lines.map(line => (
              <div key={line.name} style={css("display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:var(--space-3);align-items:flex-start;padding:0.82rem 0.9rem;border-bottom:1px solid var(--border-soft)")}>
                <span style={css("width:1.8rem;height:1.8rem;border-radius:0.55rem;background:color-mix(in srgb," + line.color + " 15%,white 85%);color:" + line.color + ";display:grid;place-items:center")}><Icon name="replay" size={13} /></span>
                <div style={{ minWidth: 0 }}><div style={css("font-size:0.84rem;font-weight:500;color:var(--fg)")}>{line.name}</div><div style={css("font-size:0.74rem;color:var(--fg-muted);line-height:1.45;margin-top:0.1rem")}>{line.work}</div></div>
                <span style={css("font-size:0.7rem;color:var(--fg-faint);font-weight:500;white-space:nowrap")}>{line.daysLabel}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={css("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.7rem")}>
          {deliverables.map(item => (
            <div key={item.title} style={css("border:1px solid var(--border-soft);border-radius:0.9rem;background:var(--surface-alt);padding:0.82rem 0.9rem;display:grid;grid-template-columns:auto minmax(0,1fr);gap:0.65rem;align-items:flex-start")}>
              <span style={css("width:1.8rem;height:1.8rem;border-radius:0.52rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center")}><Icon name={item.icon} size={13} /></span>
              <div><div style={css("font-size:var(--text-base);font-weight:500;color:var(--fg)")}>{item.title}</div><div style={css("font-size:0.73rem;color:var(--fg-muted);line-height:1.45;margin-top:0.1rem")}>{item.note}</div></div>
            </div>
          ))}
        </div>

        <div style={css("display:grid;grid-template-columns:minmax(0,1fr);gap:0.7rem")}>
          <button type="button" onClick={onToggleIff} style={css("display:flex;align-items:center;gap:var(--space-3);text-align:left;padding:0.85rem 0.95rem;border-radius:0.95rem;border:1.5px solid " + (iffOn ? "var(--accent)" : "var(--border-soft)") + ";background:" + (iffOn ? "var(--accent-soft)" : "var(--surface)") + ";cursor:pointer")}>
            <span style={css("width:2rem;height:2rem;border-radius:0.6rem;display:grid;place-items:center;background:" + (iffOn ? "var(--accent)" : "var(--surface-alt)") + ";color:" + (iffOn ? "#fff" : "var(--fg-muted)"))}>{iffOn ? <Icon name="checkmark" size={14} /> : <Icon name="feather" size={14} />}</span>
            <span style={{ flex: 1 }}><span style={css("display:block;font-size:0.84rem;font-weight:500;color:var(--fg)")}>Add In Full Flight</span><span style={css("display:block;font-size:0.74rem;color:var(--fg-muted);margin-top:0.08rem")}>Post-sprint QA, care, and monthly improvements.</span></span>
            <span style={css("font-size:var(--text-base);font-weight:500;color:var(--fg);white-space:nowrap")}>£600/mo</span>
          </button>
          <div style={css("border:1px solid var(--border-soft);border-radius:0.95rem;background:var(--surface-alt);padding:0.85rem 0.95rem;display:flex;align-items:center;justify-content:space-between;gap:var(--space-4)")}>
            <div><div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>Investment</div><div style={css("font-size:1.35rem;font-weight:500;line-height:1.1;margin-top:0.12rem")}>£2,400</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.14rem")}>{iffOn ? "Then £600/mo" : "One-time sprint"}</div></div>
            {sent ? (
              <span style={css("display:inline-flex;align-items:center;gap:0.35rem;height:2.25rem;padding:0 0.9rem;border-radius:999px;background:var(--success-soft);color:var(--success);font-size:0.78rem;font-weight:500")}><Icon name="checkmark" size={14} />Sent</span>
            ) : (
              <button type="button" onClick={onSend} className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.4rem;height:2.25rem;padding:0 1rem;border-radius:999px;border:none;background:var(--accent);color:#fff;font-size:0.78rem;font-weight:500;cursor:pointer")}><Icon name="send" size={14} />Send</button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AuditReportView({
  state,
  actions,
  clientId,
  clientName,
  reportRunLabel,
  reportRunDate,
  onBack,
  initialLayout = "report",
  showInlineProposal = false,
  initialProposalOpen = false,
  proposalIffOn = false,
  proposalSent = false,
  onToggleProposalIff,
  onSendProposal,
}: {
  state: PortalState;
  actions: PortalActions;
  clientId?: string;
  clientName: string;
  reportRunLabel?: string;
  reportRunDate?: string;
  onBack: () => void;
  initialLayout?: "report" | "priority";
  showInlineProposal?: boolean;
  initialProposalOpen?: boolean;
  proposalIffOn?: boolean;
  proposalSent?: boolean;
  onToggleProposalIff?: () => void;
  onSendProposal?: () => void;
}) {
  const [layout, setLayout] = useState<"report" | "priority">(initialProposalOpen ? "priority" : initialLayout);
  const mobile = state.isMobile;
  const report = useMemo(() => REPORTS[clientId || portalClientId(clientName)] || DEFAULT_REPORT, [clientId, clientName]);
  const proposal = useMemo(() => getAuditProposalConfig(clientId || portalClientId(clientName)), [clientId, clientName]);
  const sorted = useMemo(() => [...report.themes].sort((a, b) => bandRank[a.band] - bandRank[b.band] || a.score - b.score), [report]);
  const priority = sorted.filter(t => t.band === "Priority" || t.band === "Needs work");
  const recommendationThemes = sorted;
  const strongCount = report.themes.filter(t => t.band === "Strong" || t.band === "Good").length;
  const weakCount = report.themes.length - strongCount;
  const overallDelta = report.target - report.overall;
  const importDrafts = useMemo(() => getAuditTaskDrafts(clientId || portalClientId(clientName), clientName, sorted), [clientId, clientName, sorted]);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedImports, setSelectedImports] = useState<Set<string>>(() => new Set(importDrafts.map(draft => draft.sourceId || draft.title)));

  const toggleImport = (sourceId: string) => setSelectedImports(current => {
    const next = new Set(current);
    if (next.has(sourceId)) next.delete(sourceId);
    else next.add(sourceId);
    return next;
  });
  const toggleAllImports = () => setSelectedImports(current => current.size === importDrafts.length
    ? new Set()
    : new Set(importDrafts.map(draft => draft.sourceId || draft.title)));
  const importSelectedTasks = () => {
    const selected = importDrafts.filter(draft => selectedImports.has(draft.sourceId || draft.title));
    actions.bulkImportTasks(selected.map(draft => state.role === "client"
      ? { ...draft, assignee: "Client", owner: "client" as const }
      : state.role === "dev" ? { ...draft, assignee: "Kier Mangibin", owner: "studio" as const } : draft));
    setImportOpen(false);
  };

  return (
    <div style={css("width:100%;padding:" + (mobile ? "1rem 0.9rem 1.5rem" : "1.6rem 2rem 2.4rem"))}>
      <div style={css("display:flex;flex-direction:column;gap:" + (mobile ? "0.7rem" : "0.85rem"))}>
      <div style={css("display:flex;align-items:" + (mobile ? "stretch" : "center") + ";justify-content:flex-end;gap:" + (mobile ? "0.65rem" : "1rem") + ";flex-wrap:wrap")}>
        {(reportRunLabel || reportRunDate) && (
          <div style={css("margin-right:auto;display:inline-flex;align-items:center;gap:0.4rem;padding:0.32rem 0.65rem;border:1px solid var(--border-soft);border-radius:999px;background:var(--surface-alt);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500")}>
            <Icon name="checkmark" size={13} />
            <span>{reportRunLabel || "Latest report"}{reportRunDate ? " · " + reportRunDate : ""}</span>
          </div>
        )}
        <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap;width:" + (mobile ? "100%" : "auto"))}>
          <button type="button" onClick={() => setImportOpen(true)} className="pt-op" style={css("display:inline-flex;align-items:center;justify-content:center;gap:.4rem;height:2.1rem;padding:0 .85rem;border-radius:999px;border:none;background:var(--accent);color:#fff;font-size:.76rem;font-weight:500;cursor:pointer;flex:" + (mobile ? "1" : "0 0 auto"))}><Icon name="checkmark" size={13} />Import to To-do</button>
          <div style={css("display:inline-flex;gap:0.2rem;padding:0.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface-alt);width:" + (mobile ? "100%" : "auto"))}>
            <button
              type="button"
              onClick={() => setLayout("report")}
              aria-current={layout === "report" ? "page" : undefined}
              style={css("appearance:none;border:none;cursor:pointer;font-size:0.76rem;font-weight:500;padding:0.32rem 0.72rem;border-radius:var(--radius-pill);flex:" + (mobile ? "1" : "0 0 auto") + ";" + (layout === "report" ? "background:var(--fg);color:#fff" : "background:transparent;color:var(--fg-muted)"))}
            >
              Audit report
            </button>
            <button
              type="button"
              onClick={() => setLayout("priority")}
              aria-current={layout === "priority" ? "page" : undefined}
              style={css("appearance:none;border:none;cursor:pointer;font-size:0.76rem;font-weight:500;padding:0.32rem 0.72rem;border-radius:var(--radius-pill);flex:" + (mobile ? "1" : "0 0 auto") + ";" + (layout === "priority" ? "background:var(--fg);color:#fff" : "background:transparent;color:var(--fg-muted)"))}
            >
              Action plan
            </button>
          </div>
        </div>
      </div>

      {layout === "report" ? (
        <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>
          <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))") + ";gap:0.7rem")}>
            <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "1rem" : "1.2rem 1.25rem") + ";display:flex;align-items:center;gap:" + (mobile ? "0.85rem" : "1.2rem"))}>
              <div style={css("width:" + (mobile ? "4.7rem" : "5.4rem") + ";flex-shrink:0;display:flex;flex-direction:column;gap:0.42rem;padding:0.7rem 0.75rem;border-radius:0.85rem;background:color-mix(in srgb,var(--cocoon) 10%,var(--surface) 90%)")}>
                <div style={css("display:flex;align-items:baseline;gap:0.2rem")}><span style={css("font-size:" + (mobile ? "1.6rem" : "1.85rem") + ";font-weight:500;line-height:0.9;color:var(--cocoon);font-variant-numeric:tabular-nums")}>{report.overall}</span><span style={css("font-size:0.55rem;color:var(--fg-faint)")}>/100</span></div>
                <div style={css("height:0.35rem;border-radius:999px;background:color-mix(in srgb,var(--cocoon) 18%,var(--surface) 82%)")}><div style={css("height:100%;border-radius:999px;width:" + Math.max(2, report.overall) + "%;background:var(--cocoon)")} /></div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Overall Today</div>
                <div style={css("font-size:1.05rem;font-weight:500;margin-top:0.1rem")}>{report.headline}</div>
                <div style={css("display:flex;gap:0.4rem;margin-top:0.6rem;flex-wrap:wrap")}>
                  <span style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.7rem;font-weight:500;padding:0.2rem 0.55rem;border-radius:999px;background:color-mix(in srgb,var(--success) 15%,white 85%);color:color-mix(in srgb,var(--success) 55%,black 45%)")}><span style={css("width:0.45rem;height:0.45rem;border-radius:50%;background:var(--success)")} />{strongCount} strong</span>
                  <span style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.7rem;font-weight:500;padding:0.2rem 0.55rem;border-radius:999px;background:color-mix(in srgb,var(--warn) 16%,white 84%);color:color-mix(in srgb,var(--warn) 52%,black 48%)")}><span style={css("width:0.45rem;height:0.45rem;border-radius:50%;background:var(--warn)")} />{weakCount} need work</span>
                </div>
              </div>
            </div>
            <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:color-mix(in srgb,var(--cocoon) 7%,white 93%);padding:" + (mobile ? "1rem" : "1.2rem 1.25rem") + ";display:flex;flex-direction:column;justify-content:center;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cocoon) 26%,transparent 74%)")}>
              <div style={css("display:flex;align-items:" + (mobile ? "flex-start" : "center") + ";justify-content:space-between;gap:var(--space-3)")}>
                <div>
                  <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Projected after Winged in a Week</div>
                  <div style={css("display:flex;align-items:baseline;gap:var(--space-2);margin-top:0.25rem")}><span style={css("font-size:1.05rem;color:var(--fg-muted);font-weight:500")}>{report.overall}</span><span style={{ color: "var(--cocoon)" }}><Icon name="arrow" size={13} /></span><span style={css("font-size:1.9rem;font-weight:500;line-height:1;color:var(--cocoon)")}>{report.target}</span></div>
                </div>
                <div style={css("text-align:right;flex-shrink:0")}><div style={css("font-size:1.35rem;font-weight:500;color:var(--success);line-height:1")}>+{overallDelta}</div><div style={css("font-size:0.64rem;color:var(--fg-faint)")}>points</div></div>
              </div>
              <div style={css("position:relative;height:0.45rem;border-radius:999px;background:color-mix(in srgb,var(--cocoon) 12%,white 88%);margin-top:0.85rem;overflow:hidden")}><div style={css("position:absolute;inset:0 auto 0 0;width:" + report.overall + "%;background:var(--cocoon);border-radius:999px")} /></div>
            </div>
          </div>

          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "1rem" : "1.1rem 1.25rem"))}>
            <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:1rem;margin-bottom:0.85rem")}><div style={css("font-size:1rem;font-weight:500")}>Category scores</div><span style={css("font-size:0.7rem;color:var(--fg-faint)")}>current → target</span></div>
            <CategoryBars cats={sorted.map(t => ({ label: t.name, score: t.score, target: t.target, color: bandColor(t.band) }))} />
          </div>

          <BrandAuditPanel themes={report.themes} mobile={mobile} />

          <div style={css("display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "repeat(auto-fill,minmax(19rem,1fr))") + ";gap:" + (mobile ? "0.62rem" : "0.75rem"))}>
            {sorted.map(t => {
              const plan = recommendationPlan(t);
              return (
                <div key={t.name} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "0.95rem" : "1.1rem 1.15rem") + ";display:flex;flex-direction:column")}>
                  <div style={css("display:flex;align-items:center;gap:0.8rem")}>
                    <Ring score={t.score} band={t.band} size={3} />
                    <div style={{ minWidth: 0, flex: 1 }}><div style={css("font-weight:500;font-size:0.92rem;line-height:1.2")}>{t.name}</div><span style={{ marginTop: "0.3rem", ...pill(t.band) }}>{t.band}</span></div>
                  </div>
                  <div style={{ marginTop: "0.95rem" }}>
                    <div style={css("position:relative;height:0.4rem;border-radius:999px;background:oklch(0.93 0.008 40)")}><div style={css("position:absolute;inset:0 auto 0 0;height:100%;border-radius:999px;width:" + t.score + "%;background:" + bandColor(t.band))} /><div style={{ position: "absolute", top: "-0.2rem", bottom: "-0.2rem", width: "2px", background: "var(--fg)", opacity: 0.55, left: t.target + "%" }} /></div>
                    <div style={css("display:flex;align-items:center;gap:0.3rem;font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.55rem")}><strong style={{ fontWeight: 500, color: "var(--fg)" }}>{t.score}</strong><Icon name="arrow" size={13} /><span>target {t.target}</span><span style={{ color: "var(--success)", fontWeight: 500, marginLeft: "auto" }}>+{t.target - t.score}</span></div>
                  </div>
                  <div style={css("margin-top:0.85rem;padding-top:0.85rem;border-top:1px solid var(--border-soft)")}>
                    {t.findings.map(f => <div key={f} style={css("display:flex;gap:0.45rem;align-items:flex-start;font-size:0.79rem;color:var(--fg-muted);line-height:1.45;margin-bottom:0.35rem")}><span style={css("width:0.4rem;height:0.4rem;border-radius:50%;flex-shrink:0;margin-top:0.42rem;background:" + bandColor(t.band))} /><span>{f}</span></div>)}
                  </div>
                  <div style={css("margin-top:auto;padding:0.72rem 0.78rem;border-radius:var(--radius);background:var(--surface-alt);display:flex;flex-direction:column;gap:0.42rem")}>
                    <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>Recommendation plan</div>
                    {plan.map((item, index) => (
                      <div key={item} style={css("display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--space-2);align-items:flex-start;font-size:0.78rem;line-height:1.42;color:var(--fg)")}>
                        <span style={css("width:1.1rem;height:1.1rem;border-radius:0.38rem;background:color-mix(in srgb," + bandColor(t.band) + " 15%,white 85%);color:" + bandColor(t.band) + ";display:grid;place-items:center;font-size:0.55rem;font-weight:500;flex-shrink:0")}>{index + 1}</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={css("display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "17rem 1fr") + ";gap:" + (mobile ? "0.65rem" : "0.85rem") + ";align-items:start")}>
          <div style={css("position:" + (mobile ? "static" : "sticky") + ";top:1rem;align-self:start;display:flex;flex-direction:column;gap:0.7rem")}>
            <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "1rem" : "1.2rem") + ";text-align:center")}>
              <div style={{ width: "6rem", height: "6rem", margin: "0 auto", borderRadius: "50%", background: "color-mix(in srgb,var(--cocoon) 14%,white 86%)", border: "0.24rem solid color-mix(in srgb,var(--cocoon) 58%,white 42%)", display: "grid", placeItems: "center" }}>
                <div style={css("width:4.7rem;height:4.7rem;border-radius:50%;background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center")}><span style={css("font-size:1.6rem;font-weight:500;line-height:1")}>{report.overall}</span><span style={css("font-size:0.58rem;color:var(--fg-faint);line-height:1;margin-top:0.15rem")}>/ 100</span></div>
              </div>
              <div style={css("font-size:var(--text-lg);font-weight:500;margin-top:0.7rem")}>{report.headline}</div>
              <div style={css("display:flex;align-items:center;justify-content:center;gap:0.4rem;font-size:0.8rem;color:var(--fg-muted);margin-top:0.5rem")}><span>{report.overall}</span><span style={{ color: "var(--cocoon)" }}><Icon name="arrow" size={13} /></span><span style={{ color: "var(--cocoon)", fontWeight: 500 }}>{report.target}</span><span style={{ color: "var(--success)", fontWeight: 500 }}>+{overallDelta}</span></div>
              <div style={css("font-size:0.68rem;color:var(--fg-faint);margin-top:0.15rem")}>Projected after Winged in a Week</div>
            </div>
            <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:oklch(0.985 0.012 22);padding:" + (mobile ? "0.9rem" : "1rem 1.1rem") + ";box-shadow:inset 0 0 0 1px oklch(0.88 0.04 20 / 0.3)")}>
              <div style={css("font-size:0.8rem;color:var(--fg-muted);line-height:1.5")}>{report.sprintIntro}</div>
              <button onClick={() => { onBack(); actions.setView("funnels"); }} className="pt-op" style={css("margin-top:0.8rem;width:100%;height:2.2rem;border-radius:var(--radius-pill);border:none;background:var(--fg);color:#fff;font-size:0.8rem;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:0.4rem")}>Build a plan <Icon name="arrow" size={13} /></button>
            </div>
          </div>

          <div style={css("display:flex;flex-direction:column;gap:0.7rem;min-width:0")}>
            {!(showInlineProposal || initialProposalOpen) && <PriorityPlanCards themes={recommendationThemes} mobile={mobile} />}
            {(showInlineProposal || initialProposalOpen) && (
              <InlineAuditProposal
                client={clientName}
                scoreNow={proposal.scoreNow}
                scoreTarget={proposal.scoreTarget}
                priorityThemes={recommendationThemes}
                mobile={mobile}
                lines={proposal.lines}
                sprintDays={proposal.sprintDays}
                iffOn={proposalIffOn}
                sent={proposalSent}
                onToggleIff={onToggleProposalIff}
                onSend={onSendProposal}
              />
            )}
          </div>
        </div>
      )}

      </div>
      {importOpen && (
        <AuditTaskImportModal
          clientName={clientName}
          drafts={importDrafts}
          selected={selectedImports}
          onToggle={toggleImport}
          onSelectAll={toggleAllImports}
          onClose={() => setImportOpen(false)}
          onImport={importSelectedTasks}
        />
      )}
    </div>
  );
}
