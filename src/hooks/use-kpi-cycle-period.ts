import {
  useEffect,
  useMemo,
} from "react";

import { useReportPeriod } from "@/hooks/use-report-period";
import type { ReportPeriod } from "@/lib/report-period";
import type {
  DimDateCycleValue,
  DimDateRow,
} from "@/queries/dim-date";

import {
  formatSemanticDateRange,
  formatSemanticIsoDate,
} from "@/lib/semantic-date";

function findLatestCycle(
  cycles: DimDateRow[],
): DimDateRow | null {
  const latestCycles = cycles.filter(
    (cycle) => cycle.isLatestCycle,
  );

  return (
    latestCycles.at(-1) ??
    cycles.at(-1) ??
    null
  );
}

export function useKpiCyclePeriod(
  cycles: DimDateRow[],
  initial?: {
    period?: ReportPeriod | string | null;
    anchorDate?: string | null;
  },
) {
  const latestCycle = useMemo(
    () => findLatestCycle(cycles),
    [cycles],
  );
  const cycleDates = useMemo(
    () => {
      const latestCycleIndex = latestCycle
        ? cycles.findIndex(
            (cycle) => cycle.cycleKey === latestCycle.cycleKey,
          )
        : cycles.length - 1;
      return cycles.slice(0, latestCycleIndex + 1).flatMap((cycle) => {
      const date = formatSemanticIsoDate(cycle.cycleEndDate);
      return date ? [date] : [];
      });
    },
    [cycles, latestCycle],
  );
  const latestAnchorDate = latestCycle
    ? formatSemanticIsoDate(latestCycle.cycleEndDate)
    : null;
  const report = useReportPeriod({
    dates: cycleDates,
    initialPeriod: initial?.period,
    initialAnchorDate: initial?.anchorDate ?? latestAnchorDate,
  });
  const {
    anchorDate,
    setAnchorDate,
  } = report;
  useEffect(() => {
    if (
      anchorDate &&
      !cycleDates.includes(anchorDate) &&
      latestAnchorDate
    ) {
      // A semantic-model refresh invalidated the selected cycle.
      // Reset to the model-declared latest cycle, matching the existing contract.
      setAnchorDate(latestAnchorDate);
    }
  }, [
    anchorDate,
    cycleDates,
    latestAnchorDate,
    setAnchorDate,
  ]);
  const selectedCycleIndex = cycles.findIndex(
    (cycle) =>
      formatSemanticIsoDate(cycle.cycleEndDate) === anchorDate,
  );
  const selectedCycle =
    selectedCycleIndex === -1
      ? null
      : cycles[selectedCycleIndex];
  const selectedCycleKey: DimDateCycleValue | null =
    selectedCycle?.cycleKey ?? null;
  const dateLabel = selectedCycle
    ? formatSemanticDateRange(
        selectedCycle.cycleStartDate,
        selectedCycle.cycleEndDate,
      )
    : "";

  return {
    ...report,
    dateLabel,

    selectedCycle,
    selectedCycleKey,
    selectedCycleIndex,
  };
}
