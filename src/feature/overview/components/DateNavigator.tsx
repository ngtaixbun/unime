import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface DateNavigatorProps {
  label: string;
  value: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function DateNavigator({
  label,
  value,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: DateNavigatorProps) {
  return (
    <div
      className="mtdDateNav"
      aria-label="Điều hướng chu kỳ MTD"
    >
      {canGoPrevious ? (
        <button
          className="mtdNavBtn"
          type="button"
          onClick={onPrevious}
          aria-label="Chu kỳ trước"
          title="Chu kỳ trước"
        >
          <ChevronLeft />
        </button>
      ) : null}

      <span className="mtdDateText">
        <span className="mtdLabel">
          {label}:
        </span>

        <span className="mtdValue">
          {value}
        </span>
      </span>

      {canGoNext ? (
        <button
          className="mtdNavBtn"
          type="button"
          onClick={onNext}
          aria-label="Chu kỳ sau"
          title="Chu kỳ sau"
        >
          <ChevronRight />
        </button>
      ) : null}
    </div>
  );
}
