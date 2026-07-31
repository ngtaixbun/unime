import {
  describe,
  expect,
  it,
} from "vitest";

import {
  teamEmployeeKpi,
} from "./team-employee-kpi";

const unresolvedPlaceholders = [
  "__SELECTED_CYCLE_KEY__",
  "__SELECTED_KPI_ID__",
  "__REGION_FILTER__",
  "__AMM_FILTER__",
  "__SUPERVISOR_FILTER__",
] as const;

describe(
  "teamEmployeeKpi",
  () => {
    it("injects cycleKey and kpiId and exposes the exact eight-column contract", () => {
      const config =
        teamEmployeeKpi({
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
      ).toContain(
        "'Date'[Chu kỳ KPI Key]",
      );
      expect(
        config.query,
      ).toContain(
        "'KPIname'[num]",
      );

      expect(
        Object.fromEntries(
          Object.entries(
            config.columnMetadata,
          ).map(
            ([key, value]) => [
              key,
              value.name,
            ],
          ),
        ),
      ).toEqual({
        "[employeeId]":
          "employeeId",
        "[employeeLabel]":
          "employeeLabel",
        "[regionId]":
          "regionId",
        "[ammId]":
          "ammId",
        "[supervisorId]":
          "supervisorId",
        "[actual]":
          "actual",
        "[target]":
          "target",
        "[percentage]":
          "percentage",
      });

      for (
        const alias of [
          "employeeId",
          "employeeLabel",
          "regionId",
          "ammId",
          "supervisorId",
          "actual",
          "target",
          "percentage",
        ]
      ) {
        expect(
          config.query,
        ).toContain(
          `"${alias}"`,
        );
      }
    });

    it("injects encoded Region, AMM and Supervisor filters into dimnv columns", () => {
      const { query } =
        teamEmployeeKpi({
          cycleKey:
            "2026-08",
          kpiId:
            4,
          filters: {
            region:
              "number:7",
            amm:
              "string:AMM-01",
            supervisor:
              'string:SUP"01',
          },
        });

      expect(query)
        .toContain(
          "{ 7 }",
        );
      expect(query)
        .toContain(
          "'dimnv'[Region ID]",
        );
      expect(query)
        .toContain(
          '{ "AMM-01" }',
        );
      expect(query)
        .toContain(
          "'dimnv'[amm_id]",
        );
      expect(query)
        .toContain(
          '{ "SUP""01" }',
        );
      expect(query)
        .toContain(
          "'dimnv'[sup_id]",
        );

      for (
        const placeholder of
        unresolvedPlaceholders
      ) {
        expect(query)
          .not.toContain(
            placeholder,
          );
      }
    });

    it("omits organization filters for all and leaves no unresolved placeholders", () => {
      const { query } =
        teamEmployeeKpi({
          cycleKey:
            202608,
          kpiId:
            1,
          filters: {
            region: "all",
            amm: "all",
            supervisor: "all",
          },
        });

      for (
        const placeholder of
        unresolvedPlaceholders
      ) {
        expect(query)
          .not.toContain(
            placeholder,
          );
      }
    });

    it.each([
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ])(
      "rejects invalid numeric cycleKey %s",
      (cycleKey) => {
        expect(() =>
          teamEmployeeKpi({
            cycleKey,
            kpiId: 1,
          }),
        ).toThrow(
          /cycleKey/,
        );
      },
    );

    it("rejects an empty cycleKey", () => {
      expect(() =>
        teamEmployeeKpi({
          cycleKey: "   ",
          kpiId: 1,
        }),
      ).toThrow(
        /cycleKey/,
      );
    });

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ])(
      "rejects invalid kpiId %s",
      (kpiId) => {
        expect(() =>
          teamEmployeeKpi({
            cycleKey: 202608,
            kpiId,
          }),
        ).toThrow(
          /kpiId/,
        );
      },
    );
  },
);
