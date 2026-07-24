import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type {
  CheckupServiceKind,
  NormalizedClientSource,
  PortalClient,
  PortalClientSource,
} from "@/lib/portalIntelligence";

type PortalSupabaseClient = SupabaseClient<Database>;

export type PortalActorContext = {
  userId: string;
  tenantId: string;
  role: "admin" | "manager" | "client";
  clientId: string | null;
};

export type PortalClientWithSources = PortalClient & {
  sources: PortalClientSource[];
};

export async function getPortalActorContext(supabase: PortalSupabaseClient): Promise<PortalActorContext | null> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("portal_tenant_memberships")
    .select("tenant_id, role, client_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership || !["admin", "manager", "client"].includes(membership.role)) return null;

  return {
    userId: auth.user.id,
    tenantId: membership.tenant_id,
    role: membership.role as PortalActorContext["role"],
    clientId: membership.client_id,
  };
}

export async function listPortalClients(
  supabase: PortalSupabaseClient,
  context: PortalActorContext,
): Promise<PortalClientWithSources[]> {
  let clientQuery = supabase
    .from("clients")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .neq("status", "archived")
    .order("name");

  if (context.clientId) clientQuery = clientQuery.eq("id", context.clientId);

  const [{ data: clients, error: clientsError }, { data: sources, error: sourcesError }] = await Promise.all([
    clientQuery,
    supabase
      .from("client_sources")
      .select("*")
      .eq("tenant_id", context.tenantId)
      .order("version", { ascending: false }),
  ]);

  if (clientsError) throw new Error(clientsError.message);
  if (sourcesError) throw new Error(sourcesError.message);

  const sourcesByClient = new Map<string, PortalClientSource[]>();
  (sources ?? []).forEach(source => {
    const clientSources = sourcesByClient.get(source.client_id) ?? [];
    clientSources.push(source);
    sourcesByClient.set(source.client_id, clientSources);
  });

  return (clients ?? []).map(client => ({
    ...client,
    sources: sourcesByClient.get(client.id) ?? [],
  }));
}

export async function createPortalClientWithBaseline(
  supabase: PortalSupabaseClient,
  context: PortalActorContext,
  input: {
    eventKey: string;
    slug: string;
    name: string;
    source: NormalizedClientSource;
    serviceKind: CheckupServiceKind;
    primaryContactEmail?: string | null;
  },
) {
  if (context.role === "client") {
    throw new Error("Client accounts cannot create another client.");
  }

  const { data, error } = await supabase.rpc("create_client_with_baseline", {
    p_tenant_id: context.tenantId,
    p_event_key: input.eventKey,
    p_client_slug: input.slug,
    p_client_name: input.name,
    p_normalized_domain: input.source.domain,
    p_source_url: input.source.sourceUrl,
    ...(input.source.sitemapUrl ? { p_sitemap_url: input.source.sitemapUrl } : {}),
    p_service_kind: input.serviceKind,
    p_playbook_key: `${input.serviceKind}-checkup`,
    p_playbook_version: 1,
    p_checklist_version: 1,
    p_primary_contact_email: input.primaryContactEmail ?? undefined,
  });

  if (error) throw new Error(error.message);
  const result = data?.[0];
  if (!result) throw new Error("Client creation did not return a baseline run.");
  return result;
}

export async function enrollPortalPilotWithBaseline(
  supabase: PortalSupabaseClient,
  context: PortalActorContext,
  input: {
    eventKey: string;
    slug: string;
    name: string;
    source: NormalizedClientSource;
    serviceKind: CheckupServiceKind;
    primaryContactEmail?: string | null;
    rolloutNote: string;
  },
) {
  if (context.role !== "admin") {
    throw new Error("Only an admin can enroll the production pilot.");
  }
  const { data, error } = await supabase.rpc("enroll_pilot_client_with_baseline", {
    p_tenant_id: context.tenantId,
    p_event_key: input.eventKey,
    p_client_slug: input.slug,
    p_client_name: input.name,
    p_normalized_domain: input.source.domain,
    p_source_url: input.source.sourceUrl,
    p_sitemap_url: input.source.sitemapUrl ?? undefined,
    p_service_kind: input.serviceKind,
    p_primary_contact_email: input.primaryContactEmail ?? undefined,
    p_rollout_note: input.rolloutNote,
  });
  if (error) throw new Error(error.message);
  const result = data?.[0];
  if (!result) throw new Error("Pilot enrollment did not return a baseline run.");
  return result;
}
