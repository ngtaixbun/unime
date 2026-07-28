import type {
  EncodedDimensionValue,
} from "@/queries/org-filter";

export type OverviewPeriod =
  | "today"
  | "seven-days"
  | "mtd";

export type OverviewKpiStatus =
  | "good"
  | "warn"
  | "bad"
  | "neutral";

export type OverviewRoute =
  | "overview"
  | "market"
  | "team"
  | "profile"
  | "userguide";

export interface TrendPoint {
  value: number;
  benchmark?: number;
  date?: string;
}

export interface OverviewFilters {
  region: EncodedDimensionValue;
  amm: EncodedDimensionValue;
  supervisor: EncodedDimensionValue;
}

export interface FilterOption {
  label: string;
  value: EncodedDimensionValue;
}

export interface OverviewKpi {
  id: string;
  title: string;
  percent: number | null;
  issued: number | null;
  issuedLabel: string;
  status: OverviewKpiStatus;
  trend: TrendPoint[];
  previousPercent?: number | null;
}

export interface CoverageMetric {
  id: string;
  title: string;
  percent: number;
  actual: number;
  target: number;
  missingLabel: string;
}

export interface OverviewData {
  coverage: CoverageMetric[];
  marketKpis: OverviewKpi[];
  teamKpis: OverviewKpi[];
}

export interface NavigationItem {
  id: OverviewRoute;
  label: string;
}
