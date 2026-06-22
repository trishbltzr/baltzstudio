// ─────────────────────────────────────────────
// CORE DOMAIN TYPES — shared across admin & client views
// ─────────────────────────────────────────────

export type TaskAssignee = "AI" | "human" | "client";
export type TaskStatus = "not_started" | "in_progress" | "complete" | "blocked";
export type GateStatus = "locked" | "ready" | "sent" | "approved" | "revision";
export type MilestoneStatus = "locked" | "active" | "complete";

export interface Task {
  id: string;
  title: string;
  assignee: TaskAssignee;
  status: TaskStatus;
  dueDate?: string;
}

export interface GateFeedback {
  whatWorked: string;
  adjustments: string;
  approved: boolean;
  submittedAt: string;
}

export interface ApprovalGate {
  id: string;
  label: string;
  clientLabel: string;
  message: string;
  deliverableLink?: string;
  status: GateStatus;
  sentAt?: string;
  clientFeedback?: GateFeedback;
  approvedAt?: string;
  adminNotes?: string;
  adminLinks?: Array<{ label: string; url: string }>;
}

export interface Phase {
  id: string;
  title: string;
  tasks: Task[];
  completedAt?: string;
  gate?: ApprovalGate;
}

export interface Milestone {
  id: string;
  number: number;
  title: string;
  clientLabel: string;
  status: MilestoneStatus;
  phases: Phase[];
}

export interface ProjectNote {
  id: string;
  content: string;
  author: string;
  date: string;
}

export interface AssetFile {
  id: string;
  name: string;
  category: string;
  size: string;
  uploadedAt: string;
  sharedWithClient: boolean;
  version?: string;
  status?: "shared" | "draft" | "requested" | "internal" | "approved";
  source?: "studio" | "client";
  requestNote?: string;
}

export interface BrandColor    { id: string; name: string; hex: string; usage: string; }
export interface BrandFont     { id: string; name: string; style: string; usage: string; }
export interface BrandIdentity { colors: BrandColor[]; fonts: BrandFont[]; style: string; }

export interface ProjectPlan {
  name: string;
  description: string;
  status: "active" | "completed";
  renewsAt?: string;
  invoices?: Array<{ label: string; amount: string; date: string; paid: boolean }>;
}

export type ClientLifecycleStage = "cocoon-consult" | "paid-cocoon" | "wiaw-active" | "in-full-flight" | "deleted";
export type WisePaymentStatus = "not_sent" | "email_sent" | "pending_confirmation" | "confirmed" | "not_required";
export type DashboardAccessKind = "locked" | "three_month" | "unlimited" | "deleted";
export type AuditPriority = "low" | "urgent-important" | "urgent" | "important";

export interface DashboardAccess {
  kind: DashboardAccessKind;
  label: string;
  startsAt?: string;
  endsAt?: string;
  status: "locked" | "active" | "expired" | "deleted";
}

export interface GuidanceWindow {
  label: string;
  startsAt?: string;
  endsAt?: string;
  status: "locked" | "active" | "expired" | "not_started" | "unlimited";
}

export interface CocoonLead {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  website: string;
}

export interface WisePaymentState {
  status: WisePaymentStatus;
  label: string;
  amount?: string;
  sentAt?: string;
  confirmedAt?: string;
  qrStatus?: "not_prepared" | "drafted" | "sent" | "confirmed";
}

export interface AuditItem {
  label: string;
  value: string;
  priority: AuditPriority;
}

export interface AuditCategory {
  title: string;
  items: AuditItem[];
}

export interface AuditPage {
  path: string;
  label: string;
  checks: number;
  issues: number;
}

export interface AuditSnapshot {
  status: "not_started" | "in_progress" | "generated" | "reviewed" | "stale";
  generatedAt?: string;
  reviewedAt?: string;
  categories: AuditCategory[];
  pages: AuditPage[];
}

export interface LifecycleNotification {
  id: string;
  type: "cocoon_link_sent" | "audit_generated" | "wise_payment_sent" | "wise_payment_confirmed" | "booking_unlocked" | "access_updated" | "wiaw_unlocked" | "in_full_flight" | "dashboard_deleted";
  actor: string;
  action: string;
  target: string;
  date: string;
  clientVisible: boolean;
}

export interface ProjectWorkflow {
  stage: ClientLifecycleStage;
  planLabel: string;
  planDescription: string;
  sidebarNudgeTitle: string;
  sidebarNudgeBody: string;
  nextStepLabel: string;
  nextStepDetail: string;
  lead: CocoonLead;
  cocoonLink: { status: "queued" | "sent" | "completed"; sentAt?: string };
  booking: { status: "locked" | "available" | "scheduled" | "completed"; label: string; scheduledAt?: string };
  payment: WisePaymentState;
  dashboardAccess: DashboardAccess;
  guidanceWindow: GuidanceWindow;
  audit: AuditSnapshot;
  notifications: LifecycleNotification[];
}

export interface Project {
  id: string;
  clientName: string;
  clientEmail: string;
  clientInitials: string;
  status: "active" | "on_hold" | "complete";
  startDate: string;
  platform: string;
  milestones: Milestone[];
  notes: ProjectNote[];
  assets: AssetFile[];
  brand: BrandIdentity;
  plan?: ProjectPlan;
  workflow?: ProjectWorkflow;
}

export type ViewMode = "admin" | "client";
export type AdminNav = "home" | "projects" | "reviews" | "assets" | "users" | "settings" | "notifications";
export type ProjectTab = "overview" | "milestones" | "assets" | "brand-guidelines" | "audit" | "notes";
export type ClientNav = "overview" | "milestones" | "reviews" | "files" | "brand" | "brand-guidelines" | "contract" | "support" | "audit" | "notifications" | "billing" | "cocoon" | "settings";
