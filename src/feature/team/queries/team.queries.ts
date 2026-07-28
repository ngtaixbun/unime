import { TEAM_DATA } from "../data";
import { selectCurrentTeamRows, selectRowsByDate, selectTeamEmployeeRows } from "../lib";
import type { TeamDataSet, TeamEmployeeRow, TeamFilterState } from "../types";

/**
 * Read-only access boundary for the HTML-sourced Team dataset.
 * It can be replaced by a validated remote query without changing consumers.
 */
export const teamQueries = {
  getData(): TeamDataSet {
    return TEAM_DATA;
  },

  getRowsByDate(date: string): TeamEmployeeRow[] {
    return selectRowsByDate(TEAM_DATA.rows, date);
  },

  getCurrentRows(date: string, filters: TeamFilterState): TeamEmployeeRow[] {
    return selectCurrentTeamRows(TEAM_DATA.rows, date, filters);
  },

  getEmployeeRows(employeeCode: string): TeamEmployeeRow[] {
    return selectTeamEmployeeRows(TEAM_DATA.rows, TEAM_DATA.meta.dates, employeeCode);
  },
};
