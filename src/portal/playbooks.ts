// Service playbooks — data + markdown helpers, ported from the reference HTML
// (the redesigned Playbooks tab: library → doc reader → editor).
import { SVC_META } from "./data";
import type { Service } from "./types";
import { AUDIT_CHECKLIST } from "@/lib/auditChecklist";
import { BRAND_AUDIT_WIZARD } from "./audits/auditTypeData";
import { AUDIT_WIZARD, FUNNEL_WIZARD } from "./discovery/discoveryData";
import { WEBSITE_BUILDER_WIZARD } from "./builders/websiteBuilderData";
import { getProcessDefinition, STANDARD_PROCESS_EXCEPTION_POLICIES, type ProcessExceptionPolicy, type ProcessId, type ProcessOwner } from "./processDefinitions";

export type Owner = "admin" | "dev" | "client" | "assistant" | "";
export type PlaybookLifecycle = "draft" | "published" | "archived";

export interface PlaybookRequiredInput {
  id: string;
  label: string;
  required: boolean;
  validation: string;
}

export interface PlaybookAgentControls {
  enabled: boolean;
  definitionKey: string;
  lifecycle: PlaybookLifecycle;
  version: number;
  instructions: string;
  allowedTools: string[];
  memoryPolicy: string;
  approvalGates: string[];
  samplePrompt: string;
  evalStatus: "not_run" | "passing" | "failing";
}

export interface PlaybookGovernance {
  lifecycle: PlaybookLifecycle;
  version: number;
  changeSummary: string;
  lockedCoreSteps: string[];
  editableClientFields: string[];
  requiredInputs: PlaybookRequiredInput[];
  approvalRequirements: string[];
  rolePreview: Array<{ role: ProcessOwner; responsibilities: string[] }>;
  sampleDataPreview: Record<string, string>;
  owner: string;
  lastReviewedAt: string;
  usageCount: number;
  activeRuns: number;
  exceptionPolicies: ProcessExceptionPolicy[];
  agent: PlaybookAgentControls;
}

export interface PlaybookStep { o: Owner; t: string }
export interface PlaybookSeed {
  id: string;
  processId: ProcessId | null;
  svc: Service;
  fn: string;
  icon: string;
  dur: string;
  tag: string;
  purpose: string;
  steps?: PlaybookStep[];
  outputs?: string[];
  summary?: string;
  notes?: string;
  md?: string;
  sourceDocId?: string;
  custom?: boolean;
  governance?: Partial<PlaybookGovernance>;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function governedPlaybook(seed: PlaybookSeed): PlaybookGovernance {
  const process = seed.processId ? getProcessDefinition(seed.processId) : null;
  const requiredLabels = process?.stages.flatMap(stage => stage.requirements) || ["Client or project context"];
  const requiredInputs = [...new Set(requiredLabels)].map(label => ({
    id: slug(label),
    label,
    required: true,
    validation: `Required before ${process?.stages.find(stage => stage.requirements.includes(label))?.label || "the Playbook starts"}.`,
  }));
  const rolePreview = process
    ? (["admin", "studio", "client", "assistant", "shared"] as ProcessOwner[]).flatMap(role => {
      const responsibilities = process.stages.filter(stage => stage.owner === role).map(stage => `${stage.label}: ${stage.nextAction}`);
      return responsibilities.length ? [{ role, responsibilities }] : [];
    })
    : [
      { role: "admin" as const, responsibilities: ["Own publishing, scope, and exception decisions."] },
      { role: "studio" as const, responsibilities: ["Run the internal operating steps."] },
      { role: "client" as const, responsibilities: ["Supply required client inputs and approvals."] },
    ];
  const sampleDataPreview = Object.fromEntries(requiredInputs.slice(0, 6).map(input => [input.label, `Example ${input.label.toLowerCase()}`]));
  return {
    lifecycle: seed.governance?.lifecycle || (seed.custom ? "draft" : "published"),
    version: Math.max(1, seed.governance?.version || process?.version || 1),
    changeSummary: seed.governance?.changeSummary || (seed.custom ? "Initial draft" : "Initial governed operating version"),
    lockedCoreSteps: seed.governance?.lockedCoreSteps || process?.stages.map(stage => stage.label) || parseProcess(seed.md || genMd(seed)).map(step => step.text),
    editableClientFields: seed.governance?.editableClientFields || requiredInputs.map(input => input.label),
    requiredInputs: seed.governance?.requiredInputs || requiredInputs,
    approvalRequirements: seed.governance?.approvalRequirements || process?.stages.flatMap(stage => stage.gate?.blocksProgress ? [stage.gate.label] : []) || [],
    rolePreview: seed.governance?.rolePreview || rolePreview,
    sampleDataPreview: seed.governance?.sampleDataPreview || sampleDataPreview,
    owner: seed.governance?.owner || "Trisha Baltazar",
    lastReviewedAt: seed.governance?.lastReviewedAt || "2026-07-23",
    usageCount: Math.max(0, seed.governance?.usageCount || 0),
    activeRuns: Math.max(0, seed.governance?.activeRuns || 0),
    exceptionPolicies: seed.governance?.exceptionPolicies || process?.exceptionPolicies || STANDARD_PROCESS_EXCEPTION_POLICIES,
    agent: seed.governance?.agent || {
      enabled: true,
      definitionKey: `${process?.id || seed.id}-service-agent`,
      lifecycle: seed.custom ? "draft" : "published",
      version: Math.max(1, seed.governance?.version || process?.version || 1),
      instructions: `Follow the published ${seed.fn} Playbook, use only scoped evidence, and route unsupported or material claims to human review.`,
      allowedTools: ["lookup_review_targets", "list_scoped_evidence", "retrieve_scoped_evidence", "propose_human_review"],
      memoryPolicy: "Approved client + service + stage facts only; no transcript replay or automatic durable memory.",
      approvalGates: ["Material client-facing claims", "Scope changes", "Publication and handoff"],
      samplePrompt: `Review the selected ${seed.fn} checks using only the evidence attached to this run.`,
      evalStatus: seed.custom ? "not_run" : "passing",
    },
  };
}

export const OWNER_META: Record<string, { label: string; c: string; s: string }> = {
  admin: { label: "Admin", c: "var(--accent)", s: "var(--accent-soft)" },
  dev: { label: "Studio", c: "var(--fg)", s: "color-mix(in srgb,var(--fg) 8%,white 92%)" },
  client: { label: "Client", c: "var(--lane-client)", s: "var(--lane-client-soft)" },
  assistant: { label: "Assistant", c: "var(--lane-ai)", s: "var(--lane-ai-soft)" },
};
export function ownerMeta(o: string) {
  return OWNER_META[o] || { label: o || "Team", c: "var(--fg-muted)", s: "var(--surface-alt)" };
}

export const SVC_ORDER: Service[] = ["cocoon", "wiaw", "iff"];

type DocumentationTopic = { title: string; qs: Array<{ label: string; opts?: readonly string[] }> };

function questionnaireMarkdown(topics: DocumentationTopic[]): string {
  return topics.map(topic => {
    const questions = topic.qs.map((question, index) => {
      const options = question.opts?.length ? ` Options: ${question.opts.join("; ")}.` : "";
      return `${index + 1}. ${question.label}${options}`;
    }).join("\n");
    return `### ${topic.title}\n${questions}`;
  }).join("\n\n");
}

const BRAND_AUDIT_QUESTIONNAIRE = questionnaireMarkdown(BRAND_AUDIT_WIZARD);
const WEBSITE_AUDIT_QUESTIONNAIRE = questionnaireMarkdown(AUDIT_WIZARD);
const FUNNEL_BUILD_QUESTIONNAIRE = questionnaireMarkdown(FUNNEL_WIZARD);
const WEBSITE_BUILD_QUESTIONNAIRE = questionnaireMarkdown(WEBSITE_BUILDER_WIZARD);

const WEBSITE_AUDIT_TESTS = AUDIT_CHECKLIST.map(group =>
  `### ${group.label} (${group.checks.length} checks)\n${group.checks.map((check, index) => `${index + 1}. ${check.label}`).join("\n")}`,
).join("\n\n");

const SEO_AUDIT_TESTS = `### Crawlability and indexation
1. Crawlable URLs return healthy responses.
2. Redirects are clean and intentional.
3. Indexability matches page purpose.
4. robots.txt allows priority content.
5. The XML sitemap is valid and current.
6. Canonical tags resolve consistently.

### On-page content signals
1. Page titles are unique and descriptive.
2. Meta descriptions support the click.
3. Each page has one clear primary heading.
4. Content satisfies the page intent.
5. Duplicate and near-duplicate pages are resolved.
6. Meaningful images have useful alt text.

### Architecture and internal linking
1. Priority pages are within a healthy crawl depth.
2. Important pages receive internal links.
3. URLs are readable and stable.
4. Broken and moved URLs have a resolution plan.
5. Keyword-to-page conflicts are reviewed.

### Technical experience
1. HTTPS is enforced consistently.
2. Priority templates are mobile usable.
3. Core Web Vitals are reviewed.
4. Structured data is valid and relevant.
5. Server and rendering errors are absent.

### AIO, GEO, and measurement
1. Search and AI crawlers can reach priority content.
2. Priority pages are answer-ready.
3. Entities and relationships are explicit.
4. Important claims have citation signals.
5. Organic and AI discovery measurement is available.`;

const STANDARD_CLIENT_DELIVERY_POLICY = `## Client delivery and access
- Standard client accounts submit source material through assigned intake, To-do's, Files, Inbox, or the guided consult; they do not open the Audit or Builder engine.
- Admin and the studio team own draft generation, evidence review, internal stage gates, and corrections inside the engine.
- The client sees an audit report or builder brief only after the studio deliberately shares the client-safe final version into Approvals.
- Client feedback and the final decision stay attached to that Approvals record; draft prompts, internal notes, and unreviewed generations remain private.
- An active In Full Flight service unlocks direct Audit and Builder collaboration for that partner workspace without changing the underlying client role.
- AI requests run server-side through configured service credentials; provider keys must never be exposed to the browser, copied into client records, or included in exported handoffs.`;

const PARTNER_ENGINE_ACCESS_POLICY = `## Client delivery and access
- In Full Flight is an active partnership workspace, so the client can collaborate directly in the relevant Builder or Audit engine while that service is active.
- Every client, month, audit, and planning cycle remains isolated; direct access never permits cross-client data reuse.
- Draft generation remains visibly distinct from approved work, and the studio reviews client-facing claims, strategy changes, scope, and publish actions.
- Final milestone outputs may also be shared into Approvals to create one durable client decision record.
- If In Full Flight ends, direct engine access closes and future final outputs return to the standard Approvals-only delivery path.
- AI requests run server-side through configured service credentials; provider keys must never be exposed to the browser, copied into client records, or included in exports.`;

export const PB_SEED: PlaybookSeed[] = [
  { id: "cc-brand-audit", processId: "brand-audit", svc: "cocoon", fn: "Brand Audit", icon: "palette", dur: "2–3 days", tag: "Diagnostic",
    purpose: "Review the brand foundation, positioning, voice, and visual identity.", sourceDocId: "cocoon-brand-audit",
    md: `# Brand Audit

**Service:** Cocoon Consult  ·  **Timing:** 2–3 days  ·  **Type:** Diagnostic

## Summary
We assess how the brand is positioned, communicated, and expressed, then turn the evidence into an approved direction and prioritized action plan for future implementation.

## Process
1. **Admin** — Select the client and open a new Brand Audit record.
2. **Client** — Submit foundation, positioning, audience, messaging, voice, visual identity, touchpoint, asset, and priority inputs through the assigned intake, Files, Inbox, or guided consult.
3. **Assistant** — Consolidate uploaded knowledge and generate the audit report from the approved inputs.
4. **Studio** — Review the generated report, correct weak assumptions, and confirm the six audit areas.
5. **Admin** — Complete internal report gates and deliberately share the client-safe final audit into Approvals.
6. **Client** — Review the final audit in Approvals and approve it or send a specific change request.
7. **Admin** — Approve the action plan and move the findings into Website Builder when implementation is selected.

## What we do
- Review the brand foundation, business goals, audience, market position, differentiators, and offer clarity.
- Assess messaging hierarchy, key messages, value proposition, tone of voice, and consistency across client touchpoints.
- Evaluate the visual identity, including logo use, colour, typography, imagery, layout, and the rules needed to keep them consistent.
- Identify gaps between the intended brand and how the brand currently appears or communicates.
- Turn evidence into clear findings, priorities, and practical recommendations instead of subjective design opinions.
- Lead a guided review so the client understands what to protect, what to correct, and what should happen next.
- Prepare an approved brand direction and implementation handoff when the findings move into Website Build or retained support.

## Questionnaire and source inputs
${BRAND_AUDIT_QUESTIONNAIRE}

The questionnaire is supplemented by the live website, supplied social-profile URLs, existing guidelines, logo and identity files, templates, photography, packaging, sales material, and any approved notes received through Files, Inbox, or the guided consult. A missing source stays identified as missing; it is not replaced with an invented answer.

## What we assess
1. **Brand foundation** — name, purpose, business context, offer, goals, and the reason the brand exists.
2. **Positioning and audience** — intended customer, situation, needs, aspirations, market position, differentiation, and how clearly the position is documented.
3. **Messaging and voice** — promise or transformation, value proposition, key messages, signature language, claims, tone traits, consistency, and language to avoid.
4. **Visual identity** — existing guidelines, logo suite, colour, typography, photography, illustration, icons, templates, packaging, desired visual feel, and application quality.
5. **Brand system** — the touchpoints where the identity must work, existing inconsistencies, governance gaps, and the practical kit required for repeatable use.
6. **Improvement priorities** — gaps between intended and observed expression, the first correction to make, dependencies, and the recommended implementation sequence.

## Scoring and decision system
- Brand Audit does not create a numeric brand score. The positioning and guideline maturity choices are discovery inputs, not grades.
- Every material conclusion uses one fixed evidence state: **Verified strength**, **Verified gap**, **Unverified**, or **Not applicable**. Each verified state must name the submitted answer, supplied asset, or observed public touchpoint that supports it.
- Evidence coverage is **(verified strengths + verified gaps) ÷ all applicable criteria × 100**. Coverage below 75% keeps the audit Provisional and requires missing evidence to remain visible; it does not create a lower brand-quality score.
- Readiness is controlled by two approval gates: the studio approves the evidence-based report, then the studio and client approve the prioritized action plan.
- Recommendations can come only from Verified gaps and are ordered by strategic impact, consistency risk, urgency, and whether the prerequisite evidence or decision is available. Unverified items request evidence rather than becoming recommendations.

## Data processing
1. Intake answers, website and social links, uploaded files, and prior approved audit context are collected into the client audit record.
2. Text, single-choice, and multi-choice answers are normalized; the jump-start process may propose questionnaire answers from supplied sources but cannot select values outside the live question options.
3. The server-side generator turns the approved evidence into structured report sections, evidence-state labels, recommendations, and an action plan. It must label inferred decisions and missing confirmations.
4. Visual palette and typography examples are working direction, not factual extraction or a score; the studio validates them against the supplied identity before client use.
5. The studio team reviews claims, weak assumptions, source gaps, and all six assessment areas. Admin completes the report and action-plan gates.
6. Only the reviewed client-safe report is persisted as the final output and shared into Approvals or carried into an approved Website Build handoff.

${STANDARD_CLIENT_DELIVERY_POLICY}

## Outputs
- Approved brand audit report
- Brand-system and consistency findings
- Prioritized improvement action plan
- Website Builder handoff package

## Execution rules
- Do not invent brand facts that are not in discovery or uploaded source material.
- Mark assumptions clearly and return to the client when a missing input changes the recommendation.
- Keep consult guidance separate from implementation scope, timeline, and price; only recommend a build when the approved findings support it.
- Preserve the approved audit evidence when handing work to a builder; do not restart discovery.` },
  { id: "cc-website-audit", processId: "website-audit", svc: "cocoon", fn: "Website Audit", icon: "chart", dur: "2–3 days", tag: "Diagnostic",
    purpose: "Audit positioning, conversion, content, design, navigation, accessibility, mobile, and SEO performance before a rebuild.", sourceDocId: "cocoon-website-audit",
    md: `# Website Audit

**Service:** Cocoon Consult  ·  **Timing:** 2–3 days  ·  **Type:** Diagnostic

## Summary
We evaluate how effectively the website communicates, guides, converts, and performs, then provide evidence-based priorities and a practical action plan before recommending implementation.

## Process
1. **Admin** — Create or reopen the client audit and confirm the website and core offer in scope.
2. **Client** — Answer the guided website questions about the site, conversion path, experience, messaging, findability, visual consistency, and positioning.
3. **Assistant** — Generate the Discovery Brief, Offer and Audience Read, Conversion Journey Read, Priority Findings, and Recommended Action Plan.
4. **Studio** — Review content, design, navigation, accessibility, mobile responsiveness, and SEO or performance evidence.
5. **Admin** — Complete internal checkpoint review, finalize the Audit Action Plan, and share the client-safe final report into Approvals.
6. **Client** — Review the final report in Approvals and approve it or request changes with a written note.
7. **Admin** — Hand approved insights to Website Builder or another scoped next step.

## What we do
- Review the business, brand, audience, offer, goals, conversion priorities, current website, assets, and constraints.
- Audit the website's positioning, offer clarity, trust signals, content hierarchy, calls to action, and conversion journey.
- Evaluate design and typography, navigation and structure, accessibility, mobile responsiveness, and search or performance evidence.
- Record each finding as an observation, explain why it matters, and define the action needed to improve it.
- Separate immediate fixes from strategic opportunities and from work that requires a larger rebuild.
- Prioritize the work by impact, readiness, dependencies, and the decisions the client must make.
- Walk the client through the findings and produce a final action plan that can move directly into Website Build without repeating discovery.

## Questionnaire and source inputs
${WEBSITE_AUDIT_QUESTIONNAIRE}

The submitted self-assessment is combined with the website URL, every public page successfully scanned for evidence, uploaded context, and mobile and desktop Google Lighthouse results when those services return data. Public evidence can correct or leave an intake answer unverified; the questionnaire alone never proves that a website passes a test.

## Every part we test
${WEBSITE_AUDIT_TESTS}

## Scoring and decision system
- Every checklist item is recorded as **Passed**, **Failed**, **Unverified**, or **Not applicable**, with evidence and a source URL where available.
- A category score is **passed ÷ (passed + failed) × 100**. Unverified and not-applicable checks do not raise or lower the score.
- The overall score applies the same formula across all verified checklist items, so categories with more verified checks contribute more evidence rather than receiving an arbitrary equal weight.
- Evidence coverage is **verified applicable checks ÷ all applicable checks × 100**. A score is **Reliable** at 75% coverage or higher and **Provisional** below 75%.
- Category labels are: below 50 **Priority**; 50–64 **Needs work**; 65–79 **Good**; 80–100 **Strong**. The overall labels are below 50 **Needs attention**; 50–64 **Fair foundation**; 65–79 **Solid footing**; 80–100 **Strong foundation**.
- A category target is capped at 95 and calculated from the current score plus 1.5 points for each verified failure. The report target is the rounded average of category targets and can never be lower than the current overall score.
- Lighthouse performance, accessibility, best-practices, SEO scores, and lab metrics are reported separately. They supply technical evidence but never directly change the internal checklist formula.
- Priorities start with verified issues ordered by severity, then the lowest-scoring categories and remaining verified failures. No implementation change is recommended solely from an unverified item.

## Data processing
1. The intake, source files, and website URL are normalized into one resumable client audit record.
2. Public pages are discovered and rendered, visible content and interaction evidence are recorded, and representative mobile and desktop Lighthouse runs are requested.
3. Deterministic checks use captured page and Lighthouse evidence first; the structured audit analysis evaluates the remaining observable criteria. Any unsupported item defaults to Unverified.
4. Results are normalized against the exact checklist IDs above. Issues are kept only when their linked criterion actually failed, preventing unsupported findings from entering the score.
5. Category totals, overall score, evidence coverage, targets, confidence, and the first five evidence-backed priorities are calculated from the normalized statuses.
6. The studio team reviews every failure, unverified item, source URL, course of action, and Lighthouse limitation. Admin finalizes the action plan and persists the reviewed report.
7. The client-safe output is shared into Approvals; the approved findings and source evidence are then carried into Website Build without rescoring from stale data.

${STANDARD_CLIENT_DELIVERY_POLICY}

## Outputs
- Resumable website audit record
- Prioritized client-safe findings
- Final Audit Action Plan
- Website Builder handoff package

## Execution rules
- A score or summary is not final until the evidence and wording have been reviewed by the studio.
- Every finding must state what was observed, why it matters, and what action follows.
- Do not let the proposal replace the consult: approve priorities first, then price only the implementation work supported by the audit.
- Do not begin Website Builder from stale or unapproved audit findings.` },
  { id: "cc-seo-audit", processId: "seo-audit", svc: "cocoon", fn: "SEO Audit", icon: "search", dur: "2–3 days", tag: "Diagnostic",
    purpose: "Inventory the live site, visualize crawl health, and approve a prioritized technical and on-page SEO report.", sourceDocId: "cocoon-seo-audit",
    md: `# SEO Audit

**Service:** Cocoon Consult  ·  **Timing:** 2–3 days  ·  **Type:** Diagnostic

## Summary
We establish a verified crawl inventory, assess technical, on-page, architectural, and AI-discovery readiness, and deliver prioritized findings before any growth strategy begins.

## Process
1. **Admin** — Select the client and choose one of two crawl sources: CSV upload or sitemap crawl.
2. **Client** — Supply the website URL or complete crawler export through assigned intake or Files when the studio does not already have it.
3. **Assistant** — Import or crawl the URL inventory and validate that crawlable pages were found.
4. **Studio** — Review crawl composition, indexability, depth, metadata, canonicals, inlinks, issue pressure, and AIO/GEO discovery readiness.
5. **Studio** — Complete the 27-item SEO audit checklist across crawl/indexation, on-page content, architecture/internal linking, technical experience, and AIO/GEO plus measurement.
6. **Studio** — Let crawl-supported checks populate automatically, review qualitative and connected-data checks, and record every outcome as Confirmed, Warning, or Failed.
7. **Studio** — Finalize the prioritized audit report and separate repair work from growth planning.
8. **Admin** — Share the client-safe visual report into Approvals.
9. **Client** — Review the final report in Approvals and approve the priorities or request a correction.
10. **Admin** — Send the approved crawl inventory, readiness record, and findings to In Full Flight SEO Planning and Execution.

## What we do
- Crawl the live sitemap or review a complete crawler export to establish a real page inventory.
- Validate status codes, indexability, canonicals, titles, descriptions, headings, depth, internal links, content depth, and other supplied crawl evidence.
- Identify broken pages, redirect chains, duplicate or conflicting pages, missing metadata, thin content, crawl waste, and internal-linking gaps.
- Assess crawlability, on-page signals, site architecture, technical experience, measurement readiness, and AIO/GEO discoverability.
- Review AI crawler access, answer-ready content, entity clarity, structured data, citation potential, and available AI referral evidence.
- Assign a clear action to each affected page: keep, improve, no-index, delete, redirect, or consolidate, including the reason and target where needed.
- Prioritize technical repairs and on-page improvements, then present a client-safe report that separates evidence from future growth strategy.
- Hand the approved crawl, page decisions, and priorities into SEO Planning And Execution without asking for the same audit again.

## Source inputs
SEO Audit does not repeat the Brand or Website questionnaire. The client or studio supplies a domain or a complete crawler CSV, then confirms business goals and any available analytics context. The tested dataset must come from either that crawler export or a successful sitemap crawl. The normalized fields are URL, HTTP status, content type, indexability, title, meta description, H1, canonical, crawl depth, internal inlinks, and word count; every additional imported CSV column is retained as raw evidence for checks such as redirects, robots, duplicates, alt text, structured data, performance, authorship, Search Console, analytics, and AI referrals.

## Every part we test
${SEO_AUDIT_TESTS}

## Scoring and decision system
- Each of the 27 readiness checks is **Confirmed**, **Warning**, **Failed**, or **Unverified**. Crawl-supported rules populate automatically; missing qualitative or connected performance evidence remains Unverified until a human or connected source resolves it.
- The crawl-health score is deterministic: **100 − (((broken URLs × 8) + (redirects × 3) + (missing titles × 5) + (missing descriptions × 2) + (missing H1s × 3)) ÷ all URLs × 10)**, rounded and never below zero.
- The six card coverage measures are calculated independently: indexable HTML pages, healthy responses, title coverage, description coverage, H1 coverage, and non-thin content coverage. Each is the matching good-page count ÷ the applicable page count × 100.
- AI visibility readiness is **45% eligibility + 45% answer readiness + 10% structured-data readiness**. Eligibility means an active HTML page is indexable and not blocked by noindex or nosnippet. Answer readiness requires title, description, H1, and at least 300 words. If structured-data evidence was not measured, that 10% component remains neutral at 50 rather than being presented as verified.
- Checklist bars report the count of confirmed, warning, failed, and unverified items; they are not silently converted into a second invented overall score.
- Page decisions follow fixed evidence rules in this order: redirecting URL → Redirect; dead URL with a relevant replacement → Redirect; dead URL without one → Delete; duplicate or conflicting canonical → Consolidate; intentional non-indexable page → No-index; missing title, description, H1, or thin copy → Improve; otherwise → Keep.
- A score is displayed only from the imported or crawled record. Empty workspaces show Pending, and no client name, seed, AI prose, or demo record may generate a score.

## Data processing
1. CSV rows are parsed by header name or the live sitemap is crawled; empty URLs are rejected and the original imported columns remain attached to each normalized page.
2. URLs and technical fields are normalized, then the inventory is separated into HTML, active, redirecting, broken, indexable, metadata-gap, heading-gap, and thin-content sets.
3. The fixed readiness rules evaluate only the evidence actually present. Unmeasured fields do not pass by default.
4. Crawl health, page coverage, AI visibility, issue totals, and page-by-page actions are calculated from the same normalized rows so dashboard totals and report details stay reconcilable.
5. The studio team reviews warnings, failed and unverified checks, qualitative content judgments, redirect targets, representative performance evidence, and any connected analytics data.
6. The reviewed crawl, checklist statuses, evidence, page decisions, and prioritized report are persisted together and shared into Approvals.
7. The approved dataset becomes the source for SEO Planning And Execution; missing keyword, ranking, or performance fields remain blank rather than being generated as facts.

${STANDARD_CLIENT_DELIVERY_POLICY}

## Outputs
- Validated crawl inventory
- Visual SEO health dashboard
- Prioritized technical and on-page SEO audit report
- AIO/GEO discovery-readiness summary and AI visibility findings
- Approved In Full Flight SEO handoff

## Execution rules
- Do not fabricate a crawl. If sitemap.xml is unavailable, show the error and request a crawler CSV.
- Keep audit evidence separate from proposed keyword, metadata, architecture, and content decisions.
- Do not substitute CMS access, plugin licensing, page-builder timing, tracking-snippet placement, or OneLogin requirements for actual SEO audit evidence.
- Warnings may proceed only when the limitation remains visible in the audit record.
- Approve the audit priorities before preparing the retained SEO scope, timeline, reporting cadence, or price.
- Reuse the approved audit in the builder; never require the same crawl to be uploaded twice.` },
  { id: "ww-funnel-build", processId: "funnel-build", svc: "wiaw", fn: "Funnel Build", icon: "funnel", dur: "Sprint", tag: "Implementation",
    purpose: "Turn approved strategy into a complete funnel flow, conversion copy, wireframe, build plan, launch scope, and AI handover.", sourceDocId: "wiaw-funnel-build",
    md: `# Funnel Build

**Service:** Winged In A Week  ·  **Timing:** Sprint  ·  **Type:** Implementation

## Summary
We turn an approved offer and conversion strategy into the complete funnel journey, copy, design direction, implementation plan, launch, and handoff.

## Process
1. **Admin** — Create or reopen the named funnel plan for the selected client and confirm the audit or strategy source.
2. **Client** — Submit objective, audience, offer, traffic, page, email, platform, payment, tracking, asset, and launch inputs through assigned intake, Files, Inbox, or the guided consult.
3. **Assistant** — Read the saved client workspace notes first, then generate the funnel flow, landing-page-ready copy, one of five selectable wireframe directions, and development plan from the approved inputs.
4. **Studio** — Review page order, primary action, integrations, responsive layout, build tasks, and launch requirements.
5. **Admin** — Complete internal stage gates and share the final build-ready brief, proposal, or AI handover into Approvals.
6. **Client** — Review the final output in Approvals and approve it or request a specific correction.
7. **Admin** — Import approved tasks and move implementation through the client-visible design, build, and launch approval gates.

## What we do
- Anchor the funnel in a category point of view — the belief the brand will be known for — and the problem to educate the market on.
- Create demand before capturing it: plan ungated, value-first content and the distribution channels the audience already uses; paid amplifies what works rather than driving cold traffic to a form.
- Design a low-friction, high-intent conversion for the roughly 5% who are in-market now, instead of gating value behind an email opt-in.
- Nurture by usefulness — value newsletters and educational content, plus acting on in-market signals — not a drip sequence built to sell.
- Write educational, point-of-view-led copy that earns trust; make the primary call to action high-intent (talk to us, see it live, start free), not a hard sell to cold audiences.
- Map the journey across the awareness ladder (unaware → problem-aware → solution-aware → in-market → customer), with content built for each rung, and measure demand created and qualified pipeline rather than raw form fills.
- Establish one of five wireframe design directions — Conversion Stack, Split Hero, Editorial Story, Modular Bento, or Immersive Visual — so the approved strategy translates into a coherent responsive experience.
- Map the full page anatomy: navigation, hero, trust proof, problem and stakes, benefits, audience fit, solution or features, process, proof, offer, integrations when relevant, pricing or value, FAQ, final call to action, and footer or legal needs.
- Plan the platform, domain, CRM or email connection, forms, calendar, payments, tracking, assets, and launch dependencies.
- Build the implementation plan, complete responsive QA, prepare the launch, and hand over the approved funnel, assets, ownership, and training.

## Questionnaire and source inputs
${FUNNEL_BUILD_QUESTIONNAIRE}

The live questionnaire is supplemented by the approved audit or strategy, uploaded brand assets, existing offer and landing-page copy, product or lead-magnet files, testimonials, policy pages, platform access, integration details, and any approved campaign notes. Unknown integrations or assets remain To confirm.

## What we plan and produce
1. Discovery record and source-of-truth offer decisions.
2. Traffic-to-conversion funnel flow, required pages, email follow-up, decision points, and drop-off risks.
3. Offer framing, messaging strategy, page copy, proof, objection handling, and call-to-action hierarchy.
4. Conversion-first wireframe with the approved section sequence and responsive direction.
5. Development brief covering pages, forms, email or CRM, payments, domain, tracking, integrations, assets, QA, dependencies, and launch.
6. Implementation tasks, approval gates, launch checklist, handoff assets, ownership, and training.

## Scoring and decision system
- Funnel Build has no numeric quality score. A percentage based on generated copy or an AI opinion would not be evidence of build readiness.
- Readiness is controlled by five named gates: **Discovery**, **Funnel flow**, **Copy**, **Wireframe**, and **Development plan**. A later gate may use only the approved output of the earlier gates.
- The objective, audience, offer, primary action, required pages, copy ownership, platform, payments, integrations, tracking, assets, and dependencies must be explicit or marked To confirm before the final brief is build-ready.
- The build can proceed only when the client has approved the final flow, copy direction, wireframe, and development scope, or when a logged change request has been resolved.
- Success is measured after launch using the conversion and tracking inputs approved in discovery; those results are not pre-filled as a forecast score.

## Data processing
1. Questionnaire answers, saved client workspace notes, uploaded copy and assets, and approved strategy are normalized into one funnel record; notes are read before copy generation and multi-select answers retain the selected page, traffic, proof, asset, and tracking choices.
2. Server-side generation produces structured outputs for flow, copy, wireframe, and brief from the active client record only.
3. Each stage is reviewed for contradictions with the approved objective, offer, audience, primary action, and preceding stage. Missing inputs remain visible instead of being inferred as facts.
4. Approved stage outputs are carried forward so copy, wireframe, and development tasks use the same page sequence and decisions.
5. The final brief is transformed into assignable implementation tasks and is persisted with its approvals and change requests.
6. The editable task checklist remains inside the final Development Plan directly below its copy, PDF, and share actions, then imports the selected rows into To-do's or exports them as CSV.
7. The final document is rendered as a printable A4 PDF for preview and download. Sharing persists the client-safe plan into Approvals and produces a copyable direct review link.
8. Only the reviewed final brief, proposal, or AI handover is shared into Approvals; launch and performance data become the evidence for the next optimization cycle.

${STANDARD_CLIENT_DELIVERY_POLICY}

## Outputs
- Approved funnel flow and conversion copy
- Selected wireframe and page blueprint
- Build plan, implementation tasks, and launch checklist
- Printable Development Plan PDF and direct Approvals review link
- Scoped proposal and AI Funnel Handover

## Execution rules
- Do not change the approved objective, audience, primary action, or page flow without a recorded decision.
- Use uploaded copy as source material; improve it for the landing page without silently replacing the offer.
- Do not move past a delivery gate without the recorded client approval or a clearly logged change request.
- Close the sprint with launch status, ownership, training, handoff assets, and the selected In Full Flight or nurture path.
- If a required integration or input is unknown, label it To confirm instead of inventing it.` },
  { id: "ww-website-build", processId: "website-build", svc: "wiaw", fn: "Website Build", icon: "grid", dur: "Sprint", tag: "Implementation",
    purpose: "Turn approved audit insights into the full website scope, design direction, implementation plan, and launch-ready tasks.", sourceDocId: "wiaw-website-build",
    md: `# Website Build

**Service:** Winged In A Week  ·  **Timing:** Sprint  ·  **Type:** Implementation

## Summary
We turn approved audit insights and source material into a scoped sitemap, page strategy, copy direction, visual system, responsive website, launch, and handoff.

## Process
1. **Admin** — Open the client Website Builder and confirm whether Brand Audit or Website Audit findings are being carried forward.
2. **Client** — Supply an existing website, uploaded brief or copy, pasted planning notes, or a blank brief through assigned intake, Files, or Inbox, then confirm the exact pages to design.
3. **Assistant** — Read the saved client workspace notes first, then map the approved source material into the final sitemap, one concise copy brief per page, the shared website direction, and the implementation task plan.
4. **Studio** — Review the confirmed page and template scope, copy sources, page purposes, primary actions, design system, milestones, integrations, and dependencies.
5. **Admin** — Complete internal stage review and share the final build-ready brief and sitemap into Approvals.
6. **Client** — Approve the final brief and sitemap in Approvals or request a specific correction before page design begins.
7. **Admin** — Import the approved implementation tasks and run the standard design, build, QA, launch, and handoff gates.

## What we do
- Carry approved Brand Audit or Website Audit findings into the build so positioning, messaging, priorities, and evidence are not lost.
- Review the existing website, uploaded brief or copy, planning notes, business goals, audiences, primary action, success measures, and launch constraints.
- Confirm the exact pages and templates to design, then turn that list into the final sitemap and agreed build scope.
- Define each page's purpose, key message, primary action, content source, required sections, and relationship to the rest of the site.
- Preserve, reorganize, edit, or write copy according to the agreed responsibility, including migration, redirect, consolidation, and retirement decisions.
- Establish the shared visual direction and design system, using the homepage as the approval reference before applying it across the full site.
- Plan and implement required functionality, CMS needs, forms, integrations, analytics, accessibility, responsiveness, and technical dependencies.
- Complete full-site QA, launch preparation, DNS and analytics checks, training, ownership transfer, and the final handoff.

## Questionnaire and source inputs
${WEBSITE_BUILD_QUESTIONNAIRE}

Accepted planning sources are an existing website, an uploaded brief or copy document, the website plus uploaded material, approved Brand or Website Audit context, or a blank brief completed through the questionnaire. The client must name the pages to design; a discovered current URL is source evidence, not automatic new scope.

## What we plan and produce
1. Source strategy, main objective, audience, primary action, platform, and success measure.
2. Final sitemap containing only the approved pages and reusable templates.
3. One page brief per scoped page or template: purpose, key message, primary action, copy source, required sections, and relationships.
4. Copy plan for preservation, migration, editing, new writing, consolidation, redirects, and retirement.
5. Shared information architecture, navigation, hierarchy, visual system, reusable components, responsive rules, and conversion patterns.
6. Functional requirements, integrations, CMS, forms, analytics, accessibility, technical constraints, dependencies, and exclusions.
7. Five implementation milestones: scope and content preparation; design-system approval; remaining-page design and build; content population and QA; launch and measurement.
8. Page-specific and shared tasks for content, UX, design, development, integrations, population, QA, launch, measurement, training, and handoff.

## Scoring and decision system
- Website Build has no invented numeric quality score. It uses a fixed completeness and approval system.
- The brief is build-ready only when the source strategy, goal, audience, primary action, success measure, exact sitemap, per-page briefs, copy responsibility, functionality, platform, dependencies, asset owner, approver, and timeline are present or explicitly marked To confirm.
- Scope coverage is exact: **documented page briefs ÷ approved sitemap pages × 100**. It measures documentation completeness, not design quality, and must reach 100% before page design begins.
- Every generated sitemap line must match a client-confirmed page or template. Extra pages fail scope validation; missing pages fail coverage validation.
- The approval sequence is final sitemap and page briefs → shared design system or homepage reference → remaining-page design and build → content and QA → launch. A recorded change request reopens the affected gate.
- Post-launch success uses the agreed conversion, engagement, operational, or qualitative measure; it is never predicted from the brief.

## Data processing
1. The source website may be scanned into a current sitemap; saved client workspace notes, uploaded briefs and copy, pasted notes, and approved audit handoffs are added to the active client knowledge record and sent into generation as labeled sources.
2. Jump-start suggestions are normalized to the live questionnaire options. Current URLs are grouped into possible pages and templates, but only the client's pages-to-design answer defines final scope.
3. Server-side generation is constrained to the confirmed pages and produces the build-ready brief in a fixed five-section structure.
4. Each sitemap item is matched to one page brief. Source copy and audit evidence are mapped to that item, while unsupported claims and unconfirmed dependencies stay visible.
5. The approved brief is converted into implementation tasks only for confirmed pages plus shared system, integration, QA, and launch work.
6. The client workspace persists the intake and generated stages; Admin and the studio team review them before the final sitemap and brief are shared into Approvals.
7. Approved context is retained through design, build, QA, launch, analytics checks, training, and handoff so discovery is not repeated or silently changed.

${STANDARD_CLIENT_DELIVERY_POLICY}

## Outputs
- Approved final sitemap and complete page scope
- Build-ready page brief with purpose, key message, primary action, and copy source for every scoped page
- Full-site copy, design, functionality, and development direction
- Approval, dependency, and handoff rules
- Importable website implementation task plan

## Execution rules
- Design and build only the pages confirmed in the final sitemap; never turn every discovered current URL into automatic new scope.
- Use the current sitemap to plan preservation, reuse, redirects, retirement, or migration when an existing website is supplied.
- Do not discard approved audit context or ask the client to repeat inputs already carried forward.
- Do not move past a delivery gate without the recorded client approval or a clearly logged change request.
- Close the sprint with launch status, DNS and analytics checks, ownership, training, handoff assets, and the selected In Full Flight or nurture path.
- Keep copy responsibility and excluded scope visible before implementation begins.` },
  { id: "iff-social-media", processId: "social-media-operations", svc: "iff", fn: "Social Media Operations", icon: "calendar", dur: "Monthly", tag: "Retainer",
    purpose: "Turn approved source material into recurring, channel-aware content plans, editable posts, approvals, and schedule-ready exports.", sourceDocId: "iff-social-media",
    md: `# Social Media Operations

**Service:** In Full Flight  ·  **Timing:** Monthly  ·  **Type:** Retainer

## Summary
We plan and prepare recurring social content that follows the client's brand, goals, audience, approved channels, cadence, and monthly priorities through final approval and scheduling.

## Process
1. **Admin** — Create or reopen the client month and confirm the content source, channels, duration, and cadence.
2. **Assistant** — Analyze the source to detect brand voice and content pillars, then build the monthly content plan.
3. **Studio** — Review the monthly theme, channel split, pillar mix, post ideas, cross-posting destinations, formats, and dates.
4. **Client** — Approve the content plan and review or edit each generated post.
5. **Studio** — Add art direction or artwork, finalize captions, hashtags, graphic copy, links, times, and channel-specific formatting.
6. **Admin** — Confirm the calendar, export the schedule, and record the month as scheduled.

## What we do
- Review the client's website, social profiles, existing posts, brand notes, offers, audience, voice, and current content patterns.
- Define the monthly objective, campaign or theme, content pillars, channel mix, publishing cadence, formats, and success measures.
- Plan platform-appropriate post ideas for Instagram, TikTok, LinkedIn, Facebook, X, Pinterest, or YouTube according to the agreed scope.
- Write captions, hooks, calls to action, hashtags, graphic or on-image copy, links, and channel-specific variations.
- Prepare art direction and required formats for static, vertical, landscape, carousel, short-form video, or other approved content.
- Coordinate primary channels and cross-post destinations without treating one generic post as suitable everywhere.
- Build the monthly calendar, complete client and studio revisions, confirm approvals, and prepare the final posting schedule or export.
- Monitor completed work and available performance signals, flag issues, recommend the next cycle, and provide a client recap.

## Questionnaire and source inputs
1. **Client and month** — Which client workspace and calendar month does this cycle belong to?
2. **Source type** — Social handle, pasted recent posts, website URL, or pasted brand notes.
3. **Source content** — What real source should be analyzed for voice, audience, offers, and content pillars?
4. **Channels** — Instagram, TikTok, LinkedIn, Facebook, X, Pinterest, and/or YouTube.
5. **Duration** — One week, two weeks, or one month.
6. **Cadence** — One to seven posts per week for each selected channel.
7. **Voice** — Which detected voice traits should be retained or corrected?
8. **Pillars** — Which four to six content pillars should structure the cycle?
9. **Per-post decisions** — Primary channel, optional cross-post destinations, pillar, title, caption, hashtags, graphic copy, link, art direction, uploaded asset, format, day, time, and approval status.
10. **Art format** — Vertical video 9:16, static square 1:1, landscape 16:9, or carousel 1:1.

## Every part we plan and review
1. Source validity, brand voice, audience, offers, claims, and content pillars.
2. Monthly objective or theme, duration, channels, platform roles, and per-channel cadence.
3. Total post count, pillar distribution, primary-channel distribution, cross-post plan, and calendar spacing.
4. Post idea, hook or title, caption, call to action, hashtag format, graphic copy, link, and factual support.
5. Channel fit, destination-specific formatting, art direction, asset availability, aspect ratio, date, and time.
6. Draft versus approved state for every post, calendar completion, schedule readiness, and export integrity.
7. Completed work and any available performance evidence used to inform the next cycle.

## Scoring and decision system
- Social Media Operations does not generate a speculative content-quality score or predicted performance score.
- Planned post count is deterministic: **the sum of each selected channel's posts per week × the selected number of weeks**, capped at 48 posts per cycle.
- Plan completeness reports exact counts for posts, cross-posted ideas, single-channel ideas, weeks, channel distribution, and pillar distribution.
- Every post has only two content states: **Draft** or **Approved**. The month is approved only when the approved-post count equals the total-post count.
- A post is schedule-ready only when destinations, format, caption or copy, hashtags where applicable, graphic copy, link requirement, art direction or asset, date, time, and approval are explicit.
- Reported performance must come from an attached platform or analytics source. Missing reach, engagement, click, lead, or conversion data stays missing and never becomes an AI estimate.

## Data processing
1. One source is attached to one client-month record; data is never pooled across clients or months.
2. The server-side analyzer receives the selected real source and returns structured voice traits and four to six usable pillars without inventing claims, awards, testimonials, or metrics.
3. The planner receives the approved source, voice, pillars, channels, duration, cadence, and exact required post count, then returns structured post ideas.
4. Ideas are normalized into the active month, distributed across selected channels and calendar days, and assigned a primary format. Cross-post destinations remain explicit rather than implied.
5. Client and studio edits update the individual post record; regenerating one post must preserve the approved voice, pillars, channel, cadence, and other month decisions.
6. The active client-month is persisted after changes. Only fully reviewed posts move from Draft to Approved and only an approved calendar moves to Schedule.
7. The export is assembled from the saved records with date, time, primary and cross-post channels, posting type, pillar, format, title, caption, hashtags, and status.

${PARTNER_ENGINE_ACCESS_POLICY}

## Outputs
- Approved monthly content strategy and theme
- Channel and cadence plan
- Editable post library and cross-post map
- Month-aware content calendar
- Schedule-ready CSV export

## Execution rules
- Never merge one client or month into another; read and write only the active client-month record.
- Preserve approved brand voice, pillars, channels, cadence, and cross-posting decisions when regenerating an individual post.
- Never publish a chat-requested change without studio review and the required client approval.
- Log scope and billing decisions in the request trail; do not absorb out-of-scope work into the monthly cycle silently.
- A post is not schedule-ready until its destinations, format, copy, art direction, time, and approval state are explicit.
- Use platform logos anywhere a channel is named in a visual summary.` },
  { id: "iff-seo-plan", processId: "seo-planning-execution", svc: "iff", fn: "SEO Planning And Execution", icon: "search", dur: "90-day cycle", tag: "Retainer",
    purpose: "Turn the approved Cocoon SEO audit into a page-by-page search strategy, information architecture, metadata plan, and growth roadmap.", sourceDocId: "iff-seo-plan",
    md: `# SEO Planning And Execution

**Service:** In Full Flight  ·  **Timing:** 90-day cycle  ·  **Type:** Retainer

## Summary
We turn an approved SEO Audit into search priorities, page and metadata decisions, information architecture, technical and content execution, AI visibility work, reporting, and a 90-day growth roadmap.

## Process
1. **Admin** — Open the client's SEO Audit and confirm its Cocoon crawl, readiness record, and report are complete.
2. **Assistant** — Load the approved URL inventory and findings without requesting a duplicate crawl.
3. **Studio** — Approve priority keywords, intent, volume, difficulty, rank context, and the current-to-proposed page map.
4. **Studio** — Write page-level metadata and approve the proposed information architecture.
5. **Assistant** — Generate the 90-day repair, re-map, restructure, and growth roadmap from the approved decisions.
6. **Admin** — Share the client proposal, create execution tasks, and use each reporting cycle to update the next plan.

## What we do
- Start from the approved SEO Audit, crawl evidence, page decisions, and known technical constraints instead of repeating discovery.
- Research and prioritize search opportunities using relevance, intent, current visibility, volume, difficulty, business value, and available evidence.
- Map every priority keyword or topic to a specific existing or proposed page and decide whether that page should be kept, improved, renamed, moved, consolidated, or created.
- Write page-level search direction, including titles, descriptions, headings, canonical intent, content role, internal links, and required content improvements.
- Plan the information architecture so services, resources, supporting pages, and new opportunities form a coherent search and user journey.
- Execute or coordinate approved technical repairs, page restructuring, content improvements, internal linking, and publishing work in the correct order.
- Improve AIO/GEO readiness through accessible AI crawler paths, answer-first content, clear entities, evidence-backed claims, accurate structured data, and citation monitoring.
- Turn the work into a 90-day roadmap, track delivery and available performance signals, report completed work, and use results to shape the next cycle.

## Questionnaire and source inputs
1. **Approved audit source** — Which Cocoon SEO Audit, crawl inventory, readiness record, and page decisions are approved for this cycle?
2. **Keyword evidence** — Target keyword or query, current URL, current rank or position, search volume, difficulty, and search intent where supplied.
3. **Page-map evidence** — Current URL, proposed or final URL, recommended action, redirect target, canonical, duplicate match, and indexability.
4. **Metadata evidence** — Current and proposed title, meta description, H1, canonical intent, content role, and improvement notes.
5. **Architecture evidence** — Active URL path, crawl depth, internal inlinks, service or resource hierarchy, and proposed destination.
6. **Execution context** — Business priority, page owner, technical constraint, content dependency, approval requirement, reporting source, and cycle timing.
7. **Measurement** — Search Console, analytics, conversions, ecommerce, CRM, call tracking, AI referrals, or another named connected source. Unconnected metrics remain Not supplied.

## Every part we plan, execute, and review
1. Approved technical repairs and unresolved readiness limitations from the SEO Audit.
2. Keyword relevance, intent, current visibility, volume, difficulty, business value, and target-page ownership.
3. Current-to-proposed page map and Keep, Improve, No-index, Delete, Redirect, Consolidate, Move, or New decisions.
4. Titles, descriptions, headings, canonical intent, content role, internal-link targets, and page-level improvements.
5. Site hierarchy, service and resource clusters, supporting pages, new opportunities, and redirect or consolidation instructions.
6. AIO and GEO access, answer readiness, entity clarity, structured data, citation signals, and measurement.
7. Sequenced technical, content, architecture, publishing, QA, measurement, and reporting tasks across the 90-day roadmap.
8. Completed actions, source-backed performance change, unresolved issues, client decisions, and inputs for the next cycle.

## Scoring and decision system
- SEO Planning And Execution does not invent a new strategy score. It carries forward the approved SEO Audit health, readiness statuses, and evidence.
- Keyword rows are prioritized only when the imported record contains a keyword and target page. Rank, volume, difficulty, and intent display their supplied values; missing values remain Not supplied or Unclassified.
- Opportunity visuals position imported volume against imported difficulty. They are visual comparisons, not a hidden composite score or forecast.
- Page actions use the fixed audit decision rules: redirects and dead pages first, then duplicates or canonical conflicts, intentional no-index pages, on-page gaps, and finally healthy Keep pages.
- A page-map record is valid only when its current URL, proposed destination or retained URL, action, reason, and keyword or approved non-keyword purpose are explicit.
- Roadmap readiness is measured by exact action counts by phase, workstream, owner, and status. Destructive or consolidation work stays **Needs approval**; ready work can be imported only after its source decision is approved.
- Cycle performance uses connected measurements compared with the approved baseline. No rank, traffic, conversion, or AI-visibility improvement is generated as a prediction.

## Data processing
1. The approved audit rows and all retained raw columns are loaded directly; the client is not asked to upload the crawl again.
2. Keyword, page-map, metadata, redirect, and architecture views read named imported columns. They do not seed sample keywords, ranks, volumes, or page decisions.
3. Each URL receives the same deterministic action logic used by the audit, then the studio team reviews destinations, business intent, and any destructive change.
4. Active 200 URLs are grouped by path to visualize current information architecture; proposed pages and destinations come from supplied or approved planning fields.
5. The approved decisions are converted into a 90-day sequence and assignable tasks by phase and workstream, with dependencies and approval status retained.
6. Execution updates and connected measurements are persisted against the client cycle. Reporting compares real baseline and current values and feeds the next plan.
7. Client-facing strategy, roadmap, and milestone outputs are reviewed before sharing; internal evidence, uncertain assumptions, and cross-client data remain private.

${PARTNER_ENGINE_ACCESS_POLICY}

## Outputs
- Approved keyword-priority list
- Current-to-proposed page and URL map
- Page-level metadata plan
- Proposed information architecture
- 90-day SEO execution roadmap and client proposal
- Integrated AIO/GEO visibility and measurement plan

## Execution rules
- Do not start planning from assumptions when the Cocoon SEO audit is missing or stale.
- Every keyword must have an intent and a page role; every proposed page must map back to evidence or an approved opportunity.
- Never implement a chat-requested SEO change without studio review and the required approval.
- Log scope and billing decisions in the request trail; do not absorb out-of-scope work into the 90-day cycle silently.
- Keep technical repairs ahead of growth publishing when crawl health or indexability is weak.
- Treat reporting as the input for the next cycle, not as a decorative deliverable.` },
];

// Build the markdown source for a doc.
export function genMd(d: PlaybookSeed): string {
  const sm = SVC_META[d.svc];
  let md = "# " + d.fn + "\n\n**Service:** " + sm.label + "  ·  **Timing:** " + d.dur + "  ·  **Type:** " + d.tag + "\n\n## Summary\n" + (d.summary || d.purpose) + "\n\n## Process\n" + (d.steps || []).map((s, i) => (i + 1) + ". **" + ownerMeta(s.o).label + "** — " + s.t).join("\n") + "\n\n";
  if ((d.outputs || []).length) md += "## Outputs\n" + d.outputs!.map(o => "- " + o).join("\n") + "\n\n";
  if (d.notes) md += "## Notes\n" + d.notes + "\n";
  return md.trim();
}

// Title + purpose from an authored markdown source (for custom playbooks).
export function pbMeta(md: string): { fn: string; purpose: string } {
  const lines = (md || "").split("\n");
  let fn = "Untitled", purpose = "", inSummary = false;
  for (const ln of lines) {
    if (fn === "Untitled" && /^# /.test(ln)) { fn = ln.slice(2).trim(); continue; }
    if (!purpose && /^> /.test(ln)) { purpose = ln.slice(2).trim(); continue; }
    if (/^## /.test(ln)) { inSummary = /summary/i.test(ln); continue; }
    if (inSummary && !purpose && ln.trim()) purpose = ln.trim().replace(/\*\*/g, "");
  }
  return { fn, purpose };
}

// Extract the numbered "## Process" steps (owner + text) from markdown.
export function parseProcess(md: string): { owner: Owner; text: string }[] {
  const lines = (md || "").split("\n");
  let inP = false;
  const steps: { owner: Owner; text: string }[] = [];
  for (const ln of lines) {
    if (/^## /.test(ln)) { inP = /^## Process\s*$/i.test(ln.trim()); continue; }
    if (inP && /^\s*\d+\. /.test(ln)) {
      const t = ln.replace(/^\s*\d+\.\s*/, "");
      const m = /^\*\*([^*]+)\*\*\s*[—–-]\s*(.+)$/.exec(t);
      if (m) steps.push({ owner: m[1].trim().toLowerCase() as Owner, text: m[2].trim() });
      else steps.push({ owner: "", text: t });
    }
  }
  return steps;
}

function stripSection(md: string, name: string): string {
  const lines = (md || "").split("\n");
  const out: string[] = [];
  let skip = false;
  for (const ln of lines) {
    if (/^## /.test(ln)) skip = new RegExp("^##\\s+" + name, "i").test(ln);
    if (!skip) out.push(ln);
  }
  return out.join("\n");
}

// The reader body = everything except the Process section and the Service meta line.
export function readerBody(md: string): string {
  return stripSection(md, "Process").split("\n").filter(ln => !/^\*\*Service:\*\*/.test(ln)).join("\n");
}
