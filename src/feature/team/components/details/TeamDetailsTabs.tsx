import { TEAM_DETAILS_TABS } from "../../lib";
import type { TeamDetailsTab } from "../../types";

export function TeamDetailsTabs({ activeTab, onChange }: { activeTab: TeamDetailsTab; onChange: (tab: TeamDetailsTab) => void }) {
  return <div className="team-details-tabs" role="tablist" aria-label="Góc nhìn chi tiết Đội ngũ">{TEAM_DETAILS_TABS.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} className={activeTab === tab.key ? "is-active" : ""} onClick={() => onChange(tab.key)}>{tab.label}</button>)}</div>;
}
