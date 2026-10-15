import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { generatedQueryCapabilities } from "../src/generated/query-capabilities.generated.js";

const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(serviceRoot, "../..");

async function daxFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (["node_modules", "dist"].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await daxFiles(path));
    else if (extname(entry.name) === ".dax") files.push(path);
  }
  return files;
}

describe("generated query artifact integrity", () => {
  it("matches the transitive existing Unime source provenance", async () => {
    const capability = generatedQueryCapabilities.capabilities["market.summary"];
    const hash = createHash("sha256");
    for (const relativePath of capability.sourceFiles) {
      hash.update(relativePath);
      hash.update("\0");
      hash.update(await readFile(resolve(repositoryRoot, relativePath)));
      hash.update("\0");
    }
    assert.equal(hash.digest("hex"), capability.sourceHash);
    assert.equal(capability.sourceFactory, "src/queries/market.ts#market");
    assert.equal(capability.connection, "unimeModel");
  });

  it("contains both projections in one artifact and no chatbot-specific DAX", async () => {
    const capability = generatedQueryCapabilities.capabilities["market.summary"];
    for (const column of [
      "[coverage_shop]", "[plan_shop]", "[coverage_shop_perc]",
      "[coverage_emp]", "[plan_emp]", "[coverage_emp_perc]",
    ] as const) {
      assert.ok(capability.expectedColumns.includes(column));
    }
    assert.deepEqual(await daxFiles(serviceRoot), []);
  });
});
