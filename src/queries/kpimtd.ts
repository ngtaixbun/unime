import type { ColumnMetadataMap } from "@/lib/to-data-table";
import type { DimDateCycleValue } from "./dim-date";
import {
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter";
import kpiMtdDax from "./kpimtd.dax?raw";

const connection = "unimeModel";

export type KpiMtdRow = {
  successfulCallsMtd: number | null;
  successfulCallsIssued: number | null;
  visitMtd: number | null;
  visitIssued: number | null;
  timeSpendMtd: number | null;
  timeSpendIssued: number | null;
  osaMtd: number | null;
  osaIssued: number | null;
  qcMtd: number | null;
  qcIssued: number | null;
};

export interface KpiMtdQueryParams {
  cycleKey: DimDateCycleValue;
  filters?: OrgQueryFilters;
}

export const kpiMtdQuery = kpiMtdDax.trim();

export const columnMetadata: ColumnMetadataMap = {
  "[successfulCallsMtd]": {
    name: "successfulCallsMtd",
    displayName: "Successful Calls MTD",
  },
  "[successfulCallsIssued]": {
    name: "successfulCallsIssued",
    displayName: "NV rớt Successful Calls",
  },
  "[visitMtd]": {
    name: "visitMtd",
    displayName: "Tần suất viếng thăm MTD",
  },
  "[visitIssued]": {
    name: "visitIssued",
    displayName: "NV rớt Tần suất viếng thăm",
  },
  "[timeSpendMtd]": {
    name: "timeSpendMtd",
    displayName: "Time Spend MTD",
  },
  "[timeSpendIssued]": {
    name: "timeSpendIssued",
    displayName: "NV rớt Time Spend",
  },
  "[osaMtd]": {
    name: "osaMtd",
    displayName: "OSA MTD",
  },
  "[osaIssued]": {
    name: "osaIssued",
    displayName: "NV rớt OSA",
  },
  "[qcMtd]": {
    name: "qcMtd",
    displayName: "QC MTD",
  },
  "[qcIssued]": {
    name: "qcIssued",
    displayName: "NV rớt QC",
  },
};

function toDaxScalar(
  value: DimDateCycleValue,
): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        "cycleKey KPI MTD không hợp lệ.",
      );
    }

    return String(value);
  }

  const normalized = value.trim();

  if (normalized === "") {
    throw new Error(
      "cycleKey KPI MTD đang trống.",
    );
  }

  return `"${normalized.replaceAll(
    '"',
    '""',
  )}"`;
}

export function kpiMtd({
  cycleKey,
  filters = {},
}: KpiMtdQueryParams) {
  for (const placeholder of [
    "__SELECTED_CYCLE_KEY__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ]) {
    if (
      !kpiMtdQuery.includes(
        placeholder,
      )
    ) {
      throw new Error(
        `Template kpiMtd thiếu ${placeholder}.`,
      );
    }
  }

  const query = kpiMtdQuery
    .replace(
      "__SELECTED_CYCLE_KEY__",
      toDaxScalar(cycleKey),
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

  if (
    query.includes("__SELECTED_") ||
    query.includes("__REGION_FILTER__") ||
    query.includes("__AMM_FILTER__") ||
    query.includes(
      "__SUPERVISOR_FILTER__",
    )
  ) {
    throw new Error(
      "Không thể áp dụng filter vào kpiMtd.",
    );
  }

  return {
    connection,
    query,
    columnMetadata:
      columnMetadata,
  };
}
