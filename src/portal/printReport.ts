"use client";

import { normalizePortalAuditExportProfile, type PortalAuditExportProfile } from "../lib/portalWorkspacePersistence";

// Turns an on-screen report node into a standalone printable document.

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, char =>
    char === "&" ? "&amp;" : char === "<" ? "&lt;" : char === ">" ? "&gt;" : "&quot;");
}

function printableReportNode(node: Element): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement;
  const sourceControls = Array.from(node.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea"));
  const clonedControls = Array.from(clone.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea"));

  clonedControls.forEach((control, index) => {
    const source = sourceControls[index];
    if (!source) return;
    if (source instanceof HTMLInputElement && source.type === "checkbox") {
      control.parentElement?.setAttribute("data-print-checked", source.checked ? "true" : "false");
      control.remove();
      return;
    }
    const text = document.createElement("span");
    text.className = "pdf-form-value";
    text.textContent = source instanceof HTMLSelectElement
      ? source.selectedOptions[0]?.textContent || source.value
      : source.value;
    control.replaceWith(text);
  });

  clone.querySelectorAll("[data-report-exclude],[data-report-internal],[data-client-visible='false'],button").forEach(element => element.remove());
  return clone;
}

export function reportDocumentHtml(node: Element | null | undefined, title: string, exportProfile?: PortalAuditExportProfile | null): string | null {
  if (typeof window === "undefined" || !node) return null;
  const printable = printableReportNode(node);
  const source = node as HTMLElement;
  const titleParts = title.split(" · ").map(part => part.trim()).filter(Boolean);
  const clientName = source.dataset.reportClient || titleParts[0] || "Client";
  const profile = normalizePortalAuditExportProfile(clientName, exportProfile);
  const brandMark = profile.brandName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "BS";
  const projectName = source.dataset.reportProject || title;
  const status = source.dataset.reportStatus || "Ready for review";
  const documentType = titleParts.at(-1) || "Report";
  const isFunnelPlan = source.hasAttribute("data-funnel-report-document");
  const preparedOn = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date());
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .map(link => `<link rel="stylesheet" href="${link.href}">`)
    .join("");
  const styles = Array.from(document.querySelectorAll("style"))
    .map(style => `<style>${style.innerHTML}</style>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${window.location.origin}/"><title>${escapeHtml(title)}</title>${links}${styles}<style>
    :root{--pdf-ink:#382620;--pdf-muted:#756862;--pdf-soft:#f6f1ee;--pdf-line:#e6ddd8;--pdf-accent:${profile.accent};--pdf-accent-soft:color-mix(in srgb,${profile.accent} 14%,white 86%);--pdf-dark:#412824;--accent:${profile.accent};--accent-soft:color-mix(in srgb,${profile.accent} 14%,white 86%);--surface:#fff;--surface-alt:#f7f3f1;--fg:#382620;--fg-muted:#756862;--fg-faint:#998b85;--border:#dfd5d0;--border-soft:#ebe4e0}
    *{box-sizing:border-box}
    html,body{width:210mm;margin:0;background:#fff}
    body{padding:0;color:var(--pdf-ink);font-family:Mallory,Inter,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .print-doc{width:210mm;margin:0 auto;padding:0 12mm 14mm;overflow:hidden}
    .pdf-cover{min-height:145mm;margin:0 -12mm 12mm;padding:15mm 25mm 12mm;display:flex;flex-direction:column;background:linear-gradient(145deg,#fff 0%,#fff 58%,#f8efed 100%);position:relative;overflow:hidden}
    .pdf-cover:after{content:"";position:absolute;width:112mm;height:112mm;border:1px solid color-mix(in srgb,var(--pdf-accent) 24%,transparent);border-radius:50%;right:-52mm;bottom:-42mm;box-shadow:0 0 0 18mm color-mix(in srgb,var(--pdf-accent) 6%,transparent),0 0 0 36mm color-mix(in srgb,var(--pdf-accent) 3%,transparent)}
    .pdf-brand{display:flex;align-items:center;gap:10px;font-size:9pt;font-weight:600;letter-spacing:.02em;position:relative;z-index:1}
    .pdf-brand-mark{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--pdf-accent);color:#fff;font-size:9pt}
    .pdf-cover-copy{margin:auto 0;max-width:150mm;position:relative;z-index:1}
    .pdf-kicker{font-size:8.5pt;line-height:1.2;text-transform:uppercase;letter-spacing:.12em;color:var(--pdf-accent);font-weight:600}
    .pdf-cover h1{margin:7mm 0 0;font-size:29pt;line-height:1.05;letter-spacing:-.035em;font-weight:500;color:var(--pdf-dark)}
    .pdf-cover-client{margin:4mm 0 0;font-size:13pt;line-height:1.45;color:var(--pdf-muted)}
    .pdf-cover-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:15mm;padding-top:7mm;border-top:1px solid var(--pdf-line)}
    .pdf-meta-label{font-size:6.8pt;text-transform:uppercase;letter-spacing:.1em;color:#998b85}
    .pdf-meta-value{margin-top:2mm;font-size:9pt;line-height:1.35;color:var(--pdf-ink);font-weight:500}
    .pdf-contents{position:relative;z-index:1;display:grid;grid-template-columns:repeat(5,1fr);gap:2mm;padding-top:6mm;border-top:1px solid var(--pdf-line)}
    .pdf-contents span{font-size:7pt;line-height:1.35;color:var(--pdf-muted)}
    .pdf-contents b{display:block;margin-bottom:1mm;color:var(--pdf-accent);font-size:6.5pt;letter-spacing:.08em}
    .pdf-page-footer{margin-top:12mm;padding-top:4mm;border-top:1px solid var(--pdf-line);display:flex;justify-content:space-between;font-size:6.7pt;color:#9a8e88;background:#fff}
    [data-funnel-report-document]{border:0!important;border-radius:0!important;background:#fff!important;overflow:visible!important}
    [data-report-content]{padding:0!important}
    [data-report-plan-body]{max-width:none!important;margin:0!important;border:0!important;border-radius:0!important;padding:0!important;gap:0!important;overflow:visible!important;background:#fff!important}
    [data-report-section]{padding:8mm 0 0!important;margin:0!important;border-top:0!important;break-before:auto}
    [data-report-section]+[data-report-section]{margin-top:8mm!important;border-top:1px solid var(--pdf-line)!important}
    [data-report-section="overview"]{padding-top:0!important}
    [data-report-section="overview"]>div:nth-child(2){font-size:22pt!important;line-height:1.12!important;letter-spacing:-.025em!important;color:var(--pdf-dark)!important;margin-top:2.5mm!important}
    [data-report-section="overview"]>div:nth-child(3){font-size:9pt!important;line-height:1.5!important;color:var(--pdf-muted)!important;margin-top:2mm!important;max-width:150mm}
    [data-report-summary-grid]{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:3mm!important;margin-top:7mm!important}
    [data-report-card]{break-inside:avoid!important;page-break-inside:avoid!important;border-color:var(--pdf-line)!important;border-radius:3mm!important;background:#fff!important;box-shadow:none!important}
    [data-report-section="recommendations"]{break-before:auto;page-break-before:auto}
    [data-report-section="recommendations"] [data-report-card]{background:var(--pdf-soft)!important}
    [data-report-section="recommendations"]>div:last-child{display:block!important;margin-top:4mm!important}
    [data-report-section="recommendations"]>div:last-child [data-report-card]{display:flex!important;margin-top:3mm!important}
    [data-report-section="wireframe"]{break-before:auto;page-break-before:auto}
    [data-report-wireframe-block]{break-inside:auto!important;page-break-inside:auto!important}
    [data-report-section="launch"]{break-inside:auto;page-break-inside:auto}
    [data-report-task-wrap]{margin:9mm 0 0!important;border-top:1px solid var(--pdf-line)!important;break-before:auto;page-break-before:auto}
    [data-report-task-plan]{border:0!important;border-radius:0!important;overflow:visible!important;background:#fff!important}
    [data-report-task-plan]>div:first-child{padding:0 0 6mm!important;border-bottom:1px solid var(--pdf-line)!important;background:#fff!important}
    [data-report-print-only]{display:block!important}
    [data-report-task-list]{display:grid!important;grid-template-columns:1fr 1fr!important;gap:3mm!important;max-height:none!important;overflow:visible!important;padding:6mm 0 0!important}
    [data-report-task-row]{grid-template-columns:5mm minmax(0,1fr)!important;gap:3mm!important;min-height:15mm!important;padding:3.5mm!important;border:1px solid var(--pdf-line)!important;border-radius:3mm!important;background:#fff!important;break-inside:avoid;page-break-inside:avoid;cursor:default!important}
    [data-report-task-row]>span:nth-of-type(n+3){display:none!important}
    [data-report-task-row]>span:first-child{width:4mm!important;height:4mm!important;border:1px solid #beafaa!important;border-radius:50%!important;background:#fff!important;color:transparent!important;position:relative;align-self:center!important}
    [data-report-task-row]>span:first-child[data-print-checked="true"]{border-color:var(--pdf-accent)!important;background:var(--pdf-accent)!important}
    [data-report-task-row]>span:first-child[data-print-checked="true"]:after{content:"";position:absolute;left:1.05mm;top:.55mm;width:1.25mm;height:2.15mm;border:solid #fff;border-width:0 .45mm .45mm 0;transform:rotate(45deg)}
    .pdf-form-value{display:block;font-size:8.2pt;line-height:1.35;color:var(--pdf-ink);font-weight:500;overflow-wrap:anywhere}
    [data-report-task-row] svg{display:none!important}
    [data-report-actions],button,.pt-op,.pt-softbtn,.pt-iconbtn,[data-report-exclude]{display:none!important}
    h1,h2,h3,p{orphans:3;widows:3}
    @page{margin:0}
  </style></head><body><div class="print-doc">
    <section class="pdf-cover">
      <div class="pdf-brand"><span class="pdf-brand-mark">${escapeHtml(brandMark)}</span><span>${escapeHtml(profile.brandName)}</span></div>
      <div class="pdf-cover-copy">
        <div class="pdf-kicker">${isFunnelPlan ? "Build-ready funnel brief" : "Client-ready report"}</div>
        <h1>${escapeHtml(projectName)}</h1>
        <p class="pdf-cover-client">Prepared for ${escapeHtml(clientName)}</p>
        <div class="pdf-cover-meta">
          <div><div class="pdf-meta-label">Document</div><div class="pdf-meta-value">${escapeHtml(isFunnelPlan ? "Development plan" : documentType)}</div></div>
          <div><div class="pdf-meta-label">Status</div><div class="pdf-meta-value">${escapeHtml(profile.status === "ready" ? "Ready to share" : profile.status === "sent" ? "Sent" : profile.status === "reviewed" ? "Reviewed" : status)}</div></div>
          <div><div class="pdf-meta-label">Version</div><div class="pdf-meta-value">v${profile.version} · ${escapeHtml(preparedOn)}</div></div>
        </div>
      </div>
      ${isFunnelPlan ? `<div class="pdf-contents">
        <span><b>01</b>Brief and direction</span><span><b>02</b>Recommendations</span><span><b>03</b>Final design</span><span><b>04</b>Build and launch</span><span><b>05</b>Task plan</span>
      </div>` : ""}
    </section>
    ${printable.outerHTML}
    <div class="pdf-page-footer"><span>${escapeHtml(profile.brandName)} - ${escapeHtml(isFunnelPlan ? "Development plan" : documentType)} - v${profile.version}</span><span>${escapeHtml(clientName)} - Confidential</span></div>
  </div></body></html>`;
}

export function printReportHtml(html: string, title: string): boolean {
  if (typeof window === "undefined" || !html) return false;
  // Open the browsing context synchronously while the click gesture is still
  // active. This avoids popup/modal blocking caused by preparing the document
  // asynchronously or trying to print from inside the dashboard overlay.
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = title;
    printWindow.opener = null;

    const openNativePrint = () => {
      window.setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch {
          // The standalone document remains open so the user can still invoke
          // the browser's native Print command directly.
        }
      }, 120);
    };

    if (printWindow.document.readyState === "complete") openNativePrint();
    else printWindow.addEventListener("load", openNativePrint, { once: true });
    return true;
  } catch {
    printWindow.close();
    return false;
  }
}

export async function printReportNode(node: Element | null | undefined, title: string, exportProfile?: PortalAuditExportProfile | null): Promise<boolean> {
  if (typeof window === "undefined" || !node) return false;
  const html = reportDocumentHtml(node, title, exportProfile);
  if (!html) return false;
  return printReportHtml(html, title);
}
