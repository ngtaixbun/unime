import {
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
  normalizeTeamRegionContributions,
  parseTeamKpiRow,
  parseTeamRegions,
  useTeamRegionKpiData,
} from "./useTeamRegionKpiData";

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

function createTable(
  columns:
    string[],
  rows:
    unknown[][],
): QueryTable {
  return {
    columns:
      columns.map(
        (name) => ({
          name,
          dataType:
            name ===
            "[regionLabel]"
              ? "String"
              : name ===
                  "[regionId]"
                ? "Int64"
                : "Double",
        }),
      ),
    rows,
  };
}

describe(
  "Team Region KPI parser",
  () => {
    it("parses dim-region and keeps the business order", () => {
      const parsed =
        parseTeamRegions(
          createTable(
            [
              "[regionId]",
              "[regionLabel]",
            ],
            [
              [4, "HCME"],
              [1, "North"],
              [3, "MKD"],
              [2, "Central"],
            ],
          ),
        );

      expect(
        parsed.error,
      ).toBeNull();

      expect(
        parsed.regions.map(
          (region) =>
            region.label,
        ),
      ).toEqual([
        "North",
        "Central",
        "MKD",
        "HCME",
      ]);
    });

    it("parses the six new KPI measures blank-safely", () => {
      const parsed =
        parseTeamKpiRow(
          createTable(
            [
              "[mtdKpiSelected]",
              "[gap]",
              "[nvFail]",
              "[contributionNvFail]",
              "[countNv]",
              "[contributionNv]",
            ],
            [
              [
                0.993,
                0.193,
                3,
                0.08,
                38,
                0.21,
              ],
            ],
          ),
        );

      expect(
        parsed.error,
      ).toBeNull();

      expect(
        parsed.values,
      ).toEqual({
        value: 0.993,
        gap: 0.193,
        nvFail: 3,
        contributionNvFail:
          0.08,
        countNv: 38,
        contributionNv:
          0.21,
      });
    });
  },
);

describe(
  "normalizeTeamRegionContributions",
  () => {
    it("recalculates both contribution fields across visible Regions", () => {
      const rows =
        normalizeTeamRegionContributions([
          {
            key: "number:3",
            regionId: 3,
            entityId: 3,
            name: "MKD",
            region: "MKD",
            value: 0.9,
            gap: 0,
            nvFail: 59,
            contributionNvFail: 1,
            countNv: 390,
            contributionNv: 1,
          },
          {
            key: "number:4",
            regionId: 4,
            entityId: 4,
            name: "HCME",
            region: "HCME",
            value: 0.9,
            gap: 0,
            nvFail: 39,
            contributionNvFail: 1,
            countNv: 190,
            contributionNv: 1,
          },
          {
            key: "number:2",
            regionId: 2,
            entityId: 2,
            name: "Central",
            region: "Central",
            value: 0.9,
            gap: 0,
            nvFail: 99,
            contributionNvFail: 1,
            countNv: 391,
            contributionNv: 1,
          },
          {
            key: "number:1",
            regionId: 1,
            entityId: 1,
            name: "North",
            region: "North",
            value: 0.9,
            gap: 0,
            nvFail: 52,
            contributionNvFail: 1,
            countNv: 380,
            contributionNv: 1,
          },
        ]);

      expect(
        rows[0]
          .contributionNv,
      ).toBeCloseTo(
        390 / 1351,
      );

      expect(
        rows[0]
          .contributionNvFail,
      ).toBeCloseTo(
        59 / 249,
      );

      expect(
        rows.reduce(
          (
            total,
            row,
          ) =>
            total +
            (
              row.contributionNv ??
              0
            ),
          0,
        ),
      ).toBeCloseTo(1);

      expect(
        rows.reduce(
          (
            total,
            row,
          ) =>
            total +
            (
              row.contributionNvFail ??
              0
            ),
          0,
        ),
      ).toBeCloseTo(1);
    });

    it("returns null contribution when the visible total is zero", () => {
      const [
        row,
      ] =
        normalizeTeamRegionContributions([
          {
            key: "number:1",
            regionId: 1,
            entityId: 1,
            name: "North",
            region: "North",
            value: null,
            gap: null,
            nvFail: 0,
            contributionNvFail: 1,
            countNv: 0,
            contributionNv: 1,
          },
        ]);

      expect(
        row.contributionNv,
      ).toBeNull();

      expect(
        row.contributionNvFail,
      ).toBeNull();
    });
  },
);

describe(
  "useTeamRegionKpiData",
  () => {
    beforeEach(() => {
      queryMock.mockReset();

      queryMock
        .mockReturnValueOnce({
          data: {
            status:
              "success",
            table:
              createTable(
                [
                  "[regionId]",
                  "[regionLabel]",
                ],
                [
                  [1, "North"],
                  [2, "Central"],
                ],
              ),
          },
          isLoading:
            false,
          error:
            undefined,
          refetch:
            vi.fn(
              async () =>
                undefined,
            ),
        })
        .mockReturnValue({
          data: {
            status:
              "success",
            table:
              createTable(
                [
                  "[mtdKpiSelected]",
                  "[gap]",
                  "[nvFail]",
                  "[contributionNvFail]",
                  "[countNv]",
                  "[contributionNv]",
                ],
                [
                  [
                    0.993,
                    0.193,
                    3,
                    0.08,
                    38,
                    0.21,
                  ],
                ],
              ),
          },
          isLoading:
            false,
          error:
            undefined,
          refetch:
            vi.fn(
              async () =>
                undefined,
            ),
        });
    });

    it("uses dim-region and the shared overview-kpi-summary request per Region", () => {
      const {
        result,
      } = renderHook(
        () =>
          useTeamRegionKpiData({
            cycleKey:
              202608,
            kpiId:
              5,
            filters: {
              region: "all",
              amm: "all",
              supervisor: "all",
            },
          }),
      );

      expect(
        queryMock,
      ).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          backendRequest: {
            queryId:
              "dim-region",
            params: {},
          },
        }),
      );

      expect(
        queryMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          backendRequest:
            expect.objectContaining({
              queryId:
                "overview-kpi-summary",
              params:
                expect.objectContaining({
                  cycleKey:
                    202608,
                  kpiId:
                    5,
                  region:
                    expect.stringMatching(
                      /^number:/,
                    ),
                  amm: "all",
                  supervisor:
                    "all",
                }),
            }),
        }),
      );

      expect(
        result.current.rows,
      ).toHaveLength(
        2,
      );

      expect(
        result.current
          .employeeCount,
      ).toBe(76);

      expect(
        result.current
          .rows[0]
          .contributionNv,
      ).toBeCloseTo(
        0.5,
      );

      expect(
        result.current
          .rows[0]
          .contributionNvFail,
      ).toBeCloseTo(
        0.5,
      );
    });

    it("matches a selected Region by encoded ID and forwards AMM/Supervisor to every KPI request", () => {
      const { result } =
        renderHook(
          () =>
            useTeamRegionKpiData({
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

      expect(
        result.current.rows,
      ).toHaveLength(1);
      expect(
        result.current.rows[0].key,
      ).toBe("number:1");
      expect(
        result.current.rows[0]
          .contributionNv,
      ).toBe(1);
      expect(
        result.current.rows[0]
          .contributionNvFail,
      ).toBe(1);

      expect(queryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          query:
            expect.stringContaining(
              "'dimnv'[sup_id]",
            ),
          backendRequest: {
            queryId:
              "overview-kpi-summary",
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
    });

    it("does not use a Region label or label normalization as the filter identity", () => {
      const { result } =
        renderHook(
          () =>
            useTeamRegionKpiData({
              cycleKey: 202608,
              kpiId: 5,
              filters: {
                region:
                  "string:NORTH",
                amm: "all",
                supervisor: "all",
              },
            }),
        );

      expect(
        result.current.rows,
      ).toEqual([]);
      expect(
        queryMock.mock.calls.filter(
          ([request]) =>
            request.backendRequest
              ?.queryId ===
            "overview-kpi-summary",
        ),
      ).toHaveLength(0);
    });
  },
);
