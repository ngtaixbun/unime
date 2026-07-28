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

import { dimDate } from "@/queries/dim-date";

import { useDimDateData } from "./useDimDateData";

const {
  mockUseSemanticModelQuery,
} = vi.hoisted(() => ({
  mockUseSemanticModelQuery: vi.fn(),
}));

vi.mock(
  "@/hooks/use-semantic-model-query",
  () => ({
    useSemanticModelQuery:
      mockUseSemanticModelQuery,
  }),
);

const reload = vi.fn(
  async () => undefined,
);

const queryColumns = [
  {
    name: "[cycleKey]",
    dataType: "Int64",
  },
  {
    name: "[cycleLabel]",
    dataType: "String",
  },
  {
    name: "[cycleStartDate]",
    dataType: "DateTime",
  },
  {
    name: "[cycleEndDate]",
    dataType: "DateTime",
  },
  {
    name: "[cycleSort]",
    dataType: "Int64",
  },
  {
    name: "[isLatestCycle]",
    dataType: "Boolean",
  },
];

function semanticRow(
  cycleKey: unknown,
  cycleSort: unknown,
  isLatestCycle: unknown,
  overrides?: Partial<{
    cycleLabel: unknown;
    cycleStartDate: unknown;
    cycleEndDate: unknown;
  }>,
): unknown[] {
  return [
    cycleKey,
    overrides?.cycleLabel ??
      `Chu kỳ ${String(cycleKey)}`,
    overrides?.cycleStartDate ??
      "2026-06-28T00:00:00.000",
    overrides?.cycleEndDate ??
      "2026-07-20T00:00:00.000",
    cycleSort,
    isLatestCycle,
  ];
}

function successResult(
  rows: unknown[][],
  columns = queryColumns,
) {
  return {
    data: {
      status: "success" as const,
      table: {
        columns,
        rows,
      },
    },
    isLoading: false,
    error: undefined,
    refetch: reload,
  };
}

describe("useDimDateData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries dimdate once through unimeModel", () => {
    mockUseSemanticModelQuery.mockReturnValue(
      successResult([]),
    );

    renderHook(() => useDimDateData());

    expect(
      mockUseSemanticModelQuery,
    ).toHaveBeenCalledOnce();
    expect(
      mockUseSemanticModelQuery,
    ).toHaveBeenCalledWith({
      connection: "unimeModel",
      query: dimDate().query,
    });
  });

  it("parses all six fields and sorts numeric cycleSort ascending", () => {
    mockUseSemanticModelQuery.mockReturnValue(
      successResult([
        semanticRow(202608, 202608, true, {
          cycleLabel: "Tháng 08",
          cycleStartDate:
            "2026-07-21T00:00:00.000",
          cycleEndDate:
            "2026-07-21T00:00:00.000",
        }),
        semanticRow(202607, 202607, false, {
          cycleLabel: "Tháng 07",
        }),
      ]),
    );

    const { result } = renderHook(
      () => useDimDateData(),
    );

    expect(result.current.cycles).toEqual([
      {
        cycleKey: 202607,
        cycleLabel: "Tháng 07",
        cycleStartDate:
          "2026-06-28T00:00:00.000",
        cycleEndDate:
          "2026-07-20T00:00:00.000",
        cycleSort: 202607,
        isLatestCycle: false,
      },
      {
        cycleKey: 202608,
        cycleLabel: "Tháng 08",
        cycleStartDate:
          "2026-07-21T00:00:00.000",
        cycleEndDate:
          "2026-07-21T00:00:00.000",
        cycleSort: 202608,
        isLatestCycle: true,
      },
    ]);
    expect(result.current.error).toBeNull();
  });

  it("preserves string keys and sorts numeric-looking string cycleSort values", () => {
    mockUseSemanticModelQuery.mockReturnValue(
      successResult([
        semanticRow("cycle-10", "10", false),
        semanticRow("cycle-2", "2", true),
        semanticRow("cycle-1", "1", false),
      ]),
    );

    const { result } = renderHook(
      () => useDimDateData(),
    );

    expect(
      result.current.cycles.map(
        (cycle) => cycle.cycleKey,
      ),
    ).toEqual([
      "cycle-1",
      "cycle-2",
      "cycle-10",
    ]);
    expect(
      result.current.cycles.map(
        (cycle) => cycle.cycleSort,
      ),
    ).toEqual(["1", "2", "10"]);
  });

  it.each([
    [true, true],
    [false, false],
    [1, true],
    [0, false],
    ["1", true],
    ["0", false],
    ["true", true],
    ["false", false],
  ])(
    "parses isLatestCycle value %p as %p",
    (semanticValue, expected) => {
      mockUseSemanticModelQuery.mockReturnValue(
        successResult([
          semanticRow(
            "cycle",
            "1",
            semanticValue,
          ),
        ]),
      );

      const { result } = renderHook(
        () => useDimDateData(),
      );

      expect(
        result.current.cycles[0]
          ?.isLatestCycle,
      ).toBe(expected);
      expect(result.current.error).toBeNull();
    },
  );

  it("accepts supported Date and serialized date values without recalculating them", () => {
    const cycleStartDate =
      new Date(2026, 6, 21);
    const cycleEndDate =
      "/Date(1784678400000)/";

    mockUseSemanticModelQuery.mockReturnValue(
      successResult([
        semanticRow(202608, 202608, true, {
          cycleStartDate,
          cycleEndDate,
        }),
      ]),
    );

    const { result } = renderHook(
      () => useDimDateData(),
    );

    expect(
      result.current.cycles[0]
        ?.cycleStartDate,
    ).toBe(cycleStartDate);
    expect(
      result.current.cycles[0]
        ?.cycleEndDate,
    ).toBe(cycleEndDate);
  });

  it.each(queryColumns.map(
    (column) => column.name,
  ))(
    "returns a validation error when %s is missing",
    (missingColumn) => {
      const columnIndex =
        queryColumns.findIndex(
          (column) =>
            column.name === missingColumn,
        );
      const columns =
        queryColumns.filter(
          (_, index) =>
            index !== columnIndex,
        );
      const row = semanticRow(
        202608,
        202608,
        true,
      ).filter(
        (_, index) =>
          index !== columnIndex,
      );

      mockUseSemanticModelQuery.mockReturnValue(
        successResult([row], columns),
      );

      const { result } = renderHook(
        () => useDimDateData(),
      );

      expect(result.current.cycles).toEqual(
        [],
      );
      expect(result.current.error).toBe(
        "Semantic Model trả dữ liệu chu kỳ MTD không hợp lệ",
      );
    },
  );

  it("rejects an invalid row without exposing a partial cycle list", () => {
    mockUseSemanticModelQuery.mockReturnValue(
      successResult([
        semanticRow(202607, 202607, false),
        semanticRow(202608, 202608, true, {
          cycleEndDate: "not-a-date",
        }),
      ]),
    );

    const { result } = renderHook(
      () => useDimDateData(),
    );

    expect(result.current.cycles).toEqual(
      [],
    );
    expect(result.current.error).toBe(
      "Semantic Model trả dữ liệu chu kỳ MTD không hợp lệ",
    );
  });

  it("returns an empty state for a successful empty table", () => {
    mockUseSemanticModelQuery.mockReturnValue(
      successResult([]),
    );

    const { result } = renderHook(
      () => useDimDateData(),
    );

    expect(result.current.cycles).toEqual(
      [],
    );
    expect(result.current.loading).toBe(
      false,
    );
    expect(result.current.error).toBeNull();
  });

  it("surfaces SDK query errors without a fallback cycle", () => {
    mockUseSemanticModelQuery.mockReturnValue({
      data: {
        status: "error",
        error: {
          message: "DAX query failed",
        },
      },
      isLoading: false,
      error: undefined,
      refetch: reload,
    });

    const { result } = renderHook(
      () => useDimDateData(),
    );

    expect(result.current.cycles).toEqual(
      [],
    );
    expect(result.current.error).toBe(
      "DAX query failed",
    );
  });

  it("surfaces network errors without a fallback cycle", () => {
    mockUseSemanticModelQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network unavailable"),
      refetch: reload,
    });

    const { result } = renderHook(
      () => useDimDateData(),
    );

    expect(result.current.cycles).toEqual(
      [],
    );
    expect(result.current.error).toBe(
      "Network unavailable",
    );
  });

  it("preserves loading without exposing a synthetic cycle", () => {
    mockUseSemanticModelQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch: reload,
    });

    const { result } = renderHook(
      () => useDimDateData(),
    );

    expect(result.current.cycles).toEqual(
      [],
    );
    expect(result.current.loading).toBe(
      true,
    );
    expect(result.current.error).toBeNull();
  });

  it("exposes the semantic query reload action", async () => {
    mockUseSemanticModelQuery.mockReturnValue(
      successResult([]),
    );

    const { result } = renderHook(
      () => useDimDateData(),
    );

    await act(async () => {
      await result.current.reload();
    });

    expect(reload).toHaveBeenCalledOnce();
  });
});
