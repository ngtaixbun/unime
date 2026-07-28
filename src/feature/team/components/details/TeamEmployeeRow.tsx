import { TEAM_METRIC_MAP, formatTeamNumber, formatTeamPercentage } from "../../lib";
import type { TeamEmployeeRow as TeamEmployeeRowData, TeamMetricKey } from "../../types";

interface TeamEmployeeRowProps {
  row: TeamEmployeeRowData;
  metric: TeamMetricKey;
  extra?: string;
  onOpen: (employeeCode: string, metric: TeamMetricKey) => void;
}

export function TeamEmployeeRow({ row, metric, extra, onOpen }: TeamEmployeeRowProps) {
  const definition = TEAM_METRIC_MAP[metric];
  return (
    <button className="team-employee-row" type="button" onClick={() => onOpen(row.empCode, metric)}>
      <span>
        <b>{row.employee}</b>
        {extra ? (<span>{extra}</span>) : null}
      </span>
      <span className="team-employee-score">
        <strong>{formatTeamPercentage(row[definition.pct])}</strong>
        <em>{formatTeamNumber(row[definition.actual])} / {formatTeamNumber(row[definition.target])}</em>
      </span>
    </button>
  );
}
