const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/u, "");

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
if (query.data?.rows?.[0]?.gatewayOk !== 1) throw new Error("DAX smoke result is invalid.");
console.log("Local Generic DAX Gateway smoke passed.");
