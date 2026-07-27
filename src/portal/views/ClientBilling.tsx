"use client";

import { useEffect, useState } from "react";
import { css } from "../helpers";
import type { PortalActions, PortalState } from "../store";

type ClientInvoice = {
  id: string;
  invoice_number: string;
  status: string;
  currency: string;
  total: number;
  due_date: string | null;
  payload?: {
    paymentLink?: string;
    note?: string;
  };
};

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function ClientBilling({ state: _state, actions }: { state: PortalState; actions: PortalActions }) {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/portal-invoices", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load invoices.");
        setInvoices(Array.isArray(payload?.invoices) ? payload.invoices : []);
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        actions.showToast(error instanceof Error ? error.message : "Unable to load invoices");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [actions]);

  if (loading) {
    return <div style={css("padding:2rem;text-align:center;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);color:var(--fg-faint);font-size:var(--text-sm)")}>Loading invoices…</div>;
  }

  if (!invoices.length) {
    return <div style={css("padding:2.5rem 1rem;text-align:center;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);color:var(--fg-faint);font-size:var(--text-sm)")}>No invoices or payment activity yet.</div>;
  }

  return (
    <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
      <div style={css("padding:1rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
        <h2 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Invoices</h2>
        <p style={css("margin:.2rem 0 0;font-size:var(--text-xs);color:var(--fg-muted)")}>Sent invoices and payment status from the studio.</p>
      </div>
      <div style={css("display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:var(--space-3);padding:.55rem 1.1rem;border-bottom:1px solid var(--border-soft);font-size:var(--text-2xs);color:var(--fg-faint)")}>
        <span>Invoice</span><span>Balance</span><span>Status</span>
      </div>
      {invoices.map(invoice => (
        <div key={invoice.id} style={css("display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:var(--space-3);padding:.9rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
          <div style={{ minWidth: 0 }}>
            <div style={css("font-size:var(--text-sm);font-weight:500")}>{invoice.invoice_number}</div>
            <div style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>{invoice.due_date ? `Due ${invoice.due_date}` : "No due date"}</div>
          </div>
          <div style={css("font-size:var(--text-sm);font-weight:500;text-align:right")}>{money(Number(invoice.total || 0), invoice.currency)}</div>
          <div style={css("display:flex;align-items:flex-end;gap:.35rem;flex-direction:column")}>
            <span style={css("font-size:var(--text-2xs);font-weight:500;padding:.18rem .5rem;border-radius:999px;background:var(--surface-alt);color:var(--fg-muted)")}>{invoice.status}</span>
            {invoice.payload?.paymentLink && !["Paid", "Cancelled"].includes(invoice.status) && (
              <a href={invoice.payload.paymentLink} target="_blank" rel="noreferrer" style={css("font-size:var(--text-2xs);font-weight:500;color:var(--accent);text-decoration:none")}>Pay with Wise ↗</a>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
