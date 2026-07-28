import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOverviewData } from "./useOverviewData";

const { mockUseKpiMtdData, refetch } = vi.hoisted(() => ({
  mockUseKpiMtdData: vi.fn(),
  refetch: vi.fn(async () => undefined),
}));

vi.mock("./useKpiMtdData", () => ({
  useKpiMtdData: mockUseKpiMtdData,
}));

const semanticValues = {
  successfulCallsMtd: 93,
  successfulCallsIssued: 11,
  visitMtd: 0.27,
  visitIssued: 22,
  timeSpendMtd: 102,
  timeSpendIssued: 33,
  osaMtd: 95,
  osaIssued: 44,
  qcMtd: 99,
  qcIssued: 55,
};

describe("useOverviewData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds all five MTD Team KPIs from the one semantic result", () => {
    mockUseKpiMtdData.mockReturnValue({
      values: semanticValues,
      isLoading: false,
      error: null,
      refetch,
    });

    const { result } = renderHook(() => useOverviewData("mtd"));

    expect(result.current.data?.teamKpis).toEqual([
      {
        id: "successful-calls",
        title: "Successful Calls",
        percent: 93,
        issued: 11,
        issuedLabel: "NV",
        status: "good",
        trend: [],
      },
      {
        id: "beat",
        title: "Tần suất viếng thăm",
        percent: 0.27,
        issued: 22,
        issuedLabel: "NV",
        status: "bad",
        trend: [],
      },
      {
        id: "time",
        title: "Time Spend",
        percent: 102,
        issued: 33,
        issuedLabel: "NV",
        status: "good",
        trend: [],
      },
      {
        id: "team-osa",
        title: "OSA",
        percent: 95,
        issued: 44,
        issuedLabel: "NV",
        status: "good",
        trend: [],
      },
      {
        id: "qc",
        title: "QC",
        percent: 99,
        issued: 55,
        issuedLabel: "NV",
        status: "good",
        trend: [],
      },
    ]);
    expect(
      result.current.data?.marketKpis.find(
        (kpi) => kpi.id === "osa",
      )?.percent,
    ).toBe(95);
    expect(
      result.current.data?.teamKpis.map(
        (kpi) => kpi.percent,
      ),
    ).not.toEqual(
      expect.arrayContaining([
        99.8,
        97.9,
        88.5,
        95.4,
        98.3,
      ]),
    );
    expect(result.current.error).toBeNull();
  });

  it("uses 80 as the good/bad threshold", () => {
    mockUseKpiMtdData.mockReturnValue({
      values: {
        ...semanticValues,
        successfulCallsMtd: 80,
        qcMtd: 79.9,
      },
      isLoading: false,
      error: null,
      refetch,
    });

    const { result } = renderHook(
      () => useOverviewData("mtd"),
    );

    expect(
      result.current.data?.teamKpis[0].status,
    ).toBe("good");
    expect(
      result.current.data?.teamKpis[4].status,
    ).toBe("bad");
  });

  it("does not expose mock Overview data while KPI MTD is loading", () => {
    mockUseKpiMtdData.mockReturnValue({
      values: null,
      isLoading: true,
      error: null,
      refetch,
    });

    const { result } = renderHook(() => useOverviewData("mtd"));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("does not expose mock Overview data when the KPI MTD query fails", () => {
    mockUseKpiMtdData.mockReturnValue({
      values: null,
      isLoading: false,
      error: "Query failed",
      refetch,
    });

    const { result } = renderHook(() => useOverviewData("mtd"));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Query failed");
  });

  it("does not expose mock Overview data when KPI MTD is unavailable", () => {
    mockUseKpiMtdData.mockReturnValue({
      values: null,
      isLoading: false,
      error: null,
      refetch,
    });

    const { result } = renderHook(() => useOverviewData("mtd"));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(
      "Không có dữ liệu KPI MTD",
    );
  });

  it("keeps non-MTD periods on their existing static path", () => {
    mockUseKpiMtdData.mockReturnValue({
      values: null,
      isLoading: false,
      error: "Query failed",
      refetch,
    });

    const { result } = renderHook(
      () => useOverviewData("today"),
    );

    expect(result.current.data).not.toBeNull();
    expect(result.current.error).toBeNull();
  });
});
