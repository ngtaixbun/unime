import { useMemo } from "react";

import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { kpiMtd } from "@/queries/kpimtd";

export interface UseOsaMtdDataResult {
  /** OSA MTD value as a percentage, or null if unavailable. */
  value: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const OSA_MTD_COLUMN = "[osaMtd]";

function normalizePercent(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  if (
    numberValue >= 0 &&
    numberValue <= 1
  ) {
    return numberValue * 100;
  }

  return numberValue;
}

export function useOsaMtdData():
  UseOsaMtdDataResult {
  const {
    connection,
    query,
  } = kpiMtd();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSemanticModelQuery({
    connection,
    query,
  });

  const value = useMemo<number | null>(
    () => {
      if (
        data?.status !== "success" ||
        !data.table
      ) {
        return null;
      }

      const columnIndex =
        data.table.columns.findIndex(
          (column) =>
            column.name === OSA_MTD_COLUMN,
        );

      const firstRow =
        data.table.rows[0];

      if (
        columnIndex === -1 ||
        !firstRow
      ) {
        return null;
      }

      return normalizePercent(
        firstRow[columnIndex],
      );
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

        return null;
      },
      [error, data],
    );

  return {
    value,
    isLoading,
    error: errorMessage,
    refetch,
  };
}
