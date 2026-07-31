import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ReportPeriodMode } from "./ReportPeriodMode";

describe("ReportPeriodMode", () => {
  it("renders the shared three-mode DOM and forwards selection", () => {
    const onChange = vi.fn();

    render(
      <ReportPeriodMode
        period="today"
        onChange={onChange}
      />,
    );

    expect(
      screen.getAllByRole("button"),
    ).toHaveLength(3);
    expect(
      screen.getByRole(
        "button",
        { name: "Hôm nay" },
      ),
    ).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(
      screen.getByRole(
        "button",
        { name: "7 Ngày" },
      ),
    );

    expect(onChange).toHaveBeenCalledWith(
      "7days",
    );
  });

  it("can make unavailable modes natively disabled", () => {
    const onChange = vi.fn();

    render(
      <ReportPeriodMode
        period="mtd"
        onChange={onChange}
        isPeriodEnabled={
          (period) => period === "mtd"
        }
        disableUnavailableInteraction
      />,
    );

    const todayButton = screen.getByRole(
      "button",
      { name: "Hôm nay" },
    );
    const sevenDaysButton =
      screen.getByRole(
        "button",
        { name: "7 Ngày" },
      );

    expect(todayButton).toBeDisabled();
    expect(sevenDaysButton).toBeDisabled();
    expect(todayButton).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    fireEvent.click(todayButton);
    fireEvent.click(sevenDaysButton);

    expect(onChange).not.toHaveBeenCalled();
  });
});