export const gatewayErrorCodes = [
  "INVALID_REQUEST",
  "POWERBI_QUERY_FAILED",
  "POWERBI_SCHEMA_MISMATCH",
  "AZURE_AD_AUTH_FAILED",
  "POWERBI_AUTH_FAILED",
  "POWERBI_ACCESS_DENIED",
  "POWERBI_RATE_LIMITED",
  "POWERBI_TIMEOUT",
  "POWERBI_UPSTREAM_ERROR",
  "AZURE_TOKEN_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "PAYLOAD_TOO_LARGE",
  "DAX_REJECTED",
  "SCHEMA_MISMATCH",
  "QUERY_TIMEOUT",
  "CLIENT_ABORTED",
  "UPSTREAM_ERROR",
  "GATEWAY_NOT_READY",
  "INTERNAL_ERROR",
] as const;

export type GatewayErrorCode = string;

export type GenericDaxErrorKind =
  | "validation"
  | "network"
  | "query"
  | "schema"
  | "protocol"
  | "aborted"
  | "internal";

export interface GenericDaxRequest {
  /** Local-only identity. It is never sent by the single-query transport. */
  readonly queryName?: string;
  readonly dax: string;
  readonly expectedColumns: readonly string[];
}

export interface GenericDaxBatchRequest extends GenericDaxRequest {
  readonly queryName: string;
}

export interface GenericDaxResult {
  readonly requestId: string;
  readonly queryName: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly unknown[])[];
  readonly rowCount: number;
  readonly schemaVerified: boolean;
  readonly durationMs?: number;
}

export type GatewayErrorDetails = Readonly<Record<string, string | number | boolean | null>>;

export interface GenericDaxBatchSuccess
  extends Omit<GenericDaxResult, "requestId"> {
  readonly success: true;
}

/** Kept as a UI type only. The gateway transport itself is all-or-nothing. */
export interface GenericDaxBatchFailure {
  readonly queryName: string;
  readonly success: false;
  readonly error: {
    readonly code: GatewayErrorCode;
    readonly message: string;
    readonly retryable: false;
    readonly retryAfterMs?: number;
  };
}

export interface GenericDaxBatchResult {
  readonly requestId: string;
  /** A transport error rejects the whole batch; resolved items are all successful. */
  readonly results: readonly GenericDaxBatchSuccess[];
}

export class GenericDaxClientError extends Error {
  public failedQueryName?: string;

  public readonly kind: GenericDaxErrorKind;

  public readonly requestAttempted: boolean;

  public constructor(
    public readonly code: GatewayErrorCode,
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
    public readonly requestId?: string,
    public readonly retryAfterMs?: number,
    options?: ErrorOptions & {
      readonly kind?: GenericDaxErrorKind;
      readonly requestAttempted?: boolean;
      readonly details?: GatewayErrorDetails;
    },
  ) {
    super(message, options);
    this.name = "GenericDaxClientError";
    this.kind = options?.kind ?? "internal";
    this.requestAttempted = options?.requestAttempted ?? false;
    if (options?.details) this.details = options.details;
  }

  public readonly details?: GatewayErrorDetails;
}

interface ClientOptions {
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly fetcher?: typeof fetch;
  /** Test seam; production uses the required 0/1500/4000 ms retry schedule. */
  readonly retryDelaysMs?: readonly number[];
}

interface ExecuteOptions {
  readonly signal?: AbortSignal;
}

interface GatewayDataSet {
  readonly columns: string[];
  readonly rows: Array<Record<string, unknown>>;
}

const defaultRetryDelaysMs = [0, 1_500, 4_000] as const;
let didLogDevelopmentEnvironment = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Normalizes either a host root or an existing /api root into exactly one API
 * prefix. Relative /api remains the same-origin local default.
 */
export function normalizeApiBaseUrl(value?: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "" || trimmed === "/" || trimmed === "/api" || trimmed === "/api/") {
    return "/api";
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/u, "");
  if (withoutTrailingSlash.endsWith("/api")) return withoutTrailingSlash;
  return `${withoutTrailingSlash}/api`;
}

function clientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function requestIdFromPayload(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  if (isRecord(payload.meta) && isNonEmptyString(payload.meta.requestId)) {
    return payload.meta.requestId;
  }
  if (isRecord(payload.error) && isNonEmptyString(payload.error.requestId)) {
    return payload.error.requestId;
  }
  return undefined;
}

function durationFromPayload(payload: unknown): number | undefined {
  if (!isRecord(payload) || !isRecord(payload.meta)) return undefined;
  return typeof payload.meta.durationMs === "number" && Number.isFinite(payload.meta.durationMs)
    ? payload.meta.durationMs
    : undefined;
}

function defaultCode(status: number): GatewayErrorCode {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 504) return "QUERY_TIMEOUT";
  if (status >= 500) return "UPSTREAM_ERROR";
  return "INVALID_REQUEST";
}

function retryAfterFromHeader(response: Response): number | undefined {
  const raw = response.headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1_000);
  const date = Date.parse(raw);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey.includes("token") ||
        normalizedKey.includes("secret") ||
        normalizedKey.includes("authorization") ||
        normalizedKey.includes("password")
      ) {
        return [key, "[REDACTED]"];
      }
      return [key, redactSensitive(entry)];
    }),
  );
}

function selectedResponseHeaders(response: Response): Record<string, string | null> {
  return {
    "content-type": response.headers.get("content-type"),
    "x-request-id": response.headers.get("x-request-id"),
    "retry-after": response.headers.get("retry-after"),
    "cache-control": response.headers.get("cache-control"),
  };
}

function parseJsonBody(rawBody: string): unknown {
  return rawBody.trim() === "" ? undefined : JSON.parse(rawBody);
}

function parseError(
  response: Response,
  payload: unknown,
  fallbackRequestId: string,
): GenericDaxClientError {
  const error = isRecord(payload) && isRecord(payload.error) ? payload.error : undefined;
  const code = isNonEmptyString(error?.code) ? error.code : defaultCode(response.status);
  const message = isNonEmptyString(error?.message)
    ? error.message
    : `Generic DAX Gateway trả lỗi ${response.status}.`;
  const requestId = requestIdFromPayload(payload) ??
    response.headers.get("x-request-id") ?? fallbackRequestId;
  const nonRetryableCodes = new Set([
    "INVALID_REQUEST",
    "DAX_REJECTED",
    "POWERBI_QUERY_FAILED",
    "SCHEMA_MISMATCH",
    "POWERBI_SCHEMA_MISMATCH",
    "AZURE_TOKEN_FAILED",
    "AZURE_AD_AUTH_FAILED",
    "POWERBI_AUTH_FAILED",
    "POWERBI_ACCESS_DENIED",
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "PAYLOAD_TOO_LARGE",
  ]);
  const retryable = !nonRetryableCodes.has(code) &&
    (response.status === 502 || response.status === 503 || response.status === 504);
  const result = new GenericDaxClientError(
    code,
    message,
    response.status,
    retryable,
    requestId,
    retryAfterFromHeader(response),
    {
      kind: code === "SCHEMA_MISMATCH" || code === "POWERBI_SCHEMA_MISMATCH"
        ? "schema"
        : nonRetryableCodes.has(code)
          ? "query"
          : retryable
            ? "network"
            : response.status >= 500
              ? "internal"
              : "query",
      requestAttempted: true,
      details: isRecord(error?.details)
        ? error.details as GatewayErrorDetails
        : undefined,
    },
  );
  if (isNonEmptyString(error?.failedQueryName)) {
    result.failedQueryName = error.failedQueryName;
  }
  return result;
}

function assertRequest(request: GenericDaxRequest): void {
  if (!isNonEmptyString(request.dax)) {
    throw new GenericDaxClientError(
      "INVALID_REQUEST",
      "DAX query đang trống.",
      400,
      false,
      undefined,
      undefined,
      { kind: "validation", requestAttempted: false },
    );
  }
  if (
    !Array.isArray(request.expectedColumns) ||
    request.expectedColumns.length === 0 ||
    request.expectedColumns.some((column) => !isNonEmptyString(column)) ||
    new Set(request.expectedColumns).size !== request.expectedColumns.length
  ) {
    throw new GenericDaxClientError(
      "INVALID_REQUEST",
      "expectedColumns không hợp lệ.",
      400,
      false,
      undefined,
      undefined,
      { kind: "validation", requestAttempted: false },
    );
  }
}

function parseDataSet(value: unknown, expectedColumns: readonly string[]): GatewayDataSet {
  if (!isRecord(value) || !Array.isArray(value.columns) || !Array.isArray(value.rows)) {
    throw new GenericDaxClientError(
      "UPSTREAM_ERROR",
      "Generic DAX Gateway trả data không hợp lệ.",
      502,
      false,
      undefined,
      undefined,
      { kind: "protocol", requestAttempted: true },
    );
  }
  const columns = value.columns;
  if (
    columns.some((column) => !isNonEmptyString(column)) ||
    columns.length !== expectedColumns.length ||
    columns.some((column, index) => column !== expectedColumns[index])
  ) {
    throw new GenericDaxClientError(
      "SCHEMA_MISMATCH",
      "Generic DAX Gateway trả columns không khớp expectedColumns.",
      502,
      false,
      undefined,
      undefined,
      { kind: "schema", requestAttempted: true },
    );
  }
  const rows = value.rows.map((row) => {
    if (!isRecord(row)) {
      throw new GenericDaxClientError(
        "UPSTREAM_ERROR",
        "Generic DAX Gateway trả row không hợp lệ.",
        502,
        false,
        undefined,
        undefined,
        { kind: "protocol", requestAttempted: true },
      );
    }
    for (const column of columns) {
      if (!Object.prototype.hasOwnProperty.call(row, column)) {
        throw new GenericDaxClientError(
          "SCHEMA_MISMATCH",
          `Generic DAX Gateway thiếu cột ${column}.`,
          502,
          false,
          undefined,
          undefined,
          { kind: "schema", requestAttempted: true },
        );
      }
    }
    return row;
  });
  return { columns: columns as string[], rows };
}

function toResult(
  queryName: string,
  dataSet: GatewayDataSet,
  requestId: string,
  durationMs?: number,
): GenericDaxResult {
  return {
    requestId,
    queryName,
    columns: dataSet.columns,
    rows: dataSet.rows.map((row) => dataSet.columns.map((column) => row[column])),
    rowCount: dataSet.rows.length,
    schemaVerified: true,
    ...(durationMs === undefined ? {} : { durationMs }),
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timeout = globalThis.setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      globalThis.clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function logDevelopmentFailure(url: string, error: GenericDaxClientError): void {
  console.error("Generic DAX Gateway request failed", {
    requestUrl: url,
    httpStatus: error.status,
    errorCode: error.code,
    requestId: error.requestId,
    message: error.message,
    details: error.details,
  });
}

function logDevelopmentDiagnostic(details: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  console.info("[generic-dax]", details);
}

function developmentBackendFlag(): string | undefined {
  const key = ["VITE", "USE", "BACKEND"].join("_");
  const value = (import.meta.env as unknown as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

export class GenericDaxClient {
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly apiBaseUrl: string;
  private readonly retryDelaysMs: readonly number[];

  public constructor(options: ClientOptions = {}) {
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = options.timeoutMs ?? 65_000;
    const configuredBaseUrl = options.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? "/api";
    this.apiBaseUrl = normalizeApiBaseUrl(configuredBaseUrl);
    this.retryDelaysMs = options.retryDelaysMs ?? defaultRetryDelaysMs;
    if (!didLogDevelopmentEnvironment && options.baseUrl === undefined) {
      didLogDevelopmentEnvironment = true;
      logDevelopmentDiagnostic({
        event: "generic_dax_environment",
        mode: import.meta.env.MODE,
        apiBaseUrl: this.apiBaseUrl,
        useBackend: developmentBackendFlag(),
      });
    }
  }

  public async query(
    request: GenericDaxRequest,
    options: ExecuteOptions = {},
  ): Promise<GenericDaxResult> {
    const url = `${this.apiBaseUrl}/dax/query`;
    logDevelopmentDiagnostic({
      event: "generic_dax_client_called",
      url,
      expectedColumnCount: Array.isArray(request.expectedColumns)
        ? request.expectedColumns.length
        : 0,
      aborted: options.signal?.aborted ?? false,
    });
    try {
      assertRequest(request);
    } catch (cause) {
      logDevelopmentDiagnostic({
        event: "generic_dax_validation_blocked",
        url,
        code: cause instanceof GenericDaxClientError ? cause.code : "INVALID_REQUEST",
        expectedColumnCount: Array.isArray(request.expectedColumns)
          ? request.expectedColumns.length
          : 0,
        aborted: options.signal?.aborted ?? false,
      });
      throw cause;
    }
    const payload = await this.post(
      "/dax/query",
      { dax: request.dax, expectedColumns: [...request.expectedColumns] },
      options.signal,
      request.expectedColumns.length,
    );
    if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) {
      throw new GenericDaxClientError(
        "UPSTREAM_ERROR",
        "Generic DAX Gateway trả response không hợp lệ.",
        502,
        false,
        requestIdFromPayload(payload),
        undefined,
        { kind: "protocol", requestAttempted: true },
      );
    }
    const requestId = requestIdFromPayload(payload) ?? "";
    return toResult(
      request.queryName ?? "dax-query",
      parseDataSet(payload.data, request.expectedColumns),
      requestId,
      durationFromPayload(payload),
    );
  }

  public async batch(
    requests: readonly GenericDaxBatchRequest[],
    options: ExecuteOptions = {},
  ): Promise<GenericDaxBatchResult> {
    if (requests.length === 0) {
      throw new GenericDaxClientError(
        "INVALID_REQUEST", "Batch queries đang trống.", 400, false,
        undefined, undefined, { kind: "validation", requestAttempted: false },
      );
    }
    const names = requests.map((request) => request.queryName);
    if (names.some((name) => !isNonEmptyString(name)) || new Set(names).size !== names.length) {
      throw new GenericDaxClientError(
        "INVALID_REQUEST", "Batch query name phải unique.", 400, false,
        undefined, undefined, { kind: "validation", requestAttempted: false },
      );
    }
    requests.forEach(assertRequest);
    const payload = await this.post(
      "/dax/batch",
      {
        queries: requests.map((request) => ({
          name: request.queryName,
          dax: request.dax,
          expectedColumns: [...request.expectedColumns],
        })),
      },
      options.signal,
      requests.reduce((count, request) => count + request.expectedColumns.length, 0),
    );
    if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) {
      throw new GenericDaxClientError(
        "UPSTREAM_ERROR",
        "Generic DAX Gateway trả batch response không hợp lệ.",
        502,
        false,
        requestIdFromPayload(payload),
        undefined,
        { kind: "protocol", requestAttempted: true },
      );
    }
    const requestId = requestIdFromPayload(payload) ?? "";
    const responseData = payload.data;
    const results = requests.map((request): GenericDaxBatchSuccess => {
      const value = responseData[request.queryName];
      const parsed = toResult(
        request.queryName,
        parseDataSet(value, request.expectedColumns),
        requestId,
      );
      return { ...parsed, success: true };
    });
    return { requestId, results };
  }

  private async post(
    path: string,
    body: unknown,
    externalSignal?: AbortSignal,
    expectedColumnCount = 0,
  ): Promise<unknown> {
    const url = `${this.apiBaseUrl}${path}`;
    const fallbackRequestId = clientRequestId();
    let lastError: GenericDaxClientError | undefined;

    for (let attempt = 0; attempt <= this.retryDelaysMs.length; attempt += 1) {
      if (externalSignal?.aborted) {
        throw new GenericDaxClientError(
          "CLIENT_ABORTED",
          "Request đã bị hủy.",
          499,
          false,
          fallbackRequestId,
          undefined,
          { kind: "aborted", requestAttempted: false },
        );
      }
      if (attempt > 0) {
        try {
          await sleep(this.retryDelaysMs[attempt - 1] ?? 0, externalSignal);
        } catch (cause) {
          throw new GenericDaxClientError(
            "CLIENT_ABORTED",
            "Request đã bị hủy.",
            499,
            false,
            fallbackRequestId,
            undefined,
            { cause, kind: "aborted", requestAttempted: true },
          );
        }
      }

      const timeoutController = new AbortController();
      const timeoutId = globalThis.setTimeout(() => timeoutController.abort(), this.timeoutMs);
      const abortFromExternal = () => timeoutController.abort();
      externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
      const requestBody = redactSensitive(body);

      try {
        console.info("DAX FETCH REQUEST", {
          url,
          method: "POST",
          body: requestBody,
          expectedColumnCount,
          aborted: timeoutController.signal.aborted,
          attempt: attempt + 1,
        });
        const response = await this.fetcher(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: timeoutController.signal,
        });
        const rawBody = await response.text();
        console.info("DAX FETCH RESPONSE", {
          url,
          method: "POST",
          attempt: attempt + 1,
          status: response.status,
          ok: response.ok,
          headers: selectedResponseHeaders(response),
          body: rawBody,
        });
        let payload: unknown;
        try {
          payload = parseJsonBody(rawBody);
        } catch (cause) {
          lastError = new GenericDaxClientError(
            "UPSTREAM_ERROR",
            "Generic DAX Gateway trả JSON không hợp lệ.",
            response.status || 502,
            response.status === 502 || response.status === 503 || response.status === 504,
            response.headers.get("x-request-id") ?? fallbackRequestId,
            undefined,
            { cause, kind: "protocol", requestAttempted: true },
          );
          if (!lastError.retryable || attempt === this.retryDelaysMs.length) throw lastError;
          continue;
        }
        if (!response.ok) {
          lastError = parseError(response, payload, fallbackRequestId);
          if (!lastError.retryable || attempt === this.retryDelaysMs.length) throw lastError;
          continue;
        }
        return payload;
      } catch (cause) {
        if (cause instanceof GenericDaxClientError) {
          console.error("DAX FETCH ERROR", {
            url,
            cause,
            name: cause.name,
            message: cause.message,
            classification: cause.requestAttempted
              ? cause.kind === "protocol"
                ? "response_parse_error"
                : "http_response_error"
              : "client_validation_error",
            httpStatus: cause.status,
            errorCode: cause.code,
            requestId: cause.requestId,
            details: cause.details,
          });
          if (!cause.retryable || attempt === this.retryDelaysMs.length) {
            logDevelopmentFailure(url, cause);
            throw cause;
          }
          lastError = cause;
          continue;
        }
        if (externalSignal?.aborted) {
          const abortedError = new GenericDaxClientError(
            "CLIENT_ABORTED",
            "Request đã bị hủy.",
            499,
            false,
            fallbackRequestId,
            undefined,
            { cause, kind: "aborted", requestAttempted: true },
          );
          console.error("DAX FETCH ERROR", {
            url,
            cause,
            name: cause instanceof Error ? cause.name : undefined,
            message: cause instanceof Error ? cause.message : String(cause),
            classification: "external_abort",
          });
          throw abortedError;
        }
        const timedOut = timeoutController.signal.aborted;
        const causeName = cause instanceof Error ? cause.name : undefined;
        const causeMessage = cause instanceof Error ? cause.message : String(cause);
        const isAbortError = causeName === "AbortError";
        const classification = timedOut
          ? "timeout"
          : isAbortError
            ? "abort_error"
            : cause instanceof TypeError
              ? "network_or_cors"
              : "network";
        console.error("DAX FETCH ERROR", {
          url,
          cause,
          name: causeName,
          message: causeMessage,
          classification,
        });
        lastError = new GenericDaxClientError(
          timedOut ? "QUERY_TIMEOUT" : isAbortError ? "CLIENT_ABORTED" : "UPSTREAM_ERROR",
          timedOut
            ? "Generic DAX Gateway vượt quá thời gian chờ."
            : isAbortError
              ? "Request đã bị hủy trước khi nhận response từ Generic DAX Gateway."
              : "Không thể reach Generic DAX Gateway. Có thể do CORS, DNS, SSL hoặc backend không phản hồi.",
          timedOut ? 504 : isAbortError ? 499 : 502,
          !isAbortError,
          fallbackRequestId,
          undefined,
          {
            cause,
            kind: isAbortError ? "aborted" : "network",
            requestAttempted: true,
            details: {
              classification,
              causeName: causeName ?? null,
              causeMessage,
              responseReceived: false,
            },
          },
        );
        if (attempt === this.retryDelaysMs.length) {
          logDevelopmentFailure(url, lastError);
          throw lastError;
        }
      } finally {
        globalThis.clearTimeout(timeoutId);
        externalSignal?.removeEventListener("abort", abortFromExternal);
      }
    }

    throw lastError ?? new GenericDaxClientError(
      "INTERNAL_ERROR",
      "Generic DAX Gateway request thất bại.",
      500,
      false,
      fallbackRequestId,
      undefined,
      { kind: "internal", requestAttempted: true },
    );
  }
}

export function executeDax(
  request: GenericDaxRequest,
  options: ExecuteOptions & ClientOptions = {},
): Promise<GenericDaxResult> {
  return new GenericDaxClient(options).query(request, { signal: options.signal });
}

export function executeDaxBatch(
  requests: readonly GenericDaxBatchRequest[],
  options: ExecuteOptions & ClientOptions = {},
): Promise<GenericDaxBatchResult> {
  return new GenericDaxClient(options).batch(requests, { signal: options.signal });
}
