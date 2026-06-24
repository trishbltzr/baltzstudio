import { Check, X } from "lucide-react";
import { ProgressDots, ProgressRing, progressDotsFromCounts } from "./shared";

export type CocoonAuditPreviewReport = {
  title: string;
  total: number;
  complete: number;
  toFix: number;
  percent: number;
};

export function CocoonAuditPreviewPopup({
  reports,
  openCategory,
  onClose,
  onSelectCategory,
}: {
  reports: CocoonAuditPreviewReport[];
  openCategory: string;
  onClose: () => void;
  onSelectCategory: (title: string) => void;
}) {
  return (
    <>
      <div className="cocoon-popup-backdrop" onClick={onClose} />
      <div className="cocoon-popup" role="dialog" aria-modal="true" aria-label="Audit summary">
        <div className="cocoon-popup-head">
          <div>
            <span>Summary</span>
            <h3>Audit Preview</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="audit-category-list">
          {reports.map((report, idx) => {
            const pct = report.total ? Math.round((report.complete / report.total) * 100) : 0;
            const isOpen = openCategory === report.title;
            return (
              <button
                key={report.title}
                type="button"
                className={`audit-category-row audit-category-card ${isOpen ? "is-open" : ""}`}
                aria-pressed={isOpen}
                onClick={() => onSelectCategory(report.title)}
              >
                <span className="audit-category-summary">
                  <span className="phase-tag">#1.{idx + 1}</span>
                  <span className="audit-category-name">{report.title}</span>
                  <span className="audit-category-ring">
                    <ProgressRing value={pct} />
                    <span>{pct}%</span>
                  </span>
                </span>
                <span className="audit-category-card-footer">
                  <ProgressDots markers={progressDotsFromCounts(report.complete, report.total)} id={report.title} />
                  <span className="audit-category-pct"><Check size={12} />{report.complete}/{report.total}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
