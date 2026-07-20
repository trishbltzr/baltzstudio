"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PORTAL_APPROVALS,
  PORTAL_WORKSPACE_DATA_VERSION,
  mergePortalApprovals,
  mergePortalClientWorkspace,
  normalizePersistedPortalWorkspaceState,
  portalClientId,
  type PortalApprovalRecord,
  type PortalClientNoteRecord,
  type PortalClientWorkspace,
  type PortalCollaboratorRecord,
  type PortalProposalRecord,
  type PortalWorkspaceFile,
} from "@/lib/portalWorkspacePersistence";
import type { AuditType, BuilderType, ClientProject, Escalation, JourneyGate, JourneyRequestSeverity, Priority, Role, Service, Task, TaskFilter, TaskImportDraft, TaskStatus, Thread, View } from "./types";
import type { ProgressChatMessage, ProgressChatSession } from "./types";
import { seedEscalations, seedJourneyGates, seedTasks, seedThreads } from "./data";
import { STATUS_ORDER } from "./helpers";
import { progressChatTranscript, summarizeProgressChatTitle } from "./progressChat";
import { buildProgressChatContext } from "./progressChatContext";
import { clientsVisibleToRole, DEFAULT_CLIENT_NAME, DEV_USER_NAME } from "./clients";
import { BASE_ROLE_VIEWS, canAccessPortalView } from "./access";

export type TaskView = "board" | "calendar";
export const NEW_TASK_DRAFT_ID = "__new_task_draft__";
export type QuickActionIntent = "new_client" | "invite_user" | "new_message" | "new_audit";
export type TeamInvite = { id: string; name: string; email: string; access: string };
export type SavedView<F> = { name: string; filter: F };
type PersistedPortalState = Pick<PortalState, "tasks" | "journeyGates" | "threads" | "escalations" | "ticketSeq" | "clientWorkspaces" | "progressChatSessions" | "activeProgressChatId" | "projectOverrides"> & { dataVersion: string };

export type JourneyRequestPayload = {
  existingThreadId?: string;
  title: string;
  clientName: string;
  note: string;
  tags: string[];
  severity: JourneyRequestSeverity;
};

export type GuidedTopBarInfo = {
  primary: string;
  secondary: string;
  savedLabel: string;
  dotBackground: string;
};

export interface PortalState {
  role: Role;
  clientName: string;
  canSwitchRoles: boolean;
  hydrated: boolean;
  view: View;
  previewFrom: Role | null;
  clientDetail: string | null;
  isMobile: boolean;
  navOpen: boolean;
  notifOpen: boolean;
  pop: string | null;
  sidePop: "workspace" | "account" | null;
  sidebarCollapsed: boolean;
  guidedSidebarActive: boolean;
  guidedSidebarExitTick: number;
  guidedTopBarInfo: GuidedTopBarInfo | null;
  toast: { message: string; onClick?: () => void } | null;
  auditType: AuditType;
  builderType: BuilderType;
  projectOverrides: Record<string, Partial<ClientProject>>;
  // tasks
  tasks: Task[];
  taskModal: string | null;
  taskDraft: Task | null;
  taskView: TaskView;
  draggingId: string | null;
  dragOverCol: TaskStatus | null;
  boardSelect: boolean;
  selTasks: string[];
  taskChecks: Record<string, Record<number, boolean>>;
  taskComments: Record<string, { who: string; text: string; time: string; me: boolean }[]>;
  taskCommentDraft: string;
  taskFilter: TaskFilter;
  clientFilter: { service: string; health: string };
  savedViews: { clients: SavedView<{ service: string; health: string }>[]; tasks: SavedView<TaskFilter>[] };
  // calendar
  calY: number;
  calM: number;
  calSel: string;
  journeyGates: JourneyGate[];
  // milestone funnel view
  funExpanded: string | null;
  subModal: string | null;
  playbookDoc: string | null;
  // inbox
  threads: Thread[];
  selectedThreadId: string;
  draft: string;
  inboxSearch: string;
  inboxFilter: string;
  statusMenuOpen: boolean;
  assignMenuOpen: boolean;
  // escalations
  escalations: Escalation[];
  // palette
  paletteOpen: boolean;
  paletteQuery: string;
  // client detail brand tab
  fileBrand: string;
  chatDraft: string;
  progressChatSessions: ProgressChatSession[];
  activeProgressChatId: string | null;
  progressChatHistoryOpen: boolean;
  ticketSeq: number;
  clientWorkspaces: Record<string, PortalClientWorkspace>;
  invoiceClientName: string | null;
  quickActionIntent: QuickActionIntent | null;
  teamInvites: TeamInvite[];
}

function loadSavedViews(): PortalState["savedViews"] {
  try {
    const v = JSON.parse(localStorage.getItem("baltz.clientSlate.v2.savedViews") || "null");
    if (v && typeof v === "object") return { clients: v.clients || [], tasks: v.tasks || [] };
  } catch { /* ignore */ }
  return { clients: [], tasks: [] };
}

function loadPersistedPortalState(): Partial<PersistedPortalState> {
  try {
    const value = JSON.parse(localStorage.getItem("baltz.clientSlate.v2.portalState") || "null");
    const normalized = normalizePersistedPortalWorkspaceState(value);
    if (normalized) return normalized as Partial<PersistedPortalState>;
  } catch { /* ignore */ }
  return {};
}

function normalizeRequestedView(requestedView: string | null, role: Role): View | null {
  const aliasedView = requestedView === "notifications"
    ? "activity"
    : requestedView === "escalations"
      ? "inbox"
    : requestedView === "audits"
      ? (role === "client" ? "audit" : "audits_new")
      : requestedView;

  return aliasedView && BASE_ROLE_VIEWS[role].has(aliasedView as View) ? aliasedView as View : null;
}

function initialRequestedView(role: Role): View | null {
  if (typeof window === "undefined") return null;
  return normalizeRequestedView(new URLSearchParams(window.location.search).get("view"), role);
}

function syncPortalViewUrl(view: View) {
  if (typeof window === "undefined") return;

  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("view", view === "audits_new" ? "audits" : view);
  if (view !== "audits_new" && view !== "audit") nextParams.delete("auditType");
  if (view !== "funnels") nextParams.delete("builderType");

  if (view !== "audits_new") {
    nextParams.delete("auditRun");
    nextParams.delete("auditReport");
    nextParams.delete("proposal");
  }

  const nextQuery = nextParams.toString();
  const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

function persistPortalState(state: PortalState) {
  try {
    const snapshot: PersistedPortalState = {
      dataVersion: PORTAL_WORKSPACE_DATA_VERSION,
      tasks: state.tasks,
      journeyGates: state.journeyGates,
      threads: state.threads,
      escalations: state.escalations,
      ticketSeq: state.ticketSeq,
      clientWorkspaces: state.clientWorkspaces,
      progressChatSessions: state.progressChatSessions,
      activeProgressChatId: state.activeProgressChatId,
      projectOverrides: state.projectOverrides,
    };
    localStorage.setItem("baltz.clientSlate.v2.portalState", JSON.stringify(snapshot));
  } catch { /* ignore */ }
}

function withClientWorkspace(
  state: PortalState,
  clientId: string,
  updater: (workspace: PortalClientWorkspace) => PortalClientWorkspace,
) {
  return {
    ...state.clientWorkspaces,
    [clientId]: updater(mergePortalClientWorkspace(clientId, state.clientWorkspaces[clientId])),
  };
}

export function initialState(role: Role, requestedView?: View | null, clientName = DEFAULT_CLIENT_NAME, canSwitchRoles = false): PortalState {
  return {
    role, clientName, canSwitchRoles, hydrated: false, view: requestedView ?? "progress", previewFrom: null, clientDetail: null,
    isMobile: false, navOpen: false, notifOpen: false, pop: null, sidePop: null, sidebarCollapsed: false, guidedSidebarActive: false, guidedSidebarExitTick: 0, guidedTopBarInfo: null, toast: null, auditType: "website", builderType: "funnel", projectOverrides: {},
    tasks: seedTasks(), taskModal: null, taskDraft: null, taskView: "board", draggingId: null, dragOverCol: null,
    boardSelect: false, selTasks: [], taskChecks: {}, taskComments: {}, taskCommentDraft: "",
    taskFilter: { owner: "all", priority: "all" }, clientFilter: { service: "all", health: "all" },
    savedViews: { clients: [], tasks: [] },
    calY: 2026, calM: 6, calSel: "2026-6-2",
    journeyGates: seedJourneyGates(),
    funExpanded: null, subModal: null, playbookDoc: null,
    threads: seedThreads(), selectedThreadId: "", draft: "", inboxSearch: "", inboxFilter: "all", statusMenuOpen: false, assignMenuOpen: false,
    escalations: seedEscalations(),
    paletteOpen: false, paletteQuery: "",
    fileBrand: "all",
    chatDraft: "", progressChatSessions: [], activeProgressChatId: null, progressChatHistoryOpen: false, ticketSeq: 1042,
    clientWorkspaces: {}, invoiceClientName: null,
    quickActionIntent: null, teamInvites: [],
  };
}

export interface PortalActions {
  patch: (p: Partial<PortalState>) => void;
  update: (fn: (s: PortalState) => Partial<PortalState>) => void;
  showToast: (m: string, onClick?: () => void) => void;
  setRole: (r: Role) => void;
  setView: (v: View) => void;
  openClientDetail: (name: string) => void;
  backToClients: () => void;
  blockerOf: (id: string) => Task | null;
  advanceTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  assignTask: (id: string, assignee: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  bulkImportTasks: (drafts: TaskImportDraft[]) => void;
  toggleCheck: (taskId: string, idx: number) => void;
  addTaskComment: (taskId: string, who: string) => void;
  addTaskCommentText: (taskId: string, who: string, text: string) => void;
  dragStart: (id: string) => void;
  dragEnd: () => void;
  dropOn: (status: TaskStatus) => void;
  toggleBoardSelect: () => void;
  toggleSelTask: (id: string) => void;
  clearSel: () => void;
  bulkAdvance: () => void;
  bulkDone: () => void;
  setTaskFilter: (k: keyof TaskFilter, v: string) => void;
  setClientFilter: (k: "service" | "health", v: string) => void;
  saveView: (scope: "clients" | "tasks", name: string, filter: unknown) => void;
  removeView: (scope: "clients" | "tasks", idx: number) => void;
  togglePop: (id: string) => void;
  closePop: () => void;
  createQuickTask: () => void;
  saveTaskDraft: () => void;
  cancelTaskDraft: () => void;
  setTaskView: (v: TaskView) => void;
  calNav: (d: number) => void;
  sendMsg: () => void;
  insertCanned: (text: string) => void;
  selectThread: (id: string) => void;
  resolveEscalation: (id: string) => void;
  previewAsClient: () => void;
  exitPreview: () => void;
  createThreadTicket: (threadId: string) => void;
  createThreadTask: (threadId: string) => void;
  createProgressChatSession: () => void;
  selectProgressChatSession: (id: string) => void;
  deleteProgressChatSession: (id: string) => void;
  clearProgressChatHistory: () => void;
  sendProgressChatMessage: (text: string) => void;
  sendProgressChatAsTicket: () => void;
  createJourneyRequest: (payload: JourneyRequestPayload) => { ticketId: string; threadId: string; assignee: string };
  sendApproval: (approvalId: string) => void;
  shareFinalOutput: (payload: { clientName: string; title: string; outputType: "audit" | "builder"; summary: string; sections: PortalApprovalRecord["sections"] }) => void;
  sendProposal: (clientName: string, proposal: { iffOn: boolean }) => void;
  inviteCollaborator: (clientName: string, collaborator: { name: string; email: string; access: string }) => void;
  addClientNote: (clientName: string, text: string) => void;
  deleteClientNote: (clientName: string, noteId: string) => void;
  uploadPortalFiles: (payload: { clientName: string; folder: string; files: FileList | File[]; threadId?: string }) => Promise<void>;
  openThreadClientDetail: (threadId: string) => void;
  escalateDecision: (payload: { clientName: string; title: string; reason: string; by: string }) => void;
  workspaceForClient: (clientName: string) => PortalClientWorkspace;
}

export function usePortal(seedRole: Role, clientName = DEFAULT_CLIENT_NAME, canSwitchRoles = false) {
  const [state, setState] = useState<PortalState>(() => initialState(seedRole, initialRequestedView(seedRole), clientName, canSwitchRoles));
  const [hasHydrated, setHasHydrated] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // hydrate saved views + responsive flag on mount (client-only)
  useEffect(() => {
    setState(s => {
      const persisted = loadPersistedPortalState();
      const params = new URLSearchParams(window.location.search);
      const requestedView = params.get("view");
      const requestedAuditType = params.get("auditType");
      const requestedBuilderType = params.get("builderType");
      const view = normalizeRequestedView(requestedView, s.role) ?? s.view;
      const auditType = requestedAuditType === "brand" || requestedAuditType === "website" || requestedAuditType === "seo" ? requestedAuditType : s.auditType;
      const builderType = requestedBuilderType === "website" || requestedBuilderType === "funnel" || requestedBuilderType === "social" ? requestedBuilderType : s.builderType;
      return { ...s, ...persisted, savedViews: loadSavedViews(), isMobile: window.innerWidth < 900, view, auditType, builderType, hydrated: true };
    });
    setHasHydrated(true);
    const onResize = () => setState(s => (s.isMobile !== window.innerWidth < 900 ? { ...s, isMobile: window.innerWidth < 900, navOpen: false } : s));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    const requestedView = new URLSearchParams(window.location.search).get("view");
    if (requestedView && normalizeRequestedView(requestedView, state.role) == null) {
      syncPortalViewUrl(state.view);
    }
  }, [hasHydrated, state.role, state.view]);

  useEffect(() => {
    if (!hasHydrated || canAccessPortalView(state, state.view)) return;
    const nextView: View = state.role === "client" ? "review" : "progress";
    syncPortalViewUrl(nextView);
    setState(current => ({ ...current, view: nextView }));
  }, [hasHydrated, state.clientName, state.projectOverrides, state.role, state.view]);

  useEffect(() => {
    if (!hasHydrated) return;
    persistPortalState(state);
  }, [hasHydrated, state.tasks, state.journeyGates, state.threads, state.escalations, state.ticketSeq, state.clientWorkspaces, state.progressChatSessions, state.activeProgressChatId, state.projectOverrides]);

  useEffect(() => {
    if (!hasHydrated) return;
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const response = await fetch("/api/portal-workspace-state", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load the portal workspace state.");
        const persisted = normalizePersistedPortalWorkspaceState(payload?.state);
        if (!cancelled) {
          setState(s => persisted ? ({
            ...s,
            tasks: persisted.tasks as Task[],
            journeyGates: persisted.journeyGates as JourneyGate[],
            threads: persisted.threads as Thread[],
            escalations: persisted.escalations as Escalation[],
            ticketSeq: persisted.ticketSeq,
            clientWorkspaces: persisted.clientWorkspaces,
            progressChatSessions: persisted.progressChatSessions as ProgressChatSession[],
            activeProgressChatId: persisted.activeProgressChatId,
            projectOverrides: persisted.projectOverrides,
          }) : ({
            ...s,
            tasks: seedTasks(),
            journeyGates: seedJourneyGates(),
            threads: seedThreads(),
            selectedThreadId: "",
            escalations: seedEscalations(),
            ticketSeq: 1,
            clientWorkspaces: {},
            progressChatSessions: [],
            activeProgressChatId: null,
            projectOverrides: {},
          }));
        }
      } catch (error) {
        console.error("Unable to load the portal workspace state.", error);
      } finally {
        if (!cancelled) setWorkspaceLoaded(true);
      }
    }

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !workspaceLoaded) return;
    const snapshot = {
      dataVersion: PORTAL_WORKSPACE_DATA_VERSION,
      tasks: state.tasks,
      journeyGates: state.journeyGates,
      threads: state.threads,
      escalations: state.escalations,
      ticketSeq: state.ticketSeq,
      clientWorkspaces: state.clientWorkspaces,
      progressChatSessions: state.progressChatSessions,
      activeProgressChatId: state.activeProgressChatId,
      projectOverrides: state.projectOverrides,
    };

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/portal-workspace-state", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ state: snapshot }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to save the portal workspace state.");
        }
      } catch (error) {
        console.error("Unable to save the portal workspace state.", error);
      }
    }, 350);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hasHydrated, workspaceLoaded, state.tasks, state.journeyGates, state.threads, state.escalations, state.ticketSeq, state.clientWorkspaces, state.progressChatSessions, state.activeProgressChatId, state.projectOverrides]);

  const patch = useCallback((p: Partial<PortalState>) => setState(s => ({ ...s, ...p })), []);
  const update = useCallback((fn: (s: PortalState) => Partial<PortalState>) => setState(s => ({ ...s, ...fn(s) })), []);

  const showToast = useCallback((m: string, onClick?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setState(s => ({ ...s, toast: { message: m, onClick }, notifOpen: false }));
    toastTimer.current = setTimeout(() => setState(s => ({ ...s, toast: null })), 2600);
  }, []);

  // ⌘K palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setState(s => ({ ...s, paletteOpen: !s.paletteOpen, paletteQuery: "" }));
      } else if (e.key === "Escape") {
        setState(s => (s.paletteOpen ? { ...s, paletteOpen: false } : s));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const actions: PortalActions = useMemo(() => {
    const blockerOf = (id: string, tasks: Task[]) => {
      const t = tasks.find(x => x.id === id);
      if (!t || !t.blockedBy) return null;
      const b = tasks.find(x => x.id === t.blockedBy);
      return b && b.status !== "done" ? b : null;
    };
    const persist = (v: PortalState["savedViews"]) => { try { localStorage.setItem("baltz.clientSlate.v2.savedViews", JSON.stringify(v)); } catch { /* ignore */ } };
    const actorName = (role: Role) => role === "client" ? stateRef.current.clientName : role === "dev" ? "Kier Mangibin" : "Trish Baltazar";
    const actorShort = (role: Role) => actorName(role).split(" ")[0];
    const displayDate = () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const workspaceForClient = (clientName: string, clientWorkspaces: Record<string, PortalClientWorkspace>) => {
      const clientId = portalClientId(clientName);
      return mergePortalClientWorkspace(clientId, clientWorkspaces[clientId]);
    };
    const nextThreadId = (prefix: string, value: number) => `${prefix}${value}`;
    const createClientMessage = (text: string, by: string) => ({ from: "studio" as const, text, time: "Now", by });
    const progressChatWorkspaceName = (role: Role) => role === "client" ? stateRef.current.clientName : role === "dev" ? "Delivery Workspace" : "Baltazar Studio";
    const newProgressChatSession = (): ProgressChatSession => {
      const now = new Date().toISOString();
      return { id: "pc-" + Date.now(), title: "New Snapshot chat", messages: [], createdAt: now, updatedAt: now, status: "draft" };
    };
    const activeProgressChat = (state: PortalState) => state.progressChatSessions.find(session => session.id === state.activeProgressChatId);
    const upsertStudioThread = (
      state: PortalState,
      payload: { clientName: string; text: string; category?: string; assignee?: string },
    ) => {
      const existing = state.threads.find(thread => thread.clientName === payload.clientName);
      if (existing) {
        return {
          threads: state.threads.map(thread => thread.id === existing.id ? {
            ...thread,
            category: payload.category || thread.category,
            assignee: payload.assignee || thread.assignee,
            messages: [...thread.messages, createClientMessage(payload.text, actorShort(state.role))],
          } : thread),
          threadId: existing.id,
          ticketSeq: state.ticketSeq,
        };
      }

      const threadId = nextThreadId("th", state.ticketSeq);
      const thread: Thread = {
        id: threadId,
        name: payload.clientName.replace(/\s*(&|and)\s*Co\.?$/i, ""),
        clientName: payload.clientName,
        unread: 0,
        status: "progress",
        assignee: payload.assignee || "Trish Baltazar",
        escalated: false,
        category: payload.category,
        tzLabel: "London",
        tzOff: 1,
        messages: [createClientMessage(payload.text, actorShort(state.role))],
      };
      return {
        threads: [thread, ...state.threads],
        threadId,
        ticketSeq: state.ticketSeq + 1,
      };
    };

    return {
      patch, update, showToast,
      setRole: r => {
        if (!stateRef.current.canSwitchRoles) return;
        syncPortalViewUrl("progress");
        setState(s => ({ ...s, role: r, view: "progress", previewFrom: null, navOpen: false, notifOpen: false, pop: null, playbookDoc: null }));
      },
      setView: v => {
        const requestedView = v === "escalations" ? "inbox" : v;
        const nextView = canAccessPortalView(stateRef.current, requestedView) ? requestedView : stateRef.current.role === "client" ? "review" : "progress";
        syncPortalViewUrl(nextView);
        setState(s => ({ ...s, view: nextView, navOpen: false, notifOpen: false, pop: null, sidePop: null, playbookDoc: null }));
      },
      openClientDetail: name => setState(s => ({ ...s, view: "clients", clientDetail: name, fileBrand: "all", navOpen: false, notifOpen: false, pop: null, playbookDoc: null })),
      backToClients: () => setState(s => ({ ...s, clientDetail: null })),
      workspaceForClient: clientName => workspaceForClient(clientName, stateRef.current.clientWorkspaces),
      addClientNote: (clientName, text) => {
        const clean = text.trim();
        if (!clean) return;
        const clientId = portalClientId(clientName);
        const note: PortalClientNoteRecord = {
          id: `${clientId}-note-${Date.now()}`,
          text: clean,
          author: actorName(stateRef.current.role),
          createdAt: new Date().toISOString(),
        };
        setState(s => ({
          ...s,
          clientWorkspaces: withClientWorkspace(s, clientId, workspace => ({
            ...workspace,
            notes: [note, ...workspace.notes],
          })),
        }));
        showToast("Note saved for " + clientName);
      },
      deleteClientNote: (clientName, noteId) => {
        const clientId = portalClientId(clientName);
        setState(s => ({
          ...s,
          clientWorkspaces: withClientWorkspace(s, clientId, workspace => ({
            ...workspace,
            notes: workspace.notes.filter(note => note.id !== noteId),
          })),
        }));
        showToast("Note removed");
      },
      blockerOf: id => blockerOf(id, state.tasks),
      advanceTask: id => {
        const L: Record<string, string> = { todo: "To Do", in_progress: "In Progress", review: "In Review", done: "Done" };
        setState(s => {
          const bk = blockerOf(id, s.tasks);
          if (bk) { showToast(`Blocked by "${bk.title}" — finish that first`); return s; }
          let msg: string | null = null;
          const tasks = s.tasks.map(t => {
            if (t.id !== id) return t;
            const i = STATUS_ORDER.indexOf(t.status); const ni = Math.min(i + 1, 3);
            if (ni !== i) msg = `${t.title} → ${L[STATUS_ORDER[ni]]}`;
            return { ...t, status: STATUS_ORDER[ni] };
          });
          if (msg) setTimeout(() => showToast(msg as string), 0);
          return { ...s, tasks };
        });
      },
      moveTask: (id, status) => {
        const L: Record<string, string> = { todo: "To Do", in_progress: "In Progress", review: "In Review", done: "Done" };
        setState(s => {
          const bk = blockerOf(id, s.tasks);
          const cur = (s.tasks.find(t => t.id === id) || {}).status as TaskStatus | undefined;
          if (bk && cur && STATUS_ORDER.indexOf(status) > STATUS_ORDER.indexOf(cur)) { showToast(`Blocked by "${bk.title}" — finish that first`); return s; }
          let msg: string | null = null;
          const tasks = s.tasks.map(t => { if (t.id !== id || t.status === status) return t; msg = `${t.title} → ${L[status]}`; return { ...t, status }; });
          if (msg) setTimeout(() => showToast(msg as string), 0);
          return { ...s, tasks };
        });
      },
      assignTask: (id, assignee) => setState(s => {
        let changed = false;
        const tasks = s.tasks.map(t => {
          if (t.id !== id || t.assignee === assignee) return t;
          changed = true;
          return { ...t, assignee };
        });
        if (changed) setTimeout(() => showToast("Assigned to " + assignee), 0);
        return changed ? { ...s, tasks } : s;
      }),
      updateTask: (id, taskPatch) => setState(s => id === NEW_TASK_DRAFT_ID && s.taskDraft ? ({
        ...s,
        taskDraft: { ...s.taskDraft, ...taskPatch, id: NEW_TASK_DRAFT_ID },
      }) : ({
        ...s,
        tasks: s.tasks.map(task => task.id === id ? { ...task, ...taskPatch, id: task.id } : task),
      })),
      deleteTask: id => setState(s => {
        if (id === NEW_TASK_DRAFT_ID) return { ...s, taskDraft: null, taskModal: null };
        const task = s.tasks.find(item => item.id === id);
        if (task) setTimeout(() => showToast("Task deleted"), 0);
        return {
          ...s,
          tasks: s.tasks.filter(item => item.id !== id),
          taskModal: s.taskModal === id ? null : s.taskModal,
          selTasks: s.selTasks.filter(item => item !== id),
        };
      }),
      bulkImportTasks: drafts => setState(s => {
        const allowedProjects = new Set(clientsVisibleToRole(s.role, s.clientName).map(client => client.name));
        const scopedDrafts = drafts
          .filter(draft => s.role === "admin" || allowedProjects.has(draft.project))
          .map(draft => s.role === "client"
            ? { ...draft, project: s.clientName, assignee: "Client", owner: "client" as const }
            : s.role === "dev"
              ? { ...draft, assignee: DEV_USER_NAME, owner: "studio" as const }
              : draft);
        const existingSourceIds = new Set(s.tasks.map(task => task.sourceId).filter(Boolean));
        const uniqueDrafts = scopedDrafts.filter(draft => !draft.sourceId || !existingSourceIds.has(draft.sourceId));
        const maxTaskNumber = Math.max(0, ...s.tasks.map(task => Number.parseInt(task.id.replace(/\D/g, ""), 10) || 0));
        const imported = uniqueDrafts.map((draft, index): Task => ({
          ...draft,
          id: "k" + (maxTaskNumber + index + 1),
          status: draft.status || "todo",
        }));
        setTimeout(() => showToast(imported.length
          ? `${imported.length} task${imported.length === 1 ? "" : "s"} imported`
          : "Those tasks are already in To-do"), 0);
        if (imported.length) setTimeout(() => syncPortalViewUrl("tasks"), 0);
        return imported.length ? {
          ...s,
          view: "tasks",
          taskView: "board",
          tasks: [...imported, ...s.tasks],
          taskModal: null,
          boardSelect: false,
          selTasks: [],
        } : s;
      }),
      toggleCheck: (taskId, idx) => setState(s => { const cur = s.taskChecks[taskId] || {}; return { ...s, taskChecks: { ...s.taskChecks, [taskId]: { ...cur, [idx]: !cur[idx] } } }; }),
      addTaskComment: (taskId, who) => setState(s => { const t = (s.taskCommentDraft || "").trim(); if (!t) return s; return { ...s, taskCommentDraft: "", taskComments: { ...s.taskComments, [taskId]: [...(s.taskComments[taskId] || []), { who, text: t, time: "Just now", me: true }] } }; }),
      addTaskCommentText: (taskId, who, text) => setState(s => {
        const clean = text.trim();
        if (!clean) return s;
        return { ...s, taskComments: { ...s.taskComments, [taskId]: [...(s.taskComments[taskId] || []), { who, text: clean, time: "Just now", me: true }] } };
      }),
      dragStart: id => { dragRef.current = id; setState(s => ({ ...s, draggingId: id })); },
      dragEnd: () => { dragRef.current = null; setState(s => ({ ...s, draggingId: null, dragOverCol: null })); },
      dropOn: status => { const id = dragRef.current; dragRef.current = null; setState(s => ({ ...s, draggingId: null, dragOverCol: null })); if (id) actionsRef.current.moveTask(id, status); },
      toggleBoardSelect: () => setState(s => ({ ...s, boardSelect: !s.boardSelect, selTasks: [] })),
      toggleSelTask: id => setState(s => ({ ...s, selTasks: s.selTasks.includes(id) ? s.selTasks.filter(x => x !== id) : [...s.selTasks, id] })),
      clearSel: () => setState(s => ({ ...s, selTasks: [], boardSelect: false })),
      bulkAdvance: () => setState(s => {
        let adv = 0, blk = 0;
        const tasks = s.tasks.map(t => {
          if (!s.selTasks.includes(t.id)) return t;
          const b = t.blockedBy ? s.tasks.find(x => x.id === t.blockedBy) : null;
          if (b && b.status !== "done") { blk++; return t; }
          const i = STATUS_ORDER.indexOf(t.status); const ni = Math.min(i + 1, 3); if (ni !== i) adv++;
          return { ...t, status: STATUS_ORDER[ni] };
        });
        setTimeout(() => showToast(`${adv} task${adv === 1 ? "" : "s"} advanced${blk ? ` · ${blk} blocked` : ""}`), 0);
        return { ...s, tasks, selTasks: [], boardSelect: false };
      }),
      bulkDone: () => setState(s => {
        let n = 0, blk = 0;
        const tasks = s.tasks.map(t => {
          if (!s.selTasks.includes(t.id) || t.status === "done") return t;
          const b = t.blockedBy ? s.tasks.find(x => x.id === t.blockedBy) : null;
          if (b && b.status !== "done") { blk++; return t; }
          n++; return { ...t, status: "done" as TaskStatus };
        });
        setTimeout(() => showToast(`${n} marked done${blk ? ` · ${blk} blocked` : ""}`), 0);
        return { ...s, tasks, selTasks: [], boardSelect: false };
      }),
      setTaskFilter: (k, v) => setState(s => ({ ...s, taskFilter: { ...s.taskFilter, [k]: v } as TaskFilter })),
      setClientFilter: (k, v) => setState(s => ({ ...s, clientFilter: { ...s.clientFilter, [k]: v } })),
      saveView: (scope, name, filter) => setState(s => {
        const list = [...(s.savedViews[scope] as SavedView<unknown>[]), { name, filter }];
        const nv = { ...s.savedViews, [scope]: list };
        persist(nv); setTimeout(() => showToast("View saved · " + name), 0);
        return { ...s, savedViews: nv };
      }),
      removeView: (scope, idx) => setState(s => {
        const list = (s.savedViews[scope] as SavedView<unknown>[]).filter((_, i) => i !== idx);
        const nv = { ...s.savedViews, [scope]: list }; persist(nv);
        return { ...s, savedViews: nv };
      }),
      togglePop: id => setState(s => ({ ...s, pop: s.pop === id ? null : id, notifOpen: false })),
      closePop: () => setState(s => ({ ...s, pop: null })),
      createQuickTask: () => {
        const s = stateRef.current;
        const project = s.clientDetail || s.threads.find(thread => thread.id === s.selectedThreadId)?.clientName || s.clientName;
        const assignee = s.role === "admin" ? "Trish Baltazar" : s.role === "dev" ? "Kier Mangibin" : "Client";
        const owner = s.role === "client" ? "client" : "studio";
        const task: Task = {
          id: NEW_TASK_DRAFT_ID,
          title: "New To-do Draft",
          project,
          assignee,
          owner,
          status: "todo",
          priority: "med",
          due: displayDate(),
          source: "manual",
          milestone: "General",
        };
        syncPortalViewUrl("tasks");
        setState(prev => ({
          ...prev,
          view: "tasks",
          taskView: "board",
          taskModal: NEW_TASK_DRAFT_ID,
          taskDraft: task,
          boardSelect: false,
          selTasks: [],
          pop: null,
          navOpen: false,
        }));
        showToast("New to-do draft opened — it has not been created yet");
      },
      saveTaskDraft: () => setState(s => {
        let draft = s.taskDraft;
        if (!draft) return s;
        if (s.role === "client") {
          draft = { ...draft, project: s.clientName, assignee: "Client", owner: "client" };
        } else if (s.role === "dev") {
          const allowedProjects = new Set(clientsVisibleToRole("dev").map(client => client.name));
          if (!allowedProjects.has(draft.project.trim())) {
            setTimeout(() => showToast("Choose one of your assigned clients before creating this task"), 0);
            return s;
          }
          draft = { ...draft, assignee: DEV_USER_NAME, owner: "studio" };
        }
        if (!draft.title.trim() || !draft.project.trim()) {
          setTimeout(() => showToast("Add a task name and client before creating it"), 0);
          return s;
        }
        const nextNum = Math.max(0, ...s.tasks.map(task => Number.parseInt(task.id.replace(/\D/g, ""), 10) || 0)) + 1;
        const id = "k" + nextNum;
        const task: Task = { ...draft, id, title: draft.title.trim(), project: draft.project.trim() };
        const draftChecks = s.taskChecks[NEW_TASK_DRAFT_ID];
        const draftComments = s.taskComments[NEW_TASK_DRAFT_ID];
        const { [NEW_TASK_DRAFT_ID]: _discardChecks, ...remainingChecks } = s.taskChecks;
        const { [NEW_TASK_DRAFT_ID]: _discardComments, ...remainingComments } = s.taskComments;
        setTimeout(() => showToast("Task created for " + task.project), 0);
        return {
          ...s,
          tasks: [task, ...s.tasks],
          taskDraft: null,
          taskModal: null,
          taskChecks: draftChecks ? { ...remainingChecks, [id]: draftChecks } : remainingChecks,
          taskComments: draftComments ? { ...remainingComments, [id]: draftComments } : remainingComments,
        };
      }),
      cancelTaskDraft: () => setState(s => {
        const { [NEW_TASK_DRAFT_ID]: _discardChecks, ...remainingChecks } = s.taskChecks;
        const { [NEW_TASK_DRAFT_ID]: _discardComments, ...remainingComments } = s.taskComments;
        return { ...s, taskDraft: null, taskModal: null, taskChecks: remainingChecks, taskComments: remainingComments };
      }),
      setTaskView: v => setState(s => ({ ...s, taskView: v })),
      calNav: d => setState(s => { let m = s.calM + d, y = s.calY; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } return { ...s, calM: m, calY: y }; }),
      sendMsg: () => setState(s => {
        const d = s.draft.trim(); if (!d) return s;
        const from = s.role === "client" ? "client" : "studio";
        const by = (s.role === "client" ? "Client" : s.role === "dev" ? "Kier Mangibin" : "Trish Baltazar").split(" ")[0];
        const tid = s.role === "client" ? "th1" : s.selectedThreadId;
        return { ...s, draft: "", threads: s.threads.map(t => t.id === tid ? { ...t, messages: [...t.messages, { from, text: d, time: "Now", by }] } : t) };
      }),
      insertCanned: text => setState(s => {
        const from = s.role === "client" ? "client" : "studio";
        const by = (s.role === "client" ? "Client" : s.role === "dev" ? "Kier Mangibin" : "Trish Baltazar").split(" ")[0];
        const tid = s.role === "client" ? "th1" : s.selectedThreadId;
        return { ...s, threads: s.threads.map(t => t.id === tid ? { ...t, messages: [...t.messages, { from, text, time: "Now", by }] } : t) };
      }),
      selectThread: id => setState(s => ({ ...s, selectedThreadId: id, statusMenuOpen: false, assignMenuOpen: false, threads: s.threads.map(t => t.id === id ? { ...t, unread: 0 } : t) })),
      resolveEscalation: id => { setState(s => ({ ...s, escalations: s.escalations.map(e => e.id === id ? { ...e, resolved: true } : e) })); showToast("Escalation resolved"); },
      previewAsClient: () => setState(s => ({ ...s, role: "client", view: "progress", previewFrom: "admin", sidePop: null, pop: null })),
      exitPreview: () => setState(s => ({ ...s, role: s.previewFrom || "admin", view: "progress", previewFrom: null })),
      createThreadTicket: threadId => {
        const s = stateRef.current;
        const thread = s.threads.find(item => item.id === threadId);
        if (!thread || thread.isTicket) return;
        const ticketId = "BZ-" + s.ticketSeq;
        setState(prev => ({
          ...prev,
          ticketSeq: prev.ticketSeq + 1,
          threads: prev.threads.map(item => item.id === threadId ? {
            ...item,
            isTicket: true,
            ticketId,
            category: item.category || "Inbox request",
            status: "open",
          } : item),
        }));
        showToast("Ticket " + ticketId + " opened in the Inbox");
      },
      createThreadTask: threadId => {
        const s = stateRef.current;
        const thread = s.threads.find(item => item.id === threadId);
        if (!thread) return;
        const nextNum = Math.max(0, ...s.tasks.map(task => Number.parseInt(task.id.replace(/\D/g, ""), 10) || 0)) + 1;
        const title = (thread.messages.at(-1)?.text || thread.name).slice(0, 56);
        const task: Task = {
          id: "k" + nextNum,
          title: title.length > 52 ? title.slice(0, 52) + "…" : title,
          project: thread.clientName,
          assignee: thread.assignee || "Trish Baltazar",
          owner: "studio",
          status: "todo",
          priority: thread.escalated ? "high" : "med",
          due: "July 8",
        };
        setState(prev => ({ ...prev, tasks: [task, ...prev.tasks] }));
        showToast("To-do created from " + thread.clientName);
      },
      createProgressChatSession: () => {
        setState(s => {
          const active = activeProgressChat(s);
          if (active && active.status === "draft" && active.messages.length === 0) return { ...s, progressChatHistoryOpen: false };
          const session = newProgressChatSession();
          return {
            ...s,
            activeProgressChatId: session.id,
            progressChatSessions: [session, ...s.progressChatSessions],
            progressChatHistoryOpen: false,
          };
        });
      },
      selectProgressChatSession: id => {
        setState(s => ({ ...s, activeProgressChatId: id, progressChatHistoryOpen: false }));
      },
      deleteProgressChatSession: id => {
        let deleted = false;
        setState(s => {
          const target = s.progressChatSessions.find(session => session.id === id);
          if (target?.messages.some(message => message.pending)) {
            setTimeout(() => showToast("Wait for Snapshot to finish before deleting this chat"), 0);
            return s;
          }
          const remaining = s.progressChatSessions.filter(session => session.id !== id);
          deleted = remaining.length !== s.progressChatSessions.length;
          return deleted ? {
            ...s,
            progressChatSessions: remaining,
            activeProgressChatId: s.activeProgressChatId === id ? (remaining[0]?.id || null) : s.activeProgressChatId,
          } : s;
        });
        if (deleted) showToast("Chat deleted");
      },
      clearProgressChatHistory: () => {
        let cleared = false;
        setState(s => {
          if (s.progressChatSessions.some(session => session.messages.some(message => message.pending))) {
            setTimeout(() => showToast("Wait for Snapshot to finish before clearing history"), 0);
            return s;
          }
          cleared = s.progressChatSessions.length > 0;
          return cleared ? { ...s, progressChatSessions: [], activeProgressChatId: null, progressChatHistoryOpen: false } : s;
        });
        if (cleared) showToast("Chat history cleared");
      },
      sendProgressChatMessage: text => {
        const clean = text.trim();
        if (!clean) return;
        const s = stateRef.current;
        const active = activeProgressChat(s);
        if (active?.messages.some(message => message.pending)) return;
        const now = new Date().toISOString();
        const stamp = Date.now();
        const baseSession = active && active.status !== "sent" ? active : newProgressChatSession();
        const firstUserMessage = !baseSession.messages.some(message => message.from === "user");
        const nextTitle = firstUserMessage ? summarizeProgressChatTitle(clean) : baseSession.title;
        const userMessage: ProgressChatMessage = { id: "u-" + stamp, from: "user", text: clean, time: "Now" };
        const assistantId = "a-" + stamp;
        const pendingMessage: ProgressChatMessage = { id: assistantId, from: "assistant", text: "Reviewing workspace history…", time: "Now", pending: true };
        const nextSession: ProgressChatSession = { ...baseSession, title: nextTitle, messages: [...baseSession.messages, userMessage, pendingMessage], updatedAt: now };
        const exists = s.progressChatSessions.some(session => session.id === nextSession.id);
        setState(current => ({
          ...current,
          chatDraft: "",
          activeProgressChatId: nextSession.id,
          progressChatSessions: exists
            ? current.progressChatSessions.map(session => session.id === nextSession.id ? nextSession : session)
            : [nextSession, ...current.progressChatSessions],
        }));
        const conversation = [...baseSession.messages.filter(message => !message.pending && !message.error), userMessage]
          .map(message => ({ role: message.from, content: message.text }));
        void fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: s.role, clientName: s.clientName, messages: conversation, workspace: buildProgressChatContext(s) }),
        }).then(async response => {
          const payload = await response.json().catch(() => null);
          if (!response.ok || typeof payload?.reply !== "string") throw new Error(typeof payload?.error === "string" ? payload.error : "Snapshot chat could not answer right now.");
          const chatActions: Array<{ action?: string; client?: string; service?: string; stage?: string; title?: string; note?: string; assignee?: string }> = Array.isArray(payload?.actions) ? payload.actions : [];
          setState(current => {
            const projectOverrides = { ...current.projectOverrides };
            let ticketSeq = current.ticketSeq;
            let threads = current.threads;
            let tasks = current.tasks;
            let appliedReply = payload.reply as string;
            let linkedTicket: { ticketId: string; threadId: string; taskId: string } | null = null;
            chatActions.forEach(action => {
              if (action?.action === "update_project" && typeof action.client === "string" && (action.service === "cocoon" || action.service === "wiaw" || action.service === "iff") && typeof action.stage === "string") {
                const name = action.service === "cocoon" ? "Cocoon Consult" : action.service === "wiaw" ? "Winged in a Week" : "In Full Flight";
                projectOverrides[action.client] = { ...(projectOverrides[action.client] || {}), name, service: action.service, stage: action.stage, progress: 0 };
                return;
              }
              if (action?.action === "create_request" && typeof action.client === "string" && typeof action.title === "string" && typeof action.note === "string" && (action.assignee === "Trish Baltazar" || action.assignee === "Kier Mangibin")) {
                const ticketId = "BZ-" + ticketSeq;
                const threadId = "pc-action-" + ticketSeq;
                const maxTaskNumber = Math.max(0, ...tasks.map(task => Number.parseInt(task.id.replace(/\D/g, ""), 10) || 0));
                const taskId = "k" + (maxTaskNumber + 1);
                const thread: Thread = {
                  id: threadId,
                  name: action.title,
                  clientName: action.client,
                  unread: s.role === "client" ? 1 : 0,
                  isTicket: true,
                  ticketId,
                  category: "Snapshot request",
                  status: "open",
                  assignee: action.assignee,
                  escalated: false,
                  tzLabel: "London",
                  tzOff: 1,
                  messages: [{ from: s.role === "client" ? "client" : "studio", text: action.note, time: "Now", by: actorShort(s.role) }],
                };
                const task: Task = { id: taskId, title: action.title, description: action.note, project: action.client, assignee: action.assignee, owner: "studio", status: "todo", priority: "med", due: displayDate(), source: "inbox", sourceId: `snapshot-${ticketId}`, milestone: "Snapshot request" };
                threads = [thread, ...threads];
                tasks = [task, ...tasks];
                ticketSeq += 1;
                linkedTicket = { ticketId, threadId, taskId };
                appliedReply += `\n\nRequest created: ${ticketId} · assigned to ${action.assignee}.`;
              }
            });
            return {
              ...current,
              projectOverrides,
              ticketSeq,
              threads,
              tasks,
              progressChatSessions: current.progressChatSessions.map(session => session.id === nextSession.id ? { ...session, ...(linkedTicket ? { status: "sent" as const, ...linkedTicket } : {}), updatedAt: new Date().toISOString(), messages: session.messages.map(message => message.id === assistantId ? { ...message, text: appliedReply, pending: false, time: "Now" } : message) } : session),
            };
          });
          if (chatActions.length) showToast(`${chatActions.length} workspace change${chatActions.length === 1 ? "" : "s"} applied`);
        }).catch(error => {
          setState(current => ({ ...current, progressChatSessions: current.progressChatSessions.map(session => session.id === nextSession.id ? { ...session, updatedAt: new Date().toISOString(), messages: session.messages.map(message => message.id === assistantId ? { ...message, text: error instanceof Error ? error.message : "Snapshot chat could not answer right now.", pending: false, error: true, time: "Now" } : message) } : session) }));
        });
      },
      sendProgressChatAsTicket: () => {
        const s = stateRef.current;
        const session = activeProgressChat(s);
        if (!session || !session.messages.some(message => message.from === "user")) {
          showToast("Send a message first");
          return;
        }
        if (session.status === "sent" && session.ticketId && session.taskId) {
          showToast("Already sent as " + session.ticketId);
          return;
        }

        const ticketId = "BZ-" + s.ticketSeq;
        const threadId = "pc-thread-" + s.ticketSeq;
        const nextTaskNum = Math.max(0, ...s.tasks.map(task => Number.parseInt(task.id.replace(/\D/g, ""), 10) || 0)) + 1;
        const taskId = "k" + nextTaskNum;
        const firstUserMessage = session.messages.find(message => message.from === "user")?.text || session.title;
        const title = session.title === "New Snapshot chat" ? summarizeProgressChatTitle(firstUserMessage) : session.title;
        const clientName = progressChatWorkspaceName(s.role);
        const assignee = s.role === "dev" ? "Kier Mangibin" : "Trish Baltazar";
        const transcript = progressChatTranscript(session.messages);
        const thread: Thread = {
          id: threadId,
          name: title,
          clientName,
          unread: 0,
          isTicket: true,
          ticketId,
          category: "Snapshot chat",
          status: "open",
          assignee,
          escalated: false,
          tzLabel: "London",
          tzOff: 1,
          messages: [{
            from: s.role === "client" ? "client" : "studio",
            text: transcript || title,
            time: "Now",
            by: actorShort(s.role),
          }],
        };
        const task: Task = {
          id: taskId,
          title,
          project: clientName,
          assignee,
          owner: "studio",
          status: "todo",
          priority: "med",
          due: displayDate(),
        };

        setState(prev => ({
          ...prev,
          ticketSeq: prev.ticketSeq + 1,
          selectedThreadId: threadId,
          threads: [thread, ...prev.threads],
          tasks: [task, ...prev.tasks],
          progressChatSessions: prev.progressChatSessions.map(item => item.id === session.id ? {
            ...item,
            title,
            status: "sent",
            ticketId,
            threadId,
            taskId,
            updatedAt: new Date().toISOString(),
          } : item),
        }));
        showToast("Sent as ticket " + ticketId);
      },
      openThreadClientDetail: threadId => {
        const thread = stateRef.current.threads.find(item => item.id === threadId);
        if (!thread) return;
        setState(s => ({ ...s, view: "clients", clientDetail: thread.clientName, navOpen: false, notifOpen: false, pop: null, playbookDoc: null }));
      },
      sendApproval: approvalId => {
        setState(s => {
          const approval = DEFAULT_PORTAL_APPROVALS.find(item => item.id === approvalId)
            || Object.values(s.clientWorkspaces).flatMap(workspace => workspace.approvals).find(item => item.id === approvalId);
          if (!approval) return s;
          const threadUpdate = upsertStudioThread(s, {
            clientName: approval.clientName,
            text: `${approval.title} is ready for review.`,
            category: "Approval",
            assignee: "Trish Baltazar",
          });
          const clientId = approval.clientId;
          return {
            ...s,
            ticketSeq: threadUpdate.ticketSeq,
            threads: threadUpdate.threads,
            clientWorkspaces: withClientWorkspace(s, clientId, workspace => ({
              ...workspace,
              approvals: mergePortalApprovals(clientId, workspace.approvals).map(item => item.id === approvalId ? {
                ...item,
                sent: true,
                sentAt: displayDate(),
                threadId: threadUpdate.threadId,
              } : item),
            })),
          };
        });
        showToast("Sent to client");
      },
      shareFinalOutput: payload => {
        setState(s => {
          const clientId = portalClientId(payload.clientName);
          const approvalId = `${clientId}-${payload.outputType}-${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
          const threadUpdate = upsertStudioThread(s, {
            clientName: payload.clientName,
            text: `${payload.title} is available in Approvals.`,
            category: "Approval",
            assignee: "Trish Baltazar",
          });
          const approval: PortalApprovalRecord = {
            id: approvalId,
            clientId,
            clientName: payload.clientName,
            title: payload.title,
            thumb: payload.outputType === "audit" ? "var(--success-soft)" : "var(--accent-soft)",
            sent: true,
            sentAt: displayDate(),
            threadId: threadUpdate.threadId,
            outputType: payload.outputType,
            summary: payload.summary,
            sections: payload.sections || [],
          };
          return {
            ...s,
            ticketSeq: threadUpdate.ticketSeq,
            threads: threadUpdate.threads,
            clientWorkspaces: withClientWorkspace(s, clientId, workspace => ({
              ...workspace,
              approvals: [approval, ...mergePortalApprovals(clientId, workspace.approvals).filter(item => item.id !== approvalId)],
            })),
          };
        });
        showToast(`Shared in ${payload.clientName}'s Approvals`);
      },
      sendProposal: (clientName, proposal) => {
        setState(s => {
          const threadUpdate = upsertStudioThread(s, {
            clientName,
            text: `Proposal sent${proposal.iffOn ? " with In Full Flight" : ""}.`,
            category: "Proposal",
            assignee: "Trish Baltazar",
          });
          const clientId = portalClientId(clientName);
          return {
            ...s,
            ticketSeq: threadUpdate.ticketSeq,
            threads: threadUpdate.threads,
            clientWorkspaces: withClientWorkspace(s, clientId, workspace => ({
              ...workspace,
              proposal: {
                sent: true,
                sentAt: displayDate(),
                iffOn: proposal.iffOn,
                threadId: threadUpdate.threadId,
              } satisfies PortalProposalRecord,
            })),
          };
        });
        showToast("Proposal sent to " + clientName);
      },
      inviteCollaborator: (clientName, collaborator) => {
        const clientId = portalClientId(clientName);
        const name = collaborator.name.trim();
        const email = collaborator.email.trim().toLowerCase();
        if (!name || !email) return;
        const record: PortalCollaboratorRecord = {
          id: `${clientId}-${email}`,
          name,
          email,
          access: collaborator.access,
          studio: false,
          invitedAt: displayDate(),
          status: "pending",
        };
        setState(s => ({
          ...s,
          clientWorkspaces: withClientWorkspace(s, clientId, workspace => ({
            ...workspace,
            collaborators: [record, ...workspace.collaborators.filter(existing => existing.id !== record.id)],
          })),
        }));
        showToast("Invite saved for " + name);
      },
      uploadPortalFiles: async payload => {
        const files = Array.isArray(payload.files) ? payload.files : Array.from(payload.files);
        if (files.length === 0) return;
        const clientId = portalClientId(payload.clientName);
        const form = new FormData();
        form.set("clientId", clientId);
        form.set("folder", payload.folder);
        form.set("role", stateRef.current.role);
        if (payload.threadId) form.set("threadId", payload.threadId);
        files.forEach(file => form.append("files", file));

        try {
          const response = await fetch("/api/portal-files", {
            method: "POST",
            body: form,
          });
          const data = await response.json().catch(() => null);
          if (!response.ok || !Array.isArray(data?.files)) {
            throw new Error(typeof data?.error === "string" ? data.error : "Unable to upload files.");
          }

          const uploaded = data.files as PortalWorkspaceFile[];
          setState(s => ({
            ...s,
            clientWorkspaces: withClientWorkspace(s, clientId, workspace => ({
              ...workspace,
              files: [...uploaded.filter(file => !file.threadId), ...workspace.files],
            })),
          }));
          showToast(files.length === 1 ? "1 file uploaded" : `${files.length} files uploaded`);
        } catch (error) {
          console.error("Unable to upload portal files.", error);
          showToast("Upload failed");
        }
      },
      escalateDecision: payload => {
        setState(s => {
          const clientId = portalClientId(payload.clientName);
          const existing = s.escalations.find(item => !item.resolved && item.title === payload.title && item.client === payload.clientName);
          if (existing) return s;
          const nextEscalation: Escalation = {
            id: "e" + (s.escalations.length + 1),
            level: "Decision",
            kind: "gate",
            title: payload.title,
            client: payload.clientName,
            by: payload.by,
            time: "Now",
            reason: payload.reason,
            resolved: false,
          };
          return {
            ...s,
            escalations: [nextEscalation, ...s.escalations],
            clientWorkspaces: withClientWorkspace(s, clientId, workspace => ({
              ...workspace,
              approvals: mergePortalApprovals(clientId, workspace.approvals).map(item => item.clientName === payload.clientName ? {
                ...item,
                escalated: true,
              } : item),
            })),
          };
        });
        showToast("Decision escalated to Trish (Admin)");
      },
      createJourneyRequest: payload => {
        const s = stateRef.current;
        const existing = payload.existingThreadId ? s.threads.find(t => t.id === payload.existingThreadId) : null;
        const assignee = existing?.assignee || "Kier Mangibin";
        const summary = (payload.tags.length ? "[" + payload.tags.join(", ") + "] " : "") + payload.note + (payload.severity === "refine" ? " (nice to refine)" : "");

        if (existing && existing.ticketId) {
          setState(prev => ({
            ...prev,
            threads: prev.threads.map(t => t.id === existing.id ? {
              ...t,
              status: "open",
              unread: t.unread + 1,
              escalated: payload.severity === "blocking" ? true : t.escalated,
              messages: [...t.messages, { from: "client", text: summary, time: "Now", by: "Client" }],
            } : t),
          }));
          return { ticketId: existing.ticketId, threadId: existing.id, assignee };
        }

        const ticketId = "BZ-" + s.ticketSeq;
        const threadId = "jr" + s.ticketSeq;
        const ticket: Thread = {
          id: threadId,
          name: "Client",
          clientName: payload.clientName,
          unread: 1,
          isTicket: true,
          ticketId,
          category: "Milestone review",
          status: "open",
          assignee,
          escalated: payload.severity === "blocking",
          tzLabel: "London",
          tzOff: 1,
          messages: [{ from: "client", text: payload.title + " — " + summary, time: "Now", by: "Client" }],
        };
        setState(prev => ({
          ...prev,
          ticketSeq: prev.ticketSeq + 1,
          threads: [ticket, ...prev.threads],
        }));
        return { ticketId, threadId, assignee };
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patch, update, showToast]);

  // stable ref so dropOn can reach moveTask
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  return { state, actions };
}
