import type {
  PortalNotificationCategory,
  PortalNotificationPreferences,
  Role,
  Task,
  TaskAssigneeRole,
  View,
} from "@/portal/types";
import type { PortalServiceLifecycleRecord } from "./portalWorkspacePersistence";

export type NotificationEventType =
  | "landing_page_signup_received"
  | "lead_signup_submitted"
  | "cocoon_link_sent"
  | "cocoon_intake_started"
  | "cocoon_intake_completed"
  | "form_reminder_due"
  | "first_ai_audit_pass_completed"
  | "second_ai_audit_pass_completed"
  | "audit_results_ready"
  | "wise_payment_email_prepared"
  | "wise_payment_email_sent"
  | "wise_payment_pending"
  | "wise_payment_confirmed"
  | "wise_payment_attention_required"
  | "paid_cocoon_offered"
  | "booking_unlocked"
  | "guided_call_booked"
  | "guided_call_completed"
  | "guided_call_reminder_due"
  | "strategy_handoff_ready"
  | "guidance_window_started"
  | "guidance_window_ending"
  | "dashboard_access_ending"
  | "dashboard_deletion_notice"
  | "wiaw_recommended"
  | "wiaw_workspace_unlocked"
  | "wiaw_complete"
  | "client_asset_upload_completed"
  | "studio_foundation_task_completed"
  | "design_preview_sent"
  | "client_approval_completed"
  | "client_revision_notes_submitted"
  | "build_qa_completed"
  | "launch_prep_completed"
  | "handoff_package_sent"
  | "in_full_flight_offered"
  | "in_full_flight_task_completed"
  | "no_action_nurture_sent"
  | "task_requested"
  | "task_completed"
  | "review_ready"
  | "journey_update"
  | "escalation_opened"
  | "inbox_unread";

export type NotificationRecipientRole =
  | "client"
  | "studio_admin"
  | "superadmin"
  | "assigned_manager"
  | "shared";

export type NotificationLifecycleState = "draft" | "unread" | "read" | "resolved" | "corrected";

export type NotificationSourceKind =
  | "task"
  | "journey_gate"
  | "thread"
  | "escalation"
  | "approval"
  | "audit"
  | "payment"
  | "access"
  | "booking"
  | "offer"
  | "system";

export interface NotificationDeepLink {
  view: View;
  taskId?: string;
  threadId?: string;
  approvalId?: string;
  serviceRunId?: string;
  section?: string;
}

export interface PortalNotificationEvent {
  id: string;
  type: NotificationEventType;
  recipientRoles: NotificationRecipientRole[];
  lifecycle: NotificationLifecycleState;
  sourceKind: NotificationSourceKind;
  sourceId: string;
  sourceVersion: string;
  clientName?: string;
  projectName?: string;
  assignee?: string;
  lifecycleStage?: string;
  nextAction?: string;
  reviewRequired: boolean;
  message: string;
  targetLabel: string;
  deepLink: NotificationDeepLink;
}

const REVIEW_REQUIRED_TYPES = new Set<NotificationEventType>([
  "first_ai_audit_pass_completed",
  "second_ai_audit_pass_completed",
  "audit_results_ready",
  "wise_payment_email_prepared",
  "wise_payment_email_sent",
  "paid_cocoon_offered",
  "wiaw_recommended",
  "design_preview_sent",
  "launch_prep_completed",
  "handoff_package_sent",
  "strategy_handoff_ready",
  "dashboard_deletion_notice",
]);

const PRESSURE_LANGUAGE = /\b(act now|don'?t miss|hurry|last chance|limited time|only today|urgent action required)\b/i;

export function notificationMessageIsHelpful(message: string) {
  return !PRESSURE_LANGUAGE.test(message);
}

function safeNotificationMessage(message: string) {
  return notificationMessageIsHelpful(message)
    ? message
    : "A workspace update is ready. Open it when you are ready for the next step.";
}

export function notificationMayTargetSuperadmin(
  event: Pick<PortalNotificationEvent, "type" | "sourceKind">,
) {
  return event.sourceKind === "system"
    || event.sourceKind === "access"
    || event.type === "dashboard_deletion_notice";
}

export function notificationRequiresReview(type: NotificationEventType) {
  return REVIEW_REQUIRED_TYPES.has(type);
}

export function notificationRecipientForRole(role: Role): NotificationRecipientRole {
  if (role === "client") return "client";
  if (role === "dev") return "assigned_manager";
  return "studio_admin";
}

export function taskAssignmentRole(task: Pick<Task, "assignment" | "assignee" | "owner">): TaskAssigneeRole {
  if (task.assignment?.role) return task.assignment.role;
  if (task.owner === "client") return "client";
  if (task.owner === "ai") return "system";
  if (task.owner === "gate") return "shared";
  if (/manager|kier/i.test(task.assignee)) return "manager";
  if (/superadmin/i.test(task.assignee)) return "superadmin";
  return "studio_admin";
}

export function taskAssignmentRecipientRoles(
  task: Pick<Task, "assignment" | "assignee" | "owner">,
): NotificationRecipientRole[] {
  const assignment = taskAssignmentRole(task);
  if (assignment === "client") return ["client"];
  if (assignment === "manager") return ["assigned_manager"];
  if (assignment === "superadmin") return ["superadmin", "studio_admin"];
  if (assignment === "shared") return ["shared"];
  return ["studio_admin"];
}

export function notificationIsVisibleToRole(event: PortalNotificationEvent, role: Role) {
  const recipient = notificationRecipientForRole(role);
  return event.recipientRoles.includes("shared") || event.recipientRoles.includes(recipient);
}

export function notificationEventId(
  type: NotificationEventType,
  sourceKind: NotificationSourceKind,
  sourceId: string,
  sourceVersion: string,
) {
  return `${type}:${sourceKind}:${sourceId}:${sourceVersion}`;
}

export function createPortalNotificationEvent(
  input: Omit<PortalNotificationEvent, "id" | "reviewRequired"> & { reviewed?: boolean },
): PortalNotificationEvent {
  const reviewRequired = notificationRequiresReview(input.type);
  const { reviewed = false, ...event } = input;
  const recipientRoles = input.recipientRoles.filter(role => (
    role !== "superadmin" || notificationMayTargetSuperadmin(input)
  ));
  return {
    ...event,
    recipientRoles,
    id: notificationEventId(input.type, input.sourceKind, input.sourceId, input.sourceVersion),
    reviewRequired,
    lifecycle: reviewRequired && input.lifecycle === "unread" && !reviewed ? "draft" : input.lifecycle,
    message: safeNotificationMessage(input.message),
  };
}

export function notificationTarget(event: PortalNotificationEvent): View {
  return event.deepLink.view;
}

export function notificationCategory(type: NotificationEventType): PortalNotificationCategory {
  switch (type) {
    case "task_requested":
    case "task_completed":
    case "client_asset_upload_completed":
    case "studio_foundation_task_completed":
    case "client_revision_notes_submitted":
    case "build_qa_completed":
    case "launch_prep_completed":
    case "handoff_package_sent":
    case "in_full_flight_task_completed":
      return "tasks";
    case "client_approval_completed":
    case "review_ready":
    case "design_preview_sent":
      return "approvals";
    case "inbox_unread":
    case "no_action_nurture_sent":
      return "messages";
    case "dashboard_deletion_notice":
    case "landing_page_signup_received":
    case "lead_signup_submitted":
      return "system";
    default:
      return "service";
  }
}

export function notificationEnabledByPreferences(
  event: Pick<PortalNotificationEvent, "type">,
  preferences: PortalNotificationPreferences,
) {
  return preferences.inApp[notificationCategory(event.type)];
}

type ServiceLifecycleNotificationInput = {
  role: Role;
  clientId: string;
  clientName: string;
  lifecycle: PortalServiceLifecycleRecord;
  now?: Date;
};

function daysUntil(value: string | undefined, now: Date) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.ceil((timestamp - now.getTime()) / 86_400_000);
}

export function serviceLifecycleNotificationEvents({
  role,
  clientId,
  clientName,
  lifecycle,
  now = new Date(),
}: ServiceLifecycleNotificationInput): PortalNotificationEvent[] {
  const client = role === "client";
  const recipients: NotificationRecipientRole[] = client ? ["client"] : ["studio_admin", "assigned_manager"];
  const events: PortalNotificationEvent[] = [];
  const version = lifecycle.updatedAt || "recorded";
  const add = (event: Parameters<typeof createPortalNotificationEvent>[0]) => events.push(createPortalNotificationEvent(event));

  if (lifecycle.consultState === "link_sent") add({
    type: "cocoon_link_sent",
    recipientRoles: recipients,
    lifecycle: "unread",
    sourceKind: "access",
    sourceId: `${clientId}:consult`,
    sourceVersion: `${lifecycle.consultState}:${version}`,
    clientName,
    lifecycleStage: "Cocoon Consult",
    nextAction: client ? "Open the intake link" : "Wait for the client to begin intake",
    message: client ? "Complete your Cocoon Consult intake." : `Cocoon Consult access was sent to ${clientName}.`,
    targetLabel: client ? "Open intake" : "View client",
    deepLink: { view: client ? "progress" : "clients", section: `${clientId}:consult` },
  });
  if (lifecycle.consultState === "intake_started" || lifecycle.consultState === "intake_completed") add({
    type: lifecycle.consultState === "intake_started" ? "cocoon_intake_started" : "cocoon_intake_completed",
    recipientRoles: recipients,
    lifecycle: "unread",
    sourceKind: "system",
    sourceId: `${clientId}:consult`,
    sourceVersion: `${lifecycle.consultState}:${version}`,
    clientName,
    lifecycleStage: "Cocoon Consult",
    nextAction: lifecycle.consultState === "intake_started"
      ? client ? "Complete the remaining intake" : "Monitor intake completion"
      : client ? "Wait for the studio review" : "Review the completed intake",
    message: lifecycle.consultState === "intake_started"
      ? client ? "Finish your Cocoon Consult intake." : `${clientName} started the Cocoon Consult intake.`
      : client ? "Your Cocoon Consult intake is complete." : `${clientName} completed the Cocoon Consult intake.`,
    targetLabel: client ? "View progress" : "Open client",
    deepLink: { view: client ? "progress" : "clients", section: `${clientId}:consult` },
  });

  if (lifecycle.paymentState !== "not_started") {
    const paymentType = lifecycle.paymentState === "email_prepared"
      ? "wise_payment_email_prepared"
      : lifecycle.paymentState === "email_sent"
        ? "wise_payment_email_sent"
        : lifecycle.paymentState === "pending"
          ? "wise_payment_pending"
          : lifecycle.paymentState === "confirmed"
            ? "wise_payment_confirmed"
            : "wise_payment_attention_required";
    if (!client || lifecycle.paymentState !== "email_prepared") add({
      type: paymentType,
      recipientRoles: recipients,
      lifecycle: "unread",
      sourceKind: "payment",
      sourceId: `${clientId}:payment`,
      sourceVersion: `${lifecycle.paymentState}:${version}`,
      clientName,
      lifecycleStage: "Payment",
      nextAction: lifecycle.paymentState === "confirmed"
        ? "Continue to the next available step"
        : lifecycle.paymentState === "failed" || lifecycle.paymentState === "manual_review"
          ? "Review and resolve the payment match"
        : client ? "Review the Wise payment email" : "Verify the payment status",
      reviewed: lifecycle.paymentState !== "email_prepared",
      message: lifecycle.paymentState === "confirmed"
        ? client ? "Your Wise payment is confirmed." : `Wise payment is confirmed for ${clientName}.`
        : lifecycle.paymentState === "failed" || lifecycle.paymentState === "manual_review"
          ? client ? "Your Wise payment is being reviewed by the studio." : `Wise payment needs manual review for ${clientName}.`
        : lifecycle.paymentState === "pending"
          ? client ? "Your Wise payment is awaiting confirmation." : `Wise payment is pending for ${clientName}.`
        : lifecycle.paymentState === "email_sent"
          ? client ? "Review your approved Wise payment details." : `Wise payment details were sent to ${clientName}.`
          : `Wise payment email for ${clientName} is ready for internal review.`,
      targetLabel: client ? "View progress" : "Open billing",
      deepLink: { view: client ? "progress" : "billing", section: `${clientId}:payment` },
    });
  }

  if (lifecycle.bookingState !== "locked") {
    const bookingType = lifecycle.bookingState === "unlocked"
      ? "booking_unlocked"
      : lifecycle.bookingState === "booked"
        ? "guided_call_booked"
        : "guided_call_completed";
    add({
      type: bookingType,
      recipientRoles: recipients,
      lifecycle: "unread",
      sourceKind: "booking",
      sourceId: `${clientId}:guided-call`,
      sourceVersion: `${lifecycle.bookingState}:${lifecycle.guidedCallCompletedAt || lifecycle.guidedCallBookedAt || version}`,
      clientName,
      lifecycleStage: "Guided call",
      nextAction: lifecycle.bookingState === "unlocked"
        ? client ? "Book your guided call" : "Wait for the client to book"
        : lifecycle.bookingState === "booked"
          ? "Prepare for the guided call"
          : "Continue to the guidance window",
      message: lifecycle.bookingState === "unlocked"
        ? client ? "Book your guided call." : `Guided call booking is open for ${clientName}.`
        : lifecycle.bookingState === "booked"
          ? client ? "Your guided call is booked." : `${clientName}'s guided call is booked.`
          : client ? "Your guided call is complete." : `${clientName}'s guided call is complete.`,
      targetLabel: client ? "View journey" : "Open client",
      deepLink: { view: client ? "milestones" : "clients", section: `${clientId}:guided-call` },
    });
  }

  const guidanceStartsIn = daysUntil(lifecycle.guidanceWindowStartsAt, now);
  const guidanceEndsIn = daysUntil(lifecycle.guidanceWindowEndsAt, now);
  if (guidanceStartsIn !== null && guidanceStartsIn <= 0 && (guidanceEndsIn === null || guidanceEndsIn >= 0)) add({
    type: guidanceEndsIn !== null && guidanceEndsIn <= 3 ? "guidance_window_ending" : "guidance_window_started",
    recipientRoles: recipients,
    lifecycle: "unread",
    sourceKind: "access",
    sourceId: `${clientId}:guidance`,
    sourceVersion: `${lifecycle.guidanceWindowStartsAt}:${lifecycle.guidanceWindowEndsAt || "open"}`,
    clientName,
    lifecycleStage: "Guidance window",
    nextAction: guidanceEndsIn !== null && guidanceEndsIn <= 3 ? "Use the remaining guidance time" : "Use the guidance workspace",
    message: guidanceEndsIn !== null && guidanceEndsIn <= 3
      ? client
        ? `Use your remaining guidance time. It ends in ${Math.max(0, guidanceEndsIn)} day${guidanceEndsIn === 1 ? "" : "s"}.`
        : `${clientName}'s guidance window ends in ${Math.max(0, guidanceEndsIn)} day${guidanceEndsIn === 1 ? "" : "s"}.`
      : client ? "Your guidance window is now open." : `${clientName}'s guidance window is now open.`,
    targetLabel: client ? "Open workspace" : "Open client",
    deepLink: { view: client ? "progress" : "clients", section: `${clientId}:guidance` },
  });

  const accessEndsIn = daysUntil(lifecycle.dashboardAccessEndsAt, now);
  if (accessEndsIn !== null && accessEndsIn >= 0 && accessEndsIn <= 7) add({
    type: "dashboard_access_ending",
    recipientRoles: recipients,
    lifecycle: "unread",
    sourceKind: "access",
    sourceId: `${clientId}:dashboard`,
    sourceVersion: lifecycle.dashboardAccessEndsAt || version,
    clientName,
    lifecycleStage: "Dashboard access",
    nextAction: client ? "Download anything you need" : "Confirm extension or handoff",
    message: client
      ? `Download anything you need. Dashboard access ends in ${accessEndsIn} day${accessEndsIn === 1 ? "" : "s"}.`
      : `${clientName}'s dashboard access ends in ${accessEndsIn} day${accessEndsIn === 1 ? "" : "s"}.`,
    targetLabel: client ? "View files" : "Open client",
    deepLink: { view: client ? "files" : "clients", section: `${clientId}:dashboard` },
  });

  if (lifecycle.wiawState === "recommended" || lifecycle.wiawState === "workspace_unlocked") add({
    type: lifecycle.wiawState === "recommended" ? "wiaw_recommended" : "wiaw_workspace_unlocked",
    recipientRoles: recipients,
    lifecycle: "unread",
    sourceKind: "offer",
    sourceId: `${clientId}:wiaw`,
    sourceVersion: `${lifecycle.wiawState}:${version}`,
    clientName,
    projectName: "Winged in a Week",
    lifecycleStage: "Recommendation",
    nextAction: client ? "Review the recommendation" : "Confirm the client handoff",
    reviewed: true,
    message: client
      ? lifecycle.wiawState === "recommended" ? "Review your Winged in a Week recommendation." : "Open your Winged in a Week workspace."
      : `Winged in a Week is ${lifecycle.wiawState === "recommended" ? "recommended" : "unlocked"} for ${clientName}.`,
    targetLabel: client ? "Open recommendation" : "Open client",
    deepLink: { view: client ? "review" : "clients", section: `${clientId}:wiaw` },
  });

  if (lifecycle.wiawState === "complete") add({
    type: "wiaw_complete",
    recipientRoles: recipients,
    lifecycle: "unread",
    sourceKind: "offer",
    sourceId: `${clientId}:wiaw`,
    sourceVersion: `${lifecycle.wiawState}:${version}`,
    clientName,
    projectName: "Winged in a Week",
    lifecycleStage: "Complete",
    nextAction: client ? "Review the handoff package" : "Confirm handoff and ongoing access",
    reviewed: true,
    message: client ? "Your Winged in a Week build is complete." : `Winged in a Week is complete for ${clientName}.`,
    targetLabel: client ? "Open journey" : "Review client",
    deepLink: { view: client ? "milestones" : "clients", section: `${clientId}:wiaw-complete` },
  });

  if (lifecycle.iffState === "offered") add({
    type: "in_full_flight_offered",
    recipientRoles: recipients,
    lifecycle: "unread",
    sourceKind: "offer",
    sourceId: `${clientId}:iff`,
    sourceVersion: `${lifecycle.iffState}:${version}`,
    clientName,
    projectName: "In Full Flight",
    lifecycleStage: "Ongoing care",
    nextAction: client ? "Review the ongoing care offer" : "Follow up on the offer",
    message: client ? "Review your In Full Flight care option." : `In Full Flight was offered to ${clientName}.`,
    targetLabel: client ? "View journey" : "Open client",
    deepLink: { view: client ? "milestones" : "clients", section: `${clientId}:iff` },
  });

  return events;
}
