import {
  render,
  screen,
} from "@testing-library/react";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  KpiRow,
} from "./KpiRow";

describe("KpiRow", () => {
  it("renders an empty MTD trend safely and uses KPI status for achievement", () => {
    const { container } = render(
      <KpiRow
        kpi={{
          id:
            "successful-calls",
          title:
            "Successful Calls",
          percent: 93,
          issued: 11,
          issuedLabel: "NV",
          status: "good",
          trend: [],
        }}
        period="mtd"
        onSelect={vi.fn()}
        selected={false}
        variant="team"
      />,
    );

    expect(
      screen.getByText(
        "93.0%",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText("11"),
    ).toBeInTheDocument();

    expect(
      container.querySelector(
        ".memv2-kpi-pct",
      ),
    ).toHaveClass("achieved");

    const sparkline =
      container.querySelector(
        ".memv2-spark",
      );

    expect(
      sparkline,
    ).not.toBeNull();

    expect(
      sparkline?.querySelector(
        "path",
      ),
    ).toBeNull();
  });

  it("renders Semantic Model MTD trend paths and benchmark", () => {
    const { container } = render(
      <KpiRow
        kpi={{
          id:
            "successful-calls",
          title:
            "Successful Calls",
          percent: 93,
          issued: 11,
          issuedLabel: "NV",
          status: "good",
          trend: [
            {
              date:
                "2026-07-19",
              value: 89.8,
              benchmark: 90,
            },
            {
              date:
                "2026-07-20",
              value: 93,
              benchmark: 90,
            },
          ],
        }}
        period="mtd"
        onSelect={vi.fn()}
        selected={false}
        variant="team"
      />,
    );

    const sparkline =
      container.querySelector(
        ".memv2-spark",
      );

    expect(
      sparkline?.querySelector(
        "line.benchmark",
      ),
    ).not.toBeNull();

    expect(
      sparkline?.querySelectorAll(
        "g.lines path",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("renders individual BLANK values as dashes with neutral styling", () => {
    const { container } = render(
      <KpiRow
        kpi={{
          id: "team-osa",
          title: "OSA",
          percent: null,
          issued: null,
          issuedLabel: "NV",
          status: "neutral",
          trend: [],
        }}
        period="mtd"
        onSelect={vi.fn()}
        selected={false}
        variant="team"
      />,
    );

    expect(
      screen.getAllByText("—"),
    ).toHaveLength(2);

    expect(
      container.querySelector(
        ".memv2-kpi-pct",
      ),
    ).toHaveClass("neutral");

    expect(
      container.querySelector(
        ".memv2-kpi-issued",
      ),
    ).toHaveClass("no-data");

    expect(
      container.querySelector(
        ".memv2-kpi-pct",
      ),
    ).not.toHaveClass(
      "not-achieved",
    );
  });

  it("renders zero percent and Issued as real values instead of dashes", () => {
    const { container } = render(
      <KpiRow
        kpi={{
          id: "beat",
          title:
            "Tần suất viếng thăm",
          percent: 0,
          issued: 0,
          issuedLabel: "NV",
          status: "bad",
          trend: [],
        }}
        period="mtd"
        onSelect={vi.fn()}
        selected={false}
        variant="team"
      />,
    );

    expect(
      screen.getByText("0.0%"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("0"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("—"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector(
        ".memv2-kpi-pct",
      ),
    ).toHaveClass(
      "not-achieved",
    );
    expect(
      container.querySelector(
        ".memv2-kpi-issued",
      ),
    ).not.toHaveClass("no-data");
  });
});
