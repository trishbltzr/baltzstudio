"use client";

import { useEffect, useState } from "react";
import type { PortalAuditExportMode, PortalAuditExportProfile, PortalAuditExportStatus } from "../../lib/portalWorkspacePersistence";
import { css } from "../helpers";
import { Icon } from "../icons";

export interface ReportFooterCta {
  label: string;
  onClick: () => void;
  icon?: string;
  disabled?: boolean;
  disabledReason?: string;
}

// Shared terminal footer for every audit report: "Print / save PDF" on the
// left, the next-step CTA on the right. Replaces the old full-width handoff
// banners so each audit ends with the same lightweight action row.
export function AuditReportFooter({ onPrint, cta, exportProfile, canManageExport = false, onSaveExportProfile }: {
  onPrint?: () => void;
  cta?: ReportFooterCta;
  exportProfile?: PortalAuditExportProfile | null;
  canManageExport?: boolean;
  onSaveExportProfile?: (update: { mode: PortalAuditExportMode; status: PortalAuditExportStatus; brandName: string; accent: string }) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<PortalAuditExportMode>(exportProfile?.mode || "studio");
  const [status, setStatus] = useState<PortalAuditExportStatus>(exportProfile?.status || "draft");
  const [brandName, setBrandName] = useState(exportProfile?.brandName || "Baltazar Studio");
  const [accent, setAccent] = useState(exportProfile?.accent || "#d86e76");
  const [historyVersion, setHistoryVersion] = useState(exportProfile?.version || 1);

  useEffect(() => {
    if (!exportProfile) return;
    setMode(exportProfile.mode);
    setStatus(exportProfile.status);
    setBrandName(exportProfile.brandName);
    setAccent(exportProfile.accent);
    setHistoryVersion(exportProfile.version);
  }, [exportProfile]);

  const exportProfileLabel = exportProfile && <><span style={css("width:.52rem;height:.52rem;border-radius:50%;background:" + exportProfile.accent)} />{exportProfile.brandName} · v{exportProfile.version} · {exportProfile.status}</>;

  return (
    <div data-report-exclude style={css("display:flex;flex-direction:column;gap:.65rem;margin-top:0.5rem;padding-top:0.9rem;border-top:1px solid var(--border-soft)")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap")}>
        <div style={css("display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap")}>
          {onPrint && <button type="button" onClick={onPrint} className="pt-softbtn" style={css("display:inline-flex;align-items:center;gap:0.42rem;min-height:2.4rem;padding:0 1.05rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer;font-family:inherit")}><Icon name="print" size={15} />Print / save PDF</button>}
          {exportProfile && (canManageExport
            ? <button type="button" onClick={() => setSettingsOpen(open => !open)} aria-expanded={settingsOpen} className="pt-softbtn" style={css("display:inline-flex;align-items:center;gap:.38rem;min-height:2.4rem;padding:0 .85rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>{exportProfileLabel}<span style={{ transform: settingsOpen ? "rotate(180deg)" : "none", display: "grid" }}><Icon name="chev" size={12} /></span></button>
            : <span aria-label="Export profile" className="pt-softbtn" style={css("display:inline-flex;align-items:center;gap:.38rem;min-height:2.4rem;padding:0 .85rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500")}>{exportProfileLabel}</span>)}
        </div>
        {cta && <div style={css("display:flex;flex-direction:column;align-items:flex-end;gap:0.32rem")}>
          <button type="button" onClick={cta.onClick} disabled={cta.disabled} className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.42rem;min-height:2.4rem;padding:0 1.15rem;border:none;border-radius:var(--radius-pill);background:" + (cta.disabled ? "var(--surface-alt)" : "var(--accent)") + ";color:" + (cta.disabled ? "var(--fg-faint)" : "#fff") + ";font-size:var(--text-sm);font-weight:500;cursor:" + (cta.disabled ? "not-allowed" : "pointer") + ";font-family:inherit")}>{cta.label}<Icon name={cta.disabled ? "lock" : (cta.icon || "arrowright")} size={14} /></button>
          {cta.disabled && cta.disabledReason && <span style={css("max-width:18rem;text-align:right;font-size:var(--text-2xs);line-height:1.35;color:var(--danger)")}>{cta.disabledReason}</span>}
        </div>}
      </div>
      {settingsOpen && canManageExport && exportProfile && onSaveExportProfile && <div data-report-internal style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:.55rem;padding:.7rem;border:1px solid var(--border-soft);border-radius:.85rem;background:var(--surface-alt)")}>
        <label style={css("display:flex;flex-direction:column;gap:.28rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>Branding<select aria-label="Export branding" value={mode} onChange={event => { const next = event.target.value as PortalAuditExportMode; setMode(next); if (next === "studio") setBrandName("Baltazar Studio"); }} style={css("height:2.15rem;border:1px solid var(--border);border-radius:.65rem;background:var(--surface);padding:0 .6rem;color:var(--fg);font:inherit;font-size:var(--text-2xs)")}><option value="studio">Baltazar Studio</option><option value="client">Direct client</option><option value="partner">Agency partner</option></select></label>
        <label style={css("display:flex;flex-direction:column;gap:.28rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>Approved display name<input aria-label="Export display name" value={brandName} onChange={event => setBrandName(event.target.value)} style={css("height:2.15rem;border:1px solid var(--border);border-radius:.65rem;background:var(--surface);padding:0 .6rem;color:var(--fg);font:inherit;font-size:var(--text-2xs)")} /></label>
        <label style={css("display:flex;flex-direction:column;gap:.28rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>Review status<select aria-label="Export review status" value={status} onChange={event => setStatus(event.target.value as PortalAuditExportStatus)} style={css("height:2.15rem;border:1px solid var(--border);border-radius:.65rem;background:var(--surface);padding:0 .6rem;color:var(--fg);font:inherit;font-size:var(--text-2xs)")}><option value="draft">Draft</option><option value="reviewed">Reviewed</option><option value="ready">Ready</option><option value="sent">Sent manually</option></select></label>
        <label style={css("display:flex;flex-direction:column;gap:.28rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>Accent<input aria-label="Export accent" type="color" value={accent} onChange={event => setAccent(event.target.value)} style={css("width:100%;height:2.15rem;border:1px solid var(--border);border-radius:.65rem;background:var(--surface);padding:.25rem .4rem")} /></label>
        <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:.6rem;grid-column:1/-1;flex-wrap:wrap")}><span style={css("font-size:var(--text-2xs);line-height:1.4;color:var(--fg-faint)")}>{exportProfile.history.length} saved version{exportProfile.history.length === 1 ? "" : "s"} · Saving creates a recoverable version. Sent is never automatic.</span><div style={css("display:flex;align-items:center;gap:.45rem;flex-wrap:wrap")}>
          {exportProfile.history.length > 0 && <><select aria-label="Saved export version" value={historyVersion} onChange={event => setHistoryVersion(Number(event.target.value))} style={css("height:2.15rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);padding:0 .65rem;color:var(--fg);font:inherit;font-size:var(--text-2xs)")}>{[...exportProfile.history].reverse().map(item => <option key={`${item.version}-${item.savedAt}`} value={item.version}>v{item.version} · {item.brandName}</option>)}</select><button type="button" onClick={() => { const saved = [...exportProfile.history].reverse().find(item => item.version === historyVersion); if (saved) onSaveExportProfile({ mode: saved.mode, status: "draft", brandName: saved.brandName, accent: saved.accent }); setSettingsOpen(false); }} className="pt-softbtn" style={css("height:2.15rem;padding:0 .75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font:inherit;font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>Restore as draft</button></>}
          <button type="button" onClick={() => { onSaveExportProfile({ mode, status, brandName, accent }); setSettingsOpen(false); }} className="pt-op" style={css("height:2.15rem;padding:0 .85rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font:inherit;font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>Save export profile</button>
        </div></div>
      </div>}
    </div>
  );
}
