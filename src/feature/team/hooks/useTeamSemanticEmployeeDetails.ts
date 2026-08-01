import {
  useCallback,
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
  teamEmployeeDetails,
} from "@/queries/team-employee-details";
import {
  teamEmployeeTrend,
} from "@/queries/team-employee-trend";

export interface TeamSemanticEmployeeKpi {
  kpiId: number;
  kpiLabel: string;
  actual: number | null;
  target: number | null;
  percentage: number | null;
}

export interface TeamSemanticEmployee {
  employeeId: string | number;
  employeeCode: string | number;
  employeeLabel: string;
  regionLabel: string | null;
  ammLabel: string | null;
  supervisorLabel: string | null;
  nppLabel: string | null;
  kpis: TeamSemanticEmployeeKpi[];
}

export interface TeamSemanticEmployeeTrendPoint {
  date: string;
  value: number | null;
  delta: number | null;
}

export interface ParsedTeamSemanticEmployeeDetails {
  employee: TeamSemanticEmployee | null;
  error: string | null;
}

export interface ParsedTeamSemanticEmployeeTrend {
  trend: TeamSemanticEmployeeTrendPoint[];
  error: string | null;
}

export interface UseTeamSemanticEmployeeDetailsParams {
  cycleKey: string | number | null;
  employeeId: string | number | null;
  kpiId: number | null;
  filters: OrganizationFilters;
  enabled?: boolean;
}

export interface UseTeamSemanticEmployeeDetailsResult {
  employee: TeamSemanticEmployee | null;
  trend: TeamSemanticEmployeeTrendPoint[];
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}

const DETAILS_COLUMNS = [
  "[employeeId]",
  "[employeeCode]",
  "[employeeLabel]",
  "[regionLabel]",
  "[ammLabel]",
  "[supervisorLabel]",
  "[nppLabel]",
  "[kpiId]",
  "[kpiLabel]",
  "[actual]",
  "[target]",
  "[percentage]",
] as const;

const TREND_COLUMNS = [
  "[Date]",
  "[percentage]",
] as const;

function getColumnIndexes<
  ColumnName extends string,
>(
  table: QueryTable,
  requiredColumns:
    readonly ColumnName[],
): Record<ColumnName, number> | null {
  const indexes = Object.fromEntries(
    requiredColumns.map(
      (columnName) => [
        columnName,
        table.columns.findIndex(
          (column) =>
            column.name ===
            columnName,
        ),
      ],
    ),
  ) as Record<ColumnName, number>;

  return requiredColumns.some(
    (columnName) =>
      indexes[columnName] < 0,
  )
    ? null
    : indexes;
}

function isDimensionValue(
  value: unknown,
): value is string | number {
  return (
    (
      typeof value === "number" &&
      Number.isFinite(value)
    ) ||
    (
      typeof value === "string" &&
      value.trim() !== ""
    )
  );
}

function parseRequiredLabel(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized === ""
    ? null
    : normalized;
}

function parseOptionalLabel(
  value: unknown,
): {
  valid: boolean;
  value: string | null;
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

  if (typeof value !== "string") {
    return {
      valid: false,
      value: null,
    };
  }

  const normalized = value.trim();
  return {
    valid: true,
    value:
      normalized === ""
        ? null
        : normalized,
  };
}

function parseNullableNumber(
  value: unknown,
): {
  valid: boolean;
  value: number | null;
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

function sameIdentity(
  left: string | number,
  right: string | number,
): boolean {
  return (
    typeof left === typeof right &&
    left === right
  );
}

export function parseTeamSemanticEmployeeDetails(
  table: QueryTable,
): ParsedTeamSemanticEmployeeDetails {
  const indexes = getColumnIndexes(
    table,
    DETAILS_COLUMNS,
  );

  if (indexes === null) {
    return {
      employee: null,
      error:
        "Semantic Model trả cấu trúc chi tiết nhân viên không hợp lệ.",
    };
  }

  if (table.rows.length === 0) {
    return {
      employee: null,
      error: null,
    };
  }

  let employee:
    TeamSemanticEmployee | null = null;
  const seenKpiIds = new Set<number>();

  for (
    let rowIndex = 0;
    rowIndex < table.rows.length;
    rowIndex += 1
  ) {
    const row = table.rows[rowIndex];
    const employeeId =
      row[indexes["[employeeId]"]];
    const employeeCode =
      row[indexes["[employeeCode]"]];
    const employeeLabel =
      parseRequiredLabel(
        row[indexes["[employeeLabel]"]],
      );
    const regionLabel = parseOptionalLabel(
      row[indexes["[regionLabel]"]],
    );
    const ammLabel = parseOptionalLabel(
      row[indexes["[ammLabel]"]],
    );
    const supervisorLabel = parseOptionalLabel(
      row[indexes["[supervisorLabel]"]],
    );
    const nppLabel = parseOptionalLabel(
      row[indexes["[nppLabel]"]],
    );
    const kpiId =
      row[indexes["[kpiId]"]];
    const kpiLabel = parseRequiredLabel(
      row[indexes["[kpiLabel]"]],
    );
    const actual = parseNullableNumber(
      row[indexes["[actual]"]],
    );
    const target = parseNullableNumber(
      row[indexes["[target]"]],
    );
    const percentage = parseNullableNumber(
      row[indexes["[percentage]"]],
    );

    if (
      !isDimensionValue(employeeId) ||
      !isDimensionValue(employeeCode) ||
      employeeLabel === null ||
      !regionLabel.valid ||
      !ammLabel.valid ||
      !supervisorLabel.valid ||
      !nppLabel.valid ||
      typeof kpiId !== "number" ||
      !Number.isSafeInteger(kpiId) ||
      kpiId <= 0 ||
      kpiLabel === null ||
      !actual.valid ||
      !target.valid ||
      !percentage.valid
    ) {
      return {
        employee: null,
        error:
          `Semantic Model trả chi tiết nhân viên không hợp lệ tại dòng ${rowIndex + 1}.`,
      };
    }

    if (employee === null) {
      employee = {
        employeeId,
        employeeCode,
        employeeLabel,
        regionLabel:
          regionLabel.value,
        ammLabel:
          ammLabel.value,
        supervisorLabel:
          supervisorLabel.value,
        nppLabel:
          nppLabel.value,
        kpis: [],
      };
    } else if (
      !sameIdentity(
        employee.employeeId,
        employeeId,
      ) ||
      !sameIdentity(
        employee.employeeCode,
        employeeCode,
      ) ||
      employee.employeeLabel !==
        employeeLabel
    ) {
      return {
        employee: null,
        error:
          "Semantic Model trả nhiều nhân viên trong một kết quả chi tiết.",
      };
    }

    if (seenKpiIds.has(kpiId)) {
      return {
        employee: null,
        error:
          `Semantic Model trả kpiId trùng lặp trong chi tiết nhân viên: ${kpiId}.`,
      };
    }

    seenKpiIds.add(kpiId);
    employee.kpis.push({
      kpiId,
      kpiLabel,
      actual: actual.value,
      target: target.value,
      percentage:
        percentage.value,
    });
  }

  employee?.kpis.sort(
    (left, right) =>
      left.kpiId - right.kpiId,
  );

  return {
    employee,
    error: null,
  };
}

function normalizeSemanticDate(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? normalized
    : null;
}

export function parseTeamSemanticEmployeeTrend(
  table: QueryTable,
): ParsedTeamSemanticEmployeeTrend {
  const indexes = getColumnIndexes(
    table,
    TREND_COLUMNS,
  );

  if (indexes === null) {
    return {
      trend: [],
      error:
        "Semantic Model trả cấu trúc trend nhân viên không hợp lệ.",
    };
  }

  const rawPoints: Array<{
    date: string;
    value: number | null;
  }> = [];
  const seenDates = new Set<string>();

  for (
    let rowIndex = 0;
    rowIndex < table.rows.length;
    rowIndex += 1
  ) {
    const row = table.rows[rowIndex];
    const date = normalizeSemanticDate(
      row[indexes["[Date]"]],
    );
    const percentage = parseNullableNumber(
      row[indexes["[percentage]"]],
    );

    if (
      date === null ||
      !percentage.valid
    ) {
      return {
        trend: [],
        error:
          `Semantic Model trả trend nhân viên không hợp lệ tại dòng ${rowIndex + 1}.`,
      };
    }

    if (seenDates.has(date)) {
      return {
        trend: [],
        error:
          `Semantic Model trả ngày trend nhân viên trùng lặp: ${date}.`,
      };
    }

    seenDates.add(date);
    rawPoints.push({
      date,
      value: percentage.value,
    });
  }

  rawPoints.sort(
    (left, right) =>
      left.date.localeCompare(right.date),
  );

  const pointsWithDelta = rawPoints.map(
    (point, index) => {
      const previous = rawPoints[index - 1];
      return {
        ...point,
        delta:
          point.value === null ||
          previous?.value === null ||
          previous?.value === undefined
            ? null
            : point.value - previous.value,
      };
    },
  );

  return {
    trend: pointsWithDelta.slice(-7),
    error: null,
  };
}

function getQueryError(
  data: CachedQueryResult | undefined,
  error: Error | undefined,
): string | null {
  return (
    error?.message ??
    (
      data?.status === "error"
        ? data.error.message
        : null
    )
  );
}

export function useTeamSemanticEmployeeDetails({
  cycleKey,
  employeeId,
  kpiId,
  filters,
  enabled = true,
}: UseTeamSemanticEmployeeDetailsParams):
  UseTeamSemanticEmployeeDetailsResult {
  const isReady =
    cycleKey !== null &&
    employeeId !== null &&
    kpiId !== null;

  const detailsConfig = useMemo(
    () =>
      isReady
        ? teamEmployeeDetails({
            cycleKey,
            employeeId,
            filters,
          })
        : null,
    [
      cycleKey,
      employeeId,
      filters,
      isReady,
    ],
  );

  const trendConfig = useMemo(
    () =>
      isReady
        ? teamEmployeeTrend({
            cycleKey,
            employeeId,
            kpiId,
            filters,
          })
        : null,
    [
      cycleKey,
      employeeId,
      filters,
      isReady,
      kpiId,
    ],
  );

  const detailsQuery = useSemanticModelQuery({
    connection:
      detailsConfig?.connection ?? "",
    query:
      detailsConfig?.query ?? "",
    columnMetadata:
      detailsConfig?.columnMetadata,
    backendRequest:
      isReady
        ? {
            queryId:
              "team-employee-details",
            params: {
              cycleKey,
              employeeId,
              region: filters.region,
              amm: filters.amm,
              supervisor:
                filters.supervisor,
            },
          }
        : undefined,
    enabled: enabled && isReady,
  });

  const trendQuery = useSemanticModelQuery({
    connection:
      trendConfig?.connection ?? "",
    query:
      trendConfig?.query ?? "",
    columnMetadata:
      trendConfig?.columnMetadata,
    backendRequest:
      isReady
        ? {
            queryId:
              "team-employee-trend",
            params: {
              cycleKey,
              employeeId,
              kpiId,
              region: filters.region,
              amm: filters.amm,
              supervisor:
                filters.supervisor,
            },
          }
        : undefined,
    enabled: enabled && isReady,
  });

  const parsedDetails = useMemo(
    () =>
      detailsQuery.data?.status ===
      "success"
        ? parseTeamSemanticEmployeeDetails(
            detailsQuery.data.table,
          )
        : {
            employee: null,
            error: null,
          },
    [detailsQuery.data],
  );

  const parsedTrend = useMemo(
    () =>
      trendQuery.data?.status ===
      "success"
        ? parseTeamSemanticEmployeeTrend(
            trendQuery.data.table,
          )
        : {
            trend: [],
            error: null,
          },
    [trendQuery.data],
  );

  const resultError =
    getQueryError(
      detailsQuery.data,
      detailsQuery.error,
    ) ??
    parsedDetails.error ??
    getQueryError(
      trendQuery.data,
      trendQuery.error,
    ) ??
    parsedTrend.error;

  const refetchDetails =
    detailsQuery.refetch;
  const refetchTrend =
    trendQuery.refetch;

  const retry = useCallback(
    async () => {
      await Promise.all([
        refetchDetails(),
        refetchTrend(),
      ]);
    }, [
      refetchDetails,
      refetchTrend,
    ],
  );

  return {
    employee:
      resultError === null
        ? parsedDetails.employee
        : null,
    trend:
      resultError === null
        ? parsedTrend.trend
        : [],
    isLoading:
      enabled &&
      isReady &&
      (
        detailsQuery.isLoading ||
        trendQuery.isLoading
      ),
    error: resultError,
    retry,
  };
}
