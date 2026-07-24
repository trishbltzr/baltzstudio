export const FULL_REFRESH_TRIGGERS = {
  source_replaced: {
    label: "Source replaced",
    explanation: "The primary domain, uploaded source, or connected dataset changed, so every applicable check needs a new baseline.",
  },
  material_structure_change: {
    label: "Material structure change",
    explanation: "Navigation, templates, page types, or information architecture changed enough that the current evidence graph is no longer representative.",
  },
  major_checklist_version: {
    label: "Major checklist version",
    explanation: "The published checklist introduced broad new or changed requirements that cannot be evaluated safely from the existing evidence.",
  },
  evidence_expired: {
    label: "Evidence expired",
    explanation: "The saved evidence is outside its freshness window and the sentinels cannot confirm that the complete source remains current.",
  },
  significant_regression: {
    label: "Significant regression",
    explanation: "A material decline spans multiple dependencies, so a targeted recheck would not establish the full impact.",
  },
  studio_request: {
    label: "Explicit studio request",
    explanation: "The studio intentionally requested a new complete baseline after reviewing the cost and scope.",
  },
  required_recovery: {
    label: "Required recovery",
    explanation: "The saved checkpoint or evidence set cannot be recovered selectively, so the complete evidence scope must be rebuilt.",
  },
} as const;

export type FullRefreshTrigger = keyof typeof FULL_REFRESH_TRIGGERS;
export type RecheckScope = "all_actionable" | "failed" | "unverified" | "changed" | "full";

export function isFullRefreshTrigger(value: unknown): value is FullRefreshTrigger {
  return typeof value === "string" && value in FULL_REFRESH_TRIGGERS;
}

export function validateFullRefreshRequest(
  scope: RecheckScope,
  reason: "failed_or_unverified" | "lab_dependency" | "manual" | "full_refresh",
  trigger?: FullRefreshTrigger,
) {
  if ((scope === "full" || reason === "full_refresh") && !trigger) {
    return "Choose the documented trigger that justifies this full refresh.";
  }
  if (scope !== "full" && reason === "full_refresh") {
    return "A full refresh reason requires the full scope.";
  }
  if (scope === "full" && reason !== "full_refresh") {
    return "A full scope requires the full refresh reason.";
  }
  return null;
}

export function fullRefreshTriggerKind(trigger: FullRefreshTrigger) {
  if (trigger === "major_checklist_version") return "checklist_changed" as const;
  if (trigger === "significant_regression") return "regression" as const;
  if (trigger === "studio_request") return "manual" as const;
  if (trigger === "required_recovery") return "recovery" as const;
  return "source_changed" as const;
}

export type MemoryEligibilityInput = {
  state: "proposed" | "approved" | "rejected" | "revoked";
  scope: "client" | "tenant" | "global";
  tenantId: string;
  clientId: string | null;
  requestedTenantId: string;
  requestedClientId: string;
  confidence: number;
  expiresAt: string | null;
};

export function isAgentMemoryEligible(input: MemoryEligibilityInput, now = new Date()) {
  if (input.state !== "approved" || input.scope !== "client") return false;
  if (input.tenantId !== input.requestedTenantId || input.clientId !== input.requestedClientId) return false;
  if (!Number.isFinite(input.confidence) || input.confidence < 0.8) return false;
  if (!input.expiresAt) return true;
  const expiresAt = new Date(input.expiresAt);
  return Number.isFinite(expiresAt.getTime()) && expiresAt > now;
}
