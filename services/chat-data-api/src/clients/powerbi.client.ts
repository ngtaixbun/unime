import { SemanticError } from "../errors/semantic.error.js";

interface ExecuteQueriesPayload {
  readonly results?: Array<{
    readonly tables?: Array<{
      readonly rows?: Array<Record<string, unknown>>;
      readonly error?: unknown;
    }>;
    readonly error?: unknown;
  }>;
  readonly error?: unknown;
}

export interface PowerBiConfig {
  readonly WORKSPACE_ID: string;
  readonly SEMANTIC_MODEL_ID: string;
  readonly POWERBI_TIMEOUT_MS: number;
  readonly POWERBI_MAX_RESPONSE_BYTES: number;
}

export interface PowerBiClientRequest {
  readonly token: string;
  readonly dax: string;
  readonly signal?: AbortSignal;
}

export interface PowerBiRawQueryResult {
  readonly rows: Array<Record<string, unknown>>;
}

export interface PowerBiClient {
  executeQuery(input: PowerBiClientRequest): Promise<PowerBiRawQueryResult>;
}

export interface PowerBiClientOptions {
  readonly fetcher?: typeof fetch;
}

export class PowerBiHttpClient implements PowerBiClient {
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;

  public constructor(config: PowerBiConfig, options: PowerBiClientOptions = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.endpoint = "https://api.powerbi.com/v1.0/myorg" +
      `/groups/${encodeURIComponent(config.WORKSPACE_ID)}` +
      `/datasets/${encodeURIComponent(config.SEMANTIC_MODEL_ID)}/executeQueries`;
    this.timeoutMs = config.POWERBI_TIMEOUT_MS;
    this.maxResponseBytes = config.POWERBI_MAX_RESPONSE_BYTES;
  }

  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;

  private async readPayload(response: Response): Promise<ExecuteQueriesPayload> {
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > this.maxResponseBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw new SemanticError(
        "SEMANTIC_SCHEMA_MISMATCH",
        "Power BI returned an oversized semantic response.",
        502,
      );
    }

    if (!response.body) {
      throw new SemanticError(
        "SEMANTIC_UPSTREAM_ERROR",
        "Power BI returned an invalid response.",
        502,
      );
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > this.maxResponseBytes) {
        await reader.cancel();
        throw new SemanticError(
          "SEMANTIC_SCHEMA_MISMATCH",
          "Power BI returned an oversized semantic response.",
          502,
        );
      }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as ExecuteQueriesPayload;
  }

  public async executeQuery(input: PowerBiClientRequest): Promise<PowerBiRawQueryResult> {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), this.timeoutMs);
    const signal = input.signal
      ? AbortSignal.any([input.signal, timeout.signal])
      : timeout.signal;

    try {
      const response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${input.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          queries: [{ query: input.dax }],
          serializerSettings: { includeNulls: true },
        }),
        signal,
      });

      if (!response.ok) {
        // Consume the body so the connection can be reused, but never propagate it.
        await response.body?.cancel().catch(() => undefined);
        if (response.status === 401 || response.status === 403) {
          throw new SemanticError(
            "SEMANTIC_AUTH_FAILED",
            "Power BI rejected the semantic service credentials or model access.",
            502,
          );
        }
        if (response.status === 429) {
          throw new SemanticError(
            "SEMANTIC_RATE_LIMITED",
            "Power BI is temporarily rate limited.",
            503,
          );
        }
        if (response.status === 400) {
          throw new SemanticError(
            "SEMANTIC_QUERY_FAILED",
            "Power BI rejected the fixed semantic query.",
            502,
          );
        }
        throw new SemanticError(
          "SEMANTIC_UPSTREAM_ERROR",
          "Power BI returned an upstream error.",
          502,
        );
      }

      const payload = await this.readPayload(response);

      if (!Array.isArray(payload.results) || payload.results.length !== 1) {
        throw new SemanticError(
          "SEMANTIC_SCHEMA_MISMATCH",
          "Power BI returned an unexpected semantic result shape.",
          502,
        );
      }
      const result = payload.results[0];
      if (!result || !Array.isArray(result.tables) || result.tables.length !== 1) {
        throw new SemanticError(
          "SEMANTIC_SCHEMA_MISMATCH",
          "Power BI returned an unexpected semantic result shape.",
          502,
        );
      }
      const table = result.tables[0];
      if (payload.error || result?.error || table?.error) {
        throw new SemanticError(
          "SEMANTIC_QUERY_FAILED",
          "Power BI rejected the fixed semantic query.",
          502,
        );
      }
      if (!table || !Array.isArray(table.rows)) {
        throw new SemanticError(
          "SEMANTIC_SCHEMA_MISMATCH",
          "Power BI returned an unexpected semantic result shape.",
          502,
        );
      }
      return { rows: table.rows };
    } catch (error) {
      if (error instanceof SemanticError) throw error;
      if (timeout.signal.aborted && !input.signal?.aborted) {
        throw new SemanticError(
          "SEMANTIC_TIMEOUT",
          "The semantic query timed out.",
          504,
          { cause: error },
        );
      }
      if (input.signal?.aborted) {
        throw new SemanticError(
          "REQUEST_ABORTED",
          "The request was cancelled.",
          499,
          { cause: error },
        );
      }
      throw new SemanticError(
        "SEMANTIC_UPSTREAM_ERROR",
        "Power BI is unavailable.",
        502,
        { cause: error },
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
