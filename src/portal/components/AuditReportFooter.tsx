"use client";

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
  // Export profiles still feed the PDF generator at each call site. They are
  // intentionally not editable inside the report because those controls do
  // not change the audit result and distract from the review workflow.
  void exportProfile;
  void canManageExport;
  void onSaveExportProfile;

  return (
    <div data-report-exclude style={css("margin-top:0.5rem;padding-top:0.9rem;border-top:1px solid var(--border-soft)")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap")}>
        <div style={css("display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap")}>
          {onPrint && <button type="button" onClick={onPrint} className="pt-softbtn" style={css("display:inline-flex;align-items:center;justify-content:center;gap:0.42rem;min-height:2.4rem;padding:0 1.05rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer;font-family:inherit")}><Icon name="file" size={15} />Download PDF</button>}
        </div>
        {cta && <div style={css("margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:0.32rem;min-width:0")}>
          <button type="button" onClick={cta.onClick} disabled={cta.disabled} className="pt-op" style={css("width:max-content;max-width:100%;display:inline-flex;align-items:center;justify-content:center;gap:0.35rem;min-height:2.4rem;padding:0 1rem;border:none;border-radius:var(--radius-pill);background:" + (cta.disabled ? "var(--surface-alt)" : "var(--accent)") + ";color:" + (cta.disabled ? "var(--fg-faint)" : "#fff") + ";font-size:var(--text-sm);font-weight:500;cursor:" + (cta.disabled ? "not-allowed" : "pointer") + ";font-family:inherit;white-space:nowrap")}>{cta.label}{cta.disabled ? <Icon name="lock" size={14} /> : cta.icon ? <Icon name={cta.icon} size={14} /> : null}</button>
          {cta.disabled && cta.disabledReason && <span style={css("max-width:18rem;text-align:right;font-size:var(--text-2xs);line-height:1.35;color:var(--danger)")}>{cta.disabledReason}</span>}
        </div>}
      </div>
    </div>
  );
}
