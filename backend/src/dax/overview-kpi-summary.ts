import {
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter.js";

export type CycleKey =
  | number
  | string;

export interface OverviewKpiSummaryParams {
  cycleKey: CycleKey;
  filters?: OrgQueryFilters;
}

const kpiMtdTemplate = `
DEFINE
    VAR _SelectedCycleKey =
        __SELECTED_CYCLE_KEY__

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
            [nvfail_qc]
    ),

    KEEPFILTERS(
        TREATAS(
            { _SelectedCycleKey },
            'Date'[Chu kỳ KPI Key]
        )
    )
    __REGION_FILTER__
    __AMM_FILTER__
    __SUPERVISOR_FILTER__
)
`.trim();

function cycleKeyToDaxScalar(
  value: CycleKey,
): string {
  if (
    typeof value === "number"
  ) {
    if (
      !Number.isFinite(value)
    ) {
      throw new Error(
        "cycleKey KPI MTD không hợp lệ.",
      );
    }

    return String(value);
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

export function buildOverviewKpiSummaryDax({
  cycleKey,
  filters = {},
}: OverviewKpiSummaryParams): string {
  for (
    const placeholder of [
      "__SELECTED_CYCLE_KEY__",
      "__REGION_FILTER__",
      "__AMM_FILTER__",
      "__SUPERVISOR_FILTER__",
    ]
  ) {
    if (
      !kpiMtdTemplate.includes(
        placeholder,
      )
    ) {
      throw new Error(
        `Template KPI MTD thiếu ${placeholder}.`,
      );
    }
  }

  const query =
    kpiMtdTemplate
      .replace(
        "__SELECTED_CYCLE_KEY__",
        cycleKeyToDaxScalar(
          cycleKey,
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

  const unresolvedPlaceholders = [
    "__SELECTED_CYCLE_KEY__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ].filter(
    (placeholder) =>
      query.includes(
        placeholder,
      ),
  );

  if (
    unresolvedPlaceholders.length >
    0
  ) {
    throw new Error(
      "Không thể áp dụng filter vào KPI MTD.",
    );
  }

  return query;
}