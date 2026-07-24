"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { css } from "./helpers";
import { usePortal } from "./store";
import type { Role } from "./types";
import { Sidebar } from "./shell/Sidebar";
import { MobileTabBar } from "./shell/MobileTabBar";
import { TopBar } from "./shell/TopBar";
import { Progress } from "./views/Progress";
import { Placeholder } from "./views/Placeholder";
import { Icon } from "./icons";
import { PortalViewLoader } from "./components/PortalViewLoader";
import { clientEngineAccessDecision, clientHasEngineAccess } from "./access";
import { mergePortalClientWorkspace, portalClientId } from "@/lib/portalWorkspacePersistence";

const Audits = dynamic(() => import("./audits/Audits").then(module => module.Audits), { loading: () => <PortalViewLoader /> });
const Builders = dynamic(() => import("./builders/Builders").then(module => module.Builders), { loading: () => <PortalViewLoader /> });
const Clients = dynamic(() => import("./views/Clients").then(module => module.Clients), { loading: () => <PortalViewLoader /> });
const ClientDetail = dynamic(() => import("./views/ClientDetail").then(module => module.ClientDetail), { loading: () => <PortalViewLoader /> });
const Tasks = dynamic(() => import("./views/Tasks").then(module => module.Tasks), { loading: () => <PortalViewLoader /> });
const Inbox = dynamic(() => import("./views/Inbox").then(module => module.Inbox), { loading: () => <PortalViewLoader /> });
const Activity = dynamic(() => import("./views/Activity").then(module => module.Activity), { loading: () => <PortalViewLoader /> });
const Playbooks = dynamic(() => import("./views/Playbooks").then(module => module.Playbooks), { loading: () => <PortalViewLoader /> });
const Billing = dynamic(() => import("./views/Billing").then(module => module.Billing), { loading: () => <PortalViewLoader /> });
const Users = dynamic(() => import("./views/Users").then(module => module.Users), { loading: () => <PortalViewLoader /> });
const Journey = dynamic(() => import("./views/Journey").then(module => module.Journey), { loading: () => <PortalViewLoader /> });
const Approvals = dynamic(() => import("./views/Approvals").then(module => module.Approvals), { loading: () => <PortalViewLoader /> });
const Assistant = dynamic(() => import("./views/Assistant").then(module => module.Assistant), { loading: () => <PortalViewLoader /> });
const Files = dynamic(() => import("./views/Files").then(module => module.Files), { loading: () => <PortalViewLoader /> });
const ProfileSettings = dynamic(() => import("./views/ProfileSettings").then(module => module.ProfileSettings), { loading: () => <PortalViewLoader /> });
const Invoices = dynamic(() => import("./views/Invoices").then(module => module.Invoices), { loading: () => <PortalViewLoader /> });
const Onboarding = dynamic(() => import("./views/Onboarding").then(module => module.Onboarding), { loading: () => <PortalViewLoader /> });
const TaskModal = dynamic(() => import("./views/TaskModal").then(module => module.TaskModal));
const SubModal = dynamic(() => import("./views/SubModal").then(module => module.SubModal));
const PlaybookDocument = dynamic(() => import("./views/PlaybookDocument").then(module => module.PlaybookDocument));
const CommandPalette = dynamic(() => import("./shell/CommandPalette").then(module => module.CommandPalette));

export function Portal({ seedRole, clientName, userEmail, canSwitchRoles, onLogout }: { seedRole: Role; clientName?: string; userEmail: string; canSwitchRoles: boolean; onLogout: () => void }) {
  const { state, actions } = usePortal(seedRole, clientName, canSwitchRoles, userEmail);
  const sidebarState = useMemo(() => ({
    role: state.role,
    view: state.view,
    isMobile: state.isMobile,
    navOpen: state.navOpen,
    clientName: state.clientName,
    threads: state.threads,
    escalations: state.escalations,
    sidePop: state.sidePop,
    auditType: state.auditType,
    builderType: state.builderType,
    projectOverrides: state.projectOverrides,
    clientWorkspaces: state.clientWorkspaces,
  }), [state.role, state.view, state.isMobile, state.navOpen, state.clientName, state.threads, state.escalations, state.sidePop, state.auditType, state.builderType, state.projectOverrides, state.clientWorkspaces]);
  const topBarState = useMemo(() => ({
    role: state.role,
    view: state.view,
    isMobile: state.isMobile,
    navOpen: state.navOpen,
    sidebarCollapsed: state.sidebarCollapsed,
    notifOpen: state.notifOpen,
    notificationReadIds: state.notificationReadIds,
    notificationPreferences: state.notificationPreferences,
    taskView: state.taskView,
    taskFilter: state.taskFilter,
    pop: state.pop,
    previewFrom: state.previewFrom,
    guidedSidebarActive: state.guidedSidebarActive,
    guidedSidebarExitTick: state.guidedSidebarExitTick,
    guidedTopBarInfo: state.guidedTopBarInfo,
    canSwitchRoles: state.canSwitchRoles,
    clientName: state.clientName,
    selectedThreadId: state.selectedThreadId,
    threads: state.threads,
    escalations: state.escalations,
    journeyGates: state.journeyGates,
    tasks: state.tasks,
    projectOverrides: state.projectOverrides,
    clientWorkspaces: state.clientWorkspaces,
  }), [state.role, state.view, state.isMobile, state.navOpen, state.sidebarCollapsed, state.notifOpen, state.notificationReadIds, state.notificationPreferences, state.taskView, state.taskFilter, state.pop, state.previewFrom, state.guidedSidebarActive, state.guidedSidebarExitTick, state.guidedTopBarInfo, state.canSwitchRoles, state.clientName, state.selectedThreadId, state.threads, state.escalations, state.journeyGates, state.tasks, state.projectOverrides, state.clientWorkspaces]);
  const mobileTabBarState = useMemo(() => ({
    role: state.role,
    view: state.view,
    clientName: state.clientName,
    selectedThreadId: state.selectedThreadId,
    threads: state.threads,
    projectOverrides: state.projectOverrides,
    clientWorkspaces: state.clientWorkspaces,
  }), [state.role, state.view, state.clientName, state.selectedThreadId, state.threads, state.projectOverrides, state.clientWorkspaces]);
  const handleCollapse = useCallback(() => {
    actions.update(current => ({ sidebarCollapsed: !current.sidebarCollapsed }));
  }, [actions]);
  const clientWorkspace = state.role === "client"
    ? mergePortalClientWorkspace(portalClientId(state.clientName), state.clientWorkspaces[portalClientId(state.clientName)])
    : null;
  const clientPortalClosed = state.hydrated
    && state.role === "client"
    && clientWorkspace?.serviceLifecycle.dashboardAccessState === "deleted";
  if (clientPortalClosed) {
    return <ClientPortalAccessClosed
      clientName={state.clientName}
      preview={!!state.previewFrom}
      onExit={state.previewFrom ? actions.exitPreview : onLogout}
    />;
  }
  const deniedClientEngine = state.role === "client" && ((state.view === "audit" && !clientHasEngineAccess(state, "checkups")) || (state.view === "funnels" && !clientHasEngineAccess(state, "labs")));
  const deniedClientDecision = deniedClientEngine ? clientEngineAccessDecision(state, state.view === "funnels" ? "labs" : "checkups") : null;
  const fullBleedView = !deniedClientEngine && (state.view === "funnels" || state.view === "audits_new" || state.view === "audit");
  const rail = !state.isMobile && state.sidebarCollapsed && !(fullBleedView && state.guidedSidebarActive);
  const shellFrame = fullBleedView
    ? "width:100%;max-width:none;margin:0"
    : state.isMobile
      ? "width:95vw;max-width:95vw;margin:0 auto"
      : "width:100%;max-width:90vw;margin:0 auto";
  const shellHeaderPadding = state.isMobile
    ? "padding:0.85rem 2.5vw 0.8rem"
    : "padding:0.48rem clamp(1rem,2vw,2rem)";
  const shellContentPadding = state.isMobile
    ? "padding:1rem 2.5vw calc(6rem + env(safe-area-inset-bottom))"
    : "padding:1.15rem clamp(1rem,2vw,2rem) 3.5rem";
  const topBarStickyTop = state.previewFrom ? (state.isMobile ? "3.4rem" : "3rem") : "0";
  const topBarBackground = "var(--bg)";

  function renderView() {
    const { role, view, clientDetail } = state;
    if (view === "progress") return <Progress state={state} actions={actions} />;
    if (view === "clients") return clientDetail ? <ClientDetail state={state} actions={actions} /> : <Clients state={state} actions={actions} />;
    if (view === "tasks") return <Tasks state={state} actions={actions} />;
    if (view === "inbox") return <Inbox state={state} actions={actions} />;
    if (view === "activity") return <Activity state={state} />;
    if (view === "playbooks") return <Playbooks state={state} actions={actions} />;
    if (view === "billing" && role === "admin") return <Billing state={state} actions={actions} />;
    if (view === "team") return <Users state={state} actions={actions} />;
    if (view === "invoices" && role === "admin") return <Invoices state={state} actions={actions} />;
    if (view === "milestones") return <Journey state={state} actions={actions} />;
    if (view === "review") return <Approvals state={state} actions={actions} />;
    if (view === "assistant") return <Assistant state={state} />;
    if (view === "files") return <Files state={state} actions={actions} />;
    if (view === "onboarding") return <Onboarding state={state} actions={actions} />;
    if (view === "profile" || view === "settings") return <ProfileSettings state={state} actions={actions} mode={view} />;
    return <Placeholder view={view} role={role} />;
  }

  return (
    <div className="bs-portal">
      <Sidebar state={sidebarState} actions={actions} rail={rail} onLogout={onLogout} />

      <main style={css("flex:1;min-width:0;height:100vh;height:100dvh;overflow-y:auto;overflow-x:clip;position:relative;background:var(--bg)")}>
        {state.previewFrom && (
          <div style={css("position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding:0.5rem 1rem;background:color-mix(in srgb,var(--accent-soft) 72%,white 28%);border-bottom:1px solid color-mix(in srgb,var(--accent) 22%,transparent 78%);color:color-mix(in srgb,var(--accent) 60%,black 40%);font-size:var(--text-sm)")}>
            <span style={css("display:inline-flex;align-items:center;gap:0.45rem;min-width:0")}><Icon name="eye" size={15} /><span>Previewing the portal as <strong style={{ fontWeight: 500 }}>{state.clientName}</strong> — Read-Only Client View</span></span>
            <button onClick={actions.exitPreview} style={css("flex-shrink:0;padding:0.28rem 0.7rem;border:1px solid color-mix(in srgb,var(--accent) 30%,white 70%);border-radius:999px;background:#fff;color:color-mix(in srgb,var(--accent) 58%,black 42%);font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>Exit preview</button>
          </div>
        )}

        <div style={css("position:sticky;top:" + topBarStickyTop + ";z-index:24;border-bottom:1px solid color-mix(in srgb,var(--border) 82%,white 18%);background:" + topBarBackground)}>
          <div style={css(shellFrame + ";" + shellHeaderPadding)}>
            <TopBar state={topBarState} actions={actions} onCollapse={handleCollapse} />
          </div>
        </div>

        {deniedClientEngine ? (
          <div style={css(shellFrame + ";" + shellContentPadding)}>
            <ClientEngineAccessNotice decision={deniedClientDecision!} onSnapshot={() => actions.setView("progress")} onApprovals={() => actions.setView("review")} />
          </div>
        ) : state.view === "audits_new" || state.view === "audit" || state.view === "funnels" ? (
          state.view === "audits_new" || state.view === "audit"
            ? <Audits state={state} actions={actions} userEmail={userEmail} />
            : <Builders state={state} actions={actions} userEmail={userEmail} />
        ) : (
          <div style={css(shellFrame + ";" + shellContentPadding)}>
            {renderView()}
          </div>
        )}
      </main>

      {state.isMobile && <MobileTabBar state={mobileTabBarState} actions={actions} />}
      {state.subModal && <SubModal state={state} actions={actions} />}
      {state.taskModal && <TaskModal state={state} actions={actions} />}
      {state.playbookDoc && <PlaybookDocument state={state} actions={actions} userEmail={userEmail} />}
      {state.paletteOpen && <CommandPalette state={state} actions={actions} />}

      {state.toast && (
        <div
          role={state.toast.onClick ? "button" : "status"}
          tabIndex={state.toast.onClick ? 0 : undefined}
          onClick={() => { state.toast?.onClick?.(); actions.patch({ toast: null }); }}
          onKeyDown={event => { if (state.toast?.onClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); state.toast.onClick(); actions.patch({ toast: null }); } }}
          style={{ ...css("position:fixed;bottom:" + (state.isMobile ? "5.2rem" : "1.5rem") + ";left:50%;transform:translateX(-50%);background:var(--fg);color:#fff;padding:0.7rem 1.15rem;border-radius:999px;font-size:var(--text-base);font-weight:500;z-index:100;display:flex;align-items:center;gap:var(--space-2);max-width:90vw;cursor:" + (state.toast.onClick ? "pointer" : "default")), animation: "pt-tzin .2s ease" }}
        >
          <span style={{ width: "1rem", height: "1rem", display: "grid", placeItems: "center", flexShrink: 0, color: "var(--accent-dim)" }}><Icon name="checkmark" size={15} /></span>
          <span style={{ display: "block", minWidth: 0 }}>{state.toast.message}</span>
          {state.toast.onClick && <span aria-hidden="true" style={css("color:var(--accent-dim);white-space:nowrap")}>View audit →</span>}
        </div>
      )}
    </div>
  );
}

function ClientPortalAccessClosed({ clientName, preview, onExit }: { clientName: string; preview: boolean; onExit: () => void }) {
  return (
    <main className="bs-portal" style={css("min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:1rem;background:var(--bg)")}>
      <section style={css("width:min(100%,34rem);border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;box-shadow:0 1rem 3rem color-mix(in srgb,var(--fg) 8%,transparent)")}>
        <div style={css("padding:1.35rem 1.4rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:flex-start;gap:.8rem")}>
          <span style={css("width:2.5rem;height:2.5rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:var(--surface-alt);color:var(--fg-muted)")}><Icon name="lock" size={16}/></span>
          <div>
            <span style={css("font-size:var(--text-label);letter-spacing:.04em;text-transform:uppercase;color:var(--fg-faint)")}>{preview ? "Closed-state preview" : "Portal access closed"}</span>
            <h1 style={css("margin:.28rem 0 0;font-size:var(--text-2xl);font-weight:500;letter-spacing:-.02em")}>{clientName}</h1>
            <p style={css("margin:.42rem 0 0;font-size:var(--text-sm);line-height:1.55;color:var(--fg-muted)")}>This workspace was closed after its access window and no-action period ended.</p>
          </div>
        </div>
        <div style={css("padding:1.1rem 1.4rem")}>
          <div style={css("padding:.78rem .85rem;border:1px solid var(--border-soft);border-radius:.8rem;background:var(--surface-alt)")}>
            <strong style={css("display:block;font-size:var(--text-sm);font-weight:500")}>To return, start a new Cocoon Consult</strong>
            <span style={css("display:block;margin-top:.24rem;font-size:var(--text-xs);line-height:1.5;color:var(--fg-muted)")}>A new paid Checkup is required because the previous evidence may be stale. The studio will confirm the new scope and access window before reopening the portal.</span>
          </div>
          <button type="button" onClick={onExit} style={css("width:100%;height:2.5rem;margin-top:.8rem;border:0;border-radius:999px;background:var(--accent);color:#fff;font-size:var(--text-sm);font-weight:500;cursor:pointer")}>{preview ? "Exit closed-state preview" : "Sign out"}</button>
        </div>
      </section>
    </main>
  );
}

function ClientEngineAccessNotice({ decision, onSnapshot, onApprovals }: { decision: ReturnType<typeof clientEngineAccessDecision>; onSnapshot: () => void; onApprovals: () => void }) {
  return (
    <section style={css("max-width:46rem;margin:0 auto;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden") }>
      <div style={css("padding:1.1rem 1.15rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:flex-start;gap:var(--space-3)") }>
        <span style={css("width:2.35rem;height:2.35rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:var(--warn-soft);color:var(--warn)")}><Icon name="lock" size={15}/></span>
        <div><span style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:var(--warn)")}>Access prerequisite</span><h2 style={css("margin:.25rem 0 0;font-size:var(--text-xl);font-weight:500")}>{decision.title}</h2><p style={css("margin:.35rem 0 0;font-size:var(--text-base);line-height:1.55;color:var(--fg-muted)")}>{decision.reason}</p></div>
      </div>
      <div style={css("padding:1rem 1.15rem") }>
        <h3 style={css("margin:0 0 .55rem;font-size:var(--text-base);font-weight:500")}>What needs to happen first</h3>
        <div style={css("display:flex;flex-direction:column;gap:.45rem")}>{decision.requirements.map((requirement, index) => <div key={requirement} style={css("display:flex;align-items:flex-start;gap:.55rem;padding:.6rem .65rem;border:1px solid var(--border-soft);border-radius:.72rem;background:var(--surface-alt);font-size:var(--text-xs);line-height:1.45;color:var(--fg-muted)")}><span style={css("width:1.3rem;height:1.3rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:var(--surface);color:var(--fg-faint);font-size:var(--text-2xs);font-weight:500")}>{index + 1}</span>{requirement}</div>)}</div>
        <div style={css("display:flex;gap:.55rem;margin-top:.85rem;flex-wrap:wrap") }><button type="button" onClick={onSnapshot} className="pt-op" style={css("height:2.25rem;padding:0 1rem;border:0;border-radius:999px;background:var(--accent);color:#fff;font-size:var(--text-xs);font-weight:500;cursor:pointer")}>Back to Snapshot</button><button type="button" onClick={onApprovals} className="pt-softbtn" style={css("height:2.25rem;padding:0 1rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}>View approved outputs</button></div>
      </div>
    </section>
  );
}
