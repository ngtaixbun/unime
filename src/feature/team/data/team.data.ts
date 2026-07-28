import rawTeamData from "./team.raw.json";
import type { TeamDataSet } from "../types";

/** Exact dataset extracted from the `team-data` script in the requested team.html. */
export const TEAM_DATA: TeamDataSet = rawTeamData;

export const TEAM_ROWS = TEAM_DATA.rows;
export const TEAM_DATES = TEAM_DATA.meta.dates;
export const TEAM_REPORT_CYCLE = TEAM_DATA.meta.cycle;
