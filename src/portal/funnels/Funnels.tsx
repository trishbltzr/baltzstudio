"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { css } from "../helpers";
import { printReportHtml, reportDocumentHtml } from "../printReport";
import { Icon } from "../icons";
import type { PortalActions, PortalState } from "../store";
import {
  SECTIONS, QUESTIONS, DELIVS, DEMO, TYPE_LABEL, buildFlow,
  type FQuestion, type FlowStep,
} from "./data";
import { DelivBody, GRAD } from "./deliverables";
import { clientsVisibleToRole, type ClientFacet } from "../clients";
import { GuidedIntakeSelector } from "../components/GuidedIntakeSelector";
import { EngineIndexControls } from "../components/EngineIndexControls";
import { assignedEngineWork, clientsForEngineWork, isUnassignedEngineClient, latestEngineWork, startClientForEngine } from "../engineLifecycle";
import { GuidedIntakeShell, GuidedOptionPill, GuidedPipelinePanel, GuidedUnsureToggle } from "../components/GuidedIntakeShell";
import { DiscoveryBuilder } from "../discovery/DiscoveryBuilder";
import { fromClientMemory, getKnowledge, loadPersistedKnowledge, recordKnowledge, rememberKnowledge, mergeKnow, type Know } from "../discovery/knowledge";
import { FUNNEL_WIZARD, FUNNEL_STAGES, FUNNEL_INTRO_STEPS, FUNNEL_DEMO } from "../discovery/discoveryData";
import { FUNNEL_PIPELINE, FunnelFlowHero, funnelTaskDrafts } from "../discovery/funnelPipeline";
import type { FunnelDocs } from "../discovery/funnelPipeline";
import { BuilderTaskPanel } from "../builders/BuilderTaskPanel";
import type { TaskImportDraft } from "../types";
import { mergePortalClientWorkspace, type PortalFunnelPlanRecord } from "@/lib/portalWorkspacePersistence";
import { coercePersistedAuditDrafts, type GuidedAuditSession } from "@/lib/portalAuditPersistence";
import { ShareLinkDialog } from "../components/ShareLinkDialog";

// ── state ────────────────────────────────────────────────────────────────────
type Ans = Record<string, string | string[]>;
type FunnelBuild = ClientFacet & { clientId: string; clientName: string; owner: string; updatedAt?: string };
export type FunnelPlanPost = Omit<PortalFunnelPlanRecord, "content"> & { content: FunnelDocs };
interface FState {
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
const freshBuild = (): Omit<FState, "clientId"> => ({
  buildId: null,
  idx: 0, answers: {}, unsure: {}, confirmed: {}, signed: {}, notes: {}, requesting: false,
  draftNote: "", error: "", genActive: false, genLabel: "", genDone: {},
});
const init: FState = { clientId: null, ...freshBuild() };

export function buildFunnelAiHandover(post: FunnelPlanPost): string {
  const docs = post.content;
  const lines = (items: string[]) => items.map(item => "- " + item).join("\n");
  const brief = docs.brief.map(item => "- " + item.label + ": " + item.value).join("\n");
  const flow = docs.flow.map((item, index) => "- " + (index + 1) + ". " + item.label + " (" + item.step + ")").join("\n");
  const buildPlan = docs.plan.map(item => "### " + item.phase + " - " + item.title + " (" + item.owner + ")\n" + lines(item.tasks)).join("\n\n");
  const launch = docs.launch.map(item => "- " + item.label + ": " + item.value).join("\n");
  const deliverables = docs.proposal.deliverables.map(item => "- " + item.label + ": " + item.desc).join("\n");
  const hero = docs.blueprint?.hero || {};
  const benefits = (docs.blueprint?.benefits?.items || []).map((item: { h: string; b: string }) => "- " + item.h + ": " + item.b).join("\n");
  const features = (docs.blueprint?.features?.items || []).map((item: { h: string; b: string }) => "- " + item.h + ": " + item.b).join("\n");
  const faq = (docs.blueprint?.faq?.items || []).map((item: { q: string; a: string }) => "- Q: " + item.q + "\n  A: " + item.a).join("\n");

  return [
    "# Funnel Build Handover",
    "",
    "Use this as the source of truth for building, refining, or generating assets for this funnel. Do not invent a different funnel strategy unless a missing input blocks execution. Preserve the objective, primary action, page flow, and build requirements below.",
    "",
    "## Project",
    "- Client: " + post.clientName,
    "- Funnel plan: " + post.title,
    "- Status: " + post.statusLabel,
    "- Due: " + post.due,
    "- Generated: " + new Date(post.generatedAt).toISOString(),
    "- Updated: " + new Date(post.updatedAt).toISOString(),
    "",
    "## Funnel Brief",
    brief,
    "",
    "## Funnel Flow",
    flow,
    "",
    "## Hero Direction",
    "- Headline: " + (hero.title || docs.name),
    "- Subhead: " + (hero.subhead || "To confirm"),
    "- Primary CTA: " + (hero.cta || "To confirm"),
    "",
    "## Benefit Messaging",
    benefits || "- To confirm",
    "",
    "## Feature Messaging",
    features || "- To confirm",
    "",
    "## Build Plan",
    buildPlan,
    "",
    "## Launch Requirements",
    launch,
    "",
    "## Scope",
    "- Pages: " + docs.proposal.pages,
    "- Emails: " + docs.proposal.emails,
    "- Days to launch: " + docs.proposal.days,
    "- Investment: " + docs.proposal.invest,
    "",
    "## Deliverables",
    deliverables,
    "",
    "## FAQ Copy",
    faq || "- To confirm",
    "",
    "## Build Instructions",
    "- Generate only work that backs this funnel plan.",
    "- Keep copy specific to " + post.clientName + " and the stated audience.",
    "- If you create page sections, match the page flow and primary CTA.",
    "- If you create implementation tasks, map them to the build phases above.",
    "- If a detail is missing, list the assumption instead of pretending it was provided.",
  ].join("\n");
}

function funnelApprovalOutput(docs: FunnelDocs) {
  return {
    summary: `The ${docs.ftype} funnel plan is ready for review, including its conversion flow, page direction, build phases, and launch requirements.`,
    sections: [
      { heading: "Funnel brief", body: `${docs.name} · ${docs.objective}`, bullets: docs.brief.map(item => `${item.label}: ${item.value}`) },
      { heading: "Conversion flow", body: "The approved traffic-to-conversion journey.", bullets: docs.flow.map((item, index) => `${index + 1}. ${item.label}`) },
      { heading: "Build and launch", body: "The approved implementation phases and launch connections.", bullets: [...docs.plan.flatMap(item => item.tasks), ...docs.launch.map(item => `${item.label}: ${item.value}`)] },
    ],
  };
}

type Act =
  | { t: "select"; clientId: string; buildId: string } | { t: "toPicker" } | { t: "go"; i: number } | { t: "err"; m: string }
  | { t: "text"; id: string; v: string } | { t: "choice"; id: string; v: string } | { t: "check"; id: string; v: string }
  | { t: "unsure"; id: string } | { t: "confirmGate"; s: number } | { t: "sign"; id: string }
  | { t: "reqChanges"; note: string } | { t: "cancelReq" } | { t: "draft"; v: string } | { t: "sendNote"; id: string }
  | { t: "restart" } | { t: "autofill"; s: number } | { t: "demoAll"; finalIdx: number }
  | { t: "gen"; active: boolean; label?: string } | { t: "genDone"; id: string };

function reducer(s: FState, a: Act): FState {
  switch (a.t) {
    case "select": return { ...init, clientId: a.clientId, buildId: a.buildId };
    case "toPicker": return { ...s, clientId: null, ...freshBuild() };
    case "go": return { ...s, idx: a.i, error: "", requesting: false };
    case "err": return { ...s, error: a.m };
    case "text": return { ...s, answers: { ...s.answers, [a.id]: a.v }, error: "" };
    case "choice": return { ...s, answers: { ...s.answers, [a.id]: a.v }, error: "" };
    case "check": {
      const arr = Array.isArray(s.answers[a.id]) ? (s.answers[a.id] as string[]).slice() : [];
      const i = arr.indexOf(a.v); if (i === -1) arr.push(a.v); else arr.splice(i, 1);
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
      const confirmed: Record<number, boolean> = {}; SECTIONS.forEach((_, i) => (confirmed[i] = true));
      const signed: Record<string, boolean> = {}; DELIVS.forEach(d => { if (!d.terminal) signed[d.id] = true; });
      const genDone: Record<string, boolean> = {}; DELIVS.forEach(d => (genDone[d.id] = true));
      return { ...s, answers: { ...DEMO }, confirmed, signed, genDone, genActive: false, idx: a.finalIdx, requesting: false, error: "" };
    }
    case "gen": return { ...s, genActive: a.active, genLabel: a.label ?? s.genLabel };
    case "genDone": return { ...s, genActive: false, genDone: { ...s.genDone, [a.id]: true } };
  }
}

function seedFunnelBuilds(role: PortalState["role"], clientName: string): FunnelBuild[] {
  return clientsVisibleToRole(role, clientName).flatMap(client => client.funnels.map(funnel => ({
    ...funnel,
    clientId: client.id,
    clientName: client.name,
    owner: client.owner,
  })));
}

function isGenericFunnelTitle(value: string) {
  return /^(?:lead[- ]?gen funnel|funnel|your funnel)$/i.test(value.trim());
}

function funnelTitleFromData(data: Ans, fallback: string) {
  const text = (key: string) => typeof data[key] === "string" ? String(data[key]).trim() : "";
  const campaign = text("name");
  if (campaign && !isGenericFunnelTitle(campaign)) return campaign;
  const offer = text("offer");
  if (offer && !/^your offer$/i.test(offer)) return /funnel$/i.test(offer) ? offer : `${offer} Funnel`;
  const type = text("ftype");
  if (type && !isGenericFunnelTitle(type)) return type;
  const objective = text("objective");
  if (objective) return `${objective.charAt(0).toUpperCase()}${objective.slice(1)} Funnel`;
  return fallback;
}

function funnelTitleFromRecord(record: PortalFunnelPlanRecord) {
  if (record.title && !isGenericFunnelTitle(record.title)) return record.title;
  const content = record.content as FunnelDocs | undefined;
  const brief = (label: string) => content?.brief?.find(item => item.label === label)?.value || "";
  const storedName = brief("Funnel").replace(`${record.clientName} · `, "").trim();
  const offer = content?.blueprint?.offerBlock?.b?.split("  ·  ")[0]?.trim() || "";
  return funnelTitleFromData({ name: storedName, offer, ftype: brief("Type"), objective: brief("Objective") }, record.title || "Funnel draft");
}

function goalFromType(type: string) {
  const t = type.toLowerCase();
  if (t.includes("webinar")) return "Fill the next webinar";
  if (t.includes("sale")) return "Drive direct sales";
  if (t.includes("book") || t.includes("call") || t.includes("consult")) return "Book more calls";
  if (t.includes("lead")) return "Generate qualified leads";
  return "Convert more visitors";
}

function funnelSessionMeta(session: GuidedAuditSession) {
  const stageDefinition = FUNNEL_STAGES[Math.min(session.stage, FUNNEL_STAGES.length - 1)];
  const stageKey = stageDefinition?.key || "discovery";
  const complete = !!session.proposal || !!session.approved.brief;
  const intakeProgress = session.questionTotal > 0 ? Math.round((Math.min(session.qIdx, session.questionTotal) / session.questionTotal) * 20) : 0;
  const stageBase = Math.min(session.stage, FUNNEL_STAGES.length - 1) * 20;
  const readyForApproval = session.stage > 0 && !!session.aiResults[stageKey] && !session.approved[stageKey];
  const progress = complete ? 100 : session.stage === 0 ? intakeProgress : Math.min(95, stageBase + (readyForApproval ? 15 : 0));
  const statusLabel = complete ? "Complete" : readyForApproval ? "Ready for approval" : progress > 0 ? "In progress" : "Draft";
  const statusTone: FunnelBuild["statusTone"] = complete ? "success" : readyForApproval ? "accent" : progress > 0 ? "warn" : "muted";
  const stage = complete ? "Development plan · Complete" : `${stageDefinition?.label || "Discovery"} · ${readyForApproval ? "Ready for approval" : "In progress"}`;
  return { progress, statusLabel, statusTone, stage, updatedAt: new Date().toISOString() };
}

// ── answer helpers ───────────────────────────────────────────────────────────
function hasValue(q: FQuestion, answers: Ans): boolean {
  const v = answers[q.id];
  if (q.kind === "checklist") return Array.isArray(v) && v.length > 0;
  if (q.kind === "choice") return !!v;
  return typeof v === "string" && v.trim().length > 0;
}
function fmt(q: FQuestion, s: FState): string {
  const v = s.answers[q.id];
  if (s.unsure[q.id] && !hasValue(q, s.answers)) return "Not sure yet";
  if (q.kind === "checklist") return Array.isArray(v) && v.length ? (v as string[]).join(", ") : "";
  if (q.kind === "choice") return (v as string) || "";
  return typeof v === "string" && v.trim() ? v : "";
}

export function Funnels({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const flow = useMemo(() => buildFlow(), []);
  const visibleClients = useMemo(() => clientsVisibleToRole(state.role, state.clientName), [state.clientName, state.role]);
  const workingClients = useMemo(() => clientsForEngineWork(state.role, visibleClients), [state.role, visibleClients]);
  const visibleClientIds = useMemo(() => new Set(visibleClients.map(item => item.id)), [visibleClients]);
  const workingClientIds = useMemo(() => new Set(workingClients.map(item => item.id)), [workingClients]);
  const [s, dispatch] = useReducer(reducer, init);
  const [builds, setBuilds] = useState<FunnelBuild[]>(() => seedFunnelBuilds(state.role, state.clientName));
  const [deleteBuildConfirm, setDeleteBuildConfirm] = useState(false);
  const [exitingToPicker, setExitingToPicker] = useState(false);
  const [activePlanPost, setActivePlanPost] = useState<FunnelPlanPost | null>(null);
  const [quickKnow, setQuickKnow] = useState<Know>({ data: {}, sources: {} });
  const [auditedClientIds, setAuditedClientIds] = useState<Set<string>>(() => new Set(visibleClients.filter(item => item.audited).map(item => item.id)));
  const client = workingClients.find(c => c.id === s.clientId) || null;
  const build = builds.find(item => item.id === s.buildId) || null;
  const funnelGroups = useMemo(
    () => visibleClients.map(client => ({
      client,
      funnels: builds
        .filter(item => item.clientId === client.id)
        .sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || "")),
    })).filter(group => group.funnels.length > 0),
    [builds, visibleClients],
  );
  const buildOrdinal = build ? builds.filter(item => item.clientId === build.clientId).findIndex(item => item.id === build.id) + 1 : 0;
  const mobile = state.isMobile;
  const persistFunnelSessionRef = useRef<(session: GuidedAuditSession, meta: ReturnType<typeof funnelSessionMeta>) => void>(() => undefined);
  const funnelPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFunnelSession = useCallback((session: GuidedAuditSession) => {
    if (!s.buildId) return;
    const meta = funnelSessionMeta(session);
    setBuilds(current => {
      let changed = false;
      const next = current.map(item => {
        if (item.id !== s.buildId) return item;
        const subtitle = funnelTitleFromData(session.data, item.subtitle);
        if (item.progress === meta.progress && item.statusLabel === meta.statusLabel && item.stage === meta.stage && item.subtitle === subtitle) return item;
        changed = true;
        return { ...item, ...meta, subtitle };
      });
      return changed ? next : current;
    });
    persistFunnelSessionRef.current(session, meta);
  }, [s.buildId]);

  useEffect(() => {
    // Secondary sidebar abandoned — the DiscoveryBuilder carries its own rail.
    actions.patch({ guidedSidebarActive: false, guidedTopBarInfo: null });
  }, [actions]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portal-audit-runs", { cache: "no-store" })
      .then(async response => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load completed audits.");
        if (cancelled) return;
        const completed = new Set<string>(coercePersistedAuditDrafts(payload?.drafts)
          .filter(draft => draft.run.progress >= 100)
          .map(draft => draft.run.clientId)
          .filter(clientId => visibleClientIds.has(clientId)));
        visibleClients.filter(item => item.audited).forEach(item => completed.add(item.id));
        setAuditedClientIds(completed);
      })
      .catch(error => console.error("Unable to load funnel eligibility.", error));
    return () => { cancelled = true; };
  }, [visibleClientIds, visibleClients]);

  useEffect(() => {
    const rawPersistedBuilds = Object.values(state.clientWorkspaces).flatMap(workspace => workspace.funnelPlans.flatMap(record => {
      if (!workingClientIds.has(record.clientId)) return [];
      const source = workingClients.find(item => item.id === record.clientId);
      if (!source) return [];
      const progress = typeof record.progress === "number" ? record.progress : record.statusLabel === "Complete" ? 100 : 0;
      return [{
        id: record.buildId || record.id,
        clientId: record.clientId,
        clientName: record.clientName,
        owner: record.owner || source.owner,
        subtitle: funnelTitleFromRecord(record),
        statusLabel: record.statusLabel || "Draft",
        statusTone: record.statusTone || (progress >= 100 ? "success" : progress > 0 ? "warn" : "muted"),
        stage: record.stage || (progress >= 100 ? "Development plan · Complete" : "Discovery · In progress"),
        progress,
        due: record.due || "Today",
        updatedAt: record.updatedAt,
      } satisfies FunnelBuild];
    }));
    const totals = rawPersistedBuilds.reduce<Record<string, number>>((counts, item) => {
      const key = `${item.clientId}:${item.subtitle.toLowerCase()}`;
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
    const seen: Record<string, number> = {};
    const persistedBuilds = rawPersistedBuilds.map(item => {
      const key = `${item.clientId}:${item.subtitle.toLowerCase()}`;
      seen[key] = (seen[key] || 0) + 1;
      return totals[key] > 1 ? { ...item, subtitle: `${item.subtitle} · ${seen[key]}` } : item;
    });
    if (!persistedBuilds.length) return;
    setBuilds(current => {
      const merged = new Map(current.map(item => [item.id, item]));
      persistedBuilds.forEach(item => merged.set(item.id, { ...merged.get(item.id), ...item }));
      return Array.from(merged.values());
    });
  }, [state.clientWorkspaces, workingClientIds, workingClients]);

  // Restore confirmed and AI-extracted client facts when switching clients.
  useEffect(() => { setQuickKnow(s.clientId ? loadPersistedKnowledge(s.clientId) : { data: {}, sources: {} }); }, [s.clientId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("funnelPlan")) return;
    params.delete("funnelPlan");
    params.set("view", "funnels");
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, []);

  useEffect(() => {
    if (!activePlanPost) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePlanPost(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePlanPost]);

  const get = (id: string, fb = ""): string => {
    const q = QUESTIONS.find(x => x.id === id); if (!q) return fb;
    const v = fmt(q, s); return v && v !== "Not sure yet" ? v : fb;
  };
  const allIntakeDone = SECTIONS.every((_, i) => s.confirmed[i]);
  const delivReachable = (id: string): boolean => {
    if (!allIntakeDone) return false;
    const k = DELIVS.findIndex(d => d.id === id);
    for (let j = 0; j < k; j++) if (!s.signed[DELIVS[j].id]) return false;
    return true;
  };
  const sectionReachable = (si: number): boolean => si === 0 || SECTIONS.slice(0, si).every((_, i) => s.confirmed[i]);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // deliverable generation animation
  const genTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cur = flow[s.idx];
  const curDelivId = cur.kind === "deliv" ? cur.dId : null;
  useEffect(() => {
    if (!curDelivId || s.genDone[curDelivId]) return;
    const d = DELIVS.find(x => x.id === curDelivId)!;
    genTimers.current.forEach(clearTimeout); genTimers.current = [];
    dispatch({ t: "gen", active: true, label: "Reading your answers…" });
    genTimers.current.push(setTimeout(() => dispatch({ t: "gen", active: true, label: "Drafting your " + d.title.toLowerCase() + "…" }), 650));
    genTimers.current.push(setTimeout(() => dispatch({ t: "gen", active: true, label: "Refining the details…" }), 1350));
    genTimers.current.push(setTimeout(() => dispatch({ t: "genDone", id: curDelivId }), 2050));
    return () => { genTimers.current.forEach(clearTimeout); };
  }, [curDelivId, s.genDone]);

  useEffect(() => () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    if (funnelPersistTimer.current) clearTimeout(funnelPersistTimer.current);
  }, []);

  const next = () => {
    if (cur.kind !== "section") { dispatch({ t: "go", i: s.idx + 1 }); return; }
    const missing = cur.questions.filter(q => q.required && !hasValue(q, s.answers) && !s.unsure[q.id]);
    if (missing.length) {
      dispatch({ t: "err", m: missing.length === 1 ? "Please complete “" + missing[0].prompt + "” or mark it as not sure yet." : "Please complete the required fields in this section, or mark them as not sure yet." });
      return;
    }
    dispatch({ t: "go", i: s.idx + 1 });
  };

  const maxW = cur.kind === "welcome" ? "67rem" : cur.kind === "section" ? "47rem" : cur.kind === "gate" ? "520px" : cur.kind === "deliv" ? "680px" : "640px";
  const startFunnel = (clientId: string, buildId: string) => {
    setActivePlanPost(null);
    setExitingToPicker(false);
    dispatch({ t: "select", clientId, buildId });
  };
  const coercePlanPost = (record: PortalFunnelPlanRecord): FunnelPlanPost => ({
    ...record,
    content: record.content as FunnelDocs,
  });
  const storedPlanForBuild = (item: FunnelBuild, workspaces = state.clientWorkspaces): FunnelPlanPost | null => {
    const workspace = mergePortalClientWorkspace(item.clientId, workspaces[item.clientId]);
    const record = workspace.funnelPlans.find(plan => plan.buildId === item.id || plan.id === item.id);
    if (!record) return null;
    const post = coercePlanPost(record);
    // Heal plans persisted by an older schema (e.g. before funnel recommendations
    // existed) so the preview renders fully instead of crashing on missing fields.
    if (!Array.isArray(post.content?.recommendations)) {
      return { ...post, content: buildPlanPost(item).content };
    }
    return post;
  };
  const buildPlanPost = (item: FunnelBuild, data: Ans = FUNNEL_DEMO): FunnelPlanPost => {
    const title = funnelTitleFromData(data, item.subtitle);
    const selectedType = typeof data.ftype === "string" && data.ftype.trim() ? data.ftype : title;
    const content = FUNNEL_PIPELINE.buildDocs({
      ...FUNNEL_DEMO,
      ...data,
      name: item.clientName + " · " + title,
      ftype: selectedType,
    }) as FunnelDocs;
    const now = new Date().toISOString();

    return {
      id: item.id,
      buildId: item.id,
      type: "funnel_plan",
      title,
      clientId: item.clientId,
      clientName: item.clientName,
      statusLabel: item.statusLabel,
      statusTone: item.statusTone,
      stage: item.stage,
      progress: item.progress,
      owner: item.owner,
      due: item.due,
      generatedAt: now,
      updatedAt: now,
      content,
    };
  };
  const persistPlanPost = (post: FunnelPlanPost) => {
    actions.update(current => {
      const workspace = mergePortalClientWorkspace(post.clientId, current.clientWorkspaces[post.clientId]);
      const existingIndex = workspace.funnelPlans.findIndex(plan => plan.buildId === post.buildId || plan.id === post.id);
      const persisted: PortalFunnelPlanRecord = post;
      const funnelPlans = existingIndex >= 0
        ? workspace.funnelPlans.map((plan, index) => index === existingIndex ? persisted : plan)
        : [persisted, ...workspace.funnelPlans];
      return {
        clientWorkspaces: {
          ...current.clientWorkspaces,
          [post.clientId]: { ...workspace, funnelPlans },
        },
      };
    });
  };
  persistFunnelSessionRef.current = (session, meta) => {
    if (!build) return;
    if (funnelPersistTimer.current) clearTimeout(funnelPersistTimer.current);
    const buildSnapshot: FunnelBuild = { ...build, ...meta, subtitle: funnelTitleFromData(session.data, build.subtitle) };
    funnelPersistTimer.current = setTimeout(() => {
      const existing = storedPlanForBuild(buildSnapshot);
      const next = buildPlanPost(buildSnapshot, session.data);
      persistPlanPost({ ...next, generatedAt: existing?.generatedAt || next.generatedAt });
      funnelPersistTimer.current = null;
    }, 350);
  };
  const ensurePlanPost = (item: FunnelBuild, data?: Ans): FunnelPlanPost => {
    const stored = storedPlanForBuild(item);
    if (stored) return stored;
    const post = buildPlanPost(item, data);
    persistPlanPost(post);
    return post;
  };
  const previewFunnel = (clientId: string, buildId: string) => {
    setExitingToPicker(false);
    const planBuild = builds.find(item => item.clientId === clientId && item.id === buildId);
    if (!planBuild) return;
    setActivePlanPost(ensurePlanPost(planBuild));
  };
  const createFunnel = (clientId: string) => {
    const source = workingClients.find(item => item.id === clientId);
    const unassigned = isUnassignedEngineClient(source);
    if (!source || (!unassigned && (!visibleClientIds.has(source.id) || !auditedClientIds.has(source.id)))) return;
    const id = "funnel-" + clientId + "-" + Math.random().toString(36).slice(2, 8);
    const nextBuild: FunnelBuild = {
      id,
      clientId: source.id,
      clientName: source.name,
      owner: source.owner,
      subtitle: `Funnel draft ${builds.filter(item => item.clientId === source.id).length + 1}`,
      statusLabel: "Draft",
      statusTone: "muted",
      stage: "Not started",
      progress: 0,
      due: "Today",
      updatedAt: new Date().toISOString(),
    };
    setBuilds(prev => [nextBuild, ...prev]);
    persistPlanPost(buildPlanPost(nextBuild, {}));
    startFunnel(source.id, id);
    actions.showToast("New funnel draft ready for " + source.name);
  };
  const startOrResumeFunnel = () => {
    const target = startClientForEngine(state.role, visibleClients);
    if (!target) return;
    const existing = latestEngineWork(builds.filter(item => item.clientId === target.id));
    if (existing) startFunnel(target.id, existing.id);
    else createFunnel(target.id);
  };
  const deleteFunnel = (item: FunnelBuild) => {
    setBuilds(current => current.filter(buildItem => buildItem.id !== item.id));
    if (activePlanPost?.buildId === item.id || activePlanPost?.id === item.id) setActivePlanPost(null);
    if (s.buildId === item.id) dispatch({ t: "toPicker" });
    actions.update(current => {
      const workspace = mergePortalClientWorkspace(item.clientId, current.clientWorkspaces[item.clientId]);
      return {
        clientWorkspaces: {
          ...current.clientWorkspaces,
          [item.clientId]: {
            ...workspace,
            funnelPlans: workspace.funnelPlans.filter(plan => plan.buildId !== item.id && plan.id !== item.id),
          },
        },
      };
    });
    actions.showToast("Funnel deleted");
  };
  const exitToPicker = () => {
    if (exitingToPicker) return;
    setActivePlanPost(null);
    setExitingToPicker(true);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      dispatch({ t: "toPicker" });
      setExitingToPicker(false);
      exitTimer.current = null;
    }, 220);
  };

  useEffect(() => {
    if (state.role !== "client" || s.clientId) return;
    const ownClient = visibleClients[0];
    const ownBuild = ownClient
      ? latestEngineWork(builds.filter(item => item.clientId === ownClient.id))
      : null;
    if (ownBuild) dispatch({ t: "select", clientId: ownBuild.clientId, buildId: ownBuild.id });
  }, [builds, s.clientId, state.role, visibleClients]);

  if (!client) {
    if (state.role === "client" && visibleClients[0]) {
      const ownClient = visibleClients[0];
      const canCreate = auditedClientIds.has(ownClient.id);
      return (
        <div style={css("width:100%;padding:" + (state.isMobile ? "1rem .9rem 1.5rem" : "1.6rem 2rem 2.4rem"))}>
          <GuidedIntakeSelector
            eyebrow={`Funnel Builder · ${ownClient.name}`}
            eyebrowColor="var(--accent)"
            title="Start your first funnel build"
            description={canCreate ? "Use your approved audit to create the strategy, sales-page wireframe, copy, and launch plan." : "Complete your website audit first so this build can use the approved findings and brand context."}
            controlsBelow
            controls={<EngineIndexControls
              metrics={[{ label: canCreate ? "Audit ready" : "Website audit required", tone: canCreate ? "success" : "warn" }]}
              action={{ label: "Generate funnel", onClick: () => createFunnel(ownClient.id), disabled: !canCreate }}
            />}
            countLabel="build"
            cards={[]}
          />
        </div>
      );
    }
    return (
      <div style={css("width:100%;padding:1.6rem 2rem 2.4rem")}>
        <GuidedIntakeSelector
          eyebrow="Funnel Builder"
          eyebrowColor="var(--accent)"
          title="Start or continue a funnel build"
          description="Add the offer, audience, and sales goal. Get the strategy, sales-page wireframe, copy, and launch plan."
          controlsBelow
          controls={<EngineIndexControls
            metrics={[{ label: `${assignedEngineWork(builds, visibleClients).length} created`, tone: "accent" }]}
            action={{ label: "Generate funnel", onClick: startOrResumeFunnel }}
          />}
          countLabel="build"
          cards={funnelGroups.map(group => {
            const latest = group.funnels[0];
            const readyCount = group.funnels.filter(item => item.progress >= 100).length;
            const funnelType = latest?.subtitle || "Funnel";
            const goal = goalFromType(funnelType);
            const stage = latest?.stage || "Not started";
            return {
              id: group.client.id,
              name: group.client.name,
              subtitle: group.funnels.length + " funnel" + (group.funnels.length === 1 ? "" : "s") + " created",
              statusLabel: group.funnels.length + " funnel" + (group.funnels.length === 1 ? "" : "s"),
              statusTone: "accent" as const,
              stage: "Funnels",
              progress: 0,
              owner: group.client.owner,
              due: latest?.due || "—",
              headerAction: {
                label: "Generate funnel for " + group.client.name,
                icon: "plus",
                onClick: () => createFunnel(group.client.id),
              },
              showStatus: false,
              showProgress: false,
              showStage: false,
              showMeta: false,
              showFooter: false,
              hero: <FunnelFlowHero direction={funnelType} goal={goal} build={stage} readyCount={readyCount} />,
              compactDetails: true,
              details: group.funnels.map(item => ({
                id: item.id,
                title: item.subtitle,
                statusLabel: item.statusLabel,
                statusTone: item.statusTone,
                stage: item.stage,
                assignee: item.owner,
                due: item.due,
                actions: [
                  { label: "Open", onClick: () => previewFunnel(item.clientId, item.id) },
                  { label: "Delete", onClick: () => deleteFunnel(item) },
                ],
              })),
              primaryLabel: "Open latest",
              onPrimary: () => latest && startFunnel(latest.clientId, latest.id),
              secondaryLabel: "New funnel",
              secondaryIcon: "plus",
              onSecondary: () => createFunnel(group.client.id),
            };
          })}
        />
        {activePlanPost && (
          <FunnelPlanPreviewModal
            post={activePlanPost}
            mobile={mobile}
            onClose={() => setActivePlanPost(null)}
            showToast={actions.showToast}
            showAiHandover
            onImportTasks={actions.bulkImportTasks}
            onShare={() => actions.shareFinalOutput({ clientName: activePlanPost.clientName, title: "Funnel Builder · Final development plan", outputType: "builder", ...funnelApprovalOutput(activePlanPost.content) })}
          />
        )}
      </div>
    );
  }

  const panelSections = [
    {
      label: "Intake",
      items: SECTIONS.map((sec, si) => {
        const done = s.confirmed[si];
        const active = (cur.kind === "section" || cur.kind === "gate") && (cur as { sIdx: number }).sIdx === si;
        const reach = sectionReachable(si);
        return {
          key: sec,
          title: sec,
          done,
          active,
          reachable: reach,
          onClick: () => reach && dispatch({ t: "go", i: firstSectionIdx(flow, si) }),
        };
      }),
    },
    {
      label: "Build",
      items: DELIVS.map(d => {
        const done = s.signed[d.id];
        const active = cur.kind === "deliv" && cur.dId === d.id;
        const reach = delivReachable(d.id);
        return {
          key: d.id,
          title: d.title,
          done,
          active,
          reachable: reach,
          final: d.terminal,
          onClick: () => reach && dispatch({ t: "go", i: flow.findIndex(f => f.kind === "deliv" && f.dId === d.id) }),
        };
      }),
    },
  ];
  const footer = (() => {
    const total = SECTIONS.length + DELIVS.filter(d => !d.terminal).length;
    const doneN = Object.values(s.confirmed).filter(Boolean).length + DELIVS.filter(d => !d.terminal && s.signed[d.id]).length;
    const pct = Math.round((doneN / total) * 100);
    return (
      <>
        <div style={css("font-size:var(--text-xs);font-weight:500;color:var(--success);margin-bottom:0.5rem")}>{doneN} of {total} signed off</div>
        <div style={css("height:4px;background:var(--bg);border-radius:999px;overflow:hidden")}><div style={css("height:100%;width:" + pct + "%;background:linear-gradient(90deg,oklch(0.66 0.12 155),oklch(0.54 0.11 165));transition:width .3s ease")} /></div>
        <div style={css("display:grid;grid-template-columns:0.72fr 1fr;gap:0.45rem;margin-top:0.8rem")}>
          <button type="button" onClick={() => dispatch({ t: "restart" })} style={css("min-height:2.05rem;display:inline-flex;align-items:center;justify-content:center;padding:0 0.6rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}>Restart</button>
          <button type="button" onClick={() => { const st = flow[s.idx]; if (st.kind === "section" || st.kind === "gate") dispatch({ t: "autofill", s: (st as { sIdx: number }).sIdx }); }} style={css("min-height:2.05rem;display:inline-flex;align-items:center;justify-content:center;gap:0.3rem;padding:0 0.5rem;border:1px dashed var(--border);border-radius:var(--radius-pill);background:transparent;color:var(--fg-muted);font-size:0.68rem;font-weight:500;cursor:pointer")}><Icon name="replay" size={12} />Auto-fill step</button>
        </div>
      </>
    );
  })();

  const funnelKnow = mergeKnow(
    mergeKnow(getKnowledge(client.id), fromClientMemory(client.id, client.name, actions.workspaceForClient(client.name))),
    quickKnow,
  );
  return (
    <div style={css("width:100%;padding:" + (mobile ? "1rem 0.9rem 1.5rem" : "1.4rem 1.5rem") + ";display:flex;flex-direction:column;gap:0.9rem")}>
      {build && <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:.45rem")}>
        {deleteBuildConfirm ? <>
          <span style={css("margin-right:.2rem;font-size:.72rem;color:var(--danger)")}>Delete this funnel?</span>
          <button type="button" onClick={() => setDeleteBuildConfirm(false)} style={css("height:2rem;padding:0 .75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:.72rem;font-weight:500;cursor:pointer")}>Cancel</button>
          <button type="button" onClick={() => { setDeleteBuildConfirm(false); deleteFunnel(build); }} style={css("height:2rem;padding:0 .75rem;border:none;border-radius:999px;background:var(--danger);color:#fff;font-size:.72rem;font-weight:500;cursor:pointer")}>Delete funnel</button>
        </> : <button type="button" onClick={() => setDeleteBuildConfirm(true)} style={css("height:2rem;padding:0 .75rem;border:1px solid color-mix(in srgb,var(--danger) 35%,var(--border) 65%);border-radius:999px;background:var(--surface);color:var(--danger);font-size:.72rem;font-weight:500;cursor:pointer")}>Delete funnel</button>}
      </div>}
      <DiscoveryBuilder
        key={build?.id || client.id}
        mobile={mobile}
        accent="var(--accent)"
        title={build?.subtitle || "Lead-Gen Funnel"}
        clientName={client.name}
        intro={{ eyebrow: "Baltz Studio · Guided discovery", heading: "See exactly what you’ll get." }}
        wizard={FUNNEL_WIZARD}
        stages={FUNNEL_STAGES}
        introSteps={FUNNEL_INTRO_STEPS}
        completeMsg="That’s everything I need. I’ll draft the funnel flow, copy, wireframe and development plan from your answers."
        completeCta="Generate the plan →"
        demo={FUNNEL_DEMO}
        pipeline={FUNNEL_PIPELINE}
        onImportTasks={actions.bulkImportTasks}
        onPipelineComplete={data => { if (build) persistPlanPost(buildPlanPost(build, data)); }}
        sessionKey={build?.id}
        onSessionChange={saveFunnelSession}
        showToast={actions.showToast}
        prefill={funnelKnow.data}
        prefillSources={funnelKnow.sources}
        prefillNotes={funnelKnow.notes}
        quickStartMode="funnel"
        backLabel={state.role === "client" ? "← Back to dashboard" : "← All funnels"}
        hideHeader={state.role === "client"}
        onIngest={delta => {
          rememberKnowledge(client.id, delta);
          setQuickKnow(k => mergeKnow(k, delta));
        }}
        onExit={() => state.role === "client" ? actions.setView("progress") : exitToPicker()}
        onComplete={data => {
          if (build) persistPlanPost(buildPlanPost(build, data));
          recordKnowledge(client.id, data, "Funnel intake");
          if (state.role === "client") actions.setView("progress");
          else exitToPicker();
        }}
      />
    </div>
  );
}

export function FunnelPlanPreviewModal({ post, mobile, onClose, showToast, onImportTasks, onShare, showAiHandover = true }: { post: FunnelPlanPost; mobile: boolean; onClose: () => void; showToast: (message: string) => void; onImportTasks: (drafts: TaskImportDraft[]) => void; onShare?: () => void; showAiHandover?: boolean }) {
  const docs = post.content;
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const handover = useMemo(() => buildFunnelAiHandover(post), [post]);
  const taskDrafts = useMemo(() => funnelTaskDrafts(docs, post.clientName), [docs, post.clientName]);
  const copyAiHandover = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(handover);
      } else {
        const area = document.createElement("textarea");
        area.value = handover;
        area.setAttribute("readonly", "true");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      showToast("Build handover copied");
    } catch {
      const area = document.createElement("textarea");
      area.value = handover;
      area.setAttribute("readonly", "true");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(area);
      showToast(copied ? "Build handover copied" : "Build handover ready to copy");
    }
  };
  const reportTitle = `${post.clientName} · Development plan`;
  const openPrintDialog = () => {
    const html = reportDocumentHtml(document.querySelector("[data-funnel-report-document]"), reportTitle);
    if (!html || !printReportHtml(html, reportTitle)) showToast("The print dialog could not be opened");
  };
  const openShare = () => {
    onShare?.();
    const url = new URL("/dashboard", window.location.origin);
    url.searchParams.set("view", "review");
    url.searchParams.set("approval", `${post.clientId}-builder-funnel-builder-final-development-plan`);
    setShareUrl(url.toString());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={post.clientName + " funnel preview"}
      onClick={onClose}
      style={{ ...css("position:fixed;inset:0;z-index:90;background:rgba(35,25,18,.32);padding:" + (mobile ? "0.75rem" : "1.25rem 1.5rem") + ";display:flex;align-items:flex-start;justify-content:center;overflow:auto"), animation: "pt-fadein .14s ease" }}
    >
      <div onClick={event => event.stopPropagation()} style={css("width:min(51rem,100%);margin:" + (mobile ? "0 auto" : "1.1rem auto 2rem"))}>
        <div style={css("display:flex;align-items:center;gap:var(--space-3);margin-bottom:0.8rem")}>
          <div style={css("font-size:0.92rem;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.2);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1")}>{post.title} · {post.clientName}</div>
          <div style={css("margin-left:auto;display:flex;align-items:center;gap:0.6rem;flex-shrink:0")}>
            {showAiHandover && <button type="button" onClick={() => { setHandoverOpen(open => !open); void copyAiHandover(); }} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;gap:0.4rem;min-height:2.1rem;padding:0 0.85rem;border-radius:999px;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.9);color:var(--fg);font-size:0.74rem;font-weight:500;cursor:pointer;white-space:nowrap")}><Icon name="send" size={13} />Build handover</button>}
            <button type="button" onClick={onClose} className="pt-iconbtn" style={css("width:2.1rem;height:2.1rem;border-radius:50%;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.86);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer;flex-shrink:0")}><Icon name="x" size={15} /></button>
          </div>
        </div>

        <article data-funnel-report-document data-report-client={post.clientName} data-report-project={post.title} data-report-status="Ready for review" style={css("border:1px solid var(--border-soft);border-radius:1.1rem;background:var(--surface);overflow:hidden")}>
          <header data-report-exclude style={css("min-height:" + (mobile ? "4.7rem" : "6.1rem") + ";padding:" + (mobile ? "0.85rem 1.3rem" : "0.9rem 1.9rem") + ";border-bottom:1px solid var(--border-soft);display:flex;align-items:center;gap:0.95rem;flex-wrap:wrap")}>
            <span style={css("width:3rem;height:3rem;border-radius:0.68rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0")}><Icon name="checklist" size={22} /></span>
            <div style={{ minWidth: 0, flex: "1 1 auto" }}>
              <h2 style={css("margin:0;font-size:" + (mobile ? "1.2rem" : "1.45rem") + ";font-weight:500;letter-spacing:-0.015em;line-height:1.1")}>Development plan</h2>
              {showAiHandover && <p style={css("margin:0.3rem 0 0;font-size:0.76rem;color:var(--fg-muted);line-height:1.4")}>Includes a build-ready handover generated from this plan.</p>}
            </div>
            <span style={css("margin-left:auto;display:inline-flex;align-items:center;min-height:2.15rem;padding:0 0.95rem;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:var(--text-base);font-weight:500;white-space:nowrap")}>Ready for review</span>
          </header>

          {showAiHandover && handoverOpen && (
            <div data-report-exclude style={css("padding:" + (mobile ? "0.95rem 1.15rem" : "1rem 1.9rem") + ";border-bottom:1px solid var(--border-soft);background:color-mix(in srgb,var(--accent) 7%,white 93%)")}>
              <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:0.65rem")}>
                <div>
                  <div style={css("font-size:var(--text-base);font-weight:500;color:var(--fg)")}>Build handover</div>
                  <div style={css("font-size:0.7rem;color:var(--fg-muted);margin-top:0.15rem")}>Use this with your builder or development team as the source of truth.</div>
                </div>
                <button type="button" onClick={copyAiHandover} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;gap:0.35rem;min-height:2rem;padding:0 0.8rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}><Icon name="file" size={13} />Copy handover</button>
              </div>
              <textarea
                readOnly
                value={handover}
                style={css("width:100%;min-height:" + (mobile ? "11rem" : "13rem") + ";box-sizing:border-box;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface);color:var(--fg);font-family:'Courier New',monospace;font-size:var(--text-xs);line-height:1.45;padding:0.8rem;resize:vertical;outline:none")}
              />
            </div>
          )}

          <div data-report-content style={css("padding:" + (mobile ? "1.2rem" : "1.85rem 2rem 2rem"))}>
            {FUNNEL_PIPELINE.renderStage({
              aiResult: null,
              aiResults: {},
              stageKey: "brief",
              docs,
              reveal: Number.POSITIVE_INFINITY,
              building: false,
              approved: true,
              mobile,
              accent: "var(--accent)",
              onAdvance: onClose,
              onDownload: openPrintDialog,
              onShare: openShare,
              onCopy: () => showToast("Development plan copied"),
              afterActions: <BuilderTaskPanel embedded drafts={taskDrafts} fileName={`${post.clientId || "client"}-funnel-tasks.csv`} mobile={mobile} onImport={onImportTasks}/>,
            })}
          </div>
        </article>
      </div>
      {shareUrl && <ShareLinkDialog title={post.title} clientName={post.clientName} url={shareUrl} onClose={() => setShareUrl(null)} showToast={showToast}/>}
    </div>
  );
}

// ── panel bits ───────────────────────────────────────────────────────────────
function firstSectionIdx(flow: FlowStep[], si: number): number {
  const i = flow.findIndex(f => f.kind === "section" && f.sIdx === si);
  return i === -1 ? 0 : i;
}

// ── welcome ──────────────────────────────────────────────────────────────────
const FUNNEL_SIX: [string, string, string][] = [
  ["1", "Funnel Flow", "CTA & journey"],
  ["2", "Customer Persona", "Pains & objections"],
  ["3", "Copy & Messaging", "Headline system"],
  ["4", "Skeleton Wireframe", "Page structure"],
  ["5", "Development Plan", "Build scope"],
  ["6", "Timeline & Budget", "Launch path"],
];

const FUNNEL_PLAN_ROWS = [
  { title: "Funnel flow", note: "Lead magnet → opt-in → calendar", tone: "Ready" },
  { title: "Customer persona", note: "Audience, pains, objections", tone: "Approved" },
  { title: "Copy & messaging", note: "Hooks, headlines, CTA stack", tone: "Ready" },
  { title: "Skeleton wireframe", note: "Page sections & hierarchy", tone: "Ready" },
  { title: "Development plan", note: "Build notes & dependencies", tone: "Planned" },
  { title: "Timeline & budget", note: "Launch path & scope", tone: "Planned" },
];

// The build "document" that pops out of the intro card — mirrors the final plan.
function FunnelPlanDoc() {
  return (
    <div style={css("width:100%;background:var(--surface);display:flex;flex-direction:column")}>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 24px 16px;border-bottom:2px solid var(--accent)")}>
        <div style={css("display:flex;align-items:center;gap:10px")}>
          <span style={css("width:30px;height:30px;border-radius:7px;flex-shrink:0;background:color-mix(in srgb,var(--accent) 12%,white 88%);color:var(--accent);display:grid;place-items:center;font-size:14px;font-weight:500")}>B</span>
          <div><div style={css("font-size:15px;font-weight:500;line-height:1.15")}>Client</div><div style={css("font-size:11px;color:var(--fg-faint)")}>Funnel Build Plan</div></div>
        </div>
        <div style={css("text-align:right;flex-shrink:0")}><div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;font-size:9.5px;color:var(--fg-faint)")}>Plan</div><div style={css("font-size:11px;color:var(--fg-muted);margin-top:2px")}>Jul 2026</div></div>
      </div>

      <div style={css("padding:18px 24px 0")}>
        <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;font-size:9.5px;color:var(--fg-faint);margin-bottom:11px")}>The funnel</div>
        <div style={css("padding-bottom:18px;border-bottom:1px solid var(--border-soft)")}>
          <div style={css("font-size:14px;font-weight:500;line-height:1.32")}>Book more strategy calls without rebuilding the whole site.</div>
          <div style={css("display:flex;flex-wrap:wrap;gap:6px;margin-top:10px")}>
            {["Lead magnet", "Opt-in page", "Booking step", "Email nurture"].map(chip => (
              <span key={chip} style={css("font-size:10px;font-weight:500;color:var(--accent);background:color-mix(in srgb,var(--accent) 11%,white 89%);padding:2px 7px;border-radius:999px")}>{chip}</span>
            ))}
          </div>
        </div>
        <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;font-size:9.5px;color:var(--fg-faint);margin:16px 0 4px")}>Plan sections</div>
      </div>

      <div style={css("padding:0 24px 6px")}>
        {FUNNEL_PLAN_ROWS.map((row, i) => (
          <div key={row.title} style={css("display:flex;align-items:center;gap:12px;padding:11px 0" + (i < FUNNEL_PLAN_ROWS.length - 1 ? ";border-bottom:1px solid var(--border-soft)" : ""))}>
            <span style={css("width:30px;height:30px;border-radius:50%;flex-shrink:0;background:color-mix(in srgb,var(--accent) 12%,white 88%);color:var(--accent);display:grid;place-items:center")}><Icon name="checkmark" size={13} /></span>
            <div style={css("flex:1;min-width:0")}>
              <div style={css("font-size:12.5px;font-weight:500;line-height:1.2")}>{row.title}</div>
              <div style={css("font-size:10.5px;color:var(--fg-muted);margin-top:2px")}>{row.note}</div>
            </div>
            <span style={css("flex-shrink:0;font-size:9px;font-weight:500;color:var(--accent);background:color-mix(in srgb,var(--accent) 11%,white 89%);padding:1.5px 6px;border-radius:999px;white-space:nowrap")}>{row.tone}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Welcome({ mobile, onStart }: { mobile: boolean; onStart: () => void }) {
  const leftPanel = (
    <div style={css("position:relative;z-index:2;flex-shrink:0;width:" + (mobile ? "100%" : "452px") + ";height:" + (mobile ? "auto" : "100%") + ";padding:" + (mobile ? "26px 22px 4px" : "44px 0 44px 44px") + ";display:flex;flex-direction:column")}>
      <div style={css("display:flex;align-items:center;gap:8px;margin-bottom:22px")}><span style={css("width:6px;height:6px;border-radius:50%;background:var(--accent)")} /><span style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;font-size:11px;color:var(--accent)")}>Lead-Gen Funnel · Guided Build</span></div>
      <h1 style={css("margin:0;font-size:" + (mobile ? "26px" : "31px") + ";line-height:1.08;letter-spacing:-0.02em;font-weight:500;color:var(--fg)")}>See exactly what you&apos;ll get.</h1>
      <p style={css("margin:12px 0 0;font-size:14px;line-height:1.5;color:var(--fg-muted);max-width:44ch")}>Every funnel turns your approved inputs into a build-ready plan with the structure, messaging, and next steps your team can actually execute.</p>

      <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;font-size:11px;color:var(--fg-faint);margin-top:22px")}>The six things we build</div>
      <div style={css("margin-top:11px;background:var(--surface);border:1px solid var(--border-soft);border-radius:12px;overflow:hidden")}>
        {FUNNEL_SIX.map(([n, title, tag], i) => (
          <div key={n} style={css("display:flex;align-items:center;gap:12px;padding:10px 16px" + (i < FUNNEL_SIX.length - 1 ? ";border-bottom:1px solid var(--border-soft)" : ""))}>
            <span style={css("width:22px;height:22px;border-radius:50%;flex-shrink:0;border:1.5px solid var(--border);display:grid;place-items:center;font-size:11px;font-weight:500;color:var(--fg-muted)")}>{n}</span>
            <span style={css("flex:1;font-size:13.5px;font-weight:500;color:var(--fg)")}>{title}</span>
            <span style={css("font-size:10.5px;font-weight:500;color:var(--fg-muted);background:color-mix(in srgb,var(--surface-alt) 70%,white 30%);padding:3px 9px;border-radius:999px;white-space:nowrap")}>{tag}</span>
          </div>
        ))}
      </div>

      <div style={css("margin-top:" + (mobile ? "22px" : "auto") + ";padding-top:20px")}>
        <button type="button" onClick={onStart} className="pt-op" style={css("width:100%;border:0;cursor:pointer;background:var(--accent-grad);color:#fff;font-family:inherit;font-size:15px;font-weight:500;padding:14px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;gap:9px")}>Start intake →</button>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <div style={{ animation: "cocoonFade .24s ease" }}>
        <div style={css("border:1px solid var(--border);border-radius:14px;overflow:hidden;background:color-mix(in srgb,var(--surface) 58%,var(--bg) 42%)")}>
          {leftPanel}
          <div style={css("padding:14px 18px 18px")}>
            <div style={css("border:1px solid var(--border);border-radius:8px;overflow:hidden")}>
              <FunnelPlanDoc />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "cocoonFade .24s ease" }}>
      <div style={css("position:relative;overflow:hidden;min-height:576px;border:1px solid var(--border);border-radius:14px;background:color-mix(in srgb,var(--surface) 58%,var(--bg) 42%)")}>
        <div style={css("position:absolute;z-index:0;right:-40px;top:40px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 10%,transparent 90%),transparent 68%)")} />
        <div style={css("position:absolute;z-index:1;top:38px;right:-48px;width:462px;height:604px;background:var(--surface);border:1px solid var(--border-soft);border-radius:6px;opacity:0.5")} />
        <div style={css("position:absolute;z-index:2;top:52px;right:-30px;width:462px;height:604px;overflow:hidden;border:1px solid var(--border);border-radius:6px")}>
          <FunnelPlanDoc />
        </div>
        {leftPanel}
      </div>
    </div>
  );
}

// ── question ─────────────────────────────────────────────────────────────────
function SectionCard({ step, s, dispatch, mobile }: { step: Extract<FlowStep, { kind: "section" }>; s: FState; dispatch: (a: Act) => void; mobile: boolean }) {
  const meta = SECTIONS[step.sIdx] + " · " + step.questions.length + " prompts";
  const optionsGrid = mobile ? "1fr" : "repeat(2,1fr)";
  return (
    <div style={{ animation: "cocoonFade .28s ease", marginTop: mobile ? "0.45rem" : "0.7rem" }}>
      <div style={css("background:var(--surface);border:1px solid var(--border-soft);border-radius:0.875rem;overflow:hidden")}>
        <div style={css("padding:0.98rem 1.18rem 0.78rem;border-bottom:1px solid var(--border-soft)")}>
          <div style={css("font-size:0.62rem;color:var(--fg-muted);margin-bottom:0.4rem;display:flex;align-items:center;gap:0.36rem;flex-wrap:wrap")}>
            <span>{meta}</span>
            <span>·</span>
            <span style={css("color:var(--accent);font-weight:500")}>Complete this section</span>
          </div>
          <h3 style={css("font-size:1.04rem;font-weight:500;line-height:1.22;margin:0")}>{SECTIONS[step.sIdx]}</h3>
        </div>
        <div style={css("padding:0.82rem 1.18rem;display:flex;flex-direction:column;gap:0.68rem")}>
          {step.questions.map((q, index) => {
            const val = s.answers[q.id];
            return (
              <div key={q.id} style={css("padding:" + (mobile ? "0.74rem" : "0.74rem 0.8rem 0.78rem") + ";border:1px solid var(--border-soft);border-radius:0.8rem;background:color-mix(in srgb,var(--surface) 82%,var(--surface-alt) 18%)")}>
                <div style={css("font-size:0.62rem;color:var(--fg-muted);margin-bottom:0.36rem;display:flex;align-items:center;gap:0.36rem;flex-wrap:wrap")}>
                  <span>{String(index + 1).padStart(2, "0")} · {TYPE_LABEL[q.kind]}</span>
                  {q.required ? <><span>·</span><span style={css("color:var(--accent);font-weight:500")}>Required</span></> : <><span>·</span><span style={css("color:var(--fg-faint)")}>Optional</span></>}
                </div>
                <h4 style={css("font-size:0.86rem;font-weight:500;line-height:1.28;margin:0 0 0.54rem")}>{q.prompt}</h4>
                {q.kind === "choice" && (
                  <div style={css("display:grid;grid-template-columns:" + optionsGrid + ";gap:0.32rem")}>
                    {q.options!.map(opt => {
                      const sel = val === opt;
                      return <GuidedOptionPill key={opt} label={opt} selected={sel} onClick={() => dispatch({ t: "choice", id: q.id, v: opt })} accentColor="var(--accent)" accentBackground="var(--accent-soft)" />;
                    })}
                  </div>
                )}
                {q.kind === "checklist" && (
                  <div style={css("display:grid;grid-template-columns:" + optionsGrid + ";gap:0.32rem")}>
                    {q.options!.map(opt => {
                      const sel = Array.isArray(val) && val.includes(opt);
                      return <GuidedOptionPill key={opt} label={opt} selected={sel} onClick={() => dispatch({ t: "check", id: q.id, v: opt })} accentColor="var(--accent)" accentBackground="var(--accent-soft)" />;
                    })}
                  </div>
                )}
                {q.kind === "textarea" && (
                  <textarea value={(val as string) || ""} onChange={e => dispatch({ t: "text", id: q.id, v: e.target.value })} placeholder={q.placeholder} style={css("width:100%;min-height:5.75rem;padding:0.68rem 0.82rem;border:1px solid var(--border);border-radius:var(--radius);font-size:var(--text-base);font-family:inherit;color:var(--fg);background:color-mix(in srgb,var(--surface) 94%,white 6%);outline:none;line-height:1.45;resize:vertical")} />
                )}
                {q.kind === "text" && (
                  <input value={(val as string) || ""} onChange={e => dispatch({ t: "text", id: q.id, v: e.target.value })} onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }} placeholder={q.placeholder} style={css("width:100%;padding:0.68rem 0.82rem;border:1px solid var(--border);border-radius:var(--radius);font-size:var(--text-base);font-family:inherit;color:var(--fg);background:color-mix(in srgb,var(--surface) 94%,white 6%);outline:none")} />
                )}
                {q.help && <div style={css("margin-top:0.4rem;font-size:var(--text-2xs);color:var(--fg-faint);line-height:1.4")}>{q.help}</div>}
                <GuidedUnsureToggle checked={!!s.unsure[q.id]} onClick={() => dispatch({ t: "unsure", id: q.id })} accentColor="var(--accent)" />
              </div>
            );
          })}
          {s.error && <div style={css("font-size:0.68rem;color:oklch(0.55 0.2 20);font-weight:500")}>{s.error}</div>}
        </div>
      </div>
    </div>
  );
}

// ── gate ─────────────────────────────────────────────────────────────────────
function GateCard({ sIdx, s, client, fmtQ }: { sIdx: number; s: FState; client: string; fmtQ: (q: FQuestion) => string }) {
  const signed = s.confirmed[sIdx];
  const items = QUESTIONS.filter(q => q.s === sIdx).map(q => ({ label: q.prompt, value: fmtQ(q) || "—" }));
  return (
    <div style={{ animation: "cocoonFade .28s ease" }}>
      <div style={css("background:var(--surface);border-radius:16px;border:1px solid var(--border-soft);overflow:hidden")}>
        <div style={css("padding:1.6rem 1.8rem 0.3rem")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-bottom:1rem;flex-wrap:wrap")}>
            <span style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--accent)")}>Sign-off · {SECTIONS[sIdx]}</span>
            <span style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:var(--text-2xs);font-weight:500;padding:0.2rem 0.55rem;border-radius:999px;" + (signed ? "background:var(--success-soft);color:var(--success)" : "background:var(--warn-soft);color:var(--warn)"))}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:" + (signed ? "var(--success)" : "oklch(0.7 0.12 68)"))} />{signed ? "Signed off" : "Needs sign-off"}</span>
          </div>
          <h3 style={css("font-size:1.55rem;font-weight:500;line-height:1.16;margin:0 0 0.42rem")}>Here&apos;s what we heard</h3>
          <p style={css("color:var(--fg-muted);font-size:var(--text-base);margin:0;line-height:1.55")}>Read it back — this is the brief we build on. Sign off to lock it in, or edit anything that&apos;s off.</p>
        </div>
        <div style={css("padding:0.75rem 1.8rem 1rem")}>
          {items.map((it, i) => (
            <div key={i} style={css("display:flex;gap:0.7rem;padding:0.6rem 0;" + (i ? "border-top:1px solid var(--border-soft)" : ""))}>
              <span style={css("font-size:var(--text-xs);font-weight:600;color:var(--accent);flex-shrink:0;width:1.4rem;padding-top:0.15rem")}>{String(i + 1).padStart(2, "0")}</span>
              <div style={css("min-width:0;flex:1")}>
                <div style={css("font-size:var(--text-sm);color:var(--fg-muted);margin-bottom:0.22rem;line-height:1.4")}>{it.label}</div>
                <div style={css("font-size:0.85rem;color:var(--fg);line-height:1.4")}>{it.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={css("background:var(--surface-alt);border-top:1px solid var(--border-soft);padding:1.15rem 1.8rem 1.3rem")}>
          <div style={css("display:flex;align-items:center;gap:0.65rem")}>
            <span style={css("width:1.7rem;height:1.7rem;border-radius:0.5rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0")}><Icon name="lock" size={13} /></span>
            <span style={css("font-size:var(--text-sm);color:var(--fg-muted);line-height:1.45")}>Signing as <span style={css("color:var(--fg);font-weight:500")}>{client}</span> locks this section so we can build on it.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── deliverable card ─────────────────────────────────────────────────────────
function DelivCard({ dId, s, dispatch, get }: { dId: string; s: FState; dispatch: (a: Act) => void; get: (id: string, fb?: string) => string }) {
  const d = DELIVS.find(x => x.id === dId)!;
  const num = DELIVS.findIndex(x => x.id === dId) + 1;
  const signed = s.signed[dId];
  const generating = s.genActive && !s.genDone[dId];
  return (
    <div style={{ animation: "cocoonFade .3s ease" }}>
      <div style={css("background:var(--surface);border:1px solid var(--border-soft);border-radius:20px;padding:1.7rem 1.9rem 1.6rem")}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);margin-bottom:0.6rem;flex-wrap:wrap")}>
          <div style={css("display:flex;gap:0.85rem;align-items:center;min-width:0")}>
            <div style={css("width:2.5rem;height:2.5rem;border-radius:0.8rem;background:" + (signed ? "var(--success-soft)" : "var(--accent-soft)") + ";color:" + (signed ? "var(--success)" : "var(--accent)") + ";display:grid;place-items:center;font-size:var(--text-xl);font-weight:600;flex-shrink:0")}>{signed ? "✓" : num}</div>
            <div style={css("min-width:0")}>
              <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--accent);margin-bottom:0.25rem")}>Generated from {d.from}</div>
              <h3 style={css("font-size:var(--text-3xl);font-weight:500;line-height:1.2;margin:0")}>{d.title}</h3>
            </div>
          </div>
          <span style={css("flex-shrink:0;display:inline-flex;align-items:center;gap:0.4rem;font-size:var(--text-xs);font-weight:500;color:" + (signed ? "var(--success)" : "var(--fg-muted)") + ";margin-top:0.3rem")}><span style={css("width:0.5rem;height:0.5rem;border-radius:50%;" + (signed ? "background:var(--success)" : "border:1.5px solid var(--fg-muted)"))} />{signed ? "Signed off" : "Awaiting sign-off"}</span>
        </div>
        <p style={css("color:var(--fg-muted);font-size:var(--text-base);margin:0.9rem 0 1.4rem;padding-bottom:1.3rem;border-bottom:1px solid var(--border-soft);line-height:1.55")}>{d.intro}</p>

        {generating ? (
          <div style={{ animation: "cocoonFade .3s ease" }}>
            <div style={css("display:flex;align-items:center;gap:0.55rem;margin-bottom:1.1rem")}><span className="pt-skel-dot" /><span style={css("font-size:var(--text-md);color:var(--fg);font-weight:500")}>{s.genLabel}</span></div>
            <div style={css("display:flex;flex-direction:column;gap:0.7rem")}>
              <div className="pt-skel-bar" style={css("height:1.3rem;width:58%;border-radius:6px")} />
              <div className="pt-skel-bar" style={{ ...css("height:4.6rem;border-radius:10px"), animationDelay: ".15s" }} />
              <div className="pt-skel-bar" style={{ ...css("height:2.6rem;width:84%;border-radius:10px"), animationDelay: ".3s" }} />
            </div>
          </div>
        ) : (
          <>
            <DelivBody id={dId} get={get} />
            {s.notes[dId] && <div style={css("margin-top:1rem;padding:0.8rem 1rem;border-radius:10px;background:var(--warn-soft);font-size:0.78rem;color:var(--fg);line-height:1.5")}><span style={css("font-weight:500")}>Change requested:</span> {s.notes[dId]}</div>}
          </>
        )}
      </div>
    </div>
  );
}

// ── sticky action bar ────────────────────────────────────────────────────────
function ActionBar({ cur, s, dispatch }: { cur: FlowStep; s: FState; dispatch: (a: Act) => void }) {
  const wrap = "flex-shrink:0;border-top:1px solid var(--border-soft);background:var(--surface);padding:0.8rem 1.3rem;display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);min-height:4rem";
  const ghost = "min-height:2.4rem;padding:0 1.1rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-pill);font-size:0.85rem;font-weight:500;color:var(--fg-muted);font-family:inherit;cursor:pointer";
  const primary = "display:inline-flex;align-items:center;gap:0.4rem;min-height:2.4rem;padding:0 1.4rem;border:none;border-radius:var(--radius-pill);background:" + GRAD + ";color:#fff;font-size:0.9rem;font-weight:500;cursor:pointer";

  // The bottom bar is only for the approval screens (gates + deliverables).
  // Welcome/questions handle their own actions inline, below the form.
  if (cur.kind === "welcome" || cur.kind === "section") return null;
  if (cur.kind === "gate") {
    const signed = s.confirmed[cur.sIdx];
    return (
      <div style={css(wrap)}>
        <span style={css("font-size:0.8rem;color:var(--fg-muted);font-weight:500;min-width:0")}>{signed ? "Locked in — moving on." : "Review the brief, then sign off."}</span>
        <div style={css("display:flex;gap:0.6rem;flex-shrink:0")}>
          <button type="button" onClick={() => dispatch({ t: "go", i: s.idx - 1 })} style={css(ghost)}>Edit answers</button>
          <button type="button" onClick={() => dispatch({ t: "confirmGate", s: cur.sIdx })} style={css(primary)}>{signed ? "Continue" : "Sign off & continue"}</button>
        </div>
      </div>
    );
  }
  // deliv
  const d = DELIVS.find(x => x.id === cur.dId)!;
  if (s.genActive && !s.genDone[cur.dId]) return <div style={css(wrap)}><span style={css("font-size:0.8rem;color:var(--fg-muted)")}>Generating…</span></div>;
  if (d.terminal) {
    return (
      <div style={css(wrap)}>
        <span style={css("font-size:var(--text-base);color:var(--success);font-weight:500")}>✓ Everything approved — your funnel is ready to build</span>
        <div style={css("display:flex;gap:0.6rem;flex-shrink:0")}>
          <button type="button" onClick={() => dispatch({ t: "restart" })} style={css(ghost)}>Start over</button>
        </div>
      </div>
    );
  }
  if (s.requesting) {
    return (
      <div style={css(wrap)}>
        <input value={s.draftNote} onChange={e => dispatch({ t: "draft", v: e.target.value })} placeholder="What would you like changed?" style={css("flex:1;padding:0.55rem 0.8rem;border:1px solid var(--border);border-radius:var(--radius);font-size:0.85rem;font-family:inherit;color:var(--fg);background:color-mix(in srgb,var(--surface) 94%,white 6%);outline:none")} />
        <div style={css("display:flex;gap:var(--space-2);flex-shrink:0")}>
          <button type="button" onClick={() => dispatch({ t: "cancelReq" })} style={css(ghost)}>Cancel</button>
          <button type="button" onClick={() => dispatch({ t: "sendNote", id: cur.dId })} style={css("min-height:2.4rem;padding:0 1.1rem;background:var(--accent-soft);border:1px solid var(--accent);border-radius:var(--radius-pill);font-size:0.85rem;font-weight:500;color:var(--accent);font-family:inherit;cursor:pointer")}>Send</button>
        </div>
      </div>
    );
  }
  const signed = s.signed[cur.dId];
  return (
    <div style={css(wrap)}>
      <span style={css("font-size:0.8rem;color:" + (signed ? "var(--success)" : "var(--fg-muted)") + ";font-weight:500;min-width:0")}>{signed ? "✓ Signed off" : "Review, then sign off to unlock the next piece."}</span>
      <div style={css("display:flex;gap:0.6rem;flex-shrink:0")}>
        <button type="button" onClick={() => dispatch({ t: "reqChanges", note: s.notes[cur.dId] || "" })} style={css(ghost)}>Request changes</button>
        <button type="button" onClick={() => dispatch({ t: "sign", id: cur.dId })} style={css(primary)}>{signed ? "Continue" : "Sign off & continue"}</button>
      </div>
    </div>
  );
}
