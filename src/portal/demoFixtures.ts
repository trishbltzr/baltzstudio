import { emptyPortalServiceLifecycle, type PortalServiceLifecycleRecord } from "@/lib/portalWorkspacePersistence";
import type { Task } from "./types";

const DEMO_AT = "2026-07-24T09:00:00.000Z";

export type PortalLifecycleDemoFixture = {
  id: "cocoon-intake" | "paid-cocoon" | "wiaw-active" | "iff-active" | "deleted";
  clientName: string;
  lifecycle: PortalServiceLifecycleRecord;
};

export const PORTAL_LIFECYCLE_DEMO_FIXTURES: PortalLifecycleDemoFixture[] = [
  {
    id: "cocoon-intake",
    clientName: "Cocoon Intake Demo",
    lifecycle: {
      ...emptyPortalServiceLifecycle(),
      consultState: "intake_started",
      auditState: "collecting",
      formStartedAt: DEMO_AT,
      updatedAt: DEMO_AT,
    },
  },
  {
    id: "paid-cocoon",
    clientName: "Paid Cocoon Demo",
    lifecycle: {
      ...emptyPortalServiceLifecycle(),
      consultState: "audit_ready",
      auditState: "shared",
      deliverableState: "delivered",
      paymentDetailsState: "sent",
      paymentState: "confirmed",
      bookingState: "unlocked",
      dashboardAccessState: "active",
      paymentConfirmedAt: DEMO_AT,
      paymentRecipientLabel: "Baltazar Studio Ltd",
      paymentConfirmationReference: "DEMO-COCOON-001",
      guidanceWindowStartsAt: DEMO_AT,
      guidanceWindowEndsAt: "2026-07-25T09:00:00.000Z",
      dashboardAccessStartsAt: DEMO_AT,
      dashboardAccessEndsAt: "2026-10-24T09:00:00.000Z",
      updatedAt: DEMO_AT,
    },
  },
  {
    id: "wiaw-active",
    clientName: "WIAW Active Demo",
    lifecycle: {
      ...emptyPortalServiceLifecycle(),
      consultState: "audit_ready",
      auditState: "shared",
      deliverableState: "approved",
      wiawPaymentState: "confirmed",
      wiawState: "confirmed",
      dashboardAccessState: "active",
      wiawPaymentConfirmedAt: DEMO_AT,
      currentDevelopmentStage: "Foundation build",
      nextDevelopmentStage: "Design preview",
      nextRequiredAction: "Review the foundation build",
      updatedAt: DEMO_AT,
    },
  },
  {
    id: "iff-active",
    clientName: "In Full Flight Demo",
    lifecycle: {
      ...emptyPortalServiceLifecycle(),
      iffState: "active",
      dashboardAccessState: "active",
      currentDevelopmentStage: "Monthly delivery",
      nextDevelopmentStage: "Client review",
      nextRequiredAction: "Review this month's output",
      updatedAt: DEMO_AT,
    },
  },
  {
    id: "deleted",
    clientName: "Deleted Access Demo",
    lifecycle: {
      ...emptyPortalServiceLifecycle(),
      dashboardAccessState: "deleted",
      updatedAt: DEMO_AT,
    },
  },
];

export const PORTAL_NOTIFICATION_DEMO_TASKS: Task[] = [
  {
    id: "demo-client-foundation-complete",
    title: "Foundation build complete",
    project: "WIAW Active Demo",
    assignee: "Studio Admin",
    assignment: { role: "studio_admin", label: "Studio Admin" },
    owner: "studio",
    status: "done",
    priority: "med",
    due: "Jul 24",
    milestone: "Foundation",
    completionEventType: "studio_foundation_task_completed",
    completionHistory: [{
      id: "demo-client-foundation-complete:done:1",
      type: "studio_foundation_task_completed",
      occurredAt: DEMO_AT,
      fromStatus: "review",
      toStatus: "done",
      actorRole: "admin",
    }],
  },
  {
    id: "demo-client-approval-complete",
    title: "Client approved the design preview",
    project: "WIAW Active Demo",
    assignee: "Client",
    assignment: { role: "client", label: "Client" },
    owner: "client",
    status: "done",
    priority: "high",
    due: "Jul 24",
    milestone: "Design preview",
    completionEventType: "client_approval_completed",
    completionHistory: [{
      id: "demo-client-approval-complete:done:1",
      type: "client_approval_completed",
      occurredAt: DEMO_AT,
      fromStatus: "review",
      toStatus: "done",
      actorRole: "client",
    }],
  },
];
