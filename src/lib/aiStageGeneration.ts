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

export interface BrandFontFaceEvidence {
  family: string;
  sourceUrl: string;
  format: string | null;
  weight: string;
  style: string;
}

export interface BrandVisualEvidence {
  status: "verified" | "unverified";
  sourceUrl: string | null;
  colors: BrandColorEvidence[];
  displayFont: string | null;
  bodyFont: string | null;
  fontFaces?: BrandFontFaceEvidence[];
  logoUrl: string | null;
}

export interface AiStageResult {
  title: string;
  summary: string;
  sections: AiStageSection[];
  recommendations: AiStageRecommendation[];
  brandVisuals?: BrandVisualEvidence;
}

export type FunnelCopyRole = "hero" | "problem" | "benefit" | "solution" | "differentiation" | "proof" | "objections" | "faq" | "cta";
export type FunnelRewriteDepth = "Polish" | "Improve" | "Rebuild";

export interface FunnelCopySection {
  role: FunnelCopyRole;
  eyebrow: string;
  heading: string;
  body: string;
  bullets: string[];
  cta: string | null;
  sourceStatus: "sourced" | "positioning" | "needs_approval";
}

export interface FunnelCopyResult {
  kind: "funnel_copy";
  agentId: "copywriting.conversion-copywriter";
  agentVersion: string;
  title: string;
  summary: string;
  rewriteDepth: FunnelRewriteDepth;
  sections: FunnelCopySection[];
}

export type GeneratedStageResult = AiStageResult | FunnelCopyResult | AuditScoreResult;

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

const FUNNEL_COPY_ROLES: readonly FunnelCopyRole[] = ["hero", "problem", "benefit", "solution", "differentiation", "proof", "objections", "faq", "cta"];

export function isFunnelCopyResult(value: unknown): value is FunnelCopyResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<FunnelCopyResult>;
  if (result.kind !== "funnel_copy"
    || result.agentId !== "copywriting.conversion-copywriter"
    || typeof result.agentVersion !== "string"
    || typeof result.title !== "string"
    || typeof result.summary !== "string"
    || !["Polish", "Improve", "Rebuild"].includes(result.rewriteDepth || "")
    || !Array.isArray(result.sections)
    || result.sections.length !== FUNNEL_COPY_ROLES.length) return false;
  const roles = result.sections.map(section => section?.role);
  return FUNNEL_COPY_ROLES.every((role, index) => roles[index] === role)
    && result.sections.every(section => section
      && typeof section.eyebrow === "string"
      && typeof section.heading === "string"
      && typeof section.body === "string"
      && Array.isArray(section.bullets)
      && section.bullets.every(bullet => typeof bullet === "string")
      && (typeof section.cta === "string" || section.cta === null)
      && ["sourced", "positioning", "needs_approval"].includes(section.sourceStatus));
}

export function isGeneratedStageResult(value: unknown): value is GeneratedStageResult {
  return isAiStageResult(value) || isFunnelCopyResult(value) || isAuditScoreResult(value);
}
