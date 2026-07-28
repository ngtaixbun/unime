import {
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter.js";

export type TrendCycleKey =
  | number
  | string;

export interface OverviewKpiTrendParams {
  cycleKey: TrendCycleKey;
  filters?: OrgQueryFilters;
}

const kpiMtdTrendTemplate = `
DEFINE
    VAR _SelectedCycleKey =
        __SELECTED_CYCLE_KEY__

    VAR _CycleDates =
        CALCULATETABLE(
            VALUES('Date'[Date]),

            KEEPFILTERS(
                TREATAS(
                    { _SelectedCycleKey },
                    'Date'[Chu kỳ KPI Key]
                )
            )
        )

    VAR _TrendRows =
        CALCULATETABLE(
            ADDCOLUMNS(
                _CycleDates,

                "successfulCallsMtd",
                    CALCULATE([mtd_call] * 100),

                "visitMtd",
                    CALCULATE([mtd_visit] * 100),

                "timeSpendMtd",
                    CALCULATE([mtd_timespend] * 100),

                "osaMtd",
                    CALCULATE([mtd_osa] * 100),

                "qcMtd",
                    CALCULATE([mtd_qc] * 100),

                "benchmark",
                    90.0
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

    VAR _ValidTrendRows =
        FILTER(
            _TrendRows,

            NOT ISBLANK([successfulCallsMtd])
                || NOT ISBLANK([visitMtd])
                || NOT ISBLANK([timeSpendMtd])
                || NOT ISBLANK([osaMtd])
                || NOT ISBLANK([qcMtd])
        )

EVALUATE
SELECTCOLUMNS(
    _ValidTrendRows,

    "Date",
        'Date'[Date],

    "successfulCallsMtd",
        [successfulCallsMtd],

    "visitMtd",
        [visitMtd],

    "timeSpendMtd",
        [timeSpendMtd],

    "osaMtd",
        [osaMtd],

    "qcMtd",
        [qcMtd],

    "benchmark",
        [benchmark]
)

ORDER BY
    [Date] ASC
`.trim();

function cycleKeyToDaxScalar(
  value: TrendCycleKey,
): string {
  if (
    typeof value === "number"
  ) {
    if (
      !Number.isFinite(value)
    ) {
      throw new Error(
        "cycleKey KPI trend không hợp lệ.",
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
      "cycleKey KPI trend đang trống.",
    );
  }

  return `"${normalized.replaceAll(
    '"',
    '""',
  )}"`;
}

export function buildOverviewKpiTrendDax({
  cycleKey,
  filters = {},
}: OverviewKpiTrendParams): string {
  const placeholders = [
    "__SELECTED_CYCLE_KEY__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ];

  for (
    const placeholder of
    placeholders
  ) {
    if (
      !kpiMtdTrendTemplate.includes(
        placeholder,
      )
    ) {
      throw new Error(
        `Template KPI trend thiếu ${placeholder}.`,
      );
    }
  }

  const query =
    kpiMtdTrendTemplate
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

  const unresolvedPlaceholders =
    placeholders.filter(
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
      "Không thể áp dụng filter vào KPI trend.",
    );
  }

  return query;
}