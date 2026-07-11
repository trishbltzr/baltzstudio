"use client";

import type { ReactNode } from "react";
import { css } from "../helpers";
import { ScoreGauge } from "../components/ScoreGauge";
import { Icon } from "../icons";
import type { Ans, Pipeline, StageRenderCtx, ProposalRenderCtx } from "./DiscoveryBuilder";

// ── scoring model (ported from Audit Builder) ──────────────────────────────────
const AREAS = [
  { key: "conv", label: "Conversion Path", mkey: "convM", base: 48 },
  { key: "exp", label: "Website Experience", mkey: "expM", base: 55 },
  { key: "msg", label: "Messaging & Voice", mkey: "msgM", base: 61 },
  { key: "find", label: "Findability", mkey: "findM", base: 66 },
  { key: "vis", label: "Visual Identity", mkey: "visM", base: 78 },
  { key: "brand", label: "Brand Foundation", mkey: "brandM", base: 84 },
];
const OPTS: Record<string, string[]> = {
  convM: ["No obvious action", "Buried below the fold", "One CTA, competing with others", "Clear on most pages", "One unmistakable CTA everywhere"],
  expM: ["Clunky & slow", "Works but dated", "Fine on desktop only", "Smooth on most devices", "Fast & effortless everywhere"],
  msgM: ["Not sure we have one", "Feature-led, not outcome-led", "Clear once you read a while", "Mostly clear up top", "Instantly obvious"],
  findM: ["Invisible", "A few brand terms", "Some traffic, no strategy", "Ranking for key terms", "Strong organic engine"],
  visM: ["All over the place", "A few recurring styles", "Consistent-ish", "Mostly systematic", "A tight design system"],
  brandM: ["Unclear", "We know it, it is not written", "Written but generic", "Clear & differentiated", "Owns a category in one line"],
};
const RECS: Record<string, string> = {
  conv: "Add one unmistakable primary CTA above the fold and cut the form to the two fields that matter.",
  exp: "Tighten mobile navigation and compress hero media so the first paint lands under two seconds.",
  msg: "Lead with the outcome, not the feature — a single benefit-led headline a visitor grasps in five seconds.",
  find: "Ship title tags and meta descriptions on the money pages and fix the missing H1s.",
  vis: "Lock spacing, type scale and button styles into a small system so every page feels intentional.",
  brand: "Sharpen the one-line positioning so it says who it is for and why it is different.",
};
const FINDINGS: Record<string, string[]> = {
  conv: ["4 of 6 landing pages have no clear call to action", "Contact form asks for 9 fields — high drop-off", "No trust signals near the point of decision"],
  exp: ["Primary actions are buried in a deep nav", "Mobile menu hides the main CTA behind two taps", "Page load is slow on the gallery pages"],
  msg: ["Value proposition sits below the fold on 3 key pages", "Tone drifts between playful and formal across sections", "No single, repeated tagline anchoring the brand"],
  find: ["Core pages are indexed and titled well", "Meta descriptions and alt text missing in places", "No structured data on services or reviews"],
  vis: ["Colour palette applied consistently sitewide", "Type hierarchy is flat — headings and body too close", "Imagery style is cohesive and on-brand"],
  brand: ["Positioning statement is distinct and memorable", "Logo works across light and dark backgrounds", "Origin story lands emotionally on the About page"],
};
const SHORT: Record<string, string> = {
  conv: "One clear CTA per page and a shorter form would lift this fast.",
  exp: "Flatten the nav and speed up media for a smoother run.",
  msg: "A single benefit-led headline would sharpen the message.",
  find: "Solid basics; missing meta & alt text in places.",
  vis: "Consistent palette; type hierarchy could be bolder.",
  brand: "Clear positioning; logo & story hold up well.",
};

const catColor = (score: number) => score < 50 ? "var(--danger)" : (score < 65 ? "var(--warn)" : "var(--success)");
const catStatus = (score: number) => score < 50 ? "Priority" : (score < 65 ? "Needs work" : (score < 80 ? "Good" : "Strong"));
const catTrack = (score: number) => "color-mix(in srgb," + catColor(score) + " 14%,white 86%)";
const badgeStyle = (score: number) => "font-size:0.62rem;font-weight:500;padding:0.15rem 0.5rem;border-radius:999px;background:color-mix(in srgb," + catColor(score) + " 14%,white 86%);color:" + catColor(score);
const projFor = (score: number) => Math.min(96, score + Math.round((100 - score) * 0.66));

export interface AuditCat { key: string; label: string; score: number; projected: number; gain: number; status: string; color: string; rec: string; findings: string[]; short: string }
export interface AuditDocs { name: string; cats: AuditCat[]; overall: number; projected: number; uplift: number; strong: number; needWork: number; label: string; invest: string }

export function buildAuditDocs(data: Ans): AuditDocs {
  const d = data || {};
  const cats: AuditCat[] = AREAS.map(a => {
    const ans = d[a.mkey] as string | undefined;
    let score = a.base;
    if (ans) { const opts = OPTS[a.mkey]; const idx = opts ? opts.indexOf(ans) : -1; if (idx >= 0) { const n = opts.length; score = Math.round(38 + (idx / (n - 1)) * 54); } }
    const projected = projFor(score);
    return { key: a.key, label: a.label, score, projected, gain: projected - score, status: catStatus(score), color: catColor(score), rec: RECS[a.key], findings: FINDINGS[a.key], short: SHORT[a.key] };
  });
  const overall = Math.round(cats.reduce((s, c) => s + c.score, 0) / cats.length);
  const projected = Math.round(cats.reduce((s, c) => s + c.projected, 0) / cats.length);
  const strong = cats.filter(c => c.score >= 65).length;
  const needWork = cats.length - strong;
  const label = overall < 50 ? "Needs attention" : (overall < 65 ? "Fair foundation" : (overall < 80 ? "Solid footing" : "Strong foundation"));
  const invest = "£" + ((needWork * 1200) + 1400).toLocaleString();
  return { name: (d.name as string) || "New audit", cats, overall, projected, uplift: projected - overall, strong, needWork, label, invest };
}

// Deterministic score summary for a client card (mirrors the report's data-viz
// without needing the full intake answers).
export interface AuditScoreSummary { overall: number; projected: number; uplift: number; strong: number; needWork: number; label: string; cats: { key: string; label: string; score: number; color: string }[] }
export function synthAuditScore(seed: string): AuditScoreSummary {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = (i: number) => { const x = Math.sin(h + i * 97.13) * 43758.5453; return x - Math.floor(x); };
  const cats = AREAS.map((a, i) => { const score = Math.round(46 + rnd(i) * 44); return { key: a.key, label: a.label, score, color: catColor(score) }; });
  const overall = Math.round(cats.reduce((s, c) => s + c.score, 0) / cats.length);
  const projected = Math.round(cats.reduce((s, c) => s + projFor(c.score), 0) / cats.length);
  const strong = cats.filter(c => c.score >= 65).length;
  const label = overall < 50 ? "Needs attention" : (overall < 65 ? "Fair foundation" : (overall < 80 ? "Solid footing" : "Strong foundation"));
  return { overall, projected, uplift: projected - overall, strong, needWork: cats.length - strong, label, cats };
}

// Compact score panel for a client card — a shrunk version of the report's
// overall band + category bars, so the picker reads like a stack of mini reports.
export function AuditScoreHero({ summary, scored = true }: { summary: AuditScoreSummary; scored?: boolean }) {
  const s = summary;
  if (!scored) {
    return (
      <div style={css("border:1px dashed var(--border);border-radius:0.78rem;background:color-mix(in srgb,var(--surface-alt) 72%,var(--surface) 28%);padding:0.82rem 0.85rem;display:flex;align-items:center;gap:0.72rem")}>
        <div style={css("width:2rem;height:2rem;border-radius:0.62rem;border:1px dashed var(--border);display:grid;place-items:center;color:var(--fg-faint);flex-shrink:0")}><Icon name="chart" size={14} /></div>
        <div style={css("min-width:0")}><div style={css("font-size:0.86rem;font-weight:500")}>Not scored yet</div><div style={css("font-size:var(--text-xs);color:var(--fg-faint);margin-top:0.15rem;line-height:1.4")}>Run the intake to score six areas 0–100.</div></div>
      </div>
    );
  }
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:0.9rem;background:linear-gradient(180deg,color-mix(in srgb,var(--success) 5%,var(--surface) 95%),var(--surface));padding:0.82rem 0.88rem;display:flex;flex-direction:column;gap:0.62rem")}>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3)")}>
        <div style={css("min-width:0")}>
          <div style={css("font-size:0.76rem;font-weight:500;color:var(--fg-muted);letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>Projected after Winged in a Week</div>
          <div style={css("display:flex;align-items:baseline;gap:0.42rem;margin-top:0.2rem;flex-wrap:wrap")}>
            <span style={css("font-size:1.05rem;font-weight:500;color:var(--fg-muted)")}>{s.overall}</span>
            <span style={css("font-size:var(--text-base);color:var(--success)")}>↗</span>
            <span style={css("font-size:1.48rem;font-weight:500;color:var(--success);line-height:0.95")}>{s.projected}</span>
          </div>
        </div>
        <div style={css("display:flex;align-items:center;justify-content:flex-end;white-space:nowrap;align-self:flex-end;padding-bottom:0.12rem")}>
          <span style={css("font-size:var(--text-lg);font-weight:500;color:var(--success);line-height:1")}>+{s.uplift}</span>
        </div>
      </div>
      <div style={css("position:relative;height:0.38rem;border-radius:999px;background:oklch(0.92 0.006 50);overflow:hidden")}>
        <div style={css("height:100%;width:" + s.overall + "%;border-radius:999px;background:var(--success)")} />
        <span style={css("position:absolute;top:-0.16rem;bottom:-0.16rem;left:" + s.projected + "%;width:2px;border-radius:999px;background:color-mix(in srgb,var(--fg-muted) 65%,transparent 35%)")} />
      </div>
      <div style={css("display:flex;align-items:center;gap:var(--space-2);font-size:0.7rem;color:var(--fg-faint);padding:0 0.05rem")}>
        <span style={css("display:inline-flex;align-items:center;gap:0.28rem")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--success)")} />{s.strong}</span>
        <span style={css("display:inline-flex;align-items:center;gap:0.28rem")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--warn)")} />{s.needWork}</span>
        <span style={css("margin-left:auto;font-size:0.68rem")}>current → target</span>
      </div>
    </div>
  );
}

// ── renderers ──────────────────────────────────────────────────────────────────
const sec = (reveal: number, n: number) => reveal >= n;

function CatCard({ c, accent, big }: { c: AuditCat; accent: string; big?: boolean }) {
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:16px;padding:" + (big ? "1.3rem 1.4rem" : "1rem 1.1rem") + ";display:flex;flex-direction:column;gap:0.65rem;background:var(--surface);animation:cocoonFade .34s ease both")}>
      <div style={css("display:flex;align-items:flex-start;gap:0.7rem")}>
        <ScoreGauge score={c.score} color={c.color} track={catTrack(c.score)} size={big ? 44 : 40} stroke={3.5} labelSize={big ? "0.82rem" : "0.78rem"} />
        <div style={css("flex:1;min-width:0")}><div style={css("font-size:" + (big ? "1.05rem" : "0.95rem") + ";font-weight:500;line-height:1.2")}>{c.label}</div><span style={css(badgeStyle(c.score) + ";display:inline-block;margin-top:0.3rem")}>{c.status}</span></div>
      </div>
      <div>
        <div style={css("position:relative;height:0.4rem;border-radius:999px;background:oklch(0.92 0.006 50)")}><div style={css("height:100%;border-radius:999px;background:" + c.color + ";width:" + c.score + "%")} /><div style={css("position:absolute;top:-0.12rem;bottom:-0.12rem;left:" + c.projected + "%;width:2px;border-radius:1px;background:var(--fg-faint)")} /></div>
        <div style={css("display:flex;justify-content:space-between;align-items:center;margin-top:0.4rem;font-size:0.74rem")}><span style={css("color:var(--fg-muted)")}><span style={css("font-weight:500;color:var(--fg)")}>{c.score}</span> <span style={css("color:var(--success)")}>↗</span> target {c.projected}</span><span style={css("font-weight:500;color:var(--success)")}>+{c.gain}</span></div>
      </div>
      <div style={css("display:flex;flex-direction:column;gap:0.35rem")}>
        {c.findings.map((f, i) => <div key={i} style={css("display:flex;gap:var(--space-2);font-size:0.79rem;color:var(--fg-muted);line-height:1.45")}><span style={css("width:0.32rem;height:0.32rem;border-radius:50%;background:" + c.color + ";margin-top:0.42rem;flex-shrink:0")} /><span style={css("flex:1;min-width:0")}>{f}</span></div>)}
      </div>
      <div style={css("background:var(--surface-alt);border-radius:9px;padding:0.6rem 0.8rem;font-size:0.78rem;color:var(--fg-muted);line-height:1.45")}><span style={css("color:" + accent + ";font-weight:500")}>↗ Recommendation</span> — {c.rec}</div>
    </div>
  );
}

function OverallBand({ d, accent }: { d: AuditDocs; accent: string }) {
  return (
    <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:0.7rem;animation:cocoonFade .4s ease both")}>
      <div style={css("border:1px solid var(--border-soft);border-radius:14px;background:var(--surface);padding:1.1rem 1.3rem;display:flex;align-items:center;gap:1.1rem")}>
        <ScoreGauge score={d.overall} color="var(--success)" track="color-mix(in srgb,var(--success) 13%,white 87%)" size={64} stroke={5}
          label={<span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}><span style={{ fontSize: "1.4rem", fontWeight: 500 }}>{d.overall}</span><span style={{ fontSize: "0.52rem", color: "var(--fg-faint)" }}>/100</span></span>} />
        <div style={css("min-width:0")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>Overall today</div>
          <div style={css("font-size:1.2rem;font-weight:500;margin-top:0.12rem")}>{d.label}</div>
          <div style={css("display:flex;gap:0.4rem;margin-top:0.5rem;flex-wrap:wrap")}>
            <span style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.68rem;font-weight:500;padding:0.2rem 0.6rem;border-radius:999px;background:var(--success-soft);color:var(--success)")}><span style={css("width:0.32rem;height:0.32rem;border-radius:50%;background:var(--success)")} />{d.strong} strong</span>
            <span style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.68rem;font-weight:500;padding:0.2rem 0.6rem;border-radius:999px;background:var(--warn-soft);color:var(--warn)")}><span style={css("width:0.32rem;height:0.32rem;border-radius:50%;background:var(--warn)")} />{d.needWork} need work</span>
          </div>
        </div>
      </div>
      <div style={css("border:1px solid var(--border-soft);border-radius:14px;background:var(--surface-alt);padding:1.1rem 1.3rem;display:flex;flex-direction:column;justify-content:center")}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-2)")}>
          <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);max-width:11rem")}>Projected after a done-for-you sprint</div>
          <div style={css("text-align:right;flex-shrink:0")}><div style={css("font-size:var(--text-base);font-weight:500;color:var(--success);line-height:1")}>+{d.uplift}</div><div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>points</div></div>
        </div>
        <div style={css("display:flex;align-items:baseline;gap:var(--space-2);margin-top:0.5rem")}><span style={css("font-size:1.05rem;color:var(--fg-muted)")}>{d.overall}</span><span style={css("color:var(--success)")}>↗</span><span style={css("font-size:var(--text-4xl);font-weight:500;color:var(--success);line-height:1")}>{d.projected}</span></div>
        <div style={css("height:0.4rem;border-radius:999px;background:oklch(0.9 0.008 50);margin-top:0.7rem;overflow:hidden")}><div style={css("height:100%;border-radius:999px;background:var(--success);width:" + d.projected + "%")} /></div>
      </div>
    </div>
  );
}

function NeedCallout({ d, accent, onSeePlan }: { d: AuditDocs; accent: string; onSeePlan: () => void }) {
  if (!d.needWork) return null;
  const msg = (d.needWork === 1 ? "One area is" : d.needWork + " areas are") + " holding your score back. A one-week sprint tackles " + (d.needWork === 1 ? "it" : "them") + " first.";
  return (
    <div style={css("display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap;border:1px solid var(--accent-dim);border-radius:12px;background:color-mix(in srgb," + accent + " 8%,white 92%);padding:0.85rem 1.1rem")}>
      <div style={css("flex:1;min-width:12rem;font-size:0.86rem;line-height:1.45")}>{msg}</div>
      <button type="button" onClick={onSeePlan} className="pt-op" style={css("border:none;border-radius:var(--radius-pill);background:var(--fg);color:var(--surface);padding:0.55rem 1.2rem;font-size:var(--text-base);font-weight:500;cursor:pointer;font-family:inherit;white-space:nowrap")}>See your plan ↗</button>
    </div>
  );
}

function renderStage(ctx: StageRenderCtx): ReactNode {
  const { stageKey, docs, reveal, accent, onAdvance } = ctx;
  const d = docs as AuditDocs;

  if (stageKey === "report") {
    const showOverall = sec(reveal, 1);
    const catsShown = reveal === Number.POSITIVE_INFINITY ? d.cats : d.cats.slice(0, Math.max(0, reveal - 1));
    return (
      <div style={css("display:flex;flex-direction:column;gap:1.1rem")}>
        {reveal === Number.POSITIVE_INFINITY && (
          <div style={css("display:flex;justify-content:flex-end")}>
            <button type="button" onClick={ctx.onDownload} className="pt-softbtn" style={css("display:inline-flex;align-items:center;gap:0.4rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);padding:0.42rem 0.95rem;font-size:0.78rem;font-weight:500;cursor:pointer;font-family:inherit")}>⤢ Preview &amp; download PDF</button>
          </div>
        )}
        {showOverall && <OverallBand d={d} accent={accent} />}
        {showOverall && <NeedCallout d={d} accent={accent} onSeePlan={onAdvance} />}
        <div style={css("display:grid;grid-template-columns:1fr;gap:var(--space-3)")}>
          {catsShown.map(c => <CatCard key={c.key} c={c} accent={accent} />)}
        </div>
      </div>
    );
  }

  // action plan
  const need = d.cats.filter(c => c.score < 65).sort((a, b) => a.score - b.score);
  const strong = d.cats.filter(c => c.score >= 65);
  const needShown = reveal === Number.POSITIVE_INFINITY ? need : need.slice(0, reveal);
  return (
    <div style={css("display:flex;flex-direction:column;gap:1.2rem")}>
      <div style={css("display:grid;grid-template-columns:1fr;gap:1.1rem;align-items:stretch")}>
        <div style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1.4rem 1.5rem;display:flex;align-items:center;gap:1.4rem")}>
          <ScoreGauge score={d.overall} color="var(--success)" track="color-mix(in srgb,var(--success) 13%,white 87%)" size={80} stroke={5}
            label={<span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}><span style={{ fontSize: "1.6rem", fontWeight: 500 }}>{d.overall}</span><span style={{ fontSize: "0.55rem", color: "var(--fg-faint)" }}>/100</span></span>} />
          <div style={css("min-width:0")}>
            <div style={css("font-size:1.15rem;font-weight:500")}>{d.label}</div>
            <div style={css("display:flex;align-items:baseline;gap:0.4rem;margin-top:0.5rem;font-size:0.9rem")}><span style={css("color:var(--fg-muted)")}>{d.overall}</span><span style={css("color:var(--success)")}>↗</span><span style={css("font-weight:500")}>{d.projected}</span><span style={css("color:var(--success)")}>+{d.uplift}</span></div>
            <div style={css("font-size:var(--text-xs);color:var(--fg-faint);margin-top:0.35rem")}>Projected after a one-week sprint</div>
          </div>
        </div>
      </div>
      <div style={css("display:flex;flex-direction:column;gap:var(--space-4)")}>
        {needShown.map(c => <CatCard key={c.key} c={c} accent={accent} big />)}
      </div>
      {reveal === Number.POSITIVE_INFINITY && strong.length > 0 && (
        <div>
          <div style={css("display:flex;align-items:center;gap:0.4rem;font-size:0.78rem;font-weight:500;color:var(--success);margin-bottom:0.7rem")}><span>✓</span> Already strong</div>
          <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:0.8rem")}>
            {strong.map(c => (
              <div key={c.key} style={css("border:1px solid var(--border-soft);border-radius:16px;background:var(--surface);padding:1.1rem 1.2rem")}>
                <div style={css("display:flex;align-items:center;gap:0.65rem")}>
                  <ScoreGauge score={c.score} color={c.color} track={catTrack(c.score)} size={34} stroke={3} labelSize="0.7rem" />
                  <div style={css("flex:1;min-width:0")}><div style={css("font-size:var(--text-lg);font-weight:500;line-height:1.2")}>{c.label}</div><span style={css(badgeStyle(c.score) + ";display:inline-block;margin-top:0.25rem")}>{c.status}</span></div>
                </div>
                <div style={css("font-size:var(--text-base);color:var(--fg-muted);margin-top:0.7rem;line-height:1.45")}>{c.short}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function renderProposal(ctx: ProposalRenderCtx): ReactNode {
  const d = ctx.docs as AuditDocs;
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;animation:cocoonFade .4s ease both")}>
      <div style={css("padding:1.6rem 1.7rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
        <div onClick={ctx.onBack} style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:0.76rem;color:var(--fg-muted);cursor:pointer;margin-bottom:0.9rem")}>← Back to action plan</div>
        <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + ctx.accent + ";margin-bottom:0.3rem")}>Audit summary</div>
        <h2 style={css("margin:0;font-size:var(--text-3xl);font-weight:500;line-height:1.18")}>{d.name} scored {d.overall}/100</h2>
        <p style={css("margin:0.4rem 0 0;font-size:0.85rem;color:var(--fg-muted);line-height:1.5;max-width:36rem")}>{d.label} today, with a clear path to {d.projected}. Share the full report with your client, or have Baltz action the fixes.</p>
        <div style={css("display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-2);margin-top:1.2rem")}>
          {[[String(d.overall), "Score today", "var(--fg)"], [String(d.projected), "Projected", "var(--success)"], [String(d.needWork), "Areas to fix", "var(--fg)"]].map(([v, l, col]) => <div key={l} style={css("border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.75rem 0.9rem;background:var(--surface-alt)")}><div style={css("font-size:1.45rem;font-weight:500;line-height:1;color:" + col)}>{v}</div><div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-top:0.28rem")}>{l}</div></div>)}
        </div>
      </div>
      <div style={css("padding:1.15rem 1.4rem;background:var(--surface-alt);display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap")}>
        <div style={css("flex:1;min-width:9rem")}><div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>Done-for-you sprint</div><div style={css("font-size:var(--text-3xl);font-weight:500;line-height:1.1")}>{d.invest}</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>Fixed scope from your audit</div></div>
        <div style={css("display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap")}>
          <button type="button" onClick={ctx.onShare} className="pt-softbtn" style={css("height:2.6rem;padding:0 1.2rem;border-radius:var(--radius-pill);border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);font-size:var(--text-base);font-weight:500;cursor:pointer;font-family:inherit")}>↗ Share with client</button>
          <button type="button" onClick={ctx.onRequest} className="pt-op" style={css("height:2.6rem;padding:0 1.5rem;border-radius:var(--radius-pill);border:none;background:" + ctx.accent + ";color:#fff;font-size:0.85rem;font-weight:500;cursor:pointer;font-family:inherit")}>Have Baltz fix this →</button>
        </div>
      </div>
    </div>
  );
}

function introPreview(): ReactNode {
  const cats = [
    { label: "Conversion Path", score: 48, color: "var(--danger)" },
    { label: "Website Experience", score: 55, color: "var(--warn)" },
    { label: "Messaging & Voice", score: 61, color: "var(--warn)" },
    { label: "Visual Identity", score: 78, color: "var(--success)" },
  ];
  return (
    <div style={css("position:absolute;top:1.5rem;left:1.5rem;right:-2.5rem;bottom:-1.4rem;background:#fff;border:1px solid var(--border-soft);border-radius:12px 0 0 0;box-shadow:0 24px 60px -30px rgba(60,40,30,0.5);padding:1.2rem 1.4rem;display:flex;flex-direction:column;overflow:hidden")}>
      <div style={css("display:flex;align-items:flex-start;gap:0.65rem;padding-bottom:0.75rem")}>
        <span style={css("width:1.85rem;height:1.85rem;border-radius:7px;background:var(--success-soft);color:var(--success);display:grid;place-items:center;font-weight:500;font-size:var(--text-base);flex-shrink:0")}>B</span>
        <div style={css("flex:1;min-width:0")}><div style={css("font-size:0.9rem;font-weight:500;line-height:1.2")}>Bloom &amp; Root Wellness</div><div style={css("font-size:0.68rem;color:var(--fg-muted);margin-top:0.08rem")}>Website Audit — Discovery Report</div></div>
      </div>
      <div style={css("height:2px;background:var(--success);border-radius:2px;margin-bottom:0.9rem")} />
      <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.55rem")}>Overall score</div>
      <div style={css("display:flex;align-items:center;gap:0.9rem;margin-bottom:1rem")}>
        <ScoreGauge score={65} color="var(--success)" track="color-mix(in srgb,var(--success) 13%,white 87%)" size={54} stroke={4.5} label={<span style={{ fontSize: "1.05rem", fontWeight: 500 }}>65</span>} />
        <div style={css("min-width:0")}><div style={css("font-size:0.92rem;font-weight:500")}>Fair foundation</div><div style={css("display:flex;gap:0.3rem;margin-top:0.3rem;flex-wrap:wrap")}><span style={css("font-size:0.6rem;font-weight:500;padding:0.15rem 0.45rem;border-radius:999px;background:var(--success-soft);color:var(--success)")}>3 strong</span><span style={css("font-size:0.6rem;font-weight:500;padding:0.15rem 0.45rem;border-radius:999px;background:var(--warn-soft);color:var(--warn)")}>3 need work</span></div></div>
      </div>
      <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.5rem")}>Category scores</div>
      <div style={css("display:flex;flex-direction:column;gap:0.55rem")}>
        {cats.map(c => (
          <div key={c.label} style={css("display:flex;align-items:center;gap:0.6rem")}>
            <span style={css("width:1.5rem;height:1.5rem;border-radius:50%;border:2px solid " + c.color + ";display:grid;place-items:center;font-size:0.6rem;font-weight:500;flex-shrink:0")}>{c.score}</span>
            <div style={css("flex:1;min-width:0")}><div style={css("font-size:var(--text-xs);font-weight:500")}>{c.label}</div><div style={css("height:0.28rem;border-radius:999px;background:oklch(0.92 0.006 50);margin-top:0.2rem;overflow:hidden")}><div style={css("height:100%;border-radius:999px;background:" + c.color + ";width:" + c.score + "%")} /></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STAGE_PROMPT: Record<string, string> = {
  report: "Score all six areas with AI, drawn from everything you shared in intake.",
  plan: "Turn the lowest-scoring areas into a prioritised, done-for-you action plan.",
};
const STAGE_CTA: Record<string, string> = { report: "Score my site", plan: "Build action plan" };

export const AUDIT_PIPELINE: Pipeline = {
  railTitle: "Audit pipeline",
  buildDocs: buildAuditDocs,
  gen: (k) => ({ total: k === "report" ? 1 + AREAS.length : 3, ms: k === "report" ? 8000 : 5000, buildLabel: k === "report" ? "Scoring" : "Building" }),
  genPrompt: (k) => STAGE_PROMPT[k] || "Generate this stage with AI.",
  genCta: (k) => STAGE_CTA[k] || "Generate with AI",
  approveLabel: (_k, isLast) => (isLast ? "Finish & share →" : "Approve & continue →"),
  beginLabel: "Score my site →",
  beginMsg: (data) => {
    const nick = String(data.nickname || "").trim();
    const nickCap = nick ? nick.charAt(0).toUpperCase() + nick.slice(1) : "";
    const name = String(data.name || "").trim() || "your site";
    return nickCap
      ? "Perfect, " + nickCap + " — I have everything I need to score " + name + "."
      : "I have everything I need to score your site.";
  },
  introPreview,
  renderStage,
  renderProposal,
};
