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

type PreviousDeltaTone =
  | "up"
  | "down"
  | "flat"
  | "none";

type KpiValueTone =
  | "achieved"
  | "not-achieved"
  | "neutral";

function isFiniteNumber(
  value:
    | number
    | null
    | undefined,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function getPreviousDeltaMeta(kpi: OverviewKpi): {
  tone: PreviousDeltaTone;
  label: string;
  arrow: string;
} {
  if (
    !isFiniteNumber(kpi.percent) ||
    !isFiniteNumber(
      kpi.previousPercent,
    )
  ) {
    return {
      tone: "none",
      label: "-",
      arrow: "",
    };
  }

  const delta = Number(
    (
      kpi.percent -
      kpi.previousPercent
    ).toFixed(1),
  );

  if (Math.abs(delta) < 0.05) {
    return {
      tone: "flat",
      label: formatPercent(0),
      arrow: "",
    };
  }

  if (delta > 0) {
    return {
      tone: "up",
      label: formatPercent(
        Math.abs(delta),
      ),
      arrow: "▲",
    };
  }

  return {
    tone: "down",
    label: formatPercent(
      Math.abs(delta),
    ),
    arrow: "▼",
  };
}

function getKpiBenchmark(
  kpi: OverviewKpi,
): number | undefined {
  return kpi.trend.find(
    (point) =>
      typeof point.benchmark ===
        "number" &&
      Number.isFinite(
        point.benchmark,
      ),
  )?.benchmark;
}

function getKpiValueTone(
  kpi: OverviewKpi,
  benchmark: number | undefined,
): KpiValueTone {
  if (!isFiniteNumber(kpi.percent)) {
    return "neutral";
  }

  if (benchmark != null) {
    return kpi.percent >= benchmark
      ? "achieved"
      : "not-achieved";
  }

  return kpi.status === "good"
    ? "achieved"
    : "not-achieved";
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

  const previousDelta =
    getPreviousDeltaMeta(kpi);

  const IssueIcon =
    variant === "team"
      ? UsersRound
      : Store;

  const benchmark =
    getKpiBenchmark(kpi);

  const kpiValueTone =
    getKpiValueTone(
      kpi,
      benchmark,
    );

  const percentValue =
    kpi.percent;

  const issuedValue =
    kpi.issued;

  const hasPercent =
    isFiniteNumber(percentValue);

  const hasIssued =
    isFiniteNumber(issuedValue);

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
        className={[
          "memv2-kpi-pct",
          kpiValueTone,
        ].join(" ")}
      >
        <strong
          aria-label={
            hasPercent
              ? undefined
              : "Không có dữ liệu"
          }
        >
          {hasPercent
            ? formatPercent(
                percentValue,
              )
            : "—"}
        </strong>
      </span>

      {mode === "today" ? (
        <span
          className={[
            "memv2-kpi-prev",
            previousDelta.tone,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {previousDelta.tone === "none" ? (
            previousDelta.label
          ) : (
            <>
              {previousDelta.arrow ? (
                <span
                  className="memv2-kpi-prev-arrow"
                  aria-hidden="true"
                >
                  {previousDelta.arrow}
                </span>
              ) : null}

              <span className="memv2-kpi-prev-value">
                {previousDelta.label}
              </span>
            </>
          )}
        </span>
      ) : null}

      <span
        className={[
          "memv2-kpi-issued",
          hasIssued
            ? ""
            : "no-data",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="memv2-issued-head">
          <span
            aria-hidden="true"
            className="memv2-issue-icon"
          >
            <IssueIcon />
          </span>

          <label>{kpi.issuedLabel}</label>
        </span>

        <strong
          aria-label={
            hasIssued
              ? undefined
              : "Không có dữ liệu"
          }
        >
          {hasIssued
            ? formatInteger(
                issuedValue,
              )
            : "—"}
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

