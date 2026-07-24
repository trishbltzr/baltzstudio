import { createHash } from "node:crypto";
import { isAuditScoreResult } from "./auditChecklist";

export type ShadowCheckStatus = "passed" | "failed" | "unverified" | "not_applicable";

export type ShadowProjection = {
  serviceKind: string;
  score: number | null;
  checks: Array<{
    key: string;
    status: ShadowCheckStatus;
  }>;
};

export type ShadowComparison = {
  legacyFingerprint: string;
  normalizedFingerprint: string;
  legacyScore: number | null;
  normalizedScore: number | null;
  parityState: "match" | "mismatch" | "not_comparable";
  discrepancies: Array<{
    kind: "missing_legacy" | "missing_normalized" | "score" | "status";
    checkKey?: string;
    legacy?: string | number | null;
    normalized?: string | number | null;
  }>;
};

type NormalizedRevision = {
  check_definition_id: string;
  revision: number;
  status: string;
};

type CheckDefinition = {
  id: string;
  stable_key: string;
};

function fingerprint(value: ShadowProjection | null) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function legacyStatus(status: string): ShadowCheckStatus | null {
  if (status === "pass") return "passed";
  if (status === "fail") return "failed";
  if (status === "unverified") return "unverified";
  if (status === "not_applicable") return "not_applicable";
  return null;
}

function normalizedStatus(status: string): ShadowCheckStatus | null {
  return ["passed", "failed", "unverified", "not_applicable"].includes(status)
    ? status as ShadowCheckStatus
    : null;
}

export function projectLegacyWebsiteAudit(state: unknown): ShadowProjection | null {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const report = (state as Record<string, unknown>).report;
  if (!isAuditScoreResult(report)) return null;

  return {
    serviceKind: "website",
    score: Math.round(report.overallScore),
    checks: report.categories
      .flatMap(category => category.checks)
      .map(check => {
        const status = legacyStatus(check.status);
        return status ? { key: check.id, status } : null;
      })
      .filter((check): check is NonNullable<typeof check> => !!check)
      .sort((a, b) => a.key.localeCompare(b.key)),
  };
}

export function projectNormalizedWebsiteRun(
  revisions: NormalizedRevision[],
  definitions: CheckDefinition[],
): ShadowProjection | null {
  const stableKeyById = new Map(definitions.map(definition => [definition.id, definition.stable_key]));
  const latestByDefinition = new Map<string, NormalizedRevision>();
  for (const revision of revisions) {
    const current = latestByDefinition.get(revision.check_definition_id);
    if (!current || revision.revision > current.revision) {
      latestByDefinition.set(revision.check_definition_id, revision);
    }
  }

  const checks = [...latestByDefinition.values()]
    .map(revision => {
      const key = stableKeyById.get(revision.check_definition_id);
      const status = normalizedStatus(revision.status);
      return key && status ? { key, status } : null;
    })
    .filter((check): check is NonNullable<typeof check> => !!check)
    .sort((a, b) => a.key.localeCompare(b.key));
  if (!checks.length) return null;

  const passed = checks.filter(check => check.status === "passed").length;
  const failed = checks.filter(check => check.status === "failed").length;
  const scored = passed + failed;
  return {
    serviceKind: "website",
    score: scored ? Math.round((passed / scored) * 100) : null,
    checks,
  };
}

export function compareShadowProjections(
  legacy: ShadowProjection | null,
  normalized: ShadowProjection | null,
): ShadowComparison {
  const discrepancies: ShadowComparison["discrepancies"] = [];
  if (!legacy) discrepancies.push({ kind: "missing_legacy" });
  if (!normalized) discrepancies.push({ kind: "missing_normalized" });

  if (legacy && normalized) {
    if (legacy.score !== normalized.score) {
      discrepancies.push({
        kind: "score",
        legacy: legacy.score,
        normalized: normalized.score,
      });
    }

    const legacyByKey = new Map(legacy.checks.map(check => [check.key, check.status]));
    const normalizedByKey = new Map(normalized.checks.map(check => [check.key, check.status]));
    const allKeys = [...new Set([...legacyByKey.keys(), ...normalizedByKey.keys()])].sort();
    for (const checkKey of allKeys) {
      const legacyValue = legacyByKey.get(checkKey);
      const normalizedValue = normalizedByKey.get(checkKey);
      if (!legacyValue) {
        discrepancies.push({ kind: "missing_legacy", checkKey, normalized: normalizedValue ?? null });
      } else if (!normalizedValue) {
        discrepancies.push({ kind: "missing_normalized", checkKey, legacy: legacyValue });
      } else if (legacyValue !== normalizedValue) {
        discrepancies.push({
          kind: "status",
          checkKey,
          legacy: legacyValue,
          normalized: normalizedValue,
        });
      }
    }
  }

  return {
    legacyFingerprint: fingerprint(legacy),
    normalizedFingerprint: fingerprint(normalized),
    legacyScore: legacy?.score ?? null,
    normalizedScore: normalized?.score ?? null,
    parityState: !legacy || !normalized
      ? "not_comparable"
      : discrepancies.length
        ? "mismatch"
        : "match",
    discrepancies,
  };
}
