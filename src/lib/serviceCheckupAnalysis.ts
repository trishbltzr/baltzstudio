import { createHash } from "node:crypto";
import {
  ALL_AUDIT_CHECKS,
  AUDIT_CHECKLIST,
  type AuditCheckStatus,
  type LighthouseRun,
} from "@/lib/auditChecklist";
import {
  automatedAuditChecks,
  type RenderedPageEvidence,
  type SiteTechnicalEvidence,
  type WebsiteEvidenceBundle,
} from "@/lib/renderedWebsiteEvidence";
import type { Json } from "@/lib/supabase/types";

export type WorkflowEvidenceItem = {
  id: string;
  source_kind: string;
  source_locator: string;
  device_kind: string | null;
  fingerprint: string;
  status: string;
  payload: Json;
  captured_at: string;
  fresh_until: string | null;
};

export type WorkflowEvidenceBundle = {
  snapshot_id: string;
  status: string;
  coverage_ratio: number;
  fingerprint: string | null;
  items: WorkflowEvidenceItem[];
};

export type WorkflowCheckDefinitionSeed = {
  stable_key: string;
  title: string;
  description: string;
  evaluation_kind: "deterministic" | "qualitative" | "connected_data" | "human";
  formula: Json;
  required: boolean;
  freshness_seconds: number;
  change_summary: string;
};

export type WorkflowCheckRevisionInput = {
  stable_key: string;
  status: "passed" | "failed" | "unverified" | "not_applicable";
  evidence_item_ids: string[];
  evidence_fingerprint: string;
  verifier_kind: "deterministic" | "agent" | "human";
  verifier_id: string;
  confidence: number;
  limitations: string[];
  rationale: string;
  idempotency_key: string;
};

export type WorkflowCheckDependencySeed = {
  stable_key: string;
  dependency_kind:
    | "domain"
    | "page"
    | "sitemap"
    | "robots"
    | "lighthouse_mobile"
    | "lighthouse_desktop"
    | "analytics"
    | "search_console"
    | "manual";
  dependency_key: string;
  required: boolean;
};

const CONNECTED_DATA_CHECKS = new Set([
  "seo-03",
  "seo-04",
  "seo-12",
  "seo-13",
  "seo-21",
  "seo-22",
]);

const DETERMINISTIC_CHECKS = new Set([
  "design-01", "design-02", "design-03", "design-04", "design-06", "design-09",
  "design-12", "design-13", "design-17", "design-18", "design-19", "design-20",
  "design-21", "design-22", "design-23", "design-25", "design-26", "design-27",
  "design-28", "design-29", "design-31", "design-36", "design-38", "design-39",
  "design-40", "design-44", "design-45", "design-46",
  "navigation-02", "navigation-03", "navigation-04", "navigation-05", "navigation-06",
  "navigation-08", "navigation-12", "navigation-14", "navigation-15", "navigation-17",
  "accessibility-02", "accessibility-03", "accessibility-04", "accessibility-07",
  "accessibility-08", "accessibility-12", "accessibility-17", "accessibility-22",
  "accessibility-24", "accessibility-25", "accessibility-26", "accessibility-38",
  "accessibility-39", "accessibility-43",
  ...Array.from({ length: 11 }, (_, index) => `accessibility-${String(index + 27).padStart(2, "0")}`),
  "mobile-01", "mobile-02", "mobile-03", "mobile-04", "mobile-05", "mobile-06",
  "mobile-07", "mobile-08",
  "seo-01", "seo-02", "seo-05", "seo-06", "seo-07", "seo-08", "seo-09",
  "seo-10", "seo-11", "seo-14", "seo-15", "seo-16", "seo-17", "seo-18",
  "seo-19", "seo-20",
]);

function evaluationKind(checkId: string): WorkflowCheckDefinitionSeed["evaluation_kind"] {
  if (CONNECTED_DATA_CHECKS.has(checkId)) return "connected_data";
  if (DETERMINISTIC_CHECKS.has(checkId)) return "deterministic";
  return "qualitative";
}

export function websiteCheckDefinitionSeeds(): WorkflowCheckDefinitionSeed[] {
  const categoryByCheck = new Map(
    AUDIT_CHECKLIST.flatMap(category => category.checks.map(check => [check.id, category.label] as const)),
  );
  return ALL_AUDIT_CHECKS.map(check => ({
    stable_key: `website.${check.id}`,
    title: check.label,
    description: `${categoryByCheck.get(check.id) || "Website"} checklist requirement.`,
    evaluation_kind: evaluationKind(check.id),
    formula: {
      kind: DETERMINISTIC_CHECKS.has(check.id) ? "rendered_evidence_rule" : "review_required",
      checklist_id: check.id,
    },
    required: true,
    freshness_seconds: 7 * 24 * 60 * 60,
    change_summary: "Initial published Website Checkup checklist.",
  }));
}

export function websiteCheckDependencySeeds(): WorkflowCheckDependencySeed[] {
  return ALL_AUDIT_CHECKS.flatMap(check => {
    const stable_key = `website.${check.id}`;
    const dependencies: WorkflowCheckDependencySeed[] = [];
    if (check.id.startsWith("seo-")) {
      dependencies.push({ stable_key, dependency_kind: "domain", dependency_key: "public-site", required: true });
      dependencies.push({ stable_key, dependency_kind: "sitemap", dependency_key: "sitemap.xml", required: false });
      dependencies.push({ stable_key, dependency_kind: "robots", dependency_key: "robots.txt", required: false });
      if (CONNECTED_DATA_CHECKS.has(check.id)) {
        dependencies.push({ stable_key, dependency_kind: "analytics", dependency_key: "configured", required: false });
        dependencies.push({ stable_key, dependency_kind: "search_console", dependency_key: "configured", required: false });
      }
    } else {
      dependencies.push({ stable_key, dependency_kind: "page", dependency_key: "representative-pages", required: true });
    }
    if (check.id.startsWith("mobile-") || check.id.startsWith("accessibility-")) {
      dependencies.push({ stable_key, dependency_kind: "lighthouse_mobile", dependency_key: "primary-page", required: false });
    }
    if (check.id.startsWith("design-") || check.id.startsWith("accessibility-")) {
      dependencies.push({ stable_key, dependency_kind: "lighthouse_desktop", dependency_key: "primary-page", required: false });
    }
    return dependencies;
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isWorkflowEvidenceBundle(value: unknown): value is WorkflowEvidenceBundle {
  if (!isObject(value) || typeof value.snapshot_id !== "string" || !Array.isArray(value.items)) return false;
  return value.items.every(item => isObject(item)
    && typeof item.id === "string"
    && typeof item.source_kind === "string"
    && typeof item.source_locator === "string"
    && typeof item.fingerprint === "string"
    && isObject(item.payload));
}

function isRenderedPage(value: unknown): value is RenderedPageEvidence {
  return isObject(value)
    && (value.strategy === "desktop" || value.strategy === "mobile")
    && typeof value.url === "string"
    && isObject(value.viewport)
    && isObject(value.typography)
    && isObject(value.navigation);
}

function isTechnicalEvidence(value: unknown): value is SiteTechnicalEvidence {
  return isObject(value)
    && typeof value.https === "boolean"
    && typeof value.sitemapAvailable === "boolean"
    && Array.isArray(value.brokenLinks);
}

function isLighthouseRun(value: unknown): value is LighthouseRun {
  return isObject(value)
    && (value.strategy === "desktop" || value.strategy === "mobile")
    && typeof value.testedUrl === "string"
    && typeof value.lighthouseVersion === "string"
    && isObject(value.scores)
    && Array.isArray(value.metrics)
    && Array.isArray(value.insights);
}

function resultStatus(status: AuditCheckStatus): WorkflowCheckRevisionInput["status"] {
  if (status === "pass") return "passed";
  if (status === "fail") return "failed";
  return status;
}

function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function analyzeWebsiteEvidence(
  runId: string,
  snapshot: WorkflowEvidenceBundle,
): {
  results: WorkflowCheckRevisionInput[];
  summary: {
    passed: number;
    failed: number;
    unverified: number;
    notApplicable: number;
    deterministic: number;
    total: number;
  };
} {
  const rendered = snapshot.items
    .filter(item => item.source_kind === "rendered_page" && item.status === "verified" && isRenderedPage(item.payload))
    .map(item => item.payload as unknown as RenderedPageEvidence);
  const technical = snapshot.items
    .find(item => item.source_kind === "technical" && item.status === "verified" && isTechnicalEvidence(item.payload))
    ?.payload as unknown as SiteTechnicalEvidence | undefined;
  const lighthouse = snapshot.items
    .filter(item => item.source_kind === "lighthouse" && item.status === "verified" && isLighthouseRun(item.payload))
    .map(item => item.payload as unknown as LighthouseRun);

  const bundle: WebsiteEvidenceBundle = {
    rendered,
    technical: technical ?? {
      https: false,
      httpRedirectsToHttps: null,
      hostRedirectConsistent: null,
      sitemapAvailable: false,
      robotsAvailable: false,
      notFoundHelpful: null,
      brokenLinksChecked: 0,
      brokenLinks: [],
    },
  };
  const automated = automatedAuditChecks(bundle, lighthouse);
  const results = ALL_AUDIT_CHECKS.map(check => {
    const evaluation = automated.get(check.id);
    const status = resultStatus(evaluation?.status ?? "unverified");
    const citedItems = evaluation?.sourceUrl
      ? snapshot.items.filter(item => item.source_locator === evaluation.sourceUrl)
      : [];
    const evidenceItemIds = citedItems.map(item => item.id);
    const evidenceFingerprints = citedItems.map(item => item.fingerprint);
    const unsupported = !evaluation;
    const rationale = evaluation?.evidence
      || "No published deterministic rule can verify this requirement from the captured public evidence.";
    return {
      stable_key: `website.${check.id}`,
      status,
      evidence_item_ids: evidenceItemIds,
      evidence_fingerprint: fingerprint({
        check: check.id,
        status,
        evidence: evidenceFingerprints,
        snapshot: snapshot.fingerprint,
      }),
      verifier_kind: "deterministic" as const,
      verifier_id: "website-evidence-rules@1",
      confidence: unsupported ? 0 : status === "not_applicable" ? 0.95 : 1,
      limitations: unsupported
        ? ["Qualitative, connected, or human evidence is still required."]
        : status === "unverified"
          ? ["The available public evidence did not resolve this deterministic check."]
          : [],
      rationale,
      idempotency_key: `${runId}:check:${check.id}:snapshot:${snapshot.snapshot_id}`,
    };
  });

  return {
    results,
    summary: {
      passed: results.filter(result => result.status === "passed").length,
      failed: results.filter(result => result.status === "failed").length,
      unverified: results.filter(result => result.status === "unverified").length,
      notApplicable: results.filter(result => result.status === "not_applicable").length,
      deterministic: results.filter(result => DETERMINISTIC_CHECKS.has(result.stable_key.replace("website.", ""))).length,
      total: results.length,
    },
  };
}
