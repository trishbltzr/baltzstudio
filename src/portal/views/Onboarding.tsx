"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import type { PortalActions, PortalState } from "../store";

export function Onboarding({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState("wiaw");
  const [notes, setNotes] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.quickActionIntent !== "new_client") return;
    nameRef.current?.focus();
    actions.patch({ quickActionIntent: null });
  }, [actions, state.quickActionIntent]);

  const ready = name.trim() && email.trim();

  return (
    <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "1.1fr 0.9fr") + ";gap:0.85rem;align-items:start")}>
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.15rem 1.2rem")}>
        <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Start Onboarding</div>
        <h2 style={css("margin:0.2rem 0 0;font-size:1.15rem;font-weight:500")}>Create a new client record</h2>
        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:var(--space-3);margin-top:1rem")}>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:0.76rem;font-weight:500;color:var(--fg-muted)")}>
            Client name
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="Client or company name" className="pt-input" style={css("border:1px solid var(--border);border-radius:var(--radius);padding:0.62rem 0.75rem;font-size:0.84rem;background:var(--surface-alt);color:var(--fg)")} />
          </label>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:0.76rem;font-weight:500;color:var(--fg-muted)")}>
            Primary email
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="founder@client.com" className="pt-input" style={css("border:1px solid var(--border);border-radius:var(--radius);padding:0.62rem 0.75rem;font-size:0.84rem;background:var(--surface-alt);color:var(--fg)")} />
          </label>
        </div>

        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:0.55rem;margin-top:0.95rem")}>
          {[
            ["cocoon", "Cocoon Consult"],
            ["wiaw", "Winged in a Week"],
            ["iff", "In Full Flight"],
          ].map(([id, label]) => {
            const active = service === id;
            return (
              <button
                key={id}
                onClick={() => setService(id)}
                style={css("text-align:left;padding:0.8rem 0.9rem;border-radius:var(--radius-panel);border:1px solid " + (active ? "var(--accent)" : "var(--border-soft)") + ";background:" + (active ? "var(--accent-soft)" : "var(--surface)") + ";cursor:pointer")}
              >
                <div style={css("font-size:var(--text-base);font-weight:500;color:" + (active ? "var(--accent)" : "var(--fg)"))}>{label}</div>
                <div style={css("font-size:0.7rem;color:var(--fg-muted);margin-top:0.12rem")}>opens the right playbook automatically</div>
              </button>
            );
          })}
        </div>

        <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:0.76rem;font-weight:500;color:var(--fg-muted);margin-top:0.95rem")}>
          Kickoff notes
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Scope, references, or context for the first handoff…" style={css("min-height:7rem;border:1px solid var(--border);border-radius:var(--radius-panel);padding:0.75rem 0.8rem;font-size:0.84rem;background:var(--surface-alt);color:var(--fg);resize:vertical")} />
        </label>

        <div style={css("display:flex;align-items:center;gap:0.55rem;flex-wrap:wrap;margin-top:1rem")}>
          <button
            onClick={() => {
              if (!ready) return;
              actions.showToast("Client onboarding draft created for " + name.trim());
              actions.setView("clients");
            }}
            className="pt-op"
            style={css("height:2.2rem;padding:0 1rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:0.8rem;font-weight:500;cursor:pointer")}
          >
            Create draft
          </button>
          <button
            onClick={() => actions.setView("clients")}
            style={css("height:2.2rem;padding:0 0.95rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:0.8rem;font-weight:500;cursor:pointer")}
          >
            Back to clients
          </button>
        </div>
      </div>

      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:oklch(0.985 0.012 22);padding:1.15rem 1.2rem;box-shadow:inset 0 0 0 1px oklch(0.88 0.04 20 / 0.28)")}>
        <div style={css("display:flex;align-items:center;gap:0.55rem;color:var(--accent)")}>
          <Icon name="checkmark" size={15} />
          <span style={css("font-size:0.74rem;font-weight:500;letter-spacing:0.02em")}>What Happens Next</span>
        </div>
        <div style={css("display:flex;flex-direction:column;gap:var(--space-3);margin-top:0.85rem")}>
          {[
            "Client appears in the delivery workspace immediately.",
            "Service playbook and milestone structure are preloaded.",
            "The invite flow can be sent once contact details are confirmed.",
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
