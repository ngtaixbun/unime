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

import kpiMtdDax from
  "./kpimtd.dax?raw";

const connection =
  "unimeModel";

export type KpiMtdRow = {
  successfulCallsMtd:
    number | null;

  successfulCallsIssued:
    number | null;

  visitMtd:
    number | null;

  visitIssued:
    number | null;

  timeSpendMtd:
    number | null;

  timeSpendIssued:
    number | null;

  osaMtd:
    number | null;

  osaIssued:
    number | null;

  qcMtd:
    number | null;

  qcIssued:
    number | null;

  mtdKpiSelected:
    number | null;

  gap:
    number | null;

  nvFail:
    number | null;

  contributionNvFail:
    number | null;

  countNv:
    number | null;

  contributionNv:
    number | null;

  actual:
    number | null;

  target:
    number | null;
};

export interface KpiMtdQueryParams {
  cycleKey:
    DimDateCycleValue;

  /**
   * Overview giữ KPI ID mặc định là 1.
   * Team truyền kpi_id đang chọn từ dim-kpi.
   */
  kpiId?:
    number;

  filters?:
    OrgQueryFilters;
}

export const kpiMtdQuery =
  kpiMtdDax.trim();

export const columnMetadata:
  ColumnMetadataMap = {
    "[successfulCallsMtd]": {
      name:
        "successfulCallsMtd",
      displayName:
        "Successful Calls MTD",
    },

    "[successfulCallsIssued]": {
      name:
        "successfulCallsIssued",
      displayName:
        "NV rớt Successful Calls",
    },

    "[visitMtd]": {
      name:
        "visitMtd",
      displayName:
        "Tần suất viếng thăm MTD",
    },

    "[visitIssued]": {
      name:
        "visitIssued",
      displayName:
        "NV rớt Tần suất viếng thăm",
    },

    "[timeSpendMtd]": {
      name:
        "timeSpendMtd",
      displayName:
        "Time Spend MTD",
    },

    "[timeSpendIssued]": {
      name:
        "timeSpendIssued",
      displayName:
        "NV rớt Time Spend",
    },

    "[osaMtd]": {
      name:
        "osaMtd",
      displayName:
        "OSA MTD",
    },

    "[osaIssued]": {
      name:
        "osaIssued",
      displayName:
        "NV rớt OSA",
    },

    "[qcMtd]": {
      name:
        "qcMtd",
      displayName:
        "QC MTD",
    },

    "[qcIssued]": {
      name:
        "qcIssued",
      displayName:
        "NV rớt QC",
    },

    "[mtdKpiSelected]": {
      name:
        "mtdKpiSelected",
      displayName:
        "MTD KPI Selected",
    },

    "[gap]": {
      name:
        "gap",
      displayName:
        "Gap",
    },

    "[nvFail]": {
      name:
        "nvFail",
      displayName:
        "NV Fail",
    },

    "[contributionNvFail]": {
      name:
        "contributionNvFail",
      displayName:
        "Contribution NV Fail",
    },

    "[countNv]": {
      name:
        "countNv",
      displayName:
        "Count NV",
    },

    "[contributionNv]": {
      name:
        "contributionNv",
      displayName:
        "Contribution NV",
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
        "cycleKey KPI MTD không hợp lệ.",
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
      "cycleKey KPI MTD đang trống.",
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
      "kpiId KPI MTD không hợp lệ.",
    );
  }

  return String(
    value,
  );
}

export function kpiMtd({
  cycleKey,
  kpiId = 1,
  filters = {},
}: KpiMtdQueryParams) {
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
      !kpiMtdQuery.includes(
        placeholder,
      )
    ) {
      throw new Error(
        `Template kpiMtd thiếu ${placeholder}.`,
      );
    }
  }

  const query =
    kpiMtdQuery
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
      `Không thể áp dụng ${unresolved} vào kpiMtd.`,
    );
  }

  return {
    connection,
    query,
    columnMetadata,
  };
}