import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface DateNavigatorProps {
  prefix: string;
  value: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function DateNavigator({
  prefix,
  value,
  canGoPrevious = true,
  canGoNext = true,
  onPrevious,
  onNext,
}: DateNavigatorProps) {
  return (
    <div
      className="dashboard-date-navigator"
      aria-label="Điều hướng ngày báo cáo"
    >
      <button
        className="dashboard-date-navigator__button"
        type="button"
        disabled={!canGoPrevious}
        onClick={onPrevious}
        aria-label="Kỳ báo cáo trước"
        title="Kỳ báo cáo trước"
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <span className="dashboard-date-navigator__text">
        <span className="dashboard-date-navigator__prefix">
          {prefix}:
        </span>
        <span className="dashboard-date-navigator__value">
          {value}
        </span>
      </span>
      <button
        className="dashboard-date-navigator__button"
        type="button"
        disabled={!canGoNext}
        onClick={onNext}
        aria-label="Kỳ báo cáo sau"
        title="Kỳ báo cáo sau"
      >
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}
