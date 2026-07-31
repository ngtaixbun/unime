import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BottomNavigation } from "./BottomNavigation";

describe("BottomNavigation", () => {
  it("uses one DOM contract and marks the supplied active route", () => {
    const onNavigate = vi.fn();
    render(<BottomNavigation activeRoute="team" onNavigate={onNavigate} />);

    expect(screen.getByRole("button", { name: "Đội ngũ" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Tổng quan" }));
    expect(onNavigate).toHaveBeenCalledWith("overview");
  });
});
