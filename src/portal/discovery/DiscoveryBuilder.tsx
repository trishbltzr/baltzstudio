"use client";

import { useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";

// ── data shapes ───────────────────────────────────────────────────────────────
export type DQKind = "text" | "textarea" | "single" | "multi";
export interface DiscoveryQuestion { key: string; label: string; hint?: string; kind: DQKind; ph?: string; opts?: string[] }
export interface DiscoveryTopic { id: string; num: string; title: string; icon: string; qs: DiscoveryQuestion[] }
export interface DiscoveryStage { key: string; label: string; icon: string }
export interface DiscoveryIntroStep { title: string; tag?: string; icon?: string }

export type Ans = Record<string, string | string[]>;

// ── pipeline contract (engine-specific stages plug in here) ────────────────────
export interface StageRenderCtx {
  stageKey: string;
  docs: any;
  reveal: number; // Number.POSITIVE_INFINITY when fully revealed
  building: boolean;
  approved: boolean;
  mobile: boolean;
  accent: string;
  onAdvance: () => void; // approve current stage & continue (inline affordances)
  onDownload: () => void;
  onShare: () => void;
  onCopy: () => void;
}
export interface ProposalRenderCtx {
  docs: any;
  mobile: boolean;
  accent: string;
  sent: boolean;
  onBack: () => void;
  onExit: () => void;
  onRequest: () => void;
  onShare: () => void;
}
export interface Pipeline {
  railTitle: string;
  buildDocs: (data: Ans) => any;
  gen: (stageKey: string) => { total: number; ms: number; buildLabel: string };
  genPrompt: (stageKey: string) => string;
  genCta: (stageKey: string) => string;
  approveLabel: (stageKey: string, isLast: boolean) => string;
  beginLabel: string; // discovery-complete CTA (e.g. "Map the funnel flow →")
  beginMsg?: (data: Ans) => string; // personalised discovery-complete message
  introPreview?: (mobile: boolean) => ReactNode;
  renderStage: (ctx: StageRenderCtx) => ReactNode;
  renderProposal: (ctx: ProposalRenderCtx) => ReactNode;
}

// ── state ─────────────────────────────────────────────────────────────────────
interface DState {
  entered: boolean;
  introReveal: number;
  data: Ans;
  qIdx: number;
  draft: string;
  typing: boolean;
  // pipeline
  stage: number;
  approved: Record<string, boolean>;
  generated: Record<string, boolean>;
  proposal: boolean;
}
const init: DState = {
  entered: false, introReveal: 0, data: {}, qIdx: 0, draft: "", typing: false,
  stage: 0, approved: {}, generated: {}, proposal: false,
};

type Act =
  | { t: "enter" } | { t: "introReveal"; n: number } | { t: "typing"; v: boolean }
  | { t: "draft"; v: string } | { t: "single"; k: string; v: string } | { t: "toggle"; k: string; v: string }
  | { t: "sendText"; k: string } | { t: "sendMulti" } | { t: "skip" } | { t: "back" }
  | { t: "restart" } | { t: "fill"; data: Ans; qIdx: number }
  | { t: "beginBuild" } | { t: "gotoStage"; i: number } | { t: "setStage"; i: number }
  | { t: "genNow"; k: string }
  | { t: "reqChanges"; k: string } | { t: "approve"; k: string } | { t: "proposal"; v: boolean };

function reducer(s: DState, a: Act): DState {
  switch (a.t) {
    case "enter": return { ...s, entered: true, introReveal: 0, typing: true };
    case "introReveal": return { ...s, introReveal: a.n };
    case "typing": return { ...s, typing: a.v };
    case "draft": return { ...s, draft: a.v };
    case "single": return { ...s, data: { ...s.data, [a.k]: a.v }, qIdx: s.qIdx + 1, draft: "" };
    case "toggle": {
      const cur = Array.isArray(s.data[a.k]) ? (s.data[a.k] as string[]) : [];
      const nx = cur.includes(a.v) ? cur.filter(x => x !== a.v) : cur.concat(a.v);
      return { ...s, data: { ...s.data, [a.k]: nx } };
    }
    case "sendText": { const v = s.draft.trim(); if (!v) return s; return { ...s, data: { ...s.data, [a.k]: v }, qIdx: s.qIdx + 1, draft: "" }; }
    case "sendMulti": return { ...s, qIdx: s.qIdx + 1, draft: "" };
    case "skip": return { ...s, qIdx: s.qIdx + 1, draft: "" };
    case "back": return { ...s, qIdx: Math.max(0, s.qIdx - 1), draft: "", typing: false };
    case "restart": return { ...init, entered: true, introReveal: 2 };
    case "fill": return { ...s, entered: true, introReveal: 2, data: a.data, qIdx: a.qIdx, draft: "", typing: false };
    case "beginBuild": return { ...s, approved: { ...s.approved, discovery: true }, stage: 1, proposal: false };
    case "gotoStage": return { ...s, stage: a.i, proposal: false };
    case "setStage": return { ...s, stage: a.i, proposal: false };
    case "genNow": return { ...s, generated: { ...s.generated, [a.k]: true } };
    case "reqChanges": return { ...s, generated: { ...s.generated, [a.k]: false } };
    case "approve": return { ...s, approved: { ...s.approved, [a.k]: true } };
    case "proposal": return { ...s, proposal: a.v };
  }
}

// ── component ─────────────────────────────────────────────────────────────────
export function DiscoveryBuilder({
  accent, title, clientName, intro, wizard, stages, introSteps, startLabel = "Start discovery →",
  backLabel = "← All funnels", previewLabel = "or preview a finished plan",
  completeTitle = "Discovery complete", completeMsg, completeCta = "See the result →", progressLabel = "discovery",
  completeExtra, stageExtra, demo, demoAction = "complete", onExit, onComplete, mobile, pipeline, showToast,
}: {
  accent: string;
  title: string;
  clientName: string;
  intro: { eyebrow: string; heading: string };
  wizard: DiscoveryTopic[];
  stages: DiscoveryStage[];
  introSteps: DiscoveryIntroStep[];
  startLabel?: string;
  backLabel?: string;
  previewLabel?: string;
  completeTitle?: string;
  completeMsg: string;
  completeCta?: string;
  completeExtra?: ReactNode;
  stageExtra?: (stageKey: string) => ReactNode;
  progressLabel?: string;
  demo?: Ans;
  demoAction?: "complete" | "result";
  onExit: () => void;
  onComplete: (data: Ans) => void;
  mobile: boolean;
  pipeline?: Pipeline;
  showToast?: (m: string) => void;
}) {
  const [s, dispatch] = useReducer(reducer, init);
  const flat = useMemo(() => wizard.flatMap(t => t.qs.map(q => ({ ...q, topic: t.title, topicId: t.id, icon: t.icon }))), [wizard]);
  const total = flat.length;
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const toast = (m: string) => showToast?.(m);

  // intro reveal sequence
  useEffect(() => {
    if (!s.entered || s.introReveal >= 2) return;
    clearTimers();
    timers.current.push(setTimeout(() => dispatch({ t: "introReveal", n: 1 }), 800));
    timers.current.push(setTimeout(() => dispatch({ t: "introReveal", n: 2 }), 1700));
    timers.current.push(setTimeout(() => dispatch({ t: "typing", v: false }), 2500));
    return clearTimers;
  }, [s.entered]);

  // brief "typing" beat when advancing to the next question
  useEffect(() => {
    if (!s.entered || s.qIdx === 0 || s.qIdx >= total) return;
    dispatch({ t: "typing", v: true });
    const id = setTimeout(() => dispatch({ t: "typing", v: false }), 560);
    return () => clearTimeout(id);
  }, [s.qIdx]);

  // keep chat scrolled to the newest message
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; });

  const complete = s.qIdx >= total;
  const cur = complete ? null : flat[s.qIdx];
  const pct = Math.round((Math.min(s.qIdx, total) / total) * 100);

  const answered = flat.slice(0, s.qIdx);
  const groups: { topic: string; icon: string; items: { label: string; answer: string; skipped: boolean }[] }[] = [];
  answered.forEach(q => {
    const v = s.data[q.key];
    const ans = Array.isArray(v) ? v.join(", ") : (v as string || "");
    let g = groups.find(x => x.topic === q.topic);
    if (!g) { g = { topic: q.topic, icon: q.icon, items: [] }; groups.push(g); }
    g.items.push({ label: q.label, answer: ans, skipped: !ans });
  });

  const runFill = () => {
    if (!demo) return;
    const data: Ans = {};
    flat.forEach(q => {
      if (demo[q.key] !== undefined) data[q.key] = demo[q.key];
      else if (q.kind === "single") data[q.key] = q.opts?.[0] || "Yes";
      else if (q.kind === "multi") data[q.key] = (q.opts || []).slice(0, 2);
      else data[q.key] = "Sample " + q.topic.toLowerCase();
    });
    if (demoAction === "result" || !pipeline) {
      onComplete(data);
      return;
    }
    dispatch({ t: "fill", data, qIdx: flat.length });
  };

  // ── pipeline orchestration ──
  const stageKeys = stages.map(st => st.key);
  const maxStage = (() => { let m = 0; for (let i = 0; i < stageKeys.length; i++) { if (s.approved[stageKeys[i]]) m = i + 1; else break; } return m; })();
  const curStage = stages[s.stage];
  const curKey = curStage ? curStage.key : "discovery";
  const isLast = s.stage === stages.length - 1;
  const genDone = !!s.generated[curKey];
  const stageApproved = !!s.approved[curKey];
  const currentStageExtra = stageExtra?.(curKey);
  const docs = useMemo(() => (pipeline ? pipeline.buildDocs(s.data) : null), [pipeline, s.data]);

  const beginBuild = () => { dispatch({ t: "beginBuild" }); toast("Discovery locked — starting the build"); };
  const gotoStage = (i: number) => { if (i <= maxStage) dispatch({ t: "gotoStage", i }); };
  const onGen = () => { if (!pipeline) return; dispatch({ t: "genNow", k: curKey }); };
  const approveStage = () => {
    dispatch({ t: "approve", k: curKey });
    if (isLast) dispatch({ t: "proposal", v: true });
    else dispatch({ t: "setStage", i: s.stage + 1 });
    toast(isLast ? "Approved — here’s the summary" : "Approved — next stage unlocked");
  };

  // ── styles ──
  const card = "border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden";
  const railWrap = "border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden" + (mobile ? "" : ";position:sticky;top:0.5rem");
  const bubble = "background:var(--surface);border:1px solid var(--border-soft);border-radius:14px;border-top-left-radius:4px;padding:0.8rem 0.95rem;font-size:0.9rem;line-height:1.55;color:var(--fg-muted)";
  const optBtn = (sel: boolean) => "border:1px solid " + (sel ? accent : "var(--border)") + ";border-radius:var(--radius-pill);background:" + (sel ? "color-mix(in srgb," + accent + " 12%,white 88%)" : "var(--surface)") + ";color:" + (sel ? accent : "var(--fg)") + ";padding:0.5rem 0.9rem;font-size:var(--text-base);font-weight:500;cursor:pointer;font-family:inherit";

  // ── rail ──
  const doneStages = stages.reduce((n, st, i) => n + (s.approved[i === 0 ? "discovery" : st.key] ? 1 : 0), 0);
  const rail = (
    <div style={css(railWrap)}>
      <div style={css("padding:0.9rem 1rem;border-bottom:1px solid var(--border-soft)")}>
        <div style={css("display:flex;align-items:center;gap:0.55rem")}>
          <span style={css("width:2rem;height:2rem;border-radius:0.65rem;background:" + accent + ";color:#fff;display:grid;place-items:center;flex-shrink:0")}><Icon name="layers" size={16} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={css("font-size:var(--text-md);font-weight:500;line-height:1.15")}>{pipeline?.railTitle || "Build pipeline"}</div>
            <div style={css("font-size:var(--text-sm);color:var(--fg-muted);margin-top:0.12rem")}>{stages.length}-stage guided workflow</div>
          </div>
        </div>
      </div>
      <div style={css("padding:0.35rem 0")}>
        {stages.map((st, i) => {
          const key = i === 0 ? "discovery" : st.key;
          const isDone = !!s.approved[key];
          const isCurrent = s.stage === i && !s.proposal;
          const locked = i > maxStage;
          const dot = isDone
            ? "background:var(--success);border:1.5px solid var(--success);color:#fff"
            : isCurrent ? "background:var(--success);border:1.5px solid var(--success);color:#fff"
              : locked ? "background:var(--surface);border:1.5px dashed var(--border);color:var(--fg-faint)"
                : "background:var(--surface);border:1.5px solid var(--border);color:var(--fg-muted)";
          return (
            <button key={st.key} type="button" onClick={() => !locked && gotoStage(i)} disabled={locked} style={css("width:calc(100% - 1rem);margin:0 0.5rem;display:flex;align-items:center;gap:0.65rem;min-height:2.8rem;padding:0.48rem 0.6rem;border:none;border-radius:0.85rem;text-align:left;font-family:inherit;cursor:" + (locked ? "default" : "pointer") + ";background:" + (isCurrent ? "color-mix(in srgb,var(--success) 9%,white 91%)" : "transparent") + ";opacity:" + (locked ? "0.58" : "1"))}>
              <span style={css("width:1.2rem;height:1.2rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;font-size:0.62rem;font-weight:500;" + dot)}>{isDone ? <Icon name="checkmark" size={9} /> : (i + 1)}</span>
              <span style={css("min-width:0;font-size:var(--text-base);font-weight:" + (isCurrent || isDone ? "500" : "400") + ";color:" + (isCurrent ? "var(--success)" : locked ? "var(--fg-muted)" : "var(--fg)") + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2")}>{st.label}</span>
            </button>
          );
        })}
      </div>
      <div style={css("padding:0.75rem 1rem 0.85rem;border-top:1px solid var(--border-soft)")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.65rem;margin-bottom:0.5rem")}>
          <span style={css("font-size:var(--text-xs);font-weight:500;color:" + (doneStages ? "var(--success)" : "var(--fg-muted)"))}>{doneStages} of {stages.length} complete</span>
          <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{Math.round((doneStages / stages.length) * 100)}%</span>
        </div>
        <div style={css("height:4px;border-radius:999px;background:var(--bg);overflow:hidden")}>
          <div style={css("height:100%;border-radius:999px;background:var(--success);width:" + Math.max((doneStages / stages.length) * 100, 2) + "%;transition:width .45s ease")} />
        </div>
      </div>
    </div>
  );

  // ── intro screen ──
  const introList = (
    <div style={css("margin-top:1.1rem;border:1px solid var(--border-soft);border-radius:var(--radius);overflow:hidden")}>
      {introSteps.map((step, i) => (
        <div key={step.title} style={css("display:flex;align-items:center;gap:0.7rem;padding:0.62rem 0.85rem;background:var(--surface)" + (i < introSteps.length - 1 ? ";border-bottom:1px solid var(--border-soft)" : ""))}>
          {step.icon
            ? <span style={css("width:1.85rem;height:1.85rem;border-radius:8px;background:color-mix(in srgb," + accent + " 14%,white 86%);color:" + accent + ";display:grid;place-items:center;flex-shrink:0")}><Icon name={step.icon} size={15} /></span>
            : <span style={css("width:1.45rem;height:1.45rem;border-radius:50%;border:1px solid var(--border);display:grid;place-items:center;font-size:0.68rem;color:var(--fg-muted);flex-shrink:0")}>{i + 1}</span>}
          <span style={css("flex:1;min-width:0;font-size:0.85rem;font-weight:500")}>{step.title}</span>
          {step.tag && <span style={css("font-size:0.68rem;color:var(--fg-faint);white-space:nowrap")}>{step.tag}</span>}
        </div>
      ))}
    </div>
  );
  const introLeft = (
    <div style={css("padding:" + (mobile ? "1.4rem 1.3rem 1.6rem" : "1.9rem 1.8rem 2rem") + ";display:flex;flex-direction:column")}>
      <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;display:flex;align-items:center;gap:var(--space-2);color:" + accent)}><span style={css("width:0.38rem;height:0.38rem;border-radius:50%;background:" + accent)} />{intro.eyebrow}</div>
      <h2 style={css("margin:0.75rem 0 0;font-size:1.55rem;font-weight:500;line-height:1.1;letter-spacing:-0.02em")}>{intro.heading}</h2>
      {introList}
      <button type="button" onClick={() => dispatch({ t: "enter" })} className="pt-op" style={css("margin-top:1.2rem;border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;padding:0.68rem 1.5rem;font-size:0.86rem;font-weight:500;cursor:pointer;font-family:inherit;width:100%")}>{startLabel}</button>
      {demo && <button type="button" onClick={runFill} style={css("margin-top:0.7rem;border:none;background:none;color:var(--fg-faint);font-size:0.76rem;cursor:pointer;font-family:inherit;display:block;margin-left:auto;margin-right:auto")}>{previewLabel}</button>}
    </div>
  );
  const introScreen = (
    <div style={css(card + ";animation:cocoonFade .2s ease both")}>
      {pipeline?.introPreview && !mobile
        ? <div style={css("display:grid;grid-template-columns:minmax(0,1fr) minmax(0,0.82fr);align-items:stretch")}>{introLeft}<div style={css("position:relative;background:var(--surface-alt);border-left:1px solid var(--border-soft);overflow:hidden;min-height:28rem")}>{pipeline.introPreview(mobile)}</div></div>
        : <>{introLeft}{pipeline?.introPreview && <div style={css("padding:0 1.3rem 1.4rem")}>{pipeline.introPreview(mobile)}</div>}</>}
    </div>
  );

  // ── chat ──
  const chat = (
    <div style={css(card)}>
      <div style={css("background:var(--surface);border-bottom:1px solid var(--border-soft);padding:0.85rem 1.1rem 0.95rem")}>
        <div style={css("display:flex;align-items:center;gap:0.7rem")}>
          <span style={css("width:2.1rem;height:2.1rem;border-radius:10px;background:" + accent + ";color:#fff;display:grid;place-items:center;flex-shrink:0")}><Icon name="feather" size={16} /></span>
          <div style={css("flex:1;min-width:0")}><div style={css("font-size:var(--text-lg);font-weight:500")}>{stages[0]?.label || "Discovery"}</div><div style={css("font-size:0.74rem;color:var(--fg-muted)")}>{pct}% of {progressLabel}</div></div>
          <button type="button" onClick={() => dispatch({ t: "restart" })} className="pt-softbtn" style={css("border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;padding:0.32rem 0.7rem;border-radius:var(--radius-pill);cursor:pointer;font-family:inherit")}>↻ Restart</button>
          {demo && <button type="button" onClick={runFill} className="pt-softbtn" style={css("border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;padding:0.32rem 0.7rem;border-radius:var(--radius-pill);cursor:pointer;font-family:inherit")}>Skip to finish →</button>}
        </div>
        <div style={css("height:0.45rem;border-radius:999px;background:oklch(0.92 0.006 50);overflow:hidden;margin-top:0.8rem")}><div style={css("height:100%;border-radius:999px;background:" + accent + ";width:" + pct + "%;transition:width .5s ease")} /></div>
      </div>

      <div ref={scrollRef} style={css("padding:1.1rem;display:flex;flex-direction:column;gap:var(--space-3);max-height:" + (mobile ? "60vh" : "32rem") + ";overflow-y:auto;scroll-behavior:smooth")}>
        {s.introReveal >= 0 && (
          <div style={css("flex-shrink:0;display:flex;gap:0.6rem;align-items:flex-start;animation:cocoonFade .3s ease both")}>
            <span style={css("width:1.9rem;height:1.9rem;flex-shrink:0;border-radius:50%;display:grid;place-items:center;font-size:0.6rem;font-weight:500;background:color-mix(in srgb," + accent + " 14%,white 86%);color:" + accent)}>AI</span>
            <div style={css(bubble)}>{"Hey — I’m your co-pilot. I’ll walk through a thorough discovery, then draft everything from your answers. Answer what you can; skip anything you’re unsure of."}</div>
          </div>
        )}

        {groups.map(g => (
          <div key={g.topic} style={css("flex-shrink:0;border:1px solid var(--border-soft);border-radius:12px;overflow:hidden;animation:cocoonFade .25s ease both")}>
            <div style={css("display:flex;align-items:center;gap:0.55rem;padding:0.6rem 0.85rem;background:color-mix(in srgb," + accent + " 8%,white 92%)")}>
              <span style={css("width:1.5rem;height:1.5rem;border-radius:7px;background:color-mix(in srgb," + accent + " 16%,white 84%);color:" + accent + ";display:grid;place-items:center;flex-shrink:0")}><Icon name={g.icon} size={12} /></span>
              <span style={css("font-size:0.86rem;font-weight:500")}>{g.topic}</span>
            </div>
            {g.items.map((it, i) => (
              <div key={i} style={css("display:flex;align-items:center;gap:var(--space-4);padding:0.62rem 0.85rem" + (i < g.items.length - 1 ? ";border-top:1px solid var(--border-soft)" : ""))}>
                <span style={css("flex:1;min-width:0;font-size:var(--text-base);color:" + (it.skipped ? "var(--fg-faint)" : "var(--fg-muted)"))}>{it.label}</span>
                {it.skipped
                  ? <span style={css("flex-shrink:0;font-size:var(--text-xs);font-weight:500;color:var(--fg-faint);border:1px dashed var(--border);border-radius:999px;padding:0.14rem 0.62rem")}>Skipped</span>
                  : <span style={css("flex-shrink:0;max-width:16rem;text-align:right;font-size:var(--text-base);font-weight:500;color:" + accent + ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{it.answer}</span>}
              </div>
            ))}
          </div>
        ))}

        {s.typing && !complete && (
          <div style={css("flex-shrink:0;display:flex;gap:0.55rem;align-items:flex-start")}>
            <span style={css("width:1.7rem;height:1.7rem;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-size:0.56rem;font-weight:500;background:color-mix(in srgb," + accent + " 14%,white 86%);color:" + accent)}>AI</span>
            <div style={css("display:flex;align-items:center;gap:0.28rem;background:var(--surface);border:1px solid var(--border-soft);border-radius:14px;border-top-left-radius:4px;padding:0.7rem 0.85rem")}>
              {[0, 1, 2].map(i => <span key={i} className="pt-typing-dot" style={{ background: accent, animationDelay: i * 0.15 + "s" }} />)}
            </div>
          </div>
        )}

        {cur && !s.typing && (
          <div style={css("flex-shrink:0;display:flex;gap:0.55rem;align-items:flex-start;animation:cocoonFade .3s ease both")}>
            <span style={css("width:1.9rem;height:1.9rem;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-size:0.6rem;font-weight:500;background:" + accent + ";color:#fff")}>AI</span>
            <div style={css("flex:1;min-width:0;display:flex;flex-direction:column;gap:0.6rem")}>
              <div style={css("background:color-mix(in srgb," + accent + " 6%,white 94%);border:1px solid var(--accent-dim);border-radius:16px;border-top-left-radius:5px;padding:0.85rem 1rem")}>
                <div style={css("display:flex;align-items:center;gap:var(--space-2);margin-bottom:0.5rem")}>
                  <span style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + accent + ";background:color-mix(in srgb," + accent + " 14%,white 86%);padding:0.15rem 0.5rem;border-radius:999px")}>{cur.topic}</span>
                  <span style={css("font-size:0.68rem;color:var(--fg-faint);white-space:nowrap")}>{s.qIdx + 1} of {total}</span>
                </div>
                <div style={css("font-size:0.98rem;font-weight:500;line-height:1.4")}>{cur.label}</div>
                {cur.hint && <div style={css("font-size:0.78rem;color:var(--fg-muted);margin-top:0.25rem")}>{cur.hint}</div>}
              </div>

              {cur.kind === "single" && (
                <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem")}>
                  {cur.opts!.map(o => <button key={o} type="button" onClick={() => dispatch({ t: "single", k: cur.key, v: o })} style={css(optBtn(false))}>{o}</button>)}
                </div>
              )}
              {cur.kind === "multi" && (() => {
                const val = Array.isArray(s.data[cur.key]) ? (s.data[cur.key] as string[]) : [];
                return (
                  <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem")}>
                    {cur.opts!.map(o => <button key={o} type="button" onClick={() => dispatch({ t: "toggle", k: cur.key, v: o })} style={css(optBtn(val.includes(o)))}>{val.includes(o) ? "✓ " : ""}{o}</button>)}
                  </div>
                );
              })()}
              {cur.kind === "text" && (
                <input value={s.draft} onChange={e => dispatch({ t: "draft", v: e.target.value })} onKeyDown={e => { if (e.key === "Enter") dispatch({ t: "sendText", k: cur.key }); }} placeholder={cur.ph} className="pt-input" style={css("width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:var(--radius-pill);padding:0.6rem 0.95rem;font-size:0.85rem;background:var(--surface-alt);font-family:inherit;outline:none")} />
              )}
              {cur.kind === "textarea" && (
                <textarea value={s.draft} onChange={e => dispatch({ t: "draft", v: e.target.value })} placeholder={cur.ph} rows={3} className="pt-input" style={css("width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:var(--radius);padding:0.6rem 0.85rem;font-size:0.85rem;background:var(--surface-alt);font-family:inherit;resize:vertical;outline:none")} />
              )}

              <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-top:0.25rem")}>
                <div style={css("display:flex;gap:var(--space-2)")}>
                  {s.qIdx > 0 && <button type="button" onClick={() => dispatch({ t: "back" })} className="pt-softbtn" style={css("border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-muted);font-size:0.76rem;font-weight:500;cursor:pointer;font-family:inherit;padding:0.4rem 0.9rem;border-radius:var(--radius-pill)")}>← Back</button>}
                  <button type="button" onClick={() => dispatch({ t: "skip" })} className="pt-softbtn" style={css("border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-muted);font-size:0.76rem;font-weight:500;cursor:pointer;font-family:inherit;padding:0.4rem 0.9rem;border-radius:var(--radius-pill)")}>Skip this →</button>
                </div>
                {(cur.kind === "text" || cur.kind === "textarea") && <button type="button" onClick={() => dispatch({ t: "sendText", k: cur.key })} className="pt-op" style={css("border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;padding:0.5rem 1.3rem;font-size:0.83rem;font-weight:500;cursor:pointer;font-family:inherit")}>Send</button>}
                {cur.kind === "multi" && <button type="button" onClick={() => dispatch({ t: "sendMulti" })} className="pt-op" style={css("border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;padding:0.5rem 1.3rem;font-size:0.83rem;font-weight:500;cursor:pointer;font-family:inherit")}>Continue</button>}
              </div>
            </div>
          </div>
        )}

        {complete && (
          <>
            <div style={css("flex-shrink:0;border:1px solid var(--accent-dim);border-radius:var(--radius-panel);background:color-mix(in srgb," + accent + " 8%,white 92%);padding:1.1rem 1.25rem;text-align:center;animation:cocoonFade .3s ease both")}>
              <div style={css("font-size:var(--text-lg);font-weight:500")}>{completeTitle}</div>
              <p style={css("margin:0.35rem auto 0.85rem;font-size:0.83rem;color:var(--fg-muted);line-height:1.5;max-width:30rem")}>{(pipeline?.beginMsg && pipeline.beginMsg(s.data)) || completeMsg}</p>
              <button type="button" onClick={() => (pipeline ? beginBuild() : onComplete(s.data))} className="pt-op" style={css("border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;padding:0.6rem 1.3rem;font-size:0.85rem;font-weight:500;cursor:pointer;font-family:inherit")}>{pipeline ? pipeline.beginLabel : completeCta}</button>
            </div>
            {completeExtra}
          </>
        )}
      </div>
    </div>
  );

  // ── stage panel ──
  const statusPill = stageApproved
    ? ["Approved", "var(--success)", "var(--success-soft)"]
    : genDone ? ["Ready for review", accent, "color-mix(in srgb," + accent + " 14%,white 86%)"]
      : ["Not generated", "var(--fg-muted)", "var(--surface-alt)"];
  const stagePanel = pipeline && curStage && (
    <div style={css(card + ";animation:cocoonFade .2s ease both")}>
      <div style={css("padding:0.9rem 1.15rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;gap:0.6rem")}>
        <span style={css("width:1.9rem;height:1.9rem;border-radius:8px;background:color-mix(in srgb," + accent + " 14%,white 86%);color:" + accent + ";display:grid;place-items:center")}><Icon name={curStage.icon} size={17} /></span>
        <div style={css("flex:1;min-width:0;font-size:0.98rem;font-weight:500")}>{curStage.label}</div>
        <span style={css("font-size:0.68rem;font-weight:500;padding:0.2rem 0.6rem;border-radius:999px;background:" + statusPill[2] + ";color:" + statusPill[1])}>{statusPill[0]}</span>
      </div>

      {currentStageExtra && (
        <div style={css("padding:1.15rem 1.25rem 0")}>
          {currentStageExtra}
        </div>
      )}

      {!genDone ? (
        <div style={css("padding:2.4rem 1.5rem;text-align:center")}>
          <p style={css("margin:0 auto 0.95rem;font-size:0.85rem;color:var(--fg-muted);line-height:1.5;max-width:28rem")}>{pipeline.genPrompt(curKey)}</p>
          <button type="button" onClick={onGen} className="pt-op" style={css("border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;padding:0.6rem 1.3rem;font-size:0.85rem;font-weight:500;cursor:pointer;font-family:inherit")}>✦ {pipeline.genCta(curKey)}</button>
        </div>
      ) : (
        <div style={css("padding:1.15rem 1.25rem")}>
          {pipeline.renderStage({
            stageKey: curKey, docs, reveal: Number.POSITIVE_INFINITY, building: false, approved: stageApproved, mobile, accent,
            onAdvance: approveStage,
            onDownload: () => toast("Preparing the PDF…"),
            onShare: () => toast("Share link copied — send it to your client"),
            onCopy: () => toast("Copied to clipboard"),
          })}
          {genDone && !stageApproved && (
            <div style={css("margin-top:1.15rem;padding-top:1rem;border-top:1px solid var(--border-soft);display:flex;align-items:center;justify-content:flex-end;gap:0.6rem")}>
              <button type="button" onClick={() => dispatch({ t: "reqChanges", k: curKey })} className="pt-softbtn" style={css("border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.5rem 1rem;font-size:0.8rem;cursor:pointer;font-family:inherit")}>Request changes</button>
              <button type="button" onClick={approveStage} className="pt-op" style={css("border:none;border-radius:var(--radius-pill);background:var(--success);color:#fff;padding:0.5rem 1.15rem;font-size:var(--text-base);font-weight:500;cursor:pointer;font-family:inherit")}>{pipeline.approveLabel(curKey, isLast)}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── main content selector ──
  let main: ReactNode;
  if (pipeline && s.proposal) {
    main = pipeline.renderProposal({
      docs, mobile, accent, sent: false,
      onBack: () => dispatch({ t: "proposal", v: false }),
      onExit,
      onRequest: () => toast("Sent to Baltz — we’ll be in touch"),
      onShare: () => toast("Share link copied — send it to your client"),
    });
  } else if (pipeline && s.stage >= 1 && curStage) {
    main = stagePanel;
  } else {
    main = !s.entered ? introScreen : chat;
  }

  return (
    <div style={css("max-width:60rem;margin:0 auto;display:flex;flex-direction:column;gap:0.85rem;animation:cocoonFade .2s ease both")}>
      <div style={css("display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap")}>
        <button type="button" onClick={onExit} className="pt-softbtn" style={css("border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.4rem 0.8rem;font-size:0.78rem;cursor:pointer;font-family:inherit")}>{backLabel}</button>
        <div style={{ minWidth: 0 }}><span style={css("font-size:var(--text-lg);font-weight:500")}>{title}</span><span style={css("font-size:var(--text-base);color:var(--fg-muted)")}> · {clientName}</span></div>
      </div>
      <div style={css(mobile ? "display:flex;flex-direction:column;gap:0.85rem" : "display:grid;grid-template-columns:17rem minmax(0,1fr);gap:0.85rem;align-items:start")}>
        {rail}
        <div style={css("min-width:0")}>{main}</div>
      </div>
    </div>
  );
}
