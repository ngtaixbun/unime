import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(serviceRoot, "../..");
const sourceRoot = resolve(repositoryRoot, "src");
const sentinelCycle = "209912";
const cyclePlaceholder = "__CHAT_VALIDATED_CYCLE_KEY__";
const rawDaxPlugin = {
  name: "raw-dax",
  setup(buildApi) {
    buildApi.onResolve({ filter: /\.dax\?raw$/ }, (args) => ({
      path: resolve(args.resolveDir, args.path.slice(0, -"?raw".length)),
      namespace: "raw-dax",
    }));
    buildApi.onLoad({ filter: /.*/, namespace: "raw-dax" }, async (args) => ({
      contents: `export default ${JSON.stringify(await readFile(args.path, "utf8"))};`,
      loader: "js",
    }));
  },
};

const aliasPlugin = {
  name: "root-alias",
  setup(buildApi) {
    buildApi.onResolve({ filter: /^@\// }, (args) => {
      const base = resolve(sourceRoot, args.path.slice(2));
      const path = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")].find(existsSync);
      if (!path) throw new Error(`Cannot resolve root alias ${args.path}.`);
      return { path };
    });
  },
};

const tempDirectory = await mkdtemp(join(tmpdir(), "unime-chat-capability-"));
try {
  const entry = `
    import { market } from ${JSON.stringify(resolve(sourceRoot, "queries/market.ts"))};
    export default market({ cycleKey: ${sentinelCycle}, filters: {} });
  `;
  const bundle = await build({
    stdin: { contents: entry, resolveDir: repositoryRoot, sourcefile: "chat-capability-entry.ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    write: false,
    metafile: true,
    plugins: [rawDaxPlugin, aliasPlugin],
    logLevel: "silent",
  });
  const bundledPath = join(tempDirectory, "capability.mjs");
  await writeFile(bundledPath, bundle.outputFiles[0].text, "utf8");
  const generated = (await import(`${pathToFileURL(bundledPath).href}?v=${Date.now()}`)).default;

  if (generated.connection !== "unimeModel") {
    throw new Error(`Existing market() factory resolved an unapproved connection: ${generated.connection}.`);
  }

  const occurrences = generated.query.split(sentinelCycle).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Expected exactly one generated cycle literal, found ${occurrences}.`);
  }
  const expectedColumns = Object.keys(generated.columnMetadata);
  for (const required of [
    "[coverage_shop]", "[plan_shop]", "[coverage_shop_perc]",
    "[coverage_emp]", "[plan_emp]", "[coverage_emp_perc]",
  ]) {
    if (!expectedColumns.includes(required)) throw new Error(`Existing market() capability lacks ${required}.`);
  }

  const sourceFiles = Object.keys(bundle.metafile.inputs)
    .filter((input) => input !== "chat-capability-entry.ts")
    .map((input) => input.replace(/^raw-dax:/, ""))
    // esbuild reports normal inputs relative to the process working directory
    // (the service root for every package script); raw-plugin inputs are absolute.
    .map((input) => resolve(serviceRoot, input))
    .filter((input) => existsSync(input))
    .map((input) => input.slice(repositoryRoot.length + 1))
    .sort();
  if (!sourceFiles.includes("src/queries/market.dax")) {
    throw new Error("Bundler provenance does not include the existing market DAX template.");
  }
  const hash = createHash("sha256");
  for (const relativePath of sourceFiles) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(resolve(repositoryRoot, relativePath)));
    hash.update("\0");
  }
  const artifact = {
    schemaVersion: 1,
    capabilities: {
      "market.summary": {
        sourceFactory: "src/queries/market.ts#market",
        sourceFiles,
        sourceHash: hash.digest("hex"),
        connection: generated.connection,
        queryTemplate: generated.query.replace(sentinelCycle, cyclePlaceholder),
        cyclePlaceholder,
        supportedFilters: ["region", "amm", "supervisor", "employee", "npp"],
        expectedColumns,
      },
    },
  };
  const output = `// Generated from existing Unime query factories. Do not edit.\n` +
    `export const generatedQueryCapabilities = ${JSON.stringify(artifact, null, 2)} as const;\n`;
  // A fresh clone has no src/generated/ (the artifact is never committed).
  await mkdir(resolve(serviceRoot, "src/generated"), { recursive: true });
  await writeFile(resolve(serviceRoot, "src/generated/query-capabilities.generated.ts"), output, "utf8");
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}
