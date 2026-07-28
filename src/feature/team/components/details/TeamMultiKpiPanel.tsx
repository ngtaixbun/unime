import { useEffect, useState } from "react";

import {
  TEAM_METRICS,
  buildTeamRiskGroups,
  getFailedTeamMetricKeys,
  selectMultiKpiTeamRows,
} from "../../lib";
import type { TeamEmployeeRow, TeamMetricKey, TeamRiskGroup } from "../../types";
import { TeamEmployeeCard } from "./TeamEmployeeCard";

interface TeamMultiKpiPanelProps {
  rows: TeamEmployeeRow[];
  group: TeamRiskGroup;
  selectedMetrics: TeamMetricKey[];
  onGroupChange: (group: TeamRiskGroup) => void;
  onMetricsChange: (metrics: TeamMetricKey[]) => void;
  onOpenEmployee: (code: string, metric?: TeamMetricKey) => void;
}

export function TeamMultiKpiPanel(props: TeamMultiKpiPanelProps) {
  const [toast, setToast] = useState<string | null>(null);
  const groups = buildTeamRiskGroups(props.rows);
  const active = groups.find((item) => item.key === props.group) ?? groups[0];
  const selected = props.group === "safe" ? [] : props.selectedMetrics.slice(0, active.maxSelectedMetrics);
  const list = selectMultiKpiTeamRows(props.rows, props.group, selected);
  const totalEmployeeCount = new Set(
    props.rows.map((row) => row.empCode),
  ).size;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function toggleMetric(metric: TeamMetricKey) {
    if (selected.includes(metric)) {
      props.onMetricsChange(selected.filter((item) => item !== metric));
      return;
    }
    if (selected.length >= active.maxSelectedMetrics) {
      setToast(`Chỉ chọn tối đa ${active.maxSelectedMetrics} KPI`);
      return;
    }
    props.onMetricsChange([...selected, metric]);
  }

  return (
    <section className="team-tool-card">
      <div className="team-tool-row"><div><h2>Rớt nhiều KPI</h2><p>{active.label} · {list.length}/{totalEmployeeCount} nhân viên</p></div></div>
      <div className="team-group-grid">
        {groups.map((item) => <button type="button" key={item.key} className={`is-${item.key} ${props.group === item.key ? "is-active" : ""}`} onClick={() => props.onGroupChange(item.key)}><b>{item.rows.length}</b><span>{item.label}</span><small>{item.rule}</small></button>)}
      </div>
      {props.group !== "safe" ? (
        <details className="team-multi-filter" open>
          <summary>{selected.length ? `${selected.length}/${active.maxSelectedMetrics} KPI đã chọn` : `Chọn tối đa ${active.maxSelectedMetrics} KPI`}</summary>
          <div>{TEAM_METRICS.map((item) => <label key={item.key}><input type="checkbox" checked={selected.includes(item.key)} onChange={() => toggleMetric(item.key)} />{item.name}</label>)}</div>
        </details>
      ) : null}
      <div>{list.map((row) => {
        const metrics = props.group === "safe" ? TEAM_METRICS.map((item) => item.key) : selected.length ? selected : getFailedTeamMetricKeys(row);
        return <TeamEmployeeCard key={row.empCode} row={row} metrics={metrics} onOpen={props.onOpenEmployee} />;
      })}{!list.length ? <div className="team-empty">Không có nhân viên phù hợp.</div> : null}</div>
      <div className={`team-toast ${toast ? "is-visible" : ""}`} role="status">{toast}</div>
    </section>
  );
}
