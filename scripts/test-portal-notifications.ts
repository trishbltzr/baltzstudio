import assert from "node:assert/strict";
import {
  createPortalNotificationEvent,
  notificationCategory,
  notificationEnabledByPreferences,
  notificationEventId,
  notificationIsVisibleToRole,
  notificationMessageIsHelpful,
  notificationMayTargetSuperadmin,
  notificationRequiresReview,
  notificationTarget,
  serviceLifecycleNotificationEvents,
  taskAssignmentRecipientRoles,
  taskAssignmentRole,
} from "../src/lib/portalNotifications";
import {
  PORTAL_WORKSPACE_DATA_VERSION,
  applyPortalServiceLifecyclePolicy,
  emptyPortalClientWorkspace,
  emptyPortalServiceLifecycle,
  mergePortalClientWorkspace,
  normalizePortalNotificationPreferences,
  normalizePortalServiceLifecycle,
  appendPortalClientAuditRecord,
  portalClientId,
  portalAuditExportModeAllowed,
  projectPersistedPortalWorkspaceStateForClient,
  validatePortalServiceLifecycleUpdate,
  type PersistedPortalWorkspaceState,
} from "../src/lib/portalWorkspacePersistence";
import { applyTaskStatusLifecycle, initializeTaskLifecycle } from "../src/lib/portalTaskLifecycle";
import { taskOwnerLabel } from "../src/portal/helpers";
import { DEFAULT_PORTAL_NOTIFICATION_PREFERENCES, type Task } from "../src/portal/types";
import { portalNotificationEvents, portalNotificationSummary, specificTaskCompletionEvent, type PortalNotificationState } from "../src/portal/selectors";
import { createCreatorIqWebsiteAuditDraft } from "../src/lib/creatorIqDemoWorkspace";
import { projectPersistedAuditDraftForClient } from "../src/lib/portalAuditPersistence";
import { PORTAL_LIFECYCLE_DEMO_FIXTURES, PORTAL_NOTIFICATION_DEMO_TASKS } from "../src/portal/demoFixtures";

assert.deepEqual(
  PORTAL_LIFECYCLE_DEMO_FIXTURES.map(fixture => fixture.id),
  ["cocoon-intake", "paid-cocoon", "wiaw-active", "iff-active", "deleted"],
);
assert.equal(
  specificTaskCompletionEvent(PORTAL_NOTIFICATION_DEMO_TASKS[0], "client")?.recipientRoles.includes("client"),
  true,
);
assert.equal(
  specificTaskCompletionEvent(PORTAL_NOTIFICATION_DEMO_TASKS[1], "admin")?.recipientRoles.includes("studio_admin"),
  true,
);

const clientTask = createPortalNotificationEvent({
  type: "task_requested",
  recipientRoles: ["client"],
  lifecycle: "unread",
  sourceKind: "task",
  sourceId: "task-1",
  sourceVersion: "todo",
  clientName: "Acme",
  nextAction: "Upload the logo",
  message: "Your action: Upload the logo.",
  targetLabel: "Open to-do",
  deepLink: { view: "tasks", taskId: "task-1" },
});

assert.equal(clientTask.id, notificationEventId("task_requested", "task", "task-1", "todo"));
assert.equal(notificationIsVisibleToRole(clientTask, "client"), true);
assert.equal(notificationIsVisibleToRole(clientTask, "admin"), false);
assert.equal(notificationTarget(clientTask), "tasks");
assert.equal(clientTask.deepLink.taskId, "task-1");
assert.equal(notificationMessageIsHelpful(clientTask.message), true);
assert.equal(notificationMessageIsHelpful("Last chance — act now"), false);
assert.equal(createPortalNotificationEvent({
  type: "journey_update",
  recipientRoles: ["client"],
  lifecycle: "unread",
  sourceKind: "system",
  sourceId: "pressure-test",
  sourceVersion: "1",
  message: "Last chance — act now",
  targetLabel: "Open journey",
  deepLink: { view: "milestones" },
}).message, "A workspace update is ready. Open it when you are ready for the next step.");
assert.equal(notificationCategory(clientTask.type), "tasks");
assert.equal(notificationEnabledByPreferences(clientTask, DEFAULT_PORTAL_NOTIFICATION_PREFERENCES), true);
assert.equal(notificationEnabledByPreferences(clientTask, {
  ...DEFAULT_PORTAL_NOTIFICATION_PREFERENCES,
  inApp: { ...DEFAULT_PORTAL_NOTIFICATION_PREFERENCES.inApp, tasks: false },
}), false);
assert.notEqual(
  clientTask.id,
  notificationEventId("task_requested", "task", "task-1", "in_progress"),
  "A reopened or changed task must receive a new current event identity.",
);

const auditClaim = createPortalNotificationEvent({
  type: "audit_results_ready",
  recipientRoles: ["studio_admin"],
  lifecycle: "unread",
  sourceKind: "audit",
  sourceId: "run-1",
  sourceVersion: "ready",
  clientName: "Acme",
  message: "Acme audit results are ready for review.",
  targetLabel: "Review Checkup",
  deepLink: { view: "activity", serviceRunId: "run-1" },
});

assert.equal(notificationRequiresReview(auditClaim.type), true);
assert.equal(auditClaim.reviewRequired, true);
assert.equal(auditClaim.lifecycle, "draft");
assert.equal(notificationIsVisibleToRole(auditClaim, "admin"), true);
assert.equal(notificationIsVisibleToRole(auditClaim, "client"), false);

const sharedAuditClaim = createPortalNotificationEvent({
  type: "audit_results_ready",
  recipientRoles: ["client"],
  lifecycle: "unread",
  sourceKind: "approval",
  sourceId: "approval-1",
  sourceVersion: "shared",
  reviewed: true,
  message: "Your audit is ready to review.",
  targetLabel: "Open approval",
  deepLink: { view: "review", approvalId: "approval-1" },
});
assert.equal(sharedAuditClaim.reviewRequired, true);
assert.equal(sharedAuditClaim.lifecycle, "unread", "Already reviewed and shared claims may enter the client unread feed.");

const shared = createPortalNotificationEvent({
  type: "journey_update",
  recipientRoles: ["shared"],
  lifecycle: "unread",
  sourceKind: "journey_gate",
  sourceId: "gate-1",
  sourceVersion: "ready",
  message: "A milestone is ready.",
  targetLabel: "View journey",
  deepLink: { view: "milestones", section: "gate-1" },
});

assert.equal(notificationIsVisibleToRole(shared, "admin"), true);
assert.equal(notificationIsVisibleToRole(shared, "dev"), true);
assert.equal(notificationIsVisibleToRole(shared, "client"), true);
assert.equal(taskOwnerLabel("client", "client"), "Your task");
assert.equal(taskOwnerLabel("studio", "client"), "Studio task");
assert.equal(taskOwnerLabel("ai", "client"), "Studio task");
assert.equal(taskOwnerLabel("gate", "client"), "Shared review");
assert.equal(taskOwnerLabel("ai", "admin"), "Assistant");

const managerAssignedTask: Task = {
  id: "manager-task",
  title: "Review the homepage plan",
  project: "Blue Ribbon",
  assignee: "Manager",
  assignment: { role: "manager", label: "Manager" },
  owner: "studio",
  status: "todo",
  priority: "med",
  due: "July 25",
};
assert.equal(taskAssignmentRole(managerAssignedTask), "manager");
assert.deepEqual(taskAssignmentRecipientRoles(managerAssignedTask), ["assigned_manager"]);
assert.deepEqual(taskAssignmentRecipientRoles({
  ...managerAssignedTask,
  assignment: { role: "superadmin", label: "Superadmin" },
}), ["superadmin", "studio_admin"]);
const superadminTaskEvent = createPortalNotificationEvent({
  type: "task_requested",
  recipientRoles: ["superadmin", "studio_admin"],
  lifecycle: "unread",
  sourceKind: "task",
  sourceId: "superadmin-task",
  sourceVersion: "todo",
  message: "Review the assigned task.",
  targetLabel: "Open to-do",
  deepLink: { view: "tasks", taskId: "superadmin-task" },
});
assert.deepEqual(superadminTaskEvent.recipientRoles, ["studio_admin"]);
assert.equal(notificationMayTargetSuperadmin(superadminTaskEvent), false);
const superadminAccessEvent = createPortalNotificationEvent({
  type: "dashboard_deletion_notice",
  recipientRoles: ["superadmin"],
  lifecycle: "unread",
  sourceKind: "access",
  sourceId: "client-access",
  sourceVersion: "deletion-scheduled",
  reviewed: true,
  message: "Dashboard deletion is scheduled.",
  targetLabel: "Review access",
  deepLink: { view: "clients", section: "access" },
});
assert.deepEqual(superadminAccessEvent.recipientRoles, ["superadmin"]);
assert.equal(notificationMayTargetSuperadmin(superadminAccessEvent), true);
assert.deepEqual(taskAssignmentRecipientRoles({
  ...managerAssignedTask,
  assignment: { role: "shared", label: "Client + Studio Admin" },
}), ["shared"]);

const normalized = normalizePortalServiceLifecycle({
  consultState: "invalid",
  paymentState: "confirmed",
  bookingState: "booked",
  guidedCallBookedAt: "2026-07-24T08:00:00.000Z",
});
const normalizedNotificationPreferences = normalizePortalNotificationPreferences({
  taskCompletionRecipients: "admin_only",
  taskCompletionDelivery: "daily_digest",
});
assert.equal(normalizedNotificationPreferences.taskCompletionRecipients, "admin_only");
assert.equal(normalizedNotificationPreferences.taskCompletionDelivery, "daily_digest");
assert.equal(
  normalizePortalNotificationPreferences({
    taskCompletionRecipients: "everyone",
    taskCompletionDelivery: "hourly",
  }).taskCompletionRecipients,
  DEFAULT_PORTAL_NOTIFICATION_PREFERENCES.taskCompletionRecipients,
);
assert.equal(normalized.consultState, "not_started");
assert.equal(normalized.auditState, "not_started");
assert.equal(normalized.deliverableState, "not_started");
assert.equal(normalized.automationReviewState, "not_required");
assert.equal(normalized.paymentDetailsState, "not_prepared");
assert.equal(validatePortalServiceLifecycleUpdate(normalized, { paymentDetailsState: "sent" }), "Approve the Wise payment details before marking them sent");
assert.equal(validatePortalServiceLifecycleUpdate(normalized, { paymentState: "email_sent" }), "Approve the Wise payment details before marking the email sent");
assert.equal(validatePortalServiceLifecycleUpdate(normalized, { paymentState: "confirmed" }), "Match the Wise recipient and transfer reference before confirming payment");
assert.equal(validatePortalServiceLifecycleUpdate({
  ...normalized,
  paymentRecipientLabel: "Baltazar Studio Ltd",
  paymentConfirmationReference: "ACME-001",
}, { paymentState: "confirmed" }), null);
assert.equal(validatePortalServiceLifecycleUpdate(normalized, { bookingState: "booked" }), "Unlock the guided call before recording a booking");
assert.equal(validatePortalServiceLifecycleUpdate({ ...normalized, bookingState: "unlocked" }, { bookingState: "booked" }), null);
assert.equal(validatePortalServiceLifecycleUpdate({ ...normalized, bookingState: "unlocked" }, { bookingState: "completed" }), "Record the guided-call booking before marking it complete");
assert.equal(normalized.wiawPaymentState, "not_required");
const policyMoment = "2026-07-24T08:00:00.000Z";
const paidCocoonLifecycle = applyPortalServiceLifecyclePolicy(
  emptyPortalServiceLifecycle(),
  {
    paymentState: "confirmed",
    paymentRecipientLabel: "Baltazar Studio Ltd",
    paymentConfirmationReference: "ACME-001",
  },
  policyMoment,
);
assert.equal(paidCocoonLifecycle.bookingState, "unlocked");
assert.equal(paidCocoonLifecycle.dashboardAccessState, "active");
assert.equal(paidCocoonLifecycle.dashboardAccessStartsAt, policyMoment);
assert.equal(paidCocoonLifecycle.dashboardAccessEndsAt, "2026-10-24T08:00:00.000Z");
const guidedCallLifecycle = applyPortalServiceLifecyclePolicy(
  {
    ...emptyPortalServiceLifecycle(),
    bookingState: "booked",
    dashboardAccessStartTrigger: "guided_call_completion",
  },
  { bookingState: "completed" },
  policyMoment,
);
assert.equal(guidedCallLifecycle.guidedCallCompletedAt, policyMoment);
assert.equal(guidedCallLifecycle.guidanceWindowStartsAt, policyMoment);
assert.equal(guidedCallLifecycle.guidanceWindowEndsAt, "2026-07-25T08:00:00.000Z");
assert.equal(guidedCallLifecycle.dashboardAccessEndsAt, "2026-10-24T08:00:00.000Z");
const confirmedWiawLifecycle = applyPortalServiceLifecyclePolicy(
  emptyPortalServiceLifecycle(),
  { wiawState: "confirmed" },
  policyMoment,
);
assert.equal(confirmedWiawLifecycle.dashboardAccessState, "active");
assert.equal(confirmedWiawLifecycle.dashboardAccessEndsAt, undefined, "Confirmed WIAW access is not given a fixed expiry.");
assert.equal(applyPortalServiceLifecyclePolicy(
  { ...confirmedWiawLifecycle, wiawPauseAccessPolicy: "suspend" },
  { wiawState: "paused" },
  policyMoment,
).dashboardAccessState, "suspended");
assert.equal(applyPortalServiceLifecyclePolicy(
  confirmedWiawLifecycle,
  { wiawState: "cancelled" },
  policyMoment,
).dashboardAccessState, "expired");
assert.equal(applyPortalServiceLifecyclePolicy(
  emptyPortalServiceLifecycle(),
  { iffState: "active" },
  policyMoment,
).dashboardAccessState, "active");
assert.equal(portalAuditExportModeAllowed(emptyPortalServiceLifecycle(), "client"), true);
assert.equal(portalAuditExportModeAllowed(emptyPortalServiceLifecycle(), "partner"), false);
assert.equal(portalAuditExportModeAllowed({
  ...emptyPortalServiceLifecycle(),
  whiteLabelAudience: "partners",
}, "partner"), true);
assert.equal(portalAuditExportModeAllowed({
  ...emptyPortalServiceLifecycle(),
  whiteLabelAudience: "both",
}, "client"), true);
const normalizedWorkspace = mergePortalClientWorkspace("acme", {
  aiActions: [{
    id: "acme:audit_draft:1",
    type: "audit_draft",
    status: "review_required",
    clientSafePreview: "A reviewed preview",
    createdAt: "2026-07-24T08:00:00.000Z",
    updatedAt: "2026-07-24T08:00:00.000Z",
    createdBy: "Studio team",
  }],
});
assert.equal(normalizedWorkspace.aiActions.length, 1);
assert.equal(normalizedWorkspace.aiActions[0]?.status, "review_required");
assert.equal(normalized.paymentState, "confirmed");
assert.equal(normalized.bookingState, "booked");
const auditedWorkspace = appendPortalClientAuditRecord(emptyPortalClientWorkspace("blue-ribbon"), {
  action: "proposal_sent",
  summary: "Sent proposal",
  actor: "Trish Baltazar",
  actorRole: "admin",
  occurredAt: "2026-07-24T08:00:00.000Z",
  clientVisible: true,
  sourceId: "proposal-1",
});
assert.equal(auditedWorkspace.auditTrail.length, 1);
assert.equal(auditedWorkspace.auditTrail[0]?.sourceId, "proposal-1");

const privateWorkspace = mergePortalClientWorkspace("blue-ribbon", {
  auditTrail: auditedWorkspace.auditTrail,
  approvals: [
    { id: "shared", clientId: "blue-ribbon", clientName: "Blue Ribbon", title: "Shared report", thumb: "", sent: true },
    { id: "draft", clientId: "blue-ribbon", clientName: "Blue Ribbon", title: "Internal draft", thumb: "", sent: false },
  ],
  notes: [{ id: "note-1", text: "Internal note", author: "Studio", createdAt: "2026-07-24T08:00:00.000Z" }],
  funnelPlans: [{
    id: "plan-1",
    buildId: "build-1",
    type: "funnel_plan",
    clientId: "blue-ribbon",
    clientName: "Blue Ribbon",
    title: "Internal build plan",
    statusLabel: "Draft",
    due: "—",
    generatedAt: "2026-07-24T08:00:00.000Z",
    updatedAt: "2026-07-24T08:00:00.000Z",
    content: { internal: true },
  }],
  engineWork: {
    websiteAudit: {
      status: "in_progress",
      progress: 40,
      updatedAt: "2026-07-24T08:00:00.000Z",
      payload: { internalEvidence: "must not cross the client boundary" },
    },
  },
  serviceLifecycle: {
    ...emptyPortalServiceLifecycle(),
    paymentState: "pending",
    paymentDetailsState: "approved",
    paymentConfirmationReference: "internal-reference",
    paymentRecipientLabel: "Internal recipient",
    paymentQrAssetReference: "private/qr.png",
    updatedAt: "2026-07-24T08:00:00.000Z",
  },
  serviceEvents: [
    {
      id: "safe-event",
      type: "strategy_handoff_ready",
      occurredAt: "2026-07-24T08:00:00.000Z",
      status: "active",
      reviewed: true,
      assignee: "Studio",
    },
    {
      id: "unreviewed-event",
      type: "strategy_handoff_ready",
      occurredAt: "2026-07-24T08:00:00.000Z",
      status: "active",
      reviewed: false,
    },
    {
      id: "internal-event",
      type: "first_ai_audit_pass_completed",
      occurredAt: "2026-07-24T08:00:00.000Z",
      status: "active",
      reviewed: true,
    },
  ],
  aiActions: normalizedWorkspace.aiActions,
});
const fullWorkspaceState: PersistedPortalWorkspaceState = {
  dataVersion: PORTAL_WORKSPACE_DATA_VERSION,
  tasks: [
    { id: "blue-task", project: "Blue Ribbon" },
    { id: "other-task", project: "CreatorIQ" },
  ],
  journeyGates: [
    { id: "generic-gate", title: "Shared template gate" },
    { id: "blue-gate", title: "Blue gate", request: { threadId: "blue-thread" } },
    { id: "other-gate", title: "Other gate", request: { threadId: "other-thread" } },
  ],
  threads: [
    { id: "blue-thread", clientName: "Blue Ribbon" },
    { id: "other-thread", clientName: "CreatorIQ" },
  ],
  escalations: [
    { id: "blue-escalation", client: "Blue Ribbon" },
    { id: "other-escalation", client: "CreatorIQ" },
  ],
  ticketSeq: 4,
  clientWorkspaces: {
    "blue-ribbon": privateWorkspace,
    "creator-iq": emptyPortalClientWorkspace("creator-iq"),
  },
  progressChatSessions: [{ id: "internal-chat" }],
  activeProgressChatId: "internal-chat",
  projectOverrides: {
    "Blue Ribbon": { client: "Blue Ribbon" },
    CreatorIQ: { client: "CreatorIQ" },
  },
  notificationReadIds: ["staff-notification"],
  notificationPreferences: DEFAULT_PORTAL_NOTIFICATION_PREFERENCES,
};
const projectedWorkspace = projectPersistedPortalWorkspaceStateForClient(fullWorkspaceState, "blue-ribbon", "Blue Ribbon");
assert.deepEqual(Object.keys(projectedWorkspace.clientWorkspaces), ["blue-ribbon"]);
assert.deepEqual((projectedWorkspace.tasks as Array<{ id: string }>).map(task => task.id), ["blue-task"]);
assert.deepEqual((projectedWorkspace.threads as Array<{ id: string }>).map(thread => thread.id), ["blue-thread"]);
assert.deepEqual((projectedWorkspace.escalations as Array<{ id: string }>).map(escalation => escalation.id), ["blue-escalation"]);
assert.deepEqual((projectedWorkspace.journeyGates as Array<{ id: string }>).map(gate => gate.id), ["generic-gate", "blue-gate"]);
assert.equal(projectedWorkspace.progressChatSessions.length, 0);
assert.equal(projectedWorkspace.notificationReadIds.length, 0);
const projectedClientWorkspace = projectedWorkspace.clientWorkspaces["blue-ribbon"];
assert.deepEqual(projectedClientWorkspace.approvals.map(approval => approval.id), ["shared"]);
assert.equal(projectedClientWorkspace.notes.length, 0);
assert.equal(projectedClientWorkspace.funnelPlans.length, 0);
assert.equal(projectedClientWorkspace.aiActions.length, 0);
assert.equal(projectedClientWorkspace.auditTrail.length, 0);
assert.equal(projectedClientWorkspace.engineWork.websiteAudit?.payload, undefined);
assert.equal(projectedClientWorkspace.engineWork.websiteAudit?.processRun, undefined);
assert.equal(projectedClientWorkspace.serviceLifecycle.paymentDetailsState, "not_prepared");
assert.equal(projectedClientWorkspace.serviceLifecycle.paymentConfirmationReference, undefined);
assert.equal(projectedClientWorkspace.serviceLifecycle.paymentRecipientLabel, undefined);
assert.equal(projectedClientWorkspace.serviceLifecycle.paymentQrAssetReference, undefined);
assert.equal(projectedClientWorkspace.serviceLifecycle.wisePaymentEmailBody, undefined);
assert.equal(projectedClientWorkspace.serviceLifecycle.cocoonPackageLabel, "Cocoon Consult");
assert.equal(projectedClientWorkspace.serviceLifecycle.wiawPaymentState, "not_required");
assert.deepEqual(projectedClientWorkspace.serviceEvents.map(event => event.id), ["safe-event"]);
assert.equal(projectedClientWorkspace.serviceEvents[0]?.assignee, undefined);
const sentPaymentProjection = projectPersistedPortalWorkspaceStateForClient({
  ...fullWorkspaceState,
  clientWorkspaces: {
    ...fullWorkspaceState.clientWorkspaces,
    "blue-ribbon": {
      ...privateWorkspace,
      serviceLifecycle: {
        ...privateWorkspace.serviceLifecycle,
        paymentDetailsState: "sent",
        paymentState: "email_sent",
      },
    },
  },
}, "blue-ribbon", "Blue Ribbon").clientWorkspaces["blue-ribbon"].serviceLifecycle;
assert.equal(sentPaymentProjection.wisePaymentEmailSubject, "Your Cocoon Consult payment details");
assert.equal(sentPaymentProjection.wisePaymentEmailBody?.includes("{client_name}"), true);
assert.equal(sentPaymentProjection.paymentConfirmationReference, undefined);
const projectedAuditDraft = projectPersistedAuditDraftForClient(createCreatorIqWebsiteAuditDraft());
assert.equal(projectedAuditDraft.run.score, undefined);
assert.equal(projectedAuditDraft.run.internalScore, undefined);
assert.equal(projectedAuditDraft.state.report, undefined);
assert.deepEqual(projectedAuditDraft.state.notes, {});
assert.deepEqual(projectedAuditDraft.state.genDone, {});
assert.deepEqual(projectedAuditDraft.state.guidedSession?.aiResults, {});
assert.equal(projectedAuditDraft.state.guidedSession?.processRun, undefined);

const lifecycle = {
  ...emptyPortalServiceLifecycle(),
  paymentState: "confirmed" as const,
  bookingState: "booked" as const,
  guidedCallBookedAt: "2026-07-24T08:00:00.000Z",
  guidanceWindowStartsAt: "2026-07-23T08:00:00.000Z",
  guidanceWindowEndsAt: "2026-07-26T08:00:00.000Z",
  dashboardAccessEndsAt: "2026-07-30T08:00:00.000Z",
  updatedAt: "2026-07-24T08:00:00.000Z",
};
const clientLifecycleEvents = serviceLifecycleNotificationEvents({
  role: "client",
  clientId: "acme",
  clientName: "Acme",
  lifecycle,
  now: new Date("2026-07-24T08:00:00.000Z"),
});
assert.equal(clientLifecycleEvents.some(event => event.type === "wise_payment_confirmed"), true);
assert.equal(clientLifecycleEvents.some(event => event.type === "guided_call_booked"), true);
assert.equal(clientLifecycleEvents.some(event => event.type === "guidance_window_ending"), true);
assert.equal(clientLifecycleEvents.some(event => event.type === "dashboard_access_ending"), true);
assert.equal(
  clientLifecycleEvents.find(event => event.type === "wise_payment_confirmed")?.message,
  "Your Wise payment is confirmed.",
);
const completedWiawClient = serviceLifecycleNotificationEvents({
  role: "client",
  clientId: "blue-ribbon",
  clientName: "Blue Ribbon",
  lifecycle: { ...emptyPortalServiceLifecycle(), wiawState: "complete", updatedAt: "2026-07-24T08:00:00.000Z" },
});
assert.equal(completedWiawClient.some(event => event.type === "wiaw_complete" && event.deepLink.view === "milestones"), true);
assert.equal(
  serviceLifecycleNotificationEvents({
    role: "client",
    clientId: "acme",
    clientName: "Acme",
    lifecycle: { ...emptyPortalServiceLifecycle(), paymentState: "email_prepared", updatedAt: "2026-07-24T08:00:00.000Z" },
  }).some(event => event.type === "wise_payment_email_prepared"),
  false,
  "A client must never see an unreviewed payment email claim.",
);

const completedOperationalTask: Task = {
  id: "task-handoff",
  title: "Send launch handoff",
  project: "Acme",
  assignee: "Trish Baltazar",
  owner: "studio",
  status: "done",
  priority: "high",
  due: "July 24",
  completionEventType: "handoff_package_sent",
  completionHistory: [{
    id: "task-handoff:2026-07-24T10:00:00.000Z:handoff_package_sent",
    type: "handoff_package_sent",
    occurredAt: "2026-07-24T10:00:00.000Z",
    fromStatus: "review",
    toStatus: "done",
    actorRole: "admin",
  }],
};
const importedDoneTask = initializeTaskLifecycle({
  ...completedOperationalTask,
  id: "task-imported-done",
  completionHistory: undefined,
}, "admin");
assert.equal(importedDoneTask.completionHistory?.length, 1, "A task imported as Done must receive completion history.");
assert.equal(importedDoneTask.completionHistory?.[0]?.fromStatus, "todo");
const reopenedTask = applyTaskStatusLifecycle(importedDoneTask, "review", "admin", "2026-07-24T11:00:00.000Z");
const completedAgainTask = applyTaskStatusLifecycle(reopenedTask, "done", "admin", "2026-07-24T12:00:00.000Z");
assert.equal(completedAgainTask.completionHistory?.length, 2, "Recompletion must append history instead of replacing it.");
assert.equal(completedAgainTask.completionHistory?.[1]?.fromStatus, "review");
assert.equal(completedOperationalTask.completionHistory?.length, 1);
assert.equal(completedOperationalTask.completionHistory?.[0]?.type, "handoff_package_sent");
const handoffClientEvent = specificTaskCompletionEvent(completedOperationalTask, "client");
assert.equal(handoffClientEvent?.type, "handoff_package_sent");
assert.equal(handoffClientEvent?.lifecycle, "unread");
assert.equal(handoffClientEvent?.deepLink.view, "files");
assert.equal(specificTaskCompletionEvent(completedOperationalTask, "admin"), null);
assert.equal(
  specificTaskCompletionEvent({ ...completedOperationalTask, status: "in_progress" }, "client"),
  null,
  "Reopening the task removes the current notification while preserving completion history.",
);

const blueRibbonId = portalClientId("Blue Ribbon");
const unreviewedClientWorkspace = {
  ...emptyPortalClientWorkspace(blueRibbonId),
  serviceEvents: [{
    id: "blue-ribbon:strategy:1",
    type: "strategy_handoff_ready" as const,
    occurredAt: "2026-07-24T11:00:00.000Z",
    status: "active" as const,
    reviewed: false,
  }],
};
const clientNotificationState: PortalNotificationState = {
  role: "client",
  clientName: "Blue Ribbon",
  tasks: [],
  taskFilter: { owner: "all", priority: "all" },
  journeyGates: [],
  threads: [],
  escalations: [],
  notificationReadIds: [],
  notificationPreferences: DEFAULT_PORTAL_NOTIFICATION_PREFERENCES,
  clientWorkspaces: { [blueRibbonId]: unreviewedClientWorkspace },
  projectOverrides: {},
};
assert.equal(portalNotificationEvents(clientNotificationState).some(event => event.type === "strategy_handoff_ready" && event.lifecycle === "draft"), true);
assert.equal(portalNotificationSummary(clientNotificationState).items.some(event => event.type === "strategy_handoff_ready"), false, "Unreviewed strategy claims must not enter the client digest.");
const reviewedClientState: PortalNotificationState = {
  ...clientNotificationState,
  clientWorkspaces: {
    [blueRibbonId]: {
      ...unreviewedClientWorkspace,
      serviceEvents: unreviewedClientWorkspace.serviceEvents.map(event => ({ ...event, reviewed: true })),
    },
  },
};
assert.equal(portalNotificationSummary(reviewedClientState).items.some(event => event.type === "strategy_handoff_ready"), true);

const managerNotificationState: PortalNotificationState = {
  ...clientNotificationState,
  role: "dev",
  clientName: "",
  tasks: [managerAssignedTask],
};
const managerAssignmentEvent = portalNotificationEvents(managerNotificationState)
  .find(event => event.sourceId === managerAssignedTask.id && event.type === "task_requested");
assert.equal(managerAssignmentEvent?.recipientRoles.includes("assigned_manager"), true);
assert.equal(managerAssignmentEvent?.deepLink.taskId, managerAssignedTask.id);
assert.equal(portalNotificationEvents({
  ...managerNotificationState,
  role: "admin",
}).some(event => event.sourceId === managerAssignedTask.id), false, "Manager-only work must not inflate the Admin notification count.");

const sharedTask: Task = {
  ...managerAssignedTask,
  id: "shared-task",
  assignment: { role: "shared", label: "Client + Studio Admin" },
  owner: "gate",
};
const clientSharedEvent = portalNotificationEvents({
  ...clientNotificationState,
  tasks: [sharedTask],
}).find(event => event.sourceId === sharedTask.id && event.type === "task_requested");
assert.equal(clientSharedEvent?.recipientRoles.includes("client"), true);
assert.equal(portalNotificationEvents({
  ...managerNotificationState,
  role: "admin",
  tasks: [sharedTask],
}).some(event => event.sourceId === sharedTask.id && event.type === "task_requested"), true);

const completedClientTask: Task = {
  ...managerAssignedTask,
  id: "completed-client-task",
  title: "Approve the launch page",
  owner: "client",
  assignee: "Client",
  assignment: { role: "client", label: "Client" },
  status: "done",
};
const adminOnlyCompletionPreferences = {
  ...DEFAULT_PORTAL_NOTIFICATION_PREFERENCES,
  taskCompletionRecipients: "admin_only" as const,
};
const adminCompletionState: PortalNotificationState = {
  ...managerNotificationState,
  role: "admin",
  tasks: [completedClientTask],
  notificationPreferences: adminOnlyCompletionPreferences,
};
assert.equal(
  portalNotificationEvents(adminCompletionState)
    .some(event => event.sourceId === completedClientTask.id && event.type === "task_completed"),
  true,
);
assert.equal(
  portalNotificationEvents({
    ...adminCompletionState,
    role: "dev",
  }).some(event => event.sourceId === completedClientTask.id && event.type === "task_completed"),
  false,
  "Admin-only completion routing must not inflate the assigned manager feed.",
);
const digestEvents = portalNotificationEvents({
  ...adminCompletionState,
  notificationPreferences: {
    ...DEFAULT_PORTAL_NOTIFICATION_PREFERENCES,
    taskCompletionDelivery: "daily_digest",
  },
});
assert.equal(digestEvents.some(event => event.sourceId === completedClientTask.id), false);
assert.equal(
  digestEvents.find(event => event.sourceId === "client-task-completion-digest")?.message,
  "1 client to-do completed.",
);

console.log("portal notification tests passed");
