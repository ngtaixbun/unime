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
import teamEmployeeDetailsDax from "./team-employee-details.dax?raw";

const connection = "unimeModel";

export interface TeamEmployeeDetailsQueryParams {
  cycleKey: DimDateCycleValue;
  employeeId: string | number;
  filters?: OrgQueryFilters;
}

export const teamEmployeeDetailsQuery =
  teamEmployeeDetailsDax.trim();

export const teamEmployeeDetailsColumnMetadata:
  ColumnMetadataMap = {
    "[employeeId]": {
      name: "employeeId",
      displayName: "Employee ID",
    },
    "[employeeCode]": {
      name: "employeeCode",
      displayName: "Mã nhân viên",
    },
    "[employeeLabel]": {
      name: "employeeLabel",
      displayName: "Nhân viên",
    },
    "[regionLabel]": {
      name: "regionLabel",
      displayName: "Khu vực",
    },
    "[ammLabel]": {
      name: "ammLabel",
      displayName: "AMM",
    },
    "[supervisorLabel]": {
      name: "supervisorLabel",
      displayName: "Mer Sup",
    },
    "[nppLabel]": {
      name: "nppLabel",
      displayName: "NPP",
    },
    "[kpiId]": {
      name: "kpiId",
      displayName: "KPI ID",
    },
    "[kpiLabel]": {
      name: "kpiLabel",
      displayName: "KPI",
    },
    "[actual]": {
      name: "actual",
      displayName: "Actual KPI Selected",
    },
    "[target]": {
      name: "target",
      displayName: "Target KPI Selected",
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
        `${parameterName} chi tiết nhân viên không hợp lệ.`,
      );
    }

    return String(value);
  }

  const normalized = value.trim();

  if (normalized === "") {
    throw new Error(
      `${parameterName} chi tiết nhân viên đang trống.`,
    );
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}

export function teamEmployeeDetails({
  cycleKey,
  employeeId,
  filters = {},
}: TeamEmployeeDetailsQueryParams) {
  const placeholders = [
    "__SELECTED_CYCLE_KEY__",
    "__SELECTED_EMPLOYEE_ID__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ] as const;

  for (const placeholder of placeholders) {
    if (!teamEmployeeDetailsQuery.includes(placeholder)) {
      throw new Error(
        `Template teamEmployeeDetails thiếu ${placeholder}.`,
      );
    }
  }

  const query = teamEmployeeDetailsQuery
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
      `Không thể áp dụng ${unresolved} vào teamEmployeeDetails.`,
    );
  }

  return {
    connection,
    query,
    columnMetadata:
      teamEmployeeDetailsColumnMetadata,
  };
}
