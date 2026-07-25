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

  return <div className="pt-guided-loading" role="status" aria-live="polite" style={css("--guided-loader-accent:" + accent + ";width:100%;max-width:" + (fullWidth ? "100%" : "34rem") + ";box-sizing:border-box;margin:0 auto;text-align:left;border:1px solid color-mix(in srgb," + accent + " 16%,var(--border-soft) 84%);border-radius:1rem;background:color-mix(in srgb," + accent + " 3%,white 97%);padding:1rem 1.05rem") }>
    <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:0.8rem")}>
      <div style={css("min-width:0")}>
        <div style={css("font-size:var(--text-lg);font-weight:500")}>{heading}</div>
        <div style={css("font-size:var(--text-xs);line-height:1.45;color:var(--fg-muted);margin-top:0.22rem")}>{description}</div>
      </div>
      <strong style={css("flex-shrink:0;font-size:var(--text-sm);font-weight:500;color:" + accent)}>{progress}%</strong>
    </div>
    <div style={css("height:0.38rem;margin-top:0.75rem;border-radius:999px;background:var(--surface);overflow:hidden") }><div className="pt-guided-loading-progress" style={{ width: `${progress}%` }}/></div>
    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.7rem;margin-top:0.48rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>
      <span>{estimatedDuration}</span>
      <span>{elapsedLabel}</span>
    </div>
    <div style={css("display:flex;flex-direction:column;gap:0.18rem;margin-top:0.8rem") }>{steps.map((step, index) => {
      const done = index < activeStep;
      const active = index === activeStep;
      return <div key={step} className={active ? "pt-guided-loading-step is-active" : "pt-guided-loading-step"} style={css("display:flex;align-items:center;gap:0.55rem;padding:0.42rem 0.5rem;border-radius:0.65rem;background:" + (active ? `color-mix(in srgb,${accent} 8%,white 92%)` : "transparent") + ";color:" + (done || active ? "var(--fg)" : "var(--fg-faint)"))}><span className="pt-guided-loading-step-dot" style={css("width:1rem;height:1rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;border:1px solid " + (done || active ? accent : "var(--border)") + ";background:" + (done ? accent : "var(--surface)") + ";color:" + (done ? "#fff" : active ? accent : "transparent") )}>{done ? <svg aria-hidden="true" width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.4 6.1 4.8 8.4 9.7 3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> : <span aria-hidden="true" style={css("font-size:0.58rem;line-height:1")}>•</span>}</span><span style={css("font-size:var(--text-xs);line-height:1.4;font-weight:" + (active ? "500" : "400"))}>{step}</span></div>;
    })}</div>
    {activeStep === steps.length - 1 && finalMessage && <div aria-live="polite" style={css("display:flex;align-items:center;gap:0.6rem;margin-top:0.8rem;padding:0.7rem 0.8rem;border:1px solid color-mix(in srgb," + accent + " 18%,var(--border) 82%);border-radius:999px;background:color-mix(in srgb," + accent + " 5%,white 95%)") }><span className="pt-typing-dot" style={{ background: accent }}/><span style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.4")}>{finalMessage}…</span></div>}
    {takingLonger && <p style={css("margin:0.65rem 0 0;text-align:center;font-size:var(--text-2xs);color:var(--fg-faint);line-height:1.4")}>This site is taking longer to inspect. The run will stop with a retry option if it cannot finish safely.</p>}
  </div>;
}
