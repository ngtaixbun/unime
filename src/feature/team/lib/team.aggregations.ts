import {
  TEAM_METRIC_MAP,
  TEAM_METRICS,
  TEAM_REGION_ORDER,
  TEAM_RISK_GROUP_COPY,
  TEAM_THRESHOLD,
} from "./team.constants";
import {
  createTeamRowIndex,
  getTeamRow,
  groupTeamRowsByNpp,
  groupTeamRowsBySup,
  matchesTeamFilters,
  selectLastTeamDates,
  selectTeamEntityGroups,
} from "./team.selectors";
import type {
  TeamEmployeeRow,
  TeamEntityLevel,
  TeamEntityStat,
  TeamFilterState,
  TeamMaxStreakResult,
  TeamMetricDefinition,
  TeamMetricKey,
  TeamMetricPercentageField,
  TeamMetricResult,
  TeamNppStat,
  TeamRiskGroup,
  TeamRiskGroupDefinition,
  TeamRiskSummary,
  TeamStreakResult,
  TeamSupStat,
  TeamTrendPoint,
} from "../types";

export function averageTeamField(
  rows: readonly TeamEmployeeRow[],
  field: TeamMetricPercentageField,
): number | null {
  const values = rows
    .map((row) => row[field])
    .filter((value): value is number => Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function averageTeamMetric(
  rows: readonly TeamEmployeeRow[],
  metricKey: TeamMetricKey,
): number | null {
  const metric = TEAM_METRIC_MAP[metricKey];
  const actual = rows.reduce(
    (sum, row) => sum + (Number(row[metric.actual]) || 0),
    0,
  );
  const target = rows.reduce(
    (sum, row) => sum + (Number(row[metric.target]) || 0),
    0,
  );
  return target > 0 ? actual / target : null;
}

export function aggregateTeamEmployeeRows(
  rows: readonly TeamEmployeeRow[],
): TeamEmployeeRow[] {
  return [...rows.reduce((groups, row) => {
    const group = groups.get(row.empCode);
    if (group) group.push(row);
    else groups.set(row.empCode, [row]);
    return groups;
  }, new Map<string, TeamEmployeeRow[]>()).values()]
    .map((employeeRows) => {
      const latest = [...employeeRows].sort(
        (left, right) => left.date.localeCompare(right.date),
      ).at(-1) as TeamEmployeeRow;
      const aggregate = { ...latest };

      TEAM_METRICS.forEach((metric) => {
        const actual = employeeRows.reduce(
          (sum, row) => sum + (Number(row[metric.actual]) || 0),
          0,
        );
        const target = employeeRows.reduce(
          (sum, row) => sum + (Number(row[metric.target]) || 0),
          0,
        );
        aggregate[metric.actual] = actual;
        aggregate[metric.target] = target;
        aggregate[metric.pct] = target > 0 ? actual / target : null;
      });

      return aggregate;
    });
}

export function isTeamMetricRisk(
  row: TeamEmployeeRow,
  metricKey: TeamMetricKey,
  threshold = TEAM_THRESHOLD,
): boolean {
  const value = row[TEAM_METRIC_MAP[metricKey].pct];
  return Number.isFinite(value) && value !== null && value < threshold;
}

export function countFailedTeamMetrics(
  row: TeamEmployeeRow,
  threshold = TEAM_THRESHOLD,
): number {
  return TEAM_METRICS.reduce((count, metric) => {
    const value = row[metric.pct];
    return count + (
      Number.isFinite(value) && value !== null && value < threshold
        ? 1
        : 0
    );
  }, 0);
}

export function getFailedTeamMetricKeys(
  row: TeamEmployeeRow,
  threshold = TEAM_THRESHOLD,
): TeamMetricKey[] {
  return TEAM_METRICS.filter((metric) => {
    const value = row[metric.pct];
    return Number.isFinite(value) && value !== null && value < threshold;
  }).map((metric) => metric.key);
}

export function selectTeamRiskRows(
  rows: readonly TeamEmployeeRow[],
  metricKey: TeamMetricKey | "all" = "all",
  threshold = TEAM_THRESHOLD,
): TeamEmployeeRow[] {
  if (metricKey === "all") {
    return rows.filter((row) => countFailedTeamMetrics(row, threshold) > 0);
  }
  return rows.filter((row) => isTeamMetricRisk(row, metricKey, threshold));
}

export function getTeamRowMinimum(row: TeamEmployeeRow): number {
  return Math.min(
    ...TEAM_METRICS.map((metric) => {
      const value = row[metric.pct];
      return Number.isFinite(value) && value !== null ? value : 9;
    }),
  );
}

export function getTeamRowAverage(row: TeamEmployeeRow): number {
  const values = TEAM_METRICS
    .map((metric) => row[metric.pct])
    .filter((value): value is number => Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function getWorstTeamMetric(row: TeamEmployeeRow): TeamMetricDefinition {
  return [...TEAM_METRICS]
    .sort((left, right) => (row[left.pct] ?? 9) - (row[right.pct] ?? 9))[0];
}

export function sortTeamMetrics(
  rows: readonly TeamEmployeeRow[],
  threshold = TEAM_THRESHOLD,
): TeamMetricResult[] {
  return TEAM_METRICS.map((metric) => ({
    metric,
    value: averageTeamMetric(rows, metric.key),
    fails: selectTeamRiskRows(rows, metric.key, threshold).length,
  })).sort((left, right) => (left.value ?? 9) - (right.value ?? 9));
}

export function calculateTeamEntityStats(
  rows: readonly TeamEmployeeRow[],
  level: TeamEntityLevel,
  metricKey: TeamMetricKey,
  threshold = TEAM_THRESHOLD,
): TeamEntityStat[] {
  return selectTeamEntityGroups(rows, level).map((group) => ({
    ...group,
    value: averageTeamMetric(group.rows, metricKey),
    fail: selectTeamRiskRows(group.rows, metricKey, threshold).length,
    share: rows.length ? group.rows.length / rows.length : 0,
  }));
}

function getTeamRiskGroup(row: TeamEmployeeRow, threshold: number): TeamRiskGroup {
  const failures = countFailedTeamMetrics(row, threshold);
  if (failures >= 3) return "high";
  if (failures >= 1) return "watch";
  return "safe";
}

export function buildTeamRiskGroups(
  rows: readonly TeamEmployeeRow[],
  threshold = TEAM_THRESHOLD,
): TeamRiskGroupDefinition[] {
  const keys: readonly TeamRiskGroup[] = ["high", "watch", "safe"];
  return keys.map((key) => ({
    key,
    ...TEAM_RISK_GROUP_COPY[key],
    rows: rows.filter((row) => getTeamRiskGroup(row, threshold) === key),
  }));
}

export function selectMultiKpiTeamRows(
  rows: readonly TeamEmployeeRow[],
  group: TeamRiskGroup,
  selectedMetrics: readonly TeamMetricKey[],
  threshold = TEAM_THRESHOLD,
): TeamEmployeeRow[] {
  const groupDefinition = buildTeamRiskGroups(rows, threshold).find((item) => item.key === group);
  if (!groupDefinition) return [];

  const selected = selectedMetrics.slice(0, groupDefinition.maxSelectedMetrics);
  const filtered =
    group === "safe" || selected.length === 0
      ? groupDefinition.rows
      : groupDefinition.rows.filter((row) =>
          selected.every((key) => {
            const value = row[TEAM_METRIC_MAP[key].pct];
            return Number.isFinite(value) && value !== null && value < threshold;
          }),
        );

  return [...filtered].sort((left, right) =>
    group === "safe"
      ? getTeamRowAverage(right) - getTeamRowAverage(left)
      : countFailedTeamMetrics(right, threshold) - countFailedTeamMetrics(left, threshold) ||
        getTeamRowMinimum(left) - getTeamRowMinimum(right),
  );
}

export function calculateTeamStreakRows(
  currentRows: readonly TeamEmployeeRow[],
  allRows: readonly TeamEmployeeRow[],
  dates: readonly string[],
  endDate: string,
  metricKey: TeamMetricKey,
  filters: TeamFilterState,
  threshold = TEAM_THRESHOLD,
): TeamStreakResult[] {
  const metric = TEAM_METRIC_MAP[metricKey];
  const rowIndex = createTeamRowIndex(allRows);
  const foundIndex = dates.indexOf(endDate);
  const dateIndex = foundIndex >= 0 ? foundIndex : dates.length - 1;

  return currentRows
    .map((currentRow) => {
      let streak = 0;
      for (let index = dateIndex; index >= 0; index -= 1) {
        const row = getTeamRow(rowIndex, dates[index], currentRow.empCode);
        const value = row?.[metric.pct];
        if (
          row &&
          matchesTeamFilters(row, filters) &&
          Number.isFinite(value) &&
          value !== null &&
          value !== undefined &&
          value < threshold
        ) {
          streak += 1;
        } else {
          break;
        }
      }
      return { row: currentRow, streak };
    })
    .filter((item) => item.streak >= 2)
    .sort(
      (left, right) =>
        right.streak - left.streak ||
        (left.row[metric.pct] ?? 9) - (right.row[metric.pct] ?? 9),
    );
}

export function calculateTeamMaxStreak(
  currentRows: readonly TeamEmployeeRow[],
  allRows: readonly TeamEmployeeRow[],
  dates: readonly string[],
  endDate: string,
  filters: TeamFilterState,
  threshold = TEAM_THRESHOLD,
): TeamMaxStreakResult | null {
  let best: TeamMaxStreakResult | null = null;
  TEAM_METRICS.forEach((metric) => {
    calculateTeamStreakRows(
      currentRows,
      allRows,
      dates,
      endDate,
      metric.key,
      filters,
      threshold,
    ).forEach((item) => {
      if (!best || item.streak > best.streak) best = { ...item, metric };
    });
  });
  return best;
}

export function calculateTopTeamSupStats(
  rows: readonly TeamEmployeeRow[],
  threshold = TEAM_THRESHOLD,
): TeamSupStat[] {
  return [...groupTeamRowsBySup(rows).entries()]
    .map(([code, group]) => {
      const fail = group.filter((row) => countFailedTeamMetrics(row, threshold) > 0).length;
      return {
        code,
        name: group[0].sup,
        total: group.length,
        fail,
        rate: group.length ? fail / group.length : 0,
      };
    })
    .sort(
      (left, right) =>
        right.rate - left.rate ||
        right.fail - left.fail ||
        left.name.localeCompare(right.name, "vi"),
    );
}

export function calculateTeamNppStats(rows: readonly TeamEmployeeRow[]): TeamNppStat[] {
  return [...groupTeamRowsByNpp(rows).entries()]
    .map(([name, group]) => {
      const actual = group.reduce((sum, row) => sum + (Number(row.osaActual) || 0), 0);
      const target = group.reduce((sum, row) => sum + (Number(row.osaTarget) || 0), 0);
      return {
        name,
        region: group[0].region,
        employees: new Set(group.map((row) => row.empCode).filter(Boolean)).size,
        actual,
        target,
        pct: target ? actual / target : null,
      };
    })
    .sort(
      (left, right) =>
        (left.pct ?? 9) - (right.pct ?? 9) || right.employees - left.employees,
    );
}

export function calculateTeamEmployeeTrend(
  rows: readonly TeamEmployeeRow[],
  dates: readonly string[],
  employeeCode: string,
  metricKey: TeamMetricKey,
  endDate: string,
  count = 7,
): TeamTrendPoint[] {
  const metric = TEAM_METRIC_MAP[metricKey];
  const rowIndex = createTeamRowIndex(rows);
  return selectLastTeamDates(dates, endDate, count).map((date) => {
    const row = getTeamRow(rowIndex, date, employeeCode);
    const previousIndex = dates.indexOf(date) - 1;
    const previous =
      previousIndex >= 0 ? getTeamRow(rowIndex, dates[previousIndex], employeeCode) : null;
    const value = row ? row[metric.pct] : null;
    const previousValue = previous ? previous[metric.pct] : null;
    return {
      date,
      row,
      value,
      delta: value == null || previousValue == null ? null : value - previousValue,
    };
  });
}

export function calculateTeamRiskSummary(
  currentRows: readonly TeamEmployeeRow[],
  allRows: readonly TeamEmployeeRow[],
  dates: readonly string[],
  endDate: string,
  filters: TeamFilterState,
  threshold = TEAM_THRESHOLD,
): TeamRiskSummary {
  const histogram = [0, 1, 2, 3, 4, 5].map(
    (count) => currentRows.filter((row) => countFailedTeamMetrics(row, threshold) === count).length,
  ) as [number, number, number, number, number, number];
  const riskGroups = buildTeamRiskGroups(currentRows, threshold);
  const groupCount = (key: TeamRiskGroup): number =>
    riskGroups.find((group) => group.key === key)?.rows.length ?? 0;

  return {
    histogram,
    groups: {
      high: groupCount("high"),
      watch: groupCount("watch"),
      safe: groupCount("safe"),
    },
    topKpi: TEAM_METRICS.map((metric) => ({
      metric,
      value: averageTeamMetric(currentRows, metric.key),
      fails: selectTeamRiskRows(currentRows, metric.key, threshold).length,
    })).sort((left, right) => right.fails - left.fails)[0] ?? {
      metric: TEAM_METRICS[0],
      value: null,
      fails: 0,
    },
    maxStreak: calculateTeamMaxStreak(
      currentRows,
      allRows,
      dates,
      endDate,
      filters,
      threshold,
    ),
    topSup: calculateTopTeamSupStats(currentRows, threshold).slice(0, 3),
    topNpp: calculateTeamNppStats(currentRows).slice(0, 3),
  };
}

export function sortTeamManagerRiskRows(rows: readonly TeamEmployeeRow[]): TeamEmployeeRow[] {
  return [...rows].sort((left, right) => getTeamRowMinimum(left) - getTeamRowMinimum(right));
}

export function sortTeamRegions(rows: readonly TeamEmployeeRow[]): string[] {
  return TEAM_REGION_ORDER.filter((region) => rows.some((row) => row.region === region));
}
