import type {
  EncodedDimensionValue,
} from "@/queries/org-filter";

export interface OrganizationFilters {
  region: EncodedDimensionValue;
  amm: EncodedDimensionValue;
  supervisor: EncodedDimensionValue;
}

export interface OrganizationFilterOption {
  label: string;
  value: EncodedDimensionValue;
}

export interface OrganizationFilterOptions {
  regionOptions: OrganizationFilterOption[];
  ammOptions: OrganizationFilterOption[];
  supervisorOptions: OrganizationFilterOption[];

  isLoadingRegionOptions: boolean;
  isLoadingAmmOptions: boolean;
  isLoadingSupervisorOptions: boolean;

  regionOptionsError: string | null;
  ammOptionsError: string | null;
  supervisorOptionsError: string | null;
}

export interface OrganizationFilterLabels {
  region: string | null;
  amm: string | null;
  supervisor: string | null;
}

export interface OrganizationFilterState
  extends OrganizationFilterOptions {
  appliedFilters: OrganizationFilters;
  appliedFilterLabels: OrganizationFilterLabels;
  draftFilters: OrganizationFilters;
  appliedFilterCount: number;
  isFilterOpen: boolean;

  openFilterSheet: () => void;
  closeFilterSheet: () => void;

  updateDraftFilter: <
    Key extends keyof OrganizationFilters,
  >(
    key: Key,
    value: OrganizationFilters[Key],
  ) => void;

  clearDraftFilters: () => void;
  applyFilters: () => void;
}
