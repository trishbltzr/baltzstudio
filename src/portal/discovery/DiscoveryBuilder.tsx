"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { css } from "../helpers";
import { printReportNode } from "../printReport";
import { Icon } from "../icons";
import { QuickStart, type QuickStartApplyOptions } from "./QuickStart";
import type { Know } from "./knowledge";
import { isAiStageResult, isGeneratedStageResult, type AiGenerationMode, type GeneratedStageResult } from "@/lib/aiStageGeneration";
import { AUDIT_SCORING_STEPS, isAuditScoreResult } from "@/lib/auditChecklist";
import type { GuidedAuditSession } from "@/lib/portalAuditPersistence";
import type { TaskImportDraft } from "../types";
import { GuidedLoadingState } from "../components/GuidedLoadingState";

// ── data shapes ───────────────────────────────────────────────────────────────
export type DQKind = "text" | "textarea" | "single" | "multi";
export interface DiscoveryQuestion { key: string; label: string; hint?: string; kind: DQKind; ph?: string; opts?: string[]; list?: boolean }
export interface DiscoveryTopic { id: string; num: string; title: string; icon: string; qs: DiscoveryQuestion[] }
export interface DiscoveryStage { key: string; label: string; icon: string }
export interface DiscoveryIntroStep { title: string; tag?: string; icon?: string }

export type Ans = Record<string, string | string[]>;

// ── pipeline contract (engine-specific stages plug in here) ────────────────────
export interface StageRenderCtx {
  stageKey: string;
  docs: any;
  aiResult: GeneratedStageResult | null;
  aiResults: Record<string, GeneratedStageResult>;
  reveal: number; // Number.POSITIVE_INFINITY when fully revealed
  building: boolean;
  approved: boolean;
  mobile: boolean;
  accent: string;
  onAdvance: () => void; // approve current stage & continue (inline affordances)
  onDownload: () => void;
  onShare: () => void;
  onCopy: () => void;
  afterActions?: ReactNode;
}
export interface ProposalRenderCtx {
  docs: any;
  aiResults: Record<string, GeneratedStageResult>;
  clientName: string;
  mobile: boolean;
  accent: string;
  sent: boolean;
  onBack: () => void;
  onExit: () => void;
  onRequest: () => void;
  onShare: () => void;
  onImportTasks: (drafts: TaskImportDraft[]) => void;
}
export interface Pipeline {
  railTitle: string;
  buildDocs: (data: Ans) => any;
  gen: (stageKey: string) => { total: number; ms: number; buildLabel: string };
  genPrompt: (stageKey: string) => string;
  genCta: (stageKey: string) => string;
  approveLabel: (stageKey: string, isLast: boolean) => string;
  beginLabel: string; // discovery-complete CTA (e.g. "Map the funnel flow →")
  beginMsg?: (data: Ans) => string; // personalised discovery-complete message
  introPreview?: (mobile: boolean) => ReactNode;
  renderStage: (ctx: StageRenderCtx) => ReactNode;
  renderProposal: (ctx: ProposalRenderCtx) => ReactNode;
}

// ── state ─────────────────────────────────────────────────────────────────────
interface DState {
  entered: boolean;
  introReveal: number;
  data: Ans;
  qIdx: number;
  draft: string;
  typing: boolean;
  // pipeline
  stage: number;
  approved: Record<string, boolean>;
  proposal: boolean;
}
const init: DState = {
  entered: false, introReveal: 0, data: {}, qIdx: 0, draft: "", typing: false,
  stage: 0, approved: {}, proposal: false,
};

const ACTION_PLAN_STEPS = [
  "Reading failed internal-audit checks",
  "Ranking fixes by impact and urgency",
  "Reviewing Lighthouse mobile findings",
  "Reviewing Lighthouse desktop findings",
  "Turning technical findings into actions",
  "Sequencing the implementation plan",
];

const BRAND_REPORT_STEPS = [
  "Reading the approved brand intake and client notes",
  "Inspecting live website colours, typography, and logo",
  "Organizing purpose, audience, promise, and differentiation",
  "Consolidating voice, messaging, and visual direction",
  "Separating verified evidence from items to confirm",
  "Preparing the brand system for review",
];

const BRAND_PLAN_STEPS = [
  "Reading the approved brand system",
  "Prioritizing verified gaps and inconsistencies",
  "Turning positioning and messaging gaps into actions",
  "Sequencing visual-system and governance improvements",
  "Removing duplicate or unsupported recommendations",
  "Preparing the action plan for review",
];

const FUNNEL_GENERATION_STEPS: Record<string, string[]> = {
  flow: [
    "Reading the funnel objective and primary action",
    "Mapping traffic sources to the entry point",
    "Ordering pages and conversion steps",
    "Checking follow-up and decision paths",
    "Removing dead ends and competing actions",
    "Preparing the funnel-flow panel",
  ],
  copy: [
    "Reading the approved funnel flow",
    "Matching the message to audience awareness",
    "Drafting the headline and offer framing",
    "Positioning proof and objection handling",
    "Checking calls to action across the journey",
    "Preparing the copy panel",
  ],
  wireframe: [
    "Reading the approved flow and copy direction",
    "Ordering sections around visitor decisions",
    "Placing proof, offer, and calls to action",
    "Checking mobile content hierarchy",
    "Checking conversion continuity between sections",
    "Preparing the wireframe panel",
  ],
  brief: [
    "Combining the approved flow, copy, and wireframe",
    "Confirming pages, forms, and integrations",
    "Mapping implementation phases and owners",
    "Adding tracking, QA, and launch requirements",
    "Removing duplicate or conflicting tasks",
    "Preparing the development-plan panel",
  ],
};

const FUNNEL_GENERATION_COPY: Record<string, { heading: string; description: string; final: string[] }> = {
  flow: { heading: "Building your funnel flow", description: "We are turning the objective, traffic, and primary action into one connected journey.", final: ["Checking every path reaches the primary outcome", "Preparing the flow for review"] },
  copy: { heading: "Drafting your funnel copy", description: "We are building the message from the approved flow, audience, offer, and proof.", final: ["Checking message continuity across each step", "Preparing the copy for review"] },
  wireframe: { heading: "Structuring your wireframe", description: "We are arranging the approved flow and copy around the decisions visitors need to make.", final: ["Checking hierarchy and mobile continuity", "Preparing the wireframe for review"] },
  brief: { heading: "Building your development plan", description: "We are translating the approved flow, copy, and wireframe into an implementation-ready plan.", final: ["Checking dependencies, owners, and launch requirements", "Preparing the development plan for review"] },
};

function readGuidedSession(sessionKey: string | undefined, serverSession: GuidedAuditSession | undefined) {
  if (typeof window === "undefined" || !sessionKey) return serverSession;
  try {
    const raw = window.localStorage.getItem(`guided-audit:${sessionKey}`);
    if (!raw) return serverSession;
    const parsed = JSON.parse(raw) as GuidedAuditSession;
    return parsed && typeof parsed === "object" && typeof parsed.qIdx === "number" ? parsed : serverSession;
  } catch {
    return serverSession;
  }
}

type Act =
  | { t: "enter" } | { t: "introReveal"; n: number } | { t: "typing"; v: boolean }
  | { t: "draft"; v: string } | { t: "single"; k: string; v: string } | { t: "toggle"; k: string; v: string }
  | { t: "sendText"; k: string; v?: string } | { t: "next" } | { t: "skip" } | { t: "back" }
  | { t: "restart" } | { t: "fill"; data: Ans; qIdx: number }
  | { t: "ingest"; data: Ans }
  | { t: "replaceIngest"; data: Ans }
  | { t: "beginBuild" } | { t: "gotoStage"; i: number } | { t: "setStage"; i: number }
  | { t: "approve"; k: string } | { t: "proposal"; v: boolean };

function reducer(s: DState, a: Act): DState {
  switch (a.t) {
    case "enter": return { ...s, entered: true, introReveal: 0, typing: true };
    case "introReveal": return { ...s, introReveal: a.n };
    case "typing": return { ...s, typing: a.v };
    case "draft": return { ...s, draft: a.v };
    case "single": return { ...s, data: { ...s.data, [a.k]: a.v } };
    case "toggle": {
      const cur = Array.isArray(s.data[a.k]) ? (s.data[a.k] as string[]) : [];
      const nx = cur.includes(a.v) ? cur.filter(x => x !== a.v) : cur.concat(a.v);
      return { ...s, data: { ...s.data, [a.k]: nx } };
    }
    case "sendText": { const v = (a.v ?? s.draft).trim(); if (!v) return s; return { ...s, data: { ...s.data, [a.k]: v }, qIdx: s.qIdx + 1, draft: "" }; }
    case "next": return { ...s, qIdx: s.qIdx + 1, draft: "" };
    case "skip": return { ...s, qIdx: s.qIdx + 1, draft: "" };
    case "back": return { ...s, qIdx: Math.max(0, s.qIdx - 1), draft: "", typing: false };
    case "restart": return { ...init, entered: true, introReveal: 0, typing: true };
    case "fill": return { ...s, entered: true, introReveal: 2, data: a.data, qIdx: a.qIdx, draft: "", typing: false };
    case "ingest": return { ...s, data: { ...s.data, ...a.data } };
    case "replaceIngest": return { ...s, data: a.data, qIdx: 0, draft: "", stage: 0, approved: {}, proposal: false };
    case "beginBuild": return { ...s, approved: { ...s.approved, discovery: true }, stage: 1, proposal: false };
    case "gotoStage": return { ...s, stage: a.i, proposal: false };
    case "setStage": return { ...s, stage: a.i, proposal: false };
    case "approve": return { ...s, approved: { ...s.approved, [a.k]: true } };
    case "proposal": return { ...s, proposal: a.v };
  }
}

// ── component ─────────────────────────────────────────────────────────────────
export function DiscoveryBuilder({
  accent, title, clientName, intro, wizard, stages, introSteps, startLabel = "Start discovery →",
  backLabel = "← All funnels",
  hideHeader = false,
  completeTitle = "Discovery complete", completeMsg, completeCta = "See the result →", progressLabel = "discovery",
  completeExtra, stageExtra, demo, demoAction = "complete", onExit, onComplete, mobile, pipeline, showToast,
  prefill, prefillSources, prefillNotes, quickStartMode, onIngest, onPipelineComplete,
  sessionKey, initialSession, onSessionChange, generationMode, quickStartClientId, onImportTasks, onShareFinal, onStartOverRequest,
}: {
  accent: string;
  title: string;
  clientName: string;
  intro: { eyebrow: string; heading: string };
  wizard: DiscoveryTopic[];
  stages: DiscoveryStage[];
  introSteps: DiscoveryIntroStep[];
  startLabel?: string;
  backLabel?: string;
  hideHeader?: boolean;
  completeTitle?: string;
  completeMsg: string;
  completeCta?: string;
  completeExtra?: ReactNode;
  stageExtra?: (stageKey: string) => ReactNode;
  progressLabel?: string;
  demo?: Ans;
  demoAction?: "complete" | "result";
  onExit: () => void;
  onComplete: (data: Ans) => void;
  onPipelineComplete?: (data: Ans, aiResults: Record<string, GeneratedStageResult>) => void | Promise<void>;
  onShareFinal?: (data: Ans, aiResults: Record<string, GeneratedStageResult>) => void | Promise<void>;
  onImportTasks?: (drafts: TaskImportDraft[]) => void;
  mobile: boolean;
  pipeline?: Pipeline;
  showToast?: (m: string, onClick?: () => void) => void;
  prefill?: Ans;
  prefillSources?: Record<string, string>;
  prefillNotes?: Record<string, string>;
  quickStartMode?: "audit" | "brand" | "seo" | "website_builder" | "funnel";
  quickStartClientId?: string;
  generationMode?: AiGenerationMode;
  onIngest?: (delta: Know, options?: QuickStartApplyOptions) => void;
  sessionKey?: string;
  initialSession?: GuidedAuditSession;
  onSessionChange?: (session: GuidedAuditSession) => void;
  onStartOverRequest?: () => void;
}) {
  const restoredSession = useMemo(() => readGuidedSession(sessionKey, initialSession), [sessionKey, initialSession]);
  const effectiveGenerationMode = generationMode || quickStartMode;
  const [s, dispatch] = useReducer(reducer, init, () => restoredSession ? {
    ...init,
    entered: restoredSession.entered,
    introReveal: restoredSession.introReveal,
    data: { ...(prefill || {}), ...restoredSession.data },
    qIdx: restoredSession.qIdx,
    draft: restoredSession.draft,
    stage: restoredSession.stage,
    approved: restoredSession.approved,
    proposal: restoredSession.proposal,
  } : ({ ...init, data: { ...(prefill || {}) } }));
  const hasMemoryChoice = !!(quickStartMode && onIngest);
  const [memoryResolved, setMemoryResolved] = useState(restoredSession?.memoryResolved ?? !hasMemoryChoice);
  const [aiResults, setAiResults] = useState<Record<string, GeneratedStageResult>>(restoredSession?.aiResults || {});
  const [generatingStage, setGeneratingStage] = useState<string | null>(null);
  const [generationTick, setGenerationTick] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const isAiSuggestion = (k: string) => /^(Website scan|Source inference|Source review|AI inference|AI Jumpstart)/.test(prefillSources?.[k] || "");
  const isKnown = (k: string) => { const v = prefill?.[k]; return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0) && !isAiSuggestion(k); };
  const questionLabels = useMemo(() => Object.fromEntries(wizard.flatMap(topic => topic.qs.map(question => [question.key, question.label]))), [wizard]);
  const askWizard = useMemo(() => wizard.map(t => ({ ...t, qs: t.qs.filter(q => !isKnown(q.key)) })).filter(t => t.qs.length > 0), [wizard, prefill, prefillSources]);
  const flat = useMemo(() => askWizard.flatMap(t => t.qs.map(q => ({ ...q, topic: t.title, topicId: t.id, icon: t.icon }))), [askWizard]);
  // Everything we know = latest prefill (incl. mid-flow ingests) + the gaps answered.
  const collected = useMemo(() => ({ ...(prefill || {}), ...s.data }), [prefill, s.data]);
  const personName = typeof collected.nickname === "string" ? collected.nickname.trim() : "";
  const brandName = typeof collected.brandName === "string"
    ? collected.brandName.trim()
    : quickStartMode === "audit" && typeof collected.name === "string"
      ? collected.name.trim()
      : clientName;
  const total = flat.length;
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prefillSignature = JSON.stringify(prefill || {});
  const appliedPrefillSignature = useRef(prefillSignature);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const toast = (m: string, onClick?: () => void) => showToast?.(m, onClick);
  const shareFinal = () => {
    if (!onShareFinal) {
      toast("Share link copied — send it to your client");
      return;
    }
    void onShareFinal(collected, aiResults);
  };

  const onSessionChangeRef = useRef(onSessionChange);
  onSessionChangeRef.current = onSessionChange;

  useEffect(() => {
    if (!sessionKey) return;
    const session: GuidedAuditSession = {
      entered: s.entered,
      introReveal: s.introReveal,
      data: s.data,
      qIdx: s.qIdx,
      questionTotal: total,
      draft: s.draft,
      stage: s.stage,
      approved: s.approved,
      proposal: s.proposal,
      memoryResolved,
      aiResults,
    };
    try {
      window.localStorage.setItem(`guided-audit:${sessionKey}`, JSON.stringify(session));
    } catch {
      // Server persistence below remains the source of truth when storage is unavailable.
    }
    onSessionChangeRef.current?.(session);
  }, [aiResults, memoryResolved, s.approved, s.data, s.draft, s.entered, s.introReveal, s.proposal, s.qIdx, s.stage, sessionKey, total]);

  useEffect(() => {
    if (appliedPrefillSignature.current === prefillSignature) return;
    appliedPrefillSignature.current = prefillSignature;
    dispatch({ t: "ingest", data: prefill || {} });
  }, [prefill, prefillSignature]);

  // intro reveal sequence
  useEffect(() => {
    if (!s.entered || s.introReveal >= 2) return;
    clearTimers();
    if (s.introReveal === 0) timers.current.push(setTimeout(() => dispatch({ t: "introReveal", n: 1 }), 650));
    else timers.current.push(setTimeout(() => {
      dispatch({ t: "introReveal", n: 2 });
      dispatch({ t: "typing", v: false });
    }, 650));
    return clearTimers;
  }, [s.entered, s.introReveal]);

  // brief "typing" beat when advancing to the next question
  useEffect(() => {
    if (!s.entered || s.qIdx === 0 || s.qIdx >= total) return;
    dispatch({ t: "typing", v: true });
    const id = setTimeout(() => dispatch({ t: "typing", v: false }), 560);
    return () => clearTimeout(id);
  }, [s.qIdx]);

  // keep chat scrolled to the newest message
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; });

  const complete = s.qIdx >= total;
  const cur = complete ? null : flat[s.qIdx];
  const currentPrefillValue = cur ? s.data[cur.key] : undefined;
  const pct = Math.round((Math.min(s.qIdx, total) / total) * 100);
  const canContinueSelection = !!cur && (cur.kind === "single"
    ? typeof currentPrefillValue === "string" && currentPrefillValue.length > 0
    : cur.kind === "multi" ? Array.isArray(currentPrefillValue) && currentPrefillValue.length > 0 : false);

  const formatList = (value: string) => value
    .split(/\r?\n|\s*;\s*/)
    .map(item => item.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .map(item => `• ${item}`)
    .join("\n");

  const submitCurrentText = () => {
    if (!cur) return;
    dispatch({ t: "sendText", k: cur.key, v: cur.list ? formatList(s.draft) : s.draft });
  };

  useEffect(() => {
    if (!cur || (cur.kind !== "text" && cur.kind !== "textarea")) return;
    const value = currentPrefillValue;
    dispatch({ t: "draft", v: typeof value === "string" ? value : "" });
  }, [cur?.key, currentPrefillValue]);

  const answered = flat.slice(0, s.qIdx);
  const groups: { topic: string; icon: string; items: { label: string; answer: string; skipped: boolean; list: boolean }[] }[] = [];
  answered.forEach(q => {
    const v = s.data[q.key];
    const ans = Array.isArray(v) ? v.join(", ") : (v as string || "");
    let g = groups.find(x => x.topic === q.topic);
    if (!g) { g = { topic: q.topic, icon: q.icon, items: [] }; groups.push(g); }
    g.items.push({ label: q.label, answer: ans, skipped: !ans, list: !!q.list });
  });

  const runFill = () => {
    if (!demo) return;
    const data: Ans = {};
    flat.forEach(q => {
      const saved = prefill?.[q.key];
      if (saved !== undefined && saved !== "" && !(Array.isArray(saved) && saved.length === 0)) data[q.key] = saved;
      else if (demo[q.key] !== undefined) data[q.key] = demo[q.key];
      else if (q.kind === "single") data[q.key] = q.opts?.[0] || "Yes";
      else if (q.kind === "multi") data[q.key] = (q.opts || []).slice(0, 2);
      else data[q.key] = "";
    });
    const merged = { ...(prefill || {}), ...data };
    if (demoAction === "result" || !pipeline) {
      onComplete(merged);
      return;
    }
    dispatch({ t: "fill", data: merged, qIdx: flat.length });
  };

  // ── pipeline orchestration ──
  const stageKeys = stages.map(st => st.key);
  const maxStage = (() => { let m = 0; for (let i = 0; i < stageKeys.length; i++) { if (s.approved[stageKeys[i]]) m = i + 1; else break; } return m; })();
  const curStage = stages[s.stage];
  const curKey = curStage ? curStage.key : "discovery";
  const isLast = s.stage === stages.length - 1;
  const aiResult = aiResults[curKey] || null;
  const genDone = !!aiResult;
  const isGenerating = generatingStage === curKey;
  const funnelGeneration = effectiveGenerationMode === "funnel" ? FUNNEL_GENERATION_COPY[curKey] : undefined;
  const generationSteps = effectiveGenerationMode === "funnel"
    ? FUNNEL_GENERATION_STEPS[curKey] || FUNNEL_GENERATION_STEPS.flow
    : effectiveGenerationMode === "brand"
      ? curKey === "plan" ? BRAND_PLAN_STEPS : BRAND_REPORT_STEPS
    : curKey === "plan" ? ACTION_PLAN_STEPS : AUDIT_SCORING_STEPS;
  const guidedGeneration = ["audit", "brand", "seo"].includes(effectiveGenerationMode || "") && (curKey === "report" || curKey === "plan")
    || effectiveGenerationMode === "website_builder" && (curKey === "direction" || curKey === "tasks")
    || effectiveGenerationMode === "funnel" && !!FUNNEL_GENERATION_STEPS[curKey];
  const finalScoringMessages = [
    "Calculating the internal checklist score",
    "Keeping Lighthouse results in a separate technical report",
    "Checking score formulas and evidence links",
    "Organizing every passed, failed, and unverified item",
    "Preparing the review-ready audit report",
  ];
  const finalPlanMessages = ["Checking the action order", "Linking Lighthouse findings to fixes", "Removing duplicate recommendations", "Preparing the implementation-ready plan"];
  const finalBrandMessages = curKey === "plan"
    ? ["Checking each action against an approved finding", "Preparing the brand action plan"]
    : ["Checking every visual value against live evidence", "Preparing the brand system for review"];
  const funnelFinalMessages = funnelGeneration?.final || [];
  const finalGenerationMessages = effectiveGenerationMode === "funnel" && funnelFinalMessages.length
    ? funnelFinalMessages
    : effectiveGenerationMode === "brand" ? finalBrandMessages
    : curKey === "plan" ? finalPlanMessages : finalScoringMessages;
  const generationHeading = funnelGeneration?.heading || (effectiveGenerationMode === "brand" ? curKey === "plan" ? "Planning the brand improvements" : "Building the verified brand system" : curKey === "plan" || curKey === "tasks" ? "Building your action plan" : effectiveGenerationMode === "website_builder" ? "Mapping the website rebuild" : effectiveGenerationMode === "seo" ? "Preparing your SEO audit" : "Scoring your site against the checklist");
  const generationDescription = funnelGeneration?.description || (effectiveGenerationMode === "brand" ? curKey === "plan" ? "We are turning the approved brand findings into a focused, evidence-backed sequence of actions." : "We are matching the intake and client notes to live website colours, typography, logo, messaging, and voice." : curKey === "plan" || curKey === "tasks" ? "We are sequencing the approved direction into clear implementation tasks." : effectiveGenerationMode === "website_builder" ? "We are matching every sitemap page to the redesign scope before design begins." : effectiveGenerationMode === "seo" ? "We are combining website evidence with available analytics context without inventing search data." : "We are checking the rendered pages systematically—not grading from intake alone.");
  const stageApproved = !!s.approved[curKey];
  const currentStageExtra = stageExtra?.(curKey);
  const docs = useMemo(() => (pipeline ? pipeline.buildDocs(collected) : null), [pipeline, collected]);

  useEffect(() => {
    const supported = ["audit", "brand", "seo"].includes(effectiveGenerationMode || "") && ["report", "plan"].includes(generatingStage || "")
      || effectiveGenerationMode === "website_builder" && ["direction", "tasks"].includes(generatingStage || "")
      || effectiveGenerationMode === "funnel" && !!FUNNEL_GENERATION_STEPS[generatingStage || ""];
    if (!generatingStage || !supported) return;
    setGenerationTick(0);
    const interval = setInterval(() => setGenerationTick(tick => tick + 1), 1200);
    return () => clearInterval(interval);
  }, [effectiveGenerationMode, generatingStage]);

  const beginBuild = () => { dispatch({ t: "beginBuild" }); toast("Discovery locked — starting the build"); };
  const gotoStage = (i: number) => { if (i <= maxStage) dispatch({ t: "gotoStage", i }); };
  const onGen = async () => {
    if (!pipeline || !effectiveGenerationMode || isGenerating) return;
    setGeneratingStage(curKey);
    setGenerationError(null);
    try {
      const auditReportContext = isAuditScoreResult(aiResults.report) ? {
        overallScore: aiResults.report.overallScore,
        evidenceCoverage: aiResults.report.evidenceCoverage,
        lighthouse: aiResults.report.lighthouse,
        categories: aiResults.report.categories.map(category => ({
          label: category.label,
          score: category.score,
          failedChecks: category.checks.filter(check => check.status === "fail"),
          courseOfAction: category.courseOfAction,
          issues: category.issues,
        })),
        priorities: aiResults.report.priorities,
      } : undefined;
      const priorStageContext = effectiveGenerationMode === "audit" ? auditReportContext : effectiveGenerationMode === "funnel" || effectiveGenerationMode === "brand" || effectiveGenerationMode === "seo" || effectiveGenerationMode === "website_builder" ? aiResults : undefined;
      const response = await fetch("/api/ai/generate-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: effectiveGenerationMode, stageKey: curKey, clientName, personName, brandName, data: collected, clientNotes: prefillNotes, priorResult: priorStageContext }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Generation failed.");
      if (!isGeneratedStageResult(payload?.result)) throw new Error("The generated response was incomplete. Please try again.");
      const nextResults = { ...aiResults, [curKey]: payload.result };
      setAiResults(nextResults);
      if (["audit", "brand", "seo"].includes(effectiveGenerationMode) && curKey === "report") {
        toast("The audit report is complete — ready to reveal", () => {
          document.querySelector('[data-pipeline-stage="report"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else if (effectiveGenerationMode === "funnel") {
        toast(`${curStage.label} is complete — ready to reveal`, () => {
          document.querySelector(`[data-pipeline-stage="${curKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else {
        toast(`${curStage.label} is ready to review`);
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setGeneratingStage(null);
    }
  };
  const requestChanges = () => {
    setAiResults(results => {
      const next = { ...results };
      delete next[curKey];
      return next;
    });
    setGenerationError(null);
  };
  const approveStage = () => {
    dispatch({ t: "approve", k: curKey });
    if (isLast) {
      dispatch({ t: "proposal", v: true });
      void onPipelineComplete?.(collected, aiResults);
    }
    else dispatch({ t: "setStage", i: s.stage + 1 });
    toast(isLast ? "Approved — here’s the summary" : "Approved — next stage unlocked");
  };
  const continueFromMemory = () => {
    setMemoryResolved(true);
    dispatch({ t: "typing", v: true });
    const id = setTimeout(() => dispatch({ t: "typing", v: false }), 620);
    timers.current.push(id);
  };
  const applyQuickStart = (delta: Know, options?: QuickStartApplyOptions) => {
    if (options?.replaceSourceReview) {
      dispatch({ t: "replaceIngest", data: delta.data });
      setAiResults({});
      setGenerationError(null);
    }
    onIngest?.(delta, options);
  };
  const restartDiscovery = () => {
    setMemoryResolved(!hasMemoryChoice);
    setAiResults({});
    setGenerationError(null);
    if (sessionKey) window.localStorage.removeItem(`guided-audit:${sessionKey}`);
    dispatch({ t: "restart" });
  };

  // ── styles ──
  const card = "border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden";
  const railWrap = "border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden" + (mobile ? "" : ";position:sticky;top:0.5rem");
  const bubble = "background:var(--surface);border:1px solid var(--border-soft);border-radius:14px;border-top-left-radius:4px;padding:0.8rem 0.95rem;font-size:0.9rem;line-height:1.55;color:var(--fg-muted)";
  const activeQuestionBorder = quickStartMode === "audit" ? `color-mix(in srgb,${accent} 24%,var(--border-soft) 76%)` : "var(--accent-dim)";
  const optBtn = (sel: boolean) => "border:1px solid " + (sel ? accent : "var(--border)") + ";border-radius:var(--radius-pill);background:" + (sel ? "color-mix(in srgb," + accent + " 12%,white 88%)" : "var(--surface)") + ";color:" + (sel ? accent : "var(--fg)") + ";padding:0.5rem 0.9rem;font-size:var(--text-base);font-weight:500;cursor:pointer;font-family:inherit";

  // ── rail ──
  const doneStages = stages.reduce((n, st, i) => n + (s.approved[i === 0 ? "discovery" : st.key] ? 1 : 0), 0);
  const rail = (
    <div style={css(railWrap)}>
      <div style={css("padding:0.9rem 1rem;border-bottom:1px solid var(--border-soft)")}>
        <div style={css("display:flex;align-items:center;gap:0.55rem")}>
          <span style={css("width:2rem;height:2rem;border-radius:0.65rem;background:" + accent + ";color:#fff;display:grid;place-items:center;flex-shrink:0")}><Icon name="layers" size={16} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={css("font-size:var(--text-md);font-weight:500;line-height:1.15")}>{pipeline?.railTitle || "Build pipeline"}</div>
            <div style={css("font-size:var(--text-sm);color:var(--fg-muted);margin-top:0.12rem")}>{stages.length}-stage guided workflow</div>
          </div>
        </div>
      </div>
      <div style={css("padding:0.35rem 0")}>
        {stages.map((st, i) => {
          const key = i === 0 ? "discovery" : st.key;
          const isDone = !!s.approved[key];
          const isCurrent = s.stage === i && !s.proposal;
          const locked = i > maxStage;
          const dot = isDone
            ? "background:var(--success);border:1.5px solid var(--success);color:#fff"
            : isCurrent ? "background:var(--success);border:1.5px solid var(--success);color:#fff"
              : locked ? "background:var(--surface);border:1.5px dashed var(--border);color:var(--fg-faint)"
                : "background:var(--surface);border:1.5px solid var(--border);color:var(--fg-muted)";
          return (
            <button key={st.key} type="button" onClick={() => !locked && gotoStage(i)} disabled={locked} style={css("width:calc(100% - 1rem);margin:0 0.5rem;display:flex;align-items:center;gap:0.65rem;min-height:2.35rem;padding:0.3rem 0.6rem;border:none;border-radius:999px;text-align:left;font-family:inherit;cursor:" + (locked ? "default" : "pointer") + ";background:" + (isCurrent ? "color-mix(in srgb,var(--success) 9%,white 91%)" : "transparent") + ";opacity:" + (locked ? "0.58" : "1"))}>
              <span style={css("width:1.2rem;height:1.2rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;font-size:0.62rem;font-weight:500;" + dot)}>{isDone ? <Icon name="checkmark" size={9} /> : (i + 1)}</span>
              <span style={css("min-width:0;font-size:var(--text-base);font-weight:" + (isCurrent || isDone ? "500" : "400") + ";color:" + (isCurrent ? "var(--success)" : locked ? "var(--fg-muted)" : "var(--fg)") + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2")}>{st.label}</span>
            </button>
          );
        })}
      </div>
      <div style={css("padding:0.75rem 1rem 0.85rem;border-top:1px solid var(--border-soft)")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.65rem;margin-bottom:0.5rem")}>
          <span style={css("font-size:var(--text-xs);font-weight:500;color:" + (doneStages ? "var(--success)" : "var(--fg-muted)"))}>{doneStages} of {stages.length} complete</span>
          <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{Math.round((doneStages / stages.length) * 100)}%</span>
        </div>
        <div style={css("height:4px;border-radius:999px;background:var(--bg);overflow:hidden")}>
          <div style={css("height:100%;border-radius:999px;background:var(--success);width:" + Math.max((doneStages / stages.length) * 100, 2) + "%;transition:width .45s ease")} />
        </div>
      </div>
    </div>
  );

  // ── intro screen ──
  const introList = (
    <div style={css("margin-top:1.1rem;border:1px solid var(--border-soft);border-radius:var(--radius);overflow:hidden")}>
      {introSteps.map((step, i) => (
        <div key={step.title} style={css("display:flex;align-items:center;gap:0.7rem;padding:0.62rem 0.85rem;background:var(--surface)" + (i < introSteps.length - 1 ? ";border-bottom:1px solid var(--border-soft)" : ""))}>
          {step.icon
            ? <span style={css("width:1.85rem;height:1.85rem;border-radius:8px;background:color-mix(in srgb," + accent + " 14%,white 86%);color:" + accent + ";display:grid;place-items:center;flex-shrink:0")}><Icon name={step.icon} size={15} /></span>
            : <span style={css("width:1.45rem;height:1.45rem;border-radius:50%;border:1px solid var(--border);display:grid;place-items:center;font-size:0.68rem;color:var(--fg-muted);flex-shrink:0")}>{i + 1}</span>}
          <span style={css("flex:1;min-width:0;font-size:0.85rem;font-weight:500")}>{step.title}</span>
          {step.tag && <span style={css("font-size:0.68rem;color:var(--fg-faint);white-space:nowrap")}>{step.tag}</span>}
        </div>
      ))}
    </div>
  );
  const introLeft = (
    <div style={css("padding:" + (mobile ? "1.4rem 1.3rem 1.6rem" : "1.9rem 1.8rem 2rem") + ";display:flex;flex-direction:column")}>
      <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;display:flex;align-items:center;gap:var(--space-2);color:" + accent)}><span style={css("width:0.38rem;height:0.38rem;border-radius:50%;background:" + accent)} />{intro.eyebrow}</div>
      <h2 style={css("margin:0.75rem 0 0;font-size:1.55rem;font-weight:500;line-height:1.1;letter-spacing:-0.02em")}>{intro.heading}</h2>
      {introList}
      <button type="button" onClick={() => dispatch({ t: "enter" })} className="pt-op" style={css("margin-top:1.2rem;border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;padding:0.68rem 1.5rem;font-size:0.86rem;font-weight:500;cursor:pointer;font-family:inherit;width:100%")}>{startLabel}</button>
    </div>
  );
  const introScreen = (
    <div style={css(card + ";animation:cocoonFade .2s ease both")}>
      {pipeline?.introPreview && !mobile
        ? <div style={css("display:grid;grid-template-columns:minmax(0,1fr) minmax(0,0.82fr);align-items:stretch")}>{introLeft}<div style={css("position:relative;background:var(--surface-alt);border-left:1px solid var(--border-soft);overflow:hidden;min-height:28rem")}>{pipeline.introPreview(mobile)}</div></div>
        : <>{introLeft}{pipeline?.introPreview && <div style={css("padding:0 1.3rem 1.4rem")}>{pipeline.introPreview(mobile)}</div>}</>}
    </div>
  );

  // ── chat ──
  const chat = (
    <div style={css(card)}>
      <div style={css("background:var(--surface);border-bottom:1px solid var(--border-soft);padding:0.85rem 1.1rem 0.95rem")}>
        <div style={css("display:flex;align-items:center;gap:0.7rem")}>
          <span style={css("width:2.1rem;height:2.1rem;border-radius:10px;background:" + accent + ";color:#fff;display:grid;place-items:center;flex-shrink:0")}><Icon name="feather" size={16} /></span>
          <div style={css("flex:1;min-width:0")}><div style={css("font-size:var(--text-lg);font-weight:500")}>{stages[0]?.label || "Discovery"}</div><div style={css("font-size:0.74rem;color:var(--fg-muted)")}>{pct}% of {progressLabel}</div></div>
          {memoryResolved && <button type="button" onClick={onStartOverRequest || restartDiscovery} className="pt-softbtn" style={css("border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);font-size:0.78rem;font-weight:500;padding:0.36rem 0.74rem;border-radius:var(--radius-pill);cursor:pointer;font-family:inherit")}>{quickStartMode === "funnel" ? "Start funnel over" : "Start audit over"}</button>}
        </div>
        <div style={css("height:0.45rem;border-radius:999px;background:oklch(0.92 0.006 50);overflow:hidden;margin-top:0.8rem")}><div style={css("height:100%;border-radius:999px;background:" + accent + ";width:" + pct + "%;transition:width .5s ease")} /></div>
      </div>

      <div ref={scrollRef} style={css("padding:1.1rem;display:flex;flex-direction:column;gap:var(--space-3);max-height:" + (mobile ? "60vh" : "32rem") + ";overflow-y:auto;scroll-behavior:smooth")}>
        {s.introReveal >= 0 && (
          <div style={css("flex-shrink:0;display:flex;gap:0.6rem;align-items:flex-start;animation:cocoonFade .3s ease both")}>
            <span style={css("width:1.9rem;height:1.9rem;flex-shrink:0;border-radius:50%;display:grid;place-items:center;font-size:0.56rem;font-weight:500;background:color-mix(in srgb," + accent + " 14%,white 86%);color:" + accent)}>BS</span>
            <div style={css(bubble)}>{quickStartMode === "brand" ? "Add the brand sources, then review each answer. Skip anything you do not know." : quickStartMode === "audit" ? "Add the website, then review each answer. Skip anything you do not know." : "Answer what you can. Skip anything you do not know."}</div>
          </div>
        )}

        {hasMemoryChoice && !memoryResolved && s.introReveal > 0 && s.introReveal < 2 && (
          <div style={css("flex-shrink:0;display:flex;gap:0.55rem;align-items:flex-start")}>
            <span style={css("width:1.7rem;height:1.7rem;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-size:0.52rem;font-weight:500;background:color-mix(in srgb," + accent + " 14%,white 86%);color:" + accent)}>BS</span>
            <div style={css("display:flex;align-items:center;gap:0.28rem;background:var(--surface);border:1px solid var(--border-soft);border-radius:14px;border-top-left-radius:4px;padding:0.7rem 0.85rem")}>
              {[0, 1, 2].map(i => <span key={i} className="pt-typing-dot" style={{ background: accent, animationDelay: i * 0.15 + "s" }} />)}
            </div>
          </div>
        )}

        {quickStartMode && onIngest && !memoryResolved && s.introReveal >= 2 && (
          <div style={css("flex-shrink:0")}>
            <QuickStart mode={quickStartMode} accent={accent} known={{ data: { ...(prefill || {}), ...s.data }, sources: prefillSources || {} }} questionLabels={questionLabels} onApply={applyQuickStart} onContinue={continueFromMemory} showToast={showToast} mobile={mobile} clientName={clientName} clientId={quickStartClientId} currentUrl={typeof s.data.url === "string" ? s.data.url : undefined} />
          </div>
        )}

        {groups.map(g => (
          <div key={g.topic} style={css("flex-shrink:0;border:1px solid var(--border-soft);border-radius:12px;overflow:hidden;animation:cocoonFade .25s ease both")}>
            <div style={css("display:flex;align-items:center;gap:0.55rem;padding:0.6rem 0.85rem;background:color-mix(in srgb," + accent + " 8%,white 92%)")}>
              <span style={css("width:1.5rem;height:1.5rem;border-radius:7px;background:color-mix(in srgb," + accent + " 16%,white 84%);color:" + accent + ";display:grid;place-items:center;flex-shrink:0")}><Icon name={g.icon} size={12} /></span>
              <span style={css("font-size:0.86rem;font-weight:500")}>{g.topic}</span>
            </div>
            {g.items.map((it, i) => (
              <div key={i} style={css("display:flex;align-items:center;gap:var(--space-4);padding:0.62rem 0.85rem" + (i < g.items.length - 1 ? ";border-top:1px solid var(--border-soft)" : ""))}>
                <span style={css("flex:1;min-width:0;font-size:var(--text-base);color:" + (it.skipped ? "var(--fg-faint)" : "var(--fg-muted)"))}>{it.label}</span>
                {it.skipped
                  ? <span style={css("flex-shrink:0;font-size:var(--text-xs);font-weight:500;color:var(--fg-faint);border:1px dashed var(--border);border-radius:999px;padding:0.14rem 0.62rem")}>Skipped</span>
                  : it.list
                    ? <ul style={css("flex-shrink:0;max-width:18rem;margin:0;padding-left:1.1rem;text-align:left;color:" + accent)}>{it.answer.split(/\r?\n/).map(line => line.replace(/^\s*[-*•]\s*/, "").trim()).filter(Boolean).map(line => <li key={line} style={css("font-size:var(--text-base);font-weight:500;line-height:1.45")}>{line}</li>)}</ul>
                    : <span style={css("flex-shrink:0;max-width:16rem;text-align:right;font-size:var(--text-base);font-weight:500;color:" + accent + ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{it.answer}</span>}
              </div>
            ))}
          </div>
        ))}

        {memoryResolved && s.typing && !complete && (
          <div style={css("flex-shrink:0;display:flex;gap:0.55rem;align-items:flex-start")}>
            <span style={css("width:1.7rem;height:1.7rem;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-size:0.52rem;font-weight:500;background:color-mix(in srgb," + accent + " 14%,white 86%);color:" + accent)}>BS</span>
            <div style={css("display:flex;align-items:center;gap:0.28rem;background:var(--surface);border:1px solid var(--border-soft);border-radius:14px;border-top-left-radius:4px;padding:0.7rem 0.85rem")}>
              {[0, 1, 2].map(i => <span key={i} className="pt-typing-dot" style={{ background: accent, animationDelay: i * 0.15 + "s" }} />)}
            </div>
          </div>
        )}

        {memoryResolved && cur && !s.typing && (
          <div style={css("flex-shrink:0;display:flex;gap:0.55rem;align-items:flex-start;animation:cocoonFade .3s ease both")}>
            <span style={css("width:1.9rem;height:1.9rem;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-size:0.56rem;font-weight:500;background:" + accent + ";color:#fff")}>BS</span>
            <div style={css("flex:1;min-width:0;display:flex;flex-direction:column;gap:0.6rem")}>
              <div style={css("background:color-mix(in srgb," + accent + " 6%,white 94%);border:1px solid " + activeQuestionBorder + ";border-radius:16px;border-top-left-radius:5px;padding:0.85rem 1rem")}>
                <div style={css("display:flex;align-items:center;gap:var(--space-2);margin-bottom:0.5rem")}>
                  <span style={css("text-transform:uppercase;font-size:0.74rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + accent + ";background:color-mix(in srgb," + accent + " 14%,white 86%);padding:0.18rem 0.54rem;border-radius:999px")}>{cur.topic}</span>
                  <span style={css("font-size:0.74rem;color:var(--fg-faint);white-space:nowrap")}>{s.qIdx + 1} of {total}</span>
                </div>
                <div style={css("font-size:0.98rem;font-weight:500;line-height:1.4")}>{cur.label}</div>
                {cur.hint && <div style={css("font-size:0.84rem;color:var(--fg-muted);margin-top:0.28rem;line-height:1.45")}>{cur.hint}</div>}
              </div>

              {cur.kind === "single" && (
                <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem")}>
                  {cur.opts!.map(o => <button key={o} type="button" onClick={() => dispatch({ t: "single", k: cur.key, v: o })} style={css(optBtn(s.data[cur.key] === o))}>{s.data[cur.key] === o ? "✓ " : ""}{o}</button>)}
                </div>
              )}
              {cur.kind === "multi" && (() => {
                const val = Array.isArray(s.data[cur.key]) ? (s.data[cur.key] as string[]) : [];
                return (
                  <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem")}>
                    {cur.opts!.map(o => <button key={o} type="button" onClick={() => dispatch({ t: "toggle", k: cur.key, v: o })} style={css(optBtn(val.includes(o)))}>{val.includes(o) ? "✓ " : ""}{o}</button>)}
                  </div>
                );
              })()}
              {cur.kind === "text" && (
                <input value={s.draft} onChange={e => dispatch({ t: "draft", v: e.target.value })} onKeyDown={e => { if (e.key === "Enter") dispatch({ t: "sendText", k: cur.key }); }} placeholder={cur.ph} className="pt-input" style={css("width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:var(--radius-pill);padding:0.6rem 0.95rem;font-size:0.85rem;background:var(--surface-alt);font-family:inherit;outline:none")} />
              )}
              {cur.kind === "textarea" && (
                <div>
                  <textarea value={s.draft} onChange={e => dispatch({ t: "draft", v: e.target.value })} onKeyDown={e => { if (cur.list && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const target = e.currentTarget; const start = target.selectionStart; const end = target.selectionEnd; const prefix = s.draft.trim() ? "\n• " : "• "; dispatch({ t: "draft", v: s.draft.slice(0, start) + prefix + s.draft.slice(end) }); } }} placeholder={cur.ph} rows={cur.list ? 5 : 3} className="pt-input" style={css("width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:var(--radius);padding:0.6rem 0.85rem;font-size:0.85rem;line-height:1.55;background:var(--surface-alt);font-family:inherit;resize:vertical;outline:none")} />
                  {cur.list && <div style={css("margin-top:.32rem;font-size:.72rem;line-height:1.4;color:var(--fg-faint)")}>Add one page or content item per line. We’ll keep it formatted as a bulleted list.</div>}
                </div>
              )}

              {isAiSuggestion(cur.key) && prefillNotes?.[cur.key] && (
                <div role="note" style={css("border:1px solid color-mix(in srgb," + accent + " 22%,var(--border) 78%);border-radius:var(--radius);background:color-mix(in srgb," + accent + " 6%,white 94%);padding:0.72rem 0.8rem;font-size:0.82rem;line-height:1.5;color:var(--fg-muted)")}>
                  <strong style={css("display:block;margin-bottom:0.2rem;font-size:0.76rem;font-weight:500;color:" + accent)}>Here’s what we found</strong>
                  {prefillNotes[cur.key]}
                </div>
              )}

              <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-top:0.25rem")}>
                <div style={css("display:flex;gap:var(--space-2)")}>
                  {s.qIdx > 0 && <button type="button" onClick={() => dispatch({ t: "back" })} className="pt-softbtn" style={css("border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-muted);font-size:0.8rem;font-weight:500;cursor:pointer;font-family:inherit;padding:0.45rem 0.95rem;border-radius:var(--radius-pill)")}>← Back</button>}
                  <button type="button" onClick={() => dispatch({ t: "skip" })} className="pt-softbtn" style={css("border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-muted);font-size:0.8rem;font-weight:500;cursor:pointer;font-family:inherit;padding:0.45rem 0.95rem;border-radius:var(--radius-pill)")}>Skip this →</button>
                </div>
                {(cur.kind === "text" || cur.kind === "textarea") && <button type="button" onClick={submitCurrentText} disabled={!s.draft.trim()} className="pt-op" style={css("border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;padding:0.55rem 1.35rem;font-size:0.84rem;font-weight:500;cursor:" + (s.draft.trim() ? "pointer" : "not-allowed") + ";opacity:" + (s.draft.trim() ? "1" : ".5") + ";font-family:inherit")}>Continue</button>}
                {(cur.kind === "single" || cur.kind === "multi") && <button type="button" onClick={() => dispatch({ t: "next" })} disabled={!canContinueSelection} className="pt-op" style={css("border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;padding:0.55rem 1.35rem;font-size:0.84rem;font-weight:500;cursor:" + (canContinueSelection ? "pointer" : "not-allowed") + ";opacity:" + (canContinueSelection ? "1" : ".5") + ";font-family:inherit")}>Continue</button>}
              </div>
            </div>
          </div>
        )}

        {memoryResolved && complete && (
          <>
            <div style={css("flex-shrink:0;border:1px solid color-mix(in srgb," + accent + " 24%,var(--border-soft) 76%);border-radius:var(--radius-panel);background:color-mix(in srgb," + accent + " 8%,white 92%);padding:1.1rem 1.25rem;text-align:center;animation:cocoonFade .3s ease both")}>
              <div style={css("font-size:var(--text-lg);font-weight:500")}>{completeTitle}</div>
              <p style={css("margin:0.35rem auto 0.85rem;font-size:0.83rem;color:var(--fg-muted);line-height:1.5;max-width:30rem")}>{(pipeline?.beginMsg && pipeline.beginMsg(collected)) || completeMsg}</p>
              <button type="button" onClick={() => (pipeline ? beginBuild() : onComplete(collected))} className="pt-op" style={css("border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;padding:0.6rem 1.3rem;font-size:0.85rem;font-weight:500;cursor:pointer;font-family:inherit")}>{pipeline ? pipeline.beginLabel : completeCta}</button>
            </div>
            {completeExtra}
          </>
        )}
      </div>
    </div>
  );

  // ── stage panel ──
  const statusPill = stageApproved
    ? ["Approved", "var(--success)", "var(--success-soft)"]
    : genDone ? ["Ready for review", accent, "color-mix(in srgb," + accent + " 14%,white 86%)"]
      : ["Not generated", "var(--fg-muted)", "var(--surface-alt)"];
  const stagePanel = pipeline && curStage && (
    <div data-pipeline-stage={curKey} style={css(card + ";width:100%;box-sizing:border-box;animation:cocoonFade .2s ease both")}>
      <div style={css("padding:0.9rem 1.15rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;gap:0.6rem")}>
        <span style={css("width:1.9rem;height:1.9rem;border-radius:8px;background:color-mix(in srgb," + accent + " 14%,white 86%);color:" + accent + ";display:grid;place-items:center")}><Icon name={curStage.icon} size={17} /></span>
        <div style={css("flex:1;min-width:0")}>
          <div style={css("font-size:0.98rem;font-weight:500")}>{curStage.label}</div>
          <div style={css("margin-top:0.08rem;font-size:0.68rem;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{personName ? `For ${personName} · ` : ""}{brandName}</div>
        </div>
        <span style={css("font-size:0.68rem;font-weight:500;padding:0.2rem 0.6rem;border-radius:999px;background:" + statusPill[2] + ";color:" + statusPill[1])}>{statusPill[0]}</span>
      </div>

      {!genDone ? (
        <div style={css("padding:2.4rem 1.5rem;text-align:center")}>
          {!isGenerating && <p style={css("margin:0 auto 0.95rem;font-size:0.9rem;color:var(--fg-muted);line-height:1.55;max-width:30rem")}>{pipeline.genPrompt(curKey)}</p>}
          {isGenerating && guidedGeneration ? (
            <GuidedLoadingState accent={accent} heading={generationHeading} description={generationDescription} steps={generationSteps} tick={generationTick} finalMessages={finalGenerationMessages} fullWidth={quickStartMode === "funnel"}/>
          ) : <button type="button" onClick={() => void onGen()} disabled={isGenerating} className="pt-op" style={css("border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;padding:0.6rem 1.3rem;font-size:0.85rem;font-weight:500;cursor:" + (isGenerating ? "wait" : "pointer") + ";font-family:inherit;opacity:" + (isGenerating ? ".72" : "1"))}>{isGenerating ? "Generating…" : `✦ ${pipeline.genCta(curKey)}`}</button>}
          {generationError && (
            <div role="alert" style={css("margin:0.9rem auto 0;max-width:30rem;border:1px solid color-mix(in srgb,var(--danger) 28%,var(--border) 72%);border-radius:var(--radius);background:color-mix(in srgb,var(--danger) 7%,white 93%);padding:0.7rem 0.85rem;color:var(--danger);font-size:0.76rem;line-height:1.45")}>{generationError}</div>
          )}
        </div>
      ) : (
        <div style={css("padding:1.15rem 1.25rem")}>
          {isAiStageResult(aiResult) && !["funnel", "website_builder", "brand"].includes(quickStartMode || "") && !(quickStartMode === "audit" && curKey === "plan") && <section aria-label="Generated strategy" style={css("margin-bottom:1.1rem;border:1px solid color-mix(in srgb," + accent + " 22%,var(--border) 78%);border-radius:var(--radius-panel);background:color-mix(in srgb," + accent + " 5%,white 95%);padding:1rem 1.05rem") }>
            <div style={css("display:flex;align-items:center;gap:0.55rem;margin-bottom:0.5rem")}><span style={css("width:1.65rem;height:1.65rem;border-radius:50%;display:grid;place-items:center;background:" + accent + ";color:#fff;font-size:0.52rem;font-weight:500")}>BS</span><strong style={css("font-size:0.94rem;font-weight:500")}>{aiResult.title}</strong></div>
            <p style={css("margin:0;color:var(--fg-muted);font-size:0.8rem;line-height:1.55")}>{aiResult.summary}</p>
            <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "repeat(2,minmax(0,1fr))") + ";gap:0.65rem;margin-top:0.85rem") }>
              {aiResult.sections.map(section => (
                <article key={section.heading} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface);padding:0.75rem 0.8rem")}>
                  <h4 style={css("margin:0;font-size:0.78rem;font-weight:500")}>{section.heading}</h4>
                  <p style={css("margin:0.3rem 0 0;font-size:0.72rem;color:var(--fg-muted);line-height:1.45")}>{section.body}</p>
                  <ul style={css("margin:0.48rem 0 0;padding-left:1rem;color:var(--fg-muted);font-size:0.7rem;line-height:1.45")}>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>
                </article>
              ))}
            </div>
            <div style={css("display:flex;flex-direction:column;gap:0.45rem;margin-top:0.8rem") }>
              {aiResult.recommendations.map((recommendation, index) => (
                <div key={recommendation.title} style={css("display:grid;grid-template-columns:1.45rem minmax(0,1fr);gap:0.55rem;align-items:start") }>
                  <span style={css("width:1.35rem;height:1.35rem;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb," + accent + " 12%,white 88%);color:" + accent + ";font-size:0.62rem;font-weight:500")}>{index + 1}</span>
                  <div><strong style={css("display:block;font-size:0.74rem;font-weight:500")}>{recommendation.title}</strong><span style={css("display:block;margin-top:0.12rem;font-size:0.69rem;color:var(--fg-muted);line-height:1.4")}>{recommendation.rationale} <b style={css("font-weight:500;color:var(--fg)")}>Next: {recommendation.action}</b></span></div>
                </div>
              ))}
            </div>
          </section>}
          {pipeline.renderStage({
            stageKey: curKey, docs, aiResult, aiResults, reveal: Number.POSITIVE_INFINITY, building: false, approved: stageApproved, mobile, accent,
            onAdvance: approveStage,
            onDownload: async () => {
              toast("Opening the print dialog…");
              const ok = await printReportNode(document.querySelector(`[data-pipeline-stage="${curKey}"]`), `${clientName} · ${curStage.label}`);
              toast(ok ? "Choose Print or Save as PDF" : "The print dialog could not be opened");
            },
            onShare: () => toast("Share link copied — send it to your client"),
            onCopy: () => toast("Copied to clipboard"),
          })}
          {genDone && !stageApproved && (
            <div style={css("margin-top:1.15rem;padding-top:1rem;border-top:1px solid var(--border-soft);display:flex;align-items:center;justify-content:flex-end;gap:0.6rem")}>
              <button type="button" onClick={requestChanges} className="pt-softbtn" style={css("border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.5rem 1rem;font-size:0.8rem;cursor:pointer;font-family:inherit")}>Request changes</button>
              <button type="button" onClick={approveStage} className="pt-op" style={css("border:none;border-radius:var(--radius-pill);background:var(--success);color:#fff;padding:0.5rem 1.15rem;font-size:var(--text-base);font-weight:500;cursor:pointer;font-family:inherit")}>{pipeline.approveLabel(curKey, isLast)}</button>
            </div>
          )}
          {currentStageExtra}
        </div>
      )}
    </div>
  );

  // ── main content selector ──
  let main: ReactNode;
  if (pipeline && s.proposal) {
    main = pipeline.renderProposal({
      docs, aiResults, clientName, mobile, accent, sent: false,
      onBack: () => dispatch({ t: "proposal", v: false }),
      onExit,
      onRequest: () => toast("Sent to Baltz — we’ll be in touch"),
      onShare: shareFinal,
      onImportTasks: drafts => onImportTasks?.(drafts),
    });
  } else if (pipeline && s.stage >= 1 && curStage) {
    main = stagePanel;
  } else {
    main = !s.entered ? introScreen : chat;
  }

  return (
    <div style={css("width:100%;max-width:60rem;margin:0 auto;display:flex;flex-direction:column;gap:0.85rem;box-sizing:border-box;animation:cocoonFade .2s ease both")}>
      {!hideHeader && <div style={css("display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap")}>
        <button type="button" onClick={onExit} className="pt-softbtn" style={css("border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.4rem 0.8rem;font-size:0.78rem;cursor:pointer;font-family:inherit")}>{backLabel}</button>
        <div style={{ minWidth: 0 }}><span style={css("font-size:var(--text-lg);font-weight:500")}>{title}</span><span style={css("font-size:var(--text-base);color:var(--fg-muted)")}> · {clientName}</span></div>
      </div>}
      <div style={css(mobile ? "display:flex;flex-direction:column;gap:0.85rem" : "display:grid;grid-template-columns:17rem minmax(0,1fr);gap:0.85rem;align-items:start")}>
        {rail}
        <div style={css("width:100%;min-width:0")}>{main}</div>
      </div>
    </div>
  );
}
