// Shared studio client pool — used by both the Cocoon audit (client discovery)
// and the funnel builder (which only offers to already-audited clients).

export type Tone = "muted" | "warn" | "success" | "accent" | "danger";
export const TONE: Record<Tone, { soft: string; color: string }> = {
  muted: { soft: "var(--surface-alt)", color: "var(--fg-muted)" },
  warn: { soft: "var(--warn-soft)", color: "var(--warn)" },
  success: { soft: "var(--success-soft)", color: "var(--success)" },
  accent: { soft: "var(--accent-soft)", color: "var(--accent)" },
  danger: { soft: "var(--danger-soft)", color: "var(--danger)" },
};

// Per-service framing for a client card (subtitle, status pill, stage pill, progress, date).
export interface ClientFacet {
  id: string;
  subtitle: string;
  statusLabel: string;
  statusTone: Tone;
  stage: string;
  progress: number;
  due: string;
}
export interface StudioClient {
  id: string;
  name: string;
  owner: string;
  audited: boolean; // has completed a Cocoon audit → eligible for a funnel offer
  audit: ClientFacet;
  funnels: ClientFacet[];
}

export const STUDIO_CLIENTS: StudioClient[] = [
  { id: "bloom", name: "Bloom & Root Wellness", owner: "Noa Vega", audited: true,
    audit: { id: "audit-bloom", subtitle: "Cocoon Consult", statusLabel: "Report ready", statusTone: "success", stage: "Audit · Delivered", progress: 100, due: "Jun 28" },
    funnels: [
      { id: "funnel-bloom-main", subtitle: "Lead-Gen Funnel", statusLabel: "In review", statusTone: "warn", stage: "Build · Persona", progress: 55, due: "July 8" },
      { id: "funnel-bloom-webinar", subtitle: "Webinar Funnel", statusLabel: "Draft", statusTone: "muted", stage: "Build · Copy", progress: 42, due: "July 16" },
    ] },
  { id: "flora", name: "Flora & Co.", owner: "Emet Rowe", audited: true,
    audit: { id: "audit-flora", subtitle: "Cocoon Consult", statusLabel: "Report ready", statusTone: "success", stage: "Audit · Delivered", progress: 100, due: "Jun 2" },
    funnels: [
      { id: "funnel-flora-main", subtitle: "Lead-Gen Funnel", statusLabel: "Draft", statusTone: "muted", stage: "Intake · Audience", progress: 22, due: "July 12" },
    ] },
  { id: "hazel", name: "House of Hazel", owner: "Noa Vega", audited: true,
    audit: { id: "audit-hazel", subtitle: "Cocoon Consult", statusLabel: "Delivered", statusTone: "success", stage: "Audit · Delivered", progress: 100, due: "May 20" },
    funnels: [
      { id: "funnel-hazel-main", subtitle: "Lead-Gen Funnel", statusLabel: "Live", statusTone: "success", stage: "Live", progress: 100, due: "Jun 2" },
    ] },
  { id: "wren", name: "Wren & Willow", owner: "Emet Rowe", audited: true,
    audit: { id: "audit-wren", subtitle: "Cocoon Consult", statusLabel: "Report ready", statusTone: "success", stage: "Audit · Delivered", progress: 100, due: "Jun 14" },
    funnels: [
      { id: "funnel-wren-main", subtitle: "Lead-Gen Funnel", statusLabel: "In review", statusTone: "warn", stage: "Intake · Business", progress: 30, due: "July 6" },
    ] },
  { id: "marigold", name: "Marigold Lane", owner: "Emet Rowe", audited: true,
    audit: { id: "audit-marigold", subtitle: "Cocoon Consult", statusLabel: "Delivered", statusTone: "success", stage: "Audit · Delivered", progress: 100, due: "Jun 30" },
    funnels: [] },
  { id: "saffron", name: "Saffron & Sage", owner: "Emet Rowe", audited: false,
    audit: { id: "audit-saffron", subtitle: "Cocoon Consult", statusLabel: "Auditing", statusTone: "warn", stage: "Audit · In progress", progress: 65, due: "July 3" },
    funnels: [] },
  { id: "plume", name: "Plume Studio", owner: "Noa Vega", audited: false,
    audit: { id: "audit-plume", subtitle: "Cocoon Consult", statusLabel: "Not started", statusTone: "muted", stage: "Audit · Not started", progress: 0, due: "—" },
    funnels: [] },
];
