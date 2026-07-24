import assert from "node:assert/strict";
import { clientEngineAccessDecision, portalCapabilities } from "../src/portal/access";
import { emptyPortalClientWorkspace } from "../src/lib/portalWorkspacePersistence";
import type { PortalProcessHandoff } from "../src/lib/portalProcessHandoffs";

const clientId = "blue-ribbon";
const clientName = "Blue Ribbon";
const handoff: PortalProcessHandoff = {
  id: "blue-audit--website-build",
  clientId,
  clientName,
  sourceProcessId: "website-audit",
  sourceRunId: "blue-audit",
  sourceTemplateVersion: 1,
  targetProcessId: "website-build",
  status: "accepted",
  finalOutput: "Approved website strategy",
  sourceOutputVersion: 1,
  context: {},
  approvedScope: ["Homepage"],
  includedRecommendations: [],
  unresolvedItems: [],
  approvalStatus: "approved",
  sender: { role: "studio", label: "Studio Admin" },
  receiver: { role: "studio", label: "Website Lab" },
  createdTaskIds: [],
  createdAt: "2026-07-24T00:00:00.000Z",
  updatedAt: "2026-07-24T00:00:00.000Z",
};
const baseWorkspace = {
  ...emptyPortalClientWorkspace(clientId),
  handoffs: [handoff],
  serviceLifecycle: {
    ...emptyPortalClientWorkspace(clientId).serviceLifecycle,
    wiawState: "workspace_unlocked" as const,
  },
};
const baseState = {
  role: "client" as const,
  clientName,
  projectOverrides: { [clientName]: { service: "wiaw" as const } },
  clientWorkspaces: { [clientId]: baseWorkspace },
};

assert.equal(clientEngineAccessDecision(baseState, "labs").allowed, false, "An accepted handoff must not expose Labs before WIAW confirmation.");
assert.equal(portalCapabilities(baseState).canUseLiveLabs, false);

const confirmedState = {
  ...baseState,
  clientWorkspaces: {
    [clientId]: {
      ...baseWorkspace,
      serviceLifecycle: { ...baseWorkspace.serviceLifecycle, wiawState: "confirmed" as const },
    },
  },
};
assert.equal(clientEngineAccessDecision(confirmedState, "labs").allowed, true);
assert.equal(portalCapabilities(confirmedState).canUseLiveLabs, true);

const pausedWithAccessState = {
  ...confirmedState,
  clientWorkspaces: {
    [clientId]: {
      ...baseWorkspace,
      serviceLifecycle: {
        ...baseWorkspace.serviceLifecycle,
        wiawState: "paused" as const,
        wiawPauseAccessPolicy: "continue" as const,
      },
    },
  },
};
assert.equal(clientEngineAccessDecision(pausedWithAccessState, "labs").allowed, true);
assert.equal(clientEngineAccessDecision({
  ...pausedWithAccessState,
  clientWorkspaces: {
    [clientId]: {
      ...pausedWithAccessState.clientWorkspaces[clientId],
      serviceLifecycle: {
        ...pausedWithAccessState.clientWorkspaces[clientId].serviceLifecycle,
        wiawPauseAccessPolicy: "suspend" as const,
      },
    },
  },
}, "labs").allowed, false);
assert.equal(clientEngineAccessDecision({
  ...confirmedState,
  clientWorkspaces: {
    [clientId]: {
      ...baseWorkspace,
      serviceLifecycle: {
        ...baseWorkspace.serviceLifecycle,
        wiawState: "cancelled" as const,
      },
    },
  },
}, "labs").allowed, false);

const iffWorkspace = {
  ...emptyPortalClientWorkspace(clientId),
  engineWork: {
    websiteBuilder: {
      status: "complete" as const,
      progress: 100,
      updatedAt: "2026-07-24T00:00:00.000Z",
    },
  },
};
const iffState = {
  ...baseState,
  projectOverrides: { [clientName]: { service: "iff" as const } },
  clientWorkspaces: {
    [clientId]: {
      ...iffWorkspace,
      serviceLifecycle: {
        ...iffWorkspace.serviceLifecycle,
        iffState: "offered" as const,
        iffAccessPolicy: "active_subscription" as const,
      },
    },
  },
};
assert.equal(clientEngineAccessDecision(iffState, "labs").allowed, false, "An offer alone must not open retained-service Labs.");
assert.equal(clientEngineAccessDecision({
  ...iffState,
  clientWorkspaces: {
    [clientId]: {
      ...iffState.clientWorkspaces[clientId],
      serviceLifecycle: {
        ...iffState.clientWorkspaces[clientId].serviceLifecycle,
        iffState: "active" as const,
      },
    },
  },
}, "labs").allowed, true);
assert.equal(clientEngineAccessDecision({
  ...iffState,
  clientWorkspaces: {
    [clientId]: {
      ...iffState.clientWorkspaces[clientId],
      serviceLifecycle: {
        ...iffState.clientWorkspaces[clientId].serviceLifecycle,
        iffState: "paused" as const,
      },
    },
  },
}, "labs").allowed, false);

console.log("portal access tests passed");
