import { TEAM_METRICS, calculateTeamStreakRows } from "../../lib";
import type { TeamEmployeeRow, TeamFilterState, TeamMetricKey } from "../../types";
import { TeamEmployeeRow as EmployeeRow } from "./TeamEmployeeRow";

interface TeamStreakPanelProps {
  rows: TeamEmployeeRow[];
  allRows: readonly TeamEmployeeRow[];
  dates: readonly string[];
  reportDate: string;
  filters: TeamFilterState;
  metric: TeamMetricKey;
  onMetricChange: (metric: TeamMetricKey) => void;
  onOpenEmployee: (code: string, metric: TeamMetricKey) => void;
}

export function TeamStreakPanel(props: TeamStreakPanelProps) {
  const list = calculateTeamStreakRows(props.rows, props.allRows, props.dates, props.reportDate, props.metric, props.filters);
  return (
    <section className="team-tool-card">
      <div className="team-tool-row"><div><h2>Rớt chuỗi nhiều ngày</h2><p>Tính liên tiếp đến ngày đang chọn</p></div>
        <select aria-label="KPI rớt chuỗi" value={props.metric} onChange={(event) => props.onMetricChange(event.target.value as TeamMetricKey)}>
          {TEAM_METRICS.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
        </select>
      </div>
      <div className="team-list">{list.map(({ row, streak }) => <EmployeeRow key={row.empCode} row={row} metric={props.metric} extra={`${streak} ngày liên tiếp`} onOpen={props.onOpenEmployee} />)}
        {!list.length ? <div className="team-empty">Không có nhân viên rớt chuỗi từ 2 ngày.</div> : null}
      </div>
    </section>
  );
}
