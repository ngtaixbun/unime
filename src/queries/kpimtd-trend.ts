import type { ColumnMetadataMap } from "@/lib/to-data-table";
import type { DimDateCycleValue } from "./dim-date";
import {
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter";
import kpiMtdTrendDax from "./kpimtd-trend.dax?raw";

const connection = "unimeModel";

export type KpiMtdTrendRow = {
  Date: string;
  successfulCallsMtd: number | null;
  visitMtd: number | null;
  timeSpendMtd: number | null;
  osaMtd: number | null;
  qcMtd: number | null;
  benchmark: number;
};

export interface KpiMtdTrendQueryParams {
  cycleKey: DimDateCycleValue;
  filters?: OrgQueryFilters;
}

export const kpiMtdTrendQuery =
  kpiMtdTrendDax.trim();

export const kpiMtdTrendColumnMetadata:
  ColumnMetadataMap = {
    "[Date]": {
      name: "Date",
      displayName: "Ngày",
    },
    "[successfulCallsMtd]": {
      name: "successfulCallsMtd",
      displayName: "Successful Calls MTD",
    },
    "[visitMtd]": {
      name: "visitMtd",
      displayName: "Tần suất viếng thăm MTD",
    },
    "[timeSpendMtd]": {
      name: "timeSpendMtd",
      displayName: "Time Spend MTD",
    },
    "[osaMtd]": {
      name: "osaMtd",
      displayName: "OSA MTD",
    },
    "[qcMtd]": {
      name: "qcMtd",
      displayName: "QC MTD",
    },
    "[benchmark]": {
      name: "benchmark",
      displayName: "Benchmark",
    },
  };

function toDaxScalar(
  value: DimDateCycleValue,
): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        "cycleKey KPI trend không hợp lệ.",
      );
    }

    return String(value);
  }

  const normalized = value.trim();

  if (normalized === "") {
    throw new Error(
      "cycleKey KPI trend đang trống.",
    );
  }

  return `"${normalized.replaceAll(
    '"',
    '""',
  )}"`;
}

export function kpiMtdTrend({
  cycleKey,
  filters = {},
}: KpiMtdTrendQueryParams) {
  for (const placeholder of [
    "__SELECTED_CYCLE_KEY__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ]) {
    if (
      !kpiMtdTrendQuery.includes(
        placeholder,
      )
    ) {
      throw new Error(
        `Template kpiMtdTrend thiếu ${placeholder}.`,
      );
    }
  }

  const query = kpiMtdTrendQuery
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
      "Không thể áp dụng filter vào kpiMtdTrend.",
    );
  }

  return {
    connection,
    query,
    columnMetadata:
      kpiMtdTrendColumnMetadata,
  };
}
