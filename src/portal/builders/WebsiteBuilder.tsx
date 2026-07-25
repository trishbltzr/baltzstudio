"use client";

import { useEffect, useMemo, useState } from "react";
import { isAiStageResult } from "@/lib/aiStageGeneration";
import { css } from "../helpers";
import { Icon } from "../icons";
import { clientsVisibleToRole, type StudioClient } from "../clients";
import type { PortalActions, PortalState } from "../store";
import { GuidedIntakeSelector } from "../components/GuidedIntakeSelector";
import { EngineIndexControls } from "../components/EngineIndexControls";
import { EngineIndexOverview } from "../components/EngineIndexOverview";
import { clientsForEngineWork, engineWorkFromGuidedSession, isUnassignedEngineClient, saveEngineWork, startClientForEngine } from "../engineLifecycle";
import { DiscoveryBuilder, type DiscoveryIntroStep, type DiscoveryStage, type DiscoveryTopic, type Pipeline, type StageRenderCtx } from "../discovery/DiscoveryBuilder";
import { FunnelFlowHero } from "../discovery/funnelPipeline";
import { fromClientMemory, getKnowledge, mergeKnow, type Know } from "../discovery/knowledge";
import { BuilderTaskPanel } from "./BuilderTaskPanel";
import type { Task, TaskImportDraft } from "../types";
import { portalApprovalOutput } from "@/lib/portalApprovalOutput";
import type { GuidedAuditSession } from "@/lib/portalAuditPersistence";
import { WEBSITE_BUILDER_WIZARD } from "./websiteBuilderData";
import { processPipelineStages } from "../processDefinitions";
import { acceptPortalProcessHandoff, latestPortalProcessHandoff, linkPortalProcessHandoffTasks, type PortalProcessHandoff } from "@/lib/portalProcessHandoffs";
import { mergePortalClientWorkspace } from "@/lib/portalWorkspacePersistence";
import { generatePortalImplementationWorkspace } from "@/lib/portalImplementationWorkspace";

/* Website intake questions live in websiteBuilderData so the live builder and
   service manual always describe the same questionnaire. */
const WIZARD: DiscoveryTopic[] = WEBSITE_BUILDER_WIZARD;

const STAGES: DiscoveryStage[] = processPipelineStages("website-build");

const INTRO: DiscoveryIntroStep[] = [
  { title: "Source material", tag: "Website, brief or copy", icon: "inbox" },
  { title: "Redesign goals", tag: "Why & outcomes", icon: "target" },
  { title: "Audience journeys", tag: "Users & actions", icon: "users" },
  { title: "Final sitemap", tag: "Pages we will design", icon: "file" },
  { title: "Page copy briefs", tag: "Purpose, message & CTA", icon: "msg" },
  { title: "Functional scope", tag: "Features & systems", icon: "activity" },
  { title: "Implementation tasks", tag: "Build-ready list", icon: "checklist" },
];

function HomepageDirection({ result, mobile }: { result: NonNullable<ReturnType<typeof getAiResult>>; mobile: boolean }) {
  const [plan, pages, homepage, phases, approval] = result.sections;
  const [showAllPages, setShowAllPages] = useState(false);
  const visiblePages = pages ? (showAllPages ? pages.bullets : pages.bullets.slice(0, 8)) : [];
  const splitFact = (value: string) => { const index = value.indexOf(":"); return index > 0 ? [value.slice(0, index), value.slice(index + 1)] : ["Direction", value]; };
  return <article style={css("max-width:48rem;margin:0 auto;border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:" + (mobile ? "1.15rem" : "1.65rem 1.8rem") + ";display:flex;flex-direction:column;gap:var(--space-5)") }>
    <header>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap") }><span style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>Website build-ready brief</span><span style={css("font-size:var(--text-2xs);color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:.25rem .65rem")}>Ready to review and scope</span></div>
      <h2 style={css("margin:.45rem 0 0;font-size:var(--text-2xl);line-height:1.25;font-weight:500")}>{result.title}</h2>
      <p style={css("margin:.55rem 0 0;max-width:42rem;font-size:var(--text-base);line-height:1.6;color:var(--fg-muted)")}>{result.summary}</p>
    </header>
    {plan && <section><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>Plan at a glance</div><p style={css("margin:.35rem 0 0;font-size:var(--text-xs);line-height:1.5;color:var(--fg-muted)")}>{plan.body}</p><div style={css("display:flex;flex-direction:column;gap:.4rem;margin-top:.85rem")}>{plan.bullets.map(item => { const [label, value] = splitFact(item); return <div key={item} style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "9rem minmax(0,1fr)") + ";gap:.3rem .75rem;border:1px solid var(--border-soft);border-radius:.75rem;padding:.62rem .72rem") }><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--fg-faint)")}>{label.trim()}</div><div style={css("font-size:var(--text-xs);line-height:1.4")}>{value.trim()}</div></div>; })}</div></section>}
    <section style={css("border-top:1px solid var(--border-soft);padding-top:1.2rem") }><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>What changes in this rebuild</div><div style={css("display:flex;flex-direction:column;gap:.55rem;margin-top:.75rem")}>{result.recommendations.map(item => <div key={item.title} style={css("display:grid;grid-template-columns:1.5rem minmax(0,1fr);gap:.65rem;border:1px solid var(--border-soft);border-radius:.8rem;padding:.72rem .8rem") }><span style={css("width:1.4rem;height:1.4rem;border-radius:.45rem;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);font-size:var(--text-2xs)")}>↗</span><div><strong style={css("font-size:var(--text-xs);font-weight:500")}>{item.title}</strong><p style={css("margin:.25rem 0 0;font-size:var(--text-2xs);line-height:1.45;color:var(--fg-muted)")}>{item.rationale}</p><p style={css("margin:.3rem 0 0;font-size:var(--text-2xs);line-height:1.45")}>{item.action}</p></div></div>)}</div></section>
    {pages && <section style={css("border-top:1px solid var(--border-soft);padding-top:1.2rem") }><div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:var(--space-3)") }><div><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>01 · Final sitemap and page briefs</div><h3 style={css("margin:.25rem 0 0;font-size:var(--text-xl);font-weight:500")}>{pages.heading}</h3></div><span style={css("font-size:var(--text-2xs);color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:.22rem .58rem")}>{pages.bullets.length} scoped pages</span></div><p style={css("margin:.4rem 0 0;font-size:var(--text-xs);line-height:1.5;color:var(--fg-muted)")}>{pages.body}</p><div style={css("display:flex;flex-direction:column;gap:.34rem;margin-top:.75rem")}>{visiblePages.map((item, index) => { const template = item.startsWith("Template · "); const label = item.replace(/^(?:Page|Template) · /, ""); return <div key={item} style={css("display:grid;grid-template-columns:2rem 4.4rem minmax(0,1fr);gap:var(--space-2);align-items:center;border:1px solid var(--border-soft);border-radius:.65rem;padding:.5rem .62rem;min-width:0") }><span style={css("font-size:var(--text-2xs);color:var(--accent)")}>{String(index + 1).padStart(2, "0")}</span><span style={css("font-size:var(--text-label);text-align:center;text-transform:uppercase;letter-spacing:.03em;color:" + (template ? "var(--accent)" : "var(--fg-faint)") + ";background:" + (template ? "var(--accent-soft)" : "var(--surface-alt)") + ";border-radius:999px;padding:.14rem .35rem")}>{template ? "Template" : "Page"}</span><span title={label} style={css("min-width:0;font-size:var(--text-2xs);line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{label}</span></div>; })}</div>{pages.bullets.length > 8 && <button type="button" onClick={() => setShowAllPages(value => !value)} className="pt-softbtn" aria-expanded={showAllPages} style={css("display:flex;align-items:center;justify-content:center;width:100%;margin-top:.5rem;border:1px solid var(--border-soft);border-radius:999px;background:var(--surface-alt);color:var(--fg-muted);padding:.48rem .75rem;font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>{showAllPages ? "Show fewer pages" : `See all ${pages.bullets.length} scoped pages`}</button>}</section>}
    {homepage && <section style={css("border-top:1px solid var(--border-soft);padding-top:1.2rem") }><div style={css("display:flex;align-items:center;justify-content:space-between;gap:.65rem;flex-wrap:wrap") }><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>02 · Copy and site design direction</div><span style={css("font-size:var(--text-2xs);color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:.2rem .55rem")}>Applies to every scoped page</span></div><h3 style={css("margin:.25rem 0 0;font-size:var(--text-xl);font-weight:500")}>{homepage.heading}</h3><p style={css("margin:.4rem 0 0;font-size:var(--text-xs);line-height:1.5;color:var(--fg-muted)")}>{homepage.body}</p><div style={css("display:flex;flex-direction:column;gap:.4rem;margin-top:.75rem")}>{homepage.bullets.map((item, index) => <div key={item} style={css("display:grid;grid-template-columns:1.75rem minmax(0,1fr);gap:.6rem;align-items:start;border:1px solid var(--border-soft);border-radius:.75rem;padding:.62rem .68rem") }><span style={css("width:1.5rem;height:1.5rem;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);font-size:var(--text-2xs)")}>{index + 1}</span><span style={css("font-size:var(--text-2xs);line-height:1.45")}>{item.replace(/^\d+[.)]\s*/, "")}</span></div>)}</div><div style={css("margin-top:.75rem;border-left:3px solid var(--accent);border-radius:0 .7rem .7rem 0;background:var(--accent-soft);padding:.68rem .78rem;font-size:var(--text-2xs);line-height:1.45;color:var(--fg-muted)")}>This direction maps the approved source material and copy approach across the final sitemap. Design begins only for the pages listed in the scoped page brief above.</div></section>}
    {phases && <section style={css("border-top:1px solid var(--border-soft);padding-top:1.2rem") }><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>03 · Development timeline</div><h3 style={css("margin:.25rem 0 0;font-size:var(--text-xl);font-weight:500")}>{phases.heading}</h3><div style={css("margin-top:.55rem;border:1px solid color-mix(in srgb,var(--accent) 22%,var(--border-soft) 78%);border-radius:.75rem;background:var(--accent-soft);padding:.65rem .75rem") }><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>Estimated timeline</div><p style={css("margin:.25rem 0 0;font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>{phases.body}</p></div><div style={css("display:flex;flex-direction:column;margin-top:.85rem")}>{phases.bullets.map((item, index) => { const timing = item.match(/\(([^)]+)\)/)?.[1] || "Timing to confirm"; const cleanItem = item.replace(/\s*\([^)]+\)/, "").replace(/^\d+[.)]\s*/, ""); return <div key={item} style={css("position:relative;display:grid;grid-template-columns:2rem minmax(0,1fr);gap:.7rem;padding-bottom:" + (index < phases.bullets.length - 1 ? ".75rem" : "0"))}>{index < phases.bullets.length - 1 && <span aria-hidden="true" style={css("position:absolute;left:.94rem;top:1.65rem;bottom:0;width:1px;background:var(--border)")}/>}<span style={css("position:relative;z-index:1;width:1.85rem;height:1.85rem;border-radius:50%;display:grid;place-items:center;border:1px solid var(--accent);background:" + (index === 0 ? "var(--accent)" : "var(--surface)") + ";color:" + (index === 0 ? "#fff" : "var(--accent)") + ";font-size:var(--text-2xs);font-weight:500")}>{index + 1}</span><div style={css("border:1px solid " + (index === 0 ? "color-mix(in srgb,var(--accent) 30%,var(--border-soft) 70%)" : "var(--border-soft)") + ";border-radius:.75rem;padding:.62rem .7rem;background:" + (index === 0 ? "var(--accent-soft)" : "var(--surface)") )}><div style={css("display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap") }><span style={css("font-size:var(--text-2xs);font-weight:500;color:var(--accent)")}>{index === 0 ? "MILESTONE 1 · PRIORITY" : `MILESTONE ${index + 1}`}</span><span style={css("font-size:var(--text-2xs);color:var(--fg-muted);background:var(--surface);border-radius:999px;padding:.16rem .45rem")}>{timing}</span></div><p style={css("margin:.3rem 0 0;font-size:var(--text-2xs);line-height:1.45;font-weight:" + (index === 0 ? "500" : "400"))}>{cleanItem}</p></div></div>; })}</div></section>}
    {approval && <section style={css("border:1px solid color-mix(in srgb,var(--accent) 22%,var(--border-soft) 78%);border-radius:.85rem;background:var(--accent-soft);padding:.95rem") }><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>04 · Approval and rollout</div><h3 style={css("margin:.25rem 0 0;font-size:var(--text-lg);font-weight:500")}>{approval.heading}</h3><p style={css("margin:.38rem 0 0;font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>{approval.body}</p><ul style={css("margin:.68rem 0 0;padding-left:1.05rem;display:flex;flex-direction:column;gap:.35rem")}>{approval.bullets.map(item => <li key={item} style={css("font-size:var(--text-2xs);line-height:1.45")}>{item}</li>)}</ul></section>}
  </article>;
}

function getAiResult(value: StageRenderCtx["aiResult"]) {
  return isAiStageResult(value) ? value : null;
}

function renderResult(ctx: StageRenderCtx) {
  const result = isAiStageResult(ctx.aiResult) ? ctx.aiResult : null;
  if (!result) return <div style={css("padding:var(--space-4);color:var(--fg-muted)")}>Generate this stage to review the build-ready website brief.</div>;
  if (ctx.stageKey === "direction") return <HomepageDirection result={result} mobile={ctx.mobile}/>;
  return <div style={css("display:flex;flex-direction:column;gap:var(--space-4)") }><section style={css("border:1px solid color-mix(in srgb,var(--accent) 24%,var(--border-soft) 76%);border-radius:1rem;background:var(--accent-soft);padding:1.1rem 1.2rem") }><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>{ctx.stageKey === "tasks" ? "Implementation plan" : "Website build-ready brief"}</div><h3 style={css("margin:.25rem 0 0;font-size:var(--text-xl);font-weight:500")}>{result.title}</h3><p style={css("margin:.4rem 0 0;font-size:var(--text-sm);line-height:1.55;color:var(--fg-muted)")}>{result.summary}</p></section>{result.sections.map(section => <section key={section.heading} style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:1rem 1.1rem") }><h4 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>{section.heading}</h4><p style={css("margin:.35rem 0 0;font-size:var(--text-xs);line-height:1.5;color:var(--fg-muted)")}>{section.body}</p><ul style={css("margin:.65rem 0 0;padding-left:1.1rem;display:flex;flex-direction:column;gap:.35rem")}>{section.bullets.map(bullet => <li key={bullet} style={css("font-size:var(--text-2xs);line-height:1.45")}>{bullet}</li>)}</ul></section>)}</div>;
}

const PIPELINE: Pipeline = {
  railTitle: "Website builder",
  buildDocs: data => data,
  gen: key => ({ total: key === "direction" ? 6 : 8, ms: 6500, buildLabel: "Building" }),
  genPrompt: key => key === "direction" ? "Create a concise build-ready website brief: source strategy, objective, final sitemap, one practical copy brief per scoped page, sitewide design direction, functionality, dependencies, and milestones. Only include pages the client confirmed for design." : "Turn the approved sitemap, page copy briefs, site direction, functionality, and dependencies into an implementation-ready task list.",
  genCta: key => key === "direction" ? "Create build-ready brief" : "Create task plan",
  approveLabel: (_key, last) => last ? "Approve & create tasks →" : "Approve & continue →",
  beginLabel: "Create build-ready brief →",
  beginMsg: () => "I have everything I need to map the approved pages, copy sources, and build requirements.",
  renderStage: renderResult,
  renderProposal: ctx => {
    const sourceBase = ctx.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "client";
    const taskResult = isAiStageResult(ctx.aiResults.tasks) ? ctx.aiResults.tasks : null;
    const taskDrafts: TaskImportDraft[] = (taskResult?.sections || []).flatMap((section, sectionIndex) => section.bullets.map((title, taskIndex) => ({
      title,
      description: `${section.heading}\n\n${section.body}`,
      project: ctx.clientName,
      assignee: "Studio",
      owner: "studio",
      priority: sectionIndex === 0 ? "high" : "med",
      due: "To schedule",
      milestone: section.heading,
      source: "manual",
      sourceId: `website-builder-${sourceBase}-${sectionIndex + 1}-${taskIndex + 1}`,
    })));
    return <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden") }>
      <div style={css("padding:1.4rem 1.5rem") }><div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>Builder complete</div><h2 style={css("margin:.3rem 0 0;font-size:var(--text-2xl);font-weight:500")}>Build-ready brief and tasks are ready</h2><p style={css("margin:.45rem 0 0;font-size:var(--text-sm);color:var(--fg-muted)")}>The final sitemap, page copy briefs, shared website direction, and implementation tasks are ready to use.</p><div style={css("display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem") }><button type="button" onClick={ctx.onExit} className="pt-softbtn" style={css("height:2.4rem;padding:0 1.1rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}>Back to builders</button><button type="button" onClick={ctx.onShare} className="pt-op" style={css("height:2.4rem;padding:0 1.1rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font-size:var(--text-xs);font-weight:500;cursor:pointer")}>Share in Approvals</button></div></div>
      <BuilderTaskPanel embedded drafts={taskDrafts} fileName={`${sourceBase}-website-tasks.csv`} mobile={ctx.mobile} onImport={ctx.onImportTasks}/>
    </section>;
  },
};

type WebsiteBuilderActivity = "intake" | "complete";

function readWebsiteBuilderActivity(clientId: string): WebsiteBuilderActivity | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.localStorage.getItem(`baltazar:website-builder:${clientId}`)) return "complete";
    if (window.localStorage.getItem(`guided-audit:website-builder-${clientId}`)) return "intake";
  } catch { /* unavailable storage means there is no locally restorable build */ }
  return null;
}

export function WebsiteBuilder({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [client, setClient] = useState<StudioClient | null>(null);
  const [builderKnow, setBuilderKnow] = useState<Know>({ data: {}, sources: {} });
  const [handoffSource, setHandoffSource] = useState<"brand-audit" | "website-audit" | null>(null);
  const [sourceHandoffId, setSourceHandoffId] = useState<string | null>(null);
  const [activeHandoff, setActiveHandoff] = useState<PortalProcessHandoff | null>(null);
  const [activityByClient, setActivityByClient] = useState<Record<string, WebsiteBuilderActivity>>({});
  const availableClients = useMemo(() => clientsVisibleToRole(state.role, state.clientName), [state.clientName, state.role]);
  const workingClients = useMemo(() => clientsForEngineWork(state.role, availableClients), [availableClients, state.role]);
  useEffect(() => {
    setActivityByClient(Object.fromEntries(availableClients.flatMap(item => {
      const persisted = state.clientWorkspaces[item.id]?.engineWork.websiteBuilder;
      const activity = persisted
        ? persisted.status === "complete" || persisted.status === "ready" ? "complete" : "intake"
        : readWebsiteBuilderActivity(item.id);
      return activity ? [[item.id, activity]] : [];
    })));
  }, [availableClients, state.clientWorkspaces]);
  useEffect(() => {
    if (client && !isUnassignedEngineClient(client) && !availableClients.some(item => item.id === client.id)) setClient(null);
  }, [availableClients, client]);
  const openClient = (item: StudioClient) => {
    setActivityByClient(current => ({ ...current, [item.id]: current[item.id] || "intake" }));
    let nextKnow: Know = mergeKnow(
      getKnowledge(item.id),
      fromClientMemory(item.id, item.name, actions.workspaceForClient(item.name)),
    );
    let nextSource: "brand-audit" | "website-audit" | null = null;
    let nextHandoffId: string | null = null;
    let nextHandoff: PortalProcessHandoff | null = null;
    const workspace = mergePortalClientWorkspace(item.id, state.clientWorkspaces[item.id]);
    const persistedHandoff = latestPortalProcessHandoff(workspace.handoffs, "website-build");
    if (persistedHandoff && (persistedHandoff.sourceProcessId === "brand-audit" || persistedHandoff.sourceProcessId === "website-audit")) {
      nextSource = persistedHandoff.sourceProcessId;
      nextHandoffId = persistedHandoff.id;
      nextHandoff = persistedHandoff.status === "ready"
        ? { ...persistedHandoff, status: "accepted", acceptedAt: new Date().toISOString() }
        : persistedHandoff;
      nextKnow = mergeKnow(nextKnow, {
        data: persistedHandoff.context,
        sources: Object.fromEntries(Object.keys(persistedHandoff.context).map(key => [key, nextSource === "brand-audit" ? "Brand audit" : "Website audit"])),
      });
      if (persistedHandoff.approvalStatus === "approved"
        && (persistedHandoff.status === "ready" || persistedHandoff.createdTaskIds.length === 0)) {
        const seed = generatePortalImplementationWorkspace(persistedHandoff);
        actions.update(current => {
          const existingSourceIds = new Set(current.tasks.map(task => task.sourceId).filter(Boolean));
          const drafts = seed.tasks.filter(task => !task.sourceId || !existingSourceIds.has(task.sourceId));
          const maxTaskNumber = Math.max(0, ...current.tasks.map(task => Number.parseInt(task.id.replace(/\D/g, ""), 10) || 0));
          const generatedTasks: Task[] = drafts.map((draft, index) => ({
            ...draft,
            id: `k${maxTaskNumber + index + 1}`,
            status: "todo",
          }));
          const linkedTaskIds = [
            ...persistedHandoff.createdTaskIds,
            ...generatedTasks.map(task => task.id),
          ];
          const acceptedWorkspaces = persistedHandoff.status === "ready"
            ? acceptPortalProcessHandoff(current.clientWorkspaces, item.id, persistedHandoff.id)
            : current.clientWorkspaces;
          const linkedWorkspaces = linkPortalProcessHandoffTasks(acceptedWorkspaces, item.id, persistedHandoff.id, linkedTaskIds);
          const clientWorkspace = mergePortalClientWorkspace(item.id, linkedWorkspaces[item.id]);
          const gateIds = new Set(seed.journeyGates.map(gate => gate.id));
          return {
            tasks: [...generatedTasks, ...current.tasks],
            journeyGates: [...seed.journeyGates, ...current.journeyGates.filter(gate => !gateIds.has(gate.id))],
            projectOverrides: {
              ...current.projectOverrides,
              [item.name]: {
                ...(current.projectOverrides[item.name] || {}),
                service: "wiaw",
                stage: "Scope & content preparation",
                progress: 0,
              },
            },
            clientWorkspaces: {
              ...linkedWorkspaces,
              [item.id]: {
                ...clientWorkspace,
                serviceLifecycle: {
                  ...clientWorkspace.serviceLifecycle,
                  wiawState: "workspace_unlocked",
                  dashboardAccessState: "active",
                  deliverableState: clientWorkspace.serviceLifecycle.deliverableState === "not_started"
                    ? "draft"
                    : clientWorkspace.serviceLifecycle.deliverableState,
                  currentDevelopmentStage: "Scope & content preparation",
                  nextDevelopmentStage: "Design-system approval",
                  nextRequiredAction: seed.tasks[0]?.title || "Confirm implementation scope",
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          };
        });
      }
    }
    try {
      const raw = window.localStorage.getItem(`baltazar:builder-handoff:website:${item.id}`);
      if (raw && !persistedHandoff) {
        const saved = JSON.parse(raw) as { source?: "brand-audit" | "website-audit"; data?: Know["data"]; answers?: Know["data"] };
        const imported = saved.answers || saved.data || {};
        nextSource = saved.source || "website-audit";
        nextKnow = mergeKnow(nextKnow, { data: imported, sources: Object.fromEntries(Object.keys(imported).map(key => [key, nextSource === "brand-audit" ? "Brand audit" : "Website audit"])) });
      }
    } catch { /* start with an empty builder if an old handoff cannot be read */ }
    setBuilderKnow(nextKnow);
    setHandoffSource(nextSource);
    setSourceHandoffId(nextHandoffId);
    setActiveHandoff(nextHandoff);
    setClient(item);
  };
  useEffect(() => {
    if (client) return;
    const clientId = window.localStorage.getItem("baltazar:builder-active:website");
    const ownClient = state.role === "client" ? availableClients[0] : undefined;
    const item = workingClients.find(candidate => candidate.id === clientId) || (ownClient && readWebsiteBuilderActivity(ownClient.id) ? ownClient : undefined);
    if (item) openClient(item);
    if (clientId) window.localStorage.removeItem("baltazar:builder-active:website");
  }, [availableClients, client, state.role, workingClients]);
  const cards = useMemo(() => availableClients.filter(item => !!activityByClient[item.id]).map(item => {
    const complete = activityByClient[item.id] === "complete";
    return { id: item.id, name: item.name, subtitle: "Website build-ready brief", statusLabel: complete ? "Brief ready" : "In progress", statusTone: complete ? "success" as const : "warn" as const, stage: "Website builder", progress: 0, owner: item.owner, due: "—", headerAction: { label: `Continue website build for ${item.name}`, icon: "plus", onClick: () => openClient(item) }, showStatus: false, showProgress: false, showStage: false, showMeta: false, showFooter: false, hero: <FunnelFlowHero direction="Website planning" goal="Final sitemap and page briefs" build={complete ? "Brief ready" : "Intake started"} readyCount={complete ? 1 : 0} />, primaryLabel: "Open builder", onPrimary: () => openClient(item), secondaryLabel: "Continue build", secondaryIcon: "plus", onSecondary: () => openClient(item) };
  }), [activityByClient, availableClients]);
  const startWebsite = () => {
    const target = startClientForEngine(state.role, availableClients);
    if (target) openClient(target);
  };
  if (!client) return <div style={css("width:100%;padding:1.6rem 2rem 2.4rem") }>
    <GuidedIntakeSelector
      eyebrow="Website Builder"
      eyebrowColor="var(--accent)"
      title="Start or continue a website build"
      description="Add the website, brief, or existing copy. Get the final sitemap, page direction, and implementation scope."
      controlsBelow
      controls={<EngineIndexControls
        metrics={[]}
        action={{ label: "Generate website", onClick: startWebsite, disabled: state.role === "client" && !availableClients.length }}
      />}
      overview={<EngineIndexOverview
        metrics={[{ label: `${cards.length} created`, tone: "accent" }]}
      />}
      countLabel="build"
      cards={cards}
    />
  </div>;
  const savedWork = state.clientWorkspaces[client.id]?.engineWork.websiteBuilder;
  const savedPayload = savedWork?.payload as { session?: GuidedAuditSession; data?: unknown; aiResults?: unknown } | undefined;
  const saveBuilderSession = (session: GuidedAuditSession) => {
    actions.update(current => ({
      clientWorkspaces: saveEngineWork(current.clientWorkspaces, client.id, "websiteBuilder", engineWorkFromGuidedSession(session)),
    }));
  };
  const completeBuilder = (data: Record<string, string | string[]>, aiResults: unknown) => {
    window.localStorage.setItem(`baltazar:website-builder:${client.id}`, JSON.stringify({ data, aiResults, savedAt: new Date().toISOString() }));
    actions.update(current => {
      const existing = current.clientWorkspaces[client.id]?.engineWork.websiteBuilder;
      const payload = existing?.payload as { session?: GuidedAuditSession } | undefined;
      return {
        clientWorkspaces: saveEngineWork(current.clientWorkspaces, client.id, "websiteBuilder", {
          status: "complete",
          progress: 100,
          updatedAt: new Date().toISOString(),
          processRun: existing?.processRun,
          payload: { session: payload?.session, data, aiResults },
        }),
      };
    });
    setActivityByClient(current => ({ ...current, [client.id]: "complete" }));
  };
  const importWebsiteTasks = (drafts: TaskImportDraft[]) => actions.bulkImportTasks(drafts, taskIds => {
    if (!sourceHandoffId || !taskIds.length) return;
    actions.update(current => ({
      clientWorkspaces: linkPortalProcessHandoffTasks(current.clientWorkspaces, client.id, sourceHandoffId, taskIds),
    }));
    setActiveHandoff(current => current ? { ...current, createdTaskIds: [...new Set([...current.createdTaskIds, ...taskIds])] } : current);
  });
  const handoffStats = activeHandoff ? [
    `${activeHandoff.approvedScope.length} evidence scope${activeHandoff.approvedScope.length === 1 ? "" : "s"}`,
    `${activeHandoff.includedRecommendations.length} recommendation${activeHandoff.includedRecommendations.length === 1 ? "" : "s"}`,
    `${activeHandoff.unresolvedItems.length} unresolved`,
  ] : [];
  return (
    <div style={css("width:100%;padding:" + (state.isMobile ? "1rem .9rem 1.5rem" : "1.4rem 1.5rem"))}>
      {handoffSource && (
        <div style={css("max-width:60rem;margin:0 auto .75rem;padding:.72rem .82rem;border:1px solid color-mix(in srgb,var(--accent) 25%,var(--border-soft) 75%);border-radius:.8rem;background:var(--accent-soft);display:flex;align-items:flex-start;gap:.6rem;flex-wrap:wrap")}>
          <Icon name="checkmark" size={14}/>
          <div style={{ flex: 1, minWidth: "12rem" }}>
            <strong style={css("display:block;font-size:var(--text-2xs);font-weight:500")}>Approved Checkup dependency</strong>
            <span style={css("display:block;margin-top:.12rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>
              {activeHandoff
                ? `${activeHandoff.finalOutput} · exact output v${activeHandoff.sourceOutputVersion} · approved ${activeHandoff.approvedAt ? new Date(activeHandoff.approvedAt).toLocaleDateString() : "for handoff"}`
                : handoffSource === "brand-audit"
                  ? "Brand positioning, messaging, and visual priorities are available in this build."
                  : "Website findings, page priorities, and recommendations are available in this build."}
            </span>
            {handoffStats.length > 0 && <span style={css("display:block;margin-top:.24rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>{handoffStats.join(" · ")}</span>}
            {activeHandoff && (
              <details style={css("margin-top:.38rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>
                <summary style={css("cursor:pointer;color:var(--accent);font-weight:500")}>Show exact evidence dependencies</summary>
                <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(14rem,100%),1fr));gap:.45rem;margin-top:.45rem")}>
                  <div><strong style={css("display:block;color:var(--fg);font-weight:500")}>Approved scope</strong>{activeHandoff.approvedScope.length ? activeHandoff.approvedScope.map(item => <span key={item} style={css("display:block;margin-top:.18rem")}>• {item}</span>) : <span>None recorded</span>}</div>
                  <div><strong style={css("display:block;color:var(--fg);font-weight:500")}>Included recommendations</strong>{activeHandoff.includedRecommendations.length ? activeHandoff.includedRecommendations.map(item => <span key={item} style={css("display:block;margin-top:.18rem")}>• {item}</span>) : <span>None recorded</span>}</div>
                  {activeHandoff.unresolvedItems.length > 0 && <div><strong style={css("display:block;color:var(--warn);font-weight:500")}>Still unresolved</strong>{activeHandoff.unresolvedItems.map(item => <span key={item} style={css("display:block;margin-top:.18rem")}>• {item}</span>)}</div>}
                </div>
              </details>
            )}
          </div>
          <span className="pt-badge" style={css("padding:.22rem .5rem;border-radius:999px;background:var(--surface);font-size:var(--text-2xs);color:var(--accent)")}>{activeHandoff?.approvalStatus === "approved" ? "Approved" : "No restart needed"}</span>
        </div>
      )}
      <DiscoveryBuilder
        key={client.id}
        mobile={state.isMobile}
        accent="var(--accent)"
        title="Website Builder"
        clientName={client.name}
        intro={{ eyebrow: "Website planning · Guided build", heading: "Turn the right sources into a build-ready website brief." }}
        wizard={WIZARD}
        stages={STAGES}
        introSteps={INTRO}
        prefill={builderKnow.data}
        prefillSources={builderKnow.sources}
        prefillNotes={builderKnow.notes}
        quickStartMode="website_builder"
        onIngest={delta => setBuilderKnow(current => mergeKnow(current, delta))}
        generationMode="website_builder"
        sessionKey={`website-builder-${client.id}`}
        processId="website-build"
        accessState={state}
        onOpenApprovals={() => actions.setView("review")}
        processClientId={client.id}
        processRunId={`website-builder-${client.id}`}
        processSourceHandoffId={sourceHandoffId || undefined}
        initialSession={savedPayload?.session}
        onSessionChange={saveBuilderSession}
        startLabel="Start website intake →"
        progressLabel="intake"
        completeTitle="Intake complete"
        completeMsg="The approved pages, source material, copy direction, and build requirements are ready to map."
        completeCta="Create build-ready brief →"
        pipeline={PIPELINE}
        showToast={actions.showToast}
        onExit={() => {
          setHandoffSource(null);
          setSourceHandoffId(null);
          setActiveHandoff(null);
          if (state.role === "client") actions.setView("progress");
          else setClient(null);
        }}
        onComplete={() => {
          setHandoffSource(null);
          setSourceHandoffId(null);
          setActiveHandoff(null);
          if (state.role === "client") actions.setView("progress");
          else setClient(null);
        }}
        onImportTasks={importWebsiteTasks}
        onPipelineComplete={completeBuilder}
        onShareFinal={(_data, aiResults) => {
          const output = portalApprovalOutput(aiResults, "The final website brief and implementation tasks are ready.");
          actions.shareFinalOutput({ clientName: client.name, title: "Website Builder · Final build-ready brief", outputType: "builder", ...output });
        }}
      />
    </div>
  );
}
