import {
  act,
  renderHook,
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { kpiMtd } from "@/queries/kpimtd";

import { useKpiMtdData } from "./useKpiMtdData";

const { mockUseSemanticModelQuery } = vi.hoisted(() => ({
  mockUseSemanticModelQuery: vi.fn(),
}));

vi.mock("@/hooks/use-semantic-model-query", () => ({
  useSemanticModelQuery: mockUseSemanticModelQuery,
}));

const refetch = vi.fn(async () => undefined);
const queryColumns = [
  "[successfulCallsMtd]",
  "[successfulCallsIssued]",
  "[visitMtd]",
  "[visitIssued]",
  "[timeSpendMtd]",
  "[timeSpendIssued]",
  "[osaMtd]",
  "[osaIssued]",
  "[qcMtd]",
  "[qcIssued]",
];
const semanticRow = [
  93,
  11,
  0.27,
  22,
  102,
  33,
  95,
  44,
  99,
  55,
];

function successResult(
  row: unknown[] = semanticRow,
  columns: string[] = queryColumns,
) {
  return {
    data: {
      status: "success" as const,
      table: {
        columns: columns.map((name) => ({
          name,
          dataType: "Double",
        })),
        rows: [row],
      },
    },
    isLoading: false,
    error: undefined,
    refetch,
  };
}

describe("useKpiMtdData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries kpimtd once through unimeModel", () => {
    mockUseSemanticModelQuery.mockReturnValue(
      successResult(),
    );

    renderHook(() => useKpiMtdData());

    expect(
      mockUseSemanticModelQuery,
    ).toHaveBeenCalledOnce();
    expect(
      mockUseSemanticModelQuery,
    ).toHaveBeenCalledWith({
      connection: "unimeModel",
      query: kpiMtd().query,
    });
  });

  it("reads all five KPI percentages and all five Issued values unchanged", () => {
    mockUseSemanticModelQuery.mockReturnValue(
      successResult(),
    );

    const { result } = renderHook(
      () => useKpiMtdData(),
    );

    expect(result.current.values).toEqual({
      successfulCallsMtd: 93,
      successfulCallsIssued: 11,
      visitMtd: 0.27,
      visitIssued: 22,
      timeSpendMtd: 102,
      timeSpendIssued: 33,
      osaMtd: 95,
      osaIssued: 44,
      qcMtd: 99,
      qcIssued: 55,
    });
    expect(result.current.error).toBeNull();
  });

  it("preserves loading without exposing partial values", () => {
    mockUseSemanticModelQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch,
    });

    const { result } = renderHook(
      () => useKpiMtdData(),
    );

    expect(result.current.values).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("surfaces semantic query errors", () => {
    mockUseSemanticModelQuery.mockReturnValue({
      data: {
        status: "error",
        error: {
          message: "Query failed",
        },
      },
      isLoading: false,
      error: undefined,
      refetch,
    });

    const { result } = renderHook(
      () => useKpiMtdData(),
    );

    expect(result.current.values).toBeNull();
    expect(result.current.error).toBe(
      "Query failed",
    );
  });

  it("rejects a successful response with no row", () => {
    const emptyResult = successResult();
    emptyResult.data.table.rows = [];
    mockUseSemanticModelQuery.mockReturnValue(
      emptyResult,
    );

    const { result } = renderHook(
      () => useKpiMtdData(),
    );

    expect(result.current.values).toBeNull();
    expect(result.current.error).toBe(
      "Semantic Model không trả đủ dữ liệu KPI MTD",
    );
  });

  it("rejects a response missing any required column", () => {
    mockUseSemanticModelQuery.mockReturnValue(
      successResult(
        semanticRow.slice(0, -1),
        queryColumns.slice(0, -1),
      ),
    );

    const { result } = renderHook(
      () => useKpiMtdData(),
    );

    expect(result.current.values).toBeNull();
    expect(result.current.error).toBe(
      "Semantic Model không trả đủ dữ liệu KPI MTD",
    );
  });

  it("rejects null or non-finite KPI data", () => {
    const invalidRow: unknown[] = [
      ...semanticRow,
    ];
    invalidRow[4] = null;
    mockUseSemanticModelQuery.mockReturnValue(
      successResult(invalidRow),
    );

    const { result } = renderHook(
      () => useKpiMtdData(),
    );

    expect(result.current.values).toBeNull();
    expect(result.current.error).toBe(
      "Semantic Model không trả đủ dữ liệu KPI MTD",
    );
  });

  it("exposes the existing refetch action", async () => {
    mockUseSemanticModelQuery.mockReturnValue(
      successResult(),
    );

    const { result } = renderHook(
      () => useKpiMtdData(),
    );

    await act(async () => {
      await result.current.refetch();
    });

    expect(refetch).toHaveBeenCalledOnce();
  });
});
