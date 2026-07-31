import {
  CalendarDays,
  ChartNoAxesCombined,
  TrendingUp,
} from "lucide-react";

import {
  getReportPeriodLabel,
  REPORT_PERIODS,
  type ReportPeriod,
} from "@/lib/report-period";

import "./report-period-mode.css";

interface ReportPeriodModeProps {
  period: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
  isPeriodEnabled?: (period: ReportPeriod) => boolean;
  disableUnavailableInteraction?: boolean;
}

const icons = {
  today: CalendarDays,
  "7days": TrendingUp,
  mtd: ChartNoAxesCombined,
} satisfies Record<ReportPeriod, typeof CalendarDays>;

export function ReportPeriodMode({
  period,
  onChange,
  isPeriodEnabled = () => true,
  disableUnavailableInteraction = false,
}: ReportPeriodModeProps) {
  return (
    <div
      className="report-period-mode"
      role="group"
      aria-label="Chọn chu kỳ báo cáo"
    >
      {REPORT_PERIODS.map((item) => {
        const Icon = icons[item];
        const isActive = period === item;
        const isEnabled = isPeriodEnabled(item);

        return (
          <button
            key={item}
            className="report-period-mode__item"
            data-active={isActive ? "true" : "false"}
            data-enabled={isEnabled ? "true" : "false"}
            type="button"
            disabled={
              disableUnavailableInteraction &&
              !isEnabled
            }
            onClick={() => onChange(item)}
            aria-pressed={isActive}
            aria-disabled={!isEnabled}
          >
            <Icon aria-hidden="true" />
            <span>{getReportPeriodLabel(item)}</span>
          </button>
        );
      })}
    </div>
  );
}
