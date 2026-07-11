"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PORTAL_APPROVALS,
  mergePortalApprovals,
  mergePortalClientWorkspace,
  normalizePersistedPortalWorkspaceState,
  portalClientId,
  type PortalApprovalRecord,
  type PortalClientWorkspace,
  type PortalCollaboratorRecord,
  type PortalProposalRecord,
  type PortalWorkspaceFile,
} from "@/lib/portalWorkspacePersistence";
import type { Escalation, JourneyGate, JourneyRequestSeverity, Priority, Role, Service, Task, TaskFilter, TaskStatus, Thread, View } from "./types";
import type { ProgressChatMessage, ProgressChatSession } from "./types";
import { seedEscalations, seedJourneyGates, seedTasks, seedThreads } from "./data";
import { STATUS_ORDER } from "./helpers";
import { progressChatReply, progressChatTranscript, summarizeProgressChatTitle } from "./progressChat";

export type TaskView = "board" | "calendar" | "milestone";
export type SavedView<F> = { name: string; filter: F };
type PersistedPortalState = Pick<PortalState, "tasks" | "journeyGates" | "threads" | "escalations" | "ticketSeq" | "clientWorkspaces" | "progressChatSessions" | "activeProgressChatId">;

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
  toast: string | null;
  // tasks
  tasks: Task[];
  taskModal: string | null;
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
}

function loadSavedViews(): PortalState["savedViews"] {
  try {
    const v = JSON.parse(localStorage.getItem("baltz.savedViews") || "null");
    if (v && typeof v === "object") return { clients: v.clients || [], tasks: v.tasks || [] };
  } catch { /* ignore */ }
  return { clients: [], tasks: [] };
}

function loadPersistedPortalState(): Partial<PersistedPortalState> {
  try {
    const value = JSON.parse(localStorage.getItem("baltz.portalState") || "null");
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

  return aliasedView && ROLE_VIEWS[role].has(aliasedView as View) ? aliasedView as View : null;
}

function initialRequestedView(role: Role): View | null {
  if (typeof window === "undefined") return null;
  return normalizeRequestedView(new URLSearchParams(window.location.search).get("view"), role);
}

function syncPortalViewUrl(view: View) {
  if (typeof window === "undefined") return;

  const nextParams = new URLSearchParams(window.location.search);
  nextParams.set("view", view === "audits_new" ? "audits" : view);

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
      tasks: state.tasks,
      journeyGates: state.journeyGates,
      threads: state.threads,
      escalations: state.escalations,
      ticketSeq: state.ticketSeq,
      clientWorkspaces: state.clientWorkspaces,
      progressChatSessions: state.progressChatSessions,
      activeProgressChatId: state.activeProgressChatId,
    };
    localStorage.setItem("baltz.portalState", JSON.stringify(snapshot));
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

export function initialState(role: Role, requestedView?: View | null): PortalState {
  return {
    role, view: requestedView ?? "progress", previewFrom: null, clientDetail: null,
    isMobile: false, navOpen: false, notifOpen: false, pop: null, sidePop: null, sidebarCollapsed: false, guidedSidebarActive: false, guidedSidebarExitTick: 0, guidedTopBarInfo: null, toast: null,
    tasks: seedTasks(), taskModal: null, taskView: "board", draggingId: null, dragOverCol: null,
    boardSelect: false, selTasks: [], taskChecks: {}, taskComments: {}, taskCommentDraft: "",
    taskFilter: { owner: "all", priority: "all" }, clientFilter: { service: "all", health: "all" },
    savedViews: { clients: [], tasks: [] },
    calY: 2026, calM: 6, calSel: "2026-6-2",
    journeyGates: seedJourneyGates(),
    funExpanded: null, subModal: null, playbookDoc: null,
    threads: seedThreads(), selectedThreadId: "th1", draft: "", inboxSearch: "", inboxFilter: "all", statusMenuOpen: false, assignMenuOpen: false,
    escalations: seedEscalations(),
    paletteOpen: false, paletteQuery: "",
    fileBrand: "all",
    chatDraft: "", progressChatSessions: [], activeProgressChatId: null, progressChatHistoryOpen: false, ticketSeq: 1042,
    clientWorkspaces: {},
  };
}

const ROLE_VIEWS: Record<Role, Set<View>> = {
  admin: new Set(["progress", "clients", "tasks", "inbox", "audits_new", "funnels", "activity", "team", "playbooks", "billing", "profile", "settings", "onboarding"]),
  dev: new Set(["progress", "clients", "tasks", "review", "inbox", "audits_new", "funnels", "playbooks", "profile", "settings", "onboarding"]),
  client: new Set(["progress", "milestones", "tasks", "inbox", "activity", "audit", "funnels", "files", "assistant", "billing", "profile", "settings"]),
};

export interface PortalActions {
  patch: (p: Partial<PortalState>) => void;
  update: (fn: (s: PortalState) => Partial<PortalState>) => void;
  showToast: (m: string) => void;
  setRole: (r: Role) => void;
  setView: (v: View) => void;
  openClientDetail: (name: string) => void;
  backToClients: () => void;
  blockerOf: (id: string) => Task | null;
  advanceTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  assignTask: (id: string, assignee: string) => void;
  toggleCheck: (taskId: string, idx: number) => void;
  addTaskComment: (taskId: string, who: string) => void;
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
  sendProgressChatMessage: (text: string) => void;
  sendProgressChatAsTicket: () => void;
  createJourneyRequest: (payload: JourneyRequestPayload) => { ticketId: string; threadId: string; assignee: string };
  sendApproval: (approvalId: string) => void;
  sendProposal: (clientName: string, proposal: { iffOn: boolean }) => void;
  inviteCollaborator: (clientName: string, collaborator: { name: string; email: string; access: string }) => void;
  uploadPortalFiles: (payload: { clientName: string; folder: string; files: FileList | File[]; threadId?: string }) => Promise<void>;
  openThreadClientDetail: (threadId: string) => void;
  escalateDecision: (payload: { clientName: string; title: string; reason: string; by: string }) => void;
  workspaceForClient: (clientName: string) => PortalClientWorkspace;
}

export function usePortal(seedRole: Role) {
  const [state, setState] = useState<PortalState>(() => initialState(seedRole, initialRequestedView(seedRole)));
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
      const requestedView = new URLSearchParams(window.location.search).get("view");
      const view = normalizeRequestedView(requestedView, s.role) ?? s.view;
      return { ...s, ...persisted, savedViews: loadSavedViews(), isMobile: window.innerWidth < 900, view };
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
    if (!hasHydrated) return;
    persistPortalState(state);
  }, [hasHydrated, state.tasks, state.journeyGates, state.threads, state.escalations, state.ticketSeq, state.clientWorkspaces, state.progressChatSessions, state.activeProgressChatId]);

  useEffect(() => {
    if (!hasHydrated) return;
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const response = await fetch("/api/portal-workspace-state", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load the portal workspace state.");
        const persisted = normalizePersistedPortalWorkspaceState(payload?.state);
        if (!cancelled && persisted) {
          setState(s => ({
            ...s,
            tasks: persisted.tasks as Task[],
            journeyGates: persisted.journeyGates as JourneyGate[],
            threads: persisted.threads as Thread[],
            escalations: persisted.escalations as Escalation[],
            ticketSeq: persisted.ticketSeq,
            clientWorkspaces: persisted.clientWorkspaces,
            progressChatSessions: persisted.progressChatSessions as ProgressChatSession[],
            activeProgressChatId: persisted.activeProgressChatId,
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
      tasks: state.tasks,
      journeyGates: state.journeyGates,
      threads: state.threads,
      escalations: state.escalations,
      ticketSeq: state.ticketSeq,
      clientWorkspaces: state.clientWorkspaces,
      progressChatSessions: state.progressChatSessions,
      activeProgressChatId: state.activeProgressChatId,
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
  }, [hasHydrated, workspaceLoaded, state.tasks, state.journeyGates, state.threads, state.escalations, state.ticketSeq, state.clientWorkspaces, state.progressChatSessions, state.activeProgressChatId]);

  const patch = useCallback((p: Partial<PortalState>) => setState(s => ({ ...s, ...p })), []);
  const update = useCallback((fn: (s: PortalState) => Partial<PortalState>) => setState(s => ({ ...s, ...fn(s) })), []);

  const showToast = useCallback((m: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setState(s => ({ ...s, toast: m, notifOpen: false }));
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
    const persist = (v: PortalState["savedViews"]) => { try { localStorage.setItem("baltz.savedViews", JSON.stringify(v)); } catch { /* ignore */ } };
    const actorName = (role: Role) => role === "client" ? "Flora Bennett" : role === "dev" ? "Noa Vega" : "Trish Baltazar";
    const actorShort = (role: Role) => actorName(role).split(" ")[0];
    const displayDate = () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const workspaceForClient = (clientName: string, clientWorkspaces: Record<string, PortalClientWorkspace>) => {
      const clientId = portalClientId(clientName);
      return mergePortalClientWorkspace(clientId, clientWorkspaces[clientId]);
    };
    const nextThreadId = (prefix: string, value: number) => `${prefix}${value}`;
    const createClientMessage = (text: string, by: string) => ({ from: "studio" as const, text, time: "Now", by });
    const progressChatWorkspaceName = (role: Role) => role === "client" ? "Flora & Co." : role === "dev" ? "Delivery Workspace" : "Baltazar Studio";
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
        syncPortalViewUrl("progress");
        setState(s => ({ ...s, role: r, view: "progress", previewFrom: null, navOpen: false, notifOpen: false, pop: null, playbookDoc: null }));
      },
      setView: v => {
        const nextView = v === "escalations" ? "inbox" : v;
        syncPortalViewUrl(nextView);
        setState(s => ({ ...s, view: nextView, navOpen: false, notifOpen: false, pop: null, sidePop: null, playbookDoc: null }));
      },
      openClientDetail: name => setState(s => ({ ...s, view: "clients", clientDetail: name, fileBrand: "all", navOpen: false, notifOpen: false, pop: null, playbookDoc: null })),
      backToClients: () => setState(s => ({ ...s, clientDetail: null })),
      workspaceForClient: clientName => workspaceForClient(clientName, stateRef.current.clientWorkspaces),
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
      toggleCheck: (taskId, idx) => setState(s => { const cur = s.taskChecks[taskId] || {}; return { ...s, taskChecks: { ...s.taskChecks, [taskId]: { ...cur, [idx]: !cur[idx] } } }; }),
      addTaskComment: (taskId, who) => setState(s => { const t = (s.taskCommentDraft || "").trim(); if (!t) return s; return { ...s, taskCommentDraft: "", taskComments: { ...s.taskComments, [taskId]: [...(s.taskComments[taskId] || []), { who, text: t, time: "Just now", me: true }] } }; }),
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
        const nextNum = Math.max(0, ...s.tasks.map(task => Number.parseInt(task.id.replace(/\D/g, ""), 10) || 0)) + 1;
        const id = "k" + nextNum;
        const project = s.clientDetail || s.threads.find(thread => thread.id === s.selectedThreadId)?.clientName || (s.role === "client" ? "Flora & Co." : "Flora & Co.");
        const assignee = s.role === "admin" ? "Trish Baltazar" : s.role === "dev" ? "Noa Vega" : "Flora Bennett";
        const owner = s.role === "client" ? "client" : "studio";
        const task: Task = {
          id,
          title: "New To-do Draft",
          project,
          assignee,
          owner,
          status: "todo",
          priority: "med",
          due: "July 8",
        };
        setState(prev => ({
          ...prev,
          view: "tasks",
          taskView: "board",
          taskModal: id,
          boardSelect: false,
          selTasks: [],
          pop: null,
          navOpen: false,
          tasks: [task, ...prev.tasks],
        }));
        showToast("New to-do draft opened");
      },
      setTaskView: v => setState(s => ({ ...s, taskView: v })),
      calNav: d => setState(s => { let m = s.calM + d, y = s.calY; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } return { ...s, calM: m, calY: y }; }),
      sendMsg: () => setState(s => {
        const d = s.draft.trim(); if (!d) return s;
        const from = s.role === "client" ? "client" : "studio";
        const by = (s.role === "client" ? "Flora Bennett" : s.role === "dev" ? "Noa Vega" : "Trish Baltazar").split(" ")[0];
        const tid = s.role === "client" ? "th1" : s.selectedThreadId;
        return { ...s, draft: "", threads: s.threads.map(t => t.id === tid ? { ...t, messages: [...t.messages, { from, text: d, time: "Now", by }] } : t) };
      }),
      insertCanned: text => setState(s => {
        const from = s.role === "client" ? "client" : "studio";
        const by = (s.role === "client" ? "Flora Bennett" : s.role === "dev" ? "Noa Vega" : "Trish Baltazar").split(" ")[0];
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
      sendProgressChatMessage: text => {
        const clean = text.trim();
        if (!clean) return;
        setState(s => {
          const now = new Date().toISOString();
          const stamp = Date.now();
          const active = activeProgressChat(s);
          const baseSession = active && active.status !== "sent" ? active : newProgressChatSession();
          const firstUserMessage = !baseSession.messages.some(message => message.from === "user");
          const nextTitle = firstUserMessage ? summarizeProgressChatTitle(clean) : baseSession.title;
          const nextMessages: ProgressChatMessage[] = [
            ...baseSession.messages,
            { id: "u-" + stamp, from: "user", text: clean, time: "Now" },
            { id: "a-" + stamp, from: "assistant", text: progressChatReply(clean, s.role), time: "Now" },
          ];
          const nextSession: ProgressChatSession = {
            ...baseSession,
            title: nextTitle,
            messages: nextMessages,
            updatedAt: now,
          };
          const exists = s.progressChatSessions.some(session => session.id === nextSession.id);
          return {
            ...s,
            chatDraft: "",
            activeProgressChatId: nextSession.id,
            progressChatSessions: exists
              ? s.progressChatSessions.map(session => session.id === nextSession.id ? nextSession : session)
              : [nextSession, ...s.progressChatSessions],
          };
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
        const assignee = s.role === "dev" ? "Noa Vega" : "Trish Baltazar";
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
        const assignee = existing?.assignee || "Noa Vega";
        const summary = (payload.tags.length ? "[" + payload.tags.join(", ") + "] " : "") + payload.note + (payload.severity === "refine" ? " (nice to refine)" : "");

        if (existing && existing.ticketId) {
          setState(prev => ({
            ...prev,
            threads: prev.threads.map(t => t.id === existing.id ? {
              ...t,
              status: "open",
              unread: t.unread + 1,
              escalated: payload.severity === "blocking" ? true : t.escalated,
              messages: [...t.messages, { from: "client", text: summary, time: "Now", by: "Flora" }],
            } : t),
          }));
          return { ticketId: existing.ticketId, threadId: existing.id, assignee };
        }

        const ticketId = "BZ-" + s.ticketSeq;
        const threadId = "jr" + s.ticketSeq;
        const ticket: Thread = {
          id: threadId,
          name: "Flora Bennett",
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
          messages: [{ from: "client", text: payload.title + " — " + summary, time: "Now", by: "Flora" }],
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
