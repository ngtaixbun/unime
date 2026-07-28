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

import type {
  FilterOption,
} from "../types";
import {
  FilterSheet,
} from "./FilterSheet";

const options: {
  region: FilterOption[];
  amm: FilterOption[];
  supervisor: FilterOption[];
} = {
  region: [
    {
      label: "Tất cả khu vực",
      value: "all",
    },
    {
      label: "Miền Bắc",
      value: "number:1",
    },
  ],
  amm: [
    {
      label: "Tất cả AMM",
      value: "all",
    },
    {
      label: "AMM 01",
      value: "string:001",
    },
  ],
  supervisor: [
    {
      label: "Tất cả Supervisor",
      value: "all",
    },
    {
      label: "Supervisor 01",
      value: "string:S01",
    },
  ],
};

describe("FilterSheet", () => {
  it("renders Region, AMM and Supervisor only", () => {
    render(
      <FilterSheet
        isOpen
        filters={{
          region: "all",
          amm: "all",
          supervisor: "all",
        }}
        regionOptions={options.region}
        ammOptions={options.amm}
        supervisorOptions={
          options.supervisor
        }
        onChange={vi.fn()}
        onClear={vi.fn()}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText("Khu vực"),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("AMM"),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Supervisor"),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Kênh"),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(
        "Nhà phân phối",
      ),
    ).not.toBeInTheDocument();
  });

  it("passes encoded option values to the filter state", () => {
    const onChange = vi.fn();

    render(
      <FilterSheet
        isOpen
        filters={{
          region: "all",
          amm: "all",
          supervisor: "all",
        }}
        regionOptions={options.region}
        ammOptions={options.amm}
        supervisorOptions={
          options.supervisor
        }
        onChange={onChange}
        onClear={vi.fn()}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />,
    );

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

    fireEvent.change(
      screen.getByLabelText("AMM"),
      {
        target: {
          value: "string:001",
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(
        "Supervisor",
      ),
      {
        target: {
          value: "string:S01",
        },
      },
    );

    expect(onChange).toHaveBeenNthCalledWith(
      1,
      "region",
      "number:1",
    );
    expect(onChange).toHaveBeenNthCalledWith(
      2,
      "amm",
      "string:001",
    );
    expect(onChange).toHaveBeenNthCalledWith(
      3,
      "supervisor",
      "string:S01",
    );
  });

  it("calls clear without closing or applying", () => {
    const onClear = vi.fn();
    const onClose = vi.fn();
    const onApply = vi.fn();

    render(
      <FilterSheet
        isOpen
        filters={{
          region: "all",
          amm: "all",
          supervisor: "all",
        }}
        regionOptions={options.region}
        ammOptions={options.amm}
        supervisorOptions={
          options.supervisor
        }
        onChange={vi.fn()}
        onClear={onClear}
        onClose={onClose}
        onApply={onApply}
      />,
    );

    fireEvent.click(
      screen.getByRole(
        "button",
        {
          name: "Xóa lọc",
        },
      ),
    );

    expect(onClear).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});
