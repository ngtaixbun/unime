import {
  describe,
  expect,
  it,
} from "vitest";

import {
  teamEmployeeDetails,
} from "./team-employee-details";

const placeholders = [
  "__SELECTED_CYCLE_KEY__",
  "__SELECTED_EMPLOYEE_ID__",
  "__REGION_FILTER__",
  "__AMM_FILTER__",
  "__SUPERVISOR_FILTER__",
] as const;

describe("teamEmployeeDetails", () => {
  it("builds the employee by KPI grain with the exact twelve-column contract", () => {
    const config = teamEmployeeDetails({
      cycleKey: 202608,
      employeeId: 9542,
    });

    expect(config.query).toMatch(
      /VAR\s+_SelectedCycleKey\s*=\s*202608/,
    );
    expect(config.query).toMatch(
      /VAR\s+_SelectedEmployeeId\s*=\s*9542/,
    );
    expect(config.query).toContain(
      "'dimnv'[EmployeeCode]",
    );
    expect(config.query).toContain(
      "'dimnv'[npp_name]",
    );
    expect(config.query).toContain(
      "'KPIname'[num]",
    );
    expect(config.query).toContain(
      "[Actual KPI Selected]",
    );
    expect(config.query).toContain(
      "[Target KPI Selected]",
    );
    expect(config.query).toContain(
      "[MTD KPI Selected]",
    );
    expect(config.query).toMatch(
      /"__keep",\s*1/,
    );
    expect(config.query).toContain(
      "{ 1, 2, 3, 4, 5 }",
    );
    expect(config.query).toMatch(
      /\[kpiId\]\s*>=\s*1[\s\S]*?\[kpiId\]\s*<=\s*5/,
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
      "[employeeId]": "employeeId",
      "[employeeCode]": "employeeCode",
      "[employeeLabel]": "employeeLabel",
      "[regionLabel]": "regionLabel",
      "[ammLabel]": "ammLabel",
      "[supervisorLabel]": "supervisorLabel",
      "[nppLabel]": "nppLabel",
      "[kpiId]": "kpiId",
      "[kpiLabel]": "kpiLabel",
      "[actual]": "actual",
      "[target]": "target",
      "[percentage]": "percentage",
    });
  });

  it("escapes string identity and injects every organization filter", () => {
    const { query } = teamEmployeeDetails({
      cycleKey: "2026-08",
      employeeId: 'NV"01',
      filters: {
        region: "number:1",
        amm: "string:AMM-01",
        supervisor: "number:8227",
      },
    });

    expect(query).toMatch(
      /VAR\s+_SelectedEmployeeId\s*=\s*"NV""01"/,
    );
    expect(query).toMatch(
      /\{\s*_SelectedEmployeeId\s*\}[\s\S]*?'dimnv'\[Employee_Id\]/,
    );
    expect(query).toContain("'dimnv'[Region ID]");
    expect(query).toContain("{ 1 }");
    expect(query).toContain("'dimnv'[amm_id]");
    expect(query).toContain('{ "AMM-01" }');
    expect(query).toContain("'dimnv'[sup_id]");
    expect(query).toContain("{ 8227 }");

    for (const placeholder of placeholders) {
      expect(query).not.toContain(placeholder);
    }
  });

  it.each([
    { cycleKey: Number.NaN, employeeId: 1 },
    { cycleKey: "", employeeId: 1 },
    { cycleKey: 202608, employeeId: Number.NaN },
    { cycleKey: 202608, employeeId: "  " },
  ])("rejects invalid identity input %#", (params) => {
    expect(() =>
      teamEmployeeDetails(params),
    ).toThrow();
  });
});
