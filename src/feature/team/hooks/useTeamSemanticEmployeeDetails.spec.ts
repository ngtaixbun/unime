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
  parseTeamSemanticEmployeeDetails,
  parseTeamSemanticEmployeeTrend,
  useTeamSemanticEmployeeDetails,
} from "./useTeamSemanticEmployeeDetails";

const {
  queryMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock(
  "@/hooks/use-semantic-model-query",
  () => ({
    useSemanticModelQuery:
      queryMock,
  }),
);

const DETAILS_COLUMNS = [
  "[employeeId]",
  "[employeeCode]",
  "[employeeLabel]",
  "[regionLabel]",
  "[ammLabel]",
  "[supervisorLabel]",
  "[nppLabel]",
  "[kpiId]",
  "[kpiLabel]",
  "[actual]",
  "[target]",
  "[percentage]",
] as const;

function createTable(
  columns: readonly string[],
  rows: unknown[][],
): QueryTable {
  return {
    columns: columns.map((name) => ({
      name,
      dataType: "unknown",
    })),
    rows,
  };
}

function successResult(
  table: QueryTable,
  refetch = vi.fn(
    async () => undefined,
  ),
) {
  return {
    data: {
      status: "success",
      table,
    },
    isLoading: false,
    error: undefined,
    refetch,
  };
}

describe(
  "Semantic employee detail parsers",
  () => {
    it("groups the employee identity with sorted KPI rows and preserves BLANK measures", () => {
      const parsed =
        parseTeamSemanticEmployeeDetails(
          createTable(
            DETAILS_COLUMNS,
            [
              [
                9542,
                "NV09542",
                " Hoàng Nguyễn Quốc Thắng ",
                "HCM",
                "AMM 01",
                "Sup 01",
                "NPP A",
                5,
                "QC",
                null,
                10,
                null,
              ],
              [
                9542,
                "NV09542",
                "Hoàng Nguyễn Quốc Thắng",
                "HCM",
                "AMM 01",
                "Sup 01",
                "NPP A",
                1,
                "Calls",
                "8",
                10,
                "0.8",
              ],
            ],
          ),
        );

      expect(parsed.error).toBeNull();
      expect(parsed.employee).toEqual({
        employeeId: 9542,
        employeeCode: "NV09542",
        employeeLabel:
          "Hoàng Nguyễn Quốc Thắng",
        regionLabel: "HCM",
        ammLabel: "AMM 01",
        supervisorLabel: "Sup 01",
        nppLabel: "NPP A",
        kpis: [
          {
            kpiId: 1,
            kpiLabel: "Calls",
            actual: 8,
            target: 10,
            percentage: 0.8,
          },
          {
            kpiId: 5,
            kpiLabel: "QC",
            actual: null,
            target: 10,
            percentage: null,
          },
        ],
      });
    });

    it("rejects mixed employees, duplicate KPI IDs, and missing columns", () => {
      const mixed =
        parseTeamSemanticEmployeeDetails(
          createTable(
            DETAILS_COLUMNS,
            [
              [1, "NV1", "A", null, null, null, null, 1, "Calls", 1, 2, 0.5],
              [2, "NV2", "B", null, null, null, null, 2, "Beat", 1, 2, 0.5],
            ],
          ),
        );
      const duplicate =
        parseTeamSemanticEmployeeDetails(
          createTable(
            DETAILS_COLUMNS,
            [
              [1, "NV1", "A", null, null, null, null, 1, "Calls", 1, 2, 0.5],
              [1, "NV1", "A", null, null, null, null, 1, "Calls", 1, 2, 0.5],
            ],
          ),
        );
      const missing =
        parseTeamSemanticEmployeeDetails(
          createTable(
            DETAILS_COLUMNS.slice(1),
            [],
          ),
        );

      expect(mixed.employee).toBeNull();
      expect(mixed.error).toContain(
        "nhiều nhân viên",
      );
      expect(duplicate.employee).toBeNull();
      expect(duplicate.error).toContain(
        "kpiId trùng lặp",
      );
      expect(missing.error).toContain(
        "cấu trúc chi tiết",
      );
    });

    it("normalizes ISO dates, sorts them, uses the eighth row for first visible delta, and retains BLANKs", () => {
      const rows = [
        ["2026-07-08T00:00:00.000", 0.88],
        ["2026-07-01T00:00:00.000", 0.7],
        ["2026-07-02T00:00:00.000", 0.72],
        ["2026-07-03T00:00:00.000", 0.74],
        ["2026-07-04T00:00:00.000", null],
        ["2026-07-05T00:00:00.000", 0.8],
        ["2026-07-06T00:00:00.000", 0.82],
        ["2026-07-07T00:00:00.000", 0.85],
      ];
      const parsed =
        parseTeamSemanticEmployeeTrend(
          createTable(
            ["[Date]", "[percentage]"],
            rows,
          ),
        );

      expect(parsed.error).toBeNull();
      expect(parsed.trend).toHaveLength(7);
      expect(parsed.trend[0]).toEqual({
        date: "2026-07-02",
        value: 0.72,
        delta:
          0.72 - 0.7,
      });
      expect(parsed.trend[2]).toEqual({
        date: "2026-07-04",
        value: null,
        delta: null,
      });
      expect(parsed.trend[3]?.delta).toBeNull();
      expect(parsed.trend.at(-1)?.date)
        .toBe("2026-07-08");
    });
  },
);

describe(
  "useTeamSemanticEmployeeDetails",
  () => {
    const detailRefetch = vi.fn(
      async () => undefined,
    );
    const trendRefetch = vi.fn(
      async () => undefined,
    );

    beforeEach(() => {
      queryMock.mockReset();
      detailRefetch.mockClear();
      trendRefetch.mockClear();
      queryMock.mockImplementation(
        (options) =>
          options.backendRequest
            ?.queryId ===
          "team-employee-details"
            ? successResult(
                createTable(
                  DETAILS_COLUMNS,
                  [[
                    9542,
                    "NV09542",
                    "Nhân viên Semantic",
                    "HCM",
                    "AMM 01",
                    "Sup 01",
                    "NPP A",
                    4,
                    "OSA",
                    8,
                    10,
                    0.8,
                  ]],
                ),
                detailRefetch,
              )
            : successResult(
                createTable(
                  ["[Date]", "[percentage]"],
                  [[
                    "2026-07-23T00:00:00.000",
                    0.8,
                  ]],
                ),
                trendRefetch,
              ),
      );
    });

    it("runs both registered queries with identical employee, cycle, and organization context", () => {
      const { result } = renderHook(
        () =>
          useTeamSemanticEmployeeDetails({
            cycleKey: 202608,
            employeeId: 9542,
            kpiId: 4,
            filters: {
              region: "number:1",
              amm: "number:8214",
              supervisor:
                "number:8227",
            },
          }),
      );

      expect(queryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          backendRequest: {
            queryId:
              "team-employee-details",
            params: {
              cycleKey: 202608,
              employeeId: 9542,
              region: "number:1",
              amm: "number:8214",
              supervisor:
                "number:8227",
            },
          },
        }),
      );
      expect(queryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          backendRequest: {
            queryId:
              "team-employee-trend",
            params: {
              cycleKey: 202608,
              employeeId: 9542,
              kpiId: 4,
              region: "number:1",
              amm: "number:8214",
              supervisor:
                "number:8227",
            },
          },
        }),
      );
      expect(result.current.employee)
        .toMatchObject({
          employeeId: 9542,
          kpis: [{ kpiId: 4 }],
        });
      expect(result.current.trend)
        .toEqual([{
          date: "2026-07-23",
          value: 0.8,
          delta: null,
        }]);
    });

    it("retries the detail and trend queries together", async () => {
      const { result } = renderHook(
        () =>
          useTeamSemanticEmployeeDetails({
            cycleKey: 202608,
            employeeId: 9542,
            kpiId: 4,
            filters: {
              region: "all",
              amm: "all",
              supervisor: "all",
            },
          }),
      );

      await act(async () => {
        await result.current.retry();
      });

      expect(detailRefetch)
        .toHaveBeenCalledTimes(1);
      expect(trendRefetch)
        .toHaveBeenCalledTimes(1);
    });

    it("combines loading and fails closed when either Semantic query fails", () => {
      queryMock.mockImplementation(
        (options) => {
          if (
            options.backendRequest
              ?.queryId ===
            "team-employee-details"
          ) {
            return {
              data: undefined,
              isLoading: true,
              error: undefined,
              refetch: detailRefetch,
            };
          }

          return successResult(
            createTable(
              ["[Date]", "[percentage]"],
              [],
            ),
            trendRefetch,
          );
        },
      );

      const { result, rerender } = renderHook(
        ({ generation }) => {
          void generation;
          return useTeamSemanticEmployeeDetails({
            cycleKey: 202608,
            employeeId: 9542,
            kpiId: 4,
            filters: {
              region: "all",
              amm: "all",
              supervisor: "all",
            },
          });
        },
        {
          initialProps: {
            generation: 0,
          },
        },
      );

      expect(result.current.isLoading).toBe(true);

      queryMock.mockImplementation(
        (options) =>
          options.backendRequest
            ?.queryId ===
          "team-employee-details"
            ? {
                data: {
                  status: "error",
                  error: {
                    category: "query",
                    message:
                      "Detail unavailable",
                  },
                },
                isLoading: false,
                error: new Error(
                  "Detail unavailable",
                ),
                refetch: detailRefetch,
              }
            : successResult(
                createTable(
                  ["[Date]", "[percentage]"],
                  [[
                    "2026-07-23T00:00:00.000",
                    0.8,
                  ]],
                ),
                trendRefetch,
              ),
      );

      rerender({ generation: 1 });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(
        "Detail unavailable",
      );
      expect(result.current.employee).toBeNull();
      expect(result.current.trend).toEqual([]);
    });

    it("disables both queries and returns an empty view when identity is absent", () => {
      const { result } = renderHook(
        () =>
          useTeamSemanticEmployeeDetails({
            cycleKey: 202608,
            employeeId: null,
            kpiId: 4,
            filters: {
              region: "all",
              amm: "all",
              supervisor: "all",
            },
          }),
      );

      expect(queryMock).toHaveBeenCalledTimes(2);
      expect(queryMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          enabled: false,
          backendRequest: undefined,
        }),
      );
      expect(queryMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          enabled: false,
          backendRequest: undefined,
        }),
      );
      expect(result.current.employee).toBeNull();
      expect(result.current.trend).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  },
);
