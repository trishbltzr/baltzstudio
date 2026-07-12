"use client";

import { useEffect, useRef, useState } from "react";
import { css, eyebrowStyle } from "../helpers";
import { Icon } from "../icons";
import { parseBrief, fromLink, fromFiles, mergeKnow, type Know } from "./knowledge";

const INPUT = "width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:var(--radius);padding:0.5rem 0.62rem;font-size:0.82rem;font-family:inherit;background:var(--surface-alt);color:var(--fg);outline:none";
const emptyKnow: Know = { data: {}, sources: {} };

// Jump-start ingestion. Audit mode: website link + brand guideline. Funnel mode:
// existing funnel link + working files + pasted brief we actually "understand".
export function QuickStart({ mode, accent, known, onApply, onContinue, showToast, mobile, clientName }: {
  mode: "audit" | "funnel";
  accent: string;
  known: Know;
  onApply: (delta: Know) => void;
  onContinue?: () => void;
  showToast?: (m: string) => void;
  mobile?: boolean;
  clientName?: string;
}) {
  const [link, setLink] = useState("");
  const [brief, setBrief] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const knownCount = Object.keys(known.data).length;

  useEffect(() => {
    const rememberedUrl = known.data.url;
    setLink(typeof rememberedUrl === "string" ? rememberedUrl : "");
    setFiles([]);
    setBrief("");
  }, [clientName, known.data.url]);

  const understand = () => {
    let delta: Know = emptyKnow;
    if (link.trim()) delta = mergeKnow(delta, fromLink(link, mode));
    if (files.length) delta = mergeKnow(delta, fromFiles(mode === "audit" ? "brand" : "working", files.length));
    if (mode === "funnel" && brief.trim()) delta = mergeKnow(delta, parseBrief(brief));
    const n = Object.keys(delta.data).length;
    if (n === 0) { showToast?.("Add a link, files or a brief to pull from"); return; }
    onApply(delta);
    showToast?.(mode === "funnel" ? "Understood your brief — pulled " + n + " answers, only the gaps remain" : "Analyzed — pulled " + n + " details to prefill the audit");
    onContinue?.();
  };

  const label = mode === "audit" ? "Use client memory" : "Auto-fill this funnel";
  const sub = mode === "audit"
    ? `${knownCount} saved detail${knownCount === 1 ? " is" : "s are"} ready from ${clientName || "this client"}'s workspace. Add or confirm the site and brand guideline before continuing.`
    : "Add a link, working files or paste a brief. We read the brief and answer the questions for you, so you’re not reinventing the wheel.";

  return (
    <div style={css("border:1px solid color-mix(in srgb," + accent + " 22%,var(--border-soft) 78%);border-radius:var(--radius-panel);background:color-mix(in srgb," + accent + " 5%,var(--surface) 95%);padding:" + (mobile ? "0.9rem 1rem" : "1.05rem 1.15rem"))}>
      <div style={css("display:flex;align-items:center;gap:0.55rem;margin-bottom:0.2rem")}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={css(eyebrowStyle(accent))}>{mode === "audit" ? `Client memory · ${clientName || "Matched"}` : "Jump-start"}</div>
          <div style={css("font-size:0.95rem;font-weight:500;line-height:1.2;margin-top:0.1rem")}>{label}</div>
        </div>
        {knownCount > 0 && <span style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.7rem;font-weight:500;color:" + accent + ";background:var(--surface);border:1px solid var(--border-soft);border-radius:999px;padding:0.22rem 0.55rem;flex-shrink:0")}><Icon name="check" size={11} />{knownCount} known</span>}
      </div>
      <p style={css("margin:0 0 0.85rem;font-size:0.78rem;color:var(--fg-muted);line-height:1.5")}>{sub}</p>

      <div style={css("display:flex;flex-direction:column;gap:0.55rem")}>
        <label style={css("display:flex;flex-direction:column;gap:0.28rem;font-size:0.72rem;font-weight:500;color:var(--fg-muted)")}>
          {mode === "audit" ? "Website URL" : "Link to an existing funnel (optional)"}
          <div style={css("display:flex;gap:0.4rem")}>
            <input value={link} onChange={e => setLink(e.target.value)} placeholder={mode === "audit" ? "brand.com" : "get.brand.com/offer"} className="pt-input" style={css(INPUT)} />
          </div>
        </label>

        <div style={css("display:flex;flex-direction:column;gap:0.28rem;font-size:0.72rem;font-weight:500;color:var(--fg-muted)")}>
          {mode === "audit" ? "Brand guideline (optional)" : "Working files (optional)"}
          <button type="button" onClick={() => fileRef.current?.click()} style={css("display:flex;align-items:center;gap:0.5rem;width:100%;box-sizing:border-box;border:1px dashed var(--border);border-radius:var(--radius);background:var(--surface);padding:0.55rem 0.65rem;cursor:pointer;text-align:left")}>
            <Icon name="clip" size={15} />
            <span style={css("flex:1;min-width:0;font-size:0.78rem;color:" + (files.length ? "var(--fg)" : "var(--fg-faint)"))}>{files.length ? files.join(", ") : (mode === "audit" ? "Upload brand-guidelines.pdf" : "Upload working files (Figma, docs, decks…)")}</span>
            {files.length > 0 && <span style={css("font-size:0.7rem;color:" + accent + ";font-weight:500")}>{files.length} file{files.length === 1 ? "" : "s"}</span>}
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={e => { const names = Array.from(e.target.files || []).map(f => f.name); if (names.length) setFiles(prev => [...prev, ...names]); e.currentTarget.value = ""; }} />
        </div>

        {mode === "funnel" && (
          <label style={css("display:flex;flex-direction:column;gap:0.28rem;font-size:0.72rem;font-weight:500;color:var(--fg-muted)")}>
            Paste a brief — we’ll read it and answer the questions
            <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={mobile ? 4 : 5} placeholder="Paste the client’s brief, proposal notes, or a rough description of the funnel, offer, audience and goal…" className="pt-input" style={css(INPUT + ";resize:vertical;line-height:1.5")} />
          </label>
        )}
      </div>

      <div style={css("display:flex;align-items:center;gap:0.6rem;margin-top:0.85rem;flex-wrap:wrap")}>
        <button type="button" onClick={understand} className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.42rem;height:2.15rem;padding:0 1rem;border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;font-size:0.8rem;font-weight:500;cursor:pointer")}>
          <Icon name="sparkle" size={14} />{mode === "funnel" ? "Understand & auto-fill" : "Analyze & prefill"}
        </button>
        {onContinue && <button type="button" onClick={onContinue} className="pt-softbtn" style={css("display:inline-flex;align-items:center;justify-content:center;height:2.15rem;padding:0 .9rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:.76rem;font-weight:500;cursor:pointer")}>{knownCount ? "Use saved memory" : "Continue without prefill"}</button>}
      </div>
    </div>
  );
}
