import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { BottomNavigation, type AppNavigationRoute } from "@/components/BottomNavigation";
import { DashboardHeader } from "@/components/DashboardHeader";

import "../assets/styles/team.css";
import { TeamEmployeeDetailsSheet, TeamFilterSheet, TeamKpiSection, TeamRiskOverview } from "../components";
import { useTeamOverview, useTeamState } from "../hooks";
import { formatTeamDateSlash } from "../lib";
import type { TeamDetailsTab, TeamEntityLevel, TeamMetricKey, TeamRiskGroup } from "../types";

interface TeamPageProps { onNavigate: (path: string) => void }

export function TeamPage({ onNavigate }: TeamPageProps) {
  const team = useTeamState();
  const [selectedMetric, setSelectedMetric] = useState<TeamMetricKey>("qc");
  const [selectedLevel, setSelectedLevel] = useState<TeamEntityLevel>("region");
  const [selectedEntity, setSelectedEntity] = useState("");
  const overview = useTeamOverview(selectedMetric, selectedLevel);

  const effectiveSelectedEntity = overview.entities.some((item) => item.id === selectedEntity) ? selectedEntity : "";

  function openDetails(tab: TeamDetailsTab, group?: TeamRiskGroup) {
    const tabMap: Record<TeamDetailsTab, string> = { byKpi: "by-kpi", streak: "streak", multi: "multi", manager: "manager", npp: "npp" };
    const params = new URLSearchParams({ tab: tabMap[tab] });
    if (tab === "byKpi") params.set("metric", overview.risk.topKpi.metric.key);
    if (tab === "streak" && overview.risk.maxStreak) params.set("metric", overview.risk.maxStreak.metric.key);
    if (group) params.set("group", group);
    onNavigate(`/team/details?${params.toString()}`);
  }

  function handleBottomNavigation(route: AppNavigationRoute) {
    if (route === "overview") onNavigate("/");
    if (route === "team") onNavigate("/team");
  }

  const cycle = team.data.meta.cycle.match(/Từ ([^)]+)/)?.[1] ?? team.data.meta.cycle;
  return (
    <div className="team-page">
      <AppShell
        footer={<BottomNavigation activeRoute="team" onNavigate={handleBottomNavigation} />}
        overlays={<><TeamFilterSheet isOpen={team.isFilterOpen} filters={team.draftFilters} options={team.filterOptions} onChange={team.updateDraftFilter} onApply={team.applyFilters} onReset={team.resetFilters} onClose={team.closeFilterSheet} /><TeamEmployeeDetailsSheet /></>}
      >
        <div className="team-page__content">
          <DashboardHeader
            title="Đội ngũ"
            cycleLabel={`Chu kỳ: ${cycle}`}
            dateLabelPrefix="Ngày"
            dateLabel={formatTeamDateSlash(team.reportDate)}
            appliedFilterCount={team.appliedFilterCount}
            canGoPrevious={team.dateIndex > 0}
            canGoNext={team.dateIndex < team.data.meta.dates.length - 1}
            onBack={() => onNavigate("/")}
            onOpenFilters={team.openFilterSheet}
            onPreviousDate={team.goToPreviousDate}
            onNextDate={team.goToNextDate}
          />
          <p className="team-sr-only" aria-live="polite">{team.filterSummary}</p>
          <TeamKpiSection metric={selectedMetric} level={selectedLevel} entities={overview.entities} employeeCount={overview.rows.length} filterSummary={team.filterSummary} selectedEntity={effectiveSelectedEntity} onMetricChange={(value) => { setSelectedMetric(value); setSelectedEntity(""); }} onLevelChange={(value) => { setSelectedLevel(value); setSelectedEntity(""); }} onEntityToggle={(value) => setSelectedEntity((current) => current === value ? "" : value)} />
          <TeamRiskOverview summary={overview.risk} onOpenDetails={openDetails} />
        </div>
      </AppShell>
    </div>
  );
}
