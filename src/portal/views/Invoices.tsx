"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { Icon } from "../icons";
import { css, eyebrowStyle, statusPill } from "../helpers";
import { STUDIO_CLIENTS } from "../clients";
import type { PortalActions, PortalState } from "../store";

// ── design primitives (match the rest of the portal) ─────────────────────────
const CARD = "border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.05rem 1.1rem";
const INPUT = "width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:var(--radius);padding:0.5rem 0.62rem;font-size:0.82rem;font-family:inherit;background:var(--surface-alt);color:var(--fg);outline:none";
const BTN_PRIMARY = "display:inline-flex;align-items:center;gap:0.4rem;height:2.1rem;padding:0 0.9rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:0.78rem;font-weight:500;cursor:pointer;white-space:nowrap";
const BTN_GHOST = "display:inline-flex;align-items:center;gap:0.4rem;height:2.1rem;padding:0 0.8rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:0.78rem;font-weight:500;cursor:pointer;white-space:nowrap";
const CHIP = "display:inline-flex;align-items:center;gap:0.32rem;padding:0.3rem 0.6rem;border-radius:var(--radius-pill);font-size:0.72rem;font-weight:500;cursor:pointer;white-space:nowrap";

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
const BUSINESS_PROFILES: BizProfile[] = [
  { id: "baltz", name: "Baltazar Studio", logo: "BS", address: "12 Atelier Row, London, EC1V 9BT, UK", email: "billing@baltazar.studio", phone: "+44 20 7946 0112", website: "baltazar.studio", taxId: "GB 428 1193 55", currency: "GBP", instructions: "Payment due within 14 days by bank transfer or Wise.", account: "Wise · Baltazar Studio Ltd · IBAN GB29 NWBK 6016 1331 9268 19" },
  { id: "cocoon", name: "Cocoon Audits", logo: "CA", address: "12 Atelier Row, London, EC1V 9BT, UK", email: "hello@cocoonaudits.co", phone: "+44 20 7946 0112", website: "cocoonaudits.co", taxId: "GB 428 1193 55", currency: "GBP", instructions: "Payment due on receipt via Stripe or bank transfer.", account: "Stripe · pay.cocoonaudits.co" },
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
const PAYMENT_METHODS = ["Bank transfer", "PayPal", "Credit or debit card", "Wise", "Cash", "Check", "Custom"];
const MILESTONE_PRESETS: [string, number][] = [["Project deposit", 25], ["Design approval", 20], ["Development completion", 25], ["Testing and QA", 10], ["Website launch", 15], ["Final handoff", 5]];
const EXPENSE_PRESETS = ["Premium theme", "Shopify app", "WordPress plugin", "Stock photos", "Fonts", "Hosting", "Domain registration", "Third-party software", "Contractor costs"];
const DEFAULT_TERMS = "Payment is due by the date shown on this invoice. Work may be paused if payment becomes overdue. Final files, website access, ownership, or project handoff may be withheld until the outstanding balance has been paid in full.";

interface InvClient { id: string; name: string; company: string; email: string; phone: string; country: string; currency: string; address: string; taxId: string }
const CLIENTS: InvClient[] = STUDIO_CLIENTS.map((c, i) => ({
  id: c.id, name: c.name + " Team", company: c.name,
  email: "accounts@" + c.name.toLowerCase().replace(/[^a-z]+/g, "") + ".com",
  phone: "+44 20 7946 0" + (100 + i), country: "United Kingdom", currency: "GBP",
  address: (10 + i) + " Market Street, London, UK", taxId: "GB " + (400 + i) + " 2211 90",
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
  return {
    businessId: biz.id, clientId: "", projectId: "",
    number: "INV-0001", numberFormat: "INV-0001", status: "Draft",
    issueDate: "2026-07-11", dueDate: "2026-07-25", currency: biz.currency, paymentTerms: "Net 14",
    poNumber: "", contractRef: "",
    billingType: "Fixed project fee",
    items: [initItem(SAVED_SERVICES[0])],
    expenses: [], time: [], milestones: MILESTONE_PRESETS.map(([label, pct]) => ({ id: uid(), label, pct, selected: false })),
    retainer: { pkg: "Growth retainer", includedHours: 20, hoursUsed: 14, overageRate: 85, rollover: true, period: "July 2026", nextBilling: "2026-08-01" },
    discountType: "pct", discountValue: 0, processingType: "pct", processingValue: 0, additionalFee: 0, amountPaid: 0,
    deposit: { projectValue: 0, depositRequired: 0, depositPaid: 0, prevMilestones: 0, isFinal: false },
    notes: "", terms: DEFAULT_TERMS, internalNotes: "",
    methods: ["Bank transfer", "Wise"], instructions: biz.instructions, paymentLink: "",
    recurring: { enabled: false, frequency: "Monthly", start: "2026-08-01", end: "", occurrences: 12, autoCreate: true, autoSend: false },
    attachments: [],
    template: "Classic", accent: "#c2544d", showLogo: true, showProject: true, showTax: true, footer: "Thank you for partnering with Baltazar Studio.", thankYou: "We appreciate your business — thank you!",
  };
}

type Action =
  | { t: "patch"; v: Partial<Inv> }
  | { t: "item"; op: "add" | "remove" | "dup" | "up" | "down" | "update"; id?: string; v?: Partial<Item>; service?: SavedService }
  | { t: "expense"; op: "add" | "remove" | "update"; id?: string; v?: Partial<Expense> }
  | { t: "time"; op: "add" | "remove" | "update" | "import"; id?: string; v?: Partial<TimeEntry> }
  | { t: "milestone"; id: string };

const SEED_TIME: TimeEntry[] = [
  { id: uid(), task: "Homepage build", member: "Noa Vega", hours: 6.5, rate: 85, billable: true, invoiced: false },
  { id: uid(), task: "Shopify sections", member: "Emet Rowe", hours: 4, rate: 85, billable: true, invoiced: false },
  { id: uid(), task: "Internal review", member: "Noa Vega", hours: 1.5, rate: 85, billable: false, invoiced: false },
];

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
      if (a.op === "add") return { ...s, time: [...s.time, { id: uid(), task: "", member: "Noa Vega", hours: 1, rate: 85, billable: true, invoiced: false }] };
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
function Section({ icon, title, hint, children, right }: { icon: string; title: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div style={css(CARD)}>
      <div style={css("display:flex;align-items:center;gap:0.6rem;margin-bottom:0.85rem")}>
        <span style={css("width:1.9rem;height:1.9rem;border-radius:0.55rem;flex-shrink:0;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center")}><Icon name={icon} size={14} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={css("font-size:0.9rem;font-weight:500;color:var(--fg);line-height:1.2")}>{title}</div>
          {hint && <div style={css("font-size:0.72rem;color:var(--fg-faint);margin-top:0.1rem")}>{hint}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) {
  return (
    <label style={css("display:flex;flex-direction:column;gap:0.28rem;font-size:0.72rem;font-weight:500;color:var(--fg-muted);min-width:0" + (span ? ";grid-column:1/-1" : ""))}>
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
  const [modal, setModal] = useState<null | "send" | "payment" | "cancel" | "delete" | "profile">(null);
  const [dirty, setDirty] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
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
  const doSave = (label: string) => { setSaveOpen(false); setDirty(false); actions.showToast(label); };
  const send = () => { setShowErrors(true); if (errors.length) { actions.showToast("Fix " + errors.length + " issue" + (errors.length > 1 ? "s" : "") + " before sending"); return; } setModal("send"); };

  const showMilestones = inv.billingType === "Milestone payment";
  const showTime = inv.billingType === "Hourly work";
  const showRetainer = inv.billingType === "Monthly retainer" || inv.billingType === "Recurring maintenance";
  const showDeposit = ["Deposit", "Final payment", "Milestone payment"].includes(inv.billingType);
  const showRecurring = ["Monthly retainer", "Recurring maintenance"].includes(inv.billingType);

  return (
    <div style={css("display:flex;flex-direction:column;gap:1rem")}>
      {/* header */}
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap")}>
        <div style={{ minWidth: 0 }}>
          <span style={css(eyebrowStyle("var(--accent)"))}>Invoicing</span>
          <h2 style={css("margin:0.35rem 0 0;font-size:1.35rem;font-weight:500;line-height:1.15")}>Create Invoice</h2>
          <p style={css("margin:0.3rem 0 0;font-size:0.82rem;color:var(--fg-muted);line-height:1.5;max-width:38rem")}>Create and send invoices for projects, retainers, and digital services.</p>
        </div>
        <div style={css("display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;flex-shrink:0")}>
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => setSaveOpen(o => !o)} style={css(BTN_GHOST)}><Icon name="file" size={14} />Save Draft<Icon name="chev" size={13} /></button>
            {saveOpen && (
              <>
                <div onClick={() => setSaveOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div style={{ ...css("position:absolute;top:2.5rem;right:0;width:14rem;padding:0.35rem;border:1px solid var(--border);border-radius:0.9rem;background:var(--surface);z-index:41;box-shadow:0 12px 30px -14px rgba(0,0,0,.25)"), animation: "pt-ddin .16s ease" }}>
                  {[["Save as draft", "file"], ["Save and close", "check"], ["Duplicate invoice", "layers"], ["Download PDF", "arrowup"], ["Print invoice", "file"], ["Copy shareable link", "send"]].map(([l, ic]) => (
                    <button key={l} type="button" onClick={() => doSave(l)} className="pt-menuitem" style={css("display:flex;align-items:center;gap:0.55rem;width:100%;padding:0.5rem 0.55rem;border:0;border-radius:0.5rem;background:transparent;color:var(--fg);font-size:0.78rem;cursor:pointer;text-align:left")}><Icon name={ic} size={14} />{l}</button>
                  ))}
                  <div style={css("height:1px;background:var(--border-soft);margin:0.25rem 0")} />
                  {[["Cancel invoice", "cancel"], ["Delete invoice", "delete"]].map(([l, m]) => (
                    <button key={l} type="button" onClick={() => { setSaveOpen(false); setModal(m as "cancel" | "delete"); }} className="pt-menuitem" style={css("display:flex;align-items:center;gap:0.55rem;width:100%;padding:0.5rem 0.55rem;border:0;border-radius:0.5rem;background:transparent;color:var(--danger);font-size:0.78rem;cursor:pointer;text-align:left")}><Icon name="x" size={14} />{l}</button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={() => { const el = document.getElementById("inv-preview"); el?.scrollIntoView({ behavior: "smooth", block: "start" }); }} style={css(BTN_GHOST)}><Icon name="eye" size={14} />Preview</button>
          <button type="button" onClick={() => setModal("payment")} style={css(BTN_GHOST)}><Icon name="wallet" size={14} />Record Payment</button>
          <button type="button" onClick={send} style={css(BTN_PRIMARY)}><Icon name="send" size={14} />Send Invoice</button>
        </div>
      </div>

      {/* validation banner */}
      {showErrors && errors.length > 0 && (
        <div style={css("border:1px solid var(--danger-border);border-radius:var(--radius-panel);background:var(--danger-soft);padding:0.75rem 0.9rem")}>
          <div style={css("display:flex;align-items:center;gap:0.45rem;font-size:0.8rem;font-weight:500;color:var(--danger)")}><Icon name="alert" size={15} />Resolve before sending</div>
          <ul style={css("margin:0.4rem 0 0;padding-left:1.1rem;color:var(--fg-muted);font-size:0.76rem;line-height:1.6")}>{errors.map(e => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      {/* two-column */}
      <div style={css("display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "minmax(0,1.15fr) minmax(0,0.85fr)") + ";gap:1rem;align-items:start")}>
        {/* ── LEFT: form ── */}
        <div style={css("display:flex;flex-direction:column;gap:0.9rem;min-width:0")}>
          <FormBody inv={inv} set={set} dispatch={dispatch} setDirty={setDirty} biz={biz} client={client} project={project}
            applyClient={applyClient} applyProject={applyProject} applyBiz={applyBiz} calc={calc} money={(n: number) => money(n, cur)}
            lineAmount={lineAmount} expenseAmount={expenseAmount} mobile={mobile}
            openProfile={() => setModal("profile")} actions={actions}
            flags={{ showMilestones, showTime, showRetainer, showDeposit, showRecurring }} />
        </div>

        {/* ── RIGHT: sticky live preview ── */}
        <div id="inv-preview" style={css("min-width:0;position:" + (mobile ? "static" : "sticky") + ";top:4.5rem")}>
          <Preview inv={inv} biz={biz} client={client} project={project} calc={calc} money={(n: number) => money(n, cur)} lineAmount={lineAmount} expenseAmount={expenseAmount} />
        </div>
      </div>

      {modal === "send" && <SendModal inv={inv} client={client} project={project} calc={calc} money={(n: number) => money(n, cur)} onClose={() => setModal(null)} onSend={() => { setModal(null); set({ status: "Sent" }); setDirty(false); actions.showToast("Invoice " + inv.number + " sent to " + (client?.email || "client")); }} />}
      {modal === "payment" && <PaymentModal inv={inv} calc={calc} money={(n: number) => money(n, cur)} onClose={() => setModal(null)} onRecord={(amt) => { const paid = (inv.amountPaid || 0) + amt; set({ amountPaid: paid, status: paid >= calc.total ? "Paid" : "Partially Paid" }); setModal(null); actions.showToast("Payment of " + money(amt, cur) + " recorded"); }} />}
      {(modal === "cancel" || modal === "delete") && <ConfirmModal kind={modal} number={inv.number} onClose={() => setModal(null)} onConfirm={() => { set({ status: modal === "cancel" ? "Cancelled" : "Draft" }); setModal(null); actions.showToast("Invoice " + (modal === "cancel" ? "cancelled" : "deleted")); }} />}
      {modal === "profile" && <ProfileModal biz={biz} onClose={() => setModal(null)} onSave={() => { setModal(null); actions.showToast("Business profile saved"); }} />}
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
  const [clientQuery, setClientQuery] = useState("");
  const grid2 = "display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)") + ";gap:0.6rem";
  const grid3 = "display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:0.6rem";
  const filteredClients = CLIENTS.filter(c => (c.name + c.company + c.email).toLowerCase().includes(clientQuery.toLowerCase()));

  return (
    <>
      {/* Business profile */}
      <Section icon="briefcase" title="Business profile" hint="Prepopulated from your saved business information"
        right={<button type="button" onClick={p.openProfile} style={css(CHIP + ";border:1px solid var(--border);color:var(--fg-muted)")}><Icon name="edit" size={12} />Edit</button>}>
        <div style={css("display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.7rem")}>
          {BUSINESS_PROFILES.map(b => (
            <button key={b.id} type="button" onClick={() => applyBiz(b.id)} style={css(CHIP + ";border:1px solid " + (b.id === inv.businessId ? "var(--accent)" : "var(--border)") + ";background:" + (b.id === inv.businessId ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (b.id === inv.businessId ? "var(--accent)" : "var(--fg-muted)"))}>
              <span style={css("width:1.2rem;height:1.2rem;border-radius:0.3rem;background:var(--fg);color:#fff;display:grid;place-items:center;font-size:0.56rem;font-weight:500")}>{b.logo}</span>{b.name}
            </button>
          ))}
          <button type="button" onClick={() => actions.showToast("Add another business brand")} style={css(CHIP + ";border:1px dashed var(--border);color:var(--fg-faint)")}><Icon name="plus" size={12} />Add brand</button>
        </div>
        <div style={css(grid2)}>
          <Field label="Business name">{txt(biz.name, () => {})}</Field>
          <Field label="Business email">{txt(biz.email, () => {})}</Field>
          <Field label="Phone">{txt(biz.phone, () => {})}</Field>
          <Field label="Website">{txt(biz.website, () => {})}</Field>
          <Field label="Tax ID / VAT">{txt(biz.taxId, () => {})}</Field>
          <Field label="Default currency">{sel(inv.currency, Object.keys(CURRENCIES), v => set({ currency: v }))}</Field>
          <Field label="Business address" span>{txt(biz.address, () => {})}</Field>
          <Field label="Bank / payment account" span>{txt(biz.account, () => {})}</Field>
        </div>
      </Section>

      {/* Client & project */}
      <Section icon="user" title="Client & project" hint="Select or add a client and link a project">
        <div style={css(grid2)}>
          <Field label="Search client by name, company, email or project">
            <input className="pt-input" value={clientQuery} placeholder="Search clients…" onChange={e => setClientQuery(e.target.value)} style={css(INPUT)} />
          </Field>
          <Field label="Client">
            <div style={css("display:flex;gap:0.4rem")}>
              <select className="pt-input" value={inv.clientId} onChange={e => applyClient(e.target.value)} style={css(INPUT + ";cursor:pointer")}>
                <option value="">Select a client…</option>
                {filteredClients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
              </select>
              <button type="button" onClick={() => actions.showToast("New client form opened inline")} style={css(BTN_GHOST + ";height:auto;padding:0 0.6rem;flex-shrink:0")}><Icon name="plus" size={14} /></button>
            </div>
          </Field>
        </div>
        {client && (
          <div style={css(grid3 + ";margin-top:0.6rem")}>
            <Field label="Company">{txt(client.company, () => {})}</Field>
            <Field label="Email">{txt(client.email, () => {})}</Field>
            <Field label="Phone">{txt(client.phone, () => {})}</Field>
            <Field label="Country">{txt(client.country, () => {})}</Field>
            <Field label="Preferred currency">{txt(client.currency, () => {})}</Field>
            <Field label="Tax ID">{txt(client.taxId, () => {})}</Field>
            <Field label="Billing address" span>{txt(client.address, () => {})}</Field>
          </div>
        )}
        <div style={css(grid2 + ";margin-top:0.6rem")}>
          <Field label="Linked project">
            <div style={css("display:flex;gap:0.4rem")}>
              <select className="pt-input" value={inv.projectId} onChange={e => applyProject(e.target.value)} style={css(INPUT + ";cursor:pointer")}>
                <option value="">No project</option>
                {PROJECTS.filter(pr => !inv.clientId || pr.clientId === inv.clientId).map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </select>
              <button type="button" onClick={() => actions.showToast("New project form opened inline")} style={css(BTN_GHOST + ";height:auto;padding:0 0.6rem;flex-shrink:0")}><Icon name="plus" size={14} /></button>
            </div>
          </Field>
          {project && <Field label="Project manager · contract value">{txt(project.manager + " · " + money(project.value), () => {})}</Field>}
        </div>
      </Section>

      {/* Invoice info */}
      <Section icon="card" title="Invoice details">
        <div style={css(grid3)}>
          <Field label="Invoice number">{txt(inv.number, v => set({ number: v }))}</Field>
          <Field label="Numbering format">{sel(inv.numberFormat, NUMBER_FORMATS, v => set({ numberFormat: v, number: v.replace("YYYY", "2026").replace("MM", "07").replace(/0+1$/, "001") }))}</Field>
          <Field label="Status">
            <select className="pt-input" value={inv.status} onChange={e => set({ status: e.target.value })} style={css(INPUT + ";cursor:pointer")}>{STATUSES.map(([s]) => <option key={s} value={s}>{s}</option>)}</select>
          </Field>
          <Field label="Issue date">{txt(inv.issueDate, v => set({ issueDate: v }), { type: "date" })}</Field>
          <Field label="Due date">{txt(inv.dueDate, v => set({ dueDate: v }), { type: "date" })}</Field>
          <Field label="Payment terms">{sel(inv.paymentTerms, ["Due on receipt", "Net 7", "Net 14", "Net 30", "Net 45"], v => set({ paymentTerms: v }))}</Field>
          <Field label="PO number">{txt(inv.poNumber, v => set({ poNumber: v }), { ph: "Optional" })}</Field>
          <Field label="Contract / proposal ref">{txt(inv.contractRef, v => set({ contractRef: v }), { ph: "Optional" })}</Field>
          <Field label="Currency">{sel(inv.currency, Object.keys(CURRENCIES), v => set({ currency: v }))}</Field>
        </div>
      </Section>

      {/* Billing type */}
      <Section icon="sliders" title="Billing type" hint="Fields adapt to how the client is billed">
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
                    <span style={css("flex:1;font-size:0.8rem;font-weight:500;color:var(--fg)")}>{m.label}</span>
                    <span style={css("font-size:0.74rem;color:var(--fg-muted)")}>{m.pct}%</span>
                    <span style={css("font-size:0.8rem;font-weight:500;color:var(--fg);width:5rem;text-align:right")}>{money(amt)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* Line items */}
      <Section icon="checklist" title="Service line items" hint="Add services, adjust quantity, rate, discount & tax"
        right={<SavedServicePicker onPick={s => { dispatch({ t: "item", op: "add", service: s }); }} />}>
        <div style={css("overflow-x:auto")}>
          <div style={{ minWidth: mobile ? "38rem" : "auto" }}>
            <div style={css("display:grid;grid-template-columns:1.6fr 2fr 0.6fr 0.8fr 0.9fr 0.8fr 0.7fr 0.9fr auto;gap:0.4rem;padding:0 0.1rem 0.4rem;" + eyebrowStyle("var(--fg-faint)"))}>
              <span>Service</span><span>Description</span><span>Qty</span><span>Unit</span><span>Rate</span><span>Disc%</span><span>Tax%</span><span style={{ textAlign: "right" }}>Amount</span><span></span>
            </div>
            {inv.items.map((i, idx) => (
              <div key={i.id} style={css("display:grid;grid-template-columns:1.6fr 2fr 0.6fr 0.8fr 0.9fr 0.8fr 0.7fr 0.9fr auto;gap:0.4rem;align-items:center;padding:0.35rem 0.1rem;border-top:1px solid var(--border-soft)")}>
                <input className="pt-input" value={i.service} placeholder="Service" onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { service: e.target.value } })} style={css(INPUT + ";padding:0.4rem 0.5rem;font-size:0.78rem")} />
                <input className="pt-input" value={i.description} placeholder="Description" onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { description: e.target.value } })} style={css(INPUT + ";padding:0.4rem 0.5rem;font-size:0.78rem")} />
                <input className="pt-input" type="number" value={i.qty} onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { qty: +e.target.value } })} style={css(INPUT + ";padding:0.4rem 0.4rem;font-size:0.78rem")} />
                <select className="pt-input" value={i.unit} onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { unit: e.target.value } })} style={css(INPUT + ";padding:0.4rem 0.3rem;font-size:0.74rem;cursor:pointer")}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
                <input className="pt-input" type="number" value={i.rate} onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { rate: +e.target.value } })} style={css(INPUT + ";padding:0.4rem 0.4rem;font-size:0.78rem")} />
                <input className="pt-input" type="number" value={i.discount} onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { discount: +e.target.value } })} style={css(INPUT + ";padding:0.4rem 0.4rem;font-size:0.78rem")} />
                <input className="pt-input" type="number" value={i.taxable ? i.taxRate : 0} disabled={!i.taxable} title={i.taxable ? "Tax %" : "Non-taxable"} onChange={e => dispatch({ t: "item", op: "update", id: i.id, v: { taxRate: +e.target.value } })} style={css(INPUT + ";padding:0.4rem 0.4rem;font-size:0.78rem;opacity:" + (i.taxable ? "1" : "0.5"))} />
                <span style={css("font-size:0.8rem;font-weight:500;text-align:right;white-space:nowrap")}>{money(lineAmount(i))}</span>
                <div style={css("display:flex;gap:0.15rem;flex-shrink:0")}>
                  <button type="button" title="Non-taxable toggle" onClick={() => dispatch({ t: "item", op: "update", id: i.id, v: { taxable: !i.taxable } })} className="pt-iconbtn" style={css("width:1.5rem;height:1.5rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:" + (i.taxable ? "var(--accent)" : "var(--fg-faint)") + ";display:grid;place-items:center;cursor:pointer")}><Icon name="hash" size={12} /></button>
                  <button type="button" title="Duplicate" onClick={() => dispatch({ t: "item", op: "dup", id: i.id })} className="pt-iconbtn" style={css("width:1.5rem;height:1.5rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")}><Icon name="layers" size={12} /></button>
                  <button type="button" title="Move up" onClick={() => dispatch({ t: "item", op: "up", id: i.id })} disabled={idx === 0} className="pt-iconbtn" style={css("width:1.5rem;height:1.5rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:var(--fg-muted);display:grid;place-items:center;cursor:pointer;opacity:" + (idx === 0 ? "0.4" : "1"))}><Icon name="arrowup" size={12} /></button>
                  <button type="button" title="Remove" onClick={() => dispatch({ t: "item", op: "remove", id: i.id })} className="pt-iconbtn" style={css("width:1.5rem;height:1.5rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:var(--danger);display:grid;place-items:center;cursor:pointer")}><Icon name="x" size={12} /></button>
                </div>
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
            <div style={css("font-size:0.78rem;color:var(--fg-faint);padding:0.5rem 0")}>No time imported yet. Import approved entries or add manually.</div>
          ) : (
            <>
              <div style={css("display:grid;grid-template-columns:1.8fr 1.2fr 0.7fr 0.7fr 0.8fr auto;gap:0.4rem;padding-bottom:0.4rem;" + eyebrowStyle("var(--fg-faint)"))}>
                <span>Task</span><span>Team member</span><span>Hours</span><span>Rate</span><span style={{ textAlign: "right" }}>Total</span><span></span>
              </div>
              {inv.time.map(t => (
                <div key={t.id} style={css("display:grid;grid-template-columns:1.8fr 1.2fr 0.7fr 0.7fr 0.8fr auto;gap:0.4rem;align-items:center;padding:0.3rem 0;border-top:1px solid var(--border-soft);opacity:" + (t.billable ? "1" : "0.55"))}>
                  <input className="pt-input" value={t.task} onChange={e => dispatch({ t: "time", op: "update", id: t.id, v: { task: e.target.value } })} style={css(INPUT + ";padding:0.35rem 0.45rem;font-size:0.78rem")} />
                  <input className="pt-input" value={t.member} onChange={e => dispatch({ t: "time", op: "update", id: t.id, v: { member: e.target.value } })} style={css(INPUT + ";padding:0.35rem 0.45rem;font-size:0.78rem")} />
                  <input className="pt-input" type="number" value={t.hours} onChange={e => dispatch({ t: "time", op: "update", id: t.id, v: { hours: +e.target.value } })} style={css(INPUT + ";padding:0.35rem 0.4rem;font-size:0.78rem")} />
                  <input className="pt-input" type="number" value={t.rate} onChange={e => dispatch({ t: "time", op: "update", id: t.id, v: { rate: +e.target.value } })} style={css(INPUT + ";padding:0.35rem 0.4rem;font-size:0.78rem")} />
                  <span style={css("font-size:0.8rem;font-weight:500;text-align:right;white-space:nowrap")}>{money(t.billable ? t.hours * t.rate : 0)}</span>
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
          <div style={css("display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.65rem")}>
            {(() => {
              const rem = Math.max(0, inv.retainer.includedHours - inv.retainer.hoursUsed);
              const over = Math.max(0, inv.retainer.hoursUsed - inv.retainer.includedHours);
              return [["Remaining", rem + " h"], ["Overage", over + " h"], ["Rollover", inv.retainer.rollover ? (rem + " h") : "Off"]].map(([l, v]) => (
                <span key={l} style={css("display:inline-flex;gap:0.35rem;align-items:center;padding:0.35rem 0.6rem;border-radius:var(--radius-pill);background:var(--surface-alt);border:1px solid var(--border-soft);font-size:0.74rem;color:var(--fg-muted)")}><b style={css("color:var(--fg);font-weight:500")}>{v}</b>{l}</span>
              ));
            })()}
            <button type="button" onClick={() => set({ retainer: { ...inv.retainer, rollover: !inv.retainer.rollover } })} style={css(CHIP + ";border:1px solid " + (inv.retainer.rollover ? "var(--accent)" : "var(--border)") + ";color:" + (inv.retainer.rollover ? "var(--accent)" : "var(--fg-muted)"))}>Rollover unused hours: {inv.retainer.rollover ? "On" : "Off"}</button>
          </div>
        </Section>
      )}

      {/* Expenses */}
      <Section icon="wallet" title="Expenses & reimbursements" hint="Bill back themes, apps, plugins, hosting & contractor costs"
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
                <input className="pt-input" value={e.description} placeholder="Description" onChange={ev => dispatch({ t: "expense", op: "update", id: e.id, v: { description: ev.target.value } })} style={css(INPUT + ";padding:0.35rem 0.45rem;font-size:0.78rem")} />
                <input className="pt-input" value={e.vendor} placeholder="Vendor" onChange={ev => dispatch({ t: "expense", op: "update", id: e.id, v: { vendor: ev.target.value } })} style={css(INPUT + ";padding:0.35rem 0.45rem;font-size:0.78rem")} />
                <input className="pt-input" type="number" value={e.cost} onChange={ev => dispatch({ t: "expense", op: "update", id: e.id, v: { cost: +ev.target.value } })} style={css(INPUT + ";padding:0.35rem 0.4rem;font-size:0.78rem")} />
                <input className="pt-input" type="number" value={e.markup} onChange={ev => dispatch({ t: "expense", op: "update", id: e.id, v: { markup: +ev.target.value } })} style={css(INPUT + ";padding:0.35rem 0.4rem;font-size:0.78rem")} />
                <span style={css("font-size:0.8rem;font-weight:500;text-align:right;white-space:nowrap")}>{money(p.expenseAmount(e))}</span>
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
          <button type="button" onClick={() => set({ deposit: { ...inv.deposit, isFinal: !inv.deposit.isFinal } })} style={css("display:flex;align-items:center;gap:0.5rem;margin-top:0.6rem;padding:0.5rem 0.65rem;border:1px solid " + (inv.deposit.isFinal ? "var(--accent)" : "var(--border-soft)") + ";border-radius:var(--radius);background:" + (inv.deposit.isFinal ? "var(--accent-soft)" : "var(--surface)") + ";cursor:pointer;text-align:left;width:100%")}>
            <span style={css("width:1.1rem;height:1.1rem;border-radius:0.3rem;flex-shrink:0;display:grid;place-items:center;border:1.5px solid " + (inv.deposit.isFinal ? "var(--accent)" : "var(--border)") + ";background:" + (inv.deposit.isFinal ? "var(--accent)" : "transparent") + ";color:#fff")}>{inv.deposit.isFinal && <Icon name="checkmark" size={11} />}</span>
            <span style={css("font-size:0.78rem;color:var(--fg)")}>Final invoice — bill the remaining project balance</span>
          </button>
        </Section>
      )}

      {/* Recurring */}
      {flags.showRecurring && (
        <Section icon="replay" title="Recurring invoice" hint="Automate future invoices for this service">
          <button type="button" onClick={() => set({ recurring: { ...inv.recurring, enabled: !inv.recurring.enabled } })} style={css("display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.6rem 0.7rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface);cursor:pointer;width:100%;text-align:left;margin-bottom:0.6rem")}>
            <span style={css("font-size:0.8rem;font-weight:500;color:var(--fg)")}>Enable recurring billing</span>
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

      {/* Discounts, fees & payments */}
      <Section icon="target" title="Discounts, fees & payments received">
        <div style={css(grid3)}>
          <Field label="Discount">
            <div style={css("display:flex;gap:0.3rem")}>
              <input className="pt-input" type="number" value={inv.discountValue} onChange={e => set({ discountValue: +e.target.value })} style={css(INPUT)} />
              <button type="button" onClick={() => set({ discountType: inv.discountType === "pct" ? "fixed" : "pct" })} style={css(BTN_GHOST + ";height:auto;padding:0 0.6rem;flex-shrink:0")}>{inv.discountType === "pct" ? "%" : inv.currency}</button>
            </div>
          </Field>
          <Field label="Processing fee">
            <div style={css("display:flex;gap:0.3rem")}>
              <input className="pt-input" type="number" value={inv.processingValue} onChange={e => set({ processingValue: +e.target.value })} style={css(INPUT)} />
              <button type="button" onClick={() => set({ processingType: inv.processingType === "pct" ? "fixed" : "pct" })} style={css(BTN_GHOST + ";height:auto;padding:0 0.6rem;flex-shrink:0")}>{inv.processingType === "pct" ? "%" : inv.currency}</button>
            </div>
          </Field>
          <Field label="Additional fee">{txt(inv.additionalFee, v => set({ additionalFee: +v }), { type: "number" })}</Field>
          <Field label="Amount already paid">{txt(inv.amountPaid, v => set({ amountPaid: +v }), { type: "number" })}</Field>
        </div>
        <TotalsBlock calc={calc as Record<string, number>} inv={inv} money={money} showDeposit={flags.showDeposit} />
      </Section>

      {/* Payment methods */}
      <Section icon="card" title="Payment methods & instructions">
        <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.6rem")}>
          {PAYMENT_METHODS.map(m => {
            const on = inv.methods.includes(m);
            return <button key={m} type="button" onClick={() => set({ methods: on ? inv.methods.filter(x => x !== m) : [...inv.methods, m] })} style={css(CHIP + ";border:1px solid " + (on ? "var(--accent)" : "var(--border-soft)") + ";background:" + (on ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (on ? "var(--accent)" : "var(--fg-muted)"))}>{on && <Icon name="check" size={11} />}{m}</button>;
          })}
        </div>
        <div style={css(grid2)}>
          <Field label="Payment instructions" span><textarea className="pt-input" value={inv.instructions} onChange={e => set({ instructions: e.target.value })} rows={2} style={css(INPUT + ";resize:vertical;line-height:1.45")} /></Field>
          <Field label="Payment link">{txt(inv.paymentLink, v => set({ paymentLink: v }), { ph: "https://pay.baltazar.studio/…" })}</Field>
          <Field label="QR code"><button type="button" onClick={() => actions.showToast("Payment QR generated")} style={css(BTN_GHOST + ";width:100%;justify-content:center")}><Icon name="grid" size={14} />Generate QR</button></Field>
        </div>
      </Section>

      {/* Notes & terms */}
      <Section icon="file" title="Notes & terms" hint="Internal notes never appear on the client invoice">
        <div style={css("display:flex;flex-direction:column;gap:0.6rem")}>
          <Field label="Client-facing notes"><textarea className="pt-input" value={inv.notes} onChange={e => set({ notes: e.target.value })} rows={2} placeholder="A short message to the client…" style={css(INPUT + ";resize:vertical;line-height:1.45")} /></Field>
          <Field label="Payment terms & policies">
            <textarea className="pt-input" value={inv.terms} onChange={e => set({ terms: e.target.value })} rows={4} style={css(INPUT + ";resize:vertical;line-height:1.5")} />
          </Field>
          <div style={css("display:flex;gap:0.4rem;flex-wrap:wrap")}>
            <button type="button" onClick={() => set({ terms: DEFAULT_TERMS })} style={css(CHIP + ";border:1px solid var(--border);color:var(--fg-muted)")}><Icon name="replay" size={12} />Reset to default</button>
            <button type="button" onClick={() => actions.showToast("Terms saved as template")} style={css(CHIP + ";border:1px solid var(--border);color:var(--fg-muted)")}><Icon name="file" size={12} />Save as template</button>
          </div>
          <Field label="Internal notes (never shown to client)"><textarea className="pt-input" value={inv.internalNotes} onChange={e => set({ internalNotes: e.target.value })} rows={2} placeholder="Private notes for your team…" style={css(INPUT + ";resize:vertical;line-height:1.45;background:color-mix(in srgb,var(--warn) 6%,var(--surface-alt))")} /></Field>
        </div>
      </Section>

      {/* Attachments */}
      <Section icon="clip" title="Attachments" hint="Proposal, contract, SOW, receipts, reports & more"
        right={<button type="button" onClick={() => dispatch({ t: "patch", v: { attachments: [...inv.attachments, { id: uid(), name: "proposal-v2.pdf", kind: "PDF", size: "248 KB" }] } })} style={css(CHIP + ";border:1px solid var(--border);color:var(--fg-muted)")}><Icon name="plus" size={12} />Attach</button>}>
        {inv.attachments.length === 0 ? (
          <div style={css("font-size:0.78rem;color:var(--fg-faint)")}>No documents attached yet.</div>
        ) : (
          <div style={css("display:flex;flex-direction:column;gap:0.4rem")}>
            {inv.attachments.map(f => (
              <div key={f.id} style={css("display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.6rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface)")}>
                <span style={css("width:1.9rem;height:1.9rem;border-radius:0.4rem;background:var(--surface-alt);color:var(--accent);display:grid;place-items:center;font-size:0.56rem;font-weight:500;flex-shrink:0")}>{f.kind}</span>
                <span style={css("flex:1;min-width:0;font-size:0.8rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{f.name}</span>
                <span style={css("font-size:0.72rem;color:var(--fg-faint)")}>{f.size}</span>
                <button type="button" onClick={() => actions.showToast("Preview " + f.name)} className="pt-iconbtn" style={css("width:1.6rem;height:1.6rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")}><Icon name="eye" size={12} /></button>
                <button type="button" onClick={() => dispatch({ t: "patch", v: { attachments: inv.attachments.filter(x => x.id !== f.id) } })} className="pt-iconbtn" style={css("width:1.6rem;height:1.6rem;border:1px solid var(--border-soft);border-radius:0.4rem;background:transparent;color:var(--danger);display:grid;place-items:center;cursor:pointer")}><Icon name="x" size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Preview settings */}
      <Section icon="palette" title="Invoice appearance">
        <div style={css(grid3)}>
          <Field label="Template">{sel(inv.template, ["Classic", "Modern", "Minimal"], v => set({ template: v }))}</Field>
          <Field label="Accent color">
            <div style={css("display:flex;gap:0.35rem;align-items:center")}>
              {["#c2544d", "#2f6f4f", "#3a5ba0", "#8a5cb4", "#1f2937"].map(c => (
                <button key={c} type="button" onClick={() => set({ accent: c })} aria-label={c} style={css("width:1.6rem;height:1.6rem;border-radius:50%;cursor:pointer;border:2px solid " + (inv.accent === c ? "var(--fg)" : "transparent") + ";background:" + c)} />
              ))}
            </div>
          </Field>
          <Field label="Thank-you message">{txt(inv.thankYou, v => set({ thankYou: v }))}</Field>
          <Field label="Custom footer" span>{txt(inv.footer, v => set({ footer: v }))}</Field>
        </div>
        <div style={css("display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.6rem")}>
          {[["Logo", "showLogo"], ["Project details", "showProject"], ["Tax fields", "showTax"]].map(([l, k]) => (
            <button key={k} type="button" onClick={() => set({ [k]: !inv[k as "showLogo" | "showProject" | "showTax"] } as Partial<Inv>)} style={css(CHIP + ";border:1px solid " + (inv[k as "showLogo" | "showProject" | "showTax"] ? "var(--accent)" : "var(--border)") + ";color:" + (inv[k as "showLogo" | "showProject" | "showTax"] ? "var(--accent)" : "var(--fg-muted)"))}>{inv[k as "showLogo" | "showProject" | "showTax"] ? <Icon name="eye" size={11} /> : <Icon name="x" size={11} />}{l}</button>
          ))}
        </div>
      </Section>
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
              <button key={s.name} type="button" onClick={() => { onPick(s); setOpen(false); }} className="pt-menuitem" style={css("display:flex;align-items:center;justify-content:space-between;gap:0.5rem;width:100%;padding:0.45rem 0.55rem;border:0;border-radius:0.5rem;background:transparent;cursor:pointer;text-align:left")}>
                <span style={css("font-size:0.78rem;font-weight:500;color:var(--fg)")}>{s.name}</span>
                <span style={css("font-size:0.72rem;color:var(--fg-faint)")}>£{s.rate}/{s.unit.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TotalsBlock({ calc, inv, money, showDeposit }: { calc: Record<string, number>; inv: Inv; money: (n: number) => string; showDeposit: boolean }) {
  const row = (l: string, v: number, opts: { strong?: boolean; muted?: boolean; neg?: boolean } = {}) => (
    <div style={css("display:flex;justify-content:space-between;align-items:baseline;padding:" + (opts.strong ? "0.5rem 0 0" : "0.2rem 0"))}>
      <span style={css("font-size:" + (opts.strong ? "0.9rem" : "0.8rem") + ";font-weight:" + (opts.strong ? "500" : "400") + ";color:" + (opts.muted ? "var(--fg-faint)" : "var(--fg-muted)"))}>{l}</span>
      <span style={css("font-size:" + (opts.strong ? "1.02rem" : "0.82rem") + ";font-weight:500;color:" + (opts.neg ? "var(--success)" : "var(--fg)"))}>{opts.neg ? "− " : ""}{money(Math.abs(v))}</span>
    </div>
  );
  return (
    <div style={css("margin-top:0.85rem;border-top:1px solid var(--border-soft);padding-top:0.6rem;max-width:22rem;margin-left:auto")}>
      {row("Service subtotal", calc.serviceSubtotal)}
      {calc.timeSubtotal > 0 && row("Time subtotal", calc.timeSubtotal)}
      {calc.expenseSubtotal > 0 && row("Expense subtotal", calc.expenseSubtotal)}
      {calc.discount > 0 && row("Discount", calc.discount, { neg: true })}
      {inv.showTax && row("Tax", calc.tax)}
      {calc.processing > 0 && row("Processing fee", calc.processing)}
      {inv.additionalFee > 0 && row("Additional fee", inv.additionalFee)}
      {row("Total", calc.total, { strong: true })}
      {inv.amountPaid > 0 && row("Amount paid", inv.amountPaid, { neg: true })}
      <div style={css("display:flex;justify-content:space-between;align-items:baseline;margin-top:0.5rem;padding:0.55rem 0.7rem;border-radius:var(--radius);background:var(--accent-soft)")}>
        <span style={css("font-size:0.82rem;font-weight:500;color:var(--accent)")}>Balance due</span>
        <span style={css("font-size:1.1rem;font-weight:500;color:var(--accent)")}>{money(calc.balance)}</span>
      </div>
      {showDeposit && inv.deposit.projectValue > 0 && (
        <div style={css("display:flex;justify-content:space-between;margin-top:0.4rem;font-size:0.74rem;color:var(--fg-muted)")}>
          <span>Remaining project balance</span><span style={css("font-weight:500;color:var(--fg)")}>{money(calc.remainingProject)}</span>
        </div>
      )}
    </div>
  );
}

// ── LIVE PREVIEW ──────────────────────────────────────────────────────────────
function Preview({ inv, biz, client, project, calc, money, lineAmount, expenseAmount }: {
  inv: Inv; biz: BizProfile; client: InvClient | null; project: typeof PROJECTS[number] | null;
  calc: Record<string, number>; money: (n: number) => string; lineAmount: (i: Item) => number; expenseAmount: (e: Expense) => number;
}) {
  const A = inv.accent;
  const statusTone = STATUSES.find(([s]) => s === inv.status)?.[1] || "waiting";
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem;padding:0.6rem 0.8rem;border-bottom:1px solid var(--border-soft);background:var(--surface-alt)")}>
        <span style={css(eyebrowStyle("var(--fg-faint)"))}>Live preview</span>
        <span style={css(statusPill(statusTone))}>{inv.status}</span>
      </div>
      <div style={css("padding:1.2rem 1.25rem;font-size:0.8rem;color:var(--fg)")}>
        {/* head */}
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding-bottom:1rem;border-bottom:2px solid " + A)}>
          <div style={css("display:flex;align-items:center;gap:0.6rem;min-width:0")}>
            {inv.showLogo && <span style={css("width:2.4rem;height:2.4rem;border-radius:0.5rem;flex-shrink:0;background:" + A + ";color:#fff;display:grid;place-items:center;font-size:0.8rem;font-weight:500")}>{biz.logo}</span>}
            <div style={{ minWidth: 0 }}>
              <div style={css("font-size:0.95rem;font-weight:500;line-height:1.2")}>{biz.name}</div>
              <div style={css("font-size:0.68rem;color:var(--fg-muted);line-height:1.4;margin-top:0.15rem")}>{biz.address}<br />{biz.email} · {biz.website}</div>
            </div>
          </div>
          <div style={css("text-align:right;flex-shrink:0")}>
            <div style={css("font-size:1.05rem;font-weight:500;letter-spacing:0.02em;color:" + A)}>INVOICE</div>
            <div style={css("font-size:0.72rem;color:var(--fg-muted);margin-top:0.2rem")}>{inv.number}</div>
          </div>
        </div>

        {/* meta */}
        <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;padding:0.9rem 0;border-bottom:1px solid var(--border-soft)")}>
          <div>
            <div style={css(eyebrowStyle("var(--fg-faint)") + ";margin-bottom:0.25rem")}>Billed to</div>
            {client ? (
              <div style={css("font-size:0.76rem;line-height:1.5")}><b style={css("font-weight:500")}>{client.company}</b><br />{client.name}<br />{client.address}<br />{client.email}</div>
            ) : <div style={css("font-size:0.76rem;color:var(--fg-faint)")}>Select a client…</div>}
          </div>
          <div style={css("text-align:right")}>
            {[["Issue date", inv.issueDate], ["Due date", inv.dueDate], ["Terms", inv.paymentTerms], inv.showProject && project ? ["Project", project.name] : ["Billing", inv.billingType], inv.poNumber ? ["PO", inv.poNumber] : null].filter(Boolean).map((r) => {
              const [l, v] = r as [string, string];
              return <div key={l} style={css("font-size:0.72rem;margin-bottom:0.15rem")}><span style={css("color:var(--fg-faint)")}>{l}: </span><span style={css("font-weight:500")}>{v}</span></div>;
            })}
          </div>
        </div>

        {/* line items */}
        <div style={css("padding:0.6rem 0")}>
          <div style={css("display:grid;grid-template-columns:2.2fr 0.5fr 1fr;gap:0.4rem;padding-bottom:0.35rem;border-bottom:1px solid var(--border-soft);" + eyebrowStyle("var(--fg-faint)"))}>
            <span>Service</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Amount</span>
          </div>
          {inv.items.filter(i => i.service || lineAmount(i) > 0).map(i => (
            <div key={i.id} style={css("display:grid;grid-template-columns:2.2fr 0.5fr 1fr;gap:0.4rem;padding:0.4rem 0;border-bottom:1px solid var(--border-soft)")}>
              <div style={{ minWidth: 0 }}><div style={css("font-size:0.78rem;font-weight:500")}>{i.service || "Service"}</div>{i.description && <div style={css("font-size:0.7rem;color:var(--fg-muted);margin-top:0.1rem")}>{i.description}</div>}</div>
              <span style={css("font-size:0.76rem;text-align:center;color:var(--fg-muted)")}>{i.qty} {i.unit.toLowerCase()}</span>
              <span style={css("font-size:0.78rem;font-weight:500;text-align:right")}>{money(lineAmount(i))}</span>
            </div>
          ))}
          {inv.expenses.map(e => (
            <div key={e.id} style={css("display:grid;grid-template-columns:2.2fr 0.5fr 1fr;gap:0.4rem;padding:0.4rem 0;border-bottom:1px solid var(--border-soft)")}>
              <div style={css("font-size:0.78rem")}>{e.description || "Expense"}{e.vendor && <span style={css("color:var(--fg-faint)")}> · {e.vendor}</span>}</div>
              <span style={css("text-align:center;color:var(--fg-faint);font-size:0.72rem")}>exp</span>
              <span style={css("font-size:0.78rem;font-weight:500;text-align:right")}>{money(expenseAmount(e))}</span>
            </div>
          ))}
        </div>

        {/* totals */}
        <div style={css("display:flex;flex-direction:column;gap:0.15rem;padding:0.5rem 0;max-width:16rem;margin-left:auto")}>
          <PRow l="Subtotal" v={money(calc.serviceSubtotal + calc.expenseSubtotal + calc.timeSubtotal)} />
          {calc.discount > 0 && <PRow l="Discount" v={"− " + money(calc.discount)} />}
          {inv.showTax && <PRow l="Tax" v={money(calc.tax)} />}
          {calc.processing > 0 && <PRow l="Processing" v={money(calc.processing)} />}
          <div style={css("display:flex;justify-content:space-between;margin-top:0.3rem;padding-top:0.4rem;border-top:2px solid " + A)}>
            <span style={css("font-size:0.85rem;font-weight:500")}>Balance due</span>
            <span style={css("font-size:0.95rem;font-weight:500;color:" + A)}>{money(calc.balance)}</span>
          </div>
        </div>

        {/* project summary */}
        {inv.showProject && inv.deposit.projectValue > 0 && (
          <div style={css("margin-top:0.5rem;padding:0.6rem 0.7rem;border-radius:var(--radius);background:var(--surface-alt);font-size:0.72rem;color:var(--fg-muted)")}>
            <div style={css("display:flex;justify-content:space-between")}><span>Total project value</span><b style={css("color:var(--fg);font-weight:500")}>{money(inv.deposit.projectValue)}</b></div>
            <div style={css("display:flex;justify-content:space-between;margin-top:0.15rem")}><span>Remaining project balance</span><b style={css("color:var(--fg);font-weight:500")}>{money(calc.remainingProject)}</b></div>
          </div>
        )}

        {/* payment + terms */}
        {inv.methods.length > 0 && (
          <div style={css("margin-top:0.8rem")}>
            <div style={css(eyebrowStyle("var(--fg-faint)") + ";margin-bottom:0.25rem")}>Payment</div>
            <div style={css("font-size:0.72rem;color:var(--fg-muted);line-height:1.5")}>{inv.methods.join(" · ")}<br />{inv.instructions}<br />{biz.account}</div>
          </div>
        )}
        {inv.notes && <div style={css("margin-top:0.7rem;font-size:0.72rem;color:var(--fg-muted);line-height:1.5")}>{inv.notes}</div>}
        <div style={css("margin-top:0.7rem;font-size:0.66rem;color:var(--fg-faint);line-height:1.5")}>{inv.terms}</div>
        {inv.thankYou && <div style={css("margin-top:0.8rem;text-align:center;font-size:0.78rem;font-weight:500;color:" + A)}>{inv.thankYou}</div>}
        <div style={css("margin-top:0.7rem;padding-top:0.6rem;border-top:1px solid var(--border-soft);text-align:center;font-size:0.66rem;color:var(--fg-faint)")}>{inv.footer}</div>
      </div>
    </div>
  );
}
function PRow({ l, v }: { l: string; v: string }) {
  return <div style={css("display:flex;justify-content:space-between")}><span style={css("font-size:0.74rem;color:var(--fg-muted)")}>{l}</span><span style={css("font-size:0.76rem;font-weight:500")}>{v}</span></div>;
}

// ── MODALS ────────────────────────────────────────────────────────────────────
function Shell({ children, label, onClose, wide }: { children: ReactNode; label: string; onClose: () => void; wide?: boolean }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={label} onClick={onClose} style={{ ...css("position:fixed;inset:0;z-index:90;background:rgba(35,25,18,.34);padding:1rem;display:flex;align-items:flex-start;justify-content:center;overflow:auto"), animation: "pt-fadein .14s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ ...css("width:min(" + (wide ? "34rem" : "26rem") + ",100%);margin:3rem auto;border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);overflow:hidden"), animation: "pt-sheetup .18s ease" }}>
        {children}
      </div>
    </div>
  );
}
function ModalHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem;padding:0.9rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
      <div style={css("font-size:0.95rem;font-weight:500")}>{title}</div>
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
          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt);padding:0.85rem;font-size:0.8rem;white-space:pre-wrap;line-height:1.55;color:var(--fg)")}>{"Subject: Invoice " + inv.number + " · " + money(calc.balance) + " due\n\n" + body}</div>
        ) : (
          <>
            <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:0.5rem")}>
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
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.5rem;padding:0.85rem 1.1rem;border-top:1px solid var(--border-soft)")}>
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
        <div style={css("display:flex;justify-content:space-between;padding:0.5rem 0.7rem;border-radius:var(--radius);background:var(--surface-alt);font-size:0.8rem")}><span style={css("color:var(--fg-muted)")}>Balance due</span><b style={css("font-weight:500")}>{money(calc.balance)}</b></div>
        <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:0.5rem")}>
          <Field label="Payment amount"><input className="pt-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} style={css(INPUT)} /></Field>
          <Field label="Payment date">{txt(inv.issueDate, () => {}, { type: "date" })}</Field>
          <Field label="Method">{sel("Bank transfer", PAYMENT_METHODS, () => {})}</Field>
          <Field label="Transaction reference">{txt("", () => {}, { ph: "TXN-…" })}</Field>
          <Field label="Processing fee">{txt("0", () => {}, { type: "number" })}</Field>
          <Field label="Notes">{txt("", () => {}, { ph: "Optional" })}</Field>
        </div>
        <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem")}>
          <span style={css(CHIP + ";border:1px solid var(--accent);color:var(--accent);background:var(--accent-soft)")}><Icon name="check" size={11} />Send receipt to client</span>
          <span style={css(CHIP + ";border:1px solid var(--border);color:var(--fg-muted)")}><Icon name="clip" size={11} />Attach proof of payment</span>
        </div>
      </div>
      <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:0.5rem;padding:0.85rem 1.1rem;border-top:1px solid var(--border-soft)")}>
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
        <div style={css("font-size:1rem;font-weight:500")}>{kind === "cancel" ? "Cancel this invoice?" : "Delete this invoice?"}</div>
        <p style={css("margin:0.4rem 0 0;font-size:0.8rem;color:var(--fg-muted);line-height:1.5")}>Invoice {number} will be {kind === "cancel" ? "marked as cancelled" : "permanently removed"}. This can’t be undone.</p>
        <div style={css("display:flex;gap:0.5rem;justify-content:center;margin-top:1rem")}>
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
      <div style={css("padding:1rem 1.1rem;display:grid;grid-template-columns:1fr 1fr;gap:0.5rem")}>
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
      <div style={css("display:flex;justify-content:flex-end;gap:0.5rem;padding:0.85rem 1.1rem;border-top:1px solid var(--border-soft)")}>
        <button type="button" onClick={onClose} style={css(BTN_GHOST)}>Cancel</button>
        <button type="button" onClick={onSave} style={css(BTN_PRIMARY)}><Icon name="check" size={14} />Save profile</button>
      </div>
    </Shell>
  );
}
