import {
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter.js";

export type TeamEmployeeDetailsScalar =
  | number
  | string;

export interface TeamEmployeeDetailsParams {
  cycleKey:
    TeamEmployeeDetailsScalar;

  employeeId:
    TeamEmployeeDetailsScalar;

  filters?:
    OrgQueryFilters;
}

export const teamEmployeeDetailsColumns = [
  "employeeId",
  "employeeCode",
  "employeeLabel",
  "regionLabel",
  "ammLabel",
  "supervisorLabel",
  "nppLabel",
  "kpiId",
  "kpiLabel",
  "actual",
  "target",
  "percentage",
] as const;

const teamEmployeeDetailsTemplate = `
DEFINE
    VAR _SelectedCycleKey =
        __SELECTED_CYCLE_KEY__

    VAR _SelectedEmployeeId =
        __SELECTED_EMPLOYEE_ID__

EVALUATE
VAR _Rows =
    CALCULATETABLE(
        SELECTCOLUMNS(
            SUMMARIZECOLUMNS(
                'dimnv'[Employee_Id],
                'dimnv'[EmployeeCode],
                'dimnv'[FullName],
                'dimnv'[Region],
                'dimnv'[amm_name],
                'dimnv'[sup_name],
                'dimnv'[npp_name],
                'KPIname'[num],
                'KPIname'[KPI],

                "__keep",
                    1,

                "actual",
                    [Actual KPI Selected],

                "target",
                    [Target KPI Selected],

                "percentage",
                    [MTD KPI Selected]
            ),

            "employeeId",
                'dimnv'[Employee_Id],

            "employeeCode",
                'dimnv'[EmployeeCode],

            "employeeLabel",
                'dimnv'[FullName],

            "regionLabel",
                'dimnv'[Region],

            "ammLabel",
                'dimnv'[amm_name],

            "supervisorLabel",
                'dimnv'[sup_name],

            "nppLabel",
                'dimnv'[npp_name],

            "kpiId",
                'KPIname'[num],

            "kpiLabel",
                'KPIname'[KPI],

            "actual",
                [actual],

            "target",
                [target],

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
                { 1, 2, 3, 4, 5 },
                'KPIname'[num]
            )
        )

        __REGION_FILTER__
        __AMM_FILTER__
        __SUPERVISOR_FILTER__
    )

RETURN
FILTER(
    _Rows,
    NOT ISBLANK([employeeId])
        && NOT ISBLANK([employeeLabel])
        && [kpiId] >= 1
        && [kpiId] <= 5
)

ORDER BY
    [kpiId] ASC
`.trim();

function toDaxScalar(
  value:
    TeamEmployeeDetailsScalar,
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
        `${parameterName} chi tiết nhân viên không hợp lệ.`,
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
      `${parameterName} chi tiết nhân viên đang trống.`,
    );
  }

  return `"${normalized.replaceAll(
    '"',
    '""',
  )}"`;
}

export function buildTeamEmployeeDetailsDax({
  cycleKey,
  employeeId,
  filters = {},
}: TeamEmployeeDetailsParams): string {
  const placeholders = [
    "__SELECTED_CYCLE_KEY__",
    "__SELECTED_EMPLOYEE_ID__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ] as const;

  const query =
    teamEmployeeDetailsTemplate
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
      `Không thể áp dụng ${unresolved} vào chi tiết nhân viên.`,
    );
  }

  return query;
}
