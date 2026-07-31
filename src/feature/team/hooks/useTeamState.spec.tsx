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
  useOrganizationFilters,
} from "@/components/organization-filter";
import {
  TeamProvider,
  useTeamState,
} from "./useTeamState";

const {
  semanticCycles,
  reloadCycles,
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
}));

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

function TeamStateProbe() {
  const team = useTeamState();
  const organization =
    useOrganizationFilters();
  const first = team.currentRows.find(
    (row) => row.empCode === "A001001",
  );

  return (
    <div>
      <output data-testid="period">
        {team.period}
      </output>
      <output data-testid="date-label">
        {team.dateLabel}
      </output>
      <output data-testid="cycle-key">
        {String(team.selectedCycleKey)}
      </output>
      <output data-testid="route-date">
        {team.routeDate}
      </output>
      <output data-testid="headcount">
        {team.currentRows.length}
      </output>
      <output data-testid="calls">
        {first?.callsPct ?? "none"}
      </output>

      <button
        type="button"
        onClick={() => team.setPeriod("7days")}
      >
        Set 7 days
      </button>

      <button
        type="button"
        onClick={team.goToPreviousDate}
      >
        Previous cycle
      </button>

      <button
        type="button"
        onClick={() => {
          organization
            .openFilterSheet();
          organization
            .updateDraftFilter(
            "region",
            "number:1",
          );
        }}
      >
        Draft North
      </button>

      <button
        type="button"
        onClick={
          organization.applyFilters
        }
      >
        Apply filters
      </button>
    </div>
  );
}

describe(
  "TeamProvider KPI cycle context",
  () => {
    beforeEach(() => {
      window.history.replaceState(
        {},
        "",
        "/team?period=today&date=2026-07-23",
      );
    });

    it("uses the latest Semantic Model cycle while keeping mock MTD data", () => {
      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamStateProbe />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      expect(
        screen.getByTestId("period"),
      ).toHaveTextContent("mtd");
      expect(
        screen.getByTestId("date-label"),
      ).toHaveTextContent(
        "21/07 - 23/07",
      );
      expect(
        screen.getByTestId("cycle-key"),
      ).toHaveTextContent("202608");
      expect(
        screen.getByTestId("route-date"),
      ).toHaveTextContent(
        "2026-07-23",
      );
      expect(
        screen.getByTestId("headcount"),
      ).toHaveTextContent("180");
    });

    it("ignores disabled period changes", () => {
      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamStateProbe />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      const callsBefore =
        screen.getByTestId("calls")
          .textContent;

      fireEvent.click(
        screen.getByRole(
          "button",
          { name: "Set 7 days" },
        ),
      );

      expect(
        screen.getByTestId("period"),
      ).toHaveTextContent("mtd");
      expect(
        screen.getByTestId("date-label"),
      ).toHaveTextContent(
        "21/07 - 23/07",
      );
      expect(
        screen.getByTestId("calls")
          .textContent,
      ).toBe(callsBefore);
    });

    it("moves to the previous Semantic Model cycle without changing mock data", () => {
      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamStateProbe />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      const callsBefore =
        screen.getByTestId("calls")
          .textContent;

      fireEvent.click(
        screen.getByRole(
          "button",
          { name: "Previous cycle" },
        ),
      );

      expect(
        screen.getByTestId("date-label"),
      ).toHaveTextContent(
        "28/06 - 20/07",
      );
      expect(
        screen.getByTestId("cycle-key"),
      ).toHaveTextContent("202607");
      expect(
        screen.getByTestId("route-date"),
      ).toHaveTextContent(
        "2026-07-20",
      );
      expect(
        screen.getByTestId("calls")
          .textContent,
      ).toBe(callsBefore);
    });

    it("keeps hierarchy filtering on the existing mock MTD rows", () => {
      render(
        <OrganizationFilterProvider>
          <TeamProvider>
            <TeamStateProbe />
          </TeamProvider>
        </OrganizationFilterProvider>,
      );

      fireEvent.click(
        screen.getByRole(
          "button",
          { name: "Draft North" },
        ),
      );
      fireEvent.click(
        screen.getByRole(
          "button",
          { name: "Apply filters" },
        ),
      );

      expect(
        Number(
          screen.getByTestId("headcount")
            .textContent,
        ),
      ).toBeGreaterThan(0);
      expect(
        Number(
          screen.getByTestId("headcount")
            .textContent,
        ),
      ).toBeLessThan(180);
    });
  },
);
