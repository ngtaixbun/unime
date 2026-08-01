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
import { TeamProvider } from "../hooks";
import { TeamDetails } from "./TeamDetails";

const {
  semanticCycles,
  reloadCycles,
  employeeKpiHook,
  employeeDetailsHook,
  retryEmployeeKpi,
  retryKpis,
  semanticKpis,
} = vi.hoisted(() => ({
  semanticCycles: [
    {
      cycleKey: 202607,
      cycleLabel: "Chu kỳ 202607",
      cycleStartDate:
        "2026-06-28T00:00:00.000",
      cycleEndDate:
        "2026-07-20T00:00:00.000",
      cycleSort: 202607,
      isLatestCycle: false,
    },
    {
      cycleKey: 202608,
      cycleLabel: "Chu kỳ 202608",
      cycleStartDate:
        "2026-07-21T00:00:00.000",
      cycleEndDate:
        "2026-07-23T00:00:00.000",
      cycleSort: 202608,
      isLatestCycle: true,
    },
  ],
  reloadCycles: vi.fn(
    async () => undefined,
  ),
  employeeKpiHook: vi.fn(),
  employeeDetailsHook: vi.fn(),
  retryEmployeeKpi: vi.fn(
    async () => undefined,
  ),
  retryKpis: vi.fn(
    async () => undefined,
  ),
  semanticKpis: [
    {
      kpiId: 1,
      label: "Successful Calls Semantic",
      key: "calls" as const,
    },
    {
      kpiId: 2,
      label: "Beat Semantic",
      key: "beat" as const,
    },
    {
      kpiId: 3,
      label: "Time Semantic",
      key: "time" as const,
    },
    {
      kpiId: 4,
      label: "OSA Semantic",
      key: "osa" as const,
    },
    {
      kpiId: 5,
      label: "QC Semantic",
      key: "qc" as const,
    },
  ],
}));

vi.mock(
  "../hooks/useTeamKpiDimension",
  () => ({
    useTeamKpiDimension: () => ({
      kpis: semanticKpis,
      isLoading: false,
      error: null,
      retry: retryKpis,
    }),
  }),
);

vi.mock(
  "../hooks/useTeamEmployeeKpiData",
  () => ({
    useTeamEmployeeKpiData: (
      params: unknown,
    ) => employeeKpiHook(params),
  }),
);

vi.mock(
  "../hooks/useTeamSemanticEmployeeDetails",
  () => ({
    useTeamSemanticEmployeeDetails: (
      params: unknown,
    ) => employeeDetailsHook(params),
  }),
);

vi.mock(
  "@/hooks/use-dim-date-data",
  () => ({
    useDimDateData: () => ({
      cycles: semanticCycles,
      loading: false,
      error: null,
      reload: reloadCycles,
    }),
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
  "TeamDetails KPI cycle context",
  () => {
    beforeEach(() => {
      employeeKpiHook.mockReset();
      employeeDetailsHook.mockReset();
      retryEmployeeKpi.mockClear();
      retryKpis.mockClear();
      employeeKpiHook.mockReturnValue({
        rows: [
          {
            key: "number:9001",
            employeeId: 9001,
            employeeLabel:
              "Nhân viên Semantic",
            regionId: 1,
            ammId: 8214,
            supervisorId: 8227,
            actual: 81.6,
            target: 100,
            percentage: 0.816,
            status: "fail",
          },
        ],
        isLoading: false,
        error: null,
        retry: retryEmployeeKpi,
      });
      employeeDetailsHook.mockReturnValue({
        employee: {
          employeeId: 9001,
          employeeCode: "NV-SEM-9001",
          employeeLabel: "Nhân viên Semantic",
          regionLabel: "North Semantic",
          ammLabel: "AMM Semantic",
          supervisorLabel: "Mer Sup Semantic",
          nppLabel: "NPP Semantic",
          kpis: semanticKpis.map((item) => ({
            kpiId: item.kpiId,
            kpiLabel: item.label,
            actual: 81,
            target: 100,
            percentage: 0.81,
          })),
        },
        trend: [
          {
            date: "2026-07-23",
            value: 0.81,
            delta: 0.01,
          },
        ],
        isLoading: false,
        error: null,
        retry: vi.fn(async () => undefined),
      });
      window.history.replaceState(
        {},
        "",
        "/team/details?period=7days&date=2026-07-23&region=number%3A1&amm=all&supervisor=all&teamMetric=qc&level=region&tab=by-kpi&metric=qc",
      );
    });

    it("normalizes disabled modes to MTD and keeps the semantic date on back", () => {
      const onNavigate = vi.fn();

      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamDetails
              onNavigate={onNavigate}
            />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      expect(
        screen.getByText(
          /MTD: 21\/07 - 23\/07 · North/,
        ),
      ).toBeVisible();

      fireEvent.click(
        screen.getByRole(
          "button",
          { name: "Quay lại Đội ngũ" },
        ),
      );

      const backPath =
        onNavigate.mock.calls.at(-1)?.[0];

      expect(backPath).toContain("/team?");
      expect(backPath).toContain(
        "period=mtd",
      );
      expect(backPath).toContain(
        "date=2026-07-23",
      );
      expect(backPath).toContain(
        "region=number%3A1",
      );
    });

    it("preserves MTD and semantic date while changing detail tabs", () => {
      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamDetails
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
          { name: "Xem theo Quản lý" },
        ),
      );

      expect(
        window.location.search,
      ).toContain("period=mtd");
      expect(
        window.location.search,
      ).toContain(
        "date=2026-07-23",
      );
      expect(
        window.location.search,
      ).toContain(
        "region=number%3A1",
      );
      expect(
        window.location.search,
      ).toContain("tab=manager");
    });

    it("resolves the route metric and passes cycle plus encoded Region and Supervisor filters", () => {
      window.history.replaceState(
        {},
        "",
        "/team/details?period=mtd&date=2026-07-23&region=number%3A1&amm=all&supervisor=number%3A8227&tab=by-kpi&metric=qc",
      );

      const {
        container,
      } = render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamDetails
              onNavigate={() => undefined}
            />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      expect(employeeKpiHook)
        .toHaveBeenLastCalledWith({
          cycleKey: 202608,
          kpiId: 5,
          filters: {
            region: "number:1",
            amm: "all",
            supervisor: "number:8227",
          },
          enabled: true,
        });
      expect(
        screen.getByText(
          "Nhân viên Semantic",
        ),
      ).toBeVisible();
      expect(
        container.querySelectorAll(
          ".team-employee-row",
        ),
      ).toHaveLength(1);
    });

    it("passes the encoded AMM route filter without matching its label", () => {
      window.history.replaceState(
        {},
        "",
        "/team/details?period=mtd&date=2026-07-23&region=number%3A1&amm=number%3A8214&supervisor=number%3A8227&level=amm&tab=by-kpi&metric=qc",
      );

      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamDetails
              onNavigate={() => undefined}
            />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      expect(employeeKpiHook)
        .toHaveBeenLastCalledWith(
          expect.objectContaining({
            filters: {
              region: "number:1",
              amm: "number:8214",
              supervisor: "number:8227",
            },
          }),
        );
    });

    it("updates both the Semantic kpiId and URL when the KPI changes", () => {
      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamDetails
              onNavigate={() => undefined}
            />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      fireEvent.change(
        screen.getByLabelText(
          "KPI chi tiết",
        ),
        {
          target: {
            value: "calls",
          },
        },
      );

      expect(employeeKpiHook)
        .toHaveBeenLastCalledWith(
          expect.objectContaining({
            cycleKey: 202608,
            kpiId: 1,
            enabled: true,
          }),
        );
      expect(
        window.location.search,
      ).toContain("metric=calls");
    });

    it("opens the bottom popup with real Semantic employee details", () => {
      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamDetails
              onNavigate={() => undefined}
            />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      fireEvent.click(
        screen.getByRole(
          "button",
          { name: /Nhân viên Semantic/ },
        ),
      );

      expect(employeeDetailsHook)
        .toHaveBeenLastCalledWith({
          cycleKey: 202608,
          employeeId: 9001,
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
          "dialog",
          { name: "Nhân viên Semantic" },
        ),
      ).toBeVisible();
      expect(
        screen.getByText("NV-SEM-9001"),
      ).toBeVisible();
      expect(
        screen.getByText("NPP Semantic"),
      ).toBeVisible();
    });
  },
);
