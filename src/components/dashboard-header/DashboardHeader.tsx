import { LogOut } from "lucide-react";
import type { Ref } from "react";

import logoUrl from "@/assets/unilever-logo.png";

import {
  DateNavigator,
  type DateNavigatorProps,
} from "./DateNavigator";
import { HeaderFilterTrigger } from "./HeaderFilterTrigger";
import "./dashboard-header.css";

interface DashboardHeaderProps {
  title?: string;
  cycleLabel?: string;
  dateNavigator: DateNavigatorProps;
  appliedFilterCount: number;
  actionRowRef?: Ref<HTMLDivElement>;
  backAriaLabel?: string;
  sticky?: boolean;
  onBack: () => void;
  onOpenFilters: () => void;
}

interface DashboardCompactHeaderProps {
  dateNavigator: DateNavigatorProps;
  appliedFilterCount: number;
  onOpenFilters: () => void;
}

export function DashboardHeader({
  title = "Tổng quan",
  cycleLabel,
  dateNavigator,
  appliedFilterCount,
  actionRowRef,
  backAriaLabel = "Quay lại",
  sticky = false,
  onBack,
  onOpenFilters,
}: DashboardHeaderProps) {
  return (
    <header
      className="dashboard-header overviewFullHeader"
      data-sticky={sticky ? "true" : "false"}
    >
      <div aria-label="Phạm vi báo cáo và chu kì" className="nwHeaderTitleRow nwHeaderIdentityRow">
        <div aria-hidden="true" className="nwHeaderBrand"><img alt="Unilever" src={logoUrl} /></div>
        <div className="dashboard-header__heading">
          <h1 className="nwHeaderTitle">{title}</h1>
          <p
            className="nwHeaderCycle"
            data-empty={cycleLabel ? "false" : "true"}
            aria-hidden={cycleLabel ? undefined : true}
          >
            {cycleLabel || "\u00a0"}
          </p>
        </div>
        <button
          className="nwHeaderBackBtn"
          type="button"
          onClick={onBack}
          aria-label={backAriaLabel}
        >
          <LogOut aria-hidden="true" />
        </button>
      </div>
      <div className="screenHeader">
        <div className="toprow nwHeaderControlsRow" ref={actionRowRef}>
          <div className="overviewFullHeaderDateSlot">
            <DateNavigator {...dateNavigator} />
          </div>
          <div className="overviewFullHeaderFilterSlot">
            <HeaderFilterTrigger
              appliedFilterCount={appliedFilterCount}
              onOpen={onOpenFilters}
            />
          </div>
        </div>
      </div>
    </header>
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
        <DateNavigator {...dateNavigator} />
      </div>
      <HeaderFilterTrigger
        appliedFilterCount={appliedFilterCount}
        onOpen={onOpenFilters}
      />
    </div>
  );
}
