import "server-only";

import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PortalRequestAccess =
  | { role: "admin" | "manager"; clientId: null; clientName: null }
  | { role: "client"; clientId: string; clientName: string };

/**
 * Resolves authorization exclusively from the signed Supabase membership.
 */
export async function resolvePortalRequestAccess(
  _request: Request,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<PortalRequestAccess | null> {
  const actor = await getPortalActorContext(supabase);
  if (!actor) return null;
  if (actor.role === "client") {
    if (!actor.clientId) return null;
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("slug, name")
      .eq("id", actor.clientId)
      .eq("tenant_id", actor.tenantId)
      .maybeSingle();
    if (clientError) throw new Error(clientError.message);
    if (!client) return null;
    return { role: "client", clientId: client.slug, clientName: client.name };
    }
  return { role: actor.role, clientId: null, clientName: null };
}
