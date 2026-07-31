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
} from "./OrganizationFilterProvider";
import {
  OrganizationFilterSheet,
} from "./OrganizationFilterSheet";
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
        value: "number:16365" as const,
      },
    ],
    isLoadingRegionOptions: false,
    isLoadingAmmOptions: false,
    isLoadingSupervisorOptions: false,
    regionOptionsError: null as string | null,
    ammOptionsError: null as string | null,
    supervisorOptionsError:
      null as string | null,
  },
}));

vi.mock(
  "./useOrganizationFilterOptions",
  () => ({
    useOrganizationFilterOptions:
      () => optionState,
  }),
);

function Harness() {
  const organization =
    useOrganizationFilters();

  return (
    <>
      <button
        type="button"
        onClick={
          organization.openFilterSheet
        }
      >
        Open
      </button>
      <output data-testid="applied">
        {
          organization
            .appliedFilters.region
        }
      </output>
      <OrganizationFilterSheet />
    </>
  );
}

function renderSheet() {
  render(
    <OrganizationFilterProvider>
      <Harness />
    </OrganizationFilterProvider>,
  );
  fireEvent.click(
    screen.getByRole(
      "button",
      { name: "Open" },
    ),
  );
}

describe(
  "OrganizationFilterSheet",
  () => {
    beforeEach(() => {
      window.history.replaceState(
        {},
        "",
        "/",
      );
      optionState
        .regionOptionsError =
        null;
      optionState
        .isLoadingRegionOptions =
        false;
    });

    it("keeps the Overview source-of-truth labels and controls", () => {
      renderSheet();

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
        screen.getByLabelText(
          "Khu vực",
        ),
      ).toBeVisible();
      expect(
        screen.getByLabelText("AMM"),
      ).toBeVisible();
      expect(
        screen.getByLabelText(
          "Supervisor",
        ),
      ).toBeVisible();
      expect(
        screen.getByRole(
          "button",
          {
            name: "Xóa lọc",
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
      expect(
        screen.queryByText(
          "Mer Sup",
        ),
      ).not.toBeInTheDocument();
    });

    it("keeps Clear in draft and applies encoded values only on Apply", () => {
      renderSheet();

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
      expect(
        screen.getByTestId(
          "applied",
        ),
      ).toHaveTextContent("all");

      fireEvent.click(
        screen.getByRole(
          "button",
          {
            name: "Xóa lọc",
          },
        ),
      );
      expect(
        screen.getByRole(
          "dialog",
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
        screen.getByTestId(
          "applied",
        ),
      ).toHaveTextContent(
        "number:1",
      );
      expect(
        screen.queryByRole(
          "dialog",
        ),
      ).not.toBeInTheDocument();
    });

    it("closes on the backdrop but not on sheet interaction", () => {
      renderSheet();

      fireEvent.mouseDown(
        screen.getByRole(
          "dialog",
        ),
      );
      expect(
        screen.getByRole(
          "dialog",
        ),
      ).toBeVisible();

      const overlay =
        document.querySelector(
          ".simple-filter-overlay",
        );
      expect(overlay).not.toBeNull();
      fireEvent.mouseDown(
        overlay as Element,
      );
      expect(
        screen.queryByRole(
          "dialog",
        ),
      ).not.toBeInTheDocument();
    });

    it("keeps the Overview error state copy", () => {
      optionState
        .regionOptionsError =
        "failed";
      renderSheet();

      expect(
        screen.getByText(
          "Không thể tải đầy đủ danh sách bộ lọc.",
        ),
      ).toHaveTextContent(
        "Không thể tải đầy đủ danh sách bộ lọc.",
      );
    });

    it("disables only the option level that is loading", () => {
      optionState
        .isLoadingRegionOptions =
        true;
      renderSheet();

      expect(
        screen.getByLabelText(
          "Khu vực",
        ),
      ).toBeDisabled();
      expect(
        screen.getByLabelText("AMM"),
      ).not.toBeDisabled();
      expect(
        screen.getByLabelText(
          "Supervisor",
        ),
      ).not.toBeDisabled();
    });
  },
);
