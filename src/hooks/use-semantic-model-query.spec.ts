import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearQueryCache, useSemanticModelQuery } from "@/hooks/use-semantic-model-query";

const {
  mockExecuteDax,
} = vi.hoisted(() => ({
  mockExecuteDax: vi.fn(),
}));

vi.mock("@/lib/generic-dax-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/generic-dax-client")>()),
  executeDax: mockExecuteDax,
}));

const columnMetadata = {
  "[Value]": { name: "Value", displayName: "Value" },
  "Table[Nullable]": { name: "Nullable", displayName: "Nullable" },
};

describe("useSemanticModelQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading without showing an error before the first response", () => {
    mockExecuteDax.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useSemanticModelQuery({
      connection: "model",
      query: "EVALUATE ROW(\"Value\", 1)",
      columnMetadata,
    }));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(result.current.state).toBe("loading");
  });

  it("keeps enabled=false in waiting without executing or reporting an error", async () => {
    const { result } = renderHook(() => useSemanticModelQuery({
      connection: "model",
      query: "",
      columnMetadata: undefined,
      enabled: false,
    }));

    await waitFor(() => expect(result.current.state).toBe("waiting"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.errorInfo).toBeUndefined();
    expect(mockExecuteDax).not.toHaveBeenCalled();
  });

  it.each([
    ["blank query", { connection: "model", query: "", columnMetadata }],
    ["missing metadata", {
      connection: "model",
      query: "EVALUATE ROW(\"Value\", 1)",
      columnMetadata: undefined,
    }],
  ])("reports %s as a pre-fetch configuration error", async (_label, options) => {
    const { result } = renderHook(() => useSemanticModelQuery(options));

    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.errorInfo).toMatchObject({
      kind: "validation",
      code: "QUERY_CONFIGURATION_INVALID",
      requestAttempted: false,
    });
    expect(result.current.error?.message).not.toBe("Không thể kết nối Generic DAX Gateway.");
    expect(mockExecuteDax).not.toHaveBeenCalled();
  });

  it("sends raw DAX and normalized expected columns, then restores CLI column names", async () => {
    mockExecuteDax.mockResolvedValue({
      requestId: "request-1",
      queryName: "dax-query",
      columns: ["Value", "Nullable"],
      rows: [[0, null]],
      rowCount: 1,
      schemaVerified: true,
    });
    const { result } = renderHook(() => useSemanticModelQuery({
      connection: "model",
      query: "EVALUATE ROW(\"Value\", 0, \"Nullable\", BLANK())",
      columnMetadata,
    }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockExecuteDax).toHaveBeenCalledWith({
      dax: "EVALUATE ROW(\"Value\", 0, \"Nullable\", BLANK())",
      expectedColumns: ["Value", "Nullable"],
    }, { signal: expect.any(AbortSignal) });
    expect(result.current.data).toMatchObject({
      status: "success",
      requestId: "request-1",
      table: {
        columns: [
          { name: "[Value]", dataType: "unknown" },
          { name: "Table[Nullable]", dataType: "unknown" },
        ],
        rows: [[0, null]],
      },
    });
    expect(result.current.state).toBe("success");
  });

  it("aborts obsolete backend work and blocks stale responses", async () => {
    const resolvers: Array<(value: unknown) => void> = [];
    const signals: AbortSignal[] = [];
    mockExecuteDax.mockImplementation((_request, options: { signal: AbortSignal }) => {
      signals.push(options.signal);
      return new Promise((resolve) => resolvers.push(resolve));
    });
    const { result, rerender } = renderHook(
      ({ query }) => useSemanticModelQuery({
        connection: "model",
        query,
        columnMetadata,
      }),
      { initialProps: { query: "EVALUATE ROW(\"Value\", 1)" } },
    );
    await waitFor(() => expect(mockExecuteDax).toHaveBeenCalledTimes(1));
    rerender({ query: "EVALUATE ROW(\"Value\", 2)" });
    await waitFor(() => expect(mockExecuteDax).toHaveBeenCalledTimes(2));
    expect(signals[0]?.aborted).toBe(true);
    await act(async () => {
      resolvers[0]?.({
        requestId: "old", queryName: "dax-query", columns: ["Value", "Nullable"],
        rows: [[1, null]], rowCount: 1, schemaVerified: true,
      });
      resolvers[1]?.({
        requestId: "new", queryName: "dax-query", columns: ["Value", "Nullable"],
        rows: [[2, null]], rowCount: 1, schemaVerified: true,
      });
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.status === "success" && result.current.data.table.rows)
      .toEqual([[2, null]]);
  });

  it("re-executes the active query when refetch is called", async () => {
    mockExecuteDax.mockResolvedValue({
      requestId: "refetch", queryName: "dax-query", columns: ["Value", "Nullable"],
      rows: [], rowCount: 0, schemaVerified: true,
    });
    const { result } = renderHook(() => useSemanticModelQuery({
      connection: "model", query: "EVALUATE ROW()", columnMetadata,
    }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => result.current.refetch());
    expect(mockExecuteDax).toHaveBeenCalledTimes(2);
  });

  it("does not let a stale rejection overwrite a newer successful request", async () => {
    let rejectOld: ((reason?: unknown) => void) | undefined;
    mockExecuteDax
      .mockImplementationOnce(() => new Promise((_resolve, reject) => {
        rejectOld = reject;
      }))
      .mockResolvedValueOnce({
        requestId: "new",
        queryName: "dax-query",
        columns: ["Value", "Nullable"],
        rows: [[2, null]],
        rowCount: 1,
        schemaVerified: true,
      });
    const { result, rerender } = renderHook(
      ({ query }) => useSemanticModelQuery({ connection: "model", query, columnMetadata }),
      { initialProps: { query: "EVALUATE ROW(\"Value\", 1)" } },
    );
    await waitFor(() => expect(mockExecuteDax).toHaveBeenCalledOnce());
    rerender({ query: "EVALUATE ROW(\"Value\", 2)" });
    await waitFor(() => expect(result.current.state).toBe("success"));

    await act(async () => rejectOld?.(new Error("stale failure")));

    expect(result.current.error).toBeUndefined();
    expect(result.current.data?.status === "success" && result.current.data.table.rows)
      .toEqual([[2, null]]);
  });
});

describe("clearQueryCache", () => {
  it("is a compatibility no-op because the gateway owns caching", () => {
    clearQueryCache();
    clearQueryCache("salesModel");
  });
});
