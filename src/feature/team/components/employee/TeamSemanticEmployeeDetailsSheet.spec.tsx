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
  TeamSemanticEmployeeDetailsSheet,
} from "./TeamSemanticEmployeeDetailsSheet";

const {
  detailsHook,
  retry,
} = vi.hoisted(() => ({
  detailsHook: vi.fn(),
  retry: vi.fn(async () => undefined),
}));

vi.mock(
  "../../hooks/useTeamSemanticEmployeeDetails",
  () => ({
    useTeamSemanticEmployeeDetails: (params: unknown) => detailsHook(params),
  }),
);

const semanticMetrics = [
  { kpiId: 1, key: "calls" as const, label: "Successful Calls" },
  { kpiId: 2, key: "beat" as const, label: "Tần suất viếng thăm" },
  { kpiId: 3, key: "time" as const, label: "Time Spend" },
  { kpiId: 4, key: "osa" as const, label: "OSA" },
  { kpiId: 5, key: "qc" as const, label: "QC" },
];

const selection = {
  employee: {
    key: "string:9542",
    employeeId: "9542",
    employeeLabel: "Nhân viên Semantic thật",
    regionId: 1,
    ammId: 2,
    supervisorId: 3,
    actual: 8,
    target: 10,
    percentage: 0.8,
    status: "fail" as const,
  },
  metric: "qc" as const,
};

function renderSheet(onClose = vi.fn()) {
  const result = render(
    <TeamSemanticEmployeeDetailsSheet
      selection={selection}
      cycleKey={202608}
      filters={{ region: "number:1", amm: "all", supervisor: "all" }}
      semanticMetrics={semanticMetrics}
      onClose={onClose}
    />,
  );

  return { ...result, onClose };
}

describe("TeamSemanticEmployeeDetailsSheet", () => {
  beforeEach(() => {
    detailsHook.mockReset();
    retry.mockClear();
    detailsHook.mockReturnValue({
      employee: {
        employeeId: "9542",
        employeeCode: "A020811",
        employeeLabel: "Nhân viên Semantic thật",
        regionLabel: "CENTRAL",
        ammLabel: "AMM Semantic",
        supervisorLabel: "Mer Sup Semantic",
        nppLabel: "NPP Semantic",
        kpis: semanticMetrics.map((item, index) => ({
          kpiId: item.kpiId,
          kpiLabel: item.label,
          actual: index + 8,
          target: index + 10,
          percentage: (index + 8) / (index + 10),
        })),
      },
      trend: [
        { date: "2026-07-22", value: 0.75, delta: -0.05 },
        { date: "2026-07-23", value: 0.8, delta: 0.05 },
      ],
      isLoading: false,
      error: null,
      retry,
    });
  });

  it("renders the existing bottom-sheet UI entirely from Semantic data", () => {
    renderSheet();

    expect(screen.getByRole("dialog", { name: "Nhân viên Semantic thật" })).toBeVisible();
    expect(screen.getByText("A020811")).toBeVisible();
    expect(screen.getByText("CENTRAL")).toBeVisible();
    expect(screen.getByText("AMM Semantic")).toBeVisible();
    expect(screen.getByText("Mer Sup Semantic")).toBeVisible();
    expect(screen.getByText("NPP Semantic")).toBeVisible();
    expect(screen.getByText("8")).toBeVisible();
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
    expect(screen.getAllByText("80.0%").length).toBeGreaterThan(0);
    expect(screen.getByText("Trend 7 ngày gần nhất")).toBeVisible();
  });

  it("loads the selected KPI trend and switches KPI without using mock state", () => {
    renderSheet();

    expect(detailsHook).toHaveBeenLastCalledWith({
      cycleKey: 202608,
      employeeId: "9542",
      kpiId: 5,
      filters: { region: "number:1", amm: "all", supervisor: "all" },
      enabled: true,
    });

    fireEvent.click(screen.getByRole("tab", { name: "Successful Calls" }));

    expect(detailsHook).toHaveBeenLastCalledWith(
      expect.objectContaining({ employeeId: "9542", kpiId: 1, enabled: true }),
    );
  });

  it("closes from the close button and Escape", () => {
    const { onClose } = renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Đóng chi tiết nhân viên" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("shows Semantic loading and error states without stale profile values", () => {
    detailsHook.mockReturnValueOnce({
      employee: null,
      trend: [],
      isLoading: true,
      error: null,
      retry,
    });
    const { rerender } = renderSheet();

    expect(screen.getByRole("status")).toHaveTextContent("Đang tải thông tin nhân viên");
    expect(screen.queryByText("A020811")).not.toBeInTheDocument();

    detailsHook.mockReturnValue({
      employee: null,
      trend: [],
      isLoading: false,
      error: "Semantic unavailable",
      retry,
    });
    rerender(
      <TeamSemanticEmployeeDetailsSheet
        selection={selection}
        cycleKey={202608}
        filters={{ region: "number:1", amm: "all", supervisor: "all" }}
        semanticMetrics={semanticMetrics}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Semantic unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
