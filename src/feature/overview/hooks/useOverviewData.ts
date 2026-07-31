import {
  useCallback,
  useMemo,
} from "react";

import type {
  DimDateCycleValue,
} from "@/queries/dim-date";
import type { ReportPeriod } from "@/lib/report-period";
import type {
  KpiMtdTrendRow,
} from "@/queries/kpimtd-trend";

import {
  getOverviewDataByPeriod,
} from "../lib";
import type {
  OverviewData,
  OverviewFilters,
  OverviewKpi,
  OverviewKpiStatus,
  TrendPoint,
} from "../types";
import {
  useKpiMtdData,
  type KpiMtdValues,
} from "./useKpiMtdData";
import {
  useKpiMtdTrendData,
} from "./useKpiMtdTrendData";

interface UseOverviewDataParams {
  period: ReportPeriod;
  cycleKey: DimDateCycleValue | null;
  filters?: OverviewFilters;
}

interface UseOverviewDataResult {
  data: OverviewData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const TEAM_KPI_BENCHMARK = 90;

type TrendValueKey =
  | "successfulCallsMtd"
  | "visitMtd"
  | "timeSpendMtd"
  | "osaMtd"
  | "qcMtd";

function getKpiStatus(
  percent: number | null,
): OverviewKpiStatus {
  if (percent === null) {
    return "neutral";
  }

  return percent >=
    TEAM_KPI_BENCHMARK
    ? "good"
    : "bad";
}

function createTrendPoints(
  rows: KpiMtdTrendRow[],
  valueKey: TrendValueKey,
): TrendPoint[] {
  return rows.flatMap(
    (row) => {
      const value =
        row[valueKey];

      if (
        typeof value !== "number" ||
        !Number.isFinite(value)
      ) {
        return [];
      }

      return [
        {
          date: row.Date,
          value,
          benchmark:
            row.benchmark,
        },
      ];
    },
  );
}

function createTeamMtdKpis(
  values: KpiMtdValues,
  trendRows: KpiMtdTrendRow[],
): OverviewKpi[] {
  return [
    {
      id: "successful-calls",
      title: "Successful Calls",
      percent:
        values.successfulCallsMtd,
      issued:
        values.successfulCallsIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.successfulCallsMtd,
      ),
      trend: createTrendPoints(
        trendRows,
        "successfulCallsMtd",
      ),
    },
    {
      id: "beat",
      title:
        "Tần suất viếng thăm",
      percent: values.visitMtd,
      issued: values.visitIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.visitMtd,
      ),
      trend: createTrendPoints(
        trendRows,
        "visitMtd",
      ),
    },
    {
      id: "time",
      title: "Time Spend",
      percent:
        values.timeSpendMtd,
      issued:
        values.timeSpendIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.timeSpendMtd,
      ),
      trend: createTrendPoints(
        trendRows,
        "timeSpendMtd",
      ),
    },
    {
      id: "team-osa",
      title: "OSA",
      percent: values.osaMtd,
      issued: values.osaIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.osaMtd,
      ),
      trend: createTrendPoints(
        trendRows,
        "osaMtd",
      ),
    },
    {
      id: "qc",
      title: "QC",
      percent: values.qcMtd,
      issued: values.qcIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.qcMtd,
      ),
      trend: createTrendPoints(
        trendRows,
        "qcMtd",
      ),
    },
  ];
}

function mergeKpiMtdValues(
  base: OverviewData,
  values: KpiMtdValues,
  trendRows: KpiMtdTrendRow[],
): OverviewData {
  return {
    ...base,
    marketKpis:
      base.marketKpis.map(
        (kpi) =>
          kpi.id === "osa"
            ? {
                ...kpi,
                percent:
                  values.osaMtd,
                status: getKpiStatus(
                  values.osaMtd,
                ),
              }
            : kpi,
      ),
    teamKpis:
      createTeamMtdKpis(
        values,
        trendRows,
      ),
  };
}

export function useOverviewData({
  period,
  cycleKey,
  filters = {
    region: "all",
    amm: "all",
    supervisor: "all",
  },
}: UseOverviewDataParams):
  UseOverviewDataResult {
  const {
    values,
    isLoading,
    error: kpiMtdError,
    refetch: refetchKpiMtd,
  } = useKpiMtdData(
    cycleKey,
    filters,
  );

  const {
    rows: trendRows,
    isLoading: trendLoading,
    error: trendError,
    refetch: refetchTrend,
  } = useKpiMtdTrendData(
    cycleKey,
    filters,
  );

  const usableTrendRows =
    useMemo(
      () =>
        trendLoading ||
        trendError
          ? []
          : trendRows,
      [
        trendError,
        trendLoading,
        trendRows,
      ],
    );

  const { data, error } =
    useMemo<{
      data: OverviewData | null;
      error: string | null;
    }>(() => {
      if (period !== "mtd") {
        try {
          return {
            data:
              getOverviewDataByPeriod(
                period,
              ),
            error: null,
          };
        } catch (cause) {
          return {
            data: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Không thể tải dữ liệu",
          };
        }
      }

      if (cycleKey === null) {
        return {
          data: null,
          error: null,
        };
      }

      if (isLoading) {
        return {
          data: null,
          error: null,
        };
      }

      if (kpiMtdError) {
        return {
          data: null,
          error: kpiMtdError,
        };
      }

      if (values == null) {
        return {
          data: null,
          error:
            "Không có dữ liệu KPI cho chu kỳ đã chọn",
        };
      }

      try {
        const base =
          getOverviewDataByPeriod(
            period,
          );

        return {
          data:
            mergeKpiMtdValues(
              base,
              values,
              usableTrendRows,
            ),
          error: null,
        };
      } catch (cause) {
        return {
          data: null,
          error:
            cause instanceof Error
              ? cause.message
              : "Không thể tải dữ liệu",
        };
      }
    }, [
      cycleKey,
      isLoading,
      kpiMtdError,
      period,
      usableTrendRows,
      values,
    ]);

  const reload =
    useCallback(async () => {
      await Promise.all([
        refetchKpiMtd(),
        refetchTrend(),
      ]);
    }, [
      refetchKpiMtd,
      refetchTrend,
    ]);

  return {
    data,
    loading:
      period === "mtd" &&
      cycleKey !== null &&
      isLoading,
    error:
      error ??
      (
        period === "mtd"
          ? kpiMtdError
          : null
      ),
    reload,
  };
}
