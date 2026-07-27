import { emptyPortalServiceLifecycle, type PortalServiceLifecycleRecord } from "@/lib/portalWorkspacePersistence";
import type { Task } from "./types";

const TEST_AT = "2026-07-24T09:00:00.000Z";

export type PortalLifecycleTestFixture = {
  id: "cocoon-intake" | "paid-cocoon" | "wiaw-active" | "iff-active" | "deleted";
  clientName: string;
  lifecycle: PortalServiceLifecycleRecord;
};

export const PORTAL_LIFECYCLE_TEST_FIXTURES: PortalLifecycleTestFixture[] = [
  {
    id: "cocoon-intake",
    clientName: "Cocoon Intake Test",
    lifecycle: {
      ...emptyPortalServiceLifecycle(),
      consultState: "intake_started",
      auditState: "collecting",
      formStartedAt: TEST_AT,
      updatedAt: TEST_AT,
    },
  },
  {
    id: "paid-cocoon",
    clientName: "Paid Cocoon Test",
    lifecycle: {
      ...emptyPortalServiceLifecycle(),
      consultState: "audit_ready",
      auditState: "shared",
      deliverableState: "delivered",
      paymentDetailsState: "sent",
      paymentState: "confirmed",
      bookingState: "unlocked",
      dashboardAccessState: "active",
      paymentConfirmedAt: TEST_AT,
      paymentRecipientLabel: "Baltazar Studio Ltd",
      paymentConfirmationReference: "TEST-COCOON-001",
      guidanceWindowStartsAt: TEST_AT,
      guidanceWindowEndsAt: "2026-07-25T09:00:00.000Z",
      dashboardAccessStartsAt: TEST_AT,
      dashboardAccessEndsAt: "2026-10-24T09:00:00.000Z",
      updatedAt: TEST_AT,
    },
  },
  {
    id: "wiaw-active",
    clientName: "WIAW Active Test",
    lifecycle: {
      ...emptyPortalServiceLifecycle(),
      consultState: "audit_ready",
      auditState: "shared",
      deliverableState: "approved",
      wiawPaymentState: "confirmed",
      wiawState: "confirmed",
      dashboardAccessState: "active",
      wiawPaymentConfirmedAt: TEST_AT,
      currentDevelopmentStage: "Foundation build",
      nextDevelopmentStage: "Design preview",
      nextRequiredAction: "Review the foundation build",
      updatedAt: TEST_AT,
    },
  },
  {
    id: "iff-active",
    clientName: "In Full Flight Test",
    lifecycle: {
      ...emptyPortalServiceLifecycle(),
      iffState: "active",
      dashboardAccessState: "active",
      currentDevelopmentStage: "Monthly delivery",
      nextDevelopmentStage: "Client review",
      nextRequiredAction: "Review this month's output",
      updatedAt: TEST_AT,
    },
  },
  {
    id: "deleted",
    clientName: "Deleted Access Test",
    lifecycle: {
      ...emptyPortalServiceLifecycle(),
      dashboardAccessState: "deleted",
      updatedAt: TEST_AT,
    },
  },
];

export const PORTAL_NOTIFICATION_TEST_TASKS: Task[] = [
  {
    id: "test-client-foundation-complete",
    title: "Foundation build complete",
    project: "WIAW Active Test",
    assignee: "Studio Admin",
    assignment: { role: "studio_admin", label: "Studio Admin" },
    owner: "studio",
    status: "done",
    priority: "med",
    due: "Jul 24",
    milestone: "Foundation",
    completionEventType: "studio_foundation_task_completed",
    completionHistory: [{
      id: "test-client-foundation-complete:done:1",
      type: "studio_foundation_task_completed",
      occurredAt: TEST_AT,
      fromStatus: "review",
      toStatus: "done",
      actorRole: "admin",
    }],
  },
  {
    id: "test-client-approval-complete",
    title: "Client approved the design preview",
    project: "WIAW Active Test",
    assignee: "Client",
    assignment: { role: "client", label: "Client" },
    owner: "client",
    status: "done",
    priority: "high",
    due: "Jul 24",
    milestone: "Design preview",
    completionEventType: "client_approval_completed",
    completionHistory: [{
      id: "test-client-approval-complete:done:1",
      type: "client_approval_completed",
      occurredAt: TEST_AT,
      fromStatus: "review",
      toStatus: "done",
      actorRole: "client",
    }],
  },
];
