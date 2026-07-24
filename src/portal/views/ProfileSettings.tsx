"use client";

import { useState } from "react";
import { css } from "../helpers";
import type { PortalActions, PortalState } from "../store";

export function ProfileSettings({
  state,
  actions,
  mode,
}: {
  state: PortalState;
  actions: PortalActions;
  mode: "profile" | "settings";
}) {
  const [compact, setCompact] = useState(false);
  const notificationToggles = [
    ["Email updates", state.notificationPreferences.emailUpdates, () => actions.updateNotificationPreferences({ emailUpdates: !state.notificationPreferences.emailUpdates })],
    ["Daily digest", state.notificationPreferences.dailyDigest, () => actions.updateNotificationPreferences({ dailyDigest: !state.notificationPreferences.dailyDigest })],
    ["To-do updates", state.notificationPreferences.inApp.tasks, () => actions.updateNotificationPreferences({ inApp: { tasks: !state.notificationPreferences.inApp.tasks } })],
    ["Approval updates", state.notificationPreferences.inApp.approvals, () => actions.updateNotificationPreferences({ inApp: { approvals: !state.notificationPreferences.inApp.approvals } })],
    ["Inbox updates", state.notificationPreferences.inApp.messages, () => actions.updateNotificationPreferences({ inApp: { messages: !state.notificationPreferences.inApp.messages } })],
    ["Service updates", state.notificationPreferences.inApp.service, () => actions.updateNotificationPreferences({ inApp: { service: !state.notificationPreferences.inApp.service } })],
    ["System & access", state.notificationPreferences.inApp.system, () => actions.updateNotificationPreferences({ inApp: { system: !state.notificationPreferences.inApp.system } })],
  ] as const;

  return (
    <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "1.05fr 0.95fr") + ";gap:0.85rem;align-items:start")}>
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.15rem 1.2rem")}>
        <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>{mode === "profile" ? "Account Profile" : "Workspace Settings"}</div>
        <h2 style={css("margin:0.2rem 0 0;font-size:var(--text-xl);font-weight:500")}>{mode === "profile" ? "Profile & preferences" : "Delivery defaults"}</h2>

        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:var(--space-3);margin-top:1rem")}>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);font-weight:500;color:var(--fg-muted)")}>
            Display name
            <input
              defaultValue={state.role === "admin" ? "Trish Baltazar" : state.role === "dev" ? "Studio team" : "Client"}
              className="pt-input"
              style={css("border:1px solid var(--border);border-radius:var(--radius);padding:0.62rem 0.75rem;font-size:var(--text-base);background:var(--surface-alt);color:var(--fg)")}
            />
          </label>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);font-weight:500;color:var(--fg-muted)")}>
            Contact email
            <input
              defaultValue={state.role === "admin" ? "trish@baltazar.studio" : state.role === "dev" ? "studio@baltazar.studio" : "flora@floraandco.com"}
              className="pt-input"
              style={css("border:1px solid var(--border);border-radius:var(--radius);padding:0.62rem 0.75rem;font-size:var(--text-base);background:var(--surface-alt);color:var(--fg)")}
            />
          </label>
        </div>

        <div style={css("display:flex;flex-direction:column;gap:0.7rem;margin-top:1rem")}>
          {[...notificationToggles, ["Compact chrome", compact, () => setCompact(!compact)] as const].map(([label, on, toggle]) => (
            <button
              key={label}
              onClick={toggle}
              style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:0.78rem 0.9rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);cursor:pointer;text-align:left")}
            >
              <span>
                <span style={css("display:block;font-size:var(--text-base);font-weight:500;color:var(--fg)")}>{label}</span>
                <span style={css("display:block;font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.08rem")}>Keeps your workspace aligned with your working style.</span>
              </span>
              <span style={css("width:2.4rem;height:1.4rem;border-radius:999px;display:flex;align-items:center;padding:0.14rem;background:" + (on ? "var(--accent)" : "var(--border)") + ";justify-content:" + (on ? "flex-end" : "flex-start"))}>
                <span style={css("width:1.1rem;height:1.1rem;border-radius:50%;background:#fff")} />
              </span>
            </button>
          ))}
        </div>

        {state.role !== "client" ? (
          <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:var(--space-3);margin-top:1rem")}>
            <fieldset style={css("margin:0;border:1px solid var(--border-soft);border-radius:var(--radius-panel);padding:0.85rem 0.9rem;background:var(--surface)")}>
              <legend style={css("padding:0 0.25rem;font-size:var(--text-sm);font-weight:500;color:var(--fg)")}>Completed client to-dos</legend>
              <div style={css("display:flex;gap:0.45rem;flex-wrap:wrap;margin-top:0.35rem")}>
                {([
                  ["admin_and_assignee", "Admin + assignee"],
                  ["admin_only", "Admin only"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={state.notificationPreferences.taskCompletionRecipients === value}
                    onClick={() => actions.updateNotificationPreferences({ taskCompletionRecipients: value })}
                    className={state.notificationPreferences.taskCompletionRecipients === value ? "pt-op" : undefined}
                    style={css("min-height:2.1rem;padding:0.38rem 0.72rem;border:1px solid " + (state.notificationPreferences.taskCompletionRecipients === value ? "var(--accent)" : "var(--border)") + ";border-radius:var(--radius-pill);background:" + (state.notificationPreferences.taskCompletionRecipients === value ? "var(--accent-soft)" : "var(--surface)") + ";color:var(--fg);font-size:var(--text-xs);font-weight:500;cursor:pointer")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset style={css("margin:0;border:1px solid var(--border-soft);border-radius:var(--radius-panel);padding:0.85rem 0.9rem;background:var(--surface)")}>
              <legend style={css("padding:0 0.25rem;font-size:var(--text-sm);font-weight:500;color:var(--fg)")}>Delivery timing</legend>
              <div style={css("display:flex;gap:0.45rem;flex-wrap:wrap;margin-top:0.35rem")}>
                {([
                  ["immediate", "Immediate"],
                  ["daily_digest", "Daily digest"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={state.notificationPreferences.taskCompletionDelivery === value}
                    onClick={() => actions.updateNotificationPreferences({ taskCompletionDelivery: value })}
                    className={state.notificationPreferences.taskCompletionDelivery === value ? "pt-op" : undefined}
                    style={css("min-height:2.1rem;padding:0.38rem 0.72rem;border:1px solid " + (state.notificationPreferences.taskCompletionDelivery === value ? "var(--accent)" : "var(--border)") + ";border-radius:var(--radius-pill);background:" + (state.notificationPreferences.taskCompletionDelivery === value ? "var(--accent-soft)" : "var(--surface)") + ";color:var(--fg);font-size:var(--text-xs);font-weight:500;cursor:pointer")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        <div style={css("display:flex;align-items:center;gap:0.55rem;flex-wrap:wrap;margin-top:1rem")}>
          <button onClick={() => actions.showToast((mode === "profile" ? "Profile" : "Settings") + " saved")} className="pt-op" style={css("height:2.2rem;padding:0 1rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:var(--text-sm);font-weight:500;cursor:pointer")}>Save changes</button>
          <button onClick={() => actions.showToast("Invite link copied")} style={css("height:2.2rem;padding:0 0.95rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-sm);font-weight:500;cursor:pointer")}>Share access</button>
        </div>
      </div>

      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface-alt);padding:1.15rem 1.2rem")}>
        <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Workspace Summary</div>
        <div style={css("display:flex;flex-direction:column;gap:0.7rem;margin-top:0.85rem")}>
          {[
            state.role === "client" ? "Client portal access is active." : "Studio access is active across delivery tools.",
            mode === "settings" ? "Changes apply immediately to this portal shell." : "Profile changes update your visible workspace identity.",
            "No external auth changes are required for this prototype surface.",
          ].map(item => (
            <div key={item} style={css("display:flex;align-items:flex-start;gap:0.55rem;font-size:var(--text-sm);color:var(--fg-muted);line-height:1.45")}>
              <span style={css("width:0.45rem;height:0.45rem;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:0.38rem")} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
