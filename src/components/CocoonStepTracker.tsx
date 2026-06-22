import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

export type CocoonStepTrackerStep = {
  id: string;
  title: string;
  summary: string;
  status: "complete" | "current" | "locked";
};

export function CocoonStepTracker({
  steps,
  openStepId,
  completedSteps,
  onSelectStep,
  onSkipToFinalPreview,
}: {
  steps: CocoonStepTrackerStep[];
  openStepId: string;
  completedSteps: number;
  onSelectStep: (stepId: string) => void;
  onSkipToFinalPreview: () => void;
}) {
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);
  const hoveredStep = hoveredStepId ? (steps.find(s => s.id === hoveredStepId) ?? null) : null;
  const hoveredStepIdx = hoveredStep ? steps.findIndex(s => s.id === hoveredStep.id) : 0;
  const popupTopPx = 16 + 60 + 6 + hoveredStepIdx * 34;

  return (
    <>
      {hoveredStep && hoveredStep.status !== "locked" && (
        <div className="cocoon-hover-popup" style={{ position: "absolute", left: "282px", top: `${popupTopPx}px`, width: "200px", background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "0.85rem", boxShadow: "var(--shadow-popover)", padding: "0.9rem 1rem", zIndex: 50, pointerEvents: "none" }}>
          <div style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)", marginBottom: "0.3rem", lineHeight: 1.3 }}>{hoveredStep.title}</div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", lineHeight: 1.5 }}>{hoveredStep.summary}</div>
        </div>
      )}

      <div className="cocoon-widget-col">
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-panel)", border: "0", overflow: "hidden" }}>
          <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border-soft)" }}>
            <div style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)", marginBottom: "0.15rem" }}>Cocoon Consult™</div>
            <div style={{ fontSize: "var(--text-base)", color: "var(--fg-muted)" }}>Your brand prep checklist</div>
          </div>
          <div style={{ padding: "0.35rem 0" }}>
            {steps.map(step => {
              const isComplete = step.status === "complete";
              const isInProgress = step.status === "current";
              const isCurrent = step.id === openStepId;
              const isLocked = step.status === "locked";
              const isHovered = hoveredStepId === step.id;
              return (
                <div key={step.id}
                  onClick={() => !isLocked && onSelectStep(step.id)}
                  onMouseEnter={() => setHoveredStepId(step.id)}
                  onMouseLeave={() => setHoveredStepId(null)}
                  style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.6rem", cursor: isLocked ? "default" : "pointer", background: isCurrent ? "oklch(0.97 0.006 50)" : isHovered && !isLocked ? "oklch(0 0 0 / 0.02)" : "transparent", transition: "background 0.12s" }}
                >
                  <div style={{ width: "1rem", height: "1rem", borderRadius: "50%", flexShrink: 0, border: isComplete ? "none" : isInProgress ? "1.5px dashed oklch(0.78 0.11 22)" : "1.5px solid var(--border)", background: isComplete ? "oklch(0.55 0.2 20)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isComplete && <Check size={7} color="white" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: "var(--text-base)", fontWeight: isCurrent ? 600 : 400, color: isComplete ? "var(--fg-muted)" : isLocked ? "var(--fg-muted)" : "var(--fg)", textDecoration: isComplete ? "line-through" : "none", opacity: isLocked ? 0.45 : 1, lineHeight: 1.35 }}>
                    {step.title}
                    {step.id === "strategy-call" && isCurrent && <span className="cocoon-final-step-badge">Final</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ padding: "0.65rem 1rem", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
              <span style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--accent)" }}>{completedSteps} of {steps.length} complete</span>
            </div>
            <div style={{ height: "4px", background: "var(--bg)", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, oklch(0.78 0.11 22), oklch(0.7 0.13 18))", width: `${Math.max((completedSteps / steps.length) * 100, 2)}%`, transition: "width 0.3s ease" }} />
            </div>
            <button
              type="button"
              onClick={onSkipToFinalPreview}
              style={{
                width: "100%",
                marginTop: "0.75rem",
                padding: "0.55rem 0.7rem",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "var(--surface-alt)",
                color: "var(--fg-muted)",
                fontFamily: "inherit",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.35rem",
              }}
            >
              Preview final screen <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
