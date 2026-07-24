import { z } from "zod";
import type { Json } from "@/lib/supabase/types";

export const qualitativeFindingSchema = z.object({
  stableKey: z.string().min(1),
  status: z.enum(["passed", "failed", "unverified", "not_applicable"]),
  evidenceItemIds: z.array(z.string().uuid()).max(12),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1).max(2_000),
  limitations: z.array(z.string().min(1).max(300)).max(8),
  recommendedAction: z.string().min(1).max(500),
  requiresHumanReview: z.boolean(),
  reviewReason: z.string().max(500),
});

export const qualitativeReviewOutputSchema = z.object({
  findings: z.array(qualitativeFindingSchema).max(10),
  runSummary: z.string().min(1).max(1_000),
});

export type QualitativeFinding = z.infer<typeof qualitativeFindingSchema>;
export type QualitativeReviewOutput = z.infer<typeof qualitativeReviewOutputSchema>;

export type GovernedAgentDefinition = {
  id: string;
  stableKey: string;
  version: number;
  name: string;
  instructions: string;
  allowedTools: string[];
  memoryPolicy: Json;
  approvalRequirements: Json;
  playbookKey: string;
  playbookVersion: number;
};

export type GovernedAgentMemory = {
  id: string;
  memoryKind: string;
  content: Json;
  sourceKind: string;
  sourceReference: string;
  confidence: number;
  approvedAt: string;
  expiresAt: string | null;
};

export type QualitativeTarget = {
  stableKey: string;
  title: string;
  description: string;
  required: boolean;
  formula: Json;
};

export type AgentEvidenceItem = {
  id: string;
  sourceKind: string;
  sourceLocator: string;
  deviceKind: string | null;
  status: string;
  fingerprint: string;
  payload: Json;
  capturedAt: string;
  freshUntil: string | null;
};

export type GovernedAgentRunInput = {
  runId: string;
  clientId: string;
  serviceKind: string;
  stageKey: string;
  definition: GovernedAgentDefinition;
  memory: GovernedAgentMemory[];
  targets: QualitativeTarget[];
  evidence: AgentEvidenceItem[];
};

export type AgentToolTrace = {
  tool: string;
  input: Json;
  resultCount: number;
  occurredAt: string;
};

export type GovernedAgentRunResult = {
  findings: QualitativeFinding[];
  runSummary: string;
  toolTrace: AgentToolTrace[];
  latencyMs: number;
  model: string;
};
