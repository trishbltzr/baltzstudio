import type { Task, Milestone, Project, ApprovalGate, Phase, TaskStatus, GateStatus, ClientLifecycleStage } from "../types";
import { AUDIT_CHECKLIST_SUBCATEGORY_RANGES } from "../data/auditTaxonomy";

export function allTasksComplete(tasks: Task[]) {
  return tasks.length > 0 && tasks.every((t) => t.status === "complete");
}

export function phaseProgress(tasks: Task[]) {
  return { done: tasks.filter((t) => t.status === "complete").length, total: tasks.length };
}

export function phaseProgressMarkers(tasks: Task[], markerCount = 5): TaskStatus[] {
  if (tasks.length === 0) {
    return Array.from({ length: markerCount }, () => "not_started" as TaskStatus);
  }

  const completeCount = tasks.filter((task) => task.status === "complete").length;
  const hasActive = tasks.some((task) => task.status === "in_progress" || task.status === "blocked");
  const completeMarkers = completeCount === tasks.length
    ? markerCount
    : Math.floor((completeCount / tasks.length) * markerCount);

  return Array.from({ length: markerCount }, (_, index) => {
    if (index < completeMarkers) return "complete" as TaskStatus;
    if (hasActive && index === completeMarkers) return "in_progress" as TaskStatus;
    return "not_started" as TaskStatus;
  });
}

export function milestoneProgress(m: Milestone) {
  const all = m.phases.flatMap((p) => p.tasks);
  return phaseProgress(all);
}

export function allGates(project: Project) {
  const result: Array<{ gate: ApprovalGate; milestone: Milestone; phase: Phase }> = [];
  for (const m of project.milestones)
    for (const p of m.phases)
      if (p.gate) result.push({ gate: p.gate, milestone: m, phase: p });
  return result;
}

export function lifecycleStage(project: Project): ClientLifecycleStage {
  return project.workflow?.stage ?? "wiaw-active";
}

export function isCocoonIntakeStage(project: Project) {
  return lifecycleStage(project) === "cocoon-consult";
}

export function isBuildLockedStage(project: Project) {
  const stage = lifecycleStage(project);
  return stage === "cocoon-consult" || stage === "paid-cocoon" || stage === "deleted";
}

export function isAuditMilestoneStage(project: Project) {
  const stage = lifecycleStage(project);
  return stage === "cocoon-consult" || stage === "paid-cocoon" || stage === "deleted";
}

export function isActiveBuildStage(project: Project) {
  const stage = lifecycleStage(project);
  return stage === "wiaw-active" || stage === "in-full-flight";
}

export function planAccess(project: Project) {
  const stage = lifecycleStage(project);
  const isPreCocoon = stage === "cocoon-consult";
  const isPremiumCocoon = stage === "paid-cocoon";
  const isBuildStage = stage === "wiaw-active" || stage === "in-full-flight";
  const isDeleted = stage === "deleted";
  const buildLocked = isPreCocoon || isPremiumCocoon || isDeleted;

  return {
    stage,
    isPreCocoon,
    isPremiumCocoon,
    isBuildStage,
    isDeleted,
    showAuditMilestones: isPreCocoon || isPremiumCocoon || isDeleted,
    buildLocked,
    overview: !isPreCocoon && !isDeleted,
    milestones: !isPreCocoon && !isDeleted,
    tasks: isBuildStage,
    files: !isPreCocoon && !isDeleted,
    assets: !isPreCocoon && !isDeleted,
    brandGuidelines: !isPreCocoon && !isDeleted,
    contract: isBuildStage,
    notifications: !isPreCocoon && !isDeleted,
    billing: !isPreCocoon && !isDeleted,
    support: isBuildStage,
    users: !isDeleted,
  };
}

type NextMoveRole = "admin" | "client";

function isStudioTask(task: Task) {
  return task.assignee === "AI" || task.assignee === "human";
}

export function projectNextMoves(project: Project, role: NextMoveRole) {
  const activeMilestone = project.milestones.find(milestone => milestone.status === "active");
  const activePhase = activeMilestone?.phases.find(phase => !allTasksComplete(phase.tasks));
  const activeTask = activePhase?.tasks.find(task => task.status === "in_progress")
    ?? activePhase?.tasks.find(task => task.status !== "complete");
  const pendingGate = allGates(project).find(({ gate }) => gate.status === "sent");
  const readyGate = allGates(project).find(({ gate }) => gate.status === "ready");
  const activeMilestoneIndex = activeMilestone
    ? project.milestones.findIndex(milestone => milestone.id === activeMilestone.id)
    : 0;
  const upcomingTasks = project.milestones
    .slice(Math.max(activeMilestoneIndex, 0))
    .flatMap(milestone => milestone.phases.flatMap(phase => phase.tasks))
    .filter(task => task.status !== "complete");
  const currentStudioTask = upcomingTasks.find(task => task.status === "in_progress" && isStudioTask(task))
    ?? upcomingTasks.find(isStudioTask);
  const currentStudioIndex = currentStudioTask
    ? upcomingTasks.findIndex(task => task.id === currentStudioTask.id)
    : -1;
  const nextStudioTask = currentStudioIndex > -1
    ? upcomingTasks.slice(currentStudioIndex + 1).find(isStudioTask)
    : upcomingTasks.find(isStudioTask);
  const nextClientTask = currentStudioIndex > -1
    ? upcomingTasks.slice(currentStudioIndex + 1).find(task => task.assignee === "client")
      ?? upcomingTasks.find(task => task.assignee === "client")
    : upcomingTasks.find(task => task.assignee === "client");

  if (pendingGate) {
    return [
      { label: "Current task", value: currentStudioTask?.title ?? pendingGate.gate.label },
      { label: "Up next", value: nextStudioTask?.title ?? "Continue build" },
      { label: "Waiting on", value: pendingGate.gate.clientLabel ?? nextClientTask?.title ?? "Client decision", action: role === "client" ? ("reviews" as const) : undefined },
    ];
  }

  if (readyGate) {
    return [
      { label: "Current task", value: currentStudioTask?.title ?? readyGate.gate.label },
      { label: "Up next", value: nextStudioTask?.title ?? "Client review" },
      { label: "Waiting on", value: nextClientTask?.title ?? "Studio to send" },
    ];
  }

  if (currentStudioTask || activeTask) {
    const clientOwnsTask = activeTask?.assignee === "client";
    return [
      {
        label: "Current task",
        value: currentStudioTask?.title ?? activeTask!.title,
        action: role === "client" && clientOwnsTask ? ("milestones" as const) : undefined,
      },
      { label: "Up next", value: nextStudioTask?.title ?? "Next phase" },
      { label: "Waiting on", value: nextClientTask?.title ?? "No client task right now" },
    ];
  }

  return [
    { label: "Current task", value: activePhase?.title.replace(/^\d+\.\d+\s+/, "") ?? "Review progress" },
    { label: "Up next", value: nextStudioTask?.title ?? "Launch prep" },
    { label: "Waiting on", value: nextClientTask?.title ?? "Next milestone" },
  ];
}

export function auditCategoryLabel(title: string) {
  return title.replace(/^\d+\.\d+\s+/, "");
}

export function groupAuditItems<T extends { label: string }>(categoryTitle: string, allItems: T[], items: T[]) {
  const ranges = AUDIT_CHECKLIST_SUBCATEGORY_RANGES[auditCategoryLabel(categoryTitle)];
  if (!ranges || items.length <= 8) return null;

  const groups = ranges.map(range => ({ title: range.title, items: [] as T[] }));
  for (const item of items) {
    const sourceIndex = allItems.findIndex(sourceItem => sourceItem.label === item.label);
    const groupIndex = ranges.findIndex(range => sourceIndex > -1 && sourceIndex < range.end);
    groups[Math.max(0, groupIndex)].items.push(item);
  }
  return groups.filter(group => group.items.length > 0);
}

export function taskStatusClass(status: TaskStatus) {
  return { not_started: "is-pending", in_progress: "is-progress", complete: "is-success", blocked: "is-blocked" }[status];
}

export function taskStatusLabel(status: TaskStatus) {
  return { not_started: "Not started", in_progress: "In progress", complete: "Complete", blocked: "Blocked" }[status];
}

// Short explanatory sentence shown beneath the label in a status badge's
// tap-to-reveal popover — gives mobile users (who only see the icon) enough
// context to understand what the status actually means, not just its name.
export function taskStatusDetail(status: TaskStatus) {
  return {
    not_started: "Hasn't been picked up yet.",
    in_progress: "Currently being worked on.",
    complete: "Finished and signed off.",
    blocked: "Waiting on something before this can continue.",
  }[status];
}

export function gateStatusClass(status: GateStatus) {
  return { locked: "is-locked", ready: "is-progress", sent: "is-review", approved: "is-success", revision: "is-review" }[status];
}

export function gateStatusLabel(status: GateStatus) {
  return { locked: "Locked", ready: "Ready to send", sent: "Awaiting client", approved: "Approved", revision: "Notes received" }[status];
}

// See taskStatusDetail — same purpose, for approval-gate statuses.
export function gateStatusDetail(status: GateStatus) {
  return {
    locked: "Unlocks once this phase wraps up.",
    ready: "Ready for the studio to send for your review.",
    sent: "Awaiting your decision in the Tasks tab.",
    approved: "Approved — no further action needed.",
    revision: "Feedback received; the studio is making updates.",
  }[status];
}
