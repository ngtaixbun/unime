import {
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter.js";

export type TeamEmployeeTrendScalar =
  | number
  | string;

export interface TeamEmployeeTrendParams {
  cycleKey:
    TeamEmployeeTrendScalar;

  employeeId:
    TeamEmployeeTrendScalar;

  kpiId: number;

  filters?:
    OrgQueryFilters;
}

export const teamEmployeeTrendColumns = [
  "Date",
  "percentage",
] as const;

const teamEmployeeTrendTemplate = `
DEFINE
    VAR _SelectedCycleKey =
        __SELECTED_CYCLE_KEY__

    VAR _SelectedEmployeeId =
        __SELECTED_EMPLOYEE_ID__

    VAR _SelectedKpiId =
        __SELECTED_KPI_ID__

EVALUATE
VAR _Rows =
    CALCULATETABLE(
        SELECTCOLUMNS(
            SUMMARIZECOLUMNS(
                'Date'[Date],

                "percentage",
                    [MTD KPI Selected]
            ),

            "Date",
                'Date'[Date],

            "percentage",
                [percentage]
        ),

        KEEPFILTERS(
            TREATAS(
                { _SelectedCycleKey },
                'Date'[Chu kỳ KPI Key]
            )
        ),

        KEEPFILTERS(
            TREATAS(
                { _SelectedEmployeeId },
                'dimnv'[Employee_Id]
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

VAR _LastEightDates =
    TOPN(
        8,
        FILTER(
            _Rows,
            NOT ISBLANK([percentage])
        ),
        [Date],
        DESC
    )

RETURN
    _LastEightDates

ORDER BY
    [Date] ASC
`.trim();

function toDaxScalar(
  value:
    TeamEmployeeTrendScalar,
  parameterName: string,
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
        `${parameterName} trend nhân viên không hợp lệ.`,
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
      `${parameterName} trend nhân viên đang trống.`,
    );
  }

  return `"${normalized.replaceAll(
    '"',
    '""',
  )}"`;
}

function toKpiIdDaxScalar(
  value: number,
): string {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <= 0
  ) {
    throw new Error(
      "kpiId trend nhân viên không hợp lệ.",
    );
  }

  return String(value);
}

export function buildTeamEmployeeTrendDax({
  cycleKey,
  employeeId,
  kpiId,
  filters = {},
}: TeamEmployeeTrendParams): string {
  const placeholders = [
    "__SELECTED_CYCLE_KEY__",
    "__SELECTED_EMPLOYEE_ID__",
    "__SELECTED_KPI_ID__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ] as const;

  const query =
    teamEmployeeTrendTemplate
      .replace(
        "__SELECTED_CYCLE_KEY__",
        toDaxScalar(
          cycleKey,
          "cycleKey",
        ),
      )
      .replace(
        "__SELECTED_EMPLOYEE_ID__",
        toDaxScalar(
          employeeId,
          "employeeId",
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
      `Không thể áp dụng ${unresolved} vào trend nhân viên.`,
    );
  }

  return query;
}
