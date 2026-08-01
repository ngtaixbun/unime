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
import teamEmployeeTrendDax from "./team-employee-trend.dax?raw";

const connection = "unimeModel";

export interface TeamEmployeeTrendQueryParams {
  cycleKey: DimDateCycleValue;
  employeeId: string | number;
  kpiId: number;
  filters?: OrgQueryFilters;
}

export const teamEmployeeTrendQuery =
  teamEmployeeTrendDax.trim();

export const teamEmployeeTrendColumnMetadata:
  ColumnMetadataMap = {
    "[Date]": {
      name: "Date",
      displayName: "Ngày",
      format: "dd/mm/yyyy",
    },
    "[percentage]": {
      name: "percentage",
      displayName: "MTD KPI Selected",
      format: "0.0%",
    },
  };

function toInputDaxScalar(
  value: DimDateCycleValue,
  parameterName: string,
): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        `${parameterName} trend nhân viên không hợp lệ.`,
      );
    }

    return String(value);
  }

  const normalized = value.trim();

  if (normalized === "") {
    throw new Error(
      `${parameterName} trend nhân viên đang trống.`,
    );
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}

function toKpiIdDaxScalar(
  value: number,
): string {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      "kpiId trend nhân viên không hợp lệ.",
    );
  }

  return String(value);
}

export function teamEmployeeTrend({
  cycleKey,
  employeeId,
  kpiId,
  filters = {},
}: TeamEmployeeTrendQueryParams) {
  const placeholders = [
    "__SELECTED_CYCLE_KEY__",
    "__SELECTED_EMPLOYEE_ID__",
    "__SELECTED_KPI_ID__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ] as const;

  for (const placeholder of placeholders) {
    if (!teamEmployeeTrendQuery.includes(placeholder)) {
      throw new Error(
        `Template teamEmployeeTrend thiếu ${placeholder}.`,
      );
    }
  }

  const query = teamEmployeeTrendQuery
    .replace(
      "__SELECTED_CYCLE_KEY__",
      toInputDaxScalar(
        cycleKey,
        "cycleKey",
      ),
    )
    .replace(
      "__SELECTED_EMPLOYEE_ID__",
      toInputDaxScalar(
        employeeId,
        "employeeId",
      ),
    )
    .replace(
      "__SELECTED_KPI_ID__",
      toKpiIdDaxScalar(kpiId),
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

  const unresolved = placeholders.find(
    (placeholder) => query.includes(placeholder),
  );

  if (unresolved) {
    throw new Error(
      `Không thể áp dụng ${unresolved} vào teamEmployeeTrend.`,
    );
  }

  return {
    connection,
    query,
    columnMetadata:
      teamEmployeeTrendColumnMetadata,
  };
}
