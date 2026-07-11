import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { findPlaybookDoc } from "@/portal/playbookDocs";

export async function GET(request: Request) {
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
