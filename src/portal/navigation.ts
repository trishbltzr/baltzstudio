import type { PortalActions, PortalState } from "./store";
import type { Role, View } from "./types";
import { DEFAULT_CLIENT_NAME } from "./clients";

export interface QuickAction {
  label: string;
  sub: string;
  icon: string;
  intent: "new_client" | "invite_user" | "new_message" | "new_task" | "new_audit" | "open_approvals" | "upload_file" | "review_tasks" | "billing_question" | "review_audit";
  view?: View;
}

const QUICK_ACTIONS: Record<Role, QuickAction[]> = {
  admin: [
    { label: "New Client", sub: "Start onboarding", icon: "briefcase", intent: "new_client", view: "onboarding" },
    { label: "Invite User", sub: "Give portal access", icon: "user", intent: "invite_user", view: "team" },
    { label: "New Message", sub: "Open the inbox", icon: "msg", intent: "new_message", view: "inbox" },
    { label: "New To-do", sub: "Add a task", icon: "checklist", intent: "new_task", view: "tasks" },
    { label: "New Audit", sub: "Cocoon Consult intake", icon: "audit", intent: "new_audit", view: "audits_new" },
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
    { label: "Review Audit", sub: "See findings", icon: "audit", intent: "review_audit", view: "audit" },
  ],
};

export const MOBILE_PRIMARY_VIEWS: Record<Role, View[]> = {
  admin: ["progress", "clients", "playbooks", "billing"],
  dev: ["progress", "clients", "inbox", "settings"],
  client: ["progress", "milestones", "files", "tasks"],
};

export function quickActionsForRole(role: Role): QuickAction[] {
  return QUICK_ACTIONS[role];
}

export function runQuickAction(action: QuickAction, state: PortalState, actions: PortalActions) {
  const firstThreadId = state.role === "client"
    ? state.threads.find(thread => thread.clientName === DEFAULT_CLIENT_NAME && !!thread.isTicket && thread.messages.some(message => message.from === "client"))?.id || state.selectedThreadId
    : state.threads.find(thread => thread.unread > 0)?.id || state.threads[0]?.id || state.selectedThreadId;

  switch (action.intent) {
    case "new_client":
      actions.setView("onboarding");
      actions.showToast("Client draft ready");
      return;
    case "invite_user":
      actions.setView("team");
      actions.showToast("Users ready for invites");
      return;
    case "new_message":
      actions.patch({ selectedThreadId: firstThreadId, draft: "" });
      actions.setView("inbox");
      actions.showToast("Inbox ready for a reply");
      return;
    case "new_task":
      actions.createQuickTask();
      return;
    case "new_audit":
      actions.setView("audits_new");
      actions.showToast("Audit workspace ready");
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
      actions.showToast("Audit review ready");
  }
}
