import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import {
  emptyPortalClientWorkspace,
  normalizePersistedPortalWorkspaceState,
  PORTAL_UPLOAD_BUCKET,
  PORTAL_WORKSPACE_FALLBACK_CLIENT_ID,
  PORTAL_WORKSPACE_FALLBACK_RUN_ID,
  PORTAL_WORKSPACE_ROW_ID,
  type PortalWorkspaceFile,
} from "@/lib/portalWorkspacePersistence";
import { resolvePortalRequestAccess } from "@/lib/portalRequestAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabasePrivilegedServerClient } from "@/lib/supabase/privileged";
import type { Json } from "@/lib/supabase/types";

const ALLOWED_FOLDERS = new Set(["all", "design", "brand", "deliverables"]);
const MAX_FILES_PER_UPLOAD = 10;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

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

function userLabel(role: "admin" | "manager" | "client") {
  if (role === "client") return "Client";
  if (role === "manager") return "Manager";
  return "Trish";
}

async function persistUploadedWorkspaceFiles(
  supabase: Awaited<ReturnType<typeof createSupabasePrivilegedServerClient>>,
  clientId: string,
  files: PortalWorkspaceFile[],
) {
  const workspaceFiles = files.filter(file => !file.threadId);
  if (workspaceFiles.length === 0) return;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const primary = await supabase
      .from("portal_workspace_state")
      .select("state, updated_at")
      .eq("workspace_id", PORTAL_WORKSPACE_ROW_ID)
      .maybeSingle();
    const useFallback = primary.error?.code === "42P01"
      || /portal_workspace_state/i.test(primary.error?.message || "")
      || !normalizePersistedPortalWorkspaceState(primary.data?.state);
    const fallback = useFallback
      ? await supabase
          .from("portal_audit_runs")
          .select("state, updated_at")
          .eq("run_id", PORTAL_WORKSPACE_FALLBACK_RUN_ID)
          .eq("client_id", PORTAL_WORKSPACE_FALLBACK_CLIENT_ID)
          .maybeSingle()
      : null;
    const data = fallback?.data ?? primary.data;
    const error = fallback?.error ?? (useFallback ? null : primary.error);

    if (error) throw new Error(error.message);
    const state = normalizePersistedPortalWorkspaceState(data?.state);
    if (!state || !data?.updated_at) {
      throw new Error("The shared portal workspace is not initialized.");
    }

    const current = state.clientWorkspaces[clientId] ?? emptyPortalClientWorkspace(clientId);
    const uploadedIds = new Set(workspaceFiles.map(file => file.id));
    const nextState = {
      ...state,
      clientWorkspaces: {
        ...state.clientWorkspaces,
        [clientId]: {
          ...current,
          files: [...workspaceFiles, ...current.files.filter(file => !uploadedIds.has(file.id))],
        },
      },
    };

    const updatedAt = new Date().toISOString();
    const updatePayload = { state: nextState as unknown as Json, updated_at: updatedAt };
    const updateResult = useFallback
      ? await supabase
          .from("portal_audit_runs")
          .update(updatePayload)
          .eq("run_id", PORTAL_WORKSPACE_FALLBACK_RUN_ID)
          .eq("client_id", PORTAL_WORKSPACE_FALLBACK_CLIENT_ID)
          .eq("updated_at", data.updated_at)
          .select("run_id")
          .maybeSingle()
      : await supabase
          .from("portal_workspace_state")
          .update(updatePayload)
          .eq("workspace_id", PORTAL_WORKSPACE_ROW_ID)
          .eq("updated_at", data.updated_at)
          .select("workspace_id")
          .maybeSingle();

    if (updateResult.error) throw new Error(updateResult.error.message);
    if (updateResult.data) return;
  }

  throw new Error("The workspace changed while file metadata was being saved. Please retry.");
}

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const access = await resolvePortalRequestAccess(request, authClient);
  if (!access) return NextResponse.json({ error: "Sign in before uploading portal files." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const clientId = typeof form.get("clientId") === "string" ? String(form.get("clientId")) : "";
  const requestedFolder = typeof form.get("folder") === "string" ? String(form.get("folder")) : "deliverables";
  const folder = ALLOWED_FOLDERS.has(requestedFolder) ? requestedFolder : "deliverables";
  const threadId = typeof form.get("threadId") === "string" ? String(form.get("threadId")) : undefined;
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (!clientId || files.length === 0) {
    return NextResponse.json({ error: "Expected clientId and at least one file." }, { status: 400 });
  }
  if (access.role === "client" && access.clientId !== clientId) {
    return NextResponse.json({ error: "Client accounts can upload only to their own workspace." }, { status: 403 });
  }
  if (
    files.length > MAX_FILES_PER_UPLOAD
    || files.some(file => file.size > MAX_FILE_BYTES)
    || files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES
  ) {
    return NextResponse.json({ error: "Upload up to 10 files, 20 MB each and 50 MB total." }, { status: 413 });
  }

  const supabase = await createSupabasePrivilegedServerClient();
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

    if (error && process.env.NODE_ENV !== "production") {
      storageMode = "inline";
      const bytes = Buffer.from(await file.arrayBuffer());
      contentBase64 = bytes.toString("base64");
    } else if (error) {
      const uploadedPaths = uploaded.flatMap(item => item.objectPath ? [item.objectPath] : []);
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(PORTAL_UPLOAD_BUCKET).remove(uploadedPaths);
      }
      return NextResponse.json({ error: "Unable to store the uploaded file securely." }, { status: 502 });
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
      by: userLabel(access.role),
      updated: uploadedAt,
      status: threadId ? "Attached" : "Uploaded",
      mimeType: file.type || undefined,
      objectPath,
      storageMode,
      contentBase64,
      threadId,
    });
  }

  try {
    await persistUploadedWorkspaceFiles(supabase, clientId, uploaded);
  } catch (error) {
    const uploadedPaths = uploaded.flatMap(item => item.objectPath ? [item.objectPath] : []);
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(PORTAL_UPLOAD_BUCKET).remove(uploadedPaths);
    }
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to save uploaded file metadata.",
    }, { status: 409 });
  }

  return NextResponse.json({ files: uploaded, uploadedAt });
}
