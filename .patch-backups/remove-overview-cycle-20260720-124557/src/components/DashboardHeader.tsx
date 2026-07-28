import { ArrowLeft, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import type { Ref } from "react";

import logoUrl from "@/assets/unilever-logo.png";

interface DashboardHeaderProps {
  title?: string;
  cycleLabel: string;
  dateLabelPrefix: string;
  dateLabel: string;
  appliedFilterCount: number;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  actionRowRef?: Ref<HTMLDivElement>;
  onBack: () => void;
  onOpenFilters: () => void;
  onPreviousDate: () => void;
  onNextDate: () => void;
}

type DashboardCompactHeaderProps = Pick<
  DashboardHeaderProps,
  | "dateLabelPrefix"
  | "dateLabel"
  | "appliedFilterCount"
  | "canGoPrevious"
  | "canGoNext"
  | "onOpenFilters"
  | "onPreviousDate"
  | "onNextDate"
>;

function HeaderFilterButton({
  appliedFilterCount,
  onOpenFilters,
}: Pick<DashboardHeaderProps, "appliedFilterCount" | "onOpenFilters">) {
  return (
    <button
      className={`headerFilterBtn ${appliedFilterCount > 0 ? "filtered" : ""}`}
      type="button"
      onClick={onOpenFilters}
      aria-label="Mở bộ lọc"
    >
      <span className="filterNavSvg"><SlidersHorizontal /></span>
      <span className="filterNavBadge" hidden={appliedFilterCount === 0}>
        {appliedFilterCount}
      </span>
    </button>
  );
}

function HeaderDateNavigator({
  dateLabelPrefix,
  dateLabel,
  canGoPrevious = true,
  canGoNext = true,
  onPreviousDate,
  onNextDate,
}: Pick<DashboardHeaderProps, "dateLabelPrefix" | "dateLabel" | "canGoPrevious" | "canGoNext" | "onPreviousDate" | "onNextDate">) {
  return (
    <div className="mtdDateNav" aria-label="Điều hướng ngày báo cáo">
      <button className="mtdNavBtn" type="button" disabled={!canGoPrevious} onClick={onPreviousDate} aria-label="Ngày trước">
        <ChevronLeft />
      </button>
      <span className="mtdDateText">
        <span className="mtdLabel">{dateLabelPrefix}:</span>
        <span className="mtdValue">{dateLabel}</span>
      </span>
      <button className="mtdNavBtn" type="button" disabled={!canGoNext} onClick={onNextDate} aria-label="Ngày sau">
        <ChevronRight />
      </button>
    </div>
  );
}

export function DashboardHeader({
  title = "Tổng quan",
  cycleLabel,
  dateLabelPrefix,
  dateLabel,
  appliedFilterCount,
  canGoPrevious,
  canGoNext,
  actionRowRef,
  onBack,
  onOpenFilters,
  onPreviousDate,
  onNextDate,
}: DashboardHeaderProps) {
  return (
    <div className="nwUnifiedHeader overviewUnifiedHeader dashboardUnifiedHeader">
      <div aria-label="Phạm vi báo cáo và chu kì" className="nwHeaderTitleRow">
        <div aria-hidden="true" className="nwHeaderBrand"><img alt="Unilever" src={logoUrl} /></div>
        <h1 className="nwHeaderTitle">{title}</h1>
        <p className="nwHeaderCycle">{cycleLabel}</p>
      </div>
      <div className="screenHeader">
        <div className="toprow" ref={actionRowRef}>
          <button className="backBtn" type="button" onClick={onBack} aria-label="Quay lại">
            <ArrowLeft className="headerIconSvg" />
          </button>
          <div className="nwHeaderActionCenter">
            <HeaderDateNavigator
              dateLabelPrefix={dateLabelPrefix}
              dateLabel={dateLabel}
              canGoPrevious={canGoPrevious}
              canGoNext={canGoNext}
              onPreviousDate={onPreviousDate}
              onNextDate={onNextDate}
            />
          </div>
          <HeaderFilterButton appliedFilterCount={appliedFilterCount} onOpenFilters={onOpenFilters} />
        </div>
      </div>
    </div>
  );
}

export function DashboardCompactHeader({
  dateLabelPrefix,
  dateLabel,
  appliedFilterCount,
  canGoPrevious,
  canGoNext,
  onOpenFilters,
  onPreviousDate,
  onNextDate,
}: DashboardCompactHeaderProps) {
  return (
    <div className="overviewCompactHeader" aria-label="Điều khiển báo cáo cố định">
      <div className="overviewCompactHeaderDate">
        <HeaderDateNavigator
          dateLabelPrefix={dateLabelPrefix}
          dateLabel={dateLabel}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onPreviousDate={onPreviousDate}
          onNextDate={onNextDate}
        />
      </div>
      <HeaderFilterButton appliedFilterCount={appliedFilterCount} onOpenFilters={onOpenFilters} />
    </div>
  );
}
