import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DateNavigator } from "./DateNavigator";

describe("shared DateNavigator", () => {
  it("keeps both boundary controls in the DOM and disables them", () => {
    render(
      <DateNavigator
        prefix="Hôm nay"
        value="10/06/2026"
        canGoPrevious={false}
        canGoNext={false}
        onPrevious={() => undefined}
        onNext={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Kỳ báo cáo trước" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Kỳ báo cáo sau" })).toBeDisabled();
  });

  it("forwards enabled previous and next actions", () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(
      <DateNavigator
        prefix="MTD"
        value="01/06 - 10/06"
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kỳ báo cáo trước" }));
    fireEvent.click(screen.getByRole("button", { name: "Kỳ báo cáo sau" }));
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });
});
