import { sortTeamMetrics, selectTeamRiskRows } from "../../lib";
import type { TeamEmployeeRow, TeamMetricKey } from "../../types";
import { TeamEmployeeRow as EmployeeRow } from "./TeamEmployeeRow";

interface TeamByKpiPanelProps {
  rows: TeamEmployeeRow[];
  metric: TeamMetricKey;
  onMetricChange: (metric: TeamMetricKey) => void;
  onOpenEmployee: (code: string, metric: TeamMetricKey) => void;
}

export function TeamByKpiPanel({ rows, metric, onMetricChange, onOpenEmployee }: TeamByKpiPanelProps) {
  const options = sortTeamMetrics(rows);
  const definition = options.find((item) => item.metric.key === metric)?.metric ?? options[0]?.metric;
  const activeMetric = definition?.key ?? "qc";
  const list = selectTeamRiskRows(rows, activeMetric).sort((left, right) => left[definition.pct] - right[definition.pct]);
  return (
    <section className="team-tool-card">
      <div className="team-tool-row"><div><h2>Chọn KPI</h2><p>Xếp từ thấp đến cao</p></div>
        <select aria-label="KPI chi tiết" value={activeMetric} onChange={(event) => onMetricChange(event.target.value as TeamMetricKey)}>
          {options.map((item) => <option key={item.metric.key} value={item.metric.key}>{item.metric.name} · {item.fails} NV rớt</option>)}
        </select>
      </div>
      <div className="team-list">{list.map((row) => <EmployeeRow key={row.empCode} row={row} metric={activeMetric} onOpen={onOpenEmployee} />)}
        {!list.length ? <div className="team-empty">Không có nhân viên rớt KPI này.</div> : null}
      </div>
    </section>
  );
}
