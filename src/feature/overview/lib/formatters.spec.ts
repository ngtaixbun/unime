import { describe, expect, it } from "vitest";

import {
  formatPercent,
  formatSemanticDateRange,
  formatSemanticShortDate,
} from "./formatters";

describe("formatPercent", () => {
  it("renders Semantic Model KPI percentages with one decimal place", () => {
    expect(formatPercent(93)).toBe("93.0%");
    expect(formatPercent(95)).toBe("95.0%");
    expect(formatPercent(99)).toBe("99.0%");
    expect(formatPercent(102)).toBe("102.0%");
    expect(formatPercent(0.27)).toBe("0.3%");
  });
});

describe("Semantic Model date formatting", () => {
  it("formats ISO values without timezone conversion", () => {
    expect(
      formatSemanticDateRange(
        "2026-06-28T00:00:00.000",
        "2026-07-20T00:00:00.000",
      ),
    ).toBe("28/06 - 20/07");
  });

  it("supports Date and serialized SDK values", () => {
    const date = new Date(2026, 6, 21);
    const serialized = `/Date(${date.getTime()})/`;

    expect(
      formatSemanticShortDate(date),
    ).toBe("21/07");
    expect(
      formatSemanticShortDate(serialized),
    ).toBe("21/07");
  });

  it("rejects invalid date values safely", () => {
    expect(
      formatSemanticShortDate(
        "2026-02-31T00:00:00.000",
      ),
    ).toBeNull();
  });
});
