"use client";

import { memo } from "react";
import { Icon, SidebarToggleIcon } from "../icons";
import { css, headFor } from "../helpers";
import { quickActionsForState, runQuickAction } from "../navigation";
import { portalNotificationSummary } from "../selectors";
import type { PortalActions } from "../store";
import type { View } from "../types";
import type { TopBarShellState } from "./types";

const ROLE_SWITCH_OPTIONS: Array<{ id: "admin" | "dev" | "client"; label: string }> = [
  { id: "admin", label: "Admin" },
  { id: "dev", label: "Manager" },
  { id: "client", label: "Client" },
];

function TopBarComponent({ state, actions, onCollapse }: { state: TopBarShellState; actions: PortalActions; onCollapse: () => void }) {
  const { role, view, isMobile, notifOpen } = state;
  const [, title] = headFor(view, role);
  const notificationSummary = portalNotificationSummary(state);
  const visibleNotificationItems = notificationSummary.items.slice(0, 5);
  const remainingNotificationCount = Math.max(0, notificationSummary.count - visibleNotificationItems.length);
  const quickOpen = state.pop === "quick";
  const notifTarget: View = notificationSummary.target;
  const notifTargetLabel = notificationSummary.targetLabel;
  const quickActions = quickActionsForState(state);
  const showQuickCreate = !isMobile && !state.previewFrom && quickActions.length > 0;
  const quickActionLabel = "New";
  const desktopHeaderHeight = "3rem";
  const titleFontSize = isMobile ? "1.28rem" : "1.24rem";
  const usesReplacementSidebar = !isMobile && state.guidedSidebarActive;
  const leadingControlSize = "2.05rem";
  const showRoleSwitcher = state.canSwitchRoles && !isMobile;
  const openNotification = (item: (typeof visibleNotificationItems)[number]) => {
    actions.markNotificationRead(item.id);
    if (item.deepLink.serviceRunId) {
      window.location.assign(`/dashboard?view=activity&serviceRunId=${encodeURIComponent(item.deepLink.serviceRunId)}`);
      return;
    }
    if (item.deepLink.taskId) actions.patch({ taskModal: item.deepLink.taskId });
    if (item.deepLink.threadId) actions.patch({ selectedThreadId: item.deepLink.threadId });
    actions.setView(item.deepLink.view);
  };

  return (
    <div style={css("display:flex;flex-direction:column;gap:0;min-height:" + (isMobile ? "auto" : desktopHeaderHeight))}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:" + (isMobile ? "0.7rem" : "1rem") + ";flex-wrap:" + (isMobile ? "nowrap" : "wrap"))}>
        <div style={css("display:flex;align-items:center;gap:0.7rem;min-width:0;flex:1;min-height:" + (isMobile ? "auto" : desktopHeaderHeight))}>
        {isMobile ? (
          <button onClick={() => actions.patch({ navOpen: !state.navOpen, sidePop: null, pop: null, notifOpen: false })} title="Open navigation" className="pt-iconbtn" style={css("flex-shrink:0;width:2.05rem;height:2.05rem;border-radius:50%;border:1px solid var(--border);background:var(--surface);display:grid;place-items:center;color:var(--fg-muted);cursor:pointer")}>
            <Icon name={state.navOpen ? "x" : "menu"} size={18} />
          </button>
        ) : (
          <button
            onClick={() => {
              if (usesReplacementSidebar) {
                actions.patch({ guidedSidebarExitTick: state.guidedSidebarExitTick + 1 });
              } else {
                onCollapse();
              }
            }}
            title={usesReplacementSidebar ? "Back to all clients" : (state.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar")}
            className="pt-iconbtn"
            style={css("flex-shrink:0;width:" + leadingControlSize + ";height:" + leadingControlSize + ";border-radius:50%;border:1px solid var(--border);background:var(--surface);display:grid;place-items:center;color:var(--fg-muted);cursor:pointer")}
          >
            {usesReplacementSidebar ? <Icon name="chevleft" size={18} /> : <SidebarToggleIcon collapsed={state.sidebarCollapsed} size={18} />}
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={css("margin:" + (isMobile ? "0" : "0.04rem 0 0") + ";font-size:" + titleFontSize + ";font-weight:500;line-height:1.06;letter-spacing:-0.01em")}>{title}</h1>
        </div>
        </div>

        <div style={css("display:flex;align-items:center;gap:0.55rem;flex-wrap:" + (isMobile ? "nowrap" : "wrap") + ";justify-content:flex-end;flex-shrink:0")}>
        {showRoleSwitcher && (
          <div style={css("display:inline-flex;align-items:center;gap:0.4rem;min-width:0;margin-right:0.05rem")}>
            <span style={css("font-size:var(--text-2xs);font-weight:500;color:var(--fg-faint);white-space:nowrap")}>Viewing as</span>
            <div style={css("display:inline-flex;align-items:center;gap:0.06rem;padding:0.1rem;background:var(--surface);border:1px solid color-mix(in srgb,var(--border-soft) 88%,white 12%);border-radius:999px")}>
              {ROLE_SWITCH_OPTIONS.map(option => {
                const active = role === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => actions.setRole(option.id)}
                    aria-pressed={active}
                    style={css(
                      "height:1.78rem;padding:0 0.72rem;border:none;border-radius:999px;background:" +
                      (active ? "var(--accent-soft)" : "transparent") +
                      ";color:" + (active ? "var(--accent)" : "var(--fg-muted)") +
                      ";font-size:var(--text-sm);font-weight:500;cursor:pointer;white-space:nowrap"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <button onClick={() => actions.patch({ paletteOpen: true, paletteQuery: "" })} title="Search — ⌘K" className="pt-iconbtn" style={css("display:inline-flex;align-items:center;justify-content:center;gap:0.6rem;height:" + (isMobile ? "2.05rem" : "2.35rem") + ";min-width:" + (isMobile ? "2.05rem" : "12rem") + ";padding:" + (isMobile ? "0" : "0 0.85rem 0 0.78rem") + ";border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-faint);font-size:var(--text-sm);font-weight:500;cursor:pointer;flex-shrink:0")}>
          <Icon name="search" size={16} />
          {!isMobile && <span style={css("flex:1;text-align:left")}>Search</span>}
          {!isMobile && <span style={css("display:inline-flex;align-items:center;padding:0.05rem 0.3rem;border-radius:0.3rem;background:var(--surface-alt);border:1px solid var(--border-soft);font-size:var(--text-2xs);color:var(--fg-faint);line-height:1")}>⌘K</span>}
        </button>

        <div style={{ position: "relative" }}>
          <button aria-label="Workspace updates" onClick={() => actions.patch({ notifOpen: !notifOpen, pop: null })} className="pt-iconbtn" style={css("position:relative;width:2.05rem;height:2.05rem;border-radius:50%;border:1px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--fg-muted);cursor:pointer")}>
            <Icon name="bell" size={17} />
            {notificationSummary.count > 0 && <span style={css("position:absolute;top:0.35rem;right:0.38rem;width:0.42rem;height:0.42rem;border-radius:50%;background:var(--accent);border:1.5px solid var(--surface)")} />}
          </button>
          {notifOpen && (
            <>
              <div onClick={() => actions.patch({ notifOpen: false })} style={{ position: "fixed", inset: 0, zIndex: 39 }} />
              <div style={{ ...css("position:absolute;top:2.5rem;right:0;width:20rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;z-index:40"), animation: "pt-ddin .15s ease" }}>
                <div style={css("padding:0.7rem 0.9rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;justify-content:space-between")}>
                  <span style={css("font-weight:500;font-size:var(--text-base)")}>Workspace updates</span>
                  <button onClick={() => actions.setView(notifTarget as View)} style={css("color:var(--accent);font-size:var(--text-2xs);font-weight:500;background:none;border:none;cursor:pointer")}>{notifTargetLabel}</button>
                </div>
                <div style={css("padding:0.85rem 0.9rem")}>
                  <div style={css("display:flex;align-items:center;gap:0.45rem;font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>
                    <Icon name="bell" size={13} />{notificationSummary.count} Updates
                  </div>
                  <p style={css("margin:0.45rem 0 0;font-size:var(--text-base);line-height:1.5;color:var(--fg)")}>{notificationSummary.lead}</p>
                  <div style={css("display:flex;flex-direction:column;gap:0.42rem;margin-top:0.75rem")}>
                    {visibleNotificationItems.map((item, index) => (
                      <button key={item.id} type="button" onClick={() => openNotification(item)} style={css("display:flex;gap:var(--space-2);align-items:flex-start;width:100%;padding:0;border:none;background:transparent;text-align:left;font:inherit;font-size:var(--text-xs);line-height:1.4;color:var(--fg-muted);cursor:pointer")}>
                        <span style={css("width:1.1rem;height:1.1rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0;font-size:var(--text-2xs);font-weight:500")}>{index + 1}</span>
                        <span>{item.message}</span>
                      </button>
                    ))}
                    {remainingNotificationCount > 0 && (
                      <button type="button" onClick={() => actions.setView(notifTarget)} style={css("align-self:flex-start;margin-left:1.55rem;padding:0;border:none;background:transparent;color:var(--accent);font:inherit;font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>
                        +{remainingNotificationCount} more update{remainingNotificationCount === 1 ? "" : "s"}
                      </button>
                    )}
                  </div>
                  <div style={css("margin-top:0.75rem;padding-top:0.65rem;border-top:1px solid var(--border-soft);font-size:var(--text-2xs);color:var(--fg-faint);line-height:1.4")}>
                    Activity keeps the detailed edit history.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {showQuickCreate && (
          <div style={{ position: "relative" }}>
            <button onClick={() => actions.togglePop("quick")} title={quickActionLabel} className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.4rem;height:2.05rem;padding:0 0.82rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:var(--text-xs);font-weight:500;cursor:pointer")}><Icon name="plus" size={15} />{quickActionLabel}</button>
            {quickOpen && (
              <>
                <div onClick={() => actions.closePop()} style={{ position: "fixed", inset: 0, zIndex: 54 }} />
                <div style={{ ...css("position:absolute;top:2.55rem;right:0;width:18.4rem;border:1px solid color-mix(in srgb,var(--border-soft) 80%,white 20%);border-radius:1.2rem;background:var(--surface);padding:var(--space-2);z-index:55"), animation: "pt-ddin .15s ease" }}>
                  {quickActions.map(q => (
                    <button key={q.label} onClick={() => { actions.closePop(); runQuickAction(q, state, actions); }} className="pt-dditem" style={css("display:grid;grid-template-columns:1.9rem minmax(0,1fr) auto;align-items:center;gap:0.58rem;width:100%;text-align:left;padding:0.5rem 0.54rem;border:none;border-radius:0.95rem;background:transparent;color:var(--fg-muted);cursor:pointer")}>
                      <span style={css("width:1.62rem;height:1.62rem;border-radius:0.48rem;color:var(--fg-muted);display:grid;place-items:center;flex-shrink:0")}><Icon name={q.icon} size={17} /></span>
                      <span style={{ minWidth: 0 }}>
                        <span style={css("display:block;font-size:var(--text-lg);font-weight:500;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{q.label}</span>
                        <span style={css("display:block;font-size:var(--text-2xs);color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{q.sub}</span>
                      </span>
                      <span style={css("width:1.46rem;height:1.46rem;border-radius:50%;display:grid;place-items:center;color:var(--fg-faint);background:color-mix(in srgb,white 74%,var(--surface-alt) 26%)")}><Icon name="arrow" size={12} /></span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}

export const TopBar = memo(TopBarComponent);
