import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  formatReportDateRange,
  getAdjacentReportDate,
  getReportDateRange,
  getReportPeriodLabel,
  normalizeReportPeriod,
  resolveReportAnchorDate,
  selectReportDates,
  type ReportPeriod,
} from "@/lib/report-period";

interface UseReportPeriodOptions {
  dates: readonly string[];
  initialPeriod?: ReportPeriod | string | null;
  initialAnchorDate?: string | null;
}

export function useReportPeriod({
  dates,
  initialPeriod,
  initialAnchorDate,
}: UseReportPeriodOptions) {
  const [period, setPeriod] = useState<ReportPeriod>(
    () => normalizeReportPeriod(initialPeriod),
  );
  const [anchorDate, setAnchorDate] = useState(
    () => resolveReportAnchorDate(dates, initialAnchorDate),
  );

  useEffect(() => {
    // Keep the selection valid when a refreshed source changes its available dates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnchorDate((current) => resolveReportAnchorDate(
      dates,
      current || initialAnchorDate,
    ));
  }, [dates, initialAnchorDate]);

  const dateRange = useMemo(
    () => getReportDateRange(period, anchorDate),
    [anchorDate, period],
  );
  const reportDates = useMemo(
    () => selectReportDates(dates, dateRange),
    [dateRange, dates],
  );
  const previousDate = getAdjacentReportDate(dates, anchorDate, -1);
  const nextDate = getAdjacentReportDate(dates, anchorDate, 1);

  const goToPreviousDate = useCallback(() => {
    if (previousDate) setAnchorDate(previousDate);
  }, [previousDate]);
  const goToNextDate = useCallback(() => {
    if (nextDate) setAnchorDate(nextDate);
  }, [nextDate]);

  return {
    period,
    setPeriod,
    anchorDate,
    setAnchorDate,
    dateRange,
    reportDates,
    periodLabel: getReportPeriodLabel(period),
    dateLabel: formatReportDateRange(dateRange),
    canGoPrevious: previousDate !== null,
    canGoNext: nextDate !== null,
    goToPreviousDate,
    goToNextDate,
  };
}
