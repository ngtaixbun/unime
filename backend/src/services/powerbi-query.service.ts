import type { GatewayEnv } from "../config/env.js";
import type { FabricAuthClient } from "../clients/fabric-auth.client.js";
import type { PowerBiClient } from "../clients/powerbi.client.js";
import {
  GatewayError,
  type DaxBatchItem,
  type DaxQueryExecutor,
  type DaxQueryRequest,
  type DaxQueryResult,
} from "../types/dax.js";
import { normalizePowerBiResult } from "../utils/normalize-powerbi-result.js";

export class PowerBiQueryService implements DaxQueryExecutor {
  public constructor(
    private readonly env: GatewayEnv,
    private readonly authClient: FabricAuthClient,
    private readonly powerBiClient: PowerBiClient,
  ) {}

  public async executeQuery(input: DaxQueryRequest, signal?: AbortSignal): Promise<DaxQueryResult> {
    const token = await this.authClient.acquire();
    return this.executeWithToken(input, token, signal);
  }

  public async executeBatch(
    inputs: readonly DaxBatchItem[],
    signal?: AbortSignal,
  ): Promise<Record<string, DaxQueryResult>> {
    const token = await this.authClient.acquire();
    const batchAbort = new AbortController();
    const combinedSignal = signal
      ? AbortSignal.any([signal, batchAbort.signal])
      : batchAbort.signal;
    const results: Record<string, DaxQueryResult> = {};
    let cursor = 0;
    let firstError: GatewayError | undefined;

    const worker = async (): Promise<void> => {
      while (!firstError) {
        const index = cursor++;
        const input = inputs[index];
        if (!input) return;
        try {
          results[input.name] = await this.executeWithToken(input, token, combinedSignal);
        } catch (error) {
          if (firstError) return;
          const mapped = error instanceof GatewayError
            ? error
            : new GatewayError("POWERBI_QUERY_FAILED", "Power BI query failed.", 502);
          firstError = new GatewayError(
            mapped.code,
            mapped.message,
            mapped.statusCode,
            input.name,
            mapped.details
              ? { cause: mapped, details: mapped.details }
              : { cause: mapped },
          );
          batchAbort.abort();
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(this.env.BATCH_CONCURRENCY, inputs.length) },
        () => worker(),
      ),
    );
    if (firstError) throw firstError;
    return Object.fromEntries(inputs.map(({ name }) => [name, results[name]!])) as Record<string, DaxQueryResult>;
  }

  private async executeWithToken(
    input: DaxQueryRequest,
    token: string,
    signal?: AbortSignal,
  ): Promise<DaxQueryResult> {
    const result = await this.powerBiClient.executeQuery({
      token,
      dax: input.dax,
      ...(signal !== undefined && { signal }),
    });
    return normalizePowerBiResult(result.rows, input.expectedColumns ?? []);
  }
}
