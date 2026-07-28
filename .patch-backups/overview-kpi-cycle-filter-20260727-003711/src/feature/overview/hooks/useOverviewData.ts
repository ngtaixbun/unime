import {
  useCallback,
  useMemo,
} from "react";

import { getOverviewDataByPeriod } from "../lib";
import type {
  OverviewData,
  OverviewKpi,
  OverviewKpiStatus,
  OverviewPeriod,
} from "../types";
import {
  useKpiMtdData,
  type KpiMtdValues,
} from "./useKpiMtdData";

interface UseOverviewDataResult {
  data: OverviewData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

function getKpiStatus(
  percent: number,
): OverviewKpiStatus {
  return percent >= 80
    ? "good"
    : "bad";
}

function createTeamMtdKpis(
  values: KpiMtdValues,
): OverviewKpi[] {
  return [
    {
      id: "successful-calls",
      title: "Successful Calls",
      percent: values.successfulCallsMtd,
      issued: values.successfulCallsIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.successfulCallsMtd,
      ),
      trend: [],
    },
    {
      id: "beat",
      title: "Tần suất viếng thăm",
      percent: values.visitMtd,
      issued: values.visitIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.visitMtd,
      ),
      trend: [],
    },
    {
      id: "time",
      title: "Time Spend",
      percent: values.timeSpendMtd,
      issued: values.timeSpendIssued,
      issuedLabel: "NV",
      status: getKpiStatus(
        values.timeSpendMtd,
      ),
      trend: [],
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
      trend: [],
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
      trend: [],
    },
  ];
}

function mergeKpiMtdValues(
  base: OverviewData,
  values: KpiMtdValues,
): OverviewData {
  return {
    ...base,
    marketKpis: base.marketKpis.map(
      (kpi) =>
        kpi.id === "osa"
          ? {
              ...kpi,
              percent: values.osaMtd,
            }
          : kpi,
    ),
    teamKpis: createTeamMtdKpis(values),
  };
}

export function useOverviewData(
  period: OverviewPeriod,
): UseOverviewDataResult {
  const {
    values,
    isLoading,
    error: kpiMtdError,
    refetch,
  } = useKpiMtdData();

  const { data, error } = useMemo<{
    data: OverviewData | null;
    error: string | null;
  }>(() => {
    if (period !== "mtd") {
      try {
        return {
          data: getOverviewDataByPeriod(period),
          error: null,
        };
      } catch (cause) {
        return {
          data: null,
          error: cause instanceof Error
            ? cause.message
            : "Không thể tải dữ liệu",
        };
      }
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
        error: "Không có dữ liệu KPI MTD",
      };
    }

    try {
      const base = getOverviewDataByPeriod(period);
      return {
        data: mergeKpiMtdValues(base, values),
        error: null,
      };
    } catch (cause) {
      return {
        data: null,
        error: cause instanceof Error
          ? cause.message
          : "Không thể tải dữ liệu",
      };
    }
  }, [
    isLoading,
    kpiMtdError,
    period,
    values,
  ]);

  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    data,
    loading:
      period === "mtd" &&
      isLoading,
    error: error ?? (
      period === "mtd"
        ? kpiMtdError
        : null
    ),
    reload,
  };
}
