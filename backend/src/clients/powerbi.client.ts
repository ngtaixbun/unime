import type { GatewayEnv } from "../config/env.js";
import { GatewayError, type GatewayErrorDetails } from "../types/dax.js";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeText(value: unknown, fallback: string | null = ""): string | null {
  if (typeof value === "string") return value.slice(0, 1_000);
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.stringify(value).slice(0, 1_000);
  } catch {
    return String(value).slice(0, 1_000);
  }
}

function nestedError(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return value.error ?? value.message ?? value;
}

function powerBiDetails(
  response: Response,
  upstreamError?: unknown,
): GatewayErrorDetails {
  const error = nestedError(upstreamError);
  const record = isRecord(error) ? error : undefined;
  const powerBiCode = record?.code ?? record?.["pbi.error"] ?? record?.errorCode;
  return {
    source: "powerbi",
    upstreamStatus: response.status,
    upstreamStatusText: response.statusText || null,
    upstreamCode: safeText(powerBiCode, null),
    upstreamMessage: safeText(record?.message ?? error, null),
  };
}

async function readPowerBiError(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function causeDetails(error: unknown): GatewayErrorDetails {
  return {
    source: "powerbi",
    failure: "fetch",
    causeName: error instanceof Error ? error.name : typeof error,
    causeMessage: error instanceof Error ? safeText(error.message, null) : safeText(error, null),
  };
}

export class PowerBiHttpClient implements PowerBiClient {
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;

  public constructor(
    private readonly env: GatewayEnv,
    options: PowerBiClientOptions = {},
  ) {
    this.fetcher = options.fetcher ?? fetch;
    this.endpoint = "https://api.powerbi.com/v1.0/myorg" +
      `/groups/${encodeURIComponent(env.WORKSPACE_ID)}` +
      `/datasets/${encodeURIComponent(env.SEMANTIC_MODEL_ID)}/executeQueries`;
  }

  public async executeQuery(input: PowerBiClientRequest): Promise<PowerBiRawQueryResult> {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), this.env.POWERBI_TIMEOUT_MS);
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
        const details = powerBiDetails(response, await readPowerBiError(response));
        if (response.status === 400) {
          throw new GatewayError("POWERBI_QUERY_FAILED", "Power BI rejected the DAX query.", 400, undefined, { details });
        }
        if (response.status === 401) {
          throw new GatewayError("POWERBI_AUTH_FAILED", "Power BI rejected gateway authentication.", 502, undefined, { details });
        }
        if (response.status === 403) {
          throw new GatewayError("POWERBI_ACCESS_DENIED", "The gateway cannot access the configured semantic model.", 502, undefined, { details });
        }
        if (response.status === 429) {
          throw new GatewayError("POWERBI_RATE_LIMITED", "Power BI is rate limited.", 503, undefined, { details });
        }
        throw new GatewayError("POWERBI_UPSTREAM_ERROR", "Power BI returned an upstream error.", 502, undefined, { details });
      }

      let payload: ExecuteQueriesPayload;
      try {
        payload = await response.json() as ExecuteQueriesPayload;
      } catch (error) {
        const details = powerBiDetails(response, "Invalid JSON response from Power BI.");
        throw new GatewayError(
          "POWERBI_UPSTREAM_ERROR",
          "Power BI returned an invalid response.",
          502,
          undefined,
          { cause: error, details },
        );
      }
      const result = payload.results?.[0];
      const table = result?.tables?.[0];
      if (payload.error || result?.error || table?.error) {
        const details = powerBiDetails(response, payload.error ?? result?.error ?? table?.error);
        throw new GatewayError("POWERBI_QUERY_FAILED", "Power BI rejected the DAX query.", 400, undefined, { details });
      }
      if (!table) {
        const details = powerBiDetails(response, "Missing first result table.");
        throw new GatewayError("POWERBI_UPSTREAM_ERROR", "Power BI returned no result table.", 502, undefined, { details });
      }
      return { rows: table.rows ?? [] };
    } catch (error) {
      if (error instanceof GatewayError) throw error;
      if (timeout.signal.aborted && !input.signal?.aborted) {
        throw new GatewayError("POWERBI_TIMEOUT", "Power BI query timed out.", 504);
      }
      if (input.signal?.aborted) {
        throw new GatewayError("REQUEST_ABORTED", "The request was cancelled.", 499);
      }
      throw new GatewayError(
        "POWERBI_UPSTREAM_ERROR",
        "Power BI is unavailable.",
        502,
        undefined,
        { cause: error, details: causeDetails(error) },
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
