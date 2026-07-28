import type {
  TeamDetailsTab,
  TeamFilterState,
  TeamMetricDefinition,
  TeamMetricKey,
  TeamRiskGroup,
} from "../types";

export const TEAM_THRESHOLD = 0.8;
export const TEAM_CHART_MAX_VALUE = 1.05;

export const TEAM_METRICS = [
  {
    key: "calls",
    name: "Successful Calls",
    pct: "callsPct",
    actual: "callsActual",
    target: "callsTarget",
  },
  {
    key: "beat",
    name: "Tần suất viếng thăm",
    pct: "beatPct",
    actual: "beatActual",
    target: "beatTarget",
  },
  {
    key: "time",
    name: "Time Spend",
    pct: "timePct",
    actual: "timeActual",
    target: "timeTarget",
  },
  {
    key: "osa",
    name: "OSA",
    pct: "osaPct",
    actual: "osaActual",
    target: "osaTarget",
  },
  {
    key: "qc",
    name: "QC",
    pct: "qcPct",
    actual: "qcActual",
    target: "qcTarget",
  },
] as const satisfies readonly TeamMetricDefinition[];

export const TEAM_METRIC_MAP = Object.fromEntries(
  TEAM_METRICS.map((metric) => [metric.key, metric]),
) as Readonly<Record<TeamMetricKey, TeamMetricDefinition>>;

export const TEAM_REGION_ORDER = ["North", "Central", "MKD", "HCME"] as const;

export const TEAM_REGION_PALETTE: Readonly<Record<string, string>> = {
  North: "#67C6A6",
  Central: "#78AEEA",
  MKD: "#F0AE4B",
  HCME: "#F2C56B",
};

export const TEAM_FALLBACK_GROUP_COLOR = "#A8B0BD";

export const EMPTY_TEAM_FILTERS: Readonly<TeamFilterState> = {
  region: "all",
  amm: "all",
  sup: "all",
};

export const TEAM_DETAILS_TABS: ReadonlyArray<{
  key: TeamDetailsTab;
  label: string;
}> = [
  { key: "byKpi", label: "Xem theo KPI" },
  { key: "streak", label: "Rớt chuỗi nhiều ngày" },
  { key: "multi", label: "Rớt nhiều KPI" },
  { key: "manager", label: "Xem theo Quản lý" },
  { key: "npp", label: "Theo NPP" },
];

export const TEAM_RISK_GROUP_COPY: Readonly<
  Record<TeamRiskGroup, { label: string; rule: string; maxSelectedMetrics: number }>
> = {
  high: { label: "Rủi ro cao", rule: "Rớt 3–5 KPI", maxSelectedMetrics: 5 },
  watch: { label: "Cần chú ý", rule: "Rớt 1–2 KPI", maxSelectedMetrics: 2 },
  safe: { label: "Ổn định", rule: "0 KPI rớt", maxSelectedMetrics: 0 },
};

export function getTeamGroupColor(region: string): string {
  return TEAM_REGION_PALETTE[region] ?? TEAM_FALLBACK_GROUP_COLOR;
}

export function getTeamBarRatio(
  value: number | null,
  maximum = TEAM_CHART_MAX_VALUE,
): number {
  if (value === null || !Number.isFinite(value) || maximum <= 0) return 0;
  return Math.max(0, Math.min(1, value / maximum));
}

export const TEAM_TARGET_LINE_RATIO = getTeamBarRatio(TEAM_THRESHOLD);
