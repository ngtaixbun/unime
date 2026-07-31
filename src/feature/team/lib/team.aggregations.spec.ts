import { describe, expect, it } from "vitest";
import {
  getReportDateRange,
  selectReportDates,
  type ReportPeriod,
} from "@/lib/report-period";
import { TEAM_DATA } from "../data";
import { EMPTY_TEAM_FILTERS, TEAM_THRESHOLD } from "./team.constants";
import {
  aggregateTeamEmployeeRows,
  calculateTeamEmployeeTrend,
  calculateTeamEntityStats,
  calculateTeamRiskSummary,
  calculateTeamStreakRows,
  countFailedTeamMetrics,
} from "./team.aggregations";
import {
  filterTeamRows,
  selectCurrentTeamRows,
} from "./team.selectors";

const reportDate = "2026-06-10";
const currentRows = selectCurrentTeamRows(
  TEAM_DATA.rows,
  reportDate,
  EMPTY_TEAM_FILTERS,
);

function aggregatePeriod(
  period: ReportPeriod,
  filters = EMPTY_TEAM_FILTERS,
) {
  const reportDates = selectReportDates(
    TEAM_DATA.meta.dates,
    getReportDateRange(period, reportDate),
  );
  const rows = TEAM_DATA.rows.filter((row) => reportDates.includes(row.date));
  return aggregateTeamEmployeeRows(filterTeamRows(rows, filters));
}

describe("Team domain calculations", () => {
  it("preserves the complete team-data payload", () => {
    expect(TEAM_DATA.rows).toHaveLength(1_800);
    expect(TEAM_DATA.meta.dates).toHaveLength(10);
    expect(new Set(TEAM_DATA.rows.map((row) => row.empCode).filter(Boolean)).size).toBe(180);
    expect(currentRows).toHaveLength(180);
  });

  it("uses a strict 90% failure threshold", () => {
    const rowAtThreshold = { ...currentRows[0], qcPct: TEAM_THRESHOLD };
    const rowBelowThreshold = { ...rowAtThreshold, qcPct: TEAM_THRESHOLD - 0.0001 };

    expect(countFailedTeamMetrics(rowBelowThreshold)).toBe(
      countFailedTeamMetrics(rowAtThreshold) + 1,
    );
  });

  it("matches the source overview risk totals and rankings", () => {
    const summary = calculateTeamRiskSummary(
      currentRows,
      TEAM_DATA.rows,
      TEAM_DATA.meta.dates,
      reportDate,
      EMPTY_TEAM_FILTERS,
    );

    expect(summary.histogram).toEqual([0, 1, 17, 39, 67, 56]);
    expect(summary.groups).toEqual({ high: 162, watch: 18, safe: 0 });
    expect(summary.topKpi.metric.key).toBe("osa");
    expect(summary.topKpi.fails).toBe(180);
    expect(summary.maxStreak).toMatchObject({
      streak: 10,
      metric: { key: "calls" },
      row: { empCode: "A001069" },
    });
    expect(summary.topSup.map((item) => item.code)).toEqual(["3322", "3317", "3291"]);
    expect(summary.topNpp.map((item) => item.name)).toEqual([
      "MINH TAN (3312)",
      "HUY PHAT CAM RANH (3BD1)",
      "CONG LINH CN2 (3248)",
    ]);
  });

  it("aggregates entities without changing source order", () => {
    const regions = calculateTeamEntityStats(currentRows, "region", "qc");
    expect(regions.map((region) => region.id)).toEqual(["North", "Central", "MKD", "HCME"]);
    expect(regions.reduce((sum, region) => sum + region.rows.length, 0)).toBe(180);
  });

  it("aggregates Today, 7-day and MTD into one row per employee", () => {
    expect(aggregatePeriod("today")).toHaveLength(180);
    expect(aggregatePeriod("7days")).toHaveLength(180);
    expect(aggregatePeriod("mtd")).toHaveLength(180);
  });

  it("recalculates period percentages from aggregate actual and target", () => {
    const rows = aggregatePeriod("7days");
    const employee = rows.find((row) => row.empCode === "A001001");
    const sourceRows = TEAM_DATA.rows.filter(
      (row) =>
        row.empCode === "A001001" &&
        row.date >= "2026-06-04" &&
        row.date <= reportDate,
    );
    const actual = sourceRows.reduce((sum, row) => sum + row.callsActual, 0);
    const target = sourceRows.reduce((sum, row) => sum + row.callsTarget, 0);

    expect(employee?.callsActual).toBe(actual);
    expect(employee?.callsTarget).toBe(target);
    expect(employee?.callsPct).toBeCloseTo(actual / target, 12);
  });

  it("combines period and hierarchy filters without duplicate headcount", () => {
    const rows = aggregatePeriod("mtd", {
      region: "North",
      amm: "all",
      sup: "all",
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.region === "North")).toBe(true);
    expect(new Set(rows.map((row) => row.empCode)).size).toBe(rows.length);
  });

  it("classifies risk from employee-level period aggregates", () => {
    const rows = aggregatePeriod("mtd");
    const summary = calculateTeamRiskSummary(
      rows,
      TEAM_DATA.rows,
      TEAM_DATA.meta.dates,
      reportDate,
      EMPTY_TEAM_FILTERS,
    );

    expect(
      summary.groups.high + summary.groups.watch + summary.groups.safe,
    ).toBe(180);
    expect(summary.histogram.reduce((sum, count) => sum + count, 0)).toBe(180);
  });

  it("only returns streaks that continue through the selected date", () => {
    const streaks = calculateTeamStreakRows(
      currentRows,
      TEAM_DATA.rows,
      TEAM_DATA.meta.dates,
      reportDate,
      "qc",
      EMPTY_TEAM_FILTERS,
    );
    expect(streaks.every((item) => item.streak >= 2 && item.row.qcPct !== null && item.row.qcPct < TEAM_THRESHOLD)).toBe(
      true,
    );
    expect(streaks[0]).toMatchObject({ streak: 10, row: { empCode: "A001040" } });
  });

  it("builds seven-day trend deltas against the prior calendar row", () => {
    const points = calculateTeamEmployeeTrend(
      TEAM_DATA.rows,
      TEAM_DATA.meta.dates,
      "A001001",
      "qc",
      reportDate,
    );

    expect(points).toHaveLength(7);
    expect(points[0].date).toBe("2026-06-04");
    expect(points.at(-1)).toMatchObject({ date: reportDate, value: 0.7502 });
    expect(points.at(-1)?.delta).toBeCloseTo(0.7502 - 0.9093, 10);
  });
});
