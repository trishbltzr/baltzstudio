"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import type { PortalActions, PortalState } from "../store";

type CheckupKind = "brand" | "website" | "seo";

type CreatedClient = {
  clientId: string;
  runId: string;
  pilot: boolean;
  dispatchError: string | null;
};

const INPUT_STYLE = "width:100%;min-width:0;border:1px solid var(--border);border-radius:var(--radius);padding:.62rem .75rem;font:inherit;font-size:var(--text-base);line-height:1.35;background:var(--surface-alt);color:var(--fg);box-sizing:border-box";
const PRIMARY_BUTTON_STYLE = "min-height:2.2rem;padding:0 1rem;border:0;border-radius:var(--radius-pill);background:var(--accent);color:white;font:inherit;font-size:var(--text-sm);font-weight:500;cursor:pointer";
const SOFT_BUTTON_STYLE = "min-height:2.2rem;padding:0 .95rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font:inherit;font-size:var(--text-sm);font-weight:500;cursor:pointer";

function newEventKey() {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `portal-client-${suffix}`;
}

export function Onboarding({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [sitemap, setSitemap] = useState("");
  const [serviceKind, setServiceKind] = useState<CheckupKind>("website");
  const [enrollAsPilot, setEnrollAsPilot] = useState(false);
  const [rolloutNote, setRolloutNote] = useState("First production pilot; client output remains on legacy during parity review.");
  const [status, setStatus] = useState<"idle" | "submitting" | "created">("idle");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedClient | null>(null);
  const eventKeyRef = useRef(newEventKey());
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.quickActionIntent !== "new_client") return;
    nameRef.current?.focus();
    actions.patch({ quickActionIntent: null });
  }, [actions, state.quickActionIntent]);

  const ready = !!name.trim()
    && !!email.trim()
    && !!website.trim()
    && (!enrollAsPilot || rolloutNote.trim().length >= 8)
    && status !== "submitting";

  async function submit() {
    if (!ready) return;
    setStatus("submitting");
    setError(null);
    try {
      const response = await fetch("/api/portal-clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": eventKeyRef.current,
        },
        body: JSON.stringify({
          name: name.trim(),
          primaryContactEmail: email.trim(),
          website: website.trim(),
          sitemap: sitemap.trim() || null,
          serviceKind,
          enrollAsPilot,
          rolloutNote: enrollAsPilot ? rolloutNote.trim() : "",
        }),
      });
      const result = await response.json().catch(() => null) as {
        error?: string;
        result?: { client_id: string; service_run_id: string };
        dispatchError?: string | null;
      } | null;
      if (!response.ok || !result?.result) {
        throw new Error(result?.error || "The client could not be created.");
      }
      setCreated({
        clientId: result.result.client_id,
        runId: result.result.service_run_id,
        pilot: enrollAsPilot,
        dispatchError: result.dispatchError ?? null,
      });
      setStatus("created");
      actions.showToast(`${name.trim()} ${enrollAsPilot ? "was enrolled as the production pilot" : "was created"}.`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "The client could not be created.");
      setStatus("idle");
    }
  }

  if (created) {
    return (
      <div style={css("max-width:48rem;margin:0 auto;border:1px solid var(--success);border-radius:var(--radius-panel);background:var(--surface);padding:1.25rem")}>
        <div style={css("display:flex;align-items:flex-start;gap:0.8rem")}>
          <span style={css("width:2.35rem;height:2.35rem;border-radius:50%;display:grid;place-items:center;background:var(--success-soft);color:var(--success);flex-shrink:0")}><Icon name="checkmark" size={16} /></span>
          <div>
            <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:.03em;text-transform:uppercase;color:var(--success)")}>{created.pilot ? "Pilot enrolled" : "Client created"}</div>
            <h2 style={css("margin:.2rem 0 0;font-size:var(--text-xl);font-weight:500")}>{name.trim()}</h2>
            <p style={css("margin:.45rem 0 0;color:var(--fg-muted);font-size:var(--text-sm);line-height:1.5")}>
              The normalized client, validated source record, and {serviceKind} baseline were created together.
              {created.pilot ? " Rollout is limited to this client and client output remains on legacy until reviewed parity passes." : ""}
            </p>
            {created.dispatchError && <p role="alert" style={css("margin:.55rem 0 0;color:var(--warn);font-size:var(--text-xs)")}>The record is safe, but dispatch needs recovery: {created.dispatchError}</p>}
            <div style={css("display:flex;gap:.55rem;flex-wrap:wrap;margin-top:1rem")}>
              <button type="button" className="pt-op" style={css(PRIMARY_BUTTON_STYLE)} onClick={() => actions.setView("activity")}>View checkup activity</button>
              <button type="button" className="pt-softbtn" style={css(SOFT_BUTTON_STYLE)} onClick={() => actions.setView("clients")}>View clients</button>
              <button
                type="button"
                className="pt-softbtn"
                style={css(SOFT_BUTTON_STYLE)}
                onClick={() => {
                  setName("");
                  setEmail("");
                  setWebsite("");
                  setSitemap("");
                  setCreated(null);
                  setStatus("idle");
                  eventKeyRef.current = newEventKey();
                }}
              >
                Add another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "minmax(0,1.18fr) minmax(17rem,.82fr)") + ";gap:.85rem;align-items:start")}>
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.15rem 1.2rem")}>
        <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:.03em;text-transform:uppercase;color:var(--fg-faint)")}>Production client intake</div>
        <h2 style={css("margin:.2rem 0 0;font-size:var(--text-xl);font-weight:500")}>Create a normalized client and baseline</h2>
        <p style={css("margin:.35rem 0 0;color:var(--fg-muted);font-size:var(--text-xs);line-height:1.5")}>Use the client&apos;s real public domain. Test fixtures and inferred domains are never promoted.</p>

        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:var(--space-3);margin-top:1rem")}>
          <Field label="Client name">
            <input ref={nameRef} value={name} onChange={event => setName(event.target.value)} placeholder="Client or company name" className="pt-input" style={css(INPUT_STYLE)} />
          </Field>
          <Field label="Primary email">
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="owner@client.com" className="pt-input" style={css(INPUT_STYLE)} />
          </Field>
          <Field label="Website">
            <input type="url" value={website} onChange={event => setWebsite(event.target.value)} placeholder="https://client.com" className="pt-input" style={css(INPUT_STYLE)} />
          </Field>
          <Field label="Sitemap (optional)">
            <input type="url" value={sitemap} onChange={event => setSitemap(event.target.value)} placeholder="https://client.com/sitemap.xml" className="pt-input" style={css(INPUT_STYLE)} />
          </Field>
        </div>

        <fieldset style={css("border:0;padding:0;margin:1rem 0 0")}>
          <legend style={css("font-size:var(--text-xs);font-weight:500;color:var(--fg-muted);margin-bottom:.45rem")}>First Checkup</legend>
          <div style={css("display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem")}>
            {(["brand", "website", "seo"] as CheckupKind[]).map(kind => (
              <button
                key={kind}
                type="button"
                onClick={() => setServiceKind(kind)}
                aria-pressed={serviceKind === kind}
                style={css("height:2.35rem;border:1px solid " + (serviceKind === kind ? "var(--accent)" : "var(--border)") + ";border-radius:var(--radius-pill);background:" + (serviceKind === kind ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (serviceKind === kind ? "var(--accent)" : "var(--fg-muted)") + ";font:inherit;font-size:var(--text-xs);font-weight:500;text-transform:capitalize;cursor:pointer")}
              >
                {kind}
              </button>
            ))}
          </div>
        </fieldset>

        {state.role === "admin" && <div style={css("margin-top:1rem;padding:.85rem;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface-alt)")}>
          <label style={css("display:flex;align-items:flex-start;gap:.6rem;font-size:var(--text-sm);font-weight:500;color:var(--fg);cursor:pointer")}>
            <input type="checkbox" checked={enrollAsPilot} onChange={event => setEnrollAsPilot(event.target.checked)} style={{ marginTop: ".15rem" }} />
            <span>Enroll as the production pilot<small style={css("display:block;margin-top:.2rem;color:var(--fg-muted);font-size:var(--text-2xs);font-weight:400;line-height:1.45")}>Atomically limits new workflows to this client and keeps client-facing results on legacy during shadow review.</small></span>
          </label>
          {enrollAsPilot && <Field label="Pilot rollout note">
            <textarea rows={2} value={rolloutNote} onChange={event => setRolloutNote(event.target.value)} className="pt-input" style={css(INPUT_STYLE + ";resize:vertical")} />
          </Field>}
        </div>}

        {error && <p role="alert" style={css("margin:.8rem 0 0;padding:.65rem .75rem;border-radius:var(--radius);background:var(--danger-soft);color:var(--danger);font-size:var(--text-xs);line-height:1.45")}>{error}</p>}
        <div style={css("display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;margin-top:1rem")}>
          <button type="button" onClick={() => void submit()} disabled={!ready} className="pt-op" style={css(PRIMARY_BUTTON_STYLE + ";opacity:" + (ready ? "1" : ".45") + ";cursor:" + (ready ? "pointer" : "not-allowed"))}>
            {status === "submitting" ? "Creating safely…" : enrollAsPilot ? "Create and start pilot" : "Create client"}
          </button>
          <button type="button" onClick={() => actions.setView("clients")} className="pt-softbtn" style={css(SOFT_BUTTON_STYLE)}>Back to clients</button>
        </div>
      </div>

      <aside style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:oklch(.985 .012 22);padding:1.15rem 1.2rem")}>
        <div style={css("display:flex;align-items:center;gap:.55rem;color:var(--accent)")}>
          <Icon name="checkmark" size={15} />
          <span style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:.03em;text-transform:uppercase")}>Governed workflow</span>
        </div>
        <div style={css("display:flex;flex-direction:column;gap:var(--space-3);margin-top:.85rem")}>
          {[
            "Validates a public domain and same-domain sitemap.",
            "Creates the client, source version, and baseline idempotently.",
            "Blocks duplicate domains, slug collisions, and non-production records.",
            "Pilot enrollment is admin-only and leaves client output on legacy.",
          ].map(item => (
            <div key={item} style={css("display:flex;align-items:flex-start;gap:.55rem;font-size:var(--text-sm);color:var(--fg-muted);line-height:1.45")}>
              <span style={css("width:.45rem;height:.45rem;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:.38rem")} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={css("display:flex;flex-direction:column;gap:.3rem;font-size:var(--text-xs);font-weight:500;color:var(--fg-muted);margin-top:.65rem")}>
      {label}
      {children}
    </label>
  );
}
