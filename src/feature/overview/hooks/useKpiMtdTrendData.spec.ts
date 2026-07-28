import {
  renderHook,
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  kpiMtdTrend,
} from "@/queries/kpimtd-trend";

import {
  useKpiMtdTrendData,
} from "./useKpiMtdTrendData";
import type {
  OverviewFilters,
} from "../types";

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
  "[Date]",
  "[successfulCallsMtd]",
  "[visitMtd]",
  "[timeSpendMtd]",
  "[osaMtd]",
  "[qcMtd]",
  "[benchmark]",
];

function successResult(
  rows: unknown[][] = [
    [
      "2026-07-20T00:00:00",
      91.1,
      97.6,
      102.2,
      95.4,
      97.7,
      90,
    ],
    [
      "2026-07-19T00:00:00",
      89.8,
      96.9,
      101.4,
      94.9,
      97.1,
      90,
    ],
  ],
  columns: string[] =
    queryColumns,
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
        rows,
      },
    },
    isLoading: false,
    error: undefined,
    refetch,
  };
}

describe(
  "useKpiMtdTrendData",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("queries the independent trend query with cycleKey", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult(),
        );

      renderHook(
        () =>
          useKpiMtdTrendData(
            202608,
          ),
      );

      expect(
        mockUseSemanticModelQuery,
      ).toHaveBeenCalledOnce();

      expect(
        mockUseSemanticModelQuery,
      ).toHaveBeenCalledWith({
        connection: "unimeModel",
        query:
          kpiMtdTrend({
            cycleKey: 202608,
          }).query,
      });
    });

    it("rebuilds the trend query when cycleKey changes", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult(),
        );

      const filters: OverviewFilters = {
        region: "number:1",
        amm: "string:001",
        supervisor:
          "number:16365",
      };

      const { rerender } =
        renderHook(
          ({
            cycleKey,
          }: {
            cycleKey: number;
          }) =>
            useKpiMtdTrendData(
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
        "'dimnv'[Region ID]",
      );
      expect(currentQuery).toContain(
        "'dimnv'[amm_id]",
      );
      expect(currentQuery).toContain(
        "'dimnv'[sup_id]",
      );
    });

    it("rebuilds the trend query when Supervisor changes", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult(),
        );

      const { rerender } =
        renderHook(
          ({
            supervisor,
          }: {
            supervisor:
              OverviewFilters["supervisor"];
          }) =>
            useKpiMtdTrendData(
              202608,
              {
                region: "all",
                amm: "all",
                supervisor,
              },
            ),
          {
            initialProps: {
              supervisor: "all" as
                OverviewFilters["supervisor"],
            },
          },
        );

      const allQuery =
        mockUseSemanticModelQuery
          .mock.calls.at(-1)?.[0]
          .query;

      rerender({
        supervisor:
          "number:16365",
      });

      const supervisorQuery =
        mockUseSemanticModelQuery
          .mock.calls.at(-1)?.[0]
          .query;

      expect(supervisorQuery).not.toBe(
        allQuery,
      );
      expect(supervisorQuery).toContain(
        "{ 16365 }",
      );
      expect(supervisorQuery).toContain(
        "'dimnv'[sup_id]",
      );
    });

    it("parses and sorts daily trend rows", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult(),
        );

      const { result } =
        renderHook(
          () =>
            useKpiMtdTrendData(
              202608,
            ),
        );

      expect(
        result.current.rows,
      ).toEqual([
        {
          Date: "2026-07-19",
          successfulCallsMtd:
            89.8,
          visitMtd: 96.9,
          timeSpendMtd: 101.4,
          osaMtd: 94.9,
          qcMtd: 97.1,
          benchmark: 90,
        },
        {
          Date: "2026-07-20",
          successfulCallsMtd:
            91.1,
          visitMtd: 97.6,
          timeSpendMtd: 102.2,
          osaMtd: 95.4,
          qcMtd: 97.7,
          benchmark: 90,
        },
      ]);
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("allows a KPI to be blank on an individual day", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult([
            [
              "2026-07-20",
              null,
              97.6,
              102.2,
              95.4,
              97.7,
              90,
            ],
          ]),
        );

      const { result } =
        renderHook(
          () =>
            useKpiMtdTrendData(
              202608,
            ),
        );

      expect(
        result.current.rows[0]
          .successfulCallsMtd,
      ).toBeNull();
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("rejects missing columns", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult(
            [],
            queryColumns.slice(
              0,
              -1,
            ),
          ),
        );

      const { result } =
        renderHook(
          () =>
            useKpiMtdTrendData(
              202608,
            ),
        );

      expect(
        result.current.rows,
      ).toEqual([]);
      expect(
        result.current.error,
      ).toBe(
        "Semantic Model trả dữ liệu xu hướng KPI MTD không hợp lệ",
      );
    });

    it("keeps an empty successful result as an empty trend", () => {
      mockUseSemanticModelQuery
        .mockReturnValue(
          successResult([]),
        );

      const { result } =
        renderHook(
          () =>
            useKpiMtdTrendData(
              202608,
            ),
        );

      expect(
        result.current.rows,
      ).toEqual([]);
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("does not expose stale trend rows while loading", () => {
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
            useKpiMtdTrendData(
              202608,
            ),
        );

      expect(
        result.current.rows,
      ).toEqual([]);
      expect(
        result.current.isLoading,
      ).toBe(true);
    });
  },
);
