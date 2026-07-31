import type {
  TeamEmployeeKpiViewRow,
  TeamKpiDimensionItem,
} from "../../hooks";
import {
  formatTeamPercentage,
} from "../../lib";
import type {
  TeamMetricKey,
} from "../../types";

export interface TeamByKpiPanelProps {
  rows:
    TeamEmployeeKpiViewRow[];
  metric: TeamMetricKey;
  semanticMetrics:
    TeamKpiDimensionItem[];
  isLoading: boolean;
  error:
    string | null;
  onRetry:
    () => Promise<void>;
  onMetricChange:
    (metric: TeamMetricKey) => void;
}

function compareEmployeeIds(
  left:
    string | number,
  right:
    string | number,
): number {
  return String(left).localeCompare(
    String(right),
    "vi",
    {
      numeric: true,
    },
  );
}

function formatSemanticNumber(
  value:
    number | null,
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toLocaleString(
    "vi-VN",
    {
      maximumFractionDigits: 2,
    },
  );
}

function selectFailingTeamEmployeeKpiRows(
  rows:
    TeamEmployeeKpiViewRow[],
): TeamEmployeeKpiViewRow[] {
  return rows
    .filter(
      (row) =>
        row.status === "fail",
    )
    .sort(
      (left, right) =>
        (
          left.percentage ??
          Number.POSITIVE_INFINITY
        ) -
          (
            right.percentage ??
            Number.POSITIVE_INFINITY
          ) ||
        left.employeeLabel.localeCompare(
          right.employeeLabel,
          "vi",
        ) ||
        compareEmployeeIds(
          left.employeeId,
          right.employeeId,
        ),
    );
}

export function TeamByKpiPanel({
  rows,
  metric,
  semanticMetrics,
  isLoading,
  error,
  onRetry,
  onMetricChange,
}: TeamByKpiPanelProps) {
  const list =
    selectFailingTeamEmployeeKpiRows(
      rows,
    );

  return (
    <section className="team-tool-card">
      <div className="team-tool-row">
        <div>
          <h2>Chọn KPI</h2>
          <p>Xếp từ thấp đến cao</p>
        </div>

        <select
          aria-label="KPI chi tiết"
          value={metric}
          disabled={
            semanticMetrics.length ===
              0
          }
          onChange={(event) =>
            onMetricChange(
              event.target
                .value as
                TeamMetricKey,
            )
          }
        >
          {semanticMetrics.map(
            (item) => (
              <option
                key={item.kpiId}
                value={item.key}
              >
                {item.label}
                {item.key === metric
                  ? ` · ${list.length} NV rớt`
                  : ""}
              </option>
            ),
          )}
        </select>
      </div>

      <div
        className="team-list"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <div
            className="team-empty"
            role="status"
            aria-live="polite"
          >
            Đang tải dữ liệu nhân viên...
          </div>
        ) : error ? (
          <div
            className="team-kpi-state is-error"
            role="alert"
          >
            <span>
              Không thể tải dữ liệu nhân viên: {error}
            </span>
            <button
              type="button"
              onClick={() => {
                void onRetry();
              }}
            >
              Thử lại
            </button>
          </div>
        ) : list.length ? (
          list.map(
            (row) => (
              <div
                className="team-employee-row"
                key={row.key}
              >
                <span>
                  <b>
                    {row.employeeLabel}
                  </b>
                  <span>
                    {String(
                      row.employeeId,
                    )}
                  </span>
                </span>
                <span className="team-employee-score">
                  <strong>
                    {formatTeamPercentage(
                      row.percentage,
                    )}
                  </strong>
                  <em>
                    {formatSemanticNumber(
                      row.actual,
                    )}{" "}
                    /{" "}
                    {formatSemanticNumber(
                      row.target,
                    )}
                  </em>
                </span>
              </div>
            ),
          )
        ) : (
          <div className="team-empty">
            Không có nhân viên rớt KPI trong phạm vi hiện tại.
          </div>
        )}
      </div>
    </section>
  );
}
