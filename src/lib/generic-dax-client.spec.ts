import { afterEach, describe, expect, it, vi } from "vitest";

import {
  executeDax,
  executeDaxBatch,
  GenericDaxClient,
  GenericDaxClientError,
  normalizeApiBaseUrl,
} from "./generic-dax-client";

const request = {
  queryName: "overview",
  dax: "EVALUATE ROW(\"actual\", 0)",
  expectedColumns: ["actual"],
} as const;

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function success(rows: Array<Record<string, unknown>> = [{ actual: 0 }]): Response {
  return jsonResponse({
    success: true,
    data: { columns: ["actual"], rows },
    meta: { requestId: "server-request", durationMs: 12 },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("normalizeApiBaseUrl", () => {
  it.each([
    ["https://host", "https://host/api"],
    ["https://host/", "https://host/api"],
    ["https://host/api", "https://host/api"],
    ["https://host/api/", "https://host/api"],
    ["/api", "/api"],
    ["/api/", "/api"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeApiBaseUrl(input)).toBe(expected);
  });

  it("uses the same-origin /api default", () => {
    expect(normalizeApiBaseUrl(undefined)).toBe("/api");
  });
});

describe("Generic DAX transport", () => {
  it("executeDax sends only dax and expectedColumns to the canonical route", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      expect(init?.signal?.aborted).toBe(false);
      return success([{ actual: 0 }, { actual: null }]);
    });
    const result = await executeDax(request, {
      baseUrl: "https://gateway.example/api/",
      fetcher,
      timeoutMs: 5_000,
      retryDelaysMs: [],
    });
    expect(result).toMatchObject({
      requestId: "server-request",
      columns: ["actual"],
      rows: [[0], [null]],
      rowCount: 2,
      schemaVerified: true,
      durationMs: 12,
    });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://gateway.example/api/dax/query");
    expect(JSON.parse(String(init?.body))).toEqual({
      dax: request.dax,
      expectedColumns: ["actual"],
    });
    expect(String(init?.body)).not.toContain("queryId");
    expect(String(init?.body)).not.toContain("params");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses the configured development API base instead of the Vite origin", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:3000/api");
    const fetcher = vi.fn<typeof fetch>(async () => success());
    const client = new GenericDaxClient({
      fetcher,
      timeoutMs: 5_000,
      retryDelaysMs: [],
    });

    await client.query(request);

    expect(fetcher).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/api/dax/query",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("binds the default browser fetch receiver to avoid illegal invocation", async () => {
    const originalFetch = globalThis.fetch;
    const receiverProbe = vi.fn(function (this: unknown) {
      expect(this).toBe(globalThis);
      return Promise.resolve(success());
    });
    globalThis.fetch = receiverProbe as unknown as typeof fetch;
    try {
      const client = new GenericDaxClient({
        baseUrl: "/api",
        timeoutMs: 5_000,
        retryDelaysMs: [],
      });

      await client.query(request);

      expect(receiverProbe).toHaveBeenCalledOnce();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reports pre-fetch validation without calling fetch", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new GenericDaxClient({
      baseUrl: "http://127.0.0.1:3000/api",
      fetcher,
      retryDelaysMs: [],
    });

    await expect(client.query({
      dax: request.dax,
      expectedColumns: undefined,
    } as unknown as typeof request)).rejects.toMatchObject({
      kind: "validation",
      code: "INVALID_REQUEST",
      requestAttempted: false,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("logs request and response diagnostics while redacting sensitive fields", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const client = new GenericDaxClient({
      baseUrl: "http://127.0.0.1:3000/api",
      fetcher: vi.fn(async () => success()),
      retryDelaysMs: [],
    });

    await client.query(request);

    const start = info.mock.calls.find(([label]) => label === "DAX FETCH REQUEST");
    expect(start?.[1]).toEqual({
      url: "http://127.0.0.1:3000/api/dax/query",
      method: "POST",
      body: {
        dax: request.dax,
        expectedColumns: ["actual"],
      },
      expectedColumnCount: 1,
      aborted: false,
      attempt: 1,
    });
    const response = info.mock.calls.find(([label]) => label === "DAX FETCH RESPONSE");
    expect(response?.[1]).toMatchObject({
      url: "http://127.0.0.1:3000/api/dax/query",
      method: "POST",
      status: 200,
      ok: true,
    });
    expect((start?.[1] as { body?: { dax?: string } } | undefined)?.body?.dax).toBe(request.dax);
  });

  it("preserves a valid empty result and expected columns", async () => {
    const client = new GenericDaxClient({
      baseUrl: "/api",
      fetcher: vi.fn(async () => success([])),
      timeoutMs: 5_000,
      retryDelaysMs: [],
    });
    await expect(client.query(request)).resolves.toMatchObject({
      columns: ["actual"], rows: [], rowCount: 0,
    });
  });

  it("executeDaxBatch uses names and parses all-or-nothing keyed data", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({
      success: true,
      data: {
        overview: { columns: ["actual"], rows: [{ actual: 1 }] },
        employees: { columns: ["employeeId"], rows: [{ employeeId: 7 }] },
      },
      meta: { requestId: "batch-request", durationMs: 20 },
    }));
    const requests = [
      request,
      {
        queryName: "employees",
        dax: "EVALUATE ROW(\"employeeId\", 7)",
        expectedColumns: ["employeeId"],
      },
    ] as const;
    const result = await executeDaxBatch(requests, {
      baseUrl: "https://gateway.example",
      fetcher,
      timeoutMs: 5_000,
      retryDelaysMs: [],
    });
    expect(result.results.map((item) => [item.queryName, item.rows])).toEqual([
      ["overview", [[1]]],
      ["employees", [[7]]],
    ]);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://gateway.example/api/dax/batch");
    expect(JSON.parse(String(init?.body))).toEqual({
      queries: [
        { name: "overview", dax: request.dax, expectedColumns: ["actual"] },
        { name: "employees", dax: requests[1].dax, expectedColumns: ["employeeId"] },
      ],
    });
  });

  it("rejects duplicate batch names before fetch", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new GenericDaxClient({
      baseUrl: "/api", fetcher, timeoutMs: 5_000, retryDelaysMs: [],
    });
    await expect(client.batch([request, request])).rejects.toMatchObject({
      code: "INVALID_REQUEST", status: 400,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("surfaces a batch failure envelope instead of converting it to empty data", async () => {
    const client = new GenericDaxClient({
      baseUrl: "/api",
      timeoutMs: 5_000,
      retryDelaysMs: [],
      fetcher: vi.fn(async () => jsonResponse({
        success: false,
        error: {
          code: "POWERBI_QUERY_FAILED",
          message: "Query failed safely.",
          requestId: "failed-request",
          failedQueryName: "overview",
        },
      }, 502)),
    });
    await expect(client.batch([request])).rejects.toMatchObject({
      code: "POWERBI_QUERY_FAILED",
      status: 502,
      requestId: "failed-request",
      failedQueryName: "overview",
      message: "Query failed safely.",
    });
  });

  it("preserves gateway error details for diagnostics", async () => {
    const details = {
      source: "powerbi",
      upstreamStatus: 400,
      upstreamCode: "DatasetExecuteQueriesError",
      upstreamMessage: "DAX syntax is invalid.",
    };
    const client = new GenericDaxClient({
      baseUrl: "/api",
      timeoutMs: 5_000,
      retryDelaysMs: [],
      fetcher: vi.fn(async () => jsonResponse({
        success: false,
        error: {
          code: "POWERBI_QUERY_FAILED",
          message: "Power BI rejected the DAX query.",
          requestId: "failed-request",
          details,
        },
      }, 400)),
    });
    await expect(client.query(request)).rejects.toMatchObject({
      code: "POWERBI_QUERY_FAILED",
      requestId: "failed-request",
      details,
    });
  });

  it.each([400, 401, 403, 404])("does not retry HTTP %s", async (status) => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({
      success: false,
      error: { code: "INVALID_REQUEST", message: "safe", requestId: "bad" },
    }, status));
    const client = new GenericDaxClient({
      baseUrl: "/api", fetcher, timeoutMs: 5_000, retryDelaysMs: [0, 0, 0],
    });
    await expect(client.query(request)).rejects.toBeInstanceOf(GenericDaxClientError);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([
    "DAX_REJECTED",
    "POWERBI_QUERY_FAILED",
    "SCHEMA_MISMATCH",
    "POWERBI_SCHEMA_MISMATCH",
    "AZURE_AD_AUTH_FAILED",
    "POWERBI_AUTH_FAILED",
    "POWERBI_ACCESS_DENIED",
  ])("does not retry semantic error code %s even with HTTP 502", async (code) => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({
      success: false,
      error: { code, message: "safe", requestId: "semantic-error" },
    }, 502));
    const client = new GenericDaxClient({
      baseUrl: "/api", fetcher, timeoutMs: 5_000, retryDelaysMs: [0, 0, 0],
    });
    await expect(client.query(request)).rejects.toMatchObject({ code, retryable: false });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([502, 503, 504])("retries HTTP %s up to three times", async (status) => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: "UPSTREAM_ERROR" } }, status))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: "UPSTREAM_ERROR" } }, status))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: "UPSTREAM_ERROR" } }, status))
      .mockResolvedValueOnce(success());
    const client = new GenericDaxClient({
      baseUrl: "/api", fetcher, timeoutMs: 5_000, retryDelaysMs: [0, 0, 0],
    });
    await expect(client.query(request)).resolves.toMatchObject({ rows: [[0]] });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("retries a network failure", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(success());
    const client = new GenericDaxClient({
      baseUrl: "/api", fetcher, timeoutMs: 5_000, retryDelaysMs: [0],
    });
    await expect(client.query(request)).resolves.toMatchObject({ rows: [[0]] });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("classifies only attempted transport failures as network errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const client = new GenericDaxClient({
      baseUrl: "/api",
      fetcher: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
      timeoutMs: 5_000,
      retryDelaysMs: [],
    });

    await expect(client.query(request)).rejects.toMatchObject({
      kind: "network",
      requestAttempted: true,
      message: "Không thể reach Generic DAX Gateway. Có thể do CORS, DNS, SSL hoặc backend không phản hồi.",
      details: {
        classification: "network_or_cors",
        causeName: "TypeError",
        causeMessage: "Failed to fetch",
        responseReceived: false,
      },
    });
    expect(error).toHaveBeenCalledWith("DAX FETCH ERROR", expect.objectContaining({
      classification: "network_or_cors",
      name: "TypeError",
      message: "Failed to fetch",
    }));
  });

  it("keeps schema failures distinct from Gateway connectivity", async () => {
    const client = new GenericDaxClient({
      baseUrl: "/api",
      fetcher: vi.fn(async () => jsonResponse({
        success: true,
        data: { columns: ["wrong"], rows: [{ wrong: 1 }] },
      })),
      retryDelaysMs: [],
    });

    await expect(client.query(request)).rejects.toMatchObject({
      kind: "schema",
      code: "SCHEMA_MISMATCH",
      requestAttempted: true,
    });
  });

  it("propagates AbortSignal without retrying", async () => {
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }));
    const client = new GenericDaxClient({
      baseUrl: "/api", fetcher, timeoutMs: 5_000, retryDelaysMs: [0, 0, 0],
    });
    const controller = new AbortController();
    const pending = client.query(request, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "CLIENT_ABORTED" });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
