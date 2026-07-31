export type ReportPeriod =
  | "today"
  | "7days"
  | "mtd";

export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export const REPORT_PERIODS: readonly ReportPeriod[] = [
  "today",
  "7days",
  "mtd",
];

const PERIOD_LABELS: Readonly<Record<ReportPeriod, string>> = {
  today: "Hôm nay",
  "7days": "7 Ngày",
  mtd: "MTD",
};

function parseIsoDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ));

  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  )
    ? date
    : null;
}

function toIsoDate(date: Date): string {
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function formatDateParts(value: string, includeYear: boolean): string {
  const date = parseIsoDate(value);
  if (!date) return "";

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear());
  return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

export function getReportPeriodLabel(period: ReportPeriod): string {
  return PERIOD_LABELS[period];
}

export function normalizeReportPeriod(
  value: string | null | undefined,
  fallback: ReportPeriod = "mtd",
): ReportPeriod {
  if (value === "seven-days") return "7days";
  return REPORT_PERIODS.includes(value as ReportPeriod)
    ? value as ReportPeriod
    : fallback;
}

export function shiftReportDate(value: string, days: number): string {
  const date = parseIsoDate(value);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

export function getReportDateRange(
  period: ReportPeriod,
  anchorDate: string,
): ReportDateRange {
  const anchor = parseIsoDate(anchorDate);
  if (!anchor) return { startDate: "", endDate: "" };

  if (period === "today") {
    return { startDate: anchorDate, endDate: anchorDate };
  }

  if (period === "7days") {
    return {
      startDate: shiftReportDate(anchorDate, -6),
      endDate: anchorDate,
    };
  }

  return {
    startDate: toIsoDate(new Date(Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      1,
    ))),
    endDate: anchorDate,
  };
}

export function formatReportDateRange(
  range: ReportDateRange,
): string {
  if (!range.startDate || !range.endDate) return "";
  if (range.startDate === range.endDate) {
    return formatDateParts(range.endDate, true);
  }
  return `${formatDateParts(range.startDate, false)} - ${formatDateParts(range.endDate, false)}`;
}

export function selectReportDates(
  dates: readonly string[],
  range: ReportDateRange,
): string[] {
  return dates.filter(
    (date) =>
      date >= range.startDate &&
      date <= range.endDate,
  );
}

export function resolveReportAnchorDate(
  dates: readonly string[],
  requestedDate?: string | null,
): string {
  if (dates.length === 0) return "";
  if (!requestedDate) return dates.at(-1) ?? "";

  if (dates.includes(requestedDate)) return requestedDate;
  return [...dates].reverse().find((date) => date <= requestedDate)
    ?? dates[0];
}

export function getAdjacentReportDate(
  dates: readonly string[],
  anchorDate: string,
  direction: -1 | 1,
): string | null {
  const index = dates.indexOf(anchorDate);
  const nextIndex = index + direction;
  return index >= 0 && nextIndex >= 0 && nextIndex < dates.length
    ? dates[nextIndex]
    : null;
}
