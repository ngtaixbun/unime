import {
  act,
  renderHook,
} from "@testing-library/react";
import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  DimDateRow,
} from "@/queries/dim-date";

import { useOverviewPeriod } from "./useOverviewPeriod";

const cycles: DimDateRow[] = [
  {
    cycleKey: 202606,
    cycleLabel: "Tháng 06",
    cycleStartDate: "2026-05-28T00:00:00.000",
    cycleEndDate: "2026-06-27T00:00:00.000",
    cycleSort: 202606,
    isLatestCycle: false,
  },
  {
    cycleKey: 202607,
    cycleLabel: "Tháng 07",
    cycleStartDate: "2026-06-28T00:00:00.000",
    cycleEndDate: "2026-07-20T00:00:00.000",
    cycleSort: 202607,
    isLatestCycle: false,
  },
  {
    cycleKey: 202608,
    cycleLabel: "Tháng 08",
    cycleStartDate: "2026-07-21T00:00:00.000",
    cycleEndDate: "2026-07-23T00:00:00.000",
    cycleSort: 202608,
    isLatestCycle: true,
  },
];

describe("useOverviewPeriod", () => {
  it("selects the Semantic Model latest cycle by default", () => {
    const { result } = renderHook(
      () => useOverviewPeriod(cycles),
    );

    expect(result.current.period).toBe("mtd");
    expect(result.current.periodLabel).toBe("MTD");
    expect(result.current.selectedCycleKey).toBe(202608);
    expect(result.current.selectedCycle).toEqual(cycles[2]);
    expect(result.current.selectedCycleIndex).toBe(2);
    expect(result.current.dateLabel).toBe(
      "21/07 - 23/07",
    );
    expect(result.current.canGoPrevious).toBe(true);
    expect(result.current.canGoNext).toBe(false);
  });

  it("falls back to the greatest sorted cycle when no row is marked latest", () => {
    const withoutLatest = cycles.map(
      (cycle) => ({
        ...cycle,
        isLatestCycle: false,
      }),
    );

    const { result } = renderHook(
      () => useOverviewPeriod(withoutLatest),
    );

    expect(result.current.selectedCycleKey).toBe(202608);
    expect(result.current.selectedCycleIndex).toBe(2);
    expect(result.current.canGoNext).toBe(false);
  });

  it("moves only between adjacent Semantic Model rows and respects both boundaries", () => {
    const { result } = renderHook(
      () => useOverviewPeriod(cycles),
    );

    act(() => {
      result.current.goToPreviousDate();
    });

    expect(result.current.selectedCycleKey).toBe(202607);
    expect(result.current.selectedCycleIndex).toBe(1);
    expect(result.current.period).toBe("mtd");
    expect(result.current.dateLabel).toBe(
      "28/06 - 20/07",
    );
    expect(result.current.canGoPrevious).toBe(true);
    expect(result.current.canGoNext).toBe(true);

    act(() => {
      result.current.goToPreviousDate();
    });

    expect(result.current.selectedCycleKey).toBe(202606);
    expect(result.current.selectedCycleIndex).toBe(0);
    expect(result.current.canGoPrevious).toBe(false);

    act(() => {
      result.current.goToPreviousDate();
    });

    expect(result.current.selectedCycleKey).toBe(202606);

    act(() => {
      result.current.goToNextDate();
      result.current.goToNextDate();
    });

    expect(result.current.selectedCycleKey).toBe(202607);

    act(() => {
      result.current.goToNextDate();
    });

    expect(result.current.selectedCycleKey).toBe(202608);
    expect(result.current.canGoNext).toBe(false);
    expect(result.current.period).toBe("mtd");

    act(() => {
      result.current.goToNextDate();
    });

    expect(result.current.selectedCycleKey).toBe(202608);
  });

  it("does not navigate beyond a flagged latest row when later rows exist", () => {
    const rowsWithFutureCycle: DimDateRow[] = [
      ...cycles,
      {
        cycleKey: 202609,
        cycleLabel: "Tháng 09",
        cycleStartDate: "2026-07-22",
        cycleEndDate: "2026-08-20",
        cycleSort: 202609,
        isLatestCycle: false,
      },
    ];
    const { result } = renderHook(
      () =>
        useOverviewPeriod(
          rowsWithFutureCycle,
        ),
    );

    expect(
      result.current.selectedCycleKey,
    ).toBe(202608);
    expect(result.current.canGoNext).toBe(
      false,
    );

    act(() => {
      result.current.goToNextDate();
    });

    expect(
      result.current.selectedCycleKey,
    ).toBe(202608);
  });

  it("keeps the selected key when refreshed rows still contain it", () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useOverviewPeriod(rows),
      {
        initialProps: {
          rows: cycles,
        },
      },
    );

    act(() => {
      result.current.goToPreviousDate();
    });

    const refreshedCycles = cycles.map(
      (cycle) => ({
        ...cycle,
        cycleLabel: `${cycle.cycleLabel} refreshed`,
      }),
    );

    rerender({
      rows: refreshedCycles,
    });

    expect(result.current.selectedCycleKey).toBe(202607);
    expect(result.current.selectedCycle?.cycleLabel).toBe(
      "Tháng 07 refreshed",
    );
  });

  it("resets to the refreshed latest row when the selected cycle disappears", () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useOverviewPeriod(rows),
      {
        initialProps: {
          rows: cycles,
        },
      },
    );

    act(() => {
      result.current.goToPreviousDate();
    });
    expect(result.current.selectedCycleKey).toBe(202607);

    const refreshedCycles: DimDateRow[] = [
      cycles[0],
      {
        cycleKey: 202609,
        cycleLabel: "Tháng 09",
        cycleStartDate: "2026-07-22",
        cycleEndDate: "2026-08-20",
        cycleSort: 202609,
        isLatestCycle: true,
      },
    ];

    rerender({
      rows: refreshedCycles,
    });

    expect(result.current.selectedCycleKey).toBe(202609);
    expect(result.current.selectedCycleIndex).toBe(1);
    expect(result.current.dateLabel).toBe(
      "22/07 - 20/08",
    );
  });

  it("uses the Semantic Model cycle boundaries without deriving calendar-month dates", () => {
    const semanticRange: DimDateRow[] = [
      {
        cycleKey: "202607",
        cycleLabel: "Tháng 07",
        cycleStartDate: "2026-06-28",
        cycleEndDate: "2026-07-20",
        cycleSort: "202607",
        isLatestCycle: true,
      },
    ];

    const { result } = renderHook(
      () => useOverviewPeriod(semanticRange),
    );

    expect(result.current.dateLabel).toBe(
      "28/06 - 20/07",
    );
    expect(result.current.selectedCycle?.cycleStartDate).toBe(
      "2026-06-28",
    );
    expect(result.current.selectedCycle?.cycleEndDate).toBe(
      "2026-07-20",
    );
  });

  it("does not lose the selected cycle when Today or 7 Ngày is selected", () => {
    const { result } = renderHook(
      () => useOverviewPeriod(cycles),
    );

    act(() => {
      result.current.goToPreviousDate();
    });
    expect(result.current.selectedCycleKey).toBe(202607);

    act(() => {
      result.current.setPeriod("today");
    });
    expect(result.current.selectedCycleKey).toBe(202607);

    act(() => {
      result.current.setPeriod("7days");
    });
    expect(result.current.selectedCycleKey).toBe(202607);
  });

  it("returns a safe empty selection when no cycles are available", () => {
    const { result } = renderHook(
      () => useOverviewPeriod([]),
    );

    expect(result.current.selectedCycle).toBeNull();
    expect(result.current.selectedCycleKey).toBeNull();
    expect(result.current.selectedCycleIndex).toBe(-1);
    expect(result.current.dateLabel).toBe("");
    expect(result.current.canGoPrevious).toBe(false);
    expect(result.current.canGoNext).toBe(false);

    act(() => {
      result.current.goToPreviousDate();
      result.current.goToNextDate();
    });

    expect(result.current.selectedCycleKey).toBeNull();
  });
});
