import {
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_OVERVIEW_FILTERS,
} from "../lib";
import type {
  OverviewFilters,
} from "../types";

export interface UseOverviewFiltersResult {
  appliedFilters: OverviewFilters;
  draftFilters: OverviewFilters;
  appliedFilterCount: number;
  isFilterOpen: boolean;

  openFilterSheet: () => void;
  closeFilterSheet: () => void;

  updateDraftFilter: <
    Key extends keyof OverviewFilters,
  >(
    key: Key,
    value: OverviewFilters[Key],
  ) => void;

  clearDraftFilters: () => void;
  applyFilters: () => void;
}

function cloneFilters(
  filters: OverviewFilters,
): OverviewFilters {
  return {
    region: filters.region,
    amm: filters.amm,
    supervisor: filters.supervisor,
  };
}

function countAppliedFilters(
  filters: OverviewFilters,
): number {
  return (
    (filters.region !== "all" ? 1 : 0) +
    (filters.amm !== "all" ? 1 : 0) +
    (filters.supervisor !== "all" ? 1 : 0)
  );
}

export function useOverviewFilters():
  UseOverviewFiltersResult {
  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState<OverviewFilters>(
    () =>
      cloneFilters(
        DEFAULT_OVERVIEW_FILTERS,
      ),
  );

  const [
    draftFilters,
    setDraftFilters,
  ] = useState<OverviewFilters>(
    () =>
      cloneFilters(
        DEFAULT_OVERVIEW_FILTERS,
      ),
  );

  const [
    isFilterOpen,
    setIsFilterOpen,
  ] = useState(false);

  const appliedFilterCount =
    useMemo(
      () =>
        countAppliedFilters(
          appliedFilters,
        ),
      [appliedFilters],
    );

  function openFilterSheet() {
    setDraftFilters(
      cloneFilters(appliedFilters),
    );
    setIsFilterOpen(true);
  }

  function closeFilterSheet() {
    setDraftFilters(
      cloneFilters(appliedFilters),
    );
    setIsFilterOpen(false);
  }

  function updateDraftFilter<
    Key extends keyof OverviewFilters,
  >(
    key: Key,
    value: OverviewFilters[Key],
  ) {
    setDraftFilters(
      (current) => {
        if (key === "region") {
          return {
            region: value,
            amm: "all",
            supervisor: "all",
          };
        }

        if (key === "amm") {
          return {
            ...current,
            amm: value,
            supervisor: "all",
          };
        }

        return {
          ...current,
          supervisor: value,
        };
      },
    );
  }

  function clearDraftFilters() {
    setDraftFilters(
      cloneFilters(
        DEFAULT_OVERVIEW_FILTERS,
      ),
    );
  }

  function applyFilters() {
    setAppliedFilters(
      cloneFilters(draftFilters),
    );
    setIsFilterOpen(false);
  }

  return {
    appliedFilters,
    draftFilters,
    appliedFilterCount,
    isFilterOpen,

    openFilterSheet,
    closeFilterSheet,

    updateDraftFilter,
    clearDraftFilters,
    applyFilters,
  };
}

