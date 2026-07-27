// Role-scoped, filter-aware derived lists shared across views.
import { ALL_PROJECTS, MY_CLIENTS } from "./data";
import { clientsVisibleToRole } from "./clients";
import { clientJourneyMessaging, journeyStageSummary } from "./helpers";
import { mergePortalClientWorkspace, portalWorkspaceClientRefs, resolvePortalClientId, type PortalApprovalRecord, type PortalClientWorkspace, type PortalEngineWorkKey, type PortalEngineWorkRecord, type PortalWorkspaceClientRef } from "../lib/portalWorkspacePersistence";
import { syncPortalProcessRun, type PortalProcessRun } from "../lib/portalProcessRuns";
import { portalProcessReadiness } from "../lib/portalProcessTransitions";
import { clientHasEngineAccess, type PortalAccessState } from "./access";
import { getProcessDefinition, type ProcessId, type ProcessOwner } from "./processDefinitions";
import type { PortalState } from "./store";
import {
  DEFAULT_PORTAL_NOTIFICATION_PREFERENCES,
  type ClientProject,
  type Owner,
  type PortalNotificationPreferences,
  type Priority,
  type Task,
  type View,
} from "./types";
import {
  createPortalNotificationEvent,
  notificationEnabledByPreferences,
  notificationIsVisibleToRole,
  notificationTarget,
  serviceLifecycleNotificationEvents,
  taskAssignmentRecipientRoles,
  type NotificationRecipientRole,
  type PortalNotificationEvent,
} from "../lib/portalNotifications";

export interface ProcessTrackerItem {
  id: string;
  clientId: string;
  clientName: string;
  processId: ProcessId;
  processName: string;
  stageLabel: string;
  nextStageLabel: string;
  statusLabel: string;
  progress: number;
  ownerLabel: string;
  nextAction: string;
  blocker: string | null;
  blockerDetail: string | null;
  dueLabel: string;
  target: View;
  updatedAt: string;
}

function visibleWorkspaceClients(
  state: Pick<PortalState, "role" | "clientName" | "clientWorkspaces">,
): PortalWorkspaceClientRef[] {
  const clients = [...new Map(
    portalWorkspaceClientRefs(state.clientWorkspaces).map(client => {
      const resolvedId = resolvePortalClientId(client.name, state.clientWorkspaces);
      return [resolvedId, { id: resolvedId, name: client.name }] as const;
    }),
  ).values()];
  if (state.role === "client") {
    return clients.filter(client => client.name === state.clientName);
  }
  if (state.role === "dev") {
    const assignedStaticIds = new Set(clientsVisibleToRole("dev", state.clientName).map(client => client.id));
    return clients.filter(client => assignedStaticIds.has(client.id) || !!state.clientWorkspaces[client.id]);
  }
  return clients;
}

const PROCESS_OWNER_LABEL: Record<ProcessOwner, string> = {
  admin: "Admin",
  studio: "Studio",
  client: "Client",
  assistant: "Assistant",
  shared: "Studio + client",
};

function compactProcessBlocker(
  run: PortalProcessRun,
  fullBlocker: string | null,
  awaitingApproval: boolean,
) {
  const activeException = run.exceptions.find(exception => exception.status === "open");
  if (activeException) return activeException.label;
  if (fullBlocker?.startsWith("Overdue work")) return "Overdue";
  if (awaitingApproval) return "Approval pending";
  if (!fullBlocker) return null;
  const label = fullBlocker.split(" · ")[0].replace(/\s+is required$/i, "");
  return label.length > 36 ? `${label.slice(0, 33).trimEnd()}…` : label;
}

const ENGINE_PROCESS: Partial<Record<PortalEngineWorkKey, ProcessId>> = {
  websiteAudit: "website-audit",
  websiteBuilder: "website-build",
  seoAudit: "seo-audit",
  socialBuilder: "social-media-operations",
};

function fallbackEngineRun(key: PortalEngineWorkKey, record: PortalEngineWorkRecord, clientId: string, clientName: string): PortalProcessRun | undefined {
  const processId = ENGINE_PROCESS[key];
  if (!processId) return undefined;
  const socialPayload = key === "socialBuilder" ? record.payload as { months?: Array<{ id?: string; project?: { stage?: string; sent?: boolean } }> } | undefined : undefined;
  const socialMonth = socialPayload?.months?.[0];
  const currentStageId = key === "websiteAudit"
    ? record.status === "complete" ? "plan" : record.status === "ready" ? "report" : "discovery"
    : key === "websiteBuilder"
      ? record.status === "complete" ? "tasks" : record.status === "ready" ? "direction" : "discovery"
      : key === "seoAudit"
        ? record.status === "complete" ? "plan" : record.status === "ready" ? "audit" : "crawl"
        : socialMonth?.project?.stage || "brief";
  const processStages: Partial<Record<PortalEngineWorkKey, string[]>> = {
    websiteAudit: ["discovery", "report", "plan"],
    websiteBuilder: ["discovery", "direction", "tasks"],
    seoAudit: ["crawl", "audit", "search", "report", "plan"],
    socialBuilder: ["brief", "plan", "calendar", "schedule"],
  };
  const stageIndex = processStages[key]?.indexOf(currentStageId) ?? 0;
  return syncPortalProcessRun(record.processRun, {
    processId,
    runId: socialMonth?.id || `${processId}-${clientId}`,
    clientId,
    clientName,
    currentStageId,
    approvedStageIds: processStages[key]?.slice(0, Math.max(0, stageIndex)),
    complete: record.status === "complete" || socialMonth?.project?.sent === true,
    started: record.progress > 0,
    updatedAt: record.updatedAt,
  });
}

export function workspaceProcessRuns(clientId: string, clientName: string, workspace: PortalClientWorkspace): PortalProcessRun[] {
  const runs: PortalProcessRun[] = [];
  const brand = workspace.brandAudit;
  if (brand) {
    runs.push(syncPortalProcessRun(brand.session.processRun, {
      processId: "brand-audit",
      runId: `brand-audit-${clientId}`,
      clientId,
      clientName,
      currentStageId: brand.status === "intake" ? "discovery" : brand.status === "report_ready" ? "report" : "plan",
      approvedStageIds: brand.status === "intake" ? [] : brand.status === "report_ready" ? ["discovery"] : ["discovery", "report"],
      complete: brand.status === "complete",
      started: brand.progress > 0,
      updatedAt: brand.updatedAt,
    }));
  }
  (Object.entries(workspace.engineWork) as Array<[PortalEngineWorkKey, PortalEngineWorkRecord]>).forEach(([key, record]) => {
    const run = fallbackEngineRun(key, record, clientId, clientName);
    if (run) runs.push(run);
  });
  workspace.funnelPlans.forEach(plan => {
    const currentStageId = plan.statusLabel === "Complete" ? "brief" : plan.progress && plan.progress >= 75 ? "wireframe" : plan.progress && plan.progress >= 45 ? "copy" : plan.progress && plan.progress >= 25 ? "flow" : "discovery";
    const funnelStages = ["discovery", "flow", "copy", "wireframe", "brief"];
    runs.push(syncPortalProcessRun(plan.processRun, {
      processId: "funnel-build",
      runId: plan.buildId || plan.id,
      clientId,
      clientName,
      currentStageId,
      approvedStageIds: funnelStages.slice(0, Math.max(0, funnelStages.indexOf(currentStageId))),
      complete: plan.statusLabel === "Complete" || plan.progress === 100,
      started: (plan.progress || 0) > 0,
      updatedAt: plan.updatedAt,
      dueAt: plan.due,
    }));
  });
  return [...new Map(runs.map(run => [run.id, run])).values()];
}

function processTarget(processId: ProcessId, role: PortalState["role"]): View {
  if (processId === "brand-audit" || processId === "website-audit" || processId === "seo-audit") return role === "client" ? "audit" : "audits_new";
  return "funnels";
}

export function processTrackerItems(state: Pick<PortalState, "role" | "clientName" | "clientWorkspaces" | "projectOverrides">): ProcessTrackerItem[] {
  const visibleClients = visibleWorkspaceClients(state);
  const items = visibleClients.flatMap(client => {
    const workspace = mergePortalClientWorkspace(client.id, state.clientWorkspaces[client.id]);
    const canUseLiveLabs = clientHasEngineAccess(state as PortalAccessState, "labs");
    return workspaceProcessRuns(client.id, client.name, workspace)
      .filter(run => state.role !== "client" || canUseLiveLabs || run.template.category === "checkup")
      .map(run => {
      const stage = run.template.stages.find(item => item.id === run.currentStageId) || run.template.stages[0];
      const liveStage = getProcessDefinition(run.processId).stages.find(item => item.id === stage?.id);
      const currentStageIndex = Math.max(0, run.template.stages.findIndex(item => item.id === stage?.id));
      const nextVisibleStage = run.template.stages
        .slice(currentStageIndex + 1)
        .find(item => state.role !== "client" || item.access !== "internal");
      const readiness = portalProcessReadiness(run);
      const clientSafeInternal = state.role === "client" && stage?.access === "internal";
      const completedStages = run.stages.filter(item => item.status === "complete").length;
      const progress = run.status === "complete" ? 100 : Math.round((completedStages / Math.max(1, run.stages.length)) * 100);
      const awaitingApproval = run.status === "awaiting_approval";
      const activeException = run.exceptions.find(exception => exception.status === "open");
      const approvers = stage?.gate?.approvers.map(owner => PROCESS_OWNER_LABEL[owner]).join(" + ") || PROCESS_OWNER_LABEL[stage?.owner || "studio"];
      const blockerDetail = readiness.blockers[0] || (awaitingApproval ? `Waiting on ${approvers}` : null);
      return {
        id: run.id,
        clientId: run.clientId,
        clientName: run.clientName,
        processId: run.processId,
        processName: run.template.name,
        stageLabel: clientSafeInternal ? "Studio review" : stage?.label || "Not started",
        nextStageLabel: run.status === "complete"
          ? "Delivered"
          : nextVisibleStage?.label || (state.role === "client" ? "Client-safe output" : run.template.finalOutput),
        statusLabel: run.status === "complete" ? "Complete" : run.status === "blocked" ? "Blocked" : awaitingApproval ? "Approval needed" : run.status === "not_started" ? "Not started" : "In progress",
        progress,
        ownerLabel: run.status === "complete" ? "Complete" : activeException ? PROCESS_OWNER_LABEL[activeException.owner] : clientSafeInternal ? "Studio" : awaitingApproval ? approvers : PROCESS_OWNER_LABEL[stage?.owner || "studio"],
        nextAction: run.status === "complete" ? `Final output · ${run.template.finalOutput}` : clientSafeInternal ? "The studio is reviewing this stage before sharing the client-safe output." : liveStage?.nextAction || stage?.nextAction || "Confirm the next step.",
        blocker: compactProcessBlocker(run, blockerDetail, awaitingApproval),
        blockerDetail,
        dueLabel: run.dueAt ? `Due ${run.dueAt}` : "No due date",
        target: processTarget(run.processId, state.role),
        updatedAt: run.updatedAt,
      };
      });
  });
  const statusOrder: Record<string, number> = { Blocked: 0, "Approval needed": 1, "In progress": 2, "Not started": 3, Complete: 4 };
  return items.sort((left, right) => (statusOrder[left.statusLabel] ?? 9) - (statusOrder[right.statusLabel] ?? 9) || right.updatedAt.localeCompare(left.updatedAt));
}

function syncProjectWithJourney(project: ClientProject, state: PortalState): ClientProject {
  if (project.client !== state.clientName) return project;

  const { gate, stage, progress } = journeyStageSummary(state.journeyGates);
  if (!gate) return project;

  return {
    ...project,
    stage,
    progress,
    health: gate.status === "in_revision" ? "at_risk" : project.health,
  };
}

export function roleProjects(state: PortalState): ClientProject[] {
  let src = ALL_PROJECTS.map(project => syncProjectWithJourney({ ...project, ...(state.projectOverrides?.[project.client] || {}) }, state));
  if (state.role === "dev") src = src.filter(p => MY_CLIENTS.includes(p.client));
  if (state.role === "client") src = src.filter(p => p.client === state.clientName);
  const cf = state.clientFilter;
  return src.filter(p => (cf.service === "all" || p.service === cf.service) && (cf.health === "all" || p.health === cf.health));
}

export type TaskScopeState = Pick<PortalState, "role" | "clientName" | "tasks" | "taskFilter">;

export function roleTasks(state: TaskScopeState): Task[] {
  let src = state.tasks;
  if (state.role === "dev") src = src.filter(t => t.assignee === "Kier Mangibin" || t.owner === "ai");
  if (state.role === "client") src = src.filter(t => t.project === state.clientName);
  const tf = state.taskFilter;
  if (tf.owner !== "all") src = src.filter(t => (t.owner || "studio") === (tf.owner as Owner));
  if (tf.priority !== "all") src = src.filter(t => (t.priority || "med") === (tf.priority as Priority));
  return src;
}

export type InboxUnreadState = Pick<PortalState, "role" | "threads">;

export function inboxUnread(state: InboxUnreadState): number {
  if (state.role === "client") return 0;
  return state.threads.filter(t => (state.role === "admin" || MY_CLIENTS.includes(t.clientName)) && t.unread).length;
}

export type ApprovalScopeState = Pick<PortalState, "role" | "clientName" | "clientWorkspaces">;

export function pendingApprovalsForRole(
  state: ApprovalScopeState,
  workspaceForClient: (clientName: string) => PortalClientWorkspace,
): PortalApprovalRecord[] {
  if (state.role === "client") return [];
  return visibleWorkspaceClients(state)
    .flatMap(client => workspaceForClient(client.name).approvals)
    .filter(approval => !approval.sent);
}

export type StudioReviewQueueKind = "output" | "payment" | "process" | "task" | "escalation" | "inbox";

export interface StudioReviewQueueItem {
  id: string;
  kind: StudioReviewQueueKind;
  title: string;
  clientName: string;
  detail: string;
  statusLabel: string;
  ownerLabel: string;
  priority: "high" | "medium";
  target: View;
  actionLabel: string;
}

export function studioReviewQueueItems(
  state: PortalState,
  workspaceForClient: (clientName: string) => PortalClientWorkspace,
): StudioReviewQueueItem[] {
  if (state.role === "client") return [];
  const visibleClients = visibleWorkspaceClients(state);
  const visibleNames = new Set(visibleClients.map(client => client.name));
  const items: StudioReviewQueueItem[] = [];

  visibleClients.forEach(client => {
    const workspace = workspaceForClient(client.name);
    const paymentDraft = workspace.serviceLifecycle.paymentDetailsState === "draft";
    const emailDraft = workspace.aiActions.some(action => (
      action.type === "wise_payment_email"
      && (action.status === "draft" || action.status === "review_required")
    ));
    if (!paymentDraft && !emailDraft) return;
    items.push({
      id: `payment:${client.id}`,
      kind: "payment",
      title: "Wise payment details",
      clientName: client.name,
      detail: paymentDraft
        ? "Verify the recipient and QR asset before approval."
        : "Review the client-safe payment email before approval.",
      statusLabel: "Payment review",
      ownerLabel: "Studio Admin",
      priority: "high",
      target: "clients",
      actionLabel: "Review details",
    });
  });

  pendingApprovalsForRole(state, workspaceForClient).forEach(approval => items.push({
    id: `output:${approval.id}`,
    kind: "output",
    title: approval.title,
    clientName: approval.clientName,
    detail: approval.summary || "Review the client-safe output before explicitly sharing it.",
    statusLabel: "Output review",
    ownerLabel: "Studio",
    priority: "high",
    target: "review",
    actionLabel: "Review output",
  }));

  processTrackerItems(state)
    .filter(item => item.statusLabel === "Approval needed")
    .forEach(item => items.push({
      id: `process:${item.id}`,
      kind: "process",
      title: `${item.processName} · ${item.stageLabel}`,
      clientName: item.clientName,
      detail: item.blocker || item.nextAction,
      statusLabel: "Approval gate",
      ownerLabel: item.ownerLabel,
      priority: "high",
      target: item.target,
      actionLabel: "Open process",
    }));

  roleTasks(state)
    .filter(task => task.status === "review" && visibleNames.has(task.project))
    .forEach(task => items.push({
      id: `task:${task.id}`,
      kind: "task",
      title: task.title,
      clientName: task.project,
      detail: `Assigned to ${task.assignee}${task.due && task.due !== "—" ? ` · ${task.due}` : ""}`,
      statusLabel: "To-do review",
      ownerLabel: task.assignee,
      priority: task.priority === "high" ? "high" : "medium",
      target: "tasks",
      actionLabel: "Review to-do",
    }));

  state.escalations
    .filter(item => !item.resolved && visibleNames.has(item.client))
    .forEach(item => items.push({
      id: `escalation:${item.id}`,
      kind: "escalation",
      title: item.title,
      clientName: item.client,
      detail: item.reason,
      statusLabel: "Escalation",
      ownerLabel: item.by,
      priority: "high",
      target: "inbox",
      actionLabel: "Open inbox",
    }));

  state.threads
    .filter(thread => thread.unread > 0 && visibleNames.has(thread.clientName))
    .forEach(thread => items.push({
      id: `inbox:${thread.id}`,
      kind: "inbox",
      title: thread.name,
      clientName: thread.clientName,
      detail: `${thread.unread} unread repl${thread.unread === 1 ? "y" : "ies"} · ${thread.assignee}`,
      statusLabel: "Unread reply",
      ownerLabel: thread.assignee,
      priority: "medium",
      target: "inbox",
      actionLabel: "Open thread",
    }));

  const kindOrder: Record<StudioReviewQueueKind, number> = { output: 0, payment: 1, process: 2, escalation: 3, task: 4, inbox: 5 };
  return items.sort((left, right) => Number(right.priority === "high") - Number(left.priority === "high") || kindOrder[left.kind] - kindOrder[right.kind] || left.clientName.localeCompare(right.clientName));
}

export type PortalNotificationState = TaskScopeState & Pick<PortalState, "journeyGates" | "threads" | "escalations" | "notificationReadIds" | "notificationPreferences" | "clientWorkspaces" | "projectOverrides">;

function notificationTasks(state: PortalNotificationState): Task[] {
  if (state.role === "client") return state.tasks.filter(task => task.project === state.clientName);
  if (state.role === "dev") return state.tasks.filter(task => MY_CLIENTS.includes(task.project));
  return state.tasks;
}

function staffTaskCompletionRecipients(
  preferences: PortalNotificationPreferences,
): NotificationRecipientRole[] {
  return preferences.taskCompletionRecipients === "admin_only"
    ? ["studio_admin"]
    : ["studio_admin", "assigned_manager"];
}

function isClientCompletionTask(task: Task) {
  const recipients = taskAssignmentRecipientRoles(task);
  return task.owner === "client"
    || recipients.includes("client")
    || recipients.includes("shared");
}

export function specificTaskCompletionEvent(
  task: Task,
  role: PortalState["role"],
  preferences = DEFAULT_PORTAL_NOTIFICATION_PREFERENCES,
) {
  const type = task.completionEventType;
  if (!type || type === "task_completed" || task.status !== "done") return null;
  const client = role === "client";
  const staffOnly = type === "client_approval_completed"
    || type === "client_revision_notes_submitted"
    || type === "build_qa_completed"
    || type === "launch_prep_completed";
  const clientOnly = type === "studio_foundation_task_completed"
    || type === "handoff_package_sent";
  if (client && staffOnly) return null;
  if (!client && clientOnly) return null;
  if (type === "in_full_flight_task_completed" && ((client && task.owner === "client") || (!client && task.owner !== "client"))) return null;
  const latest = task.completionHistory?.filter(item => item.type === type).at(-1);
  const copy: Record<Exclude<NonNullable<Task["completionEventType"]>, "task_completed">, { client: string; staff: string; label: string; view: View }> = {
    studio_foundation_task_completed: {
      client: `${task.title} is complete.`,
      staff: `${task.title} is complete for ${task.project}.`,
      label: "View progress",
      view: "progress",
    },
    client_approval_completed: {
      client: "Your approval is recorded.",
      staff: `${task.project} completed ${task.title}.`,
      label: "Open to-do",
      view: "tasks",
    },
    client_revision_notes_submitted: {
      client: "Your revision notes are with the studio.",
      staff: `${task.project} submitted revision notes for ${task.title}.`,
      label: "Review notes",
      view: "tasks",
    },
    build_qa_completed: {
      client: `${task.title} passed studio QA.`,
      staff: `${task.title} completed QA for ${task.project}.`,
      label: "Review QA",
      view: "tasks",
    },
    launch_prep_completed: {
      client: "Launch preparation is complete.",
      staff: `Launch preparation is complete for ${task.project}; review before client release.`,
      label: "Review launch",
      view: "tasks",
    },
    handoff_package_sent: {
      client: "Open your handoff package.",
      staff: `Handoff package was sent to ${task.project}.`,
      label: "Open files",
      view: "files",
    },
    in_full_flight_task_completed: {
      client: `${task.title} is complete.`,
      staff: `${task.project} completed ${task.title}.`,
      label: "Open to-do",
      view: "tasks",
    },
    no_action_nurture_sent: {
      client: "Your latest studio update is ready.",
      staff: `No-action follow-up was sent to ${task.project}.`,
      label: "Open inbox",
      view: "inbox",
    },
  };
  const item = copy[type];
  return createPortalNotificationEvent({
    type,
    recipientRoles: client
      ? ["client"]
      : isClientCompletionTask(task)
        ? staffTaskCompletionRecipients(preferences)
        : taskAssignmentRecipientRoles(task).filter(recipient => recipient !== "client" && recipient !== "shared").length
          ? taskAssignmentRecipientRoles(task).filter(recipient => recipient !== "client" && recipient !== "shared")
          : ["studio_admin", "assigned_manager"],
    lifecycle: "unread",
    sourceKind: "task",
    sourceId: task.id,
    sourceVersion: latest?.id || `done:${type}`,
    clientName: task.project,
    projectName: task.project,
    assignee: task.assignee,
    lifecycleStage: task.milestone,
    nextAction: item.label,
    reviewed: type === "handoff_package_sent" || type === "no_action_nurture_sent",
    message: client ? item.client : item.staff,
    targetLabel: item.label,
    deepLink: { view: item.view, taskId: item.view === "tasks" ? task.id : undefined, section: task.id },
  });
}

export function portalNotificationEvents(state: PortalNotificationState): PortalNotificationEvent[] {
  const { gate, stage, progress } = journeyStageSummary(state.journeyGates);
  const tasks = notificationTasks(state);
  const events: PortalNotificationEvent[] = [];
  tasks.forEach(task => {
    const event = specificTaskCompletionEvent(task, state.role, state.notificationPreferences);
    if (event) events.push(event);
  });
  const visibleClients = clientsVisibleToRole(state.role, state.clientName);
  for (const client of visibleClients) {
    const workspace = mergePortalClientWorkspace(client.id, state.clientWorkspaces[client.id]);
    const baseProject = ALL_PROJECTS.find(project => project.client === client.name);
    const project = baseProject ? { ...baseProject, ...(state.projectOverrides[client.name] || {}) } : null;
    events.push(...serviceLifecycleNotificationEvents({
      role: state.role,
      clientId: client.id,
      clientName: client.name,
      lifecycle: workspace.serviceLifecycle,
    }));
    for (const operationalEvent of workspace.serviceEvents.filter(item => item.status === "active")) {
      const clientRecipient = operationalEvent.type === "form_reminder_due"
        || operationalEvent.type === "paid_cocoon_offered"
        || operationalEvent.type === "guided_call_reminder_due"
        || operationalEvent.type === "strategy_handoff_ready"
        || operationalEvent.type === "dashboard_deletion_notice";
      if ((state.role === "client") !== clientRecipient) continue;
      const operationalCopy = {
        landing_page_signup_received: {
          message: `New landing-page signup received for ${client.name}.`,
          nextAction: "Review and assign the new lead",
          label: "Open client",
          view: "clients" as View,
          sourceKind: "system" as const,
        },
        lead_signup_submitted: {
          message: `New lead submitted the Cocoon signup for ${client.name}.`,
          nextAction: "Review and assign the new lead",
          label: "Open client",
          view: "clients" as View,
          sourceKind: "system" as const,
        },
        form_reminder_due: {
          message: "Complete your Cocoon Consult intake.",
          nextAction: "Complete the remaining intake",
          label: "Open intake",
          view: "progress" as View,
          sourceKind: "system" as const,
        },
        first_ai_audit_pass_completed: {
          message: `First AI audit pass for ${client.name} needs studio review.`,
          nextAction: "Review the first AI pass",
          label: "Review Checkup",
          view: "audits_new" as View,
          sourceKind: "audit" as const,
        },
        second_ai_audit_pass_completed: {
          message: `Second AI audit pass for ${client.name} needs studio review.`,
          nextAction: "Review the second AI pass",
          label: "Review Checkup",
          view: "audits_new" as View,
          sourceKind: "audit" as const,
        },
        paid_cocoon_offered: {
          message: "Review the paid Cocoon guidance option.",
          nextAction: "Review the guided-call option",
          label: "View journey",
          view: "milestones" as View,
          sourceKind: "offer" as const,
        },
        guided_call_reminder_due: {
          message: "Prepare for your guided call.",
          nextAction: "Review your call details",
          label: "View journey",
          view: "milestones" as View,
          sourceKind: "booking" as const,
        },
        strategy_handoff_ready: {
          message: "Review your Cocoon strategy handoff.",
          nextAction: "Review the strategy handoff",
          label: "Open approval",
          view: "review" as View,
          sourceKind: "approval" as const,
        },
        dashboard_deletion_notice: {
          message: "Download anything you need. Your dashboard access is scheduled to end.",
          nextAction: "Download files before access ends",
          label: "Open files",
          view: "files" as View,
          sourceKind: "access" as const,
        },
      }[operationalEvent.type];
      events.push(createPortalNotificationEvent({
        type: operationalEvent.type,
        recipientRoles: clientRecipient ? ["client"] : ["studio_admin", "assigned_manager"],
        lifecycle: "unread",
        sourceKind: operationalCopy.sourceKind,
        sourceId: operationalEvent.id,
        sourceVersion: operationalEvent.occurredAt,
        clientName: client.name,
        assignee: operationalEvent.assignee,
        lifecycleStage: "Cocoon Consult",
        nextAction: operationalCopy.nextAction,
        reviewed: operationalEvent.reviewed,
        message: operationalCopy.message,
        targetLabel: operationalCopy.label,
        deepLink: { view: operationalCopy.view, section: operationalEvent.id },
      }));
    }
    if (project?.wise === "paid" && workspace.serviceLifecycle.paymentState !== "confirmed") {
      events.push(createPortalNotificationEvent({
        type: "wise_payment_confirmed",
        recipientRoles: state.role === "client" ? ["client"] : ["studio_admin", "assigned_manager"],
        lifecycle: "unread",
        sourceKind: "payment",
        sourceId: project.id,
        sourceVersion: "paid",
        clientName: client.name,
        projectName: project.name,
        lifecycleStage: project.stage,
        nextAction: state.role === "client" ? "Continue to the next available project step" : "Confirm the next delivery step is unlocked",
        message: state.role === "client"
          ? "Your Wise payment is confirmed. Your next available project step is now unlocked."
          : `Wise payment is confirmed for ${client.name}.`,
        targetLabel: state.role === "client" ? "View snapshot" : "Open billing",
        deepLink: { view: state.role === "client" ? "progress" : "billing", section: project.id },
      }));
    }
    if (state.role !== "client") {
      for (const file of workspace.files.filter(item => item.by === "Client")) {
        events.push(createPortalNotificationEvent({
          type: "client_asset_upload_completed",
          recipientRoles: ["studio_admin", "assigned_manager"],
          lifecycle: "unread",
          sourceKind: "system",
          sourceId: file.id,
          sourceVersion: file.updated,
          clientName: client.name,
          projectName: file.folder,
          assignee: "Client",
          lifecycleStage: "Asset collection",
          nextAction: "Review the uploaded asset",
          message: `${client.name} uploaded ${file.name}.`,
          targetLabel: "Open file",
          deepLink: { view: "files", section: file.id },
        }));
      }
    }
    for (const approval of workspace.approvals) {
      const auditOutput = approval.outputType === "audit";
      if (state.role === "client" && approval.sent && approval.reviewState === "shared") {
        events.push(createPortalNotificationEvent({
          type: auditOutput ? "audit_results_ready" : "design_preview_sent",
          recipientRoles: ["client"],
          lifecycle: "unread",
          sourceKind: "approval",
          sourceId: approval.id,
          sourceVersion: approval.reviewState,
          clientName: approval.clientName,
          projectName: approval.title,
          lifecycleStage: "Client review",
          nextAction: "Review the shared output",
          reviewed: true,
          message: `${approval.title} is ready for your review.`,
          targetLabel: "Open approval",
          deepLink: { view: "review", approvalId: approval.id },
        }));
      }
      if (state.role !== "client" && approval.reviewState === "needs_review") {
        events.push(createPortalNotificationEvent({
          type: auditOutput ? "audit_results_ready" : "review_ready",
          recipientRoles: ["studio_admin", "assigned_manager"],
          lifecycle: "unread",
          sourceKind: "approval",
          sourceId: approval.id,
          sourceVersion: approval.reviewState,
          clientName: approval.clientName,
          projectName: approval.title,
          lifecycleStage: "Internal review",
          nextAction: "Review before sharing with the client",
          message: `${approval.title} for ${approval.clientName} needs internal review.`,
          targetLabel: "Review output",
          deepLink: { view: "review", approvalId: approval.id },
        }));
      }
    }
    if (state.role === "client" && workspace.proposal?.sent && workspace.serviceLifecycle.wiawState === "not_offered") {
      events.push(createPortalNotificationEvent({
        type: "wiaw_recommended",
        recipientRoles: ["client"],
        lifecycle: "unread",
        sourceKind: "approval",
        sourceId: `${client.id}:proposal`,
        sourceVersion: workspace.proposal.sentAt || "sent",
        clientName: client.name,
        projectName: "Winged in a Week",
        lifecycleStage: "Recommendation",
        nextAction: "Review the recommendation",
        reviewed: true,
        message: "Your implementation recommendation is ready to review.",
        targetLabel: "Open recommendation",
        deepLink: { view: "review", section: "proposal" },
      }));
    }
  }

  if (state.role === "client") {
    tasks
      .filter(task => {
        const recipients = taskAssignmentRecipientRoles(task);
        return (recipients.includes("client") || recipients.includes("shared")) && task.status !== "done";
      })
      .forEach(task => events.push(createPortalNotificationEvent({
        type: "task_requested",
        recipientRoles: ["client"],
        lifecycle: "unread",
        sourceKind: "task",
        sourceId: task.id,
        sourceVersion: task.status,
        clientName: task.project,
        projectName: task.project,
        assignee: task.assignee,
        lifecycleStage: task.milestone,
        nextAction: task.title,
        message: `Your action: ${task.title}.`,
        targetLabel: "Open to-do",
        deepLink: { view: "tasks", taskId: task.id },
      })));

    tasks
      .filter(task => task.owner !== "client" && task.status === "done" && (!task.completionEventType || task.completionEventType === "task_completed"))
      .forEach(task => events.push(createPortalNotificationEvent({
        type: "task_completed",
        recipientRoles: ["client"],
        lifecycle: "unread",
        sourceKind: "task",
        sourceId: task.id,
        sourceVersion: task.status,
        clientName: task.project,
        projectName: task.project,
        assignee: task.assignee,
        lifecycleStage: task.milestone,
        message: `${task.title} is complete.`,
        targetLabel: "View to-do",
        deepLink: { view: "tasks", taskId: task.id },
      })));

    if (gate) {
      events.push(createPortalNotificationEvent({
        type: "journey_update",
        recipientRoles: ["client"],
        lifecycle: "unread",
        sourceKind: "journey_gate",
        sourceId: gate.id,
        sourceVersion: gate.status,
        lifecycleStage: stage,
        nextAction: gate.next,
        message: `${clientJourneyMessaging(gate).notificationItem} ${stage} is ${progress}% complete.`,
        targetLabel: "View journey",
        deepLink: { view: "milestones", section: gate.id },
      }));
    }

    return events.filter(event => notificationIsVisibleToRole(event, state.role));
  }

  const scopedThreads = state.threads.filter(thread => state.role === "admin" || MY_CLIENTS.includes(thread.clientName));
  const unreadThreads = scopedThreads.filter(thread => thread.unread > 0).length;
  const openEscalations = state.escalations.filter(item => !item.resolved && (state.role === "admin" || MY_CLIENTS.includes(item.client))).length;

  tasks
    .filter(task => task.status === "todo" || task.status === "in_progress")
    .forEach(task => {
      const assignmentRecipients = taskAssignmentRecipientRoles(task)
        .filter(recipient => recipient !== "client" && recipient !== "shared");
      const recipients = assignmentRecipients.length
        ? assignmentRecipients
        : taskAssignmentRecipientRoles(task).includes("shared")
          ? ["studio_admin", "assigned_manager"] as const
          : [];
      if (recipients.length === 0) return;
      events.push(createPortalNotificationEvent({
        type: "task_requested",
        recipientRoles: [...recipients],
        lifecycle: "unread",
        sourceKind: "task",
        sourceId: task.id,
        sourceVersion: `${task.status}:${taskAssignmentRecipientRoles(task).join(",")}`,
        clientName: task.project,
        projectName: task.project,
        assignee: task.assignment?.label || task.assignee,
        lifecycleStage: task.milestone,
        nextAction: task.title,
        message: `${task.title} is assigned for ${task.project}.`,
        targetLabel: "Open to-do",
        deepLink: { view: "tasks", taskId: task.id },
      }));
    });

  tasks
    .filter(task => task.status === "review")
    .forEach(task => {
      const assignmentRecipients = taskAssignmentRecipientRoles(task)
        .filter(recipient => recipient !== "client" && recipient !== "shared");
      events.push(createPortalNotificationEvent({
      type: "review_ready",
      recipientRoles: assignmentRecipients.length ? assignmentRecipients : ["studio_admin", "assigned_manager"],
      lifecycle: "unread",
      sourceKind: "task",
      sourceId: task.id,
      sourceVersion: task.status,
      clientName: task.project,
      projectName: task.project,
      assignee: task.assignee,
      lifecycleStage: task.milestone,
      nextAction: "Review the completed work",
      message: `${task.title} for ${task.project} is ready for review.`,
      targetLabel: "Review to-do",
      deepLink: { view: "tasks", taskId: task.id },
      }));
    });

  const completedClientTasks = tasks
    .filter(task => {
      const recipients = taskAssignmentRecipientRoles(task);
      return (recipients.includes("client") || recipients.includes("shared"))
        && task.status === "done"
        && (!task.completionEventType || task.completionEventType === "task_completed");
    });

  if (state.notificationPreferences.taskCompletionDelivery === "daily_digest") {
    const completedClientTaskIds = new Set(
      tasks.filter(task => task.status === "done" && isClientCompletionTask(task)).map(task => task.id),
    );
    const individualIndexes = events
      .map((event, index) => completedClientTaskIds.has(event.sourceId) && event.sourceKind === "task" ? index : -1)
      .filter(index => index >= 0);
    const digestCount = new Set([
      ...completedClientTasks.map(task => task.id),
      ...individualIndexes.map(index => events[index]?.sourceId).filter(Boolean),
    ]).size;
    for (const index of individualIndexes.reverse()) events.splice(index, 1);
    if (digestCount > 0) {
      events.push(createPortalNotificationEvent({
        type: "task_completed",
        recipientRoles: staffTaskCompletionRecipients(state.notificationPreferences),
        lifecycle: "unread",
        sourceKind: "task",
        sourceId: "client-task-completion-digest",
        sourceVersion: `${digestCount}:${tasks.filter(task => task.status === "done" && isClientCompletionTask(task)).map(task => task.id).sort().join(",")}`,
        nextAction: "Review completed client to-dos",
        message: `${digestCount} client to-do${digestCount === 1 ? "" : "s"} completed.`,
        targetLabel: "View to-dos",
        deepLink: { view: "tasks", section: "completed-client-tasks" },
      }));
    }
  } else {
    completedClientTasks.forEach(task => events.push(createPortalNotificationEvent({
        type: "task_completed",
        recipientRoles: staffTaskCompletionRecipients(state.notificationPreferences),
        lifecycle: "unread",
        sourceKind: "task",
        sourceId: task.id,
        sourceVersion: task.status,
        clientName: task.project,
        projectName: task.project,
        assignee: task.assignee,
        lifecycleStage: task.milestone,
        nextAction: "Continue the next studio step",
        message: `${task.project} completed ${task.title}.`,
        targetLabel: "View to-do",
        deepLink: { view: "tasks", taskId: task.id },
      })));
  }

  if (openEscalations) events.push(createPortalNotificationEvent({
    type: "escalation_opened",
    recipientRoles: ["studio_admin", "assigned_manager"],
    lifecycle: "unread",
    sourceKind: "escalation",
    sourceId: "open",
    sourceVersion: String(openEscalations),
    nextAction: "Review and assign each escalation",
    message: `${openEscalations} escalation${openEscalations === 1 ? " needs" : "s need"} attention.`,
    targetLabel: "Open inbox",
    deepLink: { view: "inbox", section: "escalations" },
  }));

  if (unreadThreads) events.push(createPortalNotificationEvent({
    type: "inbox_unread",
    recipientRoles: ["studio_admin", "assigned_manager"],
    lifecycle: "unread",
    sourceKind: "thread",
    sourceId: "unread",
    sourceVersion: String(unreadThreads),
    nextAction: "Read and respond",
    message: `${unreadThreads} client thread${unreadThreads === 1 ? " has" : "s have"} unread replies.`,
    targetLabel: "Open inbox",
    deepLink: { view: "inbox" },
  }));

  return events.filter(event => (
    notificationIsVisibleToRole(event, state.role)
    && notificationEnabledByPreferences(event, state.notificationPreferences)
  ));
}

export function portalNotificationSummary(state: PortalNotificationState): { count: number; lead: string; items: PortalNotificationEvent[]; target: View; targetLabel: string } {
  const readIds = new Set(state.notificationReadIds);
  const items = portalNotificationEvents(state).filter(item => item.lifecycle !== "resolved" && (state.role !== "client" || item.lifecycle !== "draft") && !readIds.has(item.id));
  const first = items[0];

  if (state.role === "client") {
    return {
      count: items.length,
      lead: items.length ? "These updates come from your current journey and assigned to-dos." : "You are all caught up. There are no new actions or journey updates.",
      items,
      target: first ? notificationTarget(first) : "progress",
      targetLabel: first?.targetLabel || "View snapshot",
    };
  }

  return {
    count: items.length,
    lead: items.length
      ? state.role === "admin"
        ? "Updates are routed from task ownership, review state, escalations, and inbox activity."
        : "Your assigned clients' reviews, completed client work, escalations, and replies are shown here."
      : "You are all caught up. There are no assigned reviews, escalations, or unread replies.",
    items,
    target: first ? notificationTarget(first) : "progress",
    targetLabel: first?.targetLabel || "View snapshot",
  };
}
