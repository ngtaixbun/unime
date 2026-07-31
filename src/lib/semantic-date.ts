export type SemanticDateValue =
  | string
  | Date;

interface DateParts {
  day: number;
  month: number;
  year: number;
}

function isValidDateParts({
  day,
  month,
  year,
}: DateParts): boolean {
  const candidate = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function getDateParts(
  value: unknown,
): DateParts | null {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      return null;
    }

    return {
      day: value.getDate(),
      month: value.getMonth() + 1,
      year: value.getFullYear(),
    };
  }

  if (typeof value !== "string") {
    return null;
  }

  const isoMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/,
  );

  if (isoMatch) {
    const parts = {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };

    return isValidDateParts(parts)
      ? parts
      : null;
  }

  const serializedMatch = value.match(
    /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/,
  );

  if (!serializedMatch) {
    return null;
  }

  const date = new Date(
    Number(serializedMatch[1]),
  );

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function formatSemanticShortDate(
  value: SemanticDateValue,
): string | null {
  const parts = getDateParts(value);

  if (!parts) {
    return null;
  }

  return [
    String(parts.day).padStart(2, "0"),
    String(parts.month).padStart(2, "0"),
  ].join("/");
}

export function formatSemanticDateRange(
  start: SemanticDateValue,
  end: SemanticDateValue,
): string {
  const formattedStart =
    formatSemanticShortDate(start);
  const formattedEnd =
    formatSemanticShortDate(end);

  if (!formattedStart || !formattedEnd) {
    return "";
  }

  return `${formattedStart} - ${formattedEnd}`;
}

export function formatSemanticIsoDate(
  value: SemanticDateValue,
): string | null {
  const parts = getDateParts(value);

  if (!parts) {
    return null;
  }

  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}