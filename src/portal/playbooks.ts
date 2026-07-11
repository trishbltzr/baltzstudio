// Service playbooks — data + markdown helpers, ported from the reference HTML
// (the redesigned Playbooks tab: library → doc reader → editor).
import { SVC_META } from "./data";
import type { Service } from "./types";

export type Owner = "admin" | "dev" | "client" | "assistant" | "";

export interface PlaybookStep { o: Owner; t: string }
export interface PlaybookSeed {
  id: string;
  svc: Service;
  fn: string;
  icon: string;
  dur: string;
  tag: string;
  purpose: string;
  steps?: PlaybookStep[];
  outputs?: string[];
  summary?: string;
  notes?: string;
  md?: string;
  custom?: boolean;
}

export const OWNER_META: Record<string, { label: string; c: string; s: string }> = {
  admin: { label: "Admin", c: "var(--accent)", s: "var(--accent-soft)" },
  dev: { label: "Dev", c: "var(--fg)", s: "color-mix(in srgb,var(--fg) 8%,white 92%)" },
  client: { label: "Client", c: "var(--lane-client)", s: "var(--lane-client-soft)" },
  assistant: { label: "Assistant", c: "var(--lane-ai)", s: "var(--lane-ai-soft)" },
};
export function ownerMeta(o: string) {
  return OWNER_META[o] || { label: o || "Team", c: "var(--fg-muted)", s: "var(--surface-alt)" };
}

export const SVC_ORDER: Service[] = ["cocoon", "wiaw", "iff"];

export const PB_SEED: PlaybookSeed[] = [
  { id: "cc-audit", svc: "cocoon", fn: "Audit", icon: "chart", dur: "2–3 days", tag: "Diagnostic",
    purpose: "How the automated brand & site audit runs and turns into a readiness score.",
    steps: [{ o: "assistant", t: "Automated crawl pulls pages, copy and metadata" }, { o: "dev", t: "Score the six themes on a 0–100 scale" }, { o: "dev", t: "Flag critical / warning / strong findings per theme" }, { o: "admin", t: "Compile the overall readiness score and readout" }],
    outputs: ["Audit report", "Theme score cards"] },
  { id: "cc-intake", svc: "cocoon", fn: "Intake", icon: "checklist", dur: "1–2 days", tag: "Discovery",
    purpose: "How the six prep themes are collected from the client before the audit runs.",
    steps: [{ o: "admin", t: "Send the Cocoon intake questionnaire" }, { o: "client", t: "Complete the six prep themes" }, { o: "client", t: "Mark unsure items for a follow-up call" }, { o: "dev", t: "Review answers and flag gaps" }],
    outputs: ["Completed intake", "Gap list"] },
  { id: "cc-proposal", svc: "cocoon", fn: "Proposal", icon: "file", dur: "1 day", tag: "Scoping",
    purpose: "How audit findings become a scoped Winged in a Week or In Full Flight proposal.",
    steps: [{ o: "dev", t: "Map audit gaps to a build scope" }, { o: "admin", t: "Recommend a Winged in a Week sprint or IFF retainer" }, { o: "admin", t: "Draft timeline, deliverables and price" }, { o: "client", t: "Review and sign off to proceed" }],
    outputs: ["Scoped proposal", "Price estimate"] },
  { id: "ww-gate1", svc: "wiaw", fn: "Gate 1 · Design preview", icon: "flag", dur: "Day 1–2", tag: "Sprint",
    purpose: "How the first client sign-off gate — the design direction — is run.",
    steps: [{ o: "dev", t: "Confirm scope and references" }, { o: "dev", t: "Draft homepage and key page directions" }, { o: "dev", t: "Stage the preview for the client" }, { o: "client", t: "Approve one direction" }],
    outputs: ["Design preview link", "Gate 1 sign-off"] },
  { id: "ww-gate2", svc: "wiaw", fn: "Gate 2 · Build & review", icon: "flag", dur: "Day 3–5", tag: "Sprint",
    purpose: "How the approved design is built and packaged for the second gate.",
    steps: [{ o: "dev", t: "Build the approved design responsive" }, { o: "dev", t: "Polish product and page copy" }, { o: "dev", t: "Package the site for review" }, { o: "client", t: "Sign off to proceed to launch" }],
    outputs: ["Review build", "Gate 2 sign-off"] },
  { id: "ww-gate3", svc: "wiaw", fn: "Gate 3 · Launch", icon: "feather", dur: "Day 6–7", tag: "Sprint",
    purpose: "How the site is shipped, handed over, and the engagement closed.",
    steps: [{ o: "dev", t: "Final QA pass" }, { o: "admin", t: "Transfer hosting and ownership" }, { o: "dev", t: "Record a training walkthrough" }, { o: "admin", t: "Hand off the asset bundle" }],
    outputs: ["Live site", "Handoff bundle"] },
  { id: "iff-chat", svc: "iff", fn: "Chat-to-edit care", icon: "msg", dur: "Ongoing", tag: "Retainer",
    purpose: "How client edits flow from the assistant chat into published changes.",
    steps: [{ o: "client", t: "Send an edit via the assistant chat" }, { o: "assistant", t: "Draft the change instantly" }, { o: "dev", t: "Review and publish the change" }, { o: "admin", t: "Ticket logged to the inbox" }],
    outputs: ["Published edit", "Studio ticket"] },
  { id: "iff-upkeep", svc: "iff", fn: "Monthly upkeep", icon: "replay", dur: "Monthly", tag: "Retainer",
    purpose: "How the recurring content and maintenance cycle is run each month.",
    steps: [{ o: "dev", t: "Refresh live site content" }, { o: "dev", t: "Publish newsletter / campaign" }, { o: "assistant", t: "Monitor performance and flag issues" }, { o: "admin", t: "Send the monthly recap" }],
    outputs: ["Monthly recap", "Campaign"] },
  { id: "iff-esc", svc: "iff", fn: "Escalations & scope", icon: "alert", dur: "As needed", tag: "Retainer",
    purpose: "How out-of-scope or billing requests are escalated to the Admin.",
    steps: [{ o: "assistant", t: "Triage the inbound request" }, { o: "dev", t: "Handle in-scope items directly" }, { o: "admin", t: "Escalate scope / billing decisions" }, { o: "admin", t: "Log the decision to the trail" }],
    outputs: ["Escalation", "Decision log entry"] },
];

// Build the markdown source for a doc.
export function genMd(d: PlaybookSeed): string {
  const sm = SVC_META[d.svc];
  let md = "# " + d.fn + "\n\n**Service:** " + sm.label + "  ·  **Timing:** " + d.dur + "  ·  **Type:** " + d.tag + "\n\n## Summary\n" + (d.summary || d.purpose) + "\n\n## Process\n" + (d.steps || []).map((s, i) => (i + 1) + ". **" + ownerMeta(s.o).label + "** — " + s.t).join("\n") + "\n\n";
  if ((d.outputs || []).length) md += "## Outputs\n" + d.outputs!.map(o => "- " + o).join("\n") + "\n\n";
  if (d.notes) md += "## Notes\n" + d.notes + "\n";
  return md.trim();
}

// Title + purpose from an authored markdown source (for custom playbooks).
export function pbMeta(md: string): { fn: string; purpose: string } {
  const lines = (md || "").split("\n");
  let fn = "Untitled", purpose = "", inSummary = false;
  for (const ln of lines) {
    if (fn === "Untitled" && /^# /.test(ln)) { fn = ln.slice(2).trim(); continue; }
    if (!purpose && /^> /.test(ln)) { purpose = ln.slice(2).trim(); continue; }
    if (/^## /.test(ln)) { inSummary = /summary/i.test(ln); continue; }
    if (inSummary && !purpose && ln.trim()) purpose = ln.trim().replace(/\*\*/g, "");
  }
  return { fn, purpose };
}

// Extract the numbered "## Process" steps (owner + text) from markdown.
export function parseProcess(md: string): { owner: Owner; text: string }[] {
  const lines = (md || "").split("\n");
  let inP = false;
  const steps: { owner: Owner; text: string }[] = [];
  for (const ln of lines) {
    if (/^## /.test(ln)) { inP = /process/i.test(ln); continue; }
    if (inP && /^\s*\d+\. /.test(ln)) {
      const t = ln.replace(/^\s*\d+\.\s*/, "");
      const m = /^\*\*([^*]+)\*\*\s*[—–-]\s*(.+)$/.exec(t);
      if (m) steps.push({ owner: m[1].trim().toLowerCase() as Owner, text: m[2].trim() });
      else steps.push({ owner: "", text: t });
    }
  }
  return steps;
}

function stripSection(md: string, name: string): string {
  const lines = (md || "").split("\n");
  const out: string[] = [];
  let skip = false;
  for (const ln of lines) {
    if (/^## /.test(ln)) skip = new RegExp("^##\\s+" + name, "i").test(ln);
    if (!skip) out.push(ln);
  }
  return out.join("\n");
}

// The reader body = everything except the Process section and the Service meta line.
export function readerBody(md: string): string {
  return stripSection(md, "Process").split("\n").filter(ln => !/^\*\*Service:\*\*/.test(ln)).join("\n");
}
