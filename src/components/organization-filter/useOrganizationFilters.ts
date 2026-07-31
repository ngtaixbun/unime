import {
  useContext,
} from "react";

import {
  OrganizationFilterContext,
} from "./OrganizationFilterProvider";
import type {
  OrganizationFilterState,
} from "./organization-filter.types";

export function useOrganizationFilters():
  OrganizationFilterState {
  const value =
    useContext(
      OrganizationFilterContext,
    );

  if (!value) {
    throw new Error(
      "useOrganizationFilters must be used inside OrganizationFilterProvider",
    );
  }

  return value;
}
