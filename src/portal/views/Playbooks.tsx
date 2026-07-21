"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import { ALL_PROJECTS, SVC_META } from "../data";
import {
  PB_SEED, SVC_ORDER, ownerMeta, genMd, pbMeta, parseProcess, readerBody,
  type PlaybookSeed,
} from "../playbooks";
import type { PortalActions, PortalState } from "../store";
import type { Service } from "../types";

const NEW_TEMPLATE = "# New function\n\n## Summary\nDescribe what this playbook covers and when it runs.\n\n## Process\n1. **Admin** — First step\n2. **Studio** — Second step\n3. **Client** — Client action\n\n## Outputs\n- What this produces\n\n## Notes\nAnything else worth flagging.";

const activeClients = (svc: Service) => ALL_PROJECTS.filter(p => p.service === svc).length;

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
            <li key={i} style={css("display:flex;align-items:flex-start;gap:0.55rem;font-size:0.83rem;line-height:1.5;color:var(--fg-muted)")}>
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
            <li key={i} style={css("display:flex;align-items:flex-start;gap:0.6rem;font-size:0.83rem;line-height:1.5;color:var(--fg-muted)")}>
              <span style={css("flex-shrink:0;width:1.25rem;height:1.25rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:0.7rem;font-weight:500;display:grid;place-items:center;margin-top:0.05rem")}>{i + 1}</span>
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
    if (/^###\s/.test(ln)) { flush(); blocks.push(<div key={k++} style={css("font-size:0.9rem;font-weight:500;margin:0.7rem 0 0.1rem")}>{ln.replace(/^###\s+/, "")}</div>); continue; }
    if (/^---+$/.test(ln)) { flush(); blocks.push(<hr key={k++} style={css("border:0;border-top:1px solid var(--border-soft);margin:0.85rem 0")} />); continue; }
    if (/^>\s?/.test(ln)) { flush(); blocks.push(<blockquote key={k++} style={css("margin:0.5rem 0;padding:0.5rem 0.85rem;border-left:2px solid var(--accent);background:var(--surface-alt);border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-size:0.83rem;line-height:1.5;color:var(--fg-muted)")}>{mdInline(ln.replace(/^>\s?/, ""), "bq")}</blockquote>); continue; }
    if (/^\s*[-*]\s+/.test(ln)) { if (ol.length) flush(); ul.push(ln.replace(/^\s*[-*]\s+/, "")); continue; }
    if (/^\s*\d+\.\s+/.test(ln)) { if (ul.length) flush(); ol.push(ln.replace(/^\s*\d+\.\s+/, "")); continue; }
    if (!ln.trim()) { flush(); continue; }
    flush();
    blocks.push(<p key={k++} style={css("margin:0.35rem 0;font-size:0.83rem;line-height:1.55;color:var(--fg-muted)")}>{mdInline(ln, "p")}</p>);
  }
  flush();
  return <div>{blocks}</div>;
}

export function Playbooks({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const mobile = state.isMobile;
  const [pbDoc, setPbDoc] = useState<string | null>(null);
  const [pbRaw, setPbRaw] = useState(false);
  const [pbEditing, setPbEditing] = useState(false);
  const [form, setForm] = useState<{ service: Service; md: string }>({ service: "cocoon", md: NEW_TEMPLATE });
  const [extra, setExtra] = useState<PlaybookSeed[]>([]);

  const all = useMemo(() => [...PB_SEED, ...extra], [extra]);
  const groups = useMemo(() => SVC_ORDER.map(svc => ({ svc, docs: all.filter(d => d.svc === svc) })).filter(g => g.docs.length), [all]);
  const selected = pbDoc ? all.find(d => d.id === pbDoc) || null : null;

  function open(id: string) { setPbDoc(id); setPbRaw(false); }
  function startNew() { setForm({ service: "cocoon", md: NEW_TEMPLATE }); setPbEditing(true); }
  function copyMd(md: string) { try { void navigator.clipboard?.writeText(md); } catch { /* ignore */ } actions.showToast("Markdown copied"); }
  function save() {
    const meta = pbMeta(form.md);
    const id = "pb" + all.length + "-" + form.service;
    setExtra(x => [...x, { id, svc: form.service, fn: meta.fn, purpose: meta.purpose, dur: "Custom", tag: "Custom", icon: "layers", md: form.md, custom: true }]);
    setPbEditing(false); setPbDoc(id); setPbRaw(false);
    actions.showToast("Playbook saved");
  }

  const backBtn = "display:inline-flex;align-items:center;gap:0.35rem;align-self:flex-start;height:2rem;padding:0 0.8rem 0 0.6rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:0.76rem;font-weight:500;cursor:pointer";

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
              <button key={svc} onClick={() => setForm(f => ({ ...f, service: svc }))} style={css("height:1.9rem;padding:0 0.85rem;border-radius:var(--radius-pill);font-size:0.76rem;font-weight:500;cursor:pointer;border:1px solid " + (on ? "transparent" : "var(--border-soft)") + ";background:" + (on ? "color-mix(in srgb," + sm.color + " 14%,var(--surface))" : "var(--surface)") + ";color:" + (on ? sm.color : "var(--fg-muted)"))}>{sm.label}</button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: "0.85rem", alignItems: "start" }}>
          <div style={css("display:flex;flex-direction:column;gap:0.45rem")}>
            <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Markdown</div>
            <textarea value={form.md} onChange={e => setForm(f => ({ ...f, md: e.target.value }))} spellCheck={false} style={css("width:100%;min-height:22rem;resize:vertical;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:0.9rem 1rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.78rem;line-height:1.55;color:var(--fg);outline:none")} />
          </div>
          <div style={css("display:flex;flex-direction:column;gap:0.45rem")}>
            <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Preview</div>
            <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1rem 1.15rem;min-height:22rem")}><Markdown md={readerBody(form.md)} /></div>
          </div>
        </div>

        <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2)")}>
          <button onClick={() => setPbEditing(false)} className="pt-iconbtn" style={css("height:2.1rem;padding:0 1rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:0.8rem;font-weight:500;cursor:pointer")}>Cancel</button>
          <button onClick={save} disabled={!canSave} style={css("height:2.1rem;padding:0 1.15rem;border:none;border-radius:var(--radius-pill);font-size:0.8rem;font-weight:500;cursor:" + (canSave ? "pointer" : "not-allowed") + ";background:" + (canSave ? "var(--accent)" : "var(--border-soft)") + ";color:" + (canSave ? "#fff" : "var(--fg-faint)"))}>Save playbook</button>
        </div>
      </div>
    );
  }

  // ── DETAIL / READER ────────────────────────────────────────────────────────
  if (selected) {
    const d = selected, sm = SVC_META[d.svc];
    const md = d.md || genMd(d);
    const steps = parseProcess(md);
    const active = activeClients(d.svc);
    const metaChips = [d.dur, d.tag, active + " active client" + (active === 1 ? "" : "s")];
    const rows: [string, string][] = [["Service", sm.label], ["Timing", d.dur], ["Type", d.tag], ["Active clients", String(active)]];
    const toggle = (on: boolean, label: string, click: () => void) => (
      <button onClick={click} style={css("height:1.85rem;padding:0 0.85rem;border:none;border-radius:var(--radius-pill);font-size:0.74rem;font-weight:500;cursor:pointer;background:" + (on ? "var(--fg)" : "transparent") + ";color:" + (on ? "#fff" : "var(--fg-muted)"))}>{label}</button>
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
            {d.sourceDocId && <button onClick={() => actions.patch({ playbookDoc: d.sourceDocId })} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;gap:0.35rem;height:2rem;padding:0 0.85rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-sm);font-weight:500;cursor:pointer")}><Icon name="layers" size={14} />Source reference</button>}
            <button onClick={() => copyMd(md)} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;gap:0.35rem;height:2rem;padding:0 0.85rem;border:1px solid var(--border-soft);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-sm);font-weight:500;cursor:pointer")}><Icon name="file" size={14} />Copy markdown</button>
          </div>
        </div>

        {pbRaw ? (
          <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
            <div style={css("padding:0.7rem 1rem;border-bottom:1px solid var(--border-soft);background:var(--surface-alt);font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Markdown Source</div>
            <pre style={css("margin:0;padding:1rem 1.15rem;white-space:pre-wrap;overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.76rem;line-height:1.6;color:var(--fg)")}>{md}</pre>
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
                          <span style={css("width:1.6rem;height:1.6rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:0.74rem;font-weight:500;display:grid;place-items:center")}>{i + 1}</span>
                          {!last && <span style={css("width:1.5px;flex:1;min-height:0.9rem;background:var(--border-soft);margin:0.3rem 0")} />}
                        </div>
                        <div style={css("flex:1;min-width:0;padding-bottom:" + (last ? "0" : "1rem"))}>
                          <span style={css("display:inline-flex;font-size:0.64rem;font-weight:500;padding:0.1rem 0.5rem;border-radius:var(--radius-pill);background:" + om.s + ";color:" + om.c)}>{om.label}</span>
                          <div style={css("font-size:0.83rem;line-height:1.5;color:var(--fg);margin-top:0.35rem")}>{s.text}</div>
                        </div>
                      </div>
                    );
                  })}
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
                      <span style={css("font-size:0.74rem;color:var(--fg-faint)")}>{label}</span>
                      <span style={css("font-size:0.78rem;font-weight:500;color:var(--fg);text-align:right")}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
              {d.custom && <div style={css("display:inline-flex;align-items:center;gap:0.35rem;align-self:flex-start;font-size:0.7rem;font-weight:500;color:var(--accent);background:var(--accent-soft);padding:0.25rem 0.65rem;border-radius:var(--radius-pill)")}><Icon name="layers" size={12} />Custom playbook</div>}
            </aside>
          </div>
        )}
      </div>
    );
  }

  // ── LIBRARY ────────────────────────────────────────────────────────────────
  return (
    <div style={css("display:flex;flex-direction:column;gap:1.1rem" + (mobile ? ";padding-bottom:1.25rem" : ""))}>
      {groups.map(g => {
        const sm = SVC_META[g.svc];
        const active = activeClients(g.svc);
        return (
          <div key={g.svc} style={css("display:flex;flex-direction:column;gap:0.7rem")}>
            <div style={css("display:flex;align-items:center;gap:var(--space-2)")}>
              <span style={css("width:0.6rem;height:0.6rem;border-radius:50%;background:" + sm.color)} />
              <span style={css("font-size:0.9rem;font-weight:500")}>{sm.label}</span>
              <span style={css("font-size:0.74rem;color:var(--fg-faint)")}>{g.docs.length} playbook{g.docs.length === 1 ? "" : "s"} · {active} active client{active === 1 ? "" : "s"}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: "0.75rem", alignItems: "stretch" }}>
              {g.docs.map(d => {
                const md = d.md || genMd(d);
                const steps = parseProcess(md);
                const owners = [...new Set(steps.map(s => s.owner).filter(Boolean))];
                return (
                  <button key={d.id} onClick={() => open(d.id)} className="pt-card-soft" style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1rem 1.05rem;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:0.7rem;height:100%")}>
                    <div style={css("display:flex;align-items:flex-start;gap:0.65rem")}>
                      <span style={css("width:1.9rem;height:1.9rem;border-radius:var(--radius-sm);display:grid;place-items:center;flex-shrink:0;background:color-mix(in srgb," + sm.color + " 13%,var(--surface));color:" + sm.color)}><Icon name={d.icon} size={15} /></span>
                      <div style={css("min-width:0;flex:1")}>
                        <div style={css("font-size:0.86rem;font-weight:500;line-height:1.25")}>{d.fn}</div>
                        <div style={css("font-size:0.68rem;color:var(--fg-faint);margin-top:0.1rem")}>{d.dur}</div>
                      </div>
                    </div>
                    <p style={css("margin:0;font-size:0.76rem;line-height:1.5;color:var(--fg-muted);flex:1")}>{d.purpose}</p>
                    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-top:auto")}>
                      <span style={css("font-size:0.7rem;color:var(--fg-faint)")}>{steps.length} steps</span>
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

      <button onClick={startNew} className="pt-softbtn" style={css("width:100%;display:inline-flex;align-items:center;justify-content:center;gap:0.4rem;height:2.6rem;border:1px dashed color-mix(in srgb,var(--accent) 45%,var(--border));border-radius:var(--radius-panel);background:transparent;color:var(--accent);font-size:0.8rem;font-weight:500;cursor:pointer")}><Icon name="plus" size={15} />New playbook</button>
    </div>
  );
}
