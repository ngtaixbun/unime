import {
  fireEvent,
  render,
  screen,
  within,
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
  TeamKpiDimensionItem,
} from "../../hooks/useTeamKpiDimension";

import type {
  TeamKpiEntityRow,
} from "../../hooks/useTeamRegionKpiData";

import {
  TeamKpiSection,
} from "./TeamKpiSection";

const semanticKpis:
  TeamKpiDimensionItem[] = [
    {
      kpiId: 5,
      label:
        "Chất lượng Semantic",
      key: "qc",
    },
  ];

const regionRows:
  TeamKpiEntityRow[] = [
    {
      key:
        "number:1",
      entityId: 1,
      name: "North",
      region: "North",
      value: 0.993,
      gap: 0.193,
      nvFail: 3,
      contributionNvFail:
        0.08,
      countNv: 38,
      contributionNv:
        0.21,
    },
  ];

const ammRows:
  TeamKpiEntityRow[] = [
    {
      key:
        "string:001",
      entityId: "001",
      name:
        "AMM Semantic miền Bắc với tên dài",
      region:
        "NORTH",
      value: 0.91,
      gap: 0.01,
      nvFail: 2,
      contributionNvFail:
        1,
      countNv: 20,
      contributionNv:
        1,
    },
  ];

function renderSection(
  overrides:
    Partial<
      ComponentProps<
        typeof TeamKpiSection
      >
    > = {},
) {
  const onRetryChart =
    vi.fn(
      async () =>
        undefined,
    );
  const onRetryTable =
    vi.fn(
      async () =>
        undefined,
    );

  const props:
    ComponentProps<
      typeof TeamKpiSection
    > = {
    kpis:
      semanticKpis,
    isKpiLoading:
      false,
    kpiError:
      null,
    chartRows:
      regionRows,
    tableRows:
      regionRows,
    chartIsLoading:
      false,
    tableIsLoading:
      false,
    chartError:
      null,
    tableError:
      null,
    employeeCount:
      38,
    metric: "qc",
    level: "region",
    filterSummary:
      "Tất cả dữ liệu",
    selectedEntity: "",
    onRetryKpis:
      async () =>
        undefined,
    onRetryChart,
    onRetryTable,
    onMetricChange: () =>
      undefined,
    onLevelChange: () =>
      undefined,
    onEntityToggle: () =>
      undefined,
    ...overrides,
  };

  const rendered =
    render(
      <TeamKpiSection
        {...props}
      />,
    );

  return {
    ...rendered,
    onRetryChart,
    onRetryTable,
    rerenderSection: (
      next:
        Partial<
          ComponentProps<
            typeof TeamKpiSection
          >
        >,
    ) => {
      rendered.rerender(
        <TeamKpiSection
          {...props}
          {...next}
        />,
      );
    },
  };
}

describe(
  "TeamKpiSection Region chart and level table",
  () => {
    it("renders Region rows in both chart and table on the Region tab", () => {
      const {
        container,
      } = renderSection();

      const chart =
        container.querySelector<HTMLElement>(
          ".team-chart-card",
        );
      const table =
        container.querySelector<HTMLElement>(
          ".team-data-table",
        );

      expect(chart).not.toBeNull();
      expect(table).not.toBeNull();

      expect(
        screen.getByText(
          "Chất lượng Semantic theo khu vực",
        ),
      ).toBeVisible();
      expect(
        within(
          chart!,
        ).getByText("North"),
      ).toBeVisible();
      expect(
        within(
          table!,
        ).getByText("North"),
      ).toBeVisible();
      expect(
        within(
          table!,
        ).getAllByText(
          "Khu vực",
        ).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getByText(
          "99.3%",
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          "Vượt +19.3%",
        ),
      ).toBeVisible();
    });

    it("keeps the chart on Region while the AMM tab renders Semantic AMM rows in the table", () => {
      const {
        container,
      } = renderSection({
        tableRows:
          ammRows,
        level:
          "amm",
      });

      const chart =
        container.querySelector<HTMLElement>(
          ".team-chart-card",
        );
      const table =
        container.querySelector<HTMLElement>(
          ".team-data-table",
        );

      expect(
        screen.getByRole(
          "tab",
          {
            name: "AMM",
          },
        ),
      ).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(
        screen.getByText(
          "Chất lượng Semantic theo khu vực",
        ),
      ).toBeVisible();
      expect(
        within(
          chart!,
        ).getByText("North"),
      ).toBeVisible();
      expect(
        within(
          chart!,
        ).queryByText(
          "AMM Semantic miền Bắc với tên dài",
        ),
      ).not.toBeInTheDocument();
      expect(
        within(
          table!,
        ).getByText(
          "AMM Semantic miền Bắc với tên dài",
        ),
      ).toBeVisible();
      expect(
        within(
          table!,
        ).getByText(
          "NORTH",
        ),
      ).toBeVisible();
    });

    it("does not change Region chart rows when the selected table level changes", () => {
      const {
        container,
        rerenderSection,
      } = renderSection();

      rerenderSection({
        level: "amm",
        tableRows:
          ammRows,
      });

      const chart =
        container.querySelector<HTMLElement>(
          ".team-chart-card",
        );
      const table =
        container.querySelector<HTMLElement>(
          ".team-data-table",
        );

      expect(
        within(
          chart!,
        ).getByText("North"),
      ).toBeVisible();
      expect(
        within(
          chart!,
        ).queryByText(
          "AMM Semantic miền Bắc với tên dài",
        ),
      ).not.toBeInTheDocument();
      expect(
        within(
          table!,
        ).getByText(
          "AMM Semantic miền Bắc với tên dài",
        ),
      ).toBeVisible();
    });

    it("keeps the Region chart visible while the AMM table is loading", () => {
      const {
        container,
      } = renderSection({
        level: "amm",
        tableRows: [],
        tableIsLoading:
          true,
      });

      const chart =
        container.querySelector<HTMLElement>(
          ".team-chart-card",
        );

      expect(
        within(
          chart!,
        ).getByText("North"),
      ).toBeVisible();
      expect(
        screen.getByText(
          "Đang tải dữ liệu AMM...",
        ),
      ).toBeVisible();
      expect(
        screen.queryByText(
          "Đang tải KPI theo AMM...",
        ),
      ).not.toBeInTheDocument();
    });

    it("isolates an AMM table error and retries AMM without replacing the Region chart", () => {
      const {
        container,
        onRetryChart,
        onRetryTable,
      } = renderSection({
        level: "amm",
        tableRows: [],
        tableError:
          "AMM backend failed",
      });

      const chart =
        container.querySelector<HTMLElement>(
          ".team-chart-card",
        );

      expect(
        within(
          chart!,
        ).getByText("North"),
      ).toBeVisible();
      expect(
        screen.getByRole(
          "alert",
        ),
      ).toHaveTextContent(
        "Không thể tải dữ liệu AMM: AMM backend failed",
      );

      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Thử lại",
          },
        ),
      );

      expect(
        onRetryTable,
      ).toHaveBeenCalledOnce();
      expect(
        onRetryChart,
      ).not.toHaveBeenCalled();
    });

    it("keeps Region chart failure separate from a successful AMM table", () => {
      const {
        container,
        onRetryChart,
        onRetryTable,
      } = renderSection({
        level: "amm",
        chartRows: [],
        chartError:
          "Region backend failed",
        tableRows:
          ammRows,
      });

      const table =
        container.querySelector<HTMLElement>(
          ".team-data-table",
        );

      expect(
        screen.getByRole(
          "alert",
        ),
      ).toHaveTextContent(
        "Không thể tải KPI theo khu vực: Region backend failed",
      );
      expect(
        within(
          table!,
        ).getByText(
          "AMM Semantic miền Bắc với tên dài",
        ),
      ).toBeVisible();

      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Thử lại",
          },
        ),
      );

      expect(
        onRetryChart,
      ).toHaveBeenCalledOnce();
      expect(
        onRetryTable,
      ).not.toHaveBeenCalled();
    });

    it("shows Region errors in both chart and Region table when the Region tab is active", () => {
      const {
        onRetryChart,
        onRetryTable,
      } = renderSection({
        chartRows: [],
        tableRows: [],
        chartError:
          "Region backend failed",
        tableError:
          "Region backend failed",
      });

      expect(
        screen.getAllByRole(
          "alert",
        ),
      ).toHaveLength(2);
      expect(
        screen.getByText(
          "Không thể tải KPI theo khu vực: Region backend failed",
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          "Không thể tải dữ liệu khu vực: Region backend failed",
        ),
      ).toBeVisible();

      const retryButtons =
        screen.getAllByRole(
          "button",
          {
            name:
              "Thử lại",
          },
        );

      fireEvent.click(
        retryButtons[0],
      );
      fireEvent.click(
        retryButtons[1],
      );

      expect(
        onRetryChart,
      ).toHaveBeenCalledOnce();
      expect(
        onRetryTable,
      ).toHaveBeenCalledOnce();
    });

    it("keeps the AMM tab enabled without the disabled legacy title", () => {
      const onLevelChange =
        vi.fn();

      renderSection({
        onLevelChange,
      });

      const ammTab =
        screen.getByRole(
          "tab",
          {
            name: "AMM",
          },
        );

      expect(
        ammTab,
      ).not.toHaveAttribute(
        "title",
        "Chưa kết nối dữ liệu AMM từ Semantic Model",
      );

      fireEvent.click(
        ammTab,
      );

      expect(
        onLevelChange,
      ).toHaveBeenCalledWith(
        "amm",
      );
    });
  },
);
describe(
  "TeamKpiSection entity drill-down",
  () => {
    it("calls onOpenEntityDetails with the encoded entity key", () => {
      const onOpenEntityDetails =
        vi.fn();

      renderSection({
        onOpenEntityDetails,
      });

      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Xem chi tiết North",
          },
        ),
      );

      expect(
        onOpenEntityDetails,
      ).toHaveBeenCalledTimes(
        1,
      );

      expect(
        onOpenEntityDetails,
      ).toHaveBeenCalledWith(
        "number:1",
      );
    });
  },
);
