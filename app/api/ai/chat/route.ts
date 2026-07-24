import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { clientsVisibleToRole } from "@/portal/clients";
import { coercePersistedAuditDrafts } from "@/lib/portalAuditPersistence";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { openAIError, responseText } from "@/lib/openaiServer";
import { resolvePortalRequestAccess } from "@/lib/portalRequestAccess";
import { createSupabasePrivilegedServerClient } from "@/lib/supabase/privileged";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const windows = new Map<string, { count: number; resetAt: number }>();

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === request.nextUrl.host; } catch { return false; }
}

function withinRateLimit(request: NextRequest) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) { windows.set(key, { count: 1, resetAt: now + 60_000 }); return true; }
  if (current.count >= 12) return false;
  current.count += 1;
  return true;
}

function cleanMessages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(-14).flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const role = (item as any).role;
    const content = (item as any).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim()) return [];
    return [{ role, content: content.trim().slice(0, 4_000) }];
  });
}

function cleanKey(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160);
  return clean || fallback;
}

function streamChatResult(
  reply: string,
  actions: unknown[],
  model: string,
  turnId: string | null,
) {
  const encoder = new TextEncoder();
  const chunks = reply.match(/.{1,80}(?:\s|$)|.{1,80}/gs) || [reply];
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: start\ndata: ${JSON.stringify({ turnId, model })}\n\n`));
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`event: delta\ndata: ${JSON.stringify({ delta: chunk })}\n\n`));
        await new Promise(resolve => setTimeout(resolve, 4));
      }
      controller.enqueue(encoder.encode(`event: complete\ndata: ${JSON.stringify({ reply, actions, model, turnId })}\n\n`));
      controller.close();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function auditTrendSummary(drafts: ReturnType<typeof coercePersistedAuditDrafts>) {
  const byClient = new Map<string, typeof drafts>();
  drafts.forEach(draft => byClient.set(draft.run.clientId, [...(byClient.get(draft.run.clientId) || []), draft]));
  return [...byClient.values()].map(items => {
    const ordered = items.sort((a, b) => String(a.run.completedAt || a.run.updatedAt || a.updatedAt || "").localeCompare(String(b.run.completedAt || b.run.updatedAt || b.updatedAt || "")));
    const scored = ordered.filter(item => typeof item.run.score === "number" || typeof item.run.internalScore === "number");
    return {
      clientId: ordered[0]?.run.clientId,
      clientName: ordered[0]?.run.clientName,
      runs: ordered.map(item => ({ label: item.run.runLabel || item.run.subtitle, type: item.run.runType, status: item.run.statusLabel, progress: item.run.progress, score: item.run.score, internalScore: item.run.internalScore, lighthouseMobile: item.run.lighthouseMobileScore, lighthouseDesktop: item.run.lighthouseDesktopScore, previousScore: item.run.previousScore, createdAt: item.run.createdAt, completedAt: item.run.completedAt, updatedAt: item.run.updatedAt || item.updatedAt })),
      observedScoreChange: scored.length >= 2 ? (scored.at(-1)!.run.score ?? scored.at(-1)!.run.internalScore ?? 0) - (scored[0].run.score ?? scored[0].run.internalScore ?? 0) : null,
      trendEvidence: scored.length >= 2 ? `${scored.length} scored audit runs` : "Insufficient scored history for a reliable trend",
    };
  });
}

export async function GET(request: NextRequest) {
  const authClient = await createSupabaseServerClient();
  const actor = await getPortalActorContext(authClient);
  if (!actor) return NextResponse.json({ error: "Sign in to load Snapshot chat history." }, { status: 401 });
  const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim().slice(0, 160);
  let query = authClient
    .from("portal_chat_turns")
    .select("id, session_id, request_id, user_message, assistant_message, actions, model, input_tokens, output_tokens, latency_ms, status, created_at")
    .eq("tenant_id", actor.tenantId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (sessionId) query = query.eq("session_id", sessionId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ turns: data || [] });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  if (!withinRateLimit(request)) return NextResponse.json({ error: "Too many chat requests. Please wait a moment." }, { status: 429 });
  const authClient = await createSupabaseServerClient();
  const access = await resolvePortalRequestAccess(request, authClient);
  if (!access) return NextResponse.json({ error: "Sign in to use Snapshot chat." }, { status: 401 });
  const actor = await getPortalActorContext(authClient);
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_CHAT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Snapshot chat is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const role = access.role === "manager" ? "dev" : access.role;
  const clientName = access.role === "client"
    ? access.clientName
    : typeof body?.clientName === "string" ? body.clientName.trim() : undefined;
  const messages = cleanMessages(body?.messages);
  if (!messages.length) return NextResponse.json({ error: "Add a message to continue." }, { status: 400 });
  const latestUserMessage = [...messages].reverse().find(message => message.role === "user")?.content || "";
  const fallbackRequestHash = createHash("sha256").update(`${actor?.userId || access.role}:${latestUserMessage}`).digest("hex");
  const sessionId = cleanKey(body?.sessionId, `snapshot-${fallbackRequestHash.slice(0, 24)}`);
  const requestId = cleanKey(body?.requestId, fallbackRequestHash.slice(0, 32));
  const requestHash = createHash("sha256")
    .update(`${actor?.tenantId || "development"}:${actor?.userId || access.role}:${sessionId}:${requestId}:${latestUserMessage}`)
    .digest("hex");
  const startedAt = Date.now();
  const allowedClientIds = new Set(clientsVisibleToRole(role, clientName).map(client => client.id));
  const allowedClients = clientsVisibleToRole(role, clientName);
  let audits: ReturnType<typeof coercePersistedAuditDrafts> = [];
  try {
    const supabase = await createSupabasePrivilegedServerClient();
    let query = supabase.from("portal_audit_runs").select("run, state, updated_at").order("updated_at", { ascending: true });
    if (access.role === "client") query = query.eq("client_id", access.clientId);
    const result = await query;
    if (!result.error) audits = coercePersistedAuditDrafts((result.data || []).map(row => ({ run: row.run, state: row.state, updatedAt: row.updated_at }))).filter(draft => allowedClientIds.has(draft.run.clientId));
  } catch (error) {
    console.warn("Snapshot chat could not load audit history.", error instanceof Error ? error.message : error);
  }
  const workspace = JSON.stringify(body?.workspace || {}).slice(0, 55_000);
  const auditHistory = JSON.stringify(auditTrendSummary(audits)).slice(0, 35_000);
  const authenticatedScope = access.role === "client" && access.clientName
    ? `Authenticated client scope: ${access.clientName}. This exact client is authorized even if the migrated workspace snapshot is otherwise empty.`
    : `Authenticated portal role: ${access.role}.`;
  const instructions = [
    "You are Baltz Snapshot, a natural workspace intelligence assistant for Baltazar Studio.",
    "Answer the user's actual question directly. Do not force a menu, decision tree, fixed workflow, or canned next step.",
    "Ground every factual claim in the supplied role-scoped workspace and audit history. Never expose or speculate about clients outside that scope.",
    "Analyze past trends only from dated records or multiple scored audit runs. If the history is insufficient, say that plainly instead of inventing a trend.",
    "Clearly distinguish observed facts, calculated changes, and reasonable inferences. Use exact client names, dates, scores, stages, and owners when relevant.",
    "When asked what needs attention, prioritize by blocking status, overdue work, risk, pending approval, unread communication, and stalled progress.",
    "You may carry out a project pipeline change only when the user clearly asks to move a named client to Cocoon Consult, Winged in a Week, or In Full Flight. Return one update_project action for each explicit change.",
    "Only Admin and Dev may change project pipelines. Dev may change only clients in the supplied workspace. Clients may ask questions but cannot change project pipeline status.",
    "When a user explicitly asks you to contact, ask, notify, remind, or assign Trish or Kier about client work, return a create_request action. This creates a real Inbox ticket and To-do; do not tell them to contact the person elsewhere.",
    "Use Trish Baltazar when the user explicitly asks for Trish. Otherwise assign the request to the project owner shown in the workspace.",
    "When returning an action, state in the reply that the change was completed. Do not claim a change was completed unless the matching action is present.",
    "Be warm and conversational. Use short paragraphs and compact bullets only when they improve readability.",
    `Today is ${new Date().toISOString()}. The current portal role is ${role}.`,
  ].join("\n");
  const input = [
    { role: "developer", content: `${authenticatedScope}\n\nCurrent role-scoped workspace snapshot:\n${workspace}\n\nPersisted audit history and calculated trend evidence:\n${auditHistory}` },
    ...messages,
  ];
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || "gpt-5.6",
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 1_200,
        safety_identifier: createHash("sha256").update(`snapshot:${role}`).digest("hex").slice(0, 32),
        instructions,
        input,
        text: {
          verbosity: "medium",
          format: {
            type: "json_schema",
            name: "snapshot_workspace_response",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                reply: { type: "string" },
                actions: {
                  type: "array",
                  items: {
                    anyOf: [
                      {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          action: { type: "string", enum: ["update_project"] },
                          client: { type: "string" },
                          service: { type: "string", enum: ["cocoon", "wiaw", "iff"] },
                          stage: { type: "string" },
                        },
                        required: ["action", "client", "service", "stage"],
                      },
                      {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          action: { type: "string", enum: ["create_request"] },
                          client: { type: "string" },
                          title: { type: "string" },
                          note: { type: "string" },
                          assignee: { type: "string", enum: ["Trish Baltazar", "Kier Mangibin"] },
                        },
                        required: ["action", "client", "title", "note", "assignee"],
                      },
                    ],
                  },
                },
              },
              required: ["reply", "actions"],
            },
          },
        },
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const mapped = openAIError(response.status, payload, "Snapshot chat could not answer right now.");
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    const parsed = JSON.parse(responseText(payload)) as { reply?: unknown; actions?: unknown };
    if (typeof parsed.reply !== "string") throw new Error("Snapshot chat returned an invalid response.");
    const allowedByName = new Map(allowedClients.map(client => [client.name.toLowerCase(), client.name]));
    // Supabase-created clients may not exist in the migrated static catalog yet.
    // The authenticated access context is authoritative for the current client,
    // so add only that exact name instead of widening the action scope.
    if (access.role === "client" && access.clientName) {
      allowedByName.set(access.clientName.trim().toLowerCase(), access.clientName);
    }
    type SnapshotAction =
      | { action: "create_request"; client: string; title: string; note: string; assignee: "Trish Baltazar" | "Kier Mangibin" }
      | { action: "update_project"; client: string; service: "cocoon" | "wiaw" | "iff"; stage: string };
    const actions = !Array.isArray(parsed.actions) ? [] : parsed.actions.reduce<SnapshotAction[]>((result, item) => {
      if (!item || typeof item !== "object") return result;
      const candidate = item as { action?: unknown; client?: unknown; service?: unknown; stage?: unknown; title?: unknown; note?: unknown; assignee?: unknown };
      const client = typeof candidate.client === "string" ? allowedByName.get(candidate.client.trim().toLowerCase()) : undefined;
      if (!client) return result;
      if (candidate.action === "create_request" && typeof candidate.title === "string" && typeof candidate.note === "string" && (candidate.assignee === "Trish Baltazar" || candidate.assignee === "Kier Mangibin")) {
        result.push({ action: "create_request", client, title: candidate.title.trim().slice(0, 90) || "Snapshot request", note: candidate.note.trim().slice(0, 1_200), assignee: candidate.assignee });
        return result;
      }
      if (role === "client" || candidate.action !== "update_project" || (candidate.service !== "cocoon" && candidate.service !== "wiaw" && candidate.service !== "iff") || typeof candidate.stage !== "string") return result;
      const serviceName = ({ cocoon: "Cocoon Consult", wiaw: "Winged in a Week", iff: "In Full Flight" } as const)[candidate.service];
      const rawStage = candidate.stage.trim();
      const stage = !rawStage ? serviceName : rawStage.toLowerCase().includes(serviceName.toLowerCase()) ? rawStage : `${serviceName} · ${rawStage}`;
      result.push({ action: "update_project", client, service: candidate.service, stage });
      return result;
    }, []);
    const model = payload?.model || process.env.OPENAI_CHAT_MODEL || "gpt-5.6";
    let turnId: string | null = null;
    if (actor) {
      const supabase = await createSupabasePrivilegedServerClient();
      const { data: turn, error: persistError } = await supabase
        .from("portal_chat_turns")
        .upsert({
          tenant_id: actor.tenantId,
          client_id: actor.clientId,
          user_id: actor.userId,
          session_id: sessionId,
          request_id: requestId,
          request_hash: requestHash,
          user_message: latestUserMessage,
          assistant_message: parsed.reply,
          actions: actions as unknown as Json,
          tool_activity: actions.map(action => ({
            action: action.action,
            client: action.client,
            authorization: "explicit_user_request",
          })) as unknown as Json,
          outcome: {
            state: actions.length ? "returned_for_scoped_application" : "answered",
            actionCount: actions.length,
          },
          model,
          input_tokens: typeof payload?.usage?.input_tokens === "number" ? payload.usage.input_tokens : null,
          output_tokens: typeof payload?.usage?.output_tokens === "number" ? payload.usage.output_tokens : null,
          latency_ms: Math.max(0, Date.now() - startedAt),
          status: "completed",
          error: null,
        }, { onConflict: "user_id,request_id" })
        .select("id")
        .single();
      if (persistError) throw new Error(`Snapshot chat could not persist its durable turn: ${persistError.message}`);
      turnId = turn.id;
    }
    if (body?.stream === true) return streamChatResult(parsed.reply, actions, model, turnId);
    return NextResponse.json({ reply: parsed.reply, actions, model, turnId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Snapshot chat could not answer right now." }, { status: 502 });
  }
}
