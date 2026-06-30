export function PagePreloader({ label = "Loading portal..." }: { label?: string }) {
  return (
    <div className="page-preloader" role="status" aria-live="polite">
      <div className="page-preloader-card">
        <div className="page-preloader-mark-wrap" aria-hidden="true">
          <span className="page-preloader-glow" />
          <span className="page-preloader-arc" />
          <span className="page-preloader-mark">BS</span>
        </div>
        <div className="page-preloader-copy">
          <span className="page-preloader-kicker">Baltazar Studio</span>
          <strong>{label}</strong>
        </div>
        <div className="page-preloader-bar" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
