import type { Database } from "@/lib/supabase/types";

export type PortalClient = Database["public"]["Tables"]["clients"]["Row"];
export type PortalClientSource = Database["public"]["Tables"]["client_sources"]["Row"];
export type PortalServiceRun = Database["public"]["Tables"]["service_runs"]["Row"];
export type PortalRunEvent = Database["public"]["Tables"]["run_events"]["Row"];
export type PortalEvidenceSnapshot = Database["public"]["Tables"]["evidence_snapshots"]["Row"];
export type PortalEvidenceItem = Database["public"]["Tables"]["evidence_items"]["Row"];
export type PortalCheckDefinition = Database["public"]["Tables"]["check_definitions"]["Row"];
export type PortalCheckResultRevision = Database["public"]["Tables"]["check_result_revisions"]["Row"];
export type PortalAgentDefinition = Database["public"]["Tables"]["agent_definitions"]["Row"];
export type PortalAgentRun = Database["public"]["Tables"]["agent_runs"]["Row"];
export type PortalAgentMemory = Database["public"]["Tables"]["agent_memory"]["Row"];
export type PortalProcessException = Database["public"]["Tables"]["process_exceptions"]["Row"];
export type PortalTaskImportBatch = Database["public"]["Tables"]["task_import_batches"]["Row"];
export type PortalServiceHandoff = Database["public"]["Tables"]["service_handoffs"]["Row"];

export type CheckupServiceKind = "brand" | "website" | "seo";

export type NormalizedClientSource = {
  domain: string;
  sourceUrl: string;
  sitemapUrl: string | null;
};

const PRIVATE_IPV4_RANGES = [
  /^0\./,
  /^10\./,
  /^100\.(?:6[4-9]|[78]\d|9\d|1[01]\d|12[0-7])\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(?:1[6-9]|2\d|3[01])\./,
  /^192\.0\.0\./,
  /^192\.0\.2\./,
  /^192\.168\./,
  /^198\.(?:1[89])\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^(?:22[4-9]|23\d|24\d|25[0-5])\./,
];

function parsePublicHttpUrl(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error(`${label} must be a valid public website URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${label} must use HTTP or HTTPS.`);
  }
  if (url.username || url.password) {
    throw new Error(`${label} cannot include embedded credentials.`);
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.includes(":")
    || PRIVATE_IPV4_RANGES.some(pattern => pattern.test(hostname))
    || !hostname.includes(".")
  ) {
    throw new Error(`${label} must use a public domain.`);
  }

  url.hostname = hostname;
  url.hash = "";
  return url;
}

export function normalizeClientSource(domainOrUrl: string, sitemapInput?: string | null): NormalizedClientSource {
  const source = parsePublicHttpUrl(domainOrUrl, "Website");
  source.pathname = "/";
  source.search = "";

  let sitemapUrl: string | null = null;
  if (sitemapInput?.trim()) {
    const sitemap = parsePublicHttpUrl(sitemapInput, "Sitemap");
    if (sitemap.hostname !== source.hostname) {
      throw new Error("Sitemap must belong to the client website domain.");
    }
    sitemapUrl = sitemap.toString();
  }

  return {
    domain: source.hostname,
    sourceUrl: source.origin,
    sitemapUrl,
  };
}

export function createClientSlug(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  if (!slug) throw new Error("Client name must contain at least one letter or number.");
  return slug;
}

export function normalizeClientCreatedEventKey(value: string | null | undefined) {
  const key = value?.trim() || "";
  if (!key || key.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new Error("Provide a valid Idempotency-Key for this client creation.");
  }
  return key;
}

export function normalizePrimaryContactEmail(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Primary contact email must be valid.");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Primary contact email must be valid.");
  }
  return email;
}

export function isCheckupServiceKind(value: unknown): value is CheckupServiceKind {
  return value === "brand" || value === "website" || value === "seo";
}
