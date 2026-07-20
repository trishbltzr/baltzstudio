"use client";

import { useState } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";

async function copyText(value: string) {
  try { await navigator.clipboard.writeText(value); return true; } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
}

export function ShareLinkDialog({ title, clientName, url, onClose, showToast }: { title: string; clientName: string; url: string; onClose: () => void; showToast: (message: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const ok = await copyText(url);
    setCopied(ok);
    showToast(ok ? "Client link copied" : "Select and copy the client link");
  };
  return <div role="dialog" aria-modal="true" aria-label={`Share ${title}`} onClick={event => { event.stopPropagation(); onClose(); }} style={css("position:fixed;inset:0;z-index:125;background:rgba(35,25,18,.46);padding:1rem;display:grid;place-items:center") }>
    <section onClick={event => event.stopPropagation()} style={css("width:min(29rem,100%);border:1px solid var(--border);border-radius:1rem;background:var(--surface);box-shadow:0 22px 60px rgba(30,20,16,.24);padding:1.1rem") }>
      <div style={css("display:flex;align-items:flex-start;gap:.7rem") }><span style={css("width:2.1rem;height:2.1rem;border-radius:.65rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0") }><Icon name="send" size={14}/></span><div style={{ flex: 1, minWidth: 0 }}><h3 style={css("margin:0;font-size:.95rem;font-weight:500")}>Share with {clientName}</h3><p style={css("margin:.3rem 0 0;font-size:.72rem;line-height:1.45;color:var(--fg-muted)")}>The final funnel plan is now available in the client&apos;s Approvals tab. Copy this direct review link.</p></div><button type="button" aria-label="Close share popup" onClick={onClose} className="pt-iconbtn" style={css("width:2rem;height:2rem;border:1px solid var(--border);border-radius:50%;background:var(--surface);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer") }><Icon name="x" size={13}/></button></div>
      <label style={css("display:block;margin-top:1rem") }><span style={css("display:block;font-size:.64rem;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-faint);margin-bottom:.35rem")}>Client review link</span><div style={css("display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.45rem") }><input readOnly value={url} onFocus={event => event.currentTarget.select()} aria-label="Client review link" style={css("min-width:0;height:2.35rem;border:1px solid var(--border);border-radius:.72rem;background:var(--surface-alt);color:var(--fg-muted);font:inherit;font-size:.7rem;padding:0 .7rem;outline:none")}/><button type="button" onClick={() => void copy()} className="pt-op" style={css("height:2.35rem;padding:0 .85rem;border:0;border-radius:.72rem;background:var(--accent);color:#fff;font-size:.7rem;font-weight:500;cursor:pointer") }><Icon name="file" size={12}/> {copied ? "Copied" : "Copy link"}</button></div></label>
    </section>
  </div>;
}
