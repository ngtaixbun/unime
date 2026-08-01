import {
  describe,
  expect,
  it,
} from "vitest";

import {
  teamEmployeeTrend,
} from "./team-employee-trend";

const placeholders = [
  "__SELECTED_CYCLE_KEY__",
  "__SELECTED_EMPLOYEE_ID__",
  "__SELECTED_KPI_ID__",
  "__REGION_FILTER__",
  "__AMM_FILTER__",
  "__SUPERVISOR_FILTER__",
] as const;

describe("teamEmployeeTrend", () => {
  it("builds the last-eight-date query with the exact two-column contract", () => {
    const config = teamEmployeeTrend({
      cycleKey: 202608,
      employeeId: 9542,
      kpiId: 4,
    });

    expect(config.query).toMatch(
      /TOPN\(\s*8,\s*FILTER\(\s*_Rows,\s*NOT ISBLANK\(\[percentage\]\)[\s\S]*?\[Date\],[\s\S]*?DESC/,
    );
    expect(config.query).toMatch(
      /VAR\s+_SelectedEmployeeId\s*=\s*9542/,
    );
    expect(config.query).toMatch(
      /VAR\s+_SelectedKpiId\s*=\s*4/,
    );
    expect(config.query).toContain(
      "[MTD KPI Selected]",
    );
    expect(config.query).toMatch(
      /ORDER BY\s+\[Date\]\s+ASC/,
    );
    expect(
      Object.fromEntries(
        Object.entries(
          config.columnMetadata,
        ).map(([key, value]) => [
          key,
          value.name,
        ]),
      ),
    ).toEqual({
      "[Date]": "Date",
      "[percentage]": "percentage",
    });
  });

  it("injects cycle, employee, KPI and organization filters without unresolved placeholders", () => {
    const { query } = teamEmployeeTrend({
      cycleKey: "2026-08",
      employeeId: "NV-01",
      kpiId: 5,
      filters: {
        region: "number:1",
        amm: "number:8214",
        supervisor: "number:8227",
      },
    });

    expect(query).toMatch(
      /VAR\s+_SelectedEmployeeId\s*=\s*"NV-01"/,
    );
    expect(query).toMatch(
      /VAR\s+_SelectedKpiId\s*=\s*5/,
    );
    expect(query).toMatch(
      /\{\s*_SelectedEmployeeId\s*\}[\s\S]*?'dimnv'\[Employee_Id\]/,
    );
    expect(query).toMatch(
      /\{\s*_SelectedKpiId\s*\}[\s\S]*?'KPIname'\[num\]/,
    );
    expect(query).toContain("'dimnv'[Region ID]");
    expect(query).toContain("'dimnv'[amm_id]");
    expect(query).toContain("'dimnv'[sup_id]");

    for (const placeholder of placeholders) {
      expect(query).not.toContain(placeholder);
    }
  });

  it.each([0, -1, 1.5, Number.NaN])(
    "rejects invalid kpiId %s",
    (kpiId) => {
      expect(() =>
        teamEmployeeTrend({
          cycleKey: 202608,
          employeeId: 9542,
          kpiId,
        }),
      ).toThrow(/kpiId/);
    },
  );
});
