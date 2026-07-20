"use client";

import { useEffect, useMemo, useState } from "react";
import { isAiStageResult } from "@/lib/aiStageGeneration";
import { css } from "../helpers";
import { Icon } from "../icons";
import { clientsVisibleToRole, type StudioClient } from "../clients";
import type { PortalActions, PortalState } from "../store";
import { ClientPickerGrid } from "../components/ClientPickerGrid";
import { DiscoveryBuilder, type DiscoveryIntroStep, type DiscoveryStage, type DiscoveryTopic, type Pipeline, type StageRenderCtx } from "../discovery/DiscoveryBuilder";
import { FunnelFlowHero } from "../discovery/funnelPipeline";
import { fromClientMemory, getKnowledge, mergeKnow, type Know } from "../discovery/knowledge";
import { BuilderTaskPanel } from "./BuilderTaskPanel";
import type { TaskImportDraft } from "../types";
import { portalApprovalOutput } from "@/lib/portalApprovalOutput";
import { WEBSITE_BUILDER_WIZARD } from "./websiteBuilderData";

/* Website intake questions live in websiteBuilderData so the live builder and
   service manual always describe the same questionnaire. */
const WIZARD: DiscoveryTopic[] = WEBSITE_BUILDER_WIZARD;

const STAGES: DiscoveryStage[] = [
  { key: "discovery", label: "Builder intake", icon: "inbox" },
  { key: "direction", label: "Build-ready brief", icon: "chart" },
  { key: "tasks", label: "Task plan", icon: "checklist" },
];

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
  return <article style={css("max-width:48rem;margin:0 auto;border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:" + (mobile ? "1.15rem" : "1.65rem 1.8rem") + ";display:flex;flex-direction:column;gap:1.25rem") }>
    <header>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap") }><span style={css("font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>Website build-ready brief</span><span style={css("font-size:.68rem;color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:.25rem .65rem")}>Ready to review and scope</span></div>
      <h2 style={css("margin:.45rem 0 0;font-size:1.4rem;line-height:1.25;font-weight:500")}>{result.title}</h2>
      <p style={css("margin:.55rem 0 0;max-width:42rem;font-size:.84rem;line-height:1.6;color:var(--fg-muted)")}>{result.summary}</p>
    </header>
    {plan && <section><div style={css("font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>Plan at a glance</div><p style={css("margin:.35rem 0 0;font-size:.78rem;line-height:1.5;color:var(--fg-muted)")}>{plan.body}</p><div style={css("display:flex;flex-direction:column;gap:.4rem;margin-top:.85rem")}>{plan.bullets.map(item => { const [label, value] = splitFact(item); return <div key={item} style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "9rem minmax(0,1fr)") + ";gap:.3rem .75rem;border:1px solid var(--border-soft);border-radius:.75rem;padding:.62rem .72rem") }><div style={css("font-size:.64rem;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-faint)")}>{label.trim()}</div><div style={css("font-size:.77rem;line-height:1.4")}>{value.trim()}</div></div>; })}</div></section>}
    <section style={css("border-top:1px solid var(--border-soft);padding-top:1.2rem") }><div style={css("font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>What changes in this rebuild</div><div style={css("display:flex;flex-direction:column;gap:.55rem;margin-top:.75rem")}>{result.recommendations.map(item => <div key={item.title} style={css("display:grid;grid-template-columns:1.5rem minmax(0,1fr);gap:.65rem;border:1px solid var(--border-soft);border-radius:.8rem;padding:.72rem .8rem") }><span style={css("width:1.4rem;height:1.4rem;border-radius:.45rem;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);font-size:.68rem")}>↗</span><div><strong style={css("font-size:.78rem;font-weight:500")}>{item.title}</strong><p style={css("margin:.25rem 0 0;font-size:.72rem;line-height:1.45;color:var(--fg-muted)")}>{item.rationale}</p><p style={css("margin:.3rem 0 0;font-size:.72rem;line-height:1.45")}>{item.action}</p></div></div>)}</div></section>
    {pages && <section style={css("border-top:1px solid var(--border-soft);padding-top:1.2rem") }><div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:.75rem") }><div><div style={css("font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>01 · Final sitemap and page briefs</div><h3 style={css("margin:.25rem 0 0;font-size:1.03rem;font-weight:500")}>{pages.heading}</h3></div><span style={css("font-size:.68rem;color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:.22rem .58rem")}>{pages.bullets.length} scoped pages</span></div><p style={css("margin:.4rem 0 0;font-size:.77rem;line-height:1.5;color:var(--fg-muted)")}>{pages.body}</p><div style={css("display:flex;flex-direction:column;gap:.34rem;margin-top:.75rem")}>{visiblePages.map((item, index) => { const template = item.startsWith("Template · "); const label = item.replace(/^(?:Page|Template) · /, ""); return <div key={item} style={css("display:grid;grid-template-columns:2rem 4.4rem minmax(0,1fr);gap:.5rem;align-items:center;border:1px solid var(--border-soft);border-radius:.65rem;padding:.5rem .62rem;min-width:0") }><span style={css("font-size:.62rem;color:var(--accent)")}>{String(index + 1).padStart(2, "0")}</span><span style={css("font-size:.58rem;text-align:center;text-transform:uppercase;letter-spacing:.03em;color:" + (template ? "var(--accent)" : "var(--fg-faint)") + ";background:" + (template ? "var(--accent-soft)" : "var(--surface-alt)") + ";border-radius:999px;padding:.14rem .35rem")}>{template ? "Template" : "Page"}</span><span title={label} style={css("min-width:0;font-size:.72rem;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{label}</span></div>; })}</div>{pages.bullets.length > 8 && <button type="button" onClick={() => setShowAllPages(value => !value)} className="pt-softbtn" aria-expanded={showAllPages} style={css("display:flex;align-items:center;justify-content:center;width:100%;margin-top:.5rem;border:1px solid var(--border-soft);border-radius:999px;background:var(--surface-alt);color:var(--fg-muted);padding:.48rem .75rem;font-size:.72rem;font-weight:500;cursor:pointer")}>{showAllPages ? "Show fewer pages" : `See all ${pages.bullets.length} scoped pages`}</button>}</section>}
    {homepage && <section style={css("border-top:1px solid var(--border-soft);padding-top:1.2rem") }><div style={css("display:flex;align-items:center;justify-content:space-between;gap:.65rem;flex-wrap:wrap") }><div style={css("font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>02 · Copy and site design direction</div><span style={css("font-size:.65rem;color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:.2rem .55rem")}>Applies to every scoped page</span></div><h3 style={css("margin:.25rem 0 0;font-size:1.03rem;font-weight:500")}>{homepage.heading}</h3><p style={css("margin:.4rem 0 0;font-size:.77rem;line-height:1.5;color:var(--fg-muted)")}>{homepage.body}</p><div style={css("display:flex;flex-direction:column;gap:.4rem;margin-top:.75rem")}>{homepage.bullets.map((item, index) => <div key={item} style={css("display:grid;grid-template-columns:1.75rem minmax(0,1fr);gap:.6rem;align-items:start;border:1px solid var(--border-soft);border-radius:.75rem;padding:.62rem .68rem") }><span style={css("width:1.5rem;height:1.5rem;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);font-size:.62rem")}>{index + 1}</span><span style={css("font-size:.74rem;line-height:1.45")}>{item.replace(/^\d+[.)]\s*/, "")}</span></div>)}</div><div style={css("margin-top:.75rem;border-left:3px solid var(--accent);border-radius:0 .7rem .7rem 0;background:var(--accent-soft);padding:.68rem .78rem;font-size:.73rem;line-height:1.45;color:var(--fg-muted)")}>This direction maps the approved source material and copy approach across the final sitemap. Design begins only for the pages listed in the scoped page brief above.</div></section>}
    {phases && <section style={css("border-top:1px solid var(--border-soft);padding-top:1.2rem") }><div style={css("font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>03 · Development timeline</div><h3 style={css("margin:.25rem 0 0;font-size:1.03rem;font-weight:500")}>{phases.heading}</h3><div style={css("margin-top:.55rem;border:1px solid color-mix(in srgb,var(--accent) 22%,var(--border-soft) 78%);border-radius:.75rem;background:var(--accent-soft);padding:.65rem .75rem") }><div style={css("font-size:.64rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>Estimated timeline</div><p style={css("margin:.25rem 0 0;font-size:.75rem;line-height:1.5;color:var(--fg-muted)")}>{phases.body}</p></div><div style={css("display:flex;flex-direction:column;margin-top:.85rem")}>{phases.bullets.map((item, index) => { const timing = item.match(/\(([^)]+)\)/)?.[1] || "Timing to confirm"; const cleanItem = item.replace(/\s*\([^)]+\)/, "").replace(/^\d+[.)]\s*/, ""); return <div key={item} style={css("position:relative;display:grid;grid-template-columns:2rem minmax(0,1fr);gap:.7rem;padding-bottom:" + (index < phases.bullets.length - 1 ? ".75rem" : "0"))}>{index < phases.bullets.length - 1 && <span aria-hidden="true" style={css("position:absolute;left:.94rem;top:1.65rem;bottom:0;width:1px;background:var(--border)")}/>}<span style={css("position:relative;z-index:1;width:1.85rem;height:1.85rem;border-radius:50%;display:grid;place-items:center;border:1px solid var(--accent);background:" + (index === 0 ? "var(--accent)" : "var(--surface)") + ";color:" + (index === 0 ? "#fff" : "var(--accent)") + ";font-size:.62rem;font-weight:500")}>{index + 1}</span><div style={css("border:1px solid " + (index === 0 ? "color-mix(in srgb,var(--accent) 30%,var(--border-soft) 70%)" : "var(--border-soft)") + ";border-radius:.75rem;padding:.62rem .7rem;background:" + (index === 0 ? "var(--accent-soft)" : "var(--surface)") )}><div style={css("display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap") }><span style={css("font-size:.65rem;font-weight:500;color:var(--accent)")}>{index === 0 ? "MILESTONE 1 · PRIORITY" : `MILESTONE ${index + 1}`}</span><span style={css("font-size:.62rem;color:var(--fg-muted);background:var(--surface);border-radius:999px;padding:.16rem .45rem")}>{timing}</span></div><p style={css("margin:.3rem 0 0;font-size:.74rem;line-height:1.45;font-weight:" + (index === 0 ? "500" : "400"))}>{cleanItem}</p></div></div>; })}</div></section>}
    {approval && <section style={css("border:1px solid color-mix(in srgb,var(--accent) 22%,var(--border-soft) 78%);border-radius:.85rem;background:var(--accent-soft);padding:.95rem") }><div style={css("font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>04 · Approval and rollout</div><h3 style={css("margin:.25rem 0 0;font-size:1rem;font-weight:500")}>{approval.heading}</h3><p style={css("margin:.38rem 0 0;font-size:.75rem;line-height:1.5;color:var(--fg-muted)")}>{approval.body}</p><ul style={css("margin:.68rem 0 0;padding-left:1.05rem;display:flex;flex-direction:column;gap:.35rem")}>{approval.bullets.map(item => <li key={item} style={css("font-size:.73rem;line-height:1.45")}>{item}</li>)}</ul></section>}
  </article>;
}

function getAiResult(value: StageRenderCtx["aiResult"]) {
  return isAiStageResult(value) ? value : null;
}

function renderResult(ctx: StageRenderCtx) {
  const result = isAiStageResult(ctx.aiResult) ? ctx.aiResult : null;
  if (!result) return <div style={css("padding:1rem;color:var(--fg-muted)")}>Generate this stage to review the build-ready website brief.</div>;
  if (ctx.stageKey === "direction") return <HomepageDirection result={result} mobile={ctx.mobile}/>;
  return <div style={css("display:flex;flex-direction:column;gap:1rem") }><section style={css("border:1px solid color-mix(in srgb,var(--accent) 24%,var(--border-soft) 76%);border-radius:1rem;background:var(--accent-soft);padding:1.1rem 1.2rem") }><div style={css("font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>{ctx.stageKey === "tasks" ? "Implementation plan" : "Website build-ready brief"}</div><h3 style={css("margin:.25rem 0 0;font-size:1.15rem;font-weight:500")}>{result.title}</h3><p style={css("margin:.4rem 0 0;font-size:.8rem;line-height:1.55;color:var(--fg-muted)")}>{result.summary}</p></section>{result.sections.map(section => <section key={section.heading} style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);padding:1rem 1.1rem") }><h4 style={css("margin:0;font-size:.92rem;font-weight:500")}>{section.heading}</h4><p style={css("margin:.35rem 0 0;font-size:.77rem;line-height:1.5;color:var(--fg-muted)")}>{section.body}</p><ul style={css("margin:.65rem 0 0;padding-left:1.1rem;display:flex;flex-direction:column;gap:.35rem")}>{section.bullets.map(bullet => <li key={bullet} style={css("font-size:.75rem;line-height:1.45")}>{bullet}</li>)}</ul></section>)}</div>;
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
      <div style={css("padding:1.4rem 1.5rem") }><div style={css("font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>Builder complete</div><h2 style={css("margin:.3rem 0 0;font-size:1.3rem;font-weight:500")}>Build-ready brief and tasks are ready</h2><p style={css("margin:.45rem 0 0;font-size:.8rem;color:var(--fg-muted)")}>The final sitemap, page copy briefs, shared website direction, and implementation tasks are ready to use.</p><div style={css("display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem") }><button type="button" onClick={ctx.onExit} className="pt-softbtn" style={css("height:2.4rem;padding:0 1.1rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:.78rem;font-weight:500;cursor:pointer")}>Back to builders</button><button type="button" onClick={ctx.onShare} className="pt-op" style={css("height:2.4rem;padding:0 1.1rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font-size:.78rem;font-weight:500;cursor:pointer")}>Share in Approvals</button></div></div>
      <BuilderTaskPanel embedded drafts={taskDrafts} fileName={`${sourceBase}-website-tasks.csv`} mobile={ctx.mobile} onImport={ctx.onImportTasks}/>
    </section>;
  },
};

export function WebsiteBuilder({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [client, setClient] = useState<StudioClient | null>(null);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [builderKnow, setBuilderKnow] = useState<Know>({ data: {}, sources: {} });
  const [handoffSource, setHandoffSource] = useState<"brand-audit" | "website-audit" | null>(null);
  const availableClients = useMemo(() => clientsVisibleToRole(state.role, state.clientName), [state.clientName, state.role]);
  useEffect(() => {
    if (client && !availableClients.some(item => item.id === client.id)) setClient(null);
  }, [availableClients, client]);
  const openClient = (item: StudioClient) => {
    let nextKnow: Know = mergeKnow(
      getKnowledge(item.id),
      fromClientMemory(item.id, item.name, actions.workspaceForClient(item.name)),
    );
    let nextSource: "brand-audit" | "website-audit" | null = null;
    try {
      const raw = window.localStorage.getItem(`baltazar:builder-handoff:website:${item.id}`);
      if (raw) {
        const saved = JSON.parse(raw) as { source?: "brand-audit" | "website-audit"; data?: Know["data"]; answers?: Know["data"] };
        const imported = saved.answers || saved.data || {};
        nextSource = saved.source || "website-audit";
        nextKnow = mergeKnow(nextKnow, { data: imported, sources: Object.fromEntries(Object.keys(imported).map(key => [key, nextSource === "brand-audit" ? "Brand audit" : "Website audit"])) });
      }
    } catch { /* start with an empty builder if an old handoff cannot be read */ }
    setBuilderKnow(nextKnow);
    setHandoffSource(nextSource);
    setClient(item);
  };
  useEffect(() => {
    if (client) return;
    const clientId = window.localStorage.getItem("baltazar:builder-active:website");
    const item = availableClients.find(candidate => candidate.id === clientId);
    if (item) openClient(item);
    if (clientId) window.localStorage.removeItem("baltazar:builder-active:website");
  }, [availableClients, client]);
  const cards = useMemo(() => availableClients.map(item => ({ id: item.id, name: item.name, subtitle: "Website build-ready brief", statusLabel: "Not started", statusTone: "muted" as const, stage: "Website builder", progress: 0, owner: item.owner, due: "—", headerAction: { label: `Create website build for ${item.name}`, icon: "plus", onClick: () => openClient(item) }, showStatus: false, showProgress: false, showStage: false, showMeta: false, showFooter: false, hero: <FunnelFlowHero direction="Website planning" goal="Final sitemap and page briefs" build="Not started" readyCount={0} />, primaryLabel: "Open builder", onPrimary: () => openClient(item), secondaryLabel: "New build", secondaryIcon: "plus", onSecondary: () => openClient(item) })), [availableClients]);
  if (!client) return <div style={css("width:100%;padding:1.6rem 2rem 2.4rem") }>
    <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;padding:1rem 1.1rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);margin-bottom:1rem") }>
      <div style={{ minWidth: 0 }}><span style={css("text-transform:uppercase;font-size:.68rem;font-weight:400;letter-spacing:.04em;line-height:1.2;display:block;color:var(--accent);margin-bottom:.45rem")}>Website build plans</span><h2 style={css("margin:0;font-size:1.22rem;font-weight:500;line-height:1.15")}>Generate or reopen a website build</h2><p style={css("margin:.45rem 0 0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.55;max-width:36rem")}>Use an existing website, uploaded brief, or existing copy to define the final sitemap, page-by-page copy direction, and build-ready implementation scope.</p></div>
      <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap;flex-shrink:0") }><span style={css("display:inline-flex;align-items:center;gap:.35rem;padding:.45rem .75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:.73rem;color:var(--fg-muted)")}><span style={css("width:.42rem;height:.42rem;border-radius:50%;background:var(--accent)")}/>0 created</span><div style={{ position: "relative" }}><button type="button" onClick={() => setLaunchOpen(value => !value)} style={css("display:inline-flex;align-items:center;gap:.42rem;min-height:2.3rem;padding:0 .95rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font-size:.78rem;font-weight:500;cursor:pointer")}><Icon name="plus" size={15}/>Generate website</button>{launchOpen && <><div onClick={() => setLaunchOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 34 }}/><div style={css("position:absolute;top:2.7rem;right:0;width:min(24rem,calc(100vw - 2rem));padding:.45rem;border:1px solid var(--border);border-radius:1rem;background:var(--surface);z-index:35") }><div style={css("padding:.5rem .65rem .45rem") }><div style={css("font-size:.8rem;font-weight:500")}>Choose a client</div><div style={css("font-size:.69rem;color:var(--fg-faint);margin-top:.18rem")}>Start from an existing website, uploaded brief, copy document, or a combination.</div></div><div style={css("display:flex;flex-direction:column;gap:.2rem")}>{availableClients.map(item => <button key={item.id} type="button" onClick={() => { setLaunchOpen(false); openClient(item); }} style={css("display:flex;align-items:center;gap:.65rem;width:100%;padding:.62rem .7rem;border:none;border-radius:.85rem;background:transparent;color:var(--fg);text-align:left;cursor:pointer") }><span style={css("width:1.8rem;height:1.8rem;border-radius:.55rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-size:var(--text-xs);font-weight:500")}>{item.name[0]}</span><span style={css("font-size:.8rem;font-weight:500")}>{item.name}</span></button>)}</div></div></>}</div></div>
    </div>
    <ClientPickerGrid countLabel="brand" compact cards={cards}/>
  </div>;
  return <div style={css("width:100%;padding:" + (state.isMobile ? "1rem .9rem 1.5rem" : "1.4rem 1.5rem"))}>{handoffSource && <div style={css("max-width:60rem;margin:0 auto .75rem;padding:.72rem .82rem;border:1px solid color-mix(in srgb,var(--accent) 25%,var(--border-soft) 75%);border-radius:.8rem;background:var(--accent-soft);display:flex;align-items:center;gap:.6rem;flex-wrap:wrap") }><Icon name="checkmark" size={14}/><div style={{ flex: 1, minWidth: "12rem" }}><strong style={css("display:block;font-size:.72rem;font-weight:500")}>Audit insights carried forward</strong><span style={css("display:block;margin-top:.12rem;font-size:.62rem;color:var(--fg-muted)")}>{handoffSource === "brand-audit" ? "Brand positioning, messaging, and visual priorities" : "Website findings, page priorities, and recommendations"} are available in this build.</span></div><span style={css("padding:.22rem .5rem;border-radius:999px;background:var(--surface);font-size:.58rem;color:var(--accent)")}>No restart needed</span></div>}<DiscoveryBuilder key={client.id} mobile={state.isMobile} accent="var(--accent)" title="Website Builder" clientName={client.name} intro={{ eyebrow: "Website planning · Guided build", heading: "Turn the right sources into a build-ready website brief." }} wizard={WIZARD} stages={STAGES} introSteps={INTRO} prefill={builderKnow.data} prefillSources={builderKnow.sources} prefillNotes={builderKnow.notes} quickStartMode="website_builder" onIngest={delta => setBuilderKnow(current => mergeKnow(current, delta))} generationMode="website_builder" startLabel="Start website intake →" backLabel="← All builders" progressLabel="intake" completeTitle="Intake complete" completeMsg="The approved pages, source material, copy direction, and build requirements are ready to map." completeCta="Create build-ready brief →" pipeline={PIPELINE} showToast={actions.showToast} onExit={() => { setHandoffSource(null); setClient(null); }} onComplete={() => { setHandoffSource(null); setClient(null); }} onImportTasks={actions.bulkImportTasks} onPipelineComplete={(data, aiResults) => { window.localStorage.setItem(`baltazar:website-builder:${client.id}`, JSON.stringify({ data, aiResults, savedAt: new Date().toISOString() })); }} onShareFinal={(_data, aiResults) => { const output = portalApprovalOutput(aiResults, "The final website brief and implementation tasks are ready."); actions.shareFinalOutput({ clientName: client.name, title: "Website Builder · Final build-ready brief", outputType: "builder", ...output }); }}/></div>;
}
