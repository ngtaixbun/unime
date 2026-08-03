const baseUrl = process.env.SMOKE_BASE_URL?.replace(/\/+$/u, "");
if (!baseUrl?.startsWith("https://")) {
  throw new Error("Set SMOKE_BASE_URL to the deployed HTTPS Render host.");
}

async function expectSuccess(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json();
  if (!response.ok || body.success !== true) {
    throw new Error(`${path} failed with HTTP ${response.status}: ${body.error?.code ?? "UNKNOWN"}`);
  }
  console.log(`${path}: HTTP ${response.status}`);
  return body;
}

await expectSuccess("/api/health");
await expectSuccess("/api/health/semantic-model");
const query = await expectSuccess("/api/dax/query", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ dax: 'EVALUATE ROW("gatewayOk", 1)', expectedColumns: ["gatewayOk"] }),
});
if (query.data?.rows?.[0]?.gatewayOk !== 1) throw new Error("Live DAX smoke result is invalid.");
console.log("Live Generic DAX Gateway smoke passed.");
