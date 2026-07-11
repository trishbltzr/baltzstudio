"use client";

import { useMemo, useState } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import { AuditFlow } from "./AuditFlow";
import { STUDIO_CLIENTS } from "../clients";
import { GuidedIntakeSelector } from "../components/GuidedIntakeSelector";
import type { PortalActions, PortalState } from "../store";
import { AuditReportView } from "./AuditReportView";

export function Audit({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [proposalIntent, setProposalIntent] = useState(false);
  const client = STUDIO_CLIENTS.find(c => c.id === clientId) || null;
  const auditReadyCount = useMemo(() => STUDIO_CLIENTS.filter(c => c.audited).length, []);
  const pendingAuditCount = STUDIO_CLIENTS.length - auditReadyCount;
  const startAuditIntake = (id: string) => {
    setClientId(id);
    setGenerated(false);
    setLaunchOpen(false);
  };
  const selectClient = (id: string, proposal = false) => {
    const c = STUDIO_CLIENTS.find(x => x.id === id);
    setClientId(id);
    setGenerated(!!c?.audited);
    setLaunchOpen(false);
    setProposalIntent(!!(proposal && c?.audited));
  };
  const backToClients = () => {
    setClientId(null);
    setGenerated(false);
    setProposalIntent(false);
  };

  // 1) Client discovery — pick a client to audit (Cocoon Consult).
  if (!client) {
    return (
      <GuidedIntakeSelector
        eyebrow="Cocoon Consult"
        eyebrowColor="var(--cocoon)"
        title="Generate or reopen an audit"
        description="Start a new audit intake for any client, or reopen a completed Cocoon report when you need to turn it into the next step."
        controls={
          <>
            <span style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.45rem 0.75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:0.73rem;color:var(--fg-muted)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--success)")} />{auditReadyCount} completed</span>
            <span style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.45rem 0.75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:0.73rem;color:var(--fg-muted)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--warn)")} />{pendingAuditCount} still in intake</span>
            <div style={{ position: "relative" }}>
              <button type="button" onClick={() => setLaunchOpen(v => !v)} style={css("display:inline-flex;align-items:center;gap:0.42rem;min-height:2.3rem;padding:0 0.95rem;border:none;border-radius:999px;background:var(--cocoon);color:#fff;font-size:0.78rem;font-weight:500;cursor:pointer")}><Icon name="audit" size={15} />Generate audit</button>
              {launchOpen && (
                <>
                  <div onClick={() => setLaunchOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 34 }} />
                  <div style={{ ...css("position:absolute;top:2.7rem;right:0;width:min(24rem,calc(100vw - 2rem));padding:0.45rem;border:1px solid var(--border);border-radius:1rem;background:color-mix(in srgb,var(--surface) 94%,white 6%);z-index:35"), animation: "pt-ddin .16s ease" }}>
                    <div style={css("padding:0.5rem 0.65rem 0.45rem")}>
                      <div style={css("font-size:0.8rem;font-weight:500;color:var(--fg)")}>Choose a client</div>
                      <div style={css("font-size:0.69rem;color:var(--fg-faint);margin-top:0.18rem")}>Generating an audit always opens the intake flow first.</div>
                    </div>
                    <div style={css("display:flex;flex-direction:column;gap:0.2rem")}>
                      {STUDIO_CLIENTS.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => startAuditIntake(c.id)}
                          style={css("display:flex;align-items:center;gap:0.65rem;width:100%;padding:0.62rem 0.7rem;border:none;border-radius:0.85rem;background:transparent;color:var(--fg);text-align:left;cursor:pointer")}
                        >
                          <span style={css("width:1.8rem;height:1.8rem;border-radius:0.55rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-size:var(--text-xs);font-weight:500;flex-shrink:0")}>{c.name[0]}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={css("display:block;font-size:0.8rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{c.name}</span>
                            <span style={css("display:block;font-size:0.7rem;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{c.audited ? "Audit complete — start a fresh intake" : "Needs intake — start audit"}</span>
                          </span>
                          <span style={css("display:inline-flex;align-items:center;font-size:0.63rem;font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;background:var(--cocoon-soft, color-mix(in srgb,var(--cocoon) 16%,white 84%));color:var(--cocoon)")}>Start</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        }
        cards={STUDIO_CLIENTS.map(c => ({
          id: c.id, name: c.name, subtitle: c.audit.subtitle,
          statusLabel: c.audit.statusLabel, statusTone: c.audit.statusTone,
          stage: c.audit.stage, progress: c.audit.progress, owner: c.owner, due: c.audit.due,
          onSelect: () => selectClient(c.id),
          primaryLabel: c.audited ? "View report" : "Generate audit", onPrimary: () => selectClient(c.id),
          secondaryLabel: "Build proposal", secondaryIcon: "flag", onSecondary: () => selectClient(c.id, true),
        }))}
      />
    );
  }

  // 2) Guided audit intake — funnel-style flow, ending in "Generate audit report".
  if (!generated) {
    return (
      <AuditFlow clientName={client.name} mobile={state.isMobile} onExit={backToClients} onComplete={() => setGenerated(true)} />
    );
  }

  return (
    <AuditReportView
      key={client.id + (proposalIntent ? "-proposal" : "-report")}
      state={state}
      actions={actions}
      clientId={client.id}
      clientName={client.name}
      onBack={backToClients}
      initialProposalOpen={proposalIntent}
    />
  );
}
