import { NextResponse } from "next/server";
import { sendPortalInvoiceEmail } from "@/lib/email/smtp";
import { getPortalActorContext } from "@/lib/portalIntelligenceRepository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

type InvoicePayload = Record<string, unknown>;

function asRecord(value: unknown): InvoicePayload | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as InvoicePayload : null;
}

function text(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function errorResponse(error: unknown, fallback = 500) {
  const message = error instanceof Error ? error.message : "Unable to update the invoice.";
  const status = /sign in/i.test(message) ? 401
    : /admin|manager|permission/i.test(message) ? 403
      : /required|invalid|must/i.test(message) ? 400
        : fallback;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const actor = await getPortalActorContext(supabase);
    if (!actor) throw new Error("Sign in to load invoices.");

    let query = supabase
      .from("portal_invoices")
      .select("*, clients(name)")
      .eq("tenant_id", actor.tenantId)
      .order("updated_at", { ascending: false });
    if (actor.role === "client" && actor.clientId) query = query.eq("client_id", actor.clientId).neq("status", "Draft");
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ invoices: data ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const actor = await getPortalActorContext(supabase);
    if (!actor) throw new Error("Sign in to save invoices.");
    if (actor.role === "client") throw new Error("Only an admin or manager can save invoices.");

    const body = asRecord(await request.json().catch(() => null));
    const payload = asRecord(body?.invoice);
    if (!payload) throw new Error("Invoice data is required.");
    const id = text(body?.id, 80);
    const action = text(body?.action, 20) || "save";
    const invoiceNumber = text(payload.number, 80);
    const clientId = text(payload.clientId, 80) || null;
    const recipientEmail = text(body?.recipientEmail, 320) || null;
    const currency = text(payload.currency, 3).toUpperCase() || "GBP";
    const total = Number(body?.total);
    const dueDate = text(payload.dueDate, 10) || null;
    if (!invoiceNumber) throw new Error("Invoice number is required.");
    if (!Number.isFinite(total) || total < 0) throw new Error("Invoice total must be a valid amount.");

    let status = text(payload.status, 30) || "Draft";
    let sentAt: string | null = null;
    if (action === "send") {
      if (!recipientEmail) throw new Error("A recipient email is required before sending.");
      const clientName = text(body?.clientName, 180) || "there";
      const amount = new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(total);
      const email = await sendPortalInvoiceEmail({
        to: recipientEmail,
        clientName,
        invoiceNumber,
        amount,
        dueDate: dueDate || undefined,
        paymentLink: text(payload.paymentLink, 1_000) || undefined,
      });
      if (!email.sent) {
        return NextResponse.json({ error: "Invoice email is not configured. Add SMTP credentials before sending." }, { status: 503 });
      }
      status = "Sent";
      sentAt = new Date().toISOString();
      payload.status = status;
    }

    const row = {
      tenant_id: actor.tenantId,
      client_id: clientId,
      invoice_number: invoiceNumber,
      status,
      recipient_email: recipientEmail,
      currency,
      total,
      due_date: dueDate,
      payload: payload as Json,
      created_by: actor.userId,
      updated_at: new Date().toISOString(),
      ...(sentAt ? { sent_at: sentAt } : {}),
    };

    const mutation = id
      ? supabase.from("portal_invoices").update(row).eq("id", id).eq("tenant_id", actor.tenantId).select("*").single()
      : supabase.from("portal_invoices").upsert(row, { onConflict: "tenant_id,invoice_number" }).select("*").single();
    const { data, error } = await mutation;
    if (error) throw new Error(error.message);
    return NextResponse.json({ invoice: data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const actor = await getPortalActorContext(supabase);
    if (!actor) throw new Error("Sign in to delete invoices.");
    if (actor.role === "client") throw new Error("Only an admin or manager can delete invoices.");
    const id = new URL(request.url).searchParams.get("id")?.trim() || "";
    if (!id) throw new Error("Invoice id is required.");
    const { error } = await supabase.from("portal_invoices").delete().eq("id", id).eq("tenant_id", actor.tenantId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
