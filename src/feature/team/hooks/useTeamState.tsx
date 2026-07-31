/* eslint-disable react-refresh/only-export-components -- feature provider and its tightly-coupled hooks share one public state contract */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useOrganizationFilters,
} from "@/components/organization-filter";
import { useDimDateData } from "@/hooks/use-dim-date-data";
import { useKpiCyclePeriod } from "@/hooks/use-kpi-cycle-period";
import {
  getReportDateRange,
  selectReportDates,
  type ReportPeriod,
} from "@/lib/report-period";
import {
  adaptOrganizationFiltersToLegacyTeamFilters,
  aggregateTeamEmployeeRows,
  calculateTeamEmployeeTrend,
  calculateTeamRiskSummary,
  filterTeamRows,
} from "../lib";
import type {
  TeamEmployeeDetailsState,
  TeamEmployeeRow,
  TeamEntityLevel,
  TeamFilterState,
  TeamMetricKey,
} from "../types";
import { teamQueries } from "../queries";

const TEAM_DATA = teamQueries.getData();
const TEAM_ENABLED_PERIOD: ReportPeriod = "mtd";

interface TeamStateValue {
  data: typeof TEAM_DATA;
  reportDate: string;
  routeDate: string;
  dateIndex: number;
  period: ReportPeriod;
  periodLabel: string;
  dateLabel: string;
  cycleLabel: string;
  selectedCycleKey: string | number | null;
  cycleLoading: boolean;
  cycleError: string | null;
  reloadCycles: () => Promise<void>;
  reportDates: string[];
  canGoPrevious: boolean;
  canGoNext: boolean;
  filters: TeamFilterState;
  filterSummary: string;
  currentRows: TeamEmployeeRow[];
  currentDateRows: TeamEmployeeRow[];
  currentPeriodRows: TeamEmployeeRow[];
  employeeDetails: TeamEmployeeDetailsState;
  selectedMetric: TeamMetricKey;
  selectedLevel: TeamEntityLevel;
  selectedEntity: string;
  setPeriod: (period: ReportPeriod) => void;
  setSelectedMetric: (metric: TeamMetricKey) => void;
  setSelectedLevel: (level: TeamEntityLevel) => void;
  setSelectedEntity: (entity: string) => void;
  hydrateFromSearchParams: (params: URLSearchParams) => void;
  createRouteSearchParams: (
    values?: Partial<{
      tab: string;
      metric: TeamMetricKey;
      group: string;
    }>,
  ) => URLSearchParams;
  goToPreviousDate: () => void;
  goToNextDate: () => void;
  openEmployeeDetails: (employeeCode: string, metric?: TeamMetricKey) => void;
  closeEmployeeDetails: () => void;
  setEmployeeMetric: (metric: TeamMetricKey) => void;
  setEmployeeSelectedDate: (date: string) => void;
}

const TeamStateContext = createContext<TeamStateValue | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const dates = TEAM_DATA.meta.dates;
  const [initialContext] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      anchorDate: params.get("date"),
    };
  });
  const {
    appliedFilters,
    appliedFilterLabels,
  } = useOrganizationFilters();
  const {
    cycles,
    loading: cycleLoading,
    error: cycleError,
    reload: reloadCycles,
  } = useDimDateData();
  const cycleReport = useKpiCyclePeriod(
    cycles,
    {
      period: TEAM_ENABLED_PERIOD,
      anchorDate: initialContext.anchorDate,
    },
  );
  const {
    goToPreviousDate: goToPreviousCycle,
    goToNextDate: goToNextCycle,
    setAnchorDate: setCycleAnchorDate,
  } = cycleReport;
  const [selectedMetric, setSelectedMetric] = useState<TeamMetricKey>("qc");
  const [selectedLevel, setSelectedLevel] = useState<TeamEntityLevel>("region");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [employeeDetails, setEmployeeDetails] = useState<TeamEmployeeDetailsState>({
    empCode: null,
    metric: "calls",
    selectedDate: null,
    isOpen: false,
  });

  // Phase hiện tại chỉ chuyển Date Navigator sang Chu kỳ KPI.
  // Data Team vẫn dùng mock MTD hiện có cho đến khi Team Semantic query được triển khai.
  const reportDate = dates.at(-1) ?? "";
  const dateIndex = dates.indexOf(reportDate);
  const reportDates = useMemo(
    () => selectReportDates(
      dates,
      getReportDateRange(
        TEAM_ENABLED_PERIOD,
        reportDate,
      ),
    ),
    [dates, reportDate],
  );
  const currentDateRows = useMemo(
    () => TEAM_DATA.rows.filter((row) => row.date === reportDate),
    [reportDate],
  );
  const currentPeriodRows = useMemo(
    () => TEAM_DATA.rows.filter((row) => reportDates.includes(row.date)),
    [reportDates],
  );
  const filters = useMemo(
    () =>
      adaptOrganizationFiltersToLegacyTeamFilters(
        TEAM_DATA.rows,
        appliedFilters,
        appliedFilterLabels,
      ),
    [
      appliedFilterLabels,
      appliedFilters,
    ],
  );
  const currentRows = useMemo(
    () => aggregateTeamEmployeeRows(
      filterTeamRows(currentPeriodRows, filters),
    ),
    [currentPeriodRows, filters],
  );
  const filterSummary =
    useMemo(() => {
      const labels = [
        appliedFilters.region ===
        "all"
          ? null
          : appliedFilterLabels.region ??
            "Khu vực đã chọn",
        appliedFilters.amm ===
        "all"
          ? null
          : appliedFilterLabels.amm ??
            "AMM đã chọn",
        appliedFilters.supervisor ===
        "all"
          ? null
          : appliedFilterLabels.supervisor ??
            "Supervisor đã chọn",
      ].filter(
        (
          label,
        ): label is string =>
          label !== null,
      );

      return labels.length
        ? labels.join(" · ")
        : "Tất cả dữ liệu";
    }, [
      appliedFilterLabels,
      appliedFilters,
    ]);

  const routeDate =
    cycleReport.anchorDate ||
    initialContext.anchorDate ||
    "";
  const cycleLabel =
    cycleReport.selectedCycle?.cycleLabel ??
    (cycleLoading
      ? "Đang tải chu kỳ KPI"
      : "Chu kỳ KPI");
  const dateLabel =
    cycleReport.dateLabel ||
    (cycleLoading ? "Đang tải..." : "—");

  const goToPreviousDate = useCallback(() => {
    goToPreviousCycle();
    setEmployeeDetails((value) => ({ ...value, selectedDate: null }));
  }, [goToPreviousCycle]);
  const goToNextDate = useCallback(() => {
    goToNextCycle();
    setEmployeeDetails((value) => ({ ...value, selectedDate: null }));
  }, [goToNextCycle]);
  const setPeriod = useCallback((period: ReportPeriod) => {
    if (period !== TEAM_ENABLED_PERIOD) {
      return;
    }

    setEmployeeDetails((value) => ({ ...value, selectedDate: null }));
  }, []);
  const openEmployeeDetails = useCallback((employeeCode: string, metric: TeamMetricKey = "calls") => {
    setEmployeeDetails({ empCode: employeeCode, metric, selectedDate: null, isOpen: true });
  }, []);
  const closeEmployeeDetails = useCallback(() => {
    setEmployeeDetails((value) => ({ ...value, empCode: null, isOpen: false }));
  }, []);
  const setEmployeeMetric = useCallback((metric: TeamMetricKey) => {
    setEmployeeDetails((value) => ({ ...value, metric, selectedDate: null }));
  }, []);
  const setEmployeeSelectedDate = useCallback((date: string) => {
    setEmployeeDetails((value) => ({ ...value, selectedDate: date }));
  }, []);

  const hydrateFromSearchParams = useCallback((params: URLSearchParams) => {
    const requestedDate = params.get("date");
    if (requestedDate) {
      setCycleAnchorDate(requestedDate);
    }

    const metric = params.get("teamMetric") as TeamMetricKey | null;
    if (metric && ["calls", "beat", "time", "osa", "qc"].includes(metric)) {
      setSelectedMetric(metric);
    }
    const level = params.get("level");
    if (level === "region" || level === "amm") setSelectedLevel(level);
    setSelectedEntity(params.get("entity") || "");
  }, [setCycleAnchorDate]);

  const createRouteSearchParams = useCallback((
    values?: Partial<{
      tab: string;
      metric: TeamMetricKey;
      group: string;
    }>,
  ) => {
    const params = new URLSearchParams({
      period: TEAM_ENABLED_PERIOD,
      region:
        appliedFilters.region,
      amm:
        appliedFilters.amm,
      supervisor:
        appliedFilters.supervisor,
      teamMetric: selectedMetric,
      level: selectedLevel,
    });
    if (routeDate) params.set("date", routeDate);
    if (selectedEntity) params.set("entity", selectedEntity);
    if (values?.tab) params.set("tab", values.tab);
    if (values?.metric) params.set("metric", values.metric);
    if (values?.group) params.set("group", values.group);
    return params;
  }, [
    appliedFilters,
    routeDate,
    selectedEntity,
    selectedLevel,
    selectedMetric,
  ]);

  const value = useMemo<TeamStateValue>(() => ({
    data: TEAM_DATA,
    reportDate,
    routeDate,
    dateIndex,
    period: TEAM_ENABLED_PERIOD,
    periodLabel: "MTD",
    dateLabel,
    cycleLabel,
    selectedCycleKey: cycleReport.selectedCycleKey,
    cycleLoading,
    cycleError,
    reloadCycles,
    reportDates,
    canGoPrevious: cycleReport.canGoPrevious,
    canGoNext: cycleReport.canGoNext,
    filters,
    filterSummary,
    currentRows,
    currentDateRows,
    currentPeriodRows,
    employeeDetails,
    selectedMetric,
    selectedLevel,
    selectedEntity,
    setPeriod,
    setSelectedMetric,
    setSelectedLevel,
    setSelectedEntity,
    hydrateFromSearchParams,
    createRouteSearchParams,
    goToPreviousDate,
    goToNextDate,
    openEmployeeDetails,
    closeEmployeeDetails,
    setEmployeeMetric,
    setEmployeeSelectedDate,
  }), [
    reportDate, routeDate, dateIndex, dateLabel, cycleLabel,
    cycleReport.selectedCycleKey, cycleReport.canGoPrevious, cycleReport.canGoNext,
    cycleLoading, cycleError, reloadCycles, reportDates, filters,
    filterSummary, currentRows, currentDateRows, currentPeriodRows,
    employeeDetails, selectedMetric, selectedLevel, selectedEntity, setPeriod,
    hydrateFromSearchParams, createRouteSearchParams, goToPreviousDate, goToNextDate,
    openEmployeeDetails,
    closeEmployeeDetails, setEmployeeMetric, setEmployeeSelectedDate,
  ]);

  return <TeamStateContext.Provider value={value}>{children}</TeamStateContext.Provider>;
}

export function useTeamState(): TeamStateValue {
  const value = useContext(TeamStateContext);
  if (!value) throw new Error("useTeamState must be used inside TeamProvider");
  return value;
}

export function useTeamOverview() {
  const team = useTeamState();

  return useMemo(() => {
    return {
      rows: team.currentRows,
      risk: calculateTeamRiskSummary(
        team.currentRows,
        team.data.rows,
        team.data.meta.dates,
        team.reportDate,
        team.filters,
      ),
    };
  }, [
    team.currentRows,
    team.data.rows,
    team.data.meta.dates,
    team.reportDate,
    team.filters,
  ]);
}

export function useTeamDetails() {
  const team = useTeamState();
  return { rows: team.currentRows, ...team };
}

export function useTeamEmployeeDetails() {
  const team = useTeamState();
  return useMemo(() => {
    const code = team.employeeDetails.empCode;
    if (!code) return { row: null, trend: [] };
    const selectedDate = team.employeeDetails.selectedDate;
    const fallback = [...team.data.rows].reverse().find((row) => row.empCode === code) ?? null;
    const row = selectedDate
      ? team.data.rows.find((item) => item.empCode === code && item.date === selectedDate) ?? fallback
      : team.currentRows.find((item) => item.empCode === code) ?? fallback;
    const trend = calculateTeamEmployeeTrend(
      team.data.rows,
      team.data.meta.dates,
      code,
      team.employeeDetails.metric,
      team.reportDate,
    );
    return { row, trend };
  }, [
    team.currentRows,
    team.data.rows,
    team.data.meta.dates,
    team.employeeDetails,
    team.reportDate,
  ]);
}
