import { useEffect, useState } from "react";

import { DashboardHeader } from "@/components/DashboardHeader";

import "../assets/styles/overview.css";
import {
  BottomNavigation,
  CoverageSection,
  FilterSheet,
  KpiTable,
  PeriodTabs,
  RouteToast,
  SectionHeader,
} from "../components";
import { canNavigate, getUnavailableRouteMessage, STATIC_FILTER_OPTIONS } from "../lib";
import { useOverviewData, useOverviewFilterOptions, useOverviewFilters, useOverviewPeriod } from "../hooks";
import type { OverviewRoute } from "../types";

export function OverviewPage() {
  const {
    period,
    dateLabel,
    setPeriod,
    goToPreviousDate,
    goToNextDate,
  } = useOverviewPeriod();
  const { data, loading, error, reload } = useOverviewData(period);
  const {
    draftFilters,
    appliedFilterCount,
    isFilterOpen,
    openFilterSheet,
    closeFilterSheet,
    updateDraftFilter,
    applyFilters,
  } = useOverviewFilters();
  const {
    regionOptions,
    isLoadingRegionOptions,
    regionOptionsError,
  } = useOverviewFilterOptions();
  const [activeRoute, setActiveRoute] = useState<OverviewRoute>("overview");
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMessage) return;

    const timer = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const effectiveSelectedKpiId = selectedKpiId ?? data?.marketKpis[0]?.id ?? null;

  function showUnavailableToast() {
    setToastMessage(getUnavailableRouteMessage());
  }

  function handleNavigate(route: OverviewRoute) {
    if (!canNavigate(route)) {
      showUnavailableToast();
      return;
    }

    setActiveRoute(route);
  }

  return (
    <div className="overview-page">
      <div className="shell">
        <div className="phone onb-phone onb-dashboard">
          <main id="app" className="app memv2-app">
            <section className="flow memv2-flow active" id="memOverviewView">
              <div id="memOverviewRoot">
                <div className="memv2-page">
                  <DashboardHeader
                    cycleLabel={data?.cycleLabel ?? "Chu kỳ báo cáo"}
                    period={period}
                    dateLabel={dateLabel}
                    appliedFilterCount={appliedFilterCount}
                    onBack={showUnavailableToast}
                    onOpenFilters={openFilterSheet}
                    onPreviousDate={goToPreviousDate}
                    onNextDate={goToNextDate}
                  />
                  <PeriodTabs period={period} onChange={setPeriod} />

                  {loading ? (
                    <div className="overview-state">Đang tải dữ liệu...</div>
                  ) : null}
                  {error ? (
                    <div className="overview-state overview-state-error">
                      <span>{error}</span>
                      <button type="button" onClick={() => void reload()}>
                        Tải lại
                      </button>
                    </div>
                  ) : null}
                  {!loading && !error && data == null ? <div className="overview-state">Không có dữ liệu</div> : null}

                  {data ? (
                    <>
                      <section className="memv2-section market-overview-section">
                        <SectionHeader
                          title="Tổng quan Thị trường"
                          note="Góc nhìn tổng quan về mức độ phủ, vận hành và thực thi tại điểm bán."
                          variant="market"
                          onOpenDetail={() => handleNavigate("market")}
                        />
                        <CoverageSection metrics={data.coverage} onSelectMetric={showUnavailableToast} />
                        <KpiTable
                          title="Tổng quan Thị trường"
                          kpis={data.marketKpis}
                          period={period}
                          selectedKpiId={effectiveSelectedKpiId}
                          onSelectKpi={setSelectedKpiId}
                          showHeader={false}
                        />
                      </section>
                      <KpiTable
                        title="Tổng quan Đội ngũ"
                        note="Góc nhìn tổng quan về hiệu suất đội ngũ, dựa trên KPI MTD của nhân viên."
                        kpis={data.teamKpis}
                        period={period}
                        selectedKpiId={effectiveSelectedKpiId}
                        onSelectKpi={setSelectedKpiId}
                        onOpenDetail={showUnavailableToast}
                        variant="team"
                      />
                    </>
                  ) : null}
                </div>
              </div>
            </section>
          </main>
          <BottomNavigation activeRoute={activeRoute} onNavigate={handleNavigate} />
          <FilterSheet
            isOpen={isFilterOpen}
            filters={draftFilters}
            regionOptions={regionOptions}
            channelOptions={STATIC_FILTER_OPTIONS.channel}
            distributorOptions={STATIC_FILTER_OPTIONS.distributor}
            isRegionLoading={isLoadingRegionOptions}
            regionError={regionOptionsError}
            onChange={updateDraftFilter}
            onClose={closeFilterSheet}
            onApply={applyFilters}
          />
          <RouteToast message={toastMessage} />
        </div>
      </div>
    </div>
  );
}

