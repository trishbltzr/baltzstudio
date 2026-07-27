import type { Service } from "./types";

export type ProcessId =
  | "brand-audit"
  | "website-audit"
  | "seo-audit"
  | "funnel-build"
  | "website-build"
  | "social-media-operations"
  | "seo-planning-execution";

export type ProcessCategory = "checkup" | "lab" | "retainer";
export type ProcessOwner = "admin" | "studio" | "client" | "assistant" | "shared";
export type ProcessStageKind = "intake" | "evidence" | "generation" | "review" | "approval" | "delivery" | "handoff";
export type ProcessAccess = "internal" | "client-visible" | "collaborative";
export type ProcessExceptionKind =
  | "missing_access_or_assets"
  | "failed_crawl_or_generation"
  | "unsupported_evidence"
  | "client_inactivity"
  | "rejected_approval"
  | "scope_change"
  | "reopened_stage"
  | "failed_handoff"
  | "overdue_work";

export interface ProcessExceptionPolicy {
  kind: ProcessExceptionKind;
  label: string;
  defaultOwner: ProcessOwner;
  recoveryAction: string;
}

export interface ProcessGateDefinition {
  id: string;
  label: string;
  approvers: ProcessOwner[];
  blocksProgress: boolean;
}

export interface ProcessStageDefinition {
  id: string;
  label: string;
  icon: string;
  kind: ProcessStageKind;
  owner: ProcessOwner;
  access: ProcessAccess;
  requirements: string[];
  outputs: string[];
  nextAction: string;
  note?: string;
  gate?: ProcessGateDefinition;
}

export interface ProcessPresentationStage {
  id: string;
  label: string;
  sourceStageIds: string[];
}

export interface ProcessDefinition {
  id: ProcessId;
  version: number;
  service: Service;
  category: ProcessCategory;
  name: string;
  description: string;
  templateId: string;
  stages: ProcessStageDefinition[];
  clientPresentation?: ProcessPresentationStage[];
  finalOutput: string;
  handoffTarget?: ProcessId;
  exceptionPolicies: ProcessExceptionPolicy[];
}

export const STANDARD_PROCESS_EXCEPTION_POLICIES: ProcessExceptionPolicy[] = [
  { kind: "missing_access_or_assets", label: "Missing access or assets", defaultOwner: "shared", recoveryAction: "Name the missing item, assign who supplies it, and confirm the next review date." },
  { kind: "failed_crawl_or_generation", label: "Failed crawl or generation", defaultOwner: "studio", recoveryAction: "Record the failure, retry safely, or switch to a reviewed manual evidence path." },
  { kind: "unsupported_evidence", label: "Unsupported evidence", defaultOwner: "studio", recoveryAction: "Mark the claim unverified and request a supported source before using it." },
  { kind: "client_inactivity", label: "Client inactivity", defaultOwner: "client", recoveryAction: "Send a specific request with an owner and follow-up date, then escalate or pause scope." },
  { kind: "rejected_approval", label: "Rejected approval", defaultOwner: "studio", recoveryAction: "Capture the rejection reason, agree the revision owner, and reopen only the affected stage." },
  { kind: "scope_change", label: "Scope change", defaultOwner: "admin", recoveryAction: "Record the change, assess timeline and cost, and obtain approval before resuming." },
  { kind: "reopened_stage", label: "Reopened stage", defaultOwner: "shared", recoveryAction: "State why the stage reopened, preserve prior decisions, and define the new exit requirement." },
  { kind: "failed_handoff", label: "Failed handoff", defaultOwner: "studio", recoveryAction: "Restore the source output, confirm the receiving owner, and retry with a traceable handoff record." },
  { kind: "overdue_work", label: "Overdue work", defaultOwner: "studio", recoveryAction: "Reset the due date and notify the owner." },
];

const gate = (id: string, label: string, approvers: ProcessOwner[] = ["studio"]): ProcessGateDefinition => ({
  id,
  label,
  approvers,
  blocksProgress: true,
});

export const PROCESS_DEFINITIONS: Record<ProcessId, ProcessDefinition> = {
  "brand-audit": {
    id: "brand-audit",
    version: 1,
    service: "cocoon",
    category: "checkup",
    name: "Brand Checkup",
    description: "Turn supplied brand sources and verified visual evidence into an approved brand system and action plan.",
    templateId: "cc-brand-audit",
    finalOutput: "Approved brand report and prioritized action plan",
    handoffTarget: "website-build",
    exceptionPolicies: STANDARD_PROCESS_EXCEPTION_POLICIES,
    stages: [
      { id: "discovery", label: "Audit intake", icon: "inbox", kind: "intake", owner: "client", access: "collaborative", requirements: ["Brand sources", "Business context", "Audience and offer"], outputs: ["Normalized brand intake", "Evidence inventory"], nextAction: "Review the supplied brand sources", gate: gate("brand-intake-ready", "Brand intake ready", ["studio"]) },
      { id: "report", label: "Audit report", icon: "chart", kind: "review", owner: "studio", access: "internal", requirements: ["Approved intake", "Verified or explicitly unverified evidence"], outputs: ["Brand system", "Findings", "Evidence status"], nextAction: "Approve the client-safe brand report", gate: gate("brand-report-approved", "Brand report approved") },
      { id: "plan", label: "Action plan", icon: "checklist", kind: "handoff", owner: "shared", access: "client-visible", requirements: ["Approved brand report"], outputs: ["Prioritized recommendations", "Implementation handoff"], nextAction: "Share the plan or start the build", gate: gate("brand-plan-approved", "Brand action plan approved", ["studio", "client"]) },
    ],
  },
  "website-audit": {
    id: "website-audit",
    version: 1,
    service: "cocoon",
    category: "checkup",
    name: "Website Checkup",
    description: "Assess the current website with evidence-backed checks and turn the findings into an approved implementation plan.",
    templateId: "cc-website-audit",
    finalOutput: "Approved website report and implementation priorities",
    handoffTarget: "website-build",
    exceptionPolicies: STANDARD_PROCESS_EXCEPTION_POLICIES,
    stages: [
      { id: "discovery", label: "Audit intake", icon: "inbox", kind: "intake", owner: "client", access: "collaborative", requirements: ["Website URL", "Business context", "Audit scope"], outputs: ["Normalized website intake", "Evidence collection request"], nextAction: "Verify website evidence", gate: gate("website-intake-ready", "Website intake ready", ["studio"]) },
      { id: "report", label: "Audit report", icon: "chart", kind: "review", owner: "studio", access: "internal", requirements: ["Approved intake", "Checklist evidence", "Available Lighthouse evidence"], outputs: ["Evidence-backed scores", "Findings", "Pages audited"], nextAction: "Approve the client-safe website report", gate: gate("website-report-approved", "Website report approved") },
      { id: "plan", label: "Action plan", icon: "checklist", kind: "handoff", owner: "shared", access: "client-visible", requirements: ["Approved website report"], outputs: ["Prioritized recommendations", "Website Builder handoff"], nextAction: "Share the action plan or continue to Website Build", gate: gate("website-plan-approved", "Website action plan approved", ["studio", "client"]) },
    ],
  },
  "seo-audit": {
    id: "seo-audit",
    version: 1,
    service: "cocoon",
    category: "checkup",
    name: "SEO Checkup",
    description: "Turn crawl evidence into approved technical, on-page, architecture, and discovery priorities.",
    templateId: "cc-seo-audit",
    finalOutput: "Approved SEO report, priorities, and execution handoff",
    handoffTarget: "seo-planning-execution",
    exceptionPolicies: STANDARD_PROCESS_EXCEPTION_POLICIES,
    stages: [
      { id: "crawl", label: "Crawl & inventory", icon: "folder", kind: "evidence", owner: "studio", access: "collaborative", requirements: ["Domain, sitemap, or crawler export"], outputs: ["Normalized URL inventory", "Crawl warnings"], nextAction: "Review crawl coverage and limitations", gate: gate("seo-crawl-ready", "Crawl evidence ready", ["studio"]) },
      { id: "audit", label: "Audit findings", icon: "chart", kind: "review", owner: "studio", access: "internal", requirements: ["Approved crawl inventory"], outputs: ["Technical findings", "On-page findings", "Evidence status"], nextAction: "Confirm the material SEO issues", gate: gate("seo-findings-approved", "SEO findings approved") },
      { id: "search", label: "Keywords & pages", icon: "map", kind: "generation", owner: "shared", access: "collaborative", requirements: ["Approved findings", "Known search priorities"], outputs: ["Keyword-to-page decisions", "Content gaps"], nextAction: "Confirm page and search priorities", gate: gate("seo-search-approved", "Keyword and page plan approved", ["studio", "client"]) },
      { id: "report", label: "Report & priorities", icon: "file", kind: "approval", owner: "studio", access: "client-visible", requirements: ["Approved findings", "Approved keyword and page decisions"], outputs: ["Client-safe SEO report", "Prioritized recommendations"], nextAction: "Approve the final SEO report", gate: gate("seo-report-approved", "SEO report approved", ["studio", "client"]) },
      { id: "plan", label: "Action plan", icon: "checklist", kind: "handoff", owner: "shared", access: "client-visible", requirements: ["Approved SEO report"], outputs: ["Execution roadmap", "SEO Planning handoff"], nextAction: "Begin the approved SEO execution cycle", gate: gate("seo-plan-approved", "SEO action plan approved", ["studio", "client"]) },
    ],
    clientPresentation: [
      { id: "crawl", label: "Audit intake", sourceStageIds: ["crawl"] },
      { id: "report", label: "Audit report", sourceStageIds: ["audit", "search", "report"] },
      { id: "plan", label: "Action plan", sourceStageIds: ["plan"] },
    ],
  },
  "funnel-build": {
    id: "funnel-build",
    version: 1,
    service: "wiaw",
    category: "lab",
    name: "Funnel Lab",
    description: "Convert an approved offer and strategy into a reviewed funnel flow, copy direction, wireframe, and development plan.",
    templateId: "ww-funnel-build",
    finalOutput: "Approved funnel development plan and implementation tasks",
    exceptionPolicies: STANDARD_PROCESS_EXCEPTION_POLICIES,
    stages: [
      { id: "discovery", label: "Discovery", icon: "inbox", kind: "intake", owner: "client", access: "collaborative", requirements: ["Objective", "Audience", "Offer", "Primary action"], outputs: ["Approved funnel discovery"], nextAction: "Map the funnel flow", gate: gate("funnel-discovery-approved", "Discovery approved", ["studio", "client"]) },
      { id: "flow", label: "Funnel flow", icon: "funnel", kind: "generation", owner: "assistant", access: "collaborative", requirements: ["Approved discovery"], outputs: ["Page and conversion flow"], nextAction: "Prepare conversion copy", gate: gate("funnel-flow-approved", "Funnel flow approved", ["studio", "client"]) },
      { id: "copy", label: "Copy", icon: "sparkle", kind: "generation", owner: "assistant", access: "collaborative", requirements: ["Approved funnel flow"], outputs: ["Conversion copy direction"], nextAction: "Prepare the wireframe", gate: gate("funnel-copy-approved", "Copy direction approved", ["studio", "client"]) },
      { id: "wireframe", label: "Wireframe", icon: "grid", kind: "review", owner: "studio", access: "collaborative", requirements: ["Approved copy direction"], outputs: ["Selected responsive wireframe"], nextAction: "Prepare the development plan", gate: gate("funnel-wireframe-approved", "Wireframe approved", ["studio", "client"]) },
      { id: "brief", label: "Development plan", icon: "checklist", kind: "handoff", owner: "studio", access: "client-visible", requirements: ["Approved wireframe", "Confirmed integrations and dependencies"], outputs: ["Development plan", "Implementation tasks", "Launch checklist"], nextAction: "Import the approved implementation tasks", gate: gate("funnel-plan-approved", "Development plan approved", ["studio", "client"]) },
    ],
  },
  "website-build": {
    id: "website-build",
    version: 1,
    service: "wiaw",
    category: "lab",
    name: "Website Lab",
    description: "Convert approved source material and audit context into an exact website scope, build-ready brief, and task plan.",
    templateId: "ww-website-build",
    finalOutput: "Approved website brief, sitemap, and implementation tasks",
    exceptionPolicies: STANDARD_PROCESS_EXCEPTION_POLICIES,
    stages: [
      { id: "discovery", label: "Builder intake", icon: "inbox", kind: "intake", owner: "client", access: "collaborative", requirements: ["Source material", "Goals", "Audience", "Exact page scope"], outputs: ["Approved website scope"], nextAction: "Prepare the build-ready brief", gate: gate("website-build-intake-approved", "Website scope approved", ["studio", "client"]) },
      { id: "direction", label: "Build-ready brief", icon: "chart", kind: "review", owner: "studio", access: "collaborative", requirements: ["Approved website scope"], outputs: ["Sitemap", "Page briefs", "Shared design and copy direction"], nextAction: "Convert the approved brief into tasks", gate: gate("website-brief-approved", "Build-ready brief approved", ["studio", "client"]) },
      { id: "tasks", label: "Task plan", icon: "checklist", kind: "handoff", owner: "studio", access: "client-visible", requirements: ["Approved build-ready brief"], outputs: ["Implementation tasks", "Dependencies", "Launch and handoff plan"], nextAction: "Import the approved implementation tasks", gate: gate("website-task-plan-approved", "Website task plan approved", ["studio", "client"]) },
    ],
  },
  "social-media-operations": {
    id: "social-media-operations",
    version: 1,
    service: "iff",
    category: "retainer",
    name: "Social Media Lab",
    description: "Move one isolated monthly content cycle from source material through approval and scheduling.",
    templateId: "iff-social-media",
    finalOutput: "Approved and scheduled monthly content calendar",
    exceptionPolicies: STANDARD_PROCESS_EXCEPTION_POLICIES,
    stages: [
      { id: "brief", label: "Brief", icon: "inbox", kind: "intake", owner: "client", access: "collaborative", requirements: ["Source material", "Channels", "Cadence"], outputs: ["Monthly content brief"], nextAction: "Prepare the monthly content plan", note: "Jump-start from your current posts", gate: gate("social-brief-approved", "Monthly brief approved", ["studio"]) },
      { id: "plan", label: "Content plan", icon: "layers", kind: "generation", owner: "assistant", access: "collaborative", requirements: ["Approved monthly brief"], outputs: ["Content pillars", "Monthly post plan"], nextAction: "Draft the planned posts", note: "Approve the month at a glance", gate: gate("social-plan-approved", "Content plan approved", ["studio", "client"]) },
      { id: "calendar", label: "Posts & calendar", icon: "cal", kind: "approval", owner: "shared", access: "client-visible", requirements: ["Approved content plan"], outputs: ["Approved captions and formats", "Content calendar"], nextAction: "Schedule approved content", note: "Review and approve each post on the month", gate: gate("social-calendar-approved", "Posts and calendar approved", ["studio", "client"]) },
      { id: "schedule", label: "Schedule", icon: "send", kind: "delivery", owner: "studio", access: "client-visible", requirements: ["Approved posts", "Publishing access"], outputs: ["Scheduled posts", "Delivery record"], nextAction: "Begin the next monthly cycle", note: "Ship it or share it" },
    ],
  },
  "seo-planning-execution": {
    id: "seo-planning-execution",
    version: 1,
    service: "iff",
    category: "retainer",
    name: "SEO Planning & Execution",
    description: "Turn an approved SEO audit into a governed 90-day implementation and measurement cycle.",
    templateId: "iff-seo-plan",
    finalOutput: "Completed SEO cycle with measured outcomes and next priorities",
    exceptionPolicies: STANDARD_PROCESS_EXCEPTION_POLICIES,
    stages: [
      { id: "priorities", label: "Approved priorities", icon: "checklist", kind: "intake", owner: "studio", access: "collaborative", requirements: ["Approved SEO audit handoff"], outputs: ["90-day priorities", "Named owners"], nextAction: "Plan the first implementation sprint", gate: gate("seo-cycle-priorities-approved", "SEO cycle priorities approved", ["studio", "client"]) },
      { id: "implementation", label: "Implementation", icon: "settings", kind: "delivery", owner: "studio", access: "collaborative", requirements: ["Approved priorities", "Required access"], outputs: ["Completed technical and content tasks"], nextAction: "Review quality and measurement" },
      { id: "review", label: "Review & measurement", icon: "chart", kind: "review", owner: "shared", access: "client-visible", requirements: ["Completed implementation work", "Available measurement data"], outputs: ["Outcome review", "Unverified measurement gaps"], nextAction: "Approve the next cycle", gate: gate("seo-cycle-reviewed", "SEO cycle reviewed", ["studio", "client"]) },
      { id: "next-cycle", label: "Next cycle", icon: "timeline", kind: "handoff", owner: "shared", access: "client-visible", requirements: ["Reviewed outcomes"], outputs: ["Next priorities", "Carry-forward handoff"], nextAction: "Start the next approved 90-day cycle" },
    ],
  },
};

export function getProcessDefinition(id: ProcessId): ProcessDefinition {
  return PROCESS_DEFINITIONS[id];
}

export function processPipelineStages(id: ProcessId) {
  return PROCESS_DEFINITIONS[id].stages.map(stage => ({ key: stage.id, label: stage.label, icon: stage.icon }));
}

export function processClientStages(id: ProcessId) {
  const process = PROCESS_DEFINITIONS[id];
  return process.clientPresentation || process.stages.map(stage => ({ id: stage.id, label: stage.label, sourceStageIds: [stage.id] }));
}
