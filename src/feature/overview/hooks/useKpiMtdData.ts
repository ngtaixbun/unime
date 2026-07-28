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
  kpiMtd,
  type KpiMtdRow,
} from "@/queries/kpimtd";

import type {
  OverviewFilters,
} from "../types";

export type KpiMtdValues =
  KpiMtdRow;

export interface UseKpiMtdDataResult {
  values: KpiMtdValues | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface NullableNumberResult {
  valid: boolean;
  value: number | null;
}

const DEFAULT_FILTERS: OverviewFilters = {
  region: "all",
  amm: "all",
  supervisor: "all",
};

const KPI_MTD_NO_DATA_ERROR =
  "Semantic Model không trả đủ dữ liệu KPI MTD";

function toNullableFiniteNumber(
  value: unknown,
): NullableNumberResult {
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
      : Number(value);

  if (!Number.isFinite(parsed)) {
    return {
      valid: false,
      value: null,
    };
  }

  return {
    valid: true,
    value: parsed,
  };
}

export function useKpiMtdData(
  cycleKey: DimDateCycleValue | null,
  filters: OverviewFilters =
    DEFAULT_FILTERS,
): UseKpiMtdDataResult {
  const {
    region,
    amm,
    supervisor,
  } = filters;

  const queryConfig = useMemo(
    () =>
      cycleKey === null
        ? null
        : kpiMtd({
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
  });

  const values =
    useMemo<KpiMtdValues | null>(
      () => {
        if (
          queryConfig === null ||
          data?.status !== "success"
        ) {
          return null;
        }

        const table = toDataTable(
          data.table,
          queryConfig.columnMetadata,
        );
        const firstRow = table.rows[0];

        if (!firstRow) {
          return null;
        }

        const columnIndexes = {
          successfulCallsMtd:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "successfulCallsMtd",
            ),

          successfulCallsIssued:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "successfulCallsIssued",
            ),

          visitMtd:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "visitMtd",
            ),

          visitIssued:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "visitIssued",
            ),

          timeSpendMtd:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "timeSpendMtd",
            ),

          timeSpendIssued:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "timeSpendIssued",
            ),

          osaMtd:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "osaMtd",
            ),

          osaIssued:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "osaIssued",
            ),

          qcMtd:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "qcMtd",
            ),

          qcIssued:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "qcIssued",
            ),
        } satisfies Record<
          keyof KpiMtdRow,
          number
        >;

        const hasMissingColumn =
          Object.values(
            columnIndexes,
          ).some(
            (index) => index === -1,
          );

        if (hasMissingColumn) {
          return null;
        }

        const parsed = {
          successfulCallsMtd:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes
                  .successfulCallsMtd
              ],
            ),

          successfulCallsIssued:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes
                  .successfulCallsIssued
              ],
            ),

          visitMtd:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.visitMtd
              ],
            ),

          visitIssued:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.visitIssued
              ],
            ),

          timeSpendMtd:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.timeSpendMtd
              ],
            ),

          timeSpendIssued:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes
                  .timeSpendIssued
              ],
            ),

          osaMtd:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.osaMtd
              ],
            ),

          osaIssued:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.osaIssued
              ],
            ),

          qcMtd:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.qcMtd
              ],
            ),

          qcIssued:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.qcIssued
              ],
            ),
        };

        const hasInvalidValue =
          Object.values(
            parsed,
          ).some(
            (result) =>
              !result.valid,
          );

        if (hasInvalidValue) {
          return null;
        }

        return {
          successfulCallsMtd:
            parsed
              .successfulCallsMtd
              .value,

          successfulCallsIssued:
            parsed
              .successfulCallsIssued
              .value,

          visitMtd:
            parsed.visitMtd.value,

          visitIssued:
            parsed.visitIssued.value,

          timeSpendMtd:
            parsed.timeSpendMtd.value,

          timeSpendIssued:
            parsed
              .timeSpendIssued
              .value,

          osaMtd:
            parsed.osaMtd.value,

          osaIssued:
            parsed.osaIssued.value,

          qcMtd:
            parsed.qcMtd.value,

          qcIssued:
            parsed.qcIssued.value,
        };
      },
      [
        data,
        queryConfig,
      ],
    );

  const errorMessage =
    useMemo<string | null>(
      () => {
        if (cycleKey === null) {
          return null;
        }

        if (error) {
          return error.message;
        }

        if (
          data?.status === "error"
        ) {
          return data.error.message;
        }

        if (
          !isLoading &&
          data?.status === "success" &&
          values == null
        ) {
          return KPI_MTD_NO_DATA_ERROR;
        }

        return null;
      },
      [
        cycleKey,
        data,
        error,
        isLoading,
        values,
      ],
    );

  return {
    values,
    isLoading:
      cycleKey !== null &&
      isLoading,
    error: errorMessage,
    refetch,
  };
}
