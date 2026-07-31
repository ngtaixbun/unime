import {
  useMemo,
} from "react";

import type {
  QueryTable,
} from "@microsoft/fabric-app-data";

import {
  useSemanticModelQuery,
} from "@/hooks/use-semantic-model-query";
import {
  dimKpi,
} from "@/queries/dim-kpi";

import type {
  TeamMetricKey,
} from "../types";

export interface TeamKpiDimensionItem {
  kpiId: number;
  label: string;
  key: TeamMetricKey;
}

export interface ParsedTeamKpiDimension {
  kpis: TeamKpiDimensionItem[];
  error: string | null;
}

export interface UseTeamKpiDimensionResult {
  kpis: TeamKpiDimensionItem[];
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}

export const TEAM_KPI_ID_TO_METRIC_KEY:
  Readonly<
    Partial<
      Record<
        number,
        TeamMetricKey
      >
    >
  > = Object.freeze({
    1: "calls",
    2: "beat",
    3: "time",
    4: "osa",
    5: "qc",
  });

const REQUIRED_COLUMNS = [
  "[kpiname]",
  "[kpi_id]",
] as const;

const INVALID_COLUMNS_ERROR =
  "Semantic Model trả cấu trúc danh sách KPI không hợp lệ.";

export function mapTeamKpiIdToMetricKey(
  kpiId: number,
): TeamMetricKey | null {
  return (
    TEAM_KPI_ID_TO_METRIC_KEY[
      kpiId
    ] ?? null
  );
}

export function parseTeamKpiDimension(
  table: QueryTable,
): ParsedTeamKpiDimension {
  const columnIndexes =
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
    Object.values(
      columnIndexes,
    ).some(
      (index) => index < 0,
    )
  ) {
    return {
      kpis: [],
      error:
        INVALID_COLUMNS_ERROR,
    };
  }

  const kpis:
    TeamKpiDimensionItem[] =
      [];
  const seenKpiIds =
    new Set<number>();

  for (const row of table.rows) {
    const rawLabel =
      row[
        columnIndexes[
          "[kpiname]"
        ]
      ];
    const rawKpiId =
      row[
        columnIndexes[
          "[kpi_id]"
        ]
      ];

    if (
      typeof rawLabel !==
        "string" ||
      rawLabel.trim() === "" ||
      typeof rawKpiId !==
        "number" ||
      !Number.isFinite(
        rawKpiId,
      ) ||
      !Number.isInteger(
        rawKpiId,
      )
    ) {
      continue;
    }

    const key =
      mapTeamKpiIdToMetricKey(
        rawKpiId,
      );

    if (key === null) {
      continue;
    }

    if (
      seenKpiIds.has(
        rawKpiId,
      )
    ) {
      return {
        kpis: [],
        error:
          `Semantic Model trả kpi_id trùng lặp: ${rawKpiId}.`,
      };
    }

    seenKpiIds.add(
      rawKpiId,
    );
    kpis.push({
      kpiId: rawKpiId,
      label: rawLabel.trim(),
      key,
    });
  }

  return {
    kpis: kpis.sort(
      (left, right) =>
        left.kpiId -
        right.kpiId,
    ),
    error: null,
  };
}

const DIM_KPI_QUERY =
  dimKpi();

export function useTeamKpiDimension():
  UseTeamKpiDimensionResult {
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useSemanticModelQuery({
    connection:
      DIM_KPI_QUERY.connection,
    query: DIM_KPI_QUERY.query,
    columnMetadata:
      DIM_KPI_QUERY.columnMetadata,
    backendRequest: {
      queryId: "dim-kpi",
      params: {},
    },
  });

  const parsed =
    useMemo(
      () =>
        data?.status ===
        "success"
          ? parseTeamKpiDimension(
              data.table,
            )
          : {
              kpis: [],
              error: null,
            },
      [data],
    );

  const resultError =
    queryError?.message ??
    (
      data?.status ===
      "error"
        ? data.error.message
        : null
    ) ??
    parsed.error;

  return {
    kpis:
      resultError === null
        ? parsed.kpis
        : [],
    isLoading,
    error: resultError,
    retry: refetch,
  };
}
