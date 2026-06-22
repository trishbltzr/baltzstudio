import { useState } from "react";
import { Check, X } from "lucide-react";
import { ProgressDots, ProgressRing, RadialGauge, progressDotsFromCounts } from "./shared";

export type CocoonAuditPreviewReport = {
  title: string;
  total: number;
  complete: number;
  toFix: number;
  percent: number;
};

const gaugeColors = [
  "var(--accent)",
  "oklch(0.58 0.105 25)",
  "oklch(0.62 0.08 42)",
  "oklch(0.52 0.055 32)",
  "oklch(0.68 0.075 18)",
  "oklch(0.48 0.045 36)",
];

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
  const [activeGaugeToast, setActiveGaugeToast] = useState<string | null>(null);

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

        <div className="audit-gauges-row">
          {reports.map((report, idx) => {
            const pct = report.total ? Math.round((report.complete / report.total) * 100) : 0;
            const gaugeSummary = `${report.title}: ${pct}% cleared · ${report.complete} of ${report.total} checks complete`;
            return (
              <div
                key={report.title}
                className="audit-gauge"
                tabIndex={0}
                aria-label={gaugeSummary}
                onMouseEnter={() => setActiveGaugeToast(gaugeSummary)}
                onMouseLeave={() => setActiveGaugeToast(null)}
                onFocus={() => setActiveGaugeToast(gaugeSummary)}
                onBlur={() => setActiveGaugeToast(null)}
              >
                <RadialGauge value={pct} size={48} strokeWidth={5} color={gaugeColors[idx % gaugeColors.length]} />
              </div>
            );
          })}
          <div className={`audit-gauge-toast ${activeGaugeToast ? "is-visible" : ""}`} aria-live="polite">
            {activeGaugeToast ?? "Hover to see more information."}
          </div>
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
