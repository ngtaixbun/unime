import { useMemo } from "react";

import {
  useSemanticModelQuery,
} from "@/hooks/use-semantic-model-query";
import { toDataTable } from "@/lib/to-data-table";
import {
  dimDate,
  type DimDateCycleValue,
  type DimDateRow,
  type DimDateValue,
} from "@/queries/dim-date";

import {
  formatSemanticShortDate,
} from "../lib";

interface ParsedDimDateData {
  cycles: DimDateRow[];
  validationError: string | null;
}

export interface UseDimDateDataResult {
  cycles: DimDateRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const DIM_DATE_QUERY = dimDate();
const DIM_DATE_NO_DATA_ERROR =
  "Semantic Model trả dữ liệu chu kỳ MTD không hợp lệ";
const REQUIRED_QUERY_COLUMNS = [
  "[cycleKey]",
  "[cycleLabel]",
  "[cycleStartDate]",
  "[cycleEndDate]",
  "[cycleSort]",
  "[isLatestCycle]",
] as const;

function parseCycleValue(
  value: unknown,
): DimDateCycleValue | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    return value;
  }

  return null;
}

function parseDateValue(
  value: unknown,
): DimDateValue | null {
  if (
    (typeof value === "string" ||
      value instanceof Date) &&
    formatSemanticShortDate(value) !== null
  ) {
    return value;
  }

  return null;
}

function parseBoolean(
  value: unknown,
): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1") {
    return true;
  }

  if (value === 0 || value === "0") {
    return false;
  }

  if (
    typeof value === "string" &&
    value.toLowerCase() === "true"
  ) {
    return true;
  }

  if (
    typeof value === "string" &&
    value.toLowerCase() === "false"
  ) {
    return false;
  }

  return null;
}

function compareCycleSort(
  left: DimDateCycleValue,
  right: DimDateCycleValue,
): number {
  if (
    typeof left === "number" &&
    typeof right === "number"
  ) {
    return left - right;
  }

  return String(left).localeCompare(
    String(right),
    undefined,
    { numeric: true },
  );
}

function parseDimDateData(
  data: ReturnType<
    typeof useSemanticModelQuery
  >["data"],
): ParsedDimDateData {
  if (data?.status !== "success") {
    return {
      cycles: [],
      validationError: null,
    };
  }

  const queryColumnNames = new Set(
    data.table.columns.map(
      (column) => column.name,
    ),
  );

  if (
    REQUIRED_QUERY_COLUMNS.some(
      (columnName) =>
        !queryColumnNames.has(columnName),
    )
  ) {
    return {
      cycles: [],
      validationError:
        DIM_DATE_NO_DATA_ERROR,
    };
  }

  if (data.table.rows.length === 0) {
    return {
      cycles: [],
      validationError: null,
    };
  }

  const table = toDataTable(
    data.table,
    DIM_DATE_QUERY.columnMetadata,
  );
  const columnIndexes = {
    cycleKey: table.columns.findIndex(
      (column) => column.name === "cycleKey",
    ),
    cycleLabel: table.columns.findIndex(
      (column) =>
        column.name === "cycleLabel",
    ),
    cycleStartDate: table.columns.findIndex(
      (column) =>
        column.name === "cycleStartDate",
    ),
    cycleEndDate: table.columns.findIndex(
      (column) =>
        column.name === "cycleEndDate",
    ),
    cycleSort: table.columns.findIndex(
      (column) => column.name === "cycleSort",
    ),
    isLatestCycle: table.columns.findIndex(
      (column) =>
        column.name === "isLatestCycle",
    ),
  };

  if (
    Object.values(columnIndexes).some(
      (index) => index === -1,
    )
  ) {
    return {
      cycles: [],
      validationError:
        DIM_DATE_NO_DATA_ERROR,
    };
  }

  const cycles: DimDateRow[] = [];

  for (const row of table.rows) {
    const cycleKey = parseCycleValue(
      row[columnIndexes.cycleKey],
    );
    const cycleLabel =
      row[columnIndexes.cycleLabel];
    const cycleStartDate = parseDateValue(
      row[columnIndexes.cycleStartDate],
    );
    const cycleEndDate = parseDateValue(
      row[columnIndexes.cycleEndDate],
    );
    const cycleSort = parseCycleValue(
      row[columnIndexes.cycleSort],
    );
    const isLatestCycle = parseBoolean(
      row[columnIndexes.isLatestCycle],
    );

    if (
      cycleKey === null ||
      typeof cycleLabel !== "string" ||
      cycleLabel.trim() === "" ||
      cycleStartDate === null ||
      cycleEndDate === null ||
      cycleSort === null ||
      isLatestCycle === null
    ) {
      return {
        cycles: [],
        validationError:
          DIM_DATE_NO_DATA_ERROR,
      };
    }

    cycles.push({
      cycleKey,
      cycleLabel,
      cycleStartDate,
      cycleEndDate,
      cycleSort,
      isLatestCycle,
    });
  }

  cycles.sort(
    (left, right) =>
      compareCycleSort(
        left.cycleSort,
        right.cycleSort,
      ),
  );

  return {
    cycles,
    validationError: null,
  };
}

export function useDimDateData():
  UseDimDateDataResult {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSemanticModelQuery({
    connection: DIM_DATE_QUERY.connection,
    query: DIM_DATE_QUERY.query,
  });

  const {
    cycles,
    validationError,
  } = useMemo(
    () => parseDimDateData(data),
    [data],
  );

  const errorMessage = useMemo(() => {
    if (error) {
      return error.message;
    }

    if (data?.status === "error") {
      return data.error.message;
    }

    return validationError;
  }, [
    data,
    error,
    validationError,
  ]);

  return {
    cycles,
    loading: isLoading,
    error: errorMessage,
    reload: refetch,
  };
}
