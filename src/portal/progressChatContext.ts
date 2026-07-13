import { clientsVisibleToRole } from "./clients";
import { roleProjects, roleTasks } from "./selectors";
import type { PortalState } from "./store";

export function buildProgressChatContext(state: PortalState) {
  const clients = clientsVisibleToRole(state.role, state.clientName);
  const clientIds = new Set(clients.map(client => client.id));
  const clientNames = new Set(clients.map(client => client.name));
  const visibleThreads = state.threads.filter(thread => state.role === "admin" || clientNames.has(thread.clientName));
  const visibleEscalations = state.escalations.filter(item => state.role === "admin" || clientNames.has(item.client));
  const workspaces = Object.fromEntries(Object.entries(state.clientWorkspaces)
    .filter(([clientId]) => clientIds.has(clientId))
    .map(([clientId, workspace]) => [clientId, {
      approvals: workspace.approvals.map(item => ({ title: item.title, sent: item.sent, sentAt: item.sentAt })),
      funnelPlans: workspace.funnelPlans.map(item => ({ title: item.title, status: item.statusLabel, stage: item.stage, progress: item.progress, due: item.due, generatedAt: item.generatedAt, updatedAt: item.updatedAt })),
      files: workspace.files.map(item => ({ name: item.name, folder: item.folder, status: item.status, updated: item.updated })),
      notes: workspace.notes.map(item => ({ text: item.text, author: item.author, createdAt: item.createdAt })),
    }]));

  return {
    role: state.role,
    generatedAt: new Date().toISOString(),
    clients: clients.map(client => ({ id: client.id, name: client.name, owner: client.owner, audited: client.audited })),
    projects: roleProjects(state).map(project => ({ client: project.client, name: project.name, stage: project.stage, progress: project.progress, health: project.health, due: project.due, dev: project.dev })),
    tasks: roleTasks(state).map(task => ({ title: task.title, project: task.project, assignee: task.assignee, status: task.status, priority: task.priority, due: task.due, milestone: task.milestone })),
    inbox: visibleThreads.map(thread => ({ client: thread.clientName, subject: thread.name, status: thread.status, unread: thread.unread, assignee: thread.assignee, escalated: thread.escalated, latest: thread.messages.at(-1)?.time })),
    escalations: visibleEscalations.map(item => ({ client: item.client, title: item.title, level: item.level, reason: item.reason, time: item.time, resolved: item.resolved })),
    journey: state.role === "client" ? state.journeyGates.map(gate => ({ title: gate.title, status: gate.status, when: gate.when, eta: gate.eta, next: gate.next })) : [],
    workspaces,
  };
}
