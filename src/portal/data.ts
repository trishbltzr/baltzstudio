// Mock data ported from the Baltz Studio Portal design prototype. In production
// these would come from real APIs (clients, tasks, threads, payments, users).
import type { ClientProject, Escalation, JourneyGate, Owner, Task, Thread } from "./types";

export const ROLE_META: Record<string, { label: string; name: string; sub: string; init: string; badge: string }> = {
  admin: { label: "Admin", name: "Trish Baltazar", sub: "Studio Owner", init: "TB", badge: "studio" },
  dev: { label: "Development", name: "Noa Vega", sub: "Delivery · Development", init: "NV", badge: "dev" },
  client: { label: "Client", name: "Flora Bennett", sub: "Flora & Co.", init: "FB", badge: "client" },
};

export const MY_CLIENTS = ["Flora & Co.", "House of Hazel", "The Gilded Fern", "Plume Studio"];

export const SVC_META: Record<string, { label: string; short: string; color: string; soft: string }> = {
  cocoon: { label: "Cocoon Consult", short: "Cocoon", color: "var(--cocoon)", soft: "var(--lane-studio-soft)" },
  wiaw: { label: "Winged in a Week", short: "Winged in a Week", color: "var(--wiaw)", soft: "var(--lane-gate-soft)" },
  iff: { label: "In Full Flight", short: "In Full Flight", color: "var(--iff)", soft: "var(--lane-client-soft)" },
};

export const ALL_PROJECTS: ClientProject[] = [
  { id: "p1", client: "Flora & Co.", name: "Full brand + site", service: "wiaw", stage: "Winged in a Week · Milestone 2", progress: 68, dev: "Noa Vega", health: "at_risk", due: "July 4", amount: "£2,400", wise: "awaiting" },
  { id: "p2", client: "House of Hazel", name: "Ongoing partnership", service: "iff", stage: "In Full Flight · Month 4", progress: 100, dev: "Noa Vega", health: "on_track", due: "July 15", amount: "£600/mo", wise: "paid" },
  { id: "p3", client: "Marigold Lane", name: "Brand & web audit", service: "cocoon", stage: "Cocoon · Auditing", progress: 40, dev: "Emet Rowe", health: "on_track", due: "July 8", amount: "£450", wise: "paid" },
  { id: "p4", client: "Wren & Willow", name: "One-week site", service: "wiaw", stage: "Winged in a Week · Milestone 1", progress: 30, dev: "Emet Rowe", health: "on_track", due: "July 6", amount: "£2,400", wise: "awaiting" },
  { id: "p5", client: "The Gilded Fern", name: "Ongoing partnership", service: "iff", stage: "In Full Flight · Month 9", progress: 100, dev: "Noa Vega", health: "on_track", due: "July 20", amount: "£600/mo", wise: "paid" },
  { id: "p6", client: "Saffron & Sage", name: "Brand & web audit", service: "cocoon", stage: "Cocoon · Delivered", progress: 90, dev: "Emet Rowe", health: "delayed", due: "July 2", amount: "£450", wise: "paid" },
  { id: "p7", client: "Plume Studio", name: "One-week site", service: "wiaw", stage: "Winged in a Week · Milestone 3", progress: 92, dev: "Noa Vega", health: "on_track", due: "July 5", amount: "£2,400", wise: "awaiting" },
  { id: "p8", client: "Juniper Hollow", name: "Ongoing partnership", service: "iff", stage: "In Full Flight · Month 2", progress: 100, dev: "Emet Rowe", health: "on_track", due: "July 18", amount: "£600/mo", wise: "paid" },
];

export function seedTasks(): Task[] {
  return [
    { id: "k1", title: "Homepage build — responsive", project: "Flora & Co.", assignee: "Noa Vega", owner: "studio", status: "in_progress", priority: "high", due: "July 3", blockedBy: "k4" },
    { id: "k2", title: "Product copy polish", project: "Flora & Co.", assignee: "Assistant", owner: "ai", status: "review", priority: "med", due: "July 3" },
    { id: "k3", title: "Milestone 2 — Full Site review", project: "Flora & Co.", assignee: "Noa Vega", owner: "gate", status: "review", priority: "high", due: "July 4", blockedBy: "k1" },
    { id: "k4", title: "Send brand photography", project: "Flora & Co.", assignee: "Flora Bennett", owner: "client", status: "todo", priority: "med", due: "July 2" },
    { id: "k5", title: "Design preview screens", project: "Wren & Willow", assignee: "Emet Rowe", owner: "studio", status: "in_progress", priority: "high", due: "July 5" },
    { id: "k6", title: "Milestone 1 — Design Preview", project: "Wren & Willow", assignee: "Emet Rowe", owner: "gate", status: "review", priority: "high", due: "July 6" },
    { id: "k7", title: "Run audit crawl", project: "Marigold Lane", assignee: "Assistant", owner: "ai", status: "in_progress", priority: "med", due: "July 4" },
    { id: "k8", title: "Audit findings write-up", project: "Marigold Lane", assignee: "Emet Rowe", owner: "studio", status: "todo", priority: "high", due: "July 8" },
    { id: "k9", title: "Handoff package", project: "Plume Studio", assignee: "Noa Vega", owner: "studio", status: "review", priority: "high", due: "July 5" },
    { id: "k10", title: "Monthly content refresh", project: "House of Hazel", assignee: "Noa Vega", owner: "studio", status: "in_progress", priority: "med", due: "July 7" },
    { id: "k11", title: "Draft July newsletter", project: "House of Hazel", assignee: "Assistant", owner: "ai", status: "done", priority: "low", due: "June 30" },
  ];
}

export const TASK_DESCRIPTIONS: Record<string, string> = {
  k1: "Build the signed-off homepage design as a fully responsive page — desktop, tablet and mobile — matching the approved directions.",
  k2: "Tighten product descriptions for voice and clarity; trim filler and align every product to the brand tone guide.",
  k3: "Package the full responsive site for client review and open Milestone 2 for sign-off.",
  k4: "Client to upload the new brand photography set so the homepage hero and gallery can be finalised.",
  k5: "Produce the first-round design directions for the key pages ahead of the Milestone 1 preview.",
  k6: "Stage the design preview screens and open Milestone 1 for the client to approve a direction.",
  k7: "Run the automated audit crawl across the site and collect the raw scores for the 6 themes.",
  k8: "Turn the crawl results into the written Cocoon audit — findings and recommendations per theme.",
  k9: "Assemble the launch handoff: hosting, ownership transfer, training video and asset bundle.",
  k10: "Refresh this month's content across the live site as part of the In Full Flight retainer.",
  k11: "Draft the July newsletter for review before it goes to the client's list.",
};

export const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  studio: ["Scope & references confirmed", "First build / draft", "Self-review pass", "Ready for review"],
  ai: ["Inputs gathered", "Draft generated", "Studio QA check"],
  client: ["Request received", "Materials / assets sent"],
  gate: ["Deliverables staged", "Internal QA pass", "Shared with client", "Client sign-off"],
};

export function seedThreads(): Thread[] {
  return [
    { id: "th1", name: "Flora Bennett", clientName: "Flora & Co.", unread: 2, status: "progress", assignee: "Noa Vega", escalated: false, tzLabel: "London", tzOff: 1, messages: [{ from: "client", text: "Loving the full site! Reviewing Gate 2 now — one question on the shop page.", time: "9:24 AM", by: "Flora" }, { from: "studio", text: "Amazing — ask away. We can tweak anything before you approve the gate.", time: "9:31 AM", by: "Noa" }] },
    { id: "th2", name: "Hazel Moreno", clientName: "House of Hazel", unread: 0, status: "resolved", assignee: "Emet Cole", escalated: false, tzLabel: "New York", tzOff: -4, messages: [{ from: "client", text: "July newsletter draft looks great — ship it!", time: "Yesterday", by: "Hazel" }] },
    { id: "th3", name: "Wren Adeyemi", clientName: "Wren & Willow", unread: 1, isTicket: true, ticketId: "BZ-118", category: "Change request", status: "open", assignee: "Noa Vega", escalated: true, tzLabel: "Los Angeles", tzOff: -7, messages: [{ from: "client", text: "Design preview is gorgeous — can the hero be a touch warmer?", time: "8:02 AM", by: "Wren" }] },
    { id: "th4", name: "Sage Okafor", clientName: "Saffron & Sage", unread: 0, isTicket: true, ticketId: "BZ-115", category: "Audit", status: "open", assignee: "Trish Baltazar", escalated: false, tzLabel: "Sydney", tzOff: 10, messages: [{ from: "studio", text: "Your Cocoon audit is ready — shall we book the readout call?", time: "Mon", by: "Emet" }] },
  ];
}

export function seedJourneyGates(): JourneyGate[] {
  return [
    {
      id: "g1",
      g: 1,
      title: "Design Preview",
      sub: "Homepage & key page directions",
      status: "approved",
      when: "Approved June 26",
      eta: "Completed June 26 · 4 days",
      thumb: "oklch(0.82 0.09 45)",
      next: "We build out the full responsive site.",
    },
    {
      id: "g2",
      g: 2,
      title: "Full Site Review",
      sub: "Every page, responsive, real content",
      status: "awaiting",
      when: "Opened July 1",
      eta: "Your sign-off by July 5 · launch-ready July 8",
      thumb: "oklch(0.8 0.1 70)",
      next: "We prep handoff, hosting and launch.",
    },
    {
      id: "g3",
      g: 3,
      title: "Handoff & Launch",
      sub: "Go-live, training video, ownership transfer",
      status: "locked",
      when: "Unlocks after Milestone 2",
      eta: "Projected July 12–15",
      thumb: "oklch(0.8 0.07 165)",
      next: "Your site goes live and In Full Flight begins.",
    },
  ];
}

export function seedEscalations(): Escalation[] {
  return [
    { id: "e1", level: "High", kind: "danger", title: "Milestone 2 slipping — launch at risk", client: "Flora & Co.", by: "Noa Vega", time: "1h", reason: "Client feedback loop stalled; build QA blocked on shop page copy.", resolved: false },
    { id: "e2", level: "Decision", kind: "gate", title: "Audit findings need owner sign-off", client: "Saffron & Sage", by: "Emet Rowe", time: "4h", reason: "Two Priority themes recommend a scope change before Winged in a Week starts.", resolved: false },
    { id: "e3", level: "Access", kind: "accent", title: "Dev requested billing access", client: "Noa Vega", by: "Noa Vega", time: "Today", reason: "Needs to reconcile a Wise transfer for House of Hazel.", resolved: false },
    { id: "e4", level: "Decision", kind: "gate", title: "Out-of-scope request — extra landing page", client: "Wren & Willow", by: "Noa Vega", time: "Yesterday", reason: "Client asked for a campaign page beyond the Winged in a Week package.", resolved: false },
  ];
}

// Admin progress KPI stat cards.
export const ADMIN_STATS = [
  { label: "Clients", value: "8", icon: "briefcase", tint: "oklch(0.95 0.004 50)", color: "var(--fg-muted)" },
  { label: "To-do's", value: "2", icon: "checklist", tint: "var(--lane-gate-soft)", color: "var(--lane-gate)" },
  { label: "Audits", value: "6", icon: "audit", tint: "var(--success-soft)", color: "var(--success)" },
  { label: "Funnels", value: "5", icon: "funnel", tint: "var(--warn-soft)", color: "var(--warn)" },
  { label: "Inbox", value: "5", icon: "inbox", tint: "var(--danger-soft)", color: "var(--danger)" },
  { label: "Billing", value: "£4.8k", icon: "wallet", tint: "var(--lane-ai-soft)", color: "var(--lane-ai)" },
];

export const WORKLOAD = [
  { name: "Noa Vega", init: "NV", clients: 4, tasks: 4, load: 84, loadColor: "var(--warn)" },
  { name: "Emet Rowe", init: "ER", clients: 3, tasks: 3, load: 62, loadColor: "var(--success)" },
  { name: "Assistant (AI)", init: "AI", clients: 6, tasks: 3, load: 38, loadColor: "var(--lane-ai)" },
  { name: "Juno Park", init: "JP", clients: 1, tasks: 1, load: 18, loadColor: "var(--fg-faint)" },
];

// Client journey milestones.
export const MILESTONES = [
  { title: "Cocoon Consult — audit", status: "done", mon: "June", day: "02", detail: "Brand & site audited across 6 themes. Strategy call delivered." },
  { title: "Winged in a Week kickoff", status: "done", mon: "June", day: "23", detail: "One-week sprint begins. Design direction locked." },
  { title: "Milestone 1 — Design Preview", status: "done", mon: "June", day: "26", detail: "You approved the homepage & key page directions." },
  { title: "Milestone 2 — Full Site Review", status: "active", mon: "July", day: "04", detail: "The full responsive site is built and ready for your approval." },
  { title: "Milestone 3 — Handoff & Launch", status: "upcoming", mon: "July", day: "08", detail: "Go-live, training video and ownership transfer to you." },
  { title: "In Full Flight begins", status: "upcoming", mon: "July", day: "15", detail: "Ongoing partnership — studio + assistant keep your site flying." },
];

export const WORKSPACE_SWITCHER: Record<string, [string, string, string, string]> = {
  admin: ["Workspace", "BS", "Baltazar Studio", "8 Active Clients"],
  dev: ["Workspace", "NV", "My Workspace", "4 Assigned Clients"],
  client: ["Project", "F", "Flora & Co.", "Winged in a Week"],
};

export const WORKSPACE_OPTIONS: Record<string, [string, string, boolean][]> = {
  admin: [["Baltazar Studio", "BS", true], ["Personal", "TB", false]],
  dev: [["My Workspace", "NV", true]],
  client: [["Flora & Co.", "F", true]],
};

// Brand systems per client (colours / type / tone / voice) for the detail page.
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "system-ui,'Helvetica Neue',sans-serif";
const MONO = "'Courier New',ui-monospace,monospace";

export interface BrandSystem {
  colors: [string, string][];
  fonts: [string, string, string][];
  tone: { traits: string[]; scales: [string, string, number][] };
}

export const STUDIO_SYSTEM: BrandSystem = {
  colors: [["Primary", "#2D2926"], ["Secondary", "#C9A96E"], ["Neutral", "#F5F0EA"], ["Utility", "#7C6F64"]],
  fonts: [["Canela", "Serif · Display / Headings", SERIF], ["Söhne", "Sans-serif · Body / UI", SANS], ["Courier", "Monospace · Captions / Labels", MONO]],
  tone: { traits: ["Warm", "Considered", "Grounded", "Unhurried"], scales: [["Playful", "Serious", 60], ["Casual", "Formal", 48], ["Understated", "Bold", 38]] },
};

export const BRAND_SYSTEMS: Record<string, BrandSystem> = {
  "Flora & Co.": STUDIO_SYSTEM,
  "Marigold Lane": {
    colors: [["Primary", "#2B2620"], ["Secondary", "#E4A11B"], ["Neutral", "#FBF5EA"], ["Utility", "#8C7A5B"]],
    fonts: [["Tiempos", "Serif · Display / Headings", SERIF], ["Söhne", "Sans-serif · Body / UI", SANS], ["Courier", "Monospace · Captions / Labels", MONO]],
    tone: { traits: ["Sunny", "Optimistic", "Generous", "Bright"], scales: [["Playful", "Serious", 40], ["Casual", "Formal", 34], ["Understated", "Bold", 66]] },
  },
  "House of Hazel": {
    colors: [["Primary", "#2A2E27"], ["Secondary", "#A8B57E"], ["Neutral", "#F2F1E9"], ["Utility", "#6E7360"]],
    fonts: [["Ivar", "Serif · Display / Headings", SERIF], ["Söhne", "Sans-serif · Body / UI", SANS], ["Courier", "Monospace · Captions / Labels", MONO]],
    tone: { traits: ["Earthy", "Calm", "Nurturing", "Honest"], scales: [["Playful", "Serious", 55], ["Casual", "Formal", 44], ["Understated", "Bold", 34]] },
  },
  "Wren & Willow": {
    colors: [["Primary", "#233030"], ["Secondary", "#7BA7A0"], ["Neutral", "#EDF3F1"], ["Utility", "#5E6E6A"]],
    fonts: [["Canela", "Serif · Display / Headings", SERIF], ["Söhne", "Sans-serif · Body / UI", SANS], ["Courier", "Monospace · Captions / Labels", MONO]],
    tone: { traits: ["Serene", "Quiet", "Poised", "Clear"], scales: [["Playful", "Serious", 60], ["Casual", "Formal", 52], ["Understated", "Bold", 30]] },
  },
  "Plume Studio": {
    colors: [["Primary", "#262230"], ["Secondary", "#B48EAD"], ["Neutral", "#F4F0F5"], ["Utility", "#6E6478"]],
    fonts: [["Reckless", "Serif · Display / Headings", SERIF], ["Söhne", "Sans-serif · Body / UI", SANS], ["Courier", "Monospace · Captions / Labels", MONO]],
    tone: { traits: ["Refined", "Artful", "Elevated", "Assured"], scales: [["Playful", "Serious", 58], ["Casual", "Formal", 62], ["Understated", "Bold", 56]] },
  },
};

// Client-detail helper source data.
export const DETAIL_CITIES: [string, string][] = [["London, UK", "GMT (UTC+0)"], ["Austin, TX", "CST (UTC-6)"], ["Lisbon, PT", "WET (UTC+0)"], ["Melbourne, AU", "AEST (UTC+10)"], ["Toronto, CA", "EST (UTC-5)"], ["Berlin, DE", "CET (UTC+1)"]];
export const DETAIL_BIRTHDAYS = ["March 14", "August 2", "November 27", "June 9", "January 30", "September 18"];
export const DETAIL_SINCE = ["January 2026", "November 2025", "February 2026", "December 2025", "March 2026", "October 2025"];
export const DETAIL_NOTES = [
  "Prefers async updates over calls. Sensitive to launch timing — keep milestone dates realistic.",
  "Loves warm, editorial copy. Send drafts before publishing anything client-facing.",
  "Detail-oriented; appreciates a short summary at each milestone. Quiet on weekends.",
];

export function emailSlug(n: string): string {
  return (n || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "") || "client";
}

// Funnel / milestone board (phases → sub-phases → tasks), ported from seedFunnel().
export type FunnelState = "active" | "soon" | "locked" | "done" | "progress" | "todo";
export interface FunnelTask { t: string; owner: Owner; state: string }
export interface FunnelSub { id: string; code: string; title: string; status: FunnelState; pct: number; done: number; total: number; completed: number; tasks: FunnelTask[] }
export interface FunnelPhase { id: string; title: string; status: FunnelState; done: number; total: number; subs: FunnelSub[] }

export const FUNNEL: FunnelPhase[] = [
  { id: "p1", title: "Funnel Foundation", status: "active", done: 1, total: 16, subs: [
    { id: "s11", code: "#1.1", title: "Project Setup", status: "active", pct: 14, done: 1, total: 7, completed: 1, tasks: [
      { t: "Pull Cocoon Consult™ audit into funnel", owner: "studio", state: "progress" },
      { t: "Client provides platform credentials", owner: "client", state: "todo" },
      { t: "Client provides domain credentials", owner: "client", state: "todo" },
      { t: "Deliver additional brand assets", owner: "client", state: "todo" },
      { t: "Confirm platform selection (Webflow)", owner: "studio", state: "todo" },
      { t: "Lock funnel brief", owner: "studio", state: "todo" },
    ] },
    { id: "s12", code: "#1.2", title: "Funnel Strategy & Flow", status: "soon", pct: 0, done: 0, total: 5, completed: 0, tasks: [
      { t: "Map the funnel stages & offer ladder", owner: "studio", state: "todo" },
      { t: "Define primary conversion action", owner: "studio", state: "todo" },
      { t: "Approve funnel flow", owner: "client", state: "todo" },
    ] },
    { id: "s13", code: "#1.3", title: "Funnel Copy", status: "soon", pct: 0, done: 0, total: 4, completed: 0, tasks: [
      { t: "Draft landing page copy", owner: "ai", state: "todo" },
      { t: "Polish CTA & headlines", owner: "studio", state: "todo" },
      { t: "Client copy review", owner: "client", state: "todo" },
    ] },
  ] },
  { id: "p2", title: "Funnel Design & Build", status: "locked", done: 0, total: 18, subs: [
    { id: "s21", code: "#2.1", title: "Funnel Design", status: "locked", pct: 0, done: 0, total: 9, completed: 0, tasks: [{ t: "Design landing & sales pages", owner: "studio", state: "todo" }, { t: "Design opt-in & thank-you", owner: "studio", state: "todo" }] },
    { id: "s22", code: "#2.2", title: "Funnel Build", status: "locked", pct: 0, done: 0, total: 9, completed: 0, tasks: [{ t: "Build pages in Webflow", owner: "studio", state: "todo" }, { t: "Wire forms & automations", owner: "studio", state: "todo" }] },
  ] },
  { id: "p3", title: "Launch", status: "locked", done: 0, total: 9, subs: [
    { id: "s31", code: "#3.1", title: "Pre-launch QA", status: "locked", pct: 0, done: 0, total: 5, completed: 0, tasks: [{ t: "Test every funnel step", owner: "studio", state: "todo" }, { t: "Check tracking & pixels", owner: "ai", state: "todo" }] },
    { id: "s32", code: "#3.2", title: "Go Live", status: "locked", pct: 0, done: 0, total: 4, completed: 0, tasks: [{ t: "Publish funnel", owner: "studio", state: "todo" }, { t: "Handoff & training video", owner: "studio", state: "todo" }] },
  ] },
];
