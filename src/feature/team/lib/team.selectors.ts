import { TEAM_METRIC_MAP, TEAM_REGION_ORDER } from "./team.constants";
import type {
  TeamEmployeeRow,
  TeamEntityGroup,
  TeamEntityLevel,
  TeamFilterOption,
  TeamFilterOptions,
  TeamFilterState,
  TeamMetricKey,
  TeamMetricValues,
} from "../types";

export function groupTeamRowsBy<Key>(
  rows: readonly TeamEmployeeRow[],
  keySelector: (row: TeamEmployeeRow) => Key,
): Map<Key, TeamEmployeeRow[]> {
  const groups = new Map<Key, TeamEmployeeRow[]>();
  rows.forEach((row) => {
    const key = keySelector(row);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  });
  return groups;
}

export function groupTeamRowsByRegion(
  rows: readonly TeamEmployeeRow[],
): Map<string, TeamEmployeeRow[]> {
  return groupTeamRowsBy(rows, (row) => row.region);
}

export function groupTeamRowsByAmm(
  rows: readonly TeamEmployeeRow[],
): Map<string, TeamEmployeeRow[]> {
  return groupTeamRowsBy(rows, (row) => row.ammCode);
}

export function groupTeamRowsBySup(
  rows: readonly TeamEmployeeRow[],
): Map<string, TeamEmployeeRow[]> {
  return groupTeamRowsBy(rows, (row) => row.supCode);
}

export function groupTeamRowsByNpp(
  rows: readonly TeamEmployeeRow[],
): Map<string, TeamEmployeeRow[]> {
  return groupTeamRowsBy(rows, (row) => row.npp || "Chưa xác định NPP");
}

export function selectRowsByDate(
  rows: readonly TeamEmployeeRow[],
  date: string,
): TeamEmployeeRow[] {
  return rows.filter((row) => row.date === date);
}

export function matchesTeamFilters(
  row: TeamEmployeeRow,
  filters: TeamFilterState,
): boolean {
  return (
    (filters.region === "all" || row.region === filters.region) &&
    (filters.amm === "all" || row.ammCode === filters.amm) &&
    (filters.sup === "all" || row.supCode === filters.sup)
  );
}

export function filterTeamRows(
  rows: readonly TeamEmployeeRow[],
  filters: TeamFilterState,
): TeamEmployeeRow[] {
  return rows.filter((row) => matchesTeamFilters(row, filters));
}

export function selectCurrentTeamRows(
  rows: readonly TeamEmployeeRow[],
  date: string,
  filters: TeamFilterState,
): TeamEmployeeRow[] {
  return filterTeamRows(selectRowsByDate(rows, date), filters);
}

export function countAppliedTeamFilters(filters: TeamFilterState): number {
  return Object.values(filters).filter((value) => value && value !== "all").length;
}

export function findTeamAmmName(rows: readonly TeamEmployeeRow[], code: string): string {
  return rows.find((row) => row.ammCode === code)?.amm ?? code;
}

export function findTeamSupName(rows: readonly TeamEmployeeRow[], code: string): string {
  return rows.find((row) => row.supCode === code)?.sup ?? code;
}

export function getTeamFilterSummary(
  rows: readonly TeamEmployeeRow[],
  filters: TeamFilterState,
): string {
  const parts: string[] = [];
  if (filters.region !== "all") parts.push(filters.region);
  if (filters.amm !== "all") parts.push(findTeamAmmName(rows, filters.amm));
  if (filters.sup !== "all") parts.push(findTeamSupName(rows, filters.sup));
  return parts.length ? parts.join(" · ") : "Tất cả dữ liệu";
}

function compareByRegionThenName(
  left: { region: string; name: string },
  right: { region: string; name: string },
): number {
  return (
    TEAM_REGION_ORDER.indexOf(left.region as (typeof TEAM_REGION_ORDER)[number]) -
      TEAM_REGION_ORDER.indexOf(right.region as (typeof TEAM_REGION_ORDER)[number]) ||
    left.name.localeCompare(right.name, "vi")
  );
}

export function selectTeamFilterOptions(
  currentDateRows: readonly TeamEmployeeRow[],
  draft: TeamFilterState,
): TeamFilterOptions {
  const regions = TEAM_REGION_ORDER.filter((region) =>
    currentDateRows.some((row) => row.region === region),
  ).map<TeamFilterOption>((region) => ({ value: region, label: region }));

  const ammCandidates = currentDateRows.filter(
    (row) => draft.region === "all" || row.region === draft.region,
  );
  const amms = [...groupTeamRowsBy(ammCandidates, (row) => row.ammCode).entries()]
    .map(([code, group]) => ({
      value: code,
      name: group[0].amm,
      region: group[0].region,
      label: `${group[0].amm} · ${group[0].region}`,
    }))
    .sort(compareByRegionThenName)
    .map<TeamFilterOption>(({ value, label }) => ({ value, label }));

  const supCandidates = currentDateRows.filter(
    (row) =>
      (draft.region === "all" || row.region === draft.region) &&
      (draft.amm === "all" || row.ammCode === draft.amm),
  );
  const sups = [...groupTeamRowsBy(supCandidates, (row) => row.supCode).entries()]
    .map(([code, group]) => ({
      value: code,
      name: group[0].sup,
      region: group[0].region,
      label: group[0].sup,
    }))
    .sort(compareByRegionThenName)
    .map<TeamFilterOption>(({ value, label }) => ({ value, label }));

  return { regions, amms, sups };
}

export function normalizeTeamFilterDraft(
  draft: TeamFilterState,
  options: TeamFilterOptions,
): TeamFilterState {
  const amm = options.amms.some((option) => option.value === draft.amm) ? draft.amm : "all";
  const sup = options.sups.some((option) => option.value === draft.sup) ? draft.sup : "all";
  return { region: draft.region, amm, sup };
}

export function selectTeamEntityGroups(
  rows: readonly TeamEmployeeRow[],
  level: TeamEntityLevel,
): TeamEntityGroup[] {
  if (level === "region") {
    return TEAM_REGION_ORDER.flatMap((region) => {
      const group = rows.filter((row) => row.region === region);
      return group.length
        ? [{ id: region, name: region, sub: "Khu vực", region, rows: group }]
        : [];
    });
  }

  return [...groupTeamRowsBy(rows, (row) => row.ammCode).entries()]
    .map(([code, group]) => ({
      id: code,
      name: group[0].amm,
      sub: group[0].region,
      region: group[0].region,
      rows: group,
    }))
    .sort(compareByRegionThenName);
}

export function createTeamRowIndex(
  rows: readonly TeamEmployeeRow[],
): ReadonlyMap<string, TeamEmployeeRow> {
  return new Map(rows.map((row) => [`${row.date}|${row.empCode}`, row]));
}

export function getTeamRow(
  index: ReadonlyMap<string, TeamEmployeeRow>,
  date: string,
  employeeCode: string,
): TeamEmployeeRow | null {
  return index.get(`${date}|${employeeCode}`) ?? null;
}

export function selectTeamEmployeeRows(
  rows: readonly TeamEmployeeRow[],
  dates: readonly string[],
  employeeCode: string,
): TeamEmployeeRow[] {
  const index = createTeamRowIndex(rows);
  return dates.flatMap((date) => {
    const row = getTeamRow(index, date, employeeCode);
    return row ? [row] : [];
  });
}

export function selectLastTeamDates(
  dates: readonly string[],
  endDate: string,
  count = 7,
): string[] {
  const foundIndex = dates.indexOf(endDate);
  const endIndex = foundIndex >= 0 ? foundIndex : dates.length - 1;
  return dates.slice(Math.max(0, endIndex - Math.max(1, count) + 1), endIndex + 1);
}

export function selectMetricValue(
  row: TeamEmployeeRow,
  metricKey: TeamMetricKey,
): number {
  return row[TEAM_METRIC_MAP[metricKey].pct];
}

export function selectMetricActual(
  row: TeamEmployeeRow,
  metricKey: TeamMetricKey,
): number {
  return row[TEAM_METRIC_MAP[metricKey].actual];
}

export function selectMetricTarget(
  row: TeamEmployeeRow,
  metricKey: TeamMetricKey,
): number {
  return row[TEAM_METRIC_MAP[metricKey].target];
}

export function selectMetricValues(
  row: TeamEmployeeRow,
  metricKey: TeamMetricKey,
): TeamMetricValues {
  return {
    value: selectMetricValue(row, metricKey),
    actual: selectMetricActual(row, metricKey),
    target: selectMetricTarget(row, metricKey),
  };
}
