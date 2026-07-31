import {
  useEffect,
  useRef,
  useState } from "react";

import { AppShell } from "@/components/AppShell";
import { BottomNavigation,
  type AppNavigationRoute } from "@/components/BottomNavigation";
import { DashboardCompactHeader,
  DashboardHeader } from "@/components/dashboard-header";
import {
  OrganizationFilterSheet,
  useOrganizationFilters,
} from "@/components/organization-filter";
import { ReportPeriodMode } from "@/components/report-period";
import { normalizeReportPeriod } from "@/lib/report-period";

import "../assets/styles/overview.css";
import {
  CoverageSection,
  KpiTable,
  RouteToast,
  SectionHeader,
  } from "../components";
import { canNavigate,
  getUnavailableRouteMessage,
  isOverviewPeriodEnabled,
  OVERVIEW_PERIOD_UNAVAILABLE_MESSAGE,
} from "../lib";
import {
  useDimDateData,
  useOverviewData,
  useOverviewPeriod,
} from "../hooks";

interface OverviewPageProps {
  onNavigate?: (path: string) => void;
}

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const [initialReportContext] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      period: normalizeReportPeriod(params.get("period")),
      anchorDate: params.get("date"),
    };
  });
  const requestedInitialPeriod = initialReportContext.period;
  const {
    cycles,
    loading: dimDateLoading,
    error: dimDateError,
    reload: reloadDimDate,
  } = useDimDateData();
  const {
    period,
    selectedCycleKey,
    periodLabel,
    dateLabel,
    canGoPrevious,
    canGoNext,
    setPeriod,
    goToPreviousDate,
    goToNextDate,
    anchorDate,
  } = useOverviewPeriod(cycles, {
    period: isOverviewPeriodEnabled(requestedInitialPeriod)
      ? requestedInitialPeriod
      : "mtd",
    anchorDate: initialReportContext.anchorDate,
  });
  const {
    appliedFilters,
    appliedFilterCount,
    openFilterSheet,
  } = useOrganizationFilters();

  const {
    data,
    loading: overviewLoading,
    error: overviewError,
    reload: reloadOverviewData,
  } = useOverviewData({
    period,
    cycleKey: selectedCycleKey,
    filters: appliedFilters,
  });
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
    prefix: periodLabel,
    value: dateLabel,
    canGoPrevious,
    canGoNext,
    onPrevious: goToPreviousDate,
    onNext: goToNextDate,
  };
  useEffect(() => {
    if (!anchorDate) return;
    const params = new URLSearchParams(window.location.search);
    params.set("period", period);
    params.set("date", anchorDate);
    params.set(
      "region",
      appliedFilters.region,
    );
    params.set(
      "amm",
      appliedFilters.amm,
    );
    params.set(
      "supervisor",
      appliedFilters.supervisor,
    );
    window.history.replaceState({}, "", `/?${params.toString()}`);
  }, [
    anchorDate,
    appliedFilters,
    period,
  ]);
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

  function showLandingToast() {
    setToastMessage("Chức năng chưa được triển khai");
  }

  function handleNavigate(route: AppNavigationRoute) {
    if (route === "team") {
      const params = new URLSearchParams({
        period,
        date: anchorDate,
        region:
          appliedFilters.region,
        amm:
          appliedFilters.amm,
        supervisor:
          appliedFilters.supervisor,
      });
      onNavigate?.(`/team?${params.toString()}`);
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
            <OrganizationFilterSheet />
            <RouteToast message={toastMessage} />
          </>
        )}
      >
            <section className="flow memv2-flow active" id="memOverviewView">
              <div id="memOverviewRoot">
                <div className="memv2-page">
                  <DashboardHeader
                    title="Tổng quan"
                    dateNavigator={dateNavigatorProps}
                    appliedFilterCount={appliedFilterCount}
                    actionRowRef={headerActionRowRef}
                    backAriaLabel="Về trang Landing"
                    onBack={showLandingToast}
                    onOpenFilters={openFilterSheet}
                  />
                  <ReportPeriodMode
                    period={period}
                    isPeriodEnabled={isOverviewPeriodEnabled}
                    onChange={(nextPeriod) => {
              if (!isOverviewPeriodEnabled(nextPeriod)) {
                setToastMessage(
                  OVERVIEW_PERIOD_UNAVAILABLE_MESSAGE,
                );
                return;
              }

              setPeriod(nextPeriod);
            }}
                  />

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
              dateNavigator={dateNavigatorProps}
              appliedFilterCount={appliedFilterCount}
              onOpenFilters={openFilterSheet}
            />
          </div>
    </div>
  );
}
