import {
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter.js";

export type CycleKey =
  | number
  | string;

export interface OverviewKpiSummaryParams {
  cycleKey:
    CycleKey;

  kpiId?:
    number;

  filters?:
    OrgQueryFilters;
}

/**
 * Stable response contract consumed by both Overview and Team KPI queries.
 * Keep this list in DAX alias order so a deployed 16-column query cannot be
 * mistaken for the current 18-column contract.
 */
export const overviewKpiSummaryColumns = [
  "successfulCallsMtd",
  "successfulCallsIssued",
  "visitMtd",
  "visitIssued",
  "timeSpendMtd",
  "timeSpendIssued",
  "osaMtd",
  "osaIssued",
  "qcMtd",
  "qcIssued",
  "mtdKpiSelected",
  "gap",
  "nvFail",
  "contributionNvFail",
  "countNv",
  "contributionNv",
  "actual",
  "target",
] as const;

const kpiMtdTemplate = `
DEFINE
    VAR _SelectedCycleKey =
        __SELECTED_CYCLE_KEY__

    VAR _SelectedKpiId =
        __SELECTED_KPI_ID__

EVALUATE
CALCULATETABLE(
    ROW(
        "successfulCallsMtd",
            [mtd_call] * 100,

        "successfulCallsIssued",
            [nvfail_call],

        "visitMtd",
            [mtd_visit] * 100,

        "visitIssued",
            [nvfail_visit],

        "timeSpendMtd",
            [mtd_timespend] * 100,

        "timeSpendIssued",
            [nvfail_timespend],

        "osaMtd",
            [mtd_osa] * 100,

        "osaIssued",
            [nvfail_osa],

        "qcMtd",
            [mtd_qc] * 100,

        "qcIssued",
            [nvfail_qc],

        "mtdKpiSelected",
            [MTD KPI Selected],

        "gap",
            [gap],

        "nvFail",
            [nvfail],

        "contributionNvFail",
            [contribution_nvfail],

        "countNv",
            [count_nv],

        "contributionNv",
            [contribution_nv],

        "actual",
            [Actual KPI Selected],

        "target",
            [Target KPI Selected]
    ),

    KEEPFILTERS(
        TREATAS(
            { _SelectedCycleKey },
            'Date'[Chu kỳ KPI Key]
        )
    ),

    KEEPFILTERS(
        TREATAS(
            { _SelectedKpiId },
            'KPIname'[num]
        )
    )
    __REGION_FILTER__
    __AMM_FILTER__
    __SUPERVISOR_FILTER__
)
`.trim();

function cycleKeyToDaxScalar(
  value:
    CycleKey,
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

function kpiIdToDaxScalar(
  value: number,
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

export function buildOverviewKpiSummaryDax({
  cycleKey,
  kpiId = 1,
  filters = {},
}: OverviewKpiSummaryParams): string {
  const placeholders = [
    "__SELECTED_CYCLE_KEY__",
    "__SELECTED_KPI_ID__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ] as const;

  const query =
    kpiMtdTemplate
      .replace(
        "__SELECTED_CYCLE_KEY__",
        cycleKeyToDaxScalar(
          cycleKey,
        ),
      )
      .replace(
        "__SELECTED_KPI_ID__",
        kpiIdToDaxScalar(
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
      `Không thể áp dụng ${unresolved} vào KPI MTD.`,
    );
  }

  return query;
}
