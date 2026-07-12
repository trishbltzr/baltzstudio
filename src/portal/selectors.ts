// Role-scoped, filter-aware derived lists shared across views.
import { ALL_PROJECTS, MY_CLIENTS } from "./data";
import { DEFAULT_CLIENT_NAME } from "./clients";
import { clientJourneyMessaging, journeyStageSummary } from "./helpers";
import type { PortalState } from "./store";
import type { ClientProject, Owner, Priority, Task, View } from "./types";

function syncProjectWithJourney(project: ClientProject, state: PortalState): ClientProject {
  if (project.client !== DEFAULT_CLIENT_NAME) return project;

  const { gate, stage, progress } = journeyStageSummary(state.journeyGates);
  if (!gate) return project;

  return {
    ...project,
    stage,
    progress,
    health: gate.status === "in_revision" ? "at_risk" : project.health,
  };
}

export function roleProjects(state: PortalState): ClientProject[] {
  let src = ALL_PROJECTS.map(project => syncProjectWithJourney(project, state));
  if (state.role === "dev") src = src.filter(p => MY_CLIENTS.includes(p.client));
  if (state.role === "client") src = src.filter(p => p.client === DEFAULT_CLIENT_NAME);
  const cf = state.clientFilter;
  return src.filter(p => (cf.service === "all" || p.service === cf.service) && (cf.health === "all" || p.health === cf.health));
}

export function roleTasks(state: PortalState): Task[] {
  let src = state.tasks;
  if (state.role === "dev") src = src.filter(t => t.assignee === "Kier Mangibin" || t.owner === "ai");
  if (state.role === "client") src = src.filter(t => t.project === DEFAULT_CLIENT_NAME);
  const tf = state.taskFilter;
  if (tf.owner !== "all") src = src.filter(t => (t.owner || "studio") === (tf.owner as Owner));
  if (tf.priority !== "all") src = src.filter(t => (t.priority || "med") === (tf.priority as Priority));
  return src;
}

export function inboxUnread(state: PortalState): number {
  if (state.role === "client") return 0;
  return state.threads.filter(t => (state.role === "admin" || MY_CLIENTS.includes(t.clientName)) && t.unread).length;
}

export function portalNotificationSummary(state: PortalState): { count: number; lead: string; items: string[]; target: View; targetLabel: string } {
  const { gate, stage, progress } = journeyStageSummary(state.journeyGates);
  const clientJourneyCopy = clientJourneyMessaging(gate);

  if (state.role === "client") {
    const items = gate ? [clientJourneyCopy.notificationItem, stage + " is " + progress + "% complete."] : ["Cocoon Consult has not started yet."];
    return {
      count: items.length,
      lead: clientJourneyCopy.notificationLead,
      items,
      target: "milestones",
      targetLabel: "View journey",
    };
  }

  const scopedThreads = state.threads.filter(thread => state.role === "admin" || MY_CLIENTS.includes(thread.clientName));
  const unreadThreads = scopedThreads.filter(thread => thread.unread > 0).length;
  const openEscalations = state.escalations.filter(item => !item.resolved).length;

  if (state.role === "admin") {
    const items = [
      DEFAULT_CLIENT_NAME + " is in " + stage + ".",
      openEscalations ? openEscalations + " escalation" + (openEscalations === 1 ? " needs" : "s need") + " attention." : "Escalations are clear.",
      unreadThreads ? unreadThreads + " inbox thread" + (unreadThreads === 1 ? " is" : "s are") + " unread." : "Inbox is clear.",
    ];
    return {
      count: items.length,
      lead: "Studio updates are live: milestone progress, escalations, and inbox activity are all in sync.",
      items,
      target: "activity",
      targetLabel: "See all",
    };
  }

  const reviewReady = roleTasks(state).filter(task => task.status === "review").length;
  const items = [
    DEFAULT_CLIENT_NAME + " is in " + stage + ".",
    reviewReady ? reviewReady + " task" + (reviewReady === 1 ? " is" : "s are") + " waiting for review." : "No tasks are waiting for review.",
    unreadThreads ? unreadThreads + " client thread" + (unreadThreads === 1 ? " has" : "s have") + " unread replies." : "No unread client replies.",
  ];
  return {
    count: items.length,
    lead: "Your workspace is up to date: milestone movement, review load, and replies are all reflected here.",
    items,
    target: "activity",
    targetLabel: "See all",
  };
}
