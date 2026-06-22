import { X } from "lucide-react";

const prepListItems = [
  { label: "Brand core", desc: "Origin, offer, buyer, proof, and non-negotiables are shaped into the message the site needs to protect." },
  { label: "Page and content map", desc: "The pages, sections, calls to action, testimonials, and media become the working launch inventory." },
  { label: "Visual direction", desc: "Existing assets, references, colors, and typography are gathered so recommendations stay on-brand." },
  { label: "Systems and access", desc: "Platform, domain, email, analytics, booking, payment, and form access are checked before work can move." },
  { label: "Decision gaps", desc: "Anything marked unclear, outdated, missing, or not converting becomes a focused conversation point." },
  { label: "Next-step readiness", desc: "The audit, prep list, and access notes show whether the next move is a guided review, WIAW, or another action." },
];

export function CocoonPrepListPopup({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="cocoon-popup-backdrop" onClick={onClose} />
      <div className="cocoon-popup" role="dialog" aria-modal="true" aria-label="Prep list">
        <div className="cocoon-popup-head">
          <div>
            <span>Internal process</span>
            <h3>Prep List</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close prep list"><X size={16} /></button>
        </div>
        <div style={{ padding: "1.25rem", display: "grid", gap: "0.75rem", fontSize: "var(--text-sm)", color: "var(--fg)", lineHeight: 1.6 }}>
          <p style={{ margin: 0, color: "var(--fg-muted)" }}>This turns your Cocoon answers into a build-readiness map: what to collect, what to confirm, and what needs a decision before the audit can become a practical next step.</p>
          {prepListItems.map(item => (
            <div key={item.label} style={{ padding: "0.75rem", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border-soft)" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.15rem" }}>{item.label}</div>
              <div style={{ color: "var(--fg-muted)", fontSize: "var(--text-xs)" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
