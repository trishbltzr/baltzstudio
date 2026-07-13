"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { coercePersistedAuditDrafts, type GuidedAuditSession, type PersistedAuditDraft, type PersistedAuditRun, type PersistedAuditState } from "@/lib/portalAuditPersistence";
import { css } from "../helpers";
import { Icon } from "../icons";
import type { PortalActions, PortalState } from "../store";
import { clientsVisibleToRole, STUDIO_CLIENTS, type StudioClient } from "../clients";
import { GuidedIntakeSelector } from "../components/GuidedIntakeSelector";
import { AuditTypeWorkspace } from "./AuditTypeWorkspace";
import { AuditReportView, getAuditReportSummary } from "../views/AuditReportView";
import { DiscoveryBuilder } from "../discovery/DiscoveryBuilder";
import { fromClientMemory, getKnowledge, loadPersistedKnowledge, recordKnowledge, rememberKnowledge, mergeKnow, type Know } from "../discovery/knowledge";
import { ContinueWithFunnelBuildingCard } from "@/components/CocoonFinalStepPanel";
import { AUDIT_WIZARD, AUDIT_STAGES, AUDIT_INTRO_STEPS, AUDIT_DEMO } from "../discovery/discoveryData";
import { AUDIT_PIPELINE, AuditScoreHero, auditScoreToDocs, synthAuditScore, type AuditDocs } from "../discovery/auditPipeline";
import { AUDIT_CHECKLIST, isAuditScoreResult } from "@/lib/auditChecklist";
import type { GeneratedStageResult } from "@/lib/aiStageGeneration";

type QKind = "text" | "textarea" | "choice" | "checklist";
type Ans = Record<string, string | string[]>;

interface AuditQuestion {
  id: string;
  s: number;
  kind: QKind;
  required?: boolean;
  prompt: string;
  placeholder?: string;
  help?: string;
  options?: string[];
}

interface AuditDeliverable {
  id: string;
  title: string;
  from: string;
  intro: string;
  terminal?: boolean;
}

type AuditRun = PersistedAuditRun;

interface AuditState {
  clientId: string | null;
  buildId: string | null;
  idx: number;
  answers: Ans;
  unsure: Record<string, boolean>;
  confirmed: Record<number, boolean>;
  signed: Record<string, boolean>;
  notes: Record<string, string>;
  requesting: boolean;
  draftNote: string;
  error: string;
  genActive: boolean;
  genLabel: string;
  genDone: Record<string, boolean>;
}

type Act =
  | { t: "select"; clientId: string; buildId: string }
  | { t: "load"; state: AuditState }
  | { t: "toPicker" }
  | { t: "go"; i: number }
  | { t: "err"; m: string }
  | { t: "text"; id: string; v: string }
  | { t: "choice"; id: string; v: string }
  | { t: "check"; id: string; v: string }
  | { t: "unsure"; id: string }
  | { t: "confirmGate"; s: number }
  | { t: "sign"; id: string }
  | { t: "reqChanges"; note: string }
  | { t: "cancelReq" }
  | { t: "draft"; v: string }
  | { t: "sendNote"; id: string }
  | { t: "restart" }
  | { t: "autofill"; s: number }
  | { t: "demoAll"; finalIdx: number }
  | { t: "gen"; active: boolean; label?: string }
  | { t: "genDone"; id: string };

const SECTIONS = ["Business & brand", "Audience & offer", "Goals & conversion", "Site & messaging", "Assets & priorities"];

const QUESTIONS: AuditQuestion[] = [
  { id: "business", s: 0, kind: "text", required: true, prompt: "What's the business called?", placeholder: "Client business name" },
  { id: "offer", s: 0, kind: "text", required: true, prompt: "What's the core offer we're auditing?", placeholder: "12-week 1:1 nutrition coaching" },
  { id: "positioning", s: 0, kind: "textarea", required: true, prompt: "How does the brand describe itself today?", placeholder: "A warm, grounded wellness brand that helps busy women feel in control again." },
  { id: "shift", s: 0, kind: "textarea", prompt: "What feels outdated, unclear, or in need of a shift?", placeholder: "The visuals feel DIY and the messaging no longer matches the premium level of the offer." },

  { id: "audience", s: 1, kind: "textarea", required: true, prompt: "Who's the primary audience this site should connect with?", placeholder: "Busy working moms in their 30s and 40s who want structure without all-or-nothing dieting." },
  { id: "fit", s: 1, kind: "textarea", prompt: "What makes someone a strong-fit client?", placeholder: "Ready to invest, values accountability, and wants practical guidance." },
  { id: "offerFocus", s: 1, kind: "choice", required: true, prompt: "Which part of the offer should discovery focus on most?", options: ["Core service offer", "Signature program", "Overall brand direction", "Lead magnet or nurture path", "Sales page / conversion flow"] },
  { id: "pain", s: 1, kind: "textarea", required: true, prompt: "What are the biggest hesitations, frustrations, or objections this audience has?", placeholder: "They feel overwhelmed, skeptical, and unsure what makes this brand different enough to trust." },

  { id: "goal", s: 2, kind: "choice", required: true, prompt: "What's the main business goal behind this audit?", options: ["More booked calls", "More qualified leads", "More sales", "Clearer positioning", "Better website conversion"] },
  { id: "cta", s: 2, kind: "choice", required: true, prompt: "What's the main action the site should drive?", options: ["Book a call", "Submit an inquiry", "Join the email list", "Purchase now", "Explore services"] },
  { id: "blockers", s: 2, kind: "textarea", required: true, prompt: "What seems to be blocking conversion right now?", placeholder: "The offer is buried, the CTA feels passive, and there isn't enough trust near the decision point." },
  { id: "traffic", s: 2, kind: "checklist", prompt: "Where is most traffic coming from right now?", options: ["Instagram", "Meta ads", "Google / search", "Referrals", "Email list", "Pinterest", "Direct / word of mouth", "Other"] },

  { id: "surfaces", s: 3, kind: "checklist", required: true, prompt: "Which surfaces matter most in this audit?", options: ["Homepage", "Services / offers", "About page", "Booking / inquiry flow", "Lead magnet or opt-in", "Mobile experience", "Brand visuals", "Messaging / copy"] },
  { id: "messageGap", s: 3, kind: "textarea", required: true, prompt: "What feels off in the current messaging or user experience?", placeholder: "The value prop takes too long to land and the experience feels inconsistent page to page." },
  { id: "proof", s: 3, kind: "textarea", prompt: "What proof, results, or credibility signals already exist?", placeholder: "Client testimonials, results snapshots, before/afters, media features, repeat client referrals." },
  { id: "voice", s: 3, kind: "checklist", prompt: "How should the refreshed direction feel?", options: ["Warm", "Premium", "Grounded", "Direct", "Editorial", "Authority-led", "Playful", "Minimal"] },

  { id: "assets", s: 4, kind: "textarea", prompt: "What source materials should discovery pull from?", placeholder: "Current site, Figma file, testimonials, intake notes, analytics snapshots, offer docs." },
  { id: "nonNegotiables", s: 4, kind: "textarea", prompt: "Any non-negotiables or constraints for the recommendation?", placeholder: "Keep the logo, avoid a full rebrand promise for now, stay inside the current stack if possible." },
  { id: "priorities", s: 4, kind: "checklist", required: true, prompt: "Which themes should the audit prioritize first?", options: ["Positioning clarity", "Offer clarity", "Trust & proof", "Conversion path", "Mobile UX", "Visual polish", "Content hierarchy", "SEO / findability"] },
  { id: "timeline", s: 4, kind: "choice", prompt: "How quickly should the next move happen?", options: ["ASAP / this week", "2-4 weeks", "1-2 months", "Flexible"] },
];

const DELIVS: AuditDeliverable[] = [
  { id: "brief", title: "Discovery Brief", from: "your intake", intro: "A clean summary of the business, audience, and current context we are auditing against." },
  { id: "offerread", title: "Offer & Audience Read", from: "the discovery brief", intro: "A sharper read on who the site should speak to, what they care about, and what the offer must communicate." },
  { id: "journey", title: "Conversion Journey Read", from: "the offer & audience read", intro: "The key path a visitor takes today, where it breaks down, and what the site should guide them toward instead." },
  { id: "findings", title: "Priority Findings", from: "the conversion journey read", intro: "The biggest experience, messaging, and trust issues surfaced first, with the why behind each one." },
  { id: "plan", title: "Recommended Action Plan", from: "the priority findings", intro: "A practical implementation sequence for what to fix first across the internal audit and Lighthouse results." },
  { id: "finalplan", title: "Final Audit Action Plan", from: "everything approved", intro: "Every discovery checkpoint consolidated into the action plan the team can move forward with.", terminal: true },
];

const DEMO: Record<string, string | string[]> = {};

const freshBuild = (): Omit<AuditState, "clientId"> => ({
  buildId: null,
  idx: 0,
  answers: {},
  unsure: {},
  confirmed: {},
  signed: {},
  notes: {},
  requesting: false,
  draftNote: "",
  error: "",
  genActive: false,
  genLabel: "",
  genDone: {},
});

const init: AuditState = { clientId: null, ...freshBuild() };

function reducer(s: AuditState, a: Act): AuditState {
  switch (a.t) {
    case "select": return { ...init, clientId: a.clientId, buildId: a.buildId };
    case "load": return { ...a.state };
    case "toPicker": return { ...s, clientId: null, ...freshBuild() };
    case "go": return { ...s, idx: a.i, error: "", requesting: false };
    case "err": return { ...s, error: a.m };
    case "text": return { ...s, answers: { ...s.answers, [a.id]: a.v }, error: "" };
    case "choice": return { ...s, answers: { ...s.answers, [a.id]: a.v }, error: "" };
    case "check": {
      const arr = Array.isArray(s.answers[a.id]) ? (s.answers[a.id] as string[]).slice() : [];
      const i = arr.indexOf(a.v);
      if (i === -1) arr.push(a.v); else arr.splice(i, 1);
      return { ...s, answers: { ...s.answers, [a.id]: arr }, error: "" };
    }
    case "unsure": return { ...s, unsure: { ...s.unsure, [a.id]: !s.unsure[a.id] }, error: "" };
    case "confirmGate": return { ...s, confirmed: { ...s.confirmed, [a.s]: true }, error: "", idx: s.idx + 1 };
    case "sign": return { ...s, signed: { ...s.signed, [a.id]: true }, requesting: false, idx: s.idx + 1 };
    case "reqChanges": return { ...s, requesting: true, draftNote: a.note };
    case "cancelReq": return { ...s, requesting: false, draftNote: "" };
    case "draft": return { ...s, draftNote: a.v };
    case "sendNote": return { ...s, requesting: false, notes: { ...s.notes, [a.id]: s.draftNote.trim() } };
    case "restart": return { ...s, ...freshBuild() };
    case "autofill": {
      const answers = { ...s.answers };
      QUESTIONS.filter(q => q.s === a.s).forEach(q => { if (DEMO[q.id] !== undefined) answers[q.id] = DEMO[q.id]; });
      return { ...s, answers, error: "" };
    }
    case "demoAll": {
      const confirmed: Record<number, boolean> = {};
      SECTIONS.forEach((_, i) => (confirmed[i] = true));
      const signed: Record<string, boolean> = {};
      DELIVS.forEach(d => { if (!d.terminal) signed[d.id] = true; });
      const genDone: Record<string, boolean> = {};
      DELIVS.forEach(d => (genDone[d.id] = true));
      return { ...s, answers: { ...DEMO }, confirmed, signed, genDone, genActive: false, idx: a.finalIdx, requesting: false, error: "" };
    }
    case "gen": return { ...s, genActive: a.active, genLabel: a.label ?? s.genLabel };
    case "genDone": return { ...s, genActive: false, genDone: { ...s.genDone, [a.id]: true } };
  }
}

const FLOW_LENGTH = 1 + (SECTIONS.length * 2) + DELIVS.length;

function hydrateAuditState(state: PersistedAuditState): AuditState {
  return {
    clientId: state.clientId,
    buildId: state.buildId,
    idx: state.idx,
    answers: state.answers,
    unsure: state.unsure,
    confirmed: state.confirmed,
    signed: state.signed,
    notes: state.notes,
    requesting: false,
    draftNote: "",
    error: "",
    genActive: false,
    genLabel: "",
    genDone: state.genDone,
  };
}

function toPersistedAuditState(state: AuditState): PersistedAuditState | null {
  if (!state.clientId || !state.buildId) return null;

  return {
    clientId: state.clientId,
    buildId: state.buildId,
    idx: state.idx,
    answers: state.answers,
    unsure: state.unsure,
    confirmed: state.confirmed,
    signed: state.signed,
    notes: state.notes,
    genDone: state.genDone,
  };
}

function mergeAuditRuns(defaultRuns: AuditRun[], drafts: PersistedAuditDraft[]) {
  const byId = new Map<string, AuditRun>();

  defaultRuns.forEach(run => byId.set(run.id, run));
  drafts.forEach(draft => {
    const currentClientRun = defaultRuns.find(run => run.clientId === draft.run.clientId);
    byId.set(draft.run.id, {
      ...draft.run,
      owner: currentClientRun?.owner || draft.run.owner,
      updatedAt: draft.updatedAt || draft.run.updatedAt,
    });
  });

  return Array.from(byId.values()).sort((left, right) => {
    if (left.clientName !== right.clientName) return left.clientName.localeCompare(right.clientName);
    const leftDate = left.updatedAt || left.completedAt || left.createdAt || left.due;
    const rightDate = right.updatedAt || right.completedAt || right.createdAt || right.due;
    return rightDate.localeCompare(leftDate);
  });
}

function auditRunDate(run: AuditRun) {
  return run.updatedAt || run.completedAt || run.createdAt || run.due;
}

function auditRunDateLabel(run: AuditRun) {
  const value = auditRunDate(run);
  if (!value || value === "—" || value === "Today" || !value.includes("T")) return value || "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function auditRunDateTimeLabel(run: AuditRun) {
  const value = auditRunDate(run);
  if (!value || value === "—" || value === "Today") return value || "—";

  if (!value.includes("T")) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function auditRunRank(run: AuditRun) {
  if (run.progress >= 100) return 3;
  if (run.progress > 0) return 2;
  return 1;
}

function auditRunLabel(run: AuditRun) {
  if (run.runLabel) return run.runLabel;
  if (run.runType === "rerun") return "Rerun " + (run.sequence || "");
  return "Baseline audit";
}

function auditRunMeta(run: AuditRun) {
  const bits = [auditRunLabel(run), run.stage];
  if (typeof run.score === "number") {
    const delta = typeof run.previousScore === "number" ? run.score - run.previousScore : null;
    bits.push(delta === null ? run.score + "/100" : run.score + "/100 " + (delta >= 0 ? "+" : "") + delta);
  }
  return bits.filter(Boolean).join(" · ");
}

function latestCompletedRun(runs: AuditRun[]) {
  return runs
    .filter(run => run.progress >= 100)
    .sort((left, right) => auditRunDate(right).localeCompare(auditRunDate(left)))[0] || null;
}

function auditRunScoreLabel(run: AuditRun | null) {
  if (!run || typeof run.score !== "number") return "No report";
  return run.score + "/100";
}

function auditRunChangeLabel(run: AuditRun | null) {
  if (!run || typeof run.score !== "number") return "—";
  if (typeof run.previousScore === "number") {
    const delta = run.score - run.previousScore;
    return (delta >= 0 ? "+" : "") + delta;
  }
  if (typeof run.targetScore === "number") return "+" + (run.targetScore - run.score) + " target";
  return "Baseline";
}

function auditRunLastCheckLabel(completedRun: AuditRun | null, activeRun: AuditRun | null) {
  if (activeRun?.runType === "rerun") return "Retesting now";
  if (!completedRun) return "Not tested";

  return auditRunDateTimeLabel(completedRun);
}

function computeRunProgress(state: PersistedAuditState) {
  const signoffTotal = SECTIONS.length + DELIVS.filter(d => !d.terminal).length;
  const signoffDone = Object.values(state.confirmed).filter(Boolean).length
    + DELIVS.filter(d => !d.terminal && state.signed[d.id]).length;
  const signoffPct = signoffTotal ? Math.round((signoffDone / signoffTotal) * 100) : 0;
  const flowPct = FLOW_LENGTH > 1 ? Math.round((Math.max(state.idx, 0) / (FLOW_LENGTH - 1)) * 100) : 0;

  return {
    signoffDone,
    signoffTotal,
    progress: Math.max(signoffPct, flowPct),
  };
}

function buildPersistedRun(base: { id: string; clientId: string; clientName: string; owner: string }, state: PersistedAuditState, existingRun?: AuditRun | null): AuditRun {
  const { signoffDone, signoffTotal, progress } = computeRunProgress(state);
  const reportReady = signoffDone >= signoffTotal;
  const hasDeliverableReview = Object.keys(state.signed).length > 0 || Object.keys(state.genDone).length > 0;
  const hasDiscoveryWork = Object.keys(state.answers).length > 0 || Object.keys(state.confirmed).length > 0;
  const summary = getAuditReportSummary(base.clientId);
  const now = new Date().toISOString();
  const runType = existingRun?.runType || (base.id.includes("-rerun-") ? "rerun" : "baseline");

  return {
    id: base.id,
    clientId: base.clientId,
    clientName: base.clientName,
    owner: base.owner,
    subtitle: "Cocoon Consult",
    runLabel: existingRun?.runLabel || (runType === "rerun" ? "Rerun after fixes" : "Audit draft"),
    runType,
    sequence: existingRun?.sequence || 1,
    baselineRunId: existingRun?.baselineRunId,
    statusLabel: reportReady ? "Report ready" : hasDeliverableReview ? "In review" : hasDiscoveryWork ? "Auditing" : "Draft",
    statusTone: reportReady ? "success" : hasDeliverableReview ? "warn" : hasDiscoveryWork ? "warn" : "muted",
    stage: reportReady ? "Audit · Delivered" : hasDeliverableReview ? "Audit · Plan review" : "Discovery · Intake",
    progress,
    score: reportReady ? summary.overall : undefined,
    previousScore: runType === "rerun" ? existingRun?.previousScore : undefined,
    targetScore: reportReady ? summary.target : undefined,
    due: reportReady ? "Report ready" : "Today",
    createdAt: existingRun?.createdAt || now,
    updatedAt: now,
    completedAt: reportReady ? now : undefined,
  };
}

function seedAuditRuns(): AuditRun[] {
  return STUDIO_CLIENTS.map(client => {
    const summary = getAuditReportSummary(client.id);
    const complete = client.audit.progress >= 100;
    return {
      ...client.audit,
      clientId: client.id,
      clientName: client.name,
      owner: client.owner,
      runLabel: complete ? "Baseline audit" : client.audit.progress > 0 ? "Audit in progress" : "Not started",
      runType: "baseline",
      sequence: 1,
      score: complete ? summary.overall : undefined,
      targetScore: complete ? summary.target : undefined,
      completedAt: complete ? client.audit.due : undefined,
      updatedAt: client.audit.due,
    };
  });
}

export function Audits({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [s, dispatch] = useReducer(reducer, init);
  const [drafts, setDrafts] = useState<PersistedAuditDraft[]>([]);
  const draftsRef = useRef<PersistedAuditDraft[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [exitingToPicker, setExitingToPicker] = useState(false);
  const [reportClientId, setReportClientId] = useState<string | null>(null);
  const [reportRunId, setReportRunId] = useState<string | null>(null);
  const [reportProposalOpen, setReportProposalOpen] = useState(false);
  const [proposalIffOn, setProposalIffOn] = useState(false);
  const [quickKnow, setQuickKnow] = useState<Know>({ data: {}, sources: {} });
  useEffect(() => { setQuickKnow(s.clientId ? loadPersistedKnowledge(s.clientId) : { data: {}, sources: {} }); }, [s.clientId]);
  const allClients = useMemo(() => clientsVisibleToRole(state.role, state.clientName), [state.clientName, state.role]);
  const knownClientIds = useMemo(() => new Set(allClients.map(item => item.id)), [allClients]);
  const currentDrafts = useMemo(() => drafts.filter(draft => knownClientIds.has(draft.run.clientId)), [drafts, knownClientIds]);
  draftsRef.current = drafts;
  const runs = useMemo(() => mergeAuditRuns(seedAuditRuns(), currentDrafts).filter(item => knownClientIds.has(item.clientId)), [currentDrafts, knownClientIds]);
  const draftsByRunId = useMemo(() => new Map(currentDrafts.map(draft => [draft.run.id, draft])), [currentDrafts]);
  const client = allClients.find(c => c.id === s.clientId) || null;
  const reportClient = allClients.find(c => c.id === reportClientId) || null;
  const reportRun = reportRunId ? runs.find(item => item.id === reportRunId) || null : null;
  const reportDraft = reportRunId ? draftsByRunId.get(reportRunId) || null : null;
  const run = runs.find(item => item.id === s.buildId) || null;
  const allClientsRef = useRef(allClients);
  const runRef = useRef(run);
  allClientsRef.current = allClients;
  runRef.current = run;
  const completedCount = useMemo(() => new Set(runs.filter(item => item.progress >= 100).map(item => item.clientId)).size, [runs]);
  const inProgressCount = useMemo(() => new Set(runs.filter(item => item.progress > 0 && item.progress < 100).map(item => item.clientId)).size, [runs]);
  const auditGroups = useMemo(
    () => allClients.map(client => {
      const clientRuns = runs
        .filter(item => item.clientId === client.id)
        .sort((left, right) => {
          const rankDelta = auditRunRank(right) - auditRunRank(left);
          if (rankDelta !== 0) return rankDelta;
          return auditRunDate(right).localeCompare(auditRunDate(left));
        });
      return { client, runs: clientRuns };
    }).filter(group => group.runs.length > 0),
    [allClients, runs],
  );
  const runsByClient = useMemo(
    () => runs.reduce<Record<string, number>>((acc, item) => {
      acc[item.clientId] = (acc[item.clientId] || 0) + 1;
      return acc;
    }, {}),
    [runs],
  );
  const mobile = state.isMobile;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredFromUrl = useRef(false);

  useEffect(() => {
    if (state.quickActionIntent !== "new_audit") return;
    setLaunchOpen(true);
    actions.patch({ quickActionIntent: null });
  }, [actions, state.quickActionIntent]);

  useEffect(() => {
    if (!state.hydrated) return;
    const params = new URLSearchParams(window.location.search);
    params.set("auditType", state.auditType);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [state.auditType, state.hydrated]);

  useEffect(() => {
    let cancelled = false;

    async function loadDrafts() {
      try {
        const response = await fetch("/api/portal-audit-runs", { cache: "no-store" });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load audit drafts.");
        }

        if (!cancelled) {
          setDrafts(coercePersistedAuditDrafts(payload?.drafts));
        }
      } catch (error) {
        console.error("Unable to load persisted audit drafts.", error);
      } finally {
        if (!cancelled) setDraftsLoaded(true);
      }
    }

    void loadDrafts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftsLoaded || restoredFromUrl.current) return;

    restoredFromUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    const auditRunId = params.get("auditRun");
    const auditReportClientId = params.get("auditReport");
    const auditReportRunId = params.get("auditReportRun");

    if (auditReportClientId && allClients.some(item => item.id === auditReportClientId)) {
      setReportClientId(auditReportClientId);
      const requestedRun = runs.find(item => item.id === auditReportRunId && item.clientId === auditReportClientId && item.progress >= 100);
      const latestRun = latestCompletedRun(runs.filter(item => item.clientId === auditReportClientId));
      setReportRunId(requestedRun?.id || latestRun?.id || null);
      const source = allClients.find(item => item.id === auditReportClientId);
      if (source) setProposalIffOn(actions.workspaceForClient(source.name).proposal?.iffOn ?? false);
      setReportProposalOpen(params.get("proposal") === "1");
      return;
    }

    if (auditReportRunId) {
      const requestedRun = runs.find(item => item.id === auditReportRunId && item.progress >= 100);
      if (requestedRun) {
        setReportClientId(requestedRun.clientId);
        setReportRunId(requestedRun.id);
        const source = allClients.find(item => item.id === requestedRun.clientId);
        if (source) setProposalIffOn(actions.workspaceForClient(source.name).proposal?.iffOn ?? false);
        updateAuditUrl({ auditReportClientId: requestedRun.clientId, auditReportRunId: requestedRun.id, proposal: params.get("proposal") === "1" });
        setReportProposalOpen(params.get("proposal") === "1");
        return;
      }
    }

    if (!auditRunId) return;

    const savedDraft = draftsByRunId.get(auditRunId);
    const savedRun = savedDraft?.run ?? runs.find(item => item.id === auditRunId) ?? null;

    if (!savedRun) {
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.delete("auditRun");
      nextParams.delete("auditReport");
      nextParams.delete("auditReportRun");
      nextParams.delete("proposal");
      const nextQuery = nextParams.toString();
      window.history.replaceState({}, "", nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname);
      return;
    }

    if (savedDraft) {
      dispatch({ t: "load", state: hydrateAuditState(savedDraft.state) });
      return;
    }

    dispatch({ t: "select", clientId: savedRun.clientId, buildId: savedRun.id });
  }, [allClients, draftsByRunId, draftsLoaded, runs]);

  useEffect(() => {
    // Secondary sidebar abandoned — the DiscoveryBuilder carries its own rail.
    actions.patch({ guidedSidebarActive: false, guidedTopBarInfo: null });
  }, [actions]);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!reportClient) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeReportModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reportClient]);

  useEffect(() => () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  useEffect(() => {
    const persistedState = toPersistedAuditState(s);
    if (!draftsLoaded || !persistedState) return;

    const source = allClientsRef.current.find(item => item.id === persistedState.clientId);
    if (!source) return;

    const existingDraft = draftsRef.current.find(draft => draft.run.id === persistedState.buildId);
    const nextState: PersistedAuditState = {
      ...persistedState,
      report: existingDraft?.state.report,
      guidedSession: existingDraft?.state.guidedSession,
    };
    const nextDraft: PersistedAuditDraft = {
      run: buildPersistedRun({
        id: persistedState.buildId,
        clientId: source.id,
        clientName: source.name,
        owner: source.owner,
      }, nextState, runRef.current),
      state: nextState,
      updatedAt: new Date().toISOString(),
    };

    setDrafts(prev => {
      const next = prev.filter(draft => draft.run.id !== nextDraft.run.id);
      return [nextDraft, ...next];
    });

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/portal-audit-runs", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ draft: nextDraft }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to save the audit draft.");
        }
      } catch (error) {
        console.error("Unable to persist audit draft.", error);
      }
    }, 450);
  }, [draftsLoaded, s]);

  function updateAuditUrl(params: { auditRunId?: string | null; auditReportClientId?: string | null; auditReportRunId?: string | null; proposal?: boolean }) {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("view", "audits");

    if (params.auditRunId) {
      nextParams.set("auditRun", params.auditRunId);
    } else {
      nextParams.delete("auditRun");
    }

    if (params.auditReportClientId) {
      nextParams.set("auditReport", params.auditReportClientId);
      if (params.auditReportRunId) nextParams.set("auditReportRun", params.auditReportRunId);
      else nextParams.delete("auditReportRun");
      if (params.proposal) nextParams.set("proposal", "1");
      else nextParams.delete("proposal");
    } else {
      nextParams.delete("auditReport");
      nextParams.delete("auditReportRun");
      nextParams.delete("proposal");
    }

    const nextQuery = nextParams.toString();
    window.history.replaceState({}, "", nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname);
  }

  const startAudit = (clientId: string, buildId: string) => {
    setLaunchOpen(false);
    setReportClientId(null);
    setReportRunId(null);
    setReportProposalOpen(false);
    setExitingToPicker(false);
    updateAuditUrl({ auditRunId: buildId });
    const savedDraft = draftsByRunId.get(buildId);
    if (savedDraft) {
      dispatch({ t: "load", state: hydrateAuditState(savedDraft.state) });
      return;
    }
    dispatch({ t: "select", clientId, buildId });
  };
  const previewAudit = (clientId: string, runId?: string | null) => {
    const completedRun = runId
      ? runs.find(item => item.id === runId && item.clientId === clientId && item.progress >= 100) || null
      : latestCompletedRun(runs.filter(item => item.clientId === clientId));
    const source = allClients.find(item => item.id === clientId);
    setLaunchOpen(false);
    setReportProposalOpen(false);
    setReportClientId(clientId);
    if (source) setProposalIffOn(actions.workspaceForClient(source.name).proposal?.iffOn ?? false);
    setReportRunId(completedRun?.id || null);
    updateAuditUrl({ auditReportClientId: clientId, auditReportRunId: completedRun?.id || null, proposal: false });
  };
  const createAudit = (clientId: string) => {
    const source = allClients.find(item => item.id === clientId);
    if (!source) return;
    const id = "audit-" + clientId + "-" + Math.random().toString(36).slice(2, 8);
    const nextRun: AuditRun = {
      id,
      clientId: source.id,
      clientName: source.name,
      owner: source.owner,
      subtitle: "Cocoon Consult",
      runLabel: "Audit draft",
      runType: "baseline",
      sequence: (runsByClient[source.id] || 0) + 1,
      statusLabel: "Draft",
      statusTone: "muted",
      stage: "Discovery · Intake",
      progress: 0,
      due: "Today",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDrafts(prev => [
      {
        run: nextRun,
        state: {
          clientId: source.id,
          buildId: id,
          idx: 0,
          answers: {},
          unsure: {},
          confirmed: {},
          signed: {},
          notes: {},
          genDone: {},
        },
        updatedAt: new Date().toISOString(),
      },
      ...prev.filter(draft => draft.run.id !== id),
    ]);
    startAudit(source.id, id);
    actions.showToast("New audit draft ready for " + source.name);
  };
  const openClientOnboarding = () => {
    setLaunchOpen(false);
    actions.setView("onboarding");
  };
  const rerunAudit = (clientId: string) => {
    const source = allClients.find(item => item.id === clientId);
    if (!source) return;
    const previousRuns = runs.filter(item => item.clientId === clientId);
    const previousComplete = previousRuns.find(item => item.progress >= 100);
    const summary = getAuditReportSummary(clientId);
    const id = "audit-" + clientId + "-rerun-" + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();
    const nextRun: AuditRun = {
      id,
      clientId: source.id,
      clientName: source.name,
      owner: source.owner,
      subtitle: "Cocoon Consult",
      runLabel: "Rerun after fixes",
      runType: "rerun",
      sequence: previousRuns.length + 1,
      baselineRunId: previousComplete?.id,
      previousScore: previousComplete?.score ?? summary.overall,
      statusLabel: "Draft",
      statusTone: "muted",
      stage: "Discovery · Intake",
      progress: 0,
      due: "Today",
      createdAt: now,
      updatedAt: now,
    };
    setDrafts(prev => [
      {
        run: nextRun,
        state: {
          clientId: source.id,
          buildId: id,
          idx: 0,
          answers: {},
          unsure: {},
          confirmed: {},
          signed: {},
          notes: {},
          genDone: {},
        },
        updatedAt: now,
      },
      ...prev.filter(draft => draft.run.id !== id),
    ]);
    startAudit(source.id, id);
    actions.showToast("Rerun audit draft ready for " + source.name);
  };
  const buildProposal = (clientId: string) => {
    const completedRun = latestCompletedRun(runs.filter(item => item.clientId === clientId));
    const source = allClients.find(item => item.id === clientId);
    setLaunchOpen(false);
    setReportClientId(clientId);
    if (source) setProposalIffOn(actions.workspaceForClient(source.name).proposal?.iffOn ?? false);
    setReportRunId(completedRun?.id || null);
    setReportProposalOpen(true);
    updateAuditUrl({ auditReportClientId: clientId, auditReportRunId: completedRun?.id || null, proposal: true });
  };
  function closeReportModal() {
    setReportClientId(null);
    setReportRunId(null);
    setReportProposalOpen(false);
    updateAuditUrl({ auditRunId: null, auditReportClientId: null });
  }
  const exitToPicker = () => {
    if (exitingToPicker) return;
    setLaunchOpen(false);
    setExitingToPicker(true);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      dispatch({ t: "toPicker" });
      setExitingToPicker(false);
      exitTimer.current = null;
      setReportRunId(null);
      updateAuditUrl({ auditRunId: null, auditReportClientId: null });
    }, 220);
  };

  const completeGuidedAudit = async (data: Ans, aiResults: Record<string, GeneratedStageResult>) => {
    if (!client || !run) return;
    const fallbackDocs = AUDIT_PIPELINE.buildDocs(data) as AuditDocs;
    const docs = isAuditScoreResult(aiResults.report) ? auditScoreToDocs(aiResults.report, fallbackDocs.name) : fallbackDocs;
    const scoreResult = isAuditScoreResult(aiResults.report) ? aiResults.report : undefined;
    const mobileLighthouse = scoreResult?.lighthouse.find(item => item.strategy === "mobile")?.scores.performance;
    const desktopLighthouse = scoreResult?.lighthouse.find(item => item.strategy === "desktop")?.scores.performance;
    const now = new Date().toISOString();
    const completedDraft: PersistedAuditDraft = {
      run: {
        ...run,
        statusLabel: "Complete",
        statusTone: "success",
        stage: "Report ready",
        progress: 100,
        score: docs.overall,
        internalScore: docs.overall,
        lighthouseMobileScore: mobileLighthouse,
        lighthouseDesktopScore: desktopLighthouse,
        targetScore: docs.projected,
        due: "Ready",
        completedAt: now,
        updatedAt: now,
      },
      state: {
        clientId: client.id,
        buildId: run.id,
        idx: 0,
        answers: data,
        unsure: {},
        confirmed: {},
        signed: {},
        notes: {},
        genDone: { report: true, plan: true },
        report: scoreResult,
        guidedSession: draftsRef.current.find(draft => draft.run.id === run.id)?.state.guidedSession,
      },
      updatedAt: now,
    };

    setDrafts(current => [completedDraft, ...current.filter(draft => draft.run.id !== completedDraft.run.id)]);
    recordKnowledge(client.id, data, "Completed audit");
    const response = await fetch("/api/portal-audit-runs", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draft: completedDraft }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to save the completed audit.");
    }
    actions.showToast("Audit complete — funnel generation unlocked");
  };

  const saveGuidedSession = (session: GuidedAuditSession) => {
    if (!client || !run || !draftsLoaded) return;
    const now = new Date().toISOString();
    const report = isAuditScoreResult(session.aiResults.report) ? session.aiResults.report : undefined;
    const mobileLighthouse = report?.lighthouse.find(item => item.strategy === "mobile")?.scores.performance;
    const desktopLighthouse = report?.lighthouse.find(item => item.strategy === "desktop")?.scores.performance;
    const intakeProgress = session.questionTotal > 0 ? Math.round((Math.min(session.qIdx, session.questionTotal) / session.questionTotal) * 40) : 0;
    const progress = session.proposal || session.approved.plan ? 100
      : session.aiResults.plan ? 92
        : session.stage >= 2 ? 78
          : report ? 68
            : session.stage >= 1 ? 48
              : session.entered ? Math.max(4, intakeProgress) : 0;
    const actionPlanReady = !!session.aiResults.plan && progress < 100;
    const stage = progress >= 100 ? "Action plan · Complete"
      : actionPlanReady ? "Action plan · Ready for approval"
        : session.stage >= 2 ? "Action plan · In progress"
        : session.stage >= 1 ? "Audit report · In progress"
          : "Audit intake · In progress";
    const existing = draftsRef.current.find(draft => draft.run.id === run.id);
    const nextDraft: PersistedAuditDraft = {
      run: {
        ...run,
        statusLabel: progress >= 100 ? "Complete" : actionPlanReady ? "Ready for approval" : progress > 0 ? "In progress" : "Draft",
        statusTone: progress >= 100 ? "success" : actionPlanReady ? "accent" : progress > 0 ? "warn" : "muted",
        stage,
        progress,
        score: report?.overallScore,
        internalScore: report?.overallScore,
        lighthouseMobileScore: mobileLighthouse,
        lighthouseDesktopScore: desktopLighthouse,
        targetScore: report?.targetScore,
        updatedAt: now,
        completedAt: progress >= 100 ? now : undefined,
      },
      state: {
        clientId: client.id,
        buildId: run.id,
        idx: existing?.state.idx || 0,
        answers: session.data,
        unsure: existing?.state.unsure || {},
        confirmed: existing?.state.confirmed || {},
        signed: existing?.state.signed || {},
        notes: existing?.state.notes || {},
        genDone: { report: !!report, plan: !!session.aiResults.plan },
        report,
        guidedSession: session,
      },
      updatedAt: now,
    };
    draftsRef.current = [nextDraft, ...draftsRef.current.filter(draft => draft.run.id !== nextDraft.run.id)];
    setDrafts(draftsRef.current);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/portal-audit-runs", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ draft: nextDraft }),
        });
        if (!response.ok) throw new Error("Unable to save the guided audit session.");
      } catch (error) {
        console.error("Unable to persist guided audit session.", error);
      }
    }, 450);
  };

  if (!client && state.auditType !== "website") {
    return <AuditTypeWorkspace type={state.auditType} state={state} actions={actions} />;
  }

  if (!client) {
    return (
      <div style={css("width:100%;padding:" + (mobile ? "1rem 0.75rem calc(6rem + env(safe-area-inset-bottom))" : "1.6rem 2rem 2.4rem"))}>
        <GuidedIntakeSelector
          eyebrow="Cocoon Consult"
          eyebrowColor="var(--cocoon)"
          title="Generate or reopen an audit"
          description="Start a new audit intake for any client, or reopen a completed Cocoon Consult report when you need to turn it into the next step."
          controls={
            <>
              <span style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.45rem 0.75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:0.73rem;color:var(--fg-muted)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--success)")} />{completedCount} completed</span>
              <span style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.45rem 0.75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:0.73rem;color:var(--fg-muted)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--warn)")} />{inProgressCount} still in intake</span>
              <div style={{ position: "relative" }}>
                <button type="button" onClick={() => setLaunchOpen(v => !v)} style={css("display:inline-flex;align-items:center;gap:0.42rem;min-height:2.3rem;padding:0 0.95rem;border:none;border-radius:999px;background:var(--cocoon);color:#fff;font-size:0.78rem;font-weight:500;cursor:pointer")}><Icon name="plus" size={15} />Generate audit</button>
                {launchOpen && (
                  <>
                    <div onClick={() => setLaunchOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 34 }} />
                    <div style={{ ...css(mobile
                      ? "position:fixed;left:0.75rem;right:0.75rem;top:5.75rem;bottom:calc(5.4rem + env(safe-area-inset-bottom));width:auto;padding:0.5rem;border:1px solid var(--border);border-radius:1rem;background:color-mix(in srgb,var(--surface) 97%,white 3%);box-shadow:0 1rem 3rem rgba(35,25,18,.2);overflow-y:auto;overscroll-behavior:contain;z-index:35"
                      : "position:absolute;top:2.7rem;right:0;width:min(24rem,calc(100vw - 2rem));padding:0.45rem;border:1px solid var(--border);border-radius:1rem;background:color-mix(in srgb,var(--surface) 94%,white 6%);z-index:35"), animation: "pt-ddin .16s ease" }}>
                      <div style={css("padding:0.5rem 0.65rem 0.45rem")}>
                        <div style={css("font-size:0.8rem;font-weight:500;color:var(--fg)")}>Choose a client</div>
                        <div style={css("font-size:0.69rem;color:var(--fg-faint);margin-top:0.18rem")}>Every audit starts with discovery before it turns into a scored report.</div>
                      </div>
                      <div style={css("display:flex;flex-direction:column;gap:0.2rem")}>
                        <button
                          type="button"
                          onClick={openClientOnboarding}
                          style={css("width:100%;min-height:2.55rem;border:none;border-top:1px dashed var(--border);border-bottom:1px dashed var(--border);border-radius:0;background:transparent;color:var(--fg);font-size:0.76rem;font-weight:500;text-align:center;cursor:pointer")}
                        >
                          Add a new client
                        </button>
                        {allClients.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => createAudit(item.id)}
                            style={css("display:flex;align-items:center;gap:0.65rem;width:100%;padding:0.62rem 0.7rem;border:none;border-radius:0.85rem;background:transparent;color:var(--fg);text-align:left;cursor:pointer")}
                          >
                            <span style={css("width:1.8rem;height:1.8rem;border-radius:0.55rem;background:var(--cocoon-soft, color-mix(in srgb,var(--cocoon) 16%,white 84%));color:var(--cocoon);display:grid;place-items:center;font-size:var(--text-xs);font-weight:500;flex-shrink:0")}>{item.name[0]}</span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={css("display:block;font-size:0.8rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{item.name}</span>
                              <span style={css("display:block;font-size:0.7rem;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{runsByClient[item.id] || 0} audit draft{(runsByClient[item.id] || 0) === 1 ? "" : "s"} · {item.audited ? "report ready" : "intake needed"}</span>
                            </span>
                            <span style={css("display:inline-flex;align-items:center;font-size:0.63rem;font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;background:color-mix(in srgb,var(--cocoon) 16%,white 84%);color:var(--cocoon)")}>New</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          }
          countLabel="client"
          cards={auditGroups.map(group => {
            const completedRun = latestCompletedRun(group.runs);
            const activeRun = group.runs.find(item => item.progress < 100 && item.progress > 0) || group.runs.find(item => item.progress < 100) || null;
            const scoredRun = group.runs
              .filter(item => typeof item.internalScore === "number" || typeof item.score === "number")
              .sort((left, right) => auditRunDate(right).localeCompare(auditRunDate(left)))[0] || null;
            const displayRun = activeRun || completedRun || group.runs[0];
            const latestComplete = !!completedRun && !activeRun;
            const hasScore = !!scoredRun;
            const synth = synthAuditScore(group.client.id);
            const heroOverall = scoredRun?.internalScore ?? scoredRun?.score ?? synth.overall;
            const heroProjected = scoredRun
              ? Math.min(100, Math.max(scoredRun.targetScore ?? heroOverall, heroOverall))
              : synth.projected;
            const heroLabel = heroOverall < 50 ? "Needs attention" : heroOverall < 65 ? "Fair foundation" : heroOverall < 80 ? "Solid footing" : "Strong foundation";
            const heroSummary = { ...synth, overall: heroOverall, projected: heroProjected, uplift: heroProjected - heroOverall, label: heroLabel };
            const scoredReport = scoredRun
              ? drafts.find(draft => draft.run.id === scoredRun.id)?.state.report
              : undefined;
            const resultStats = AUDIT_CHECKLIST.map(checklistCategory => {
              const scoredCategory = isAuditScoreResult(scoredReport)
                ? scoredReport.categories.find(category => category.key === checklistCategory.key)
                : undefined;
              return {
                label: checklistCategory.label,
                value: scoredCategory
                  ? `${scoredCategory.score} ↗ ${Math.max(scoredCategory.score, scoredCategory.target)}`
                  : "N/A",
                tone: scoredCategory
                  ? scoredCategory.score < 50 ? "danger" as const : scoredCategory.score < 65 ? "warn" as const : "success" as const
                  : "default" as const,
              };
            });
            return {
              id: group.client.id,
              name: group.client.name,
              subtitle: "",
              statusLabel: displayRun.statusLabel === "Report ready" ? "Ready" : displayRun.statusLabel,
              statusTone: displayRun.statusTone,
              stage: scoredRun?.score ? "Score " + scoredRun.score + " → " + (scoredRun.targetScore || "target") : displayRun.stage,
              progress: displayRun.progress,
              owner: displayRun.owner,
              due: auditRunDateLabel(displayRun),
              showStatus: true,
              showProgress: false,
              showStage: false,
              showMeta: false,
              hero: <>
                <AuditScoreHero summary={heroSummary} scored={hasScore} />
              </>,
              headerAction: latestComplete ? {
                label: "Retest audit for " + group.client.name,
                icon: "replay",
                onClick: () => rerunAudit(group.client.id),
              } : undefined,
              stats: resultStats,
              statsLayout: "vertical",
              primaryLabel: latestComplete ? "View report" : "Open audit",
              onPrimary: () => (latestComplete && completedRun ? previewAudit(group.client.id, completedRun.id) : startAudit(group.client.id, displayRun.id)),
              secondaryLabel: latestComplete ? "Build proposal" : "New audit",
              onSecondary: () => (latestComplete ? buildProposal(group.client.id) : createAudit(group.client.id)),
            };
          })}
        />
        {reportClient && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={reportClient.name + (reportProposalOpen ? " build proposal" : " audit report")}
            onClick={closeReportModal}
            style={{ ...css("position:fixed;inset:0;z-index:90;background:rgba(35,25,18,.32);padding:" + (mobile ? "0.75rem" : "1.25rem 1.5rem") + ";display:flex;align-items:flex-start;justify-content:center;overflow:auto"), animation: "pt-fadein .14s ease" }}
          >
            <div onClick={event => event.stopPropagation()} style={css("width:min(68rem,100%);margin:" + (mobile ? "0 auto" : "1.1rem auto 2rem"))}>
              <div style={css("display:flex;align-items:center;gap:var(--space-3);margin-bottom:0.8rem")}>
                <div style={css("font-size:0.92rem;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.2);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{reportProposalOpen ? "Build proposal" : "Audit report"} · {reportClient.name}</div>
                <button type="button" onClick={closeReportModal} className="pt-iconbtn" style={css("margin-left:auto;width:2.1rem;height:2.1rem;border-radius:50%;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.86);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")}><Icon name="x" size={15} /></button>
              </div>
              <article style={css("border:1px solid var(--border-soft);border-radius:1.1rem;background:var(--surface);overflow:visible")}>
                {reportDraft?.state.report ? (
                  <div style={css("padding:" + (mobile ? "1rem" : "1.4rem"))}>
                    {AUDIT_PIPELINE.renderStage({
                      stageKey: reportProposalOpen ? "plan" : "report",
                      docs: auditScoreToDocs(reportDraft.state.report, reportClient.name),
                      aiResult: reportProposalOpen ? reportDraft.state.guidedSession?.aiResults.plan || null : reportDraft.state.report,
                      aiResults: reportDraft.state.guidedSession?.aiResults || { report: reportDraft.state.report },
                      reveal: Number.POSITIVE_INFINITY,
                      building: false,
                      approved: true,
                      mobile,
                      accent: "var(--cocoon)",
                      onAdvance: () => undefined,
                      onDownload: () => actions.showToast("Preparing the PDF…"),
                      onShare: () => actions.showToast("Share link copied — send it to your client"),
                      onCopy: () => actions.showToast("Copied to clipboard"),
                    })}
                    {reportProposalOpen && <div style={{ marginTop: "1.2rem" }}><ContinueWithFunnelBuildingCard onContinue={() => actions.setView("funnels")} /></div>}
                  </div>
                ) : <AuditReportView
                  key={reportClient.id + "-" + (reportRunId || "latest") + (reportProposalOpen ? "-proposal" : "-report")}
                  state={state}
                  actions={actions}
                  clientId={reportClient.id}
                  clientName={reportClient.name}
                  reportRunLabel={reportRun ? auditRunLabel(reportRun) : undefined}
                  reportRunDate={reportRun ? auditRunDateLabel(reportRun) : undefined}
                  initialLayout={reportProposalOpen ? "priority" : "report"}
                  showInlineProposal={reportProposalOpen}
                  proposalIffOn={proposalIffOn}
                  proposalSent={actions.workspaceForClient(reportClient.name).proposal?.sent === true}
                  onToggleProposalIff={() => setProposalIffOn(v => !v)}
                  onSendProposal={() => actions.sendProposal(reportClient.name, { iffOn: proposalIffOn })}
                  onBack={closeReportModal}
                />}
              </article>
            </div>
          </div>
        )}
      </div>
    );
  }

  const workspaceMemory = fromClientMemory(client.id, client.name, actions.workspaceForClient(client.name));
  const auditKnow = mergeKnow(mergeKnow(getKnowledge(client.id), workspaceMemory), quickKnow);
  return (
    <div style={css("width:100%;padding:" + (mobile ? "1rem 0.9rem 1.5rem" : "1.4rem 1.5rem"))}>
      <DiscoveryBuilder
        key={run?.id || client.id}
        mobile={mobile}
        accent="var(--cocoon)"
        title={run?.subtitle || "Cocoon Consult Audit"}
        clientName={client.name}
        intro={{ eyebrow: "Cocoon Consult Audit · Guided discovery", heading: "See exactly what you’ll get." }}
        wizard={AUDIT_WIZARD}
        stages={AUDIT_STAGES}
        introSteps={AUDIT_INTRO_STEPS}
        prefill={auditKnow.data}
        prefillSources={auditKnow.sources}
        prefillNotes={auditKnow.notes}
        quickStartMode="audit"
        sessionKey={run?.id}
        initialSession={run ? draftsByRunId.get(run.id)?.state.guidedSession : undefined}
        onSessionChange={saveGuidedSession}
        onIngest={delta => {
          rememberKnowledge(client.id, delta);
          setQuickKnow(k => mergeKnow(k, delta));
        }}
        startLabel="Start audit intake →"
        backLabel="← All audits"
        previewLabel="or preview a finished audit"
        progressLabel="intake"
        demo={AUDIT_DEMO}
        completeTitle="Intake complete"
        completeMsg="That’s everything I need. I’ll score your site across the six areas and draft the report, brand audit, and action plan from your answers."
        completeCta="Generate the report →"
        stageExtra={stageKey => stageKey === "plan" ? (
          <div style={{ marginTop: "1.2rem", textAlign: "left" }}>
            <ContinueWithFunnelBuildingCard onContinue={() => actions.setView("funnels")} />
          </div>
        ) : null}
        pipeline={AUDIT_PIPELINE}
        onPipelineComplete={(data, aiResults) => completeGuidedAudit(data, aiResults).catch(error => actions.showToast(error instanceof Error ? error.message : "Unable to save the completed audit"))}
        showToast={actions.showToast}
        onExit={exitToPicker}
        onComplete={data => { recordKnowledge(client.id, data, "Audit intake"); exitToPicker(); }}
      />
    </div>
  );
}
