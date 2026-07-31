import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  DimDateRow,
} from "@/queries/dim-date";
import type {
  OverviewData,
  OverviewFilters,
} from "../types";

import { OverviewPage } from "./OverviewPage";

const hookMocks = vi.hoisted(() => ({
  useDimDateData: vi.fn(),
  useOverviewData: vi.fn(),
  useOverviewPeriod: vi.fn(),
}));

vi.mock("../hooks", () => hookMocks);

const organizationMocks =
  vi.hoisted(() => ({
    useOrganizationFilters:
      vi.fn(),
  }));

vi.mock(
  "@/components/organization-filter",
  () => ({
    OrganizationFilterSheet:
      () => null,
    useOrganizationFilters:
      organizationMocks
        .useOrganizationFilters,
  }),
);

const reloadDimDate =
  vi.fn(async () => undefined);
const reloadOverviewData =
  vi.fn(async () => undefined);
const setPeriod = vi.fn();
const goToPreviousDate = vi.fn();
const goToNextDate = vi.fn();

const cycles: DimDateRow[] = [
  {
    cycleKey: 202607,
    cycleLabel: "Tháng 07",
    cycleStartDate: "2026-06-28",
    cycleEndDate: "2026-07-20",
    cycleSort: 202607,
    isLatestCycle: false,
  },
  {
    cycleKey: 202608,
    cycleLabel: "Tháng 08",
    cycleStartDate: "2026-07-21",
    cycleEndDate: "2026-07-21",
    cycleSort: 202608,
    isLatestCycle: true,
  },
];

function setPageHookResults({
  cycleRows = cycles,
  dimDateLoading = false,
  dimDateError = null,
  overviewLoading = false,
  overviewError = null,
  overviewData = {
    coverage: [],
    marketKpis: [],
    teamKpis: [],
  },
  selectedCycleKey = 202608,
  appliedFilters = {
    region: "all",
    amm: "all",
    supervisor: "all",
  },
  draftFilters = appliedFilters,
  isFilterOpen = false,
  dateLabel = "21/07 - 21/07",
  canGoPrevious = true,
  canGoNext = false,
}: {
  cycleRows?: DimDateRow[];
  dimDateLoading?: boolean;
  dimDateError?: string | null;
  overviewLoading?: boolean;
  overviewError?: string | null;
  overviewData?: OverviewData | null;
  selectedCycleKey?: number;
  appliedFilters?: OverviewFilters;
  draftFilters?: OverviewFilters;
  isFilterOpen?: boolean;
  dateLabel?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
} = {}) {
  hookMocks.useDimDateData.mockReturnValue({
    cycles: cycleRows,
    loading: dimDateLoading,
    error: dimDateError,
    reload: reloadDimDate,
  });
  hookMocks.useOverviewPeriod.mockReturnValue({
    period: "mtd",
    selectedCycleKey,
    periodLabel: "MTD",
    dateLabel,
    canGoPrevious,
    canGoNext,
    setPeriod,
    goToPreviousDate,
    goToNextDate,
    anchorDate: "2026-07-21",
  });
  hookMocks.useOverviewData.mockReturnValue({
    data: overviewData,
    loading: overviewLoading,
    error: overviewError,
    reload: reloadOverviewData,
  });
  organizationMocks
    .useOrganizationFilters
    .mockReturnValue({
    appliedFilters,
    draftFilters,
    appliedFilterCount:
      Object.values(
        appliedFilters,
      ).filter(
        (value) => value !== "all",
      ).length,
    isFilterOpen,
    openFilterSheet: vi.fn(),
    closeFilterSheet: vi.fn(),
    updateDraftFilter: vi.fn(),
    clearDraftFilters: vi.fn(),
    applyFilters: vi.fn(),
  });
}

describe("OverviewPage MTD cycle states", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.clearAllMocks();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn(),
    );
    setPageHookResults();
  });

  it("passes the same latest-cycle values and callbacks to full and compact navigators", () => {
    render(<OverviewPage />);

    const navigators = screen.getAllByLabelText(
      "Điều hướng ngày báo cáo",
    );

    expect(navigators).toHaveLength(2);
    for (const navigator of navigators) {
      expect(navigator).toHaveTextContent(
        "MTD:21/07 - 21/07",
      );
      expect(
        within(navigator).getByRole(
          "button",
          {
            name: "Kỳ báo cáo sau",
            hidden: true,
          },
        ),
      ).toBeDisabled();
    }

    fireEvent.click(
      within(navigators[0]).getByRole(
        "button",
        { name: "Kỳ báo cáo trước" },
      ),
    );
    fireEvent.click(
      within(navigators[1]).getByRole(
        "button",
        {
          name: "Kỳ báo cáo trước",
          hidden: true,
        },
      ),
    );

    expect(
      goToPreviousDate,
    ).toHaveBeenCalledTimes(2);
    expect(
      hookMocks.useOverviewPeriod,
    ).toHaveBeenCalledWith(cycles, {
      period: "mtd",
      anchorDate: null,
    });
    expect(
      hookMocks.useOverviewData,
    ).toHaveBeenCalledWith({
      period: "mtd",
      cycleKey: 202608,
      filters: {
        region: "all",
        amm: "all",
        supervisor: "all",
      },
    });
  });

  it("renders the shared controls and keeps Overview back on the Landing toast", () => {
    render(<OverviewPage />);

    expect(document.querySelector(".dashboard-header")).toBeInTheDocument();
    expect(document.querySelector(".report-period-mode")).toBeInTheDocument();
    expect(document.querySelector(".app-bottom-nav")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tổng quan" })).toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: "Về trang Landing" }));
    expect(screen.getByText("Chức năng chưa được triển khai")).toBeVisible();
  });

  it("renders the shared applied-count badge in both Overview filter triggers", () => {
    setPageHookResults({
      appliedFilters: {
        region: "number:1",
        amm: "all",
        supervisor: "all",
      },
    });

    render(<OverviewPage />);

    const filterTriggers =
      screen.getAllByRole(
        "button",
        {
          name: "Mở bộ lọc",
          hidden: true,
        },
      );

    expect(filterTriggers).toHaveLength(2);
    for (
      const trigger of
      filterTriggers
    ) {
      expect(
        trigger.querySelector(
          ".dashboard-filter-trigger__badge",
        ),
      ).toHaveTextContent("1");
    }
  });

  it("passes a changed cycle to Overview data while preserving applied organization filters", () => {
    const appliedFilters:
      OverviewFilters = {
        region: "all",
        amm: "all",
        supervisor:
          "number:16365",
      };

    setPageHookResults({
      selectedCycleKey: 202607,
      appliedFilters,
    });

    const { rerender } = render(
      <OverviewPage />,
    );

    setPageHookResults({
      selectedCycleKey: 202608,
      appliedFilters,
    });
    rerender(<OverviewPage />);

    expect(
      hookMocks.useOverviewData,
    ).toHaveBeenLastCalledWith({
      period: "mtd",
      cycleKey: 202608,
      filters: appliedFilters,
    });
  });

  it("keeps draft filters out of KPI data until Apply and removes them only after Clear plus Apply", () => {
    const allFilters:
      OverviewFilters = {
        region: "all",
        amm: "all",
        supervisor: "all",
      };
    const selectedFilters:
      OverviewFilters = {
        region: "number:1",
        amm: "all",
        supervisor: "all",
      };

    const { rerender } = render(
      <OverviewPage />,
    );

    setPageHookResults({
      appliedFilters: allFilters,
      draftFilters:
        selectedFilters,
      isFilterOpen: true,
    });
    rerender(<OverviewPage />);

    expect(
      hookMocks.useOverviewData,
    ).toHaveBeenLastCalledWith({
      period: "mtd",
      cycleKey: 202608,
      filters: allFilters,
    });
    setPageHookResults({
      appliedFilters:
        selectedFilters,
      draftFilters:
        selectedFilters,
    });
    rerender(<OverviewPage />);

    expect(
      hookMocks.useOverviewData,
    ).toHaveBeenLastCalledWith({
      period: "mtd",
      cycleKey: 202608,
      filters: selectedFilters,
    });

    setPageHookResults({
      appliedFilters:
        selectedFilters,
      draftFilters: allFilters,
      isFilterOpen: true,
    });
    rerender(<OverviewPage />);

    expect(
      hookMocks.useOverviewData,
    ).toHaveBeenLastCalledWith({
      period: "mtd",
      cycleKey: 202608,
      filters: selectedFilters,
    });

    setPageHookResults({
      appliedFilters: allFilters,
      draftFilters: allFilters,
    });
    rerender(<OverviewPage />);

    expect(
      hookMocks.useOverviewData,
    ).toHaveBeenLastCalledWith({
      period: "mtd",
      cycleKey: 202608,
      filters: allFilters,
    });
  });

  it("renders the shared next callback in both navigators for an older cycle", () => {
    setPageHookResults({
      dateLabel: "28/06 - 20/07",
      canGoNext: true,
    });

    render(<OverviewPage />);

    const nextButtons = screen.getAllByRole(
      "button",
      {
        name: "Kỳ báo cáo sau",
        hidden: true,
      },
    );

    expect(nextButtons).toHaveLength(2);
    fireEvent.click(nextButtons[0]);
    fireEvent.click(nextButtons[1]);
    expect(
      goToNextDate,
    ).toHaveBeenCalledTimes(2);
  });

  it("keeps the selected cycle when Today and 7 Ngày are unavailable", () => {
    render(<OverviewPage />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Hôm nay",
      }),
    );

    expect(
      screen.getByText(
        "Chức năng này chưa được triển khai",
      ),
    ).toBeInTheDocument();
    expect(setPeriod).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", {
        name: "7 Ngày",
      }),
    );

    expect(setPeriod).not.toHaveBeenCalled();
    for (
      const navigator of
      screen.getAllByLabelText(
        "Điều hướng ngày báo cáo",
      )
    ) {
      expect(navigator).toHaveTextContent(
        "21/07 - 21/07",
      );
    }
  });

  it("shows loading without rendering KPI content or a fake date", () => {
    setPageHookResults({
      cycleRows: [],
      dimDateLoading: true,
      dateLabel: "",
      canGoPrevious: false,
    });

    render(<OverviewPage />);

    expect(
      screen.getByText("Đang tải dữ liệu..."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Tổng quan Thị trường",
      ),
    ).not.toBeInTheDocument();
    for (
      const navigator of
      screen.getAllByLabelText(
        "Điều hướng ngày báo cáo",
      )
    ) {
      expect(navigator).toHaveTextContent("MTD:");
      expect(navigator).not.toHaveTextContent(
        /\d{2}\/\d{2}/,
      );
    }
  });

  it("shows a dimdate error and retries both Semantic Model data sources", async () => {
    setPageHookResults({
      dimDateError: "Dimdate query failed",
    });

    render(<OverviewPage />);

    expect(
      screen.getByText(
        "Dimdate query failed",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Tổng quan Thị trường",
      ),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Tải lại",
      }),
    );

    await waitFor(() => {
      expect(reloadDimDate).toHaveBeenCalledOnce();
      expect(
        reloadOverviewData,
      ).toHaveBeenCalledOnce();
    });
  });

  it("shows an empty state without crashing when dimdate returns no rows", () => {
    setPageHookResults({
      cycleRows: [],
      dateLabel: "",
      canGoPrevious: false,
    });

    expect(() =>
      render(<OverviewPage />),
    ).not.toThrow();
    expect(
      screen.getByText("Không có dữ liệu"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Tổng quan Thị trường",
      ),
    ).not.toBeInTheDocument();
  });

  it("shows the existing empty state when Overview KPI data is absent", () => {
    setPageHookResults({
      overviewData: null,
    });

    expect(() =>
      render(<OverviewPage />),
    ).not.toThrow();
    expect(
      screen.getByText("Không có dữ liệu"),
    ).toBeInTheDocument();
  });

  it("renders the full KPI table when summary values are partially BLANK", () => {
    const teamKpis:
      OverviewData["teamKpis"] = [
        {
          id: "successful-calls",
          title:
            "Successful Calls",
          percent: 93,
          issued: 11,
          issuedLabel: "NV",
          status: "good",
          trend: [],
        },
        {
          id: "beat",
          title:
            "Tần suất viếng thăm",
          percent: null,
          issued: 22,
          issuedLabel: "NV",
          status: "neutral",
          trend: [],
        },
        {
          id: "time",
          title: "Time Spend",
          percent: 102,
          issued: 33,
          issuedLabel: "NV",
          status: "good",
          trend: [],
        },
        {
          id: "team-osa",
          title: "OSA",
          percent: 95,
          issued: null,
          issuedLabel: "NV",
          status: "good",
          trend: [],
        },
        {
          id: "qc",
          title: "QC",
          percent: 99,
          issued: 55,
          issuedLabel: "NV",
          status: "good",
          trend: [],
        },
      ];

    setPageHookResults({
      overviewData: {
        coverage: [],
        marketKpis: [],
        teamKpis,
      },
    });

    render(<OverviewPage />);

    for (const kpi of teamKpis) {
      expect(
        screen.getByText(kpi.title),
      ).toBeInTheDocument();
    }
    expect(
      screen.getAllByText("—"),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("button", {
        name: "Tải lại",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows a global error only for a real Overview query error", () => {
    setPageHookResults({
      overviewError:
        "Summary query failed",
    });

    render(<OverviewPage />);

    expect(
      screen.getByText(
        "Summary query failed",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Tải lại",
      }),
    ).toBeInTheDocument();
  });
});
