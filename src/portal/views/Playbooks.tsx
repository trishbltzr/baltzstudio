"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import { ALL_PROJECTS, SVC_META } from "../data";
import {
  PB_SEED, SVC_ORDER, governedPlaybook, ownerMeta, genMd, pbMeta, parseProcess, readerBody,
  type PlaybookLifecycle, type PlaybookSeed,
} from "../playbooks";
import type { PortalActions, PortalState } from "../store";
import type { Service } from "../types";
import { STUDIO_CLIENTS } from "../clients";
import { workspaceProcessRuns } from "../selectors";
import { mergePortalClientWorkspace } from "@/lib/portalWorkspacePersistence";
import { portalOperationalMetrics } from "@/lib/portalProcessRuns";

const NEW_TEMPLATE = "# New function\n\n## Summary\nDescribe what this playbook covers and when it runs.\n\n## Process\n1. **Admin** — First step\n2. **Studio** — Second step\n3. **Client** — Client action\n\n## Outputs\n- What this produces\n\n## Notes\nAnything else worth flagging.";

const activeClients = (svc: Service) => ALL_PROJECTS.filter(p => p.service === svc).length;
const PLAYBOOK_STORAGE_KEY = "baltz.playbooks.governed.v1";
const ROLE_LABEL: Record<string, string> = { admin: "Admin", studio: "Studio", client: "Client", assistant: "Assistant", shared: "Studio + client" };
const formatMinutes = (minutes: number | null) => minutes == null ? "Not measured" : minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.round(minutes / 60)}h` : `${Math.round(minutes / 1440)}d`;

type PlaybookForm = {
  service: Service;
  md: string;
  lifecycle: PlaybookLifecycle;
  version: number;
  changeSummary: string;
  owner: string;
  lastReviewedAt: string;
  requiredInputs: string;
  editableClientFields: string;
  agentEnabled: boolean;
  agentVersion: number;
  agentInstructions: string;
  agentTools: string;
  agentMemoryPolicy: string;
  agentApprovalGates: string;
  agentSamplePrompt: string;
  agentEvalStatus: "not_run" | "passing" | "failing";
};

const NEW_FORM: PlaybookForm = {
  service: "cocoon",
  md: NEW_TEMPLATE,
  lifecycle: "draft",
  version: 1,
  changeSummary: "Initial draft",
  owner: "Trisha Baltazar",
  lastReviewedAt: "2026-07-23",
  requiredInputs: "Client or project context",
  editableClientFields: "Client name, project context",
  agentEnabled: true,
  agentVersion: 1,
  agentInstructions: "Follow this published Playbook, use only evidence scoped to the active client run, and route material or unsupported claims to human review.",
  agentTools: "lookup_review_targets, list_scoped_evidence, retrieve_scoped_evidence, propose_human_review",
  agentMemoryPolicy: "Approved client + service + stage facts only; no transcript replay or automatic durable memory.",
  agentApprovalGates: "Material client-facing claims, Scope changes, Publication and handoff",
  agentSamplePrompt: "Review only the selected checks using the evidence attached to this run.",
  agentEvalStatus: "not_run",
};

// ── inline markdown ────────────────────────────────────────────────────────
function mdInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] != null) nodes.push(<strong key={keyPrefix + i} style={{ fontWeight: 500 }}>{m[2]}</strong>);
    else if (m[3] != null) nodes.push(<code key={keyPrefix + i} style={css("font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.82em;background:var(--surface-alt);padding:0.06rem 0.32rem;border-radius:0.3rem")}>{m[3]}</code>);
    else nodes.push(<a key={keyPrefix + i} href={m[5]} style={css("color:var(--accent);text-decoration:underline")}>{m[4]}</a>);
    last = m.index + m[0].length; i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// ── block markdown → react ─────────────────────────────────────────────────
function Markdown({ md }: { md: string }) {
  const blocks: ReactNode[] = [];
  const lines = (md || "").split("\n");
  let ul: string[] = [], ol: string[] = [], k = 0;
  const flush = () => {
    if (ul.length) {
      blocks.push(
        <ul key={"ul" + k++} style={css("margin:0.4rem 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:0.3rem")}>
          {ul.map((it, i) => (
            <li key={i} style={css("display:flex;align-items:flex-start;gap:0.55rem;font-size:var(--text-base);line-height:1.5;color:var(--fg-muted)")}>
              <span style={css("width:0.32rem;height:0.32rem;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:0.5rem")} />
              <span>{mdInline(it, "ul" + i)}</span>
            </li>
          ))}
        </ul>,
      );
      ul = [];
    }
    if (ol.length) {
      blocks.push(
        <ol key={"ol" + k++} style={css("margin:0.4rem 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:0.35rem")}>
          {ol.map((it, i) => (
            <li key={i} style={css("display:flex;align-items:flex-start;gap:0.6rem;font-size:var(--text-base);line-height:1.5;color:var(--fg-muted)")}>
              <span style={css("flex-shrink:0;width:1.25rem;height:1.25rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:var(--text-2xs);font-weight:500;display:grid;place-items:center;margin-top:0.05rem")}>{i + 1}</span>
              <span>{mdInline(it, "ol" + i)}</span>
            </li>
          ))}
        </ol>,
      );
      ol = [];
    }
  };
  for (const raw of lines) {
    const ln = raw.replace(/\s+$/, "");
    if (/^#\s/.test(ln)) { flush(); continue; }
    if (/^##\s/.test(ln)) { flush(); blocks.push(<div key={k++} style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint);margin:0.95rem 0 0.15rem")}>{ln.replace(/^##\s+/, "")}</div>); continue; }
    if (/^###\s/.test(ln)) { flush(); blocks.push(<div key={k++} style={css("font-size:var(--text-md);font-weight:500;margin:0.7rem 0 0.1rem")}>{ln.replace(/^###\s+/, "")}</div>); continue; }
    if (/^---+$/.test(ln)) { flush(); blocks.push(<hr key={k++} style={css("border:0;border-top:1px solid var(--border-soft);margin:0.85rem 0")} />); continue; }
    if (/^>\s?/.test(ln)) { flush(); blocks.push(<blockquote key={k++} style={css("margin:0.5rem 0;padding:0.5rem 0.85rem;border-left:2px solid var(--accent);background:var(--surface-alt);border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-size:var(--text-base);line-height:1.5;color:var(--fg-muted)")}>{mdInline(ln.replace(/^>\s?/, ""), "bq")}</blockquote>); continue; }
    if (/^\s*[-*]\s+/.test(ln)) { if (ol.length) flush(); ul.push(ln.replace(/^\s*[-*]\s+/, "")); continue; }
    if (/^\s*\d+\.\s+/.test(ln)) { if (ul.length) flush(); ol.push(ln.replace(/^\s*\d+\.\s+/, "")); continue; }
    if (!ln.trim()) { flush(); continue; }
    flush();
    blocks.push(<p key={k++} style={css("margin:0.35rem 0;font-size:var(--text-base);line-height:1.55;color:var(--fg-muted)")}>{mdInline(ln, "p")}</p>);
  }
  flush();
  return <div>{blocks}</div>;
}

export function Playbooks({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const mobile = state.isMobile;
  const [pbDoc, setPbDoc] = useState<string | null>(null);
  const [pbRaw, setPbRaw] = useState(false);
  const [pbEditing, setPbEditing] = useState(false);
  const [form, setForm] = useState<PlaybookForm>(NEW_FORM);
  const [extra, setExtra] = useState<PlaybookSeed[]>([]);
  const [extraLoaded, setExtraLoaded] = useState(false);
  const [previewMode, setPreviewMode] = useState<"roles" | "sample" | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(PLAYBOOK_STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) setExtra(saved.filter(item => item && typeof item.id === "string" && item.custom === true));
    } catch { /* use the empty custom library */ }
    setExtraLoaded(true);
  }, []);

  useEffect(() => {
    if (!extraLoaded) return;
    try { window.localStorage.setItem(PLAYBOOK_STORAGE_KEY, JSON.stringify(extra)); } catch { /* keep the in-memory draft */ }
  }, [extra, extraLoaded]);

  const all = useMemo(() => [...PB_SEED, ...extra], [extra]);
  const groups = useMemo(() => SVC_ORDER.map(svc => ({ svc, docs: all.filter(d => d.svc === svc) })).filter(g => g.docs.length), [all]);
  const selected = pbDoc ? all.find(d => d.id === pbDoc) || null : null;
  const processRuns = useMemo(() => Object.entries(state.clientWorkspaces).flatMap(([clientId, saved]) => {
    const clientName = STUDIO_CLIENTS.find(client => client.id === clientId)?.name || clientId;
    return workspaceProcessRuns(clientId, clientName, mergePortalClientWorkspace(clientId, saved));
  }), [state.clientWorkspaces]);

  function open(id: string) { setPbDoc(id); setPbRaw(false); setPreviewMode(null); }
  function startNew() { setForm(NEW_FORM); setPbEditing(true); }
  function copyMd(md: string) { try { void navigator.clipboard?.writeText(md); } catch { /* ignore */ } actions.showToast("Markdown copied"); }
  function save() {
    const meta = pbMeta(form.md);
    const id = "pb" + all.length + "-" + form.service;
    const requiredInputs = form.requiredInputs.split(",").map(label => label.trim()).filter(Boolean).map(label => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, required: true, validation: "Required before the Playbook starts." }));
    setExtra(x => [...x, { id, processId: null, svc: form.service, fn: meta.fn, purpose: meta.purpose, dur: "Custom", tag: "Custom", icon: "layers", md: form.md, custom: true, governance: { lifecycle: form.lifecycle, version: form.version, changeSummary: form.changeSummary, owner: form.owner, lastReviewedAt: form.lastReviewedAt, requiredInputs, editableClientFields: form.editableClientFields.split(",").map(value => value.trim()).filter(Boolean), agent: { enabled: form.agentEnabled, definitionKey: `${id}-service-agent`, lifecycle: form.lifecycle, version: form.agentVersion, instructions: form.agentInstructions, allowedTools: form.agentTools.split(",").map(value => value.trim()).filter(Boolean), memoryPolicy: form.agentMemoryPolicy, approvalGates: form.agentApprovalGates.split(",").map(value => value.trim()).filter(Boolean), samplePrompt: form.agentSamplePrompt, evalStatus: form.agentEvalStatus } } }]);
    setPbEditing(false); setPbDoc(id); setPbRaw(false);
    actions.showToast("Playbook saved");
  }

  function setLifecycle(id: string, lifecycle: PlaybookLifecycle) {
    setExtra(items => items.map(item => item.id === id ? { ...item, governance: { ...item.governance, lifecycle } } : item));
    actions.showToast(`Playbook ${lifecycle}`);
  }

  const backBtn = "display:inline-flex;align-items:center;gap:0.35rem;align-self:flex-start;height:2rem;padding:0 0.8rem 0 0.6rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer";

  // ── EDITOR ────────────────────────────────────────────────────────────────
  if (pbEditing) {
    const meta = pbMeta(form.md);
    const canSave = form.md.trim().length > 0 && meta.fn !== "Untitled";
    return (
      <div style={css("display:flex;flex-direction:column;gap:0.85rem" + (mobile ? ";padding-bottom:1.25rem" : ""))}>
        <button onClick={() => setPbEditing(false)} className="pt-iconbtn" style={css(backBtn)}><Icon name="chevleft" size={14} />Cancel</button>
        <div>
          <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>New Playbook</div>
          <h2 style={css("margin:0.2rem 0 0;font-size:" + (mobile ? "1.15rem" : "1.3rem") + ";font-weight:500")}>{meta.fn}</h2>
        </div>

        <div style={css("display:flex;gap:0.4rem;flex-wrap:wrap")}>
          {SVC_ORDER.map(svc => {
            const on = form.service === svc, sm = SVC_META[svc];
            return (
              <button key={svc} onClick={() => setForm(f => ({ ...f, service: svc }))} style={css("height:1.9rem;padding:0 0.85rem;border-radius:var(--radius-pill);font-size:var(--text-xs);font-weight:500;cursor:pointer;border:1px solid " + (on ? "transparent" : "var(--border-soft)") + ";background:" + (on ? "color-mix(in srgb," + sm.color + " 14%,var(--surface))" : "var(--surface)") + ";color:" + (on ? sm.color : "var(--fg-muted)"))}>{sm.label}</button>
            );
          })}
        </div>

        <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:0.9rem 1rem;display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:var(--space-3)")}>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Lifecycle<select value={form.lifecycle} onChange={event => setForm(current => ({ ...current, lifecycle: event.target.value as PlaybookLifecycle }))} style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Version<input type="number" min={1} value={form.version} onChange={event => setForm(current => ({ ...current, version: Math.max(1, Number(event.target.value) || 1) }))} style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")} /></label>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Last reviewed<input type="date" value={form.lastReviewedAt} onChange={event => setForm(current => ({ ...current, lastReviewedAt: event.target.value }))} style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")} /></label>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Owner<input value={form.owner} onChange={event => setForm(current => ({ ...current, owner: event.target.value }))} style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")} /></label>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Required inputs<input value={form.requiredInputs} onChange={event => setForm(current => ({ ...current, requiredInputs: event.target.value }))} placeholder="Comma separated" style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")} /></label>
          <label style={css("display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Editable client fields<input value={form.editableClientFields} onChange={event => setForm(current => ({ ...current, editableClientFields: event.target.value }))} placeholder="Comma separated" style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")} /></label>
          <label style={css("grid-column:1/-1;display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Change summary<input value={form.changeSummary} onChange={event => setForm(current => ({ ...current, changeSummary: event.target.value }))} style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")} /></label>
        </section>

        <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:.9rem 1rem;display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:var(--space-3)")}>
          <div style={css("grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)")}>
            <div><strong style={css("display:block;font-size:var(--text-sm);font-weight:500")}>Playbook agent</strong><span style={css("display:block;margin-top:.12rem;color:var(--fg-muted);font-size:var(--text-xs)")}>Versioned instructions, tools, memory, approvals, samples, and eval state.</span></div>
            <label style={css("display:inline-flex;align-items:center;gap:.45rem;font-size:var(--text-xs);color:var(--fg-muted)")}><input type="checkbox" checked={form.agentEnabled} onChange={event => setForm(current => ({ ...current, agentEnabled: event.target.checked }))} />Enabled</label>
          </div>
          <label style={css("display:flex;flex-direction:column;gap:.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Agent version<input type="number" min={1} value={form.agentVersion} onChange={event => setForm(current => ({ ...current, agentVersion: Math.max(1, Number(event.target.value) || 1) }))} style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")} /></label>
          <label style={css("display:flex;flex-direction:column;gap:.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Eval status<select value={form.agentEvalStatus} onChange={event => setForm(current => ({ ...current, agentEvalStatus: event.target.value as PlaybookForm["agentEvalStatus"] }))} style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")}><option value="not_run">Not run</option><option value="passing">Passing</option><option value="failing">Failing</option></select></label>
          <label style={css("grid-column:1/-1;display:flex;flex-direction:column;gap:.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Instructions<textarea value={form.agentInstructions} onChange={event => setForm(current => ({ ...current, agentInstructions: event.target.value }))} style={css("min-height:5rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:.6rem .65rem;color:var(--fg);resize:vertical")} /></label>
          <label style={css("grid-column:1/-1;display:flex;flex-direction:column;gap:.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Allowed tools<input value={form.agentTools} onChange={event => setForm(current => ({ ...current, agentTools: event.target.value }))} placeholder="Comma separated" style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")} /></label>
          <label style={css("grid-column:1/-1;display:flex;flex-direction:column;gap:.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Memory policy<input value={form.agentMemoryPolicy} onChange={event => setForm(current => ({ ...current, agentMemoryPolicy: event.target.value }))} style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")} /></label>
          <label style={css("grid-column:1/-1;display:flex;flex-direction:column;gap:.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Approval gates<input value={form.agentApprovalGates} onChange={event => setForm(current => ({ ...current, agentApprovalGates: event.target.value }))} placeholder="Comma separated" style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")} /></label>
          <label style={css("grid-column:1/-1;display:flex;flex-direction:column;gap:.3rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Sample prompt<input value={form.agentSamplePrompt} onChange={event => setForm(current => ({ ...current, agentSamplePrompt: event.target.value }))} style={css("height:2.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm);background:var(--surface);padding:0 .65rem;color:var(--fg)")} /></label>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: "0.85rem", alignItems: "start" }}>
          <div style={css("display:flex;flex-direction:column;gap:0.45rem")}>
            <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Markdown</div>
            <textarea value={form.md} onChange={e => setForm(f => ({ ...f, md: e.target.value }))} spellCheck={false} style={css("width:100%;min-height:22rem;resize:vertical;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:0.9rem 1rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:var(--text-xs);line-height:1.55;color:var(--fg);outline:none")} />
          </div>
          <div style={css("display:flex;flex-direction:column;gap:0.45rem")}>
            <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Preview</div>
            <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1rem 1.15rem;min-height:22rem")}><Markdown md={readerBody(form.md)} /></div>
          </div>
        </div>

        <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2)")}>
          <button onClick={() => setPbEditing(false)} className="pt-iconbtn" style={css("height:2.1rem;padding:0 1rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-sm);font-weight:500;cursor:pointer")}>Cancel</button>
          <button onClick={save} disabled={!canSave} style={css("height:2.1rem;padding:0 1.15rem;border:none;border-radius:var(--radius-pill);font-size:var(--text-sm);font-weight:500;cursor:" + (canSave ? "pointer" : "not-allowed") + ";background:" + (canSave ? "var(--accent)" : "var(--border-soft)") + ";color:" + (canSave ? "#fff" : "var(--fg-faint)"))}>Save playbook</button>
        </div>
      </div>
    );
  }

  // ── DETAIL / READER ────────────────────────────────────────────────────────
  if (selected) {
    const d = selected, sm = SVC_META[d.svc];
    const governance = governedPlaybook(d);
    const md = d.md || genMd(d);
    const steps = parseProcess(md);
    const active = activeClients(d.svc);
    const runs = d.processId ? processRuns.filter(run => run.processId === d.processId) : [];
    const activeRuns = runs.filter(run => run.status !== "complete");
    const runMetrics = runs.map(portalOperationalMetrics);
    const usageCount = Math.max(governance.usageCount, runs.length);
    const activeRunCount = Math.max(governance.activeRuns, activeRuns.length);
    const metaChips = [governance.lifecycle[0].toUpperCase() + governance.lifecycle.slice(1), `v${governance.version}`, d.dur, `${activeRunCount} active run${activeRunCount === 1 ? "" : "s"}`];
    const rows: [string, string][] = [["Service", sm.label], ["Timing", d.dur], ["Type", d.tag], ["Owner", governance.owner], ["Last reviewed", governance.lastReviewedAt || "Not reviewed"], ["Usage", String(usageCount)], ["Active runs", String(activeRunCount)]];
    const toggle = (on: boolean, label: string, click: () => void) => (
      <button onClick={click} style={css("height:1.85rem;padding:0 0.85rem;border:none;border-radius:var(--radius-pill);font-size:var(--text-2xs);font-weight:500;cursor:pointer;background:" + (on ? "var(--fg)" : "transparent") + ";color:" + (on ? "#fff" : "var(--fg-muted)"))}>{label}</button>
    );

    return (
      <div style={css("display:flex;flex-direction:column;gap:0.85rem" + (mobile ? ";padding-bottom:1.25rem" : ""))}>
        <button onClick={() => setPbDoc(null)} className="pt-iconbtn" style={css(backBtn)}><Icon name="chevleft" size={14} />All playbooks</button>

        <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "0.95rem" : "1.15rem 1.25rem"))}>
          <div style={css("display:flex;align-items:flex-start;gap:0.85rem;min-width:0")}>
            <span style={css("width:2.7rem;height:2.7rem;border-radius:var(--radius);display:grid;place-items:center;flex-shrink:0;background:color-mix(in srgb," + sm.color + " 13%,var(--surface));color:" + sm.color)}><Icon name={d.icon} size={20} /></span>
            <div style={css("min-width:0;flex:1")}>
              <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:" + sm.color)}>{sm.label}</div>
              <h2 style={css("margin:0.15rem 0 0;font-size:" + (mobile ? "1.15rem" : "1.3rem") + ";font-weight:500;line-height:1.15")}>{d.fn}</h2>
              <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.65rem")}>
                {metaChips.map((c, i) => <span key={i} style={css("font-size:var(--text-xs);font-weight:500;color:var(--fg-muted);background:var(--surface-alt);border:1px solid var(--border-soft);padding:0.15rem 0.6rem;border-radius:var(--radius-pill)")}>{c}</span>)}
              </div>
            </div>
          </div>
        </section>

        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem;flex-wrap:wrap")}>
          <div style={css("display:flex;gap:0.15rem;padding:0.2rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface)")}>
            {toggle(!pbRaw, "Document", () => setPbRaw(false))}
            {toggle(pbRaw, "Markdown", () => setPbRaw(true))}
          </div>
          <div style={css("display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap")}>
            {d.custom && governance.lifecycle !== "published" && <button onClick={() => setLifecycle(d.id, "published")} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;height:2rem;padding:0 0.85rem;border:1px solid var(--success);border-radius:var(--radius-pill);background:var(--success-soft);color:var(--success);font-size:var(--text-sm);font-weight:500;cursor:pointer")}>Publish</button>}
            {d.custom && governance.lifecycle !== "archived" && <button onClick={() => setLifecycle(d.id, "archived")} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;height:2rem;padding:0 0.85rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-sm);font-weight:500;cursor:pointer")}>Archive</button>}
            {d.sourceDocId && <button onClick={() => actions.patch({ playbookDoc: d.sourceDocId })} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;gap:0.35rem;height:2rem;padding:0 0.85rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-sm);font-weight:500;cursor:pointer")}><Icon name="layers" size={14} />Source reference</button>}
            <button onClick={() => copyMd(md)} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;gap:0.35rem;height:2rem;padding:0 0.85rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-sm);font-weight:500;cursor:pointer")}><Icon name="file" size={14} />Copy markdown</button>
          </div>
        </div>

        {pbRaw ? (
          <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
            <div style={css("padding:0.7rem 1rem;border-bottom:1px solid var(--border-soft);background:var(--surface-alt);font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Markdown Source</div>
            <pre style={css("margin:0;padding:1rem 1.15rem;white-space:pre-wrap;overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:var(--text-xs);line-height:1.6;color:var(--fg)")}>{md}</pre>
          </section>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "minmax(0,1fr) 15rem", gap: "0.85rem", alignItems: "start" }}>
            <div style={css("display:flex;flex-direction:column;gap:0.85rem;min-width:0")}>
              <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "0.9rem" : "1rem 1.15rem"))}>
                <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:0.85rem")}>Process Flow</div>
                <div style={css("display:flex;flex-direction:column")}>
                  {steps.map((s, i) => {
                    const om = ownerMeta(s.owner);
                    const last = i === steps.length - 1;
                    return (
                      <div key={i} style={css("display:flex;gap:0.8rem")}>
                        <div style={css("display:flex;flex-direction:column;align-items:center;flex-shrink:0")}>
                          <span style={css("width:1.6rem;height:1.6rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:var(--text-2xs);font-weight:500;display:grid;place-items:center")}>{i + 1}</span>
                          {!last && <span style={css("width:1.5px;flex:1;min-height:0.9rem;background:var(--border-soft);margin:0.3rem 0")} />}
                        </div>
                        <div style={css("flex:1;min-width:0;padding-bottom:" + (last ? "0" : "1rem"))}>
                          <span style={css("display:inline-flex;font-size:var(--text-2xs);font-weight:500;padding:0.1rem 0.5rem;border-radius:var(--radius-pill);background:" + om.s + ";color:" + om.c)}>{om.label}</span>
                          <div style={css("font-size:var(--text-base);line-height:1.5;color:var(--fg);margin-top:0.35rem")}>{s.text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "0.9rem" : "1rem 1.15rem") + ";display:flex;flex-direction:column;gap:0.9rem")}>
                <div>
                  <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Template Governance</div>
                  <div style={css("margin-top:.25rem;font-size:var(--text-base);font-weight:500;color:var(--fg)")}>{governance.changeSummary}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: "0.75rem" }}>
                  <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-sm);padding:var(--space-3);background:var(--surface-alt)")}>
                    <div style={css("font-size:var(--text-xs);font-weight:500;margin-bottom:.45rem")}>Locked core steps</div>
                    <div style={css("display:flex;flex-wrap:wrap;gap:.35rem")}>{governance.lockedCoreSteps.map(step => <span key={step} style={css("padding:.18rem .5rem;border-radius:var(--radius-pill);background:var(--surface);border:1px solid var(--border-soft);font-size:var(--text-2xs);color:var(--fg-muted)")}>{step}</span>)}</div>
                  </div>
                  <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-sm);padding:var(--space-3);background:var(--surface-alt)")}>
                    <div style={css("font-size:var(--text-xs);font-weight:500;margin-bottom:.45rem")}>Editable client fields</div>
                    <div style={css("display:flex;flex-wrap:wrap;gap:.35rem")}>{governance.editableClientFields.map(field => <span key={field} style={css("padding:.18rem .5rem;border-radius:var(--radius-pill);background:var(--accent-soft);font-size:var(--text-2xs);color:var(--accent)")}>{field}</span>)}</div>
                  </div>
                </div>
                <div>
                  <div style={css("font-size:var(--text-xs);font-weight:500;margin-bottom:.35rem")}>Required inputs and validation</div>
                  <div style={css("display:flex;flex-direction:column;border:1px solid var(--border-soft);border-radius:var(--radius-sm);overflow:hidden")}>
                    {governance.requiredInputs.map(input => <div key={input.id} style={css("display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.65rem;padding:.58rem .7rem;border-bottom:1px solid var(--border-soft);font-size:var(--text-xs)")}><span><strong style={css("font-weight:500")}>{input.label}</strong><span style={css("display:block;margin-top:.1rem;color:var(--fg-muted)")}>{input.validation}</span></span><span style={css("color:" + (input.required ? "var(--danger)" : "var(--fg-faint)"))}>{input.required ? "Required" : "Optional"}</span></div>)}
                  </div>
                </div>
                <div>
                  <div style={css("font-size:var(--text-xs);font-weight:500;margin-bottom:.35rem")}>Approval requirements</div>
                  <div style={css("display:flex;flex-wrap:wrap;gap:.35rem")}>{governance.approvalRequirements.length ? governance.approvalRequirements.map(item => <span key={item} style={css("padding:.2rem .55rem;border-radius:var(--radius-pill);background:var(--warn-soft);color:var(--warn);font-size:var(--text-2xs)")}>{item}</span>) : <span style={css("font-size:var(--text-xs);color:var(--fg-faint)")}>No approval gate has been defined.</span>}</div>
                </div>
                <div style={css("display:flex;gap:.4rem;flex-wrap:wrap")}>
                  <button onClick={() => setPreviewMode(previewMode === "roles" ? null : "roles")} className="pt-softbtn" style={css("height:2rem;padding:0 .75rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:" + (previewMode === "roles" ? "var(--fg)" : "var(--surface)") + ";color:" + (previewMode === "roles" ? "#fff" : "var(--fg-muted)") + ";cursor:pointer")}>Role preview</button>
                  <button onClick={() => setPreviewMode(previewMode === "sample" ? null : "sample")} className="pt-softbtn" style={css("height:2rem;padding:0 .75rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:" + (previewMode === "sample" ? "var(--fg)" : "var(--surface)") + ";color:" + (previewMode === "sample" ? "#fff" : "var(--fg-muted)") + ";cursor:pointer")}>Sample-data preview</button>
                </div>
                {previewMode === "roles" && <div style={css("display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))") + ";gap:var(--space-2)")}>{governance.rolePreview.map(item => <div key={item.role} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-sm);padding:.65rem .7rem")}><strong style={css("font-size:var(--text-xs);font-weight:500")}>{ROLE_LABEL[item.role] || item.role}</strong>{item.responsibilities.map(responsibility => <div key={responsibility} style={css("margin-top:.25rem;font-size:var(--text-xs);line-height:1.4;color:var(--fg-muted)")}>{responsibility}</div>)}</div>)}</div>}
                {previewMode === "sample" && <div style={css("display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))") + ";gap:var(--space-2)")}>{Object.entries(governance.sampleDataPreview).map(([label, value]) => <div key={label} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-sm);padding:.65rem .7rem")}><span style={css("display:block;font-size:var(--text-2xs);color:var(--fg-faint)")}>{label}</span><strong style={css("display:block;margin-top:.15rem;font-size:var(--text-xs);font-weight:500")}>{value}</strong></div>)}</div>}
              </section>

              <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "0.9rem" : "1rem 1.15rem") + ";display:flex;flex-direction:column;gap:.75rem")}>
                <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)")}>
                  <div><div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:.02em;color:var(--fg-faint)")}>Playbook Agent</div><div style={css("margin-top:.2rem;font-size:var(--text-base);font-weight:500")}>{governance.agent.definitionKey} · v{governance.agent.version}</div></div>
                  <span style={css("padding:.18rem .5rem;border-radius:var(--radius-pill);font-size:var(--text-2xs);font-weight:500;background:" + (governance.agent.evalStatus === "passing" ? "var(--success-soft)" : governance.agent.evalStatus === "failing" ? "var(--danger-soft)" : "var(--surface-alt)") + ";color:" + (governance.agent.evalStatus === "passing" ? "var(--success)" : governance.agent.evalStatus === "failing" ? "var(--danger)" : "var(--fg-muted)"))}>{governance.agent.enabled ? `${governance.agent.lifecycle} · eval ${governance.agent.evalStatus.replace("_", " ")}` : "disabled"}</span>
                </div>
                <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-sm);padding:.65rem .7rem;background:var(--surface-alt);font-size:var(--text-xs);line-height:1.45;color:var(--fg-muted)")}>{governance.agent.instructions}</div>
                <div><div style={css("font-size:var(--text-xs);font-weight:500;margin-bottom:.35rem")}>Allowed tools</div><div style={css("display:flex;flex-wrap:wrap;gap:.35rem")}>{governance.agent.allowedTools.map(tool => <span key={tool} style={css("padding:.18rem .48rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);font-size:var(--text-2xs);color:var(--fg-muted)")}>{tool}</span>)}</div></div>
                <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: ".5rem" }}>
                  <div style={css("padding:.6rem .7rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm)") }><strong style={css("display:block;font-size:var(--text-xs);font-weight:500")}>Memory policy</strong><span style={css("display:block;margin-top:.2rem;font-size:var(--text-xs);line-height:1.4;color:var(--fg-muted)")}>{governance.agent.memoryPolicy}</span></div>
                  <div style={css("padding:.6rem .7rem;border:1px solid var(--border-soft);border-radius:var(--radius-sm)") }><strong style={css("display:block;font-size:var(--text-xs);font-weight:500")}>Sample prompt</strong><span style={css("display:block;margin-top:.2rem;font-size:var(--text-xs);line-height:1.4;color:var(--fg-muted)")}>{governance.agent.samplePrompt}</span></div>
                </div>
                <div><div style={css("font-size:var(--text-xs);font-weight:500;margin-bottom:.35rem")}>Approval gates</div><div style={css("display:flex;flex-wrap:wrap;gap:.35rem")}>{governance.agent.approvalGates.map(gate => <span key={gate} style={css("padding:.18rem .48rem;border-radius:var(--radius-pill);background:var(--warn-soft);font-size:var(--text-2xs);color:var(--warn)")}>{gate}</span>)}</div></div>
              </section>

              <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "0.9rem" : "1rem 1.15rem"))}>
                <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:.6rem")}>Exception Recovery</div>
                <div style={css("display:flex;flex-direction:column;gap:.4rem")}>{governance.exceptionPolicies.map(policy => <details key={policy.kind} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-sm);padding:.58rem .7rem;background:var(--surface-alt)")}><summary style={css("cursor:pointer;font-size:var(--text-xs);font-weight:500")}>{policy.label} · {ROLE_LABEL[policy.defaultOwner] || policy.defaultOwner}</summary><div style={css("padding-top:.4rem;font-size:var(--text-xs);line-height:1.45;color:var(--fg-muted)")}>{policy.recoveryAction}</div></details>)}</div>
              </section>

              <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "0.9rem" : "1rem 1.15rem"))}>
                <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:.6rem")}>Operational Quality</div>
                <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: ".5rem" }}>
                  {[
                    ["Time in stage", formatMinutes(runMetrics.reduce((sum, metric) => sum + metric.timeInCurrentStageMinutes, 0))],
                    ["Blocked time", formatMinutes(runMetrics.reduce((sum, metric) => sum + metric.blockedMinutes, 0))],
                    ["Approval turnaround", formatMinutes(runMetrics.find(metric => metric.approvalTurnaroundMinutes != null)?.approvalTurnaroundMinutes ?? null)],
                    ["Revisions", String(runMetrics.reduce((sum, metric) => sum + metric.revisionCount, 0))],
                    ["Handoff success", runs.length ? `${runMetrics.filter(metric => metric.handoffSuccess === true).length}/${runMetrics.filter(metric => metric.handoffSuccess != null).length || 0}` : "No runs"],
                    ["Recommendations → tasks", String(runMetrics.reduce((sum, metric) => sum + metric.recommendationsConvertedToTasks, 0))],
                    ["Tasks completed", String(runMetrics.reduce((sum, metric) => sum + metric.recommendationTasksCompleted, 0))],
                    ["Inactivity / automation", `${runMetrics.reduce((sum, metric) => sum + metric.clientInactivityCount, 0)} / ${runMetrics.reduce((sum, metric) => sum + metric.automationFailureCount, 0)}`],
                  ].map(([label, value]) => <div key={label} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-sm);padding:.65rem .7rem;background:var(--surface-alt);min-width:0")}><span style={css("display:block;font-size:var(--text-2xs);color:var(--fg-faint)")}>{label}</span><strong style={css("display:block;margin-top:.2rem;font-size:var(--text-base);font-weight:500;overflow:hidden;text-overflow:ellipsis")}>{value}</strong></div>)}
                </div>
              </section>

              <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:" + (mobile ? "0.9rem" : "1rem 1.15rem"))}>
                <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:0.35rem")}>Documentation</div>
                <Markdown md={readerBody(md)} />
              </section>
            </div>

            <aside style={css("display:flex;flex-direction:column;gap:0.6rem" + (mobile ? "" : ";position:sticky;top:0.5rem"))}>
              <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:0.95rem 1rem")}>
                <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint);margin-bottom:0.6rem")}>Details</div>
                <div style={css("display:flex;flex-direction:column;gap:var(--space-2)")}>
                  {rows.map(([label, val]) => (
                    <div key={label} style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)")}>
                      <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{label}</span>
                      <span style={css("font-size:var(--text-xs);font-weight:500;color:var(--fg);text-align:right")}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
              {d.custom && <div style={css("display:inline-flex;align-items:center;gap:0.35rem;align-self:flex-start;font-size:var(--text-2xs);font-weight:500;color:var(--accent);background:var(--accent-soft);padding:0.25rem 0.65rem;border-radius:var(--radius-pill)")}><Icon name="layers" size={12} />Custom playbook</div>}
            </aside>
          </div>
        )}
      </div>
    );
  }

  // ── LIBRARY ────────────────────────────────────────────────────────────────
  return (
    <div style={css("display:flex;flex-direction:column;gap:1.1rem" + (mobile ? ";padding-bottom:1.25rem" : ""))}>
      <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:.85rem 1rem")}>
        <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:.02em;color:var(--fg-faint);margin-bottom:.55rem")}>Shared terminology</div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "repeat(5,minmax(0,1fr))", gap: ".45rem" }}>{[
          ["Checkup", "Diagnostic client service"], ["Lab", "Planning or build workspace"], ["Playbook", "Internal reusable template"], ["Approval", "Client decision surface"], ["Journey", "Client progress and milestones"],
        ].map(([term, meaning]) => <div key={term} style={css("border:1px solid var(--border-soft);border-radius:var(--radius-sm);padding:.55rem .65rem;background:var(--surface-alt);min-width:0")}><strong style={css("display:block;font-size:var(--text-xs);font-weight:500")}>{term}</strong><span style={css("display:block;margin-top:.14rem;font-size:var(--text-2xs);line-height:1.35;color:var(--fg-muted)")}>{meaning}</span></div>)}</div>
      </section>
      {groups.map(g => {
        const sm = SVC_META[g.svc];
        const active = activeClients(g.svc);
        return (
          <div key={g.svc} style={css("display:flex;flex-direction:column;gap:0.7rem")}>
            <div style={css("display:flex;align-items:center;gap:var(--space-2)")}>
              <span style={css("width:0.6rem;height:0.6rem;border-radius:50%;background:" + sm.color)} />
              <span style={css("font-size:var(--text-md);font-weight:500")}>{sm.label}</span>
              <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{g.docs.length} playbook{g.docs.length === 1 ? "" : "s"} · {active} active client{active === 1 ? "" : "s"}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: "0.75rem", alignItems: "stretch" }}>
              {g.docs.map(d => {
                const md = d.md || genMd(d);
                const steps = parseProcess(md);
                const owners = [...new Set(steps.map(s => s.owner).filter(Boolean))];
                const governance = governedPlaybook(d);
                const matchingRuns = d.processId ? processRuns.filter(run => run.processId === d.processId) : [];
                const activeRunCount = matchingRuns.filter(run => run.status !== "complete").length;
                return (
                  <button key={d.id} onClick={() => open(d.id)} className="pt-card-soft" style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1rem 1.05rem;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:0.7rem;height:100%")}>
                    <div style={css("display:flex;align-items:flex-start;gap:0.65rem")}>
                      <span style={css("width:1.9rem;height:1.9rem;border-radius:var(--radius-sm);display:grid;place-items:center;flex-shrink:0;background:color-mix(in srgb," + sm.color + " 13%,var(--surface));color:" + sm.color)}><Icon name={d.icon} size={15} /></span>
                      <div style={css("min-width:0;flex:1")}>
                        <div style={css("font-size:var(--text-base);font-weight:500;line-height:1.25")}>{d.fn}</div>
                        <div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:0.1rem")}>{d.dur} · v{governance.version}</div>
                      </div>
                      <span style={css("flex-shrink:0;padding:.14rem .42rem;border-radius:var(--radius-pill);font-size:var(--text-2xs);font-weight:500;background:" + (governance.lifecycle === "published" ? "var(--success-soft)" : governance.lifecycle === "archived" ? "var(--surface-alt)" : "var(--warn-soft)") + ";color:" + (governance.lifecycle === "published" ? "var(--success)" : governance.lifecycle === "archived" ? "var(--fg-muted)" : "var(--warn)"))}>{governance.lifecycle}</span>
                    </div>
                    <p style={css("margin:0;font-size:var(--text-xs);line-height:1.5;color:var(--fg-muted);flex:1")}>{d.purpose}</p>
                    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-top:auto")}>
                      <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{steps.length} steps · {matchingRuns.length} uses · {activeRunCount} active</span>
                      <span style={css("display:flex;align-items:center;padding-left:0.35rem")}>
                        {owners.map((o, i) => { const om = ownerMeta(o); return <span key={o} title={om.label} style={css("width:0.85rem;height:0.85rem;border-radius:50%;border:1.5px solid var(--surface);background:" + om.c + ";margin-left:" + (i ? "-0.35rem" : "0"))} />; })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <button onClick={startNew} className="pt-softbtn" style={css("width:100%;display:inline-flex;align-items:center;justify-content:center;gap:0.4rem;height:2.6rem;border:1px dashed color-mix(in srgb,var(--accent) 45%,var(--border));border-radius:var(--radius-panel);background:transparent;color:var(--accent);font-size:var(--text-sm);font-weight:500;cursor:pointer")}><Icon name="plus" size={15} />New playbook</button>
    </div>
  );
}
