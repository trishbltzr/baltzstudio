import assert from "node:assert/strict";
import { compareShadowProjections, projectNormalizedWebsiteRun, type ShadowProjection } from "../src/lib/workflowShadowComparison";

const legacy: ShadowProjection = {
  serviceKind: "website",
  score: 50,
  checks: [
    { key: "content.clear-language", status: "passed" },
    { key: "content.contextual-cta", status: "failed" },
  ],
};

const normalized = projectNormalizedWebsiteRun([
  { check_definition_id: "a", revision: 1, status: "failed" },
  { check_definition_id: "a", revision: 2, status: "passed" },
  { check_definition_id: "b", revision: 1, status: "failed" },
], [
  { id: "a", stable_key: "content.clear-language" },
  { id: "b", stable_key: "content.contextual-cta" },
]);

assert.deepEqual(normalized, legacy, "latest normalized revisions should reproduce the legacy client projection");
assert.equal(compareShadowProjections(legacy, normalized).parityState, "match");

const mismatch = compareShadowProjections(legacy, {
  ...legacy,
  score: 100,
  checks: legacy.checks.map(check => ({ ...check, status: "passed" as const })),
});
assert.equal(mismatch.parityState, "mismatch");
assert.deepEqual(mismatch.discrepancies.map(item => item.kind), ["score", "status"]);

const incomplete = compareShadowProjections(legacy, null);
assert.equal(incomplete.parityState, "not_comparable");
assert.equal(incomplete.discrepancies[0]?.kind, "missing_normalized");

console.log("Shadow projection comparison tests passed.");
