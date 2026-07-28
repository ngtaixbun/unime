import type { OverviewKpi, OverviewPeriod } from "../types";
import { KpiRow } from "./KpiRow";

interface KpiTableProps {
  kpis: OverviewKpi[];
  period: OverviewPeriod;
  selectedKpiId: string | null;
  title: string;
  note?: string;
  variant?: "market" | "team";
  showHeader?: boolean;
  onSelectKpi: (kpiId: string) => void;
  onOpenDetail?: () => void;
}

export function KpiTable({
  kpis,
  period,
  selectedKpiId,
  title,
  note,
  variant = "market",
  showHeader = true,
  onSelectKpi,
  onOpenDetail,
}: KpiTableProps) {
  const mode = period === "today" ? "today" : "trend";
  const headers = mode === "today" ? ["KPI", "% KPI", "Hôm trước", "Issued", ""] : ["7 Ngày", "Xu hướng", "% KPI", "Issued", ""];

  return (
    <section className="memv2-section">
      {showHeader ? (
        <div className="memv2-section-head memv2-head-action">
          <b>{title}</b>
          {onOpenDetail ? (
            <button className="memv2-title-go" type="button" onClick={onOpenDetail} aria-label={`Mở ${title}`}>
              <span />
              <i>›</i>
            </button>
          ) : null}
        </div>
      ) : null}
      {showHeader && note ? <div className={variant === "team" ? "memv2-team-note" : "memv2-market-note"}>{note}</div> : null}
      <div className={`memv2-overview-kpi-list memv2-team-overview-table ${mode}`}>
        <div className={`memv2-kpi-table-head ${mode}`}>
          {headers.map((header) => (
            <span key={header}>{header}</span>
          ))}
        </div>
        {kpis.map((kpi) => (
          <KpiRow
            key={kpi.id}
            kpi={kpi}
            period={period}
            onSelect={onSelectKpi}
            selected={selectedKpiId === kpi.id}
            variant={variant}
          />
        ))}
      </div>
    </section>
  );
}
