// Style-string + label helpers ported from the design prototype. These return
// CSS text usable directly in a React `style` object via `css()` (below), keeping
// dynamic colour logic identical to the prototype.
import type { CSSProperties } from "react";
import type { Health, JourneyGate, Owner, Priority, Role, TaskStatus, View } from "./types";
import { ROLE_META, SVC_META } from "./data";

export function initials(n: string): string {
  return n.split(" ").map(x => x[0]).slice(0, 2).join("");
}

export function statusPill(kind: string): string {
  const M: Record<string, [string, string]> = {
    done: ["var(--success-soft)", "var(--success)"],
    progress: ["var(--accent-soft)", "var(--accent)"],
    review: ["var(--warn-soft)", "var(--warn)"],
    waiting: ["oklch(0.94 0.004 50)", "var(--fg-muted)"],
    locked: ["oklch(0.94 0.004 50)", "var(--fg-faint)"],
    blocked: ["var(--danger-soft)", "var(--danger)"],
    uploaded: ["var(--surface-alt)", "var(--fg-muted)"],
  };
  const m = M[kind] || M.waiting;
  return `display:inline-flex;align-items:center;font-size:0.66rem;font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;white-space:nowrap;background:${m[0]};color:${m[1]}`;
}

export function healthMap(h: Health): [string, string] {
  return { on_track: ["done", "On Track"], at_risk: ["review", "At Risk"], delayed: ["blocked", "Delayed"] }[h] as [string, string];
}

export function prioColor(p: Priority): string {
  return { high: "var(--danger)", med: "var(--warn)", low: "var(--fg-faint)" }[p];
}

export function prioTag(p: Priority): string {
  const c = { high: ["var(--danger-soft)", "var(--danger)"], med: ["var(--warn-soft)", "var(--warn)"], low: ["oklch(0.94 0.004 50)", "var(--fg-muted)"] }[p];
  return `display:inline-flex;align-items:center;font-size:0.6rem;letter-spacing:0.02em;font-weight:500;padding:0.1rem 0.42rem;border-radius:5px;background:${c[0]};color:${c[1]}`;
}

export function svcBadge(s: string): string {
  const m = SVC_META[s];
  return `display:inline-flex;align-items:center;gap:0.3rem;font-size:0.64rem;font-weight:500;letter-spacing:0.01em;padding:0.16rem 0.55rem;border-radius:999px;white-space:nowrap;background:${m.soft};color:color-mix(in srgb,${m.color} 62%,black 38%)`;
}

export function laneMeta(l: Owner): { c: string; s: string; label: string } {
  return {
    studio: { c: "var(--lane-studio)", s: "var(--lane-studio-soft)", label: "Studio" },
    ai: { c: "var(--lane-ai)", s: "var(--lane-ai-soft)", label: "Assistant" },
    client: { c: "var(--lane-client)", s: "var(--lane-client-soft)", label: "Client" },
    gate: { c: "var(--lane-gate)", s: "var(--lane-gate-soft)", label: "Gate" },
  }[l];
}

export function roleBadgeStyle(kind: string): string {
  const M: Record<string, string> = {
    studio: "background:color-mix(in srgb,var(--fg) 8%,white 92%);color:var(--fg-muted)",
    dev: "background:color-mix(in srgb,var(--accent-soft) 40%,white 60%);color:color-mix(in srgb,var(--accent) 58%,black 42%)",
    client: "background:var(--surface-alt);color:var(--fg-muted)",
    ai: "background:var(--lane-ai-soft);color:color-mix(in srgb,var(--lane-ai) 62%,black 38%)",
  };
  return `display:inline-flex;align-items:center;padding:0.16rem 0.5rem;border-radius:999px;font-size:0.64rem;font-weight:500;white-space:nowrap;flex-shrink:0;${M[kind] || M.client}`;
}

// Canonical eyebrow — matches the sidebar section labels. Only colour varies.
export function eyebrowStyle(color = "var(--fg-muted)"): string {
  return `text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.01em;line-height:1.2;color:${color}`;
}

export function sidebarEyebrowStyle(color = "var(--fg-muted)"): string {
  return `font-size:0.8rem;font-weight:400;letter-spacing:0;color:${color};line-height:1.2`;
}

export function roleMeta(r: Role) {
  return ROLE_META[r];
}

export function activeJourneyGate(gates: JourneyGate[]): JourneyGate | undefined {
  return gates.find(gate => gate.status === "awaiting" || gate.status === "in_revision" || gate.status === "ready") || gates[gates.length - 1];
}

export function journeyProgressForGate(gate: JourneyGate): number {
  if (gate.g === 2) {
    if (gate.status === "awaiting") return 68;
    if (gate.status === "in_revision") return 72;
    if (gate.status === "ready") return 78;
    if (gate.status === "approved") return 92;
  }
  if (gate.g === 3 && gate.status === "awaiting") return 92;
  if (gate.status === "approved") return 100;
  return 68;
}

export function journeyStageSummary(gates: JourneyGate[]) {
  const gate = activeJourneyGate(gates) || gates[gates.length - 1];
  const progress = gate ? journeyProgressForGate(gate) : 0;

  if (!gate) return { gate: undefined, stage: "Winged in a Week", progress };
  if (gate.g === 1) return { gate, stage: "Winged in a Week · Milestone 1", progress };
  if (gate.g === 2) return { gate, stage: "Winged in a Week · Milestone 2", progress };
  if (gate.g === 3 && gate.status === "approved") return { gate, stage: "In Full Flight · Active", progress };
  return { gate, stage: "Winged in a Week · Milestone 3", progress };
}

export function milestoneStatusFromGate(status: JourneyGate["status"]) {
  if (status === "approved") return "done";
  if (status === "awaiting") return "awaiting";
  if (status === "in_revision") return "in_revision";
  if (status === "ready") return "ready";
  return "upcoming";
}

export function clientJourneyMessaging(gate?: JourneyGate) {
  if (!gate) {
    return {
      notificationLead: "Your project has three updates: the studio is moving through your current milestone, a preview file was shared, and the Wise transfer is still pending.",
      notificationItem: "Project milestone is in progress.",
      assistantItem: "Your current milestone is in progress.",
    };
  }

  if (gate.status === "in_revision") {
    const round = gate.request?.round || 1;
    return {
      notificationLead: "Your project has three updates: the studio is revising your latest feedback round, a preview file is still available, and the Wise transfer is due.",
      notificationItem: "Milestone " + gate.g + " is in revision with the studio.",
      assistantItem: "Milestone " + gate.g + " · Round " + round + " is with the studio for revision.",
    };
  }

  if (gate.status === "ready") {
    return {
      notificationLead: "Your project has three updates: the revised full-site review is back with you, a preview file was shared, and the Wise transfer is due.",
      notificationItem: "Milestone " + gate.g + " is back with you for approval.",
      assistantItem: "Updated Milestone " + gate.g + " review is back with you for sign-off.",
    };
  }

  if (gate.status === "approved") {
    return {
      notificationLead: "Your project has three updates: the latest milestone was approved, launch prep is moving ahead, and the Wise transfer is still pending.",
      notificationItem: "Milestone " + gate.g + " was approved.",
      assistantItem: "Milestone " + gate.g + " is approved and the project is moving forward.",
    };
  }

  return {
    notificationLead: "Your project has three updates: the full site is ready for your review, a preview file was shared, and the Wise transfer is due.",
    notificationItem: "Milestone " + gate.g + " is ready for review.",
    assistantItem: "Milestone " + gate.g + " · " + gate.title + " is open for your approval.",
  };
}

// Header crumb/title per (view, role).
const HEAD: Record<string, Partial<Record<Role, [string, string]>>> = {
  progress: { admin: ["Studio", "Snapshot"], dev: ["Delivery", "Snapshot"], client: ["Your Project", "Snapshot"] },
  clients: { admin: ["Studio", "Clients & Projects"], dev: ["Delivery", "My Clients"] },
  tasks: { admin: ["Studio", "All Tasks"], dev: ["Delivery", "My Tasks"], client: ["Your Project", "To-do's"] },
  inbox: { admin: ["Studio", "Inbox"], dev: ["Delivery", "Inbox"] },
  files: { admin: ["Studio", "Files & Assets"], dev: ["Delivery", "Files"], client: ["Your Project", "Shared Files"] },
  team: { admin: ["Studio", "Team"] },
  playbooks: { admin: ["Studio", "Playbooks"], dev: ["Delivery", "Playbooks"] },
  billing: { admin: ["Studio", "Billing · Wise"] },
  invoices: { admin: ["Studio", "New Invoice"], dev: ["Delivery", "New Invoice"] },
  escalations: { admin: ["Studio", "Inbox · Escalations"] },
  settings: { admin: ["Studio", "Settings"], dev: ["Delivery", "Settings"] },
  review: { dev: ["Delivery", "Approvals"] },
  milestones: { client: ["Your Project", "Journey"] },
  audit: { client: ["Your Project", "Audit"], admin: ["Studio", "Client Audit"], dev: ["Delivery", "Client Audit"] },
  assistant: { client: ["Your Project", "In Full Flight"] },
  audits_new: { admin: ["Automation", "Audits"], dev: ["Automation", "Audits"] },
  funnels: { admin: ["Automation", "Funnels"], dev: ["Automation", "Funnels"], client: ["Your Project", "Funnels"] },
  activity: { admin: ["Studio", "Activity Log"] },
  profile: { admin: ["Account", "Profile & Settings"], dev: ["Account", "Profile & Settings"], client: ["Account", "Profile & Settings"] },
  onboarding: { admin: ["Studio", "New Client"], dev: ["Delivery", "New Client"] },
};

export function headFor(view: View, role: Role): [string, string] {
  return (HEAD[view] || {})[role] || ["", ""];
}

export const STATUS_MAP: Record<TaskStatus, string> = { todo: "waiting", in_progress: "progress", review: "review", done: "done" };
export const STATUS_LABEL: Record<TaskStatus, string> = { todo: "To-Do", in_progress: "In Progress", review: "In Review", done: "Done" };
export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "review", "done"];

// Parse a CSS declaration string ("a:b;c:d") into a React style object so ported
// prototype style strings drop straight into JSX.
export function css(decl: string): CSSProperties {
  const out: Record<string, string> = {};
  decl.split(";").forEach(part => {
    const i = part.indexOf(":");
    if (i < 0) return;
    const rawKey = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (!rawKey) return;
    const key = rawKey.startsWith("--") ? rawKey : rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = val;
  });
  return out as CSSProperties;
}
