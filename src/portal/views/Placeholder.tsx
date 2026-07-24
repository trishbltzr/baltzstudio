"use client";

import { Icon } from "../icons";
import { css, headFor } from "../helpers";
import type { Role, View } from "../types";

const LABELS: Partial<Record<View, string>> = {
  audits_new: "Checkups", escalations: "Escalations", activity: "Activity Log", team: "Users",
  playbooks: "Playbooks", billing: "Billing · Wise", review: "Approvals", milestones: "Journey",
  audit: "Checkup", files: "Shared Files", assistant: "In Full Flight",
  profile: "Profile & Settings", settings: "Settings", onboarding: "New Client",
};

export function Placeholder({ view, role }: { view: View; role: Role }) {
  const title = headFor(view, role)[1] || LABELS[view] || "Coming Soon";
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:3.5rem 2rem;display:flex;flex-direction:column;align-items:center;gap:0.9rem;text-align:center")}>
      <span style={css("width:3rem;height:3rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center")}><Icon name="layers" size={20} /></span>
      <div>
        <h2 style={css("margin:0;font-size:var(--text-xl);font-weight:500")}>{title}</h2>
        <p style={css("margin:0.4rem 0 0;font-size:var(--text-base);color:var(--fg-muted);max-width:26rem;line-height:1.5")}>This screen is part of the redesigned portal and is being built in a later pass. Snapshot, Clients, To-do&apos;s and Inbox are live now.</p>
      </div>
    </div>
  );
}
