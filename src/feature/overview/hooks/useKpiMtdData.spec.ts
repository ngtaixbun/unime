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
import type {
  OverviewFilters,
} from "../types";

import { useKpiMtdData } from "./useKpiMtdData";

const {
  mockUseSemanticModelQuery,
} = vi.hoisted(() => ({
  mockUseSemanticModelQuery:
    vi.fn(),
}));

vi.mock(
  "@/hooks/use-semantic-model-query",
  () => ({
    useSemanticModelQuery:
      mockUseSemanticModelQuery,
  }),
);

const refetch =
  vi.fn(async () => undefined);

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
        columns: columns.map(
          (name) => ({
            name,
            dataType: "Double",
          }),
        ),
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
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(),
      );

    renderHook(
      () =>
        useKpiMtdData(202608),
    );

    expect(
      mockUseSemanticModelQuery,
    ).toHaveBeenCalledOnce();

    expect(
      mockUseSemanticModelQuery,
    ).toHaveBeenCalledWith({
      connection: "unimeModel",
      query:
        kpiMtd({
          cycleKey: 202608,
        }).query,
    });
  });

  it("rebuilds the semantic query when cycleKey changes", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(),
      );

    const filters: OverviewFilters = {
      region: "all",
      amm: "all",
      supervisor: "number:16365",
    };

    const { rerender } =
      renderHook(
        ({
          cycleKey,
        }: {
          cycleKey: number;
        }) =>
          useKpiMtdData(
            cycleKey,
            filters,
          ),
        {
          initialProps: {
            cycleKey: 202607,
          },
        },
      );

    const previousQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    rerender({
      cycleKey: 202608,
    });

    const currentQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    expect(currentQuery).not.toBe(
      previousQuery,
    );
    expect(currentQuery).toContain(
      "202608",
    );
    expect(currentQuery).toContain(
      "{ 16365 }",
    );
  });

  it("rebuilds the semantic query for each applied organization filter primitive", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(),
      );

    const { rerender } =
      renderHook(
        ({
          filters,
        }: {
          filters: OverviewFilters;
        }) =>
          useKpiMtdData(
            202608,
            filters,
          ),
        {
          initialProps: {
            filters: {
              region: "all",
              amm: "all",
              supervisor: "all",
            } as OverviewFilters,
          },
        },
      );

    const allQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    rerender({
      filters: {
        region: "number:1",
        amm: "all",
        supervisor: "all",
      },
    });
    const regionQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    rerender({
      filters: {
        region: "number:1",
        amm: "string:001",
        supervisor: "all",
      },
    });
    const ammQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    rerender({
      filters: {
        region: "number:1",
        amm: "string:001",
        supervisor:
          "number:16365",
      },
    });
    const supervisorQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    expect(regionQuery).not.toBe(
      allQuery,
    );
    expect(regionQuery).toContain(
      "'dimnv'[Region ID]",
    );
    expect(ammQuery).not.toBe(
      regionQuery,
    );
    expect(ammQuery).toContain(
      "'dimnv'[amm_id]",
    );
    expect(supervisorQuery).not.toBe(
      ammQuery,
    );
    expect(supervisorQuery).toContain(
      "'dimnv'[sup_id]",
    );
  });

  it("reads all five KPI percentages and all five Issued values unchanged", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toEqual({
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

    expect(
      result.current.error,
    ).toBeNull();
  });

  it("preserves loading without exposing partial values", () => {
    mockUseSemanticModelQuery
      .mockReturnValue({
        data: undefined,
        isLoading: true,
        error: undefined,
        refetch,
      });

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toBeNull();

    expect(
      result.current.isLoading,
    ).toBe(true);

    expect(
      result.current.error,
    ).toBeNull();
  });

  it("surfaces semantic query errors", () => {
    mockUseSemanticModelQuery
      .mockReturnValue({
        data: {
          status: "error",
          error: {
            message:
              "Query failed",
          },
        },
        isLoading: false,
        error: undefined,
        refetch,
      });

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toBeNull();

    expect(
      result.current.error,
    ).toBe(
      "Query failed",
    );
  });

  it("rejects a successful response with no row", () => {
    const emptyResult =
      successResult();

    emptyResult.data.table.rows = [];

    mockUseSemanticModelQuery
      .mockReturnValue(
        emptyResult,
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toBeNull();

    expect(
      result.current.error,
    ).toBe(
      "Semantic Model không trả đủ dữ liệu KPI MTD",
    );
  });

  it("rejects a response missing any required column", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(
          semanticRow.slice(
            0,
            -1,
          ),
          queryColumns.slice(
            0,
            -1,
          ),
        ),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toBeNull();

    expect(
      result.current.error,
    ).toBe(
      "Semantic Model không trả đủ dữ liệu KPI MTD",
    );
  });

  it("keeps individual BLANK cells as null without removing other KPI values", () => {
    const partialRow:
      unknown[] = [
        ...semanticRow,
      ];

    partialRow[4] = null;
    partialRow[7] = "";

    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(
          partialRow,
        ),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toEqual({
      successfulCallsMtd: 93,
      successfulCallsIssued: 11,
      visitMtd: 0.27,
      visitIssued: 22,
      timeSpendMtd: null,
      timeSpendIssued: 33,
      osaMtd: 95,
      osaIssued: null,
      qcMtd: 99,
      qcIssued: 55,
    });

    expect(
      result.current.error,
    ).toBeNull();
  });

  it("allows a returned row whose cells are all BLANK", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(
          Array(
            queryColumns.length,
          ).fill(null),
        ),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toEqual({
      successfulCallsMtd: null,
      successfulCallsIssued: null,
      visitMtd: null,
      visitIssued: null,
      timeSpendMtd: null,
      timeSpendIssued: null,
      osaMtd: null,
      osaIssued: null,
      qcMtd: null,
      qcIssued: null,
    });

    expect(
      result.current.error,
    ).toBeNull();
  });

  it("parses numeric strings and preserves zero values", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult([
          "93.5",
          "11",
          0,
          "0",
          "102",
          33,
          95,
          44,
          99,
          55,
        ]),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toMatchObject({
      successfulCallsMtd: 93.5,
      successfulCallsIssued: 11,
      visitMtd: 0,
      visitIssued: 0,
    });
    expect(
      result.current.error,
    ).toBeNull();
  });

  it("rejects a non-numeric non-BLANK cell", () => {
    const invalidRow:
      unknown[] = [
        ...semanticRow,
      ];

    invalidRow[4] =
      "not-a-number";

    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(
          invalidRow,
        ),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toBeNull();

    expect(
      result.current.error,
    ).toBe(
      "Semantic Model không trả đủ dữ liệu KPI MTD",
    );
  });

  it("exposes the existing refetch action", async () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    await act(async () => {
      await result.current.refetch();
    });

    expect(
      refetch,
    ).toHaveBeenCalledOnce();
  });
});
