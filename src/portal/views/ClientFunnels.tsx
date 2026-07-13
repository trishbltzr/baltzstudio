"use client";

import { useMemo, useState } from "react";
import { mergePortalClientWorkspace, type PortalFunnelPlanRecord } from "@/lib/portalWorkspacePersistence";
import { css } from "../helpers";
import { Icon } from "../icons";
import { STUDIO_CLIENTS, TONE } from "../clients";
import type { PortalActions, PortalState } from "../store";
import { FUNNEL_DEMO } from "../discovery/discoveryData";
import { FunnelFlowHero, FUNNEL_PIPELINE, type FunnelDocs } from "../discovery/funnelPipeline";
import { FunnelPlanPreviewModal, type FunnelPlanPost } from "../funnels/Funnels";
import { ClientPickerGrid } from "../components/ClientPickerGrid";

function planFromRecord(record: PortalFunnelPlanRecord): FunnelPlanPost {
  return { ...record, content: record.content as FunnelDocs };
}

function briefValue(docs: FunnelDocs, label: string, fallback = "—") {
  return docs.brief.find(item => item.label === label)?.value || fallback;
}

function launchValue(docs: FunnelDocs, label: string, fallback = "—") {
  return docs.launch.find(item => item.label === label)?.value || fallback;
}

function funnelDisplayTitle(plan: FunnelPlanPost) {
  const funnelName = briefValue(plan.content, "Funnel", plan.content.name).replace(plan.clientName + " · ", "").trim();
  if (funnelName && funnelName !== plan.title && funnelName !== "Lead-Gen Funnel") return funnelName;
  const offer = plan.content.blueprint?.offerBlock?.b?.split("  ·  ")[0]?.trim();
  const subheadOffer = plan.content.blueprint?.hero?.subhead?.split(". ").slice(1).join(". ").replace(/\.$/, "").trim();
  const primaryAction = briefValue(plan.content, "Primary action", "").trim();
  return offer || subheadOffer || primaryAction || funnelName || plan.title;
}

function goalFromType(type: string) {
  const t = type.toLowerCase();
  if (t.includes("webinar")) return "Fill the next webinar";
  if (t.includes("sale")) return "Drive direct sales";
  if (t.includes("book") || t.includes("call") || t.includes("consult")) return "Book more calls";
  if (t.includes("lead")) return "Generate qualified leads";
  return "Convert more visitors";
}

export function ClientFunnels({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [activePlan, setActivePlan] = useState<FunnelPlanPost | null>(null);
  const client = STUDIO_CLIENTS.find(item => item.name === state.clientName) || STUDIO_CLIENTS[0];
  const workspace = mergePortalClientWorkspace(client.id, state.clientWorkspaces[client.id]);
  const funnelPlans = workspace.funnelPlans.map(planFromRecord);
  const funnels = useMemo(() => client.funnels.map(funnel => {
    const stored = funnelPlans.find(plan => plan.buildId === funnel.id || plan.id === funnel.id);
    const generatedAt = new Date().toISOString();
    return stored || {
      id: funnel.id,
      buildId: funnel.id,
      type: "funnel_plan" as const,
      title: funnel.subtitle,
      clientId: client.id,
      clientName: client.name,
      statusLabel: funnel.statusLabel,
      due: funnel.due,
      generatedAt,
      updatedAt: generatedAt,
      content: FUNNEL_PIPELINE.buildDocs({
        ...FUNNEL_DEMO,
        name: client.name + " · " + funnel.subtitle,
        ftype: funnel.subtitle,
      }) as FunnelDocs,
    };
  }), [client, funnelPlans]);

  if (funnels.length === 0) {
    const requestFunnel = () => {
      actions.patch({ draft: `I'd like to start a funnel build for ${client.name}.` });
      actions.setView("inbox");
      actions.showToast("Message ready for the studio");
    };
    const cards = [{
      id: client.id,
      name: client.name,
      subtitle: "Funnel build direction",
      statusLabel: "Not started",
      statusTone: "muted" as const,
      stage: "Funnel builder",
      progress: 0,
      owner: client.owner,
      due: "—",
      headerAction: { label: `Request a funnel build for ${client.name}`, icon: "plus", onClick: requestFunnel },
      showStatus: false,
      showProgress: false,
      showStage: false,
      showMeta: false,
      showFooter: false,
      hero: <FunnelFlowHero direction="Funnel direction" goal="Build plan and conversion path" build="Not started" readyCount={0} />,
      primaryLabel: "Request funnel",
      onPrimary: requestFunnel,
      secondaryLabel: "Message studio",
      secondaryIcon: "msg",
      onSecondary: requestFunnel,
    }];
    return (
      <div style={css("box-sizing:border-box;width:100%;padding:" + (state.isMobile ? "1rem 0.9rem 1.5rem" : "1.6rem 2rem 2.4rem"))}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;padding:1rem 1.1rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);margin-bottom:1rem") }>
          <div style={{ minWidth: 0 }}>
            <span style={css("text-transform:uppercase;font-size:.68rem;font-weight:400;letter-spacing:.04em;line-height:1.2;display:block;color:var(--accent);margin-bottom:.45rem")}>Funnel build plans</span>
            <h2 style={css("margin:0;font-size:1.22rem;font-weight:500;line-height:1.15")}>Start or review a funnel build</h2>
            <p style={css("margin:.45rem 0 0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.55;max-width:36rem")}>Request the funnel direction, conversion path, copy wireframe, and development plan before production begins.</p>
          </div>
          <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap;flex-shrink:0") }>
            <span style={css("display:inline-flex;align-items:center;gap:.35rem;padding:.45rem .75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:.73rem;color:var(--fg-muted)")}><span style={css("width:.42rem;height:.42rem;border-radius:50%;background:var(--accent)")}/>0 created</span>
            <button type="button" onClick={requestFunnel} style={css("display:inline-flex;align-items:center;gap:.42rem;min-height:2.3rem;padding:0 .95rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font-size:.78rem;font-weight:500;cursor:pointer")}><Icon name="plus" size={15}/>Request funnel</button>
          </div>
        </div>
        <ClientPickerGrid countLabel="client" compact cards={cards} />
      </div>
    );
  }

  const latestPlan = funnels[0];
  const readyCount = funnels.filter(item => item.statusLabel !== "Draft").length;
  const latestFacet = client.funnels[0];
  const latestDirection = latestFacet?.subtitle || "Funnel";
  const latestGoal = goalFromType(latestDirection);
  const latestBuild = latestFacet?.stage || "Not started";

  return (
    <div style={css("display:flex;flex-direction:column;gap:var(--space-4)")}>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;padding:1rem 1.1rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface)")}>
        <div style={{ minWidth: 0 }}>
          <span style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;display:block;color:var(--accent);margin-bottom:0.45rem")}>Funnel direction</span>
          <h2 style={css("margin:0;font-size:1.22rem;font-weight:500;line-height:1.15")}>Review your funnel plan</h2>
          <p style={css("margin:0.45rem 0 0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.55;max-width:36rem")}>Open the finished direction to review the goal, build path, and preview the plan before it moves forward.</p>
        </div>
        <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap;flex-shrink:0")}>
          <span style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.45rem 0.75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:0.73rem;color:var(--fg-muted)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--success)")} />{readyCount} ready</span>
          <span style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.45rem 0.75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:0.73rem;color:var(--fg-muted)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--accent)")} />{funnels.length} plan{funnels.length === 1 ? "" : "s"}</span>
          {latestPlan && (
            <button type="button" onClick={() => setActivePlan(latestPlan)} className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.42rem;min-height:2.3rem;padding:0 0.95rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font-size:0.78rem;font-weight:500;cursor:pointer")}><Icon name="funnel" size={15} />Open latest</button>
          )}
        </div>
      </div>

      <section style={css("max-width:" + (state.isMobile ? "100%" : "23rem") + ";width:100%")}>
        <div className="pt-card client-card" style={css("border:1px solid color-mix(in srgb,var(--border-soft) 82%,var(--accent) 18%);border-radius:1.02rem;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 5%,white 95%) 0%,var(--surface) 30%,var(--surface) 100%);overflow:hidden;display:flex;flex-direction:column")}>
          <div aria-hidden="true" style={css("height:0.24rem;background:linear-gradient(90deg,var(--accent) 0%,color-mix(in srgb,var(--accent) 72%,var(--surface) 28%) 72%,color-mix(in srgb,var(--accent) 20%,var(--surface) 80%) 100%);flex-shrink:0")} />
          <div style={css("padding:0.86rem 0.88rem 0.94rem")}>
            <div style={css("display:flex;align-items:center;gap:0.62rem;margin-bottom:0.6rem")}>
              <span style={css("width:1.9rem;height:1.9rem;border-radius:0.66rem;background:color-mix(in srgb,var(--accent) 13%,var(--surface-alt) 87%);color:var(--accent);display:grid;place-items:center;font-weight:500;font-size:0.78rem;flex-shrink:0")}>{client.name[0]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={css("font-weight:500;font-size:0.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{client.name}</div>
                <div style={css("font-size:0.67rem;color:var(--fg-muted);margin-top:0.1rem")}>{funnels.length} funnel{funnels.length === 1 ? "" : "s"} available</div>
              </div>
            </div>
            <FunnelFlowHero direction={latestDirection} goal={latestGoal} build={latestBuild} readyCount={readyCount} />
            <div style={css("display:flex;flex-direction:column;gap:0.38rem;margin:0.58rem 0 0;max-height:5.75rem;overflow-y:auto;padding-right:0.12rem")}>
        {funnels.map(plan => {
          const facet = client.funnels.find(item => item.id === plan.buildId || item.id === plan.id);
          const tone = TONE[facet?.statusTone || "accent"];
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setActivePlan(plan)}
              className="pt-softbtn"
              style={css("display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:0.56rem;align-items:center;width:100%;min-height:2.42rem;padding:0.42rem 0.5rem 0.42rem 0.62rem;border:1px solid color-mix(in srgb,var(--border-soft) 88%,white 12%);border-radius:999px;background:color-mix(in srgb,var(--surface-alt) 58%,var(--surface) 42%);color:var(--fg);text-align:left;cursor:pointer")}
            >
              <span style={css("width:0.46rem;height:0.46rem;border-radius:50%;background:" + tone.color + ";flex-shrink:0")} />
              <span style={css("font-size:0.78rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{funnelDisplayTitle(plan)}</span>
              <span style={css("display:flex;align-items:center;justify-content:flex-end;gap:0.42rem;min-width:0")}>
                <span style={css("display:inline-flex;align-items:center;font-size:var(--text-2xs);font-weight:500;padding:0.22rem 0.5rem;border-radius:999px;white-space:nowrap;background:" + tone.soft + ";color:" + tone.color)}>{plan.statusLabel}</span>
                <span style={css("display:inline-flex;align-items:center;gap:0.22rem;font-size:0.64rem;color:var(--fg-faint);white-space:nowrap")}><Icon name="cal" size={10} />{plan.due}</span>
              </span>
            </button>
          );
        })}
            </div>
          </div>
        </div>
      </section>

      {activePlan && (
        <FunnelPlanPreviewModal
          post={activePlan}
          mobile={state.isMobile}
          onClose={() => setActivePlan(null)}
          showToast={actions.showToast}
          showAiHandover={false}
          onImportTasks={actions.bulkImportTasks}
        />
      )}
    </div>
  );
}
