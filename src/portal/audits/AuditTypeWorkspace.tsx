"use client";

import { useEffect, useMemo, useState } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import { clientsVisibleToRole, type StudioClient } from "../clients";
import type { PortalActions, PortalState } from "../store";
import type { AuditType } from "../types";
import { GuidedIntakeSelector } from "../components/GuidedIntakeSelector";
import { AuditCardScoreSkeleton } from "../components/AuditCardScoreSkeleton";
import { DiscoveryBuilder } from "../discovery/DiscoveryBuilder";
import { mergeKnow, type Know } from "../discovery/knowledge";
import { AUDIT_TYPE_DEMO, AUDIT_TYPE_INTRO, BRAND_AUDIT_WIZARD, SHARED_AUDIT_STAGES } from "./auditTypeData";
import { createStrategyAuditPipeline } from "./strategyAuditPipeline";
import { SeoAuditWorkspace } from "../builders/SeoProjectWorkspace";
import { AuditBuilderHandoff } from "./AuditBuilderHandoff";
import { portalApprovalOutput } from "@/lib/portalApprovalOutput";

const FOCUS_AREAS: Record<Exclude<AuditType, "website">, string[]> = {
  brand: ["Brand Foundation", "Positioning", "Messaging & Voice", "Visual Identity", "Brand System", "Improvement Priorities"],
  seo: ["Technical SEO", "On-page SEO", "Indexability", "Content & Keywords", "Authority & Links", "Measurement"],
};

export function AuditTypeWorkspace({ type, state, actions }: { type: Extract<AuditType, "brand" | "seo">; state: PortalState; actions: PortalActions }) {
  if (type === "seo") return <SeoAuditWorkspace state={state} actions={actions}/>;
  return <BrandAuditWorkspace state={state} actions={actions} />;
}

function BrandAuditWorkspace({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const label = "Brand";
  const [selectedClient, setSelectedClient] = useState<StudioClient | null>(null);
  const [typeKnow, setTypeKnow] = useState<Know>({ data: {}, sources: {} });
  const [handoffReady, setHandoffReady] = useState(false);
  const focusAreas = FOCUS_AREAS.brand;
  const availableClients = useMemo(() => clientsVisibleToRole(state.role, state.clientName), [state.clientName, state.role]);
  useEffect(() => {
    if (selectedClient && !availableClients.some(client => client.id === selectedClient.id)) setSelectedClient(null);
  }, [availableClients, selectedClient]);
  const strategyPipeline = useMemo(() => createStrategyAuditPipeline("brand"), []);
  const openAudit = (client: StudioClient) => {
    setTypeKnow({ data: {}, sources: {} });
    setHandoffReady(false);
    setSelectedClient(client);
  };

  const cards = useMemo(() => availableClients.map(client => {
    const summary = { overall: 0, projected: 0, uplift: 0, cats: [] };
    return {
      id: `brand-${client.id}`,
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
      hero: <AuditCardScoreSkeleton summary={summary} scored={false} emptyLabels={focusAreas} projectionLabel="Projected after brand recommendations" />,
      primaryLabel: "Open audit",
      onPrimary: () => openAudit(client),
      secondaryLabel: "New audit",
      onSecondary: () => openAudit(client),
    };
  }), [availableClients, focusAreas]);

  if (selectedClient) {
    const wizard = BRAND_AUDIT_WIZARD;
    return (
      <div style={css("width:100%;padding:" + (state.isMobile ? "1rem 0.9rem 1.5rem" : "1.4rem 1.5rem"))}>
        <DiscoveryBuilder
          key={`brand-${selectedClient.id}`}
          mobile={state.isMobile}
          accent="var(--cocoon)"
          title={`${label} Audit`}
          clientName={selectedClient.name}
          intro={{ eyebrow: `${label} Audit · Guided discovery`, heading: "See exactly what you’ll get." }}
          wizard={wizard}
          stages={SHARED_AUDIT_STAGES}
          introSteps={AUDIT_TYPE_INTRO.brand}
          prefill={typeKnow.data}
          prefillSources={typeKnow.sources}
          prefillNotes={typeKnow.notes}
          quickStartMode="brand"
          quickStartClientId={selectedClient.id}
          generationMode="brand"
          sessionKey={`brand-audit-${selectedClient.id}`}
          onIngest={delta => setTypeKnow(current => mergeKnow(current, delta))}
          startLabel="Start audit intake →"
          backLabel="← All audits"
          previewLabel="or preview a finished audit"
          progressLabel="intake"
          demo={AUDIT_TYPE_DEMO}
          completeTitle="Intake complete"
          completeMsg="That’s everything I need to generate the brand kit, consolidate the guidelines, and identify the most important improvements."
          completeCta="Generate the brand kit →"
          pipeline={strategyPipeline}
          onPipelineComplete={(data, aiResults) => {
            window.localStorage.setItem(`baltazar:brand-audit-result:${selectedClient.id}`, JSON.stringify({ data, aiResults, savedAt: new Date().toISOString() }));
            window.localStorage.setItem(`baltazar:builder-handoff:website:${selectedClient.id}`, JSON.stringify({ source: "brand-audit", data, aiResults, savedAt: new Date().toISOString() }));
            setHandoffReady(true);
            actions.showToast(`${label} audit complete for ${selectedClient.name}`);
          }}
          onShareFinal={(_data, aiResults) => {
            const output = portalApprovalOutput(aiResults, "The final brand audit, guidelines, and action plan are ready.");
            actions.shareFinalOutput({ clientName: selectedClient.name, title: "Brand Audit · Final report", outputType: "audit", ...output });
          }}
          showToast={actions.showToast}
          onExit={() => setSelectedClient(null)}
          onComplete={data => {
            window.localStorage.setItem(`baltazar:brand-audit-intake:${selectedClient.id}`, JSON.stringify({ data, savedAt: new Date().toISOString() }));
            setSelectedClient(null);
          }}
        />
        {handoffReady && <div style={css("max-width:60rem;margin:.85rem auto 0") }><AuditBuilderHandoff type="brand" clientName={selectedClient.name} onContinue={() => { window.localStorage.setItem("baltazar:builder-active:website", selectedClient.id); actions.patch({ builderType: "website" }); actions.setView("funnels"); }}/></div>}
      </div>
    );
  }

  return (
    <div style={css("width:100%;padding:1.6rem 2rem 2.4rem")}>
      <GuidedIntakeSelector
        eyebrow={`${label} Audit`}
        eyebrowColor="var(--cocoon)"
        title={`Generate or reopen a ${label.toLowerCase()} audit`}
        description="Turn existing guidelines, the website, and social profiles into a usable brand kit, consolidated guidelines, and clear insights for improvement."
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
