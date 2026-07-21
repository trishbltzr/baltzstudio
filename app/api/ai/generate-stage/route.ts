import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { AI_STAGES, isAiStageResult, isGeneratedStageResult, type AiGenerationMode } from "@/lib/aiStageGeneration";
import { ALL_AUDIT_CHECKS, AUDIT_CHECKLIST, auditPrioritiesFromEvidence, isAuditScoreResult, scoreChecks, specificAuditCourseOfAction, type AuditCheckResult, type AuditIssue, type AuditScoreResult, type LighthouseRun } from "@/lib/auditChecklist";
import { apiKeyForMode, createOpenAIResponseForMode, openAIError, responseText } from "@/lib/openaiServer";
import { runLighthouse } from "@/lib/pageSpeedServer";
import { discoverSitemapUrls, scanWebsite } from "@/lib/websiteScanner";
import { automatedAuditChecks, collectWebsiteEvidence, type WebsiteEvidenceBundle } from "@/lib/renderedWebsiteEvidence";
import { brandVisualsFromEvidence } from "@/lib/brandVisualEvidence";

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
    report: "Create a practical brand kit and consolidated guideline draft from the supplied evidence. Cover brand foundation, positioning, audience, voice, messaging, logo usage, typography, colour direction, imagery, and consistency. Label every material conclusion as Verified strength, Verified gap, Unverified, or Not applicable and name its supporting submitted answer, supplied asset, website, or social touchpoint. Recommendations may come only from Verified gaps. Unverified items must request missing evidence. Do not create a numeric brand score.",
    plan: "Create an overview-first brand action plan from the approved findings. Preserve the approved brand kit and guidelines, then sequence no more than four priority sections across positioning, messaging, visual consistency, templates, and governance. Keep each section body under 45 words, include no more than three bullets per section with each bullet under 18 words, and return no more than three recommendations. Make every action specific enough to assign. Do not create a numeric brand score.",
  },
  seo: {
    report: "Create an evidence-conscious SEO audit from the supplied website, technical, and analytics context. Cover crawlability, indexability, metadata, content, internal linking, search landing pages, engagement, conversion measurement, and mobile performance. Never invent rankings, backlinks, traffic, or GA4 results.",
    plan: "Turn the SEO findings into a prioritized implementation plan. Separate technical fixes, on-page improvements, content opportunities, measurement corrections, and longer-term authority work.",
  },
  website_builder: {
    direction: "Create a clear, concise, build-ready website brief. Use exactly these five section headings in order: Build-ready brief; Final sitemap and page briefs; Copy and website direction; Development phases and milestones; Approval and handoff. Build-ready brief must state Source strategy, Main objective, Audience, Primary action, Platform, and Success measure as clearly labeled bullets. Final sitemap and page briefs must contain only the pages explicitly confirmed in pagesToDesign. Use exactly one bullet per confirmed page or template in this format: 'Page · Page name — purpose; key message; primary action; copy source' or 'Template · Template name — purpose; content model; primary action; copy source'. Do not add speculative pages. Copy and website direction must explain how existing website copy, uploaded briefs, uploaded copy, audit context, and new writing will be mapped across those pages, then define the shared information architecture, navigation, content hierarchy, visual system, reusable components, responsive rules, and conversion patterns. Development phases and milestones must contain exactly five concise milestones in execution order: scope and content preparation; design-system approval; remaining-page design and build; content population and QA; launch and measurement. Include a realistic week or date range in every milestone. Approval and handoff must state what is approved, who supplies or approves remaining copy and assets, dependencies, exclusions, and the exact materials handed to design and development. Recommendations must focus only on decisions needed to make the scoped website build-ready.",
    tasks: "Turn the approved sitemap, page briefs, copy plan, site direction, functionality, and dependencies into an implementation-ready task list. Group tasks by content, UX, design, development, integrations, population, QA, launch, and measurement. Create page-specific tasks only for pages confirmed in the final sitemap.",
  },
  funnel: {
    flow: "Design the conversion journey from traffic source to the primary outcome. Explain why each step exists and where drop-off risk should be reduced.",
    copy: "Write page-ready sales copy for the buyer, not commentary about building the page. Lead with a specific offer-led promise, then develop the buyer's problem and stakes, desired outcome, product or service benefits, concrete offer details, buying process, proof, objection handling, pricing or value framing, FAQ, and repeated primary CTA. Use the client's exact offer, audience, problem, price, and action wherever supplied. Never sell the website, design, mobile responsiveness, tracking, or funnel mechanics to the end customer. Never invent testimonials, ratings, guarantees, prices, ingredients, certifications, results, or delivery claims; label missing evidence as an approval input.",
    wireframe: "Create a polished, page-ready SALES PAGE structure, not a generic website outline. Sequence it as: focused navigation; offer-led hero with primary purchase CTA; verified proof strip; problem and stakes; buyer benefits; product or service details; how buying works; verified testimonial or explicit proof placeholder; offer stack; one evidence-backed price or price-to-approve state; objection-led FAQ; final purchase CTA; legal footer. Every section must answer a buyer question and move toward the same primary action. Omit internal build details such as integrations, analytics, responsive design, and tracking from customer-facing sections. Never invent proof, pricing, guarantees, results, or product claims.",
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

function conciseBrandSummary(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 190 && normalized.split(" ").length <= 28) return normalized;
  const words = normalized.split(" ");
  const kept: string[] = [];
  for (const word of words) {
    const next = [...kept, word].join(" ");
    if (kept.length >= 28 || next.length > 190) break;
    kept.push(word);
  }
  return `${kept.join(" ").replace(/[,:;.!?–—-]+$/, "")}…`;
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

function websiteScopeLines(value: string | string[] | undefined) {
  const entries = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n/) : [];
  return entries
    .map(entry => entry.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, "").replace(/^(?:Page|Template)\s*·\s*/i, "").trim())
    .filter(Boolean);
}

function requestedWebsiteScope(data: Record<string, string | string[]>) {
  const pages = websiteScopeLines(data.pagesToDesign);
  const briefs = websiteScopeLines(data.pageBriefs);
  return pages.map((page, index) => {
    const pageName = page.split(/\s+[—–-]\s+/)[0].trim();
    const matchedBrief = briefs.find(brief => brief.toLowerCase().startsWith(pageName.toLowerCase()))
      || (briefs.length === pages.length ? briefs[index] : "");
    const detail = matchedBrief
      ? matchedBrief.replace(new RegExp(`^${pageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:[—–-]|:)?\\s*`, "i"), "").trim()
      : page.slice(pageName.length).replace(/^\s*(?:[—–-]|:)\s*/, "").trim();
    const kind = /template/i.test(pageName) ? "Template" : "Page";
    return `${kind} · ${pageName}${detail ? ` — ${detail}` : ""}`;
  });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  if (!withinRateLimit(request)) return NextResponse.json({ error: "Too many generation requests. Please wait a minute and try again." }, { status: 429 });

  const body = await request.json().catch(() => null);
  const mode = body?.mode as AiGenerationMode;
  const stageKey = typeof body?.stageKey === "string" ? body.stageKey : "";
  const clientName = typeof body?.clientName === "string" ? body.clientName.slice(0, 160) : "Client";
  if (!(mode in AI_STAGES) || !AI_STAGES[mode].includes(stageKey)) {
    return NextResponse.json({ error: "Unsupported generation stage." }, { status: 400 });
  }
  const apiKey = apiKeyForMode(mode);
  if (!apiKey) return NextResponse.json({ error: `Generation is not configured for ${mode}.` }, { status: 503 });

  const data = cleanData(body?.data);
  const clientNotes = cleanData(body?.clientNotes);
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
    const [renderedEvidenceResult, lighthouseResult] = await Promise.allSettled([
      collectWebsiteEvidence(scannedPages.map(page => page.url)),
      runLighthouse(scannedPages[0].url),
    ]);
    if (renderedEvidenceResult.status === "rejected") {
      const error = renderedEvidenceResult.reason;
      return NextResponse.json({ error: `Rendered website inspection failed: ${error instanceof Error ? error.message : "Unable to open the site in the audit browser."}` }, { status: 422 });
    }
    websiteEvidence = renderedEvidenceResult.value;
    const expectedRenders = scannedPages.length * 2;
    if (websiteEvidence.rendered.length < Math.ceil(expectedRenders * 0.7)) {
      return NextResponse.json({ error: `Rendered inspection covered only ${websiteEvidence.rendered.length} of ${expectedRenders} desktop/mobile page views. The report was not scored because the evidence was incomplete.` }, { status: 422 });
    }
    if (lighthouseResult.status === "fulfilled") lighthouse = lighthouseResult.value;
    else console.warn("Google Lighthouse was unavailable.", lighthouseResult.reason instanceof Error ? lighthouseResult.reason.message : lighthouseResult.reason);
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
    if (mode === "brand" && scannedPages.length) {
      try { websiteEvidence = await collectWebsiteEvidence(scannedPages.slice(0, 3).map(page => page.url)); }
      catch (error) { console.warn("Rendered brand inspection was unavailable.", error instanceof Error ? error.message : error); }
    }
  }
  let sitemapUrls: string[] = [];
  if (mode === "website_builder" && stageKey === "direction") {
    const url = typeof data.url === "string" ? data.url : "";
    if (url) {
      try { scannedPages = await scanWebsite(url); sitemapUrls = await discoverSitemapUrls(url); }
      catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "The website could not be scanned." }, { status: 422 }); }
    }
    if (!requestedWebsiteScope(data).length && !sitemapUrls.length && !scannedPages.length) return NextResponse.json({ error: "Confirm at least one page to design before generating the build-ready brief." }, { status: 400 });
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
      "The confirmed pagesToDesign answer is the authority for the design and build scope.",
      "Use a discovered current sitemap only as reference material for preservation, migration, redirects, or copy reuse. Never silently add every discovered URL to the new design scope.",
      "Create one concise purpose, key-message, primary-action, and copy-source brief for every confirmed page. Do not create page briefs for unconfirmed pages.",
      "Map existing website copy, uploaded brief or copy evidence summarized in discovery, audit handoff context, and new-copy requirements without inventing claims or proof.",
      "Turn the approved scope into assignable, build-ready implementation tasks. Do not create a funnel.",
      "Read the Client workspace notes before drafting any copy. Treat them as approved client context, not as permission to invent unsupported claims. If a note conflicts with a confirmed intake answer, call out the conflict for review and use the confirmed intake answer until resolved.",
    ] : []),
    ...(mode === "funnel" ? [
      "Preserve the funnel panel sequence exactly: Funnel flow, Copy, Wireframe, then Development plan.",
      "Each stage must build on the supplied prior approved stages. Do not contradict or replace the approved objective, page order, primary action, offer, audience, or platform unless the discovery context explicitly changes it.",
      "Return only content relevant to the current panel. Flow defines the journey; Copy follows that flow; Wireframe arranges the approved flow and copy; Development plan turns all approved panels into implementation tasks, integrations, QA, and launch requirements.",
      "Read the Client workspace notes before drafting any copy. Use them for audience language, offer details, objections, brand voice, and constraints only where supported. Flag conflicts and missing proof rather than guessing.",
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
    const { response: openaiResponse, payload } = await createOpenAIResponseForMode(mode, {
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      store: false,
      safety_identifier: safetyIdentifier,
      reasoning: { effort: "low" },
      max_output_tokens: isAuditReport ? 18_000 : 2_400,
      instructions,
      input: `Person name: ${personName || "Not supplied"}\nBrand name: ${brandName}\nClient record: ${clientName}\nWorkflow: ${mode}\nStage: ${stageKey}\n\nClient workspace notes (read before discovery context):\n${Object.keys(clientNotes).length ? JSON.stringify(clientNotes, null, 2) : "No saved client notes."}\n\nDiscovery context:\n${JSON.stringify(data, null, 2)}\nPrior audit result:\n${priorResult}${sitemapUrls.length ? `\n\nComplete sitemap URL inventory:\n${sitemapUrls.join("\n")}` : ""}${scannedPages.length ? `\n\nGoogle Lighthouse results:\n${JSON.stringify(lighthouse, null, 2)}\n\nRendered browser and technical evidence:\n${JSON.stringify(websiteEvidence, null, 2)}\n\nScanned website pages:\n${scannedPages.map((page, index) => `--- PAGE ${index + 1}: ${page.url} ---\n${page.text}`).join("\n\n")}` : ""}`,
      text: {
        verbosity: "medium",
        format: { type: "json_schema", name: isAuditReport ? "audit_score_result" : "ai_stage_result", strict: true, schema: isAuditReport ? AUDIT_SCORE_SCHEMA : RESULT_SCHEMA },
      },
    });
    if (!openaiResponse.ok) {
      const mapped = openAIError(openaiResponse.status, payload, "OpenAI could not generate this stage.");
      console.error("OpenAI stage generation failed.", { status: openaiResponse.status, code: payload?.error?.code });
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    const parsed = JSON.parse(responseText(payload));
    if (mode === "website_builder" && stageKey === "direction" && Array.isArray(parsed?.sections)) {
      const pageInventory = [...new Set([...sitemapUrls, ...scannedPages.map(page => page.url)])];
      const confirmedScope = requestedWebsiteScope(data);
      const pageSection = parsed.sections.find((section: any) => String(section?.heading || "").toLowerCase() === "final sitemap and page briefs");
      if (pageSection && confirmedScope.length) {
        const generatedBullets: string[] = Array.isArray(pageSection.bullets) ? pageSection.bullets.filter((item: unknown): item is string => typeof item === "string") : [];
        pageSection.bullets = confirmedScope.map(scopeItem => {
          const kind = scopeItem.startsWith("Template · ") ? "Template" : "Page";
          const scopedName = scopeItem.replace(/^(?:Page|Template)\s*·\s*/i, "").split(/\s+[—–-]\s+/)[0].trim().toLowerCase();
          const generatedMatch = generatedBullets.find(item => item.replace(/^(?:Page|Template)\s*·\s*/i, "").split(/\s+[—–-]\s+/)[0].trim().toLowerCase() === scopedName);
          return generatedMatch ? (/^(?:Page|Template)\s*·\s*/i.test(generatedMatch) ? generatedMatch : `${kind} · ${generatedMatch}`) : scopeItem;
        });
      }
      else if (pageSection && pageInventory.length) pageSection.bullets = websiteBuildScopeItems(pageInventory);
    }
    const result = isAuditReport ? normalizeAuditAnalysis(parsed as RawAuditAnalysis, scannedPages.map(page => page.url), lighthouse, websiteEvidence) : parsed;
    if (mode === "brand" && stageKey === "report" && isAiStageResult(result)) {
      result.summary = conciseBrandSummary(result.summary);
      result.brandVisuals = brandVisualsFromEvidence(websiteEvidence);
    }
    if (!isGeneratedStageResult(result) || isAuditReport && !isAuditScoreResult(result)) throw new Error("The generated response did not match the expected format.");
    return NextResponse.json({ result, model: payload?.model || process.env.OPENAI_MODEL || "gpt-5.6-luna" });
  } catch (error) {
    console.error("Unable to generate stage.", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate this stage." }, { status: 502 });
  }
}
