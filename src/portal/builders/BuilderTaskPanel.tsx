"use client";

import { useId, useMemo, useState } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import type { TaskImportDraft } from "../types";

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
    <section data-report-task-plan aria-labelledby={headingId} style={css(embedded
      ? "border:0;border-top:1px solid var(--border-soft);border-radius:0;background:var(--surface);overflow:hidden"
      : "border:1px solid color-mix(in srgb,var(--accent) 22%,var(--border-soft) 78%);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden") }>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap;padding:" + (embedded ? "1.2rem 1.4rem" : "1rem 1.1rem") + ";border-bottom:1px solid var(--border-soft);background:" + (embedded ? "var(--surface)" : "color-mix(in srgb,var(--accent-soft) 38%,var(--surface) 62%)")) }>
        <div style={{ minWidth: 0 }}>
          <div style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>04 · Task plan</div>
          <h3 id={headingId} style={css("margin:.22rem 0 0;font-size:var(--text-lg);font-weight:500")}>Prepare the implementation tasks</h3>
          <p data-report-exclude style={css("margin:.3rem 0 0;font-size:var(--text-2xs);line-height:1.45;color:var(--fg-muted)")}>Edit the names, choose what to include, then import directly or download the same rows as CSV.</p>
          <p data-report-print-only style={css("display:none;margin:.3rem 0 0;font-size:var(--text-2xs);line-height:1.45;color:var(--fg-muted)")}>Build-ready checklist derived from the approved funnel plan.</p>
        </div>
        <button type="button" onClick={toggleAll} className="pt-softbtn" style={css("height:2rem;padding:0 .72rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-label);font-weight:500;cursor:pointer;white-space:nowrap")}>{allSelected ? "Clear all" : "Select all"}</button>
      </div>

      <div data-report-task-list style={css("display:flex;flex-direction:column;gap:.35rem;max-height:20rem;overflow-y:auto;padding:" + (embedded ? ".55rem 1.4rem" : ".55rem .9rem")) }>
        {rows.map((row, index) => {
          const key = keys[index];
          const checked = selected.has(key);
          return (
            <label data-report-task-row key={key} style={css("display:grid;grid-template-columns:" + (mobile ? "1.2rem minmax(0,1fr)" : "1.2rem minmax(0,1fr) 9.5rem") + ";gap:.55rem;align-items:center;min-height:2.55rem;padding:.38rem .68rem;border:1px solid " + (checked ? "color-mix(in srgb,var(--accent) 35%,var(--border-soft) 65%)" : "var(--border-soft)") + ";border-radius:999px;background:" + (checked ? "color-mix(in srgb,var(--accent-soft) 30%,var(--surface) 70%)" : "var(--surface)") + ";cursor:pointer") }>
              <span style={css("position:relative;align-self:center;width:.95rem;height:.95rem;border-radius:50%;border:1.5px solid " + (checked ? "var(--accent)" : "var(--border)") + ";background:" + (checked ? "var(--accent)" : "var(--surface)") + ";display:grid;place-items:center;color:#fff") }><input type="checkbox" checked={checked} onChange={() => toggle(key)} aria-label={`Include ${row.title}`} style={css("position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer")}/>{checked && <Icon name="checkmark" size={10}/>}</span>
              <span style={css("display:flex;flex-direction:column;justify-content:center;gap:var(--space-1);min-width:0;align-self:stretch") }>
                <input value={row.title} onClick={event => event.stopPropagation()} onChange={event => updateRow(index, { title: event.currentTarget.value })} aria-label={`Task ${index + 1} name`} style={css("width:100%;min-width:0;border:0;border-bottom:1px solid transparent;background:transparent;color:var(--fg);font:inherit;font-size:var(--text-xs);font-weight:500;line-height:1.1;outline:none;padding:.08rem 0")}/>
                {mobile && <span style={css("font-size:var(--text-2xs);color:var(--fg-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{row.milestone || "Implementation"}</span>}
              </span>
              {!mobile && <span style={css("display:inline-flex;align-items:center;gap:.35rem;font-size:var(--text-2xs);color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis") }><span style={css("width:.45rem;height:.45rem;border-radius:50%;background:var(--accent);flex-shrink:0")}/>{row.milestone || "Implementation"}</span>}
            </label>
          );
        })}
      </div>

      <div data-report-exclude style={css("display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;padding:.9rem " + (embedded ? "1.4rem" : "1rem") + ";background:var(--surface-alt)") }>
        <span aria-live="polite" style={css("margin-right:auto;font-size:var(--text-2xs);color:" + (csvReady ? "var(--success)" : "var(--fg-muted)"))}>{csvReady ? "CSV downloaded" : `${selectedRows.length} of ${rows.length} selected`}</span>
        <button type="button" disabled={!selectedRows.length} onClick={() => { downloadCsv(selectedRows, fileName); setCsvReady(true); }} className="pt-softbtn" style={css("display:inline-flex;align-items:center;justify-content:center;gap:.38rem;height:2.25rem;padding:0 .85rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500;cursor:" + (selectedRows.length ? "pointer" : "not-allowed") + ";opacity:" + (selectedRows.length ? "1" : ".5") + ";flex:" + (mobile ? "1" : "0 0 auto"))}><Icon name="file" size={13}/>Download CSV</button>
        <button type="button" disabled={!selectedRows.length} onClick={() => onImport(selectedRows)} className="pt-op" style={css("display:inline-flex;align-items:center;justify-content:center;gap:.38rem;height:2.25rem;padding:0 .95rem;border:0;border-radius:999px;background:var(--accent);color:#fff;font-size:var(--text-2xs);font-weight:500;cursor:" + (selectedRows.length ? "pointer" : "not-allowed") + ";opacity:" + (selectedRows.length ? "1" : ".5") + ";flex:" + (mobile ? "1" : "0 0 auto"))}><Icon name="checkmark" size={13}/>Import to To-do&apos;s</button>
      </div>
    </section>
  );
}
