import type { GatewayEnv } from "../src/config/env.js";
import type { DaxBatchItem, DaxQueryExecutor, DaxQueryRequest, DaxQueryResult } from "../src/types/dax.js";

export function testEnv(overrides: Partial<GatewayEnv> = {}): GatewayEnv {
  return {
    NODE_ENV: "test",
    PORT: 3_000,
    TENANT_ID: "11111111-1111-4111-8111-111111111111",
    CLIENT_ID: "22222222-2222-4222-8222-222222222222",
    CLIENT_SECRET: "test-only",
    WORKSPACE_ID: "33333333-3333-4333-8333-333333333333",
    SEMANTIC_MODEL_ID: "44444444-4444-4444-8444-444444444444",
    POWERBI_TIMEOUT_MS: 1_000,
    DAX_MAX_LENGTH_BYTES: 1_024,
    BATCH_MAX_QUERIES: 4,
    BATCH_CONCURRENCY: 2,
    corsOrigins: ["http://localhost:5173"],
    ...overrides,
  };
}

export class StubExecutor implements DaxQueryExecutor {
  public readonly singleInputs: DaxQueryRequest[] = [];
  public readonly batchInputs: Array<readonly DaxBatchItem[]> = [];
  public singleResult: DaxQueryResult = { columns: ["gatewayOk"], rows: [{ gatewayOk: 1 }] };
  public batchResult: Record<string, DaxQueryResult> = {};
  public error?: Error;

  public async executeQuery(input: DaxQueryRequest): Promise<DaxQueryResult> {
    this.singleInputs.push(input);
    if (this.error) throw this.error;
    return this.singleResult;
  }

  public async executeBatch(inputs: readonly DaxBatchItem[]): Promise<Record<string, DaxQueryResult>> {
    this.batchInputs.push(inputs);
    if (this.error) throw this.error;
    return this.batchResult;
  }
}
