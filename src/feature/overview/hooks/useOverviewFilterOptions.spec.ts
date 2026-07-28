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
  useOverviewFilterOptions,
} from "./useOverviewFilterOptions";

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

function success(
  columns: string[],
  rows: unknown[][],
) {
  return {
    data: {
      status: "success" as const,
      table: {
        columns: columns.map(
          (name) => ({
            name,
            dataType: "String",
          }),
        ),
        rows,
      },
    },
    isLoading: false,
    error: undefined,
    refetch: vi.fn(),
  };
}

describe(
  "useOverviewFilterOptions",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mockUseSemanticModelQuery
        .mockReturnValueOnce(
          success(
            [
              "[regionId]",
              "[regionLabel]",
            ],
            [[1, "North"]],
          ),
        )
        .mockReturnValueOnce(
          success(
            [
              "[ammId]",
              "[ammLabel]",
              "[regionId]",
            ],
            [["001", "AMM A", 1]],
          ),
        )
        .mockReturnValueOnce(
          success(
            [
              "[supervisorId]",
              "[supervisorLabel]",
              "[ammId]",
              "[regionId]",
            ],
            [[
              "S01",
              "Sup A",
              "001",
              1,
            ]],
          ),
        );
    });

    it("loads all three option levels from Semantic Model", () => {
      const { result } =
        renderHook(
          () =>
            useOverviewFilterOptions({
              region: "all",
              amm: "all",
              supervisor: "all",
            }),
        );

      expect(
        result.current.regionOptions,
      ).toEqual([
        {
          label: "Tất cả khu vực",
          value: "all",
        },
        {
          label: "North",
          value: "number:1",
        },
      ]);

      expect(
        result.current.ammOptions[1],
      ).toEqual({
        label: "AMM A",
        value: "string:001",
      });

      expect(
        result.current
          .supervisorOptions[1],
      ).toEqual({
        label: "Sup A",
        value: "string:S01",
      });
    });

    it("rebuilds AMM and Supervisor option queries from draft cascade primitives", () => {
      mockUseSemanticModelQuery
        .mockReset()
        .mockReturnValue(
          success([], []),
        );

      type DraftFilters = Parameters<
        typeof useOverviewFilterOptions
      >[0];

      const { rerender } =
        renderHook(
          ({
            filters,
          }: {
            filters: DraftFilters;
          }) =>
            useOverviewFilterOptions(
              filters,
            ),
          {
            initialProps: {
              filters: {
                region: "all",
                amm: "all",
                supervisor: "all",
              } as DraftFilters,
            },
          },
        );

      const initialAmmQuery =
        mockUseSemanticModelQuery
          .mock.calls[1][0].query;
      const initialSupervisorQuery =
        mockUseSemanticModelQuery
          .mock.calls[2][0].query;

      expect(initialAmmQuery).not.toContain(
        "TREATAS(",
      );
      expect(
        initialSupervisorQuery,
      ).not.toContain(
        "TREATAS(",
      );

      rerender({
        filters: {
          region: "number:1",
          amm: "string:001",
          supervisor: "all",
        },
      });

      const nextAmmQuery =
        mockUseSemanticModelQuery
          .mock.calls.at(-2)?.[0]
          .query;
      const nextSupervisorQuery =
        mockUseSemanticModelQuery
          .mock.calls.at(-1)?.[0]
          .query;

      expect(nextAmmQuery).toContain(
        "TREATAS(",
      );
      expect(nextSupervisorQuery).toContain(
        "TREATAS(",
      );
      expect(nextSupervisorQuery).toContain(
        "'dimnv'[amm_id]",
      );
    });
  },
);
