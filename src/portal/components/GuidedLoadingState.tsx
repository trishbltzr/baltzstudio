"use client";

import { css } from "../helpers";

interface GuidedLoadingStateProps {
  accent: string;
  heading: string;
  description: string;
  steps: string[];
  tick: number;
  finalMessages: string[];
  fullWidth?: boolean;
}

export function GuidedLoadingState({ accent, heading, description, steps, tick, finalMessages, fullWidth = false }: GuidedLoadingStateProps) {
  const activeStep = Math.min(Math.floor(tick / 2), steps.length - 1);
  const finalStepStartTick = (steps.length - 1) * 2;
  const finalStepTick = Math.max(0, tick - finalStepStartTick);
  const progress = activeStep < steps.length - 1
    ? Math.min(90, Math.round(((activeStep + 1) / steps.length) * 90))
    : Math.min(98, 90 + Math.floor(finalStepTick / 4));
  const finalMessage = finalMessages[Math.floor(finalStepTick / 3) % Math.max(finalMessages.length, 1)];

  return <div role="status" aria-live="polite" style={css("width:100%;max-width:" + (fullWidth ? "100%" : "31rem") + ";box-sizing:border-box;margin:0 auto;text-align:left;border:1px solid color-mix(in srgb," + accent + " 16%,var(--border-soft) 84%);border-radius:1.1rem;background:color-mix(in srgb," + accent + " 4%,white 96%);padding:1rem") }>
    <div style={css("font-size:1rem;font-weight:500;text-align:center")}>{heading}</div>
    <div style={css("font-size:0.82rem;color:var(--fg-muted);text-align:center;margin-top:0.35rem")}>{description}</div>
    <div style={css("display:flex;align-items:center;gap:0.65rem;margin-top:0.9rem") }><div style={css("height:0.42rem;flex:1;border-radius:999px;background:#fff;overflow:hidden") }><div style={css("height:100%;width:" + progress + "%;border-radius:999px;background:" + accent + ";transition:width .65s ease")}/></div><span style={css("min-width:2.3rem;text-align:right;font-size:0.7rem;font-weight:500;color:" + accent)}>{progress}%</span></div>
    <div style={css("display:flex;flex-direction:column;gap:0.32rem;margin-top:1rem") }>{steps.map((step, index) => {
      const done = index < activeStep;
      const active = index === activeStep;
      return <div key={step} style={css("display:flex;align-items:center;gap:0.65rem;padding:0.55rem 0.7rem;border-radius:" + (active ? "999px" : "0") + ";background:" + (active ? `color-mix(in srgb,${accent} 9%,white 91%)` : "transparent") + ";color:" + (done || active ? "var(--fg)" : "var(--fg-faint)"))}><span style={css("width:1.25rem;height:1.25rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;font-size:0.65rem;border:1px solid " + (done || active ? accent : "var(--border)") + ";background:" + (done ? accent : "var(--surface)") + ";color:" + (done ? "#fff" : active ? accent : "var(--fg-faint)"))}>{done ? "✓" : index + 1}</span><span style={css("font-size:0.82rem;font-weight:" + (active ? "500" : "400"))}>{step}</span></div>;
    })}</div>
    {activeStep === steps.length - 1 && finalMessage && <div aria-live="polite" style={css("display:flex;align-items:center;gap:0.6rem;margin-top:0.8rem;padding:0.7rem 0.8rem;border:1px solid color-mix(in srgb," + accent + " 18%,var(--border) 82%);border-radius:999px;background:color-mix(in srgb," + accent + " 5%,white 95%)") }><span className="pt-typing-dot" style={{ background: accent }}/><span style={css("font-size:0.76rem;color:var(--fg-muted);line-height:1.4")}>{finalMessage}…</span></div>}
  </div>;
}
