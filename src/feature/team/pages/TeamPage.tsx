import {
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import {
  AppShell,
} from "@/components/AppShell";

import {
  BottomNavigation,
  type AppNavigationRoute,
} from "@/components/BottomNavigation";

import {
  DashboardHeader,
} from "@/components/dashboard-header";

import {
  OrganizationFilterSheet,
  useOrganizationFilters,
} from "@/components/organization-filter";

import {
  ReportPeriodMode,
} from "@/components/report-period";

import {
  RouteToast,
} from "@/feature/overview/components";

import "../assets/styles/team.css";

import {
  TeamEmployeeDetailsSheet,
  TeamKpiSection,
  TeamRiskOverview,
} from "../components";

import {
  useTeamAmmKpiData,
  useTeamKpiDimension,
  useTeamOverview,
  useTeamRegionKpiData,
  useTeamState,
} from "../hooks";

import type {
  TeamDetailsTab,
  TeamRiskGroup,
} from "../types";

interface TeamPageProps {
  onNavigate:
    (path: string) => void;
}

export function TeamPage({
  onNavigate,
}: TeamPageProps) {
  const team =
    useTeamState();
  const organization =
    useOrganizationFilters();

  const [
    toastMessage,
    setToastMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const {
    kpis,
    isLoading:
      isKpiLoading,
    error:
      kpiError,
    retry:
      retryKpis,
  } =
    useTeamKpiDimension();

  const selectedKpiId =
    kpis.find(
      (item) =>
        item.key ===
        team.selectedMetric,
    )?.kpiId ??
    null;

  const regionData =
    useTeamRegionKpiData({
      cycleKey:
        team.selectedCycleKey,
      kpiId:
        selectedKpiId,
      filters:
        organization.appliedFilters,
      enabled: true,
    });

  const ammData =
    useTeamAmmKpiData({
      cycleKey:
        team.selectedCycleKey,
      kpiId:
        selectedKpiId,
      filters:
        organization.appliedFilters,
      enabled:
        team.selectedLevel ===
        "amm",
    });

  const tableData =
    team.selectedLevel ===
      "amm"
      ? ammData
      : regionData;

  const {
    createRouteSearchParams,
    hydrateFromSearchParams,
  } = team;

  // Risk remains on the current source until its own Semantic query exists.
  const overview =
    useTeamOverview();

  useLayoutEffect(
    () => {
      hydrateFromSearchParams(
        new URLSearchParams(
          window.location.search,
        ),
      );
    },
    [
      hydrateFromSearchParams,
    ],
  );

  useEffect(
    () => {
      if (!toastMessage) {
        return;
      }

      const timer =
        window.setTimeout(
          () =>
            setToastMessage(
              null,
            ),
          2200,
        );

      return () =>
        window.clearTimeout(
          timer,
        );
    },
    [
      toastMessage,
    ],
  );

  useEffect(
    () => {
      const params =
        createRouteSearchParams();

      window.history.replaceState(
        {},
        "",
        `/team?${params.toString()}`,
      );
    },
    [
      createRouteSearchParams,
    ],
  );

  function createOverviewPath():
    string {
    const params =
      new URLSearchParams({
        period:
          team.period,
        region:
          organization
            .appliedFilters
            .region,
        amm:
          organization
            .appliedFilters
            .amm,
        supervisor:
          organization
            .appliedFilters
            .supervisor,
      });

    if (
      team.routeDate
    ) {
      params.set(
        "date",
        team.routeDate,
      );
    }

    return `/?${params.toString()}`;
  }

  function openEntityDetails(
    entityKey:
      string,
  ) {
    const params =
      createRouteSearchParams({
        tab:
          "by-kpi",
        metric:
          team.selectedMetric,
      });

    /*
     * TeamDetails dùng metric cho tab Xem theo KPI.
     * teamMetric giữ KPI được chọn trong TeamProvider.
     */
    params.set(
      "tab",
      "by-kpi",
    );

    params.set(
      "metric",
      team.selectedMetric,
    );

    params.set(
      "teamMetric",
      team.selectedMetric,
    );

    params.set(
      "level",
      team.selectedLevel,
    );

    params.set(
      "entity",
      entityKey,
    );

    /*
     * Region và AMM row sử dụng encoded ID làm identity.
     * Các filter còn lại, gồm Supervisor, được giữ từ
     * createRouteSearchParams().
     */
    if (
      team.selectedLevel ===
      "region"
    ) {
      params.set(
        "region",
        entityKey,
      );
    }
    else {
      params.set(
        "amm",
        entityKey,
      );
    }

    onNavigate(
      `/team/details?${params.toString()}`,
    );
  }
  function openDetails(
    tab:
      TeamDetailsTab,
    group?:
      TeamRiskGroup,
  ) {
    const tabMap:
      Record<
        TeamDetailsTab,
        string
      > = {
      byKpi:
        "by-kpi",
      streak:
        "streak",
      multi:
        "multi",
      manager:
        "manager",
      npp:
        "npp",
    };

    const params =
      createRouteSearchParams({
        tab:
          tabMap[tab],
      });

    if (
      tab ===
      "byKpi"
    ) {
      params.set(
        "metric",
        overview.risk
          .topKpi.metric.key,
      );
    }

    if (
      tab ===
        "streak" &&
      overview.risk
        .maxStreak
    ) {
      params.set(
        "metric",
        overview.risk
          .maxStreak.metric.key,
      );
    }

    if (
      group
    ) {
      params.set(
        "group",
        group,
      );
    }

    onNavigate(
      `/team/details?${params.toString()}`,
    );
  }

  function showLandingToast() {
    setToastMessage(
      "Chức năng chưa được triển khai",
    );
  }

  function handleBottomNavigation(
    route:
      AppNavigationRoute,
  ) {
    if (
      route ===
      "overview"
    ) {
      onNavigate(
        createOverviewPath(),
      );
    }

    if (
      route ===
      "team"
    ) {
      onNavigate(
        `/team?${createRouteSearchParams().toString()}`,
      );
    }
  }

  return (
    <div className="team-page">
      <AppShell
        footer={(
          <BottomNavigation
            activeRoute="team"
            onNavigate={
              handleBottomNavigation
            }
          />
        )}
        overlays={(
          <>
            <OrganizationFilterSheet />
            <TeamEmployeeDetailsSheet />
            <RouteToast
              message={
                toastMessage
              }
            />
          </>
        )}
      >
        <div className="team-page__content">
          <DashboardHeader
            title="Đội ngũ"
            cycleLabel={
              team.cycleLabel
            }
            dateNavigator={{
              prefix:
                team.periodLabel,
              value:
                team.dateLabel,
              canGoPrevious:
                team.canGoPrevious,
              canGoNext:
                team.canGoNext,
              onPrevious:
                team.goToPreviousDate,
              onNext:
                team.goToNextDate,
            }}
            appliedFilterCount={
              organization
                .appliedFilterCount
            }
            backAriaLabel="Về trang Landing"
            sticky
            onBack={
              showLandingToast
            }
            onOpenFilters={
              organization
                .openFilterSheet
            }
          />

          <ReportPeriodMode
            period={
              team.period
            }
            onChange={
              team.setPeriod
            }
            isPeriodEnabled={
              (period) =>
                period ===
                "mtd"
            }
            disableUnavailableInteraction
          />

          <p
            className="team-sr-only"
            aria-live="polite"
          >
            {team.filterSummary}
          </p>

          <TeamKpiSection
            kpis={kpis}
            isKpiLoading={
              isKpiLoading
            }
            kpiError={
              kpiError
            }
            chartRows={
              regionData.rows
            }
            tableRows={
              tableData.rows
            }
            chartIsLoading={
              regionData.isLoading
            }
            tableIsLoading={
              tableData.isLoading
            }
            chartError={
              regionData.error
            }
            tableError={
              tableData.error
            }
            employeeCount={
              regionData.employeeCount
            }
            metric={
              team.selectedMetric
            }
            level={
              team.selectedLevel
            }
            filterSummary={
              team.filterSummary
            }
            selectedEntity={
              team.selectedEntity
            }
            onRetryKpis={
              retryKpis
            }
            onRetryChart={
              regionData.retry
            }
            onRetryTable={
              tableData.retry
            }
            onMetricChange={
              team.setSelectedMetric
            }
            onLevelChange={
              (level) => {
                team.setSelectedLevel(
                  level,
                );
              }
            }
            onEntityToggle={(value) => {
              team.setSelectedEntity(
                team.selectedEntity ===
                  value
                  ? ""
                  : value,
              );
            }}
            onOpenEntityDetails={
              openEntityDetails
            }
          />

          {ammData.queryElements}

          <TeamRiskOverview
            summary={
              overview.risk
            }
            onOpenDetails={
              openDetails
            }
          />
        </div>
      </AppShell>
    </div>
  );
}
