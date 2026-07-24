"use client";

import { css } from "../helpers";

interface GuidedLoadingStateProps {
  accent: string;
  heading: string;
  description: string;
  steps: string[];
  tick: number;
  finalMessages: string[];
  estimatedDuration?: string;
  fullWidth?: boolean;
}

export function GuidedLoadingState({ accent, heading, description, steps, tick, finalMessages, estimatedDuration = "About 1–2 minutes", fullWidth = false }: GuidedLoadingStateProps) {
  const activeStep = Math.min(Math.floor(tick / 2), steps.length - 1);
  const finalStepStartTick = (steps.length - 1) * 2;
  const finalStepTick = Math.max(0, tick - finalStepStartTick);
  const progress = activeStep < steps.length - 1
    ? Math.min(90, Math.round(((activeStep + 1) / steps.length) * 90))
    : Math.min(96, 90 + Math.floor(finalStepTick / 4));
  const finalMessage = finalMessages[Math.floor(finalStepTick / 3) % Math.max(finalMessages.length, 1)];
  const takingLonger = finalStepTick >= 50;
  const elapsedSeconds = Math.round(tick * 1.2);
  const elapsedLabel = elapsedSeconds < 60 ? `${elapsedSeconds}s elapsed` : `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s elapsed`;

  return <div className="pt-guided-loading" role="status" aria-live="polite" style={css("--guided-loader-accent:" + accent + ";width:100%;max-width:" + (fullWidth ? "100%" : "31rem") + ";box-sizing:border-box;margin:0 auto;text-align:left;border:1px solid color-mix(in srgb," + accent + " 16%,var(--border-soft) 84%);border-radius:1.1rem;background:color-mix(in srgb," + accent + " 4%,white 96%);padding:var(--space-4)") }>
    <div className="pt-guided-loading-orbit" aria-hidden="true">
      <span className="pt-guided-loading-ring is-outer"><i /></span>
      <span className="pt-guided-loading-ring is-inner"><i /></span>
      <span className="pt-guided-loading-scan" />
      <strong>BS</strong>
    </div>
    <div style={css("font-size:var(--text-lg);font-weight:500;text-align:center")}>{heading}</div>
    <div style={css("font-size:var(--text-sm);color:var(--fg-muted);text-align:center;margin-top:0.35rem")}>{description}</div>
    <div className="pt-guided-loading-time">
      <span>Estimated completion</span>
      <strong>{estimatedDuration}</strong>
      <small>{elapsedLabel}</small>
    </div>
    <div style={css("display:flex;align-items:center;gap:0.65rem;margin-top:0.9rem") }><div style={css("height:0.42rem;flex:1;border-radius:999px;background:#fff;overflow:hidden") }><div className="pt-guided-loading-progress" style={{ width: `${progress}%` }}/></div><span style={css("min-width:2.3rem;text-align:right;font-size:var(--text-2xs);font-weight:500;color:" + accent)}>{progress}%</span></div>
    <div style={css("display:flex;flex-direction:column;gap:0.32rem;margin-top:1rem") }>{steps.map((step, index) => {
      const done = index < activeStep;
      const active = index === activeStep;
      return <div key={step} className={active ? "pt-guided-loading-step is-active" : "pt-guided-loading-step"} style={css("display:flex;align-items:center;gap:0.65rem;padding:0.55rem 0.7rem;border-radius:" + (active ? "999px" : "0") + ";background:" + (active ? `color-mix(in srgb,${accent} 9%,white 91%)` : "transparent") + ";color:" + (done || active ? "var(--fg)" : "var(--fg-faint)"))}><span className="pt-guided-loading-step-dot" style={css("width:1.25rem;height:1.25rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;font-size:var(--text-2xs);border:1px solid " + (done || active ? accent : "var(--border)") + ";background:" + (done ? accent : "var(--surface)") + ";color:" + (done ? "#fff" : active ? accent : "var(--fg-faint)"))}>{done ? "✓" : index + 1}</span><span style={css("font-size:var(--text-sm);font-weight:" + (active ? "500" : "400"))}>{step}</span></div>;
    })}</div>
    {activeStep === steps.length - 1 && finalMessage && <div aria-live="polite" style={css("display:flex;align-items:center;gap:0.6rem;margin-top:0.8rem;padding:0.7rem 0.8rem;border:1px solid color-mix(in srgb," + accent + " 18%,var(--border) 82%);border-radius:999px;background:color-mix(in srgb," + accent + " 5%,white 95%)") }><span className="pt-typing-dot" style={{ background: accent }}/><span style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.4")}>{finalMessage}…</span></div>}
    {takingLonger && <p style={css("margin:0.65rem 0 0;text-align:center;font-size:var(--text-2xs);color:var(--fg-faint);line-height:1.4")}>This site is taking longer to inspect. The run will stop with a retry option if it cannot finish safely.</p>}
  </div>;
}
