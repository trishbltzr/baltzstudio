import { css } from "../helpers";

export function PortalViewLoader() {
  return (
    <div role="status" aria-live="polite" style={css("min-height:18rem;display:grid;place-items:center;padding:var(--space-8);color:var(--fg-muted)") }>
      <span style={css("display:inline-flex;align-items:center;gap:0.65rem;font-size:var(--text-base)") }>
        <span className="dashboard-preloader-dot" aria-hidden="true" />
        Loading workspace…
      </span>
    </div>
  );
}
