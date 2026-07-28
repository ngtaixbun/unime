import {
  useEffect,
  useRef,
  useState } from "react";

import { AppShell } from "@/components/AppShell";
import { BottomNavigation,
  type AppNavigationRoute } from "@/components/BottomNavigation";
import { DashboardCompactHeader,
  DashboardHeader } from "@/components/dashboard-header";

import "../assets/styles/overview.css";
import {
  CoverageSection,
  DateNavigator,
  FilterSheet,
  KpiTable,
  PeriodTabs,
  RouteToast,
  SectionHeader,
  } from "../components";
import { canNavigate,
  getUnavailableRouteMessage,
  STATIC_FILTER_OPTIONS,
  isOverviewPeriodEnabled,
  OVERVIEW_PERIOD_UNAVAILABLE_MESSAGE,
} from "../lib";
import {
  useDimDateData,
  useOverviewData,
  useOverviewFilterOptions,
  useOverviewFilters,
  useOverviewPeriod,
} from "../hooks";

interface OverviewPageProps {
  onNavigate?: (path: string) => void;
}

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const {
    cycles,
    loading: dimDateLoading,
    error: dimDateError,
    reload: reloadDimDate,
  } = useDimDateData();
  const {
    period,
    periodLabel,
    dateLabel,
    canGoPrevious,
    canGoNext,
    setPeriod,
    goToPreviousDate,
    goToNextDate,
  } = useOverviewPeriod(cycles);
  const {
    data,
    loading: overviewLoading,
    error: overviewError,
    reload: reloadOverviewData,
  } = useOverviewData(period);
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
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const appScrollRef = useRef<HTMLElement | null>(null);
  const headerActionRowRef = useRef<HTMLDivElement | null>(null);
  const compactHeaderHostRef = useRef<HTMLDivElement | null>(null);
  const [isCompactHeaderVisible, setIsCompactHeaderVisible] = useState(false);
  const loading =
    dimDateLoading || overviewLoading;
  const error =
    dimDateError ?? overviewError;
  const hasCycles = cycles.length > 0;
  const dateNavigatorProps = {
    label: periodLabel,
    value: dateLabel,
    canGoPrevious,
    canGoNext,
    onPrevious: goToPreviousDate,
    onNext: goToNextDate,
  };
  useEffect(() => {
    if (!toastMessage) return;

    const timer = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);
  useEffect(() => {
    const scrollOwner = appScrollRef.current;
    const actionRow = headerActionRowRef.current;
    const compactHost = compactHeaderHostRef.current;
    const phone = scrollOwner?.closest(".phone") as HTMLElement | null;

    if (!scrollOwner || !actionRow || !compactHost || !phone) {
      return;
    }

    let animationFrameId = 0;

    const updateStickyHeader = () => {
      window.cancelAnimationFrame(animationFrameId);

      animationFrameId = window.requestAnimationFrame(() => {
        const phoneRect = phone.getBoundingClientRect();

        compactHost.style.setProperty("--overview-sticky-left", `${phoneRect.left}px`);
        compactHost.style.setProperty("--overview-sticky-top", `${phoneRect.top}px`);
        compactHost.style.setProperty("--overview-sticky-width", `${phoneRect.width}px`);

        const scrollOwnerRect = scrollOwner.getBoundingClientRect();
        const actionRowRect = actionRow.getBoundingClientRect();
        const isActive =
          scrollOwner.scrollTop > 0 &&
          actionRowRect.bottom <= scrollOwnerRect.top + 1;

        setIsCompactHeaderVisible(isActive);
      });
    };

    scrollOwner.addEventListener("scroll", updateStickyHeader, { passive: true });
    window.addEventListener("resize", updateStickyHeader);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateStickyHeader)
        : null;

    resizeObserver?.observe(phone);
    resizeObserver?.observe(scrollOwner);
    resizeObserver?.observe(actionRow);

    updateStickyHeader();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      scrollOwner.removeEventListener("scroll", updateStickyHeader);
      window.removeEventListener("resize", updateStickyHeader);

      resizeObserver?.disconnect();
    };
  }, [appliedFilterCount, dateLabel, period]);
  const effectiveSelectedKpiId = selectedKpiId ?? data?.marketKpis[0]?.id ?? null;

  function showUnavailableToast() {
    setToastMessage(getUnavailableRouteMessage());
  }

  function handleNavigate(route: AppNavigationRoute) {
    if (route === "team") {
      onNavigate?.("/team");
      return;
    }
    if (!canNavigate(route)) {
      showUnavailableToast();
      return;
    }
  }

  async function reloadPageData() {
    await Promise.all([
      reloadDimDate(),
      reloadOverviewData(),
    ]);
  }

  return (
    <div className="overview-page">
      <AppShell
        contentRef={appScrollRef}
        footer={<BottomNavigation activeRoute="overview" onNavigate={handleNavigate} />}
        overlays={(
          <>
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
          </>
        )}
      >
            <section className="flow memv2-flow active" id="memOverviewView">
              <div id="memOverviewRoot">
                <div className="memv2-page">
                  <DashboardHeader
                    dateNavigator={(
                      <DateNavigator {...dateNavigatorProps} />
                    )}
                    appliedFilterCount={appliedFilterCount}
                    actionRowRef={headerActionRowRef}
                    onLogout={showUnavailableToast}
                    onOpenFilters={openFilterSheet}
                  />
                  <PeriodTabs period={period} onChange={(nextPeriod) => {
              if (!isOverviewPeriodEnabled(nextPeriod)) {
                setToastMessage(
                  OVERVIEW_PERIOD_UNAVAILABLE_MESSAGE,
                );
                return;
              }

              setPeriod(nextPeriod);
            }} />

                  {loading ? (
                    <div className="overview-state">Đang tải dữ liệu...</div>
                  ) : null}
                  {error ? (
                    <div className="overview-state overview-state-error">
                      <span>{error}</span>
                      <button type="button" onClick={() => void reloadPageData()}>
                        Tải lại
                      </button>
                    </div>
                  ) : null}
                  {!loading && !error && (!hasCycles || data == null) ? (
                    <div className="overview-state">
                      Không có dữ liệu
                    </div>
                  ) : null}

                  {!loading && !error && hasCycles && data ? (
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
      </AppShell>
          <div
            ref={compactHeaderHostRef}
            className={`overviewCompactHeaderHost ${
              isCompactHeaderVisible
                ? "active"
                : ""
            }`}
            aria-hidden={
              !isCompactHeaderVisible
            }
          >
            <DashboardCompactHeader
              dateNavigator={(
                <DateNavigator {...dateNavigatorProps} />
              )}
              appliedFilterCount={appliedFilterCount}
              onOpenFilters={openFilterSheet}
            />
          </div>
    </div>
  );
}


