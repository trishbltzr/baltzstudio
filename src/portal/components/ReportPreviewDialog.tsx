"use client";

import { css } from "../helpers";
import { Icon } from "../icons";

export function ReportPreviewDialog({ pdfUrl, title, onClose }: { pdfUrl: string; title: string; onClose: () => void }) {
  const fileName = `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "report"}.pdf`;
  return <div role="dialog" aria-modal="true" aria-label={`${title} PDF preview`} onClick={event => { event.stopPropagation(); onClose(); }} style={css("position:fixed;inset:0;z-index:120;background:rgba(35,25,18,.5);padding:1rem;display:flex;align-items:center;justify-content:center") }>
    <section onClick={event => event.stopPropagation()} style={css("width:min(62rem,100%);height:min(52rem,calc(100vh - 2rem));border:1px solid var(--border);border-radius:1rem;background:var(--surface);box-shadow:0 24px 70px rgba(30,20,16,.28);overflow:hidden;display:flex;flex-direction:column") }>
      <header style={css("display:flex;align-items:center;gap:.7rem;padding:.75rem .85rem;border-bottom:1px solid var(--border-soft)") }><span style={css("width:2rem;height:2rem;border-radius:.6rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center") }><Icon name="file" size={14}/></span><div style={{ minWidth: 0, flex: 1 }}><strong style={css("display:block;font-size:.8rem;font-weight:500")}>Pageless PDF preview</strong><span style={css("display:block;font-size:.66rem;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{fileName}</span></div><a href={pdfUrl} download={fileName} className="pt-op" style={css("height:2.1rem;padding:0 .85rem;border:0;border-radius:999px;background:var(--accent);color:#fff;font-size:.7rem;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:.35rem;text-decoration:none") }><Icon name="file" size={12}/>Download PDF</a><button type="button" aria-label="Close PDF preview" onClick={onClose} className="pt-iconbtn" style={css("width:2.1rem;height:2.1rem;border:1px solid var(--border);border-radius:50%;background:var(--surface);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer") }><Icon name="x" size={13}/></button></header>
      <iframe title={`${title} PDF document`} src={pdfUrl} style={css("width:100%;flex:1;border:0;background:#eee")}/>
    </section>
  </div>;
}
