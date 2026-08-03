#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const localPath = resolve(import.meta.dirname, "..", ".env.local");
const devLocalPath = resolve(import.meta.dirname, "..", ".env.development.local");
const managedKeys = new Set([
  "VITE_API_BASE_URL",
]);

// Read .env.development.local to check for an explicit override
let devLocalContent = "";
try {
  devLocalContent = await readFile(devLocalPath, "utf8");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

function getEnvValue(content, key) {
  for (const line of content.split(/\r?\n/u)) {
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    if (line.slice(0, separator).trim() === key) {
      return line.slice(separator + 1).trim();
    }
  }
  return undefined;
}

// If .env.development.local already defines VITE_API_BASE_URL, skip overwrite
const devOverride = getEnvValue(devLocalContent, "VITE_API_BASE_URL");
if (devOverride) {
  process.stdout.write(`VITE_API_BASE_URL already set in .env.development.local (${devOverride}) — skipping local override.\n`);
} else {
  let existing = "";
  try {
    existing = await readFile(localPath, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const retainedLines = existing.split(/\r?\n/u).filter((line) => {
    const separator = line.indexOf("=");
    if (separator === -1) return true;
    return !managedKeys.has(line.slice(0, separator).trim());
  });
  while (retainedLines.at(-1) === "") retainedLines.pop();
  retainedLines.push("VITE_API_BASE_URL=http://127.0.0.1:3000");

  await writeFile(localPath, `${retainedLines.join("\n")}\n`, { mode: 0o600 });
  process.stdout.write("Configured the local Generic DAX Gateway URL.\n");
}
