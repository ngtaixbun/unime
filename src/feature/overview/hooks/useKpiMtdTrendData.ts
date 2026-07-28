import {
  useMemo,
} from "react";

import {
  useSemanticModelQuery,
} from "@/hooks/use-semantic-model-query";
import {
  toDataTable,
} from "@/lib/to-data-table";
import type {
  DimDateCycleValue,
} from "@/queries/dim-date";
import {
  kpiMtdTrend,
  type KpiMtdTrendRow,
} from "@/queries/kpimtd-trend";

import type {
  OverviewFilters,
} from "../types";

export interface UseKpiMtdTrendDataResult {
  rows: KpiMtdTrendRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_FILTERS: OverviewFilters = {
  region: "all",
  amm: "all",
  supervisor: "all",
};

const KPI_MTD_TREND_INVALID_ERROR =
  "Semantic Model trả dữ liệu xu hướng KPI MTD không hợp lệ";

const REQUIRED_QUERY_COLUMNS = [
  "[Date]",
  "[successfulCallsMtd]",
  "[visitMtd]",
  "[timeSpendMtd]",
  "[osaMtd]",
  "[qcMtd]",
  "[benchmark]",
] as const;

function toFiniteNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function toNullableFiniteNumber(
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
    toFiniteNumber(value);

  return {
    valid: parsed !== null,
    value: parsed,
  };
}

function toDateKey(
  value: unknown,
): string | null {
  if (value instanceof Date) {
    if (
      !Number.isFinite(
        value.getTime(),
      )
    ) {
      return null;
    }

    return [
      String(
        value.getFullYear(),
      ).padStart(4, "0"),
      String(
        value.getMonth() + 1,
      ).padStart(2, "0"),
      String(
        value.getDate(),
      ).padStart(2, "0"),
    ].join("-");
  }

  if (typeof value !== "string") {
    return null;
  }

  const isoMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/,
  );

  if (isoMatch) {
    return [
      isoMatch[1],
      isoMatch[2],
      isoMatch[3],
    ].join("-");
  }

  const serializedMatch = value.match(
    /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/,
  );

  if (!serializedMatch) {
    return null;
  }

  const parsedDate = new Date(
    Number(serializedMatch[1]),
  );

  if (
    !Number.isFinite(
      parsedDate.getTime(),
    )
  ) {
    return null;
  }

  return [
    String(
      parsedDate.getFullYear(),
    ).padStart(4, "0"),
    String(
      parsedDate.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      parsedDate.getDate(),
    ).padStart(2, "0"),
  ].join("-");
}

export function useKpiMtdTrendData(
  cycleKey: DimDateCycleValue | null,
  filters: OverviewFilters =
    DEFAULT_FILTERS,
): UseKpiMtdTrendDataResult {
  const {
    region,
    amm,
    supervisor,
  } = filters;

  const queryConfig = useMemo(
    () =>
      cycleKey === null
        ? null
        : kpiMtdTrend({
            cycleKey,
            filters: {
              region,
              amm,
              supervisor,
            },
          }),
    [
      cycleKey,
      region,
      amm,
      supervisor,
    ],
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSemanticModelQuery({
    connection:
      queryConfig?.connection ??
      "unimeModel",
    query:
      queryConfig?.query ??
      "",
    backendRequest:
      cycleKey === null
        ? undefined
        : {
            queryId:
              "overview-kpi-trend",
            params: {
              cycleKey,
              region,
              amm,
              supervisor,
            },
          },
  });

  let rows: KpiMtdTrendRow[] = [];
  let validationError:
    string | null = null;

  if (
    queryConfig !== null &&
    data?.status === "success"
  ) {
    const queryColumnNames =
      new Set(
        data.table.columns.map(
          (column) => column.name,
        ),
      );

    const hasMissingColumn =
      REQUIRED_QUERY_COLUMNS.some(
        (columnName) =>
          !queryColumnNames.has(
            columnName,
          ),
      );

    if (hasMissingColumn) {
      validationError =
        KPI_MTD_TREND_INVALID_ERROR;
    } else if (
      data.table.rows.length > 0
    ) {
      const table = toDataTable(
        data.table,
        queryConfig.columnMetadata,
      );

      const columnIndexes = {
        Date:
          table.columns.findIndex(
            (column) =>
              column.name === "Date",
          ),
        successfulCallsMtd:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "successfulCallsMtd",
          ),
        visitMtd:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "visitMtd",
          ),
        timeSpendMtd:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "timeSpendMtd",
          ),
        osaMtd:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "osaMtd",
          ),
        qcMtd:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "qcMtd",
          ),
        benchmark:
          table.columns.findIndex(
            (column) =>
              column.name ===
              "benchmark",
          ),
      };

      const hasMissingMappedColumn =
        Object.values(
          columnIndexes,
        ).some(
          (index) => index === -1,
        );

      if (hasMissingMappedColumn) {
        validationError =
          KPI_MTD_TREND_INVALID_ERROR;
      } else {
        for (
          const row of table.rows
        ) {
          const Date = toDateKey(
            row[columnIndexes.Date],
          );

          const successfulCallsMtd =
            toNullableFiniteNumber(
              row[
                columnIndexes
                  .successfulCallsMtd
              ],
            );
          const visitMtd =
            toNullableFiniteNumber(
              row[
                columnIndexes.visitMtd
              ],
            );
          const timeSpendMtd =
            toNullableFiniteNumber(
              row[
                columnIndexes
                  .timeSpendMtd
              ],
            );
          const osaMtd =
            toNullableFiniteNumber(
              row[
                columnIndexes.osaMtd
              ],
            );
          const qcMtd =
            toNullableFiniteNumber(
              row[
                columnIndexes.qcMtd
              ],
            );
          const benchmark =
            toFiniteNumber(
              row[
                columnIndexes.benchmark
              ],
            );

          if (
            Date === null ||
            !successfulCallsMtd.valid ||
            !visitMtd.valid ||
            !timeSpendMtd.valid ||
            !osaMtd.valid ||
            !qcMtd.valid ||
            benchmark === null
          ) {
            validationError =
              KPI_MTD_TREND_INVALID_ERROR;
            rows = [];
            break;
          }

          const allValuesBlank =
            successfulCallsMtd.value ===
              null &&
            visitMtd.value === null &&
            timeSpendMtd.value ===
              null &&
            osaMtd.value === null &&
            qcMtd.value === null;

          if (allValuesBlank) {
            continue;
          }

          rows.push({
            Date,
            successfulCallsMtd:
              successfulCallsMtd.value,
            visitMtd:
              visitMtd.value,
            timeSpendMtd:
              timeSpendMtd.value,
            osaMtd:
              osaMtd.value,
            qcMtd:
              qcMtd.value,
            benchmark,
          });
        }

        rows.sort(
          (left, right) =>
            left.Date.localeCompare(
              right.Date,
            ),
        );
      }
    }
  }

  let errorMessage:
    string | null = null;

  if (cycleKey !== null) {
    if (error) {
      errorMessage =
        error.message;
    } else if (
      data?.status === "error"
    ) {
      errorMessage =
        data.error.message;
    } else {
      errorMessage =
        validationError;
    }
  }

  return {
    rows:
      isLoading
        ? []
        : rows,
    isLoading:
      cycleKey !== null &&
      isLoading,
    error: errorMessage,
    refetch,
  };
}
