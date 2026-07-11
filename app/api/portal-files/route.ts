import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { PORTAL_UPLOAD_BUCKET, type PortalWorkspaceFile } from "@/lib/portalWorkspacePersistence";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function extFromName(name: string) {
  const parts = name.split(".");
  return (parts.length > 1 ? parts.at(-1) : "file")?.toUpperCase() || "FILE";
}

function sizeLabel(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function userLabel(role: string | null) {
  if (role === "client") return "Client";
  if (role === "dev") return "Noa";
  return "Trish";
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const clientId = typeof form.get("clientId") === "string" ? String(form.get("clientId")) : "";
  const folder = typeof form.get("folder") === "string" ? String(form.get("folder")) : "deliverables";
  const threadId = typeof form.get("threadId") === "string" ? String(form.get("threadId")) : undefined;
  const role = typeof form.get("role") === "string" ? String(form.get("role")) : null;
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!clientId || files.length === 0) {
    return NextResponse.json({ error: "Expected clientId and at least one file." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const uploadedAt = new Date().toISOString();
  const uploaded: PortalWorkspaceFile[] = [];

  for (const file of files) {
    const id = randomUUID();
    const path = `${clientId}/${folder}/${id}-${safeName(file.name)}`;

    let objectPath: string | undefined;
    let contentBase64: string | undefined;
    let storageMode: PortalWorkspaceFile["storageMode"] = "supabase";

    const { error } = await supabase.storage.from(PORTAL_UPLOAD_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

    if (error) {
      storageMode = "inline";
      const bytes = Buffer.from(await file.arrayBuffer());
      contentBase64 = bytes.toString("base64");
    } else {
      objectPath = path;
    }

    uploaded.push({
      id,
      clientId,
      name: file.name,
      ext: extFromName(file.name),
      folder,
      sizeBytes: file.size,
      sizeLabel: sizeLabel(file.size),
      by: userLabel(role),
      updated: uploadedAt,
      status: threadId ? "Attached" : "Uploaded",
      mimeType: file.type || undefined,
      objectPath,
      storageMode,
      contentBase64,
      threadId,
    });
  }

  return NextResponse.json({ files: uploaded, uploadedAt });
}
