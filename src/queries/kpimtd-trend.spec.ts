import {
  describe,
  expect,
  it,
} from "vitest";

import {
  kpiMtdTrend,
  kpiMtdTrendColumnMetadata,
  kpiMtdTrendQuery,
} from "./kpimtd-trend";

describe("kpiMtdTrend", () => {
  it("uses an independent query and injects cycleKey", () => {
    const result =
      kpiMtdTrend({
        cycleKey: 202608,
      });

    expect(result.connection).toBe(
      "unimeModel",
    );
    expect(result.query).not.toBe(
      kpiMtdTrendQuery,
    );
    expect(result.query).toContain(
      "202608",
    );
    expect(result.query).toMatch(
      /TREATAS\(\s*\{\s*_SelectedCycleKey\s*\},\s*'Date'\[Chu kỳ KPI Key\]/,
    );
    expect(result.query).not.toContain(
      "__SELECTED_CYCLE_KEY__",
    );
  });

  it("omits organization filters when every value is all", () => {
    const { query } =
      kpiMtdTrend({
        cycleKey: 202608,
        filters: {
          region: "all",
          amm: "all",
          supervisor: "all",
        },
      });

    expect(query).not.toContain(
      "'dimnv'[Region ID]",
    );
    expect(query).not.toContain(
      "'dimnv'[amm_id]",
    );
    expect(query).not.toContain(
      "'dimnv'[sup_id]",
    );
    expect(query).toContain(
      "'Date'[Chu kỳ KPI Key]",
    );
  });

  it("applies all organization filters to the daily measure context", () => {
    const { query } =
      kpiMtdTrend({
        cycleKey: 202608,
        filters: {
          region: "number:1",
          amm: "string:001",
          supervisor: "string:S01",
        },
      });

    const trendRowsIndex =
      query.indexOf(
        "VAR _TrendRows",
      );

    expect(trendRowsIndex).toBeGreaterThan(
      -1,
    );

    for (const targetColumn of [
      "'dimnv'[Region ID]",
      "'dimnv'[amm_id]",
      "'dimnv'[sup_id]",
    ]) {
      expect(
        query.indexOf(targetColumn),
      ).toBeGreaterThan(
        trendRowsIndex,
      );
    }

    expect(query).not.toContain(
      "__REGION_FILTER__",
    );
    expect(query).not.toContain(
      "__AMM_FILTER__",
    );
    expect(query).not.toContain(
      "__SUPERVISOR_FILTER__",
    );
  });

  it("keeps numeric Supervisor IDs unquoted and leaves no placeholders", () => {
    const { query } =
      kpiMtdTrend({
        cycleKey: 202608,
        filters: {
          supervisor:
            "number:16365",
        },
      });

    expect(query).toMatch(
      /TREATAS\(\s*\{\s*16365\s*\},\s*'dimnv'\[sup_id\]/,
    );
    expect(query).not.toMatch(
      /TREATAS\(\s*\{\s*"16365"\s*\},\s*'dimnv'\[sup_id\]/,
    );

    for (const placeholder of [
      "__SELECTED_CYCLE_KEY__",
      "__REGION_FILTER__",
      "__AMM_FILTER__",
      "__SUPERVISOR_FILTER__",
    ]) {
      expect(query).not.toContain(
        placeholder,
      );
    }
  });

  it("changes the generated query when cycle changes", () => {
    const previous =
      kpiMtdTrend({
        cycleKey: 202607,
      }).query;
    const current =
      kpiMtdTrend({
        cycleKey: 202608,
      }).query;

    expect(current).not.toBe(previous);
    expect(current).toContain(
      "202608",
    );
    expect(current).not.toContain(
      "202607",
    );
  });

  it("returns daily KPI points without Issued fields", () => {
    const { query } =
      kpiMtdTrend({
        cycleKey: 202608,
      });

    expect(query).toContain(
      "VALUES('Date'[Date])",
    );
    expect(query).toContain(
      "'Date'[Chu kỳ KPI Key]",
    );

    for (const measure of [
      "mtd_call",
      "mtd_visit",
      "mtd_timespend",
      "mtd_osa",
      "mtd_qc",
    ]) {
      expect(query).toMatch(
        new RegExp(
          `\\[${measure}\\]\\s*\\*\\s*100`,
        ),
      );
    }

    expect(query).not.toContain(
      "nvfail_",
    );
  });

  it("uses benchmark 90 for all five series", () => {
    const { query } =
      kpiMtdTrend({
        cycleKey: 202608,
      });

    expect(query).toMatch(
      /"benchmark",\s*90(?:\.0)?/,
    );
  });

  it("maps the exact trend output columns", () => {
    expect(
      Object.fromEntries(
        Object.entries(
          kpiMtdTrendColumnMetadata,
        ).map(
          ([
            queryColumn,
            metadata,
          ]) => [
            queryColumn,
            metadata.name,
          ],
        ),
      ),
    ).toEqual({
      "[Date]": "Date",
      "[successfulCallsMtd]":
        "successfulCallsMtd",
      "[visitMtd]": "visitMtd",
      "[timeSpendMtd]":
        "timeSpendMtd",
      "[osaMtd]": "osaMtd",
      "[qcMtd]": "qcMtd",
      "[benchmark]": "benchmark",
    });
  });
});
