"use client";

import { Icon } from "../icons";
import { StatsCarousel } from "../components/StatsCarousel";
import { SectionHeader } from "../components/SectionHeader";
import { css, healthMap, prioColor, statusPill, STATUS_LABEL, STATUS_MAP } from "../helpers";
import { SVC_META, WORKLOAD } from "../data";
import { usePortalStudioClients } from "../usePortalStudioClients";
import { roleTasks } from "../selectors";
import type { PortalActions, PortalState } from "../store";
import type { ClientProject, View } from "../types";

function ov2col(mob: boolean) { return mob ? "minmax(0,1fr)" : "minmax(0,1.55fr) minmax(0,1fr)"; }

function ActionCue({ color = "var(--accent)" }: { color?: string }) {
  return (
    <span
      aria-hidden="true"
      style={css("width:1.5rem;height:1.5rem;border-radius:999px;background:color-mix(in srgb," + color + " 14%,white 86%);color:" + color + ";display:grid;place-items:center;flex-shrink:0")}
    >
      <Icon name="chevright" size={11} />
    </span>
  );
}

// Where each snapshot card navigates when clicked.
const ADMIN_STAT_VIEW: Record<string, View> = {
  "Clients": "clients",
  "To-do's": "tasks",
  "Checkups": "audits_new",
  "Labs": "funnels",
  "Inbox": "inbox",
  "Billing": "billing",
};
const MANAGER_STAT_VIEW: Record<string, View> = {
  "Clients": "clients",
  "To-do's": "tasks",
  "Approvals": "review",
  "Checkups": "audits_new",
  "Labs": "funnels",
  "Inbox": "inbox",
};

function liveProjects(state: PortalState, clients: ReturnType<typeof usePortalStudioClients>["clients"]): ClientProject[] {
  const visible = state.role === "client" ? clients.filter(client => client.name === state.clientName) : clients;
  return visible.map(client => {
    const workspace = state.clientWorkspaces[client.id];
    const lifecycle = workspace?.serviceLifecycle;
    const auditState = lifecycle?.auditState || "not_started";
    const progress = auditState === "shared" ? 100 : auditState === "approved" ? 90 : auditState === "review_ready" ? 75 : auditState === "generated" ? 55 : auditState === "collecting" ? 25 : 0;
    return {
      id: `client-${client.id}`,
      client: client.name,
      name: "Client workspace",
      service: "cocoon",
      stage: lifecycle?.currentDevelopmentStage || (progress ? "In progress" : "Not started"),
      progress,
      dev: client.owner,
      health: lifecycle?.nextRequiredAction ? "at_risk" : "on_track",
      due: "—",
      amount: "—",
      wise: "awaiting",
    };
  });
}

const ESC_KIND: Record<string, string> = {
  danger: "background:var(--danger-soft);color:var(--danger)",
  gate: "background:var(--lane-gate-soft);color:var(--lane-gate)",
  accent: "background:var(--accent-soft);color:var(--accent)",
};

// Admin service-pipeline snapshot used by the Progress header.
export function AdminPipeline({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const { clients } = usePortalStudioClients();
  const total = clients.length;
  const serviceCounts = {
    cocoon: clients.filter(client => Boolean(state.clientWorkspaces[client.id]?.brandAudit)).length,
    wiaw: clients.filter(client => (state.clientWorkspaces[client.id]?.funnelPlans.length || 0) > 0).length,
    iff: clients.filter(client => Boolean(state.clientWorkspaces[client.id]?.engineWork.socialBuilder)).length,
  };
  const pipeline = (["cocoon", "wiaw", "iff"] as const).map(service => ({
    label: SVC_META[service].label,
    color: SVC_META[service].color,
    count: serviceCounts[service],
    pct: total ? Math.round((serviceCounts[service] / total) * 100) : 0,
  }));
  return (
    <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:0.55rem")}>
      {pipeline.map(pl => (
        <button key={pl.label} type="button" onClick={() => actions.setView("clients")} className="pt-card-soft" style={css("width:100%;text-align:left;font-family:inherit;padding:0.85rem 1rem;border-radius:var(--radius-panel);background:var(--surface);border:1px solid var(--border-soft);cursor:pointer")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem")}>
            <span style={css("display:inline-flex;align-items:center;gap:0.4rem;font-size:var(--text-base);font-weight:500")}><span style={css("width:0.6rem;height:0.6rem;border-radius:50%;background:" + pl.color)} />{pl.label}</span>
            <span style={css("display:inline-flex;align-items:center;gap:0.4rem;font-size:var(--text-xl);font-weight:500")}>{pl.count}<ActionCue color={pl.color} /></span>
          </div>
          <div style={css("height:0.4rem;border-radius:999px;background:oklch(0.94 0.006 50);overflow:hidden")}><div style={css("width:" + pl.pct + "%;height:100%;border-radius:999px;background:" + pl.color)} /></div>
        </button>
      ))}
    </div>
  );
}

// Admin snapshot stat cards used by the Progress header.
export function AdminStats({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const { clients } = usePortalStudioClients();
  const stats = [
    { label: "Clients", value: String(clients.length), icon: "briefcase", tint: "var(--accent-soft)", color: "var(--accent)" },
    { label: "To-do's", value: String(state.tasks.filter(task => task.status !== "done").length), icon: "checklist", tint: "var(--lane-gate-soft)", color: "var(--lane-gate)" },
    { label: "Checkups", value: String(clients.filter(client => Boolean(state.clientWorkspaces[client.id]?.brandAudit || state.clientWorkspaces[client.id]?.engineWork.websiteAudit || state.clientWorkspaces[client.id]?.engineWork.seoAudit)).length), icon: "audit", tint: "var(--success-soft)", color: "var(--success)" },
    { label: "Labs", value: String(clients.filter(client => (state.clientWorkspaces[client.id]?.funnelPlans.length || 0) > 0).length), icon: "flask", tint: "var(--lane-ai-soft)", color: "var(--lane-ai)" },
    { label: "Inbox", value: String(state.threads.filter(thread => thread.unread > 0).length), icon: "inbox", tint: "var(--danger-soft)", color: "var(--danger)" },
  ];
  return (
    <StatsCarousel>
      {stats.map(s => (
        <button key={s.label} type="button" onClick={() => actions.setView(ADMIN_STAT_VIEW[s.label] || "clients")} className="pt-card-soft" style={css("width:100%;text-align:left;font-family:inherit;padding:0.85rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface);display:flex;align-items:center;gap:0.7rem;cursor:pointer")}>
          <span style={css("width:2.2rem;height:2.2rem;display:grid;place-items:center;border-radius:50%;background:" + s.tint + ";color:" + s.color + ";flex-shrink:0")}><Icon name={s.icon} size={15} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={css("font-size:var(--text-2xs);font-weight:500;color:var(--fg-muted)")}>{s.label}</div>
            <div style={css("font-size:var(--text-xl);font-weight:500;line-height:1.1")}>{s.value}</div>
          </div>
        </button>
      ))}
    </StatsCarousel>
  );
}

export function AdminProgressBody({ state, actions, hideStats = false }: { state: PortalState; actions: PortalActions; hideStats?: boolean }) {
  const { clients } = usePortalStudioClients();
  const projects = liveProjects(state, clients);
  const escOpen = state.escalations.filter(e => !e.resolved).slice(0, 3);
  const visibleWorkload = WORKLOAD.filter(member => member.name !== "Kier Mangibin");

  return (
    <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>
      {!hideStats && <AdminStats state={state} actions={actions} />}
      {!hideStats && <AdminPipeline state={state} actions={actions} />}

      {/* 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: ov2col(state.isMobile), gap: "0.85rem", alignItems: "stretch" }}>
        {/* clients at a glance */}
        <div className="pt-panel" style={css("height:100%;overflow:hidden")}>
          <SectionHeader inset title="Clients at a glance" actionLabel="View all" onAction={() => actions.setView("clients")} />
          <div style={{ overflowX: "auto" }}>
            <div data-client-list-scroll style={{ minWidth: "30rem", height: "19.25rem", maxHeight: "19.25rem", overflowY: "auto", overscrollBehavior: "contain", scrollbarGutter: "stable" }}>
              {projects.map(p => {
                const hm = healthMap(p.health); const sm = SVC_META[p.service];
                return (
                  <div key={p.id} onClick={() => actions.openClientDetail(p.client)} className="pt-row" style={css("box-sizing:border-box;min-height:3.85rem;display:grid;grid-template-columns:2rem minmax(6rem,1fr) 8.5rem 6rem 4.75rem;gap:0.7rem;align-items:center;padding:0.7rem 1.1rem;border-bottom:1px solid var(--border-soft);cursor:pointer")}>
                    <span style={css("width:2rem;height:2rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);font-weight:500")}>{p.client[0]}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={css("font-weight:500;font-size:var(--text-base);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{p.client}</div>
                    </div>
                    <span style={css("min-width:0;font-size:var(--text-sm);color:var(--fg-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{sm.label}</span>
                    <div style={css("display:flex;align-items:center;gap:var(--space-2);min-width:0")}>
                      <div style={css("flex:1;height:0.35rem;border-radius:999px;background:oklch(0.94 0.006 50);overflow:hidden")}><div style={css("width:" + p.progress + "%;height:100%;background:" + sm.color + ";border-radius:999px")} /></div>
                      <span style={css("font-size:var(--text-2xs);color:var(--fg-muted);width:1.9rem;text-align:right")}>{p.progress}%</span>
                    </div>
                    <span style={{ minWidth: 0 }}><span style={css(statusPill(hm[0]))}>{hm[1]}</span></span>
                  </div>
                );
              })}
              {projects.length === 0 && <div style={css("padding:1.5rem 1rem;text-align:center;color:var(--fg-faint);font-size:var(--text-xs)")}>No clients yet.</div>}
            </div>
          </div>
        </div>

        {/* right column */}
        <div style={css("height:100%;display:flex;flex-direction:column;gap:0.85rem;min-width:0")}>
          <div className="pt-panel" style={css("flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden")}>
            <SectionHeader inset icon="alert" iconColor="var(--danger)" title="Escalations" actionLabel="View all" onAction={() => { actions.patch({ inboxFilter: "tickets" }); actions.setView("inbox"); }} />
            {escOpen.map(e => (
              <div key={e.id} style={css("padding:0.8rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
                <div style={css("display:flex;align-items:center;gap:0.4rem;margin-bottom:0.25rem")}>
                  <span style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;padding:0.1rem 0.42rem;border-radius:5px;" + (ESC_KIND[e.kind] || ESC_KIND.accent))}>{e.level}</span>
                  <span style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-left:auto")}>{e.time}</span>
                </div>
                <div style={css("font-weight:500;font-size:var(--text-base)")}>{e.title}</div>
                <div style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>{e.client}</div>
                <div style={css("display:flex;gap:0.4rem;margin-top:0.55rem")}>
                  <button onClick={() => actions.resolveEscalation(e.id)} style={css("font-size:var(--text-xs);font-weight:500;padding:0.3rem 0.7rem;border-radius:var(--radius-pill);border:none;background:var(--fg);color:#fff;cursor:pointer")}>Resolve</button>
                  <button onClick={() => { actions.patch({ inboxFilter: "tickets" }); actions.setView("inbox"); }} style={css("font-size:var(--text-xs);font-weight:500;padding:0.3rem 0.7rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);cursor:pointer")}>Review</button>
                </div>
              </div>
            ))}
            {escOpen.length === 0 && <div style={css("flex:1;display:grid;place-items:center;padding:1.35rem 1.1rem;color:var(--fg-faint);font-size:var(--text-xs);text-align:center")}>No escalations yet.</div>}
          </div>
          <div className="pt-panel" style={css("flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden")}>
            <SectionHeader inset title="Team workload" />
            <div style={css("flex:1;min-height:0;display:flex;flex-direction:column")}>
              {visibleWorkload.map((w, index) => (
                <div key={w.name} style={css("flex:1;min-height:3.4rem;display:flex;align-items:center;gap:0.65rem;padding:0.65rem 1.1rem;" + (index < visibleWorkload.length - 1 ? "border-bottom:1px solid var(--border-soft)" : ""))}>
                  <span style={css("width:1.75rem;height:1.75rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:var(--text-2xs);font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0")}>{w.init}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={css("font-weight:500;font-size:var(--text-sm)")}>{w.name}</div>
                    <div style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>{w.clients} clients · {w.tasks} tasks</div>
                  </div>
                  <div style={css("width:3.2rem;height:0.35rem;border-radius:999px;background:oklch(0.94 0.006 50);overflow:hidden;flex-shrink:0")}><div style={css("width:" + w.load + "%;height:100%;background:" + w.loadColor)} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dev/manager snapshot stat cards used by the Progress header.
export function ManagerStats({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const { clients } = usePortalStudioClients();
  const myOpen = state.tasks.filter(t => t.assignee === "Kier Mangibin" && t.status !== "done").length;
  const myClients = clients.length;
  const awaitingApprovals = state.tasks.filter(t => t.assignee === "Kier Mangibin" && t.status === "review").length;
  const assignedUnread = state.threads.filter(thread => thread.assignee === "Kier Mangibin" && thread.unread > 0).length;
  const mgrStats = [
    { label: "Clients", value: String(myClients), icon: "briefcase", tint: "var(--accent-soft)", color: "var(--accent)" },
    { label: "To-do's", value: String(myOpen), icon: "checklist", tint: "var(--lane-gate-soft)", color: "var(--lane-gate)" },
    { label: "Approvals", value: String(awaitingApprovals), icon: "flag", tint: "var(--warn-soft)", color: "var(--warn)" },
    { label: "Checkups", value: "0", icon: "audit", tint: "var(--success-soft)", color: "var(--success)" },
    { label: "Labs", value: "0", icon: "flask", tint: "var(--lane-ai-soft)", color: "var(--lane-ai)" },
    { label: "Inbox", value: String(assignedUnread), icon: "inbox", tint: "var(--danger-soft)", color: "var(--danger)" },
  ];
  return (
    <StatsCarousel>
      {mgrStats.map(s => (
        <button key={s.label} type="button" onClick={() => actions.setView(MANAGER_STAT_VIEW[s.label] || "clients")} className="pt-card-soft" style={css("width:100%;text-align:left;font-family:inherit;padding:0.85rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface);display:flex;align-items:center;gap:0.7rem;cursor:pointer")}>
          <span style={css("width:2.2rem;height:2.2rem;display:grid;place-items:center;border-radius:50%;background:" + s.tint + ";color:" + s.color + ";flex-shrink:0")}><Icon name={s.icon} size={15} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={css("font-size:var(--text-2xs);font-weight:500;color:var(--fg-muted)")}>{s.label}</div>
            <div style={css("font-size:var(--text-xl);font-weight:500;line-height:1.1")}>{s.value}</div>
          </div>
        </button>
      ))}
    </StatsCarousel>
  );
}

// Dev pipeline — assigned clients as progress cards (mirrors AdminPipeline).
export function ManagerPipeline({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const { clients } = usePortalStudioClients();
  const projects = liveProjects(state, clients).slice(0, 3);
  return (
    <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:0.55rem")}>
      {projects.map(p => {
        const color = SVC_META[p.service].color;
        return (
          <button key={p.id} type="button" onClick={() => actions.openClientDetail(p.client)} className="pt-card-soft" style={css("width:100%;text-align:left;font-family:inherit;padding:0.85rem 1rem;border-radius:var(--radius-panel);background:var(--surface);border:1px solid var(--border-soft);cursor:pointer")}>
            <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem")}>
              <span style={css("display:inline-flex;align-items:center;gap:0.4rem;font-size:var(--text-base);font-weight:500;min-width:0")}><span style={css("width:0.6rem;height:0.6rem;border-radius:50%;background:" + color + ";flex-shrink:0")} /><span style={css("overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{p.client}</span></span>
              <span style={css("display:inline-flex;align-items:center;gap:0.4rem;font-size:var(--text-xl);font-weight:500;flex-shrink:0")}>{p.progress}%<ActionCue color={color} /></span>
            </div>
            <div style={css("height:0.4rem;border-radius:999px;background:oklch(0.94 0.006 50);overflow:hidden")}><div style={css("width:" + p.progress + "%;height:100%;border-radius:999px;background:" + color)} /></div>
          </button>
        );
      })}
    </div>
  );
}

export function ManagerProgressBody({ state, actions, hideStats = false }: { state: PortalState; actions: PortalActions; hideStats?: boolean }) {
  const { clients } = usePortalStudioClients();
  const projects = liveProjects(state, clients);
  const myDue = roleTasks(state).filter(t => t.status !== "done").slice(0, 5);
  const visibleClientIds = new Set(clients.map(client => client.id));
  const pendingApprovalCount = Object.entries(state.clientWorkspaces)
    .filter(([clientId]) => visibleClientIds.has(clientId))
    .reduce((total, [, workspace]) => total + workspace.approvals.filter(approval => !approval.sent).length, 0);

  return (
    <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>
      {!hideStats && <ManagerStats state={state} actions={actions} />}
      <div style={{ display: "grid", gridTemplateColumns: ov2col(state.isMobile), gap: "0.85rem" }}>
        <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
          <div style={css("padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;justify-content:space-between")}>
            <h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>My Tasks — Due Soon</h3>
            <button onClick={() => actions.setView("tasks")} style={css("font-size:var(--text-xs);color:var(--accent);background:none;border:none;cursor:pointer;font-weight:500;display:flex;align-items:center;gap:var(--space-1)")}>Open task board <Icon name="arrow" size={13} /></button>
          </div>
          {myDue.map(t => (
            <div key={t.id} onClick={() => actions.advanceTask(t.id)} className="pt-row" style={css("display:flex;align-items:center;gap:0.65rem;padding:0.7rem 1.1rem;border-bottom:1px solid var(--border-soft);cursor:pointer")}>
              <span style={css("width:0.5rem;height:0.5rem;border-radius:50%;background:" + prioColor(t.priority) + ";flex-shrink:0")} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={css("font-weight:500;font-size:var(--text-base)")}>{t.title}</div>
                <div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{t.project}</div>
              </div>
              <span style={css(statusPill(STATUS_MAP[t.status]))}>{STATUS_LABEL[t.status]}</span>
              <span style={css("font-size:var(--text-xs);color:var(--fg-muted);width:2.6rem;text-align:right")}>{t.due}</span>
            </div>
          ))}
          {myDue.length === 0 && <div style={css("padding:1.5rem 1rem;text-align:center;color:var(--fg-faint);font-size:var(--text-xs)")}>No assigned tasks yet.</div>}
        </div>
        <div style={css("display:flex;flex-direction:column;gap:0.85rem;min-width:0")}>
          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
            <div style={css("padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft)")}><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Assigned Clients</h3></div>
            <div data-assigned-client-scroll style={css("height:19.25rem;max-height:19.25rem;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable")}>
            {projects.map(p => {
              const hm = healthMap(p.health);
              return (
                <div key={p.id} onClick={() => actions.openClientDetail(p.client)} className="pt-row" style={css("box-sizing:border-box;min-height:3.85rem;display:flex;align-items:center;gap:0.65rem;padding:0.7rem 1.1rem;border-bottom:1px solid var(--border-soft);cursor:pointer")}>
                  <span style={css("width:1.95rem;height:1.95rem;border-radius:var(--radius-sm);background:var(--accent-soft);color:var(--accent);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:500;font-size:var(--text-xs)")}>{p.client[0]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={css("font-weight:500;font-size:var(--text-base)")}>{p.client}</div>
                    <div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{p.name} · {p.stage}</div>
                  </div>
                  <span style={css(statusPill(hm[0]))}>{hm[1]}</span>
                </div>
              );
            })}
            {projects.length === 0 && <div style={css("padding:1.5rem 1rem;text-align:center;color:var(--fg-faint);font-size:var(--text-xs)")}>No assigned clients yet.</div>}
            </div>
          </div>
          {pendingApprovalCount > 0 && <div style={css("position:relative;overflow:hidden;border-radius:var(--radius-panel);background:oklch(0.985 0.012 22);padding:1rem 1.1rem;box-shadow:inset 0 0 0 1px oklch(0.88 0.04 20 / 0.32)")}>
            <div style={css("display:flex;align-items:center;gap:0.45rem;color:var(--accent);margin-bottom:0.35rem")}><Icon name="clock" size={16} /><span style={css("font-weight:500;font-size:var(--text-md)")}>Awaiting Client</span></div>
            <p style={css("margin:0 0 0.75rem;font-size:var(--text-sm);color:var(--fg-muted);line-height:1.45")}>{pendingApprovalCount} approval{pendingApprovalCount === 1 ? " is" : "s are"} waiting for a client decision.</p>
            <button onClick={() => actions.setView("review")} style={css("width:100%;height:2rem;border-radius:var(--radius-pill);border:none;background:var(--accent);color:#fff;font-weight:500;font-size:var(--text-sm);cursor:pointer")}>Open approvals</button>
          </div>}
        </div>
      </div>
    </div>
  );
}
