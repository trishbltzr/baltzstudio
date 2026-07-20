"use client";

import type { PortalApprovalRecord } from "@/lib/portalWorkspacePersistence";
import { css } from "../helpers";
import { Icon } from "../icons";

export function ApprovalOutputCard({ approval }: { approval: PortalApprovalRecord }) {
  const sections = approval.sections || [];
  return (
    <article style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden") }>
      <div style={css("display:flex;align-items:flex-start;gap:0.8rem;padding:1rem 1.05rem") }>
        <span style={css("width:2.3rem;height:2.3rem;display:grid;place-items:center;flex-shrink:0;border-radius:0.72rem;background:" + approval.thumb + ";color:" + (approval.outputType === "audit" ? "var(--success)" : "var(--accent)"))}>
          <Icon name={approval.outputType === "audit" ? "audit" : "funnel"} size={17} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.7rem;flex-wrap:wrap") }>
            <h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500;color:var(--fg)")}>{approval.title}</h3>
            <span style={css("font-size:var(--text-xs);color:var(--success);background:var(--success-soft);padding:0.18rem 0.5rem;border-radius:999px")}>Ready for review</span>
          </div>
          <p style={css("margin:0.35rem 0 0;font-size:var(--text-base);line-height:1.5;color:var(--fg-muted)")}>{approval.summary || "The final approved output is ready."}</p>
          {approval.sentAt && <div style={css("margin-top:0.35rem;font-size:var(--text-xs);color:var(--fg-faint)")}>Shared {approval.sentAt}</div>}
        </div>
      </div>
      {sections.length > 0 && (
        <details style={css("border-top:1px solid var(--border-soft)") }>
          <summary style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem;padding:0.75rem 1.05rem;cursor:pointer;font-size:var(--text-base);font-weight:500;color:var(--fg-muted)")}>Open final output <Icon name="chevdown" size={14} /></summary>
          <div style={css("display:flex;flex-direction:column;gap:0.65rem;padding:0 1.05rem 1rem") }>
            {sections.map(section => (
              <section key={`${section.heading}-${section.body}`} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt);padding:0.8rem 0.85rem") }>
                <h4 style={css("margin:0;font-size:var(--text-base);font-weight:500")}>{section.heading}</h4>
                <p style={css("margin:0.3rem 0 0;font-size:var(--text-sm);line-height:1.5;color:var(--fg-muted)")}>{section.body}</p>
                {section.bullets.length > 0 && <ul style={css("margin:0.55rem 0 0;padding-left:1rem;display:flex;flex-direction:column;gap:0.3rem;font-size:var(--text-sm);line-height:1.45;color:var(--fg)")}>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
              </section>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}
