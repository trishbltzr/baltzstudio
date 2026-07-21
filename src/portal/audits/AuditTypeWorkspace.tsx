"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { css } from "../helpers";
import { clientsVisibleToRole, UNASSIGNED_WORK_CLIENT, type StudioClient } from "../clients";
import type { PortalActions, PortalState } from "../store";
import type { AuditType } from "../types";
import { GuidedIntakeSelector } from "../components/GuidedIntakeSelector";
import { EngineIndexControls } from "../components/EngineIndexControls";
import { BrandAuditCardPreview } from "../components/BrandAuditCardPreview";
import { StartOverDialog } from "../components/StartOverDialog";
import { isUnassignedEngineClient, startClientForEngine } from "../engineLifecycle";
import { DiscoveryBuilder, type Ans } from "../discovery/DiscoveryBuilder";
import { mergeKnow, type Know } from "../discovery/knowledge";
import { AUDIT_TYPE_DEMO, AUDIT_TYPE_INTRO, BRAND_AUDIT_WIZARD, SHARED_AUDIT_STAGES } from "./auditTypeData";
import { createStrategyAuditPipeline } from "./strategyAuditPipeline";
import { SeoAuditWorkspace } from "../builders/SeoProjectWorkspace";
import { AuditBuilderHandoff } from "./AuditBuilderHandoff";
import { portalApprovalOutput } from "@/lib/portalApprovalOutput";
import { isAiStageResult, type BrandVisualEvidence, type GeneratedStageResult } from "@/lib/aiStageGeneration";
import type { GuidedAuditSession } from "@/lib/portalAuditPersistence";
import type { PortalBrandAuditRecord } from "@/lib/portalWorkspacePersistence";

function brandAuditRecord(session: GuidedAuditSession): PortalBrandAuditRecord {
  const complete = session.proposal || session.approved.plan === true;
  const planReady = !!session.aiResults.plan;
  const reportReady = !!session.aiResults.report;
  const status = complete ? "complete" : planReady ? "plan_ready" : reportReady ? "report_ready" : "intake";
  const progress = complete ? 100 : planReady ? 92 : reportReady ? 67 : session.entered ? Math.max(8, Math.min(55, Math.round(((session.qIdx + 1) / Math.max(1, session.questionTotal)) * 55))) : 0;
  return { status, progress, session, updatedAt: new Date().toISOString() };
}

async function brandSystemUpdate(data: Ans, aiResults: Record<string, GeneratedStageResult>) {
  const report = isAiStageResult(aiResults.report) ? aiResults.report : null;
  let visuals: BrandVisualEvidence | undefined = report?.brandVisuals;
  const websiteUrl = typeof data.url === "string" ? data.url.trim() : "";
  if (visuals?.status !== "verified" && websiteUrl) {
    const response = await fetch(`/api/brand/visuals?url=${encodeURIComponent(websiteUrl)}`);
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.result?.status === "verified") visuals = payload.result as BrandVisualEvidence;
  }
  const fonts: [string, string, string][] = [];
  if (visuals?.displayFont) fonts.push([visuals.displayFont, "Display / Headings", `'${visuals.displayFont}',system-ui,sans-serif`]);
  if (visuals?.bodyFont && visuals.bodyFont !== visuals.displayFont) fonts.push([visuals.bodyFont, "Body / UI", `'${visuals.bodyFont}',system-ui,sans-serif`]);
  const toneTraits = Array.isArray(data.voice)
    ? data.voice.map(value => String(value).trim()).filter(Boolean)
    : typeof data.voice === "string"
      ? data.voice.split(/\r?\n|,|;/).map(value => value.trim()).filter(Boolean)
      : [];
  const toneAvoid = typeof data.avoid === "string" ? data.avoid.trim() : "";
  return {
    colors: visuals?.status === "verified" ? visuals.colors.map(color => [color.role, color.hex] as [string, string]) : undefined,
    fonts: visuals?.status === "verified" ? fonts : undefined,
    toneTraits,
    toneAvoid: toneAvoid || undefined,
    logoUrl: visuals?.status === "verified" ? visuals.logoUrl || undefined : undefined,
    sourceUrl: visuals?.status === "verified" ? visuals.sourceUrl || undefined : undefined,
  };
}

export function AuditTypeWorkspace({ type, state, actions }: { type: Extract<AuditType, "brand" | "seo">; state: PortalState; actions: PortalActions }) {
  if (type === "seo") return <SeoAuditWorkspace state={state} actions={actions}/>;
  return <BrandAuditWorkspace state={state} actions={actions} />;
}

function BrandAuditWorkspace({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const label = "Brand";
  const [selectedClient, setSelectedClient] = useState<StudioClient | null>(null);
  const [unassignedDraftOpen, setUnassignedDraftOpen] = useState(false);
  const [resetClient, setResetClient] = useState<StudioClient | null>(null);
  const [typeKnow, setTypeKnow] = useState<Know>({ data: {}, sources: {} });
  const [handoffReady, setHandoffReady] = useState(false);
  const syncingCompletedAudits = useRef(new Set<string>());
  const availableClients = useMemo(() => clientsVisibleToRole(state.role, state.clientName), [state.clientName, state.role]);
  useEffect(() => {
    if (selectedClient && !availableClients.some(client => client.id === selectedClient.id)) setSelectedClient(null);
  }, [availableClients, selectedClient]);
  useEffect(() => {
    if (state.role === "client" && !selectedClient && availableClients[0]) setSelectedClient(availableClients[0]);
  }, [availableClients, selectedClient, state.role]);
  useEffect(() => {
    availableClients.forEach(client => {
      const workspace = state.clientWorkspaces[client.id];
      const audit = workspace?.brandAudit;
      if (!audit || audit.status === "intake" || syncingCompletedAudits.current.has(client.id)) return;
      const auditVoice = Array.isArray(audit.session.data.voice)
        ? audit.session.data.voice.map(value => String(value).trim()).filter(Boolean)
        : typeof audit.session.data.voice === "string"
          ? audit.session.data.voice.split(/\r?\n|,|;/).map(value => value.trim()).filter(Boolean)
          : [];
      const auditAvoid = typeof audit.session.data.avoid === "string" ? audit.session.data.avoid.trim() : "";
      const brandSystem = workspace.brandSystem;
      const visualMissing = !brandSystem?.colors.length;
      const voiceChanged = auditVoice.length > 0 && auditVoice.join("|") !== (brandSystem?.tone.traits || []).join("|");
      const avoidChanged = !!auditAvoid && auditAvoid !== (brandSystem?.tone.avoid || "");
      if (!visualMissing && !voiceChanged && !avoidChanged) return;
      syncingCompletedAudits.current.add(client.id);
      void brandSystemUpdate(audit.session.data, audit.session.aiResults)
        .then(update => actions.updateClientBrandSystem(client.name, update))
        .catch(() => syncingCompletedAudits.current.delete(client.id));
    });
  }, [actions, availableClients, state.clientWorkspaces]);
  const strategyPipeline = useMemo(() => createStrategyAuditPipeline("brand"), []);
  const openAudit = (client: StudioClient) => {
    setTypeKnow({ data: {}, sources: {} });
    setHandoffReady(false);
    setUnassignedDraftOpen(false);
    setSelectedClient(client);
  };
  const confirmDeleteAudit = (client: StudioClient) => {
    window.localStorage.removeItem(`guided-audit:brand-audit-${client.id}`);
    window.localStorage.removeItem(`baltazar:brand-audit-result:${client.id}`);
    window.localStorage.removeItem(`baltazar:brand-audit-intake:${client.id}`);
    window.localStorage.removeItem(`baltazar:builder-handoff:website:${client.id}`);
    actions.saveClientBrandAudit(client.name, null);
    setResetClient(null);
    setTypeKnow({ data: {}, sources: {} });
    setHandoffReady(false);
    setUnassignedDraftOpen(false);
    setSelectedClient(null);
  };
  const openUnassignedAudit = () => {
    setTypeKnow({ data: {}, sources: {} });
    setHandoffReady(false);
    setSelectedClient(null);
    setUnassignedDraftOpen(true);
  };
  const startAuditForRole = () => {
    const target = startClientForEngine(state.role, availableClients);
    if (!target) return;
    if (isUnassignedEngineClient(target)) openUnassignedAudit();
    else openAudit(target);
  };

  const initiatedAuditClients = useMemo(() => availableClients.filter(client => !!state.clientWorkspaces[client.id]?.brandAudit), [availableClients, state.clientWorkspaces]);
  const completedAuditCount = initiatedAuditClients.filter(client => state.clientWorkspaces[client.id]?.brandAudit?.status === "complete").length;
  const intakeAuditCount = initiatedAuditClients.filter(client => state.clientWorkspaces[client.id]?.brandAudit?.status === "intake").length;
  const cards = useMemo(() => initiatedAuditClients.map(client => {
    const workspace = state.clientWorkspaces[client.id];
    const audit = workspace?.brandAudit;
    const statusLabel = audit?.status === "complete" ? "Completed" : audit?.status === "plan_ready" ? "Ready for approval" : audit?.status === "report_ready" ? "In review" : audit?.progress ? "In progress" : "Not started";
    const statusTone: "success" | "accent" | "warn" | "muted" = audit?.status === "complete" ? "success" : audit?.status === "plan_ready" ? "accent" : audit?.status === "report_ready" ? "warn" : "muted";
    const report = isAiStageResult(audit?.session.aiResults.report) ? audit.session.aiResults.report : null;
    const reportColors = report?.brandVisuals?.status === "verified" ? report.brandVisuals.colors.map(color => [color.role, color.hex] as [string, string]) : [];
    const colors = workspace?.brandSystem?.colors.length ? workspace.brandSystem.colors : reportColors;
    const fontCount = workspace?.brandSystem?.fonts.length || new Set([report?.brandVisuals?.displayFont, report?.brandVisuals?.bodyFont].filter(Boolean)).size;
    const rawVoice = audit?.session.data.voice;
    const auditToneCount = Array.isArray(rawVoice) ? rawVoice.filter(Boolean).length : typeof rawVoice === "string" ? rawVoice.split(/\r?\n|,|;/).map(value => value.trim()).filter(Boolean).length : 0;
    const toneCount = workspace?.brandSystem?.tone.traits.length || auditToneCount;
    const websiteUrl = typeof audit?.session.data.url === "string" ? audit.session.data.url.trim() : undefined;
    return {
      id: `brand-${client.id}`,
      name: client.name,
      subtitle: "",
      statusLabel,
      statusTone,
      stage: `${label} audit · ${statusLabel}`,
      progress: audit?.progress || 0,
      owner: client.owner,
      due: "—",
      showStatus: true,
      showProgress: false,
      showStage: false,
      showMeta: false,
      hero: <BrandAuditCardPreview status={audit?.status || "not_started"} websiteUrl={websiteUrl} colors={colors} fontCount={fontCount} toneCount={toneCount} />,
      primaryLabel: "Open audit",
      onPrimary: () => openAudit(client),
      secondaryLabel: audit ? "Start over" : "New audit",
      onSecondary: () => setResetClient(client),
    };
  }), [actions, initiatedAuditClients, state.clientWorkspaces]);

  if (selectedClient || unassignedDraftOpen) {
    const wizard = BRAND_AUDIT_WIZARD;
    const auditClient = selectedClient;
    const auditWorkClient = auditClient || UNASSIGNED_WORK_CLIENT;
    const auditLabel = auditWorkClient.name;
    const auditSessionKey = auditClient ? `brand-audit-${auditClient.id}` : "brand-audit-unassigned";
    return (
      <div style={css("width:100%;padding:" + (state.isMobile ? "1rem 0.9rem 1.5rem" : "1.4rem 1.5rem"))}>
        <DiscoveryBuilder
          key={auditSessionKey}
          mobile={state.isMobile}
          accent="var(--cocoon)"
          title={`${label} Audit`}
          clientName={auditLabel}
          intro={{ eyebrow: `${label} Audit`, heading: "Build a clear brand system." }}
          wizard={wizard}
          stages={SHARED_AUDIT_STAGES}
          introSteps={AUDIT_TYPE_INTRO.brand}
          prefill={typeKnow.data}
          prefillSources={typeKnow.sources}
          prefillNotes={typeKnow.notes}
          quickStartMode="brand"
          quickStartClientId={auditWorkClient.id}
          generationMode="brand"
          sessionKey={auditSessionKey}
          initialSession={state.clientWorkspaces[auditWorkClient.id]?.brandAudit?.session}
          onSessionChange={session => actions.saveClientBrandAudit(auditWorkClient.name, brandAuditRecord(session))}
          onStartOverRequest={() => setResetClient(auditWorkClient)}
          onIngest={(delta, options) => setTypeKnow(current => options?.replaceSourceReview ? delta : mergeKnow(current, delta))}
          startLabel="Start audit intake →"
          backLabel="← All audits"
          hideHeader={state.role === "client"}
          progressLabel="intake"
          demo={AUDIT_TYPE_DEMO}
          completeTitle="Intake ready"
          completeMsg="Next, build the brand system and action plan."
          completeCta="Build brand system →"
          pipeline={strategyPipeline}
          onPipelineComplete={async (data, aiResults) => {
            const resultKey = auditWorkClient.id;
            window.localStorage.setItem(`baltazar:brand-audit-result:${resultKey}`, JSON.stringify({ data, aiResults, savedAt: new Date().toISOString() }));
            window.localStorage.setItem(`baltazar:builder-handoff:website:${auditWorkClient.id}`, JSON.stringify({ source: "brand-audit", data, aiResults, savedAt: new Date().toISOString() }));
            if (auditClient) {
              actions.updateClientBrandSystem(auditClient.name, await brandSystemUpdate(data, aiResults));
              actions.showToast(`${label} audit complete for ${auditClient.name}`);
            } else {
              actions.showToast("Unassigned brand audit complete");
            }
            setHandoffReady(true);
          }}
          onShareFinal={auditClient ? (_data, aiResults) => {
            const output = portalApprovalOutput(aiResults, "The final brand audit, guidelines, and action plan are ready.");
            actions.shareFinalOutput({ clientName: auditClient.name, title: "Brand Audit · Final report", outputType: "audit", ...output });
          } : undefined}
          showToast={actions.showToast}
          onExit={() => {
            if (state.role === "client") actions.setView("progress");
            else { setSelectedClient(null); setUnassignedDraftOpen(false); }
          }}
          onComplete={data => {
            window.localStorage.setItem(`baltazar:brand-audit-intake:${auditWorkClient.id}`, JSON.stringify({ data, savedAt: new Date().toISOString() }));
            if (state.role === "client") actions.setView("progress");
            else { setSelectedClient(null); setUnassignedDraftOpen(false); }
          }}
        />
        {handoffReady && <div style={css("max-width:60rem;margin:.85rem auto 0") }><AuditBuilderHandoff type="brand" clientName={auditLabel} onContinue={() => { window.localStorage.setItem("baltazar:builder-active:website", auditWorkClient.id); actions.patch({ builderType: "website" }); actions.setView("funnels"); }}/></div>}
        <StartOverDialog
          open={!!resetClient}
          auditLabel="Brand audit"
          subject={resetClient?.name || auditLabel}
          onCancel={() => setResetClient(null)}
          onConfirm={() => { if (resetClient) confirmDeleteAudit(resetClient); }}
        />
      </div>
    );
  }

  return (
    <div style={css("width:100%;padding:1.6rem 2rem 2.4rem")}>
      <GuidedIntakeSelector
        eyebrow={`${label} Audit`}
        eyebrowColor="var(--cocoon)"
        title="Start or continue a brand audit"
        description="Add the brand sources. Get a clear brand system and action plan."
        controlsBelow
        controls={<EngineIndexControls
          metrics={[
            { label: `${completedAuditCount} completed`, tone: "success" },
            { label: `${intakeAuditCount} still in intake`, tone: "warn" },
          ]}
          action={{
            label: "Generate audit",
            onClick: startAuditForRole,
            disabled: state.role === "client" && !availableClients.length,
            color: "var(--cocoon)",
          }}
        />}
        countLabel="audit"
        cards={cards}
      />

      <StartOverDialog
        open={!!resetClient}
        auditLabel="Brand audit"
        subject={resetClient?.name || "this brand"}
        onCancel={() => setResetClient(null)}
        onConfirm={() => { if (resetClient) confirmDeleteAudit(resetClient); }}
      />

    </div>
  );
}
