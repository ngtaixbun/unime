import {
  describe,
  expect,
  it,
} from "vitest";

import {
  teamQueries,
} from "../queries";
import {
  adaptOrganizationFiltersToLegacyTeamFilters,
  filterTeamRows,
} from "./team.selectors";

const rows =
  teamQueries.getData().rows;
const firstRow = rows[0];

describe(
  "adaptOrganizationFiltersToLegacyTeamFilters",
  () => {
    it("resolves semantic labels to the existing Team hierarchy contract", () => {
      const filters =
        adaptOrganizationFiltersToLegacyTeamFilters(
          rows,
          {
            region: "number:1",
            amm: "string:amm-id",
            supervisor:
              "string:supervisor-id",
          },
          {
            region: firstRow.region,
            amm: firstRow.amm,
            supervisor:
              firstRow.sup,
          },
        );

      expect(filters).toEqual({
        region: firstRow.region,
        amm: firstRow.ammCode,
        sup: firstRow.supCode,
      });
      expect(
        filterTeamRows(
          rows,
          filters,
        ).length,
      ).toBeGreaterThan(0);
    });

    it("fails closed when a semantic label cannot be resolved in legacy rows", () => {
      const filters =
        adaptOrganizationFiltersToLegacyTeamFilters(
          rows,
          {
            region: "number:999",
            amm: "all",
            supervisor: "all",
          },
          {
            region:
              "Không tồn tại",
            amm: null,
            supervisor: null,
          },
        );

      expect(
        filterTeamRows(
          rows,
          filters,
        ),
      ).toEqual([]);
    });
  },
);
