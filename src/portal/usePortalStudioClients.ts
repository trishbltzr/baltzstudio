"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudioClient } from "./clients";

type PortalClientPayload = {
  slug: string;
  name: string;
  status: string;
  source_kind?: string;
  primary_contact_email: string | null;
  sources?: Array<{
    source_url?: string | null;
    normalized_url?: string | null;
    created_at?: string | null;
  }>;
};

function studioClientFromPortal(client: PortalClientPayload): StudioClient {
  const source = client.sources?.[0];
  return {
    id: client.slug,
    name: client.name,
    owner: "Studio team",
    audited: false,
    lead: {
      contactName: "",
      email: client.primary_contact_email || "",
      phone: "",
      businessName: client.name,
      website: source?.source_url || source?.normalized_url || "",
      capturedAt: source?.created_at || "",
    },
    cocoonLink: { status: "not_sent" },
    audit: {
      id: `audit-${client.slug}`,
      subtitle: "",
      statusLabel: "Not started",
      statusTone: "muted",
      stage: "Intake",
      progress: 0,
      due: "—",
    },
    funnels: [],
  };
}

export function usePortalStudioClients() {
  const [clients, setClients] = useState<StudioClient[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/portal-clients", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Unable to load clients.");
        return response.json() as Promise<{ clients?: PortalClientPayload[] }>;
      })
      .then(payload => {
        if (!active) return;
        setClients((payload.clients || [])
          .filter(client => client.status !== "archived" && client.source_kind !== "demo" && !/^demo(?:-|$)/i.test(client.slug))
          .map(studioClientFromPortal));
      })
      .catch(error => {
        console.error("Unable to load portal clients.", error);
        if (active) setClients([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => ({ clients, loaded }), [clients, loaded]);
}
