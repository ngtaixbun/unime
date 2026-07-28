import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardCompactHeader, DashboardHeader } from "./DashboardHeader";

describe("DashboardHeader", () => {
  it("renders the feature-owned date slot and forwards shared actions", () => {
    const onLogout = vi.fn();
    const onOpenFilters = vi.fn();

    render(
      <DashboardHeader
        title="Đội ngũ"
        dateNavigator={<div data-testid="date-slot">Feature date navigator</div>}
        appliedFilterCount={2}
        onLogout={onLogout}
        onOpenFilters={onOpenFilters}
      />,
    );

    expect(screen.getByTestId("date-slot")).toHaveTextContent("Feature date navigator");
    expect(screen.getByText("2")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    fireEvent.click(screen.getByRole("button", { name: "Mở bộ lọc" }));

    expect(onLogout).toHaveBeenCalledOnce();
    expect(onOpenFilters).toHaveBeenCalledOnce();
  });

  it("keeps the compact badge hidden when no filter is applied", () => {
    render(
      <DashboardCompactHeader
        dateNavigator={<div data-testid="compact-date-slot" />}
        appliedFilterCount={0}
        onOpenFilters={() => undefined}
      />,
    );

    expect(screen.getByTestId("compact-date-slot")).toBeInTheDocument();
    expect(document.querySelector(".filterNavBadge")).toHaveAttribute("hidden");
  });
});
