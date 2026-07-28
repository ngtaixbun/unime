import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  DimDateCycleValue,
  DimDateRow,
} from "@/queries/dim-date";

import {
  formatSemanticDateRange,
  getPeriodLabel,
} from "../lib";
import type { OverviewPeriod } from "../types";

function isSameCycleKey(
  left: DimDateCycleValue,
  right: DimDateCycleValue,
): boolean {
  return (
    typeof left === typeof right &&
    left === right
  );
}

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

export function useOverviewPeriod(
  cycles: DimDateRow[],
) {
  const [period, setPeriod] =
    useState<OverviewPeriod>("mtd");
  const latestCycle = useMemo(
    () => findLatestCycle(cycles),
    [cycles],
  );
  const [
    storedSelectedCycleKey,
    setSelectedCycleKey,
  ] = useState<DimDateCycleValue | null>(
    () => latestCycle?.cycleKey ?? null,
  );

  useEffect(() => {
    // Synchronize selection only when refreshed Semantic Model rows no longer
    // contain the selected key. The model-provided latest row is the reset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCycleKey((currentKey) => {
      const stillExists =
        currentKey !== null &&
        cycles.some((cycle) =>
          isSameCycleKey(
            cycle.cycleKey,
            currentKey,
          ),
        );

      return stillExists
        ? currentKey
        : latestCycle?.cycleKey ?? null;
    });
  }, [
    cycles,
    latestCycle,
  ]);

  const selectedCycleKey =
    storedSelectedCycleKey !== null &&
    cycles.some((cycle) =>
      isSameCycleKey(
        cycle.cycleKey,
        storedSelectedCycleKey,
      ),
    )
      ? storedSelectedCycleKey
      : latestCycle?.cycleKey ?? null;
  const selectedCycleIndex =
    useMemo(
      () =>
        selectedCycleKey === null
          ? -1
          : cycles.findIndex((cycle) =>
              isSameCycleKey(
                cycle.cycleKey,
                selectedCycleKey,
              ),
            ),
      [
        cycles,
        selectedCycleKey,
      ],
    );
  const selectedCycle =
    selectedCycleIndex === -1
      ? null
      : cycles[selectedCycleIndex];
  const latestCycleIndex =
    latestCycle == null
      ? -1
      : cycles.findIndex((cycle) =>
          isSameCycleKey(
            cycle.cycleKey,
            latestCycle.cycleKey,
          ),
        );
  const periodLabel = getPeriodLabel(period);
  const dateLabel = selectedCycle
    ? formatSemanticDateRange(
        selectedCycle.cycleStartDate,
        selectedCycle.cycleEndDate,
      )
    : "";
  const canGoPrevious =
    selectedCycleIndex > 0;
  const canGoNext =
    selectedCycleIndex >= 0 &&
    latestCycleIndex >= 0 &&
    selectedCycleIndex < latestCycleIndex;

  const goToPreviousDate =
    useCallback(() => {
      if (!canGoPrevious) {
        return;
      }

      setSelectedCycleKey(
        cycles[selectedCycleIndex - 1]
          .cycleKey,
      );
    }, [
      canGoPrevious,
      cycles,
      selectedCycleIndex,
    ]);

  const goToNextDate =
    useCallback(() => {
      if (!canGoNext) {
        return;
      }

      setSelectedCycleKey(
        cycles[selectedCycleIndex + 1]
          .cycleKey,
      );
    }, [
      canGoNext,
      cycles,
      selectedCycleIndex,
    ]);

  return {
    period,
    setPeriod,

    selectedCycle,
    selectedCycleKey,
    selectedCycleIndex,

    periodLabel,
    dateLabel,

    canGoPrevious,
    canGoNext,

    goToPreviousDate,
    goToNextDate,
  };
}
