"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "../icons";
import { css, statusPill } from "../helpers";
import type { PortalActions, PortalState } from "../store";

type StoredInvoice = {
  id: string;
  invoice_number: string;
  status: string;
  currency: string;
  total: number;
  due_date: string | null;
  recipient_email: string | null;
  payload: {
    clientId?: string;
    recurring?: { enabled?: boolean };
  };
  clients?: { name?: string } | null;
};

function money(value: number, currency: string) {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value); }
  catch { return `${currency} ${value.toFixed(2)}`; }
}

const STATUS_KIND: Record<string, string> = {
  Draft: "waiting",
  Sent: "progress",
  Viewed: "review",
  "Partially Paid": "review",
  Paid: "done",
  Overdue: "blocked",
  Cancelled: "locked",
};

export function Billing({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const mobile = state.isMobile;

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

  const totals = useMemo(() => ({
    recurring: invoices.filter(invoice => invoice.status === "Paid" && invoice.payload?.recurring?.enabled).reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    awaiting: invoices.filter(invoice => ["Sent", "Viewed", "Partially Paid", "Overdue"].includes(invoice.status)).reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    collected: invoices.filter(invoice => invoice.status === "Paid").reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    overdue: invoices.filter(invoice => invoice.status === "Overdue").reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
  }), [invoices]);

  const openInvoiceCreator = (client?: string) => {
    actions.patch({ invoiceClientName: client || null });
    actions.setView("invoices");
  };

  const stats = [
    { label: "Recurring", value: money(totals.recurring, "GBP"), sub: "paid recurring invoices" },
    { label: "Awaiting payment", value: money(totals.awaiting, "GBP"), sub: "sent or partially paid" },
    { label: "Collected", value: money(totals.collected, "GBP"), sub: "paid invoices" },
    { label: "Overdue", value: money(totals.overdue, "GBP"), sub: totals.overdue ? "needs follow-up" : "none overdue" },
  ];

  return (
    <div style={css("display:flex;flex-direction:column;gap:0.85rem")}>
      <div style={css("display:flex;align-items:center;justify-content:flex-end")}>
        <button type="button" onClick={() => openInvoiceCreator()} className="pt-op" style={css("display:inline-flex;align-items:center;gap:.4rem;height:2.2rem;padding:0 .9rem;border:0;border-radius:999px;background:var(--accent);color:#fff;font-size:var(--text-xs);font-weight:500;cursor:pointer")}><Icon name="plus" size={14}/>New invoice</button>
      </div>
      <div style={css("display:grid;grid-template-columns:" + (mobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))") + ";gap:0.55rem")}>
        {stats.map(stat => <div key={stat.label} style={css("padding:.9rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface)")}>
          <div style={css("font-size:var(--text-2xs);font-weight:500;color:var(--fg-muted)")}>{stat.label}</div>
          <div style={css("margin-top:.2rem;font-size:1.25rem;font-weight:500")}>{stat.value}</div>
          <div style={css("margin-top:.12rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{stat.sub}</div>
        </div>)}
      </div>

      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <div style={css("padding:.9rem 1.1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;gap:.5rem")}><Icon name="wallet" size={16}/><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Invoices</h3></div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: "40rem" }}>
            <div style={css("display:grid;grid-template-columns:1.3fr .9fr .8fr .8fr .8fr;gap:var(--space-3);padding:.6rem 1.1rem;border-bottom:1px solid var(--border-soft);font-size:var(--text-2xs);color:var(--fg-faint);font-weight:500")}>
              <span>Client</span><span>Invoice</span><span>Due</span><span style={{ textAlign: "right" }}>Amount</span><span style={{ textAlign: "right" }}>Status</span>
            </div>
            {invoices.map(invoice => {
              const clientName = invoice.clients?.name || invoice.recipient_email || "Unassigned";
              return <button type="button" key={invoice.id} onClick={() => openInvoiceCreator(invoice.clients?.name)} className="pt-row" style={css("width:100%;display:grid;grid-template-columns:1.3fr .9fr .8fr .8fr .8fr;gap:var(--space-3);padding:.72rem 1.1rem;border:0;border-bottom:1px solid var(--border-soft);align-items:center;background:var(--surface);color:var(--fg);font:inherit;text-align:left;cursor:pointer")}>
                <span style={css("font-size:var(--text-sm);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{clientName}</span>
                <span style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{invoice.invoice_number}</span>
                <span style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{invoice.due_date || "—"}</span>
                <span style={css("justify-self:end;font-size:var(--text-sm);font-weight:500")}>{money(Number(invoice.total || 0), invoice.currency || "GBP")}</span>
                <span style={{ justifySelf: "end", ...css(statusPill(STATUS_KIND[invoice.status] || "waiting")) }}>{invoice.status}</span>
              </button>;
            })}
            {!loading && invoices.length === 0 && <div style={css("padding:2.2rem 1rem;text-align:center;color:var(--fg-faint);font-size:var(--text-xs)")}>No invoices yet. Create the first invoice when billing is ready.</div>}
            {loading && <div role="status" style={css("padding:2.2rem 1rem;text-align:center;color:var(--fg-faint);font-size:var(--text-xs)")}>Loading invoices…</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
