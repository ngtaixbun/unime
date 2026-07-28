import { groupTeamRowsBy, selectTeamRiskRows, sortTeamManagerRiskRows, sortTeamRegions, getWorstTeamMetric } from "../../lib";
import type { TeamEmployeeRow } from "../../types";
import { TeamEmployeeRow as EmployeeRow } from "./TeamEmployeeRow";

export function TeamManagerPanel({ rows, onOpenEmployee }: { rows: TeamEmployeeRow[]; onOpenEmployee: (code: string) => void }) {
  const riskRows = selectTeamRiskRows(rows);
  const regions = sortTeamRegions(riskRows);
  return (
    <section className="team-tool-card">
      <div className="team-tool-row"><div><h2>Xem theo Quản lý</h2><p>Khu vực → AMM → Mer Sup → Nhân viên</p></div></div>
      {regions.map((region, regionIndex) => {
        const regionRows = riskRows.filter((row) => row.region === region);
        return <details className="team-hierarchy" open={regionIndex === 0} key={region}><summary><span>{region}</span><span>{regionRows.length} NV</span></summary><div>
          {[...groupTeamRowsBy(regionRows, (row) => row.ammCode).entries()].map(([ammCode, ammRows], ammIndex) => <details className="team-hierarchy" open={ammIndex === 0} key={ammCode}><summary><span>AMM {ammRows[0].amm}</span><span>{ammRows.length} NV</span></summary><div>
            {[...groupTeamRowsBy(ammRows, (row) => row.supCode).entries()].map(([supCode, supRows], supIndex) => <details className="team-hierarchy" open={supIndex === 0} key={supCode}><summary><span>Sup {supRows[0].sup}</span><span>{supRows.length} NV</span></summary><div>
              {sortTeamManagerRiskRows(supRows).map((row) => <EmployeeRow key={row.empCode} row={row} metric={getWorstTeamMetric(row).key} onOpen={(code) => onOpenEmployee(code)} />)}
            </div></details>)}
          </div></details>)}
        </div></details>;
      })}
      {!regions.length ? <div className="team-empty">Không có nhân viên rớt KPI.</div> : null}
    </section>
  );
}
