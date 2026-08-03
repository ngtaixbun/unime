#!/usr/bin/env node

import { chmod, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const environmentPath = resolve(import.meta.dirname, "..", ".env");
const keyMapping = new Map([
  ["POWERBI_TENANT_ID", "TENANT_ID"],
  ["POWERBI_CLIENT_ID", "CLIENT_ID"],
  ["POWERBI_CLIENT_SECRET", "CLIENT_SECRET"],
  ["POWERBI_WORKSPACE_ID", "WORKSPACE_ID"],
  ["POWERBI_DATASET_ID", "SEMANTIC_MODEL_ID"],
  ["POWERBI_REQUEST_TIMEOUT_MS", "POWERBI_TIMEOUT_MS"],
]);

const source = await readFile(environmentPath, "utf8");
const existingKeys = new Set(
  source
    .split(/\r?\n/u)
    .map((line) => line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/u)?.[1])
    .filter(Boolean),
);
const migratedKeys = [];

const migrated = source
  .split(/\r?\n/u)
  .map((line) => {
    const match = line.match(/^(\s*)([A-Z][A-Z0-9_]*)(\s*=.*)$/u);
    if (!match) return line;
    const replacement = keyMapping.get(match[2]);
    if (!replacement || existingKeys.has(replacement)) return line;
    migratedKeys.push(replacement);
    return `${match[1]}${replacement}${match[3]}`;
  })
  .join("\n");

await writeFile(environmentPath, migrated, { mode: 0o600 });
await chmod(environmentPath, 0o600);
process.stdout.write(
  migratedKeys.length > 0
    ? `Migrated local gateway environment keys: ${migratedKeys.join(", ")}\n`
    : "Local gateway environment keys already use the canonical contract.\n",
);
