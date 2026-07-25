import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import nextEnv from "../node_modules/.pnpm/@next+env@16.2.11/node_modules/@next/env/dist/index.js";
import {
  ALL_AUDIT_CHECKS,
  AUDIT_CHECKLIST,
  auditPrioritiesFromEvidence,
  isAuditScoreResult,
  scoreChecks,
  specificAuditCourseOfAction,
  type AuditCheckResult,
  type AuditIssue,
  type AuditScoreResult,
  type LighthouseRun,
} from "../src/lib/auditChecklist";
import { isAiStageResult } from "../src/lib/aiStageGeneration";
import { createOpenAIResponseForMode, responseText } from "../src/lib/openaiServer";
import { runLighthouse } from "../src/lib/pageSpeedServer";
import { automatedAuditChecks, collectWebsiteEvidence, type WebsiteEvidenceBundle } from "../src/lib/renderedWebsiteEvidence";
import { scanWebsite } from "../src/lib/websiteScanner";

nextEnv.loadEnvConfig(process.cwd());

const SOURCE_URL = "https://www.creatoriq.com/";
const OUTPUT_PATH = resolve(process.cwd(), "src/data/creatorIqActualAuditSnapshot.json");
const CREATOR_IQ_AUDIT_SCOPE = [
  { url: SOURCE_URL, selectionReason: "Homepage and primary buyer entry point" },
  { url: "https://www.creatoriq.com/influencer-marketing-solution", selectionReason: "Primary product overview linked from the homepage navigation" },
  { url: "https://www.creatoriq.com/influencer-marketing-solution/creator-search", selectionReason: "Core creator discovery capability linked from the homepage navigation" },
  { url: "https://www.creatoriq.com/influencer-marketing-solution/influencer-campaign-management", selectionReason: "Core campaign execution capability linked from the homepage navigation" },
  { url: "https://www.creatoriq.com/influencer-marketing-solution/influencer-reporting-and-insights", selectionReason: "Core measurement capability linked from the homepage navigation" },
  { url: "https://www.creatoriq.com/influencer-marketing-solution/creator-marketing-ai-approach", selectionReason: "AI platform differentiation linked from the homepage navigation" },
  { url: "https://www.creatoriq.com/brand-safety", selectionReason: "SafeIQ product story promoted on the homepage" },
  { url: "https://www.creatoriq.com/trust", selectionReason: "Enterprise trust page linked from the homepage navigation" },
  { url: "https://www.creatoriq.com/influencer-marketing-solution/governance", selectionReason: "Enterprise governance page linked from the homepage navigation" },
  { url: "https://www.creatoriq.com/best-influencer-marketing-solution", selectionReason: "Customer and enterprise proof hub linked from the homepage navigation" },
  { url: "https://www.creatoriq.com/press/releases/creativex-creatoriq-nestle-integration-unifies-creator-and-paid-media-ecosystems", selectionReason: "Nestlé proof story promoted directly on the homepage" },
  { url: "https://www.creatoriq.com/-pricing-request-page", selectionReason: "Pricing-intent conversion page linked from the homepage navigation" },
  { url: "https://www.creatoriq.com/knowledge-hub", selectionReason: "Resource hub linked from the homepage navigation" },
  { url: "https://www.creatoriq.com/contact", selectionReason: "Contact conversion page linked from the homepage navigation" },
  { url: "https://www.creatoriq.com/book-demo", selectionReason: "Primary request-a-demo conversion page linked throughout the homepage" },
] as const;
const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 120 },
    summary: { type: "string", minLength: 1, maxLength: 900 },
    sections: { type: "array", minItems: 2, maxItems: 5, items: { type: "object", additionalProperties: false, properties: {
      heading: { type: "string", minLength: 1, maxLength: 100 },
      body: { type: "string", minLength: 1, maxLength: 700 },
      bullets: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 1, maxLength: 240 } },
    }, required: ["heading", "body", "bullets"] } },
    recommendations: { type: "array", minItems: 2, maxItems: 5, items: { type: "object", additionalProperties: false, properties: {
      title: { type: "string", minLength: 1, maxLength: 100 },
      rationale: { type: "string", minLength: 1, maxLength: 420 },
      action: { type: "string", minLength: 1, maxLength: 260 },
    }, required: ["title", "rationale", "action"] } },
  },
  required: ["title", "summary", "sections", "recommendations"],
} as const;
const AUDIT_SCORE_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    kind: { type: "string", const: "audit_analysis" },
    title: { type: "string", minLength: 1, maxLength: 120 },
    summary: { type: "string", minLength: 1, maxLength: 700 },
    categories: { type: "array", minItems: 6, maxItems: 6, items: { type: "object", additionalProperties: false, properties: {
      key: { type: "string", enum: AUDIT_CHECKLIST.map(category => category.key) },
      evaluations: { type: "array", maxItems: ALL_AUDIT_CHECKS.length, items: { type: "object", additionalProperties: false, properties: {
        id: { type: "string", enum: ALL_AUDIT_CHECKS.map(check => check.id) },
        status: { type: "string", enum: ["pass", "fail", "unverified", "not_applicable"] },
        evidence: { type: "string", minLength: 1, maxLength: 240 },
        sourceUrl: { anyOf: [{ type: "string", maxLength: 500 }, { type: "null" }] },
      }, required: ["id", "status", "evidence", "sourceUrl"] } },
      courseOfAction: { type: "string", minLength: 1, maxLength: 500 },
      issues: { type: "array", minItems: 1, maxItems: 5, items: { type: "object", additionalProperties: false, properties: {
        criterion: { type: "string", minLength: 1, maxLength: 180 }, severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
        finding: { type: "string", minLength: 1, maxLength: 360 }, evidence: { type: "string", minLength: 1, maxLength: 500 },
        sourceUrl: { anyOf: [{ type: "string", maxLength: 500 }, { type: "null" }] }, fix: { type: "string", minLength: 1, maxLength: 420 },
      }, required: ["criterion", "severity", "finding", "evidence", "sourceUrl", "fix"] } },
      strengths: { type: "array", maxItems: 2, items: { type: "string", minLength: 1, maxLength: 260 } },
    }, required: ["key", "evaluations", "courseOfAction", "issues", "strengths"] } },
    priorities: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", additionalProperties: false, properties: {
      title: { type: "string", minLength: 1, maxLength: 120 }, why: { type: "string", minLength: 1, maxLength: 360 }, action: { type: "string", minLength: 1, maxLength: 360 },
    }, required: ["title", "why", "action"] } },
  },
  required: ["kind", "title", "summary", "categories", "priorities"],
} as const;
type RawAuditAnalysis = {
  kind: "audit_analysis";
  title: string;
  summary: string;
  categories: Array<{ key: string; evaluations: Array<{ id: string; status: AuditCheckResult["status"]; evidence: string; sourceUrl: string | null }>; courseOfAction: string; issues: AuditIssue[]; strengths: string[] }>;
  priorities: AuditScoreResult["priorities"];
};

function normalizeAuditAnalysis(raw: RawAuditAnalysis, pagesReviewed: string[], lighthouse: LighthouseRun[], websiteEvidence: WebsiteEvidenceBundle): AuditScoreResult {
  const automated = automatedAuditChecks(websiteEvidence, lighthouse);
  const categories = AUDIT_CHECKLIST.map(group => {
    const supplied = raw.categories.find(category => category.key === group.key);
    const byId = new Map((supplied?.evaluations || []).map(check => [check.id, check]));
    const checks: AuditCheckResult[] = group.checks.map(definition => {
      const evaluation = automated.get(definition.id) || byId.get(definition.id);
      return {
        id: definition.id,
        label: definition.label,
        status: evaluation?.status || "unverified",
        evidence: evaluation?.evidence || "This item could not be verified from the public pages or Lighthouse run.",
        sourceUrl: evaluation?.sourceUrl || null,
      };
    });
    const tally = scoreChecks(checks);
    const issues = (supplied?.issues || []).filter(issue => checks.some(check => check.status === "fail" && (check.id === issue.criterion || check.label === issue.criterion)));
    const category = {
      key: group.key,
      label: group.label,
      ...tally,
      score: tally.score,
      scoreFormula: tally.passed + tally.failed > 0 ? `${tally.passed} passed ÷ (${tally.passed} passed + ${tally.failed} failed) × 100 = ${tally.score}` : "No internally verified pass/fail items yet",
      target: Math.max(tally.score, Math.min(95, tally.score + Math.round(tally.failed * 1.5))),
      checks,
      courseOfAction: supplied?.courseOfAction || "Review the failed and unverified checklist items before implementation.",
      issues,
      strengths: supplied?.strengths || [],
    };
    return { ...category, courseOfAction: specificAuditCourseOfAction(category) };
  });
  const allChecks = categories.flatMap(category => category.checks);
  const overall = scoreChecks(allChecks).score;
  const verifiedChecks = allChecks.filter(check => check.status === "pass" || check.status === "fail").length;
  const applicableChecks = allChecks.filter(check => check.status !== "not_applicable").length;
  const evidenceCoverage = applicableChecks ? Math.round((verifiedChecks / applicableChecks) * 100) : 0;
  return {
    kind: "audit_score",
    title: raw.title,
    summary: raw.summary,
    overallScore: overall,
    targetScore: Math.max(overall, Math.min(95, Math.round(categories.reduce((sum, category) => sum + category.target, 0) / categories.length))),
    evidenceCoverage,
    verifiedChecks,
    applicableChecks,
    coverageThreshold: 75,
    confidence: evidenceCoverage >= 75 ? "reliable" : "provisional",
    pagesReviewed,
    lighthouse,
    categories,
    priorities: auditPrioritiesFromEvidence(categories),
  };
}

async function loadCreatorIqAuditScope() {
  const results = await Promise.allSettled(CREATOR_IQ_AUDIT_SCOPE.map(async (scope, index) => {
    const page = (await scanWebsite(scope.url, { maxPages: 1 }))[0];
    if (!page) throw new Error(`No usable page content returned for ${scope.url}`);
    return {
      ...page,
      selectionReason: scope.selectionReason,
      selectionRank: CREATOR_IQ_AUDIT_SCOPE.length - index,
    };
  }));
  const pages = results.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    console.warn("CreatorIQ scope page could not be loaded.", {
      url: CREATOR_IQ_AUDIT_SCOPE[index].url,
      message: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
    return [];
  });
  return [...new Map(pages.map(page => [page.url, page])).values()];
}

async function generateReport(
  pages: Awaited<ReturnType<typeof scanWebsite>>,
  websiteEvidence: Awaited<ReturnType<typeof collectWebsiteEvidence>>,
  lighthouse: Awaited<ReturnType<typeof runLighthouse>>,
) {
  const instructions = [
    "You are the strategy engine inside Baltazar Studio's client portal.",
    "Use only the supplied discovery and rendered evidence. Distinguish evidence from inference.",
    "Create an evidence-conscious CreatorIQ website audit for a Demand Generation and Web Designer interview walkthrough.",
    "Evaluate the full supplied checklist. Use pass only when evidence positively supports the criterion, fail only when it positively shows a problem, unverified when evidence is insufficient, and not_applicable for conditional features the site does not need.",
    "Return each checklist ID exactly once under its matching category.",
    "Issues, fixes, course of action, and priorities must be traceable to failed checklist items. Do not recommend another audit as the fix.",
    "Use plain language and short sentences. Avoid jargon, stacked clauses, inflated wording, and long lists.",
    "Consolidate overlapping failures into no more than three issues per category. Keep each finding, evidence statement, and fix to one short sentence.",
    `Checklist template:\n${AUDIT_CHECKLIST.map(group => `${group.key}:\n${group.checks.map(check => `${check.id} | ${check.label}`).join("\n")}`).join("\n\n")}`,
  ].join("\n");
  const { response, payload } = await createOpenAIResponseForMode("audit", {
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    store: false,
    safety_identifier: createHash("sha256").update("audit:CreatorIQ").digest("hex").slice(0, 32),
    reasoning: { effort: "low" },
    max_output_tokens: 18_000,
    instructions,
    input: JSON.stringify({
      clientName: "CreatorIQ",
      objective: "Increase qualified demo requests",
      primaryAction: "Request a demo",
      pages: pages.map(page => ({
        url: page.url,
        selectionReason: page.selectionReason,
        excerpt: page.text.slice(0, 5_000),
      })),
      rendered: websiteEvidence.rendered,
      technical: websiteEvidence.technical,
      lighthouse,
    }),
    text: {
      verbosity: "medium",
      format: { type: "json_schema", name: "audit_score_result", strict: true, schema: AUDIT_SCORE_SCHEMA },
    },
  });
  if (!response.ok) throw new Error(payload?.error?.message || `Audit generation failed with ${response.status}.`);
  const raw = JSON.parse(responseText(payload)) as RawAuditAnalysis;
  const report = normalizeAuditAnalysis(raw, pages.map(page => page.url), lighthouse, websiteEvidence);
  if (!isAuditScoreResult(report)) throw new Error("The generated audit report did not match the application schema.");
  return { report, model: payload?.model || process.env.OPENAI_MODEL || "gpt-5.6-luna" };
}

async function generatePlan(report: Awaited<ReturnType<typeof generateReport>>["report"]) {
  const { response, payload } = await createOpenAIResponseForMode("audit", {
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    store: false,
    safety_identifier: createHash("sha256").update("audit-plan:CreatorIQ").digest("hex").slice(0, 32),
    reasoning: { effort: "low" },
    max_output_tokens: 2_400,
    instructions: [
      "You are the strategy engine inside Baltazar Studio's client portal.",
      "Turn the supplied CreatorIQ audit result into a prioritised implementation action plan.",
      "Sequence quick wins before structural work. Make each action specific enough to assign.",
      "Use only verified failed findings. Do not turn unverified checks into defects and do not recommend another audit as the action.",
      "Connect website changes to qualified demo conversion, lead quality, measurement reliability, or campaign velocity where supported.",
      "Use plain language and short sentences. Avoid jargon, stacked clauses, inflated wording, and long lists.",
      "Return exactly three non-overlapping recommendations. Each must state one problem, one reason it matters, and one direct action.",
      "Combine findings that share the same root cause. Do not repeat the same issue in multiple recommendations or sections.",
      "Keep every recommendation action under 210 characters and end it with a complete sentence.",
      "Use no more than three sections. Keep each section body under 55 words and every bullet under 120 characters.",
    ].join("\n"),
    input: JSON.stringify({ clientName: "CreatorIQ", stage: "plan", priorResult: report }),
    text: {
      verbosity: "low",
      format: { type: "json_schema", name: "ai_stage_result", strict: true, schema: RESULT_SCHEMA },
    },
  });
  if (!response.ok) throw new Error(payload?.error?.message || `Plan generation failed with ${response.status}.`);
  const plan = JSON.parse(responseText(payload));
  if (!isAiStageResult(plan)) throw new Error("The generated action plan did not match the application schema.");
  return { plan, model: payload?.model || process.env.OPENAI_MODEL || "gpt-5.6-luna" };
}

async function main() {
  if (process.argv.includes("--plan-only")) {
    const existing = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
    if (!isAuditScoreResult(existing.report)) throw new Error("The existing captured report is unavailable.");
    console.log("Regenerating the action plan from the captured report…");
    const generatedPlan = await generatePlan(existing.report);
    const snapshot = {
      ...existing,
      models: { ...existing.models, plan: generatedPlan.model },
      plan: generatedPlan.plan,
    };
    await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ output: OUTPUT_PATH, plan: generatedPlan.plan.title }, null, 2));
    return;
  }

  console.log("Loading the homepage-visible CreatorIQ buyer journey…");
  const pages = await loadCreatorIqAuditScope();
  if (pages.length < 10) throw new Error(`CreatorIQ returned only ${pages.length} of ${CREATOR_IQ_AUDIT_SCOPE.length} required buyer-journey pages.`);

  console.log(`Capturing desktop and mobile evidence for ${pages.length} pages…`);
  const websiteEvidence = await collectWebsiteEvidence(pages.map(page => page.url));

  console.log("Running mobile and desktop Lighthouse…");
  const lighthouse = await runLighthouse(pages[0].url).catch(error => {
    console.warn("Lighthouse was unavailable; the snapshot will preserve that gap.", error instanceof Error ? error.message : error);
    return [];
  });

  console.log("Generating the audit report from captured evidence…");
  const generatedReport = await generateReport(pages, websiteEvidence, lighthouse);
  console.log("Generating the action plan from the actual report…");
  const generatedPlan = await generatePlan(generatedReport.report);

  const snapshot = {
    capturedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    sourceKind: "actual-public-checkup",
    discoveredPages: pages.map(page => ({
      url: page.url,
      selectionReason: page.selectionReason,
      selectionRank: page.selectionRank,
    })),
    renderedPages: websiteEvidence.rendered.map(page => ({
      url: page.url,
      strategy: page.strategy,
      title: page.title,
    })),
    technical: websiteEvidence.technical,
    models: { report: generatedReport.model, plan: generatedPlan.model },
    report: generatedReport.report,
    plan: generatedPlan.plan,
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    output: OUTPUT_PATH,
    capturedAt: snapshot.capturedAt,
    discoveredPages: snapshot.discoveredPages.length,
    renderedPages: snapshot.renderedPages.length,
    lighthouse: snapshot.report.lighthouse.map(run => ({ strategy: run.strategy, performance: run.scores.performance })),
    overallScore: snapshot.report.overallScore,
    evidenceCoverage: snapshot.report.evidenceCoverage,
    confidence: snapshot.report.confidence,
    failedChecks: snapshot.report.categories.reduce((sum, category) => sum + category.failed, 0),
  }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
