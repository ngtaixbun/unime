import type {
  DimDateCycleValue,
} from "./dim-date";
import type {
  TimeViewValue,
} from "./timeview";
import {
  buildRegionFilter,
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter";
import { getAccessProfile } from "@/lib/access-session";
import { decodeDimensionValues, encodeDimensionValue, encodeDimensionValues } from "./org-filter";

export const COMMON_QUERY_PLACEHOLDERS = [
  "__SELECTED_CYCLE_KEY__",
  "__SELECTED_TIME_VIEW__",
  "__VALID_STORE_FILTER__",
  "__VALID_ROLE_FILTER__",
  "__REGION_FILTER__",
  "__AMM_FILTER__",
  "__SUPERVISOR_FILTER__",
  "__EMPLOYEE_FILTER__",
  "__NPP_FILTER__",
  "__COUNT_FAIL_FILTER__",
] as const;

export function buildValidStoreFilter(): string {
  return [
    ",",
    "    KEEPFILTERS(",
    "        FILTER(",
    "            ALL('dimstore'[ShopId]),",
    "            NOT ISBLANK('dimstore'[ShopId])",
    "        )",
    "    )",
  ].join("\n");
}

export const VALID_STORE_FILTER =
  buildValidStoreFilter();

export function applyTimeViewQueryContext(
  template: string,
  timeView: TimeViewValue,
  queryName: string,
): string {
  return replaceDaxPlaceholder(
    template,
    "__SELECTED_TIME_VIEW__",
    toDaxQueryScalar(
      timeView,
      "timeView",
      queryName,
    ),
    queryName,
  );
}

export const VALID_ROLE_FILTER = [
  ",",
  "    KEEPFILTERS(",
  "        FILTER(",
  "            ALL('dimnv'[Role]),",
  "            NOT ISBLANK('dimnv'[Role])",
  "                && LEN(TRIM('dimnv'[Role] & \"\")) > 0",
  "        )",
  "    )",
].join("\n");

export function buildValidRoleFilter(
  role:
    | OrgQueryFilters["role"]
    | undefined,
): string {
  return (
    VALID_ROLE_FILTER +
    buildTreatasFilter(
      role,
      "'dimnv'[Role]",
    )
  );
}

const FILTER_DEFINITIONS = [
  {
    key: "region",
    placeholder: "__REGION_FILTER__",
    targetColumn: "'dimnv'[Region ID]",
  },
  {
    key: "amm",
    placeholder: "__AMM_FILTER__",
    targetColumn: "'dimnv'[amm id]",
  },
  {
    key: "supervisor",
    placeholder: "__SUPERVISOR_FILTER__",
    targetColumn: "'dimnv'[Sup Clean ID]",
  },
  {
    key: "employee",
    placeholder: "__EMPLOYEE_FILTER__",
    targetColumn: "'dimnv'[Employee_Id]",
  },
  {
    key: "npp",
    placeholder: "__NPP_FILTER__",
    targetColumn: "'dimnv'[npp_id]",
  },
  {
    key: "countFail",
    placeholder: "__COUNT_FAIL_FILTER__",
    targetColumn: "'count_issue'[KPI_fail]",
  },
] as const satisfies ReadonlyArray<{
  key: keyof OrgQueryFilters;
  placeholder: string;
  targetColumn: string;
}>;

export interface SemanticQueryContext {
  cycleKey?: DimDateCycleValue;
  filters?: OrgQueryFilters;
  accessScope?:
    | "enforce"
    | "nationwide-benchmark";
}

function intersectWithAccessScope(filters: OrgQueryFilters, queryName: string): OrgQueryFilters {
  const profile = getAccessProfile();
  if (!profile || profile.accessLevel === "Nationwide") return filters;

  const encodeIds = (values: readonly (string | number)[] | undefined, fallback: string | number | null) =>
    encodeDimensionValues((values?.length ? values : fallback === null ? [] : [fallback]).map(encodeDimensionValue));
  const scope: Pick<OrgQueryFilters, "region" | "amm" | "supervisor"> = {
    region: profile.regionId === null ? undefined : encodeIds(profile.regionIds, profile.regionId),
    amm: profile.ammId === null ? undefined : encodeIds(profile.ammIds, profile.ammId),
    supervisor: profile.accessLevel === "Supervisor" && profile.supervisorId !== null
      ? encodeIds(profile.supervisorIds, profile.supervisorId)
      : undefined,
  };

  const effective = { ...filters };
  for (const key of ["region", "amm", "supervisor"] as const) {
    const scopedValue = scope[key];
    if (!scopedValue) continue;
    const requested = filters[key];
    const allowed = new Set(decodeDimensionValues(scopedValue));
    if (requested !== undefined && requested !== "all" && decodeDimensionValues(requested).some((value) => !allowed.has(value))) {
      throw new Error(`UserFilter ${key} nằm ngoài AccessScope của ${queryName}.`);
    }
    effective[key] = scopedValue;
  }
  return effective;
}

export function toDaxDateLiteral(
  value: string,
  parameterName: string,
  queryName: string,
): string {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(
      value.trim(),
    );

  if (!match) {
    throw new Error(
      `${parameterName} ${queryName} phải là ngày ISO hợp lệ.`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(
      `${parameterName} ${queryName} không phải ngày hợp lệ.`,
    );
  }

  return `DATE(${year}, ${month}, ${day})`;
}

export function toDaxQueryScalar(
  value: string | number,
  parameterName: string,
  queryName: string,
): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        `${parameterName} ${queryName} không hợp lệ.`,
      );
    }

    return String(value);
  }

  const normalized = value.trim();

  if (normalized === "") {
    throw new Error(
      `${parameterName} ${queryName} đang trống.`,
    );
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}

export function replaceDaxPlaceholder(
  query: string,
  placeholder: string,
  replacement: string,
  queryName: string,
): string {
  if (!query.includes(placeholder)) {
    throw new Error(
      `Template ${queryName} thiếu ${placeholder}.`,
    );
  }

  return query.replaceAll(
    placeholder,
    replacement,
  );
}

export function applySemanticQueryContext(
  template: string,
  {
    cycleKey,
    filters = {},
    accessScope = "enforce",
  }: SemanticQueryContext,
  queryName: string,
): string {
  let query = template;
  if (
    accessScope ===
    "enforce"
  ) {
    filters = intersectWithAccessScope(
      filters,
      queryName,
    );
  }

  if (
    query.includes(
      "__VALID_STORE_FILTER__",
    )
  ) {
    query = replaceDaxPlaceholder(
      query,
      "__VALID_STORE_FILTER__",
      VALID_STORE_FILTER,
      queryName,
    );
  }

  const cyclePlaceholder =
    "__SELECTED_CYCLE_KEY__";

  if (cycleKey !== undefined) {
    query = replaceDaxPlaceholder(
      query,
      cyclePlaceholder,
      toDaxQueryScalar(
        cycleKey,
        "cycleKey",
        queryName,
      ),
      queryName,
    );
  } else if (
    query.includes(cyclePlaceholder)
  ) {
    throw new Error(
      `Template ${queryName} cần cycleKey cho ${cyclePlaceholder}.`,
    );
  }

  if (
    query.includes(
      "__VALID_ROLE_FILTER__",
    )
  ) {
    query = replaceDaxPlaceholder(
      query,
      "__VALID_ROLE_FILTER__",
      buildValidRoleFilter(
        filters.role,
      ),
      queryName,
    );
  }

  for (const definition of FILTER_DEFINITIONS) {
    const value =
      filters[definition.key];
    const hasPlaceholder =
      query.includes(
        definition.placeholder,
      );
    const isActive =
      value !== undefined &&
      value !== "all";

    if (hasPlaceholder) {
      query = query.replaceAll(
        definition.placeholder,
        definition.key === "region"
          ? buildRegionFilter(value)
          : buildTreatasFilter(
              value,
              definition.targetColumn,
            ),
      );
    } else if (isActive) {
      throw new Error(
        `Template ${queryName} thiếu ${definition.placeholder} cho filter ${definition.key}.`,
      );
    }
  }

  const unresolved =
    COMMON_QUERY_PLACEHOLDERS.find(
      (placeholder) =>
        query.includes(placeholder),
    );

  if (unresolved) {
    throw new Error(
      `Không thể áp dụng ${unresolved} vào ${queryName}.`,
    );
  }

  return query;
}
