"use client";

import { useId, useMemo, useState } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import type { Priority, TaskImportDraft } from "../types";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(rows: TaskImportDraft[], fileName: string) {
  const headings = ["Task name", "Description", "Project", "Assignee", "Owner", "Status", "Priority", "Due", "Milestone", "Source ID"];
  const body = rows.map(row => [row.title, row.description, row.project, row.assignee, row.owner, row.status || "todo", row.priority, row.due, row.milestone, row.sourceId]);
  const csv = [headings, ...body].map(row => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function BuilderTaskPanel({
  drafts,
  fileName,
  mobile,
  onImport,
  embedded = false,
}: {
  drafts: TaskImportDraft[];
  fileName: string;
  mobile: boolean;
  onImport: (drafts: TaskImportDraft[]) => void;
  embedded?: boolean;
}) {
  const headingId = useId();
  const [rows, setRows] = useState(() => drafts);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(drafts.map((row, index) => row.sourceId || `${row.title}-${index}`)));
  const [csvReady, setCsvReady] = useState(false);
  const keys = useMemo(() => rows.map((row, index) => row.sourceId || `${row.title}-${index}`), [rows]);
  const selectedRows = rows.filter((_row, index) => selected.has(keys[index]));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  const toggle = (key: string) => setSelected(current => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(keys));
  const updateRow = (index: number, patch: Partial<TaskImportDraft>) => setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));

  return (
    <section aria-labelledby={headingId} style={css(embedded
      ? "border:0;border-top:1px solid var(--border-soft);border-radius:0;background:var(--surface);overflow:hidden"
      : "border:1px solid color-mix(in srgb,var(--accent) 22%,var(--border-soft) 78%);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden") }>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap;padding:" + (embedded ? "1.2rem 1.4rem" : "1rem 1.1rem") + ";border-bottom:1px solid var(--border-soft);background:" + (embedded ? "var(--surface)" : "color-mix(in srgb,var(--accent-soft) 38%,var(--surface) 62%)")) }>
        <div style={{ minWidth: 0 }}>
          <div style={css("font-size:.66rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>04 · Task plan</div>
          <h3 id={headingId} style={css("margin:.22rem 0 0;font-size:1rem;font-weight:500")}>Prepare the implementation tasks</h3>
          <p style={css("margin:.3rem 0 0;font-size:.73rem;line-height:1.45;color:var(--fg-muted)")}>Edit the names, choose what to include, then import directly or download the same rows as CSV.</p>
        </div>
        <button type="button" onClick={toggleAll} className="pt-softbtn" style={css("height:2rem;padding:0 .72rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:.7rem;font-weight:500;cursor:pointer;white-space:nowrap")}>{allSelected ? "Clear all" : "Select all"}</button>
      </div>

      <div style={css("display:flex;flex-direction:column;max-height:24rem;overflow-y:auto") }>
        {rows.map((row, index) => {
          const key = keys[index];
          const checked = selected.has(key);
          return (
            <label key={key} style={css("display:grid;grid-template-columns:" + (mobile ? "1.35rem minmax(0,1fr)" : "1.35rem minmax(0,1fr) 7.5rem 6.5rem") + ";gap:.55rem;align-items:center;padding:.68rem " + (embedded ? "1.4rem" : ".9rem") + ";border-bottom:1px solid var(--border-soft);background:" + (checked ? "color-mix(in srgb,var(--accent-soft) 22%,var(--surface) 78%)" : "var(--surface)") + ";cursor:pointer") }>
              <input type="checkbox" checked={checked} onChange={() => toggle(key)} aria-label={`Include ${row.title}`} style={{ accentColor: "var(--accent)" }} />
              <span style={css("display:flex;flex-direction:column;gap:.25rem;min-width:0") }>
                <input value={row.title} onClick={event => event.stopPropagation()} onChange={event => updateRow(index, { title: event.currentTarget.value })} aria-label={`Task ${index + 1} name`} style={css("width:100%;min-width:0;border:0;border-bottom:1px solid transparent;background:transparent;color:var(--fg);font:inherit;font-size:.78rem;font-weight:500;outline:none;padding:.2rem 0")}/>
                {mobile && <span style={css("font-size:.64rem;color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{row.milestone || "Implementation"} · {row.priority} priority</span>}
              </span>
              {!mobile && <span style={css("font-size:.68rem;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{row.milestone || "Implementation"}</span>}
              {!mobile && <select value={row.priority} onClick={event => event.stopPropagation()} onChange={event => updateRow(index, { priority: event.currentTarget.value as Priority })} aria-label={`Priority for ${row.title}`} style={css("height:1.85rem;border:1px solid var(--border-soft);border-radius:999px;background:var(--surface);color:var(--fg-muted);font:inherit;font-size:.67rem;padding:0 .5rem;outline:none")}><option value="high">High</option><option value="med">Medium</option><option value="low">Low</option></select>}
            </label>
          );
        })}
      </div>

      <div style={css("display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;padding:.9rem " + (embedded ? "1.4rem" : "1rem") + ";background:var(--surface-alt)") }>
        <span aria-live="polite" style={css("margin-right:auto;font-size:.7rem;color:" + (csvReady ? "var(--success)" : "var(--fg-muted)"))}>{csvReady ? "CSV downloaded" : `${selectedRows.length} of ${rows.length} selected`}</span>
        <button type="button" disabled={!selectedRows.length} onClick={() => { downloadCsv(selectedRows, fileName); setCsvReady(true); }} className="pt-softbtn" style={css("display:inline-flex;align-items:center;justify-content:center;gap:.38rem;height:2.25rem;padding:0 .85rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:.72rem;font-weight:500;cursor:" + (selectedRows.length ? "pointer" : "not-allowed") + ";opacity:" + (selectedRows.length ? "1" : ".5") + ";flex:" + (mobile ? "1" : "0 0 auto"))}><Icon name="file" size={13}/>Download CSV</button>
        <button type="button" disabled={!selectedRows.length} onClick={() => onImport(selectedRows)} className="pt-op" style={css("display:inline-flex;align-items:center;justify-content:center;gap:.38rem;height:2.25rem;padding:0 .95rem;border:0;border-radius:999px;background:var(--accent);color:#fff;font-size:.72rem;font-weight:500;cursor:" + (selectedRows.length ? "pointer" : "not-allowed") + ";opacity:" + (selectedRows.length ? "1" : ".5") + ";flex:" + (mobile ? "1" : "0 0 auto"))}><Icon name="checkmark" size={13}/>Import to To-do&apos;s</button>
      </div>
    </section>
  );
}
