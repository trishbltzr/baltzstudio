"use client";

import { useEffect, useMemo, useState } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import { clientsVisibleToRole, type StudioClient } from "../clients";
import type { PortalActions, PortalState } from "../store";
import type { AuditType } from "../types";
import { GuidedIntakeSelector } from "../components/GuidedIntakeSelector";
import { AuditScoreHero, synthAuditScore } from "../discovery/auditPipeline";
import { DiscoveryBuilder } from "../discovery/DiscoveryBuilder";
import { mergeKnow, type Know } from "../discovery/knowledge";
import { AUDIT_TYPE_DEMO, AUDIT_TYPE_INTRO, BRAND_AUDIT_WIZARD, SEO_AUDIT_WIZARD, SHARED_AUDIT_STAGES } from "./auditTypeData";
import { createStrategyAuditPipeline } from "./strategyAuditPipeline";

const FOCUS_AREAS: Record<Exclude<AuditType, "website">, string[]> = {
  brand: ["Brand Foundation", "Positioning", "Messaging & Voice", "Visual Identity", "Brand System", "Improvement Priorities"],
  seo: ["Technical SEO", "On-page SEO", "Indexability", "Content & Keywords", "Authority & Links", "Measurement"],
};

export function AuditTypeWorkspace({ type, state, actions }: { type: Exclude<AuditType, "website">; state: PortalState; actions: PortalActions }) {
  const label = type === "seo" ? "SEO" : "Brand";
  const [selectedClient, setSelectedClient] = useState<StudioClient | null>(null);
  const [typeKnow, setTypeKnow] = useState<Know>({ data: {}, sources: {} });
  const focusAreas = FOCUS_AREAS[type];
  const availableClients = useMemo(() => clientsVisibleToRole(state.role, state.clientName), [state.clientName, state.role]);
  useEffect(() => {
    if (selectedClient && !availableClients.some(client => client.id === selectedClient.id)) setSelectedClient(null);
  }, [availableClients, selectedClient]);
  const strategyPipeline = useMemo(() => createStrategyAuditPipeline(type), [type]);
  const openAudit = (client: StudioClient) => {
    setTypeKnow({ data: {}, sources: {} });
    setSelectedClient(client);
  };

  const cards = useMemo(() => availableClients.map(client => {
    const summary = synthAuditScore(`${type}:${client.id}`);
    return {
      id: `${type}-${client.id}`,
      name: client.name,
      subtitle: "",
      statusLabel: "Not started",
      statusTone: "muted" as const,
      stage: `${label} audit · Not started`,
      progress: 0,
      owner: client.owner,
      due: "—",
      showStatus: true,
      showProgress: false,
      showStage: false,
      showMeta: false,
      hero: <AuditScoreHero summary={summary} scored={false} />,
      stats: focusAreas.map(area => ({ label: area, value: "N/A", tone: "default" as const })),
      statsLayout: "vertical" as const,
      primaryLabel: "Open audit",
      onPrimary: () => openAudit(client),
      secondaryLabel: "New audit",
      onSecondary: () => openAudit(client),
    };
  }), [availableClients, focusAreas, label, type]);

  if (selectedClient) {
    const wizard = type === "brand" ? BRAND_AUDIT_WIZARD : SEO_AUDIT_WIZARD;
    return (
      <div style={css("width:100%;padding:" + (state.isMobile ? "1rem 0.9rem 1.5rem" : "1.4rem 1.5rem"))}>
        <DiscoveryBuilder
          key={`${type}-${selectedClient.id}`}
          mobile={state.isMobile}
          accent="var(--cocoon)"
          title={`${label} Audit`}
          clientName={selectedClient.name}
          intro={{ eyebrow: `${label} Audit · Guided discovery`, heading: "See exactly what you’ll get." }}
          wizard={wizard}
          stages={SHARED_AUDIT_STAGES}
          introSteps={AUDIT_TYPE_INTRO[type]}
          prefill={typeKnow.data}
          prefillSources={typeKnow.sources}
          prefillNotes={typeKnow.notes}
          quickStartMode={type}
          quickStartClientId={selectedClient.id}
          generationMode={type}
          sessionKey={`${type}-audit-${selectedClient.id}`}
          onIngest={delta => setTypeKnow(current => mergeKnow(current, delta))}
          startLabel="Start audit intake →"
          backLabel="← All audits"
          previewLabel="or preview a finished audit"
          progressLabel="intake"
          demo={AUDIT_TYPE_DEMO}
          completeTitle="Intake complete"
          completeMsg={type === "brand"
            ? "That’s everything I need to generate the brand kit, consolidate the guidelines, and identify the most important improvements."
            : "That’s everything I need to prepare the SEO audit and prioritize the technical, content, and measurement improvements."}
          completeCta={type === "brand" ? "Generate the brand kit →" : "Generate the SEO report →"}
          pipeline={strategyPipeline}
          onPipelineComplete={(data, aiResults) => {
            window.localStorage.setItem(`baltazar:${type}-audit-result:${selectedClient.id}`, JSON.stringify({ data, aiResults, savedAt: new Date().toISOString() }));
            actions.showToast(`${label} audit complete for ${selectedClient.name}`);
          }}
          showToast={actions.showToast}
          onExit={() => setSelectedClient(null)}
          onComplete={data => {
            window.localStorage.setItem(`baltazar:${type}-audit-intake:${selectedClient.id}`, JSON.stringify({ data, savedAt: new Date().toISOString() }));
            setSelectedClient(null);
          }}
        />
      </div>
    );
  }

  return (
    <div style={css("width:100%;padding:1.6rem 2rem 2.4rem")}>
      <GuidedIntakeSelector
        eyebrow={`${label} Audit`}
        eyebrowColor="var(--cocoon)"
        title={`Generate or reopen a ${label.toLowerCase()} audit`}
        description={type === "seo"
          ? "Connect GA4 for a faster first pass, then review the dedicated SEO evidence, scoring, and recommendations for each client."
          : "Turn existing guidelines, the website, and social profiles into a usable brand kit, consolidated guidelines, and clear insights for improvement."}
        controls={<>
          <span style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.45rem 0.75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:0.73rem;color:var(--fg-muted)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--success)")} />0 completed</span>
          <span style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.45rem 0.75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:0.73rem;color:var(--fg-muted)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--warn)")} />0 still in intake</span>
          <button type="button" onClick={() => { const client = availableClients[0]; if (client) openAudit(client); }} disabled={!availableClients.length} style={css("display:inline-flex;align-items:center;gap:0.42rem;min-height:2.3rem;padding:0 0.95rem;border:none;border-radius:999px;background:var(--cocoon);color:#fff;font-size:0.78rem;font-weight:500;cursor:" + (availableClients.length ? "pointer" : "not-allowed") + ";opacity:" + (availableClients.length ? "1" : ".5"))}><Icon name="plus" size={15} />Generate audit</button>
        </>}
        countLabel="client"
        cards={cards}
      />

    </div>
  );
}
