import type { PortalActions, PortalState } from "./store";
import type { PortalAccessState } from "./access";
import type { Role, View } from "./types";

export interface NavItemMeta {
  label: string;
  icon: string;
  badge?: "Demo";
}

export interface NavSection {
  label: string;
  views: readonly View[];
}

export const NAV_ITEM_META = {
  progress: { label: "Snapshot", icon: "snapshot" },
  clients: { label: "Clients", icon: "briefcase" },
  tasks: { label: "To-do's", icon: "checklist" },
  review: { label: "Approvals", icon: "flag" },
  audits_new: { label: "Checkups", icon: "audit", badge: "Demo" },
  audit: { label: "Checkups", icon: "audit", badge: "Demo" },
  funnels: { label: "Labs", icon: "flask", badge: "Demo" },
  inbox: { label: "Inbox", icon: "inbox" },
  activity: { label: "Activity", icon: "activity" },
  team: { label: "Team", icon: "users" },
  playbooks: { label: "Playbooks", icon: "layers" },
  billing: { label: "Billing", icon: "wallet" },
  invoices: { label: "Invoices", icon: "card" },
  milestones: { label: "Journey", icon: "feather" },
  files: { label: "Files", icon: "file" },
  settings: { label: "Settings", icon: "sliders" },
} satisfies Partial<Record<View, NavItemMeta>>;

const SNAPSHOT_SECTION = { label: "", views: ["progress"] } as const;
const STUDIO_DELIVERY_SECTION = { label: "Delivery", views: ["clients", "tasks", "review"] } as const;
const STUDIO_ENGINES_SECTION = { label: "Engines", views: ["audits_new", "funnels"] } as const;
const CLIENT_ENGINES_SECTION = { label: "Engines", views: ["audit", "funnels"] } as const;

export const NAV_SECTIONS: Record<Role, readonly NavSection[]> = {
  admin: [
    SNAPSHOT_SECTION,
    STUDIO_DELIVERY_SECTION,
    STUDIO_ENGINES_SECTION,
    { label: "Communication", views: ["inbox", "activity"] },
    { label: "Studio", views: ["team", "playbooks", "billing"] },
  ],
  dev: [
    SNAPSHOT_SECTION,
    { label: "Delivery", views: ["clients", "tasks", "review"] },
    STUDIO_ENGINES_SECTION,
    { label: "Communication", views: ["inbox"] },
    { label: "Studio", views: ["playbooks"] },
  ],
  client: [
    SNAPSHOT_SECTION,
    { label: "Your Project", views: ["review", "milestones", "tasks"] },
    { label: "Collaboration", views: ["inbox", "activity", "files"] },
  ],
};

export function navSectionsForState(state: PortalAccessState): readonly NavSection[] {
  if (state.role !== "client") return NAV_SECTIONS[state.role];
  // Labs is always shown to clients; the funnels view keeps its own unlock gate
  // and renders the prerequisite screen for clients who have not unlocked it yet.
  return [
    SNAPSHOT_SECTION,
    { label: "Your Project", views: ["review", "milestones", "tasks"] },
    CLIENT_ENGINES_SECTION,
    { label: "Collaboration", views: ["inbox", "activity", "files"] },
  ];
}

export function navItemMeta(view: View): NavItemMeta {
  const meta = NAV_ITEM_META[view as keyof typeof NAV_ITEM_META];
  if (!meta) throw new Error(`Missing navigation metadata for ${view}`);
  return meta;
}

export interface QuickAction {
  label: string;
  sub: string;
  icon: string;
  intent: "new_client" | "invite_user" | "new_message" | "new_task" | "new_audit" | "open_approvals" | "upload_file" | "review_tasks" | "billing_question" | "review_audit";
  view?: View;
}

const QUICK_ACTIONS: Record<Role, QuickAction[]> = {
  admin: [
    { label: "New Client", sub: "Start client intake", icon: "briefcase", intent: "new_client", view: "onboarding" },
    { label: "Invite User", sub: "Give portal access", icon: "user", intent: "invite_user", view: "team" },
    { label: "New Message", sub: "Open the inbox", icon: "msg", intent: "new_message", view: "inbox" },
    { label: "New To-do", sub: "Add a task", icon: "checklist", intent: "new_task", view: "tasks" },
    { label: "New Checkup", sub: "Cocoon Consult intake", icon: "audit", intent: "new_audit", view: "audits_new" },
  ],
  dev: [
    { label: "New Message", sub: "Open the inbox", icon: "msg", intent: "new_message", view: "inbox" },
    { label: "New To-do", sub: "Add a task", icon: "checklist", intent: "new_task", view: "tasks" },
    { label: "Open Approvals", sub: "Client sign-offs", icon: "flag", intent: "open_approvals", view: "review" },
  ],
  client: [
    { label: "Upload File", sub: "Share an asset", icon: "file", intent: "upload_file", view: "files" },
    { label: "Review to-do's", sub: "See requests", icon: "checklist", intent: "review_tasks", view: "tasks" },
    { label: "Billing Question", sub: "Wise or access", icon: "wallet", intent: "billing_question", view: "inbox" },
    { label: "Review Approvals", sub: "See final outputs", icon: "flag", intent: "open_approvals", view: "review" },
  ],
};

export const MOBILE_PRIMARY_VIEWS: Record<Role, View[]> = {
  admin: ["progress", "clients", "playbooks", "billing"],
  dev: ["progress", "clients", "inbox", "settings"],
  client: ["progress", "review", "files", "tasks"],
};

export function quickActionsForRole(role: Role): QuickAction[] {
  return QUICK_ACTIONS[role];
}

export function quickActionsForState(state: PortalAccessState): QuickAction[] {
  if (state.role !== "client") return QUICK_ACTIONS[state.role];
  return [
    ...QUICK_ACTIONS.client.slice(0, 3),
    { label: "Review Checkup", sub: "See findings", icon: "audit", intent: "review_audit", view: "audit" },
  ];
}

export function mobilePrimaryViewsForState(state: Pick<PortalState, "role">): View[] {
  return MOBILE_PRIMARY_VIEWS[state.role];
}

export type QuickActionExecutionState = Pick<PortalState, "role" | "clientName" | "threads" | "selectedThreadId">;

export function runQuickAction(action: QuickAction, state: QuickActionExecutionState, actions: PortalActions) {
  const firstThreadId = state.role === "client"
    ? state.threads.find(thread => thread.clientName === state.clientName && !!thread.isTicket && thread.messages.some(message => message.from === "client"))?.id || state.selectedThreadId
    : state.threads.find(thread => thread.unread > 0)?.id || state.threads[0]?.id || state.selectedThreadId;

  switch (action.intent) {
    case "new_client":
      actions.patch({ quickActionIntent: "new_client" });
      actions.setView("onboarding");
      return;
    case "invite_user":
      actions.patch({ quickActionIntent: "invite_user" });
      actions.setView("team");
      return;
    case "new_message":
      actions.patch({ selectedThreadId: firstThreadId, draft: "", inboxFilter: "all", quickActionIntent: "new_message" });
      actions.setView("inbox");
      return;
    case "new_task":
      actions.createQuickTask();
      return;
    case "new_audit":
      actions.patch({ auditType: "website", quickActionIntent: "new_audit" });
      actions.setView("audits_new");
      return;
    case "open_approvals":
      actions.setView("review");
      actions.showToast("Approvals ready");
      return;
    case "upload_file":
      actions.setView("files");
      actions.showToast("Ready to upload files");
      return;
    case "review_tasks":
      actions.patch({ taskView: "board" });
      actions.setView("tasks");
      actions.showToast("To-do board ready");
      return;
    case "billing_question":
      actions.patch({ selectedThreadId: firstThreadId, draft: "I have a billing question." });
      actions.setView("inbox");
      actions.showToast("Inbox ready");
      return;
    case "review_audit":
      actions.setView("audit");
      actions.showToast("Checkup review ready");
  }
}
