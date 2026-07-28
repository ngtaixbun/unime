import { Store, UsersRound } from "lucide-react";

import { formatInteger, formatPercent } from "../lib";
import type {
  OverviewKpi,
  OverviewPeriod,
} from "../types";
import { Sparkline } from "./Sparkline";

interface KpiRowProps {
  kpi: OverviewKpi;
  period: OverviewPeriod;
  onSelect: (kpiId: string) => void;
  selected: boolean;
  variant?: "market" | "team";
}

export function KpiRow({
  kpi,
  period,
  onSelect,
  selected,
  variant = "market",
}: KpiRowProps) {
  const mode =
    period === "today"
      ? "today"
      : "trend";

  const sparklineMode =
    period === "mtd"
      ? "mtd"
      : "seven-days";

  const IssueIcon =
    variant === "team"
      ? UsersRound
      : Store;

  return (
    <button
      type="button"
      className={[
        "memv2-kpi-row",
        mode,
        "memv2-reference-row",
        variant === "team"
          ? "memv2-team-reference-row"
          : "",
        selected ? "selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(kpi.id)}
      aria-pressed={selected}
    >
      <span className="memv2-kpi-title">
        <b>{kpi.title}</b>
      </span>

      {mode === "trend" ? (
        <span className="memv2-spark-panel">
          <span>DAY</span>

          <Sparkline
            points={kpi.trend}
            title={kpi.title}
            mode={sparklineMode}
          />
        </span>
      ) : null}

      <span
        className={`memv2-kpi-pct ${kpi.status}`}
      >
        <strong>
          {formatPercent(kpi.percent)}
        </strong>
      </span>

      {mode === "today" ? (
        <span className="memv2-kpi-prev">
          {kpi.previousPercent == null
            ? "-"
            : formatPercent(
                kpi.previousPercent,
              )}
        </span>
      ) : null}

      <span className="memv2-kpi-issued">
        <span className="memv2-issued-head">
          <span
            aria-hidden="true"
            className="memv2-issue-icon"
          >
            <IssueIcon />
          </span>

          <label>{kpi.issuedLabel}</label>
        </span>

        <strong>
          {formatInteger(kpi.issued)}
        </strong>
      </span>

      <span
        className="memv2-kpi-go"
        aria-hidden="true"
      >
        ›
      </span>
    </button>
  );
}
