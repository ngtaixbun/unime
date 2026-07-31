import {
  createElement,
  Fragment,
  useEffect,
} from "react";

import {
  render,
  waitFor,
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

import type {
  OrganizationFilters,
} from "@/components/organization-filter";

import {
  normalizeTeamAmmContributions,
  parseTeamAmms,
  selectVisibleTeamAmms,
  useTeamAmmKpiData,
  type SemanticAmm,
  type TeamAmmKpiRow,
  type UseTeamAmmKpiDataResult,
} from "./useTeamAmmKpiData";

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
            name.includes(
              "Label",
            )
              ? "String"
              : "Double",
        }),
      ),
    rows,
  };
}

const parsedAmms:
  SemanticAmm[] = [
    {
      key:
        "string:001",
      ammId: "001",
      label:
        "AMM Semantic North",
      regionId: 1,
      filterValue:
        "string:001",
      regionFilterValue:
        "number:1",
    },
    {
      key:
        "number:2",
      ammId: 2,
      label:
        "AMM Semantic Central",
      regionId: 2,
      filterValue:
        "number:2",
      regionFilterValue:
        "number:2",
    },
  ];

describe(
  "Team AMM parser and filters",
  () => {
    it("parses ammId, ammLabel and regionId with encoded Semantic IDs", () => {
      const parsed =
        parseTeamAmms(
          createTable(
            [
              "[ammId]",
              "[ammLabel]",
              "[regionId]",
            ],
            [
              [
                "001",
                "  AMM Semantic 001  ",
                1,
              ],
              [
                2,
                "AMM Semantic 2",
                null,
              ],
            ],
          ),
        );

      expect(
        parsed.error,
      ).toBeNull();
      expect(
        parsed.amms,
      ).toEqual([
        {
          key:
            "string:001",
          ammId: "001",
          label:
            "AMM Semantic 001",
          regionId: 1,
          filterValue:
            "string:001",
          regionFilterValue:
            "number:1",
        },
        {
          key:
            "number:2",
          ammId: 2,
          label:
            "AMM Semantic 2",
          regionId: null,
          filterValue:
            "number:2",
          regionFilterValue:
            null,
        },
      ]);
    });

    it("drops invalid IDs or labels and preserves the Semantic label", () => {
      const parsed =
        parseTeamAmms(
          createTable(
            [
              "[ammId]",
              "[ammLabel]",
              "[regionId]",
            ],
            [
              [
                "A-01",
                "Tên AMM từ Semantic",
                "R-1",
              ],
              [
                "",
                "Invalid ID",
                1,
              ],
              [
                null,
                "Invalid ID",
                1,
              ],
              [
                3,
                "   ",
                1,
              ],
              [
                4,
                null,
                1,
              ],
            ],
          ),
        );

      expect(
        parsed.amms,
      ).toHaveLength(1);
      expect(
        parsed.amms[0]
          .label,
      ).toBe(
        "Tên AMM từ Semantic",
      );
    });

    it("rejects duplicate encoded AMM IDs", () => {
      const parsed =
        parseTeamAmms(
          createTable(
            [
              "[ammId]",
              "[ammLabel]",
              "[regionId]",
            ],
            [
              [
                "001",
                "AMM one",
                1,
              ],
              [
                "001",
                "AMM duplicate",
                2,
              ],
            ],
          ),
        );

      expect(
        parsed.amms,
      ).toEqual([]);
      expect(
        parsed.error,
      ).toContain(
        "trùng AMM ID",
      );
    });

    it("filters Region and AMM only by encoded IDs", () => {
      expect(
        selectVisibleTeamAmms(
          parsedAmms,
          {
            region: "all",
            amm: "all",
            supervisor:
              "all",
          },
        ),
      ).toHaveLength(2);

      expect(
        selectVisibleTeamAmms(
          parsedAmms,
          {
            region:
              "number:1",
            amm: "all",
            supervisor:
              "all",
          },
        ).map(
          (amm) =>
            amm.key,
        ),
      ).toEqual([
        "string:001",
      ]);

      expect(
        selectVisibleTeamAmms(
          parsedAmms,
          {
            region: "all",
            amm:
              "number:2",
            supervisor:
              "all",
          },
        ).map(
          (amm) =>
            amm.key,
        ),
      ).toEqual([
        "number:2",
      ]);

      expect(
        selectVisibleTeamAmms(
          parsedAmms,
          {
            region:
              "string:AMM Semantic North",
            amm: "all",
            supervisor:
              "all",
          },
        ),
      ).toEqual([]);
    });
  },
);

describe(
  "normalizeTeamAmmContributions",
  () => {
    function row(
      id: number,
      countNv: number,
      nvFail: number,
    ): TeamAmmKpiRow {
      return {
        key:
          `number:${id}`,
        entityId: id,
        ammId: id,
        name:
          `AMM ${id}`,
        region:
          "number:1",
        regionId: 1,
        regionFilterValue:
          "number:1",
        value: 0.9,
        gap: 0,
        nvFail,
        contributionNvFail:
          1,
        countNv,
        contributionNv:
          1,
      };
    }

    it("normalizes visible AMMs to 100 percent", () => {
      const rows =
        normalizeTeamAmmContributions([
          row(1, 390, 59),
          row(2, 190, 39),
          row(3, 391, 99),
          row(4, 380, 52),
        ]);

      expect(
        rows.map(
          (item) =>
            item.contributionNv,
        ),
      ).toEqual([
        390 / 1351,
        190 / 1351,
        391 / 1351,
        380 / 1351,
      ]);
      expect(
        rows.reduce(
          (
            total,
            item,
          ) =>
            total +
            (
              item.contributionNv ??
              0
            ),
          0,
        ),
      ).toBeCloseTo(1);
      expect(
        rows.reduce(
          (
            total,
            item,
          ) =>
            total +
            (
              item.contributionNvFail ??
              0
            ),
          0,
        ),
      ).toBeCloseTo(1);
    });

    it("returns null for zero totals and one for a single positive AMM", () => {
      const [
        zero,
      ] =
        normalizeTeamAmmContributions([
          row(1, 0, 0),
        ]);
      const [
        single,
      ] =
        normalizeTeamAmmContributions([
          row(1, 10, 2),
        ]);

      expect(
        zero.contributionNv,
      ).toBeNull();
      expect(
        zero.contributionNvFail,
      ).toBeNull();
      expect(
        single.contributionNv,
      ).toBe(1);
      expect(
        single.contributionNvFail,
      ).toBe(1);
    });
  },
);

function TeamAmmHarness({
  filters,
  onResult,
}: {
  filters:
    OrganizationFilters;
  onResult:
    (
      result:
        UseTeamAmmKpiDataResult,
    ) => void;
}) {
  const result =
    useTeamAmmKpiData({
      cycleKey: 202608,
      kpiId: 5,
      filters,
      enabled: true,
    });

  useEffect(
    () => {
      onResult(
        result,
      );
    },
    [
      onResult,
      result,
    ],
  );

  return createElement(
    Fragment,
    null,
    result.queryElements,
  );
}

describe(
  "useTeamAmmKpiData dynamic collection",
  () => {
    const dimensionTable =
      createTable(
        [
          "[ammId]",
          "[ammLabel]",
          "[regionId]",
        ],
        [
          [
            "001",
            "AMM 001",
            1,
          ],
          [
            "002",
            "AMM 002",
            1,
          ],
          [
            "003",
            "AMM 003",
            2,
          ],
          [
            "004",
            "AMM 004",
            2,
          ],
          [
            "005",
            "AMM 005",
            3,
          ],
        ],
      );

    const regionTable =
      createTable(
        [
          "[regionId]",
          "[regionLabel]",
        ],
        [
          [
            1,
            "NORTH",
          ],
          [
            2,
            "CENTRAL",
          ],
          [
            3,
            "MKD",
          ],
        ],
      );

    const kpiTable =
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
            0.91,
            0.01,
            2,
            1,
            20,
            1,
          ],
        ],
      );

    beforeEach(
      () => {
        queryMock
          .mockReset();

        const dimensionResult = {
          data: {
            status:
              "success" as const,
            table:
              dimensionTable,
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
        };

        const regionDimensionResult = {
          data: {
            status:
              "success" as const,
            table:
              regionTable,
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
        };

        const kpiResults =
          new Map<
            string,
            typeof dimensionResult
          >();

        queryMock.mockImplementation(
          (
            request: {
              query?: string;
              backendRequest?: {
                queryId: string;
                params: {
                  amm?: string;
                };
              };
            },
          ) => {
            if (
              request
                .backendRequest
                ?.queryId ===
              "dim-amm"
            ) {
              return dimensionResult;
            }

            if (
              request
                .backendRequest
                ?.queryId ===
              "dim-region"
            ) {
              return regionDimensionResult;
            }

            const amm =
              request
                .backendRequest
                ?.params.amm ??
              "missing";

            if (
              !kpiResults.has(
                amm,
              )
            ) {
              kpiResults.set(
                amm,
                {
                  data: {
                    status:
                      "success",
                    table:
                      kpiTable,
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
                },
              );
            }

            return kpiResults.get(
              amm,
            );
          },
        );
      },
    );

    it("queries every AMM beyond four with the full overview contract", async () => {
      const resultHolder: {
        current:
          UseTeamAmmKpiDataResult |
          null;
      } = {
        current: null,
      };

      render(
        createElement(
          TeamAmmHarness,
          {
            filters: {
              region: "all",
              amm: "all",
              supervisor:
                "number:16365",
            },
            onResult:
              (result) => {
                resultHolder.current =
                  result;
              },
          },
        ),
      );

      await waitFor(
        () => {
          expect(
            resultHolder.current
              ?.rows,
          ).toHaveLength(5);
        },
      );

      const kpiRequests =
        queryMock.mock.calls
          .map(
            ([request]) =>
              request,
          )
          .filter(
            (request) =>
              request
                .backendRequest
                ?.queryId ===
              "overview-kpi-summary",
          );

      expect(
        new Set(
          kpiRequests.map(
            (request) =>
              request
                .backendRequest
                ?.params.amm,
          ),
        ).size,
      ).toBe(5);

      const firstAmmRequest =
        kpiRequests.find(
          (request) =>
            request
              .backendRequest
              ?.params.amm ===
            "string:001",
        );

      expect(
        firstAmmRequest
          ?.backendRequest,
      ).toEqual({
        queryId:
          "overview-kpi-summary",
        params: {
          cycleKey:
            202608,
          kpiId: 5,
          region:
            "number:1",
          amm:
            "string:001",
          supervisor:
            "number:16365",
        },
      });
      expect(
        firstAmmRequest
          ?.query,
      ).toContain(
        "'dimnv'[amm_id]",
      );
      expect(
        firstAmmRequest
          ?.query,
      ).toContain(
        "'dimnv'[sup_id]",
      );
      expect(
        resultHolder.current
          ?.rows[0]
          .region,
      ).toBe(
        "NORTH",
      );

      expect(
        resultHolder.current
          ?.rows.reduce(
            (
              total,
              item,
            ) =>
              total +
              (
                item.contributionNv ??
                0
              ),
            0,
          ),
      ).toBeCloseTo(1);
    });

    it("uses selected Region/AMM IDs and gives the single AMM 100 percent", async () => {
      const resultHolder: {
        current:
          UseTeamAmmKpiDataResult |
          null;
      } = {
        current: null,
      };

      render(
        createElement(
          TeamAmmHarness,
          {
            filters: {
              region:
                "number:1",
              amm:
                "string:002",
              supervisor:
                "string:SUP-01",
            },
            onResult:
              (result) => {
                resultHolder.current =
                  result;
              },
          },
        ),
      );

      await waitFor(
        () => {
          expect(
            resultHolder.current
              ?.rows,
          ).toHaveLength(1);
        },
      );

      expect(
        resultHolder.current
          ?.rows[0]
          .key,
      ).toBe(
        "string:002",
      );
      expect(
        resultHolder.current
          ?.rows[0]
          .contributionNv,
      ).toBe(1);
      expect(
        resultHolder.current
          ?.rows[0]
          .contributionNvFail,
      ).toBe(1);
      expect(
        queryMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          backendRequest: {
            queryId:
              "overview-kpi-summary",
            params: {
              cycleKey:
                202608,
              kpiId: 5,
              region:
                "number:1",
              amm:
                "string:002",
              supervisor:
                "string:SUP-01",
            },
          },
        }),
      );
    });
  },
);
