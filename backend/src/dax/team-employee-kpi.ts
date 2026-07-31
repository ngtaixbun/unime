import {
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter.js";

export type TeamEmployeeKpiCycleKey =
  | number
  | string;

export interface TeamEmployeeKpiParams {
  cycleKey:
    TeamEmployeeKpiCycleKey;

  kpiId:
    number;

  filters?:
    OrgQueryFilters;
}

const teamEmployeeKpiTemplate = `
DEFINE
    VAR _SelectedCycleKey =
        __SELECTED_CYCLE_KEY__

    VAR _SelectedKpiId =
        __SELECTED_KPI_ID__

EVALUATE
VAR _Rows =
    CALCULATETABLE(
        SELECTCOLUMNS(
            SUMMARIZECOLUMNS(
                'dimnv'[Employee_Id],
                'dimnv'[FullName],
                'dimnv'[Region ID],
                'dimnv'[amm_id],
                'dimnv'[sup_id],

                "actual",
                    [Actual KPI Selected],

                "target",
                    [Target KPI Selected],

                "percentage",
                    [MTD KPI Selected]
            ),

            "employeeId",
                'dimnv'[Employee_Id],

            "employeeLabel",
                'dimnv'[FullName],

            "regionId",
                'dimnv'[Region ID],

            "ammId",
                'dimnv'[amm_id],

            "supervisorId",
                'dimnv'[sup_id],

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
                { _SelectedKpiId },
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
)

ORDER BY
    [percentage] ASC,
    [employeeLabel] ASC,
    [employeeId] ASC
`.trim();

function cycleKeyToDaxScalar(
  value:
    TeamEmployeeKpiCycleKey,
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
        "cycleKey KPI nhân viên không hợp lệ.",
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
      "cycleKey KPI nhân viên đang trống.",
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
      "kpiId KPI nhân viên không hợp lệ.",
    );
  }

  return String(
    value,
  );
}

export function buildTeamEmployeeKpiDax({
  cycleKey,
  kpiId,
  filters = {},
}: TeamEmployeeKpiParams): string {
  const placeholders = [
    "__SELECTED_CYCLE_KEY__",
    "__SELECTED_KPI_ID__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ] as const;

  const query =
    teamEmployeeKpiTemplate
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
      `Không thể áp dụng ${unresolved} vào KPI nhân viên.`,
    );
  }

  return query;
}
