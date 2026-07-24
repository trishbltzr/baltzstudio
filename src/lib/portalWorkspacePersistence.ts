import { STUDIO_CLIENTS, UNASSIGNED_WORK_CLIENT } from "@/portal/clients";
import {
  DEFAULT_PORTAL_NOTIFICATION_PREFERENCES,
  type ClientProject,
  type Escalation,
  type JourneyGate,
  type PortalNotificationPreferences,
  type Task,
  type Thread,
} from "@/portal/types";
import type { GuidedAuditSession } from "./portalAuditPersistence";
import type { PortalProcessRun } from "./portalProcessRuns";
import type { PortalProcessHandoff } from "./portalProcessHandoffs";
import type { AiReviewState } from "./aiReviewState";

export const PORTAL_WORKSPACE_ROW_ID = "client-slate-v2";
export const PORTAL_WORKSPACE_FALLBACK_RUN_ID = "__portal_workspace_client_slate_v2__";
export const PORTAL_WORKSPACE_FALLBACK_CLIENT_ID = "__portal_workspace_client_slate_v2__";
export const PORTAL_UPLOAD_BUCKET = "portal-uploads";
export const PORTAL_WORKSPACE_DATA_VERSION = "client-slate-v2";

export type PortalApprovalRecord = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  thumb: string;
  sent: boolean;
  sentAt?: string;
  threadId?: string;
  escalated?: boolean;
  outputType?: "audit" | "builder";
  summary?: string;
  sections?: PortalApprovalSection[];
  reviewState?: AiReviewState;
};

export type PortalApprovalSection = {
  heading: string;
  body: string;
  bullets: string[];
};

export type PortalProposalRecord = {
  sent: boolean;
  sentAt?: string;
  iffOn: boolean;
  threadId?: string;
};

export type PortalCollaboratorRecord = {
  id: string;
  name: string;
  email: string;
  access: string;
  studio: boolean;
  invitedAt: string;
  status: "pending" | "invited";
};

export type PortalWorkspaceFile = {
  id: string;
  clientId: string;
  name: string;
  ext: string;
  folder: string;
  sizeBytes: number;
  sizeLabel: string;
  by: string;
  updated: string;
  status: "Ready" | "Uploaded" | "Attached";
  mimeType?: string;
  objectPath?: string;
  storageMode: "supabase" | "inline";
  contentBase64?: string;
  threadId?: string;
};

export type PortalFunnelPlanRecord = {
  id: string;
  buildId: string;
  type: "funnel_plan";
  clientId: string;
  clientName: string;
  title: string;
  statusLabel: string;
  statusTone?: "muted" | "warn" | "success" | "accent" | "danger";
  stage?: string;
  progress?: number;
  owner?: string;
  due: string;
  generatedAt: string;
  updatedAt: string;
  content: unknown;
  processRun?: PortalProcessRun;
};

export type PortalClientNoteRecord = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
};

export type PortalBrandSystemRecord = {
  colors: [string, string][];
  fonts: [string, string, string][];
  tone: { traits: string[]; scales: [string, string, number][]; avoid?: string };
  logoUrl?: string;
  sourceUrl?: string;
  updatedAt: string;
};

export type PortalBrandAuditRecord = {
  status: "intake" | "report_ready" | "plan_ready" | "complete";
  progress: number;
  session: GuidedAuditSession;
  updatedAt: string;
};

export type PortalAuditExportMode = "studio" | "client" | "partner";
export type PortalAuditExportStatus = "draft" | "reviewed" | "ready" | "sent";

export type PortalAuditExportVersion = {
  version: number;
  mode: PortalAuditExportMode;
  status: PortalAuditExportStatus;
  brandName: string;
  accent: string;
  savedAt: string;
  savedBy: string;
};

export type PortalAuditExportProfile = Omit<PortalAuditExportVersion, "savedBy"> & {
  history: PortalAuditExportVersion[];
};

export type PortalEngineWorkKey = "websiteAudit" | "websiteBuilder" | "seoAudit" | "socialBuilder";

export type PortalEngineWorkRecord = {
  status: "intake" | "in_progress" | "ready" | "complete";
  progress: number;
  updatedAt: string;
  payload?: unknown;
  processRun?: PortalProcessRun;
};

export type PortalConsultLifecycleState =
  | "not_started"
  | "link_sent"
  | "intake_started"
  | "intake_completed"
  | "audit_ready";

export type PortalPaymentLifecycleState =
  | "not_started"
  | "email_prepared"
  | "email_sent"
  | "pending"
  | "confirmed"
  | "failed"
  | "manual_review";

export type PortalBookingLifecycleState =
  | "locked"
  | "unlocked"
  | "booked"
  | "completed";

export type PortalOfferLifecycleState =
  | "not_offered"
  | "recommended"
  | "workspace_unlocked"
  | "confirmed"
  | "paused"
  | "cancelled"
  | "complete";

export type PortalCareLifecycleState =
  | "not_offered"
  | "offered"
  | "active"
  | "paused"
  | "cancelled";

export type PortalDashboardAccessState =
  | "not_started"
  | "active"
  | "suspended"
  | "ending"
  | "expired"
  | "deletion_scheduled"
  | "deleted";

export type PortalAuditLifecycleState =
  | "not_started"
  | "collecting"
  | "generated"
  | "review_ready"
  | "approved"
  | "shared";

export type PortalDeliverableLifecycleState =
  | "not_started"
  | "draft"
  | "review"
  | "approved"
  | "delivered";

export type PortalAutomationReviewState =
  | "not_required"
  | "draft"
  | "review_required"
  | "approved"
  | "rejected";

export type PortalPaymentDetailsReviewState =
  | "not_prepared"
  | "draft"
  | "approved"
  | "sent";

export type PortalWiawPaymentLifecycleState =
  | "not_required"
  | "pending"
  | "confirmed"
  | "manual_review";

export type PortalWiseQrHandling = "approved_asset" | "secure_link" | "none";
export type PortalPaymentConfirmationMode = "manual_only" | "manual_or_matched";
export type PortalDashboardAccessStartTrigger =
  | "payment_confirmation"
  | "booking_recorded"
  | "guided_call_completion"
  | "manual";
export type PortalWiawPauseAccessPolicy = "continue" | "suspend";
export type PortalWiawCancellationAccessPolicy = "end_immediately" | "manual_end";
export type PortalIffAccessPolicy = "active_subscription" | "manual";
export type PortalWhiteLabelAudience = "clients" | "partners" | "both";

export type PortalServiceLifecycleRecord = {
  consultState: PortalConsultLifecycleState;
  auditState: PortalAuditLifecycleState;
  deliverableState: PortalDeliverableLifecycleState;
  automationReviewState: PortalAutomationReviewState;
  paymentDetailsState: PortalPaymentDetailsReviewState;
  paymentState: PortalPaymentLifecycleState;
  wiawPaymentState: PortalWiawPaymentLifecycleState;
  bookingState: PortalBookingLifecycleState;
  wiawState: PortalOfferLifecycleState;
  iffState: PortalCareLifecycleState;
  dashboardAccessState: PortalDashboardAccessState;
  cocoonPackageLabel?: string;
  wisePaymentEmailSubject?: string;
  wisePaymentEmailBody?: string;
  wiseQrHandling?: PortalWiseQrHandling;
  paymentConfirmationMode?: PortalPaymentConfirmationMode;
  dashboardAccessStartTrigger?: PortalDashboardAccessStartTrigger;
  wiawPauseAccessPolicy?: PortalWiawPauseAccessPolicy;
  wiawCancellationAccessPolicy?: PortalWiawCancellationAccessPolicy;
  iffAccessPolicy?: PortalIffAccessPolicy;
  whiteLabelAudience?: PortalWhiteLabelAudience;
  guidedCallBookedAt?: string;
  guidedCallCompletedAt?: string;
  guidanceWindowStartsAt?: string;
  guidanceWindowEndsAt?: string;
  dashboardAccessStartsAt?: string;
  dashboardAccessEndsAt?: string;
  paymentEmailSentAt?: string;
  paymentConfirmedAt?: string;
  wiawPaymentConfirmedAt?: string;
  paymentConfirmationReference?: string;
  paymentRecipientLabel?: string;
  paymentQrAssetReference?: string;
  currentDevelopmentStage?: string;
  nextDevelopmentStage?: string;
  nextRequiredAction?: string;
  consultLinkSentAt?: string;
  formStartedAt?: string;
  formCompletedAt?: string;
  auditGeneratedAt?: string;
  auditReviewedAt?: string;
  auditApprovedAt?: string;
  updatedAt: string;
};

export type PortalServiceOperationalEventType =
  | "landing_page_signup_received"
  | "lead_signup_submitted"
  | "form_reminder_due"
  | "first_ai_audit_pass_completed"
  | "second_ai_audit_pass_completed"
  | "paid_cocoon_offered"
  | "guided_call_reminder_due"
  | "strategy_handoff_ready"
  | "dashboard_deletion_notice";

export type PortalServiceOperationalEvent = {
  id: string;
  type: PortalServiceOperationalEventType;
  occurredAt: string;
  status: "active" | "resolved";
  reviewed: boolean;
  assignee?: string;
};

export type PortalAiActionType =
  | "audit_draft"
  | "audit_summary"
  | "white_label_report"
  | "wise_payment_email"
  | "notification"
  | "strategy_handoff"
  | "wiaw_recommendation"
  | "launch_handoff";

export type PortalAiActionStatus =
  | "draft"
  | "review_required"
  | "approved"
  | "rejected";

export type PortalAiActionRecord = {
  id: string;
  type: PortalAiActionType;
  status: PortalAiActionStatus;
  clientSafePreview: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type PortalClientAuditAction =
  | "service_lifecycle_updated"
  | "workflow_event_recorded"
  | "workflow_event_resolved"
  | "ai_output_recorded"
  | "ai_output_reviewed"
  | "output_queued"
  | "approval_shared"
  | "proposal_sent"
  | "collaborator_invited"
  | "files_uploaded"
  | "decision_escalated";

export type PortalClientAuditRecord = {
  id: string;
  action: PortalClientAuditAction;
  summary: string;
  actor: string;
  actorRole: "admin" | "dev" | "client" | "system";
  occurredAt: string;
  clientVisible: boolean;
  sourceId?: string;
};

export type PortalClientWorkspace = {
  approvals: PortalApprovalRecord[];
  proposal: PortalProposalRecord | null;
  collaborators: PortalCollaboratorRecord[];
  files: PortalWorkspaceFile[];
  funnelPlans: PortalFunnelPlanRecord[];
  notes: PortalClientNoteRecord[];
  brandSystem: PortalBrandSystemRecord | null;
  brandAudit: PortalBrandAuditRecord | null;
  auditExport: PortalAuditExportProfile | null;
  engineWork: Partial<Record<PortalEngineWorkKey, PortalEngineWorkRecord>>;
  handoffs: PortalProcessHandoff[];
  serviceLifecycle: PortalServiceLifecycleRecord;
  serviceEvents: PortalServiceOperationalEvent[];
  aiActions: PortalAiActionRecord[];
  auditTrail: PortalClientAuditRecord[];
};

export type PersistedPortalWorkspaceState = {
  dataVersion: string;
  tasks: unknown[];
  journeyGates: unknown[];
  threads: unknown[];
  escalations: unknown[];
  ticketSeq: number;
  clientWorkspaces: Record<string, PortalClientWorkspace>;
  progressChatSessions: unknown[];
  activeProgressChatId: string | null;
  projectOverrides: Record<string, Partial<ClientProject>>;
  notificationReadIds: string[];
  notificationPreferences: PortalNotificationPreferences;
};

export const DEFAULT_PORTAL_APPROVALS: PortalApprovalRecord[] = [
  {
    id: "seed-blue-ribbon-seo-report",
    clientId: "blue-ribbon",
    clientName: "Blue Ribbon",
    title: "SEO audit report",
    thumb: "var(--success-soft)",
    sent: false,
    outputType: "audit",
    summary: "Homepage and three key pages are healthy; two redirect chains and one missing meta description are the priorities before growth work.",
    sections: [
      { heading: "What's working", body: "Core pages are healthy and indexable.", bullets: ["Homepage and 3 key pages return 200 and are indexable", "Titles and headings are present and unique"] },
      { heading: "Fix first", body: "A short, high-impact list before growth work.", bullets: ["Resolve 2 redirect chains on product URLs", "Add the missing meta description on the pricing page"] },
    ],
  },
  {
    id: "seed-nature-brand-kit",
    clientId: "nature-s-best-organic",
    clientName: "Nature's Best Organic",
    title: "Brand kit — colours, type & voice",
    thumb: "var(--accent-soft)",
    sent: false,
    outputType: "builder",
    summary: "The consolidated brand system is ready to share — palette, typography, and voice captured from the brand audit.",
    sections: [
      { heading: "Palette", body: "Verified colours from the site.", bullets: ["Forest Green #2E5D3B", "Harvest Gold #C8A24B", "Cream #F3EFE4"] },
      { heading: "Voice", body: "Approved tone traits.", bullets: ["Wholesome", "Trustworthy", "Warm", "Avoid: hype and jargon"] },
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? value as T[] : [];
}

function asRecord<T>(value: unknown) {
  return isRecord(value) ? value as Record<string, T> : {};
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

export function normalizePortalNotificationPreferences(value: unknown): PortalNotificationPreferences {
  const source = isRecord(value) ? value : {};
  const inApp = isRecord(source.inApp) ? source.inApp : {};
  const booleanOr = (candidate: unknown, fallback: boolean) => (
    typeof candidate === "boolean" ? candidate : fallback
  );
  return {
    emailUpdates: booleanOr(source.emailUpdates, DEFAULT_PORTAL_NOTIFICATION_PREFERENCES.emailUpdates),
    dailyDigest: booleanOr(source.dailyDigest, DEFAULT_PORTAL_NOTIFICATION_PREFERENCES.dailyDigest),
    taskCompletionRecipients: enumValue(
      source.taskCompletionRecipients,
      ["admin_only", "admin_and_assignee"] as const,
      DEFAULT_PORTAL_NOTIFICATION_PREFERENCES.taskCompletionRecipients,
    ),
    taskCompletionDelivery: enumValue(
      source.taskCompletionDelivery,
      ["immediate", "daily_digest"] as const,
      DEFAULT_PORTAL_NOTIFICATION_PREFERENCES.taskCompletionDelivery,
    ),
    inApp: {
      tasks: booleanOr(inApp.tasks, DEFAULT_PORTAL_NOTIFICATION_PREFERENCES.inApp.tasks),
      approvals: booleanOr(inApp.approvals, DEFAULT_PORTAL_NOTIFICATION_PREFERENCES.inApp.approvals),
      messages: booleanOr(inApp.messages, DEFAULT_PORTAL_NOTIFICATION_PREFERENCES.inApp.messages),
      service: booleanOr(inApp.service, DEFAULT_PORTAL_NOTIFICATION_PREFERENCES.inApp.service),
      system: booleanOr(inApp.system, DEFAULT_PORTAL_NOTIFICATION_PREFERENCES.inApp.system),
    },
  };
}

export function validatePortalServiceLifecycleUpdate(
  current: PortalServiceLifecycleRecord,
  update: Partial<Omit<PortalServiceLifecycleRecord, "updatedAt">>,
): string | null {
  const next = { ...current, ...update };
  if (update.paymentDetailsState === "sent" && current.paymentDetailsState !== "approved") {
    return "Approve the Wise payment details before marking them sent";
  }
  if (update.paymentState === "email_sent"
    && next.paymentDetailsState !== "approved"
    && next.paymentDetailsState !== "sent") {
    return "Approve the Wise payment details before marking the email sent";
  }
  if (update.paymentState === "confirmed"
    && (!next.paymentRecipientLabel?.trim() || !next.paymentConfirmationReference?.trim())) {
    return "Match the Wise recipient and transfer reference before confirming payment";
  }
  if (update.bookingState === "booked" && current.bookingState !== "unlocked") {
    return "Unlock the guided call before recording a booking";
  }
  if (update.bookingState === "completed" && current.bookingState !== "booked") {
    return "Record the guided-call booking before marking it complete";
  }
  return null;
}

export function emptyPortalServiceLifecycle(): PortalServiceLifecycleRecord {
  return {
    consultState: "not_started",
    auditState: "not_started",
    deliverableState: "not_started",
    automationReviewState: "not_required",
    paymentDetailsState: "not_prepared",
    paymentState: "not_started",
    wiawPaymentState: "not_required",
    bookingState: "locked",
    wiawState: "not_offered",
    iffState: "not_offered",
    dashboardAccessState: "not_started",
    cocoonPackageLabel: "Cocoon Consult",
    wisePaymentEmailSubject: "Your Cocoon Consult payment details",
    wisePaymentEmailBody: "Hi {client_name},\n\nYour Cocoon Consult payment details are ready. Use the reviewed Wise link or QR code and include this transfer reference: {transfer_reference}.\n\nWe will confirm your payment before booking and dashboard access are unlocked.\n\nBaltazar Studio",
    wiseQrHandling: "approved_asset",
    paymentConfirmationMode: "manual_only",
    dashboardAccessStartTrigger: "payment_confirmation",
    wiawPauseAccessPolicy: "continue",
    wiawCancellationAccessPolicy: "end_immediately",
    iffAccessPolicy: "active_subscription",
    whiteLabelAudience: "clients",
    updatedAt: "",
  };
}

export function normalizePortalServiceLifecycle(value: unknown): PortalServiceLifecycleRecord {
  const base = emptyPortalServiceLifecycle();
  if (!isRecord(value)) return base;
  const timestamp = (key: string) => typeof value[key] === "string" && value[key] ? value[key] as string : undefined;
  return {
    consultState: enumValue(value.consultState, ["not_started", "link_sent", "intake_started", "intake_completed", "audit_ready"], base.consultState),
    auditState: enumValue(value.auditState, ["not_started", "collecting", "generated", "review_ready", "approved", "shared"], base.auditState),
    deliverableState: enumValue(value.deliverableState, ["not_started", "draft", "review", "approved", "delivered"], base.deliverableState),
    automationReviewState: enumValue(value.automationReviewState, ["not_required", "draft", "review_required", "approved", "rejected"], base.automationReviewState),
    paymentDetailsState: enumValue(value.paymentDetailsState, ["not_prepared", "draft", "approved", "sent"], base.paymentDetailsState),
    paymentState: enumValue(value.paymentState, ["not_started", "email_prepared", "email_sent", "pending", "confirmed", "failed", "manual_review"], base.paymentState),
    wiawPaymentState: enumValue(value.wiawPaymentState, ["not_required", "pending", "confirmed", "manual_review"], base.wiawPaymentState),
    bookingState: enumValue(value.bookingState, ["locked", "unlocked", "booked", "completed"], base.bookingState),
    wiawState: enumValue(value.wiawState, ["not_offered", "recommended", "workspace_unlocked", "confirmed", "paused", "cancelled", "complete"], base.wiawState),
    iffState: enumValue(value.iffState, ["not_offered", "offered", "active", "paused", "cancelled"], base.iffState),
    dashboardAccessState: enumValue(value.dashboardAccessState, ["not_started", "active", "suspended", "ending", "expired", "deletion_scheduled", "deleted"], base.dashboardAccessState),
    cocoonPackageLabel: typeof value.cocoonPackageLabel === "string" && value.cocoonPackageLabel.trim()
      ? value.cocoonPackageLabel.trim().slice(0, 80)
      : base.cocoonPackageLabel,
    wisePaymentEmailSubject: typeof value.wisePaymentEmailSubject === "string" && value.wisePaymentEmailSubject.trim()
      ? value.wisePaymentEmailSubject.trim().slice(0, 160)
      : base.wisePaymentEmailSubject,
    wisePaymentEmailBody: typeof value.wisePaymentEmailBody === "string" && value.wisePaymentEmailBody.trim()
      ? value.wisePaymentEmailBody.trim().slice(0, 2_000)
      : base.wisePaymentEmailBody,
    wiseQrHandling: enumValue(value.wiseQrHandling, ["approved_asset", "secure_link", "none"] as const, base.wiseQrHandling || "approved_asset"),
    paymentConfirmationMode: enumValue(value.paymentConfirmationMode, ["manual_only", "manual_or_matched"] as const, base.paymentConfirmationMode || "manual_only"),
    dashboardAccessStartTrigger: enumValue(value.dashboardAccessStartTrigger, ["payment_confirmation", "booking_recorded", "guided_call_completion", "manual"] as const, base.dashboardAccessStartTrigger || "payment_confirmation"),
    wiawPauseAccessPolicy: enumValue(value.wiawPauseAccessPolicy, ["continue", "suspend"] as const, base.wiawPauseAccessPolicy || "continue"),
    wiawCancellationAccessPolicy: enumValue(value.wiawCancellationAccessPolicy, ["end_immediately", "manual_end"] as const, base.wiawCancellationAccessPolicy || "end_immediately"),
    iffAccessPolicy: enumValue(value.iffAccessPolicy, ["active_subscription", "manual"] as const, base.iffAccessPolicy || "active_subscription"),
    whiteLabelAudience: enumValue(value.whiteLabelAudience, ["clients", "partners", "both"] as const, base.whiteLabelAudience || "clients"),
    guidedCallBookedAt: timestamp("guidedCallBookedAt"),
    guidedCallCompletedAt: timestamp("guidedCallCompletedAt"),
    guidanceWindowStartsAt: timestamp("guidanceWindowStartsAt"),
    guidanceWindowEndsAt: timestamp("guidanceWindowEndsAt"),
    dashboardAccessStartsAt: timestamp("dashboardAccessStartsAt"),
    dashboardAccessEndsAt: timestamp("dashboardAccessEndsAt"),
    paymentEmailSentAt: timestamp("paymentEmailSentAt"),
    paymentConfirmedAt: timestamp("paymentConfirmedAt"),
    wiawPaymentConfirmedAt: timestamp("wiawPaymentConfirmedAt"),
    paymentConfirmationReference: typeof value.paymentConfirmationReference === "string" && value.paymentConfirmationReference.trim()
      ? value.paymentConfirmationReference.trim().slice(0, 120)
      : undefined,
    paymentRecipientLabel: typeof value.paymentRecipientLabel === "string" && value.paymentRecipientLabel.trim()
      ? value.paymentRecipientLabel.trim().slice(0, 120)
      : undefined,
    paymentQrAssetReference: typeof value.paymentQrAssetReference === "string" && value.paymentQrAssetReference.trim()
      ? value.paymentQrAssetReference.trim().slice(0, 240)
      : undefined,
    currentDevelopmentStage: typeof value.currentDevelopmentStage === "string" && value.currentDevelopmentStage.trim() ? value.currentDevelopmentStage.trim().slice(0, 120) : undefined,
    nextDevelopmentStage: typeof value.nextDevelopmentStage === "string" && value.nextDevelopmentStage.trim() ? value.nextDevelopmentStage.trim().slice(0, 120) : undefined,
    nextRequiredAction: typeof value.nextRequiredAction === "string" && value.nextRequiredAction.trim() ? value.nextRequiredAction.trim().slice(0, 240) : undefined,
    consultLinkSentAt: timestamp("consultLinkSentAt"),
    formStartedAt: timestamp("formStartedAt"),
    formCompletedAt: timestamp("formCompletedAt"),
    auditGeneratedAt: timestamp("auditGeneratedAt"),
    auditReviewedAt: timestamp("auditReviewedAt"),
    auditApprovedAt: timestamp("auditApprovedAt"),
    updatedAt: timestamp("updatedAt") || "",
  };
}

function addHours(value: string, hours: number) {
  return new Date(Date.parse(value) + hours * 3_600_000).toISOString();
}

function addCalendarMonths(value: string, months: number) {
  const date = new Date(value);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

function activateCocoonDashboardAccess(
  lifecycle: PortalServiceLifecycleRecord,
  startsAt: string,
) {
  lifecycle.dashboardAccessState = "active";
  lifecycle.dashboardAccessStartsAt ||= startsAt;
  lifecycle.dashboardAccessEndsAt ||= addCalendarMonths(lifecycle.dashboardAccessStartsAt, 3);
}

export function applyPortalServiceLifecyclePolicy(
  current: PortalServiceLifecycleRecord,
  update: Partial<Omit<PortalServiceLifecycleRecord, "updatedAt">>,
  occurredAt: string,
) {
  const lifecycle = normalizePortalServiceLifecycle({
    ...current,
    ...update,
    updatedAt: occurredAt,
  });

  if (update.paymentState === "confirmed" && current.paymentState !== "confirmed") {
    if (lifecycle.bookingState === "locked") lifecycle.bookingState = "unlocked";
    lifecycle.paymentConfirmedAt ||= occurredAt;
    if (lifecycle.dashboardAccessStartTrigger === "payment_confirmation") {
      activateCocoonDashboardAccess(lifecycle, occurredAt);
    }
  }

  if (update.consultState === "link_sent" && current.consultState !== "link_sent") {
    lifecycle.consultLinkSentAt ||= occurredAt;
  }

  if (update.bookingState === "booked" && current.bookingState !== "booked") {
    lifecycle.guidedCallBookedAt ||= occurredAt;
    if (lifecycle.dashboardAccessStartTrigger === "booking_recorded") {
      activateCocoonDashboardAccess(lifecycle, lifecycle.guidedCallBookedAt);
    }
  }

  if (update.bookingState === "completed" && current.bookingState !== "completed") {
    lifecycle.guidedCallCompletedAt ||= occurredAt;
    lifecycle.guidanceWindowStartsAt ||= lifecycle.guidedCallCompletedAt;
    lifecycle.guidanceWindowEndsAt ||= addHours(lifecycle.guidanceWindowStartsAt, 24);
    if (lifecycle.dashboardAccessStartTrigger === "guided_call_completion") {
      activateCocoonDashboardAccess(lifecycle, lifecycle.guidedCallCompletedAt);
    }
  }

  if (update.wiawState === "confirmed") {
    lifecycle.dashboardAccessState = "active";
    lifecycle.dashboardAccessStartsAt ||= occurredAt;
    lifecycle.dashboardAccessEndsAt = undefined;
  } else if (update.wiawState === "paused" && lifecycle.wiawPauseAccessPolicy === "suspend") {
    lifecycle.dashboardAccessState = "suspended";
  } else if (update.wiawState === "cancelled" && lifecycle.wiawCancellationAccessPolicy === "end_immediately") {
    lifecycle.dashboardAccessState = "expired";
    lifecycle.dashboardAccessEndsAt = occurredAt;
  }

  if (lifecycle.iffAccessPolicy === "active_subscription") {
    if (update.iffState === "active") {
      lifecycle.dashboardAccessState = "active";
      lifecycle.dashboardAccessStartsAt ||= occurredAt;
      lifecycle.dashboardAccessEndsAt = undefined;
    } else if (update.iffState === "paused") {
      lifecycle.dashboardAccessState = "suspended";
    } else if (update.iffState === "cancelled") {
      lifecycle.dashboardAccessState = "expired";
      lifecycle.dashboardAccessEndsAt = occurredAt;
    }
  }

  return lifecycle;
}

export function portalAuditExportModeAllowed(
  lifecycle: PortalServiceLifecycleRecord,
  mode: PortalAuditExportMode,
) {
  if (mode === "studio") return true;
  const audience = lifecycle.whiteLabelAudience || "clients";
  return audience === "both"
    || (mode === "client" && audience === "clients")
    || (mode === "partner" && audience === "partners");
}

export function portalClientId(name: string) {
  if (name === UNASSIGNED_WORK_CLIENT.name) return UNASSIGNED_WORK_CLIENT.id;
  const studioClient = STUDIO_CLIENTS.find(client => client.name === name);
  return studioClient?.id || slugify(name) || "client";
}

export function defaultPortalAuditExportProfile(clientName: string): PortalAuditExportProfile {
  return {
    version: 1,
    mode: "studio",
    status: "draft",
    brandName: "Baltazar Studio",
    accent: "#d86e76",
    savedAt: "",
    history: [],
  };
}

export function normalizePortalAuditExportProfile(clientName: string, value: unknown): PortalAuditExportProfile {
  const base = defaultPortalAuditExportProfile(clientName);
  if (!isRecord(value)) return base;
  const mode = value.mode === "client" || value.mode === "partner" || value.mode === "studio" ? value.mode : base.mode;
  const status = value.status === "reviewed" || value.status === "ready" || value.status === "sent" || value.status === "draft" ? value.status : base.status;
  const brandName = typeof value.brandName === "string" && value.brandName.trim() ? value.brandName.trim() : mode === "client" ? clientName : base.brandName;
  const accent = typeof value.accent === "string" && /^#[0-9a-f]{6}$/i.test(value.accent) ? value.accent : base.accent;
  return {
    version: typeof value.version === "number" && Number.isFinite(value.version) ? Math.max(1, Math.floor(value.version)) : base.version,
    mode,
    status,
    brandName,
    accent,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : "",
    history: asArray<PortalAuditExportVersion>(value.history).filter(item => isRecord(item)).slice(-20),
  };
}

export function emptyPortalClientWorkspace(clientId: string): PortalClientWorkspace {
  return {
    approvals: DEFAULT_PORTAL_APPROVALS.filter(approval => approval.clientId === clientId),
    proposal: null,
    collaborators: [],
    files: [],
    funnelPlans: [],
    notes: [],
    brandSystem: null,
    brandAudit: null,
    auditExport: null,
    engineWork: {},
    handoffs: [],
    serviceLifecycle: emptyPortalServiceLifecycle(),
    serviceEvents: [],
    aiActions: [],
    auditTrail: [],
  };
}

export function appendPortalClientAuditRecord(
  workspace: PortalClientWorkspace,
  record: Omit<PortalClientAuditRecord, "id"> & { id?: string },
): PortalClientWorkspace {
  const id = record.id || `${record.action}:${record.sourceId || "workspace"}:${record.occurredAt}`;
  return {
    ...workspace,
    auditTrail: [...workspace.auditTrail, { ...record, id }].slice(-250),
  };
}

export function mergePortalApprovals(clientId: string, approvals: PortalApprovalRecord[]) {
  const defaults = DEFAULT_PORTAL_APPROVALS.filter(approval => approval.clientId === clientId);
  const byId = new Map(approvals.map(approval => [approval.id, approval]));
  const mergedDefaults = defaults.map(approval => ({ ...approval, ...(byId.get(approval.id) || {}) }));
  const defaultIds = new Set(defaults.map(approval => approval.id));
  return [...mergedDefaults, ...approvals.filter(approval => !defaultIds.has(approval.id))];
}

export function mergePortalClientWorkspace(clientId: string, workspace?: Partial<PortalClientWorkspace> | null): PortalClientWorkspace {
  const base = emptyPortalClientWorkspace(clientId);
  return {
    approvals: mergePortalApprovals(clientId, asArray<PortalApprovalRecord>(workspace?.approvals)),
    proposal: isRecord(workspace?.proposal) ? workspace?.proposal as PortalProposalRecord : null,
    collaborators: asArray<PortalCollaboratorRecord>(workspace?.collaborators),
    files: asArray<PortalWorkspaceFile>(workspace?.files),
    funnelPlans: asArray<PortalFunnelPlanRecord>(workspace?.funnelPlans),
    notes: asArray<PortalClientNoteRecord>(workspace?.notes),
    brandSystem: isRecord(workspace?.brandSystem) ? workspace?.brandSystem as PortalBrandSystemRecord : null,
    brandAudit: isRecord(workspace?.brandAudit) ? workspace?.brandAudit as PortalBrandAuditRecord : null,
    auditExport: isRecord(workspace?.auditExport) ? normalizePortalAuditExportProfile(STUDIO_CLIENTS.find(client => client.id === clientId)?.name || clientId, workspace.auditExport) : null,
    engineWork: isRecord(workspace?.engineWork) ? workspace.engineWork as Partial<Record<PortalEngineWorkKey, PortalEngineWorkRecord>> : {},
    handoffs: asArray<PortalProcessHandoff>(workspace?.handoffs),
    serviceLifecycle: normalizePortalServiceLifecycle(workspace?.serviceLifecycle),
    serviceEvents: asArray<PortalServiceOperationalEvent>(workspace?.serviceEvents)
      .filter(event => isRecord(event) && typeof event.id === "string" && typeof event.type === "string" && typeof event.occurredAt === "string")
      .slice(-100),
    aiActions: asArray<PortalAiActionRecord>(workspace?.aiActions)
      .filter(action => isRecord(action)
        && typeof action.id === "string"
        && typeof action.type === "string"
        && typeof action.status === "string"
      && typeof action.clientSafePreview === "string")
      .slice(-100),
    auditTrail: asArray<PortalClientAuditRecord>(workspace?.auditTrail)
      .filter(record => isRecord(record)
        && typeof record.id === "string"
        && typeof record.action === "string"
        && typeof record.summary === "string"
        && typeof record.actor === "string"
        && typeof record.actorRole === "string"
        && typeof record.occurredAt === "string")
      .slice(-250),
  };
}

export function normalizePersistedPortalWorkspaceState(value: unknown): PersistedPortalWorkspaceState | null {
  if (!isRecord(value)) return null;
  if (value.dataVersion !== PORTAL_WORKSPACE_DATA_VERSION) return null;

  const clientWorkspaces = asRecord<PortalClientWorkspace>(value.clientWorkspaces);
  const mergedClientWorkspaces = Object.fromEntries(
    Object.entries(clientWorkspaces).map(([clientId, workspace]) => [clientId, mergePortalClientWorkspace(clientId, workspace)]),
  ) as Record<string, PortalClientWorkspace>;

  DEFAULT_PORTAL_APPROVALS.forEach(approval => {
    if (!mergedClientWorkspaces[approval.clientId]) {
      mergedClientWorkspaces[approval.clientId] = emptyPortalClientWorkspace(approval.clientId);
    }
  });

  return {
    dataVersion: PORTAL_WORKSPACE_DATA_VERSION,
    tasks: asArray(value.tasks),
    journeyGates: asArray(value.journeyGates),
    threads: asArray(value.threads),
    escalations: asArray(value.escalations),
    ticketSeq: typeof value.ticketSeq === "number" && Number.isFinite(value.ticketSeq) ? Math.max(1, Math.floor(value.ticketSeq)) : 1,
    clientWorkspaces: mergedClientWorkspaces,
    progressChatSessions: asArray(value.progressChatSessions),
    activeProgressChatId: typeof value.activeProgressChatId === "string" ? value.activeProgressChatId : null,
    projectOverrides: asRecord<Partial<ClientProject>>(value.projectOverrides),
    notificationReadIds: asArray(value.notificationReadIds).filter((item): item is string => typeof item === "string").slice(-500),
    notificationPreferences: normalizePortalNotificationPreferences(value.notificationPreferences),
  };
}

export const CLIENT_VISIBLE_SERVICE_EVENT_TYPES = new Set<PortalServiceOperationalEventType>([
  "form_reminder_due",
  "paid_cocoon_offered",
  "guided_call_reminder_due",
  "strategy_handoff_ready",
  "dashboard_deletion_notice",
]);

function belongsToClient(value: string | undefined, clientId: string, clientName: string) {
  return !!value && (value === clientName || value === clientId || portalClientId(value) === clientId);
}

function clientSafeWorkspace(clientId: string, workspace: PortalClientWorkspace): PortalClientWorkspace {
  const lifecycle = workspace.serviceLifecycle;
  const engineWork = Object.fromEntries(
    Object.entries(workspace.engineWork).map(([key, record]) => [
      key,
      record
        ? {
          status: record.status,
          progress: record.progress,
          updatedAt: record.updatedAt,
        }
        : record,
    ]),
  ) as PortalClientWorkspace["engineWork"];

  return {
    approvals: workspace.approvals
      .filter(approval => approval.sent)
      .map(({ reviewState: _reviewState, ...approval }) => approval),
    proposal: workspace.proposal?.sent
      ? {
        sent: true,
        sentAt: workspace.proposal.sentAt,
        iffOn: workspace.proposal.iffOn,
      }
      : null,
    collaborators: workspace.collaborators,
    files: workspace.files.filter(file => file.clientId === clientId),
    funnelPlans: [],
    notes: [],
    brandSystem: workspace.brandSystem,
    brandAudit: null,
    auditExport: workspace.auditExport && (workspace.auditExport.status === "ready" || workspace.auditExport.status === "sent")
      ? { ...workspace.auditExport, history: [] }
      : null,
    engineWork,
    handoffs: workspace.handoffs
      .filter(handoff => handoff.status === "accepted" && handoff.approvalStatus === "approved")
      .map(handoff => ({
        ...handoff,
        context: {},
        unresolvedItems: [],
        createdTaskIds: [],
      })),
    serviceLifecycle: {
      consultState: lifecycle.consultState,
      auditState: lifecycle.auditState,
      deliverableState: lifecycle.deliverableState,
      automationReviewState: "not_required",
      paymentDetailsState: "not_prepared",
      paymentState: lifecycle.paymentState,
      wiawPaymentState: lifecycle.wiawPaymentState,
      bookingState: lifecycle.bookingState,
      wiawState: lifecycle.wiawState,
      iffState: lifecycle.iffState,
      dashboardAccessState: lifecycle.dashboardAccessState,
      cocoonPackageLabel: lifecycle.cocoonPackageLabel,
      wisePaymentEmailSubject: lifecycle.paymentDetailsState === "sent"
        ? lifecycle.wisePaymentEmailSubject
        : undefined,
      wisePaymentEmailBody: lifecycle.paymentDetailsState === "sent"
        ? lifecycle.wisePaymentEmailBody
        : undefined,
      wiseQrHandling: lifecycle.paymentDetailsState === "sent"
        ? lifecycle.wiseQrHandling
        : undefined,
      guidedCallBookedAt: lifecycle.guidedCallBookedAt,
      guidedCallCompletedAt: lifecycle.guidedCallCompletedAt,
      guidanceWindowStartsAt: lifecycle.guidanceWindowStartsAt,
      guidanceWindowEndsAt: lifecycle.guidanceWindowEndsAt,
      dashboardAccessStartsAt: lifecycle.dashboardAccessStartsAt,
      dashboardAccessEndsAt: lifecycle.dashboardAccessEndsAt,
      paymentEmailSentAt: lifecycle.paymentEmailSentAt,
      paymentConfirmedAt: lifecycle.paymentConfirmedAt,
      wiawPaymentConfirmedAt: lifecycle.wiawPaymentConfirmedAt,
      currentDevelopmentStage: lifecycle.currentDevelopmentStage,
      nextDevelopmentStage: lifecycle.nextDevelopmentStage,
      nextRequiredAction: lifecycle.nextRequiredAction,
      consultLinkSentAt: lifecycle.consultLinkSentAt,
      formStartedAt: lifecycle.formStartedAt,
      formCompletedAt: lifecycle.formCompletedAt,
      auditGeneratedAt: lifecycle.auditGeneratedAt,
      auditReviewedAt: lifecycle.auditReviewedAt,
      auditApprovedAt: lifecycle.auditApprovedAt,
      updatedAt: lifecycle.updatedAt,
    },
    serviceEvents: workspace.serviceEvents
      .filter(event => event.reviewed && CLIENT_VISIBLE_SERVICE_EVENT_TYPES.has(event.type))
      .map(({ assignee: _assignee, ...event }) => event),
    aiActions: [],
    auditTrail: [],
  };
}

/**
 * Produces the only shared-workspace shape that may cross the API boundary for
 * a client. UI role checks are intentionally not relied on for data isolation.
 */
export function projectPersistedPortalWorkspaceStateForClient(
  state: PersistedPortalWorkspaceState,
  clientId: string,
  clientName?: string,
): PersistedPortalWorkspaceState {
  const resolvedName = clientName
    || STUDIO_CLIENTS.find(client => client.id === clientId)?.name
    || clientId;
  const workspace = mergePortalClientWorkspace(clientId, state.clientWorkspaces[clientId]);
  const threads = (state.threads as Thread[]).filter(thread => belongsToClient(thread.clientName, clientId, resolvedName));
  const threadIds = new Set(threads.map(thread => thread.id));

  return {
    dataVersion: PORTAL_WORKSPACE_DATA_VERSION,
    tasks: (state.tasks as Task[]).filter(task => belongsToClient(task.project, clientId, resolvedName)),
    journeyGates: (state.journeyGates as JourneyGate[]).filter(gate => !gate.request?.threadId || threadIds.has(gate.request.threadId)),
    threads,
    escalations: (state.escalations as Escalation[]).filter(escalation => belongsToClient(escalation.client, clientId, resolvedName)),
    ticketSeq: state.ticketSeq,
    clientWorkspaces: {
      [clientId]: clientSafeWorkspace(clientId, workspace),
    },
    progressChatSessions: [],
    activeProgressChatId: null,
    projectOverrides: Object.fromEntries(
      Object.entries(state.projectOverrides).filter(([key, project]) => (
        belongsToClient(key, clientId, resolvedName)
        || belongsToClient(project.client, clientId, resolvedName)
      )),
    ),
    notificationReadIds: [],
    notificationPreferences: normalizePortalNotificationPreferences(null),
  };
}
