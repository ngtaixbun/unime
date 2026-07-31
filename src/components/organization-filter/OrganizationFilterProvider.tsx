/* eslint-disable react-refresh/only-export-components -- provider and context form one shared organization-filter boundary */
import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  isEncodedDimensionValue,
} from "@/queries/org-filter";

import {
  DEFAULT_ORGANIZATION_FILTERS,
} from "./organization-filter.constants";
import type {
  OrganizationFilterLabels,
  OrganizationFilterOption,
  OrganizationFilters,
  OrganizationFilterState,
} from "./organization-filter.types";
import {
  useOrganizationFilterOptions,
} from "./useOrganizationFilterOptions";

export const OrganizationFilterContext =
  createContext<OrganizationFilterState | null>(
    null,
  );

function cloneFilters(
  filters: OrganizationFilters,
): OrganizationFilters {
  return {
    region: filters.region,
    amm: filters.amm,
    supervisor: filters.supervisor,
  };
}

function readFilterParam(
  params: URLSearchParams,
  name: string,
  fallbackName?: string,
) {
  const value =
    params.get(name) ??
    (
      fallbackName
        ? params.get(fallbackName)
        : null
    );

  return (
    value &&
    isEncodedDimensionValue(value)
      ? value
      : "all"
  );
}

function getInitialFilters():
  OrganizationFilters {
  const params =
    new URLSearchParams(
      window.location.search,
    );

  return {
    region:
      readFilterParam(
        params,
        "region",
      ),
    amm:
      readFilterParam(
        params,
        "amm",
      ),
    supervisor:
      readFilterParam(
        params,
        "supervisor",
        "sup",
      ),
  };
}

function getFilterLabel(
  value: OrganizationFilters[
    keyof OrganizationFilters
  ],
  options: OrganizationFilterOption[],
): string | null {
  if (value === "all") {
    return null;
  }

  return (
    options.find(
      (option) =>
        option.value === value,
    )?.label ??
    null
  );
}

function getFilterLabels(
  filters: OrganizationFilters,
  options: {
    regionOptions: OrganizationFilterOption[];
    ammOptions: OrganizationFilterOption[];
    supervisorOptions: OrganizationFilterOption[];
  },
): OrganizationFilterLabels {
  return {
    region: getFilterLabel(
      filters.region,
      options.regionOptions,
    ),
    amm: getFilterLabel(
      filters.amm,
      options.ammOptions,
    ),
    supervisor: getFilterLabel(
      filters.supervisor,
      options.supervisorOptions,
    ),
  };
}

function filtersEqual(
  left: OrganizationFilters,
  right: OrganizationFilters,
) {
  return (
    left.region === right.region &&
    left.amm === right.amm &&
    left.supervisor ===
      right.supervisor
  );
}

export function OrganizationFilterProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState<OrganizationFilters>(
    getInitialFilters,
  );

  const [
    draftFilters,
    setDraftFilters,
  ] = useState<OrganizationFilters>(
    getInitialFilters,
  );

  const [
    isFilterOpen,
    setIsFilterOpen,
  ] = useState(false);

  const [
    appliedFilterLabelSnapshot,
    setAppliedFilterLabelSnapshot,
  ] = useState<OrganizationFilterLabels>({
    region: null,
    amm: null,
    supervisor: null,
  });

  const options =
    useOrganizationFilterOptions(
      draftFilters,
    );

  const appliedFilterLabels =
    useMemo(() => {
      if (
        !filtersEqual(
          draftFilters,
          appliedFilters,
        )
      ) {
        return appliedFilterLabelSnapshot;
      }

      const resolved =
        getFilterLabels(
          appliedFilters,
          options,
        );

      return {
        region:
          resolved.region ??
          appliedFilterLabelSnapshot.region,
        amm:
          resolved.amm ??
          appliedFilterLabelSnapshot.amm,
        supervisor:
          resolved.supervisor ??
          appliedFilterLabelSnapshot.supervisor,
      };
    }, [
      appliedFilterLabelSnapshot,
      appliedFilters,
      draftFilters,
      options,
    ]);

  const appliedFilterCount =
    useMemo(
      () =>
        Object.values(
          appliedFilters,
        ).filter(
          (value) =>
            value !==
            DEFAULT_ORGANIZATION_FILTERS.region,
        ).length,
      [appliedFilters],
    );

  const openFilterSheet =
    useCallback(() => {
      setDraftFilters(
        cloneFilters(
          appliedFilters,
        ),
      );
      setIsFilterOpen(true);
    }, [appliedFilters]);

  const closeFilterSheet =
    useCallback(() => {
      setDraftFilters(
        cloneFilters(
          appliedFilters,
        ),
      );
      setIsFilterOpen(false);
    }, [appliedFilters]);

  const updateDraftFilter =
    useCallback(
      <
        Key extends keyof OrganizationFilters,
      >(
        key: Key,
        value: OrganizationFilters[Key],
      ) => {
        setDraftFilters(
          (current) => {
            if (
              key ===
              "region"
            ) {
              return {
                region: value,
                amm: "all",
                supervisor:
                  "all",
              };
            }

            if (
              key ===
              "amm"
            ) {
              return {
                ...current,
                amm: value,
                supervisor:
                  "all",
              };
            }

            return {
              ...current,
              supervisor:
                value,
            };
          },
        );
      },
      [],
    );

  const clearDraftFilters =
    useCallback(() => {
      setDraftFilters(
        cloneFilters(
          DEFAULT_ORGANIZATION_FILTERS,
        ),
      );
    }, []);

  const applyFilters =
    useCallback(() => {
      setAppliedFilters(
        cloneFilters(
          draftFilters,
        ),
      );
      setAppliedFilterLabelSnapshot(
        getFilterLabels(
          draftFilters,
          options,
        ),
      );
      setIsFilterOpen(false);
    }, [
      draftFilters,
      options,
    ]);

  const value =
    useMemo<OrganizationFilterState>(
      () => ({
        appliedFilters,
        appliedFilterLabels,
        draftFilters,
        appliedFilterCount,
        isFilterOpen,
        openFilterSheet,
        closeFilterSheet,
        updateDraftFilter,
        clearDraftFilters,
        applyFilters,
        ...options,
      }),
      [
        appliedFilterCount,
        appliedFilterLabels,
        appliedFilters,
        applyFilters,
        clearDraftFilters,
        closeFilterSheet,
        draftFilters,
        isFilterOpen,
        openFilterSheet,
        options,
        updateDraftFilter,
      ],
    );

  return (
    <OrganizationFilterContext.Provider
      value={value}
    >
      {children}
    </OrganizationFilterContext.Provider>
  );
}
