"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "../icons";
import { css, initials, roleMeta } from "../helpers";
import { MY_CLIENTS } from "../data";
import { DEFAULT_CLIENT_NAME } from "../clients";
import type { PortalActions, PortalState } from "../store";
import type { Thread } from "../types";

// [label, dot/text colour, soft bg] per thread status.
const STATUS_META: Record<string, [string, string, string]> = {
  open: ["Open", "var(--warn)", "var(--warn-soft)"],
  progress: ["In Progress", "var(--accent)", "var(--accent-soft)"],
  resolved: ["Resolved", "var(--success)", "var(--success-soft)"],
};
const TEAM_POOL = ["Trisha Baltazar", "Kier Mangibin"];
const CANNED: string[] = [];
const FILTERS: [string, string][] = [["all", "All"], ["unread", "Unread"], ["tickets", "Tickets"], ["mine", "Mine"]];
const CLIENT_PORTAL_NAME = DEFAULT_CLIENT_NAME;

function clockFor(off: number) {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const d = new Date(utc + (off || 0) * 3600000);
  const h = d.getHours(); const m = d.getMinutes();
  const ap = h < 12 ? "AM" : "PM"; let hh = h % 12; if (hh === 0) hh = 12;
  return { time: hh + ":" + String(m).padStart(2, "0") + " " + ap, away: h < 8 || h >= 20 };
}

function DetailField({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div style={css("display:flex;align-items:center;gap:0.6rem;min-width:0")}>
      <span style={css("color:var(--fg-faint);display:flex;flex-shrink:0")}><Icon name={icon} size={15} /></span>
      <span style={css("font-size:var(--text-xs);color:var(--fg-muted);width:4rem;flex-shrink:0")}>{label}</span>
      <span style={css("margin-left:auto;min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:0.4rem;font-size:0.76rem;font-weight:500;color:var(--fg);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{children}</span>
    </div>
  );
}

function InboxDetailsRail({
  thread, clk, actions, isAdmin, onToggleEscalate, mode = "rail", onBack,
}: {
  thread: Thread;
  clk: { time: string; away: boolean };
  actions: PortalActions;
  isAdmin: boolean;
  onToggleEscalate: () => void;
  mode?: "rail" | "panel";
  onBack?: () => void;
}) {
  const status = STATUS_META[thread.status] || STATUS_META.open;
  const lastMessage = thread.messages.at(-1);
  const isPanel = mode === "panel";
  const shellStyle = isPanel
    ? "min-width:0;height:100%;background:var(--surface);display:flex;flex-direction:column;overflow-y:auto"
    : "min-width:0;background:var(--surface);display:flex;flex-direction:column;overflow-y:auto;border-left:1px solid var(--border-soft)";

  return (
    <aside style={css(shellStyle)}>
      {isPanel && (
        <div style={css("padding:0.8rem 0.95rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;justify-content:space-between;gap:0.6rem")}>
          <button type="button" onClick={onBack} className="pt-softbtn" style={css("display:inline-flex;align-items:center;gap:0.32rem;height:1.9rem;padding:0 0.65rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}>
            <Icon name="chevleft" size={14} /> Back
          </button>
          <span style={css("font-size:0.7rem;font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>
            {thread.isTicket ? "Ticket Info" : "Client Profile"}
          </span>
        </div>
      )}
      <div style={css("padding:1.1rem 1.05rem;border-bottom:1px solid var(--border-soft);display:flex;flex-direction:column;align-items:center;gap:0.55rem;text-align:center")}>
        <span style={css("width:3rem;height:3rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:var(--text-base);font-weight:500;display:grid;place-items:center;flex-shrink:0")}>{initials(thread.name)}</span>
        <div style={{ minWidth: 0 }}>
          <div style={css("font-size:0.9rem;font-weight:500;color:var(--fg);line-height:1.2")}>{thread.name}</div>
          <div style={css("font-size:0.68rem;color:var(--fg-muted);margin-top:0.1rem")}>{thread.clientName}</div>
        </div>
        <div style={css("display:flex;align-items:center;gap:0.35rem;font-size:var(--text-2xs);color:var(--fg-muted);background:var(--surface-alt);border:1px solid var(--border-soft);padding:0.22rem 0.55rem;border-radius:var(--radius-pill)")}>
          <span style={css("width:0.45rem;height:0.45rem;border-radius:50%;background:" + (clk.away ? "var(--fg-faint)" : "var(--success)"))} />
          {clk.time} · {thread.tzLabel}
        </div>
        <div style={css("display:flex;gap:0.4rem;margin-top:0.15rem")}>
          <button type="button" onClick={() => { const el = document.querySelector<HTMLInputElement>(".pt-composer input"); el?.focus(); }} className="pt-softbtn" style={css("width:2rem;height:2rem;border-radius:50%;border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")} title="Message"><Icon name="msg" size={15} /></button>
          <button type="button" onClick={() => actions.openThreadClientDetail(thread.id)} className="pt-softbtn" style={css("width:2rem;height:2rem;border-radius:50%;border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")} title="Client"><Icon name="briefcase" size={15} /></button>
        </div>
      </div>

      <div style={css("padding:1rem 1.05rem;display:flex;flex-direction:column;gap:0.72rem;border-bottom:1px solid var(--border-soft)")}>
        <DetailField icon="briefcase" label="Client">{thread.clientName}</DetailField>
        <DetailField icon="user" label="Owner">{thread.assignee}</DetailField>
        <DetailField icon="activity" label="Status">
          <span style={css("display:inline-flex;align-items:center;gap:0.35rem;color:" + status[1])}>
            <span style={css("width:0.45rem;height:0.45rem;border-radius:50%;background:" + status[1])} />
            {status[0]}
          </span>
        </DetailField>
        <DetailField icon="clock" label="Updated">{lastMessage?.time || "—"}</DetailField>
        <DetailField icon="alert" label="Priority">{thread.escalated ? "Escalated" : "Standard"}</DetailField>
        <DetailField icon="ticket" label="Type">{thread.isTicket ? "Ticket" : "Conversation"}</DetailField>
        {thread.isTicket && <DetailField icon="hash" label="Ref">#{thread.ticketId || "—"}</DetailField>}
      </div>

      {lastMessage && (
        <div style={css("padding:1rem 1.05rem;display:flex;flex-direction:column;gap:0.45rem;border-bottom:1px solid var(--border-soft)")}>
          <div style={css("font-size:var(--text-xs);font-weight:500;color:var(--fg)")}>Latest Note</div>
          <p style={css("margin:0;font-size:var(--text-sm);line-height:1.45;color:var(--fg-muted)")}>{lastMessage.text}</p>
        </div>
      )}

      <div style={css("padding:1rem 1.05rem;margin-top:auto;display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap")}>
        <button type="button" onClick={() => actions.createThreadTask(thread.id)} className="pt-softbtn" style={css("height:2rem;padding:0 0.75rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg);font-size:var(--text-xs);font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:0.35rem;cursor:pointer;white-space:nowrap")}>
          <Icon name="checklist" size={14} /> To-do
        </button>
        {!thread.isTicket && (
          <button type="button" onClick={() => actions.createThreadTicket(thread.id)} className="pt-softbtn" style={css("height:2rem;padding:0 0.75rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:0.35rem;cursor:pointer;white-space:nowrap")}>
            <Icon name="plus" size={14} /> Ticket
          </button>
        )}
        {!isAdmin && (
          <button type="button" onClick={onToggleEscalate} className="pt-softbtn" style={css("height:2rem;padding:0 0.75rem;border:1px solid " + (thread.escalated ? "var(--danger)" : "var(--border-soft)") + ";border-radius:var(--radius-pill);background:" + (thread.escalated ? "var(--danger-soft)" : "var(--surface)") + ";color:" + (thread.escalated ? "var(--danger)" : "var(--fg-muted)") + ";font-size:var(--text-xs);font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:0.35rem;cursor:pointer;white-space:nowrap")}>
            <Icon name="alert" size={14} /> {thread.escalated ? "Clear Escalation" : "Escalate"}
          </button>
        )}
      </div>
    </aside>
  );
}

export function Inbox({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const isStudio = state.role === "admin" || state.role === "dev";
  const me = roleMeta(state.role).name;
  const mobile = state.isMobile;
  // Mobile two-step: pick a conversation from the list, then open it full-screen.
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showList = !state.isMobile || !mobileThreadOpen;
  const showConvo = !state.isMobile || mobileThreadOpen;

  let scoped = state.threads;
  if (state.role === "dev") scoped = scoped.filter(t => MY_CLIENTS.includes(t.clientName));
  if (state.role === "client") scoped = scoped.filter(t => t.clientName === CLIENT_PORTAL_NAME && !!t.isTicket && t.messages.some(m => m.from === "client"));

  const filt = state.inboxFilter || "all";
  const activeFilterLabel = FILTERS.find(([k]) => k === filt)?.[1] || "All";
  const q = state.inboxSearch.trim().toLowerCase();
  const matchQ = (t: Thread) => !q || [t.name, t.clientName, t.messages.at(-1)?.text || ""].join(" ").toLowerCase().includes(q);
  const isTicketLane = (t: Thread) => !!t.isTicket || !!t.escalated;
  const matchF = (t: Thread) => filt === "all" || (filt === "unread" && t.unread > 0) || (filt === "tickets" && isTicketLane(t)) || (filt === "mine" && t.assignee === me);
  const fCount = (k: string) => scoped.filter(t => k === "all" || (k === "unread" && t.unread > 0) || (k === "tickets" && isTicketLane(t)) || (k === "mine" && t.assignee === me)).length;
  const list = scoped.filter(t => matchQ(t) && matchF(t)).slice().sort((a, b) => (b.escalated ? 1 : 0) - (a.escalated ? 1 : 0));

  const activeId = scoped.some(t => t.id === state.selectedThreadId) ? state.selectedThreadId : scoped[0]?.id || null;
  const active: Thread | null = activeId ? scoped.find(t => t.id === activeId) || null : null;
  const messages = (active?.messages || []).map(m => ({ ...m, mine: state.role === "client" ? m.from === "client" : m.from === "studio" }));
  const atStatus = active ? STATUS_META[active.status] || STATUS_META.open : STATUS_META.open;
  const clk = clockFor(active?.tzOff || 1);

  const setStatus = (k: string) => {
    if (!active) return;
    actions.update(s => ({ threads: s.threads.map(t => t.id === active.id ? { ...t, status: k as Thread["status"] } : t), statusMenuOpen: false }));
    actions.showToast("Status → " + STATUS_META[k][0]);
  };
  const setAssignee = (n: string) => {
    if (!active) return;
    actions.update(s => ({ threads: s.threads.map(t => t.id === active.id ? { ...t, assignee: n } : t), assignMenuOpen: false }));
    actions.showToast("Assigned to " + n);
  };
  const toggleEscalate = () => {
    if (!active) return;
    actions.update(s => ({ threads: s.threads.map(t => t.id === active.id ? { ...t, escalated: !t.escalated } : t) }));
    actions.showToast(active.escalated ? "Escalation cleared" : "Escalated to Trish (Admin)");
  };

  return (
    <div style={css("display:flex;flex-direction:column;gap:" + (mobile ? "0.7rem" : "0.85rem"))}>
    <div style={css(mobile ? "display:block;min-height:0" : "display:grid;grid-template-columns:2fr 3fr;gap:0.85rem;align-items:stretch;min-height:33rem")}>
      {/* thread list */}
      {showList && !(!mobile && detailsOpen) && (
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;display:flex;flex-direction:column;" + (mobile ? "min-height:28rem" : ""))}>
        <div style={css("padding:0.7rem 0.8rem;border-bottom:1px solid var(--border-soft);display:flex;flex-direction:column;gap:0.6rem")}>
          <div style={css("display:flex;align-items:center;gap:0.45rem;position:relative")}>
            <span style={css("position:absolute;left:0.7rem;color:var(--fg-faint);pointer-events:none;display:flex")}><Icon name="search" size={15} /></span>
            <input value={state.inboxSearch} onChange={e => actions.patch({ inboxSearch: e.target.value })} placeholder="Search conversations…" className="pt-input" style={css("flex:1;border:1px solid var(--border);border-radius:var(--radius-pill);padding:0.5rem 0.9rem 0.5rem 2.15rem;font-size:0.78rem;background:var(--surface-alt);width:100%")} />
            {isStudio && (
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => actions.togglePop("inbox-filters")}
                  className="pt-softbtn"
                  style={css("display:inline-flex;align-items:center;gap:0.42rem;height:2.15rem;padding:0 0.72rem;border:1px solid " + (filt !== "all" ? "var(--accent)" : "var(--border)") + ";border-radius:var(--radius-pill);background:" + (filt !== "all" ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (filt !== "all" ? "var(--accent)" : "var(--fg-muted)") + ";font-size:0.74rem;font-weight:500;cursor:pointer")}
                  title="Filter conversations"
                >
                  <Icon name="sliders" size={15} />
                  {!mobile && <span>{activeFilterLabel}</span>}
                </button>
                {state.pop === "inbox-filters" && (
                  <>
                    <div onClick={() => actions.closePop()} style={{ position: "fixed", inset: 0, zIndex: 24 }} />
                    <div style={css("position:absolute;top:calc(100% + 0.35rem);right:0;z-index:25;min-width:11.5rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;padding:0.24rem")}>
                      {FILTERS.map(([k, l]) => {
                        const on = filt === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => {
                              actions.patch({ inboxFilter: k });
                              actions.closePop();
                            }}
                            className="pt-dditem"
                            style={css("display:flex;align-items:center;justify-content:space-between;gap:0.8rem;width:100%;padding:0.5rem 0.62rem;border:0;border-radius:0.72rem;background:" + (on ? "var(--accent-soft)" : "transparent") + ";color:" + (on ? "var(--accent)" : "var(--fg)") + ";font-size:0.76rem;font-weight:500;cursor:pointer;text-align:left")}
                          >
                            <span>{l}</span>
                            <span style={css("min-width:1.1rem;height:1.1rem;padding:0 0.28rem;border-radius:999px;font-size:0.62rem;font-weight:500;display:inline-flex;align-items:center;justify-content:center;background:" + (on ? "var(--surface)" : "var(--surface-alt)") + ";color:" + (on ? "var(--accent)" : "var(--fg-faint)"))}>{fCount(k)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {isStudio && filt !== "all" && (
            <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem;padding:0 0.1rem")}>
              <span style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>Showing {activeFilterLabel.toLowerCase()} conversations</span>
              <button type="button" onClick={() => actions.patch({ inboxFilter: "all" })} style={css("border:none;background:transparent;color:var(--accent);font-size:var(--text-xs);font-weight:500;cursor:pointer;padding:0")}>
                Clear
              </button>
            </div>
          )}
        </div>
        <div style={css("flex:1;overflow-y:auto;padding:0.62rem;display:flex;flex-direction:column;gap:0.46rem")}>
          {list.map(t => {
            const on = t.id === activeId;
            return (
              <div key={t.id} onClick={() => { actions.selectThread(t.id); if (mobile) setMobileThreadOpen(true); }} style={css("position:relative;display:flex;align-items:flex-start;gap:0.7rem;padding:" + (on && !mobile ? "0.76rem 3rem 0.76rem 0.88rem" : "0.76rem 0.88rem") + ";border:1px solid " + (on && !mobile ? "color-mix(in srgb,var(--accent) 20%,var(--border-soft) 80%)" : "color-mix(in srgb,var(--border-soft) 88%,white 12%)") + ";border-radius:0.95rem;cursor:pointer;transition:background .12s,border-color .12s;" + (on && !mobile ? "background:color-mix(in srgb,var(--accent-soft) 56%,var(--surface) 44%);box-shadow:inset 3px 0 0 var(--accent)" : "background:color-mix(in srgb,var(--surface) 82%,var(--surface-alt) 18%)"))}>
                <span style={css("width:2.15rem;height:2.15rem;border-radius:50%;background:" + (on && !mobile ? "var(--surface)" : "var(--accent-soft)") + ";border:" + (on && !mobile ? "1px solid var(--accent-dim)" : "1px solid transparent") + ";color:var(--accent);font-size:0.68rem;font-weight:500;display:grid;place-items:center;flex-shrink:0")}>{initials(t.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={css("display:flex;align-items:center;gap:0.4rem;padding-right:" + (on && !mobile ? "1rem" : "0"))}>
                    <span style={css("width:0.5rem;height:0.5rem;border-radius:50%;flex-shrink:0;background:" + (STATUS_META[t.status] || STATUS_META.open)[1])} />
                    <span style={css("font-weight:500;font-size:var(--text-base);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{t.name}</span>
                    {t.escalated && <span style={{ color: "var(--danger)", display: "flex", flexShrink: 0 }}><Icon name="alert" size={14} /></span>}
                    {t.isTicket && <span style={css("font-size:0.54rem;font-weight:500;letter-spacing:0.02em;padding:0.08rem 0.35rem;border-radius:5px;background:var(--lane-gate-soft);color:var(--lane-gate);flex-shrink:0")}>Ticket</span>}
                    {!(on && !mobile) && <span style={css("margin-left:auto;font-size:var(--text-2xs);color:var(--fg-faint);flex-shrink:0")}>{t.messages.at(-1)?.time || ""}</span>}
                  </div>
                  <div style={css("display:flex;align-items:center;gap:var(--space-2);margin-top:0.15rem")}>
                    <span style={css("flex:1;min-width:0;font-size:0.74rem;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{(t.isTicket ? "Ticket #" + t.ticketId + " · " : "") + (t.messages.at(-1)?.text || "")}</span>
                    {t.unread > 0 && <span style={css("min-width:1.15rem;height:1.15rem;padding:0 0.32rem;border-radius:999px;background:var(--accent);color:#fff;font-size:0.62rem;font-weight:500;display:grid;place-items:center;flex-shrink:0")}>{t.unread}</span>}
                  </div>
                </div>
                {!mobile && on && (
                  <button
                    type="button"
                    onClick={event => { event.stopPropagation(); setDetailsOpen(true); }}
                    className="pt-iconbtn"
                    title={t.isTicket ? "Show ticket details" : "Show client profile"}
                    style={css("position:absolute;top:0.72rem;right:0.7rem;width:1.7rem;height:1.7rem;border-radius:50%;border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer;flex-shrink:0")}
                  >
                    <Icon name="dots" size={14} />
                  </button>
                )}
              </div>
            );
          })}
          {list.length === 0 && <div style={css("padding:2.5rem 1rem;text-align:center;color:var(--fg-faint);font-size:0.8rem")}>No conversations match.</div>}
        </div>
      </div>
      )}

      {!mobile && detailsOpen && active && (
        <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;min-height:33rem")}>
          <InboxDetailsRail
            thread={active}
            clk={clk}
            actions={actions}
            isAdmin={state.role === "admin"}
            onToggleEscalate={toggleEscalate}
            mode="panel"
            onBack={() => setDetailsOpen(false)}
          />
        </div>
      )}

      {/* conversation */}
      {showConvo && active && (
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;" + (mobile ? ";display:flex;flex-direction:column;min-height:0" : ";display:flex;flex-direction:column;min-height:33rem"))}>
      <div style={css("display:flex;flex-direction:column;min-width:0;flex:1;min-height:0")}>
        <div style={css("padding:" + (mobile ? "0.72rem 0.85rem" : "0.85rem 1.15rem") + ";border-bottom:1px solid var(--border-soft);display:flex;align-items:" + (mobile ? "flex-start" : "center") + ";gap:" + (mobile ? "0.55rem" : "0.7rem") + ";flex-wrap:" + (mobile ? "wrap" : "nowrap"))}>
          {mobile && <button onClick={() => setMobileThreadOpen(false)} className="pt-iconbtn" style={css("width:2rem;height:2rem;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer;flex-shrink:0;margin-top:0.05rem")}><Icon name="chevleft" size={16} /></button>}
          <span style={css("width:" + (mobile ? "2.1rem" : "2.3rem") + ";height:" + (mobile ? "2.1rem" : "2.3rem") + ";border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:0.7rem;font-weight:500;display:grid;place-items:center;flex-shrink:0")}>{initials(active.name)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={css("font-weight:500;font-size:" + (mobile ? "0.96rem" : "0.92rem") + ";line-height:1.15")}>{active.name}</div>
            <div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{active.clientName}</div>
          </div>
          <span style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:0.68rem;color:var(--fg-muted);background:var(--surface-alt);border:1px solid var(--border-soft);padding:0.22rem 0.55rem;border-radius:var(--radius-pill);flex-shrink:0;" + (mobile ? "margin-left:2.55rem;max-width:calc(100% - 2.55rem);overflow:hidden;white-space:nowrap" : ""))}>
            <span style={css("width:0.45rem;height:0.45rem;border-radius:50%;background:" + (clk.away ? "var(--fg-faint)" : "var(--success)"))} />{clk.time} · {active.tzLabel}
          </span>
        </div>

        {isStudio && (
          <div style={css("padding:" + (mobile ? "0.5rem 0.85rem" : "0.55rem 1.15rem") + ";border-bottom:1px solid var(--border-soft);display:flex;align-items:center;gap:" + (mobile ? "0.36rem" : "0.5rem") + ";flex-wrap:wrap;background:oklch(0.99 0.004 60)")}>
            {/* status dropdown */}
            <div style={{ position: "relative" }}>
              <span onClick={() => actions.patch({ statusMenuOpen: !state.statusMenuOpen, assignMenuOpen: false })} style={css("display:inline-flex;align-items:center;gap:0.36rem;font-size:0.68rem;font-weight:500;padding:0.26rem 0.56rem;border-radius:var(--radius-pill);cursor:pointer;background:" + atStatus[2] + ";color:" + atStatus[1])}><span style={css("width:0.5rem;height:0.5rem;border-radius:50%;background:" + atStatus[1])} />{atStatus[0]}<Icon name="chev" size={12} /></span>
              {state.statusMenuOpen && (
                <>
                  <div onClick={() => actions.patch({ statusMenuOpen: false })} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
                  <div style={css("position:absolute;top:calc(100% + 0.3rem);left:0;z-index:20;min-width:9rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;padding:0.2rem 0")}>
                    {(["open", "progress", "resolved"]).map(k => {
                      const mm = STATUS_META[k];
                      return <button key={k} onClick={() => setStatus(k)} className="pt-dditem" style={css("display:flex;align-items:center;gap:var(--space-2);width:100%;padding:0.5rem 0.75rem;border:0;background:" + (active.status === k ? "var(--surface-alt)" : "transparent") + ";font-size:0.78rem;color:var(--fg);cursor:pointer;text-align:left")}><span style={css("width:0.5rem;height:0.5rem;border-radius:50%;background:" + mm[1])} />{mm[0]}</button>;
                    })}
                  </div>
                </>
              )}
            </div>
            {/* assignee dropdown */}
            <div style={{ position: "relative" }}>
              <span onClick={() => actions.patch({ assignMenuOpen: !state.assignMenuOpen, statusMenuOpen: false })} style={css("display:inline-flex;align-items:center;gap:0.34rem;font-size:0.7rem;font-weight:500;padding:0.22rem 0.42rem 0.22rem 0.32rem;border-radius:var(--radius-pill);cursor:pointer;border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);max-width:" + (mobile ? "9.2rem" : "none") + ";overflow:hidden;white-space:nowrap")}><span style={css("width:1.3rem;height:1.3rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:0.54rem;font-weight:500;display:grid;place-items:center;flex-shrink:0")}>{initials(active.assignee)}</span><span style={css("overflow:hidden;text-overflow:ellipsis")}>{active.assignee}</span><Icon name="chev" size={12} /></span>
              {state.assignMenuOpen && (
                <>
                  <div onClick={() => actions.patch({ assignMenuOpen: false })} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
                  <div style={css("position:absolute;top:calc(100% + 0.3rem);left:0;z-index:20;min-width:11rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;padding:0.2rem 0")}>
                    {TEAM_POOL.map(n => <button key={n} onClick={() => setAssignee(n)} className="pt-dditem" style={css("display:flex;align-items:center;gap:var(--space-2);width:100%;padding:0.5rem 0.75rem;border:0;background:" + (active.assignee === n ? "var(--surface-alt)" : "transparent") + ";font-size:0.78rem;color:var(--fg);cursor:pointer;text-align:left")}><span style={css("width:1.3rem;height:1.3rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:0.54rem;font-weight:500;display:grid;place-items:center;flex-shrink:0")}>{initials(n)}</span>{n}</button>)}
                  </div>
                </>
              )}
            </div>
            {!mobile && <span style={{ flex: 1 }} />}
            {active.isTicket && <span style={css("font-size:0.62rem;font-weight:500;padding:0.24rem 0.55rem;border-radius:999px;background:var(--lane-gate-soft);color:var(--lane-gate)")}>#{active.ticketId} · {active.category}</span>}
          </div>
        )}

        <div style={css("flex:1;padding:" + (mobile ? "0.95rem 0.85rem" : "1.25rem") + ";overflow-y:auto;display:flex;flex-direction:column;gap:0.65rem;min-height:0;" + (mobile ? "max-height:38dvh;" : "") + "background:var(--surface-alt)")}>
          {messages.map((m, i) => (
            <div key={i} style={css("display:flex;flex-direction:column;align-items:" + (m.mine ? "flex-end" : "flex-start"))}>
              <div style={css("max-width:" + (mobile ? "92%" : "80%") + ";padding:0.55rem 0.8rem;font-size:" + (mobile ? "0.85rem" : "0.82rem") + ";line-height:1.4;" + (m.mine ? "background:var(--accent);color:#fff;border-radius:0.8rem 0.8rem 4px 0.8rem" : "background:var(--surface);border:1px solid var(--border-soft);color:var(--fg);border-radius:0.8rem 0.8rem 0.8rem 4px"))}>{m.text}</div>
              <div style={css("font-size:0.62rem;color:var(--fg-faint);margin-top:0.25rem")}>{(m.by ? m.by + " · " : "") + m.time}</div>
            </div>
          ))}
        </div>

        {isStudio && (
          <div style={css("padding:" + (mobile ? "0.45rem 0.75rem 0" : "0.5rem 0.9rem 0") + ";display:flex;gap:0.36rem;overflow-x:auto;border-top:1px solid var(--border-soft);background:var(--surface)")}>
            {CANNED.map(c => <button key={c} onClick={() => actions.insertCanned(c)} className="pt-iconbtn" style={css("flex-shrink:0;font-size:var(--text-xs);font-weight:500;padding:0.34rem 0.68rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);cursor:pointer;white-space:nowrap")}>{c}</button>)}
          </div>
        )}

        <div style={css("padding:" + (mobile ? "0.62rem 0.75rem 0.75rem" : "0.75rem 0.9rem 0.9rem") + ";background:var(--surface)")}>
          <div className="pt-composer" style={css("display:flex;align-items:center;gap:0.35rem;border:1px solid var(--border);border-radius:var(--radius-pill);padding:0.25rem 0.35rem 0.25rem 0.5rem;background:var(--surface)")}>
            <button onClick={() => actions.showToast("Attach a file")} title="Attach a file" className="pt-softbtn" style={css("width:2rem;height:2rem;border-radius:50%;border:none;background:transparent;color:var(--fg-faint);display:grid;place-items:center;cursor:pointer;flex-shrink:0")}><Icon name="clip" size={16} /></button>
            <input value={state.draft} onChange={e => actions.patch({ draft: e.target.value })} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); actions.sendMsg(); } }} placeholder={mobile ? "Write a message..." : "Write a message…  ⏎ to send"} style={css("flex:1;border:none;background:transparent;padding:0.35rem 0.15rem;font-size:0.85rem;color:var(--fg);min-width:0")} />
            <button onClick={actions.sendMsg} title="Send" className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.35rem;height:2rem;padding:0 " + (mobile ? "0.72rem" : "0.9rem") + ";border-radius:var(--radius-pill);border:none;background:var(--accent);color:#fff;font-size:0.78rem;font-weight:500;cursor:pointer;flex-shrink:0")}><Icon name="arrowup" size={16} />Send</button>
          </div>
          <div style={css("display:flex;justify-content:space-between;align-items:flex-start;gap:0.7rem;flex-wrap:wrap;margin-top:0.45rem;padding:0 0.15rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>
            <span>Sending as {me}</span>
            {!mobile && <span>Enter to send · Shift+Enter for a new line</span>}
          </div>
        </div>
      </div>
      </div>
      )}
      {showConvo && !active && (
        <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;display:grid;place-items:center;min-height:33rem;padding:var(--space-6);text-align:center")}>
          <div>
            <span style={css("width:2.6rem;height:2.6rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;margin:0 auto 0.75rem")}><Icon name="ticket" size={17} /></span>
            <div style={css("font-size:var(--text-lg);font-weight:500;color:var(--fg)")}>No tickets yet</div>
            <p style={css("margin:0.35rem auto 0;max-width:20rem;font-size:0.78rem;line-height:1.45;color:var(--fg-muted)")}>Tickets you send to the studio will appear here with their full conversation history.</p>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
