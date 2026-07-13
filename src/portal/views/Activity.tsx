"use client";

import { useState } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import type { PortalState } from "../store";

const ACT_ICON: Record<string, string> = { gate: "flag", file: "file", wise: "wallet", task: "check", msg: "msg", audit: "search", access: "users" };
const ACT_LANE: Record<string, string> = { gate: "var(--lane-gate)", file: "var(--fg-muted)", wise: "var(--lane-ai)", task: "var(--lane-studio)", msg: "var(--lane-client)", audit: "var(--cocoon)", access: "var(--accent)" };
type ActivityRow = { who: string; act: string; obj: string; t: string; k: string };
const ACTIVITY: ActivityRow[] = [];
const FILTERS: [string, string][] = [["all", "All"], ["gate", "Milestones"], ["wise", "Payments"], ["task", "Tasks"], ["file", "Files"]];

export function Activity({ state }: { state?: PortalState }) {
  const [filter, setFilter] = useState("all");
  const clientRows: ActivityRow[] = state?.role === "client"
    ? state.threads
      .filter(thread => thread.clientName === state.clientName && !!thread.isTicket && thread.messages.some(message => message.from === "client"))
      .map(thread => {
        const lastMessage = thread.messages.at(-1);
        return {
          who: "You",
          act: thread.status === "resolved" ? "resolved ticket" : "sent ticket",
          obj: "#" + (thread.ticketId || "—") + " · " + (thread.category || lastMessage?.text || "Studio request"),
          t: lastMessage?.time || "Now",
          k: "msg",
        };
      })
    : [];
  const sourceRows = state?.role === "client" ? clientRows : ACTIVITY;
  const filters = state?.role === "client" ? [["all", "All"]] as [string, string][] : FILTERS;
  const rows = sourceRows.filter(a => filter === "all" || a.k === filter);

  return (
    <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>
      <div style={css("display:flex;gap:0.4rem;flex-wrap:wrap")}>
        {filters.map(([k, l]) => {
          const on = filter === k;
          return <button key={k} onClick={() => setFilter(k)} style={css("padding:0.3rem 0.75rem;border-radius:999px;border:1px solid " + (on ? "transparent" : "var(--border)") + ";cursor:pointer;font-size:0.74rem;font-weight:500;" + (on ? "background:var(--fg);color:#fff" : "background:var(--surface);color:var(--fg-muted)"))}>{l}</button>;
        })}
      </div>
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        {rows.map((a, i) => (
          <div key={i} style={css("display:flex;align-items:center;gap:0.8rem;padding:0.8rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
            <span style={css("width:1.9rem;height:1.9rem;border-radius:50%;background:color-mix(in srgb," + ACT_LANE[a.k] + " 14%,white 86%);color:" + ACT_LANE[a.k] + ";display:grid;place-items:center;flex-shrink:0")}><Icon name={ACT_ICON[a.k]} size={13} /></span>
            <div style={css("flex:1;min-width:0;font-size:0.83rem")}><strong style={{ fontWeight: 500 }}>{a.who}</strong> <span style={{ color: "var(--fg-muted)" }}>{a.act}</span> <strong style={{ fontWeight: 500 }}>{a.obj}</strong></div>
            <span style={css("font-size:var(--text-xs);color:var(--fg-faint);flex-shrink:0")}>{a.t}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={css("padding:2.5rem 1rem;text-align:center;color:var(--fg-muted);font-size:var(--text-base)")}>
            No activity yet.
          </div>
        )}
      </div>
    </div>
  );
}
