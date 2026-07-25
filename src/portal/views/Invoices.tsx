"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { Icon } from "../icons";
import { css, eyebrowStyle, statusPill } from "../helpers";
import { STUDIO_CLIENTS } from "../clients";
import type { PortalActions, PortalState } from "../store";

// ── design primitives (match the rest of the portal) ─────────────────────────
const CARD = "border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.05rem 1.1rem";
const INPUT = "width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:var(--radius);padding:0.5rem 0.62rem;font-size:var(--text-sm);font-family:inherit;background:var(--surface-alt);color:var(--fg);outline:none";
const BTN_PRIMARY = "display:inline-flex;align-items:center;gap:0.4rem;height:2.1rem;padding:0 0.9rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:var(--text-xs);font-weight:500;cursor:pointer;white-space:nowrap";
const BTN_GHOST = "display:inline-flex;align-items:center;gap:0.4rem;height:2.1rem;padding:0 0.8rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer;white-space:nowrap";
const CHIP = "display:inline-flex;align-items:center;gap:0.32rem;padding:0.3rem 0.6rem;border-radius:var(--radius-pill);font-size:var(--text-2xs);font-weight:500;cursor:pointer;white-space:nowrap";

// ── seed data ────────────────────────────────────────────────────────────────
const CURRENCIES: Record<string, { symbol: string; locale: string }> = {
  GBP: { symbol: "£", locale: "en-GB" }, USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "en-IE" }, CAD: { symbol: "$", locale: "en-CA" },
  AUD: { symbol: "$", locale: "en-AU" },
};
function money(n: number, cur: string) {
  try { return new Intl.NumberFormat(CURRENCIES[cur]?.locale || "en-US", { style: "currency", currency: cur }).format(n || 0); }
  catch { return (CURRENCIES[cur]?.symbol || "") + (n || 0).toFixed(2); }
}

interface BizProfile {
  id: string; name: string; logo: string; address: string; email: string; phone: string;
  website: string; taxId: string; currency: string; instructions: string; account: string;
}
const WISE_PAYMENT_URL = "https://wise.com/pay/me/trishajoanbaquiranb";
const WISE_INSTRUCTIONS = "Pay securely via Wise using the link or QR code below.";
const BUSINESS_PROFILES: BizProfile[] = [
  { id: "baltz", name: "Baltazar Studio", logo: "BS", address: "", email: "", phone: "", website: "", taxId: "", currency: "GBP", instructions: WISE_INSTRUCTIONS, account: WISE_PAYMENT_URL },
  { id: "cocoon", name: "Cocoon Consult", logo: "CC", address: "", email: "", phone: "", website: "", taxId: "", currency: "GBP", instructions: WISE_INSTRUCTIONS, account: WISE_PAYMENT_URL },
];

interface SavedService { name: string; unit: string; rate: number; desc: string; taxable: boolean }
const SAVED_SERVICES: SavedService[] = [
  { name: "Website Design", unit: "Project", rate: 2800, desc: "Full site design across key templates", taxable: true },
  { name: "Website Development", unit: "Project", rate: 3600, desc: "Front-end build, responsive & QA", taxable: true },
  { name: "Shopify Theme Customization", unit: "Project", rate: 1900, desc: "Theme setup and brand customization", taxable: true },
  { name: "Shopify Section Development", unit: "Section", rate: 320, desc: "Custom Liquid section", taxable: true },
  { name: "WordPress Development", unit: "Project", rate: 3200, desc: "Custom WordPress theme & CMS", taxable: true },
  { name: "Landing Page Design", unit: "Page", rate: 650, desc: "Conversion-focused landing page", taxable: true },
  { name: "UI/UX Design", unit: "Day", rate: 520, desc: "Product & interface design", taxable: true },
  { name: "Website Maintenance", unit: "Month", rate: 180, desc: "Updates, backups & monitoring", taxable: true },
  { name: "SEO Setup", unit: "Project", rate: 900, desc: "Technical SEO foundation", taxable: true },
  { name: "Speed Optimization", unit: "Project", rate: 480, desc: "Core Web Vitals tuning", taxable: true },
  { name: "Technical Support", unit: "Hour", rate: 85, desc: "Ad-hoc technical support", taxable: true },
  { name: "Content Upload", unit: "Page", rate: 60, desc: "Content population per page", taxable: true },
  { name: "Plugin or App Setup", unit: "License", rate: 120, desc: "Install & configure", taxable: true },
  { name: "Custom Integration", unit: "Project", rate: 1400, desc: "Third-party API integration", taxable: true },
  { name: "Additional Revision", unit: "Revision", rate: 90, desc: "Out-of-scope revision round", taxable: true },
  { name: "Project Management", unit: "Month", rate: 400, desc: "Coordination & delivery", taxable: true },
  { name: "Monthly Retainer", unit: "Month", rate: 1500, desc: "Ongoing design & dev retainer", taxable: true },
  { name: "Hosting Fee", unit: "Month", rate: 25, desc: "Managed hosting", taxable: false },
  { name: "Domain Fee", unit: "Item", rate: 14, desc: "Annual domain registration", taxable: false },
];

const UNITS = ["Project", "Hour", "Day", "Page", "Section", "Month", "Milestone", "Revision", "License", "Item"];
const BILLING_TYPES = ["Fixed project fee", "Milestone payment", "Hourly work", "Monthly retainer", "Recurring maintenance", "Deposit", "Final payment", "Reimbursement", "Custom service invoice"];
const STATUSES: [string, string][] = [["Draft", "waiting"], ["Sent", "progress"], ["Viewed", "progress"], ["Partially Paid", "review"], ["Paid", "done"], ["Overdue", "blocked"], ["Cancelled", "locked"]];
const NUMBER_FORMATS = ["INV-0001", "CLIENT-2026-001", "PROJECT-001", "YYYY-MM-001"];
const MILESTONE_PRESETS: [string, number][] = [["Project deposit", 25], ["Design approval", 20], ["Development completion", 25], ["Testing and QA", 10], ["Website launch", 15], ["Final handoff", 5]];
const EXPENSE_PRESETS = ["Premium theme", "Shopify app", "WordPress plugin", "Stock photos", "Fonts", "Hosting", "Domain registration", "Third-party software", "Contractor costs"];
const STANDARD_NOTE = "Thank you for your business. Please pay via Wise by the due date.";
const DEFAULT_TERMS = "Payment is due by the date shown. Work may pause if overdue, and final files are released after full payment.";

interface InvClient { id: string; name: string; company: string; email: string; phone: string; country: string; currency: string; address: string; taxId: string }
const CLIENTS: InvClient[] = STUDIO_CLIENTS.map(c => ({
  id: c.id, name: c.name, company: c.name,
  email: "", phone: "", country: "", currency: "GBP", address: "", taxId: "",
}));
const PROJECTS = STUDIO_CLIENTS.flatMap(c => c.funnels.map(f => ({
  id: f.id, clientId: c.id, name: c.name + " · " + f.subtitle, type: f.subtitle,
  manager: c.owner, value: f.progress ? 6000 + f.progress * 40 : 6000, status: f.statusLabel,
  start: "2026-05-01", target: f.due,
})));

// ── invoice model ──────────────────────────────────────────────────────────────
interface Item { id: string; service: string; description: string; qty: number; unit: string; rate: number; discount: number; discountType: "pct" | "fixed"; taxRate: number; taxable: boolean }
interface Expense { id: string; description: string; vendor: string; date: string; cost: number; markup: number; taxRate: number }
interface TimeEntry { id: string; task: string; member: string; hours: number; rate: number; billable: boolean; invoiced: boolean }
interface Milestone { id: string; label: string; pct: number; selected: boolean }
interface Attachment { id: string; name: string; kind: string; size: string }

interface Inv {
  businessId: string;
  clientId: string; projectId: string;
  number: string; numberFormat: string; status: string;
  issueDate: string; dueDate: string; currency: string; paymentTerms: string;
  poNumber: string; contractRef: string;
  billingType: string;
  items: Item[]; expenses: Expense[]; time: TimeEntry[]; milestones: Milestone[];
  retainer: { pkg: string; includedHours: number; hoursUsed: number; overageRate: number; rollover: boolean; period: string; nextBilling: string };
  discountType: "pct" | "fixed"; discountValue: number;
  processingType: "pct" | "fixed"; processingValue: number; additionalFee: number;
  amountPaid: number;
  deposit: { projectValue: number; depositRequired: number; depositPaid: number; prevMilestones: number; isFinal: boolean };
  notes: string; terms: string; internalNotes: string;
  methods: string[]; instructions: string; paymentLink: string;
  recurring: { enabled: boolean; frequency: string; start: string; end: string; occurrences: number; autoCreate: boolean; autoSend: boolean };
  attachments: Attachment[];
  template: string; accent: string; showLogo: boolean; showProject: boolean; showTax: boolean; footer: string; thankYou: string;
}

let _uid = 100;
const uid = () => "id" + (++_uid);

function initItem(s?: SavedService): Item {
  return { id: uid(), service: s?.name || "", description: s?.desc || "", qty: 1, unit: s?.unit || "Project", rate: s?.rate || 0, discount: 0, discountType: "pct", taxRate: 20, taxable: s ? s.taxable : true };
}

function initState(): Inv {
  const biz = BUSINESS_PROFILES[0];
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 14);
  const isoDate = (value: Date) => value.toISOString().slice(0, 10);
  return {
    businessId: biz.id, clientId: "", projectId: "",
    number: "INV-0001", numberFormat: "INV-0001", status: "Draft",
    issueDate: isoDate(today), dueDate: isoDate(due), currency: biz.currency, paymentTerms: "Net 14",
    poNumber: "", contractRef: "",
    billingType: "Fixed project fee",
    items: [initItem()],
    expenses: [], time: [], milestones: MILESTONE_PRESETS.map(([label, pct]) => ({ id: uid(), label, pct, selected: false })),
    retainer: { pkg: "", includedHours: 0, hoursUsed: 0, overageRate: 0, rollover: false, period: "", nextBilling: "" },
    discountType: "pct", discountValue: 0, processingType: "pct", processingValue: 0, additionalFee: 0, amountPaid: 0,
    deposit: { projectValue: 0, depositRequired: 0, depositPaid: 0, prevMilestones: 0, isFinal: false },
    notes: STANDARD_NOTE, terms: DEFAULT_TERMS, internalNotes: "",
    methods: ["Wise"], instructions: WISE_INSTRUCTIONS, paymentLink: WISE_PAYMENT_URL,
    recurring: { enabled: false, frequency: "Monthly", start: "", end: "", occurrences: 0, autoCreate: false, autoSend: false },
    attachments: [],
    template: "Modern", accent: "#c2544d", showLogo: true, showProject: true, showTax: true, footer: "Thank you for partnering with Baltazar Studio.", thankYou: "We appreciate your business — thank you!",
  };
}

type Action =
  | { t: "patch"; v: Partial<Inv> }
  | { t: "item"; op: "add" | "remove" | "dup" | "up" | "down" | "update"; id?: string; v?: Partial<Item>; service?: SavedService }
  | { t: "expense"; op: "add" | "remove" | "update"; id?: string; v?: Partial<Expense> }
  | { t: "time"; op: "add" | "remove" | "update" | "import"; id?: string; v?: Partial<TimeEntry> }
  | { t: "milestone"; id: string };

const SEED_TIME: TimeEntry[] = [];

function reducer(s: Inv, a: Action): Inv {
  switch (a.t) {
    case "patch": return { ...s, ...a.v };
    case "milestone": return { ...s, milestones: s.milestones.map(m => m.id === a.id ? { ...m, selected: !m.selected } : m) };
    case "item": {
      if (a.op === "add") return { ...s, items: [...s.items, initItem(a.service)] };
      const idx = s.items.findIndex(i => i.id === a.id);
      if (idx < 0) return s;
      const items = s.items.slice();
      if (a.op === "remove") { items.splice(idx, 1); return { ...s, items: items.length ? items : [initItem()] }; }
      if (a.op === "dup") { items.splice(idx + 1, 0, { ...items[idx], id: uid() }); return { ...s, items }; }
      if (a.op === "up" && idx > 0) { [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]]; return { ...s, items }; }
      if (a.op === "down" && idx < items.length - 1) { [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]]; return { ...s, items }; }
      if (a.op === "update") { items[idx] = { ...items[idx], ...a.v }; return { ...s, items }; }
      return s;
    }
    case "expense": {
      if (a.op === "add") return { ...s, expenses: [...s.expenses, { id: uid(), description: "", vendor: "", date: s.issueDate, cost: 0, markup: 0, taxRate: 20 }] };
      const idx = s.expenses.findIndex(e => e.id === a.id);
      if (idx < 0) return s;
      const expenses = s.expenses.slice();
      if (a.op === "remove") { expenses.splice(idx, 1); return { ...s, expenses }; }
      if (a.op === "update") { expenses[idx] = { ...expenses[idx], ...a.v }; return { ...s, expenses }; }
      return s;
    }
    case "time": {
      if (a.op === "import") return { ...s, time: SEED_TIME.map(t => ({ ...t, id: uid() })) };
      if (a.op === "add") return { ...s, time: [...s.time, { id: uid(), task: "", member: "Kier Mangibin", hours: 1, rate: 85, billable: true, invoiced: false }] };
      const idx = s.time.findIndex(t => t.id === a.id);
      if (idx < 0) return s;
      const time = s.time.slice();
      if (a.op === "remove") { time.splice(idx, 1); return { ...s, time }; }
      if (a.op === "update") { time[idx] = { ...time[idx], ...a.v }; return { ...s, time }; }
      return s;
    }
  }
}

// ── small building blocks ────────────────────────────────────────────────────
function Section({ title, hint, children, right, last = false }: { icon: string; title: string; hint?: string; children: ReactNode; right?: ReactNode; defaultOpen?: boolean; flat?: boolean; last?: boolean }) {
  return (
    <div style={css("padding:1rem 0" + (last ? "" : ";border-bottom:1px solid var(--border-soft)"))}>
      <div style={css("display:flex;align-items:flex-start;gap:var(--space-3)") }>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={css("font-size:var(--text-lg);font-weight:500;color:var(--fg);line-height:1.2")}>{title}</div>
          {hint && <div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:0.1rem")}>{hint}</div>}
        </div>
        {right && <span style={{ display: "inline-flex", flexShrink: 0 }}>{right}</span>}
      </div>
      <div style={{ marginTop: "0.85rem" }}>{children}</div>
    </div>
  );
}

function Field({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) {
  return (
    <label style={css("display:flex;flex-direction:column;gap:0.28rem;font-size:var(--text-2xs);font-weight:500;color:var(--fg-muted);min-width:0" + (span ? ";grid-column:1/-1" : ""))}>
      {label}
      {children}
    </label>
  );
}
function txt(v: string | number, on: (val: string) => void, opts: { type?: string; ph?: string } = {}) {
  return <input className="pt-input" value={v} type={opts.type || "text"} placeholder={opts.ph} onChange={e => on(e.target.value)} style={css(INPUT)} />;
}
function sel(v: string, options: string[], on: (val: string) => void) {
  return <select className="pt-input" value={v} onChange={e => on(e.target.value)} style={css(INPUT + ";cursor:pointer")}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>;
}

// ── main ─────────────────────────────────────────────────────────────────────
export function Invoices({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [inv, dispatch] = useReducer(reducer, undefined, initState);
  const [modal, setModal] = useState<null | "send" | "payment" | "cancel" | "delete" | "profile" | "preview">(null);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const mobile = state.isMobile;
  const set = (v: Partial<Inv>) => { dispatch({ t: "patch", v }); setDirty(true); };

  const biz = BUSINESS_PROFILES.find(b => b.id === inv.businessId) || BUSINESS_PROFILES[0];
  const client = CLIENTS.find(c => c.id === inv.clientId) || null;
  const project = PROJECTS.find(p => p.id === inv.projectId) || null;
  const cur = inv.currency;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ── calculations ──
  const lineAmount = (i: Item) => {
    const base = (i.qty || 0) * (i.rate || 0);
    const disc = i.discountType === "pct" ? base * (i.discount || 0) / 100 : (i.discount || 0);
    return Math.max(0, base - disc);
  };
  const expenseAmount = (e: Expense) => (e.cost || 0) * (1 + (e.markup || 0) / 100);
  const calc = useMemo(() => {
    const serviceSubtotal = inv.items.reduce((s, i) => s + lineAmount(i), 0);
    const timeSubtotal = inv.billingType === "Hourly work" ? inv.time.filter(t => t.billable).reduce((s, t) => s + t.hours * t.rate, 0) : 0;
    const expenseSubtotal = inv.expenses.reduce((s, e) => s + expenseAmount(e), 0);
    const itemsTax = inv.showTax ? inv.items.reduce((s, i) => s + (i.taxable ? lineAmount(i) * (i.taxRate || 0) / 100 : 0), 0) : 0;
    const expenseTax = inv.showTax ? inv.expenses.reduce((s, e) => s + expenseAmount(e) * (e.taxRate || 0) / 100, 0) : 0;
    const preDiscount = serviceSubtotal + timeSubtotal + expenseSubtotal;
    const discount = inv.discountType === "pct" ? preDiscount * (inv.discountValue || 0) / 100 : (inv.discountValue || 0);
    const tax = itemsTax + expenseTax;
    const afterDiscount = preDiscount - discount;
    const processing = inv.processingType === "pct" ? afterDiscount * (inv.processingValue || 0) / 100 : (inv.processingValue || 0);
    const total = afterDiscount + tax + processing + (inv.additionalFee || 0);
    const balance = total - (inv.amountPaid || 0);
    const remainingProject = inv.deposit.projectValue ? Math.max(0, inv.deposit.projectValue - inv.deposit.depositPaid - inv.deposit.prevMilestones - (inv.deposit.isFinal ? balance : total)) : 0;
    return { serviceSubtotal, timeSubtotal, expenseSubtotal, discount, tax, processing, total, balance, remainingProject };
  }, [inv]);

  // ── validation ──
  const errors = useMemo(() => {
    const e: string[] = [];
    if (!client) e.push("Select a client before sending.");
    if (!project && inv.items.every(i => !i.service)) e.push("Add a project or at least one service line.");
    if (inv.items.every(i => lineAmount(i) === 0) && calc.total <= 0) e.push("The invoice total must be greater than zero.");
    if (client && !client.email) e.push("The selected client has no email address.");
    if (inv.dueDate < inv.issueDate) e.push("Due date can’t be before the issue date.");
    return e;
  }, [client, project, inv, calc.total]);

  const applyClient = (id: string) => {
    const c = CLIENTS.find(x => x.id === id);
    set({ clientId: id, currency: c?.currency || cur, instructions: biz.instructions });
  };
  const applyProject = (id: string) => {
    const p = PROJECTS.find(x => x.id === id);
    if (!p) { set({ projectId: "" }); return; }
    const c = CLIENTS.find(x => x.id === p.clientId);
    set({ projectId: id, clientId: p.clientId, currency: c?.currency || cur, contractRef: p.name + " · SOW", deposit: { ...inv.deposit, projectValue: p.value }, terms: inv.terms || DEFAULT_TERMS });
    actions.showToast("Client, currency & agreed pricing suggested from " + p.name);
  };
  const applyBiz = (id: string) => {
    const b = BUSINESS_PROFILES.find(x => x.id === id) || biz;
    set({ businessId: id, currency: b.currency, instructions: b.instructions, footer: "Thank you for partnering with " + b.name + "." });
  };
  useEffect(() => {
    if (!state.invoiceClientName || inv.clientId) return;
    const selectedClient = CLIENTS.find(item => item.company === state.invoiceClientName);
    if (selectedClient) applyClient(selectedClient.id);
  }, [state.invoiceClientName, inv.clientId]);
  const doSave = (label: string) => { setDirty(false); actions.showToast(label); };
  const send = () => { setShowErrors(true); if (errors.length) { actions.showToast("Fix " + errors.length + " issue" + (errors.length > 1 ? "s" : "") + " before sending"); return; } setModal("send"); };

  const showMilestones = inv.billingType === "Milestone payment";
  const showTime = inv.billingType === "Hourly work";
  const showRetainer = inv.billingType === "Monthly retainer" || inv.billingType === "Recurring maintenance";
  const showDeposit = ["Deposit", "Final payment", "Milestone payment"].includes(inv.billingType);
  const showRecurring = ["Monthly retainer", "Recurring maintenance"].includes(inv.billingType);

  return (
    <div style={css("display:flex;flex-direction:column;gap:var(--space-4)")}>
      {/* header */}
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap")}>
        <div style={{ minWidth: 0 }}>
          <p style={css("margin:0;font-size:var(--text-sm);color:var(--fg-muted);line-height:1.5;max-width:38rem")}>Create, review, and send an invoice to the selected client.</p>
        </div>
        <div style={css("display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;flex-shrink:0")}>
          <button type="button" onClick={() => { actions.patch({ invoiceClientName: null }); actions.setView("billing"); }} style={css(BTN_GHOST)}><Icon name="chevleft" size={14} />Back to billing</button>
          {!mobile && <button type="button" onClick={() => setShowPreview(v => !v)} style={css(BTN_GHOST)}><Icon name="eye" size={14} />{showPreview ? "Hide Preview" : "Show Preview"}</button>}
          <button type="button" onClick={() => doSave("Invoice saved as draft")} style={css(BTN_GHOST)}><Icon name="file" size={14} />Save as Draft</button>
          <button type="button" onClick={send} style={css(BTN_PRIMARY)}><Icon name="send" size={14} />Send Invoice</button>
        </div>
      </div>

      {/* validation banner */}
      {showErrors && errors.length > 0 && (
        <div style={css("border:1px solid var(--danger-border);border-radius:var(--radius-panel);background:var(--danger-soft);padding:0.75rem 0.9rem")}>
          <div style={css("display:flex;align-items:center;gap:0.45rem;font-size:var(--text-sm);font-weight:500;color:var(--danger)")}><Icon name="alert" size={15} />Resolve before sending</div>
          <ul style={css("margin:0.4rem 0 0;padding-left:1.1rem;color:var(--fg-muted);font-size:var(--text-xs);line-height:1.6")}>{errors.map(e => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      {/* split: editable form + sticky live preview */}
      <div style={css("display:grid;grid-template-columns:" + (mobile || !showPreview ? "minmax(0,1fr)" : "minmax(0,1.1fr) minmax(0,0.9fr)") + ";gap:var(--space-4);align-items:start")}>
        <div style={css("display:flex;flex-direction:column;gap:0.9rem;min-width:0")}>
          <FormBody inv={inv} set={set} dispatch={dispatch} setDirty={setDirty} biz={biz} client={client} project={project}
            applyClient={applyClient} applyProject={applyProject} applyBiz={applyBiz} calc={calc} money={(n: number) => money(n, cur)}
            lineAmount={lineAmount} expenseAmount={expenseAmount} mobile={mobile}
            openProfile={() => setModal("profile")} actions={actions}
            flags={{ showMilestones, showTime, showRetainer, showDeposit, showRecurring }} />
        </div>
        {(mobile || showPreview) && <div id="inv-preview" style={css("min-width:0;position:" + (mobile ? "static" : "sticky") + ";top:4.5rem")}>
          <Preview inv={inv} biz={biz} client={client} project={project} calc={calc} money={(n: number) => money(n, cur)} lineAmount={lineAmount} expenseAmount={expenseAmount} onTemplate={t => set({ template: t })} />
        </div>}
      </div>

      {modal === "send" && <SendModal inv={inv} client={client} project={project} calc={calc} money={(n: number) => money(n, cur)} onClose={() => setModal(null)} onSend={() => { setModal(null); set({ status: "Sent" }); setDirty(false); actions.showToast("Invoice " + inv.number + " sent to " + (client?.email || "client")); }} />}
      {modal === "payment" && <PaymentModal inv={inv} calc={calc} money={(n: number) => money(n, cur)} onClose={() => setModal(null)} onRecord={(amt) => { const paid = (inv.amountPaid || 0) + amt; set({ amountPaid: paid, status: paid >= calc.total ? "Paid" : "Partially Paid" }); setModal(null); actions.showToast("Payment of " + money(amt, cur) + " recorded"); }} />}
      {(modal === "cancel" || modal === "delete") && <ConfirmModal kind={modal} number={inv.number} onClose={() => setModal(null)} onConfirm={() => { set({ status: modal === "cancel" ? "Cancelled" : "Draft" }); setModal(null); actions.showToast("Invoice " + (modal === "cancel" ? "cancelled" : "deleted")); }} />}
      {modal === "profile" && <ProfileModal biz={biz} onClose={() => setModal(null)} onSave={() => { setModal(null); actions.showToast("Business profile saved"); }} />}
      {modal === "preview" && (
        <Shell label="Invoice preview" onClose={() => setModal(null)} wide>
          <ModalHead title="Invoice preview" onClose={() => setModal(null)} />
          <div style={css("padding:var(--space-4);background:var(--bg)")}>
            <Preview inv={inv} biz={biz} client={client} project={project} calc={calc} money={(n: number) => money(n, cur)} lineAmount={lineAmount} expenseAmount={expenseAmount} onTemplate={t => set({ template: t })} />
          </div>
        </Shell>
      )}
    </div>
  );
}

// ── FORM BODY ────────────────────────────────────────────────────────────────
type Flags = { showMilestones: boolean; showTime: boolean; showRetainer: boolean; showDeposit: boolean; showRecurring: boolean };
function FormBody(p: {
  inv: Inv; set: (v: Partial<Inv>) => void; dispatch: React.Dispatch<Action>; setDirty: (v: boolean) => void;
  biz: BizProfile; client: InvClient | null; project: typeof PROJECTS[number] | null;
  applyClient: (id: string) => void; applyProject: (id: string) => void; applyBiz: (id: string) => void;
  calc: Record<string, number>; money: (n: number) => string;
  lineAmount: (i: Item) => number; expenseAmount: (e: Expense) => number; mobile: boolean;
  openProfile: () => void; actions: PortalActions; flags: Flags;
}) {
  const { inv, set, dispatch, biz, client, project, applyClient, applyProject, applyBiz, calc, money, lineAmount, mobile, flags, actions } = p;
  const [lineOptionsId, setLineOptionsId] = useState<string | null>(null);
  const grid2 = "display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)") + ";gap:0.6rem";
  const grid3 = "display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:0.6rem";
  const lineItemGrid = "minmax(7.5rem,2fr) 2.7rem 3.8rem 4.5rem 5.3rem 5.2rem";

  return (
    <>
      <div style={css(CARD + ";padding:0 1.1rem")}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);padding:1.15rem 0 1rem")}>
          <div>
            <div style={css("font-size:var(--text-lg);font-weight:500;color:var(--fg)")}>Invoice details</div>
            <div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:0.15rem")}>Enter invoice and client information.</div>
          </div>
          <div style={css("display:flex;gap:0.4rem;width:" + (mobile ? "100%" : "14rem") + ";max-width:100%")}>
            <select className="pt-input" aria-label="Client" value={inv.clientId} onChange={e => applyClient(e.target.value)} style={css(INPUT + ";cursor:pointer;background:var(--surface)")}>
              <option value="">Select a client…</option>
              {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
            <button type="button" aria-label="Add client" title="Add client" onClick={() => actions.showToast("New client form opened inline")} className="pt-iconbtn" style={css("width:2.25rem;flex-shrink:0;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")}><Icon name="plus" size={14} /></button>
          </div>
        </div>
        <div style={css(grid2)}>
          <Field label="Contact name"><input className="pt-input" value={client?.name || ""} readOnly placeholder="Client contact" style={css(INPUT)} /></Field>
          <Field label="Email address"><input className="pt-input" value={client?.email || ""} readOnly placeholder="client@email.com" style={css(INPUT)} /></Field>
          <Field label="Billing address" span><input className="pt-input" value={client?.address || ""} readOnly placeholder="Street, city, country" style={css(INPUT)} /></Field>
          <Field label="Invoice number">{txt(inv.number, v => set({ number: v }))}</Field>
          <Field label="Currency">{sel(inv.currency, Object.keys(CURRENCIES), v => set({ currency: v }))}</Field>
          <Field label="Issued date">{txt(inv.issueDate, v => set({ issueDate: v }), { type: "date" })}</Field>
          <Field label="Due date">{txt(inv.dueDate, v => set({ dueDate: v }), { type: "date" })}</Field>
          <Field label="Project (optional)">
            <select className="pt-input" aria-label="Project" value={inv.projectId} onChange={e => applyProject(e.target.value)} style={css(INPUT + ";cursor:pointer")}>
              <option value="">No project — standalone invoice</option>
              {PROJECTS.filter(pr => !inv.clientId || pr.clientId === inv.clientId).map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
            </select>
          </Field>
          <Field label="Payment terms">{sel(inv.paymentTerms, ["Due on receipt", "Net 7", "Net 14", "Net 30", "Net 45"], v => set({ paymentTerms: v }))}</Field>
        </div>
        <div style={css("margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border-soft)")}>
          <div style={css("font-size:var(--text-sm);font-weight:500;color:var(--fg);margin-bottom:0.65rem")}>Additional details</div>
          <div style={css(grid3)}>
            <Field label="Status"><select className="pt-input" value={inv.status} onChange={e => set({ status: e.target.value })} style={css(INPUT + ";cursor:pointer")}>{STATUSES.map(([s]) => <option key={s} value={s}>{s}</option>)}</select></Field>
            <Field label="PO number">{txt(inv.poNumber, v => set({ poNumber: v }), { ph: "Optional" })}</Field>
            <Field label="Contract / proposal ref">{txt(inv.contractRef, v => set({ contractRef: v }), { ph: "Optional" })}</Field>
            <Field label="Numbering format">{sel(inv.numberFormat, NUMBER_FORMATS, v => set({ numberFormat: v, number: v.replace("YYYY", "2026").replace("MM", "07").replace(/0+1$/, "001") }))}</Field>
            <Field label="Billed by"><select className="pt-input" value={inv.businessId} onChange={e => applyBiz(e.target.value)} style={css(INPUT + ";cursor:pointer")}>{BUSINESS_PROFILES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <div style={css("display:flex;align-items:end")}><button type="button" onClick={p.openProfile} style={css(BTN_GHOST + ";width:100%;justify-content:center")}><Icon name="edit" size={12} />Edit business profile</button></div>
          </div>
        </div>

      {/* Billing type */}
      <Section icon="sliders" title="Billing setup" hint="Choose how this work is billed" defaultOpen={false} flat>
        <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem")}>
          {BILLING_TYPES.map(t => (
            <button key={t} type="button" onClick={() => set({ billingType: t })} style={css(CHIP + ";border:1px solid " + (t === inv.billingType ? "var(--accent)" : "var(--border-soft)") + ";background:" + (t === inv.billingType ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (t === inv.billingType ? "var(--accent)" : "var(--fg-muted)"))}>{t}</button>
          ))}
        </div>
        {flags.showMilestones && (
          <div style={css("margin-top:0.85rem;border-top:1px solid var(--border-soft);padding-top:0.75rem")}>
            <div style={css(eyebrowStyle("var(--fg-faint)") + ";margin-bottom:0.5rem")}>Select milestones</div>
            <div style={css("display:flex;flex-direction:column;gap:0.4rem")}>
              {inv.milestones.map(m => {
                const amt = (inv.deposit.projectValue || project?.value || 0) * m.pct / 100;
                return (
                  <button key={m.id} type="button" onClick={() => dispatch({ t: "milestone", id: m.id })} style={css("display:flex;align-items:center;gap:0.6rem;padding:0.55rem 0.7rem;border:1px solid " + (m.selected ? "var(--accent)" : "var(--border-soft)") + ";border-radius:var(--radius);background:" + (m.selected ? "var(--accent-soft)" : "var(--surface)") + ";cursor:pointer;text-align:left")}>
                    <span style={css("width:1.1rem;height:1.1rem;border-radius:0.3rem;flex-shrink:0;display:grid;place-items:center;border:1.5px solid " + (m.selected ? "var(--accent)" : "var(--border)") + ";background:" + (m.selected ? "var(--accent)" : "transparent") + ";color:#fff")}>{m.selected && <Icon name="checkmark" size={11} />}</span>
                    <span style={css("flex:1;font-size:var(--text-sm);font-weight:500;color:var(--fg)")}>{m.label}</span>
                    <span style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>{m.pct}%</span>
                    <span style={css("font-size:var(--text-sm);font-weight:500;color:var(--fg);width:5rem;text-align:right")}>{money(amt)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* Line items */}
      <Section icon="checklist" title="Product details" hint="Add services, quantities, rates, discounts, and tax" flat
        right={<SavedServicePicker onPick={s => { dispatch({ t: "item", op: "add", service: s }); }} />}>
        <div style={css("overflow-x:auto")}>
          <div style={{ minWidth: mobile ? "32rem" : "auto" }}>
            <div data-line-item-grid="header" style={css("display:grid;grid-template-columns:" + lineItemGrid + ";gap:0.45rem;padding:0 0.1rem 0.45rem;align-items:end;" + eyebrowStyle("var(--fg-faint)"))}>
              <span>Item</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "center" }}>Unit</span><span style={{ textAlign: "right" }}>Cost</span><span style={{ textAlign: "right" }}>Total</span><span aria-hidden="true"></span>
            </div>
            {inv.items.map(i => (
              <div key={i.id} style={css("padding:0.45rem 0.1rem;border-top:1px solid var(--border-soft)")}>
                <div data-line-item-grid="row" style={css("display:grid;grid-template-columns:" + lineItemGrid + ";gap:0.45rem;align-items:center")}>
                  <input className="pt-input" value={i.service} placeholder="Item" onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { service: e.target.value } })} style={css(INPUT + ";padding:0.4rem 0.5rem;font-size:var(--text-xs)")} />
                  <input className="pt-input" aria-label="Quantity" type="number" value={i.qty} onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { qty: +e.target.value } })} style={css(INPUT + ";padding:0.4rem;font-size:var(--text-xs);text-align:center")} />
                  <select className="pt-input" aria-label="Unit" value={i.unit} onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { unit: e.target.value } })} style={css(INPUT + ";padding:0.4rem 0.2rem;font-size:var(--text-2xs);cursor:pointer;text-align:center")}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
                  <input className="pt-input" aria-label="Cost" type="number" value={i.rate} onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { rate: +e.target.value } })} style={css(INPUT + ";padding:0.4rem;font-size:var(--text-xs);text-align:right")} />
                  <span style={css("font-size:var(--text-sm);font-weight:500;text-align:right;white-space:nowrap")}>{money(lineAmount(i))}</span>
                  <div style={css("display:flex;justify-content:flex-end;gap:0.15rem;flex-shrink:0")}>
                    <button type="button" aria-label="Line item options" title="Description, discount & tax" onClick={() => setLineOptionsId(lineOptionsId === i.id ? null : i.id)} className="pt-iconbtn" style={css("width:1.6rem;height:1.6rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:" + (lineOptionsId === i.id ? "var(--accent-soft)" : "transparent") + ";color:" + (lineOptionsId === i.id ? "var(--accent)" : "var(--fg-muted)") + ";display:grid;place-items:center;cursor:pointer")}><Icon name="sliders" size={12} /></button>
                    <button type="button" title="Duplicate" onClick={() => dispatch({ t: "item", op: "dup", id: i.id })} className="pt-iconbtn" style={css("width:1.6rem;height:1.6rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")}><Icon name="layers" size={12} /></button>
                    <button type="button" title="Remove" onClick={() => dispatch({ t: "item", op: "remove", id: i.id })} className="pt-iconbtn" style={css("width:1.6rem;height:1.6rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:var(--danger);display:grid;place-items:center;cursor:pointer")}><Icon name="x" size={12} /></button>
                  </div>
                </div>
                {lineOptionsId === i.id && (
                  <div style={css("display:grid;grid-template-columns:2fr 0.75fr 0.75fr auto;gap:0.45rem;align-items:end;margin-top:0.45rem;padding:0.55rem;border-radius:var(--radius);background:var(--surface-alt)")}>
                    <Field label="Description"><input className="pt-input" value={i.description} placeholder="Description" onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { description: e.target.value } })} style={css(INPUT + ";padding:0.4rem 0.5rem;font-size:var(--text-xs);background:var(--surface)")} /></Field>
                    <Field label="Discount %"><input className="pt-input" type="number" value={i.discount} onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { discount: +e.target.value } })} style={css(INPUT + ";padding:0.4rem;font-size:var(--text-xs);background:var(--surface)")} /></Field>
                    <Field label="Tax %"><input className="pt-input" type="number" value={i.taxable ? i.taxRate : 0} disabled={!i.taxable} onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { taxRate: +e.target.value } })} style={css(INPUT + ";padding:0.4rem;font-size:var(--text-xs);background:var(--surface);opacity:" + (i.taxable ? "1" : "0.5"))} /></Field>
                    <button type="button" onClick={() => dispatch({ t: "item", op: "update", id: i.id, v: { taxable: !i.taxable } })} style={css(CHIP + ";height:2rem;border:1px solid " + (i.taxable ? "var(--accent)" : "var(--border)") + ";background:" + (i.taxable ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (i.taxable ? "var(--accent)" : "var(--fg-muted)"))}>{i.taxable ? "Taxable" : "Non-taxable"}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => dispatch({ t: "item", op: "add" })} style={css(BTN_GHOST + ";margin-top:0.7rem")}><Icon name="plus" size={14} />Add line item</button>
      </Section>

      {/* Time-based billing */}
      {flags.showTime && (
        <Section icon="clock" title="Time entries" hint="Import approved, billable time — each entry invoices once"
          right={<button type="button" onClick={() => dispatch({ t: "time", op: "import" })} style={css(CHIP + ";border:1px solid var(--border);color:var(--accent)")}><Icon name="history" size={12} />Import approved</button>}>
          {inv.time.length === 0 ? (
            <div style={css("font-size:var(--text-xs);color:var(--fg-faint);padding:0.5rem 0")}>No time imported yet. Import approved entries or add manually.</div>
          ) : (
            <>
              <div style={css("display:grid;grid-template-columns:1.8fr 1.2fr 0.7fr 0.7fr 0.8fr auto;gap:0.4rem;padding-bottom:0.4rem;" + eyebrowStyle("var(--fg-faint)"))}>
                <span>Task</span><span>Team member</span><span>Hours</span><span>Rate</span><span style={{ textAlign: "right" }}>Total</span><span></span>
              </div>
              {inv.time.map(t => (
                <div key={t.id} style={css("display:grid;grid-template-columns:1.8fr 1.2fr 0.7fr 0.7fr 0.8fr auto;gap:0.4rem;align-items:center;padding:0.3rem 0;border-top:1px solid var(--border-soft);opacity:" + (t.billable ? "1" : "0.55"))}>
                  <input className="pt-input" value={t.task} onChange={e => dispatch({ t: "time", op: "update", id: t.id, v: { task: e.target.value } })} style={css(INPUT + ";padding:0.35rem 0.45rem;font-size:var(--text-xs)")} />
                  <input className="pt-input" value={t.member} onChange={e => dispatch({ t: "time", op: "update", id: t.id, v: { member: e.target.value } })} style={css(INPUT + ";padding:0.35rem 0.45rem;font-size:var(--text-xs)")} />
                  <input className="pt-input" type="number" value={t.hours} onChange={e => dispatch({ t: "time", op: "update", id: t.id, v: { hours: +e.target.value } })} style={css(INPUT + ";padding:0.35rem 0.4rem;font-size:var(--text-xs)")} />
                  <input className="pt-input" type="number" value={t.rate} onChange={e => dispatch({ t: "time", op: "update", id: t.id, v: { rate: +e.target.value } })} style={css(INPUT + ";padding:0.35rem 0.4rem;font-size:var(--text-xs)")} />
                  <span style={css("font-size:var(--text-sm);font-weight:500;text-align:right;white-space:nowrap")}>{money(t.billable ? t.hours * t.rate : 0)}</span>
                  <div style={css("display:flex;gap:0.15rem")}>
                    <button type="button" title={t.billable ? "Billable" : "Non-billable"} onClick={() => dispatch({ t: "time", op: "update", id: t.id, v: { billable: !t.billable } })} className="pt-iconbtn" style={css("width:1.5rem;height:1.5rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:" + (t.billable ? "var(--success)" : "var(--fg-faint)") + ";display:grid;place-items:center;cursor:pointer")}><Icon name="check" size={12} /></button>
                    <button type="button" onClick={() => dispatch({ t: "time", op: "remove", id: t.id })} className="pt-iconbtn" style={css("width:1.5rem;height:1.5rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:var(--danger);display:grid;place-items:center;cursor:pointer")}><Icon name="x" size={12} /></button>
                  </div>
                </div>
              ))}
            </>
          )}
        </Section>
      )}

      {/* Retainer */}
      {flags.showRetainer && (
        <Section icon="replay" title="Retainer tracking" hint="Included hours, overage and rollover">
          <div style={css(grid3)}>
            <Field label="Retainer package">{txt(inv.retainer.pkg, v => set({ retainer: { ...inv.retainer, pkg: v } }))}</Field>
            <Field label="Billing period">{txt(inv.retainer.period, v => set({ retainer: { ...inv.retainer, period: v } }))}</Field>
            <Field label="Next billing date">{txt(inv.retainer.nextBilling, v => set({ retainer: { ...inv.retainer, nextBilling: v } }), { type: "date" })}</Field>
            <Field label="Included hours">{txt(inv.retainer.includedHours, v => set({ retainer: { ...inv.retainer, includedHours: +v } }), { type: "number" })}</Field>
            <Field label="Hours used">{txt(inv.retainer.hoursUsed, v => set({ retainer: { ...inv.retainer, hoursUsed: +v } }), { type: "number" })}</Field>
            <Field label="Overage rate">{txt(inv.retainer.overageRate, v => set({ retainer: { ...inv.retainer, overageRate: +v } }), { type: "number" })}</Field>
          </div>
          <div style={css("display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:0.65rem")}>
            {(() => {
              const rem = Math.max(0, inv.retainer.includedHours - inv.retainer.hoursUsed);
              const over = Math.max(0, inv.retainer.hoursUsed - inv.retainer.includedHours);
              return [["Remaining", rem + " h"], ["Overage", over + " h"], ["Rollover", inv.retainer.rollover ? (rem + " h") : "Off"]].map(([l, v]) => (
                <span key={l} style={css("display:inline-flex;gap:0.35rem;align-items:center;padding:0.35rem 0.6rem;border-radius:var(--radius-pill);background:var(--surface-alt);border:1px solid var(--border-soft);font-size:var(--text-2xs);color:var(--fg-muted)")}><b style={css("color:var(--fg);font-weight:500")}>{v}</b>{l}</span>
              ));
            })()}
            <button type="button" onClick={() => set({ retainer: { ...inv.retainer, rollover: !inv.retainer.rollover } })} style={css(CHIP + ";border:1px solid " + (inv.retainer.rollover ? "var(--accent)" : "var(--border)") + ";color:" + (inv.retainer.rollover ? "var(--accent)" : "var(--fg-muted)"))}>Rollover unused hours: {inv.retainer.rollover ? "On" : "Off"}</button>
          </div>
        </Section>
      )}

      {/* Expenses */}
      <Section icon="wallet" title="Expenses & reimbursements" hint="Bill back themes, apps, plugins, hosting & contractor costs" defaultOpen={false}
        right={<button type="button" onClick={() => dispatch({ t: "expense", op: "add" })} style={css(CHIP + ";border:1px solid var(--border);color:var(--fg-muted)")}><Icon name="plus" size={12} />Add expense</button>}>
        {inv.expenses.length === 0 ? (
          <div style={css("display:flex;flex-wrap:wrap;gap:0.35rem")}>{EXPENSE_PRESETS.map(x => <button key={x} type="button" onClick={() => dispatch({ t: "expense", op: "add", v: { description: x } })} style={css(CHIP + ";border:1px dashed var(--border);color:var(--fg-faint)")}><Icon name="plus" size={11} />{x}</button>)}</div>
        ) : (
          <>
            <div style={css("display:grid;grid-template-columns:1.6fr 1fr 0.9fr 0.7fr 0.7fr auto;gap:0.4rem;padding-bottom:0.4rem;" + eyebrowStyle("var(--fg-faint)"))}>
              <span>Expense</span><span>Vendor</span><span>Cost</span><span>Markup%</span><span style={{ textAlign: "right" }}>Total</span><span></span>
            </div>
            {inv.expenses.map(e => (
              <div key={e.id} style={css("display:grid;grid-template-columns:1.6fr 1fr 0.9fr 0.7fr 0.7fr auto;gap:0.4rem;align-items:center;padding:0.3rem 0;border-top:1px solid var(--border-soft)")}>
                <input className="pt-input" value={e.description} placeholder="Description" onChange={ev => dispatch({ t: "expense", op: "update", id: e.id, v: { description: ev.target.value } })} style={css(INPUT + ";padding:0.35rem 0.45rem;font-size:var(--text-xs)")} />
                <input className="pt-input" value={e.vendor} placeholder="Vendor" onChange={ev => dispatch({ t: "expense", op: "update", id: e.id, v: { vendor: ev.target.value } })} style={css(INPUT + ";padding:0.35rem 0.45rem;font-size:var(--text-xs)")} />
                <input className="pt-input" type="number" value={e.cost} onChange={ev => dispatch({ t: "expense", op: "update", id: e.id, v: { cost: +ev.target.value } })} style={css(INPUT + ";padding:0.35rem 0.4rem;font-size:var(--text-xs)")} />
                <input className="pt-input" type="number" value={e.markup} onChange={ev => dispatch({ t: "expense", op: "update", id: e.id, v: { markup: +ev.target.value } })} style={css(INPUT + ";padding:0.35rem 0.4rem;font-size:var(--text-xs)")} />
                <span style={css("font-size:var(--text-sm);font-weight:500;text-align:right;white-space:nowrap")}>{money(p.expenseAmount(e))}</span>
                <div style={css("display:flex;gap:0.15rem")}>
                  <button type="button" title="Attach receipt" onClick={() => actions.showToast("Receipt attached")} className="pt-iconbtn" style={css("width:1.5rem;height:1.5rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")}><Icon name="clip" size={12} /></button>
                  <button type="button" onClick={() => dispatch({ t: "expense", op: "remove", id: e.id })} className="pt-iconbtn" style={css("width:1.5rem;height:1.5rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:var(--danger);display:grid;place-items:center;cursor:pointer")}><Icon name="x" size={12} /></button>
                </div>
              </div>
            ))}
          </>
        )}
      </Section>

      {/* Deposit / project tracking */}
      {flags.showDeposit && (
        <Section icon="chart" title="Deposit & project balance" hint="Invoice balance is separate from the total project balance">
          <div style={css(grid3)}>
            <Field label="Total project value">{txt(inv.deposit.projectValue, v => set({ deposit: { ...inv.deposit, projectValue: +v } }), { type: "number" })}</Field>
            <Field label="Deposit required">{txt(inv.deposit.depositRequired, v => set({ deposit: { ...inv.deposit, depositRequired: +v } }), { type: "number" })}</Field>
            <Field label="Deposit already paid">{txt(inv.deposit.depositPaid, v => set({ deposit: { ...inv.deposit, depositPaid: +v } }), { type: "number" })}</Field>
            <Field label="Previous milestone payments">{txt(inv.deposit.prevMilestones, v => set({ deposit: { ...inv.deposit, prevMilestones: +v } }), { type: "number" })}</Field>
          </div>
          <button type="button" onClick={() => set({ deposit: { ...inv.deposit, isFinal: !inv.deposit.isFinal } })} style={css("display:flex;align-items:center;gap:var(--space-2);margin-top:0.6rem;padding:0.5rem 0.65rem;border:1px solid " + (inv.deposit.isFinal ? "var(--accent)" : "var(--border-soft)") + ";border-radius:var(--radius);background:" + (inv.deposit.isFinal ? "var(--accent-soft)" : "var(--surface)") + ";cursor:pointer;text-align:left;width:100%")}>
            <span style={css("width:1.1rem;height:1.1rem;border-radius:0.3rem;flex-shrink:0;display:grid;place-items:center;border:1.5px solid " + (inv.deposit.isFinal ? "var(--accent)" : "var(--border)") + ";background:" + (inv.deposit.isFinal ? "var(--accent)" : "transparent") + ";color:#fff")}>{inv.deposit.isFinal && <Icon name="checkmark" size={11} />}</span>
            <span style={css("font-size:var(--text-xs);color:var(--fg)")}>Final invoice — bill the remaining project balance</span>
          </button>
        </Section>
      )}

      {/* Recurring */}
      {flags.showRecurring && (
        <Section icon="replay" title="Recurring invoice" hint="Automate future invoices for this service">
          <button type="button" onClick={() => set({ recurring: { ...inv.recurring, enabled: !inv.recurring.enabled } })} style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:0.6rem 0.7rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface);cursor:pointer;width:100%;text-align:left;margin-bottom:0.6rem")}>
            <span style={css("font-size:var(--text-sm);font-weight:500;color:var(--fg)")}>Enable recurring billing</span>
            <span style={css("width:2.4rem;height:1.4rem;border-radius:999px;display:flex;align-items:center;padding:0.14rem;background:" + (inv.recurring.enabled ? "var(--accent)" : "var(--border)") + ";justify-content:" + (inv.recurring.enabled ? "flex-end" : "flex-start"))}><span style={css("width:1.1rem;height:1.1rem;border-radius:50%;background:#fff")} /></span>
          </button>
          {inv.recurring.enabled && (
            <div style={css(grid3)}>
              <Field label="Frequency">{sel(inv.recurring.frequency, ["Weekly", "Monthly", "Quarterly", "Annually"], v => set({ recurring: { ...inv.recurring, frequency: v } }))}</Field>
              <Field label="Start date">{txt(inv.recurring.start, v => set({ recurring: { ...inv.recurring, start: v } }), { type: "date" })}</Field>
              <Field label="Occurrences">{txt(inv.recurring.occurrences, v => set({ recurring: { ...inv.recurring, occurrences: +v } }), { type: "number" })}</Field>
              <Field label="Auto-create" span>
                <div style={css("display:flex;gap:0.4rem;flex-wrap:wrap")}>
                  {[["Auto-create invoice", "autoCreate"], ["Auto-send", "autoSend"]].map(([l, k]) => (
                    <button key={k} type="button" onClick={() => set({ recurring: { ...inv.recurring, [k]: !inv.recurring[k as "autoCreate" | "autoSend"] } })} style={css(CHIP + ";border:1px solid " + (inv.recurring[k as "autoCreate" | "autoSend"] ? "var(--accent)" : "var(--border)") + ";color:" + (inv.recurring[k as "autoCreate" | "autoSend"] ? "var(--accent)" : "var(--fg-muted)"))}>{l}: {inv.recurring[k as "autoCreate" | "autoSend"] ? "On" : "Off"}</button>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </Section>
      )}

      {/* Wise payment */}
      <Section icon="card" title="Payment — Wise only" defaultOpen={false}>
        <div style={css("display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "minmax(0,1fr) 7.5rem") + ";gap:0.85rem;align-items:center;padding:0.8rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt)")}>
          <div style={{ minWidth: 0 }}>
            <span style={css("display:inline-flex;align-items:center;gap:0.3rem;padding:0.28rem 0.5rem;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:var(--text-2xs);font-weight:500")}><Icon name="check" size={11} />Wise only</span>
            <div style={css("margin-top:0.55rem;font-size:var(--text-xs);color:var(--fg-muted);line-height:1.45")}>{WISE_INSTRUCTIONS}</div>
            <a href={WISE_PAYMENT_URL} target="_blank" rel="noreferrer" style={css("display:inline-flex;align-items:center;gap:0.35rem;margin-top:0.45rem;max-width:100%;font-size:var(--text-2xs);color:var(--accent);text-decoration:none;overflow-wrap:anywhere")}><Icon name="send" size={12} />{WISE_PAYMENT_URL}</a>
          </div>
          <img src="/wise-payment-qr.jpeg" alt="Wise payment QR code" style={css("display:block;width:100%;aspect-ratio:1;border-radius:0.7rem;border:1px solid var(--border-soft);object-fit:cover;background:#fff")} />
        </div>
      </Section>

      {/* Notes & terms */}
      <Section icon="file" title="Standard note & terms" hint="Short, consistent wording for every invoice" defaultOpen={false} last>
        <div style={css("display:flex;flex-direction:column;gap:0.6rem")}>
          <Field label="Standard invoice note"><textarea className="pt-input" value={inv.notes} onChange={e => set({ notes: e.target.value })} rows={2} style={css(INPUT + ";resize:vertical;line-height:1.45")} /></Field>
          <Field label="Standard terms">
            <textarea className="pt-input" value={inv.terms} onChange={e => set({ terms: e.target.value })} rows={2} style={css(INPUT + ";resize:vertical;line-height:1.45")} />
          </Field>
          <div style={css("display:flex;gap:0.4rem;flex-wrap:wrap")}>
            <button type="button" onClick={() => set({ notes: STANDARD_NOTE, terms: DEFAULT_TERMS })} style={css(CHIP + ";border:1px solid var(--border);color:var(--fg-muted)")}><Icon name="replay" size={12} />Reset standard wording</button>
          </div>
        </div>
      </Section>

      </div>

    </>
  );
}

function SavedServicePicker({ onPick }: { onPick: (s: SavedService) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={css(CHIP + ";border:1px solid var(--border);color:var(--accent)")}><Icon name="plus" size={12} />Saved service</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ ...css("position:absolute;top:2rem;right:0;width:16rem;max-height:18rem;overflow-y:auto;padding:0.35rem;border:1px solid var(--border);border-radius:0.9rem;background:var(--surface);z-index:41;box-shadow:0 12px 30px -14px rgba(0,0,0,.25)"), animation: "pt-ddin .16s ease" }}>
            {SAVED_SERVICES.map(s => (
              <button key={s.name} type="button" onClick={() => { onPick(s); setOpen(false); }} className="pt-menuitem" style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);width:100%;padding:0.45rem 0.55rem;border:0;border-radius:0.5rem;background:transparent;cursor:pointer;text-align:left")}>
                <span style={css("font-size:var(--text-xs);font-weight:500;color:var(--fg)")}>{s.name}</span>
                <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>£{s.rate}/{s.unit.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── LIVE PREVIEW ──────────────────────────────────────────────────────────────
function Preview({ inv, biz, client, project, calc, money, lineAmount, expenseAmount, onTemplate }: {
  inv: Inv; biz: BizProfile; client: InvClient | null; project: typeof PROJECTS[number] | null;
  calc: Record<string, number>; money: (n: number) => string; lineAmount: (i: Item) => number; expenseAmount: (e: Expense) => number;
  onTemplate?: (t: string) => void;
}) {
  const A = inv.accent;
  const statusTone = STATUSES.find(([s]) => s === inv.status)?.[1] || "waiting";
  const items = inv.items.filter(i => i.service || lineAmount(i) > 0);
  const subtotal = calc.serviceSubtotal + calc.expenseSubtotal + calc.timeSubtotal;
  const metaRows = ([["Issue date", inv.issueDate], ["Due date", inv.dueDate], ["Terms", inv.paymentTerms], inv.showProject && project ? ["Project", project.name] : ["Billing", inv.billingType], inv.poNumber ? ["PO", inv.poNumber] : null].filter(Boolean)) as [string, string][];

  const clientBlock = client
    ? <div style={css("font-size:var(--text-xs);line-height:1.5")}><b style={css("font-weight:500")}>{client.company}</b><br />{client.name}<br />{client.address}<br />{client.email}</div>
    : <div style={css("font-size:var(--text-xs);color:var(--fg-faint)")}>Select a client…</div>;

  const metaPanel = (
    <div data-invoice-meta-layout style={css("display:grid;grid-template-columns:1fr 1fr;gap:0.6rem") }>
      <div style={css("padding:0.7rem 0.8rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface)")}>
        <div style={css(eyebrowStyle("var(--fg-faint)") + ";margin-bottom:0.3rem")}>Billed to</div>
        {clientBlock}
      </div>
      <div style={css("padding:0.7rem 0.8rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface)")}>
        <div style={css(eyebrowStyle("var(--fg-faint)") + ";margin-bottom:0.3rem")}>Details</div>
        {metaRows.map(([l, v]) => <div key={l} style={css("display:flex;justify-content:space-between;gap:var(--space-2);font-size:var(--text-2xs);margin-bottom:0.12rem")}><span style={css("color:var(--fg-faint)")}>{l}</span><span style={css("font-weight:500;text-align:right")}>{v}</span></div>)}
      </div>
    </div>
  );

  const itemRows = (
    <>
      {items.map(i => (
        <div key={i.id} style={css("display:grid;grid-template-columns:2.2fr 0.5fr 1fr;gap:0.4rem;padding:0.45rem 0;border-bottom:1px solid var(--border-soft)")}>
          <div style={{ minWidth: 0 }}><div style={css("font-size:var(--text-xs);font-weight:500")}>{i.service || "Service"}</div>{i.description && <div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:0.1rem")}>{i.description}</div>}</div>
          <span style={css("font-size:var(--text-xs);text-align:center;color:var(--fg-muted)")}>{i.qty} {i.unit.toLowerCase()}</span>
          <span style={css("font-size:var(--text-xs);font-weight:500;text-align:right")}>{money(lineAmount(i))}</span>
        </div>
      ))}
      {inv.expenses.map(e => (
        <div key={e.id} style={css("display:grid;grid-template-columns:2.2fr 0.5fr 1fr;gap:0.4rem;padding:0.45rem 0;border-bottom:1px solid var(--border-soft)")}>
          <div style={css("font-size:var(--text-xs)")}>{e.description || "Expense"}{e.vendor && <span style={css("color:var(--fg-faint)")}> · {e.vendor}</span>}</div>
          <span style={css("text-align:center;color:var(--fg-faint);font-size:var(--text-2xs)")}>exp</span>
          <span style={css("font-size:var(--text-xs);font-weight:500;text-align:right")}>{money(expenseAmount(e))}</span>
        </div>
      ))}
    </>
  );
  const itemHead = (
    <div style={css("display:grid;grid-template-columns:2.2fr 0.5fr 1fr;gap:0.4rem;padding-bottom:0.35rem;border-bottom:1px solid var(--border-soft);" + eyebrowStyle("var(--fg-faint)"))}>
      <span>Service</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Amount</span>
    </div>
  );
  const totals = (
    <div style={css("display:flex;flex-direction:column;gap:0.15rem;padding:0.5rem 0;max-width:16rem;margin-left:auto")}>
      <PRow l="Subtotal" v={money(subtotal)} />
      {calc.discount > 0 && <PRow l="Discount" v={"− " + money(calc.discount)} />}
      {inv.showTax && <PRow l="Tax" v={money(calc.tax)} />}
      {calc.processing > 0 && <PRow l="Processing" v={money(calc.processing)} />}
      <div style={css("display:flex;justify-content:space-between;margin-top:0.3rem;padding-top:0.4rem;border-top:2px solid " + A)}>
        <span style={css("font-size:var(--text-base);font-weight:500")}>Balance due</span>
        <span style={css("font-size:var(--text-lg);font-weight:500;color:" + A)}>{money(calc.balance)}</span>
      </div>
    </div>
  );
  const foot = (
    <>
      {inv.showProject && inv.deposit.projectValue > 0 && (
        <div style={css("margin-top:0.7rem;padding:0.6rem 0.7rem;border-radius:var(--radius);background:var(--surface-alt);font-size:var(--text-2xs);color:var(--fg-muted)")}>
          <div style={css("display:flex;justify-content:space-between")}><span>Total project value</span><b style={css("color:var(--fg);font-weight:500")}>{money(inv.deposit.projectValue)}</b></div>
          <div style={css("display:flex;justify-content:space-between;margin-top:0.15rem")}><span>Remaining project balance</span><b style={css("color:var(--fg);font-weight:500")}>{money(calc.remainingProject)}</b></div>
        </div>
      )}
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-3);margin-top:0.8rem")}>
        <div style={{ minWidth: 0 }}>
          <div style={css(eyebrowStyle("var(--fg-faint)") + ";margin-bottom:0.25rem")}>Payment · Wise only</div>
          <div style={css("font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.5")}>{WISE_INSTRUCTIONS}</div>
          <a href={WISE_PAYMENT_URL} target="_blank" rel="noreferrer" style={css("display:inline-block;margin-top:0.25rem;font-size:var(--text-2xs);color:" + A + ";text-decoration:none")}>Pay with Wise</a>
        </div>
        <img src="/wise-payment-qr.jpeg" alt="Wise payment QR code" style={css("width:4.5rem;height:4.5rem;flex-shrink:0;border-radius:0.55rem;border:1px solid var(--border-soft);object-fit:cover;background:#fff")} />
      </div>
      {inv.notes && <div style={css("margin-top:0.7rem;font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.5")}>{inv.notes}</div>}
      <div style={css("margin-top:0.7rem;font-size:var(--text-2xs);color:var(--fg-faint);line-height:1.5")}>{inv.terms}</div>
      {inv.thankYou && <div style={css("margin-top:0.8rem;text-align:center;font-size:var(--text-xs);font-weight:500;color:" + A)}>{inv.thankYou}</div>}
      <div style={css("margin-top:0.7rem;padding-top:0.6rem;border-top:1px solid var(--border-soft);text-align:center;font-size:var(--text-2xs);color:var(--fg-faint)")}>{inv.footer}</div>
    </>
  );

  // ── Classic — centered masthead, ruled sections ──
  const classic = (
    <div style={css("padding:1.2rem 1.25rem;font-size:var(--text-sm);color:var(--fg)")}>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);padding-bottom:1rem;border-bottom:2px solid " + A)}>
        <div style={css("display:flex;align-items:center;gap:0.6rem;min-width:0")}>
          {inv.showLogo && <span style={css("width:2.4rem;height:2.4rem;border-radius:0.5rem;flex-shrink:0;background:" + A + ";color:#fff;display:grid;place-items:center;font-size:var(--text-sm);font-weight:500")}>{biz.logo}</span>}
          <div style={{ minWidth: 0 }}><div style={css("font-size:var(--text-lg);font-weight:500;line-height:1.2")}>{biz.name}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.4;margin-top:0.15rem")}>{biz.address}<br />{biz.email} · {biz.website}</div></div>
        </div>
        <div style={css("text-align:right;flex-shrink:0")}><div style={css("font-size:var(--text-xl);font-weight:500;letter-spacing:0.02em;color:" + A)}>INVOICE</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted);margin-top:0.2rem")}>{inv.number}</div></div>
      </div>
      <div style={css("margin:0.9rem 0")}>{metaPanel}</div>
      <div style={css("padding:0.6rem 0")}>{itemHead}{itemRows}</div>
      {totals}
      {foot}
    </div>
  );

  // ── Modern — full-bleed accent header, carded meta & totals ──
  const modern = (
    <div style={css("font-size:var(--text-sm);color:var(--fg)")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:1.1rem 1.25rem;background:" + A + ";color:#fff")}>
        <div style={css("display:flex;align-items:center;gap:0.65rem;min-width:0")}>
          {inv.showLogo && <span style={css("width:2.5rem;height:2.5rem;border-radius:0.55rem;flex-shrink:0;background:rgba(255,255,255,.18);color:#fff;display:grid;place-items:center;font-size:var(--text-sm);font-weight:500")}>{biz.logo}</span>}
          <div style={{ minWidth: 0 }}><div style={css("font-size:var(--text-lg);font-weight:500;line-height:1.2")}>{biz.name}</div><div style={css("font-size:var(--text-2xs);color:rgba(255,255,255,.82);margin-top:0.1rem")}>{biz.website} · {biz.email}</div></div>
        </div>
        <div style={css("text-align:right;flex-shrink:0")}><div style={css("font-size:var(--text-2xl);font-weight:500;letter-spacing:0.04em")}>INVOICE</div><div style={css("font-size:var(--text-2xs);color:rgba(255,255,255,.85);margin-top:0.15rem")}>{inv.number}</div></div>
      </div>
      <div style={css("padding:1.1rem 1.2rem")}>
        <div style={css("margin-bottom:0.9rem")}>{metaPanel}</div>
        <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius);overflow:hidden")}>
          <div style={css("display:grid;grid-template-columns:2.2fr 0.5fr 1fr;gap:0.4rem;padding:0.5rem 0.75rem;background:color-mix(in srgb," + A + " 12%,white 88%);" + eyebrowStyle(A))}><span>Service</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Amount</span></div>
          <div style={css("padding:0 0.75rem")}>{itemRows}</div>
        </div>
        <div style={css("margin-top:0.7rem;padding:0.35rem 0.85rem;border-radius:var(--radius);background:color-mix(in srgb," + A + " 8%,white 92%)")}>{totals}</div>
        {foot}
      </div>
    </div>
  );

  // ── Minimal — hairlines, generous whitespace, understated ──
  const minimal = (
    <div style={css("padding:1.5rem 1.5rem;font-size:var(--text-sm);color:var(--fg)")}>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4)")}>
        <div style={css("display:flex;align-items:center;gap:0.55rem;min-width:0")}>
          {inv.showLogo && <span style={css("width:2rem;height:2rem;border-radius:0.45rem;flex-shrink:0;background:var(--surface-alt);color:var(--fg);display:grid;place-items:center;font-size:var(--text-2xs);font-weight:500")}>{biz.logo}</span>}
          <div style={{ minWidth: 0 }}><div style={css("font-size:var(--text-md);font-weight:500")}>{biz.name}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:0.1rem")}>{biz.email}</div></div>
        </div>
        <div style={css("text-align:right;flex-shrink:0")}><div style={css(eyebrowStyle("var(--fg-faint)"))}>Invoice</div><div style={css("font-size:var(--text-sm);font-weight:500;margin-top:0.15rem")}>{inv.number}</div></div>
      </div>
      <div style={css("height:1px;background:var(--border-soft);margin:1rem 0")} />
      {metaPanel}
      <div style={css("height:1px;background:var(--border-soft);margin:1rem 0")} />
      {itemHead}{itemRows}
      {totals}
      {foot}
    </div>
  );

  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);padding:0.5rem 0.7rem;border-bottom:1px solid var(--border-soft);background:var(--surface-alt);flex-wrap:wrap")}>
        <span style={css(eyebrowStyle("var(--fg-faint)"))}>Live preview</span>
        <div style={css("display:flex;align-items:center;gap:var(--space-2)")}>
          {onTemplate && (
            <div style={css("display:inline-flex;padding:0.15rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);gap:0.1rem")}>
              {["Classic", "Modern", "Minimal"].map(t => (
                <button key={t} type="button" onClick={() => onTemplate(t)} aria-pressed={inv.template === t} style={css("padding:0.24rem 0.6rem;border:0;border-radius:var(--radius-pill);font-size:var(--text-2xs);font-weight:500;cursor:pointer;background:" + (inv.template === t ? "var(--accent)" : "transparent") + ";color:" + (inv.template === t ? "#fff" : "var(--fg-muted)"))}>{t}</button>
              ))}
            </div>
          )}
          <span style={css(statusPill(statusTone))}>{inv.status}</span>
        </div>
      </div>
      {inv.template === "Modern" ? modern : inv.template === "Minimal" ? minimal : classic}
    </div>
  );
}
function PRow({ l, v }: { l: string; v: string }) {
  return <div style={css("display:flex;justify-content:space-between")}><span style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>{l}</span><span style={css("font-size:var(--text-xs);font-weight:500")}>{v}</span></div>;
}

// ── MODALS ────────────────────────────────────────────────────────────────────
function Shell({ children, label, onClose, wide }: { children: ReactNode; label: string; onClose: () => void; wide?: boolean }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={label} onClick={onClose} style={{ ...css("position:fixed;inset:0;z-index:90;background:rgba(35,25,18,.34);padding:var(--space-4);display:flex;align-items:flex-start;justify-content:center;overflow:auto"), animation: "pt-fadein .14s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ ...css("width:min(" + (wide ? "34rem" : "26rem") + ",100%);margin:3rem auto;border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);overflow:hidden"), animation: "pt-sheetup .18s ease" }}>
        {children}
      </div>
    </div>
  );
}
function ModalHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem;padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
      <div style={css("font-size:var(--text-lg);font-weight:500")}>{title}</div>
      <button type="button" onClick={onClose} className="pt-iconbtn" style={css("width:2rem;height:2rem;border-radius:50%;border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")}><Icon name="x" size={14} /></button>
    </div>
  );
}

function SendModal({ inv, client, project, calc, money, onClose, onSend }: { inv: Inv; client: InvClient | null; project: typeof PROJECTS[number] | null; calc: Record<string, number>; money: (n: number) => string; onClose: () => void; onSend: () => void }) {
  const [preview, setPreview] = useState(false);
  const body = "Hi " + (client?.name || "there") + ",\n\nPlease find attached invoice " + inv.number + " for " + (project?.name || "your project") + ".\n\nAmount due: " + money(calc.balance) + "\nDue date: " + inv.dueDate + "\n\nYou can pay securely via the link below. Thank you!";
  return (
    <Shell label="Send invoice" onClose={onClose} wide>
      <ModalHead title="Send invoice" onClose={onClose} />
      <div style={css("padding:1rem 1.1rem;display:flex;flex-direction:column;gap:0.6rem")}>
        {preview ? (
          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt);padding:0.85rem;font-size:var(--text-sm);white-space:pre-wrap;line-height:1.55;color:var(--fg)")}>{"Subject: Invoice " + inv.number + " · " + money(calc.balance) + " due\n\n" + body}</div>
        ) : (
          <>
            <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)")}>
              <Field label="To">{txt(client?.email || "", () => {})}</Field>
              <Field label="Subject">{txt("Invoice " + inv.number + " · " + money(calc.balance) + " due", () => {})}</Field>
              <Field label="CC">{txt("", () => {}, { ph: "cc@…" })}</Field>
              <Field label="BCC">{txt("", () => {}, { ph: "bcc@…" })}</Field>
            </div>
            <Field label="Message"><textarea className="pt-input" defaultValue={body} rows={7} style={css(INPUT + ";resize:vertical;line-height:1.5")} /></Field>
            <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem")}>
              {["Attach invoice PDF", "Include payment link", "Include documents", "Send a copy to me"].map(o => <span key={o} style={css(CHIP + ";border:1px solid var(--accent);color:var(--accent);background:var(--accent-soft)")}><Icon name="check" size={11} />{o}</span>)}
            </div>
            <Field label="Schedule send (optional)">{txt("", () => {}, { type: "datetime-local" })}</Field>
          </>
        )}
      </div>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);padding:0.85rem 1.1rem;border-top:1px solid var(--border-soft)")}>
        <button type="button" onClick={() => setPreview(p => !p)} style={css(BTN_GHOST)}><Icon name="eye" size={14} />{preview ? "Edit email" : "Preview email"}</button>
        <button type="button" onClick={onSend} style={css(BTN_PRIMARY)}><Icon name="send" size={14} />Send invoice</button>
      </div>
    </Shell>
  );
}

function PaymentModal({ inv, calc, money, onClose, onRecord }: { inv: Inv; calc: Record<string, number>; money: (n: number) => string; onClose: () => void; onRecord: (amount: number) => void }) {
  const [amount, setAmount] = useState(String(Math.max(0, calc.balance)));
  return (
    <Shell label="Record payment" onClose={onClose}>
      <ModalHead title="Record payment" onClose={onClose} />
      <div style={css("padding:1rem 1.1rem;display:flex;flex-direction:column;gap:0.6rem")}>
        <div style={css("display:flex;justify-content:space-between;padding:0.5rem 0.7rem;border-radius:var(--radius);background:var(--surface-alt);font-size:var(--text-sm)")}><span style={css("color:var(--fg-muted)")}>Balance due</span><b style={css("font-weight:500")}>{money(calc.balance)}</b></div>
        <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)")}>
          <Field label="Payment amount"><input className="pt-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} style={css(INPUT)} /></Field>
          <Field label="Payment date">{txt(inv.issueDate, () => {}, { type: "date" })}</Field>
          <Field label="Method">{sel("Wise", ["Wise"], () => {})}</Field>
          <Field label="Transaction reference">{txt("", () => {}, { ph: "TXN-…" })}</Field>
          <Field label="Processing fee">{txt("0", () => {}, { type: "number" })}</Field>
          <Field label="Notes">{txt("", () => {}, { ph: "Optional" })}</Field>
        </div>
        <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem")}>
          <span style={css(CHIP + ";border:1px solid var(--accent);color:var(--accent);background:var(--accent-soft)")}><Icon name="check" size={11} />Send receipt to client</span>
          <span style={css(CHIP + ";border:1px solid var(--border);color:var(--fg-muted)")}><Icon name="clip" size={11} />Attach proof of payment</span>
        </div>
      </div>
      <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2);padding:0.85rem 1.1rem;border-top:1px solid var(--border-soft)")}>
        <button type="button" onClick={onClose} style={css(BTN_GHOST)}>Cancel</button>
        <button type="button" onClick={() => onRecord(Math.max(0, +amount || 0))} style={css(BTN_PRIMARY)}><Icon name="wallet" size={14} />Record payment</button>
      </div>
    </Shell>
  );
}

function ConfirmModal({ kind, number, onClose, onConfirm }: { kind: "cancel" | "delete"; number: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <Shell label="Confirm" onClose={onClose}>
      <div style={css("padding:1.3rem 1.2rem;text-align:center")}>
        <span style={css("width:2.8rem;height:2.8rem;border-radius:50%;background:var(--danger-soft);color:var(--danger);display:grid;place-items:center;margin:0 auto 0.7rem")}><Icon name="alert" size={20} /></span>
        <div style={css("font-size:var(--text-lg);font-weight:500")}>{kind === "cancel" ? "Cancel this invoice?" : "Delete this invoice?"}</div>
        <p style={css("margin:0.4rem 0 0;font-size:var(--text-sm);color:var(--fg-muted);line-height:1.5")}>Invoice {number} will be {kind === "cancel" ? "marked as cancelled" : "permanently removed"}. This can’t be undone.</p>
        <div style={css("display:flex;gap:var(--space-2);justify-content:center;margin-top:1rem")}>
          <button type="button" onClick={onClose} style={css(BTN_GHOST)}>Keep invoice</button>
          <button type="button" onClick={onConfirm} style={css(BTN_PRIMARY + ";background:var(--danger)")}>{kind === "cancel" ? "Cancel invoice" : "Delete invoice"}</button>
        </div>
      </div>
    </Shell>
  );
}

function ProfileModal({ biz, onClose, onSave }: { biz: BizProfile; onClose: () => void; onSave: () => void }) {
  return (
    <Shell label="Business profile" onClose={onClose} wide>
      <ModalHead title="Edit business profile" onClose={onClose} />
      <div style={css("padding:1rem 1.1rem;display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)")}>
        <Field label="Business name">{txt(biz.name, () => {})}</Field>
        <Field label="Logo initials">{txt(biz.logo, () => {})}</Field>
        <Field label="Email">{txt(biz.email, () => {})}</Field>
        <Field label="Phone">{txt(biz.phone, () => {})}</Field>
        <Field label="Website">{txt(biz.website, () => {})}</Field>
        <Field label="Tax ID / VAT">{txt(biz.taxId, () => {})}</Field>
        <Field label="Address" span>{txt(biz.address, () => {})}</Field>
        <Field label="Default payment instructions" span><textarea className="pt-input" defaultValue={biz.instructions} rows={2} style={css(INPUT + ";resize:vertical")} /></Field>
        <Field label="Bank / payment account" span>{txt(biz.account, () => {})}</Field>
      </div>
      <div style={css("display:flex;justify-content:flex-end;gap:var(--space-2);padding:0.85rem 1.1rem;border-top:1px solid var(--border-soft)")}>
        <button type="button" onClick={onClose} style={css(BTN_GHOST)}>Cancel</button>
        <button type="button" onClick={onSave} style={css(BTN_PRIMARY)}><Icon name="check" size={14} />Save profile</button>
      </div>
    </Shell>
  );
}
