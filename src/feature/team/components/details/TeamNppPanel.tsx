import { calculateTeamNppStats, formatTeamNumber, formatTeamPercentage } from "../../lib";
import type { TeamEmployeeRow } from "../../types";

export function TeamNppPanel({ rows }: { rows: TeamEmployeeRow[] }) {
  const items = calculateTeamNppStats(rows);
  return (
    <section className="team-tool-card">
      <div className="team-tool-row"><div><h2>Theo NPP</h2><p>OSA thực đạt / Target / % · xếp từ thấp đến cao</p></div></div>
      {items.map((item) => <article className="team-npp-card" key={item.name}><div><span><b>{item.name}</b><small>{item.region || "—"} · {item.employees} NV</small></span><strong>{formatTeamPercentage(item.pct)}</strong></div><p><b>OSA</b><span>Thực đạt {formatTeamNumber(item.actual)}</span><span>Target {formatTeamNumber(item.target)}</span></p></article>)}
      {!items.length ? <div className="team-empty">Không có dữ liệu NPP.</div> : null}
    </section>
  );
}
