import type { CSSProperties } from "react";

import {
  TEAM_CHART_MAX_VALUE,
  TEAM_METRICS,
  TEAM_THRESHOLD,
  formatTeamPercentage,
  getTeamBarRatio,
  getTeamGroupColor,
} from "../../lib";
import type { TeamEntityLevel, TeamEntityStat, TeamMetricKey } from "../../types";

interface TeamKpiSectionProps {
  metric: TeamMetricKey;
  level: TeamEntityLevel;
  chartEntities: TeamEntityStat[];
  listEntities: TeamEntityStat[];
  employeeCount: number;
  filterSummary: string;
  selectedEntity: string;
  onMetricChange: (metric: TeamMetricKey) => void;
  onLevelChange: (level: TeamEntityLevel) => void;
  onEntityToggle: (entity: string) => void;
}

interface TeamChartStyle extends CSSProperties {
  "--team-bar-ratio"?: number;
  "--team-bar-color"?: string;
  "--team-target-ratio"?: number;
}

export function TeamKpiSection({
  metric,
  level,
  chartEntities,
  listEntities,
  employeeCount,
  filterSummary,
  selectedEntity,
  onMetricChange,
  onLevelChange,
  onEntityToggle,
}: TeamKpiSectionProps) {
  const definition =
    TEAM_METRICS.find((item) => item.key === metric) ?? TEAM_METRICS[0];

  const chartStyle: TeamChartStyle = {
    "--team-target-ratio": TEAM_THRESHOLD / TEAM_CHART_MAX_VALUE,
  };

  const listEmptyMessage =
    level === "amm" && selectedEntity
      ? "Không có AMM trong khu vực đã chọn."
      : "Không có dữ liệu phù hợp bộ lọc.";

  return (
    <section
      className="team-card team-kpi-section"
      aria-labelledby="team-kpi-title"
    >
      <div className="team-section-head">
        <div>
          <h2 id="team-kpi-title">KPI theo khu vực</h2>
          <p>{filterSummary}</p>
        </div>
        <span className="team-badge">{employeeCount} nhân viên</span>
      </div>

      <div className="team-kpi-tabs" role="tablist" aria-label="Chọn KPI">
        {TEAM_METRICS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={metric === item.key}
            className={metric === item.key ? "is-active" : ""}
            onClick={() => onMetricChange(item.key)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="team-chart-card">
        <div className="team-chart-head">
          <b>{definition.name} theo khu vực</b>
          <span>Target: {formatTeamPercentage(TEAM_THRESHOLD)}</span>
        </div>

        {chartEntities.length ? (
          <div className="team-bar-scroll">
            <div
              className="team-bar-plot"
              style={chartStyle}
              aria-label="Column chart KPI theo khu vực"
            >
              <div className="team-target-line" aria-hidden="true" />

              {chartEntities.map((entity) => {
                const delta = (entity.value ?? 0) - TEAM_THRESHOLD;
                const good = delta >= 0;
                const isSelected = selectedEntity === entity.id;

                const style: TeamChartStyle = {
                  "--team-bar-ratio": getTeamBarRatio(entity.value),
                  "--team-bar-color": getTeamGroupColor(entity.region),
                };

                return (
                  <button
                    key={entity.id}
                    type="button"
                    className={`team-bar-item ${
                      isSelected ? "is-selected" : ""
                    } ${
                      selectedEntity && !isSelected ? "is-dimmed" : ""
                    }`}
                    style={style}
                    aria-pressed={isSelected}
                    aria-label={`${entity.name} ${formatTeamPercentage(
                      entity.value,
                    )}`}
                    onClick={() => onEntityToggle(entity.id)}
                  >
                    <span
                      className={`team-bar-value ${
                        good ? "is-good" : "is-risk"
                      }`}
                    >
                      <b>{formatTeamPercentage(entity.value)}</b>
                      <em>
                        {good ? "Vượt" : "Gap"} {good ? "+" : ""}
                        {(delta * 100).toFixed(1)}%
                      </em>
                    </span>

                    <span className="team-bar-track">
                      <span className="team-bar-fill" />
                    </span>

                    <span className="team-bar-name">{entity.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="team-empty">Không có dữ liệu khu vực.</div>
        )}
      </div>

      <div
        className="team-level-tabs"
        role="tablist"
        aria-label="Chọn cấp dữ liệu cho danh sách"
      >
        {(["region", "amm"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={level === item}
            className={level === item ? "is-active" : ""}
            onClick={() => onLevelChange(item)}
          >
            {item === "region" ? "Khu vực" : "AMM"}
          </button>
        ))}
      </div>

      <div className="team-data-table">
        <div className="team-table-head">
          <span>{level === "region" ? "Khu vực" : "AMM"}</span>
          <span>Tổng số NV</span>
          <span>NV rớt</span>
        </div>

        {listEntities.map((entity) => (
          <div className="team-table-row" key={entity.id}>
            <div className="team-entity">
              <i
                style={{
                  backgroundColor: getTeamGroupColor(entity.region),
                }}
              />
              <div>
                <b>{entity.name}</b>
                <span>{entity.sub}</span>
              </div>
            </div>

            <div className="team-metric-pair is-total">
              <strong>{entity.rows.length} NV</strong>
              <i>·</i>
              <em>{Math.round(entity.share * 100)}%</em>
            </div>

            <div className="team-metric-pair is-risk">
              <strong>{entity.fail} NV</strong>
              <i>·</i>
              <em>
                {entity.rows.length
                  ? Math.round((entity.fail / entity.rows.length) * 100)
                  : 0}
                %
              </em>
            </div>
          </div>
        ))}

        {!listEntities.length ? (
          <div className="team-empty">{listEmptyMessage}</div>
        ) : null}
      </div>
    </section>
  );
}