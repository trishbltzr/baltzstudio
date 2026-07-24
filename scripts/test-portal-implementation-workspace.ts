import assert from "node:assert/strict";
import { generatePortalImplementationWorkspace } from "../src/lib/portalImplementationWorkspace";
import type { PortalProcessHandoff } from "../src/lib/portalProcessHandoffs";

const handoff: PortalProcessHandoff = {
  id: "run-arbitrary-domain--website-build",
  clientId: "arbitrary-domain",
  clientName: "Arbitrary Domain Ltd",
  sourceProcessId: "website-audit",
  sourceRunId: "run-arbitrary-domain",
  sourceTemplateVersion: 3,
  targetProcessId: "website-build",
  status: "accepted",
  finalOutput: "Approved website strategy",
  sourceOutputVersion: 3,
  context: { domain: "https://example.test" },
  approvedScope: ["Homepage", "Services", "Contact"],
  includedRecommendations: ["Clarify the primary call to action", "Simplify the navigation"],
  unresolvedItems: ["Final photography"],
  approvalStatus: "approved",
  approvedAt: "2026-07-24T00:00:00.000Z",
  approvedBy: { role: "client", label: "Arbitrary Domain Ltd" },
  sender: { role: "studio", label: "Studio Admin" },
  receiver: { role: "studio", label: "Website Lab" },
  createdTaskIds: [],
  createdAt: "2026-07-24T00:00:00.000Z",
  updatedAt: "2026-07-24T00:00:00.000Z",
};

const workspace = generatePortalImplementationWorkspace(handoff);
assert.equal(workspace.milestones.length, 5);
assert.deepEqual(workspace.milestones.map(milestone => milestone.approvalGate).filter(Boolean), [
  "Design Preview",
  "Full Site Preview",
  "Handoff Package",
]);
assert.equal(workspace.journeyGates.length, 3);
assert.ok(workspace.tasks.some(task => task.title.includes("Homepage")));
assert.ok(workspace.tasks.some(task => task.title === "Simplify the navigation"));
assert.ok(workspace.tasks.every(task => task.project === "Arbitrary Domain Ltd"));
assert.ok(workspace.tasks.every(task => task.sourceId?.includes("run-arbitrary-domain")));
assert.equal(workspace.tasks.find(task => task.title === "Approve handoff package")?.workflowEffects?.project?.doneProgress, 100);

console.log("portal implementation workspace tests passed");
