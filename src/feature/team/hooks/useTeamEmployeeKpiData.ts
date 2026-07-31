import {
  useMemo,
} from "react";

import type {
  CachedQueryResult,
  QueryTable,
} from "@microsoft/fabric-app-data";

import type {
  OrganizationFilters,
} from "@/components/organization-filter";
import {
  useSemanticModelQuery,
} from "@/hooks/use-semantic-model-query";
import {
  encodeDimensionValue,
} from "@/queries/org-filter";
import {
  teamEmployeeKpi,
} from "@/queries/team-employee-kpi";

export type TeamEmployeeKpiStatus =
  | "fail"
  | "pass"
  | "no-data";

export interface TeamEmployeeKpiViewRow {
  key: string;
  employeeId:
    string | number;
  employeeLabel: string;
  regionId:
    string | number | null;
  ammId:
    string | number | null;
  supervisorId:
    string | number | null;
  actual:
    number | null;
  target:
    number | null;
  percentage:
    number | null;
  status:
    TeamEmployeeKpiStatus;
}

export interface ParsedTeamEmployeeKpiData {
  rows:
    TeamEmployeeKpiViewRow[];
  error:
    string | null;
}

export interface UseTeamEmployeeKpiDataResult {
  rows:
    TeamEmployeeKpiViewRow[];
  isLoading: boolean;
  error:
    string | null;
  retry:
    () => Promise<void>;
}

interface UseTeamEmployeeKpiDataParams {
  cycleKey:
    string | number | null;
  kpiId:
    number | null;
  filters:
    OrganizationFilters;
  enabled?: boolean;
}

const REQUIRED_COLUMNS = [
  "[employeeId]",
  "[employeeLabel]",
  "[regionId]",
  "[ammId]",
  "[supervisorId]",
  "[actual]",
  "[target]",
  "[percentage]",
] as const;

const INVALID_COLUMNS_ERROR =
  "Semantic Model trả cấu trúc KPI nhân viên không hợp lệ.";

function isDimensionId(
  value: unknown,
): value is string | number {
  return (
    (
      typeof value ===
        "number" &&
      Number.isFinite(value)
    ) ||
    (
      typeof value ===
        "string" &&
      value.trim() !== ""
    )
  );
}

function parseNullableDimensionId(
  value: unknown,
): {
  valid: boolean;
  value:
    string | number | null;
} {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return {
      valid: true,
      value: null,
    };
  }

  return isDimensionId(value)
    ? {
        valid: true,
        value,
      }
    : {
        valid: false,
        value: null,
      };
}

function parseNullableNumber(
  value: unknown,
): {
  valid: boolean;
  value:
    number | null;
} {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return {
      valid: true,
      value: null,
    };
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed)
    ? {
        valid: true,
        value: parsed,
      }
    : {
        valid: false,
        value: null,
      };
}

export function getTeamEmployeeKpiStatus(
  percentage:
    number | null,
): TeamEmployeeKpiStatus {
  if (
    percentage === null ||
    !Number.isFinite(
      percentage,
    )
  ) {
    return "no-data";
  }

  return percentage < 0.9
    ? "fail"
    : "pass";
}

export function parseTeamEmployeeKpiData(
  table:
    QueryTable,
): ParsedTeamEmployeeKpiData {
  const indexes =
    Object.fromEntries(
      REQUIRED_COLUMNS.map(
        (columnName) => [
          columnName,
          table.columns.findIndex(
            (column) =>
              column.name ===
              columnName,
          ),
        ],
      ),
    ) as Record<
      (typeof REQUIRED_COLUMNS)[number],
      number
    >;

  if (
    Object.values(indexes).some(
      (index) => index < 0,
    )
  ) {
    return {
      rows: [],
      error:
        INVALID_COLUMNS_ERROR,
    };
  }

  const rows:
    TeamEmployeeKpiViewRow[] = [];
  const seenEmployeeIds =
    new Set<string>();

  for (
    let rowIndex = 0;
    rowIndex < table.rows.length;
    rowIndex += 1
  ) {
    const row =
      table.rows[rowIndex];
    const employeeId =
      row[
        indexes["[employeeId]"]
      ];
    const rawEmployeeLabel =
      row[
        indexes["[employeeLabel]"]
      ];
    const regionId =
      parseNullableDimensionId(
        row[
          indexes["[regionId]"]
        ],
      );
    const ammId =
      parseNullableDimensionId(
        row[
          indexes["[ammId]"]
        ],
      );
    const supervisorId =
      parseNullableDimensionId(
        row[
          indexes[
            "[supervisorId]"
          ]
        ],
      );
    const actual =
      parseNullableNumber(
        row[
          indexes["[actual]"]
        ],
      );
    const target =
      parseNullableNumber(
        row[
          indexes["[target]"]
        ],
      );
    const percentage =
      parseNullableNumber(
        row[
          indexes["[percentage]"]
        ],
      );

    if (
      !isDimensionId(
        employeeId,
      ) ||
      typeof rawEmployeeLabel !==
        "string" ||
      rawEmployeeLabel.trim() ===
        "" ||
      !regionId.valid ||
      !ammId.valid ||
      !supervisorId.valid ||
      !actual.valid ||
      !target.valid ||
      !percentage.valid
    ) {
      return {
        rows: [],
        error:
          `Semantic Model trả dữ liệu KPI nhân viên không hợp lệ tại dòng ${rowIndex + 1}.`,
      };
    }

    const key =
      encodeDimensionValue(
        employeeId,
      );

    if (
      seenEmployeeIds.has(key)
    ) {
      return {
        rows: [],
        error:
          `Semantic Model trả employeeId trùng lặp: ${String(employeeId)}.`,
      };
    }

    seenEmployeeIds.add(key);

    rows.push({
      key,
      employeeId,
      employeeLabel:
        rawEmployeeLabel.trim(),
      regionId:
        regionId.value,
      ammId:
        ammId.value,
      supervisorId:
        supervisorId.value,
      actual:
        actual.value,
      target:
        target.value,
      percentage:
        percentage.value,
      status:
        getTeamEmployeeKpiStatus(
          percentage.value,
        ),
    });
  }

  return {
    rows,
    error: null,
  };
}

function getResultError(
  data:
    CachedQueryResult |
    undefined,
  error:
    Error |
    undefined,
): string | null {
  return (
    error?.message ??
    (
      data?.status ===
        "error"
        ? data.error.message
        : null
    )
  );
}

export function useTeamEmployeeKpiData({
  cycleKey,
  kpiId,
  filters,
  enabled = true,
}: UseTeamEmployeeKpiDataParams):
  UseTeamEmployeeKpiDataResult {
  const isReady =
    cycleKey !== null &&
    kpiId !== null;

  const queryConfig =
    useMemo(
      () =>
        isReady
          ? teamEmployeeKpi({
              cycleKey,
              kpiId,
              filters,
            })
          : null,
      [
        cycleKey,
        filters,
        isReady,
        kpiId,
      ],
    );

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useSemanticModelQuery({
    connection:
      queryConfig?.connection ??
      "",
    query:
      queryConfig?.query ?? "",
    columnMetadata:
      queryConfig
        ?.columnMetadata,
    backendRequest:
      isReady
        ? {
            queryId:
              "team-employee-kpi",
            params: {
              cycleKey,
              kpiId,
              region:
                filters.region,
              amm:
                filters.amm,
              supervisor:
                filters.supervisor,
            },
          }
        : undefined,
    enabled:
      enabled && isReady,
  });

  const parsed =
    useMemo(
      () =>
        data?.status ===
        "success"
          ? parseTeamEmployeeKpiData(
              data.table,
            )
          : {
              rows: [],
              error: null,
            },
      [data],
    );

  const resultError =
    getResultError(
      data,
      queryError,
    ) ?? parsed.error;

  return {
    rows:
      resultError === null
        ? parsed.rows
        : [],
    isLoading:
      enabled &&
      isReady &&
      isLoading,
    error: resultError,
    retry: refetch,
  };
}
