// Shared client knowledge — the strategic memory that lets onboarding, audits and
// funnels build on each other instead of re-asking the same questions. Answers are
// keyed by the same DiscoveryQuestion `key`s the wizards use, so a fact learned in
// one flow prefills the next.
import type { Ans } from "./DiscoveryBuilder";
import { STUDIO_CLIENTS } from "../clients";
import { emailSlug } from "../data";
import type { PortalClientWorkspace } from "@/lib/portalWorkspacePersistence";

export interface Know { data: Ans; sources: Record<string, string> }

// Richer captured facts on specific clients (onboarding + notes). Keys used here
// mean the same thing in both audit & funnel flows — we avoid `name` because it is
// "business name" in audits but "funnel name" in funnels, so prefilling it would
// mislabel one flow.
const PROFILE_EXTRA: Record<string, Ans> = {
  "blue-ribbon": { nickname: "Ren", platform: "Webflow", persona: "Boutique event planners who need a premium, trustworthy first impression.", objective: "Book calls / applications", problem: "Enquiries stall because the site doesn’t convey the premium service." },
  "feather-tail": { nickname: "Sam", platform: "Shopify", persona: "Pet-owning millennials buying considered, natural pet accessories.", objective: "Sell a product", awareness: "Solution-aware" },
  "kaya-services": { nickname: "Aya", platform: "WordPress", persona: "Facilities managers sourcing reliable commercial services.", objective: "Generate leads" },
  "the-winged-palette": { nickname: "Wren", platform: "Webflow", persona: "Art collectors and interior designers seeking original work." },
};

// Session memory that audit/funnel answers feed into (kept in-module; would persist
// to the client record in production).
const RUNTIME: Record<string, Know> = {};

function baselineFor(clientId: string): Know {
  const data: Ans = {};
  const sources: Record<string, string> = {};
  const set = (k: string, v: string | string[]) => { data[k] = v; sources[k] = "Client profile"; };
  // Every client already has a website on file from onboarding.
  const client = STUDIO_CLIENTS.find(c => c.id === clientId);
  if (client) { const domain = emailSlug(client.name) + ".com"; set("url", domain); set("domain", domain); }
  // Plus any richer captured facts.
  const extra = PROFILE_EXTRA[clientId];
  if (extra) Object.entries(extra).forEach(([k, v]) => set(k, v));
  return { data, sources };
}

export function getKnowledge(clientId: string): Know {
  const base = baselineFor(clientId);
  const run = RUNTIME[clientId];
  return run ? { data: { ...base.data, ...run.data }, sources: { ...base.sources, ...run.sources } } : base;
}

// Match the selected client to the persisted portal workspace and translate the
// context we already have into discovery fields. This is the backend-memory seam:
// a future AI extractor can enrich the same Know shape without changing intake UI.
export function fromClientMemory(clientId: string, clientName: string, workspace: PortalClientWorkspace): Know {
  const canonical = STUDIO_CLIENTS.find(client => client.id === clientId || client.name.toLowerCase() === clientName.trim().toLowerCase());
  if (!canonical) return { data: {}, sources: {} };

  let memory: Know = { data: { name: canonical.name }, sources: { name: "Client workspace" } };
  const primaryClient = workspace.collaborators.find(collaborator => !collaborator.studio);
  if (primaryClient?.email) memory = mergeKnow(memory, { data: { clientEmail: primaryClient.email }, sources: { clientEmail: "Client workspace" } });

  const noteText = workspace.notes.map(note => note.text).join(". ").trim();
  if (noteText) {
    const noteKnowledge = parseBrief(noteText);
    memory = mergeKnow(memory, {
      data: noteKnowledge.data,
      sources: Object.fromEntries(Object.keys(noteKnowledge.data).map(key => [key, "Client notes"])),
    });
  }

  if (workspace.files.length) {
    const fileKnowledge = fromFiles("brand", workspace.files.length);
    memory = mergeKnow(memory, {
      data: fileKnowledge.data,
      sources: Object.fromEntries(Object.keys(fileKnowledge.data).map(key => [key, "Client files"])),
    });
  }

  return memory;
}

const nonEmpty = (v: string | string[] | undefined) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);

export function recordKnowledge(clientId: string, data: Ans, source: string) {
  const run = RUNTIME[clientId] || (RUNTIME[clientId] = { data: {}, sources: {} });
  Object.entries(data).forEach(([k, v]) => {
    if (!nonEmpty(v)) return;
    run.data[k] = v;
    run.sources[k] = source;
  });
}

export function mergeKnow(a: Know, b: Know): Know {
  return { data: { ...a.data, ...b.data }, sources: { ...a.sources, ...b.sources } };
}

// Heuristic "understanding" of a pasted brief → discovery answers. In production this
// is where an LLM extraction step slots in; the shape it returns is identical.
export function parseBrief(text: string): Know {
  const t = text.toLowerCase();
  const data: Ans = {}, sources: Record<string, string> = {};
  const set = (k: string, v: string | string[]) => { data[k] = v; sources[k] = "Pasted brief"; };
  const has = (re: RegExp) => re.test(t);

  if (has(/webinar/)) { set("objective", "Webinar registrations"); set("ftype", "Webinar → offer"); }
  else if (has(/waitlist/)) set("objective", "Build a waitlist");
  else if (has(/\blaunch\b/)) set("objective", "Launch a product");
  else if (has(/\b(sell|purchase|checkout|buy|store|e-?commerce)\b/)) { set("objective", "Sell a product"); set("ftype", "Sales page → checkout"); }
  else if (has(/\b(book|call|consult|appointment|application|discovery)\b/)) { set("objective", "Book calls / applications"); set("ftype", "Application → call"); }
  else if (has(/lead/)) set("objective", "Generate leads");
  if (!data.ftype) {
    if (has(/vsl|video sales/)) set("ftype", "VSL → checkout");
    else if (has(/tripwire|upsell/)) set("ftype", "Tripwire → upsell");
    else if (has(/lead magnet|opt-?in|freebie|guide|checklist|ebook/)) set("ftype", "Lead magnet → nurture");
  }

  if (has(/\bfree\b/)) set("price", "Free (lead gen)");
  else { const m = text.match(/\$\s?([\d,]+)/); if (m) { const n = parseInt(m[1].replace(/,/g, ""), 10); set("price", n < 100 ? "Under $100" : n <= 500 ? "$100–$500" : n <= 2000 ? "$500–$2k" : "$2k+"); } }

  const plat = ["Webflow", "ClickFunnels", "Kajabi", "GoHighLevel", "WordPress"].find(p => t.includes(p.toLowerCase()));
  if (plat) set("platform", plat); else if (has(/shopify/)) set("platform", "Custom");

  const traffic: string[] = [];
  if (has(/meta|facebook|instagram ad/)) traffic.push("Paid ads (Meta)");
  if (has(/google ad|ppc|adwords/)) traffic.push("Paid ads (Google)");
  if (has(/email list|newsletter/)) traffic.push("Email list");
  if (has(/organic social|tiktok|linkedin|social media/)) traffic.push("Organic social");
  if (has(/\bseo\b|blog|content marketing/)) traffic.push("SEO / blog");
  if (has(/affiliate|partner/)) traffic.push("Partners / affiliates");
  if (traffic.length) set("traffic", traffic);

  if (has(/cold audience|unaware/)) set("awareness", "Unaware");
  else if (has(/problem[- ]aware/)) set("awareness", "Problem-aware");
  else if (has(/solution[- ]aware/)) set("awareness", "Solution-aware");
  else if (has(/warm audience|product[- ]aware/)) set("awareness", "Product-aware");

  const sentences = text.split(/[.!?]\s+/).map(x => x.trim()).filter(Boolean);
  const find = (re: RegExp) => sentences.find(x => re.test(x.toLowerCase()));
  const clip = (x?: string) => x ? (x.length <= 160 ? x : x.slice(0, 157) + "…") : undefined;
  const offer = clip(find(/\b(offer|we sell|package|service|product|program|course)\b/));
  if (offer) set("offer", offer);
  const persona = clip(find(/\b(audience|ideal customer|target customer|for )\b/));
  if (persona) set("persona", persona);
  const problem = clip(find(/\b(problem|struggle|pain|frustrat|challenge|hard to)\b/));
  if (problem) set("problem", problem);
  const action = clip(find(/\b(book|sign up|register|download|apply|buy|start|get )\b/));
  if (action) set("action", action);

  return { data, sources };
}

// Facts we can derive from a link without a live crawl (real crawl runs server-side).
export function fromLink(url: string, kind: "audit" | "funnel"): Know {
  const clean = url.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const data: Ans = {}, sources: Record<string, string> = {};
  if (!clean) return { data, sources };
  const src = kind === "audit" ? "Website link" : "Existing funnel";
  data.url = clean; data.domain = clean;
  sources.url = src; sources.domain = src;
  const t = clean.toLowerCase();
  const plat = t.includes("myshopify") ? "Custom" : t.includes("webflow.io") ? "Webflow" : /wordpress|\/wp-/.test(t) ? "WordPress" : t.includes("clickfunnels") ? "ClickFunnels" : "";
  if (plat) { data.platform = plat; sources.platform = src; }
  return { data, sources };
}

// Facts implied by uploaded brand / working files.
export function fromFiles(kind: "brand" | "working", count: number): Know {
  const data: Ans = {}, sources: Record<string, string> = {};
  if (count <= 0) return { data, sources };
  const src = kind === "brand" ? "Brand guideline" : "Working files";
  data.brand = "Use existing Brand System"; sources.brand = src;
  data.brandSys = "Full guidelines"; sources.brandSys = src;
  data.need = ["Logo & brand kit"]; sources.need = src;
  return { data, sources };
}
