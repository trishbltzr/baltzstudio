import "server-only";

import { DASHBOARD_USER_EMAIL_HEADER, normalizeDashboardUserEmail } from "@/lib/dashboardPersistence";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STUDIO_CLIENTS } from "@/portal/clients";
import { readDevelopmentLoginEmail } from "@/lib/developmentLoginSession";

export type PortalRequestAccess =
  | { role: "admin" | "manager"; clientId: null; clientName: null }
  | { role: "client"; clientId: string; clientName: string };

function developmentAccessFromHeader(request: Request): PortalRequestAccess | null {
  if (process.env.NODE_ENV === "production") return null;
  const email = normalizeDashboardUserEmail(request.headers.get(DASHBOARD_USER_EMAIL_HEADER))
    || readDevelopmentLoginEmail(request);
  if (!email) return null;
  if (email === "trisha@baltazarstudio.co") return { role: "admin", clientId: null, clientName: null };
  if (email === "kier@baltazarstudio.co" || email === "manager@baltazarstudio.co") {
    return { role: "manager", clientId: null, clientName: null };
  }
  const client = STUDIO_CLIENTS.find(item => email === `${item.id}@client.baltazarstudio.co`);
  return client ? { role: "client", clientId: client.id, clientName: client.name } : null;
}

/**
 * Resolves authorization from the signed Supabase membership. The dashboard
 * email header is accepted only for local development quick-login sessions.
 */
export async function resolvePortalRequestAccess(
  request: Request,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<PortalRequestAccess | null> {
  try {
    const actor = await getPortalActorContext(supabase);
    if (actor) {
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
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
  }
  return developmentAccessFromHeader(request);
}
