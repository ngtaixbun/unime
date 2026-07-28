import { LogOut, SlidersHorizontal } from "lucide-react";
import type { ReactNode, Ref } from "react";

import logoUrl from "@/assets/unilever-logo.png";

import "./dashboard-header.css";

interface DashboardHeaderProps {
  title?: string;
  cycleLabel?: string;
  dateNavigator: ReactNode;
  appliedFilterCount: number;
  actionRowRef?: Ref<HTMLDivElement>;
  onLogout: () => void;
  onOpenFilters: () => void;
}

interface DashboardCompactHeaderProps {
  dateNavigator: ReactNode;
  appliedFilterCount: number;
  onOpenFilters: () => void;
}

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

export function DashboardHeader({
  title = "Tổng quan",
  cycleLabel,
  dateNavigator,
  appliedFilterCount,
  actionRowRef,
  onLogout,
  onOpenFilters,
}: DashboardHeaderProps) {
  return (
    <div className="nwUnifiedHeader overviewUnifiedHeader dashboardUnifiedHeader overviewFullHeader">
      <div aria-label="Phạm vi báo cáo và chu kì" className="nwHeaderTitleRow nwHeaderIdentityRow">
        <div aria-hidden="true" className="nwHeaderBrand"><img alt="Unilever" src={logoUrl} /></div>
        <h1 className="nwHeaderTitle">{title}</h1>
        <button
          className="nwHeaderLogoutBtn"
          type="button"
          onClick={onLogout}
          aria-label="Đăng xuất"
        >
          <LogOut className="headerIconSvg" />
        </button>
        {cycleLabel ? <p className="nwHeaderCycle">{cycleLabel}</p> : null}
      </div>
      <div className="screenHeader">
        <div className="toprow nwHeaderControlsRow" ref={actionRowRef}>
          <div
            className={`overviewFullHeaderDateSlot${cycleLabel ? " nwHeaderActionCenter" : ""}`}
          >
            {dateNavigator}
          </div>
          <div className="overviewFullHeaderFilterSlot">
            <HeaderFilterButton appliedFilterCount={appliedFilterCount} onOpenFilters={onOpenFilters} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardCompactHeader({
  dateNavigator,
  appliedFilterCount,
  onOpenFilters,
}: DashboardCompactHeaderProps) {
  return (
    <div className="overviewCompactHeader" aria-label="Điều khiển báo cáo cố định">
      <div className="overviewCompactHeaderDate">
        {dateNavigator}
      </div>
      <HeaderFilterButton appliedFilterCount={appliedFilterCount} onOpenFilters={onOpenFilters} />
    </div>
  );
}
