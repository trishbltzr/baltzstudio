"use client";

import { useState } from "react";
import { Icon } from "../icons";
import { css, eyebrowStyle, roleBadgeStyle, roleMeta, sidebarEyebrowStyle } from "../helpers";
import { MOBILE_PRIMARY_VIEWS } from "../navigation";
import { inboxUnread } from "../selectors";
import type { PortalActions, PortalState } from "../store";
import type { Role, View } from "../types";

type NavItem = [View, string, string];
type NavSec = [string, NavItem[]];

const NAVSECS: Record<Role, NavSec[]> = {
  admin: [
    ["", [["progress", "Snapshot", "snapshot"]]],
    ["Delivery", [["clients", "Clients", "briefcase"], ["tasks", "To-do's", "checklist"]]],
    ["Engines", [["audits_new", "Audits", "audit"], ["funnels", "Funnels", "funnel"]]],
    ["Communication", [["inbox", "Inbox", "inbox"], ["activity", "Activity", "activity"]]],
    ["Studio", [["team", "Team", "users"], ["playbooks", "Playbooks", "layers"], ["billing", "Billing", "wallet"]]],
  ],
  dev: [
    ["", [["progress", "Snapshot", "snapshot"]]],
    ["Delivery", [["clients", "Clients", "briefcase"], ["tasks", "To-do's", "checklist"], ["review", "Approvals", "flag"]]],
    ["Engines", [["audits_new", "Audits", "audit"], ["funnels", "Funnels", "funnel"]]],
    ["Communication", [["inbox", "Inbox", "inbox"]]],
    ["Studio", [["playbooks", "Playbooks", "layers"]]],
  ],
  client: [
    ["", [["progress", "Snapshot", "snapshot"]]],
    ["Your Project", [["milestones", "Journey", "feather"], ["tasks", "To-do's", "checklist"]]],
    ["Engines", [["audit", "Audits", "audit"], ["funnels", "Funnels", "funnel"]]],
    ["Collaboration", [["inbox", "Inbox", "inbox"], ["activity", "Activity", "activity"], ["files", "Files", "file"]]],
  ],
};

// ── One shared geometry for the whole sidebar ────────────────────────────────
// Every icon (workspace mark, nav glyphs, account avatar) is centred on the same
// vertical rail, and every label starts at the same x — in both collapsed and
// expanded states, so nothing shifts when you toggle.
const RAIL_W = "4rem";        // collapsed width (= 64px)
const FULL_W = "16rem";       // expanded width
const SPAD = "0.55rem";       // sidebar horizontal padding
const ROWPAD = "0.5rem";      // inner row padding (inset inside the hover pill)
const ROW_INSET = "1.05rem";  // SPAD + ROWPAD — lands the icon centre on the 2rem rail
const ICON = "1.9rem";        // icon slot — SPAD + ROWPAD + ICON/2 = 2rem = rail centre
const GAP = "0.6rem";         // icon → label gap
// The content header (Portal.tsx) is 0.48rem top pad + 3rem TopBar + 0.48rem
// bottom pad, with a 1.5px bottom border. The sidebar header mirrors that height
// (and border) so both header rows — and their dividers — line up exactly.
const HEADER_H = "calc(3.96rem + 1px)"; // 0.48 + 3 + 0.48 + the 1px border

export function Sidebar({ state, actions, rail, onLogout }: { state: PortalState; actions: PortalActions; rail: boolean; onLogout: () => void }) {
  const { role, view, isMobile, navOpen } = state;
  const textOpen = isMobile || !rail;
  const meta = roleMeta(role);
  const [footerDismissed, setFooterDismissed] = useState(false);
  const ease = "cubic-bezier(.22,1,.36,1)";
  const width = isMobile ? "min(18.5rem,calc(100vw - 3rem))" : (rail ? RAIL_W : FULL_W);

  const brandContext: Record<Role, string> = { admin: "Studio Workspace", dev: "Delivery Workspace", client: "Client Portal" };

  // Match the content header's height + divider on desktop so the two line up.
  const headerH = isMobile ? "3.4rem" : HEADER_H;
  const headerBorder = isMobile ? "1px solid color-mix(in srgb,var(--border-soft) 78%,white 22%)" : "1px solid color-mix(in srgb,var(--border-soft) 72%,white 28%)";

  const base = "box-sizing:border-box;background:var(--surface);border-right:1px solid color-mix(in srgb,var(--border-soft) 68%,white 32%);display:flex;flex-direction:column;align-items:stretch;position:fixed;top:0;left:0;overflow:hidden;";
  const asideStyle = isMobile
    ? base + "width:" + width + ";height:100dvh;padding:0.95rem " + SPAD + " 0.9rem;z-index:70;transition:transform .25s ease;transform:translateX(" + (navOpen ? "0" : "-105%") + ")"
    : base + "width:" + width + ";height:100dvh;padding:0 " + SPAD + " 0.9rem;z-index:20;transition:width .28s " + ease;

  // Text that slides away as the rail collapses.
  const slideInline = (max: string, extra = "") =>
    "overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:" + (textOpen ? max : "0") + ";opacity:" + (textOpen ? "1" : "0") + ";transition:max-width .28s " + ease + ",opacity .15s ease;" + extra;
  const slideBlock = (max: string, extra = "") =>
    "overflow:hidden;max-height:" + (textOpen ? max : "0") + ";opacity:" + (textOpen ? "1" : "0") + ";transition:max-height .28s " + ease + ",opacity .15s ease;" + extra;

  // The icon cell — placed so its centre is exactly on the 2rem rail.
  const iconCell = "position:relative;width:" + ICON + ";height:" + ICON + ";display:grid;place-items:center;flex-shrink:0;";

  const unread = inboxUnread(state);
  const openEsc = state.escalations.filter(e => !e.resolved).length;
  const badgeFor = (id: string): number | null => {
    if ((role === "admin" || role === "dev") && id === "inbox") return (unread + (role === "admin" ? openEsc : 0)) || null;
    if (role === "dev" && id === "review") return 2;
    return null;
  };

  const accountPop = state.sidePop === "account";
  const hiddenOnMobile = new Set(isMobile ? MOBILE_PRIMARY_VIEWS[role] : []);
  const accountPopoverStyle = rail
    ? "position:absolute;bottom:0;left:calc(100% + 0.55rem);width:11rem;z-index:60;background:var(--surface);border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.4rem;display:flex;flex-direction:column;gap:0.1rem"
    : "position:absolute;bottom:100%;left:0;right:0;margin-bottom:0.4rem;z-index:60;background:var(--surface);border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.4rem;display:flex;flex-direction:column;gap:0.1rem";

  const accountMenu: { label: string; icon: string; onClick: () => void }[] = [
    { label: "Profile", icon: "user", onClick: () => { actions.patch({ sidePop: null }); actions.setView("profile"); } },
    ...(role === "admin" || role === "dev" ? [{ label: "Settings", icon: "sliders", onClick: () => { actions.patch({ sidePop: null }); actions.setView("settings"); } }] : []),
    { label: "Log Out", icon: "logout", onClick: () => { actions.patch({ sidePop: null }); onLogout(); } },
  ];

  // ── one primitive for every clickable row (nav + account) ──────────────────
  const rowBase = rail
    ? "display:flex;align-items:center;justify-content:center;width:100%;padding:0.28rem 0;border:0;background:transparent;cursor:pointer;"
    : "display:flex;align-items:center;gap:" + GAP + ";width:100%;padding:0 " + ROWPAD + ";border:0;background:transparent;cursor:pointer;text-align:left;";

  const badgePip = (badge: number, active: boolean) =>
    "position:absolute;top:-0.22rem;right:-0.28rem;min-width:1.05rem;height:1.05rem;padding:0 0.28rem;border-radius:999px;font-size:0.6rem;font-weight:500;display:inline-flex;align-items:center;justify-content:center;border:2px solid var(--surface);" + (active ? "background:oklch(1 0 0 / 0.96);color:var(--accent)" : "background:var(--accent);color:#fff");

  const sidebarContent = (
    <>
      {isMobile && navOpen && <div onClick={() => actions.patch({ navOpen: false, sidePop: null })} style={{ position: "fixed", inset: 0, zIndex: 69, background: "rgba(34,25,18,.12)" }} />}
      <aside style={css(asideStyle)}>

        {/* workspace header — height + divider matched to the content TopBar so
            the mark lines up with the page title and the borders form one line.
            Negative margin lets the divider span the sidebar's full width. */}
        <div style={css("flex-shrink:0;display:flex;align-items:center;gap:" + (rail ? "0" : GAP) + ";height:" + headerH + ";margin:0 -" + SPAD + ";padding:0 " + (rail ? "0" : ROW_INSET) + ";border-bottom:" + headerBorder + (rail ? ";justify-content:center" : ""))}>
          <span style={css(iconCell + "border-radius:50%;background:var(--fg);color:var(--surface);font-size:0.8rem;font-weight:500")}>BS</span>
          <span style={css("flex:1;min-width:0;" + slideInline("11rem"))}>
            <strong style={css("display:block;font-size:0.9rem;font-weight:500;line-height:1.2;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>Baltazar Studio</strong>
            <small style={css("display:block;margin-top:0.05rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" + sidebarEyebrowStyle("var(--fg-muted)"))}>{brandContext[role]}</small>
          </span>
        </div>

        {/* nav */}
        <nav style={css("flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:0.12rem;padding-top:0.7rem")}>
          {NAVSECS[role].map((sec, si) => (
            <div key={si} style={{ display: "contents" }}>
              {sec[0] && (
                <div style={css("padding:0.62rem " + ROWPAD + " 0.24rem;" + slideBlock("2rem", eyebrowStyle("var(--fg-faint)")))}>{sec[0]}</div>
              )}
              {sec[1].map(([id, label, ic]) => {
                if (isMobile && hiddenOnMobile.has(id)) return null;
                const active = view === id;
                const badge = badgeFor(id);
                return (
                  <button
                    key={id}
                    title={rail ? label : undefined}
                    onClick={() => actions.setView(id)}
                    className={"pt-navitem" + (active ? " is-active" : "")}
                    style={css(rowBase + "height:2.4rem;border-radius:var(--radius-pill);color:" + (active ? "#fff" : "var(--fg)") + ";" + (active ? "background:var(--accent);" : ""))}
                  >
                    <span style={css(iconCell + "color:" + (active ? "#fff" : "var(--fg)"))}>
                      <Icon name={ic} size={18} />
                      {badge != null && <span style={css(badgePip(badge, active))}>{badge}</span>}
                    </span>
                    {!rail && <span style={css("flex:1;min-width:0;font-size:0.9rem;font-weight:500;" + slideInline("9rem"))}>{label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* dev escalate card (expanded only) */}
        {role === "dev" && !footerDismissed && !rail && (
          <div style={css("flex-shrink:0;margin-top:0.7rem;position:relative;overflow:hidden;border-radius:var(--radius);background:oklch(0.985 0.012 22);padding:0.8rem;border:1px solid oklch(0.88 0.04 20 / 0.32)")}>
            <button onClick={() => setFooterDismissed(true)} title="Dismiss" className="pt-menuitem" style={css("position:absolute;top:0.4rem;right:0.4rem;width:1.35rem;height:1.35rem;display:grid;place-items:center;border:none;background:transparent;color:var(--fg-faint);cursor:pointer;border-radius:50%")}><Icon name="x" size={13} /></button>
            <div style={css(eyebrowStyle("var(--accent)"))}>Need Access?</div>
            <div style={css("font-size:0.86rem;font-weight:500;color:var(--fg);line-height:1.25;margin-top:0.15rem;padding-right:1rem")}>Escalate</div>
            <p style={css("font-size:0.74rem;color:var(--fg-muted);line-height:1.42;margin-top:0.3rem")}>For billing, roles or out-of-scope calls.</p>
            <button onClick={() => actions.showToast("Decision escalated to Trish (Admin)")} className="pt-op" style={css("margin-top:0.6rem;width:100%;height:2rem;border-radius:var(--radius-pill);background:var(--accent);color:#fff;border:none;font-size:0.8rem;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center")}>Escalate</button>
          </div>
        )}

        {/* account footer */}
        <div style={css("flex-shrink:0;margin-top:0.7rem;padding-top:0.7rem;border-top:1px solid var(--border-soft);position:relative")}>
          <button
            onClick={() => actions.patch({ sidePop: accountPop ? null : "account" })}
            className="pt-navitem"
            style={css(rowBase + "height:2.85rem;border-radius:" + (rail ? "999px" : "var(--radius)"))}
          >
            <span style={css(iconCell + "border-radius:50%;background:var(--accent);color:var(--surface);font-size:var(--text-2xs);font-weight:500")}>{meta.init}</span>
            <span style={css("flex:1;min-width:0;" + slideInline("8rem"))}>
              <strong style={css("display:block;font-weight:500;font-size:var(--text-base);line-height:1.2;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{meta.name}</strong>
              <small style={css("display:block;color:var(--fg-muted);font-size:var(--text-xs);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{meta.sub}</small>
            </span>
            {!rail && <span style={css(roleBadgeStyle(meta.badge))}>{meta.label}</span>}
          </button>
          {accountPop && (
            <>
              <div onClick={() => actions.patch({ sidePop: null })} style={{ position: "fixed", inset: 0, zIndex: 55 }} />
              <div style={css(accountPopoverStyle)}>
                {accountMenu.map(a => (
                  <button key={a.label} onClick={a.onClick} className="pt-menuitem" style={css("display:flex;align-items:center;gap:0.6rem;width:100%;padding:0.5rem 0.55rem;border:0;border-radius:0.5rem;background:transparent;cursor:pointer")}>
                    <span style={{ flexShrink: 0, display: "flex", color: "var(--fg-muted)" }}><Icon name={a.icon} size={16} /></span>
                    <span style={css("flex:1;text-align:left;font-size:0.8rem;font-weight:500;color:var(--fg)")}>{a.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );

  if (isMobile) return sidebarContent;

  return <div style={css("width:" + width + ";flex-shrink:0;position:relative;transition:width .28s " + ease)}>{sidebarContent}</div>;
}
