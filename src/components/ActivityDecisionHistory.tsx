import { CheckCircle2, ClipboardList, Clock, FileText, MessageSquare, Send, Upload, type LucideIcon } from "lucide-react";
import type { AssetFile, Project } from "../types";
import { allGates, gateStatusLabel } from "../lib/projectUtils";
import { Panel, PanelHeader, StatusBadge } from "./shared";

type HistoryRole = "admin" | "client";
type HistoryTone = "neutral" | "attention" | "good";
type HistoryBadge = "is-success" | "is-progress" | "is-review" | "is-locked" | "is-pending";

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  date: string;
  sort: number;
  icon: LucideIcon;
  tone?: HistoryTone;
};

type DecisionItem = {
  id: string;
  title: string;
  detail: string;
  date: string;
  sort: number;
  status: HistoryBadge;
  statusLabel: string;
};

type AssetStatus = NonNullable<AssetFile["status"]>;

function assetStatus(asset: AssetFile): AssetStatus {
  if (asset.status) return asset.status;
  return asset.sharedWithClient ? "shared" : "internal";
}

function readableDate(raw?: string) {
  if (!raw) return "No date";
  const cleaned = raw.replace(/^Requested\s+/, "");
  const parsed = new Date(cleaned.replace(" at ", " "));
  if (isNaN(parsed.getTime())) return cleaned.replace(/,\s*\d{4}/g, "").replace(/\s+at\s+.+$/, "");
  const now = new Date();
  const isToday = parsed.toDateString() === now.toDateString();
  if (isToday) {
    const timeMatch = cleaned.match(/at\s+(.+)$/);
    return timeMatch ? `Today at ${timeMatch[1]}` : "Today";
  }
  return cleaned.replace(/,\s*\d{4}/g, "").replace(/\s+at\s+.+$/, "");
}

function sortDate(raw?: string) {
  if (!raw) return 0;
  const cleaned = raw.replace(/^Requested\s+/, "").replace(" at ", " ");
  const parsed = Date.parse(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function phaseShortTitle(title: string) {
  return title.replace(/^\d+\.\d+\s+/, "");
}

function buildActivity(project: Project, role: HistoryRole): ActivityItem[] {
  const items: ActivityItem[] = [];

  project.milestones.forEach(milestone => {
    milestone.phases.forEach(phase => {
      if (phase.completedAt) {
        items.push({
          id: `phase-${phase.id}`,
          title: `Completed ${phaseShortTitle(phase.title)}`,
          detail: role === "admin" ? `${project.clientName} - M${milestone.number} ${milestone.clientLabel}` : `M${milestone.number} ${milestone.clientLabel}`,
          date: readableDate(phase.completedAt),
          sort: sortDate(phase.completedAt),
          icon: CheckCircle2,
          tone: "good",
        });
      }

      if (!phase.gate) return;
      const gate = phase.gate;

      if (gate.sentAt) {
        items.push({
          id: `gate-sent-${gate.id}`,
          title: role === "admin" ? `Sent ${gate.label}` : gate.clientLabel,
          detail: role === "admin" ? "Awaiting client decision" : "Ready for your review",
          date: readableDate(gate.sentAt),
          sort: sortDate(gate.sentAt),
          icon: Send,
          tone: gate.status === "sent" ? "attention" : "neutral",
        });
      }

      if (gate.clientFeedback) {
        items.push({
          id: `feedback-${gate.id}`,
          title: gate.clientFeedback.approved ? `Approved ${gate.label}` : `Revision notes for ${gate.label}`,
          detail: gate.clientFeedback.approved ? "Client approved this gate" : "Client requested updates",
          date: readableDate(gate.clientFeedback.submittedAt),
          sort: sortDate(gate.clientFeedback.submittedAt),
          icon: MessageSquare,
          tone: gate.clientFeedback.approved ? "good" : "attention",
        });
      } else if (gate.approvedAt) {
        items.push({
          id: `gate-approved-${gate.id}`,
          title: `Approved ${gate.label}`,
          detail: "Gate decision locked",
          date: readableDate(gate.approvedAt),
          sort: sortDate(gate.approvedAt),
          icon: CheckCircle2,
          tone: "good",
        });
      }
    });
  });

  project.assets.forEach(asset => {
    const status = assetStatus(asset);
    if (role === "client" && !asset.sharedWithClient && status !== "requested") return;

    const isRequest = status === "requested";
    items.push({
      id: `asset-${asset.id}`,
      title: isRequest ? `Requested ${asset.name}` : `${asset.source === "client" ? "Uploaded" : "Shared"} ${asset.name}`,
      detail: isRequest
        ? role === "client" ? "Material needed from you" : "Client material request"
        : `${asset.category} - ${status}`,
      date: readableDate(asset.uploadedAt),
      sort: sortDate(asset.uploadedAt),
      icon: isRequest ? Upload : FileText,
      tone: isRequest ? "attention" : "neutral",
    });
  });

  return items
    .sort((a, b) => b.sort - a.sort)
    .slice(0, 6);
}

function gateDecisionStatus(status: string): { status: HistoryBadge; label: string } {
  if (status === "approved") return { status: "is-success", label: "Approved" };
  if (status === "revision") return { status: "is-review", label: "Revision" };
  if (status === "sent") return { status: "is-review", label: "Awaiting" };
  if (status === "ready") return { status: "is-progress", label: "Ready" };
  return { status: "is-locked", label: "Locked" };
}

function buildDecisions(project: Project): DecisionItem[] {
  const decisions: DecisionItem[] = [];

  allGates(project)
    .filter(({ gate }) => gate.status !== "locked")
    .forEach(({ gate, milestone }) => {
      const status = gateDecisionStatus(gate.status);
      const date = gate.approvedAt ?? gate.clientFeedback?.submittedAt ?? gate.sentAt ?? "";
      decisions.push({
        id: `decision-${gate.id}`,
        title: gate.label,
        detail: `M${milestone.number} ${milestone.clientLabel} - ${gateStatusLabel(gate.status)}`,
        date: readableDate(date),
        sort: sortDate(date),
        status: status.status,
        statusLabel: status.label,
      });
    });

  project.milestones.forEach(milestone => {
    milestone.phases.forEach(phase => {
      const platformTask = phase.tasks.find(task => task.title.toLowerCase().includes("platform selection") && task.status === "complete");
      const briefTask = phase.tasks.find(task => task.title.toLowerCase().includes("lock project brief") && task.status === "complete");
      const copyTask = phase.tasks.find(task => task.title.toLowerCase().includes("review and approve copy") && task.status === "complete");
      const date = phase.completedAt ?? "";

      const majorDecisions = [
        platformTask && { id: `platform-${platformTask.id}`, title: `Platform confirmed: ${project.platform}`, detail: `M${milestone.number} ${milestone.clientLabel}`, date },
        briefTask && { id: `brief-${briefTask.id}`, title: "Project brief locked", detail: `M${milestone.number} ${milestone.clientLabel}`, date },
        copyTask && { id: `copy-${copyTask.id}`, title: "Copy direction approved", detail: `M${milestone.number} ${milestone.clientLabel}`, date },
      ].filter((item): item is { id: string; title: string; detail: string; date: string } => Boolean(item));

      majorDecisions.forEach(decision => {
        decisions.push({
          ...decision,
          date: readableDate(decision.date),
          sort: sortDate(decision.date),
          status: "is-success",
          statusLabel: "Locked",
        });
      });
    });
  });

  return decisions
    .sort((a, b) => b.sort - a.sort)
    .slice(0, 5);
}

function EmptyHistory({ label }: { label: string }) {
  return (
    <div className="history-empty">
      <ClipboardList />
      <span>{label}</span>
    </div>
  );
}

export function ActivityDecisionHistory({ project, role, showDecisionLog = true }: { project: Project; role: HistoryRole; showDecisionLog?: boolean }) {
  const activity = buildActivity(project, role);
  const decisions = buildDecisions(project);

  return (
    <div className={`history-grid ${showDecisionLog ? "" : "is-activity-only"}`}>
      <Panel className="history-panel">
        <PanelHeader title="Recent Activity" icon={Clock} />
        <div className="history-list">
          {activity.length === 0 ? (
            <EmptyHistory label="Activity will appear here as the project moves." />
          ) : activity.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.id} className={`history-row is-${item.tone ?? "neutral"}`}>
                <span className="history-icon"><Icon /></span>
                <span className="history-copy">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </span>
                <time>{item.date}</time>
              </div>
            );
          })}
        </div>
      </Panel>

      {showDecisionLog && <Panel className="history-panel">
        <PanelHeader title="Decision Log" icon={ClipboardList} />
        <div className="history-list decision-list">
          {decisions.length === 0 ? (
            <EmptyHistory label="Key approvals and scope decisions will collect here." />
          ) : decisions.map(item => (
            <div key={item.id} className="decision-row">
              <span className="history-copy">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <time>{item.date}</time>
              </span>
              <StatusBadge status={item.status} label={item.statusLabel} />
            </div>
          ))}
        </div>
      </Panel>}
    </div>
  );
}
