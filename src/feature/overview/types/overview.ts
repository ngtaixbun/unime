import type {
  OrganizationFilterOption,
  OrganizationFilters,
} from "@/components/organization-filter/organization-filter.types";

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

export type OverviewFilters =
  OrganizationFilters;

export type FilterOption =
  OrganizationFilterOption;

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
