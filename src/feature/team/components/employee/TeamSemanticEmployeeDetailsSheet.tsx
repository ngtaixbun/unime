import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Minus,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import type {
  OrganizationFilters,
} from "@/components/organization-filter";
import type {
  DimDateCycleValue,
} from "@/queries/dim-date";

import {
  useTeamSemanticEmployeeDetails,
} from "../../hooks/useTeamSemanticEmployeeDetails";
import type {
  TeamEmployeeKpiViewRow,
} from "../../hooks/useTeamEmployeeKpiData";
import type {
  TeamKpiDimensionItem,
} from "../../hooks/useTeamKpiDimension";
import {
  TEAM_METRIC_MAP,
  TEAM_METRICS,
  TEAM_THRESHOLD,
  formatTeamDate,
  formatTeamDeltaLabel,
  formatTeamNumber,
  formatTeamPercentage,
} from "../../lib";
import type {
  TeamMetricKey,
} from "../../types";

interface TrendStyle extends CSSProperties {
  "--team-trend-ratio"?: number;
}

export interface TeamSemanticEmployeeSelection {
  employee: TeamEmployeeKpiViewRow;
  metric: TeamMetricKey;
}

interface TeamSemanticEmployeeDetailsSheetProps {
  selection: TeamSemanticEmployeeSelection | null;
  cycleKey: DimDateCycleValue | null;
  filters: OrganizationFilters;
  semanticMetrics: TeamKpiDimensionItem[];
  onClose: () => void;
}

export function TeamSemanticEmployeeDetailsSheet({
  selection,
  cycleKey,
  filters,
  semanticMetrics,
  onClose,
}: TeamSemanticEmployeeDetailsSheetProps) {
  const [metricKey, setMetricKey] =
    useState<TeamMetricKey>(selection?.metric ?? "calls");
  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectedKpiId =
    semanticMetrics.find((item) => item.key === metricKey)?.kpiId ?? null;
  const canQuery =
    selection !== null && cycleKey !== null && selectedKpiId !== null;
  const {
    employee,
    trend,
    isLoading,
    error,
    retry,
  } = useTeamSemanticEmployeeDetails({
    cycleKey,
    employeeId: selection?.employee.employeeId ?? null,
    kpiId: selectedKpiId,
    filters,
    enabled: canQuery,
  });

  useEffect(() => {
    if (!selection) return;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, selection]);

  const selectedPoint =
    trend.find((point) => point.date === selectedDate) ?? trend.at(-1);
  const values = trend
    .map((point) => point.value)
    .filter((value): value is number => Number.isFinite(value));
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const range = Math.max(0.01, maximum - minimum);
  const metric = TEAM_METRIC_MAP[metricKey];
  const delta = selectedPoint?.delta ?? null;
  const MoodIcon = delta == null ? Minus : delta >= 0 ? TrendingUp : TrendingDown;
  const moodGood = delta == null || delta >= 0;
  const kpisById = useMemo(
    () => new Map(employee?.kpis.map((item) => [item.kpiId, item]) ?? []),
    [employee],
  );

  if (!selection) return null;

  return (
    <div
      className="team-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="team-sheet team-employee-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-semantic-employee-title"
      >
        <div className="team-sheet-handle" />
        <div className="team-sheet-head">
          <h2 id="team-semantic-employee-title">
            {employee?.employeeLabel ?? selection.employee.employeeLabel}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Đóng chi tiết nhân viên"
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        {isLoading ? (
          <div className="team-empty" role="status" aria-live="polite">
            Đang tải thông tin nhân viên...
          </div>
        ) : error ? (
          <div className="team-kpi-state is-error" role="alert">
            <span>Không thể tải thông tin nhân viên: {error}</span>
            <button type="button" onClick={() => void retry()}>
              Thử lại
            </button>
          </div>
        ) : employee ? (
          <>
            <div className="team-employee-info">
              {[
                ["Mã NV", employee.employeeCode || String(employee.employeeId)],
                ["Khu vực", employee.regionLabel || "—"],
                ["AMM", employee.ammLabel || "—"],
                ["Mer Sup", employee.supervisorLabel || "—"],
                ["NPP", employee.nppLabel || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>

            <div className="team-employee-kpis">
              <div>
                <span>KPI</span><span>Actual</span><span>Target</span><span>%</span>
              </div>
              {semanticMetrics.map((item) => {
                const value = kpisById.get(item.kpiId);
                return (
                  <div key={item.kpiId}>
                    <span>{value?.kpiLabel ?? item.label}</span>
                    <span>{formatTeamNumber(value?.actual ?? null)}</span>
                    <span>{formatTeamNumber(value?.target ?? null)}</span>
                    <b className={value?.percentage != null && value.percentage < TEAM_THRESHOLD ? "is-risk" : "is-ok"}>
                      {formatTeamPercentage(value?.percentage ?? null)}
                    </b>
                  </div>
                );
              })}
            </div>

            <div className="team-employee-kpi-tabs" role="tablist" aria-label="KPI nhân viên">
              {TEAM_METRICS.filter((item) =>
                semanticMetrics.some((semanticMetric) => semanticMetric.key === item.key),
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={metricKey === item.key}
                  className={metricKey === item.key ? "is-active" : ""}
                  onClick={() => {
                    setMetricKey(item.key);
                    setSelectedDate(null);
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>

            <div className="team-trend-card">
              <div className="team-trend-head">
                <b>Trend 7 ngày gần nhất</b>
                <span>
                  <strong>{formatTeamPercentage(selectedPoint?.value ?? null)}</strong>
                  <small>{metric.name} · {selectedPoint ? formatTeamDate(selectedPoint.date) : "—"}</small>
                </span>
              </div>
              <div className="team-trend-chart">
                {trend.map((point) => {
                  const ratio = point.value == null
                    ? 0.06
                    : 0.18 + ((point.value - minimum) / range) * 0.82;
                  const style: TrendStyle = { "--team-trend-ratio": ratio };
                  const selected = point.date === (selectedDate ?? trend.at(-1)?.date);
                  return (
                    <button
                      key={point.date}
                      type="button"
                      className={`${selected ? "is-selected" : ""} ${point.value == null ? "is-missing" : point.value < TEAM_THRESHOLD ? "is-risk" : ""}`}
                      style={style}
                      onClick={() => setSelectedDate(point.date)}
                      aria-label={`Xem ngày ${formatTeamDate(point.date)}`}
                    >
                      <span>{point.delta == null ? "" : formatTeamDeltaLabel(point.delta)}</span>
                      <i />
                      <small>{formatTeamDate(point.date)}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`team-mood ${moodGood ? "is-good" : "is-bad"}`}>
              <MoodIcon />
              <span>
                <b>{moodGood ? "Có cải thiện" : "Đang giảm"}</b>
                <small>
                  {delta == null
                    ? "Chưa có dữ liệu so với ngày trước"
                    : `${formatTeamDeltaLabel(delta)} so với ngày trước (${selectedPoint ? formatTeamDate(selectedPoint.date) : "—"})`}
                </small>
              </span>
            </div>
          </>
        ) : (
          <div className="team-empty">
            Không có dữ liệu chi tiết cho nhân viên này.
          </div>
        )}
      </section>
    </div>
  );
}
