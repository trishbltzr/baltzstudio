import assert from "node:assert/strict";
import {
  parseServiceCheckupResumeCheckpoint,
  serviceCheckupCaptureRequirementsForPlan,
  serviceCheckupRemainingCaptureUrls,
  type RecheckPlan,
} from "../src/workflows/serviceCheckup";
import { scoreChecks } from "../src/lib/auditChecklist";
import {
  isAgentMemoryEligible,
  fullRefreshTriggerKind,
  validateFullRefreshRequest,
} from "../src/lib/serviceRunGovernance";
import {
  analyzeWebsiteEvidence,
  websiteCheckDependencySeeds,
} from "../src/lib/serviceCheckupAnalysis";
import {
  normalizeClientSource,
  normalizePrimaryContactEmail,
} from "../src/lib/portalIntelligence";

function plan(
  stableKey: string,
  dependencyKinds: string[],
): RecheckPlan {
  return {
    targetCount: 1,
    noOp: false,
    captureMode: "representative",
    changedDependencies: [],
    targets: [{
      stableKey,
      title: stableKey,
      reason: "test",
      currentStatus: "failed",
      verifiedAt: null,
      dependencyKinds,
    }],
  };
}

const mobile = serviceCheckupCaptureRequirementsForPlan(
  plan("website.mobile-01", ["page", "lighthouse_mobile"]),
);
assert.deepEqual(mobile.renderedStrategies, ["mobile"]);
assert.deepEqual(mobile.lighthouseStrategies, ["mobile"]);
assert.equal(mobile.includeTechnical, false);

const desktop = serviceCheckupCaptureRequirementsForPlan(
  plan("website.design-01", ["page", "lighthouse_desktop"]),
);
assert.deepEqual(desktop.renderedStrategies, ["desktop"]);
assert.deepEqual(desktop.lighthouseStrategies, ["desktop"]);

const technical = serviceCheckupCaptureRequirementsForPlan(
  plan("website.seo-01", ["domain", "sitemap", "robots"]),
);
assert.deepEqual(technical.renderedStrategies, ["desktop"]);
assert.deepEqual(technical.lighthouseStrategies, []);
assert.equal(technical.includeTechnical, true);

const checkpoint = parseServiceCheckupResumeCheckpoint({
  phase: "capturing",
  pages: [
    { url: "https://example.com/", selectionReason: "primary", selectionRank: 1 },
    { url: "https://example.com/about", selectionReason: "representative", selectionRank: 2 },
  ],
  snapshotId: "00000000-0000-4000-8000-000000000093",
  captured: [{ url: "https://example.com/", ok: true }],
  failedPages: [],
  lighthouseAvailable: null,
  coverage: 0.5,
});
assert.ok(checkpoint);
assert.equal(checkpoint.snapshotId, "00000000-0000-4000-8000-000000000093");
assert.deepEqual(
  serviceCheckupRemainingCaptureUrls(
    checkpoint.phase,
    checkpoint.pages.map(page => page.url),
    checkpoint.captured,
  ),
  ["https://example.com/about"],
);
assert.deepEqual(
  serviceCheckupRemainingCaptureUrls(
    "checking",
    checkpoint.pages.map(page => page.url),
    checkpoint.captured,
  ),
  [],
);

assert.equal(parseServiceCheckupResumeCheckpoint({ phase: "unknown" }), null);

const dependencySeeds = websiteCheckDependencySeeds();
const accessibilityDependencies = dependencySeeds
  .filter(seed => seed.stable_key === "website.accessibility-02")
  .map(seed => seed.dependency_kind)
  .sort();
assert.deepEqual(accessibilityDependencies, ["lighthouse_desktop", "lighthouse_mobile", "page"]);

assert.deepEqual(scoreChecks([
  { id: "a", label: "A", status: "pass", evidence: "verified", sourceUrl: "https://example.com" },
  { id: "b", label: "B", status: "fail", evidence: "verified", sourceUrl: "https://example.com" },
  { id: "c", label: "C", status: "unverified", evidence: "missing", sourceUrl: "https://example.com" },
  { id: "d", label: "D", status: "not_applicable", evidence: "n/a", sourceUrl: "https://example.com" },
]), {
  passed: 1,
  failed: 1,
  unverified: 1,
  notApplicable: 1,
  score: 50,
});

assert.equal(validateFullRefreshRequest("full", "full_refresh"), "Choose the documented trigger that justifies this full refresh.");
assert.equal(validateFullRefreshRequest("failed", "full_refresh", "studio_request"), "A full refresh reason requires the full scope.");
assert.equal(validateFullRefreshRequest("full", "manual", "studio_request"), "A full scope requires the full refresh reason.");
assert.equal(validateFullRefreshRequest("full", "full_refresh", "studio_request"), null);
assert.equal(fullRefreshTriggerKind("source_replaced"), "source_changed");
assert.equal(fullRefreshTriggerKind("major_checklist_version"), "checklist_changed");
assert.equal(fullRefreshTriggerKind("significant_regression"), "regression");
assert.equal(fullRefreshTriggerKind("studio_request"), "manual");
assert.equal(fullRefreshTriggerKind("required_recovery"), "recovery");

const memoryNow = new Date("2026-07-23T00:00:00.000Z");
assert.equal(isAgentMemoryEligible({
  state: "approved",
  scope: "client",
  tenantId: "tenant-a",
  clientId: "client-a",
  requestedTenantId: "tenant-a",
  requestedClientId: "client-a",
  confidence: 0.9,
  expiresAt: "2026-07-24T00:00:00.000Z",
}, memoryNow), true);
assert.equal(isAgentMemoryEligible({
  state: "approved",
  scope: "client",
  tenantId: "tenant-a",
  clientId: "client-a",
  requestedTenantId: "tenant-a",
  requestedClientId: "client-b",
  confidence: 0.9,
  expiresAt: null,
}, memoryNow), false);

const emptyEvidence = {
  snapshot_id: "00000000-0000-4000-8000-000000000001",
  status: "partial",
  coverage_ratio: 0,
  fingerprint: "empty",
  items: [],
};
const firstAnalysis = analyzeWebsiteEvidence("run-idempotent", emptyEvidence);
const secondAnalysis = analyzeWebsiteEvidence("run-idempotent", emptyEvidence);
assert.deepEqual(secondAnalysis, firstAnalysis);
assert.ok(firstAnalysis.results.every(result => result.status === "unverified"));
assert.ok(firstAnalysis.results.every(result => result.idempotency_key.includes("run-idempotent")));

assert.deepEqual(normalizeClientSource("WWW.Example.com/path?ignored=1", "https://www.example.com/sitemap.xml"), {
  domain: "www.example.com",
  sourceUrl: "https://www.example.com",
  sitemapUrl: "https://www.example.com/sitemap.xml",
});
assert.throws(() => normalizeClientSource("http://localhost:3412"), /public domain/);
assert.throws(() => normalizeClientSource("https://example.com", "https://other.example/sitemap.xml"), /must belong/);
assert.equal(normalizePrimaryContactEmail(" Owner@Example.com "), "owner@example.com");
assert.equal(normalizePrimaryContactEmail(""), null);
assert.throws(() => normalizePrimaryContactEmail("not-an-email"), /must be valid/);

console.log("service workflow tests passed");
