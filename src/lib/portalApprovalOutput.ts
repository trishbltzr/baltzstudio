import { isAuditScoreResult } from "./auditChecklist";
import { isAiStageResult, type GeneratedStageResult } from "./aiStageGeneration";
import type { PortalApprovalSection } from "./portalWorkspacePersistence";

const INTERNAL_OUTPUT_MARKERS = /\b(system prompt|developer prompt|tool trace|agent memory|memory revision|chain[- ]of[- ]thought|service role key|api key|evidence fingerprint|snapshot id|internal note)\b/i;

export function sanitizeClientSafeText(value: unknown, maxLength = 1_200) {
  if (typeof value !== "string") return "";
  const normalized = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized || INTERNAL_OUTPUT_MARKERS.test(normalized)) return "";
  return normalized.slice(0, maxLength);
}

export function portalApprovalOutput(
  aiResults: Record<string, GeneratedStageResult>,
  fallbackSummary: string,
): { summary: string; sections: PortalApprovalSection[] } {
  const orderedResults = Object.values(aiResults).filter(Boolean);
  const generatedSummary = [...orderedResults].reverse().find(result => typeof result.summary === "string")?.summary;
  const summary = sanitizeClientSafeText(generatedSummary, 800) || sanitizeClientSafeText(fallbackSummary, 800);
  const sections: PortalApprovalSection[] = [];

  for (const result of orderedResults) {
    if (isAiStageResult(result)) {
      sections.push(...result.sections.map(section => ({
        heading: sanitizeClientSafeText(section.heading, 120),
        body: sanitizeClientSafeText(section.body, 1_200),
        bullets: section.bullets.map(item => sanitizeClientSafeText(item, 320)).filter(Boolean).slice(0, 12),
      })));
      if (result.recommendations.length) {
        sections.push({
          heading: sanitizeClientSafeText(`${result.title} · Recommended actions`, 120),
          body: sanitizeClientSafeText(result.summary, 1_200),
          bullets: result.recommendations
            .map(item => sanitizeClientSafeText(`${item.title}: ${item.action}`, 320))
            .filter(Boolean)
            .slice(0, 12),
        });
      }
    } else if (isAuditScoreResult(result)) {
      sections.push(...result.categories.map(category => ({
        heading: sanitizeClientSafeText(`${category.label} · ${category.score}%`, 120),
        body: sanitizeClientSafeText(category.courseOfAction, 1_200),
        bullets: category.issues.map(issue => sanitizeClientSafeText(issue.fix, 320)).filter(Boolean).slice(0, 5),
      })));
    }
  }

  const seen = new Set<string>();
  return {
    summary,
    sections: sections.filter(section => {
      if (!section.heading || !section.body) return false;
      const key = `${section.heading}\n${section.body}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}
