import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import {
  useState,
  type ReactNode,
} from "react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  OrganizationFilterProvider,
} from "./OrganizationFilterProvider";
import {
  useOrganizationFilters,
} from "./useOrganizationFilters";

const {
  optionState,
} = vi.hoisted(() => ({
  optionState: {
    regionOptions: [
      {
        label: "Tất cả khu vực",
        value: "all" as const,
      },
      {
        label: "North",
        value: "number:1" as const,
      },
      {
        label: "Central",
        value: "number:2" as const,
      },
    ],
    ammOptions: [
      {
        label: "Tất cả AMM",
        value: "all" as const,
      },
      {
        label: "AMM A",
        value: "string:001" as const,
      },
    ],
    supervisorOptions: [
      {
        label: "Tất cả Supervisor",
        value: "all" as const,
      },
      {
        label: "Sup A",
        value:
          "number:16365" as const,
      },
    ],
    isLoadingRegionOptions: false,
    isLoadingAmmOptions: false,
    isLoadingSupervisorOptions: false,
    regionOptionsError: null,
    ammOptionsError: null,
    supervisorOptionsError: null,
  },
}));

vi.mock(
  "./useOrganizationFilterOptions",
  () => ({
    useOrganizationFilterOptions:
      () => optionState,
  }),
);

function wrapper({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <OrganizationFilterProvider>
      {children}
    </OrganizationFilterProvider>
  );
}

function Consumer({
  name,
}: {
  name: string;
}) {
  const organization =
    useOrganizationFilters();

  return (
    <div>
      <output data-testid="consumer">
        {name}
      </output>
      <output data-testid="applied-region">
        {organization
          .appliedFilters.region}
      </output>
      <output data-testid="count">
        {organization
          .appliedFilterCount}
      </output>
    </div>
  );
}

describe(
  "OrganizationFilterProvider",
  () => {
    beforeEach(() => {
      window.history.replaceState(
        {},
        "",
        "/",
      );
    });

    it("resets descendants, applies draft once, and counts encoded selections", () => {
      const { result } =
        renderHook(
          () =>
            useOrganizationFilters(),
          { wrapper },
        );

      act(() => {
        result.current
          .openFilterSheet();
        result.current
          .updateDraftFilter(
            "region",
            "number:1",
          );
        result.current
          .updateDraftFilter(
            "amm",
            "string:001",
          );
        result.current
          .updateDraftFilter(
            "supervisor",
            "number:16365",
          );
      });

      act(() => {
        result.current
          .updateDraftFilter(
            "region",
            "number:2",
          );
      });

      expect(
        result.current.draftFilters,
      ).toEqual({
        region: "number:2",
        amm: "all",
        supervisor: "all",
      });
      expect(
        result.current.appliedFilters,
      ).toEqual({
        region: "all",
        amm: "all",
        supervisor: "all",
      });

      act(() => {
        result.current.applyFilters();
      });

      expect(
        result.current
          .appliedFilters.region,
      ).toBe("number:2");
      expect(
        result.current.appliedFilterCount,
      ).toBe(1);
      expect(
        result.current.isFilterOpen,
      ).toBe(false);
    });

    it("clears draft without changing applied state and Close restores applied state", () => {
      const { result } =
        renderHook(
          () =>
            useOrganizationFilters(),
          { wrapper },
        );

      act(() => {
        result.current
          .openFilterSheet();
        result.current
          .updateDraftFilter(
            "region",
            "number:1",
          );
      });
      act(() => {
        result.current.applyFilters();
      });
      act(() => {
        result.current
          .openFilterSheet();
        result.current
          .clearDraftFilters();
      });

      expect(
        result.current
          .appliedFilters.region,
      ).toBe("number:1");
      expect(
        result.current
          .draftFilters.region,
      ).toBe("all");
      expect(
        result.current.isFilterOpen,
      ).toBe(true);

      act(() => {
        result.current
          .closeFilterSheet();
      });

      expect(
        result.current
          .draftFilters.region,
      ).toBe("number:1");
    });

    it("keeps applied labels stable while the draft cascade changes", () => {
      const { result } =
        renderHook(
          () =>
            useOrganizationFilters(),
          { wrapper },
        );

      act(() => {
        result.current
          .openFilterSheet();
        result.current
          .updateDraftFilter(
            "region",
            "number:1",
          );
      });
      act(() => {
        result.current.applyFilters();
      });

      expect(
        result.current
          .appliedFilterLabels.region,
      ).toBe("North");

      act(() => {
        result.current
          .openFilterSheet();
        result.current
          .updateDraftFilter(
            "region",
            "number:2",
          );
      });

      expect(
        result.current
          .appliedFilters.region,
      ).toBe("number:1");
      expect(
        result.current
          .appliedFilterLabels.region,
      ).toBe("North");
    });

    it("keeps applied state when the active Overview/Team consumer changes", () => {
      function Harness() {
        const organization =
          useOrganizationFilters();
        const [
          page,
          setPage,
        ] =
          useState(
            "Overview",
          );

        return (
          <>
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
              Select North
            </button>
            <button
              type="button"
              onClick={
                organization.applyFilters
              }
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => {
                setPage(
                  page ===
                    "Overview"
                    ? "Team"
                    : "Overview",
                );
              }}
            >
              Switch
            </button>
            <Consumer
              key={page}
              name={page}
            />
          </>
        );
      }

      render(
        <OrganizationFilterProvider>
          <Harness />
        </OrganizationFilterProvider>,
      );

      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name: "Select North",
          },
        ),
      );
      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name: "Apply",
          },
        ),
      );
      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name: "Switch",
          },
        ),
      );

      expect(
        screen.getByTestId(
          "consumer",
        ),
      ).toHaveTextContent("Team");
      expect(
        screen.getByTestId(
          "applied-region",
        ),
      ).toHaveTextContent(
        "number:1",
      );
      expect(
        screen.getByTestId(
          "count",
        ),
      ).toHaveTextContent("1");
    });
  },
);
