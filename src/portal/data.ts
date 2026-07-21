// Mock data ported from the Baltz Studio Portal design prototype. In production
// these would come from real APIs (clients, tasks, threads, payments, users).
import type { ClientProject, Escalation, JourneyGate, Owner, Task, Thread } from "./types";
import { DEFAULT_CLIENT_NAME, STUDIO_CLIENTS } from "./clients";

export const ROLE_META: Record<string, { label: string; name: string; sub: string; init: string; badge: string }> = {
  admin: { label: "Admin", name: "Trish Baltazar", sub: "Studio Workspace", init: "TB", badge: "studio" },
  dev: { label: "Member", name: "Studio team", sub: "Studio Workspace", init: "ST", badge: "dev" },
  client: { label: "Client", name: "Client", sub: DEFAULT_CLIENT_NAME, init: "CL", badge: "client" },
};

export const MY_CLIENTS = STUDIO_CLIENTS
  .filter(client => client.owner === "Kier Mangibin")
  .map(client => client.name);

export const SVC_META: Record<string, { label: string; short: string; color: string; soft: string }> = {
  cocoon: { label: "Cocoon Consult", short: "Cocoon Consult", color: "var(--cocoon)", soft: "var(--lane-studio-soft)" },
  wiaw: { label: "Winged in a Week", short: "Winged in a Week", color: "var(--wiaw)", soft: "var(--lane-gate-soft)" },
  iff: { label: "In Full Flight", short: "In Full Flight", color: "var(--iff)", soft: "var(--lane-client-soft)" },
};

export const ALL_PROJECTS: ClientProject[] = STUDIO_CLIENTS.map(client => ({
  id: `project-${client.id}-cocoon`,
  client: client.name,
  name: "Cocoon Consult",
  service: "cocoon",
  stage: "Not started",
  progress: 0,
  dev: client.owner,
  health: "on_track",
  due: "—",
  amount: "—",
  wise: "awaiting",
}));

export function seedTasks(): Task[] {
  return [];
}

export const TASK_DESCRIPTIONS: Record<string, string> = {};

export const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  studio: ["Scope & references confirmed", "First build / draft", "Self-review pass", "Ready for review"],
  ai: ["Inputs gathered", "Draft generated", "Studio QA check"],
  client: ["Request received", "Materials / assets sent"],
  gate: ["Deliverables staged", "Internal QA pass", "Shared with client", "Client sign-off"],
};

export function seedThreads(): Thread[] {
  return [];
}

export function seedJourneyGates(): JourneyGate[] {
  return [];
}

export function seedEscalations(): Escalation[] {
  return [];
}

// Admin progress KPI stat cards.
export const ADMIN_STATS = [
  { label: "Clients", value: String(STUDIO_CLIENTS.length), icon: "briefcase", tint: "oklch(0.95 0.004 50)", color: "var(--fg-muted)" },
  { label: "To-do's", value: "0", icon: "checklist", tint: "var(--lane-gate-soft)", color: "var(--lane-gate)" },
  { label: "Audits", value: "0", icon: "audit", tint: "var(--success-soft)", color: "var(--success)" },
  { label: "Funnels", value: "0", icon: "funnel", tint: "var(--warn-soft)", color: "var(--warn)" },
  { label: "Inbox", value: "0", icon: "inbox", tint: "var(--danger-soft)", color: "var(--danger)" },
  { label: "Billing", value: "£0", icon: "wallet", tint: "var(--lane-ai-soft)", color: "var(--lane-ai)" },
];

export const WORKLOAD = [
  { name: "Trisha Baltazar", init: "TB", clients: 0, tasks: 0, load: 0, loadColor: "var(--accent)" },
  { name: "Kier Mangibin", init: "KM", clients: MY_CLIENTS.length, tasks: 0, load: Math.round((MY_CLIENTS.length / STUDIO_CLIENTS.length) * 100), loadColor: "var(--success)" },
];

// Client journey milestones.
export const MILESTONES: { title: string; status: string; mon: string; day: string; detail: string }[] = [];

export const WORKSPACE_SWITCHER: Record<string, [string, string, string, string]> = {
  admin: ["Workspace", "BS", "Baltazar Studio", `${STUDIO_CLIENTS.length} Clients`],
  dev: ["Workspace", "ST", "My Workspace", `${MY_CLIENTS.length} Assigned Clients`],
  client: ["Client", "EC", DEFAULT_CLIENT_NAME, "Cocoon Consult · Not started"],
};

export const WORKSPACE_OPTIONS: Record<string, [string, string, boolean][]> = {
  admin: [["Baltazar Studio", "BS", true], ["Personal", "TB", false]],
  dev: [["My Workspace", "ST", true]],
  client: [[DEFAULT_CLIENT_NAME, "EC", true]],
};

// Brand systems per client (colours / type / tone / voice) for the detail page.
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "system-ui,'Helvetica Neue',sans-serif";
const MONO = "'Courier New',ui-monospace,monospace";

export interface BrandSystem {
  colors: [string, string][];
  fonts: [string, string, string][];
  tone: { traits: string[]; scales: [string, string, number][]; avoid?: string };
}

export const STUDIO_SYSTEM: BrandSystem = {
  colors: [["Primary", "#2D2926"], ["Secondary", "#C9A96E"], ["Neutral", "#F5F0EA"], ["Utility", "#7C6F64"]],
  fonts: [["Canela", "Serif · Display / Headings", SERIF], ["Söhne", "Sans-serif · Body / UI", SANS], ["Courier", "Monospace · Captions / Labels", MONO]],
  tone: { traits: ["Warm", "Considered", "Grounded", "Unhurried"], scales: [["Playful", "Serious", 60], ["Casual", "Formal", 48], ["Understated", "Bold", 38]] },
};

export const BRAND_SYSTEMS: Record<string, BrandSystem> = {};

// Client-detail helper source data.
export const DETAIL_CITIES: [string, string][] = [["", ""]];
export const DETAIL_BIRTHDAYS = [""];
export const DETAIL_SINCE = [""];
export const DETAIL_NOTES = [""];

export function emailSlug(n: string): string {
  return (n || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "") || "client";
}

// Funnel / milestone board (phases → sub-phases → tasks), ported from seedFunnel().
export type FunnelState = "active" | "soon" | "locked" | "done" | "progress" | "todo";
export interface FunnelTask { t: string; owner: Owner; state: string }
export interface FunnelSub { id: string; code: string; title: string; status: FunnelState; pct: number; done: number; total: number; completed: number; tasks: FunnelTask[] }
export interface FunnelPhase { id: string; title: string; status: FunnelState; done: number; total: number; subs: FunnelSub[] }

export const FUNNEL: FunnelPhase[] = [];
