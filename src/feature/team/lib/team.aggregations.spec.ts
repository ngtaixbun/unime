import { describe, expect, it } from "vitest";
import { TEAM_DATA } from "../data";
import { EMPTY_TEAM_FILTERS, TEAM_THRESHOLD } from "./team.constants";
import {
  calculateTeamEmployeeTrend,
  calculateTeamEntityStats,
  calculateTeamRiskSummary,
  calculateTeamStreakRows,
  countFailedTeamMetrics,
} from "./team.aggregations";
import { selectCurrentTeamRows } from "./team.selectors";

const reportDate = "2026-06-10";
const currentRows = selectCurrentTeamRows(
  TEAM_DATA.rows,
  reportDate,
  EMPTY_TEAM_FILTERS,
);

describe("Team domain calculations", () => {
  it("preserves the complete team-data payload", () => {
    expect(TEAM_DATA.rows).toHaveLength(1_800);
    expect(TEAM_DATA.meta.dates).toHaveLength(10);
    expect(new Set(TEAM_DATA.rows.map((row) => row.empCode).filter(Boolean)).size).toBe(180);
    expect(currentRows).toHaveLength(180);
  });

  it("uses a strict 80% failure threshold", () => {
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

    expect(summary.histogram).toEqual([14, 54, 56, 37, 18, 1]);
    expect(summary.groups).toEqual({ high: 56, watch: 110, safe: 14 });
    expect(summary.topKpi.metric.key).toBe("qc");
    expect(summary.topKpi.fails).toBe(127);
    expect(summary.maxStreak).toMatchObject({
      streak: 10,
      metric: { key: "qc" },
      row: { empCode: "A001151" },
    });
    expect(summary.topSup.map((item) => item.code)).toEqual(["3322", "3317", "3275"]);
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

  it("only returns streaks that continue through the selected date", () => {
    const streaks = calculateTeamStreakRows(
      currentRows,
      TEAM_DATA.rows,
      TEAM_DATA.meta.dates,
      reportDate,
      "qc",
      EMPTY_TEAM_FILTERS,
    );
    expect(streaks.every((item) => item.streak >= 2 && item.row.qcPct < TEAM_THRESHOLD)).toBe(
      true,
    );
    expect(streaks[0]).toMatchObject({ streak: 10, row: { empCode: "A001151" } });
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
