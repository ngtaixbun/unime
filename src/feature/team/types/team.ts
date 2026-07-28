export type TeamMetricKey = "calls" | "beat" | "time" | "osa" | "qc";

export type TeamMetricPercentageField =
  | "callsPct"
  | "beatPct"
  | "timePct"
  | "osaPct"
  | "qcPct";

export type TeamMetricActualField =
  | "callsActual"
  | "beatActual"
  | "timeActual"
  | "osaActual"
  | "qcActual";

export type TeamMetricTargetField =
  | "callsTarget"
  | "beatTarget"
  | "timeTarget"
  | "osaTarget"
  | "qcTarget";

export type TeamFilterValue = "all" | (string & {});

export type TeamEntityLevel = "region" | "amm";

export type TeamDetailsTab = "byKpi" | "streak" | "multi" | "manager" | "npp";

export type TeamRiskGroup = "high" | "watch" | "safe";

export interface TeamEmployeeRow {
  date: string;
  employee: string;
  empCode: string;
  region: string;
  amm: string;
  ammCode: string;
  sup: string;
  supCode: string;
  npp: string;
  callsActual: number;
  callsTarget: number;
  callsPct: number;
  beatActual: number;
  beatTarget: number;
  beatPct: number;
  timeActual: number;
  timeTarget: number;
  timePct: number;
  osaActual: number;
  osaTarget: number;
  osaPct: number;
  qcActual: number;
  qcTarget: number;
  qcPct: number;
}

export interface TeamMetricDefinition {
  key: TeamMetricKey;
  name: string;
  pct: TeamMetricPercentageField;
  actual: TeamMetricActualField;
  target: TeamMetricTargetField;
}

export interface TeamFilterState {
  region: TeamFilterValue;
  amm: TeamFilterValue;
  sup: TeamFilterValue;
}

export type TeamFilterDraft = TeamFilterState;

export interface TeamDataMeta {
  dates: readonly string[];
  cycle: string;
  supCode: string;
}

export interface TeamDataSet {
  rows: readonly TeamEmployeeRow[];
  meta: TeamDataMeta;
}

export type TeamData = TeamDataSet;

export interface TeamReportContext {
  reportDate: string;
  dateIndex: number;
  dates: readonly string[];
  cycle: string;
  filters: TeamFilterState;
}

export interface TeamEmployeeDetailsState {
  empCode: string | null;
  metric: TeamMetricKey;
  selectedDate: string | null;
  isOpen: boolean;
}

export interface TeamTrendPoint {
  date: string;
  row: TeamEmployeeRow | null;
  value: number | null;
  delta: number | null;
}

export interface TeamMetricResult {
  metric: TeamMetricDefinition;
  value: number | null;
  fails: number;
}

export interface TeamMetricValues {
  value: number;
  actual: number;
  target: number;
}

export interface TeamEntityGroup {
  id: string;
  name: string;
  sub: string;
  region: string;
  rows: TeamEmployeeRow[];
}

export interface TeamEntityStat extends TeamEntityGroup {
  value: number | null;
  fail: number;
  share: number;
}

export interface TeamStreakResult {
  row: TeamEmployeeRow;
  streak: number;
}

export interface TeamMaxStreakResult extends TeamStreakResult {
  metric: TeamMetricDefinition;
}

export interface TeamSupStat {
  code: string;
  name: string;
  total: number;
  fail: number;
  rate: number;
}

export interface TeamNppStat {
  name: string;
  region: string;
  employees: number;
  actual: number;
  target: number;
  pct: number | null;
}

export interface TeamRiskGroupDefinition {
  key: TeamRiskGroup;
  label: string;
  rule: string;
  rows: TeamEmployeeRow[];
  maxSelectedMetrics: number;
}

export interface TeamRiskSummary {
  histogram: readonly [number, number, number, number, number, number];
  groups: Record<TeamRiskGroup, number>;
  topKpi: TeamMetricResult;
  maxStreak: TeamMaxStreakResult | null;
  topSup: TeamSupStat[];
  topNpp: TeamNppStat[];
}

export interface TeamFilterOption {
  value: string;
  label: string;
}

export interface TeamFilterOptions {
  regions: TeamFilterOption[];
  amms: TeamFilterOption[];
  sups: TeamFilterOption[];
}
