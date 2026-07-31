import {
  act,
  renderHook,
} from "@testing-library/react";
import type {
  QueryTable,
} from "@microsoft/fabric-app-data";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  dimKpi,
} from "@/queries/dim-kpi";

import {
  mapTeamKpiIdToMetricKey,
  parseTeamKpiDimension,
  TEAM_KPI_ID_TO_METRIC_KEY,
  useTeamKpiDimension,
} from "./useTeamKpiDimension";

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

const retry = vi.fn(
  async () => undefined,
);

const columns = [
  {
    name: "[kpiname]",
    dataType: "String",
  },
  {
    name: "[kpi_id]",
    dataType: "Int64",
  },
];

function table(
  rows: unknown[][],
  queryColumns = columns,
): QueryTable {
  return {
    columns: queryColumns,
    rows,
  };
}

function successResult(
  rows: unknown[][],
) {
  return {
    data: {
      status: "success" as const,
      table: table(rows),
    },
    isLoading: false,
    error: undefined,
    refetch: retry,
  };
}

describe(
  "Team KPI dimension parser",
  () => {
    it("maps the five Semantic KPI IDs to the current Team keys", () => {
      expect(
        TEAM_KPI_ID_TO_METRIC_KEY,
      ).toEqual({
        1: "calls",
        2: "beat",
        3: "time",
        4: "osa",
        5: "qc",
      });

      expect(
        mapTeamKpiIdToMetricKey(
          1,
        ),
      ).toBe("calls");
      expect(
        mapTeamKpiIdToMetricKey(
          5,
        ),
      ).toBe("qc");
      expect(
        mapTeamKpiIdToMetricKey(
          6,
        ),
      ).toBeNull();
    });

    it("trims labels and sorts valid KPI rows by kpi_id", () => {
      expect(
        parseTeamKpiDimension(
          table([
            [" Chất lượng ", 5],
            ["Cuộc gọi", 1],
            ["OSA", 4],
          ]),
        ),
      ).toEqual({
        kpis: [
          {
            kpiId: 1,
            label: "Cuộc gọi",
            key: "calls",
          },
          {
            kpiId: 4,
            label: "OSA",
            key: "osa",
          },
          {
            kpiId: 5,
            label: "Chất lượng",
            key: "qc",
          },
        ],
        error: null,
      });
    });

    it("drops blank, invalid, non-numeric, and unmapped KPI rows", () => {
      expect(
        parseTeamKpiDimension(
          table([
            ["", 1],
            ["Calls", "1"],
            ["Beat", Number.NaN],
            ["Time", 3.5],
            ["Unknown", 6],
            [null, 4],
            ["QC", 5],
          ]),
        ).kpis,
      ).toEqual([
        {
          kpiId: 5,
          label: "QC",
          key: "qc",
        },
      ]);
    });

    it("detects duplicate valid kpi_id values without returning a partial list", () => {
      const parsed =
        parseTeamKpiDimension(
          table([
            ["Calls", 1],
            ["Calls duplicate", 1],
            ["Beat", 2],
          ]),
        );

      expect(parsed.kpis).toEqual(
        [],
      );
      expect(parsed.error).toContain(
        "kpi_id trùng lặp: 1",
      );
    });

    it("rejects a table missing either exact DAX alias", () => {
      const parsed =
        parseTeamKpiDimension(
          table(
            [["Calls"]],
            [{
              name: "[kpiname]",
              dataType: "String",
            }],
          ),
        );

      expect(parsed.kpis).toEqual(
        [],
      );
      expect(parsed.error).toContain(
        "cấu trúc",
      );
    });
  },
);

describe(
  "useTeamKpiDimension",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("queries dim-kpi through the direct and backend contracts", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult([]),
        );

      renderHook(
        () =>
          useTeamKpiDimension(),
      );

      expect(
        mockUseSemanticModelQuery,
      ).toHaveBeenCalledWith({
        connection:
          "unimeModel",
        query: dimKpi().query,
        columnMetadata:
          dimKpi()
            .columnMetadata,
        backendRequest: {
          queryId:
            "dim-kpi",
          params: {},
        },
      });
    });

    it("exposes parsed Semantic KPI items", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult([
            ["QC Semantic", 5],
            ["Calls Semantic", 1],
          ]),
        );

      const { result } =
        renderHook(
          () =>
            useTeamKpiDimension(),
        );

      expect(
        result.current.kpis,
      ).toEqual([
        {
          kpiId: 1,
          label:
            "Calls Semantic",
          key: "calls",
        },
        {
          kpiId: 5,
          label:
            "QC Semantic",
          key: "qc",
        },
      ]);
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("preserves loading without a fallback list", () => {
      mockUseSemanticModelQuery
        .mockReturnValue({
          data: undefined,
          isLoading: true,
          error: undefined,
          refetch: retry,
        });

      const { result } =
        renderHook(
          () =>
            useTeamKpiDimension(),
        );

      expect(
        result.current,
      ).toMatchObject({
        kpis: [],
        isLoading: true,
        error: null,
      });
    });

    it("surfaces query errors without a fallback list", () => {
      mockUseSemanticModelQuery
        .mockReturnValue({
          data: {
            status: "error",
            error: {
              message:
                "DAX query failed",
            },
          },
          isLoading: false,
          error: undefined,
          refetch: retry,
        });

      const { result } =
        renderHook(
          () =>
            useTeamKpiDimension(),
        );

      expect(
        result.current.kpis,
      ).toEqual([]);
      expect(
        result.current.error,
      ).toBe(
        "DAX query failed",
      );
    });

    it("surfaces duplicate data as an error and exposes retry", async () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult([
            ["Calls", 1],
            ["Other calls", 1],
          ]),
        );

      const { result } =
        renderHook(
          () =>
            useTeamKpiDimension(),
        );

      expect(
        result.current.kpis,
      ).toEqual([]);
      expect(
        result.current.error,
      ).toContain(
        "kpi_id trùng lặp",
      );

      await act(async () => {
        await result.current
          .retry();
      });

      expect(retry)
        .toHaveBeenCalledOnce();
    });
  },
);
