"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { coercePersistedAuditDrafts, type GuidedAuditSession, type PersistedAuditDraft, type PersistedAuditRun, type PersistedAuditState } from "@/lib/portalAuditPersistence";
import { css } from "../helpers";
import { printReportNode } from "../printReport";
import { Icon } from "../icons";
import type { PortalActions, PortalState } from "../store";
import { clientsVisibleToRole, STUDIO_CLIENTS, type StudioClient } from "../clients";
import { GuidedIntakeSelector } from "../components/GuidedIntakeSelector";
import { EngineIndexControls } from "../components/EngineIndexControls";
import { clientsForEngineWork, latestEngineWork, startClientForEngine } from "../engineLifecycle";
import { AuditTypeWorkspace } from "./AuditTypeWorkspace";
import { AuditReportView } from "../views/AuditReportView";
import { DiscoveryBuilder } from "../discovery/DiscoveryBuilder";
import { fromClientMemory, getKnowledge, loadPersistedKnowledge, recordKnowledge, rememberKnowledge, mergeKnow, type Know } from "../discovery/knowledge";
import { AuditBuilderHandoff } from "./AuditBuilderHandoff";
import { portalApprovalOutput } from "@/lib/portalApprovalOutput";
import { AUDIT_WIZARD, AUDIT_STAGES, AUDIT_INTRO_STEPS, AUDIT_DEMO } from "../discovery/discoveryData";
import { AUDIT_PIPELINE, auditScoreToDocs } from "../discovery/auditPipeline";
import type { CatBar } from "../components/AuditCharts";
import { AuditCardScoreSkeleton } from "../components/AuditCardScoreSkeleton";
import { StartOverDialog } from "../components/StartOverDialog";
import { AUDIT_CHECKLIST, isAuditScoreResult } from "@/lib/auditChecklist";
import type { GeneratedStageResult } from "@/lib/aiStageGeneration";
type Ans = Record<string, string | string[]>;

type AuditRun = PersistedAuditRun;

interface AuditState {
  clientId: string | null;
  buildId: string | null;
}

type Act =
  | { t: "select"; clientId: string; buildId: string }
  | { t: "load"; state: AuditState }
  | { t: "toPicker" };

const init: AuditState = { clientId: null, buildId: null };

function reducer(s: AuditState, a: Act): AuditState {
  switch (a.t) {
    case "select": return { clientId: a.clientId, buildId: a.buildId };
    case "load": return a.state;
    case "toPicker": return init;
  }
}

function hydrateAuditState(state: PersistedAuditState): AuditState {
  return {
    clientId: state.clientId,
    buildId: state.buildId,
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

function latestCompletedRun(runs: AuditRun[]) {
  return runs
    .filter(run => run.progress >= 100)
    .sort((left, right) => auditRunDate(right).localeCompare(auditRunDate(left)))[0] || null;
}

async function fetchAuditDrafts(clientId?: string) {
  const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
  const response = await fetch(`/api/portal-audit-runs${query}`, { cache: "no-store" });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load audit drafts.");
  }

  return coercePersistedAuditDrafts(payload?.drafts);
}

function seedAuditRuns(): AuditRun[] {
  return STUDIO_CLIENTS.map(client => {
    const complete = client.audit.progress >= 100;
    return {
      ...client.audit,
      clientId: client.id,
      clientName: client.name,
      owner: client.owner,
      runLabel: complete ? "Baseline audit" : client.audit.progress > 0 ? "Audit in progress" : "Not started",
      runType: "baseline",
      sequence: 1,
      score: undefined,
      targetScore: undefined,
      completedAt: complete ? client.audit.due : undefined,
      updatedAt: client.audit.due,
    };
  });
}

export function Audits({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [s, dispatch] = useReducer(reducer, init);
  const [drafts, setDrafts] = useState<PersistedAuditDraft[]>([]);
  const draftsRef = useRef<PersistedAuditDraft[]>([]);
  const allDraftsCacheRef = useRef<PersistedAuditDraft[] | null>(null);
  const draftsScopeRef = useRef<"all" | string>("all");
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [exitingToPicker, setExitingToPicker] = useState(false);
  const [reportClientId, setReportClientId] = useState<string | null>(null);
  const [reportRunId, setReportRunId] = useState<string | null>(null);
  const [reportProposalOpen, setReportProposalOpen] = useState(false);
  const [proposalIffOn, setProposalIffOn] = useState(false);
  const [resetAuditClientId, setResetAuditClientId] = useState<string | null>(null);
  const [resettingAudit, setResettingAudit] = useState(false);
  const [resetAuditError, setResetAuditError] = useState<string | null>(null);
  const [quickKnow, setQuickKnow] = useState<Know>({ data: {}, sources: {} });
  useEffect(() => { setQuickKnow(s.clientId ? loadPersistedKnowledge(s.clientId) : { data: {}, sources: {} }); }, [s.clientId]);
  const allClients = useMemo(() => clientsVisibleToRole(state.role, state.clientName), [state.clientName, state.role]);
  const workingClients = useMemo(() => clientsForEngineWork(state.role, allClients), [allClients, state.role]);
  const assignedClientIds = useMemo(() => new Set(allClients.map(item => item.id)), [allClients]);
  const knownClientIds = useMemo(() => new Set(workingClients.map(item => item.id)), [workingClients]);
  const currentDrafts = useMemo(() => drafts.filter(draft => knownClientIds.has(draft.run.clientId)), [drafts, knownClientIds]);
  draftsRef.current = drafts;
  const runs = useMemo(() => mergeAuditRuns(seedAuditRuns(), currentDrafts).filter(item => knownClientIds.has(item.clientId)), [currentDrafts, knownClientIds]);
  const draftsByRunId = useMemo(() => new Map(currentDrafts.map(draft => [draft.run.id, draft])), [currentDrafts]);
  const initiatedRuns = useMemo(() => runs.filter(item => item.progress > 0 || draftsByRunId.has(item.id)), [draftsByRunId, runs]);
  const client = workingClients.find(c => c.id === s.clientId) || null;
  const reportClient = workingClients.find(c => c.id === reportClientId) || null;
  const reportRun = reportRunId ? runs.find(item => item.id === reportRunId) || null : null;
  const reportDraft = reportRunId ? draftsByRunId.get(reportRunId) || null : null;
  const run = runs.find(item => item.id === s.buildId) || null;
  const completedCount = useMemo(() => new Set(initiatedRuns.filter(item => assignedClientIds.has(item.clientId) && item.progress >= 100).map(item => item.clientId)).size, [assignedClientIds, initiatedRuns]);
  const inProgressCount = useMemo(() => new Set(initiatedRuns.filter(item => assignedClientIds.has(item.clientId) && item.progress < 100).map(item => item.clientId)).size, [assignedClientIds, initiatedRuns]);
  const auditGroups = useMemo(
    () => allClients.map(client => {
      const clientRuns = initiatedRuns
        .filter(item => item.clientId === client.id)
        .sort((left, right) => {
          const rankDelta = auditRunRank(right) - auditRunRank(left);
          if (rankDelta !== 0) return rankDelta;
          return auditRunDate(right).localeCompare(auditRunDate(left));
        });
      return { client, runs: clientRuns };
    }).filter(group => group.runs.length > 0),
    [allClients, initiatedRuns],
  );
  const runsByClient = useMemo(
    () => initiatedRuns.reduce<Record<string, number>>((acc, item) => {
      acc[item.clientId] = (acc[item.clientId] || 0) + 1;
      return acc;
    }, {}),
    [initiatedRuns],
  );
  const mobile = state.isMobile;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredFromUrl = useRef(false);

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
        const params = new URLSearchParams(window.location.search);
        const requestedClientId = params.get("auditReport") || undefined;
        const nextDrafts = await fetchAuditDrafts(requestedClientId);

        if (!cancelled) {
          draftsScopeRef.current = requestedClientId || "all";
          setDrafts(nextDrafts);
          if (!requestedClientId) allDraftsCacheRef.current = nextDrafts;
        }

        if (requestedClientId) {
          void fetchAuditDrafts().then(allDrafts => {
            allDraftsCacheRef.current = allDrafts;
          }).catch(error => {
            console.error("Unable to warm the audit index.", error);
          });
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

    if (auditReportClientId && workingClients.some(item => item.id === auditReportClientId)) {
      setReportClientId(auditReportClientId);
      const requestedRun = runs.find(item => item.id === auditReportRunId && item.clientId === auditReportClientId && item.progress >= 100);
      const latestRun = latestCompletedRun(runs.filter(item => item.clientId === auditReportClientId));
      setReportRunId(requestedRun?.id || latestRun?.id || null);
      const source = workingClients.find(item => item.id === auditReportClientId);
      if (source) setProposalIffOn(actions.workspaceForClient(source.name).proposal?.iffOn ?? false);
      setReportProposalOpen(params.get("proposal") === "1");
      return;
    }

    if (auditReportRunId) {
      const requestedRun = runs.find(item => item.id === auditReportRunId && item.progress >= 100);
      if (requestedRun) {
        setReportClientId(requestedRun.clientId);
        setReportRunId(requestedRun.id);
        const source = workingClients.find(item => item.id === requestedRun.clientId);
        if (source) setProposalIffOn(actions.workspaceForClient(source.name).proposal?.iffOn ?? false);
        updateAuditUrl({ auditReportClientId: requestedRun.clientId, auditReportRunId: requestedRun.id, proposal: params.get("proposal") === "1" });
        setReportProposalOpen(params.get("proposal") === "1");
        return;
      }
    }

    if (!auditRunId) {
      if (state.role === "client") {
        const ownClient = allClients[0];
        const ownRun = ownClient
          ? runs.filter(item => item.clientId === ownClient.id).sort((left, right) => auditRunDate(right).localeCompare(auditRunDate(left)))[0]
          : null;
        if (ownRun) {
          const ownDraft = draftsByRunId.get(ownRun.id);
          if (ownDraft) dispatch({ t: "load", state: hydrateAuditState(ownDraft.state) });
          else dispatch({ t: "select", clientId: ownRun.clientId, buildId: ownRun.id });
        }
      }
      return;
    }

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
  }, [allClients, draftsByRunId, draftsLoaded, runs, state.role, workingClients]);

  useEffect(() => {
    if (state.role !== "client" || !draftsLoaded || s.clientId || reportClientId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("auditRun") || params.has("auditReport") || params.has("auditReportRun")) return;
    const ownClient = allClients[0];
    const ownRun = ownClient
      ? runs.filter(item => item.clientId === ownClient.id).sort((left, right) => auditRunDate(right).localeCompare(auditRunDate(left)))[0]
      : null;
    if (!ownRun) return;
    const ownDraft = draftsByRunId.get(ownRun.id);
    if (ownDraft) dispatch({ t: "load", state: hydrateAuditState(ownDraft.state) });
    else dispatch({ t: "select", clientId: ownRun.clientId, buildId: ownRun.id });
  }, [allClients, draftsByRunId, draftsLoaded, reportClientId, runs, s.clientId, state.role]);

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
    const source = workingClients.find(item => item.id === clientId);
    setReportProposalOpen(false);
    setReportClientId(clientId);
    if (source) setProposalIffOn(actions.workspaceForClient(source.name).proposal?.iffOn ?? false);
    setReportRunId(completedRun?.id || null);
    updateAuditUrl({ auditReportClientId: clientId, auditReportRunId: completedRun?.id || null, proposal: false });
  };
  const createAudit = (clientId: string) => {
    const source = workingClients.find(item => item.id === clientId);
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
  const startOrResumeAudit = () => {
    const target = startClientForEngine(state.role, allClients);
    if (!target) return;
    const existing = latestEngineWork(initiatedRuns.filter(item => item.clientId === target.id));
    if (existing) startAudit(target.id, existing.id);
    else createAudit(target.id);
  };
  const requestStartOver = (clientId: string) => {
    setResetAuditError(null);
    setResetAuditClientId(clientId);
  };
  const confirmStartOver = async () => {
    if (!resetAuditClientId || resettingAudit) return;
    const auditRuns = currentDrafts.filter(draft => draft.run.clientId === resetAuditClientId);
    const runIds = auditRuns.map(draft => draft.run.id);
    setResettingAudit(true);
    setResetAuditError(null);
    try {
      if (runIds.length) {
        const response = await fetch("/api/portal-audit-runs", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ runIds }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to delete the saved audit.");
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      runIds.forEach(runId => window.localStorage.removeItem(`guided-audit:${runId}`));
      window.localStorage.removeItem(`baltazar:builder-handoff:website:${resetAuditClientId}`);
      setDrafts(current => current.filter(draft => draft.run.clientId !== resetAuditClientId));
      if (s.clientId === resetAuditClientId) dispatch({ t: "toPicker" });
      if (reportClientId === resetAuditClientId) {
        setReportClientId(null);
        setReportRunId(null);
        setReportProposalOpen(false);
      }
      updateAuditUrl({ auditRunId: null, auditReportClientId: null });
      const deletedClient = workingClients.find(item => item.id === resetAuditClientId);
      setResetAuditClientId(null);
      actions.showToast(`${deletedClient?.name || "Website"} audit deleted`);
    } catch (error) {
      setResetAuditError(error instanceof Error ? error.message : "Unable to delete the saved audit.");
    } finally {
      setResettingAudit(false);
    }
  };
  useEffect(() => {
    if (state.quickActionIntent !== "new_audit") return;
    startOrResumeAudit();
    actions.patch({ quickActionIntent: null });
  }, [actions, state.quickActionIntent]);
  const buildProposal = (clientId: string) => {
    const completedRun = latestCompletedRun(runs.filter(item => item.clientId === clientId));
    const source = workingClients.find(item => item.id === clientId);
    setReportClientId(clientId);
    if (source) setProposalIffOn(actions.workspaceForClient(source.name).proposal?.iffOn ?? false);
    setReportRunId(completedRun?.id || null);
    setReportProposalOpen(true);
    updateAuditUrl({ auditReportClientId: clientId, auditReportRunId: completedRun?.id || null, proposal: true });
  };
  function closeReportModal() {
    if (allDraftsCacheRef.current) {
      draftsScopeRef.current = "all";
      setDrafts(allDraftsCacheRef.current);
    } else if (draftsScopeRef.current !== "all") {
      setDraftsLoaded(false);
      void fetchAuditDrafts().then(allDrafts => {
        draftsScopeRef.current = "all";
        allDraftsCacheRef.current = allDrafts;
        setDrafts(allDrafts);
      }).catch(error => {
        console.error("Unable to load the audit index.", error);
      }).finally(() => setDraftsLoaded(true));
    }
    setReportClientId(null);
    setReportRunId(null);
    setReportProposalOpen(false);
    updateAuditUrl({ auditRunId: null, auditReportClientId: null });
  }
  const exitToPicker = () => {
    if (exitingToPicker) return;
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
    if (!isAuditScoreResult(aiResults.report)) {
      actions.showToast("The evidence-backed audit score is not ready. Regenerate the report before completing this audit.");
      return;
    }
    const scoreResult = aiResults.report;
    const docs = auditScoreToDocs(scoreResult, client.name);
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

  const reportRequested = state.hydrated && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("auditReport");

  if (!client && !draftsLoaded) {
    return (
      <div role="status" aria-label={reportRequested ? "Loading audit report" : "Loading audits"} style={css("min-height:60vh;display:grid;place-items:center;padding:2rem;color:var(--fg-muted);font-size:var(--text-sm)")}>
        {reportRequested ? "Loading audit report…" : "Loading audits…"}
      </div>
    );
  }

  if (!client && reportClient) {
    return (
      <div style={css("width:100%;padding:" + (mobile ? "1rem 0.75rem calc(6rem + env(safe-area-inset-bottom))" : "1.35rem 2rem 2.4rem"))}>
        <div style={css("width:min(68rem,100%);margin:0 auto") }>
          <div style={css("display:flex;align-items:center;gap:var(--space-3);margin-bottom:0.85rem") }>
            <button type="button" onClick={closeReportModal} className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.4rem;height:2.1rem;padding:0 0.8rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:0.76rem;font-weight:500;cursor:pointer") }><Icon name="chevleft" size={14} />All audits</button>
            <div style={css("min-width:0;font-size:0.92rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{reportProposalOpen ? "Build proposal" : "Audit report"} · {reportClient.name}</div>
          </div>
          <article style={css("border:1px solid var(--border-soft);border-radius:1.1rem;background:var(--surface);overflow:clip") }>
            {reportDraft?.state.report ? (
              <div data-audit-report-root style={css("padding:" + (mobile ? "1rem" : "1.4rem"))}>
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
                  onDownload: async () => {
                    actions.showToast("Opening the print dialog…");
                    const ok = await printReportNode(document.querySelector("[data-audit-report-root]"), `${reportClient.name} · ${reportProposalOpen ? "Action plan" : "Audit report"}`);
                    actions.showToast(ok ? "Choose Print or Save as PDF" : "The print dialog could not be opened");
                  },
                  onShare: () => {
                    const approvalResults = reportDraft.state.guidedSession?.aiResults || (reportDraft.state.report ? { report: reportDraft.state.report } : {});
                    const output = portalApprovalOutput(approvalResults, "The final website audit and action plan are ready.");
                    actions.shareFinalOutput({ clientName: reportClient.name, title: "Website Audit · Final report", outputType: "audit", ...output });
                  },
                  onCopy: () => actions.showToast("Copied to clipboard"),
                })}
                <div style={{ marginTop: "1.2rem" }}><AuditBuilderHandoff type="website" clientName={reportClient.name} onContinue={() => { window.localStorage.setItem(`baltazar:builder-handoff:website:${reportClient.id}`, JSON.stringify({ source: "website-audit", report: reportDraft.state.report, answers: reportDraft.state.answers, savedAt: new Date().toISOString() })); window.localStorage.setItem("baltazar:builder-active:website", reportClient.id); actions.patch({ builderType: "website" }); actions.setView("funnels"); }} /></div>
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
    );
  }

  if (!client) {
    return (
      <div style={css("width:100%;padding:" + (mobile ? "1rem 0.75rem calc(6rem + env(safe-area-inset-bottom))" : "1.6rem 2rem 2.4rem"))}>
        <GuidedIntakeSelector
          eyebrow="Cocoon Consult"
          eyebrowColor="var(--cocoon)"
          title="Start or continue a website audit"
          description="Review the site. See what works, what does not, and what to fix first."
          controls={<EngineIndexControls
            metrics={[
              { label: `${completedCount} completed`, tone: "success" },
              { label: `${inProgressCount} still in intake`, tone: "warn" },
            ]}
            action={{ label: "Generate audit", onClick: startOrResumeAudit, color: "var(--cocoon)" }}
          />}
          controlsBelow
          countLabel="client"
          cards={auditGroups.map(group => {
            const completedRun = latestCompletedRun(group.runs);
            const activeRun = group.runs.find(item => item.progress < 100 && item.progress > 0) || group.runs.find(item => item.progress < 100) || null;
            const scoredRun = group.runs
              .filter(item => {
                const report = drafts.find(draft => draft.run.id === item.id)?.state.report;
                return isAuditScoreResult(report) && (typeof item.internalScore === "number" || typeof item.score === "number");
              })
              .sort((left, right) => auditRunDate(right).localeCompare(auditRunDate(left)))[0] || null;
            const displayRun = activeRun || completedRun || group.runs[0];
            const latestComplete = !!completedRun && !activeRun;
            const hasScore = !!scoredRun;
            const heroOverall = scoredRun?.internalScore ?? scoredRun?.score ?? 0;
            const heroProjected = scoredRun
              ? Math.min(100, Math.max(scoredRun.targetScore ?? heroOverall, heroOverall))
              : 0;
            const heroLabel = heroOverall < 50 ? "Needs attention" : heroOverall < 65 ? "Fair foundation" : heroOverall < 80 ? "Solid footing" : "Strong foundation";
            const heroSummary = { overall: heroOverall, projected: heroProjected, uplift: heroProjected - heroOverall, label: heroLabel, cats: [] };
            const scoredReport = scoredRun
              ? drafts.find(draft => draft.run.id === scoredRun.id)?.state.report
              : undefined;
            const heroCats: CatBar[] = AUDIT_CHECKLIST.map(checklistCategory => {
              const scoredCategory = isAuditScoreResult(scoredReport)
                ? scoredReport.categories.find(category => category.key === checklistCategory.key)
                : undefined;
              const score = scoredCategory?.score ?? 0;
              return {
                label: checklistCategory.label,
                score,
                target: scoredCategory?.target,
                color: score < 50 ? "var(--danger)" : score < 65 ? "var(--warn)" : "var(--success)",
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
              hero: <AuditCardScoreSkeleton summary={heroSummary} scored={hasScore} cats={heroCats} />,
              headerAction: latestComplete ? {
                label: "Build proposal for " + group.client.name,
                shortLabel: "Proposal",
                icon: "checklist",
                onClick: () => buildProposal(group.client.id),
              } : undefined,
              primaryLabel: latestComplete ? "View report" : "Open audit",
              onPrimary: () => (latestComplete && completedRun ? previewAudit(group.client.id, completedRun.id) : startAudit(group.client.id, displayRun.id)),
              secondaryLabel: "Start over",
              secondaryIcon: "replay",
              onSecondary: () => requestStartOver(group.client.id),
            };
          })}
        />
        <StartOverDialog
          open={!!resetAuditClientId}
          auditLabel="Website audit"
          subject={workingClients.find(item => item.id === resetAuditClientId)?.name || "this website"}
          detail="intake, reports, scores, and action plans"
          busy={resettingAudit}
          error={resetAuditError}
          onCancel={() => { if (!resettingAudit) setResetAuditClientId(null); }}
          onConfirm={confirmStartOver}
        />
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
        intro={{ eyebrow: "Website Audit", heading: "Review the site, step by step." }}
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
        onStartOverRequest={() => requestStartOver(client.id)}
        onIngest={delta => {
          rememberKnowledge(client.id, delta);
          setQuickKnow(k => mergeKnow(k, delta));
        }}
        startLabel="Start audit intake →"
        backLabel={state.role === "client" ? "← Back to dashboard" : "← All audits"}
        hideHeader={state.role === "client"}
        progressLabel="intake"
        demo={AUDIT_DEMO}
        completeTitle="Intake ready"
        completeMsg="Next, score the site and build the action plan."
        completeCta="Build the report →"
        stageExtra={stageKey => stageKey === "plan" ? (
          <div style={{ marginTop: "1.2rem", textAlign: "left" }}>
            <AuditBuilderHandoff type="website" clientName={client.name} onContinue={() => { window.localStorage.setItem(`baltazar:builder-handoff:website:${client.id}`, JSON.stringify({ source: "website-audit", savedAt: new Date().toISOString() })); window.localStorage.setItem("baltazar:builder-active:website", client.id); actions.patch({ builderType: "website" }); actions.setView("funnels"); }} />
          </div>
        ) : null}
        pipeline={AUDIT_PIPELINE}
        onPipelineComplete={(data, aiResults) => completeGuidedAudit(data, aiResults).catch(error => actions.showToast(error instanceof Error ? error.message : "Unable to save the completed audit"))}
        onShareFinal={(_data, aiResults) => {
          const output = portalApprovalOutput(aiResults, "The final website audit and action plan are ready.");
          actions.shareFinalOutput({ clientName: client.name, title: "Website Audit · Final report", outputType: "audit", ...output });
        }}
        showToast={actions.showToast}
        onExit={() => state.role === "client" ? actions.setView("progress") : exitToPicker()}
        onComplete={data => { recordKnowledge(client.id, data, "Audit intake"); if (state.role === "client") actions.setView("progress"); else exitToPicker(); }}
      />
      <StartOverDialog
        open={!!resetAuditClientId}
        auditLabel="Website audit"
        subject={client.name}
        detail="intake, reports, scores, and action plans"
        busy={resettingAudit}
        error={resetAuditError}
        onCancel={() => { if (!resettingAudit) setResetAuditClientId(null); }}
        onConfirm={confirmStartOver}
      />
    </div>
  );
}
