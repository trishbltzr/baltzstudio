"use client";

import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import { SVC_META } from "../data";
import { findPlaybookDoc } from "../playbookDocs";
import type { PortalActions, PortalState } from "../store";
import { DASHBOARD_USER_EMAIL_HEADER } from "@/lib/dashboardPersistence";

type SourceFilePayload = { file: string; content: string };

export function PlaybookDocument({ state, actions, userEmail }: { state: PortalState; actions: PortalActions; userEmail: string }) {
  const doc = findPlaybookDoc(state.playbookDoc);
  const meta = doc ? SVC_META[doc.page] : null;
  const [sources, setSources] = useState<SourceFilePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSources() {
      if (!doc) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/playbook-sources?doc=${doc.id}`, {
          cache: "no-store",
          headers: { [DASHBOARD_USER_EMAIL_HEADER]: userEmail },
        });
        const payload = (await response.json()) as { error?: string; files?: SourceFilePayload[] };
        if (cancelled) return;

        if (!response.ok || !payload.files) {
          setError(payload.error || "Unable to load the source files.");
          setSources([]);
          return;
        }

        setSources(payload.files);
      } catch {
        if (!cancelled) {
          setError("Unable to load the source files.");
          setSources([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSources();

    return () => {
      cancelled = true;
    };
  }, [doc, userEmail]);

  if (!doc || !meta) return null;

  return (
    <div onClick={() => actions.patch({ playbookDoc: null })} style={css("position:fixed;inset:0;z-index:91;background:rgba(31,22,15,.28);padding:var(--space-5);display:flex;align-items:center;justify-content:center")}>
      <div onClick={e => e.stopPropagation()} style={css("width:min(52rem,100%);max-height:88vh;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-panel);background:var(--surface)")}>
        <div style={css("position:sticky;top:0;z-index:1;display:flex;align-items:flex-start;gap:var(--space-4);padding:1rem 1.15rem;border-bottom:1px solid var(--border-soft);background:color-mix(in srgb," + meta.color + " 8%,var(--surface))")}>
          <div style={css("flex:1;min-width:0;display:flex;flex-direction:column;gap:0.45rem")}>
            <div style={css("display:flex;align-items:center;gap:0.55rem;flex-wrap:wrap")}>
              <span style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>{doc.kicker}</span>
            </div>
            <div>
              <h2 style={css("margin:0;font-size:var(--text-xl);font-weight:500;line-height:1.15")}>{doc.title}</h2>
              <p style={css("margin:0.4rem 0 0;font-size:var(--text-base);line-height:1.55;color:var(--fg-muted)")}>{doc.summary}</p>
            </div>
          </div>
          <button onClick={() => actions.patch({ playbookDoc: null })} title="Close reference" className="pt-iconbtn" style={css("width:2rem;height:2rem;flex-shrink:0;border-radius:50%;border:1px solid var(--border);background:var(--surface);display:grid;place-items:center;color:var(--fg-muted);cursor:pointer")}>
            <Icon name="x" size={15} />
          </button>
        </div>

        <div style={css("padding:1rem 1.15rem 1.2rem;display:flex;flex-direction:column;gap:var(--space-4)")}>
          <div style={css("display:flex;flex-direction:column;gap:var(--space-2);border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.85rem 0.95rem;background:var(--surface-alt)")}>
            <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Source Files</div>
            <div style={css("display:flex;gap:0.45rem;flex-wrap:wrap")}>
              {doc.sourceFiles.map(file => (
                <span key={file} style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.32rem 0;border-radius:0;border:0;background:transparent;font-size:var(--text-sm);font-weight:500;color:var(--fg)")}>
                  <Icon name="file" size={13} />
                  {file}
                </span>
              ))}
            </div>
          </div>

          {doc.sections.map(section => (
            <section key={section.title} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.95rem 1rem;background:var(--surface)")}>
              <h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500;line-height:1.25")}>{section.title}</h3>
              <p style={css("margin:0.45rem 0 0;font-size:var(--text-base);line-height:1.55;color:var(--fg-muted)")}>{section.body}</p>
              <div style={css("display:flex;flex-direction:column;gap:0.45rem;margin-top:0.7rem")}>
                {section.bullets.map(item => (
                  <div key={item} style={css("display:flex;align-items:flex-start;gap:0.55rem")}>
                    <span style={css("width:1.15rem;height:1.15rem;flex-shrink:0;border-radius:999px;background:" + meta.soft + ";color:" + meta.color + ";display:grid;place-items:center;margin-top:0.08rem")}>
                      <Icon name="checkmark" size={12} />
                    </span>
                    <span style={css("font-size:var(--text-sm);line-height:1.5;color:var(--fg)")}>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding:0.1rem 0")}>
            <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>Encoded Source Reference</div>
            {loading && <span style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>Loading live markdown…</span>}
            {error && <span style={css("font-size:var(--text-2xs);color:var(--danger)")}>{error}</span>}
          </div>

          {!loading && !error && sources.map(source => (
            <section key={source.file} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface);overflow:hidden")}>
              <div style={css("display:flex;align-items:center;gap:0.45rem;padding:0.8rem 0.95rem;border-bottom:1px solid var(--border-soft);background:var(--surface-alt)")}>
                <span style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.3rem 0.55rem;border-radius:999px;border:1px solid var(--border-soft);background:var(--surface);font-size:var(--text-xs);font-weight:500;color:var(--fg)")}>
                  <Icon name="file" size={13} />
                  {source.file}
                </span>
                <span style={css("font-size:var(--text-xs);color:var(--fg-faint);margin-left:auto")}>{source.content.split("\n").length} lines</span>
              </div>
              <pre style={css("margin:0;padding:0.95rem 1rem;white-space:pre-wrap;word-break:break-word;font-size:var(--text-sm);line-height:1.55;color:var(--fg);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;max-height:28rem;overflow:auto;background:var(--surface)")}>{source.content}</pre>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
