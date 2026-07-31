import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardCompactHeader, DashboardHeader } from "./DashboardHeader";

describe("DashboardHeader", () => {
  it("renders the shared date navigator, cycle and shared actions", () => {
    const onBack = vi.fn();
    const onOpenFilters = vi.fn();

    render(
      <DashboardHeader
        title="Đội ngũ"
        cycleLabel="Chu kỳ tháng 6"
        dateNavigator={{
          prefix: "MTD",
          value: "01/06 - 10/06",
          onPrevious: () => undefined,
          onNext: () => undefined,
        }}
        appliedFilterCount={2}
        onBack={onBack}
        onOpenFilters={onOpenFilters}
      />,
    );

    expect(screen.getByLabelText("Điều hướng ngày báo cáo")).toHaveTextContent("MTD:01/06 - 10/06");
    expect(screen.getByText("Chu kỳ tháng 6")).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    fireEvent.click(screen.getByRole("button", { name: "Mở bộ lọc" }));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onOpenFilters).toHaveBeenCalledOnce();
  });

  it("keeps the same heading DOM placeholder when no cycle is supplied", () => {
    const { container } = render(
      <DashboardHeader
        title="Tổng quan"
        dateNavigator={{
          prefix: "MTD",
          value: "01/06 - 10/06",
          onPrevious: () => undefined,
          onNext: () => undefined,
        }}
        appliedFilterCount={0}
        onBack={() => undefined}
        onOpenFilters={() => undefined}
      />,
    );

    expect(container.querySelector(".nwHeaderCycle")).toHaveAttribute("data-empty", "true");
  });

  it("keeps the compact badge hidden when no filter is applied", () => {
    render(
      <DashboardCompactHeader
        dateNavigator={{
          prefix: "7 Ngày",
          value: "04/06 - 10/06",
          onPrevious: () => undefined,
          onNext: () => undefined,
        }}
        appliedFilterCount={0}
        onOpenFilters={() => undefined}
      />,
    );

    expect(screen.getByLabelText("Điều hướng ngày báo cáo")).toHaveTextContent("7 Ngày:04/06 - 10/06");
    expect(document.querySelector(".dashboard-filter-trigger__badge")).toHaveAttribute("hidden");
  });
});
