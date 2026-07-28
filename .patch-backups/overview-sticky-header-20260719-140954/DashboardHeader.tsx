import { ArrowLeft, SlidersHorizontal } from "lucide-react";

import logoUrl from "@/feature/overview/assets/images/unilever-logo.png";
import { getPeriodLabel } from "@/feature/overview/lib";
import type { OverviewPeriod } from "@/feature/overview/types";
import { DateNavigator } from "@/feature/overview/components/DateNavigator";

interface DashboardHeaderProps {
  cycleLabel: string;
  period: OverviewPeriod;
  dateLabel: string;
  appliedFilterCount: number;
  onBack: () => void;
  onOpenFilters: () => void;
  onPreviousDate: () => void;
  onNextDate: () => void;
}

export function DashboardHeader({
  cycleLabel,
  period,
  dateLabel,
  appliedFilterCount,
  onBack,
  onOpenFilters,
  onPreviousDate,
  onNextDate,
}: DashboardHeaderProps) {
  return (
    <div className="nwUnifiedHeader overviewUnifiedHeader dashboardUnifiedHeader">
      <div aria-label="Phạm vi báo cáo và chu kì" className="nwHeaderTitleRow">
        <div aria-hidden="true" className="nwHeaderBrand">
          <img alt="Unilever" src={logoUrl} />
        </div>
        <h1 className="nwHeaderTitle">Tổng quan</h1>
        <p className="nwHeaderCycle">{cycleLabel}</p>
      </div>
      <div className="screenHeader">
        <div className="toprow">
          <button className="backBtn" type="button" onClick={onBack} aria-label="Quay lại">
            <ArrowLeft className="headerIconSvg" />
          </button>
          <div className="nwHeaderActionCenter">
            <DateNavigator label={getPeriodLabel(period)} value={dateLabel} onPrevious={onPreviousDate} onNext={onNextDate} />
          </div>
          <button
            className={`headerFilterBtn ${appliedFilterCount > 0 ? "filtered" : ""}`}
            type="button"
            onClick={onOpenFilters}
            aria-label="Mở bộ lọc"
          >
            <span className="filterNavSvg">
              <SlidersHorizontal />
            </span>
            <span className="filterNavBadge" hidden={appliedFilterCount === 0}>
              {appliedFilterCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
