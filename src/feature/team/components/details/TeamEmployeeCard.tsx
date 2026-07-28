import {
  TEAM_METRIC_MAP,
  countFailedTeamMetrics,
  formatTeamNumber,
  formatTeamPercentage,
  isTeamMetricRisk,
} from "../../lib";
import type { TeamEmployeeRow, TeamMetricKey } from "../../types";

interface TeamEmployeeCardProps {
  row: TeamEmployeeRow;
  metrics: TeamMetricKey[];
  onOpen: (employeeCode: string, metric?: TeamMetricKey) => void;
}

export function TeamEmployeeCard({ row, metrics, onOpen }: TeamEmployeeCardProps) {
  const failures = countFailedTeamMetrics(row);
  return (
    <button className="team-employee-card" type="button" onClick={() => onOpen(row.empCode, metrics[0])}>
      <span className="team-employee-card__head">
        <span><b>{row.employee}</b><small>{row.region} · {row.amm} · {row.sup}</small></span>
        <i className={`team-status-chip ${failures ? "is-risk" : "is-ok"}`}>
          {failures ? `Rớt ${failures}/5 KPI` : "Ổn định 0/5 KPI"}
        </i>
      </span>
      <span className="team-metric-head"><span>KPI</span><span>Actual / Target</span><span>Thực đạt</span></span>
      {metrics.map((metric) => {
        const definition = TEAM_METRIC_MAP[metric];
        const isRisk = isTeamMetricRisk(row, metric);
        return (
          <span className={`team-metric-row ${isRisk ? "is-risk" : "is-ok"}`} key={metric}>
            <span>{definition.name}</span>
            <b>{formatTeamNumber(row[definition.actual])} / {formatTeamNumber(row[definition.target])}</b>
            <strong>{formatTeamPercentage(row[definition.pct])}</strong>
          </span>
        );
      })}
    </button>
  );
}
