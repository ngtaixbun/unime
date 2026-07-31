import type {
  CSSProperties,
} from "react";

import {
  ChevronRight,
} from "lucide-react";

import {
  TEAM_CHART_MAX_VALUE,
  TEAM_THRESHOLD,
  formatTeamNumber,
  formatTeamPercentage,
  getTeamBarRatio,
  getTeamGroupColor,
} from "../../lib";

import type {
  TeamKpiDimensionItem,
} from "../../hooks/useTeamKpiDimension";

import type {
  TeamKpiEntityRow,
} from "../../hooks/useTeamRegionKpiData";

import type {
  TeamEntityLevel,
  TeamMetricKey,
} from "../../types";

interface TeamKpiSectionProps {
  kpis:
    TeamKpiDimensionItem[];
  isKpiLoading:
    boolean;
  kpiError:
    string | null;
  chartRows:
    TeamKpiEntityRow[];
  tableRows:
    TeamKpiEntityRow[];
  chartIsLoading:
    boolean;
  tableIsLoading:
    boolean;
  chartError:
    string | null;
  tableError:
    string | null;
  employeeCount:
    number | null;
  metric:
    TeamMetricKey;
  level:
    TeamEntityLevel;
  filterSummary:
    string;
  selectedEntity:
    string;
  onRetryKpis:
    () => Promise<void>;
  onRetryChart:
    () => Promise<void>;
  onRetryTable:
    () => Promise<void>;
  onMetricChange:
    (
      metric:
        TeamMetricKey,
    ) => void;
  onLevelChange:
    (
      level:
        TeamEntityLevel,
    ) => void;
  onEntityToggle:
    (
      entity:
        string,
    ) => void;
  onOpenEntityDetails?:
    (
      entityKey:
        string,
    ) => void;
}

interface TeamChartStyle
  extends CSSProperties {
  "--team-bar-ratio"?:
    number;
  "--team-bar-color"?:
    string;
  "--team-target-ratio"?:
    number;
  "--team-entity-count"?:
    number;
}

function formatNullablePercentage(
  value:
    number | null,
): string {
  return value === null
    ? "—"
    : formatTeamPercentage(
        value,
      );
}

function formatNullableNumber(
  value:
    number | null,
): string {
  return value === null
    ? "—"
    : formatTeamNumber(
        value,
      );
}

function getGapCopy(
  value:
    number | null,
): {
  label: string;
  isGood: boolean;
} {
  if (
    value === null
  ) {
    return {
      label: "—",
      isGood: false,
    };
  }

  const isGood =
    value >= 0;

  return {
    label:
      `${isGood ? "Vượt" : "Gap"} ` +
      `${isGood ? "+" : ""}` +
      `${formatTeamPercentage(value)}`,
    isGood,
  };
}

export function TeamKpiSection({
  kpis,
  isKpiLoading,
  kpiError,
  chartRows,
  tableRows,
  chartIsLoading,
  tableIsLoading,
  chartError,
  tableError,
  employeeCount,
  metric,
  level,
  filterSummary,
  selectedEntity,
  onRetryKpis,
  onRetryChart,
  onRetryTable,
  onMetricChange,
  onLevelChange,
  onEntityToggle,
  onOpenEntityDetails =
    () => undefined,
}: TeamKpiSectionProps) {
  const semanticMetric =
    kpis.find(
      (item) =>
        item.key ===
        metric,
    );

  const entityLabel =
    level === "amm"
      ? "AMM"
      : "Khu vực";

  const tableEntityCopy =
    level === "amm"
      ? "AMM"
      : "khu vực";

  const chartTitle =
    semanticMetric
      ? `${semanticMetric.label} theo khu vực`
      : "KPI theo khu vực";

  const chartStyle:
    TeamChartStyle = {
    "--team-target-ratio":
      TEAM_THRESHOLD /
      TEAM_CHART_MAX_VALUE,
    "--team-entity-count":
      chartRows.length,
  };

  return (
    <section
      className="team-card team-kpi-section"
      aria-labelledby="team-kpi-title"
    >
      <div className="team-section-head">
        <div>
          <h2 id="team-kpi-title">
            KPI theo khu vực
          </h2>
          <p>
            {filterSummary}
          </p>
        </div>

        <span className="team-badge">
          {employeeCount === null
            ? "—"
            : formatTeamNumber(
                employeeCount,
              )}{" "}
          nhân viên
        </span>
      </div>

      {isKpiLoading ? (
        <div
          className="team-kpi-state"
          role="status"
          aria-live="polite"
        >
          Đang tải danh sách KPI...
        </div>
      ) : kpiError ? (
        <div
          className="team-kpi-state is-error"
          role="alert"
        >
          <span>
            Không thể tải danh sách KPI:{" "}
            {kpiError}
          </span>
          <button
            type="button"
            onClick={() => {
              void onRetryKpis();
            }}
          >
            Thử lại
          </button>
        </div>
      ) : kpis.length ? (
        <div
          className="team-kpi-tabs"
          role="tablist"
          aria-label="Chọn KPI"
        >
          {kpis.map(
            (item) => (
              <button
                key={
                  item.kpiId
                }
                type="button"
                role="tab"
                aria-selected={
                  metric ===
                  item.key
                }
                className={
                  metric ===
                  item.key
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  onMetricChange(
                    item.key,
                  )
                }
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : (
        <div
          className="team-kpi-state"
          role="status"
        >
          Không có KPI hợp lệ để hiển thị.
        </div>
      )}

      <div className="team-chart-card">
        <div className="team-chart-head">
          <b>
            {chartTitle}
          </b>
          <span>
            Target:{" "}
            {formatTeamPercentage(
              TEAM_THRESHOLD,
            )}
          </span>
        </div>

        {chartIsLoading ? (
          <div
            className="team-kpi-state team-region-semantic-state"
            role="status"
            aria-live="polite"
          >
            Đang tải KPI theo khu vực...
          </div>
        ) : chartError ? (
          <div
            className="team-kpi-state team-region-semantic-state is-error"
            role="alert"
          >
            <span>
              Không thể tải KPI theo khu vực:{" "}
              {chartError}
            </span>
            <button
              type="button"
              onClick={() => {
                void onRetryChart();
              }}
            >
              Thử lại
            </button>
          </div>
        ) : chartRows.length ? (
          <div className="team-bar-scroll">
            <div
              className="team-bar-plot"
              style={chartStyle}
              aria-label="Column chart KPI theo khu vực"
            >
              <div
                className="team-target-line"
                aria-hidden="true"
              />

              {chartRows.map(
                (entity) => {
                  const gap =
                    getGapCopy(
                      entity.gap,
                    );

                  const isSelected =
                    selectedEntity ===
                    entity.key;

                  const style:
                    TeamChartStyle = {
                    "--team-bar-ratio":
                      getTeamBarRatio(
                        entity.value,
                      ),
                    "--team-bar-color":
                      getTeamGroupColor(
                        entity.region,
                      ),
                  };

                  return (
                    <button
                      key={
                        entity.key
                      }
                      type="button"
                      className={`team-bar-item ${
                        isSelected
                          ? "is-selected"
                          : ""
                      } ${
                        selectedEntity &&
                        !isSelected
                          ? "is-dimmed"
                          : ""
                      }`}
                      style={style}
                      aria-pressed={
                        isSelected
                      }
                      aria-label={`${
                        entity.name
                      } ${formatNullablePercentage(
                        entity.value,
                      )}, ${gap.label}`}
                      onClick={() =>
                        onEntityToggle(
                          entity.key,
                        )
                      }
                    >
                      <span
                        className={`team-bar-value ${
                          gap.isGood
                            ? "is-good"
                            : "is-risk"
                        }`}
                      >
                        <b>
                          {formatNullablePercentage(
                            entity.value,
                          )}
                        </b>
                        <em>
                          {gap.label}
                        </em>
                      </span>

                      <span className="team-bar-track">
                        <span className="team-bar-fill" />
                      </span>

                      <span className="team-bar-name">
                        {entity.name}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ) : (
          <div className="team-empty">
            Không có dữ liệu khu vực.
          </div>
        )}
      </div>

      <div
        className="team-level-tabs"
        role="tablist"
        aria-label="Chọn cấp dữ liệu cho danh sách"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            level ===
            "region"
          }
          className={
            level ===
            "region"
              ? "is-active"
              : ""
          }
          onClick={() =>
            onLevelChange(
              "region",
            )
          }
        >
          Khu vực
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            level ===
            "amm"
          }
          className={
            level ===
            "amm"
              ? "is-active"
              : ""
          }
          onClick={() =>
            onLevelChange(
              "amm",
            )
          }
        >
          AMM
        </button>
      </div>

      <div className="team-data-table">
        <div className="team-table-head">
          <span>
            {entityLabel}
          </span>
          <span>
            Tổng số NV
          </span>
          <span>
            NV rớt
          </span>
        </div>

        {tableIsLoading ? (
          <div className="team-kpi-state team-region-table-state">
            Đang tải dữ liệu {tableEntityCopy}...
          </div>
        ) : tableError ? (
          <div
            className="team-kpi-state team-region-table-state is-error"
            role="alert"
          >
            <span>
              Không thể tải dữ liệu {tableEntityCopy}:{" "}
              {tableError}
            </span>
            <button
              type="button"
              onClick={() => {
                void onRetryTable();
              }}
            >
              Thử lại
            </button>
          </div>
        ) : (
          tableRows.map(
            (entity) => (
              <div
                className="team-table-row"
                key={
                  entity.key
                }
              >
                <div className="team-entity">
                  <i
                    style={{
                      backgroundColor:
                        getTeamGroupColor(
                          entity.region,
                        ),
                    }}
                  />
                  <div>
                    <b>
                      {entity.name}
                    </b>
                    <span>
                      {level ===
                      "amm"
                        ? entity.region
                        : entityLabel}
                    </span>
                  </div>
                </div>

                <div className="team-metric-pair is-total">
                  <strong>
                    {formatNullableNumber(
                      entity.countNv,
                    )}{" "}
                    NV
                  </strong>
                  <i>·</i>
                  <em>
                    {formatNullablePercentage(
                      entity.contributionNv,
                    )}
                  </em>
                </div>

                <div className="team-metric-pair is-risk">
                  <strong>
                    {formatNullableNumber(
                      entity.nvFail,
                    )}{" "}
                    NV
                  </strong>
                  <i>·</i>
                  <em>
                    {formatNullablePercentage(
                      entity.contributionNvFail,
                    )}
                  </em>
                </div>

                <button
                  type="button"
                  className="team-row-drill-button"
                  aria-label={`Xem chi tiết ${entity.name}`}
                  onClick={() =>
                    onOpenEntityDetails(
                      entity.key,
                    )
                  }
                >
                  <ChevronRight
                    aria-hidden="true"
                  />
                </button>
              </div>
            ),
          )
        )}

        {!tableIsLoading &&
        !tableError &&
        !tableRows.length ? (
          <div className="team-empty">
            Không có dữ liệu {tableEntityCopy}.
          </div>
        ) : null}
      </div>
    </section>
  );
}
