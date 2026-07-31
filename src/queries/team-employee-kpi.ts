import type {
  ColumnMetadataMap,
} from "@/lib/to-data-table";

import type {
  DimDateCycleValue,
} from "./dim-date";

import {
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter";

import teamEmployeeKpiDax from
  "./team-employee-kpi.dax?raw";

const connection =
  "unimeModel";

export interface TeamEmployeeKpiRow {
  employeeId:
    string | number;

  employeeLabel:
    string;

  regionId:
    string | number | null;

  ammId:
    string | number | null;

  supervisorId:
    string | number | null;

  actual:
    number | null;

  target:
    number | null;

  percentage:
    number | null;
}

export interface TeamEmployeeKpiQueryParams {
  cycleKey:
    DimDateCycleValue;

  kpiId:
    number;

  filters?:
    OrgQueryFilters;
}

export const teamEmployeeKpiQuery =
  teamEmployeeKpiDax.trim();

export const teamEmployeeKpiColumnMetadata:
  ColumnMetadataMap = {
    "[employeeId]": {
      name:
        "employeeId",
      displayName:
        "Mã nhân viên",
    },

    "[employeeLabel]": {
      name:
        "employeeLabel",
      displayName:
        "Nhân viên",
    },

    "[regionId]": {
      name:
        "regionId",
      displayName:
        "Mã khu vực",
    },

    "[ammId]": {
      name:
        "ammId",
      displayName:
        "AMM ID",
    },

    "[supervisorId]": {
      name:
        "supervisorId",
      displayName:
        "Supervisor ID",
    },

    "[actual]": {
      name:
        "actual",
      displayName:
        "Actual KPI Selected",
    },

    "[target]": {
      name:
        "target",
      displayName:
        "Target KPI Selected",
    },

    "[percentage]": {
      name:
        "percentage",
      displayName:
        "MTD KPI Selected",
      format:
        "0.0%",
    },
  };

function toCycleDaxScalar(
  value:
    DimDateCycleValue,
): string {
  if (
    typeof value ===
    "number"
  ) {
    if (
      !Number.isFinite(
        value,
      )
    ) {
      throw new Error(
        "cycleKey Team Employee KPI không hợp lệ.",
      );
    }

    return String(
      value,
    );
  }

  const normalized =
    value.trim();

  if (
    normalized === ""
  ) {
    throw new Error(
      "cycleKey Team Employee KPI đang trống.",
    );
  }

  return `"${normalized.replaceAll(
    '"',
    '""',
  )}"`;
}

function toKpiIdDaxScalar(
  value:
    number,
): string {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <= 0
  ) {
    throw new Error(
      "kpiId Team Employee KPI không hợp lệ.",
    );
  }

  return String(
    value,
  );
}

export function teamEmployeeKpi({
  cycleKey,
  kpiId,
  filters = {},
}: TeamEmployeeKpiQueryParams) {
  const placeholders = [
    "__SELECTED_CYCLE_KEY__",
    "__SELECTED_KPI_ID__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ] as const;

  for (
    const placeholder of
    placeholders
  ) {
    if (
      !teamEmployeeKpiQuery.includes(
        placeholder,
      )
    ) {
      throw new Error(
        `Template teamEmployeeKpi thiếu ${placeholder}.`,
      );
    }
  }

  const query =
    teamEmployeeKpiQuery
      .replace(
        "__SELECTED_CYCLE_KEY__",
        toCycleDaxScalar(
          cycleKey,
        ),
      )
      .replace(
        "__SELECTED_KPI_ID__",
        toKpiIdDaxScalar(
          kpiId,
        ),
      )
      .replace(
        "__REGION_FILTER__",
        buildTreatasFilter(
          filters.region,
          "'dimnv'[Region ID]",
        ),
      )
      .replace(
        "__AMM_FILTER__",
        buildTreatasFilter(
          filters.amm,
          "'dimnv'[amm_id]",
        ),
      )
      .replace(
        "__SUPERVISOR_FILTER__",
        buildTreatasFilter(
          filters.supervisor,
          "'dimnv'[sup_id]",
        ),
      );

  const unresolved =
    placeholders.find(
      (placeholder) =>
        query.includes(
          placeholder,
        ),
    );

  if (unresolved) {
    throw new Error(
      `Không thể áp dụng ${unresolved} vào teamEmployeeKpi.`,
    );
  }

  return {
    connection,
    query,
    columnMetadata:
      teamEmployeeKpiColumnMetadata,
  };
}
