import { ChevronLeft, ChevronRight } from "lucide-react";

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
    <div className="mtdDateNav" aria-label="Điều hướng ngày báo cáo">
      <button className="mtdNavBtn" type="button" disabled={!canGoPrevious} onClick={onPrevious} aria-label="Ngày trước">
        <ChevronLeft />
      </button>
      <span className="mtdDateText">
        <span className="mtdLabel">{label}:</span>
        <span className="mtdValue">{value}</span>
      </span>
      <button className="mtdNavBtn" type="button" disabled={!canGoNext} onClick={onNext} aria-label="Ngày sau">
        <ChevronRight />
      </button>
    </div>
  );
}
