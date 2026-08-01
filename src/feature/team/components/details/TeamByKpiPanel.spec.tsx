import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

import type {
  ComponentProps,
} from "react";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  TeamEmployeeKpiViewRow,
  TeamKpiDimensionItem,
} from "../../hooks";
import {
  TeamByKpiPanel,
} from "./TeamByKpiPanel";

const semanticMetrics:
  TeamKpiDimensionItem[] = [
    {
      kpiId: 1,
      key: "calls",
      label:
        "Cuộc gọi thành công",
    },
    {
      kpiId: 5,
      key: "qc",
      label:
        "Chất lượng Semantic",
    },
  ];

const semanticRows:
  TeamEmployeeKpiViewRow[] = [
    {
      key: "string:NV-3",
      employeeId: "NV-3",
      employeeLabel: "Cường",
      regionId: 1,
      ammId: "001",
      supervisorId: 9,
      actual: 45,
      target: 50,
      percentage: 0.9,
      status: "pass",
    },
    {
      key: "string:NV-2",
      employeeId: "NV-2",
      employeeLabel: "Bình",
      regionId: 1,
      ammId: "001",
      supervisorId: 9,
      actual: 408,
      target: 500,
      percentage: 0.816,
      status: "fail",
    },
    {
      key: "string:NV-1",
      employeeId: "NV-1",
      employeeLabel: "An",
      regionId: 1,
      ammId: "001",
      supervisorId: 9,
      actual: 8,
      target: 10,
      percentage: 0.8,
      status: "fail",
    },
    {
      key: "string:NV-4",
      employeeId: "NV-4",
      employeeLabel: "Dũng",
      regionId: 1,
      ammId: "001",
      supervisorId: 9,
      actual: null,
      target: 0,
      percentage: null,
      status: "no-data",
    },
  ];

function renderPanel(
  overrides:
    Partial<
      ComponentProps<
        typeof TeamByKpiPanel
      >
    > = {},
) {
  const onRetry =
    vi.fn(
      async () =>
        undefined,
    );
  const onMetricChange =
    vi.fn();
  const onOpenEmployee =
    vi.fn();

  const result = render(
    <TeamByKpiPanel
      rows={semanticRows}
      metric="qc"
      semanticMetrics={
        semanticMetrics
      }
      isLoading={false}
      error={null}
      onRetry={onRetry}
      onMetricChange={
        onMetricChange
      }
      onOpenEmployee={
        onOpenEmployee
      }
      {...overrides}
    />,
  );

  return {
    ...result,
    onRetry,
    onMetricChange,
    onOpenEmployee,
  };
}

describe(
  "TeamByKpiPanel Semantic rows",
  () => {
    it("renders only failing employees sorted by percentage, then uses Semantic actual and target", () => {
      const {
        container,
      } = renderPanel();

      const labels =
        Array.from(
          container.querySelectorAll(
            ".team-employee-row b",
          ),
        ).map(
          (element) =>
            element.textContent,
        );

      expect(labels)
        .toEqual([
          "An",
          "Bình",
        ]);
      expect(
        screen.queryByText(
          "Cường",
        ),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          "Dũng",
        ),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "81.6%",
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          "408 / 500",
        ),
      ).toBeVisible();
    });

    it("uses KPI labels from dim-kpi and shows the Semantic fail count for the selected KPI", () => {
      renderPanel();

      expect(
        screen.getByRole(
          "option",
          {
            name:
              "Chất lượng Semantic · 2 NV rớt",
          },
        ),
      ).toBeVisible();
      expect(
        screen.getByRole(
          "option",
          {
            name:
              "Cuộc gọi thành công",
          },
        ),
      ).toBeVisible();
    });

    it("updates the selected KPI and opens the selected Semantic employee", () => {
      const {
        onMetricChange,
        onOpenEmployee,
      } = renderPanel();

      fireEvent.change(
        screen.getByRole(
          "combobox",
          {
            name: "KPI chi tiết",
          },
        ),
        {
          target: {
            value: "calls",
          },
        },
      );

      expect(onMetricChange)
        .toHaveBeenCalledWith(
          "calls",
        );

      fireEvent.click(
        screen.getByRole(
          "button",
          { name: /An/ },
        ),
      );

      expect(onOpenEmployee)
        .toHaveBeenCalledWith(
          semanticRows[2],
        );
    });

    it("keeps a stable loading state without showing stale rows", () => {
      renderPanel({
        isLoading: true,
      });

      expect(
        screen.getByRole(
          "status",
        ),
      ).toHaveTextContent(
        "Đang tải dữ liệu nhân viên",
      );
      expect(
        screen.queryByText("An"),
      ).not.toBeInTheDocument();
    });

    it("shows a short error and retries the Semantic query", () => {
      const {
        onRetry,
      } = renderPanel({
        error:
          "Semantic unavailable",
      });

      expect(
        screen.getByRole("alert"),
      ).toHaveTextContent(
        "Semantic unavailable",
      );

      fireEvent.click(
        screen.getByRole(
          "button",
          { name: "Thử lại" },
        ),
      );

      expect(onRetry)
        .toHaveBeenCalledTimes(1);
      expect(
        screen.queryByText("An"),
      ).not.toBeInTheDocument();
    });

    it("shows the scoped empty state with no mock fallback", () => {
      renderPanel({
        rows: [],
      });

      expect(
        screen.getByText(
          "Không có nhân viên rớt KPI trong phạm vi hiện tại.",
        ),
      ).toBeVisible();
      expect(
        screen.queryByText("An"),
      ).not.toBeInTheDocument();
    });
  },
);
