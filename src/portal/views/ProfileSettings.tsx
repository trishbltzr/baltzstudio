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
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [digest, setDigest] = useState(state.role !== "client");
  const [compact, setCompact] = useState(false);

  return (
    <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "1.05fr 0.95fr") + ";gap:0.85rem;align-items:start")}>
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.15rem 1.2rem")}>
        <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>{mode === "profile" ? "Account Profile" : "Workspace Settings"}</div>
        <h2 style={css("margin:0.2rem 0 0;font-size:1.15rem;font-weight:500")}>{mode === "profile" ? "Profile & preferences" : "Delivery defaults"}</h2>

        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:var(--space-3);margin-top:1rem")}>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:0.76rem;font-weight:500;color:var(--fg-muted)")}>
            Display name
            <input
              defaultValue={state.role === "admin" ? "Trish Baltazar" : state.role === "dev" ? "Kier Mangibin" : "Client"}
              className="pt-input"
              style={css("border:1px solid var(--border);border-radius:var(--radius);padding:0.62rem 0.75rem;font-size:0.84rem;background:var(--surface-alt);color:var(--fg)")}
            />
          </label>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:0.76rem;font-weight:500;color:var(--fg-muted)")}>
            Contact email
            <input
              defaultValue={state.role === "admin" ? "trish@baltazar.studio" : state.role === "dev" ? "noa@baltazar.studio" : "flora@floraandco.com"}
              className="pt-input"
              style={css("border:1px solid var(--border);border-radius:var(--radius);padding:0.62rem 0.75rem;font-size:0.84rem;background:var(--surface-alt);color:var(--fg)")}
            />
          </label>
        </div>

        <div style={css("display:flex;flex-direction:column;gap:0.7rem;margin-top:1rem")}>
          {[
            ["Email updates", emailUpdates, setEmailUpdates],
            ["Daily digest", digest, setDigest],
            ["Compact chrome", compact, setCompact],
          ].map(([label, on, setOn]) => (
            <button
              key={label as string}
              onClick={() => (setOn as (v: boolean) => void)(!(on as boolean))}
              style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:0.78rem 0.9rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);cursor:pointer;text-align:left")}
            >
              <span>
                <span style={css("display:block;font-size:var(--text-base);font-weight:500;color:var(--fg)")}>{label as string}</span>
                <span style={css("display:block;font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.08rem")}>Keeps your workspace aligned with your working style.</span>
              </span>
              <span style={css("width:2.4rem;height:1.4rem;border-radius:999px;display:flex;align-items:center;padding:0.14rem;background:" + ((on as boolean) ? "var(--accent)" : "var(--border)") + ";justify-content:" + ((on as boolean) ? "flex-end" : "flex-start"))}>
                <span style={css("width:1.1rem;height:1.1rem;border-radius:50%;background:#fff")} />
              </span>
            </button>
          ))}
        </div>

        <div style={css("display:flex;align-items:center;gap:0.55rem;flex-wrap:wrap;margin-top:1rem")}>
          <button onClick={() => actions.showToast((mode === "profile" ? "Profile" : "Settings") + " saved")} className="pt-op" style={css("height:2.2rem;padding:0 1rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:0.8rem;font-weight:500;cursor:pointer")}>Save changes</button>
          <button onClick={() => actions.showToast("Invite link copied")} style={css("height:2.2rem;padding:0 0.95rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:0.8rem;font-weight:500;cursor:pointer")}>Share access</button>
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
            <div key={item} style={css("display:flex;align-items:flex-start;gap:0.55rem;font-size:0.8rem;color:var(--fg-muted);line-height:1.45")}>
              <span style={css("width:0.45rem;height:0.45rem;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:0.38rem")} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
