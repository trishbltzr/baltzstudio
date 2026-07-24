// Portal-local types for the redesigned Baltz Studio Portal (design prototype).
export type Role = "admin" | "dev" | "client";
export type AuditType = "brand" | "website" | "seo";
export type BuilderType = "funnel" | "website" | "social";

export type PortalNotificationCategory =
  | "tasks"
  | "approvals"
  | "messages"
  | "service"
  | "system";

export type PortalNotificationPreferences = {
  emailUpdates: boolean;
  dailyDigest: boolean;
  taskCompletionRecipients: "admin_only" | "admin_and_assignee";
  taskCompletionDelivery: "immediate" | "daily_digest";
  inApp: Record<PortalNotificationCategory, boolean>;
};

export const DEFAULT_PORTAL_NOTIFICATION_PREFERENCES: PortalNotificationPreferences = {
  emailUpdates: true,
  dailyDigest: true,
  taskCompletionRecipients: "admin_and_assignee",
  taskCompletionDelivery: "immediate",
  inApp: {
    tasks: true,
    approvals: true,
    messages: true,
    service: true,
    system: true,
  },
};

export type View =
  | "progress"
  | "clients"
  | "tasks"
  | "inbox"
  | "audits_new"
  | "funnels"
  | "escalations"
  | "activity"
  | "team"
  | "playbooks"
  | "billing"
  | "invoices"
  | "review"
  | "milestones"
  | "audit"
  | "files"
  | "assistant"
  | "profile"
  | "settings"
  | "onboarding";

export type Owner = "studio" | "ai" | "client" | "gate";
export type TaskAssigneeRole =
  | "client"
  | "studio_admin"
  | "superadmin"
  | "manager"
  | "system"
  | "shared";

export interface TaskAssignment {
  role: TaskAssigneeRole;
  label: string;
}

export type Priority = "high" | "med" | "low";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type Service = "cocoon" | "wiaw" | "iff";
export type Health = "on_track" | "at_risk" | "delayed";

export type TaskCompletionEventType =
  | "task_completed"
  | "studio_foundation_task_completed"
  | "client_approval_completed"
  | "client_revision_notes_submitted"
  | "build_qa_completed"
  | "launch_prep_completed"
  | "handoff_package_sent"
  | "in_full_flight_task_completed"
  | "no_action_nurture_sent";

export interface TaskCompletionEvent {
  id: string;
  type: TaskCompletionEventType;
  occurredAt: string;
  fromStatus: TaskStatus;
  toStatus: "done";
  actorRole: Role;
}

export interface TaskWorkflowEffects {
  journeyGate?: {
    id: string;
    doneStatus: JourneyGateStatus;
    reopenedStatus: JourneyGateStatus;
  };
  project?: {
    service: Service;
    doneStage: string;
    reopenedStage: string;
    doneProgress: number;
    reopenedProgress: number;
  };
  lifecycle?: {
    doneDeliverableState?: "not_started" | "draft" | "review" | "approved" | "delivered";
    reopenedDeliverableState?: "not_started" | "draft" | "review" | "approved" | "delivered";
    doneDashboardAccessState?: "not_started" | "active" | "suspended" | "ending" | "expired" | "deletion_scheduled" | "deleted";
    reopenedDashboardAccessState?: "not_started" | "active" | "suspended" | "ending" | "expired" | "deletion_scheduled" | "deleted";
    doneCurrentStage?: string;
    reopenedCurrentStage?: string;
    doneNextStage?: string;
    reopenedNextStage?: string;
    doneNextAction?: string;
    reopenedNextAction?: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  attachments?: string[];
  project: string;
  assignee: string;
  assignment?: TaskAssignment;
  owner: Owner;
  status: TaskStatus;
  priority: Priority;
  due: string;
  blockedBy?: string;
  source?: "audit" | "manual" | "inbox";
  sourceId?: string;
  milestone?: string;
  subtasks?: TaskSubtask[];
  completionEventType?: TaskCompletionEventType;
  completionHistory?: TaskCompletionEvent[];
  workflowEffects?: TaskWorkflowEffects;
}

export interface TaskSubtask {
  id: string;
  title: string;
  status: TaskStatus;
}

export type TaskImportDraft = Omit<Task, "id" | "status"> & {
  status?: TaskStatus;
};

export interface ClientProject {
  id: string;
  client: string;
  name: string;
  service: Service;
  stage: string;
  progress: number;
  dev: string;
  health: Health;
  due: string;
  amount: string;
  wise: "paid" | "awaiting";
}

export interface Message {
  from: "client" | "studio";
  text: string;
  time: string;
  by?: string;
}

export interface ProgressChatMessage {
  id: string;
  from: "user" | "assistant";
  text: string;
  time: string;
  pending?: boolean;
  error?: boolean;
}

export interface ProgressChatSession {
  id: string;
  title: string;
  messages: ProgressChatMessage[];
  createdAt: string;
  updatedAt: string;
  ticketId?: string;
  threadId?: string;
  taskId?: string;
  status: "draft" | "sent";
}

export interface Thread {
  id: string;
  name: string;
  clientName: string;
  unread: number;
  status: "open" | "progress" | "resolved";
  assignee: string;
  escalated: boolean;
  isTicket?: boolean;
  ticketId?: string;
  category?: string;
  tzLabel: string;
  tzOff: number;
  messages: Message[];
}

export type JourneyRequestSeverity = "blocking" | "refine";

export interface JourneyRequest {
  note: string;
  tags: string[];
  severity: JourneyRequestSeverity;
  requestedAt: string;
  dueBack: string;
  round: number;
  ticketId?: string;
  threadId?: string;
  assignee?: string;
  studioReply?: string;
  readyAt?: string;
}

export type JourneyGateStatus = "approved" | "awaiting" | "in_revision" | "ready" | "locked";

export interface JourneyGate {
  id: string;
  g: number;
  title: string;
  sub: string;
  status: JourneyGateStatus;
  when: string;
  eta: string;
  thumb: string;
  next: string;
  request?: JourneyRequest;
}

export interface Escalation {
  id: string;
  level: string;
  kind: "danger" | "gate" | "accent";
  title: string;
  client: string;
  by: string;
  time: string;
  reason: string;
  resolved: boolean;
}

export interface TaskFilter {
  owner: Owner | "all";
  priority: Priority | "all";
}
