"use client";

import dynamic from "next/dynamic";
import { css } from "./helpers";
import { usePortal } from "./store";
import type { Role } from "./types";
import { Sidebar } from "./shell/Sidebar";
import { MobileTabBar } from "./shell/MobileTabBar";
import { TopBar } from "./shell/TopBar";
import { CommandPalette } from "./shell/CommandPalette";
import { Progress } from "./views/Progress";
import { Clients } from "./views/Clients";
import { ClientDetail } from "./views/ClientDetail";
import { Tasks } from "./views/Tasks";
import { TaskModal } from "./views/TaskModal";
import { SubModal } from "./views/SubModal";
import { Inbox } from "./views/Inbox";
import { Activity } from "./views/Activity";
import { Playbooks } from "./views/Playbooks";
import { Billing } from "./views/Billing";
import { Users } from "./views/Users";
import { Journey } from "./views/Journey";
import { Approvals } from "./views/Approvals";
import { Assistant } from "./views/Assistant";
import { Files } from "./views/Files";
import { ProfileSettings } from "./views/ProfileSettings";
import { PlaybookDocument } from "./views/PlaybookDocument";
import { Placeholder } from "./views/Placeholder";
import { Icon } from "./icons";
import { PortalViewLoader } from "./components/PortalViewLoader";
import { clientHasEngineAccess } from "./access";

const Audits = dynamic(() => import("./audits/Audits").then(module => module.Audits), { loading: () => <PortalViewLoader /> });
const Builders = dynamic(() => import("./builders/Builders").then(module => module.Builders), { loading: () => <PortalViewLoader /> });
const Invoices = dynamic(() => import("./views/Invoices").then(module => module.Invoices), { loading: () => <PortalViewLoader /> });
const Onboarding = dynamic(() => import("./views/Onboarding").then(module => module.Onboarding), { loading: () => <PortalViewLoader /> });

export function Portal({ seedRole, clientName, canSwitchRoles, onLogout }: { seedRole: Role; clientName?: string; canSwitchRoles: boolean; onLogout: () => void }) {
  const { state, actions } = usePortal(seedRole, clientName, canSwitchRoles);
  const deniedClientEngine = state.role === "client" && !clientHasEngineAccess(state) && (state.view === "audit" || state.view === "funnels");
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
      <Sidebar state={state} actions={actions} rail={rail} onLogout={onLogout} />

      <main style={css("flex:1;min-width:0;height:100vh;height:100dvh;overflow-y:auto;overflow-x:clip;position:relative;background:var(--bg)")}>
        {state.previewFrom && (
          <div style={css("position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding:0.5rem 1rem;background:color-mix(in srgb,var(--accent-soft) 72%,white 28%);border-bottom:1px solid color-mix(in srgb,var(--accent) 22%,transparent 78%);color:color-mix(in srgb,var(--accent) 60%,black 40%);font-size:0.8rem")}>
            <span style={css("display:inline-flex;align-items:center;gap:0.45rem;min-width:0")}><Icon name="eye" size={15} /><span>Previewing the portal as <strong style={{ fontWeight: 500 }}>{state.clientName}</strong> — Read-Only Client View</span></span>
            <button onClick={actions.exitPreview} style={css("flex-shrink:0;padding:0.28rem 0.7rem;border:1px solid color-mix(in srgb,var(--accent) 30%,white 70%);border-radius:999px;background:#fff;color:color-mix(in srgb,var(--accent) 58%,black 42%);font-size:0.74rem;font-weight:500;cursor:pointer")}>Exit preview</button>
          </div>
        )}

        <div style={css("position:sticky;top:" + topBarStickyTop + ";z-index:24;border-bottom:1px solid color-mix(in srgb,var(--border) 82%,white 18%);background:" + topBarBackground + ";backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)")}>
          <div style={css(shellFrame + ";" + shellHeaderPadding)}>
            <TopBar state={state} actions={actions} onCollapse={() => actions.patch({ sidebarCollapsed: !state.sidebarCollapsed })} />
          </div>
        </div>

        {deniedClientEngine ? (
          <div style={css(shellFrame + ";" + shellContentPadding)}>
            <Approvals state={state} actions={actions} />
          </div>
        ) : state.view === "audits_new" || state.view === "audit" || state.view === "funnels" ? (
          state.view === "audits_new" || state.view === "audit"
            ? <Audits state={state} actions={actions} />
            : <Builders state={state} actions={actions} />
        ) : (
          <div style={css(shellFrame + ";" + shellContentPadding)}>
            {renderView()}
          </div>
        )}
      </main>

      {state.isMobile && <MobileTabBar state={state} actions={actions} onLogout={onLogout} />}
      {state.subModal && <SubModal state={state} actions={actions} />}
      {state.taskModal && <TaskModal state={state} actions={actions} />}
      {state.playbookDoc && <PlaybookDocument state={state} actions={actions} />}
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
