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
  lead: {
    contactName: string;
    email: string;
    phone: string;
    businessName: string;
    website: string;
    capturedAt: string;
  };
  cocoonLink: {
    status: "not_sent" | "sent" | "completed";
    sentAt?: string;
  };
  audit: ClientFacet;
  funnels: ClientFacet[];
}

export const UNASSIGNED_WORK_CLIENT: StudioClient = {
  id: "unassigned",
  name: "Unassigned draft",
  owner: "Unassigned",
  audited: false,
  lead: { contactName: "", email: "", phone: "", businessName: "", website: "", capturedAt: "" },
  cocoonLink: { status: "not_sent" },
  audit: {
    id: "audit-unassigned",
    subtitle: "Draft",
    statusLabel: "Draft",
    statusTone: "muted",
    stage: "Intake",
    progress: 0,
    due: "—",
  },
  funnels: [],
};

const NOT_ASSIGNED_TO_KIER = new Set([
  "Porky's Lechon",
  "Therapy Mobz",
]);

export const STUDIO_CLIENTS: StudioClient[] = [
  "Blue Ribbon",
  "Concertina",
  "Enterprise Growth System",
  "Feather & Tail",
  "Kaya Services",
  "Kreamer Feed",
  "La Femme",
  "Nature's Best Organic",
  "Porky's Lechon",
  "Therapy Mobz",
  "The Winged Palette",
  "Trisha Baltazar & Co.",
  "Yona Signo",
  "ZODA",
].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })).map((name, index) => {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const domain = `${id}.com`;
  const cocoonStatus = name === "Blue Ribbon" ? "sent" : "not_sent";
  return {
    id,
    name,
    owner: NOT_ASSIGNED_TO_KIER.has(name) ? "Unassigned" : "Kier Mangibin",
    audited: false,
    lead: {
      contactName: `${name} team`,
      email: `hello@${domain}`,
      phone: `+44 20 7${String(120 + index * 37).padStart(3, "0")} ${String(2040 + index * 53).padStart(4, "0")}`,
      businessName: name,
      website: `https://www.${domain}`,
      capturedAt: `Jul ${String(8 + (index % 14)).padStart(2, "0")}, 2026`,
    },
    cocoonLink: {
      status: cocoonStatus,
      ...(cocoonStatus === "not_sent" ? {} : { sentAt: "Jul 09, 2026" }),
    },
    audit: {
      id: `audit-${id}`,
      subtitle: "Cocoon Consult",
      statusLabel: "Not started",
      statusTone: "muted" as const,
      stage: "Audit · Not started",
      progress: 0,
      due: "—",
    },
    funnels: [],
  };
});

export const DEFAULT_CLIENT_NAME = STUDIO_CLIENTS[0]?.name || "Client";
export const DEV_USER_NAME = "Kier Mangibin";

export function clientsVisibleToRole(role: "admin" | "dev" | "client", clientName = DEFAULT_CLIENT_NAME) {
  if (role === "client") return STUDIO_CLIENTS.filter(client => client.name === clientName);
  if (role === "dev") return STUDIO_CLIENTS.filter(client => client.owner === DEV_USER_NAME);
  return STUDIO_CLIENTS;
}
