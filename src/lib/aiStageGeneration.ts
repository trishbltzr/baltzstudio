import { isAuditScoreResult, type AuditScoreResult } from "./auditChecklist";

export type AiGenerationMode = "audit" | "brand" | "seo" | "website_builder" | "funnel";

export interface AiStageSection {
  heading: string;
  body: string;
  bullets: string[];
}

export interface AiStageRecommendation {
  title: string;
  rationale: string;
  action: string;
}

export interface BrandColorEvidence {
  role: "Primary" | "Ink" | "Secondary" | "Accent" | "Paper";
  hex: string;
  evidence: string;
}

export interface BrandVisualEvidence {
  status: "verified" | "unverified";
  sourceUrl: string | null;
  colors: BrandColorEvidence[];
  displayFont: string | null;
  bodyFont: string | null;
  logoUrl: string | null;
}

export interface AiStageResult {
  title: string;
  summary: string;
  sections: AiStageSection[];
  recommendations: AiStageRecommendation[];
  brandVisuals?: BrandVisualEvidence;
}

export type GeneratedStageResult = AiStageResult | AuditScoreResult;

export const AI_STAGES: Record<AiGenerationMode, readonly string[]> = {
  audit: ["report", "plan"],
  brand: ["report", "plan"],
  seo: ["report", "plan"],
  website_builder: ["direction", "tasks"],
  funnel: ["flow", "copy", "wireframe", "brief"],
};

export function isAiStageResult(value: unknown): value is AiStageResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<AiStageResult>;
  return typeof result.title === "string"
    && typeof result.summary === "string"
    && Array.isArray(result.sections)
    && result.sections.every(section => section
      && typeof section.heading === "string"
      && typeof section.body === "string"
      && Array.isArray(section.bullets)
      && section.bullets.every(bullet => typeof bullet === "string"))
    && Array.isArray(result.recommendations)
    && result.recommendations.every(recommendation => recommendation
      && typeof recommendation.title === "string"
      && typeof recommendation.rationale === "string"
      && typeof recommendation.action === "string");
}

export function isGeneratedStageResult(value: unknown): value is GeneratedStageResult {
  return isAiStageResult(value) || isAuditScoreResult(value);
}
