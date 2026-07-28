import {
  describe,
  expect,
  it,
} from "vitest";

import {
  kpiMtd,
  kpiMtdQuery,
} from "./kpimtd";

describe("kpiMtd", () => {
  it("uses the unimeModel connection and injects cycleKey", () => {
    const result = kpiMtd({
      cycleKey: 202608,
    });

    expect(result.connection).toBe(
      "unimeModel",
    );
    expect(result.query).not.toBe(
      kpiMtdQuery,
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

  it("omits organization TREATAS blocks when every filter is all", () => {
    const { query } = kpiMtd({
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

  it("injects Region, AMM and Supervisor into the summary context", () => {
    const { query } = kpiMtd({
      cycleKey: 202608,
      filters: {
        region: "number:1",
        amm: "string:001",
        supervisor:
          'string:S"01',
      },
    });

    expect(query).toContain(
      "{ 1 }",
    );
    expect(query).toContain(
      "'dimnv'[Region ID]",
    );

    expect(query).toContain(
      '{ "001" }',
    );
    expect(query).toContain(
      "'dimnv'[amm_id]",
    );

    expect(query).toContain(
      '{ "S""01" }',
    );
    expect(query).toContain(
      "'dimnv'[sup_id]",
    );

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

  it("keeps numeric Supervisor IDs unquoted", () => {
    const { query } = kpiMtd({
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
  });

  it("changes the generated query when cycle changes and leaves no placeholders", () => {
    const previous = kpiMtd({
      cycleKey: 202607,
      filters: {
        supervisor:
          "number:16365",
      },
    }).query;
    const current = kpiMtd({
      cycleKey: 202608,
      filters: {
        supervisor:
          "number:16365",
      },
    }).query;

    expect(current).not.toBe(previous);
    expect(current).toContain(
      "202608",
    );
    expect(current).not.toContain(
      "202607",
    );

    for (const placeholder of [
      "__SELECTED_CYCLE_KEY__",
      "__REGION_FILTER__",
      "__AMM_FILTER__",
      "__SUPERVISOR_FILTER__",
    ]) {
      expect(current).not.toContain(
        placeholder,
      );
    }
  });

  it("scales all five KPI ratios in DAX", () => {
    const { query } = kpiMtd({
      cycleKey: 202608,
    });

    expect(query).toMatch(
      /"successfulCallsMtd",\s*\[mtd_call\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"visitMtd",\s*\[mtd_visit\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"timeSpendMtd",\s*\[mtd_timespend\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"osaMtd",\s*\[mtd_osa\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"qcMtd",\s*\[mtd_qc\]\s*\*\s*100/,
    );
  });

  it("keeps all five Issued measures unscaled", () => {
    const { query } = kpiMtd({
      cycleKey: 202608,
    });

    expect(query).toMatch(
      /"successfulCallsIssued",\s*\[nvfail_call\],/,
    );
    expect(query).toMatch(
      /"visitIssued",\s*\[nvfail_visit\],/,
    );
    expect(query).toMatch(
      /"timeSpendIssued",\s*\[nvfail_timespend\],/,
    );
    expect(query).toMatch(
      /"osaIssued",\s*\[nvfail_osa\],/,
    );
    expect(query).toMatch(
      /"qcIssued",\s*\[nvfail_qc\]/,
    );
  });

  it("maps all ten exact query columns", () => {
    const { columnMetadata } =
      kpiMtd({
        cycleKey: 202608,
      });

    expect(
      Object.fromEntries(
        Object.entries(
          columnMetadata,
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
      "[successfulCallsMtd]":
        "successfulCallsMtd",
      "[successfulCallsIssued]":
        "successfulCallsIssued",
      "[visitMtd]": "visitMtd",
      "[visitIssued]": "visitIssued",
      "[timeSpendMtd]":
        "timeSpendMtd",
      "[timeSpendIssued]":
        "timeSpendIssued",
      "[osaMtd]": "osaMtd",
      "[osaIssued]": "osaIssued",
      "[qcMtd]": "qcMtd",
      "[qcIssued]": "qcIssued",
    });
  });
});
