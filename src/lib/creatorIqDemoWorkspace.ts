import { AUDIT_CHECKLIST, scoreChecks, type AuditScoreCategory, type AuditScoreResult } from "./auditChecklist";
import type { AiStageResult } from "./aiStageGeneration";
import type { GuidedAuditSession, PersistedAuditDraft } from "./portalAuditPersistence";
import { emptyPortalServiceLifecycle, type PortalClientWorkspace } from "./portalWorkspacePersistence";
import { createPortalProcessHandoff, portalProcessHandoffRecommendations } from "./portalProcessHandoffs";
import { syncPortalProcessRun } from "./portalProcessRuns";

export const CREATOR_IQ_CLIENT_ID = "creator-iq";
export const CREATOR_IQ_CLIENT_NAME = "CreatorIQ";
const UPDATED_AT = "2026-07-21T16:00:00.000Z";

export const CREATOR_IQ_FUNNEL_DEMO_DATA = {
  name: "CreatorIQ Enterprise Demo Funnel",
  objective: "Book calls / applications",
  ftype: "Application → call",
  offer: "An enterprise creator marketing platform for discovery, management, campaign execution, measurement, governance, and payments.",
  persona: "Marketing leaders at global enterprises, agencies, and direct-to-consumer brands running scaled creator or influencer marketing programs.",
  problem: "Fragmented tools, manual workflows, limited creator intelligence, governance risks, and difficulty measuring creator marketing ROI at scale.",
  action: "Request a demo",
  pages: ["Sales page", "Application form", "Booking / calendar", "Thank-you"],
  price: "Custom / quote",
  proof: ["Testimonials", "Case studies"],
  traffic: ["Organic social", "SEO / blog", "Partners / affiliates"],
  emails: "Welcome + delivery",
  payment: "None (lead gen)",
  awareness: "Solution-aware",
  platform: "Custom / other",
  domain: "www.creatoriq.com",
  tracking: ["Google Analytics"],
  need: ["Logo & brand kit", "Testimonials", "Legal / policy pages"],
};

const creatorIqVisuals = {
  status: "verified" as const,
  sourceUrl: "https://www.creatoriq.com/",
  colors: [
    { role: "Primary" as const, hex: "#49A9DE", evidence: "Computed from live CreatorIQ website styles." },
    { role: "Ink" as const, hex: "#041630", evidence: "Computed from live CreatorIQ website text styles." },
    { role: "Secondary" as const, hex: "#ED7A24", evidence: "Computed from live CreatorIQ website styles." },
    { role: "Accent" as const, hex: "#425B76", evidence: "Computed from live CreatorIQ website styles." },
    { role: "Paper" as const, hex: "#FFFFFF", evidence: "Computed from live CreatorIQ website backgrounds." },
  ],
  displayFont: "Proxima Nova",
  bodyFont: "Proxima Nova",
  logoUrl: "https://www.creatoriq.com/hubfs/2025%20Rebrading%20Assets%20%3E%20DO%20NOT%20DELETE/Logos/creatorIQ-logo-new.svg",
};

const brandData = {
  nickname: "CreatorIQ",
  name: "CreatorIQ",
  url: "https://www.creatoriq.com/",
  purpose: "Make creator marketing measurable, governable, and scalable for enterprise teams.",
  audience: "Marketing leaders and creator-program teams at global enterprises, agencies, and consumer brands.",
  offer: "An enterprise creator marketing platform for discovery, management, campaign execution, measurement, governance, and payments.",
  difference: "Creator intelligence, workflows, brand safety, measurement, and payments operate in one enterprise platform.",
  positioning: "Clear and differentiated",
  promise: "Run safer, smarter creator programs with evidence leaders can act on.",
  voice: ["Authoritative", "Direct", "Premium", "Grounded"],
  phrases: "Creator Intelligence Cloud; Powering creator-led growth",
  avoid: "Avoid consumer-influencer clichés, inflated performance claims, and vague AI language.",
  guidelines: "Full guidelines",
  assets: ["Logo suite", "Colour palette", "Typography", "Photography", "Icons", "Templates"],
  visualFeel: ["Technical", "Premium", "Editorial", "Minimal"],
  socialLinks: "https://www.linkedin.com/company/creatoriq\nhttps://www.instagram.com/creatoriq",
  touchpoints: ["Website", "Social media", "Email", "Sales decks", "Documents", "Events", "Advertising"],
  problems: "Product depth can create dense pages; simplify hierarchy and keep the Request a demo path unmistakable.",
  kitNeeds: ["Positioning", "Messaging framework", "Voice guide", "Logo rules", "Colour swatches", "Typography", "Imagery direction", "Social templates"],
  priority: "Create one consistent enterprise story from platform promise through product proof and demo request.",
};

const brandReport: AiStageResult = {
  title: "CreatorIQ brand kit and guidelines",
  summary: "CreatorIQ has a distinctive enterprise identity. The strongest opportunity is to simplify how its intelligence, workflow, governance, and measurement story is expressed across decision-stage touchpoints.",
  brandVisuals: creatorIqVisuals,
  sections: [
    { heading: "Brand foundation", body: "CreatorIQ helps enterprise teams run creator marketing as a measurable growth channel.", bullets: ["Enterprise-grade creator intelligence", "Connected campaign operations", "Governance and measurement in one system"] },
    { heading: "Positioning", body: "Lead with the business outcome, then prove how the unified platform removes operational fragmentation.", bullets: ["Audience: enterprise marketing leaders", "Promise: scalable creator-led growth", "Difference: intelligence plus execution"] },
    { heading: "Messaging and voice", body: "Sound authoritative and specific without becoming dense or overly technical.", bullets: ["Use direct benefit-led headlines", "Translate platform depth into buyer outcomes", "Reserve technical detail for proof"] },
    { heading: "Visual system", body: "The blue-led system, Proxima Nova typography, and restrained orange accent support a credible technology brand.", bullets: ["Primary #49A9DE", "Ink #041630", "Secondary #ED7A24"] },
  ],
  recommendations: [
    { title: "Unify the enterprise story", rationale: "Multiple capabilities compete for attention.", action: "Use one outcome-led platform narrative across the homepage, product pages, and sales material." },
    { title: "Make proof easier to scan", rationale: "Enterprise buyers need confidence before requesting a demo.", action: "Pair each major capability with an approved customer, scale, or measurement proof point." },
  ],
};

const brandPlan: AiStageResult = {
  title: "CreatorIQ brand action plan",
  summary: "Preserve the verified identity while tightening the platform story, proof hierarchy, product language, and cross-channel governance.",
  sections: [
    { heading: "Starting point", body: "Keep the established enterprise positioning and verified visual identity.", bullets: ["Proxima Nova typography", "Blue-led palette", "Authoritative platform voice"] },
    { heading: "Priority 1 — Platform narrative", body: "Turn the full capability set into one clear promise and supporting message hierarchy.", bullets: ["Write one master value proposition", "Map capabilities to buyer outcomes"] },
    { heading: "Priority 2 — Evidence system", body: "Standardize how customer proof, scale, governance, and measurement evidence appear.", bullets: ["Create approved proof modules", "Add sources and permissions"] },
    { heading: "Priority 3 — Product language", body: "Reduce jargon and explain technical value through the decisions it enables.", bullets: ["Build an approved terminology guide", "Rewrite high-friction explanations"] },
    { heading: "Priority 4 — Channel governance", body: "Give website, social, email, and sales teams one practical system to follow.", bullets: ["Create channel examples", "Assign a quarterly brand review"] },
  ],
  recommendations: [
    { title: "Approve the master narrative", rationale: "It governs every downstream asset.", action: "Review the promise, audience, differentiator, and supporting proof with leadership." },
    { title: "Build the proof library", rationale: "Evidence is essential at enterprise decision points.", action: "Collect approved customer stories, metrics, scale facts, and governance evidence." },
  ],
};

const brandSession: GuidedAuditSession = {
  entered: true,
  introReveal: 2,
  data: brandData,
  qIdx: 20,
  questionTotal: 20,
  draft: "",
  stage: 2,
  approved: { discovery: true, report: true, plan: true },
  proposal: true,
  memoryResolved: true,
  aiResults: { report: brandReport, plan: brandPlan },
};

const websiteDirection: AiStageResult = {
  title: "CreatorIQ enterprise website rebuild brief",
  summary: "Build a focused enterprise journey that explains the platform clearly, proves value quickly, and gives every priority audience a direct route to request a demo.",
  sections: [
    { heading: "Build-ready brief", body: "Use the existing website and approved audit as the source of truth.", bullets: ["Source strategy: existing website plus audit handoff", "Main objective: increase qualified demo requests", "Audience: enterprise marketing leaders and creator-program teams", "Primary action: Request a demo", "Platform: Custom / Next.js", "Success measure: qualified demo conversion rate"] },
    { heading: "Final sitemap and page briefs", body: "The scoped pages cover the primary enterprise evaluation journey.", bullets: ["Page · Home — establish the platform promise; show proof; request a demo; rewrite", "Page · Platform — explain the connected system; compare capabilities; request a demo; restructure", "Template · Solutions — connect use cases to outcomes; show evidence; explore solution; rewrite", "Page · Customers — organize approved proof; reduce risk; view case study; migrate", "Page · Resources — support research; surface expertise; browse resources; restructure", "Page · Request a demo — qualify and convert; set expectations; submit request; optimize"] },
    { heading: "Copy and website direction", body: "Use concise outcome-led copy, modular proof, and one consistent demo path across the scoped pages.", bullets: ["Lead with enterprise outcomes before feature depth", "Use reusable capability and proof modules", "Keep navigation and conversion patterns consistent"] },
    { heading: "Development phases and milestones", body: "A focused six-week implementation plan keeps approvals and dependencies visible.", bullets: ["Scope and content preparation (Week 1)", "Design-system approval (Week 2)", "Remaining-page design and build (Weeks 3–4)", "Content population and QA (Week 5)", "Launch and measurement (Week 6)"] },
    { heading: "Approval and handoff", body: "The studio receives the approved sitemap, copy direction, components, integrations, and launch checklist.", bullets: ["CreatorIQ approves claims and proof", "Studio owns UX, copy structure, design, and build", "Analytics and CRM access remain launch dependencies"] },
  ],
  recommendations: [
    { title: "Simplify the homepage decision path", rationale: "Capability density competes with the primary action.", action: "Use one platform promise, three proof-backed outcomes, and repeated demo CTAs." },
    { title: "Create a reusable proof system", rationale: "Evidence should be consistent across solutions.", action: "Design reusable customer, scale, governance, and measurement modules." },
  ],
};

const websiteTasks: AiStageResult = {
  title: "CreatorIQ website implementation plan",
  summary: "Sequence content, UX, design, development, integration, QA, and launch work around the approved six-page scope.",
  sections: [
    { heading: "Content and UX", body: "Prepare the page-level source material and conversion journey.", bullets: ["Approve the master platform narrative", "Map proof to each scoped page", "Finalize the six-page sitemap and redirects"] },
    { heading: "Design and development", body: "Build the reusable system and approved page templates.", bullets: ["Create the responsive component system", "Design and build the six scoped pages", "Connect demo forms and CRM routing"] },
    { heading: "QA and launch", body: "Validate the experience and measurement before release.", bullets: ["Run accessibility and responsive QA", "Verify analytics and conversion events", "Complete launch and post-launch checks"] },
  ],
  recommendations: [],
};

const websiteBuilderSession: GuidedAuditSession = {
  entered: true,
  introReveal: 2,
  data: {
    nickname: "CreatorIQ",
    brandName: "CreatorIQ",
    sourceApproach: "Existing website plus uploaded material",
    url: "https://www.creatoriq.com/",
    sourceSummary: "Preserve verified enterprise proof, product terminology, and established visual identity.",
    goals: ["Generate leads", "Explain services", "Build authority"],
    audience: "Enterprise marketing leaders, agencies, and global creator-program teams.",
    primaryAction: "Request a demo",
    success: "More qualified demo requests and clearer product comprehension.",
    pagesToDesign: "Home\nPlatform\nSolutions template\nCustomers\nResources\nRequest a demo",
    pageBriefs: "Each page should explain one buyer decision and lead naturally toward an approved next step.",
    mustKeep: "Approved case studies, resource URLs, legal pages, and enterprise claims.",
    removePages: "Merge overlapping campaign and legacy solution pages after redirect review.",
    languages: "No",
    features: ["Forms", "Search", "Blog / resources", "Job listings"],
    integrations: "CRM, marketing automation, analytics, consent management, and recruiting.",
    platform: "Custom / Next.js",
    constraints: "Enterprise accessibility, privacy, approved claims, redirects, and analytics continuity.",
    contentSources: ["Existing website copy", "Brand or audit handoff", "New copy to write"],
    copyApproach: "Combine existing and new copy",
    copyNotes: "Request a demo remains the primary conversion action. Use only approved customer and platform claims.",
    contentOwner: "Shared responsibility",
    assets: "Verified brand kit, customer stories, product UI, leadership approval, and legal copy.",
    timeline: "Six-week focused release after content and integration access are approved.",
  },
  qIdx: 25,
  questionTotal: 25,
  draft: "",
  stage: 2,
  approved: { discovery: true, direction: true, tasks: true },
  proposal: true,
  memoryResolved: true,
  aiResults: { direction: websiteDirection, tasks: websiteTasks },
};

const seoRows = [
  ["https://www.creatoriq.com/", 200, "CreatorIQ | Creator Marketing Platform", "CreatorIQ helps enterprise teams scale creator marketing.", "Powering creator-led growth", 1240, 0, 218, "Organization, WebSite"],
  ["https://www.creatoriq.com/platform", 200, "CreatorIQ Platform", "Discover the intelligence and workflows behind CreatorIQ.", "One platform for creator marketing", 980, 1, 94, "SoftwareApplication"],
  ["https://www.creatoriq.com/solutions", 200, "CreatorIQ Solutions", "Explore creator marketing solutions for enterprise teams.", "Solutions for every creator program", 720, 1, 81, "ItemList"],
  ["https://www.creatoriq.com/customers", 200, "CreatorIQ Customers", "See how leading brands scale creator marketing.", "Customer stories", 640, 1, 76, "CollectionPage"],
  ["https://www.creatoriq.com/resources", 200, "Creator Marketing Resources", "Research, guides, and insights for creator marketing leaders.", "Creator marketing resources", 860, 1, 112, "CollectionPage"],
  ["https://www.creatoriq.com/blog", 200, "CreatorIQ Blog", "The latest creator economy research and platform insights.", "Creator marketing insights", 540, 1, 148, "Blog"],
  ["https://www.creatoriq.com/about", 200, "About CreatorIQ", "Learn about CreatorIQ and its mission.", "About CreatorIQ", 420, 1, 62, "Organization"],
  ["https://www.creatoriq.com/book-demo", 200, "Request a CreatorIQ Demo", "See how CreatorIQ can support your creator program.", "Request a demo", 260, 1, 134, "WebPage"],
  ["https://www.creatoriq.com/old-platform", 301, "", "", "", 0, 2, 12, ""],
  ["https://www.creatoriq.com/resources/legacy-report", 404, "", "", "", 0, 3, 4, ""],
].map(([url, statusCode, title, description, h1, words, depth, inlinks, schema]) => ({
  url, statusCode, contentType: "text/html", indexability: Number(statusCode) === 200 ? "Indexable" : "Non-Indexable", title, description, h1,
  canonical: String(url), depth, inlinks, words,
  raw: { "Structured Data Types": schema, "AI Crawler Access": "Allowed" },
}));

const socialPosts = [
  [2, "li", "Creator intelligence", "From creator discovery to measurement: what changes when intelligence and execution share one system?"],
  [5, "ig", "Campaign operations", "A clear look at the workflow behind an enterprise creator campaign."],
  [8, "li", "Measurement", "Three questions every creator marketing dashboard should answer for leadership."],
  [11, "ig", "Brand safety", "Governance should help teams move faster—not create another manual bottleneck."],
  [15, "li", "Customer proof", "How global teams create repeatable creator programs across markets."],
  [18, "ig", "Creator discovery", "Better discovery starts with relevance, brand fit, and evidence—not follower count alone."],
  [22, "li", "Industry insight", "Creator marketing maturity is an operating-model question as much as a channel question."],
  [26, "ig", "Demo pathway", "See how CreatorIQ connects intelligence, execution, governance, and measurement."],
].map(([day, channel, title, caption], index) => ({
  id: `creator-iq-social-${index + 1}`,
  day,
  channel,
  crossPostTo: [],
  pillar: String(title),
  title: String(title),
  caption: String(caption),
  hashtags: "#CreatorMarketing #CreatorEconomy #MarketingTechnology",
  graphicCopy: String(title),
  link: "https://www.creatoriq.com/",
  artDirection: "Use verified CreatorIQ blue, product UI, and concise enterprise data callouts.",
  format: index % 2 ? "Carousel" : "Static image",
  time: index % 2 ? "2:00 PM" : "10:00 AM",
  status: index < 4 ? "approved" : "draft",
}));

export function createCreatorIqDemoWorkspace(): PortalClientWorkspace {
  const brandProcessRun = syncPortalProcessRun(undefined, {
    processId: "brand-audit",
    runId: "brand-audit-creator-iq-demo",
    clientId: CREATOR_IQ_CLIENT_ID,
    clientName: CREATOR_IQ_CLIENT_NAME,
    currentStageId: "plan",
    approvedStageIds: ["discovery", "report", "plan"],
    complete: true,
    updatedAt: UPDATED_AT,
  });
  const websiteHandoff = createPortalProcessHandoff(brandProcessRun, brandData, {
    approvedScope: brandData.kitNeeds,
    includedRecommendations: portalProcessHandoffRecommendations({ report: brandReport, plan: brandPlan }),
    sender: { role: "studio", label: "Trish Baltazar" },
    createdAt: UPDATED_AT,
  });
  const websiteAuditProcessRun = syncPortalProcessRun(undefined, {
    processId: "website-audit",
    runId: "audit-creator-iq-demo",
    clientId: CREATOR_IQ_CLIENT_ID,
    clientName: CREATOR_IQ_CLIENT_NAME,
    currentStageId: "plan",
    approvedStageIds: ["discovery", "report", "plan"],
    complete: true,
    updatedAt: UPDATED_AT,
  });
  const websiteBuilderProcessRun = syncPortalProcessRun(undefined, {
    processId: "website-build",
    runId: "website-builder-creator-iq",
    clientId: CREATOR_IQ_CLIENT_ID,
    clientName: CREATOR_IQ_CLIENT_NAME,
    currentStageId: "tasks",
    approvedStageIds: ["discovery", "direction", "tasks"],
    complete: true,
    updatedAt: UPDATED_AT,
    sourceHandoffId: websiteHandoff?.id,
  });
  return {
    auditTrail: [],
    approvals: [{
      id: "creator-iq-demo-approval",
      clientId: CREATOR_IQ_CLIENT_ID,
      clientName: CREATOR_IQ_CLIENT_NAME,
      title: "CreatorIQ cross-engine output review",
      thumb: "CIQ",
      sent: false,
      outputType: "builder",
      summary: "Website, brand, SEO, funnel, and social outputs are ready to review.",
      sections: [{ heading: "Ready outputs", body: "Pre-seeded demonstration workspace", bullets: ["Website audit", "Brand audit", "SEO audit", "Website builder", "Funnel builder", "Social calendar"] }],
    }],
    proposal: null,
    collaborators: [],
    files: [],
    funnelPlans: [],
    notes: [{ id: "creator-iq-demo-note", text: "Keep the enterprise platform story focused on intelligence, workflow, governance, measurement, and a clear demo path.", author: "Baltz Studio", createdAt: UPDATED_AT }],
    serviceLifecycle: emptyPortalServiceLifecycle(),
    serviceEvents: [],
    aiActions: [],
    brandSystem: {
      colors: creatorIqVisuals.colors.map(color => [color.role, color.hex]),
      fonts: [["Proxima Nova", "Display / Headings", "'Proxima Nova',system-ui,sans-serif"], ["Proxima Nova", "Body / UI", "'Proxima Nova',system-ui,sans-serif"]],
      tone: { traits: ["Authoritative", "Direct", "Premium", "Grounded"], scales: [["Editorial", "Conversational", 42], ["Technical", "Accessible", 62]], avoid: "Consumer-influencer clichés, inflated claims, and vague AI language." },
      logoUrl: creatorIqVisuals.logoUrl || undefined,
      sourceUrl: creatorIqVisuals.sourceUrl || undefined,
      updatedAt: UPDATED_AT,
    },
    brandAudit: { status: "complete", progress: 100, session: { ...brandSession, processRun: brandProcessRun }, updatedAt: UPDATED_AT },
    auditExport: {
      version: 1,
      mode: "studio",
      status: "reviewed",
      brandName: "Baltazar Studio",
      accent: "#d86e76",
      savedAt: UPDATED_AT,
      history: [{ version: 1, mode: "studio", status: "reviewed", brandName: "Baltazar Studio", accent: "#d86e76", savedAt: UPDATED_AT, savedBy: "Trish Baltazar" }],
    },
    engineWork: {
      websiteAudit: { status: "complete", progress: 100, updatedAt: UPDATED_AT, processRun: websiteAuditProcessRun, payload: { source: "creator-iq-demo" } },
      websiteBuilder: { status: "complete", progress: 100, updatedAt: UPDATED_AT, processRun: websiteBuilderProcessRun, payload: { session: { ...websiteBuilderSession, processRun: websiteBuilderProcessRun }, data: websiteBuilderSession.data, aiResults: websiteBuilderSession.aiResults } },
      seoAudit: { status: "ready", progress: 88, updatedAt: UPDATED_AT, payload: { project: { rows: seoRows, sourceType: "Sitemap crawl", sourceName: "https://www.creatoriq.com/sitemap.xml", importedAt: UPDATED_AT, readiness: {} } } },
      socialBuilder: { status: "in_progress", progress: 75, updatedAt: UPDATED_AT, payload: { months: [{ id: "2026-07", monthKey: "2026-07", createdAt: UPDATED_AT, updatedAt: UPDATED_AT, project: { entered: true, sent: false, stage: "calendar", source: "brand", sourceText: "CreatorIQ verified brand system and enterprise platform narrative.", analyzed: true, voice: ["Authoritative", "Direct", "Premium", "Grounded"], pillars: ["Creator intelligence", "Campaign operations", "Measurement", "Brand safety"], channels: ["ig", "li"], weeks: 4, cadence: { ig: 1, tt: 0, li: 1, fb: 0, x: 0, pin: 0, yt: 0 }, posts: socialPosts, selectedPostId: socialPosts[0]?.id || null, savedAt: UPDATED_AT } }] } },
  },
  handoffs: websiteHandoff ? [websiteHandoff] : [],
};
}

function createCreatorIqAuditScore(): AuditScoreResult {
  const failedIds = new Set(["content-04", "design-28", "navigation-17", "accessibility-02", "mobile-03", "seo-11", "seo-18", "seo-20"]);
  const categories: AuditScoreCategory[] = AUDIT_CHECKLIST.map((group, groupIndex) => {
    const checks = group.checks.map((check, index) => {
      const status = failedIds.has(check.id) ? "fail" as const : index % 13 === 12 ? "unverified" as const : "pass" as const;
      return {
        id: check.id,
        label: check.label,
        status,
        evidence: status === "fail" ? "The rendered CreatorIQ page shows a material improvement opportunity for this criterion." : status === "pass" ? "Verified in the rendered CreatorIQ website sample." : "The available public-page sample does not prove this criterion.",
        sourceUrl: "https://www.creatoriq.com/",
      };
    });
    const tally = scoreChecks(checks);
    const issues = checks.filter(check => check.status === "fail").map(check => ({ criterion: check.id, severity: groupIndex < 2 ? "high" as const : "medium" as const, finding: check.evidence, evidence: check.evidence, sourceUrl: check.sourceUrl, fix: `Resolve “${check.label.toLowerCase()}” in the next focused website iteration.` }));
    return { key: group.key, label: group.label, ...tally, scoreFormula: `${tally.passed} passed ÷ (${tally.passed} passed + ${tally.failed} failed) × 100 = ${tally.score}`, target: Math.min(95, Math.max(tally.score, tally.score + 6)), checks, courseOfAction: issues.length ? issues.map(issue => issue.fix).join(" ") : "Preserve the verified strengths and review unverified checks when private analytics or account access is available.", issues, strengths: checks.filter(check => check.status === "pass").slice(0, 3).map(check => check.label) };
  });
  const allChecks = categories.flatMap(category => category.checks);
  const overall = scoreChecks(allChecks).score;
  const verifiedChecks = allChecks.filter(check => check.status === "pass" || check.status === "fail").length;
  const applicableChecks = allChecks.length;
  const evidenceCoverage = Math.round(verifiedChecks / applicableChecks * 100);
  return {
    kind: "audit_score",
    title: "CreatorIQ website audit",
    summary: "CreatorIQ presents a credible enterprise platform with strong visual consistency. The highest-value improvements are a simpler decision path, tighter proof placement, accessible conversion controls, and cleaner technical hygiene.",
    overallScore: overall,
    targetScore: 94,
    evidenceCoverage,
    verifiedChecks,
    applicableChecks,
    coverageThreshold: 75,
    confidence: evidenceCoverage >= 75 ? "reliable" : "provisional",
    pagesReviewed: ["https://www.creatoriq.com/", "https://www.creatoriq.com/platform", "https://www.creatoriq.com/solutions", "https://www.creatoriq.com/customers", "https://www.creatoriq.com/resources", "https://www.creatoriq.com/book-demo"],
    lighthouse: [],
    categories,
    priorities: [
      { title: "Clarify the primary demo path", why: "Dense capability content can compete with the conversion action.", action: "Use one outcome-led CTA hierarchy from hero through proof and final decision sections." },
      { title: "Strengthen proof near decisions", why: "Enterprise buyers need evidence before committing to a demo.", action: "Place approved customer, governance, and measurement proof beside high-intent content." },
      { title: "Resolve accessibility and technical gaps", why: "Conversion and search performance depend on reliable implementation details.", action: "Prioritize contrast, tap targets, broken links, sitemap coverage, and analytics verification." },
    ],
  };
}

export function createCreatorIqWebsiteAuditDraft(): PersistedAuditDraft {
  const report = createCreatorIqAuditScore();
  const plan: AiStageResult = {
    title: "CreatorIQ website action plan",
    summary: "Sequence the verified conversion, proof, accessibility, and technical fixes before expanding the website scope.",
    sections: [
      { heading: "Priority 1 — Conversion path", body: "Make Request a demo the unmistakable action across high-intent pages.", bullets: ["Standardize CTA hierarchy", "Reduce competing choices", "Set clear post-submit expectations"] },
      { heading: "Priority 2 — Enterprise proof", body: "Move approved customer and measurement evidence closer to key decisions.", bullets: ["Create reusable proof modules", "Match proof to solution claims"] },
      { heading: "Priority 3 — Accessibility", body: "Correct contrast, focus, and mobile interaction issues in shared components.", bullets: ["Audit shared controls", "Verify keyboard and touch behavior"] },
      { heading: "Priority 4 — Technical hygiene", body: "Resolve broken URLs, sitemap gaps, and measurement verification.", bullets: ["Fix or redirect broken links", "Validate analytics and sitemap coverage"] },
    ],
    recommendations: [
      { title: "Start with shared components", rationale: "One fix improves every page using the component.", action: "Correct CTA, proof, accessibility, and metadata patterns in the design system first." },
      { title: "Rerun after launch", rationale: "The improvements need evidence.", action: "Repeat the audit and compare the verified score, coverage, and conversion signals." },
    ],
  };
  const guidedSession: GuidedAuditSession = {
    entered: true,
    introReveal: 2,
    data: { name: CREATOR_IQ_CLIENT_NAME, url: "https://www.creatoriq.com/", objective: "Increase qualified demo requests", action: "Request a demo", audience: "Enterprise marketing leaders and creator-program teams" },
    qIdx: 15,
    questionTotal: 15,
    draft: "",
    stage: 2,
    approved: { discovery: true, report: true, plan: true },
    proposal: false,
    memoryResolved: true,
    aiResults: { report, plan },
  };
  return {
    run: { id: "audit-creator-iq-demo", clientId: CREATOR_IQ_CLIENT_ID, clientName: CREATOR_IQ_CLIENT_NAME, owner: "Unassigned", subtitle: "Cocoon Consult", runLabel: "Baseline audit", runType: "baseline", sequence: 1, statusLabel: "Report ready", statusTone: "success", stage: "Audit · Delivered", progress: 100, score: report.overallScore, internalScore: report.overallScore, targetScore: report.targetScore, due: "Jul 21", createdAt: UPDATED_AT, completedAt: UPDATED_AT, updatedAt: UPDATED_AT },
    state: { clientId: CREATOR_IQ_CLIENT_ID, buildId: "audit-creator-iq-demo", idx: 0, answers: guidedSession.data, unsure: {}, confirmed: {}, signed: {}, notes: {}, genDone: { report: true, plan: true }, report, guidedSession },
    updatedAt: UPDATED_AT,
  };
}
