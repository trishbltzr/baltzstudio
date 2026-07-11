"use client";

import { useRef, useState } from "react";
import { Icon } from "../icons";
import { css } from "../helpers";
import { formatDashboardDate } from "@/lib/dateDisplay";
import type { PortalActions, PortalState } from "../store";

const FOLDERS = [["all", "All files", 6], ["design", "Design Files", 3], ["brand", "Brand Assets", 2], ["deliverables", "Deliverables", 1]] as const;
const FILES = [
  { name: "Flora_FullSite_v3.fig", ext: "FIG", folder: "design", size: "8.2 MB", by: "Noa", updated: "July 1", status: "Ready" },
  { name: "Homepage_preview.png", ext: "PNG", folder: "design", size: "2.4 MB", by: "Noa", updated: "June 30", status: "Ready" },
  { name: "Shop_layout.fig", ext: "FIG", folder: "design", size: "5.1 MB", by: "Emet", updated: "June 28", status: "Ready" },
  { name: "Brand_Guidelines.pdf", ext: "PDF", folder: "brand", size: "3.1 MB", by: "Trish", updated: "June 26", status: "Ready" },
  { name: "Logo_pack.zip", ext: "ZIP", folder: "brand", size: "12 MB", by: "Trish", updated: "June 26", status: "Ready" },
  { name: "Product_Photography.zip", ext: "ZIP", folder: "deliverables", size: "44 MB", by: "You", updated: "June 24", status: "Uploaded" },
];

export function Files({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [folder, setFolder] = useState("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const active = FOLDERS.find(([k]) => k === folder);
  const workspace = actions.workspaceForClient("Flora & Co.");
  const uploadedFiles = workspace.files.map(file => ({
    name: file.name,
    ext: file.ext,
    folder: file.folder,
    size: file.sizeLabel,
    by: file.by,
    updated: formatDashboardDate(file.updated, file.updated),
    status: file.status,
  }));
  const allFiles = [...uploadedFiles, ...FILES];
  const files = allFiles.filter(f => folder === "all" || f.folder === folder);
  const ready = files.filter(f => f.status === "Ready").length;

  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;display:grid;grid-template-columns:" + (state.isMobile ? "1fr" : "15rem 1fr") + ";min-height:22rem")}>
      <aside style={css("border-right:1px solid var(--border-soft);background:var(--surface-alt);padding:1.1rem 0.9rem;display:flex;flex-direction:column;gap:0.15rem")}>
        <div style={css("font-size:0.62rem;letter-spacing:0.02em;color:var(--fg-faint);font-weight:500;padding:0 0.3rem 0.5rem")}>Folders</div>
        {FOLDERS.map(([k, label, count]) => (
          <div key={k} onClick={() => setFolder(k)} className="pt-menuitem" style={css("display:flex;align-items:center;gap:0.55rem;padding:0.5rem 0.55rem;border-radius:var(--radius);cursor:pointer;font-size:var(--text-base);font-weight:500;color:var(--fg);" + (folder === k ? "background:var(--surface)" : ""))}>
            <span style={{ display: "grid", placeItems: "center", flexShrink: 0, color: "var(--fg-muted)" }}><Icon name="folder" size={16} /></span>
            <span style={css("flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{label}</span>
            <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{folder === "all" ? allFiles.length : allFiles.filter(file => file.folder === k).length || count}</span>
          </div>
        ))}
      </aside>
      <div style={css("display:flex;flex-direction:column;min-width:0")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:1rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
          <span style={css("font-weight:500;font-size:var(--text-lg)")}>{active?.[1]}</span>
          <div style={css("display:flex;gap:1.2rem;font-size:0.74rem;color:var(--fg-muted)")}><span><strong style={css("color:var(--fg);font-weight:500")}>{ready}</strong> ready</span></div>
        </div>
        <div>
          <div style={css("display:grid;grid-template-columns:2.6fr 0.7fr 0.9fr;gap:0.7rem;padding:0.55rem 1.4rem;border-bottom:1px solid var(--border-soft);font-size:0.62rem;letter-spacing:0.02em;color:var(--fg-faint);font-weight:500")}>
            <span>Name</span><span>Updated</span><span style={{ textAlign: "right" }}>Status</span>
          </div>
          {files.map((f, index) => (
            <div key={f.name + "#" + index} className="pt-row" style={css("display:grid;grid-template-columns:2.6fr 0.7fr 0.9fr;gap:0.7rem;padding:0.75rem 1.4rem;border-bottom:1px solid var(--border-soft);align-items:center")}>
              <div style={css("display:flex;align-items:center;gap:0.65rem;min-width:0")}>
                <span style={css("width:2rem;height:2rem;border-radius:var(--radius-sm);background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0;font-size:0.56rem;font-weight:500")}>{f.ext}</span>
                <div style={{ minWidth: 0 }}><div style={css("font-weight:500;font-size:var(--text-base);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{f.name}</div><div style={css("font-size:0.7rem;color:var(--fg-faint);white-space:nowrap")}>{f.size} · {f.by}</div></div>
              </div>
              <span style={css("font-size:0.8rem;color:var(--fg-muted)")}>{f.updated}</span>
              <span style={{ justifySelf: "end", ...css(f.status === "Ready" ? "display:inline-flex;align-items:center;font-size:var(--text-2xs);font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;background:var(--success-soft);color:var(--success)" : "display:inline-flex;align-items:center;font-size:var(--text-2xs);font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;background:var(--surface-alt);color:var(--fg-muted)") }}>{f.status}</span>
            </div>
          ))}
          {files.length === 0 && (
            <div style={css("display:flex;flex-direction:column;align-items:center;text-align:center;gap:0.3rem;padding:2.4rem 1.4rem;color:var(--fg-muted)")}>
              <span style={css("width:2.6rem;height:2.6rem;border-radius:50%;background:var(--surface-alt);color:var(--fg-faint);display:grid;place-items:center;margin-bottom:0.15rem")}><Icon name="folder" size={18} /></span>
              <div style={css("font-size:var(--text-md);font-weight:500;color:var(--fg)")}>Nothing here yet</div>
              <div style={css("font-size:0.78rem;color:var(--fg-faint);max-width:20rem;line-height:1.4")}>Files shared in this folder will show up here — upload one below to get started.</div>
            </div>
          )}
          <div onClick={() => inputRef.current?.click()} className="pt-softbtn" style={css("display:flex;align-items:center;gap:var(--space-4);margin-top:auto;padding:1rem 1.4rem;border-top:1px solid var(--border-soft);cursor:pointer")}>
            <span style={css("width:2.4rem;height:2.4rem;border-radius:50%;background:oklch(0.94 0.004 50);color:var(--fg-muted);display:grid;place-items:center;flex-shrink:0")}><Icon name="file" size={15} /></span>
            <div><div style={css("font-weight:500;font-size:0.85rem")}>Upload files or drag here</div><div style={css("font-size:var(--text-xs);color:var(--fg-faint);margin-top:0.1rem")}>Saved to {active?.[1]} · SVG, PDF, ZIP, images, documents</div></div>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={event => {
              if (!event.currentTarget.files?.length) return;
              void actions.uploadPortalFiles({ clientName: "Flora & Co.", folder, files: event.currentTarget.files });
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
