"use client";

import { useEffect, useRef, useState } from "react";
import { css, eyebrowStyle } from "../helpers";
import { Icon } from "../icons";
import { fromFiles, mergeKnow, type Know } from "./knowledge";

const INPUT = "width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:var(--radius);padding:0.58rem 0.72rem;font-size:0.88rem;font-family:inherit;background:var(--surface-alt);color:var(--fg);outline:none";
const SCAN_STEPS = [
  "Opening the website and finding key pages",
  "Reading offers, messaging, proof, and conversion paths",
  "Matching the evidence to every audit question",
  "Choosing the closest answers and adding review notes",
];
const WEBSITE_BUILD_STEPS = [
  "Reading the supplied website, brief, and copy",
  "Identifying the requested pages and existing content",
  "Mapping page purpose, messages, and actions",
  "Preparing the build intake for confirmation",
];
// AI Jumpstart reads public website pages and/or a pasted brief, then returns only
// evidence-backed questionnaire answers. Known answers are sent as exclusions so
// the client is asked only for genuine gaps.
export function QuickStart({ mode, accent, known, questionLabels, onApply, onContinue, showToast, mobile, clientName, clientId }: {
  mode: "audit" | "brand" | "seo" | "website_builder" | "funnel";
  accent: string;
  known: Know;
  questionLabels: Record<string, string>;
  onApply: (delta: Know) => void;
  onContinue?: () => void;
  showToast?: (m: string) => void;
  mobile?: boolean;
  clientName?: string;
  clientId?: string;
}) {
  const [link, setLink] = useState("");
  const [brief, setBrief] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [socialLinks, setSocialLinks] = useState("");
  const [ga4Properties, setGa4Properties] = useState<Array<{ property: string; displayName: string; account: string }>>([]);
  const [ga4Property, setGa4Property] = useState("");
  const [ga4Checking, setGa4Checking] = useState(false);
  const [ga4Configured, setGa4Configured] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanStep, setScanStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const previousClient = useRef(clientName);
  const activeScanSteps = mode === "website_builder" ? WEBSITE_BUILD_STEPS : SCAN_STEPS;
  const relevantKnown = Object.fromEntries(Object.entries(known.data).filter(([key]) => {
    if (!questionLabels[key]) return false;
    const source = known.sources[key] || "";
    if (/^(Website scan|AI inference|AI Jumpstart)/.test(source)) return false;
    return key === "nickname" || key === "clientEmail" || /Audit intake|Funnel intake|Client-confirmed/.test(source);
  }));
  const knownCount = Object.keys(relevantKnown).length;
  const hasPreviousScan = Object.values(known.sources).some(source => /^(Website scan|AI inference|AI Jumpstart)/.test(source));

  useEffect(() => {
    const clientChanged = previousClient.current !== clientName;
    previousClient.current = clientName;
    const rememberedUrl = known.data.url;
    setLink(current => clientChanged || !current ? (typeof rememberedUrl === "string" ? rememberedUrl : "") : current);
    if (clientChanged) {
      setFiles([]);
      setBrief("");
      setScanError("");
    }
  }, [clientName, known.data.url]);

  useEffect(() => {
    if (mode !== "seo" || !clientId) return;
    let cancelled = false;
    setGa4Checking(true);
    fetch(`/api/integrations/ga4/status?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then(async response => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 503) { if (!cancelled) setGa4Configured(false); return; }
          throw new Error(payload?.error || "Unable to check GA4.");
        }
        if (cancelled) return;
        const next = payload?.connected && Array.isArray(payload.properties) ? payload.properties : [];
        setGa4Properties(next);
        setGa4Property(next[0]?.property?.replace("properties/", "") || "");
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setGa4Checking(false); });
    return () => { cancelled = true; };
  }, [clientId, mode]);

  useEffect(() => {
    if (!scanning) { setScanStep(0); return; }
    const timer = window.setInterval(() => setScanStep(step => Math.min(step + 1, activeScanSteps.length - 1)), 1_150);
    return () => window.clearInterval(timer);
  }, [activeScanSteps.length, scanning]);

  const understand = async () => {
    if (scanning) return;
    if ((mode === "audit" || mode === "seo") && !link.trim()) { setScanError("Add the website URL you want to audit."); return; }
    if (mode === "website_builder" && !link.trim() && !brief.trim() && !files.length) { setScanError("Add an existing website, upload a brief or copy document, or paste the planning notes."); return; }
    if (mode === "brand" && !link.trim() && !files.length && !socialLinks.trim()) { setScanError("Add brand guidelines, a website, or a social profile."); return; }
    if (mode === "funnel" && !link.trim() && !brief.trim() && !files.length) { setScanError("Add a funnel URL, upload working copy, or paste a brief."); return; }
    setScanning(true);
    setScanError("");
    try {
      const guidelineFiles = mode === "brand" || mode === "funnel" || mode === "website_builder" ? await Promise.all(files.slice(0, mode === "brand" ? 1 : 3).map(async file => {
        if (file.size > 4_000_000) throw new Error(`${file.name} is larger than 4 MB. Compress it before uploading.`);
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        bytes.forEach(byte => { binary += String.fromCharCode(byte); });
        return { name: file.name, type: file.type || "application/pdf", base64: window.btoa(binary) };
      })) : [];
      let ga4Brief = "";
      if (mode === "seo" && clientId && ga4Property) {
        const ga4Response = await fetch("/api/integrations/ga4/jumpstart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId, propertyId: ga4Property }) });
        const ga4Payload = await ga4Response.json().catch(() => null);
        if (ga4Response.ok) ga4Brief = `Verified GA4 28-day context:\n${JSON.stringify(ga4Payload).slice(0, 14000)}`;
      }
      const response = await fetch("/api/ai/jumpstart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, url: link, brief: [brief, ga4Brief].filter(Boolean).join("\n\n"), socialLinks: socialLinks.split(/\n|,/).map(value => value.trim()).filter(Boolean), guidelineFiles, clientName, known: relevantKnown }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "AI Jumpstart could not analyze these sources.");
      if (!payload?.result?.data || !payload?.result?.sources) throw new Error("AI Jumpstart returned an incomplete prefill.");
      let delta = payload.result as Know;
      if (files.length) delta = mergeKnow(delta, fromFiles(mode === "brand" || mode === "audit" ? "brand" : "working", files.length));
      const n = typeof payload.result.answeredCount === "number" ? payload.result.answeredCount : Object.keys(delta.data).length;
      const pages = Array.isArray(payload.pagesScanned) ? payload.pagesScanned.length : 0;
      onApply(delta);
      showToast?.(pages
        ? `We found ${n} answer${n === 1 ? "" : "s"} across ${pages} page${pages === 1 ? "" : "s"} — review starts now`
        : `We found ${n} answer${n === 1 ? "" : "s"} in the supplied material — review starts now`);
      onContinue?.();
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Unable to analyze these sources.");
    } finally {
      setScanning(false);
    }
  };

  const label = mode === "website_builder" ? "Choose the source. We’ll map the pages and copy." : mode === "brand" ? "Add your brand sources. We’ll build the first pass." : mode === "seo" ? "Connect analytics and scan the website." : mode === "audit" ? "Drop the URL. We’ll do the first pass." : "AI Jumpstart this funnel";
  const sub = mode === "website_builder" ? "Use the existing website, upload a brief or copy document, paste planning notes, or combine them. You’ll confirm the exact pages we will design before the brief is generated." : mode === "brand" ? "Upload existing guidelines and add the website or public social profiles. AI will prefill the brand intake, then you’ll review every answer." : mode === "seo" ? "GA4 adds real behavioral evidence when connected. The website scan still works on its own when GA4 is unavailable." : mode === "audit"
    ? "We’ll use the public website to prefill the Audit, then take you through every answer so you can confirm or change it."
    : "Add a funnel link or paste the brief. AI checks the source against saved client memory and prefills only supported answers.";
  const remainingCount = Math.max(0, Object.keys(questionLabels).length - knownCount);

  return (
    <div style={css("border:1px solid color-mix(in srgb," + accent + " 22%,var(--border-soft) 78%);border-radius:var(--radius-panel);background:color-mix(in srgb," + accent + " 5%,var(--surface) 95%);padding:" + (mobile ? "0.9rem 1rem" : "1.05rem 1.15rem"))}>
      <div style={css("display:flex;align-items:center;gap:0.55rem;margin-bottom:0.2rem")}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={css(eyebrowStyle(accent) + ";font-size:0.76rem")}>{mode === "website_builder" ? `Website revamp · ${clientName || "Matched"}` : mode === "brand" ? `Brand prefill · ${clientName || "Matched"}` : mode === "seo" ? `SEO prefill · ${clientName || "Matched"}` : mode === "audit" ? `Website prefill · ${clientName || "Matched"}` : "Jump-start"}</div>
          <div style={css("font-size:0.95rem;font-weight:500;line-height:1.2;margin-top:0.1rem")}>{label}</div>
        </div>
        {hasPreviousScan && <span style={css("display:inline-flex;align-items:center;gap:0.3rem;font-size:0.76rem;font-weight:500;color:" + accent + ";background:var(--surface);border:1px solid var(--border-soft);border-radius:999px;padding:0.25rem 0.6rem;flex-shrink:0")}><Icon name="check" size={12} />Previous scan ready</span>}
      </div>
      <p style={css("margin:0 0 0.9rem;font-size:0.84rem;color:var(--fg-muted);line-height:1.55")}>{sub}</p>

      {scanError && <div role="alert" style={css("margin:0 0 0.75rem;border:1px solid color-mix(in srgb,var(--danger) 30%,var(--border) 70%);border-radius:var(--radius);background:var(--surface);padding:0.7rem 0.8rem;font-size:0.8rem;line-height:1.5;color:var(--danger)")}>{scanError}</div>}

      <div style={css("display:flex;flex-direction:column;gap:0.55rem")}>
        <label style={css("display:flex;flex-direction:column;gap:0.32rem;font-size:0.8rem;font-weight:500;color:var(--fg-muted)")}>
          {mode === "website_builder" ? "Existing website URL (optional)" : mode === "brand" ? "Website URL (optional when guidelines are uploaded)" : mode === "seo" || mode === "audit" ? "Website URL" : "Link to an existing funnel (optional)"}
          <div style={css("display:flex;gap:0.4rem")}>
            <input value={link} onChange={e => setLink(e.target.value)} placeholder={mode === "funnel" ? "get.brand.com/offer" : "brand.com"} className="pt-input" style={css(INPUT)} />
          </div>
        </label>

        {(mode === "brand" || mode === "audit" || mode === "funnel" || mode === "website_builder") && <div style={css("display:flex;flex-direction:column;gap:0.32rem;font-size:0.8rem;font-weight:500;color:var(--fg-muted)")}>
          {mode === "brand" || mode === "audit" ? "Brand guidelines (optional)" : mode === "website_builder" ? "Existing brief or copy (optional)" : "Working copy (optional)"}
          <button type="button" onClick={() => fileRef.current?.click()} style={css("display:flex;align-items:center;gap:0.5rem;width:100%;box-sizing:border-box;border:1px dashed var(--border);border-radius:var(--radius);background:var(--surface);padding:0.55rem 0.65rem;cursor:pointer;text-align:left")}>
            <Icon name="clip" size={15} />
            <span style={css("flex:1;min-width:0;font-size:0.82rem;color:" + (files.length ? "var(--fg)" : "var(--fg-faint)"))}>{files.length ? files.map(file => file.name).join(", ") : (mode === "brand" || mode === "audit" ? "Upload brand-guidelines.pdf" : mode === "website_builder" ? "Upload a brief or copy document" : "Upload copy (PDF, DOCX, TXT or Markdown)")}</span>
            {files.length > 0 && <span style={css("font-size:0.7rem;color:" + accent + ";font-weight:500")}>{files.length} file{files.length === 1 ? "" : "s"}</span>}
          </button>
          <input ref={fileRef} type="file" multiple={mode !== "brand"} hidden accept={mode === "brand" ? ".pdf,.txt,.md" : mode === "funnel" || mode === "website_builder" ? ".pdf,.doc,.docx,.txt,.md" : undefined} onChange={e => { const next = Array.from(e.target.files || []); if (next.length) setFiles(mode === "brand" ? next.slice(0, 1) : prev => [...prev, ...next].slice(0, 3)); e.currentTarget.value = ""; }} />
        </div>}

        {mode === "brand" && <label style={css("display:flex;flex-direction:column;gap:0.32rem;font-size:0.8rem;font-weight:500;color:var(--fg-muted)")}>Public social profiles (optional)<textarea value={socialLinks} onChange={event => setSocialLinks(event.target.value)} rows={3} placeholder="Instagram, TikTok, LinkedIn — one URL per line" className="pt-input" style={css(INPUT + ";resize:vertical;line-height:1.5")} /></label>}

        {mode === "seo" && <div style={css("border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);padding:0.7rem 0.75rem") }><div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.7rem") }><div><div style={css("font-size:0.8rem;font-weight:500")}>Google Analytics 4</div><div style={css("font-size:0.7rem;color:var(--fg-muted);margin-top:0.15rem")}>{ga4Properties.length ? "Connected — choose the property to import." : ga4Configured ? "Connect the client’s GA4 for behavioral evidence." : "Not configured yet — website-only Jumpstart remains available."}</div></div>{!ga4Properties.length && ga4Configured && clientId && <button type="button" onClick={() => window.location.assign(`/api/integrations/ga4/connect?clientId=${encodeURIComponent(clientId)}`)} disabled={ga4Checking} className="pt-softbtn" style={css("min-height:2rem;padding:0 0.75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:0.72rem;font-weight:500;cursor:pointer")}>Connect GA4</button>}</div>{ga4Properties.length > 0 && <select value={ga4Property} onChange={event => setGa4Property(event.target.value)} style={css(INPUT + ";margin-top:0.6rem")}>{ga4Properties.map(property => <option key={property.property} value={property.property.replace("properties/", "")}>{property.displayName} · {property.account}</option>)}</select>}</div>}

        {(mode === "funnel" || mode === "website_builder") && (
          <label style={css("display:flex;flex-direction:column;gap:0.32rem;font-size:0.8rem;font-weight:500;color:var(--fg-muted)")}>
            {mode === "website_builder" ? "Paste a brief, existing copy, or planning notes (optional)" : "Paste a brief or extra direction (optional)"}
            <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={mobile ? 4 : 5} placeholder={mode === "website_builder" ? "Paste the requested pages, goals, existing copy, or any build requirements…" : "Paste the client’s brief, proposal notes, or direction for turning the uploaded copy into a landing page…"} className="pt-input" style={css(INPUT + ";resize:vertical;line-height:1.5")} />
          </label>
        )}
      </div>

      <div style={css("display:flex;align-items:center;gap:0.6rem;margin-top:0.85rem;flex-wrap:wrap")}>
        <button type="button" onClick={() => void understand()} disabled={scanning} className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.42rem;min-height:2.35rem;padding:0 1.05rem;border:none;border-radius:var(--radius-pill);background:" + accent + ";color:#fff;font-size:0.84rem;font-weight:500;cursor:" + (scanning ? "wait" : "pointer") + ";opacity:" + (scanning ? ".72" : "1"))}>
          <Icon name="sparkle" size={15} />{scanning ? (mode === "website_builder" ? "Reading sources…" : "Scanning website…") : mode === "funnel" || mode === "website_builder" ? "AI understand & prefill" : `Scan & prefill ${remainingCount} questions`}
        </button>
        {onContinue && !scanning && hasPreviousScan && <button type="button" onClick={onContinue} className="pt-softbtn" style={css("display:inline-flex;align-items:center;justify-content:center;min-height:2.35rem;padding:0 .95rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:.82rem;font-weight:500;cursor:pointer")}>Use previous scan</button>}
      </div>
      <p aria-live="polite" style={css("margin:0.55rem 0 0;font-size:0.78rem;line-height:1.45;color:var(--fg-muted)")}>{scanning ? activeScanSteps[scanStep] + "…" : mode === "website_builder" ? "Next, you’ll confirm the final pages, page purpose, copy direction, and build requirements." : "Next, you’ll review the prefilled Audit one question at a time."}</p>
    </div>
  );
}
