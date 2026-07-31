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
  getTeamEmployeeKpiStatus,
  parseTeamEmployeeKpiData,
  useTeamEmployeeKpiData,
} from "./useTeamEmployeeKpiData";

const {
  queryMock,
} = vi.hoisted(
  () => ({
    queryMock:
      vi.fn(),
  }),
);

vi.mock(
  "@/hooks/use-semantic-model-query",
  () => ({
    useSemanticModelQuery:
      queryMock,
  }),
);

const COLUMNS = [
  "[employeeId]",
  "[employeeLabel]",
  "[regionId]",
  "[ammId]",
  "[supervisorId]",
  "[actual]",
  "[target]",
  "[percentage]",
] as const;

function createTable(
  rows: unknown[][],
  columns:
    readonly string[] =
      COLUMNS,
): QueryTable {
  return {
    columns:
      columns.map(
        (name) => ({
          name,
          dataType:
            "unknown",
        }),
      ),
    rows,
  };
}

function createSuccessResult(
  rows: unknown[][],
) {
  return {
    data: {
      status: "success",
      table:
        createTable(rows),
    },
    isLoading: false,
    error: undefined,
    refetch:
      vi.fn(
        async () =>
          undefined,
      ),
  };
}

describe(
  "Team employee KPI parser",
  () => {
    it("parses employee identity, nullable measures, and semantic values", () => {
      const parsed =
        parseTeamEmployeeKpiData(
          createTable([
            [
              101,
              "  Nguyễn Văn A  ",
              1,
              "001",
              16365,
              "42",
              50,
              "0.84",
            ],
            [
              "NV-2",
              "Trần Thị B",
              null,
              null,
              null,
              null,
              null,
              null,
            ],
          ]),
        );

      expect(parsed.error)
        .toBeNull();
      expect(parsed.rows)
        .toEqual([
          {
            key: "number:101",
            employeeId: 101,
            employeeLabel:
              "Nguyễn Văn A",
            regionId: 1,
            ammId: "001",
            supervisorId: 16365,
            actual: 42,
            target: 50,
            percentage: 0.84,
            status: "fail",
          },
          {
            key: "string:NV-2",
            employeeId: "NV-2",
            employeeLabel:
              "Trần Thị B",
            regionId: null,
            ammId: null,
            supervisorId: null,
            actual: null,
            target: null,
            percentage: null,
            status: "no-data",
          },
        ]);
    });

    it("rejects a duplicate employeeId as an integrity error", () => {
      const parsed =
        parseTeamEmployeeKpiData(
          createTable([
            [
              101,
              "Nguyễn Văn A",
              1,
              "001",
              16365,
              42,
              50,
              0.84,
            ],
            [
              101,
              "Nguyễn Văn B",
              1,
              "001",
              16365,
              41,
              50,
              0.82,
            ],
          ]),
        );

      expect(parsed.rows)
        .toEqual([]);
      expect(parsed.error)
        .toContain(
          "employeeId trùng lặp: 101",
        );
    });

    it("rejects a missing required Semantic column", () => {
      const parsed =
        parseTeamEmployeeKpiData(
          createTable(
            [],
            COLUMNS.slice(0, -1),
          ),
        );

      expect(parsed.rows)
        .toEqual([]);
      expect(parsed.error)
        .toContain(
          "cấu trúc KPI nhân viên",
        );
    });

    it("derives fail, pass, and no-data at the 90% frontend threshold", () => {
      expect(
        getTeamEmployeeKpiStatus(
          0.8999,
        ),
      ).toBe("fail");
      expect(
        getTeamEmployeeKpiStatus(
          0.9,
        ),
      ).toBe("pass");
      expect(
        getTeamEmployeeKpiStatus(
          null,
        ),
      ).toBe("no-data");
      expect(
        getTeamEmployeeKpiStatus(
          Number.NaN,
        ),
      ).toBe("no-data");
    });
  },
);

describe(
  "useTeamEmployeeKpiData",
  () => {
    beforeEach(() => {
      queryMock.mockReset();
      queryMock.mockReturnValue(
        createSuccessResult([
          [
            "NV-1",
            "Nhân viên Semantic",
            1,
            "001",
            16365,
            40,
            50,
            0.8,
          ],
        ]),
      );
    });

    it("forwards cycle, KPI, and every encoded organization filter to the registered backend query", () => {
      const {
        result,
      } = renderHook(
        () =>
          useTeamEmployeeKpiData({
            cycleKey: 202608,
            kpiId: 5,
            filters: {
              region: "number:1",
              amm: "string:001",
              supervisor:
                "number:16365",
            },
          }),
      );

      expect(queryMock)
        .toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: true,
            backendRequest: {
              queryId:
                "team-employee-kpi",
              params: {
                cycleKey: 202608,
                kpiId: 5,
                region: "number:1",
                amm: "string:001",
                supervisor:
                  "number:16365",
              },
            },
          }),
        );

      expect(result.current.rows)
        .toHaveLength(1);
      expect(result.current.rows[0])
        .toMatchObject({
          employeeId: "NV-1",
          actual: 40,
          target: 50,
          percentage: 0.8,
          status: "fail",
        });
    });

    it("returns no rows and does not expose stale employee data while the next KPI loads", () => {
      queryMock.mockImplementation(
        (options) =>
          options.backendRequest
            ?.params.kpiId === 5
            ? createSuccessResult([
                [
                  "NV-QC",
                  "Nhân viên QC",
                  1,
                  "001",
                  16365,
                  40,
                  50,
                  0.8,
                ],
              ])
            : {
                data: undefined,
                isLoading: true,
                error: undefined,
                refetch:
                  vi.fn(
                    async () =>
                      undefined,
                  ),
              },
      );

      const {
        result,
        rerender,
      } = renderHook(
        ({ kpiId }) =>
          useTeamEmployeeKpiData({
            cycleKey: 202608,
            kpiId,
            filters: {
              region: "all",
              amm: "all",
              supervisor: "all",
            },
          }),
        {
          initialProps: {
            kpiId: 5,
          },
        },
      );

      expect(result.current.rows[0]
        ?.employeeId)
        .toBe("NV-QC");

      rerender({
        kpiId: 1,
      });

      expect(result.current.rows)
        .toEqual([]);
      expect(result.current.isLoading)
        .toBe(true);
    });

    it("returns empty rows on error, never falls back to mock, and retries with refetch", async () => {
      const refetch =
        vi.fn(
          async () =>
            undefined,
        );

      queryMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        error:
          new Error(
            "Semantic unavailable",
          ),
        refetch,
      });

      const {
        result,
      } = renderHook(
        () =>
          useTeamEmployeeKpiData({
            cycleKey: 202608,
            kpiId: 5,
            filters: {
              region: "all",
              amm: "all",
              supervisor: "all",
            },
          }),
      );

      expect(result.current.rows)
        .toEqual([]);
      expect(result.current.error)
        .toBe(
          "Semantic unavailable",
        );

      await act(async () => {
        await result.current
          .retry();
      });

      expect(refetch)
        .toHaveBeenCalledTimes(1);
    });

    it("does not execute until cycle and KPI identity are both ready", () => {
      renderHook(
        () =>
          useTeamEmployeeKpiData({
            cycleKey: null,
            kpiId: null,
            filters: {
              region: "all",
              amm: "all",
              supervisor: "all",
            },
          }),
      );

      expect(queryMock)
        .toHaveBeenCalledWith(
          expect.objectContaining({
            connection: "",
            query: "",
            backendRequest:
              undefined,
            enabled: false,
          }),
        );
    });
  },
);
