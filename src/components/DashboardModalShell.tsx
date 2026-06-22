import { X } from "lucide-react";
import type { ReactNode } from "react";

export function DashboardModalShell({
  children,
  headerEnd,
  onClose,
  ariaLabel,
  maxWidth = "520px",
}: {
  children: ReactNode;
  headerEnd?: ReactNode;
  onClose: () => void;
  ariaLabel: string;
  maxWidth?: string;
}) {
  return (
    <>
      <div className="dashboard-modal-backdrop" onClick={onClose} />
      <div
        className="dashboard-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={{ maxWidth }}
        onClick={event => event.stopPropagation()}
      >
        <div className="dashboard-modal-head">
          <button type="button" className="dashboard-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          {headerEnd && <div className="dashboard-modal-head-end">{headerEnd}</div>}
        </div>
        {children}
      </div>
    </>
  );
}
