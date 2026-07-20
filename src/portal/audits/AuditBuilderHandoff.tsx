"use client";

import { css } from "../helpers";
import { Icon } from "../icons";

type HandoffType = "brand" | "website" | "seo";

const COPY: Record<HandoffType, { eyebrow: string; title: string; body: string; button: string }> = {
  brand: {
    eyebrow: "Next service",
    title: "Carry the brand direction into implementation planning",
    body: "Move the approved positioning, messaging, and visual priorities into Website Builder without starting discovery again.",
    button: "Plan in Website Builder",
  },
  website: {
    eyebrow: "Next service",
    title: "Turn these findings into a website build plan",
    body: "Carry the audit findings, page priorities, and recommendations into Website Builder to shape the rebuild scope and task plan.",
    button: "Continue to Website Builder",
  },
  seo: {
    eyebrow: "Next service",
    title: "Turn these findings into a complete SEO plan",
    body: "Use this same crawl and issue set to map every priority page, keyword, metadata change, architecture decision, and delivery task.",
    button: "Continue to SEO Builder",
  },
};

export function AuditBuilderHandoff({ type, clientName, insightCount, onContinue, disabled = false, disabledReason }: { type: HandoffType; clientName: string; insightCount?: number; onContinue: () => void; disabled?: boolean; disabledReason?: string }) {
  const copy = COPY[type];
  return <section style={css("border:1px solid color-mix(in srgb,var(--accent) 28%,var(--border-soft) 72%);border-radius:var(--radius-panel);background:linear-gradient(135deg,var(--surface),var(--accent-soft));padding:1rem 1.1rem") }>
    <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap") }>
      <div style={css("display:flex;gap:.75rem;align-items:flex-start;min-width:0;flex:1") }>
        <span style={css("width:2.15rem;height:2.15rem;border-radius:.72rem;background:var(--accent);color:#fff;display:grid;place-items:center;flex-shrink:0") }><Icon name="arrowright" size={16}/></span>
        <div style={{ minWidth: 0 }}>
          <span style={css("display:block;text-transform:uppercase;letter-spacing:.04em;font-size:.62rem;color:var(--accent);margin-bottom:.28rem")}>{copy.eyebrow} · {clientName}</span>
          <h3 style={css("margin:0;font-size:.94rem;font-weight:500;line-height:1.25")}>{copy.title}</h3>
          <p style={css("margin:.35rem 0 0;max-width:38rem;font-size:.72rem;line-height:1.5;color:var(--fg-muted)")}>{copy.body}</p>
          <div style={css("display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;margin-top:.62rem") }>
            <span style={css("padding:.22rem .52rem;border-radius:999px;background:var(--surface);font-size:.61rem;color:var(--fg-muted)")}>Same client context</span>
            <span style={css("padding:.22rem .52rem;border-radius:999px;background:var(--surface);font-size:.61rem;color:var(--fg-muted)")}>No re-upload</span>
            {typeof insightCount === "number" && <span style={css("padding:.22rem .52rem;border-radius:999px;background:var(--surface);font-size:.61rem;color:var(--fg-muted)")}>{insightCount} insights ready</span>}
          </div>
        </div>
      </div>
      <div style={css("display:flex;flex-direction:column;align-items:flex-end;gap:.38rem") }>
        <button type="button" disabled={disabled} onClick={onContinue} style={css("min-height:2.3rem;padding:0 .9rem;border:none;border-radius:999px;background:" + (disabled ? "var(--surface-alt)" : "var(--accent)") + ";color:" + (disabled ? "var(--fg-faint)" : "#fff") + ";font-size:.7rem;font-weight:500;cursor:" + (disabled ? "not-allowed" : "pointer") + ";display:inline-flex;align-items:center;gap:.38rem;white-space:nowrap")}>{copy.button}<Icon name={disabled ? "lock" : "arrowright"} size={13}/></button>
        {disabled && disabledReason && <span style={css("max-width:16rem;text-align:right;font-size:.58rem;line-height:1.35;color:var(--danger)")}>{disabledReason}</span>}
      </div>
    </div>
  </section>;
}
