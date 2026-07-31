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
  useOrganizationFilterOptions,
} from "./useOrganizationFilterOptions";

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
  "useOrganizationFilterOptions",
  () => {
    beforeEach(() => {
      queryMock
        .mockReset()
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
              16365,
              "Sup A",
              "001",
              1,
            ]],
          ),
        );
    });

    it("loads all three levels from Semantic Model and encodes IDs by source type", () => {
      const { result } =
        renderHook(
          () =>
            useOrganizationFilterOptions({
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
        value: "number:16365",
      });
    });

    it("passes the draft cascade to AMM and Supervisor direct/backend queries", () => {
      queryMock
        .mockReset()
        .mockReturnValue(
          success([], []),
        );

      renderHook(
        () =>
          useOrganizationFilterOptions({
            region: "number:1",
            amm: "string:001",
            supervisor: "all",
          }),
      );

      expect(queryMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          query:
            expect.stringContaining(
              "'dimnv'[Region ID]",
            ),
          backendRequest: {
            queryId: "dim-amm",
            params: {
              region: "number:1",
            },
          },
        }),
      );
      expect(queryMock).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          query:
            expect.stringContaining(
              "'dimnv'[amm_id]",
            ),
          backendRequest: {
            queryId:
              "dim-supervisor",
            params: {
              region: "number:1",
              amm: "string:001",
            },
          },
        }),
      );
    });

    it("keeps only each semantic all-option for empty result sets", () => {
      queryMock
        .mockReset()
        .mockReturnValue(
          success([], []),
        );

      const { result } =
        renderHook(
          () =>
            useOrganizationFilterOptions({
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
      ]);
      expect(
        result.current.ammOptions,
      ).toHaveLength(1);
      expect(
        result.current
          .supervisorOptions,
      ).toHaveLength(1);
    });
  },
);
