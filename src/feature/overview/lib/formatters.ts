export {
  formatSemanticDateRange,
  formatSemanticIsoDate,
  formatSemanticShortDate,
} from "@/lib/semantic-date";

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}