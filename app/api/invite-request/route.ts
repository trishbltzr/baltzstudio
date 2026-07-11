import { appendFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InviteRequestBody = {
  name?: unknown;
  email?: unknown;
  businessName?: unknown;
  note?: unknown;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as InviteRequestBody | null;
  const name = normalizeText(body?.name);
  const email = normalizeEmail(body?.email);
  const businessName = normalizeText(body?.businessName);
  const note = normalizeText(body?.note);

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
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
    return NextResponse.json({ ok: true, storage: "supabase" });
  }

  console.warn("Falling back to preview invite request storage.", error);
  await persistPreviewInviteRequest({
    name,
    email,
    businessName,
    note,
    requestedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, storage: "local-preview" });
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

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
