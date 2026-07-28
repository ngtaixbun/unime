import { useMemo } from "react";

import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import { kpiMtd, type KpiMtdRow } from "@/queries/kpimtd";

export type KpiMtdValues = Record<keyof KpiMtdRow, number>;

export interface UseKpiMtdDataResult {
  values: KpiMtdValues | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const KPI_MTD_QUERY = kpiMtd();
const KPI_MTD_NO_DATA_ERROR =
  "Semantic Model không trả đủ dữ liệu KPI MTD";

function toFiniteNumber(value: unknown): number | null {
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

export function useKpiMtdData():
  UseKpiMtdDataResult {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSemanticModelQuery({
    connection: KPI_MTD_QUERY.connection,
    query: KPI_MTD_QUERY.query,
  });

  const values = useMemo<KpiMtdValues | null>(
    () => {
      if (data?.status !== "success") {
        return null;
      }

      const table = toDataTable(
        data.table,
        KPI_MTD_QUERY.columnMetadata,
      );
      const firstRow = table.rows[0];

      if (!firstRow) {
        return null;
      }

      const readColumn = (
        columnName: keyof KpiMtdRow,
      ): number | null => {
        const columnIndex =
          table.columns.findIndex(
            (column) =>
              column.name === columnName,
          );

        if (columnIndex === -1) {
          return null;
        }

        return toFiniteNumber(
          firstRow[columnIndex],
        );
      };

      const successfulCallsMtd =
        readColumn("successfulCallsMtd");
      const successfulCallsIssued =
        readColumn("successfulCallsIssued");
      const visitMtd =
        readColumn("visitMtd");
      const visitIssued =
        readColumn("visitIssued");
      const timeSpendMtd =
        readColumn("timeSpendMtd");
      const timeSpendIssued =
        readColumn("timeSpendIssued");
      const osaMtd =
        readColumn("osaMtd");
      const osaIssued =
        readColumn("osaIssued");
      const qcMtd =
        readColumn("qcMtd");
      const qcIssued =
        readColumn("qcIssued");

      if (
        successfulCallsMtd === null ||
        successfulCallsIssued === null ||
        visitMtd === null ||
        visitIssued === null ||
        timeSpendMtd === null ||
        timeSpendIssued === null ||
        osaMtd === null ||
        osaIssued === null ||
        qcMtd === null ||
        qcIssued === null
      ) {
        return null;
      }

      return {
        successfulCallsMtd,
        successfulCallsIssued,
        visitMtd,
        visitIssued,
        timeSpendMtd,
        timeSpendIssued,
        osaMtd,
        osaIssued,
        qcMtd,
        qcIssued,
      };
    },
    [data],
  );

  const errorMessage =
    useMemo<string | null>(
      () => {
        if (error) {
          return error.message;
        }

        if (data?.status === "error") {
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
      [data, error, isLoading, values],
    );

  return {
    values,
    isLoading,
    error: errorMessage,
    refetch,
  };
}
