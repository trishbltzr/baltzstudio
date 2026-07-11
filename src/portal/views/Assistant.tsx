"use client";

import { useMemo, useState } from "react";
import { Icon } from "../icons";
import { activeJourneyGate, clientJourneyMessaging, css, laneMeta } from "../helpers";
import type { PortalState } from "../store";
import type { Owner } from "../types";

interface AsstMsg { lane: Owner; who: string; text: string; time: string }
const BASE_SEED: AsstMsg[] = [
  { lane: "client", who: "Flora", text: "Can we swap the hero photo for the new product shot?", time: "8:40 AM" },
  { lane: "ai", who: "Assistant", text: "On it — I've queued the hero swap and optimised the image. Noa will confirm before it goes live.", time: "8:40 AM" },
  { lane: "studio", who: "Noa · Studio", text: "Looks great with the new shot. Approving now — live in ~10 min.", time: "8:52 AM" },
];
const LEGEND: [Owner, string][] = [["studio", "Studio"], ["ai", "Assistant"], ["client", "You"], ["gate", "Milestone"]];

export function Assistant({ state }: { state: PortalState }) {
  const [customMsgs, setCustomMsgs] = useState<AsstMsg[]>([]);
  const [draft, setDraft] = useState("");
  const gateCopy = clientJourneyMessaging(activeJourneyGate(state.journeyGates));
  const msgs = useMemo(() => [...BASE_SEED, { lane: "gate" as const, who: "Milestone", text: gateCopy.assistantItem, time: "9:01 AM" }, ...customMsgs], [customMsgs, gateCopy.assistantItem]);
  const send = () => {
    const t = draft.trim();
    if (!t) return;
    setCustomMsgs(messages => [...messages, { lane: "client", who: "Flora", text: t, time: "Now" }]);
    setDraft("");
  };

  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);display:flex;flex-direction:column;overflow:hidden")}>
      <div style={css("padding:0.85rem 1.1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;gap:0.65rem")}>
        <span style={css("width:2.1rem;height:2.1rem;border-radius:50%;background:var(--lane-ai-soft);color:var(--lane-ai);display:grid;place-items:center")}><Icon name="layers" size={15} /></span>
        <div style={{ flex: 1 }}><div style={css("font-weight:500;font-size:0.9rem")}>In Full Flight Assistant</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>Studio + AI, One Thread</div></div>
        <div style={css("display:flex;gap:var(--space-3);flex-wrap:wrap")}>{LEGEND.map(([k, l]) => { const lm = laneMeta(k); return <span key={k} style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.68rem;color:var(--fg-muted)")}><span style={css("width:0.55rem;height:0.55rem;border-radius:50%;background:" + lm.c)} />{l}</span>; })}</div>
      </div>
      <div style={css("flex:1;padding:1.1rem;display:flex;flex-direction:column;gap:0.8rem;min-height:18rem;max-height:26rem;overflow-y:auto;background:var(--surface-alt)")}>
        {msgs.map((m, i) => {
          const lm = laneMeta(m.lane);
          const mine = m.lane === "client";
          return (
            <div key={i} style={css("display:flex;flex-direction:column;align-items:" + (mine ? "flex-end" : "flex-start"))}>
              <div style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.58rem;font-weight:500;letter-spacing:0.02em;color:color-mix(in srgb," + lm.c + " 60%,black 40%);margin-bottom:0.22rem")}><span style={css("width:0.4rem;height:0.4rem;border-radius:50%;background:" + lm.c)} />{m.who}</div>
              <div style={css("max-width:82%;padding:0.6rem 0.85rem;border-radius:0.85rem;font-size:0.83rem;line-height:1.45;border:1px solid color-mix(in srgb," + lm.c + " 30%,transparent);background:" + (mine ? "var(--lane-client-soft)" : lm.s) + ";color:var(--fg)")}>{m.text}</div>
              <div style={css("font-size:0.62rem;color:var(--fg-faint);margin-top:0.2rem")}>{m.time}</div>
            </div>
          );
        })}
      </div>
      <div style={css("padding:0.7rem;border-top:1px solid var(--border-soft);display:flex;gap:var(--space-2);align-items:center")}>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Ask the assistant anything…" className="pt-input" style={css("flex:1;border:1px solid var(--border);border-radius:var(--radius);padding:0.55rem 0.75rem;font-size:var(--text-base);background:var(--surface-alt)")} />
        <button onClick={send} className="pt-op" style={css("width:2.3rem;height:2.3rem;border-radius:var(--radius);border:none;background:var(--accent);color:#fff;display:grid;place-items:center;cursor:pointer;flex-shrink:0")}><Icon name="send" size={16} /></button>
      </div>
    </div>
  );
}
