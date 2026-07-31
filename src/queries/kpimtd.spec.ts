import {
  describe,
  expect,
  it,
} from "vitest";

import {
  kpiMtd,
} from "./kpimtd";

describe(
  "kpiMtd",
  () => {
    it("keeps one row and the full eighteen-column metadata contract", () => {
      const config =
        kpiMtd({
          cycleKey:
            202608,

          kpiId:
            5,
        });

      expect(
        config.query,
      ).toMatch(
        /VAR\s+_SelectedCycleKey\s*=\s*202608/,
      );

      expect(
        config.query,
      ).toMatch(
        /VAR\s+_SelectedKpiId\s*=\s*5/,
      );

      expect(
        config.query,
      ).toMatch(
        /TREATAS\(\s*\{\s*_SelectedCycleKey\s*\}/,
      );

      expect(
        config.query,
      ).toMatch(
        /TREATAS\(\s*\{\s*_SelectedKpiId\s*\}/,
      );

      expect(
        config.query,
      ).toContain(
        "'KPIname'[num]",
      );

      expect(
        Object.keys(
          config.columnMetadata,
        ),
      ).toHaveLength(
        18,
      );

      expect(
        config.query,
      ).toMatch(
        /"actual",\s*\[Actual KPI Selected\]/,
      );

      expect(
        config.query,
      ).toMatch(
        /"target",\s*\[Target KPI Selected\]/,
      );

      expect(
        config.query,
      ).not.toContain(
        "__SELECTED_",
      );
    });

    it("keeps the existing Overview call compatible by defaulting kpiId", () => {
      const config =
        kpiMtd({
          cycleKey:
            202608,
        });

      expect(
        config.query,
      ).toMatch(
        /VAR\s+_SelectedCycleKey\s*=\s*202608/,
      );

      expect(
        config.query,
      ).toMatch(
        /VAR\s+_SelectedKpiId\s*=\s*1/,
      );

      expect(
        config.query,
      ).toMatch(
        /TREATAS\(\s*\{\s*_SelectedKpiId\s*\}/,
      );

      expect(
        config.query,
      ).not.toContain(
        "__SELECTED_KPI_ID__",
      );
    });

    it("injects the Region ID into the same query instead of creating a new DAX query", () => {
      const config =
        kpiMtd({
          cycleKey:
            202608,

          kpiId:
            5,

          filters: {
            region:
              "number:4",
          },
        });

      expect(
        config.query,
      ).toContain(
        "{ 4 }",
      );

      expect(
        config.query,
      ).toContain(
        "'dimnv'[Region ID]",
      );

      expect(
        config.query,
      ).not.toContain(
        "__REGION_FILTER__",
      );
    });
  },
);
