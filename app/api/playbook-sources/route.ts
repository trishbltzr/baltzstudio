import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { findPlaybookDoc } from "@/portal/playbookDocs";
import { resolvePortalRequestAccess } from "@/lib/portalRequestAccess";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const access = await resolvePortalRequestAccess(request, await createSupabaseServerClient());
  if (!access) return NextResponse.json({ error: "Sign in to load playbook sources." }, { status: 401 });
  if (access.role === "client") return NextResponse.json({ error: "Playbook source files are staff-only." }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const doc = findPlaybookDoc(searchParams.get("doc"));

  if (!doc) {
    return NextResponse.json({ error: "Expected a valid playbook document." }, { status: 400 });
  }

  const files = await Promise.all(
    doc.sourceFiles.map(async file => {
      const fullPath = path.join(process.cwd(), file);
      const content = await readFile(fullPath, "utf8");
      return { file, content };
    }),
  );

  return NextResponse.json({ doc: doc.id, files });
}
