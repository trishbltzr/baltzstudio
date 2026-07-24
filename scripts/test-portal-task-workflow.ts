import assert from "node:assert/strict";
import { emptyPortalClientWorkspace, portalClientId } from "../src/lib/portalWorkspacePersistence";
import { applyTaskWorkflowEffects, type PortalState } from "../src/portal/store";
import type { JourneyGate, Task } from "../src/portal/types";

const clientName = "Workflow Test Client";
const clientId = portalClientId(clientName);
const gate: JourneyGate = {
  id: "gate-approval",
  g: 1,
  title: "Approve direction",
  sub: "Client decision",
  status: "awaiting",
  when: "Now",
  eta: "Today",
  thumb: "",
  next: "Begin build",
};
const task: Task = {
  id: "workflow-task",
  title: "Approve direction",
  project: clientName,
  assignee: "Client",
  assignment: { role: "client", label: "Client" },
  owner: "client",
  status: "review",
  priority: "high",
  due: "Today",
  completionEventType: "client_approval_completed",
  workflowEffects: {
    journeyGate: { id: gate.id, doneStatus: "approved", reopenedStatus: "awaiting" },
    project: {
      service: "wiaw",
      doneStage: "Design approved",
      reopenedStage: "Client review",
      doneProgress: 60,
      reopenedProgress: 50,
    },
    lifecycle: {
      doneDeliverableState: "approved",
      reopenedDeliverableState: "review",
      doneDashboardAccessState: "active",
      reopenedDashboardAccessState: "active",
      doneCurrentStage: "Design approved",
      reopenedCurrentStage: "Client review",
      doneNextStage: "Build",
      reopenedNextStage: "Approval",
      doneNextAction: "Begin build",
      reopenedNextAction: "Approve direction",
    },
  },
};

const state = {
  tasks: [task],
  journeyGates: [gate],
  projectOverrides: {},
  clientWorkspaces: { [clientId]: emptyPortalClientWorkspace(clientId) },
} as unknown as PortalState;

const completedTask = { ...task, status: "done" as const };
const completed = applyTaskWorkflowEffects(state, [completedTask]);
assert.equal(completed.journeyGates[0]?.status, "approved");
assert.deepEqual(completed.projectOverrides[clientName], {
  service: "wiaw",
  stage: "Design approved",
  progress: 60,
});
assert.equal(completed.clientWorkspaces[clientId]?.serviceLifecycle.deliverableState, "approved");
assert.equal(completed.clientWorkspaces[clientId]?.serviceLifecycle.dashboardAccessState, "active");
assert.equal(completed.clientWorkspaces[clientId]?.serviceLifecycle.nextRequiredAction, "Begin build");

const reopenedTask = { ...completedTask, status: "review" as const };
const reopened = applyTaskWorkflowEffects(completed, [reopenedTask]);
assert.equal(reopened.journeyGates[0]?.status, "awaiting");
assert.equal(reopened.projectOverrides[clientName]?.stage, "Client review");
assert.equal(reopened.projectOverrides[clientName]?.progress, 50);
assert.equal(reopened.clientWorkspaces[clientId]?.serviceLifecycle.deliverableState, "review");
assert.equal(reopened.clientWorkspaces[clientId]?.serviceLifecycle.nextRequiredAction, "Approve direction");

const ordinaryTask = { ...task, id: "ordinary", workflowEffects: undefined };
const ordinaryState = { ...state, tasks: [ordinaryTask] };
const ordinary = applyTaskWorkflowEffects(ordinaryState, [{ ...ordinaryTask, status: "done" }]);
assert.equal(ordinary.journeyGates[0]?.status, "awaiting");
assert.deepEqual(ordinary.projectOverrides, {});

console.log("portal task workflow tests passed");
