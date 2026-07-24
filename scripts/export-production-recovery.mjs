#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const PUBLIC_TABLES = [
  "agent_definitions",
  "agent_learning_events",
  "agent_memory",
  "agent_memory_revisions",
  "agent_memory_usage_events",
  "agent_runs",
  "check_definitions",
  "check_dependencies",
  "check_result_revisions",
  "client_sources",
  "clients",
  "cocoon_leads",
  "dashboard_project_state",
  "dashboard_state",
  "dashboard_user_state",
  "evidence_items",
  "evidence_snapshots",
  "legacy_service_run_links",
  "migration_review_queue",
  "portal_access_requests",
  "portal_audit_runs",
  "portal_chat_turns",
  "portal_tenant_memberships",
  "portal_tenants",
  "portal_workspace_state",
  "process_exceptions",
  "projection_shadow_comparisons",
  "run_events",
  "service_handoffs",
  "service_runs",
  "task_import_batches",
  "workflow_alerts",
  "workflow_release_controls",
  "workflow_rollout_clients",
];

const PAGE_SIZE = 1_000;

function readOutputArgument() {
  const index = process.argv.indexOf("--output");
  const value = index >= 0 ? process.argv[index + 1] : "";
  if (!value || !path.isAbsolute(value)) {
    throw new Error("Pass a new absolute directory with --output /absolute/path.");
  }

  const normalized = path.normalize(value);
  if (normalized === "/" || normalized === process.env.HOME || normalized.length < 12) {
    throw new Error("Refusing an unsafe recovery-export directory.");
  }
  return normalized;
}

async function assertNewDirectory(outputDirectory) {
  try {
    await stat(outputDirectory);
    throw new Error(`Output already exists: ${outputDirectory}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(outputDirectory, { mode: 0o700, recursive: false });
  await mkdir(path.join(outputDirectory, "tables"), { mode: 0o700 });
  await mkdir(path.join(outputDirectory, "auth"), { mode: 0o700 });
  await mkdir(path.join(outputDirectory, "storage"), { mode: 0o700 });
}

function checksum(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function writeArtifact(outputDirectory, relativePath, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const absolutePath = path.join(outputDirectory, relativePath);
  await mkdir(path.dirname(absolutePath), { mode: 0o700, recursive: true });
  await writeFile(absolutePath, bytes, { mode: 0o600, flag: "wx" });
  return {
    file: relativePath,
    bytes: bytes.length,
    sha256: checksum(bytes),
  };
}

async function exportTable(supabase, tableName) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Unable to export ${tableName}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function exportAuthUsers(supabase) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) throw new Error(`Unable to export Auth users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) break;
  }
  return users;
}

function safeStorageName(originalPath) {
  const basename = path.posix.basename(originalPath).replace(/[^a-zA-Z0-9._-]/g, "_") || "object";
  return `${checksum(Buffer.from(originalPath)).slice(0, 24)}-${basename}`;
}

async function listStorageObjects(supabase, bucketId, prefix = "") {
  const objects = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(bucketId).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Unable to list Storage bucket ${bucketId}: ${error.message}`);
    for (const item of data ?? []) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (!item.id) {
        objects.push(...(await listStorageObjects(supabase, bucketId, objectPath)));
      } else {
        objects.push({ objectPath, metadata: item.metadata ?? null });
      }
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return objects;
}

async function main() {
  const outputDirectory = readOutputArgument();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
  }

  await assertNewDirectory(outputDirectory);

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const exportedAt = new Date().toISOString();
  const manifest = {
    format: "baltazar-studio-supabase-logical-recovery-v1",
    exported_at: exportedAt,
    project_host: new URL(supabaseUrl).host,
    schema_source: "supabase/migrations",
    tables: [],
    auth: null,
    storage: [],
    artifacts: [],
  };

  for (const tableName of PUBLIC_TABLES) {
    const rows = await exportTable(supabase, tableName);
    const relativePath = `tables/${tableName}.json`;
    const artifact = await writeArtifact(
      outputDirectory,
      relativePath,
      JSON.stringify({ table: tableName, exported_at: exportedAt, rows }),
    );
    manifest.tables.push({ name: tableName, rows: rows.length, file: relativePath });
    manifest.artifacts.push(artifact);
    process.stdout.write(`Exported table ${tableName}: ${rows.length} rows\n`);
  }

  const authUsers = await exportAuthUsers(supabase);
  const authArtifact = await writeArtifact(
    outputDirectory,
    "auth/users.json",
    JSON.stringify({ exported_at: exportedAt, users: authUsers }),
  );
  manifest.auth = { users: authUsers.length, file: authArtifact.file };
  manifest.artifacts.push(authArtifact);
  process.stdout.write(`Exported Auth users: ${authUsers.length}\n`);

  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) throw new Error(`Unable to list Storage buckets: ${bucketError.message}`);

  for (const bucket of buckets ?? []) {
    const objects = await listStorageObjects(supabase, bucket.id);
    const bucketManifest = {
      id: bucket.id,
      public: bucket.public,
      objects: [],
    };
    for (const object of objects) {
      const { data, error } = await supabase.storage.from(bucket.id).download(object.objectPath);
      if (error) {
        throw new Error(`Unable to download ${bucket.id}/${object.objectPath}: ${error.message}`);
      }
      const bytes = Buffer.from(await data.arrayBuffer());
      const relativePath = `storage/${bucket.id}/${safeStorageName(object.objectPath)}`;
      const artifact = await writeArtifact(outputDirectory, relativePath, bytes);
      manifest.artifacts.push(artifact);
      bucketManifest.objects.push({
        path: object.objectPath,
        metadata: object.metadata,
        file: relativePath,
        bytes: artifact.bytes,
        sha256: artifact.sha256,
      });
    }
    manifest.storage.push(bucketManifest);
    process.stdout.write(`Exported Storage bucket ${bucket.id}: ${objects.length} objects\n`);
  }

  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(outputDirectory, "manifest.json"), manifestBytes, {
    mode: 0o600,
    flag: "wx",
  });

  process.stdout.write(
    `Recovery export complete: ${PUBLIC_TABLES.length} tables, ${authUsers.length} Auth users, ` +
      `${manifest.storage.reduce((total, bucket) => total + bucket.objects.length, 0)} Storage objects\n`,
  );
  process.stdout.write(`Output: ${outputDirectory}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

