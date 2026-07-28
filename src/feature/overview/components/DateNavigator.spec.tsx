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

import { DateNavigator } from "./DateNavigator";

describe("DateNavigator", () => {
  it("renders the Semantic Model date label and hides both unavailable boundaries", () => {
    render(
      <DateNavigator
        label="MTD"
        value="21/07 - 21/07"
        canGoPrevious={false}
        canGoNext={false}
        onPrevious={() => undefined}
        onNext={() => undefined}
      />,
    );

    expect(
      screen.getByLabelText(
        "Điều hướng chu kỳ MTD",
      ),
    ).toHaveTextContent(
      "MTD:21/07 - 21/07",
    );
    expect(
      screen.queryByRole("button", {
        name: "Chu kỳ trước",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Chu kỳ sau",
      }),
    ).not.toBeInTheDocument();
  });

  it("renders and forwards the previous action only when available", () => {
    const onPrevious = vi.fn();

    render(
      <DateNavigator
        label="MTD"
        value="28/06 - 20/07"
        canGoPrevious
        canGoNext={false}
        onPrevious={onPrevious}
        onNext={() => undefined}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Chu kỳ trước",
      }),
    );

    expect(onPrevious).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", {
        name: "Chu kỳ sau",
      }),
    ).not.toBeInTheDocument();
  });

  it("renders and forwards the next action for an older cycle", () => {
    const onNext = vi.fn();

    render(
      <DateNavigator
        label="MTD"
        value="28/06 - 20/07"
        canGoPrevious
        canGoNext
        onPrevious={() => undefined}
        onNext={onNext}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Chu kỳ sau",
      }),
    );

    expect(onNext).toHaveBeenCalledOnce();
  });

  it("keeps its shell stable with an empty presentation value", () => {
    render(
      <DateNavigator
        label="MTD"
        value=""
        canGoPrevious={false}
        canGoNext={false}
        onPrevious={() => undefined}
        onNext={() => undefined}
      />,
    );

    expect(
      screen.getByLabelText(
        "Điều hướng chu kỳ MTD",
      ),
    ).toHaveTextContent("MTD:");
  });
});
