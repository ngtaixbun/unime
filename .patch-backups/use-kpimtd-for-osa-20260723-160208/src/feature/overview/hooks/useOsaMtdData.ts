import { useMemo } from "react";

import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { osaMtd } from "@/queries";

export interface UseOsaMtdDataResult {
  /** OSA MTD value as a percentage (e.g. 85.4), or null if unavailable. */
  value: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const OSA_MTD_COLUMN = "[osaMtd]";

/**
 * Normalizes a raw measure value into the percentage scale used by the UI.
 * If the semantic model returns a decimal between 0 and 1, it is converted
 * to a percentage (e.g. 0.854 -> 85.4). Values already on a percentage scale
 * are returned as-is.
 */
function normalizePercent(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }

  if (num > 0 && num < 1) {
    return num * 100;
  }

  return num;
}

export function useOsaMtdData(): UseOsaMtdDataResult {
  const { connection, query } = osaMtd();
  const { data, isLoading, error, refetch } = useSemanticModelQuery({
    connection,
    query,
  });

  const value = useMemo<number | null>(() => {
    if (data?.status !== "success" || !data.table) {
      return null;
    }

    const columns = data.table.columns;
    const columnIndex = columns.findIndex(
      (column) => column.name === OSA_MTD_COLUMN,
    );
    if (columnIndex === -1 || data.table.rows.length === 0) {
      return null;
    }

    return normalizePercent(data.table.rows[0][columnIndex]);
  }, [data]);

  const errorMessage = useMemo<string | null>(() => {
    if (error) {
      return error instanceof Error ? error.message : String(error);
    }

    if (data?.status === "error") {
      return data.error.message;
    }

    return null;
  }, [error, data]);

  return {
    value,
    isLoading,
    error: errorMessage,
    refetch,
  };
}
