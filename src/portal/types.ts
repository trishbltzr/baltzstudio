// Portal-local types for the redesigned Baltz Studio Portal (design prototype).
export type Role = "admin" | "dev" | "client";

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
export type Priority = "high" | "med" | "low";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type Service = "cocoon" | "wiaw" | "iff";
export type Health = "on_track" | "at_risk" | "delayed";

export interface Task {
  id: string;
  title: string;
  project: string;
  assignee: string;
  owner: Owner;
  status: TaskStatus;
  priority: Priority;
  due: string;
  blockedBy?: string;
}

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
