import { useEffect, useRef, type CSSProperties } from "react";
import { Minus, TrendingDown, TrendingUp, X } from "lucide-react";

import { useTeamEmployeeDetails, useTeamState } from "../../hooks";
import {
  TEAM_METRIC_MAP,
  TEAM_METRICS,
  TEAM_THRESHOLD,
  formatTeamDate,
  formatTeamDeltaLabel,
  formatTeamNumber,
  formatTeamPercentage,
} from "../../lib";

interface TrendStyle extends CSSProperties { "--team-trend-ratio"?: number }

export function TeamEmployeeDetailsSheet() {
  const team = useTeamState();
  const closeEmployeeDetails = team.closeEmployeeDetails;
  const { row, trend } = useTeamEmployeeDetails();
  const closeRef = useRef<HTMLButtonElement>(null);
  const isOpen = team.employeeDetails.isOpen && row != null;

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeEmployeeDetails();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeEmployeeDetails]);

  if (!isOpen || !row) return null;
  const selectedDate = team.employeeDetails.selectedDate ?? team.reportDate;
  const selectedPoint = trend.find((point) => point.date === selectedDate) ?? trend.at(-1);
  const values = trend.map((point) => point.value).filter((value): value is number => Number.isFinite(value));
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const range = Math.max(0.01, maximum - minimum);
  const metric = TEAM_METRIC_MAP[team.employeeDetails.metric];
  const delta = selectedPoint?.delta ?? null;
  const MoodIcon = delta == null ? Minus : delta >= 0 ? TrendingUp : TrendingDown;
  const moodGood = delta == null || delta >= 0;

  return (
    <div className="team-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) team.closeEmployeeDetails(); }}>
      <section className="team-sheet team-employee-sheet" role="dialog" aria-modal="true" aria-labelledby="team-employee-title">
        <div className="team-sheet-handle" />
        <div className="team-sheet-head"><h2 id="team-employee-title">{row.employee}</h2><button ref={closeRef} type="button" aria-label="Đóng chi tiết nhân viên" onClick={team.closeEmployeeDetails}><X /></button></div>
        <div className="team-employee-info">
          {[['Mã NV', row.empCode], ['Khu vực', row.region], ['AMM', row.amm], ['Mer Sup', row.sup], ['NPP', row.npp || '—']].map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
        </div>
        <div className="team-employee-kpis">
          <div><span>KPI</span><span>Actual</span><span>Target</span><span>%</span></div>
          {TEAM_METRICS.map((item) => <div key={item.key}><span>{item.name}</span><span>{formatTeamNumber(row[item.actual])}</span><span>{formatTeamNumber(row[item.target])}</span><b className={row[item.pct] < TEAM_THRESHOLD ? "is-risk" : "is-ok"}>{formatTeamPercentage(row[item.pct])}</b></div>)}
        </div>
        <div className="team-employee-kpi-tabs" role="tablist" aria-label="KPI nhân viên">
          {TEAM_METRICS.map((item) => <button key={item.key} type="button" role="tab" aria-selected={metric.key === item.key} className={metric.key === item.key ? "is-active" : ""} onClick={() => team.setEmployeeMetric(item.key)}>{item.name}</button>)}
        </div>
        <div className="team-trend-card">
          <div className="team-trend-head"><b>Trend 7 ngày gần nhất</b><span><strong>{formatTeamPercentage(selectedPoint?.value)}</strong><small>{metric.name} · {formatTeamDate(selectedDate)}</small></span></div>
          <div className="team-trend-chart">
            {trend.map((point) => {
              const ratio = point.value == null ? 0.06 : 0.18 + ((point.value - minimum) / range) * 0.82;
              const style: TrendStyle = { "--team-trend-ratio": ratio };
              const selected = point.date === selectedDate;
              return <button key={point.date} type="button" className={`${selected ? "is-selected" : ""} ${point.value == null ? "is-missing" : point.value < TEAM_THRESHOLD ? "is-risk" : ""}`} style={style} onClick={() => team.setEmployeeSelectedDate(point.date)} aria-label={`Xem ngày ${formatTeamDate(point.date)}`}><span>{point.delta == null ? "" : formatTeamDeltaLabel(point.delta)}</span><i /><small>{formatTeamDate(point.date)}</small></button>;
            })}
          </div>
        </div>
        <div className={`team-mood ${moodGood ? "is-good" : "is-bad"}`}><MoodIcon /><span><b>{moodGood ? "Có cải thiện" : "Đang giảm"}</b><small>{delta == null ? `Chưa có dữ liệu so với ngày trước (${formatTeamDate(selectedDate)})` : `${formatTeamDeltaLabel(delta)} so với ngày trước (${formatTeamDate(selectedDate)})`}</small></span></div>
      </section>
    </div>
  );
}
