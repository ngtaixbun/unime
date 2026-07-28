import { CalendarDays, LineChart, TrendingUp } from "lucide-react";

import { getPeriodLabel, OVERVIEW_PERIODS } from "../lib";
import type { OverviewPeriod } from "../types";

interface PeriodTabsProps {
  period: OverviewPeriod;
  onChange: (period: OverviewPeriod) => void;
}

const icons = {
  today: CalendarDays,
  "seven-days": TrendingUp,
  mtd: LineChart,
};

export function PeriodTabs({ period, onChange }: PeriodTabsProps) {
  return (
    <div className="overviewPeriodBelow" role="group" aria-label="Chọn chu kỳ">
      {OVERVIEW_PERIODS.map((item) => {
        const Icon = icons[item];
        return (
          <button
            key={item}
            className={`memv2-period-btn ${period === item ? "active" : ""}`}
            type="button"
            onClick={() => onChange(item)}
            aria-pressed={period === item}
          >
            <Icon className="periodIcon" aria-hidden="true" />
            <span>{getPeriodLabel(item)}</span>
          </button>
        );
      })}
    </div>
  );
}
