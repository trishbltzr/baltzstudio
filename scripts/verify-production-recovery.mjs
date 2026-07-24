#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function readInputArgument() {
  const index = process.argv.indexOf("--input");
  const value = index >= 0 ? process.argv[index + 1] : "";
  if (!value || !path.isAbsolute(value)) {
    throw new Error("Pass an absolute recovery-export directory with --input /absolute/path.");
  }
  return path.normalize(value);
}

function checksum(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function resolveArtifact(inputDirectory, relativePath) {
  if (
    !relativePath ||
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/).includes("..")
  ) {
    throw new Error(`Unsafe artifact path in manifest: ${relativePath}`);
  }
  const resolved = path.resolve(inputDirectory, relativePath);
  if (!resolved.startsWith(`${path.resolve(inputDirectory)}${path.sep}`)) {
    throw new Error(`Artifact escapes recovery directory: ${relativePath}`);
  }
  return resolved;
}

async function main() {
  const inputDirectory = readInputArgument();
  const directoryStats = await stat(inputDirectory);
  if (!directoryStats.isDirectory()) throw new Error("Recovery input is not a directory.");

  const manifest = JSON.parse(
    await readFile(path.join(inputDirectory, "manifest.json"), "utf8"),
  );
  if (manifest.format !== "baltazar-studio-supabase-logical-recovery-v1") {
    throw new Error("Unsupported recovery-export format.");
  }

  const artifactByFile = new Map(manifest.artifacts.map((artifact) => [artifact.file, artifact]));
  for (const artifact of manifest.artifacts) {
    const bytes = await readFile(resolveArtifact(inputDirectory, artifact.file));
    if (bytes.length !== artifact.bytes) {
      throw new Error(`Byte count mismatch: ${artifact.file}`);
    }
    if (checksum(bytes) !== artifact.sha256) {
      throw new Error(`Checksum mismatch: ${artifact.file}`);
    }
  }

  let rowCount = 0;
  for (const table of manifest.tables) {
    const artifact = artifactByFile.get(table.file);
    if (!artifact) throw new Error(`Missing table artifact: ${table.name}`);
    const payload = JSON.parse(
      await readFile(resolveArtifact(inputDirectory, table.file), "utf8"),
    );
    if (payload.table !== table.name || payload.rows.length !== table.rows) {
      throw new Error(`Table count mismatch: ${table.name}`);
    }
    rowCount += table.rows;
  }

  const authPayload = JSON.parse(
    await readFile(resolveArtifact(inputDirectory, manifest.auth.file), "utf8"),
  );
  if (authPayload.users.length !== manifest.auth.users) {
    throw new Error("Auth user count mismatch.");
  }

  let storageObjectCount = 0;
  for (const bucket of manifest.storage) {
    for (const object of bucket.objects) {
      const artifact = artifactByFile.get(object.file);
      if (!artifact || artifact.sha256 !== object.sha256 || artifact.bytes !== object.bytes) {
        throw new Error(`Storage manifest mismatch: ${bucket.id}/${object.path}`);
      }
      storageObjectCount += 1;
    }
  }

  process.stdout.write(
    `Recovery verification passed: ${manifest.tables.length} tables, ${rowCount} rows, ` +
      `${manifest.auth.users} Auth users, ${storageObjectCount} Storage objects, ` +
      `${manifest.artifacts.length} hashed artifacts\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

