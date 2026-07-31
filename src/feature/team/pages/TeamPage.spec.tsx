import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  OrganizationFilterProvider,
} from "@/components/organization-filter";

import {
  TeamProvider,
} from "../hooks";

import {
  TeamPage,
} from "./TeamPage";

const {
  semanticCycles,
  reloadCycles,
  teamKpiDimensionState,
  teamAmmState,
  teamAmmQueryMock,
  teamRegionState,
  teamRegionQueryMock,
} = vi.hoisted(
  () => ({
    semanticCycles: [
      {
        cycleKey:
          202608,
        cycleLabel:
          "Chu kỳ 202608",
        cycleStartDate:
          "2026-07-21T00:00:00.000",
        cycleEndDate:
          "2026-07-23T00:00:00.000",
        cycleSort:
          202608,
        isLatestCycle:
          true,
      },
    ],

    reloadCycles:
      vi.fn(
        async () =>
          undefined,
      ),

    teamKpiDimensionState: {
      kpis: [
        {
          kpiId: 5,
          label:
            "Chất lượng Semantic",
          key:
            "qc" as const,
        },
      ],
      isLoading:
        false,
      error:
        null,
      retry:
        vi.fn(
          async () =>
            undefined,
        ),
    },

    teamAmmState: {
      rows: [
        {
          key:
            "string:001",
          entityId:
            "001",
          ammId:
            "001",
          name:
            "AMM Semantic North",
          region:
            "number:1",
          regionId:
            1,
          regionFilterValue:
            "number:1",
          value:
            0.91,
          gap:
            0.01,
          nvFail:
            2,
          contributionNvFail:
            1,
          countNv:
            20,
          contributionNv:
            1,
        },
      ],
      employeeCount:
        20,
      isLoading:
        false,
      error:
        null,
      retry:
        vi.fn(
          async () =>
            undefined,
        ),
      queryElements:
        null,
    },

    teamAmmQueryMock:
      vi.fn(),

    teamRegionState: {
      rows: [
        {
          key:
            "number:1",
          regionId: 1,
          entityId: 1,
          name:
            "North",
          region:
            "North",
          value:
            0.993,
          gap:
            0.193,
          nvFail:
            3,
          contributionNvFail:
            0.08,
          countNv:
            38,
          contributionNv:
            0.21,
        },
      ],
      employeeCount:
        38,
      isLoading:
        false,
      error:
        null,
      retry:
        vi.fn(
          async () =>
            undefined,
      ),
    },

    teamRegionQueryMock:
      vi.fn(),
  }),
);

vi.mock(
  "@/hooks/use-dim-date-data",
  () => ({
    useDimDateData:
      () => ({
        cycles:
          semanticCycles,
        loading:
          false,
        error:
          null,
        reload:
          reloadCycles,
      }),
  }),
);

vi.mock(
  "../hooks/useTeamKpiDimension",
  () => ({
    useTeamKpiDimension:
      () =>
        teamKpiDimensionState,
  }),
);

vi.mock(
  "../hooks/useTeamAmmKpiData",
  () => ({
    useTeamAmmKpiData:
      teamAmmQueryMock,
  }),
);

vi.mock(
  "../hooks/useTeamRegionKpiData",
  () => ({
    useTeamRegionKpiData:
      teamRegionQueryMock,
  }),
);

vi.mock(
  "@/components/organization-filter/useOrganizationFilterOptions",
  () => ({
    useOrganizationFilterOptions:
      () => ({
        regionOptions: [
          {
            label:
              "Tất cả khu vực",
            value: "all",
          },
          {
            label: "North",
            value: "number:1",
          },
        ],
        ammOptions: [
          {
            label: "Tất cả AMM",
            value: "all",
          },
        ],
        supervisorOptions: [
          {
            label:
              "Tất cả Supervisor",
            value: "all",
          },
        ],
        isLoadingRegionOptions:
          false,
        isLoadingAmmOptions:
          false,
        isLoadingSupervisorOptions:
          false,
        regionOptionsError: null,
        ammOptionsError: null,
        supervisorOptionsError:
          null,
      }),
  }),
);

describe(
  "TeamPage real Region KPI data",
  () => {
    beforeEach(
      () => {
        teamRegionQueryMock
          .mockReset()
          .mockReturnValue(
            teamRegionState,
          );
        teamAmmQueryMock
          .mockReset()
          .mockReturnValue(
            teamAmmState,
          );
        window.history
          .replaceState(
            {},
            "",
            "/team?period=mtd&date=2026-07-23",
          );
      },
    );

    it("renders Semantic KPI and real Region measures", () => {
      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamPage
              onNavigate={() =>
                undefined
              }
            />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      expect(
        screen.getByText(
          "Chất lượng Semantic theo khu vực",
        ),
      ).toBeVisible();

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

      expect(
        screen.getAllByText(
          "38 NV",
        ).length,
      ).toBeGreaterThan(
        0,
      );

      expect(
        teamRegionQueryMock,
      ).toHaveBeenCalledWith({
        cycleKey: 202608,
        kpiId: 5,
        filters: {
          region: "all",
          amm: "all",
          supervisor: "all",
        },
        enabled: true,
      });

      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name: "Mở bộ lọc",
          },
        ),
      );
      expect(
        screen.getByRole(
          "dialog",
          {
            name:
              "Bộ lọc dữ liệu",
          },
        ),
      ).toBeVisible();
      expect(
        screen.getByRole(
          "button",
          {
            name:
              "Áp dụng bộ lọc",
          },
        ),
      ).toBeVisible();

      fireEvent.change(
        screen.getByLabelText(
          "Khu vực",
        ),
        {
          target: {
            value: "number:1",
          },
        },
      );
      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name:
              "Áp dụng bộ lọc",
          },
        ),
      );

      expect(
        teamRegionQueryMock,
      ).toHaveBeenLastCalledWith({
        cycleKey: 202608,
        kpiId: 5,
        filters: {
          region: "number:1",
          amm: "all",
          supervisor: "all",
        },
        enabled: true,
      });
      expect(
        screen.getByRole(
          "button",
          {
            name: "Mở bộ lọc",
          },
        ).querySelector(
          ".dashboard-filter-trigger__badge",
        ),
      ).toHaveTextContent("1");
    });

    it("keeps the Region chart and badge while the AMM tab switches only the table source", () => {
      const {
        container,
      } = render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamPage
              onNavigate={() =>
                undefined
              }
            />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      fireEvent.click(
        screen.getByRole(
          "tab",
          {
            name: "AMM",
          },
        ),
      );

      expect(
        screen.getByText(
          "Chất lượng Semantic theo khu vực",
        ),
      ).toBeVisible();

      const chart =
        container.querySelector(
          ".team-chart-card",
        );
      const table =
        container.querySelector(
          ".team-data-table",
        );

      expect(
        chart?.querySelector(
          ".team-bar-name",
        ),
      ).toHaveTextContent(
        "North",
      );
      expect(
        chart,
      ).not.toHaveTextContent(
        "AMM Semantic North",
      );
      expect(
        table?.querySelector(
          ".team-entity b",
        ),
      ).toHaveTextContent(
        "AMM Semantic North",
      );
      expect(
        screen.getAllByText(
          "AMM Semantic North",
        ),
      ).toHaveLength(1);
      expect(
        screen.getByText(
          "38 nhân viên",
        ),
      ).toBeVisible();

      expect(
        teamAmmQueryMock,
      ).toHaveBeenLastCalledWith({
        cycleKey: 202608,
        kpiId: 5,
        filters: {
          region: "all",
          amm: "all",
          supervisor: "all",
        },
        enabled: true,
      });

      expect(
        teamRegionQueryMock,
      ).toHaveBeenLastCalledWith({
        cycleKey: 202608,
        kpiId: 5,
        filters: {
          region: "all",
          amm: "all",
          supervisor: "all",
        },
        enabled: true,
      });

      expect(
        window.location.search,
      ).toContain(
        "level=amm",
      );
      expect(
        window.location.search,
      ).toContain(
        "teamMetric=qc",
      );
    });

    it("isolates AMM table errors and retry without replacing the Region chart", () => {
      const retry =
        vi.fn(
          async () =>
            undefined,
        );

      teamAmmQueryMock
        .mockReturnValue({
          rows: [],
          employeeCount:
            null,
          isLoading:
            false,
          error:
            "AMM backend failed",
          retry,
          queryElements:
            null,
        });

      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamPage
              onNavigate={() =>
                undefined
              }
            />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      fireEvent.click(
        screen.getByRole(
          "tab",
          {
            name: "AMM",
          },
        ),
      );

      expect(
        screen.getByRole(
          "alert",
        ),
      ).toHaveTextContent(
        "Không thể tải dữ liệu AMM: AMM backend failed",
      );
      expect(
        screen.getByText(
          "99.3%",
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          "Chất lượng Semantic theo khu vực",
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          "38 nhân viên",
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
        retry,
      ).toHaveBeenCalledOnce();
    });

    it("keeps the Region chart visible while the AMM table is loading", () => {
      teamAmmQueryMock
        .mockReturnValue({
          rows: [],
          employeeCount:
            null,
          isLoading:
            true,
          error:
            null,
          retry:
            vi.fn(
              async () =>
                undefined,
            ),
          queryElements:
            null,
        });

      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamPage
              onNavigate={() =>
                undefined
              }
            />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      fireEvent.click(
        screen.getByRole(
          "tab",
          {
            name: "AMM",
          },
        ),
      );

      expect(
        screen.getByText(
          "99.3%",
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          "Đang tải dữ liệu AMM...",
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          "38 nhân viên",
        ),
      ).toBeVisible();
    });
  },
);
