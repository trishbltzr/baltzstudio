"use client";

import { useEffect } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";

export function StartOverDialog({
  open,
  auditLabel,
  subject,
  detail,
  busy = false,
  busyAction = null,
  error,
  onCancel,
  onArchive,
  onConfirm,
}: {
  open: boolean;
  auditLabel: string;
  subject: string;
  detail?: string;
  busy?: boolean;
  busyAction?: "archive" | "delete" | null;
  error?: string | null;
  onCancel: () => void;
  onArchive?: () => void | Promise<void>;
  onConfirm: () => void | Promise<void>;
}) {
  const isBusy = busy || busyAction !== null;
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBusy) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isBusy, onCancel, open]);

  if (!open) return null;

  const titleId = `start-over-${auditLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => { if (!isBusy) onCancel(); }}
      style={css("position:fixed;inset:0;z-index:125;background:rgba(35,25,18,.46);padding:var(--space-4);display:grid;place-items:center")}
    >
      <section
        onClick={event => event.stopPropagation()}
        style={css("width:min(28rem,100%);border:1px solid var(--border);border-radius:1rem;background:var(--surface);box-shadow:0 22px 60px rgba(30,20,16,.24);padding:1.15rem")}
      >
        <div style={css("display:flex;align-items:flex-start;gap:var(--space-3)")}>
          <span style={css("width:2.25rem;height:2.25rem;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0")}>
            <Icon name="replay" size={15}/>
          </span>
          <div style={{ minWidth: 0 }}>
            <h3 id={titleId} style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>{onArchive ? "Archive or delete" : "Delete permanently"} this {auditLabel.toLowerCase()}?</h3>
            <p style={css("margin:.35rem 0 0;font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>
              {onArchive
                ? <>Archive keeps {subject}&apos;s saved {detail || "intake, report, and action plan"} so it can be restored later. Delete permanently removes it and cannot be undone.</>
                : <>This permanently removes {subject}&apos;s saved {detail || "intake, report, and action plan"} and cannot be undone.</>}
            </p>
            {error && <p role="alert" style={css("margin:.55rem 0 0;font-size:var(--text-2xs);line-height:1.45;color:var(--danger)")}>{error}</p>}
          </div>
        </div>
        <div style={css("display:flex;justify-content:flex-end;gap:.55rem;flex-wrap:wrap;margin-top:1.1rem")}>
          <button type="button" disabled={isBusy} onClick={onCancel} className="pt-softbtn" style={css("min-height:2.3rem;padding:0 .9rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500;cursor:" + (isBusy ? "not-allowed" : "pointer") + ";opacity:" + (isBusy ? ".6" : "1"))}>Cancel</button>
          {onArchive && <button type="button" disabled={isBusy} onClick={() => void onArchive()} className="pt-softbtn" style={css("min-height:2.3rem;padding:0 1rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);color:var(--fg);font-size:var(--text-2xs);font-weight:500;cursor:" + (isBusy ? "wait" : "pointer") + ";opacity:" + (isBusy ? ".72" : "1"))}>{busyAction === "archive" ? "Archiving…" : "Archive for now"}</button>}
          <button type="button" disabled={isBusy} onClick={() => void onConfirm()} className="pt-op" style={css("min-height:2.3rem;padding:0 1rem;border:none;border-radius:999px;background:var(--danger);color:#fff;font-size:var(--text-2xs);font-weight:500;cursor:" + (isBusy ? "wait" : "pointer") + ";opacity:" + (isBusy ? ".72" : "1"))}>{busyAction === "delete" || (busy && !busyAction) ? "Deleting…" : "Delete permanently"}</button>
        </div>
      </section>
    </div>
  );
}
