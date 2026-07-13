import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { AI_STAGES, isGeneratedStageResult, type AiGenerationMode } from "@/lib/aiStageGeneration";
import { ALL_AUDIT_CHECKS, AUDIT_CHECKLIST, auditPrioritiesFromEvidence, isAuditScoreResult, scoreChecks, specificAuditCourseOfAction, type AuditCheckResult, type AuditIssue, type AuditScoreResult, type LighthouseRun } from "@/lib/auditChecklist";
import { apiKeyForMode, openAIError, responseText } from "@/lib/openaiServer";
import { runLighthouse } from "@/lib/pageSpeedServer";
import { discoverSitemapUrls, scanWebsite } from "@/lib/websiteScanner";
import { automatedAuditChecks, collectWebsiteEvidence, type WebsiteEvidenceBundle } from "@/lib/renderedWebsiteEvidence";

export const runtime = "nodejs";
export const maxDuration = 300;

const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 8;
const requestWindows = new Map<string, { count: number; resetAt: number }>();

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 120 },
    summary: { type: "string", minLength: 1, maxLength: 900 },
    sections: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          heading: { type: "string", minLength: 1, maxLength: 100 },
          body: { type: "string", minLength: 1, maxLength: 700 },
          bullets: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", minLength: 1, maxLength: 240 } },
        },
        required: ["heading", "body", "bullets"],
      },
    },
    recommendations: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1, maxLength: 100 },
          rationale: { type: "string", minLength: 1, maxLength: 420 },
          action: { type: "string", minLength: 1, maxLength: 260 },
        },
        required: ["title", "rationale", "action"],
      },
    },
  },
  required: ["title", "summary", "sections", "recommendations"],
} as const;

const AUDIT_SCORE_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    kind: { type: "string", const: "audit_analysis" },
    title: { type: "string", minLength: 1, maxLength: 120 },
    summary: { type: "string", minLength: 1, maxLength: 700 },
    categories: { type: "array", minItems: 6, maxItems: 6, items: {
      type: "object", additionalProperties: false,
      properties: {
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
      }, required: ["key", "evaluations", "courseOfAction", "issues", "strengths"],
    } },
    priorities: { type: "array", minItems: 3, maxItems: 5, items: { type: "object", additionalProperties: false, properties: {
      title: { type: "string", minLength: 1, maxLength: 120 }, why: { type: "string", minLength: 1, maxLength: 360 }, action: { type: "string", minLength: 1, maxLength: 360 },
    }, required: ["title", "why", "action"] } },
  }, required: ["kind", "title", "summary", "categories", "priorities"],
} as const;

type RawAuditAnalysis = {
  kind: "audit_analysis";
  title: string;
  summary: string;
  categories: Array<{ key: string; evaluations: Array<{ id: string; status: AuditCheckResult["status"]; evidence: string; sourceUrl: string | null }>; courseOfAction: string; issues: AuditIssue[]; strengths: string[] }>;
  priorities: AuditScoreResult["priorities"];
};

function normalizeAuditAnalysis(raw: RawAuditAnalysis, pagesReviewed: string[], lighthouse: LighthouseRun[], websiteEvidence: WebsiteEvidenceBundle): AuditScoreResult {
  const lighthouseByStrategy = new Map(lighthouse.map(run => [run.strategy, run]));
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
    if (group.key === "seo") {
      const evidence = (id: string, strategy: "mobile" | "desktop") => {
        const run = lighthouseByStrategy.get(strategy);
        const index = checks.findIndex(check => check.id === id);
        if (!run || index < 0) return;
        checks[index] = { ...checks[index], status: "pass", evidence: `Google Lighthouse ${strategy} performance: ${run.scores.performance}/100.`, sourceUrl: run.testedUrl };
      };
      evidence("seo-07", "mobile");
      evidence("seo-08", "desktop");
      const lighthouseRun = lighthouse[0];
      for (const id of ["seo-09", "seo-14", "seo-15"]) {
        const index = checks.findIndex(check => check.id === id);
        if (lighthouseRun && index >= 0) checks[index] = { ...checks[index], status: "pass", evidence: `Reviewed with Google Lighthouse ${lighthouseRun.lighthouseVersion}.`, sourceUrl: lighthouseRun.testedUrl };
      }
    }
    const tally = scoreChecks(checks);
    const score = tally.score;
    const scoreFormula = tally.passed + tally.failed > 0
      ? `${tally.passed} passed ÷ (${tally.passed} passed + ${tally.failed} failed) × 100 = ${tally.score}`
      : "No internally verified pass/fail items yet";
    const issues = (supplied?.issues || []).filter(issue => checks.some(check => check.status === "fail" && (check.id === issue.criterion || check.label === issue.criterion)));
    const category = {
      key: group.key,
      label: group.label,
      ...tally,
      score,
      scoreFormula,
      target: Math.max(score, Math.min(95, score + Math.round(tally.failed * 1.5))),
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
  const coverageThreshold = 75;
  return {
    kind: "audit_score",
    title: raw.title,
    summary: raw.summary,
    overallScore: overall,
    targetScore: Math.max(overall, Math.min(95, Math.round(categories.reduce((sum, category) => sum + category.target, 0) / categories.length))),
    evidenceCoverage,
    verifiedChecks,
    applicableChecks,
    coverageThreshold,
    confidence: evidenceCoverage >= coverageThreshold ? "reliable" : "provisional",
    pagesReviewed,
    lighthouse,
    categories,
    priorities: auditPrioritiesFromEvidence(categories),
  };
}

const STAGE_BRIEFS: Record<AiGenerationMode, Record<string, string>> = {
  audit: {
    report: "Create an evidence-conscious audit assessment. Identify strengths, friction, and risks across positioning, messaging, conversion, user experience, visual identity, and findability.",
    plan: "Turn the audit context into a prioritized, practical improvement plan. Sequence quick wins before larger structural work and make every action specific enough to assign.",
  },
  brand: {
    report: "Create a practical brand kit and consolidated guideline draft from the supplied evidence. Cover brand foundation, positioning, audience, voice, messaging, logo usage, typography, colour direction, imagery, and consistency. Clearly label inferred decisions and identify gaps that still need confirmation.",
    plan: "Turn the brand findings into specific improvement priorities. Preserve the approved brand kit and guidelines, then sequence corrections for positioning, messaging, visual consistency, templates, and governance.",
  },
  seo: {
    report: "Create an evidence-conscious SEO audit from the supplied website, technical, and analytics context. Cover crawlability, indexability, metadata, content, internal linking, search landing pages, engagement, conversion measurement, and mobile performance. Never invent rankings, backlinks, traffic, or GA4 results.",
    plan: "Turn the SEO findings into a prioritized implementation plan. Separate technical fixes, on-page improvements, content opportunities, measurement corrections, and longer-term authority work.",
  },
  website_builder: {
    direction: "Create a concise, owner-ready full website design and development plan that mirrors the hierarchy of a funnel development plan but is tailored to a complete website rebuild. This is direction for the entire website, not only the homepage. Use exactly these five section headings in order: Redesign plan; Pages to redesign; Full website design direction; Development phases and milestones; Approval and rollout. Redesign plan must state Main objective, Tone, Primary action, Platform, and What changes differently as clearly labeled bullets. Pages to redesign will be replaced by the application with the complete discovered sitemap, so use its body to explain the page-scope approach. Full website design direction must define the sitewide information architecture, navigation behavior, content hierarchy, tone, visual system, reusable components, responsive rules, and conversion patterns for every page type. Within that direction, specify the homepage navigation, hero, and ordered section structure as the single visual proof of direction sent to the owner for approval. The homepage is the approval reference for the vibe and system; it is not the only page being designed or rebuilt. Development phases and milestones must contain exactly five milestones in execution order: (1) priority, scope, and content preparation; (2) homepage design and owner approval; (3) remaining-page rollout, development, and integrations; (4) content migration and QA; (5) launch and measurement. Include a realistic week or date range in parentheses in every milestone, such as 'Milestone 2 (Weeks 2–3):'. The first bullet must begin with 'Milestone 1 — Priority' and identify the highest-priority outcome and why it comes first. The Development phases and milestones body must state the estimated total project timeline and explain that approvals, content readiness, and scope changes can affect it. Approval and rollout must state that homepage approval confirms the full-site direction, then explain what happens next, responsibilities, dependencies, and what is not included. Recommendations must focus only on the most important changes from the current site to this rebuild.",
    tasks: "Turn the approved build direction and page inventory into an implementation-ready task list. Group tasks by discovery, content, UX, design, development, integrations, migration, QA, launch, and measurement. Keep copy tasks optional when the intake says copy is not included.",
  },
  funnel: {
    flow: "Design the conversion journey from traffic source to the primary outcome. Explain why each step exists and where drop-off risk should be reduced.",
    copy: "Draft the messaging strategy, offer framing, headline direction, proof plan, objection handling, and call-to-action hierarchy for this funnel.",
    wireframe: "Describe the conversion-first page structure and section order. Connect every section to a visitor question, objection, or decision.",
    brief: "Produce a build-ready development brief covering pages, content, integrations, measurement, QA, dependencies, and launch priorities. Give the final brief a distinctive, outcome-led title tailored to this funnel. Never use only 'Development plan', 'Build direction', the funnel name, or another generic repeated stage label as the title.",
  },
};

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

function withinRateLimit(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || current.resetAt <= now) {
    requestWindows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

function cleanData(value: unknown): Record<string, string | string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clean: Record<string, string | string[]> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 60)) {
    if (typeof entry === "string") clean[key.slice(0, 80)] = entry.slice(0, 2_000);
    else if (Array.isArray(entry)) clean[key.slice(0, 80)] = entry.filter((item): item is string => typeof item === "string").slice(0, 20).map(item => item.slice(0, 400));
  }
  return clean;
}

function websiteBuildScopeItems(urls: string[]) {
  const staticPages: string[] = [];
  const templates = new Map<string, { label: string; countLabel: string; urls: string[] }>();
  const addTemplate = (key: string, label: string, countLabel: string, url: string) => {
    const current = templates.get(key) || { label, countLabel, urls: [] };
    current.urls.push(url);
    templates.set(key, current);
  };
  for (const url of [...new Set(urls)]) {
    let path = "";
    try { path = new URL(url).pathname.replace(/\/$/, "") || "/"; } catch { continue; }
    const segments = path.split("/").filter(Boolean);
    const root = segments[0]?.toLowerCase() || "";
    if (root === "products" && segments.length > 1) addTemplate("product", "Product detail template", "products", url);
    else if (root === "collections" && segments.length > 1) addTemplate("collection", "Collection template", "collections", url);
    else if (root === "blogs" && segments.length > 2) addTemplate(`blog-${segments[1].toLowerCase()}`, `${segments[1].replace(/[-_]+/g, " ")} article template`, "posts", url);
    else if (["blog", "articles", "insights", "resources", "news", "posts"].includes(root) && segments.length > 1) addTemplate(root, `${root === "news" ? "News" : "Article"} detail template`, root === "news" ? "news entries" : "posts", url);
    else if (["category", "categories", "tag", "tags", "author", "authors"].includes(root) && segments.length > 1) addTemplate("archive", "Content archive template", "archives", url);
    else if (root === "events" && segments.length > 1) addTemplate("event", "Event detail template", "events", url);
    else if (["jobs", "careers"].includes(root) && segments.length > 1) addTemplate("job", "Job detail template", "openings", url);
    else if (["team", "people", "authors"].includes(root) && segments.length > 1) addTemplate("profile", "Profile detail template", "profiles", url);
    else staticPages.push(`Page · ${url}`);
  }
  return [
    ...staticPages,
    ...[...templates.values()].map(template => `Template · ${template.label} — ${template.urls.length} ${template.countLabel}`),
  ];
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  if (!withinRateLimit(request)) return NextResponse.json({ error: "Too many AI requests. Please wait a minute and try again." }, { status: 429 });

  const body = await request.json().catch(() => null);
  const mode = body?.mode as AiGenerationMode;
  const stageKey = typeof body?.stageKey === "string" ? body.stageKey : "";
  const clientName = typeof body?.clientName === "string" ? body.clientName.slice(0, 160) : "Client";
  if (!(mode in AI_STAGES) || !AI_STAGES[mode].includes(stageKey)) {
    return NextResponse.json({ error: "Unsupported AI generation stage." }, { status: 400 });
  }
  const apiKey = apiKeyForMode(mode);
  if (!apiKey) return NextResponse.json({ error: `AI generation is not configured for ${mode}.` }, { status: 503 });

  const data = cleanData(body?.data);
  const personName = typeof body?.personName === "string" && body.personName.trim()
    ? body.personName.trim().slice(0, 100)
    : typeof data.nickname === "string" ? data.nickname.slice(0, 100) : "";
  const brandName = typeof body?.brandName === "string" && body.brandName.trim()
    ? body.brandName.trim().slice(0, 160)
    : typeof data.brandName === "string" ? data.brandName.slice(0, 160)
      : mode !== "funnel" && typeof data.name === "string" ? data.name.slice(0, 160) : clientName;
  const safetyIdentifier = createHash("sha256").update(`${mode}:${clientName}`).digest("hex").slice(0, 32);
  const priorResult = body?.priorResult && typeof body.priorResult === "object"
    ? JSON.stringify(body.priorResult).slice(0, 40_000)
    : "Not supplied";
  const isAuditReport = mode === "audit" && stageKey === "report";
  let scannedPages: Awaited<ReturnType<typeof scanWebsite>> = [];
  let lighthouse: LighthouseRun[] = [];
  let websiteEvidence: WebsiteEvidenceBundle = { rendered: [], technical: { https: false, httpRedirectsToHttps: null, hostRedirectConsistent: null, sitemapAvailable: false, robotsAvailable: false, notFoundHelpful: null, brokenLinksChecked: 0, brokenLinks: [] } };
  if (isAuditReport) {
    const url = typeof data.url === "string" ? data.url : "";
    if (!url) return NextResponse.json({ error: "Add a website URL before scoring the site." }, { status: 400 });
    try { scannedPages = await scanWebsite(url); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "The website could not be scanned." }, { status: 422 }); }
    if (!scannedPages.length) return NextResponse.json({ error: "The scan did not find enough public website content to score." }, { status: 422 });
    try { websiteEvidence = await collectWebsiteEvidence(scannedPages.map(page => page.url)); }
    catch (error) { return NextResponse.json({ error: `Rendered website inspection failed: ${error instanceof Error ? error.message : "Unable to open the site in the audit browser."}` }, { status: 422 }); }
    const expectedRenders = scannedPages.length * 2;
    if (websiteEvidence.rendered.length < Math.ceil(expectedRenders * 0.7)) {
      return NextResponse.json({ error: `Rendered inspection covered only ${websiteEvidence.rendered.length} of ${expectedRenders} desktop/mobile page views. The report was not scored because the evidence was incomplete.` }, { status: 422 });
    }
    try { lighthouse = await runLighthouse(scannedPages[0].url); }
    catch (error) { console.warn("Google Lighthouse was unavailable.", error instanceof Error ? error.message : error); }
  }
  if ((mode === "brand" || mode === "seo") && stageKey === "report") {
    const url = typeof data.url === "string" ? data.url : "";
    if (url) {
      try { scannedPages = await scanWebsite(url); }
      catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "The website could not be scanned." }, { status: 422 }); }
    }
    if (mode === "seo" && scannedPages.length) {
      try { websiteEvidence = await collectWebsiteEvidence(scannedPages.map(page => page.url)); }
      catch (error) { console.warn("Rendered SEO inspection was unavailable.", error instanceof Error ? error.message : error); }
      try { lighthouse = await runLighthouse(scannedPages[0].url); }
      catch (error) { console.warn("Google Lighthouse was unavailable for SEO.", error instanceof Error ? error.message : error); }
    }
  }
  let sitemapUrls: string[] = [];
  if (mode === "website_builder" && stageKey === "direction") {
    const url = typeof data.url === "string" ? data.url : "";
    if (!url) return NextResponse.json({ error: "Add the current website URL before generating build direction." }, { status: 400 });
    try { scannedPages = await scanWebsite(url); sitemapUrls = await discoverSitemapUrls(url); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "The website could not be scanned." }, { status: 422 }); }
  }
  const instructions = [
    "You are the strategy engine inside Baltazar Studio's client portal.",
    "Use only the supplied discovery context. Do not claim to have crawled, measured, or observed a website unless the context explicitly contains that evidence.",
    "Treat the person name and brand name as separate identities. Never call the person by the brand name or the brand by the person's name.",
    "Build rapport with warm, professional language. When a person name is supplied, use it naturally in the summary, but do not repeat it mechanically in every section.",
    "Keep the brand name visible and specific in the title, summary, or recommendations whenever it reads naturally.",
    "Make the output client-ready, concrete, commercially useful, and concise. Distinguish evidence from inference.",
    ...(mode === "audit" ? [
      "The audit has already performed the review. Recommendations must prescribe concrete implementation changes based on the supplied audit evidence. Never recommend running or conducting another audit, review, assessment, analysis, or evaluation as the action.",
    ] : []),
    ...(mode === "brand" ? [
      "This is a brand audit and brand-system generation workflow. The report must produce usable brand-kit and guideline direction, not a website checklist or another request to audit the brand.",
      "Recommendations must focus on concrete improvements supported by the supplied guidelines, website, social presence, and intake answers.",
    ] : []),
    ...(mode === "seo" ? [
      "This is an SEO workflow. Treat GA4 as behavioral evidence only; do not present GA4 as keyword-ranking, backlink, or competitor data.",
      "Recommendations must prescribe concrete SEO implementation changes rather than recommending another audit.",
    ] : []),
    ...(mode === "website_builder" ? [
      "This is a website redesign planning workflow, not a website audit.",
      "For the Build direction stage, create a full website design direction covering the complete page scope and sitewide system. Do not create a funnel.",
      "Only the homepage is developed as the visual approval reference at this stage. Homepage approval confirms the vibe, structure, content hierarchy, components, and responsive rules that will be applied across the rest of the website.",
      "Do not imply that the homepage is the only page being redesigned. The entire supplied website scope is part of the build direction.",
      "Use the supplied sitemap to explain the rollout scope. The final Task plan must still account for every page as rebuild, merge, redirect, archive, proposed, or out of scope.",
      "Do not invent pages without labeling them proposed. Turn all approved scope into assignable implementation tasks.",
    ] : []),
    ...(mode === "funnel" ? [
      "Preserve the funnel panel sequence exactly: Funnel flow, Copy, Wireframe, then Development plan.",
      "Each stage must build on the supplied prior approved stages. Do not contradict or replace the approved objective, page order, primary action, offer, audience, or platform unless the discovery context explicitly changes it.",
      "Return only content relevant to the current panel. Flow defines the journey; Copy follows that flow; Wireframe arranges the approved flow and copy; Development plan turns all approved panels into implementation tasks, integrations, QA, and launch requirements.",
    ] : []),
    STAGE_BRIEFS[mode][stageKey],
    ...(isAuditReport ? [
      "Evaluate the full supplied checklist. Do not invent scores; the application calculates every score from your pass/fail evaluations.",
      "Use pass only when the supplied page text, rendered browser evidence, automated technical evidence, or Lighthouse data positively support the criterion. Use fail only when they positively show a problem. Use unverified when public evidence is insufficient, and not_applicable for conditional features the site does not need.",
      "Return each checklist ID exactly once under its matching category. Evidence must be a short factual observation. Never invent traffic, backlinks, analytics, browser tests, or pages.",
      "Issues, fixes, course of action, and priorities must be traceable to verified failed checklist items. Do not create an issue or recommendation from an unverified or passed item.",
      `Checklist template:\n${AUDIT_CHECKLIST.map(group => `${group.key}:\n${group.checks.map(check => `${check.id} | ${check.label}`).join("\n")}`).join("\n\n")}`,
    ] : []),
  ].join("\n");

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        store: false,
        safety_identifier: safetyIdentifier,
        reasoning: { effort: "low" },
        max_output_tokens: isAuditReport ? 18_000 : 2_400,
        instructions,
        input: `Person name: ${personName || "Not supplied"}\nBrand name: ${brandName}\nClient record: ${clientName}\nWorkflow: ${mode}\nStage: ${stageKey}\nDiscovery context:\n${JSON.stringify(data, null, 2)}\nPrior audit result:\n${priorResult}${sitemapUrls.length ? `\n\nComplete sitemap URL inventory:\n${sitemapUrls.join("\n")}` : ""}${scannedPages.length ? `\n\nGoogle Lighthouse results:\n${JSON.stringify(lighthouse, null, 2)}\n\nRendered browser and technical evidence:\n${JSON.stringify(websiteEvidence, null, 2)}\n\nScanned website pages:\n${scannedPages.map((page, index) => `--- PAGE ${index + 1}: ${page.url} ---\n${page.text}`).join("\n\n")}` : ""}`,
        text: {
          verbosity: "medium",
          format: { type: "json_schema", name: isAuditReport ? "audit_score_result" : "ai_stage_result", strict: true, schema: isAuditReport ? AUDIT_SCORE_SCHEMA : RESULT_SCHEMA },
        },
      }),
    });

    const payload = await openaiResponse.json().catch(() => null);
    if (!openaiResponse.ok) {
      const mapped = openAIError(openaiResponse.status, payload, "OpenAI could not generate this stage.");
      console.error("OpenAI stage generation failed.", { status: openaiResponse.status, code: payload?.error?.code });
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    const parsed = JSON.parse(responseText(payload));
    if (mode === "website_builder" && stageKey === "direction" && Array.isArray(parsed?.sections)) {
      const pageInventory = [...new Set([...sitemapUrls, ...scannedPages.map(page => page.url)])];
      const pageSection = parsed.sections.find((section: any) => String(section?.heading || "").toLowerCase() === "pages to redesign");
      if (pageSection && pageInventory.length) pageSection.bullets = websiteBuildScopeItems(pageInventory);
    }
    const result = isAuditReport ? normalizeAuditAnalysis(parsed as RawAuditAnalysis, scannedPages.map(page => page.url), lighthouse, websiteEvidence) : parsed;
    if (!isGeneratedStageResult(result) || isAuditReport && !isAuditScoreResult(result)) throw new Error("The AI response did not match the expected format.");
    return NextResponse.json({ result, model: payload?.model || process.env.OPENAI_MODEL || "gpt-5.6-luna" });
  } catch (error) {
    console.error("Unable to generate AI stage.", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate this stage." }, { status: 502 });
  }
}
