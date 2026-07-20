import type { Service } from "./types";

export interface PlaybookDocSection {
  title: string;
  body: string;
  bullets: string[];
}

export interface PlaybookDoc {
  id: string;
  page: Service;
  title: string;
  kicker: string;
  summary: string;
  sourceFiles: string[];
  sections: PlaybookDocSection[];
}

export interface PlaybookPage {
  id: Service;
  label: string;
  summary: string;
}

export const PLAYBOOK_PAGES: PlaybookPage[] = [
  {
    id: "cocoon",
    label: "Cocoon Consult",
    summary: "Brand, Website, and SEO audits with their intake, consult, and next-step scope built in."
  },
  {
    id: "wiaw",
    label: "Winged In A Week",
    summary: "Funnel and Website builds with their approval gates, launch, and handoff built in."
  },
  {
    id: "iff",
    label: "In Full Flight",
    summary: "Social Media Operations and SEO Planning And Execution with requests, reporting, scope controls, and offboarding built in."
  }
];

const SHARED_AI_AND_APPROVAL_SOURCES = [
  "src/lib/openaiServer.ts",
  "src/lib/portalApprovalOutput.ts",
  "src/portal/views/Approvals.tsx",
  "src/portal/access.ts",
];

function deliveryAccessSection(partnerAccess = false): PlaybookDocSection {
  return partnerAccess
    ? {
        title: "Partner access and final delivery",
        body: "Active In Full Flight clients can collaborate directly in the relevant engine while the studio keeps draft, approval, and publish boundaries explicit.",
        bullets: ["Keep every client and delivery cycle isolated.", "Review AI-generated claims, strategy changes, scope, and publish actions.", "Share milestone outputs into Approvals when a durable client decision record is needed.", "Close direct engine access when the active In Full Flight service ends."],
      }
    : {
        title: "Approval-only client delivery",
        body: "Standard clients provide inputs through their workspace but do not open Audit or Builder engines; only the studio-shared final output appears in Approvals.",
        bullets: ["Keep prompts, internal notes, and unreviewed generations private.", "Use internal stage gates before sharing the client-safe final output.", "Attach feedback and the final decision to the Approvals record.", "Unlock direct engine collaboration only when the active service is In Full Flight."],
      };
}

export const PLAYBOOK_DOCS: PlaybookDoc[] = [
  {
    id: "cocoon-brand-audit",
    page: "cocoon",
    title: "Cocoon Consult - Brand Audit Source",
    kicker: "Approved diagnostic contract",
    summary: "The operating source for brand discovery, generated findings, review gates, and Website Builder handoff.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "src/portal/audits/AuditTypeWorkspace.tsx", "src/portal/audits/auditTypeData.ts", "src/portal/audits/strategyAuditPipeline.tsx", "app/api/ai/jumpstart/route.ts", "app/api/ai/generate-stage/route.ts", ...SHARED_AI_AND_APPROVAL_SOURCES],
    sections: [
      { title: "Execution contract", body: "Run guided discovery, generate from approved evidence, review the six focus areas, and preserve the result in the builder handoff.", bullets: ["Foundation, positioning, messaging and voice, visual identity, brand system, and priorities are required coverage.", "AI drafts require studio review.", "The guided consult and next-step scope live inside this audit instead of separate Intake or Proposal playbooks.", "Approved insights move into Website Builder without duplicate discovery."] },
      { title: "Questionnaire, scoring, and processing", body: "The manual enumerates every live Brand Audit question, accepted source, assessment area, evidence state, generation step, review gate, and handoff rule.", bullets: ["Use only Verified strength, Verified gap, Unverified, or Not applicable for material conclusions.", "Calculate evidence coverage from verified applicable criteria and keep the result Provisional below 75%.", "Brand maturity choices remain discovery inputs, not an invented numeric grade.", "Recommendations may come only from sourced Verified gaps.", "Only reviewed findings and the approved action plan become client-facing output."] },
      { title: "AI boundary", body: "The configured Brand Audit generation runs server-side and must execute from recorded sources and decisions rather than inventing brand strategy.", bullets: ["Name assumptions.", "Pause when a missing input changes the recommendation.", "Do not overwrite approved evidence during handoff.", "Never expose provider credentials in the client or browser surface."] },
      deliveryAccessSection(),
    ]
  },
  {
    id: "cocoon-website-audit",
    page: "cocoon",
    title: "Cocoon Consult - Website Audit Source",
    kicker: "Approved diagnostic contract",
    summary: "The operating source for website discovery, checklist evidence, client approvals, action planning, and builder handoff.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "src/portal/audits/Audits.tsx", "src/portal/audits/websiteAuditData.ts", "src/portal/discovery/discoveryData.ts", "src/portal/discovery/auditPipeline.tsx", "src/lib/auditChecklist.ts", "src/lib/renderedWebsiteEvidence.ts", "app/api/ai/generate-stage/route.ts", ...SHARED_AI_AND_APPROVAL_SOURCES],
    sections: [
      { title: "Execution contract", body: "Combine the five discovery sections with content, design, navigation, accessibility, mobile, and SEO or performance evidence.", bullets: ["Keep every run resumable and client-specific.", "Generate all six named deliverables in order.", "Require approval or a written change request at each checkpoint.", "Keep the guided consult and website proposal scope inside the approved audit path."] },
      { title: "Questionnaire, scoring, and processing", body: "The manual renders the live questionnaire and every checklist criterion directly from the canonical question and audit definitions.", bullets: ["Score only passed and failed evidence: passed divided by passed plus failed.", "Exclude Unverified and Not applicable from the score and report evidence coverage separately.", "Treat scores below 75% evidence coverage as Provisional.", "Never complete or display a seeded fallback score when a structured evidence report is unavailable."] },
      { title: "Handoff boundary", body: "The final action plan is the only approved website-build input.", bullets: ["Explain observation, impact, and action for each finding.", "Do not hand off stale or unapproved results.", "Carry page priorities and recommendations into Website Builder."] },
      deliveryAccessSection(),
    ]
  },
  {
    id: "cocoon-seo-audit",
    page: "cocoon",
    title: "Cocoon Consult - SEO Audit Source",
    kicker: "Crawl evidence contract",
    summary: "The operating source for CSV or sitemap ingestion, inventory validation, visual SEO and AIO/GEO evidence, and priority approval.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "src/portal/audits/auditTypeData.ts", "src/portal/builders/SeoProjectWorkspace.tsx", "app/api/seo/sitemap/route.ts", ...SHARED_AI_AND_APPROVAL_SOURCES],
    sections: [
      { title: "Execution contract", body: "Import a real crawler export or crawl sitemap.xml, validate the inventory, then review the visual crawl evidence, prioritized findings, and integrated AIO/GEO discovery layer.", bullets: ["Support Screaming Frog, Semrush, normalized CSV, and sitemap URL sources.", "Show an error when sitemap.xml is unavailable or empty.", "Check index and snippet eligibility, answer extraction, AI crawler access, structured-data evidence, and citation measurement.", "Persist source, time, rows, status, and recrawl state by client.", "Keep the guided consult and retained SEO scope inside the approved audit path."] },
      { title: "Questionnaire, scoring, and processing", body: "The manual records the complete SEO intake, normalized crawl fields, 27 readiness checks, crawl-health formula, AI-readiness formula, page-decision rules, and review path.", bullets: ["Calculate only from imported or crawled rows.", "Leave absent qualitative or connected data Unverified.", "Keep crawl health, coverage measures, AI readiness, and checklist status counts distinct.", "Never seed keywords, rankings, traffic, or a score from the client name."] },
      { title: "Audit boundary", body: "Cocoon documents evidence and priorities; In Full Flight owns the growth plan inside the same SEO Audit workspace.", bullets: ["Do not fabricate crawl rows.", "Keep proposed keywords and architecture in the planning stages, separate from audit evidence.", "Unlock planning only from approved audit data."] },
      deliveryAccessSection(),
    ]
  },
  {
    id: "wiaw-funnel-build",
    page: "wiaw",
    title: "Winged In A Week - Funnel Build Source",
    kicker: "Implementation contract",
    summary: "The operating source for funnel discovery, flow, copy, wireframe, development plan, tasks, proposal, and AI handover.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "src/portal/funnels/Funnels.tsx", "src/portal/discovery/discoveryData.ts", "src/portal/discovery/funnelPipeline.tsx", "app/api/ai/generate-stage/route.ts", ...SHARED_AI_AND_APPROVAL_SOURCES],
    sections: [
      { title: "Execution contract", body: "Read saved client notes first, then preserve the approved objective, audience, offer, action, and page sequence through every generated stage.", bullets: ["Run Flow, Copy, Wireframe, and Development Plan gates in order.", "Turn uploaded copy into landing-page-ready copy without changing the offer.", "Offer five distinct wireframe styles and retain the complete conversion-page section inventory.", "Keep the editable task checklist inside the Development Plan, generate a printable PDF, and persist shared plans into Approvals with a copyable review link.", "Keep design approval, build review, launch, handoff, and continuation inside this service manual."] },
      { title: "Questionnaire, readiness, and processing", body: "The manual renders every live funnel question and documents the exact stage gates used instead of presenting an AI quality score.", bullets: ["Discovery, Flow, Copy, Wireframe, and Development Plan must remain in order.", "Unknown assets and integrations stay To confirm.", "Approved upstream decisions are carried into each later generation.", "Post-launch conversion evidence measures results; the brief does not predict them."] },
      { title: "AI boundary", body: "The AI Funnel Handover is the execution source for downstream generation.", bullets: ["Map pages and sections to the approved flow.", "Map tasks to the approved build phases.", "Label unknown integrations or details instead of inventing them."] },
      deliveryAccessSection(),
    ]
  },
  {
    id: "wiaw-website-build",
    page: "wiaw",
    title: "Winged In A Week - Website Build Source",
    kicker: "Implementation contract",
    summary: "The operating source for audit continuity, full-site scope, homepage approval reference, task planning, and rollout.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "src/portal/builders/WebsiteBuilder.tsx", "src/portal/builders/websiteBuilderData.ts", "app/api/ai/jumpstart/route.ts", "app/api/ai/generate-stage/route.ts", ...SHARED_AI_AND_APPROVAL_SOURCES],
    sections: [
      { title: "Execution contract", body: "Carry approved audit evidence into the build, define the complete website, and use the homepage as the visual-system approval reference.", bullets: ["Inventory every page and template in scope.", "Keep optional copy responsibility explicit.", "Generate and import the implementation task plan after approval.", "Keep design approval, full-site review, launch, handoff, and continuation inside this service manual."] },
      { title: "Questionnaire, readiness, and processing", body: "The live builder and manual share one Website Build questionnaire, including source strategy, exact page scope, copy, functions, systems, and handoff.", bullets: ["Measure page-brief coverage against only the approved sitemap.", "Require 100% brief coverage before page design.", "Reject generated extra pages as scope failures.", "Use approvals and real post-launch measures rather than an invented design-quality score."] },
      { title: "Scope boundary", body: "The homepage preview does not reduce the agreed full-site scope.", bullets: ["Apply the approved system across every listed page.", "Do not repeat discovery already supplied by the audit.", "Keep exclusions, constraints, and rollout milestones visible."] },
      { title: "AI and source boundary", body: "Website generation reads saved client workspace notes first and then runs server-side from the approved website, uploads, pasted notes, or carried audit context.", bullets: ["The client-confirmed page list is the design scope.", "Flag conflicts and unsupported claims instead of guessing.", "Treat a discovered sitemap as migration reference, not automatic scope.", "Never expose provider credentials in the browser or an exported brief."] },
      deliveryAccessSection(),
    ]
  },
  {
    id: "iff-social-media",
    page: "iff",
    title: "In Full Flight - Social Media Operations Source",
    kicker: "Recurring delivery contract",
    summary: "The operating source for monthly source analysis, content planning, cross-posting, post editing, approvals, and scheduling.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "src/portal/builders/SocialMediaBuilder.tsx", "src/portal/components/ClientPickerGrid.tsx", "app/api/ai/social-plan/route.ts", ...SHARED_AI_AND_APPROVAL_SOURCES],
    sections: [
      { title: "Execution contract", body: "Keep every client month isolated and move it through Brief, Content Plan, Posts and Calendar, and Schedule.", bullets: ["Analyze approved source material for voice and pillars.", "Make channels, cadence, cross-posting, format, timing, copy, and approval explicit.", "Use branded platform logos in visual summaries and export the month-specific schedule.", "Keep chat requests, monthly reporting, scope decisions, and offboarding inside this service manual."] },
      { title: "Questionnaire, readiness, and processing", body: "The manual names every source, channel, cadence, post field, art format, approval state, deterministic count, and export field used in a monthly cycle.", bullets: ["Calculate planned posts from selected cadence and duration, capped at 48.", "Use Draft and Approved as the only per-post content states.", "Keep missing performance metrics missing.", "Persist and regenerate only inside the active client-month record."] },
      { title: "Persistence boundary", body: "Regeneration may change a draft, but it must not erase approved month or destination decisions.", bullets: ["Never merge clients or months.", "Preserve selected channels and cross-post destinations.", "Schedule only posts with complete copy, format, art direction, time, and approval."] },
      deliveryAccessSection(true),
    ]
  },
  {
    id: "iff-seo-plan",
    page: "iff",
    title: "In Full Flight - SEO Planning And Execution Source",
    kicker: "90-day growth contract",
    summary: "The operating source for turning approved crawl evidence into keyword, page, metadata, architecture, and execution decisions.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "src/portal/builders/SeoProjectWorkspace.tsx", "app/api/seo/sitemap/route.ts", ...SHARED_AI_AND_APPROVAL_SOURCES],
    sections: [
      { title: "Execution contract", body: "Reuse the approved Cocoon SEO crawl and move through Search Strategy, Page Plan, and Roadmap.", bullets: ["Map every keyword to intent and a page role.", "Record current and proposed URLs plus Keep, Rename, Move, or New decisions.", "Complete metadata, information architecture, and the 90-day Repair, Re-map, Restructure, Grow sequence.", "Keep chat requests, recurring reporting, scope decisions, and offboarding inside this service manual."] },
      { title: "Questionnaire, readiness, and processing", body: "The manual names every audit, keyword, page-map, metadata, architecture, execution, and measurement input carried into the 90-day cycle.", bullets: ["Display only imported rank, volume, difficulty, intent, and measurement values.", "Use fixed page-decision rules and explicit approval for destructive changes.", "Measure roadmap readiness with exact task, phase, owner, and status counts.", "Do not present opportunity visuals as a hidden score or forecast."] },
      { title: "Prerequisite boundary", body: "SEO planning cannot start from an empty or stale audit.", bullets: ["Route missing evidence back to Cocoon SEO Audit.", "Place technical repair before publishing when crawl health is weak.", "Use reporting to shape the next cycle."] },
      deliveryAccessSection(true),
    ]
  },
];

export function findPlaybookDoc(id: string | null | undefined) {
  if (!id) return null;
  return PLAYBOOK_DOCS.find(doc => doc.id === id) ?? null;
}

export function playbookDocsForPage(page: Service) {
  return PLAYBOOK_DOCS.filter(doc => doc.page === page);
}
