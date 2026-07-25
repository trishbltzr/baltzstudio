"use client";

import type { ReactNode } from "react";
import { css } from "../helpers";

export const GRAD = "linear-gradient(90deg,oklch(0.78 0.11 22),oklch(0.7 0.13 18))";
type Get = (id: string, fb?: string) => string;

// Derive every display string the deliverables need from the intake answers.
export function derive(get: Get) {
  const primaryAction = get("primaryAction", "Talk to us / book a call");
  const goalMap: Record<string, string> = {
    "Talk to us / book a call": "Qualified conversation", "See it live / demo": "Demo requested",
    "Start free": "Free start", "Read the resource": "Engaged reader", "Join the community": "New subscriber",
  };
  const traffic = get("traffic", "Owned + earned distribution");
  const promise = get("promise", "The transformation you promise.");
  const audience = get("audience", "Your ideal customer.");
  const cta = primaryAction.startsWith("Talk to us") ? "Talk to us" : primaryAction.startsWith("See it live") ? "See it live" : primaryAction === "Start free" ? "Start free" : primaryAction === "Join the community" ? "Join us" : "Get the resource";
  return {
    flowTraffic: traffic, flowAfter: get("afterOptin", "Point to more useful content"), flowGoal: goalMap[primaryAction] || "Qualified conversation",
    flowThankLine: "Point to the next useful thing and set expectations.", flowUpsellLine: get("upsellOffer", "A next-step offer that grows the relationship."),
    personaSummary: audience, personaPains: get("pains", "Their biggest frustrations."), personaDesires: get("desires", "What they want instead."),
    personaObjections: get("objections", "Why they hesitate."), personaAwareness: get("awareness", "Feel the problem"),
    personaHook: "Speak to the pain first, then hold up the promise: " + promise,
    copyMetaTitle: get("company", "Your Studio") + " — " + get("leadMagnet", "Free resource"), copyMetaDesc: promise,
    copyHeadline: promise, copySubhead: "Built for " + audience.toLowerCase() + " — start with " + get("leadMagnet", "the free resource").toLowerCase() + ".",
    copyCta: cta, copyFormNote: "One high-intent CTA — minimal friction, no long form.", copyPrivacy: "No spam. Unsubscribe anytime.",
    copyGuarantee: get("guarantee", "Risk-free — cancel anytime."), copyProof: get("proof", "Real results from real clients."),
    copyThankHead: "You're in — here's what's next", copyThankBody: "More useful things while you're here…",
    copyUpsellHead: get("upsellOffer", "Next-step offer"), copyUpsellBody: "Add the next step for " + get("upsellPrice", "a fair price") + " when you're ready.",
    copyUpsellCta: "Add it — " + get("upsellPrice", "next step"),
    devPages: [
      { name: "Content / landing page", desc: "hero, point of view, benefits, proof, FAQ, high-intent CTA" },
      { name: "Thank-you + next value", desc: "confirmation + next-step offer" },
      { name: "Booking / calendar page", desc: get("calendar", "Calendly") + " embed" },
    ],
    devIntegrations: get("esp", "Kit (ConvertKit)") + " (audience) · " + get("calendar", "Calendly") + " (booking)",
    devTech: "Next.js on " + get("domain", "your domain") + ", static-hosted, analytics + pixel wired.",
    tlDeadline: get("deadline", "2–4 weeks"), tlBudget: get("budget", "$5k–$10k"),
    fpGoal: promise, fpUpsell: get("upsellOffer", "A next-step offer that grows the relationship."),
  };
}

const eyebrow = "text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--accent);margin-bottom:0.5rem";
const flowRow = (w: string, bg: string, n: string, label: string, right: string) => (
  <div style={css("width:" + w + ";border-radius:10px;background:" + bg + ";color:#fff;padding:0.8rem 1.15rem;display:flex;align-items:center;justify-content:space-between;gap:0.8rem")}>
    <div style={{ minWidth: 0 }}><div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.05em;opacity:.82")}>{n}</div><div style={css("font-size:var(--text-xs);font-weight:500")}>{label}</div></div>
    <span style={css("font-size:var(--text-2xs);opacity:.85;white-space:nowrap")}>{right}</span>
  </div>
);
const arrow = <span style={css("color:var(--fg-faint);font-size:var(--text-2xs);line-height:1")}>▼</span>;

export function DelivBody({ id, get }: { id: string; get: Get }) {
  const d = derive(get);

  if (id === "flow") {
    return (
      <div style={css("display:flex;flex-direction:column;align-items:center;gap:0.4rem")}>
        {flowRow("100%", "oklch(0.82 0.08 27)", "1 · TRAFFIC", d.flowTraffic, "cold audience")}
        {arrow}
        {flowRow("87%", "oklch(0.78 0.10 25)", "2 · LANDING PAGE", "Deliver the value", "visitor → audience")}
        {arrow}
        {flowRow("74%", "oklch(0.74 0.11 23)", "3 · VALUE + NURTURE", "Keep delivering value", "engaged")}
        {arrow}
        {flowRow("61%", "oklch(0.70 0.12 22)", "4 · BOOKING / CALL", d.flowAfter, "high intent")}
        {arrow}
        <div style={css("width:48%;border-radius:10px;background:var(--success);color:#fff;padding:0.9rem 1.15rem;text-align:center")}>
          <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.05em;opacity:.9")}>5 · GOAL</div><div style={css("font-size:var(--text-md);font-weight:600")}>{d.flowGoal}</div>
        </div>
        {arrow}
        <div style={css("width:84%;border-radius:10px;background:var(--accent-soft);border:1.5px dashed var(--accent-dim);padding:0.8rem 1rem 0.85rem")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem;margin-bottom:0.55rem")}>
            <span style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;display:inline-flex;align-items:center;gap:0.34rem;color:var(--accent)")}><span style={css("font-size:var(--text-lg);line-height:0.7")}>+</span>Bonus sales layer</span>
            <span style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--accent);background:var(--surface);border:1px solid var(--accent-dim);border-radius:999px;padding:0.14rem 0.55rem;white-space:nowrap")}>One page · after the goal</span>
          </div>
          <div style={css("font-size:var(--text-sm);font-weight:600;color:var(--fg);margin-bottom:0.5rem")}>Thank-you page + one-time offer</div>
          <div style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.5;margin-bottom:0.22rem")}><span style={css("color:var(--fg);font-weight:600")}>Thank-you.</span> {d.flowThankLine}</div>
          <div style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.5")}><span style={css("color:var(--fg);font-weight:600")}>Next step.</span> {d.flowUpsellLine}</div>
        </div>
      </div>
    );
  }

  if (id === "persona") {
    const quad = (border: string, label: string, labelColor: string, val: string) => (
      <div style={css("background:var(--surface);padding:0.95rem 1.05rem;border-left:2.5px solid " + border)}>
        <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:" + labelColor + ";margin-bottom:0.35rem")}>{label}</div>
        <div style={css("font-size:var(--text-xs);line-height:1.45;color:var(--fg)")}>{val}</div>
      </div>
    );
    return (
      <div>
        <div style={css("margin-bottom:1.1rem")}>
          <div style={css("font-size:var(--text-xl);font-weight:500;line-height:1.3")}>Your ideal fit</div>
          <div style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.5;margin-top:0.2rem")}>{d.personaSummary}</div>
        </div>
        <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border-soft);border:1px solid var(--border-soft);border-radius:12px;overflow:hidden")}>
          {quad("oklch(0.66 0.13 18)", "Pains", "oklch(0.62 0.13 20)", d.personaPains)}
          {quad("var(--success)", "Desires", "oklch(0.46 0.12 155)", d.personaDesires)}
          {quad("oklch(0.72 0.11 68)", "Objections", "oklch(0.55 0.1 68)", d.personaObjections)}
          {quad("var(--fg-faint)", "Awareness", "var(--fg-muted)", d.personaAwareness)}
        </div>
        <div style={css("margin-top:1rem;display:flex;gap:0.7rem;align-items:flex-start;padding:0.9rem 1rem;border-radius:12px;background:var(--accent-soft)")}>
          <span style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--accent);flex-shrink:0;margin-top:0.12rem")}>Hook</span>
          <div style={css("font-size:var(--text-xs);line-height:1.5;color:var(--fg)")}>{d.personaHook}</div>
        </div>
      </div>
    );
  }

  if (id === "copy") {
    const cap = "text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.15rem";
    const section = "margin-bottom:1.15rem;padding-bottom:1.15rem;border-bottom:1px solid var(--border-soft)";
    return (
      <div style={css("border:1px solid var(--border-soft);border-radius:12px;padding:1.5rem 1.7rem;background:var(--surface)")}>
        <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-4);margin-bottom:1.2rem;padding-bottom:1rem;border-bottom:1px solid var(--border-soft);flex-wrap:wrap")}>
          <div style={css("font-size:var(--text-xs);color:var(--fg-faint)")}>Build brief — every block maps 1:1 to a wireframe section.</div>
          <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--accent);border:1px solid var(--accent-soft);border-radius:999px;padding:0.2rem 0.6rem;white-space:nowrap")}>Implementation-ready</div>
        </div>
        <div style={css(section)}>
          <div style={css(eyebrow)}>Hero · above the fold</div>
          <div style={css(cap)}>Headline · H1</div>
          <div style={css("font-size:var(--text-lg);font-weight:500;line-height:1.3;margin-bottom:0.55rem")}>{d.copyHeadline}</div>
          <div style={css(cap)}>Subhead</div>
          <div style={css("font-size:var(--text-xs);color:var(--fg-muted);line-height:1.5;margin-bottom:0.55rem")}>{d.copySubhead}</div>
          <div style={css(cap)}>Primary button</div>
          <div style={css("font-size:var(--text-xs);font-weight:600;color:var(--accent)")}>{d.copyCta}</div>
        </div>
        <div style={css(section)}>
          <div style={css(eyebrow)}>Proof</div>
          <div style={css("font-size:var(--text-xs);line-height:1.5")}>{d.copyProof}</div>
        </div>
        <div>
          <div style={css(eyebrow)}>Final CTA · guarantee</div>
          <div style={css("font-size:var(--text-xs);font-weight:600;color:var(--accent);margin-bottom:0.35rem")}>{d.copyCta}</div>
          <div style={css("font-size:var(--text-xs);line-height:1.55")}>{d.copyGuarantee}</div>
        </div>
      </div>
    );
  }

  if (id === "wireframe") {
    const cap = "text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.5rem";
    return (
      <div>
        <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.9rem")}>Landing page — your copy poured into the layout</div>
        <div style={css("border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--surface);width:100%")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;padding:0.7rem 1.1rem;border-bottom:1px solid var(--border-soft)")}><div style={css("width:4.5rem;height:0.85rem;background:var(--border);border-radius:4px")} /><span style={css("padding:0.3rem 0.75rem;background:var(--accent-soft);color:var(--accent);border-radius:6px;font-size:var(--text-2xs);font-weight:600;white-space:nowrap")}>{d.copyCta}</span></div>
          <div style={css("padding:1.7rem 1.4rem;text-align:center;background:var(--surface-alt)")}>
            <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--accent);margin-bottom:0.55rem")}>Hero</div>
            <div style={css("font-size:var(--text-xl);font-weight:500;line-height:1.25;max-width:27rem;margin:0 auto 0.5rem")}>{d.copyHeadline}</div>
            <div style={css("font-size:var(--text-sm);color:var(--fg-muted);line-height:1.5;max-width:25rem;margin:0 auto 1.1rem")}>{d.copySubhead}</div>
            <div style={css("display:flex;gap:0.45rem;max-width:21rem;margin:0 auto")}><div style={css("flex:1;height:2.2rem;background:var(--surface);border:1px solid var(--border);border-radius:7px;display:flex;align-items:center;padding:0 0.7rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>Your best email</div><span style={css("padding:0 0.95rem;display:grid;place-items:center;height:2.2rem;background:" + GRAD + ";color:#fff;border-radius:7px;font-size:var(--text-2xs);font-weight:600;white-space:nowrap")}>{d.copyCta}</span></div>
            <div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:0.65rem")}>{d.copyPrivacy}</div>
          </div>
          <div style={css("padding:0.9rem 1.1rem;border-top:1px solid var(--border-soft);text-align:center")}><div style={css(cap)}>Social proof · client to provide</div><div style={css("display:flex;gap:0.55rem;justify-content:center")}>{[0, 1, 2, 3].map(i => <div key={i} style={css("width:3.2rem;height:1.5rem;background:var(--surface-alt);border:1px dashed var(--border);border-radius:5px")} />)}</div></div>
          <div style={css("padding:1.3rem 1.1rem;border-top:1px solid var(--border-soft);text-align:center;background:var(--surface-alt)")}>
            <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--accent);margin-bottom:0.55rem")}>Call to action</div>
            <div style={css("font-size:var(--text-md);font-weight:500;line-height:1.3;max-width:22rem;margin:0 auto 0.75rem")}>{d.copyHeadline}</div>
            <span style={css("display:inline-flex;padding:0.6rem 1.5rem;background:" + GRAD + ";color:#fff;border-radius:7px;font-size:var(--text-xs);font-weight:600")}>{d.copyCta}</span>
            <div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:0.6rem")}>{d.copyGuarantee}</div>
          </div>
        </div>
      </div>
    );
  }

  if (id === "devplan") {
    return (
      <div style={css("border:1px solid var(--border-soft);border-radius:12px;padding:1.5rem 1.7rem;background:var(--surface)")}>
        <div style={css(eyebrow)}>1 · Pages &amp; sections</div>
        <div style={css("display:flex;flex-direction:column;gap:0.45rem;margin-bottom:1.2rem;padding-bottom:1.2rem;border-bottom:1px solid var(--border-soft)")}>
          {d.devPages.map(p => <div key={p.name} style={css("font-size:var(--text-xs);line-height:1.5")}><b style={css("font-weight:500")}>{p.name}</b> <span style={css("color:var(--fg-muted)")}>— {p.desc}</span></div>)}
        </div>
        <div style={css(eyebrow)}>2 · Integrations</div>
        <div style={css("font-size:var(--text-xs);line-height:1.6;margin-bottom:1.2rem;padding-bottom:1.2rem;border-bottom:1px solid var(--border-soft)")}>{d.devIntegrations}</div>
        <div style={css(eyebrow)}>3 · Tech &amp; hosting</div>
        <div style={css("font-size:var(--text-xs);line-height:1.6")}>{d.devTech}</div>
      </div>
    );
  }

  if (id === "timeline") {
    const phase = (dot: string, glow: string, title: string, sub: string, last?: boolean) => (
      <div style={css("position:relative;" + (last ? "" : "margin-bottom:1.1rem"))}>
        <span style={css("position:absolute;left:-1.5rem;top:0.1rem;width:0.72rem;height:0.72rem;border-radius:50%;background:" + dot)} />
        <div style={css("font-size:var(--text-md);font-weight:500")}>{title}</div>
        <div style={css("font-size:var(--text-sm);color:var(--fg-muted)")}>{sub}</div>
      </div>
    );
    return (
      <div>
        <div style={css("position:relative;padding-left:1.5rem;margin-bottom:1.3rem")}>
          <div style={css("position:absolute;left:0.33rem;top:0.5rem;bottom:0.5rem;width:2px;background:var(--border)")} />
          {phase("var(--accent)", "var(--accent-soft)", "Phase 1 · Design", "Week 1 — pages & layout")}
          {phase("var(--accent)", "var(--accent-soft)", "Phase 2 · Build", "Weeks 2–3 — code & wire up")}
          {phase("var(--success)", "oklch(0.94 0.04 155)", "Phase 3 · Launch", "Week 4 — QA + go live", true)}
        </div>
        <div style={css("display:flex;gap:2.5rem;padding-top:1.2rem;border-top:1px solid var(--border-soft)")}>
          <div><div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.3rem")}>Live date</div><div style={css("font-size:var(--text-xl);font-weight:500")}>{d.tlDeadline}</div></div>
          <div><div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-bottom:0.3rem")}>Budget</div><div style={css("font-size:var(--text-xl);font-weight:500")}>{d.tlBudget}</div></div>
        </div>
      </div>
    );
  }

  // finalplan
  const row = (label: string, node: ReactNode) => (
    <div style={css("margin-bottom:1.1rem;padding-bottom:1.1rem;border-bottom:1px solid var(--border-soft)")}>
      <div style={css(eyebrow)}>{label}</div>
      <div style={css("font-size:var(--text-xs);line-height:1.6")}>{node}</div>
    </div>
  );
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:12px;padding:1.5rem 1.7rem;background:var(--surface)")}>
      {row("Summary", <><b style={css("font-weight:500")}>Goal:</b> {d.fpGoal} <br /><b style={css("font-weight:500")}>Primary metric:</b> {d.flowGoal.toLowerCase()} from your funnel.</>)}
      {row("1 · Funnel flow", <>{d.flowTraffic} → Landing → {d.flowAfter} → value nurture → <b style={css("font-weight:500")}>{d.flowGoal}</b> <span style={css("color:var(--fg-muted)")}>→ expansion</span></>)}
      {row("2 · Persona", <>{d.personaSummary}<br /><span style={css("color:var(--fg-muted)")}>Pains:</span> {d.personaPains} <span style={css("color:var(--fg-muted)")}>· Wants:</span> {d.personaDesires}</>)}
      {row("3 · Copy", <><b style={css("font-weight:500")}>“{d.copyHeadline}”</b><br />{d.copySubhead}<br /><span style={css("color:var(--fg-muted)")}>CTA:</span> {d.copyCta} <span style={css("color:var(--fg-muted)")}>· Proof:</span> {d.copyProof}</>)}
      {row("4 · Build", <><span style={css("color:var(--fg-muted)")}>Pages:</span> {d.devPages.map(p => p.name).join(" · ")}<br /><span style={css("color:var(--fg-muted)")}>Stack:</span> {d.devIntegrations}. {d.devTech}</>)}
      {row("5 · Timeline & budget", <>Design (wk 1) → Build (wk 2–3) → Launch (wk 4). <span style={css("color:var(--fg-muted)")}>Live:</span> {d.tlDeadline} <span style={css("color:var(--fg-muted)")}>· Budget:</span> {d.tlBudget}</>)}
      <div>
        <div style={css(eyebrow)}>6 · Expansion — grow the relationship</div>
        <div style={css("font-size:var(--text-xs);line-height:1.6")}>{d.fpUpsell}</div>
      </div>
    </div>
  );
}
