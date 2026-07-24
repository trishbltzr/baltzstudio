import { appendFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { sendPortalAccessRequestEmail } from "@/lib/email/smtp";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InviteRequestBody = {
  name?: unknown;
  email?: unknown;
  businessName?: unknown;
  note?: unknown;
};

const inviteWindows = new Map<string, { count: number; resetAt: number }>();

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function withinInviteLimit(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
  const now = Date.now();
  const current = inviteWindows.get(key);
  if (!current || current.resetAt <= now) {
    inviteWindows.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return true;
  }
  if (current.count >= 5) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  if (!withinInviteLimit(request)) return NextResponse.json({ error: "Too many access requests. Please try again later." }, { status: 429 });
  const body = await request.json().catch(() => null) as InviteRequestBody | null;
  const name = normalizeText(body?.name, 120);
  const email = normalizeEmail(body?.email);
  const businessName = normalizeText(body?.businessName, 180);
  const note = normalizeText(body?.note, 2_000);

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid name and email are required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("portal_access_requests")
    .insert({
      requested_name: name,
      requested_email: email,
      business_name: businessName || null,
      note: note || null,
    });

  if (!error) {
    await notifyStudio({ name, email, businessName, note });
    return NextResponse.json({ ok: true, storage: "supabase" });
  }

  if (process.env.NODE_ENV === "production") {
    console.error("Unable to store portal access request.", error);
    return NextResponse.json({ error: "Unable to save the access request right now." }, { status: 503 });
  }

  console.warn("Falling back to preview invite request storage.", error);
  await persistPreviewInviteRequest({
    name,
    email,
    businessName,
    note,
    requestedAt: new Date().toISOString(),
  });
  await notifyStudio({ name, email, businessName, note });

  return NextResponse.json({ ok: true, storage: "local-preview" });
}

async function notifyStudio(payload: {
  name: string;
  email: string;
  businessName: string;
  note: string;
}) {
  try {
    await sendPortalAccessRequestEmail(payload);
  } catch (error) {
    console.error("Unable to send portal access request notification.", error);
  }
}

async function persistPreviewInviteRequest(payload: Record<string, string>) {
  const directory = path.join(os.tmpdir(), "baltazarstudio");
  const filePath = path.join(directory, "portal-access-requests.ndjson");

  await mkdir(directory, { recursive: true });
  await appendFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
