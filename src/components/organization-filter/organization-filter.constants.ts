import type {
  OrganizationFilterOption,
  OrganizationFilters,
} from "./organization-filter.types";

export const DEFAULT_ORGANIZATION_FILTERS:
  Readonly<OrganizationFilters> = {
    region: "all",
    amm: "all",
    supervisor: "all",
  };

export const ALL_REGION_OPTION:
  OrganizationFilterOption = {
    label: "Tất cả khu vực",
    value: "all",
  };

export const ALL_AMM_OPTION:
  OrganizationFilterOption = {
    label: "Tất cả AMM",
    value: "all",
  };

export const ALL_SUPERVISOR_OPTION:
  OrganizationFilterOption = {
    label: "Tất cả Supervisor",
    value: "all",
  };
