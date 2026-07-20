import { isAuditScoreResult } from "./auditChecklist";
import { isAiStageResult, type GeneratedStageResult } from "./aiStageGeneration";
import type { PortalApprovalSection } from "./portalWorkspacePersistence";

export function portalApprovalOutput(
  aiResults: Record<string, GeneratedStageResult>,
  fallbackSummary: string,
): { summary: string; sections: PortalApprovalSection[] } {
  const orderedResults = Object.values(aiResults).filter(Boolean);
  const summary = [...orderedResults].reverse().find(result => typeof result.summary === "string")?.summary || fallbackSummary;
  const sections: PortalApprovalSection[] = [];

  for (const result of orderedResults) {
    if (isAiStageResult(result)) {
      sections.push(...result.sections);
      if (result.recommendations.length) {
        sections.push({
          heading: `${result.title} · Recommended actions`,
          body: result.summary,
          bullets: result.recommendations.map(item => `${item.title}: ${item.action}`),
        });
      }
    } else if (isAuditScoreResult(result)) {
      sections.push(...result.categories.map(category => ({
        heading: `${category.label} · ${category.score}%`,
        body: category.courseOfAction,
        bullets: category.issues.map(issue => issue.fix).slice(0, 5),
      })));
    }
  }

  const seen = new Set<string>();
  return {
    summary,
    sections: sections.filter(section => {
      const key = `${section.heading}\n${section.body}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}
