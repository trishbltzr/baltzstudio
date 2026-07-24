"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import { GuidedIntakeShell, GuidedOptionPill, GuidedPipelinePanel, GuidedUnsureToggle } from "../components/GuidedIntakeShell";

const GRAD = "linear-gradient(90deg,var(--cocoon),color-mix(in srgb,var(--cocoon) 68%,black 32%))";
const TYPE_LABEL: Record<string, string> = {
  text: "Short answer",
  textarea: "Long answer",
  choice: "Pick one",
  checklist: "Pick any that apply",
};

type QKind = "text" | "textarea" | "choice" | "checklist";
interface AQuestion {
  id: string;
  s: number;
  kind: QKind;
  required?: boolean;
  prompt: string;
  placeholder?: string;
  help?: string;
  options?: string[];
}

interface ADeliv {
  id: string;
  title: string;
  from: string;
  intro: string;
  terminal?: boolean;
}

const SECTIONS = ["Business & brand", "Audience & offer", "Goals & conversion", "Site & messaging", "Assets & priorities"];

const QUESTIONS: AQuestion[] = [
  { id: "business", s: 0, kind: "text", required: true, prompt: "What's the business called?", placeholder: "Client business name" },
  { id: "businessModel", s: 0, kind: "text", required: true, prompt: "What do they sell right now?", placeholder: "12-week 1:1 nutrition coaching" },
  { id: "positioning", s: 0, kind: "textarea", required: true, prompt: "How do they describe the brand today?", placeholder: "Warm, practical wellness for busy women who want real-life structure." },
  { id: "brandShift", s: 0, kind: "textarea", prompt: "What's changing or being reconsidered?", placeholder: "The visuals feel dated and the messaging no longer reflects the premium offer." },

  { id: "audience", s: 1, kind: "textarea", required: true, prompt: "Who's the core audience we should keep in mind?", placeholder: "Busy working moms, 30-45, who want guidance without diet culture." },
  { id: "bestFit", s: 1, kind: "textarea", prompt: "What makes someone a strong-fit client?", placeholder: "Ready to invest, values accountability, wants a calmer day-to-day system." },
  { id: "offerFocus", s: 1, kind: "choice", required: true, prompt: "Which offer should this discovery focus on most?", options: ["Core service offer", "Signature program", "Course / digital product", "Membership / subscription", "Overall brand direction"] },
  { id: "audiencePain", s: 1, kind: "textarea", required: true, prompt: "What are the biggest frustrations or hesitations this audience has?", placeholder: "They feel overwhelmed, unclear what makes this brand different, and don't trust the process yet." },

  { id: "primaryGoal", s: 2, kind: "choice", required: true, prompt: "What's the main business goal behind this audit?", options: ["More booked calls", "More qualified leads", "More sales", "Clearer positioning", "Better website conversion"] },
  { id: "primaryAction", s: 2, kind: "choice", required: true, prompt: "What's the main action the website should drive?", options: ["Book a call", "Submit an inquiry", "Join the email list", "Purchase now", "Explore services"] },
  { id: "conversionBlockers", s: 2, kind: "textarea", required: true, prompt: "What do you think is currently blocking conversion?", placeholder: "The offer is buried, the CTA is weak, and trust is low near decision points." },
  { id: "trafficSources", s: 2, kind: "checklist", prompt: "Where is most traffic coming from right now?", options: ["Instagram", "Meta ads", "Google / search", "Referrals", "Email list", "Direct / word of mouth", "Pinterest", "Other"] },

  { id: "auditSurface", s: 3, kind: "checklist", required: true, prompt: "Which surfaces matter most in this discovery pass?", options: ["Homepage", "Services / offers", "About page", "Booking / inquiry flow", "Lead magnet or opt-in", "Mobile experience", "Brand visuals", "Messaging / copy"] },
  { id: "messageGap", s: 3, kind: "textarea", required: true, prompt: "What feels off about the current messaging or experience?", placeholder: "The value prop takes too long to land and every page sounds slightly different." },
  { id: "proofSignals", s: 3, kind: "textarea", prompt: "What proof, results, or credibility signals already exist?", placeholder: "Client testimonials, before/afters, media features, case studies, results data." },
  { id: "voiceDirection", s: 3, kind: "checklist", prompt: "How should the refreshed direction feel?", options: ["Warm", "Premium", "Direct", "Playful", "Grounded", "Editorial", "Authority-led", "Minimal"] },

  { id: "assets", s: 4, kind: "textarea", prompt: "What source materials should discovery pull from?", placeholder: "Current site, Figma file, offer docs, intake notes, testimonials, analytics snapshots." },
  { id: "nonNegotiables", s: 4, kind: "textarea", prompt: "Any non-negotiables or boundaries for the recommendation?", placeholder: "Keep the logo, don't promise a full rebrand yet, avoid adding new tech this quarter." },
  { id: "priorityThemes", s: 4, kind: "checklist", required: true, prompt: "Which themes should discovery prioritize first?", options: ["Positioning clarity", "Offer clarity", "Visual polish", "Trust & proof", "Conversion path", "Mobile UX", "Content hierarchy", "SEO / findability"] },
  { id: "timeline", s: 4, kind: "choice", prompt: "How quickly should the next move happen?", options: ["ASAP / this week", "2-4 weeks", "1-2 months", "Flexible"] },
];

const DELIVS: ADeliv[] = [
  { id: "brief", title: "Discovery Brief", from: "your intake", intro: "A clean summary of the business, audience, and current context we are auditing against." },
  { id: "offer", title: "Offer & Audience Read", from: "the discovery brief", intro: "A sharper picture of who the site should speak to, what they care about, and what the offer must communicate." },
  { id: "journey", title: "Conversion Journey Read", from: "the offer & audience read", intro: "The key path a visitor takes today, where it breaks down, and what the site should guide them toward instead." },
  { id: "findings", title: "Priority Findings", from: "the conversion journey read", intro: "The biggest experience, messaging, and trust issues surfaced first, with the why behind each one." },
  { id: "plan", title: "Recommended Next-Move Plan", from: "the priority findings", intro: "A practical sequence for what to fix first so the audit turns into action instead of a pile of notes." },
  { id: "finalplan", title: "Final Audit Plan", from: "everything approved", intro: "Every discovery checkpoint signed off and consolidated into the audit plan the team can move forward with.", terminal: true },
];

const DEMO: Record<string, string | string[]> = {};

type FlowStep =
  | { kind: "welcome" }
  | { kind: "question"; q: AQuestion; sIdx: number; withinIdx: number; sectionCount: number; lastInSection: boolean }
  | { kind: "gate"; sIdx: number }
  | { kind: "deliv"; dId: string };

function buildFlow(): FlowStep[] {
  const flow: FlowStep[] = [{ kind: "welcome" }];
  SECTIONS.forEach((_, si) => {
    const qs = QUESTIONS.filter(q => q.s === si);
    qs.forEach((q, wi) => flow.push({ kind: "question", q, sIdx: si, withinIdx: wi + 1, sectionCount: qs.length, lastInSection: wi === qs.length - 1 }));
    flow.push({ kind: "gate", sIdx: si });
  });
  DELIVS.forEach(d => flow.push({ kind: "deliv", dId: d.id }));
  return flow;
}

type Ans = Record<string, string | string[]>;
interface AState {
  idx: number;
  answers: Ans;
  unsure: Record<string, boolean>;
  confirmed: Record<number, boolean>;
  signed: Record<string, boolean>;
  notes: Record<string, string>;
  requesting: boolean;
  draftNote: string;
  error: string;
  genActive: boolean;
  genLabel: string;
  genDone: Record<string, boolean>;
}

const init: AState = {
  idx: 0,
  answers: {},
  unsure: {},
  confirmed: {},
  signed: {},
  notes: {},
  requesting: false,
  draftNote: "",
  error: "",
  genActive: false,
  genLabel: "",
  genDone: {},
};

type Act =
  | { t: "go"; i: number }
  | { t: "err"; m: string }
  | { t: "text"; id: string; v: string }
  | { t: "choice"; id: string; v: string }
  | { t: "check"; id: string; v: string }
  | { t: "unsure"; id: string }
  | { t: "confirmGate"; s: number }
  | { t: "sign"; id: string }
  | { t: "reqChanges"; note: string }
  | { t: "cancelReq" }
  | { t: "draft"; v: string }
  | { t: "sendNote"; id: string }
  | { t: "restart" }
  | { t: "autofill"; s: number }
  | { t: "demoAll"; finalIdx: number }
  | { t: "gen"; active: boolean; label?: string }
  | { t: "genDone"; id: string };

function reducer(s: AState, a: Act): AState {
  switch (a.t) {
    case "go": return { ...s, idx: a.i, error: "" };
    case "err": return { ...s, error: a.m };
    case "text": return { ...s, answers: { ...s.answers, [a.id]: a.v }, error: "" };
    case "choice": return { ...s, answers: { ...s.answers, [a.id]: a.v }, error: "" };
    case "check": {
      const arr = Array.isArray(s.answers[a.id]) ? (s.answers[a.id] as string[]).slice() : [];
      const i = arr.indexOf(a.v);
      if (i === -1) arr.push(a.v); else arr.splice(i, 1);
      return { ...s, answers: { ...s.answers, [a.id]: arr }, error: "" };
    }
    case "unsure": return { ...s, unsure: { ...s.unsure, [a.id]: !s.unsure[a.id] }, error: "" };
    case "confirmGate": return { ...s, confirmed: { ...s.confirmed, [a.s]: true }, error: "", idx: s.idx + 1 };
    case "sign": return { ...s, signed: { ...s.signed, [a.id]: true }, requesting: false, idx: s.idx + 1 };
    case "reqChanges": return { ...s, requesting: true, draftNote: a.note };
    case "cancelReq": return { ...s, requesting: false, draftNote: "" };
    case "draft": return { ...s, draftNote: a.v };
    case "sendNote": return { ...s, requesting: false, notes: { ...s.notes, [a.id]: s.draftNote.trim() } };
    case "restart": return { ...init };
    case "autofill": {
      const answers = { ...s.answers };
      QUESTIONS.filter(q => q.s === a.s).forEach(q => { if (DEMO[q.id] !== undefined) answers[q.id] = DEMO[q.id]; });
      return { ...s, answers, error: "" };
    }
    case "demoAll": {
      const confirmed: Record<number, boolean> = {};
      SECTIONS.forEach((_, i) => (confirmed[i] = true));
      const signed: Record<string, boolean> = {};
      DELIVS.forEach(d => { if (!d.terminal) signed[d.id] = true; });
      const genDone: Record<string, boolean> = {};
      DELIVS.forEach(d => (genDone[d.id] = true));
      return { ...s, answers: { ...DEMO }, confirmed, signed, genDone, genActive: false, idx: a.finalIdx, requesting: false, error: "" };
    }
    case "gen": return { ...s, genActive: a.active, genLabel: a.label ?? s.genLabel };
    case "genDone": return { ...s, genActive: false, genDone: { ...s.genDone, [a.id]: true } };
  }
}

function hasValue(q: AQuestion, answers: Ans): boolean {
  const v = answers[q.id];
  if (q.kind === "checklist") return Array.isArray(v) && v.length > 0;
  if (q.kind === "choice") return !!v;
  return typeof v === "string" && v.trim().length > 0;
}

function fmt(q: AQuestion, s: AState): string {
  const v = s.answers[q.id];
  if (s.unsure[q.id] && !hasValue(q, s.answers)) return "Not sure yet";
  if (q.kind === "checklist") return Array.isArray(v) && v.length ? (v as string[]).join(", ") : "";
  if (q.kind === "choice") return (v as string) || "";
  return typeof v === "string" && v.trim() ? v : "";
}

function firstQuestionIdx(flow: FlowStep[], si: number): number {
  const i = flow.findIndex(f => f.kind === "question" && f.sIdx === si);
  return i === -1 ? 0 : i;
}

export function AuditFlow({ clientName, mobile, onExit, onComplete, showPipelinePanel = true }: { clientName: string; mobile: boolean; onExit: () => void; onComplete: () => void; showPipelinePanel?: boolean }) {
  const flow = useMemo(() => buildFlow(), []);
  const [s, dispatch] = useReducer(reducer, init);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cur = flow[s.idx];
  const curDelivId = cur.kind === "deliv" ? cur.dId : null;

  useEffect(() => {
    if (!curDelivId || s.genDone[curDelivId]) return;
    const d = DELIVS.find(x => x.id === curDelivId);
    if (!d) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    dispatch({ t: "gen", active: true, label: "Pulling together the discovery inputs…" });
    timers.current.push(setTimeout(() => dispatch({ t: "gen", active: true, label: "Drafting your " + d.title.toLowerCase() + "…" }), 650));
    timers.current.push(setTimeout(() => dispatch({ t: "gen", active: true, label: "Refining the recommendation…" }), 1350));
    timers.current.push(setTimeout(() => dispatch({ t: "genDone", id: curDelivId }), 2050));
    return () => { timers.current.forEach(clearTimeout); };
  }, [curDelivId, s.genDone]);

  const allIntakeDone = SECTIONS.every((_, i) => s.confirmed[i]);
  const delivReachable = (id: string): boolean => {
    if (!allIntakeDone) return false;
    const k = DELIVS.findIndex(d => d.id === id);
    for (let j = 0; j < k; j++) if (!s.signed[DELIVS[j].id]) return false;
    return true;
  };
  const sectionReachable = (si: number): boolean => si === 0 || SECTIONS.slice(0, si).every((_, i) => s.confirmed[i]);

  const get = (id: string, fb = ""): string => {
    const q = QUESTIONS.find(x => x.id === id);
    if (!q) return fb;
    const v = fmt(q, s);
    return v && v !== "Not sure yet" ? v : fb;
  };

  const next = () => {
    if (cur.kind !== "question") { dispatch({ t: "go", i: s.idx + 1 }); return; }
    const q = cur.q;
    if (q.required && !hasValue(q, s.answers) && !s.unsure[q.id]) {
      dispatch({ t: "err", m: "This one's required — or tick “I'm not sure” to skip it." });
      return;
    }
    dispatch({ t: "go", i: s.idx + 1 });
  };

  const maxW = cur.kind === "gate" ? "520px" : cur.kind === "deliv" ? "700px" : "640px";
  const panelSections = [
    {
      label: "Discovery",
      items: SECTIONS.map((sec, si) => {
        const done = s.confirmed[si];
        const active = (cur.kind === "question" || cur.kind === "gate") && (cur as { sIdx: number }).sIdx === si;
        const reach = sectionReachable(si);
        return {
          key: sec,
          title: sec,
          done,
          active,
          reachable: reach,
          onClick: () => reach && dispatch({ t: "go", i: firstQuestionIdx(flow, si) }),
        };
      }),
    },
    {
      label: "Plan",
      items: DELIVS.map(d => {
        const done = s.signed[d.id];
        const active = cur.kind === "deliv" && cur.dId === d.id;
        const reach = delivReachable(d.id);
        return {
          key: d.id,
          title: d.title,
          done,
          active,
          reachable: reach,
          final: d.terminal,
          onClick: () => reach && dispatch({ t: "go", i: flow.findIndex(f => f.kind === "deliv" && f.dId === d.id) }),
        };
      }),
    },
  ];

  const footer = (() => {
    const total = SECTIONS.length + DELIVS.filter(d => !d.terminal).length;
    const doneN = Object.values(s.confirmed).filter(Boolean).length + DELIVS.filter(d => !d.terminal && s.signed[d.id]).length;
    const pct = Math.round((doneN / total) * 100);
    return (
      <>
        <div style={css("font-size:var(--text-xs);font-weight:500;color:var(--success);margin-bottom:0.5rem")}>{doneN} of {total} signed off</div>
        <div style={css("height:4px;background:var(--bg);border-radius:999px;overflow:hidden")}><div style={css("height:100%;width:" + pct + "%;background:linear-gradient(90deg,oklch(0.66 0.12 155),oklch(0.54 0.11 165));transition:width .3s ease")} /></div>
        <div style={css("display:grid;grid-template-columns:0.72fr 1fr;gap:0.45rem;margin-top:0.8rem")}>
          <button type="button" onClick={() => dispatch({ t: "restart" })} style={css("min-height:2.05rem;display:inline-flex;align-items:center;justify-content:center;padding:0 0.6rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}>Restart</button>
          <button type="button" onClick={() => { const st = flow[s.idx]; if (st.kind === "question" || st.kind === "gate") dispatch({ t: "autofill", s: (st as { sIdx: number }).sIdx }); }} style={css("min-height:2.05rem;display:inline-flex;align-items:center;justify-content:center;gap:0.3rem;padding:0 0.5rem;border:1px dashed var(--border);border-radius:var(--radius);background:transparent;color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500;cursor:pointer")}><Icon name="replay" size={12} />Auto-fill step</button>
        </div>
      </>
    );
  })();

  return (
    <GuidedIntakeShell
      mobile={mobile}
      panel={
        <GuidedPipelinePanel
          mobile={mobile}
          title="Audit pipeline"
          onBack={onExit}
          sections={panelSections}
          footer={footer}
          accentColor="var(--cocoon)"
          activeBackground="color-mix(in srgb,var(--cocoon) 12%,white 88%)"
          finalBackground="color-mix(in srgb,var(--cocoon) 14%,white 86%)"
          finalColor="var(--cocoon)"
        />
      }
      showPanel={!mobile && showPipelinePanel}
      bandDotBackground={GRAD}
      bandPrimary={clientName}
      bandSecondary="Discovery Audit"
      contentMaxWidth={maxW}
      fullBleedBand
      footer={<ActionBar cur={cur} s={s} dispatch={dispatch} onComplete={onComplete} />}
    >
      {cur.kind === "welcome" && <Welcome clientName={clientName} onStart={() => dispatch({ t: "go", i: 1 })} onDemo={() => dispatch({ t: "demoAll", finalIdx: flow.findIndex(f => f.kind === "deliv" && f.dId === "finalplan") })} />}
      {cur.kind === "question" && <QuestionCard step={cur} s={s} dispatch={dispatch} />}
      {cur.kind === "gate" && <GateCard sIdx={cur.sIdx} s={s} fmtQ={q => fmt(q, s)} clientName={clientName} />}
      {cur.kind === "deliv" && <DelivCard dId={cur.dId} s={s} dispatch={dispatch} get={get} clientName={clientName} />}

      {cur.kind === "question" && (
        <>
          <div style={css("margin-top:1.1rem;display:flex;align-items:center;gap:0.65rem")}>
            <button type="button" onClick={() => dispatch({ t: "go", i: s.idx - 1 })} style={css("min-height:2.5rem;padding:0 1.2rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);font-size:var(--text-md);font-weight:500;color:var(--fg-muted);font-family:inherit;cursor:pointer")}>Previous</button>
            <button type="button" onClick={next} style={css("display:inline-flex;align-items:center;gap:0.4rem;min-height:2.5rem;padding:0 1.5rem;border:none;border-radius:var(--radius);background:" + GRAD + ";color:#fff;font-size:var(--text-md);font-weight:500;font-family:inherit;cursor:pointer")}>{cur.lastInSection ? "Review section" : "Continue"} →</button>
          </div>
          <GuidedUnsureToggle checked={!!s.unsure[cur.q.id]} onClick={() => dispatch({ t: "unsure", id: cur.q.id })} accentColor="var(--cocoon)" />
        </>
      )}
    </GuidedIntakeShell>
  );
}

function Welcome({ clientName, onStart, onDemo }: { clientName: string; onStart: () => void; onDemo: () => void }) {
  const chips = ["Discovery brief", "Audience read", "Journey gaps", "Priority findings", "Next-move plan", "Audit handoff"];
  return (
    <div style={{ animation: "cocoonFade .28s ease" }}>
      <span style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;display:block;color:var(--cocoon);margin-bottom:0.5rem")}>Discovery Audit · Guided intake</span>
      <h1 style={css("font-size:var(--text-4xl);font-weight:500;line-height:1.18;margin:0 0 0.7rem")}>Let&apos;s map {clientName} before we diagnose it.</h1>
      <p style={css("color:var(--fg-muted);font-size:var(--text-lg);line-height:1.6;max-width:40rem;margin:0 0 1.2rem")}>We&apos;ll use the same full signoff flow as the funnel builder, but the questions are tuned for discovery: business context, audience, conversion friction, site gaps, and what should happen next.</p>
      <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem;margin:0 0 1.5rem")}>
        {chips.map(c => <span key={c} style={css("padding:0.32rem 0.72rem;border-radius:999px;background:var(--surface);border:1px solid var(--border-soft);font-size:var(--text-sm);color:var(--fg-muted)")}>{c}</span>)}
      </div>
      <div style={css("display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap")}>
        <button type="button" onClick={onStart} style={css("display:inline-flex;align-items:center;gap:0.45rem;min-height:2.7rem;padding:0 1.5rem;border:0;border-radius:999px;background:" + GRAD + ";color:#fff;font-size:var(--text-lg);font-weight:500;cursor:pointer")}>Start discovery →</button>
        <button type="button" onClick={onDemo} style={css("display:inline-flex;align-items:center;gap:0.4rem;min-height:2.7rem;padding:0 1.1rem;border:1px dashed var(--border);border-radius:999px;background:transparent;color:var(--fg-muted);font-size:var(--text-md);font-weight:500;cursor:pointer")}><Icon name="eye" size={14} />Preview the finished audit plan</button>
      </div>
    </div>
  );
}

function QuestionCard({ step, s, dispatch }: { step: Extract<FlowStep, { kind: "question" }>; s: AState; dispatch: (a: Act) => void }) {
  const q = step.q;
  const val = s.answers[q.id];
  const meta = SECTIONS[step.sIdx] + " · " + step.withinIdx + " of " + step.sectionCount + " · " + TYPE_LABEL[q.kind];
  return (
    <div style={{ animation: "cocoonFade .28s ease" }}>
      <div style={css("background:var(--surface);border:1px solid var(--border-soft);border-radius:0.875rem;overflow:hidden")}>
        <div style={css("padding:1.4rem 1.6rem 1rem;border-bottom:1px solid var(--border-soft)")}>
          <div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-bottom:0.55rem;display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap")}>
            <span>{meta}</span>{q.required ? <><span>·</span><span style={css("color:var(--cocoon);font-weight:500")}>Required</span></> : <><span>·</span><span style={css("color:var(--fg-faint)")}>Optional</span></>}
          </div>
          <h3 style={css("font-size:var(--text-2xl);font-weight:500;line-height:1.3;margin:0")}>{q.prompt}</h3>
        </div>
        <div style={css("padding:1.2rem 1.6rem")}>
          {q.kind === "choice" && (
            <div style={css("display:grid;grid-template-columns:repeat(2,1fr);gap:0.45rem")}>
              {q.options!.map(opt => (
                <GuidedOptionPill
                  key={opt}
                  label={opt}
                  selected={val === opt}
                  onClick={() => dispatch({ t: "choice", id: q.id, v: opt })}
                  accentColor="var(--cocoon)"
                  accentBackground="color-mix(in srgb,var(--cocoon) 12%,white 88%)"
                />
              ))}
            </div>
          )}
          {q.kind === "checklist" && (
            <div style={css("display:grid;grid-template-columns:repeat(2,1fr);gap:0.45rem")}>
              {q.options!.map(opt => (
                <GuidedOptionPill
                  key={opt}
                  label={opt}
                  selected={Array.isArray(val) && val.includes(opt)}
                  onClick={() => dispatch({ t: "check", id: q.id, v: opt })}
                  accentColor="var(--cocoon)"
                  accentBackground="color-mix(in srgb,var(--cocoon) 12%,white 88%)"
                />
              ))}
            </div>
          )}
          {q.kind === "textarea" && (
            <textarea value={(val as string) || ""} onChange={e => dispatch({ t: "text", id: q.id, v: e.target.value })} placeholder={q.placeholder} style={css("width:100%;min-height:8rem;padding:0.85rem 1rem;border:1px solid var(--border);border-radius:var(--radius);font-size:var(--text-lg);font-family:inherit;color:var(--fg);background:var(--bg);outline:none;line-height:1.55;resize:vertical")} />
          )}
          {q.kind === "text" && (
            <input value={(val as string) || ""} onChange={e => dispatch({ t: "text", id: q.id, v: e.target.value })} onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }} placeholder={q.placeholder} style={css("width:100%;padding:0.85rem 1rem;border:1px solid var(--border);border-radius:var(--radius);font-size:var(--text-lg);font-family:inherit;color:var(--fg);background:var(--bg);outline:none")} />
          )}
          {q.help && <div style={css("margin-top:0.6rem;font-size:var(--text-sm);color:var(--fg-faint)")}>{q.help}</div>}
          {s.error && <div style={css("margin-top:0.65rem;font-size:var(--text-sm);color:oklch(0.55 0.2 20);font-weight:500")}>{s.error}</div>}
        </div>
      </div>
    </div>
  );
}

function GateCard({ sIdx, s, fmtQ, clientName }: { sIdx: number; s: AState; fmtQ: (q: AQuestion) => string; clientName: string }) {
  const signed = s.confirmed[sIdx];
  const items = QUESTIONS.filter(q => q.s === sIdx).map(q => ({ label: q.prompt, value: fmtQ(q) || "—" }));
  return (
    <div style={{ animation: "cocoonFade .28s ease" }}>
      <div style={css("background:var(--surface);border-radius:16px;border:1px solid var(--border-soft);overflow:hidden")}>
        <div style={css("padding:1.6rem 1.8rem 0.3rem")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-bottom:1rem;flex-wrap:wrap")}>
            <span style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--cocoon)")}>Sign-off · {SECTIONS[sIdx]}</span>
            <span style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:var(--text-2xs);font-weight:500;padding:0.2rem 0.55rem;border-radius:999px;" + (signed ? "background:var(--success-soft);color:var(--success)" : "background:var(--warn-soft);color:var(--warn)"))}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:" + (signed ? "var(--success)" : "oklch(0.7 0.12 68)"))} />{signed ? "Signed off" : "Needs sign-off"}</span>
          </div>
          <h3 style={css("font-size:var(--text-3xl);font-weight:500;line-height:1.16;margin:0 0 0.42rem")}>Here&apos;s the discovery readback</h3>
          <p style={css("color:var(--fg-muted);font-size:var(--text-base);margin:0;line-height:1.55")}>Lock in this part of the brief before we turn it into findings and recommendations.</p>
        </div>
        <div style={css("padding:0.75rem 1.8rem 1rem")}>
          {items.map((it, i) => (
            <div key={i} style={css("display:flex;gap:0.7rem;padding:0.6rem 0;" + (i ? "border-top:1px solid var(--border-soft)" : ""))}>
              <span style={css("font-size:var(--text-xs);font-weight:600;color:var(--cocoon);flex-shrink:0;width:1.4rem;padding-top:0.15rem")}>{String(i + 1).padStart(2, "0")}</span>
              <div style={css("min-width:0;flex:1")}>
                <div style={css("font-size:var(--text-sm);color:var(--fg-muted);margin-bottom:0.22rem;line-height:1.4")}>{it.label}</div>
                <div style={css("font-size:var(--text-base);color:var(--fg);line-height:1.4")}>{it.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={css("background:var(--surface-alt);border-top:1px solid var(--border-soft);padding:1.15rem 1.8rem 1.3rem")}>
          <div style={css("display:flex;align-items:center;gap:0.65rem")}>
            <span style={css("width:1.7rem;height:1.7rem;border-radius:0.5rem;background:color-mix(in srgb,var(--cocoon) 14%,white 86%);color:var(--cocoon);display:grid;place-items:center;flex-shrink:0")}><Icon name="lock" size={13} /></span>
            <span style={css("font-size:var(--text-sm);color:var(--fg-muted);line-height:1.45")}>Signing as <span style={css("color:var(--fg);font-weight:500")}>{clientName}</span> locks this discovery context so the recommendations stay aligned.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DelivCard({ dId, s, dispatch, get, clientName }: { dId: string; s: AState; dispatch: (a: Act) => void; get: (id: string, fb?: string) => string; clientName: string }) {
  const d = DELIVS.find(x => x.id === dId)!;
  const num = DELIVS.findIndex(x => x.id === dId) + 1;
  const signed = s.signed[dId];
  const generating = s.genActive && !s.genDone[dId];
  return (
    <div style={{ animation: "cocoonFade .3s ease" }}>
      <div style={css("background:var(--surface);border:1px solid var(--border-soft);border-radius:20px;padding:1.7rem 1.9rem 1.6rem")}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);margin-bottom:0.6rem;flex-wrap:wrap")}>
          <div style={css("display:flex;gap:0.85rem;align-items:center;min-width:0")}>
            <div style={css("width:2.5rem;height:2.5rem;border-radius:0.8rem;background:" + (signed ? "var(--success-soft)" : "color-mix(in srgb,var(--cocoon) 14%,white 86%)") + ";color:" + (signed ? "var(--success)" : "var(--cocoon)") + ";display:grid;place-items:center;font-size:var(--text-xl);font-weight:600;flex-shrink:0")}>{signed ? "✓" : num}</div>
            <div style={css("min-width:0")}>
              <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--cocoon);margin-bottom:0.25rem")}>Generated from {d.from}</div>
              <h3 style={css("font-size:var(--text-3xl);font-weight:500;line-height:1.2;margin:0")}>{d.title}</h3>
            </div>
          </div>
          <span style={css("flex-shrink:0;display:inline-flex;align-items:center;gap:0.4rem;font-size:var(--text-xs);font-weight:500;color:" + (signed ? "var(--success)" : "var(--fg-muted)") + ";margin-top:0.3rem")}><span style={css("width:0.5rem;height:0.5rem;border-radius:50%;" + (signed ? "background:var(--success)" : "border:1.5px solid var(--fg-muted)"))} />{signed ? "Signed off" : "Awaiting sign-off"}</span>
        </div>
        <p style={css("color:var(--fg-muted);font-size:var(--text-base);margin:0.9rem 0 1.4rem;padding-bottom:1.3rem;border-bottom:1px solid var(--border-soft);line-height:1.55")}>{d.intro}</p>

        {generating ? (
          <div style={{ animation: "cocoonFade .3s ease" }}>
            <div style={css("display:flex;align-items:center;gap:0.55rem;margin-bottom:1.1rem")}><span className="pt-skel-dot" style={{ background: "var(--cocoon)" }} /><span style={css("font-size:var(--text-md);color:var(--fg);font-weight:500")}>{s.genLabel}</span></div>
            <div style={css("display:flex;flex-direction:column;gap:0.7rem")}>
              <div className="pt-skel-bar" style={css("height:1.3rem;width:58%;border-radius:6px")} />
              <div className="pt-skel-bar" style={{ ...css("height:4.6rem;border-radius:10px"), animationDelay: ".15s" }} />
              <div className="pt-skel-bar" style={{ ...css("height:2.6rem;width:84%;border-radius:10px"), animationDelay: ".3s" }} />
            </div>
          </div>
        ) : (
          <>
            <DelivBody dId={dId} get={get} clientName={clientName} />
            {s.notes[dId] && <div style={css("margin-top:1rem;padding:0.8rem 1rem;border-radius:10px;background:var(--warn-soft);font-size:var(--text-xs);color:var(--fg);line-height:1.5")}><span style={css("font-weight:500")}>Change requested:</span> {s.notes[dId]}</div>}
          </>
        )}
      </div>
    </div>
  );
}

function DelivBody({ dId, get, clientName }: { dId: string; get: (id: string, fb?: string) => string; clientName: string }) {
  const surfaceList = (get("auditSurface", "Homepage, Services / offers, Messaging / copy") || "").split(",").map(item => item.trim()).filter(Boolean);
  const priorityList = (get("priorityThemes", "Positioning clarity, Conversion path, Trust & proof") || "").split(",").map(item => item.trim()).filter(Boolean);
  const voiceList = (get("voiceDirection", "Warm, Premium, Grounded") || "").split(",").map(item => item.trim()).filter(Boolean);
  const trafficList = (get("trafficSources", "Instagram, Referrals") || "").split(",").map(item => item.trim()).filter(Boolean);
  const bulletCard = (label: string, value: string) => (
    <div style={css("padding:0.8rem 0.9rem;border:1px solid var(--border-soft);border-radius:0.9rem;background:var(--surface-alt)")}>
      <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.28rem")}>{label}</div>
      <div style={css("font-size:var(--text-base);color:var(--fg);line-height:1.5")}>{value}</div>
    </div>
  );

  if (dId === "brief") {
    return (
      <div style={css("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.8rem")}>
        {bulletCard("Business", clientName + " sells " + get("businessModel", "a premium service offer") + ".")}
        {bulletCard("Current Positioning", get("positioning", "A grounded service brand that needs sharper clarity."))}
        {bulletCard("Core Audience", get("audience", "Busy, motivated clients who need a clearer reason to trust the offer."))}
        {bulletCard("Discovery Trigger", get("brandShift", "The brand and website no longer match the level of the offer."))}
      </div>
    );
  }

  if (dId === "offer") {
    return (
      <div style={css("display:flex;flex-direction:column;gap:var(--space-3)")}>
        {bulletCard("Best-fit Client", get("bestFit", "Someone ready to invest and looking for a more premium, trustworthy experience."))}
        {bulletCard("Audience Friction", get("audiencePain", "They are interested, but not yet convinced this is the right answer for them."))}
        {bulletCard("Offer Focus", get("offerFocus", "Signature program") + " should lead the story and give the site a single job.")}
      </div>
    );
  }

  if (dId === "journey") {
    return (
      <div style={css("display:flex;flex-direction:column;gap:var(--space-3)")}>
        {bulletCard("Primary Goal", get("primaryGoal", "More booked calls"))}
        {bulletCard("Main CTA", get("primaryAction", "Book a call"))}
        {bulletCard("Traffic Context", trafficList.join(", "))}
        {bulletCard("Likely Drop-off", get("conversionBlockers", "Visitors are interested, but the message and CTA are not carrying them forward with enough confidence."))}
      </div>
    );
  }

  if (dId === "findings") {
    return (
      <div style={css("display:flex;flex-direction:column;gap:var(--space-3)")}>
        {bulletCard("Priority Surfaces", surfaceList.join(", "))}
        {bulletCard("Messaging Gap", get("messageGap", "The value proposition is not landing fast enough and the experience feels inconsistent."))}
        {bulletCard("Existing Proof", get("proofSignals", "Testimonials and credibility signals exist, but are not carrying enough weight in the flow."))}
      </div>
    );
  }

  if (dId === "plan") {
    return (
      <div style={css("display:flex;flex-direction:column;gap:var(--space-3)")}>
        {bulletCard("Priorities First", priorityList.join(", "))}
        {bulletCard("Creative Direction", voiceList.join(", "))}
        {bulletCard("Working Boundaries", get("nonNegotiables", "Keep the strongest existing brand equity and avoid unnecessary platform changes."))}
        {bulletCard("Recommended Pace", get("timeline", "2-4 weeks"))}
      </div>
    );
  }

  return (
    <div style={css("display:flex;flex-direction:column;gap:0.9rem")}>
      <div style={css("padding:1rem 1.1rem;border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface-alt)")}>
        <div style={css("font-size:var(--text-xs);font-weight:500;color:var(--cocoon);margin-bottom:0.45rem")}>Final discovery handoff</div>
        <div style={css("font-size:var(--text-md);line-height:1.55;color:var(--fg)")}>The audit is now framed around a full discovery flow: clear business context, the right audience and offer focus, the most important conversion friction, the surfaces that matter most, and the first priorities to solve.</div>
      </div>
      <div style={css("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-3)")}>
        {bulletCard("North Star", get("primaryGoal", "More booked calls"))}
        {bulletCard("Main Site Job", get("primaryAction", "Book a call"))}
        {bulletCard("Priority Themes", priorityList.join(", "))}
        {bulletCard("Next Step", "Open the audit report and turn these approved discovery inputs into the final scored view.")}
      </div>
    </div>
  );
}

function ActionBar({ cur, s, dispatch, onComplete }: { cur: FlowStep; s: AState; dispatch: (a: Act) => void; onComplete: () => void }) {
  const wrap = "flex-shrink:0;border-top:1px solid var(--border-soft);background:var(--surface);padding:0.8rem 1.3rem;display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);min-height:4rem";
  const ghost = "min-height:2.4rem;padding:0 1.1rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);font-size:var(--text-base);font-weight:500;color:var(--fg-muted);font-family:inherit;cursor:pointer";
  const primary = "display:inline-flex;align-items:center;gap:0.4rem;min-height:2.4rem;padding:0 1.4rem;border:none;border-radius:var(--radius);background:" + GRAD + ";color:#fff;font-size:var(--text-md);font-weight:500;cursor:pointer";

  if (cur.kind === "welcome" || cur.kind === "question") return null;

  if (cur.kind === "gate") {
    const signed = s.confirmed[cur.sIdx];
    return (
      <div style={css(wrap)}>
        <span style={css("font-size:var(--text-sm);color:var(--fg-muted);font-weight:500;min-width:0")}>{signed ? "Locked in — moving on." : "Review what we heard, then sign off."}</span>
        <div style={css("display:flex;gap:0.6rem;flex-shrink:0")}>
          <button type="button" onClick={() => dispatch({ t: "go", i: s.idx - 1 })} style={css(ghost)}>Edit answers</button>
          <button type="button" onClick={() => dispatch({ t: "confirmGate", s: cur.sIdx })} style={css(primary)}>{signed ? "Continue" : "Sign off & continue"}</button>
        </div>
      </div>
    );
  }

  const d = DELIVS.find(x => x.id === cur.dId)!;
  if (s.genActive && !s.genDone[cur.dId]) return <div style={css(wrap)}><span style={css("font-size:var(--text-sm);color:var(--fg-muted)")}>Generating…</span></div>;
  if (d.terminal) {
    return (
      <div style={css(wrap)}>
        <span style={css("font-size:var(--text-base);color:var(--success);font-weight:500")}>✓ Everything approved — the audit report is ready to open</span>
        <div style={css("display:flex;gap:0.6rem;flex-shrink:0")}>
          <button type="button" onClick={() => dispatch({ t: "restart" })} style={css(ghost)}>Start over</button>
          <button type="button" onClick={onComplete} style={css(primary)}><Icon name="arrow" size={14} />Open audit report</button>
        </div>
      </div>
    );
  }
  if (s.requesting) {
    return (
      <div style={css(wrap)}>
        <input value={s.draftNote} onChange={e => dispatch({ t: "draft", v: e.target.value })} placeholder="What would you like changed?" style={css("flex:1;padding:0.55rem 0.8rem;border:1px solid var(--border);border-radius:var(--radius);font-size:var(--text-base);font-family:inherit;color:var(--fg);background:var(--bg);outline:none")} />
        <div style={css("display:flex;gap:var(--space-2);flex-shrink:0")}>
          <button type="button" onClick={() => dispatch({ t: "cancelReq" })} style={css(ghost)}>Cancel</button>
          <button type="button" onClick={() => dispatch({ t: "sendNote", id: cur.dId })} style={css("min-height:2.4rem;padding:0 1.1rem;background:color-mix(in srgb,var(--cocoon) 12%,white 88%);border:1px solid var(--cocoon);border-radius:var(--radius);font-size:var(--text-base);font-weight:500;color:var(--cocoon);font-family:inherit;cursor:pointer")}>Send</button>
        </div>
      </div>
    );
  }
  const signed = s.signed[cur.dId];
  return (
    <div style={css(wrap)}>
      <span style={css("font-size:var(--text-sm);color:" + (signed ? "var(--success)" : "var(--fg-muted)") + ";font-weight:500;min-width:0")}>{signed ? "✓ Signed off" : "Review, then sign off to unlock the next piece."}</span>
      <div style={css("display:flex;gap:0.6rem;flex-shrink:0")}>
        <button type="button" onClick={() => dispatch({ t: "reqChanges", note: s.notes[cur.dId] || "" })} style={css(ghost)}>Request changes</button>
        <button type="button" onClick={() => dispatch({ t: "sign", id: cur.dId })} style={css(primary)}>{signed ? "Continue" : "Sign off & continue"}</button>
      </div>
    </div>
  );
}
