import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/AppShell";

import "../assets/styles/team.css";
import "../assets/styles/team-details.css";
import { TeamByKpiPanel, TeamDetailsTabs, TeamEmployeeDetailsSheet, TeamManagerPanel, TeamMultiKpiPanel, TeamNppPanel, TeamStreakPanel } from "../components";
import { useTeamDetails } from "../hooks";
import { formatTeamDate } from "../lib";
import type { TeamDetailsTab, TeamMetricKey, TeamRiskGroup } from "../types";

interface TeamDetailsProps { onNavigate: (path: string) => void }

const urlToTab: Record<string, TeamDetailsTab> = { "by-kpi": "byKpi", streak: "streak", multi: "multi", manager: "manager", npp: "npp" };
const tabToUrl: Record<TeamDetailsTab, string> = { byKpi: "by-kpi", streak: "streak", multi: "multi", manager: "manager", npp: "npp" };
const metricKeys: TeamMetricKey[] = ["calls", "beat", "time", "osa", "qc"];
const groupKeys: TeamRiskGroup[] = ["high", "watch", "safe"];

export function TeamDetails({ onNavigate }: TeamDetailsProps) {
  const team = useTeamDetails();
  const initialParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState<TeamDetailsTab>(urlToTab[initialParams.get("tab") ?? ""] ?? "byKpi");
  const requestedMetric = initialParams.get("metric") as TeamMetricKey | null;
  const requestedGroup = initialParams.get("group") as TeamRiskGroup | null;
  const [detailMetric, setDetailMetric] = useState<TeamMetricKey>(requestedMetric && metricKeys.includes(requestedMetric) ? requestedMetric : "qc");
  const [streakMetric, setStreakMetric] = useState<TeamMetricKey>(requestedMetric && metricKeys.includes(requestedMetric) ? requestedMetric : "qc");
  const [multiGroup, setMultiGroup] = useState<TeamRiskGroup>(requestedGroup && groupKeys.includes(requestedGroup) ? requestedGroup : "high");
  const [multiMetrics, setMultiMetrics] = useState<TeamMetricKey[]>([]);

  function syncUrl(tab: TeamDetailsTab, metric?: TeamMetricKey, group?: TeamRiskGroup) {
    const params = new URLSearchParams({ tab: tabToUrl[tab] });
    if (metric) params.set("metric", metric);
    if (group) params.set("group", group);
    window.history.replaceState({}, "", `/team/details?${params.toString()}`);
  }
  function changeTab(tab: TeamDetailsTab) {
    setActiveTab(tab);
    syncUrl(tab, tab === "byKpi" ? detailMetric : tab === "streak" ? streakMetric : undefined, tab === "multi" ? multiGroup : undefined);
  }

  return (
    <div className="team-details">
      <AppShell overlays={<TeamEmployeeDetailsSheet />}>
        <header className="team-details-header"><button type="button" aria-label="Quay lại Đội ngũ" onClick={() => onNavigate("/team")}><ArrowLeft /></button><div><h1>Chi tiết Đội ngũ</h1><p>Ngày {formatTeamDate(team.reportDate)} · {team.filterSummary}</p></div><span /></header>
        <TeamDetailsTabs activeTab={activeTab} onChange={changeTab} />
        <main className="team-details-content">
          {activeTab === "byKpi" ? <TeamByKpiPanel rows={team.rows} metric={detailMetric} onMetricChange={(metric) => { setDetailMetric(metric); syncUrl("byKpi", metric); }} onOpenEmployee={team.openEmployeeDetails} /> : null}
          {activeTab === "streak" ? <TeamStreakPanel rows={team.rows} allRows={team.data.rows} dates={team.data.meta.dates} reportDate={team.reportDate} filters={team.filters} metric={streakMetric} onMetricChange={(metric) => { setStreakMetric(metric); syncUrl("streak", metric); }} onOpenEmployee={team.openEmployeeDetails} /> : null}
          {activeTab === "multi" ? <TeamMultiKpiPanel rows={team.rows} group={multiGroup} selectedMetrics={multiMetrics} onGroupChange={(group) => { setMultiGroup(group); setMultiMetrics([]); syncUrl("multi", undefined, group); }} onMetricsChange={setMultiMetrics} onOpenEmployee={team.openEmployeeDetails} /> : null}
          {activeTab === "manager" ? <TeamManagerPanel rows={team.rows} onOpenEmployee={team.openEmployeeDetails} /> : null}
          {activeTab === "npp" ? <TeamNppPanel rows={team.rows} /> : null}
        </main>
      </AppShell>
    </div>
  );
}
