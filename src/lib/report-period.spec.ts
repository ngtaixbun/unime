import { describe, expect, it } from "vitest";

import {
  formatReportDateRange,
  getAdjacentReportDate,
  getReportDateRange,
  normalizeReportPeriod,
  resolveReportAnchorDate,
  selectReportDates,
} from "./report-period";

const dates = [
  "2026-06-01",
  "2026-06-02",
  "2026-06-03",
  "2026-06-04",
  "2026-06-05",
  "2026-06-06",
  "2026-06-07",
  "2026-06-08",
  "2026-06-09",
  "2026-06-10",
] as const;

describe("report period utilities", () => {
  it("builds the Today range and label", () => {
    const range = getReportDateRange("today", "2026-06-10");
    expect(range).toEqual({
      startDate: "2026-06-10",
      endDate: "2026-06-10",
    });
    expect(formatReportDateRange(range)).toBe("10/06/2026");
  });

  it("builds a maximum seven-calendar-day range ending at the anchor", () => {
    const range = getReportDateRange("7days", "2026-06-10");
    expect(range).toEqual({
      startDate: "2026-06-04",
      endDate: "2026-06-10",
    });
    expect(selectReportDates(dates, range)).toEqual(dates.slice(3));
    expect(formatReportDateRange(range)).toBe("04/06 - 10/06");
  });

  it("builds MTD from the first calendar day through the anchor", () => {
    const range = getReportDateRange("mtd", "2026-06-10");
    expect(range).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-10",
    });
    expect(selectReportDates(dates, range)).toEqual(dates);
    expect(formatReportDateRange(range)).toBe("01/06 - 10/06");
  });

  it("resolves previous, next and boundary navigation", () => {
    expect(getAdjacentReportDate(dates, "2026-06-05", -1)).toBe("2026-06-04");
    expect(getAdjacentReportDate(dates, "2026-06-05", 1)).toBe("2026-06-06");
    expect(getAdjacentReportDate(dates, "2026-06-01", -1)).toBeNull();
    expect(getAdjacentReportDate(dates, "2026-06-10", 1)).toBeNull();
  });

  it("clamps unavailable anchors and accepts the legacy period URL key", () => {
    expect(resolveReportAnchorDate(dates, "2026-07-23")).toBe("2026-06-10");
    expect(resolveReportAnchorDate(dates, "2026-05-01")).toBe("2026-06-01");
    expect(normalizeReportPeriod("seven-days")).toBe("7days");
  });
});
