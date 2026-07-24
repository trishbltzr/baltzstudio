import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const { runGovernedQualitativeReview } = await import("@/lib/serviceAgent/runtime");

const evidenceId = "773c7a7b-b3d4-4c13-b555-0fe3d0461409";
const result = await runGovernedQualitativeReview({
  runId: "smoke-governed-agent",
  clientId: "7b6681e1-94dc-48c4-a1c9-47e61da661b6",
  serviceKind: "website",
  stageKey: "reviewing",
  definition: {
    id: "066c798d-25ae-4f6d-aabd-6bd418988f22",
    stableKey: "checkup.qualitative-reviewer",
    version: 1,
    name: "Governed Checkup Reviewer",
    instructions: "Assess the assigned qualitative website check from direct evidence only.",
    allowedTools: [
      "lookup_review_targets",
      "list_scoped_evidence",
      "retrieve_scoped_evidence",
      "propose_human_review",
    ],
    memoryPolicy: { read: "approved_scoped_only", write: "prohibited" },
    approvalRequirements: { confidence_below: 0.8, client_facing_claims: true },
    playbookKey: "checkup-core",
    playbookVersion: 1,
  },
  memory: [],
  targets: [{
    stableKey: "website.content-smoke",
    title: "Primary action is clear",
    description: "The page presents one clear primary action.",
    required: true,
    formula: { kind: "review_required" },
  }],
  evidence: [{
    id: evidenceId,
    sourceKind: "rendered_page",
    sourceLocator: "https://example.com/",
    deviceKind: "desktop",
    status: "verified",
    fingerprint: "smoke-evidence-v1",
    payload: {
      url: "https://example.com/",
      visibleText: "Example Domain. This domain is for use in illustrative examples in documents.",
      links: [{ text: "More information", href: "https://iana.org/domains/example" }],
    },
    capturedAt: new Date().toISOString(),
    freshUntil: new Date(Date.now() + 86_400_000).toISOString(),
  }],
});

const finding = result.findings[0];
if (!finding || finding.stableKey !== "website.content-smoke") {
  throw new Error("The agent did not return the scoped smoke target.");
}
if (finding.evidenceItemIds.some(id => id !== evidenceId)) {
  throw new Error("The agent cited evidence outside the scoped smoke run.");
}

console.log(JSON.stringify({
  ok: true,
  model: result.model,
  findingCount: result.findings.length,
  status: finding.status,
  citedEvidenceCount: finding.evidenceItemIds.length,
  requiresHumanReview: finding.requiresHumanReview,
  toolCalls: result.toolTrace.map(trace => trace.tool),
  latencyMs: result.latencyMs,
}));
