import assert from "node:assert/strict";
import test from "node:test";
import { ConfidentialClientFabricAuthClient, POWER_BI_SCOPE } from "../../src/clients/fabric-auth.client.js";

test("reuses an unexpired access token", async () => {
  let calls = 0;
  const client = new ConfidentialClientFabricAuthClient({
    async acquireTokenByClientCredential(request) {
      calls += 1;
      assert.deepEqual(request.scopes, [POWER_BI_SCOPE]);
      return { accessToken: "token", expiresOn: new Date(Date.now() + 600_000) };
    },
  });
  assert.equal(await client.acquire(), "token");
  assert.equal(await client.acquire(), "token");
  assert.equal(calls, 1);
});
