import { AlertTriangle, BarChart3, ChevronRight, Flame, ShieldCheck, Star, Store, UsersRound } from "lucide-react";

import { formatTeamPercentage } from "../../lib";
import type { TeamDetailsTab, TeamRiskGroup, TeamRiskSummary } from "../../types";

interface TeamRiskOverviewProps {
  summary: TeamRiskSummary;
  onOpenDetails: (tab: TeamDetailsTab, group?: TeamRiskGroup) => void;
}

export function TeamRiskOverview({ summary, onOpenDetails }: TeamRiskOverviewProps) {
  const maximum = Math.max(1, ...summary.histogram);
  return (
    <section className="team-card team-risk-section" aria-labelledby="team-risk-title">
      <div className="team-risk-head">
        <span><BarChart3 aria-hidden="true" /></span>
        <h2 id="team-risk-title">Nhóm các trường hợp rớt KPI</h2>
        <button type="button" aria-label="Xem chi tiết" onClick={() => onOpenDetails("multi")}><ChevronRight /></button>
      </div>
      <div className="team-risk-hero">
        <div className="team-hist-card">
          <b>Số lượng NV theo số KPI rớt</b>
          <div className="team-histogram">
            {summary.histogram.map((value, index) => (
              <div key={index}><b>{value}</b><span><i style={{ height: `${Math.max(3, Math.round(value / maximum * 100))}%` }} /></span><small>{index}</small></div>
            ))}
          </div>
          <button type="button" onClick={() => onOpenDetails("multi")}>Xem chi tiết</button>
        </div>
        <div className="team-side-stack">
          <button className="team-side-card" type="button" onClick={() => onOpenDetails("byKpi")}>
            <span><Star aria-hidden="true" /><small>KPI rớt nhiều</small></span><b>{summary.topKpi.metric.name}</b><em>{summary.topKpi.fails} NV rớt</em><ChevronRight />
          </button>
          <button className="team-side-card is-streak" type="button" onClick={() => onOpenDetails("streak")}>
            <span><Flame aria-hidden="true" /><small>Rớt chuỗi nhiều ngày</small></span><b>{summary.maxStreak?.streak ?? 0} ngày liên tiếp</b><em>{summary.maxStreak?.metric.name ?? "—"}</em><ChevronRight />
          </button>
        </div>
      </div>
      <div className="team-status-grid">
        <button className="is-high" type="button" onClick={() => onOpenDetails("multi", "high")}><AlertTriangle /><span>Rủi ro cao<b>{summary.groups.high}</b></span></button>
        <button className="is-watch" type="button" onClick={() => onOpenDetails("multi", "watch")}><AlertTriangle /><span>Cần chú ý<b>{summary.groups.watch}</b></span></button>
        <button className="is-safe" type="button" onClick={() => onOpenDetails("multi", "safe")}><ShieldCheck /><span>Ổn định<b>{summary.groups.safe}</b></span></button>
      </div>
      <div className="team-rank-grid">
        <button className="team-rank-card" type="button" onClick={() => onOpenDetails("manager")}>
          <span className="team-rank-title"><UsersRound /><span><b>SUP cần chú ý</b><small>Theo tỷ lệ NV rớt KPI</small></span><ChevronRight /></span>
          {summary.topSup.map((item, index) => <span className="team-rank-row" key={item.code}><i>{index + 1}</i><span>{item.name}</span><strong>{formatTeamPercentage(item.rate)}</strong></span>)}
        </button>
        <button className="team-rank-card is-npp" type="button" onClick={() => onOpenDetails("npp")}>
          <span className="team-rank-title"><Store /><span><b>NPP cần chú ý</b><small>OSA thấp nhất</small></span><ChevronRight /></span>
          {summary.topNpp.map((item, index) => <span className="team-rank-row" key={item.name}><i>{index + 1}</i><span>{item.name}</span><strong>{formatTeamPercentage(item.pct)}</strong></span>)}
        </button>
      </div>
    </section>
  );
}
