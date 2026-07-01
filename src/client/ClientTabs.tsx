import { AlertCircle, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardList, Clock, Compass, CreditCard, Flag, ExternalLink, Eye, FileSearch, FileText, Folder, Globe, LayoutDashboard, Link as LinkIcon, Lock, LockKeyhole, MessageSquare, Paperclip, PenLine, Pencil, Plus, Rocket, Send, Settings, ThumbsDown, ThumbsUp, User, Wand2, X, Zap, type LucideIcon } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import type { AuditPriority, Project, BrandIdentity, ClientNav, GateFeedback, Milestone, MilestoneStatus, Task } from "../types";
import { DashboardSidebar } from "../components/DashboardSidebar";
import { StatGrid } from "../components/StatGrid";
import { allTasksComplete, phaseProgress, phaseProgressMarkers, milestoneProgress, allGates, taskStatusDetail, gateStatusClass, gateStatusLabel, gateStatusDetail, isAuditMilestoneStage, lifecycleStage, auditCategoryLabel, planAccess, projectNextMoves } from "../lib/projectUtils";
import { StatusBadge, MilestoneDot, ProgressBar, Panel, PanelHeader, Btn, RadialGauge, MicroBar, ProgressDots, ProgressRing, progressDotsFromCounts } from "../components/shared";
import { PhaseDetailModal } from "../components/PhaseDetailModal";
import { AccountMenu } from "../components/legal";
import { type MobileNavCenterAction, type MobileNavItem, MobileTabBar } from "../components/mobileNav";
import { deriveClientNotifications, NotificationBell, NotificationsPage } from "../components/notifications";
import { useIsMobile } from "../hooks/use-mobile";
import { FileAssetHub, type FileHubSectionId } from "../components/FileAssetHub";
import { ContractModal } from "../components/ContractModal";
import { MeetingScheduler, type MeetingDetails } from "../components/MeetingScheduler";
import { CocoonAuditPreviewPopup } from "../components/CocoonAuditPreviewPopup";
import { CocoonPrepListPopup } from "../components/CocoonPrepListPopup";
import { CocoonPaymentPreviewPopup } from "../components/CocoonPaymentPreviewPopup";
import { CocoonFinalStepPanel } from "../components/CocoonFinalStepPanel";
import { CocoonStepTracker } from "../components/CocoonStepTracker";
import { CocoonPromptForm } from "../components/CocoonPromptForm";
import { FILE_WORKSPACE_ITEMS, isClientFileHubView } from "../components/fileWorkspace";
import { ActivityDecisionHistory } from "../components/ActivityDecisionHistory";
import { currentDashboardTimestamp, formatDashboardDate } from "../lib/dateDisplay";
import { SHARED_AUDIT_CATEGORIES, SHARED_AUDIT_PAGES } from "../data/mockProjects";

export type OnboardingPrompt = {
  id: string;
  label: string;
  prompt: string;
  type: string;
  kind: "text" | "textarea" | "url" | "checklist";
  placeholder?: string;
  required?: boolean;
  options?: string[];
};

export type OnboardingStep = {
  id: string;
  title: string;
  summary: string;
  tag: "Required" | "Recommended" | "Generated" | "Final";
  icon: typeof ClipboardList;
  prompts: OnboardingPrompt[];
};

function cocoonTierForStage(stage?: string) {
  if (stage === "cocoon-consult") return "Free";
  if (stage === "paid-cocoon") return "Premium";
  return null;
}

export type AnswerValue = string | string[];
export type AnswerState = Record<string, AnswerValue>;

export const ONBOARDING_STORAGE_KEY = "cocoon-onboarding-readiness-v3";
export type OnboardingStorageMode = "default" | "scratch" | "completed";

export function onboardingStorageKey(mode: OnboardingStorageMode = "default") {
  if (mode === "scratch") return `${ONBOARDING_STORAGE_KEY}-scratch`;
  if (mode === "completed") return `${ONBOARDING_STORAGE_KEY}-completed`;
  return ONBOARDING_STORAGE_KEY;
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "brand-core",
    title: "Prepare your brand core",
    summary: "Give Cocoon the story, offer, buyer, and proof behind the brand.",
    tag: "Required",
    icon: PenLine,
    prompts: [
      { id: "origin", label: "Origin", prompt: "What made you start this?", type: "Short story", kind: "textarea", required: true, placeholder: "This started because..." },
      { id: "offer", label: "Offer", prompt: "What do you sell, offer, or help people do?", type: "Plain language", kind: "textarea", required: true, placeholder: "We help..." },
      { id: "buyer", label: "Buyer", prompt: "Who usually comes to you, and what are they carrying?", type: "Context", kind: "textarea", required: true, placeholder: "They usually come to us when..." },
      { id: "proof", label: "Proof", prompt: "What proof shows the work is worth trusting?", type: "Testimonials, results, credentials", kind: "textarea", required: true, placeholder: "The strongest proof is..." },
    ],
  },
  {
    id: "website-scope",
    title: "Map the website scope",
    summary: "Name what the one-week build must include, sell, connect, and launch with.",
    tag: "Required",
    icon: Rocket,
    prompts: [
      { id: "site-goal", label: "Primary goal", prompt: "What should the website make easier for the buyer?", type: "Conversion goal", kind: "textarea", required: true, placeholder: "The site should help people..." },
      { id: "pages", label: "Pages", prompt: "Which pages or sections are needed for launch?", type: "Launch map", kind: "checklist", required: true, options: ["Home", "About", "Services", "Sales page", "Contact", "FAQ", "Testimonials"] },
      { id: "calls-to-action", label: "Calls to action", prompt: "What should visitors do next?", type: "Buttons and next steps", kind: "textarea", required: true, placeholder: "Book a call, buy, inquire, join the list..." },
      { id: "launch-date", label: "Launch timing", prompt: "What date, event, or deadline is the site supporting?", type: "Deadline", kind: "text", required: true, placeholder: "Launch week, campaign date, event date..." },
    ],
  },
  {
    id: "website-material",
    title: "Connect your website material",
    summary: "Add the current site, social links, brand files, content, and references.",
    tag: "Recommended",
    icon: LinkIcon,
    prompts: [
      { id: "current-site", label: "Current site", prompt: "Where can Cocoon review what exists now?", type: "URL", kind: "url", placeholder: "https://yourbrand.com" },
      { id: "social-links", label: "Social links", prompt: "Where can we see how the brand shows up now?", type: "Links", kind: "textarea", placeholder: "Instagram, TikTok, LinkedIn, YouTube..." },
      { id: "assets", label: "Assets", prompt: "What brand material, photos, decks, or copy already exists?", type: "Materials list", kind: "textarea", required: true, placeholder: "Logo files, photos, brand guide, copy doc, testimonials..." },
      { id: "references", label: "References", prompt: "What sites, styles, or examples should shape the direction?", type: "Reference links", kind: "textarea", placeholder: "Links plus what you like about each one..." },
    ],
  },
  {
    id: "retain-improve",
    title: "Mark what stays and what changes",
    summary: "Protect useful brand equity and flag what can be simplified before launch.",
    tag: "Required",
    icon: ClipboardList,
    prompts: [
      { id: "protect", label: "Protect", prompt: "What should stay because it already feels right?", type: "Keep list", kind: "textarea", required: true, placeholder: "Copy, colors, photos, sections, phrases, offers..." },
      { id: "change", label: "Change", prompt: "What is confusing, outdated, missing, or not converting?", type: "Fix list", kind: "textarea", required: true, placeholder: "The part that feels off is..." },
      { id: "non-negotiables", label: "Non-negotiables", prompt: "What must not be missed in the one-week build?", type: "Launch blockers", kind: "textarea", required: true, placeholder: "This must include..." },
    ],
  },
  {
    id: "systems-access",
    title: "Confirm systems and access",
    summary: "Catch technical needs early so the launch does not stall at handoff.",
    tag: "Required",
    icon: FileSearch,
    prompts: [
      { id: "platform", label: "Platform", prompt: "Where will the website be built or hosted?", type: "Build environment", kind: "text", required: true, placeholder: "Shopify, Webflow, Squarespace, WordPress, Vercel..." },
      { id: "integrations", label: "Integrations", prompt: "What tools need to connect before launch?", type: "Systems checklist", kind: "checklist", required: true, options: ["Calendar", "Email list", "Payment link", "CRM", "Analytics", "Forms", "None"] },
      { id: "access", label: "Access", prompt: "Who has login, domain, hosting, email, and tool access?", type: "Access owner", kind: "textarea", required: true, placeholder: "I have access to... / My assistant has..." },
    ],
  },
  {
    id: "strategy-call",
    title: "Plan your next move",
    summary: "Choose the guided review path, then complete the Wise payment step to unlock the booking link.",
    tag: "Final",
    icon: CalendarDays,
    prompts: [
      { id: "review", label: "Review", prompt: "Review the prep checklist and brand audit with Trisha.", type: "40 minutes", kind: "text" },
      { id: "payment", label: "Wise payment", prompt: "Pay for the guided Cocoon Consult audit call through the Wise payment email.", type: "Manual billing", kind: "text" },
      { id: "access", label: "Booking link", prompt: "Unlock the booking link and the 24-hour guidance window.", type: "Next step", kind: "text" },
    ],
  },
];

export type OnboardingSeed = { answers: AnswerState; auditGenerated: boolean };

type PersistedOnboardingState = {
  answers: AnswerState;
  auditGenerated: boolean;
  openStepId: string;
  activePromptIndex: number;
  unsureKeys: string[];
  callScheduled: boolean;
  scheduledMeeting: MeetingDetails | null;
};

function sanitizeAnswers(value: unknown): AnswerState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value).reduce<AnswerState>((next, [key, item]) => {
    if (typeof item === "string") next[key] = item;
    if (Array.isArray(item)) {
      const cleanItems = item.filter((entry): entry is string => typeof entry === "string");
      if (cleanItems.length) next[key] = cleanItems;
    }
    return next;
  }, {});
}

function sanitizeMeetingDetails(value: unknown): MeetingDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Partial<Record<keyof MeetingDetails, unknown>>;
  if (
    typeof item.dateLabel !== "string" ||
    typeof item.startTime !== "string" ||
    typeof item.endTime !== "string" ||
    typeof item.aiNotes !== "boolean"
  ) {
    return null;
  }
  return {
    dateLabel: item.dateLabel,
    startTime: item.startTime,
    endTime: item.endTime,
    aiNotes: item.aiNotes,
  };
}

function readPersistedOnboardingState(storageKey: string): Partial<PersistedOnboardingState> | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    const openStepId = typeof parsed.openStepId === "string" && onboardingSteps.some(step => step.id === parsed.openStepId)
      ? parsed.openStepId
      : undefined;
    const activePromptIndex = typeof parsed.activePromptIndex === "number" && Number.isFinite(parsed.activePromptIndex) && parsed.activePromptIndex >= 0
      ? Math.floor(parsed.activePromptIndex)
      : undefined;
    const unsureKeys = Array.isArray(parsed.unsureKeys)
      ? parsed.unsureKeys.filter((entry): entry is string => typeof entry === "string")
      : undefined;
    return {
      answers: sanitizeAnswers(parsed.answers),
      auditGenerated: parsed.auditGenerated === true,
      openStepId,
      activePromptIndex,
      unsureKeys,
      callScheduled: parsed.callScheduled === true,
      scheduledMeeting: sanitizeMeetingDetails(parsed.scheduledMeeting),
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

function getInitialOnboardingState(devSeed: OnboardingSeed | undefined, storageKey: string): PersistedOnboardingState {
  const saved = readPersistedOnboardingState(storageKey);
  const fallbackStepId = devSeed ? "strategy-call" : onboardingSteps[0].id;
  return {
    answers: saved ? saved.answers ?? {} : devSeed?.answers ?? {},
    auditGenerated: saved?.auditGenerated ?? devSeed?.auditGenerated ?? false,
    openStepId: saved?.openStepId ?? fallbackStepId,
    activePromptIndex: saved?.activePromptIndex ?? 0,
    unsureKeys: saved?.unsureKeys ?? [],
    callScheduled: saved?.callScheduled ?? false,
    scheduledMeeting: saved?.scheduledMeeting ?? null,
  };
}

// Dev-preview helper: builds a "fully answered" onboarding state so the
// dashboard can be jumped straight to the unlocked/guided-audit-call stage
// without clicking through every question by hand. Derives the answer keys
// from `onboardingSteps` itself so it can't drift out of sync with the step
// definitions. The seed is only a fallback: once the dummy workflow has saved
// progress, localStorage wins on reload even if `?seed=onboarding-done` stays
// in the URL.
export function buildOnboardingSeed(): OnboardingSeed {
  const answers: AnswerState = {};
  for (const step of onboardingSteps) {
    if (step.id === "generated-audit" || step.id === "strategy-call") continue;
    for (const prompt of step.prompts) {
      if (!prompt.required) continue;
      answers[`${step.id}.${prompt.id}`] =
        prompt.kind === "checklist" ? [prompt.options?.[0] ?? "Other"] : "Dev preview answer.";
    }
  }
  return { answers, auditGenerated: true };
}


// ─────────────────────────────────────────────
// CLIENT — VIEWS
// ─────────────────────────────────────────────

type OverviewRole = "client" | "admin";

function compactPaymentStatus(workflow: Project["workflow"]) {
  if (!workflow?.payment) return "N/A";
  if (workflow.payment.status === "confirmed") return "confirmed";
  if (workflow.payment.status === "not_required") return "N/A";
  return "pending";
}

function compactBookingDate(workflow: Project["workflow"]) {
  return workflow?.booking.scheduledAt ?? "N/A";
}

function compactAccessWindow(workflow: Project["workflow"]) {
  const access = workflow?.dashboardAccess;
  if (!access) return "N/A";
  if (access.kind === "unlimited") return "Unlimited";
  if (!access.startsAt || !access.endsAt) return "N/A";

  const start = new Date(access.startsAt).getTime();
  const end = new Date(access.endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "N/A";

  const days = Math.max(1, Math.round((end - start) / 86400000));
  return `${days} days`;
}

function SpeedometerGauge({ value, label = "Overall" }: { value: number; label?: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const angle = -90 + (safeValue / 100) * 180;

  return (
    <div className="speedometer-wrap" aria-hidden="true">
      <div className="speedometer-gauge">
        <svg viewBox="0 0 120 74" role="img">
          <path className="speedometer-track" d="M18 60a42 42 0 0 1 84 0" />
          <path className="speedometer-fill" d="M18 60a42 42 0 0 1 84 0" pathLength={100} strokeDasharray={`${safeValue} 100`} />
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "60px 60px" }}>
            <line className="speedometer-needle" x1="60" y1="60" x2="60" y2="25" />
          </g>
          <circle className="speedometer-pin" cx="60" cy="60" r="4.5" />
        </svg>
      </div>
      <strong>{safeValue}%</strong>
      <span>{label}</span>
    </div>
  );
}

export function ClientOverviewTab({ project, onNavChange, role = "client" }: { project: Project; onNavChange: (n: ClientNav) => void; role?: OverviewRole }) {
  const workflow = project.workflow;
  const stage = lifecycleStage(project);
  const currentM = project.milestones.find(m => m.status === "active");
  const totalTasks = project.milestones.flatMap(m => m.phases.flatMap(p => p.tasks));
  const done = totalTasks.filter(t => t.status === "complete").length;
  const pct = Math.round((done / totalTasks.length) * 100);
  const showAuditOverview = role === "client" && isAuditMilestoneStage(project);
  const auditItems = projectAuditCategories(project).flatMap(category => category.items);
  const auditPassing = auditItems.filter(item => item.priority === "low").length;
  const auditPct = auditItems.length ? Math.round((auditPassing / auditItems.length) * 100) : 0;
  const showPremiumCocoonAdmin = role === "admin" && workflow?.stage === "paid-cocoon";
  const showWorkflowStats = showAuditOverview || showPremiumCocoonAdmin;
  const displayPct = showAuditOverview ? auditPct : pct;
  const auditStatusLabel = workflow?.audit.status === "reviewed" ? "Reviewed" : workflow?.audit.status === "stale" ? "Stale" : "Generated and ready for review";
  const workflowStats = showPremiumCocoonAdmin
    ? [
        { label: "Client audit", value: auditStatusLabel, icon: FileSearch },
        { label: "Wise payment", value: compactPaymentStatus(workflow), icon: CreditCard },
        { label: "Booking", value: compactBookingDate(workflow), icon: CalendarDays },
        { label: "Access", value: compactAccessWindow(workflow), icon: Lock },
      ]
    : [
        { label: "Audit Status", value: auditStatusLabel, icon: FileSearch },
        { label: "Started", value: project.startDate, icon: ClipboardList },
        { label: "Next Step", value: workflow?.nextStepLabel ?? "Choose Path", icon: Wand2 },
        { label: "Access", value: workflow?.dashboardAccess.label ?? "Locked", icon: Lock },
      ];
  const dynamicNextMoves = projectNextMoves(project, role);
  const nextMoves = showPremiumCocoonAdmin
    ? [
        { label: "Current task", value: workflow?.nextStepLabel ?? "Book guided Cocoon Consult call" },
        { label: "Waiting on", value: compactBookingDate(workflow) },
        { label: "Up next", value: "Use findings to choose the build path" },
      ]
    : role === "admin"
    ? dynamicNextMoves
    : showAuditOverview
      ? [
          { label: "Now", value: workflow?.audit.status === "stale" ? "Dashboard Deleted" : workflow?.payment.label ?? "Audit Review" },
          { label: "Next", value: workflow?.nextStepLabel ?? "Book guided Cocoon Consult call" },
          { label: "Outcome", value: stage === "deleted" ? "New Consult Required" : "A Clear Build Path" },
        ]
      : dynamicNextMoves;
  const foundationMilestone = project.milestones[0]!;
  const buildMilestone = project.milestones[1]!;
  const launchMilestone = project.milestones[2]!;
  const inFullFlightStatus: MilestoneStatus = launchMilestone.status === "complete" ? "active" : "locked";
  const projectTimelineStages = [
    { id: "cocoon-consult", number: 1, clientLabel: "Cocoon Consult", status: "complete" as MilestoneStatus },
    { ...foundationMilestone, number: 2 },
    { ...buildMilestone, number: 3 },
    { ...launchMilestone, number: 4 },
    { id: "in-full-flight", number: 5, clientLabel: "In Full Flight", status: inFullFlightStatus, marker: "rocket" as const },
  ];
  const projectTimelineEvents = [
    { id: "cocoon-consult", title: "Cocoon Consult", status: "complete" as MilestoneStatus, dateNum: "1", dateMon: "Jun", detail: "Audit · consult call · build path" },
    { id: foundationMilestone.id, title: `Phase 2 — ${foundationMilestone.title}`, status: foundationMilestone.status, dateNum: "3", dateMon: "Jun", detail: "Intake · Audit · Strategy · Copy" },
    { id: buildMilestone.id, title: `Phase 3 — ${buildMilestone.title}`, status: buildMilestone.status, dateNum: "5", dateMon: "Jun", detail: "Design · Build · QA · 2 Approval Gates" },
    { id: launchMilestone.id, title: `Phase 4 — ${launchMilestone.title}`, status: launchMilestone.status, dateNum: "10", dateMon: "Jun", detail: "Launch · DNS · handoff package" },
    { id: "in-full-flight", title: "Phase 5 — In Full Flight", status: inFullFlightStatus, dateNum: "17", dateMon: "Jun", detail: "Post-launch support · optimization · next flight", marker: "rocket" as const },
  ];

  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      <div className="overview-top-grid">
        <div className="welcome-card">
          <div className="welcome-card-main">
            <div className="welcome-card-copy">
              <div className="welcome-kicker">{showPremiumCocoonAdmin ? "Premium Cocoon Admin View" : showAuditOverview ? "Audit Workspace" : role === "admin" ? "Client" : "Welcome Back"}</div>
              <h2>
                {showPremiumCocoonAdmin ? (
                  <>
                    Cocoon Consult <span className="plan-tier-badge plan-tier-badge--premium">Premium</span>
                  </>
                ) : (
                  project.clientName
                )}
              </h2>
              <p>{showPremiumCocoonAdmin ? workflow?.nextStepDetail ?? "Track the paid Cocoon Consult call and premium access window." : showAuditOverview ? workflow?.nextStepDetail ?? "Your Cocoon Consult audit is in progress." : role === "admin" ? `${workflow?.planLabel ?? project.plan?.name ?? "Active plan"} · ${project.platform}` : workflow?.nextStepDetail ?? `Your ${project.platform} website is in progress.`}</p>
              {showPremiumCocoonAdmin && (
                <Btn variant="primary" size="sm" className="welcome-card-cta" onClick={() => onNavChange("notifications")}>
                  Follow up about booking <ArrowRight size={14} />
                </Btn>
              )}
            </div>
            {!showPremiumCocoonAdmin && (
              <div className="welcome-progress-pie" aria-label={`${showAuditOverview ? "Audit" : "Overall"} progress ${displayPct}%`}>
                <SpeedometerGauge value={displayPct} label={showAuditOverview ? "Audit" : "Overall"} />
              </div>
            )}
          </div>
        </div>

        {showWorkflowStats ? (
          <div className="overview-stat-panel">
            <div className="stat-grid">
              {workflowStats.map(c => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="stat-card">
                    <div className="stat-icon"><Icon /></div>
                    <div>
                      <div className="stat-label">{c.label}</div>
                      <div className="stat-value">{c.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <StatGrid project={project} className="overview-stat-panel" />
        )}
      </div>

      <Panel>
        <PanelHeader title={role === "admin" ? "Next moves" : "What's next"} icon={Zap} />
        <div style={{ padding: "0.85rem 1.25rem 1.1rem" }}>
          <div className="overview-next-summary">
            {nextMoves.map(move => (
              <div key={move.label} className={move.action ? "has-action" : ""} data-tooltip={move.value}>
                <span>{move.label}</span>
                <strong>{move.value}</strong>
                {move.action && (
                  <button
                    type="button"
                    className="overview-card-cta"
                    title="Review preview and decide"
                    aria-label="Review preview and decide"
                    onClick={() => move.action && onNavChange(move.action)}
                  >
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <div className={showAuditOverview ? "" : "overview-timeline-activity-grid"}>
        <Panel>
          <PanelHeader title={showAuditOverview ? "Audit timeline" : "Project timeline"} icon={CalendarDays} />

          {/* Stage stepper visual only */}
          <div style={{ padding: "1rem 1.25rem 0.75rem" }}>
            <div className="stage-stepper">
              <div className="stage-track">
                {(showAuditOverview
                  ? [
                      { id: "audit", number: 1, clientLabel: "Audit", status: "complete" as const },
                      { id: "review", number: 2, clientLabel: "Guided Call", status: stage === "cocoon-consult" ? "active" as const : "complete" as const },
                      { id: "path", number: 3, clientLabel: "Build Path", status: stage === "paid-cocoon" ? "active" as const : stage === "deleted" ? "locked" as const : "complete" as const },
                    ]
                  : projectTimelineStages
                ).map((m) => (
                  <div key={m.id} className={`stage-item is-${m.status}`}>
                    <div className={`stage-dot is-${m.status} ${"marker" in m && m.marker ? `has-${m.marker}` : ""}`}>
                      {"marker" in m && m.marker === "rocket" ? <Rocket /> : m.status === "complete" ? <Check /> : <span>{m.number}</span>}
                    </div>
                    <span className="stage-name">{m.clientLabel}</span>
                    <span className="stage-status">
                      {m.status === "complete" ? "Complete" : m.status === "active" ? ("marker" in m && m.marker === "rocket" ? "In flight" : showAuditOverview ? "In review" : "Active") : "Locked"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Milestone events */}
          {(showAuditOverview
            ? [
                { id: "audit-intake", title: "Cocoon Consult audit", status: "complete" as const, dateNum: "3", dateMon: "Jun", detail: "Inputs received · audit generated" },
                { id: "audit-review", title: "Guided Cocoon Consult call", status: stage === "cocoon-consult" ? "active" as const : "complete" as const, dateNum: "5", dateMon: "Jun", detail: workflow?.booking.label ?? "Findings reviewed with next-step recommendations" },
                { id: "audit-path", title: workflow?.nextStepLabel ?? "Choose next path", status: stage === "paid-cocoon" ? "active" as const : stage === "deleted" ? "locked" as const : "complete" as const, dateNum: "10", dateMon: "Jun", detail: workflow?.nextStepDetail ?? "Paid Cocoon · Winged in a Week · In Full Flight" },
              ]
            : projectTimelineEvents
          ).map(({ id, title, status, dateNum, dateMon, detail, ...eventMeta }) => (
            <div key={id} className="timeline-event">
              <div className={`timeline-date is-${status} ${"marker" in eventMeta && eventMeta.marker ? `has-${eventMeta.marker}` : ""}`}>
                {"marker" in eventMeta && eventMeta.marker === "rocket" ? <Rocket /> : (
                  <>
                    <span className="timeline-date-num">{dateNum}</span>
                    <span className="timeline-date-mon">{dateMon}</span>
                  </>
                )}
              </div>
              <div className="timeline-info">
                <div className="timeline-title">{title}</div>
                <div className="timeline-meta">{detail}</div>
              </div>
              <StatusBadge
                status={status === "complete" ? "is-success" : status === "active" ? "is-progress" : "is-locked"}
                label={status === "complete" ? "Complete" : status === "active" ? ("marker" in eventMeta && eventMeta.marker === "rocket" ? "In flight" : showAuditOverview ? "In review" : "Active") : (showAuditOverview ? "Locked" : "Upcoming")}
              />
            </div>
          ))}

          {/* Active milestone progress */}
          {!showAuditOverview && currentM && (() => {
            const tasks = currentM.phases.flatMap(p => p.tasks);
            const completed = tasks.filter(t => t.status === "complete").length;
            const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
            return (
              <div className="milestone-progress-bars">
                <div className="milestone-progress-row">
                  <span className="milestone-progress-label">{currentM.clientLabel}</span>
                  <div className="milestone-progress-track">
                    <div className="milestone-progress-fill is-active" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="milestone-progress-count">{completed}/{tasks.length}</span>
                </div>
              </div>
            );
          })()}
        </Panel>

        {!showAuditOverview && <ActivityDecisionHistory project={project} role={role} showDecisionLog={false} />}
      </div>
    </div>
  );
}

function projectAuditCategories(project: Project) {
  return project.workflow?.audit.categories ?? SHARED_AUDIT_CATEGORIES;
}

function projectAuditPages(project: Project) {
  return project.workflow?.audit.pages ?? SHARED_AUDIT_PAGES;
}

function auditCategoryCompleteCount(items: Array<{ priority: AuditPriority }>) {
  return items.filter(item => item.priority === "low").length;
}

function auditTaskId(categoryIndex: number, itemIndex: number) {
  return `audit-${categoryIndex}-${itemIndex + 1}`;
}

function initialAuditTaskStatuses(project: Project) {
  return projectAuditCategories(project).reduce<Record<string, Task["status"]>>((next, category, categoryIndex) => {
    let activeAssigned = false;
    category.items.forEach((item, itemIndex) => {
      const id = auditTaskId(categoryIndex, itemIndex);
      if (item.priority === "low") {
        next[id] = "complete";
      } else if (!activeAssigned) {
        next[id] = "in_progress";
        activeAssigned = true;
      } else {
        next[id] = "not_started";
      }
    });
    return next;
  }, {});
}

export function ClientMilestonesTab({ project, auditMode = false, onTaskStatusChange, onFinishMilestone }: { project: Project; auditMode?: boolean; onTaskStatusChange?: (taskId: string, status: Task["status"]) => void; onFinishMilestone?: (milestoneId: string) => void }) {
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(() => {
    if (auditMode) return "cocoon-consult";
    const active = project.milestones.find(m => m.status === "active");
    return active?.id ?? null;
  });
  const [selectedPhase, setSelectedPhase] = useState<{ milestoneId: string; phaseId: string } | null>(null);
  const [phaseFiles, setPhaseFiles] = useState<Record<string, string[]>>({});
  const [auditTaskStatuses, setAuditTaskStatuses] = useState<Record<string, Task["status"]>>(() => initialAuditTaskStatuses(project));
  const [auditMilestoneStatuses, setAuditMilestoneStatuses] = useState<Record<string, MilestoneStatus>>({
    "cocoon-consult": "active",
    "cocoon-next-build": "locked",
    "cocoon-next-launch": "locked",
  });

  useEffect(() => {
    if (!auditMode) return;
    setAuditMilestoneStatuses({
      "cocoon-consult": "active",
      "cocoon-next-build": "locked",
      "cocoon-next-launch": "locked",
    });
    setExpandedMilestoneId("cocoon-consult");
    setAuditTaskStatuses(initialAuditTaskStatuses(project));
  }, [auditMode, project.id, project.workflow?.stage]);

  useEffect(() => {
    if (auditMode) return;
    const active = project.milestones.find(m => m.status === "active");
    setExpandedMilestoneId(active?.id ?? null);
  }, [auditMode, project.id, project.workflow?.stage, project.milestones]);

  function toggleMilestone(id: string) {
    setExpandedMilestoneId(prev => prev === id ? null : id);
  }

  function updateAuditTaskStatus(taskId: string, status: Task["status"]) {
    setAuditTaskStatuses(prev => ({ ...prev, [taskId]: status }));
    onTaskStatusChange?.(taskId, status);
  }

  function finishAuditMilestone(milestone: Milestone) {
    const paidCocoonPaywall = project.workflow?.stage === "paid-cocoon" && milestone.id === "cocoon-consult";

    setAuditTaskStatuses(prev => {
      const next = { ...prev };
      milestone.phases.forEach(phase => {
        phase.tasks.forEach(task => {
          next[task.id] = "complete";
        });
      });
      return next;
    });
    const milestoneOrder = ["cocoon-consult", "cocoon-next-build", "cocoon-next-launch"];
    const currentIndex = milestoneOrder.indexOf(milestone.id);
    const nextMilestoneId = milestoneOrder[currentIndex + 1];
    setAuditMilestoneStatuses(prev => ({
      ...prev,
      [milestone.id]: "complete",
      ...(nextMilestoneId && !paidCocoonPaywall ? { [nextMilestoneId]: "active" as MilestoneStatus } : {}),
    }));
    if (paidCocoonPaywall) {
      setExpandedMilestoneId(null);
    } else if (nextMilestoneId) {
      setExpandedMilestoneId(nextMilestoneId);
    }
    onFinishMilestone?.(milestone.id);
  }

  if (auditMode) {
    const auditCategories = projectAuditCategories(project);
    const t = (id: string, title: string, status: Task["status"] = "not_started") =>
      ({ id, title, assignee: "client" as const, status });
    const auditPhase = (phaseId: string, title: string, categoryIndex: number, items: string[]) => ({
      id: phaseId,
      title,
      tasks: items.map((item, index) => t(auditTaskId(categoryIndex, index), item, auditTaskStatuses[auditTaskId(categoryIndex, index)] ?? "not_started")),
    });

    const auditMilestones: Milestone[] = [
      {
        id: "cocoon-consult", number: 1, title: "Foundation", clientLabel: "Foundation", status: auditMilestoneStatuses["cocoon-consult"] ?? "active",
        phases: auditCategories.map((category, index) =>
          auditPhase(`cocoon-consult-${auditCategoryLabel(category.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, category.title, index, category.items.map(item => item.label))
        ),
      },
      {
        id: "cocoon-next-build", number: 2, title: "Design & Build", clientLabel: "Design & Build", status: auditMilestoneStatuses["cocoon-next-build"] ?? "locked",
        phases: [
          { id: "cocoon-next-build-design", title: "2.1 Design", tasks: [
            t("d6-1", "Design homepage"), t("d6-2", "Design Services page"),
            t("d6-3", "Design About page"),
          ]},
          { id: "cocoon-next-build-build", title: "2.2 Build", tasks: [
            t("d7-1", "Build homepage"), t("d7-2", "Build Services page"),
            t("d7-3", "Build About page"),
          ]},
        ],
      },
      {
        id: "cocoon-next-launch", number: 3, title: "Launch", clientLabel: "Launch", status: auditMilestoneStatuses["cocoon-next-launch"] ?? "locked",
        phases: [
          { id: "cocoon-next-launch-prep", title: "3.1 Launch Prep", tasks: [
            t("d8-1", "DNS configuration"), t("d8-2", "Final QA review"),
            t("d8-3", "Go live"),
          ]},
          { id: "cocoon-next-launch-handoff", title: "3.2 Handoff", tasks: [
            t("d9-1", "Handoff package"), t("d9-2", "Training session"),
            t("d9-3", "Post-launch support"),
          ]},
        ],
      },
    ];

    const auditProject = { ...project, milestones: auditMilestones };

    return (
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {selectedPhase && (
          <PhaseDetailModal
            phaseId={selectedPhase.phaseId}
            milestoneId={selectedPhase.milestoneId}
            project={auditProject}
            onClose={() => setSelectedPhase(null)}
            onTaskStatusChange={updateAuditTaskStatus}
            initialFiles={phaseFiles[selectedPhase.phaseId] ?? []}
            onFilesChange={(files) => setPhaseFiles(prev => ({ ...prev, [selectedPhase.phaseId]: files }))}
          />
        )}
        {auditMilestones.map(milestone => {
          const prog = milestoneProgress(milestone);
          const isExpanded = expandedMilestoneId === milestone.id;
          const pct = prog.total === 0 ? 0 : Math.round((prog.done / prog.total) * 100);

          return (
            <div key={milestone.id} className={`milestone-card is-${milestone.status}`}>
              <button
                type="button"
                className={`milestone-header ${milestone.status === "locked" ? "is-locked" : ""}`}
                onClick={() => milestone.status !== "locked" && toggleMilestone(milestone.id)}
              >
                <MilestoneDot status={milestone.status} />
                <span className="milestone-title">{milestone.clientLabel}</span>
                <div className="milestone-progress-wrap">
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}>{prog.done}/{prog.total}</span>
                  <div className="milestone-bar">
                    <div className={`milestone-bar-fill is-${milestone.status}`} style={{ width: `${pct}%` }} />
                  </div>
                  {milestone.status !== "locked" && (
                    isExpanded ? <ChevronDown size={14} style={{ color: "var(--fg-muted)" }} /> : <ChevronRight size={14} style={{ color: "var(--fg-muted)" }} />
                  )}
                  {milestone.status === "locked" && <Lock size={13} style={{ color: "var(--fg-muted)" }} />}
                </div>
              </button>

              {isExpanded && (
                <div className="milestone-body">
                  {milestone.status === "active" && (
                    <div className="milestone-dev-actions">
                      <span>Preview control</span>
                      <button type="button" onClick={() => finishAuditMilestone(milestone)}>
                        Mark milestone finished
                      </button>
                    </div>
                  )}
                  <div className="phase-cards-grid">
                    {milestone.phases.map(phase => {
                      const pp = phaseProgress(phase.tasks);
                      const phaseDone = allTasksComplete(phase.tasks);
                      const shortTitle = phase.title.replace(/^\d+\.\d+\s+/, "");

                      return (
                        <div key={phase.id} className="phase-grid-cell">
                          <div className={`phase-card ${phaseDone ? "is-complete" : ""}`}>
                            <div
                              className="phase-card-header"
                              onClick={() => setSelectedPhase({ milestoneId: milestone.id, phaseId: phase.id })}
                              style={{ cursor: "pointer" }}
                            >
                              <span className="phase-tag">#{phase.title.split(" ")[0]}</span>
                              <span className="phase-card-title">{shortTitle}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {phaseDone
                                  ? <StatusBadge status="is-success" label="Done" size="sm" />
                                  : pp.done > 0
                                  ? <StatusBadge status="is-progress" icon={<ProgressRing value={Math.round((pp.done / pp.total) * 100)} />} label={`${Math.round((pp.done / pp.total) * 100)}%`} detail={taskStatusDetail("in_progress")} size="sm" />
                                  : <StatusBadge status="is-waiting" label="Soon" detail="Hasn't started yet." size="sm" />
                                }
                              </div>
                            </div>
                            <div className="phase-card-footer">
                              <ProgressDots markers={phaseProgressMarkers(phase.tasks)} id={phase.id} />
                              <div className="phase-meta-row">
                                {pp.total > 0 && <span className="phase-meta-item"><Check />{pp.done}/{pp.total}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {selectedPhase && (
        <PhaseDetailModal
          phaseId={selectedPhase.phaseId}
          milestoneId={selectedPhase.milestoneId}
          project={project}
          onClose={() => setSelectedPhase(null)}
          onTaskStatusChange={onTaskStatusChange}
          initialFiles={phaseFiles[selectedPhase.phaseId] ?? []}
          onFilesChange={(files) => setPhaseFiles(prev => ({ ...prev, [selectedPhase.phaseId]: files }))}
        />
      )}
      {project.milestones.map(milestone => {
        const prog = milestoneProgress(milestone);
        const isExpanded = expandedMilestoneId === milestone.id;
        const pct = prog.total === 0 ? 0 : Math.round((prog.done / prog.total) * 100);

        return (
          <div key={milestone.id} className={`milestone-card is-${milestone.status}`}>
            <button
              type="button"
              className={`milestone-header ${milestone.status === "locked" ? "is-locked" : ""}`}
              onClick={() => milestone.status !== "locked" && toggleMilestone(milestone.id)}
            >
              <MilestoneDot status={milestone.status} />
              <span className="milestone-title">{milestone.clientLabel}</span>
              <div className="milestone-progress-wrap">
                <span style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}>{prog.done}/{prog.total}</span>
                <div className="milestone-bar">
                  <div className={`milestone-bar-fill is-${milestone.status}`} style={{ width: `${pct}%` }} />
                </div>
                {milestone.status !== "locked" && (
                  isExpanded ? <ChevronDown size={14} style={{ color: "var(--fg-muted)" }} /> : <ChevronRight size={14} style={{ color: "var(--fg-muted)" }} />
                )}
                {milestone.status === "locked" && <Lock size={13} style={{ color: "var(--fg-muted)" }} />}
              </div>
            </button>

            {isExpanded && (
              <div className="milestone-body">
                {onFinishMilestone && milestone.status === "active" && (
                  <div className="milestone-dev-actions">
                    <span>Preview control</span>
                    <button type="button" onClick={() => onFinishMilestone(milestone.id)}>
                      Mark milestone finished
                    </button>
                  </div>
                )}
                <div className="phase-cards-grid">
                  {milestone.phases.map((phase, phaseIndex) => {
                    const pp = phaseProgress(phase.tasks);
                    const phaseDone = allTasksComplete(phase.tasks);
                    const priorPhasesComplete = milestone.phases.slice(0, phaseIndex).every(p => allTasksComplete(p.tasks));
                    const phaseLocked = milestone.status === "locked" || (!phaseDone && !priorPhasesComplete);
                    const shortTitle = phase.title.replace(/^\d+\.\d+\s+/, "");
                    const phaseFileCount = phaseFiles[phase.id]?.length ?? 0;

                    return (
                      <div key={phase.id} className="phase-grid-cell">
                        <div className={`phase-card ${phaseLocked ? "is-locked" : ""} ${phaseDone ? "is-complete" : ""}`}>
                          <div
                            className="phase-card-header"
                            onClick={() => !phaseLocked && setSelectedPhase({ milestoneId: milestone.id, phaseId: phase.id })}
                            style={{ cursor: phaseLocked ? "default" : "pointer" }}
                          >
                            <span className="phase-tag">#{phase.title.split(" ")[0]}</span>
                            <span className="phase-card-title">{shortTitle}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {phaseDone
                                ? <StatusBadge status="is-success" label="Done" detail={taskStatusDetail("complete")} size="sm" />
                                : pp.done > 0
                                  ? <StatusBadge status="is-progress" icon={<ProgressRing value={Math.round((pp.done / pp.total) * 100)} />} label={`${Math.round((pp.done / pp.total) * 100)}%`} detail={taskStatusDetail("in_progress")} size="sm" />
                                  : <StatusBadge status="is-waiting" label="Soon" detail="Hasn't started yet." size="sm" />
                              }
                            </div>
                          </div>

	                          <div className="phase-card-footer">
	                            <ProgressDots markers={phaseProgressMarkers(phase.tasks)} id={phase.id} />
	                            <div className="phase-meta-row">
                              {phaseFileCount > 0 && (
                                <span className="phase-meta-item">
                                  <Paperclip />{phaseFileCount}
                                </span>
                              )}
	                              {pp.total > 0 && (
	                                <span className="phase-meta-item">
                                  <Check />{pp.done}/{pp.total}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {milestone.number === 3 && milestone.phases.filter(phase => phase.gate).map(phase => {
                    const gate = phase.gate!;
                    return (
                      <div key={gate.id} className="phase-grid-cell">
                        <div className={`phase-card phase-gate-card is-${gate.status} ${gate.status === "locked" ? "is-locked" : ""}`}>
                          <div className="phase-card-header" style={{ cursor: "default" }}>
                            <div className="phase-gate-title-row">
                              <span className="phase-tag">#3.3</span>
                              <span className="phase-card-title">{gate.clientLabel.replace(/\s+—\s+/, " ")}</span>
                            </div>
                            <StatusBadge status={gateStatusClass(gate.status)} label={gateStatusLabel(gate.status)} detail={gateStatusDetail(gate.status)} size="sm" />
                          </div>
                          <div className="phase-card-footer">
                            <ProgressDots
                              markers={gate.status === "approved" ? progressDotsFromCounts(5, 5, false) : progressDotsFromCounts(0, 5, gate.status === "sent" || gate.status === "ready")}
                              id={gate.id}
                            />
                            <div className="phase-meta-row">
                              <span className="phase-meta-item">
                                {gate.status === "locked" ? <Lock /> : <Send />}
                                {gate.status === "locked" ? "Locked" : gateStatusLabel(gate.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {milestone.number !== 3 && milestone.phases.some(p => p.gate) && (
                  <div className="milestone-gates">
                    {milestone.phases.filter(p => p.gate).map(phase => {
                      const gate = phase.gate!;
                      return (
                        <div key={gate.id} className={`gate-block is-${gate.status}`}>
                          <div className="gate-header">
                            <div className="gate-label-row">
                              {gate.status === "locked" ? <Lock size={13} /> : <Send size={13} />}
                              <span className="gate-label">{gate.clientLabel}</span>
                            </div>
                            <StatusBadge status={gateStatusClass(gate.status)} label={gateStatusLabel(gate.status)} detail={gateStatusDetail(gate.status)} size="sm" className="is-shrink-0" />
                          </div>
                          {gate.sentAt && <p className="gate-meta">Sent {formatDashboardDate(gate.sentAt)} · Go to <strong>Tasks</strong> to respond.</p>}
                          {gate.status === "locked" && <p className="gate-meta">Unlocks after {phase.title.replace(/^\d+\.\d+\s+/, "")} is ready.</p>}
                          {gate.status === "approved" && <p className="gate-meta" style={{ color: "var(--success)" }}>Approved — moving forward.</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ClientReviewsTab({ project, onSubmitFeedback }: { project: Project; onSubmitFeedback: (gateId: string, feedback: GateFeedback) => void }) {
  const [forms, setForms] = useState<Record<string, { whatWorked: string; adjustments: string; approved: boolean | null }>>({});
  // Show ALL gates including locked ones so the full review roadmap is visible.
  // Locked gates render in a compact "coming up" state with a hint instead of
  // the full review surface.
  const gates = allGates(project);

  // Group by milestone for a clearer at-a-glance roadmap, especially on mobile
  // where everything stacks.
  const milestones = project.milestones
    .map(m => ({
      milestone: m,
      items: gates.filter(g => g.milestone.id === m.id),
    }))
    .filter(group => group.items.length > 0);

  // Summary chips — Awaiting client decisions get top billing
  const summary = {
    awaiting: gates.filter(g => g.gate.status === "sent").length,
    ready: gates.filter(g => g.gate.status === "ready").length,
    approved: gates.filter(g => g.gate.status === "approved").length,
    revision: gates.filter(g => g.gate.status === "revision").length,
    locked: gates.filter(g => g.gate.status === "locked").length,
  };

  if (gates.length === 0) {
    return (
      <div className="client-reviews-empty">
        No reviews are ready yet.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Roadmap header — at-a-glance counts so the client knows where they are
          in the review cycle without having to scan every card. */}
      <div className="client-reviews-summary">
        <div className="client-reviews-summary-item is-priority">
          <span className="client-reviews-summary-num">{summary.awaiting}</span>
          <span className="client-reviews-summary-label">Waiting On You</span>
        </div>
        <div className="client-reviews-summary-item">
          <span className="client-reviews-summary-num">{summary.approved}</span>
          <span className="client-reviews-summary-label">Approved</span>
        </div>
        <div className="client-reviews-summary-item">
          <span className="client-reviews-summary-num">{summary.revision + summary.ready}</span>
          <span className="client-reviews-summary-label">In Progress</span>
        </div>
        <div className="client-reviews-summary-item is-muted">
          <span className="client-reviews-summary-num">{summary.locked}</span>
          <span className="client-reviews-summary-label">Coming Up</span>
        </div>
      </div>

      {milestones.map(({ milestone, items }) => {
        const groupApproved = items.filter(({ gate }) => gate.status === "approved").length;
        return (
        <div key={milestone.id} className="client-reviews-group">
          <div className="client-reviews-group-header">
            <span className="client-reviews-group-label">M{milestone.number}</span>
            <span className="client-reviews-group-title">{milestone.title}</span>
            <span className="client-reviews-group-progress">{groupApproved} of {items.length} approved</span>
          </div>
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {items.map(({ gate }) => {
        const form = forms[gate.id] ?? { whatWorked: "", adjustments: "", approved: null };
        const isOpen = gate.status === "sent";
        const isResolved = gate.status === "approved" || gate.status === "revision";
        const isLocked = gate.status === "locked";
        const isReady = gate.status === "ready";

        // Locked / ready / waiting gates render as compact preview cards —
        // the full review form only shows when the gate is actually "sent" to
        // the client. This keeps the page scannable while still surfacing the
        // full roadmap.
        if (isLocked || isReady) {
          return (
            <div key={gate.id} className={`client-review-card is-compact ${isLocked ? "is-locked" : "is-ready"}`}>
              <div className="client-review-header">
                <div>
                  <h3>{gate.clientLabel}</h3>
                  <p>{isLocked ? "Unlocks once this phase wraps." : "Studio is preparing this for your review."}</p>
                </div>
                <StatusBadge status={gateStatusClass(gate.status)} label={gateStatusLabel(gate.status)} />
              </div>
            </div>
          );
        }

        return (
          <div key={gate.id} className={`client-review-card ${isOpen ? "is-open" : ""} ${isResolved ? "is-resolved" : ""}`}>
            <div className="client-review-header">
              <div>
                <h3>{gate.clientLabel}</h3>
                {gate.sentAt && <p>Sent {formatDashboardDate(gate.sentAt)}</p>}
              </div>
              <StatusBadge status={gateStatusClass(gate.status)} label={gateStatusLabel(gate.status)} />
            </div>

            {isOpen && (
              <div className="client-review-body">
                <p className="client-review-message">{gate.message}</p>

                {gate.adminNotes && (
                  <div style={{ padding: "0.75rem", background: "oklch(0.97 0.004 50)", borderRadius: "var(--radius)", border: "1px solid var(--border-soft)", fontSize: "var(--text-md)", color: "var(--fg)", lineHeight: 1.55 }}>
                    <div style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.35rem" }}>Notes from studio</div>
                    {gate.adminNotes}
                  </div>
                )}

                <div className="review-steps-row">
                  {/* Step 1 — Review */}
                  {gate.deliverableLink && (
                    <div className="review-step">
                      <div className="review-step-num">1</div>
                      <div className="review-step-body">
                        <div className="review-step-label">Review the design</div>
                        <a href={`https://${gate.deliverableLink}`} target="_blank" rel="noopener noreferrer" className="review-step-link is-primary">
                          <Globe size={12} />
                          Open preview
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Step 2 — Decide */}
                  <div className="review-step">
                    <div className="review-step-num">{gate.deliverableLink ? "2" : "1"}</div>
                    <div className="review-step-body">
                      <div className="review-step-label">Your decision</div>
                      <div className="approval-choice-row">
                        <button type="button" className={`approval-choice is-yes ${form.approved === true ? "is-selected" : ""}`} onClick={() => setForms(prev => ({ ...prev, [gate.id]: { ...form, approved: true } }))}>
                          <ThumbsUp size={14} />Approve
                        </button>
                        <button type="button" className={`approval-choice is-no ${form.approved === false ? "is-selected" : ""}`} onClick={() => setForms(prev => ({ ...prev, [gate.id]: { ...form, approved: false } }))}>
                          <ThumbsDown size={14} />Notes needed
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 — Markup (gated until "Notes needed") */}
                  {gate.adminLinks && gate.adminLinks.length > 0 && (
                    <div className={`review-step ${form.approved !== false ? "is-gated" : ""}`}>
                      <div className="review-step-num">{gate.deliverableLink ? "3" : "2"}</div>
                      <div className="review-step-body">
                        <div className="review-step-label">Mark up changes</div>
                        {gate.adminLinks.map((link, i) => (
                          <a key={i} href={link.url.startsWith("http") ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer" className="review-step-link" tabIndex={form.approved !== false ? -1 : undefined} onClick={form.approved !== false ? (e) => e.preventDefault() : undefined}>
                            <PenLine size={12} />
                            {link.label}
                            <ExternalLink size={10} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit — only after deciding */}
                {form.approved !== null && (
                  <Btn variant="primary" onClick={() => { onSubmitFeedback(gate.id, { whatWorked: "", adjustments: "", approved: form.approved!, submittedAt: currentDashboardTimestamp() }); }}>
                    <Send size={13} />Submit
                  </Btn>
                )}
              </div>
            )}

            {isResolved && (
              <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {gate.status === "approved"
                  ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "var(--success-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)" }}>Approved — thank you!</div>
                        <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", marginTop: "0.1rem" }}>We're moving forward to the next phase.</div>
                      </div>
                    </div>
                  )
                  : (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "var(--warn-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Send size={13} style={{ color: "var(--warn)" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)" }}>Feedback received</div>
                        <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", marginTop: "0.1rem" }}>We're reviewing your notes and will be in touch.</div>
                      </div>
                    </div>
                  )
                }
              </div>
            )}
          </div>
        );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}

export function AdminAuditTab({ project }: { project?: Project } = {}) { return <ClientAuditTab project={project} isAdmin />; }

export function ClientAuditTab({ project, isAdmin = false }: { project?: Project; isAdmin?: boolean } = {}) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [isEditingAudit, setIsEditingAudit] = useState(false);
  const [activeFix, setActiveFix] = useState<string | null>(null);

  const [auditCategories, setAuditCategories] = useState(() =>
    (project?.workflow?.audit.categories ?? SHARED_AUDIT_CATEGORIES).map(category => ({
      category: auditCategoryLabel(category.title),
      items: category.items.map(item => ({ ...item })),
    }))
  );

  useEffect(() => {
    setAuditCategories((project?.workflow?.audit.categories ?? SHARED_AUDIT_CATEGORIES).map(category => ({
      category: auditCategoryLabel(category.title),
      items: category.items.map(item => ({ ...item })),
    })));
  }, [project?.id]);

  // ── Admin-only edit helper: update a single audit item's text/priority ──
  const updateAuditItem = (categoryName: string, itemIndex: number, patch: Partial<{ label: string; value: string; priority: AuditPriority }>) => {
    setAuditCategories(prev => prev.map(cat =>
      cat.category !== categoryName ? cat : {
        ...cat,
        items: cat.items.map((it, i) => i === itemIndex ? { ...it, ...patch } : it),
      }
    ));
  };

  // ── Aggregate stats across all categories ──
  const allItems = auditCategories.flatMap(c => c.items);
  const totalItems = allItems.length;
  const passing = allItems.filter(i => i.priority === "low").length;
  const urgentImportant = allItems.filter(i => i.priority === "urgent-important").length;
  const important = allItems.filter(i => i.priority === "important").length;
  const urgentOnly = allItems.filter(i => i.priority === "urgent").length;
  const toReview = totalItems - passing;
  const healthScore = Math.round((passing / totalItems) * 100);

  const topIssues = allItems.filter(i => i.priority === "urgent-important" || i.priority === "important").slice(0, 5);

  // Keep these groupings identical to the "Critical issues" / "Needs attention" stat
  // card below (urgent-important + urgent = critical, important-only = needs attention)
  // so the numbers agree everywhere on the page.
  const criticalCount = urgentImportant + urgentOnly;
  const needsAttentionCount = important;

  const legendRows = [
    { color: "var(--warn)", label: "Critical", count: criticalCount },
    { color: "var(--fg-muted)", label: "Needs attention", count: needsAttentionCount },
    { color: "var(--border)", label: "Cleared", count: passing },
  ].filter(r => r.count > 0);

  // ── Pages crawled — gives the client visibility into what was actually scanned ──
  const crawledPages = project ? projectAuditPages(project) : SHARED_AUDIT_PAGES;

  // Highest check count across crawled pages — gives each row's microchart a shared scale
  const maxPageChecks = Math.max(...crawledPages.map(p => p.checks));

  const openCategoryData = auditCategories.find(c => c.category === openCategory) ?? null;
  const openCategoryPassCount = openCategoryData ? openCategoryData.items.filter(i => i.priority === "low").length : 0;
  const openCategoryAllGood = openCategoryData ? openCategoryPassCount === openCategoryData.items.length : false;
  const openCategoryScore = openCategoryData ? Math.round((openCategoryPassCount / openCategoryData.items.length) * 100) : 0;

  // Shared input style for admin audit-editing fields
  const auditInp: React.CSSProperties = {
    padding: "0.4rem 0.6rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--surface)",
    color: "var(--fg)", fontSize: "var(--text-base)",
    fontFamily: "inherit", fontWeight: 500,
    outline: "none", width: "100%",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ display: "grid", gap: "1.1rem" }}>
      {/* ── Summary cards — reordered to prioritize "Issues to Review" ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem" }}>
        <Panel>
          <div style={{ padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "1.1rem" }}>
            <RadialGauge value={healthScore} size={68} strokeWidth={6} color="var(--accent)" />
            <div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>Brand audit health</div>
              <div style={{ fontSize: "var(--text-3xl)", fontWeight: 500, color: "var(--fg)", lineHeight: 1.25 }}>{healthScore}%</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>{passing} of {totalItems} checks cleared</div>
            </div>
          </div>

        </Panel>

        {/* Primary action card — emphasized with background to guide user focus */}
        <Panel style={{ boxShadow: "var(--shadow-soft), 0 0 0 1px var(--border-soft)" }}>
          <div style={{ padding: "1.1rem 1.25rem" }}>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "0.3rem" }}>Issues to review</div>
            <div style={{ fontSize: "var(--text-3xl)", fontWeight: 500, color: "var(--fg)", marginBottom: "0.65rem" }}>{toReview}</div>
            <MicroBar segments={legendRows.map(r => ({ value: r.count, color: r.color }))} />
            <div style={{ display: "grid", gap: "0.32rem", marginTop: "0.7rem" }}>
              {legendRows.map(r => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: r.color, flexShrink: 0, display: "inline-block" }} />
                  <span>{r.label}</span>
                  <span style={{ marginLeft: "auto", fontWeight: 500, color: "var(--fg)" }}>{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Pages crawled + Urgent Tasks (side by side) ── */}
      <div style={{ display: "grid", gridTemplateColumns: topIssues.length > 0 ? "repeat(auto-fit, minmax(320px, 1fr))" : "1fr", gap: "1rem", alignItems: "stretch" }}>
        <Panel>
          <PanelHeader title="Pages crawled" icon={Globe} />
          <div>
            {crawledPages.map((page, i) => (
              <div key={page.path} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 1.25rem", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <FileText size={14} style={{ color: "var(--fg-faint)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)" }}>{page.label}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", marginTop: "0.1rem" }}>{page.path} · {page.checks} checks performed</div>
                </div>
                {/* Microchart — checks passed vs. flagged, scaled against the busiest page */}
                <div style={{ width: 64, flexShrink: 0 }}>
                  <MicroBar
                    height={5}
                    segments={[
                      { value: page.checks - page.issues, color: "var(--success)" },
                      { value: page.issues, color: "var(--warn)" },
                      { value: maxPageChecks - page.checks, color: "transparent" },
                    ]}
                  />
                </div>
                {page.issues > 0 ? (
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--warn)", background: "var(--warn-soft)", padding: "0.2rem 0.55rem", borderRadius: "999px", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {page.issues} {page.issues === 1 ? "issue" : "issues"}
                  </span>
                ) : (
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--fg-muted)", background: "var(--surface-alt)", padding: "0.2rem 0.55rem", borderRadius: "999px", flexShrink: 0, whiteSpace: "nowrap" }}>
                    All clear
                  </span>
                )}
              </div>
            ))}
          </div>
        </Panel>

        {topIssues.length > 0 && (
          <Panel className="audit-urgent-panel">
            <PanelHeader title="Urgent Tasks" icon={AlertCircle} action={<span className="audit-urgent-count">{topIssues.length} to fix</span>} />
            <div>
              {topIssues.map((item, i) => {
                const isUrgent = item.priority === "urgent-important";
                const color = isUrgent ? "var(--warn)" : "var(--fg-muted)";
                return (
                  <div key={i} className={`audit-urgent-row ${isUrgent ? "is-critical" : ""}`}>
                    <AlertCircle size={14} style={{ color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)" }}>{item.label}</div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", marginTop: "0.1rem" }}>{item.value}</div>
                      </div>
                      <span className="audit-fix-wrap">
                        <button
                          type="button"
                          className="audit-fix-trigger"
                          onClick={() => setActiveFix(activeFix === `top-${i}` ? null : `top-${i}`)}
                          aria-expanded={activeFix === `top-${i}`}
                          aria-label={`How to fix: ${item.label}`}
                        >
                          How to fix <ChevronRight size={12} />
                        </button>
                        {activeFix === `top-${i}` && (
                          <span className="audit-fix-popover" role="dialog">
                            <strong>{item.label}</strong>
                            <span>{item.value}. Keep the change focused, then re-check this item.</span>
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}
      </div>

      {/* ── Thematic Reports — styled like the Milestones list ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0 0.15rem" }}>
        <ClipboardList size={15} style={{ color: "var(--fg-faint)" }} />
        <h2 style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)", margin: 0 }}>Thematic Reports</h2>
      </div>
      <div className="audit-thematic-grid">
        {auditCategories.map(section => {
          const passCount = section.items.filter(i => i.priority === "low").length;
          const totalCount = section.items.length;
          const allGood = passCount === totalCount;
          const pct = Math.round((passCount / totalCount) * 100);
          const sectionCritical = section.items.filter(i => i.priority === "urgent-important" || i.priority === "urgent").length;
          const sectionAttention = section.items.filter(i => i.priority === "important").length;

          return (
            <div key={section.category} className={`milestone-card ${allGood ? "is-complete" : ""}`}>
              <div style={{ width: "100%", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className={`milestone-dot ${allGood ? "is-complete" : ""}`} style={{
                    width: "0.95rem", height: "0.95rem", borderRadius: "50%",
                    ...(allGood ? {} : { border: "1.25px dashed var(--warn)", background: "transparent" }),
                  }}>
                    {allGood && <Check size={6} />}
                  </span>
                  <span style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)", lineHeight: 1.25 }}>{section.category}</span>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", marginBottom: "0.4rem" }}>
                    <span style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--fg)" }}>{pct}%</span>
                    {!allGood && (
                      <span style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}>· {totalCount - passCount} to fix</span>
                    )}
                  </div>
                  {/* Microchart — breakdown by priority, simplified to 2-tone system */}
                  <MicroBar segments={[
                    { value: sectionCritical + sectionAttention, color: "var(--warn)" },
                    { value: passCount, color: "var(--success)" },
                  ]} />
                </div>

                <button
                  type="button"
                  onClick={() => setOpenCategory(section.category)}
                  style={{
                    alignSelf: "flex-start", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
                    padding: "0.42rem 0.85rem", borderRadius: "0.5rem",
                    border: "none", background: "var(--surface-alt)",
                    color: "var(--fg)", fontSize: "var(--text-sm)", fontWeight: 500,
                    cursor: "pointer", transition: "all 0.15s", marginTop: "0.1rem",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--border)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                  aria-label={`View details for ${section.category}`}
                >
                  <Eye size={12} /> View details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Category checklist modal ── */}
      {openCategoryData && (
        <>
          <div onClick={() => setOpenCategory(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 1000 }} />
          <div onClick={e => e.stopPropagation()} style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            backgroundColor: "var(--surface)", borderRadius: "1rem", border: "1px solid var(--border)",
            width: "90%", maxWidth: "480px", maxHeight: "85vh", overflow: "auto",
            zIndex: 1001, padding: 0, display: "flex", flexDirection: "column",
          }}>
            {/* Sticky top bar */}
            <div style={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.25rem" }}>
              <button onClick={() => setOpenCategory(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", padding: "0.3rem", display: "flex", borderRadius: "0.5rem", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
                aria-label="Close audit category details">
                <X size={18} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>{openCategoryPassCount}/{openCategoryData.items.length} cleared</span>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditingAudit(!isEditingAudit)}
                    style={{
                      background: isEditingAudit ? "var(--accent-soft)" : "none",
                      border: isEditingAudit ? "1px solid var(--accent)" : "1px solid var(--border)",
                      cursor: "pointer",
                      color: isEditingAudit ? "var(--accent)" : "var(--fg-muted)",
                      width: "1.75rem", height: "1.75rem",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: "50%", transition: "all 0.15s", flexShrink: 0,
                    }}
                    onMouseEnter={e => { if (!isEditingAudit) { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--fg)"; }}}
                    onMouseLeave={e => { if (!isEditingAudit) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--fg-muted)"; }}}
                    title={isEditingAudit ? "Done editing" : "Edit audit findings"}
                  >
                    {isEditingAudit ? <Check size={13} /> : <Pencil size={13} />}
                  </button>
                )}
              </div>
            </div>

            {/* Header */}
            <div style={{ padding: "1.25rem 1.5rem 1rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <RadialGauge value={openCategoryScore} size={44} strokeWidth={4} color={openCategoryAllGood ? "var(--success)" : "var(--warn)"} />
              <div>
                <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 500, margin: 0, color: "var(--fg)" }}>{openCategoryData.category}</h2>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", marginTop: "0.15rem" }}>Checklist of items reviewed in this category</div>
              </div>
            </div>

            {/* Checklist */}
            <div style={{ padding: "0 1.5rem 1.25rem" }}>
              {openCategoryData.items.map((item, i) => {
                const isPassing = item.priority === "low";
                const editing = isAdmin && isEditingAudit;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: "0.65rem",
                    padding: "0.6rem 0",
                    borderBottom: i < openCategoryData.items.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <div style={{
                      width: "1.1rem", height: "1.1rem", borderRadius: "50%", flexShrink: 0,
                      border: isPassing ? "1.5px solid var(--success)" : "1.5px dashed var(--warn)",
                      backgroundColor: isPassing ? "var(--success)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: "0.15rem",
                    }}>
                      {isPassing && <Check size={8} style={{ color: "white", strokeWidth: 3 }} />}
                    </div>
                    {editing ? (
                      <div style={{ flex: 1, minWidth: 0, display: "grid", gap: "0.4rem" }}>
                        <input
                          value={item.label}
                          onChange={e => updateAuditItem(openCategoryData.category, i, { label: e.target.value })}
                          placeholder="Finding title"
                          style={auditInp}
                          onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                          onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
                        />
                        <input
                          value={item.value}
                          onChange={e => updateAuditItem(openCategoryData.category, i, { value: e.target.value })}
                          placeholder="Description / detail"
                          style={{ ...auditInp, fontWeight: 400, fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}
                          onFocus={e => e.currentTarget.style.borderColor = "var(--accent)"}
                          onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
                        />
                        <select
                          className="dashboard-select dashboard-select-priority"
                          value={item.priority}
	                          onChange={e => updateAuditItem(openCategoryData.category, i, { priority: e.target.value as AuditPriority })}
                        >
                          <option value="low">Cleared</option>
                          <option value="important">Important</option>
                          <option value="urgent">Needs attention</option>
                          <option value="urgent-important">Critical</option>
                        </select>
                      </div>
                    ) : (
                      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.65rem" }}>
                        <div>
                          <div style={{
                            fontSize: "var(--text-base)", fontWeight: isPassing ? 400 : 500,
                            color: isPassing ? "var(--fg-muted)" : "var(--fg)",
                            textDecoration: isPassing ? "line-through" : "none",
                          }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", marginTop: "0.1rem" }}>{item.value}</div>
                        </div>
                        {!isPassing && (
                          <span className="audit-fix-wrap">
                            <button
                              type="button"
                              className="audit-fix-trigger is-inline"
                              onClick={() => setActiveFix(activeFix === `modal-${i}` ? null : `modal-${i}`)}
                              aria-expanded={activeFix === `modal-${i}`}
                            >
                              How to fix <ChevronRight size={12} />
                            </button>
                            {activeFix === `modal-${i}` && (
                              <span className="audit-fix-popover" role="dialog">
                                <strong>{item.label}</strong>
                                <span>{item.value}. Update the smallest affected area first, then re-run the check.</span>
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────
export function ClientSettingsTab({ tab, ownerName, ownerEmail }: { tab: "notifications" | "general" | "profile"; ownerName?: string; ownerEmail?: string }) {
  const [notifPrefs, setNotifPrefs] = useState({
    gateReviews: true,
    phaseUpdates: true,
    emailDigest: false,
    desktopNotifs: true,
    quietHours: false,
  });
  const [twoFactor, setTwoFactor] = useState(false);
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
  const [displayName, setDisplayName] = useState(ownerName ?? "");
  const [phone, setPhone] = useState("");
  // Business info
  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [industry, setIndustry] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [website, setWebsite] = useState("");
  // Online presence
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const toggleNotif = (k: keyof typeof notifPrefs) => setNotifPrefs(p => ({ ...p, [k]: !p[k] }));

  // Shared sub-components (defined inside so they close over state naturally)
  function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
      <span
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        style={{ flexShrink: 0, width: "2.4rem", height: "1.35rem", borderRadius: "999px", background: on ? "var(--accent)" : "var(--border)", position: "relative", transition: "background 0.18s", cursor: "pointer", display: "inline-block" }}
      >
        <span style={{ position: "absolute", top: "0.175rem", left: on ? "calc(100% - 1.1rem)" : "0.175rem", width: "1rem", height: "1rem", borderRadius: "50%", background: "var(--surface)", transition: "left 0.18s", boxShadow: "var(--shadow-xs)" }} />
      </span>
    );
  }

  function SettingsRow({ label, desc, right, last }: { label: string; desc?: string; right: React.ReactNode; last?: boolean }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 0", borderBottom: last ? "none" : "1px solid var(--border-soft)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: "var(--text-base)", color: "var(--fg)" }}>{label}</div>
          {desc && <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", marginTop: "0.2rem", lineHeight: 1.5 }}>{desc}</div>}
        </div>
        <div style={{ flexShrink: 0 }}>{right}</div>
      </div>
    );
  }

  const panelBody: React.CSSProperties = { paddingTop: 0, paddingRight: "1.5rem", paddingBottom: "1.15rem", paddingLeft: "1.5rem" };
  const panelHead: React.CSSProperties = { paddingTop: "1.25rem", paddingRight: "1.5rem", paddingBottom: "0.1rem", paddingLeft: "1.5rem", borderBottom: "1px solid var(--border-soft)", marginBottom: "0.25rem" };
  const sectionTitle: React.CSSProperties = { fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)", margin: "0 0 0.1rem" };
  const inp: React.CSSProperties = { width: "100%", paddingTop: "0.55rem", paddingRight: "0.85rem", paddingBottom: "0.55rem", paddingLeft: "0.85rem", border: "1px solid var(--border)", borderRadius: "calc(var(--radius) * 0.7)", background: "var(--surface)", color: "var(--fg)", font: "inherit", fontSize: "var(--text-base)", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" };
  const focusAcc = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = "var(--accent)"; };
  const blurBdr = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = "var(--border)"; };
  function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", gridColumn: half ? "span 1" : "span 2" }}>
        <label style={{ fontWeight: 500, fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}>{label}</label>
        {children}
      </div>
    );
  }

  // ── Notifications tab ──
  if (tab === "notifications") return (
    <div style={{ display: "grid", gap: "1.25rem", width: "100%" }}>
      <Panel>
        <div style={panelHead}><h2 style={sectionTitle}>Notify me when…</h2></div>
        <div style={panelBody}>
          <SettingsRow label="Gate review requests" desc="The studio shares a milestone deliverable for your approval." right={<Toggle on={notifPrefs.gateReviews} onToggle={() => toggleNotif("gateReviews")} />} />
          <SettingsRow label="Phase completions" desc="A phase inside your active milestone is marked complete." right={<Toggle on={notifPrefs.phaseUpdates} onToggle={() => toggleNotif("phaseUpdates")} />} last />
        </div>
      </Panel>
      <Panel>
        <div style={panelHead}><h2 style={sectionTitle}>Delivery</h2></div>
        <div style={panelBody}>
          <SettingsRow label="Email digest" desc="A weekly Friday summary of open reviews and project activity." right={<Toggle on={notifPrefs.emailDigest} onToggle={() => toggleNotif("emailDigest")} />} />
          <SettingsRow label="Desktop notifications" desc="Browser push notifications for review requests." right={<Toggle on={notifPrefs.desktopNotifs} onToggle={() => toggleNotif("desktopNotifs")} />} />
          <SettingsRow label="Quiet hours" desc="Mute in-app notifications between 8 PM and 8 AM." right={<Toggle on={notifPrefs.quietHours} onToggle={() => toggleNotif("quietHours")} />} last />
        </div>
      </Panel>
    </div>
  );

  // ── General tab ──
  if (tab === "general") return (
    <div style={{ display: "grid", gap: "1.25rem", width: "100%" }}>
      <Panel>
        <div style={panelHead}><h2 style={sectionTitle}>Appearance</h2></div>
        <div style={panelBody}>
          <SettingsRow
            label="Theme"
            desc="Choose how your client portal looks on this device."
            last
            right={
              <div style={{ display: "flex", gap: "0.35rem" }}>
                {(["light", "dark"] as const).map(opt => (
                  <button key={opt} type="button" onClick={() => setAppearance(opt)} style={{ padding: "0.3rem 0.8rem", borderRadius: "999px", border: "1px solid", borderColor: appearance === opt ? "var(--accent)" : "var(--border)", background: appearance === opt ? "var(--accent-soft)" : "transparent", color: appearance === opt ? "var(--accent)" : "var(--fg-muted)", font: "inherit", fontSize: "var(--text-xs)", fontWeight: 500, cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s" }}>
                    {opt}
                  </button>
                ))}
              </div>
            }
          />
        </div>
      </Panel>
      <Panel>
        <div style={panelHead}><h2 style={sectionTitle}>Security</h2></div>
        <div style={panelBody}>
          <SettingsRow
            label="Two-factor authentication"
            desc="Secure your account with a one-time passcode via SMS or an authenticator app."
            last
            right={<Toggle on={twoFactor} onToggle={() => setTwoFactor(v => !v)} />}
          />
        </div>
      </Panel>
    </div>
  );

  // ── Profile tab ──
  const initials = (displayName || ownerName || "?").slice(0, 2).toUpperCase();
  const INDUSTRIES = [
    "", "E-commerce & Products", "Coaching & Consulting", "Creative & Design Services",
    "Health & Wellness", "Hospitality & Events", "Real Estate & Property",
    "Technology & Software", "Media & Content Creation", "Food & Beverage",
    "Education & Training", "Non-profit", "Other",
  ];
  return (
    <div style={{ display: "grid", gap: "1.25rem", width: "100%", paddingBottom: "1.25rem" }}>

      {/* ── Contact info ── */}
      <Panel>
        <div style={panelHead}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{ width: "3rem", height: "3rem", borderRadius: "50%", background: "linear-gradient(135deg, oklch(0.78 0.11 22), oklch(0.7 0.13 18))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 500, fontSize: "1rem", flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <h2 style={sectionTitle}>{displayName || ownerName || "Your profile"}</h2>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", marginTop: "0.1rem" }}>Client · {ownerEmail}</div>
            </div>
          </div>
        </div>
        <div style={{ ...panelBody, paddingTop: "0.85rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <Field label="Full name">
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Hazel Huang" style={inp} onFocus={focusAcc} onBlur={blurBdr} />
            </Field>
            <Field label="Phone number">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={inp} onFocus={focusAcc} onBlur={blurBdr} />
            </Field>
            <Field label="Email address">
              <input type="email" value={ownerEmail ?? ""} disabled placeholder="—" style={{ ...inp, opacity: 0.55, cursor: "not-allowed" }} />
            </Field>
          </div>
        </div>
      </Panel>

      {/* ── Business information ── */}
      <Panel>
        <div style={panelHead}><h2 style={sectionTitle}>Business information</h2></div>
        <div style={{ ...panelBody, paddingTop: "0.85rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <Field label="Brand / Business name">
              <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="House of Hazel" style={inp} onFocus={focusAcc} onBlur={blurBdr} />
            </Field>
            <Field label="Industry / Business type">
              <select className="dashboard-select dashboard-select-field" value={industry} onChange={e => setIndustry(e.target.value)}>
                {INDUSTRIES.map(opt => <option key={opt} value={opt}>{opt || "Select an industry…"}</option>)}
              </select>
            </Field>
            <Field label="Brand tagline" half={false}>
              <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="A short sentence that captures what you do" style={inp} onFocus={focusAcc} onBlur={blurBdr} />
            </Field>
            <Field label="Business website">
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbrand.com" style={inp} onFocus={focusAcc} onBlur={blurBdr} />
            </Field>
          </div>
        </div>
      </Panel>

      {/* ── Business address ── */}
      <Panel>
        <div style={panelHead}><h2 style={sectionTitle}>Business address</h2></div>
        <div style={{ ...panelBody, paddingTop: "0.85rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <Field label="Street address">
              <input type="text" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder="123 Main St" style={inp} onFocus={focusAcc} onBlur={blurBdr} />
            </Field>
            <Field label="City" half>
              <input type="text" value={addressCity} onChange={e => setAddressCity(e.target.value)} placeholder="Los Angeles" style={inp} onFocus={focusAcc} onBlur={blurBdr} />
            </Field>
            <Field label="State / Province" half>
              <input type="text" value={addressState} onChange={e => setAddressState(e.target.value)} placeholder="CA" style={inp} onFocus={focusAcc} onBlur={blurBdr} />
            </Field>
            <Field label="Country" half>
              <input type="text" value={addressCountry} onChange={e => setAddressCountry(e.target.value)} placeholder="United States" style={inp} onFocus={focusAcc} onBlur={blurBdr} />
            </Field>
          </div>
        </div>
      </Panel>

      {/* ── Online presence ── */}
      <Panel>
        <div style={panelHead}><h2 style={sectionTitle}>Online presence</h2></div>
        <div style={{ ...panelBody, paddingTop: "0.85rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <Field label="Instagram">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--fg-faint)", fontSize: "var(--text-sm)", pointerEvents: "none", userSelect: "none" }}>@</span>
                <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="yourbrand" style={{ ...inp, paddingLeft: "1.75rem" }} onFocus={focusAcc} onBlur={blurBdr} />
              </div>
            </Field>
            <Field label="LinkedIn">
              <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/yourname" style={inp} onFocus={focusAcc} onBlur={blurBdr} />
            </Field>
            <Field label="TikTok">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--fg-faint)", fontSize: "var(--text-sm)", pointerEvents: "none", userSelect: "none" }}>@</span>
                <input type="text" value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="yourbrand" style={{ ...inp, paddingLeft: "1.75rem" }} onFocus={focusAcc} onBlur={blurBdr} />
              </div>
            </Field>
            <Field label="YouTube">
              <input type="url" value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="youtube.com/@yourchannel" style={inp} onFocus={focusAcc} onBlur={blurBdr} />
            </Field>
          </div>
        </div>
      </Panel>

    </div>
  );
}

export function ClientView({ project, onSubmitFeedback, onBrandChange, onTaskStatusChange, onFinishMilestone, onConfirmCocoonPayment, onLogout, cocoonComplete, collaborationLocked, ownerName, ownerEmail, initialNav, devOnboardingSeed, devOnboardingStorageMode = "default" }: { project: Project; onSubmitFeedback: (gateId: string, feedback: GateFeedback) => void; onBrandChange: (b: BrandIdentity) => void; onTaskStatusChange?: (taskId: string, status: Task["status"]) => void; onFinishMilestone?: (milestoneId: string) => void; onConfirmCocoonPayment?: () => void; onLogout: () => void; cocoonComplete?: boolean; collaborationLocked?: boolean; ownerName?: string; ownerEmail?: string; initialNav?: ClientNav; devOnboardingSeed?: OnboardingSeed; devOnboardingStorageMode?: OnboardingStorageMode; }) {
  const access = planAccess(project);
  const isPreCocoon = access.isPreCocoon || cocoonComplete === false;
  const isCollaborationLocked = collaborationLocked ?? access.buildLocked;
  const showAuditMode = access.showAuditMilestones;
  const isDeleted = access.isDeleted;
  const initialClientNav = initialNav === "audit" || initialNav === "support" ? undefined : initialNav;
  const [clientNav, setClientNavRaw] = useState<ClientNav>(initialClientNav ?? (isPreCocoon ? "cocoon" : "overview"));
  const [contractOpen, setContractOpen] = useState(false);
  const pendingReviews = useMemo(() => allGates(project).filter(g => g.gate.status === "sent").length, [project]);

  const canOpenClientNav = (nav: ClientNav) => {
    if (nav === "cocoon") return isPreCocoon;
    if (nav === "overview") return access.overview;
    if (nav === "milestones") return access.milestones;
    if (nav === "reviews") return access.tasks;
    if (nav === "files" || nav === "brand") return access.assets;
    if (nav === "brand-guidelines") return access.brandGuidelines;
    if (nav === "contract") return access.contract;
    if (nav === "notifications") return access.notifications;
    if (nav === "billing") return access.billing;
    if (nav === "support") return access.support;
    if (nav === "settings") return !isDeleted;
    return false;
  };

  const setClientNav = (nav: ClientNav) => {
    if (!canOpenClientNav(nav)) return;
    if (nav === "contract") { setContractOpen(true); return; }
    if (nav === "support") {
      window.dispatchEvent(new CustomEvent("iff-widget:open"));
      return;
    }
    setClientNavRaw(nav);
  };

  // When transitioning from pre → post Cocoon, redirect to Overview
  useEffect(() => {
    if (!isPreCocoon && clientNav === "cocoon") setClientNav("overview");
  }, [isPreCocoon]);
  useEffect(() => {
    if (!canOpenClientNav(clientNav)) {
      setClientNavRaw(isPreCocoon ? "cocoon" : "overview");
    }
  }, [clientNav, isPreCocoon, access.stage]);
  const titles: Record<ClientNav, string> = { cocoon: "Cocoon Consult", overview: "Overview", milestones: "Milestones", reviews: "Tasks", files: "Files", brand: "Files", "brand-guidelines": "Files", contract: "Contract", audit: "Audit", support: "Support", notifications: "Notifications", billing: "Plan & Billing", settings: "Settings" };

  // Notification state lifted here so the Notifications nav page can use it
  const notifications = deriveClientNotifications(project);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const unread = notifications.filter(n => !readIds.has(n.id) && !dismissedIds.has(n.id)).length;
  // Lifted (not local to NotificationsPage) so the account popover's
  // "Notification settings" shortcut can open straight into the settings pane.
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false);
  const [notificationPhaseId, setNotificationPhaseId] = useState<string | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"notifications" | "general" | "profile">("notifications");
  const [cocoonSidebarOpen, setCocoonSidebarOpen] = useState(false);
  const settingsTabs: Array<{ key: "notifications" | "general" | "profile"; label: string; icon: LucideIcon }> = [
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "general", label: "General", icon: Settings },
    { key: "profile", label: "Profile", icon: User },
  ];

  // When pre-Cocoon, always force nav to cocoon
  const activeNav = isPreCocoon ? "cocoon" : clientNav;
  const clientFileHubFocus: FileHubSectionId | undefined = clientNav === "brand" ? "assets" : clientNav === "brand-guidelines" ? "brand-guidelines" : clientNav === "files" ? "assets" : undefined;
  const mobilePlanLabel = project.workflow?.planLabel ?? project.plan?.name ?? "Winged in a Week";

  // ── Mobile bottom-nav (replaces the sidebar at ≤768px) ──
  // Build one ordered list mirroring ClientSidebar's nav rows (minus
  // sections/Account, which now live in the popover) — first 3 become the
  // primary tabs, the rest fall into the "More" sheet. This naturally puts
  // "Cocoon Consult™" first (and everything else locked) for pre-Cocoon users.
  const isMobile = useIsMobile();
  const [assistantOpen, setAssistantOpen] = useState(false);
  useEffect(() => {
    const handleAssistantState = (event: Event) => {
      const detail = (event as CustomEvent<{ isOpen?: boolean }>).detail;
      setAssistantOpen(Boolean(detail?.isOpen));
    };

    window.addEventListener("iff-widget:state", handleAssistantState);
    return () => window.removeEventListener("iff-widget:state", handleAssistantState);
  }, []);
  const toggleInFullFlightAssistant = () => {
    window.dispatchEvent(new CustomEvent("iff-widget:toggle"));
  };
  const openInFullFlightAssistant = () => {
    window.dispatchEvent(new CustomEvent("iff-widget:open"));
  };
  // 4 primary slots (+ "More" appended by MobileTabBar = 5 total).
  // The center slot is the raised AI action, matching the admin mobile shell.
  const clientMobilePrimary: MobileNavItem[] = isPreCocoon
    ? [
        { key: "cocoon",         label: "Home",           icon: Compass },
        { key: "notifications",  label: "Notifications",  icon: Bell, count: unread, locked: true },
        { key: "assistant",      label: "In Full Flight", icon: Plus, locked: true },
        { key: "reviews",        label: "Tasks",          icon: CheckCircle2, locked: true },
      ]
    : [
        { key: "overview",       label: "Home",           icon: LayoutDashboard, locked: !access.overview },
        { key: "notifications",  label: "Notifications",  icon: Bell, count: unread, locked: !access.notifications },
        { key: "assistant",      label: assistantOpen ? "Close In Full Flight" : "In Full Flight", icon: Plus, action: toggleInFullFlightAssistant, toggled: assistantOpen },
        { key: "reviews",        label: "Tasks",          icon: CheckCircle2, count: pendingReviews, locked: !access.tasks },
      ];
  const clientMobileCenterActions: MobileNavCenterAction[] = isPreCocoon
    ? []
    : [
        { key: "files", label: "Files", icon: Folder, action: () => setClientNav("files"), locked: !access.files },
        { key: "support", label: "Support", icon: MessageSquare, action: openInFullFlightAssistant, locked: !access.support },
        { key: "billing", label: "Billing", icon: CreditCard, action: () => setClientNav("billing"), locked: !access.billing },
      ];
  const handleClientNavSelect = (key: string) => setClientNav(key as ClientNav);
  const openNotificationTarget = (phaseId?: string, type?: string) => {
    if (type === "gate_sent") {
      setClientNav("reviews");
      return;
    }
    if (phaseId) {
      setClientNav("milestones");
      setNotificationPhaseId(phaseId);
    } else {
      setClientNav("notifications");
    }
  };

  const clientNavSections = [
    ...(isPreCocoon ? [{ label: "Getting Started", items: [
      { id: "cocoon", label: "Cocoon Consult", icon: Compass, iconSize: 16 },
    ]}] : []),
    { label: "Workspace", items: [
      { id: "overview",   label: "Overview",   icon: LayoutDashboard, locked: !access.overview },
      { id: "reviews",    label: "Tasks",      icon: CheckCircle2, count: pendingReviews, locked: !access.tasks },
    ]},
    { label: "Collaboration", items: [
      { id: "milestones",    label: "Milestones",    icon: Flag, locked: !access.milestones },
      { id: "files",         label: "Files",         icon: Folder,       locked: !access.files, children: FILE_WORKSPACE_ITEMS.map(item => ({
        ...item,
        id: item.id === "assets" ? "brand" : item.id,
        locked: item.id === "assets" ? !access.assets : !access.brandGuidelines,
      })) },
      { id: "support",       label: "Support",       icon: MessageSquare, locked: !access.support },
    ]},
  ];

  return (
    <div className={`client-dashboard-shell ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      {!isMobile && (
        <DashboardSidebar
          activeNav={activeNav}
          onNavChange={nav => setClientNav(nav as ClientNav)}
          navSections={clientNavSections}
          collapsed={sidebarCollapsed}
          onLogout={onLogout}
          brandMark="BS"
          brandName="Baltazar Studio"
          brandSub="Client portal"
          brandPlan={project.workflow?.planLabel ?? project.plan?.name ?? "Winged in a Week"}
          clientProject={project}
          collaborationLocked={isCollaborationLocked}
          onUpgrade={() => setClientNav("billing")}
          footerAvatarLabel={project.clientInitials}
          footerName={project.clientName}
          footerSub={project.clientEmail}
          footerItems={[
            { key: "billing", label: "Plan & Billing", icon: CreditCard,    onClick: () => setClientNav("billing"),      locked: !access.billing },
            { key: "settings", label: "Settings",      icon: Settings,      onClick: () => setClientNav("settings") },
          ]}
          footerShowPrivacyLinks
        />
      )}
      {/* Overflow toggle — sits at the sidebar/workspace boundary, floats above both */}
      {!isMobile && (
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setSidebarCollapsed(c => !c)}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
        </button>
      )}
      <section className="dashboard-workspace">
        <div className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <div className="dashboard-topbar-heading-row">
              <div className="dashboard-topbar-title">{titles[activeNav]}</div>
            </div>
          </div>
          {isMobile && (
            <div className="dashboard-topbar-actions dashboard-topbar-actions--mobile">
              {activeNav === "cocoon" && (
              <button
                type="button"
                className="cocoon-mobile-sidebar-trigger"
                onClick={() => setCocoonSidebarOpen(true)}
                aria-expanded={cocoonSidebarOpen}
              >
                <Compass size={14} />
                <span>Steps</span>
              </button>
              )}
              <AccountMenu
                avatarLabel={ownerName ? ownerName.slice(0, 2).toUpperCase() : project.clientInitials}
                name={ownerName ?? project.clientName}
                subtitle={ownerEmail ?? project.clientEmail}
                onLogout={onLogout}
                showPrivacyLinks
                collapsed
                placement="bottom"
                items={[
                  { key: "settings", label: "Settings", icon: Settings, onClick: () => setClientNav("settings") },
                ]}
              />
            </div>
          )}
          {!isMobile && (
            <NotificationBell
              notifications={notifications}
              readIds={readIds}
              setReadIds={setReadIds}
              dismissedIds={dismissedIds}
              setDismissedIds={setDismissedIds}
              onSubmitFeedback={onSubmitFeedback}
              onViewAll={() => setClientNav("notifications")}
              onOpenNotification={openNotificationTarget}
            />
          )}
        </div>
        {isMobile && !isPreCocoon && (
          <div className="dashboard-mobile-context-strip" aria-label="Workspace context">
            <div className="dashboard-mobile-context-item dashboard-mobile-context-item--plan">
              <span>Plan</span>
              <strong>{mobilePlanLabel}</strong>
            </div>
          </div>
        )}

        {/* Cocoon embed fills the workspace without dashboard-main padding */}
        {activeNav === "cocoon" ? (
          <ClientCocoonEmbedTab
            key={`cocoon-${devOnboardingStorageMode}`}
            devSeed={devOnboardingSeed}
            storageMode={devOnboardingStorageMode}
            onConfirmCocoonPayment={onConfirmCocoonPayment}
            cocoonSidebarOpen={cocoonSidebarOpen}
            onCocoonSidebarOpenChange={setCocoonSidebarOpen}
          />
        ) : (
        <>
          {/* Settings sub-tabbar — mirrors the admin project tabbar pattern */}
          {clientNav === "settings" && (
            <div className="dashboard-tabbar settings-tabbar">
              {settingsTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.key} type="button" className={`dashboard-tab ${settingsTab === tab.key ? "is-active" : ""}`} onClick={() => setSettingsTab(tab.key)}>
                    <Icon size={12} />{tab.label}
                  </button>
                );
              })}
            </div>
          )}
          <div className="dashboard-main">
            {clientNav === "overview" && <ClientOverviewTab project={project} onNavChange={setClientNav} />}
            {clientNav === "milestones" && <ClientMilestonesTab project={project} auditMode={showAuditMode} onTaskStatusChange={onTaskStatusChange} onFinishMilestone={onFinishMilestone} />}
            {clientNav === "reviews" && <ClientReviewsTab project={project} onSubmitFeedback={onSubmitFeedback} />}
            {(isClientFileHubView(clientNav) || clientNav === "brand-guidelines") && (
              <FileAssetHub project={project} role="client" focusSection={clientFileHubFocus} />
            )}
            {/* contract opens as modal, not a page */}
            {clientNav === "settings" && <ClientSettingsTab tab={settingsTab} ownerName={ownerName} ownerEmail={ownerEmail} />}
            {clientNav === "billing" && <ClientBillingTab project={project} />}
            {clientNav === "notifications" && (
              <NotificationsPage
                notifications={notifications}
                readIds={readIds} setReadIds={setReadIds}
                dismissedIds={dismissedIds} setDismissedIds={setDismissedIds}
                onSubmitFeedback={onSubmitFeedback}
                onNavigate={openNotificationTarget}
                settingsOpen={notifSettingsOpen} setSettingsOpen={setNotifSettingsOpen}
              />
            )}
          </div>
        </>
        )}
      </section>
      {notificationPhaseId && (
        <PhaseDetailModal
          phaseId={notificationPhaseId}
          project={project}
          onClose={() => setNotificationPhaseId(null)}
          onTaskStatusChange={onTaskStatusChange}
        />
      )}

      {contractOpen && (
        <ContractModal project={project} onClose={() => setContractOpen(false)} />
      )}

      {isMobile && (
        <>
          <MobileTabBar
            items={clientMobilePrimary}
            centerKey="assistant"
            activeKey={activeNav}
            onSelect={handleClientNavSelect}
            centerActions={clientMobileCenterActions}
            endItem={{ key: "milestones", label: "Milestones", icon: Flag, locked: !access.milestones }}
          />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CLIENT — COCOON CONSULT EMBEDDED TAB
// (same logic as CocoonOnboardingPage, renders inside the dashboard shell)
// ─────────────────────────────────────────────

export function ClientCocoonEmbedTab({
  onComplete,
  onConfirmCocoonPayment,
  devSeed,
  storageMode = "default",
  cocoonSidebarOpen = false,
  onCocoonSidebarOpenChange,
}: {
  onComplete?: () => void;
  onConfirmCocoonPayment?: () => void;
  devSeed?: OnboardingSeed;
  storageMode?: OnboardingStorageMode;
  cocoonSidebarOpen?: boolean;
  onCocoonSidebarOpenChange?: (open: boolean) => void;
}) {
  const storageKey = onboardingStorageKey(storageMode);
  const [initialWorkflowState] = useState(() => getInitialOnboardingState(devSeed, storageKey));
  const [answers, setAnswers] = useState<AnswerState>(() => initialWorkflowState.answers);
  const [openStepId, setOpenStepId] = useState(initialWorkflowState.openStepId);
  const [activePromptIndex, setActivePromptIndex] = useState(initialWorkflowState.activePromptIndex);
  const [auditGenerated, setAuditGenerated] = useState(() => initialWorkflowState.auditGenerated);
  const [unsureKeys, setUnsureKeys] = useState<Set<string>>(() => new Set(initialWorkflowState.unsureKeys));
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [callScheduled, setCallScheduled] = useState(initialWorkflowState.callScheduled);
  const [scheduledMeeting, setScheduledMeeting] = useState<MeetingDetails | null>(initialWorkflowState.scheduledMeeting);
  const [thematicReportsOpen, setThematicReportsOpen] = useState(false);
  const [prepListOpen, setPrepListOpen] = useState(false);
  const [paymentPreviewOpen, setPaymentPreviewOpen] = useState(false);
  const [openAuditCategory, setOpenAuditCategory] = useState(() => auditCategoryLabel(SHARED_AUDIT_CATEGORIES[0]?.title ?? "Content"));
  const [selectedAuditPhaseId, setSelectedAuditPhaseId] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      answers,
      auditGenerated,
      openStepId,
      activePromptIndex,
      unsureKeys: Array.from(unsureKeys),
      callScheduled,
      scheduledMeeting,
    }));
  }, [answers, auditGenerated, openStepId, activePromptIndex, unsureKeys, callScheduled, scheduledMeeting, storageKey]);

  function answerKey(stepId: string, promptId: string) { return `${stepId}.${promptId}`; }
  function hasAnswer(value: AnswerValue | undefined) {
    if (Array.isArray(value)) return value.length > 0;
    return Boolean((value as string)?.trim());
  }

  const inputStepIds = onboardingSteps.filter(s => s.id !== "generated-audit" && s.id !== "strategy-call").map(s => s.id);
  const inputSteps = onboardingSteps.filter(s => inputStepIds.includes(s.id));

  function getRequiredPrompts(step: OnboardingStep) { return step.prompts.filter(p => p.required); }
  function getStepProgress(step: OnboardingStep, ans: AnswerState) {
    const req = getRequiredPrompts(step);
    if (!req.length) return { done: 0, total: 0 };
    return { done: req.filter(p => hasAnswer(ans[answerKey(step.id, p.id)])).length, total: req.length };
  }
  function stepIsComplete(step: OnboardingStep, ans: AnswerState) {
    const p = getStepProgress(step, ans);
    return p.total > 0 && p.done === p.total;
  }

  const requiredTotal = inputSteps.reduce((t, s) => t + getRequiredPrompts(s).length, 0);
  const requiredDone = inputSteps.reduce((t, s) => t + getStepProgress(s, answers).done, 0);
  const inputReady = requiredDone === requiredTotal;
  const firstIncompleteInputIndex = inputSteps.findIndex(s => !stepIsComplete(s, answers));
  const activeInputIndex = firstIncompleteInputIndex === -1 ? inputSteps.length : firstIncompleteInputIndex;

  const stepsWithStatus = onboardingSteps.map(step => {
    const complete = stepIsComplete(step, answers);
    const inputIndex = inputSteps.findIndex(s => s.id === step.id);
    if (step.id === "generated-audit") return { ...step, status: inputReady ? (auditGenerated ? "complete" : "current") : "locked" };
    if (step.id === "strategy-call") return { ...step, status: auditGenerated ? "current" : "locked" };
    if (inputIndex > activeInputIndex) return { ...step, status: "locked" };
    return { ...step, status: complete ? "complete" : "current" };
  });

  const openStep = useMemo(
    () => stepsWithStatus.find(s => s.id === openStepId) ?? stepsWithStatus[0],
    [openStepId, stepsWithStatus],
  );
  const openStepLocked = openStep.status === "locked";
  const activePrompt = openStep.prompts[Math.min(activePromptIndex, openStep.prompts.length - 1)];
  const activePromptKey = activePrompt ? answerKey(openStep.id, activePrompt.id) : "";
  const activePromptAnswered = activePrompt ? hasAnswer(answers[activePromptKey]) : false;
  const isFirstPrompt = activePromptIndex === 0;
  const isLastPrompt = activePromptIndex >= openStep.prompts.length - 1;
  const canAdvancePrompt = Boolean(activePrompt && (!activePrompt.required || activePromptAnswered));
  const canCompleteOpenStep = openStep.id === "generated-audit" ? inputReady : openStep.id === "strategy-call" ? auditGenerated : stepIsComplete(openStep, answers);
  const canUsePrimaryAction = isLastPrompt ? canCompleteOpenStep : canAdvancePrompt;
  const isUnsure = unsureKeys.has(activePromptKey);

  function toggleUnsure() {
    setUnsureKeys(prev => { const n = new Set(prev); n.has(activePromptKey) ? n.delete(activePromptKey) : n.add(activePromptKey); return n; });
  }

  useEffect(() => {
    setActivePromptIndex(i => Math.min(i, Math.max(openStep.prompts.length - 1, 0)));
  }, [openStep.prompts.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); if (canUsePrimaryAction) goToNextPrompt(); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUsePrimaryAction, isLastPrompt, canAdvancePrompt, canCompleteOpenStep]);

  function updateAnswer(key: string, value: AnswerValue) { setAnswers(c => ({ ...c, [key]: value })); }
  function toggleChecklistValue(key: string, option: string) {
    setAnswers(c => {
      const sel = Array.isArray(c[key]) ? c[key] : [];
      return { ...c, [key]: sel.includes(option) ? sel.filter(x => x !== option) : [...sel, option] };
    });
  }
  function goToNextStep() {
    const idx = stepsWithStatus.findIndex(s => s.id === openStep.id);
    const next = stepsWithStatus[idx + 1];
    if (next && next.status !== "locked") { setOpenStepId(next.id); setActivePromptIndex(0); }
    // If finishing strategy-call, mark complete
    if (openStep.id === "strategy-call" && onComplete) onComplete();
  }
  function selectStep(step: (typeof stepsWithStatus)[0]) {
    if (step.status === "locked") return;
    setOpenStepId(step.id); setActivePromptIndex(0);
  }
  function goToNextPrompt() {
    if (!isLastPrompt && !canAdvancePrompt) return;
    if (!isLastPrompt) { setActivePromptIndex(i => i + 1); return; }
    if (!canCompleteOpenStep) return;
    goToNextStep();
  }
  function goToPreviousPrompt() { setActivePromptIndex(i => Math.max(i - 1, 0)); }
  function generateAudit() {
    if (!inputReady) return;
    setAuditGenerated(true); setOpenStepId("strategy-call"); setActivePromptIndex(0);
  }
  function skipToFinalPreview() {
    const seed = buildOnboardingSeed();
    setAnswers(seed.answers);
    setAuditGenerated(seed.auditGenerated);
    setOpenStepId("strategy-call");
    setActivePromptIndex(0);
    setUnsureKeys(new Set());
    setCallScheduled(false);
    setScheduledMeeting(null);
  }
  function resetToStartPreview() {
    setAnswers({});
    setAuditGenerated(false);
    setOpenStepId(onboardingSteps[0]?.id ?? "brand-core");
    setActivePromptIndex(0);
    setUnsureKeys(new Set());
    setCallScheduled(false);
    setScheduledMeeting(null);
  }
  const auditPreviewReports = SHARED_AUDIT_CATEGORIES.map(category => {
    const total = category.items.length;
    const complete = auditCategoryCompleteCount(category.items);
    const toFix = total - complete;
    const percent = total ? Math.round((complete / total) * 100) : 0;
    return { title: auditCategoryLabel(category.title), total, complete, toFix, percent };
  });
  const auditPhaseId = (title: string) => `cocoon-consult-${auditCategoryLabel(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  const cocoonAuditProject: Project = {
    id: "cocoon-consult-preview",
    clientName: "House of Hazel",
    clientEmail: "hazel@houseofhazel.co",
    clientInitials: "HH",
    status: "active",
    startDate: "Jun 3, 2026",
    platform: "Website",
    milestones: [
      {
        id: "cocoon-consult",
        number: 1,
        title: "Foundation",
        clientLabel: "Foundation",
        status: "active",
        phases: SHARED_AUDIT_CATEGORIES.map((category, categoryIndex) => {
          const firstActiveIndex = category.items.findIndex(item => item.priority !== "low");
          return {
            id: auditPhaseId(category.title),
            title: category.title,
            tasks: category.items.map((item, itemIndex) => ({
              id: `cocoon-preview-${categoryIndex}-${itemIndex + 1}`,
              title: item.label,
              assignee: "client" as const,
              status: item.priority === "low" ? "complete" as const : itemIndex === firstActiveIndex ? "in_progress" as const : "not_started" as const,
            })),
          };
        }),
      },
    ],
    notes: [],
    assets: [],
    brand: { colors: [], fonts: [], style: "" },
  };

  const completedSteps = stepsWithStatus.filter(s => s.status === "complete").length;
  const trackerSteps = stepsWithStatus.map(step => ({
    id: step.id,
    title: step.title,
    summary: step.summary,
    status: step.status as "complete" | "current" | "locked",
  }));

  return (
    <div className={`cocoon-embed ${cocoonSidebarOpen ? "is-sidebar-open" : ""}`}>
      {selectedAuditPhaseId && (
        <PhaseDetailModal
          phaseId={selectedAuditPhaseId}
          milestoneId="cocoon-consult"
          project={cocoonAuditProject}
          onClose={() => setSelectedAuditPhaseId(null)}
          auditCategories={SHARED_AUDIT_CATEGORIES}
        />
      )}
      {cocoonSidebarOpen && (
        <button
          type="button"
          className="cocoon-mobile-sidebar-backdrop"
          aria-label="Close Cocoon steps"
          onClick={() => onCocoonSidebarOpenChange?.(false)}
        />
      )}

      <CocoonStepTracker
        steps={trackerSteps}
        openStepId={openStep.id}
        completedSteps={completedSteps}
        onSelectStep={stepId => {
          const step = stepsWithStatus.find(item => item.id === stepId);
          if (step) selectStep(step);
          onCocoonSidebarOpenChange?.(false);
        }}
        onResetPreview={resetToStartPreview}
        onSkipToFinalPreview={skipToFinalPreview}
      />

      {/* ── Right: Question form ── */}
      <div className="cocoon-form-col">
          <div className="cocoon-form-inner">
            {openStepLocked ? (
              <div style={{ background: "var(--surface)", borderRadius: "var(--radius-panel)", border: "0", padding: "2.5rem 2rem", textAlign: "center", color: "var(--fg-muted)" }}>
                <LockKeyhole size={24} style={{ margin: "0 auto 0.75rem", opacity: 0.35 }} />
                <p style={{ fontSize: "var(--text-md)", fontWeight: 500 }}>Complete the previous step to unlock this one.</p>
              </div>

            ) : openStep.id === "generated-audit" ? (
              <div style={{ display: "grid", gap: "1rem" }}>
                {!auditGenerated ? (
                  <div style={{ background: "var(--surface)", borderRadius: "1rem", border: "1px dashed var(--border)", padding: "2.5rem 2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.1rem" }}>
                    <Wand2 size={28} style={{ color: "oklch(0.75 0.15 280)" }} />
                    <div>
                      <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--fg)", marginBottom: "0.35rem" }}>Ready for Cocoon magic?</h3>
                      <p style={{ fontSize: "var(--text-base)", color: "var(--fg-muted)", maxWidth: "300px", margin: "0 auto" }}>Generate your personalized prep list and brand audit.</p>
                    </div>
                    <button onClick={generateAudit} style={{ padding: "0.65rem 1.3rem", background: "linear-gradient(90deg, oklch(0.78 0.11 22), oklch(0.7 0.13 18))", color: "white", border: "none", borderRadius: "var(--radius)", fontSize: "var(--text-md)", fontWeight: 500, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      Generate audit <Wand2 size={15} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "0.85rem" }}>
                    {openStep.prompts.map(prompt => (
                      <div key={prompt.id} style={{ padding: "1.1rem", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", marginBottom: "0.6rem" }}>
                          <Wand2 size={16} style={{ color: "oklch(0.75 0.15 280)", marginTop: "0.1rem", flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)" }}>{prompt.label}</div>
                            <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}>{prompt.type}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: "var(--text-md)", lineHeight: 1.6, padding: "0.85rem", background: "var(--bg)", borderRadius: "var(--radius)", fontStyle: "italic", color: "var(--fg-muted)" }}>AI-generated content will appear here.</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            ) : openStep.id === "strategy-call" ? (
              <CocoonFinalStepPanel
                callScheduled={callScheduled}
                scheduledMeeting={scheduledMeeting}
                onOpenPrepList={() => setPrepListOpen(true)}
                onOpenAuditPreview={() => setThematicReportsOpen(true)}
                onOpenPaymentPreview={() => setPaymentPreviewOpen(true)}
                onOpenScheduler={() => setSchedulerOpen(true)}
              />

            ) : activePrompt ? (
              <CocoonPromptForm
                prompt={activePrompt}
                promptIndex={activePromptIndex}
                totalPrompts={openStep.prompts.length}
                value={answers[activePromptKey]}
                isFirstPrompt={isFirstPrompt}
                isLastPrompt={isLastPrompt}
                canUsePrimaryAction={canUsePrimaryAction}
                isUnsure={isUnsure}
                onTextChange={value => updateAnswer(activePromptKey, value)}
                onToggleChecklistValue={option => toggleChecklistValue(activePromptKey, option)}
                onPrevious={goToPreviousPrompt}
                onSubmit={goToNextPrompt}
                onToggleUnsure={toggleUnsure}
              />
            ) : null}
          </div>
      </div>
      {schedulerOpen && (
        <MeetingScheduler
          initial={scheduledMeeting}
          onCancel={() => setSchedulerOpen(false)}
          onSchedule={meeting => { setScheduledMeeting(meeting); setCallScheduled(true); setSchedulerOpen(false); }}
        />
      )}
      {prepListOpen && <CocoonPrepListPopup onClose={() => setPrepListOpen(false)} />}

      {thematicReportsOpen && (
        <CocoonAuditPreviewPopup
          reports={auditPreviewReports}
          openCategory={openAuditCategory}
          onClose={() => setThematicReportsOpen(false)}
          onSelectCategory={title => {
            setOpenAuditCategory(title);
            setThematicReportsOpen(false);
            setSelectedAuditPhaseId(auditPhaseId(title));
          }}
        />
      )}
      {paymentPreviewOpen && <CocoonPaymentPreviewPopup onClose={() => setPaymentPreviewOpen(false)} onConfirmPaid={onConfirmCocoonPayment} />}
    </div>
  );
}

// ─────────────────────────────────────────────

export function ClientBillingTab({ project }: { project: Project; collaborationLocked?: boolean }) {
  const workflow = project.workflow;
  const plan = project.plan;
  const payment = workflow?.payment;
  const access = workflow?.dashboardAccess;
  const guidance = workflow?.guidanceWindow;
  const cocoonTier = cocoonTierForStage(workflow?.stage);
  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {/* Plan card */}
      <Panel>
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.35rem" }}>Current plan</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "var(--text-2xl)", fontWeight: 500, color: "var(--fg)" }}>{workflow?.planLabel ?? plan?.name ?? "—"}</span>
                {cocoonTier && <span className={`plan-tier-badge plan-tier-badge--${cocoonTier.toLowerCase()}`}>{cocoonTier}</span>}
              </div>
              <div style={{ fontSize: "var(--text-md)", color: "var(--fg-muted)", maxWidth: "520px", lineHeight: 1.5 }}>{workflow?.planDescription ?? plan?.description}</div>
            </div>
            {(plan?.status === "active" || workflow?.stage !== "deleted") && (
              <span style={{ background: "oklch(0.94 0.06 155)", color: "oklch(0.42 0.12 155)", borderRadius: "999px", fontSize: "var(--text-sm)", fontWeight: 500, padding: "0.3rem 0.75rem", flexShrink: 0 }}>Active</span>
            )}
          </div>
          {access && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "var(--text-base)", color: "var(--fg-muted)", padding: "0.6rem 0.85rem", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
              <CalendarDays size={13} />Access: <strong style={{ color: "var(--fg)" }}>{access.label}</strong>{access.endsAt ? <span>through {access.endsAt}</span> : null}
            </div>
          )}
        </div>
      </Panel>

      {payment && (
        <Panel>
          <PanelHeader title="Wise payment" icon={CreditCard} />
          <div style={{ padding: "0.95rem 1.25rem 1.1rem", display: "grid", gap: "0.65rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)" }}>{payment.label}</div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", marginTop: "0.15rem" }}>
                  {payment.sentAt ? `Sent ${payment.sentAt}` : "Payment email not sent yet"}{payment.confirmedAt ? ` · Confirmed ${payment.confirmedAt}` : ""}
                </div>
              </div>
              {payment.amount && <strong style={{ fontSize: "var(--text-lg)", color: "var(--fg)" }}>{payment.amount}</strong>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.55rem" }}>
              <div style={{ padding: "0.65rem 0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg)" }}>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "0.25rem" }}>Payment status</div>
                <div style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)" }}>{payment.status.replace(/_/g, " ")}</div>
              </div>
              <div style={{ padding: "0.65rem 0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg)" }}>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "0.25rem" }}>QR details</div>
                <div style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)" }}>{payment.qrStatus?.replace(/_/g, " ") ?? "Not prepared"}</div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {(access || guidance) && (
        <Panel>
          <PanelHeader title="Access window" icon={Clock} />
          <div style={{ padding: "0.95rem 1.25rem 1.1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
            {access && (
              <div style={{ padding: "0.8rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg)" }}>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "0.25rem" }}>Dashboard</div>
                <div style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)" }}>{access.label}</div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", marginTop: "0.2rem" }}>{access.startsAt ? `Starts ${access.startsAt}` : "Not started"}{access.endsAt ? ` · Ends ${access.endsAt}` : ""}</div>
              </div>
            )}
            {guidance && (
              <div style={{ padding: "0.8rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg)" }}>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "0.25rem" }}>Studio guidance</div>
                <div style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)" }}>{guidance.label}</div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", marginTop: "0.2rem" }}>{guidance.startsAt ? `Starts ${guidance.startsAt}` : "Not started"}{guidance.endsAt ? ` · Ends ${guidance.endsAt}` : ""}</div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Invoices */}
      {plan?.invoices && plan.invoices.length > 0 && (
        <Panel>
          <PanelHeader title="Invoices" icon={FileText} />
          <div style={{ padding: "0 1.25rem 1rem" }}>
            {plan.invoices.map((inv, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: i < plan.invoices!.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <div style={{ fontSize: "var(--text-md)", fontWeight: 500, marginBottom: "0.15rem" }}>{inv.label}</div>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}>{inv.date}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "var(--text-lg)", fontWeight: 500 }}>{inv.amount}</span>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, padding: "0.2rem 0.55rem", borderRadius: "999px", background: inv.paid ? "oklch(0.94 0.06 155)" : "oklch(0.97 0.02 50)", color: inv.paid ? "oklch(0.42 0.12 155)" : "var(--fg-muted)" }}>
                    {inv.paid ? "Paid" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Contact */}
      <Panel>
        <div style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "var(--text-md)", fontWeight: 500, marginBottom: "0.2rem" }}>Questions about your plan?</div>
            <div style={{ fontSize: "var(--text-base)", color: "var(--fg-muted)" }}>Get in touch with your project lead.</div>
          </div>
          <a href="mailto:trisha@baltazarstudio.co" style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--accent)", textDecoration: "none", padding: "0.45rem 0.85rem", border: "1px solid var(--accent)", borderRadius: "var(--radius-pill)", flexShrink: 0 }}>
            Contact us
          </a>
        </div>
      </Panel>
    </div>
  );
}

export function ClientProjectsTab({ projects, onSelectProject }: { projects: Project[]; onSelectProject: (id: string) => void }) {
  return (
    /* auto-fit/minmax instead of a fixed 2-up — project cards stack to a
       single column on phones instead of squeezing to ~160px. */
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
      {projects.map(p => {
        const all = p.milestones.flatMap(m => m.phases.flatMap(ph => ph.tasks));
        const prog = { done: all.filter(t => t.status === "complete").length, total: all.length };
        const cur = p.milestones.find(m => m.status === "active");
        return (
          <Panel key={p.id} className="cursor-pointer">
            <div style={{ padding: "1.1rem 1.25rem" }} onClick={() => onSelectProject(p.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.85rem" }}>
                <div className="dashboard-project-icon" style={{ width: "2.2rem", height: "2.2rem", borderRadius: "0.7rem", fontSize: "var(--text-base)" }}>{p.clientInitials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{p.clientName}</div>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}>{p.platform}</div>
                </div>
                <StatusBadge status="is-active" label="Active" />
              </div>
              <ProgressBar {...prog} />
              {cur && <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", marginTop: "0.5rem" }}>M{cur.number} — {cur.title}</div>}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
