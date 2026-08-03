import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const roots = [resolve(repositoryRoot, "backend/src"), resolve(repositoryRoot, "src")];
const forbidden = [
  "buildRegisteredDaxQuery",
  "daxQueryRequestSchema",
  "BackendSemanticQueryParamsById",
  "expectedColumnsByQuery",
  "Invalid discriminator value",
  "GENERIC_DAX_DISABLED",
];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const violations = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(path);
      continue;
    }
    if (!extensions.has(extname(path)) || /\.(spec|test)\.[^.]+$/u.test(path)) continue;
    const contents = await readFile(path, "utf8");
    for (const pattern of forbidden) {
      if (contents.includes(pattern)) violations.push(`${relative(repositoryRoot, path)}: ${pattern}`);
    }
  }
}

for (const root of roots) await scan(root);
if (violations.length > 0) {
  console.error("Greenfield verification failed:\n" + violations.join("\n"));
  process.exit(1);
}
console.log("Greenfield verification passed: no registered backend runtime references found.");
