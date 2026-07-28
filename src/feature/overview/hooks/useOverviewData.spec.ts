import {
  renderHook,
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  useOverviewData,
} from "./useOverviewData";

const {
  mockUseKpiMtdData,
  mockUseKpiMtdTrendData,
  refetchSummary,
  refetchTrend,
} = vi.hoisted(() => ({
  mockUseKpiMtdData: vi.fn(),
  mockUseKpiMtdTrendData:
    vi.fn(),
  refetchSummary:
    vi.fn(async () => undefined),
  refetchTrend:
    vi.fn(async () => undefined),
}));

vi.mock(
  "./useKpiMtdData",
  () => ({
    useKpiMtdData:
      mockUseKpiMtdData,
  }),
);

vi.mock(
  "./useKpiMtdTrendData",
  () => ({
    useKpiMtdTrendData:
      mockUseKpiMtdTrendData,
  }),
);

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

const semanticTrendRows = [
  {
    Date: "2026-07-19",
    successfulCallsMtd: 89.8,
    visitMtd: 96.9,
    timeSpendMtd: 101.4,
    osaMtd: 94.9,
    qcMtd: 97.1,
    benchmark: 90,
  },
  {
    Date: "2026-07-20",
    successfulCallsMtd: 93,
    visitMtd: 97.6,
    timeSpendMtd: 102,
    osaMtd: 95,
    qcMtd: 99,
    benchmark: 90,
  },
];

describe(
  "useOverviewData",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mockUseKpiMtdTrendData
        .mockReturnValue({
          rows:
            semanticTrendRows,
          isLoading: false,
          error: null,
          refetch: refetchTrend,
        });
    });

    it("builds all five MTD Team KPIs from summary and trend semantic results", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values:
            semanticValues,
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data
          ?.teamKpis,
      ).toEqual([
        {
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
        },
        {
          id: "beat",
          title:
            "Tần suất viếng thăm",
          percent: 0.27,
          issued: 22,
          issuedLabel: "NV",
          status: "bad",
          trend: [
            {
              date:
                "2026-07-19",
              value: 96.9,
              benchmark: 90,
            },
            {
              date:
                "2026-07-20",
              value: 97.6,
              benchmark: 90,
            },
          ],
        },
        {
          id: "time",
          title:
            "Time Spend",
          percent: 102,
          issued: 33,
          issuedLabel: "NV",
          status: "good",
          trend: [
            {
              date:
                "2026-07-19",
              value: 101.4,
              benchmark: 90,
            },
            {
              date:
                "2026-07-20",
              value: 102,
              benchmark: 90,
            },
          ],
        },
        {
          id: "team-osa",
          title: "OSA",
          percent: 95,
          issued: 44,
          issuedLabel: "NV",
          status: "good",
          trend: [
            {
              date:
                "2026-07-19",
              value: 94.9,
              benchmark: 90,
            },
            {
              date:
                "2026-07-20",
              value: 95,
              benchmark: 90,
            },
          ],
        },
        {
          id: "qc",
          title: "QC",
          percent: 99,
          issued: 55,
          issuedLabel: "NV",
          status: "good",
          trend: [
            {
              date:
                "2026-07-19",
              value: 97.1,
              benchmark: 90,
            },
            {
              date:
                "2026-07-20",
              value: 99,
              benchmark: 90,
            },
          ],
        },
      ]);

      expect(
        result.current.data
          ?.marketKpis.find(
            (kpi) =>
              kpi.id === "osa",
          )?.percent,
      ).toBe(95);
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("uses 90 as the good/bad threshold", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: {
            ...semanticValues,
            successfulCallsMtd:
              90,
            qcMtd: 89.9,
          },
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data
          ?.teamKpis[0].status,
      ).toBe("good");
      expect(
        result.current.data
          ?.teamKpis[4].status,
      ).toBe("bad");
    });

    it("does not expose mock Overview data while KPI summary is loading", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: null,
          isLoading: true,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data,
      ).toBeNull();
      expect(
        result.current.loading,
      ).toBe(true);
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("does not expose mock Overview data when KPI summary fails", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: null,
          isLoading: false,
          error:
            "Query failed",
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data,
      ).toBeNull();
      expect(
        result.current.loading,
      ).toBe(false);
      expect(
        result.current.error,
      ).toBe(
        "Query failed",
      );
    });

    it("keeps summary values visible when trend query fails", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values:
            semanticValues,
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      mockUseKpiMtdTrendData
        .mockReturnValue({
          rows: [],
          isLoading: false,
          error:
            "Trend failed",
          refetch:
            refetchTrend,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data
          ?.teamKpis.every(
            (kpi) =>
              kpi.trend.length ===
              0,
          ),
      ).toBe(true);
      expect(
        result.current.data
          ?.teamKpis[0].percent,
      ).toBe(93);
      expect(
        result.current.error,
      ).toBeNull();
    });

    it("does not show stale trend while the selected cycle trend is loading", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values:
            semanticValues,
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      mockUseKpiMtdTrendData
        .mockReturnValue({
          rows:
            semanticTrendRows,
          isLoading: true,
          error: null,
          refetch:
            refetchTrend,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data
          ?.teamKpis.every(
            (kpi) =>
              kpi.trend.length ===
              0,
          ),
      ).toBe(true);
    });

    it("does not expose mock Overview data when KPI MTD is unavailable", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: null,
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.data,
      ).toBeNull();
      expect(
        result.current.error,
      ).toBe(
        "Không có dữ liệu KPI cho chu kỳ đã chọn",
      );
    });

    it("keeps non-MTD periods on their existing static path", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: null,
          isLoading: false,
          error:
            "Query failed",
          refetch:
            refetchSummary,
        });

      mockUseKpiMtdTrendData
        .mockReturnValue({
          rows: [],
          isLoading: false,
          error:
            "Trend failed",
          refetch:
            refetchTrend,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "today",
              cycleKey: null,
            }),
        );

      expect(
        result.current.data,
      ).not.toBeNull();
      expect(
        result.current.error,
      ).toBeNull();
    });
    it("keeps available KPI values when individual summary cells are BLANK", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: {
            ...semanticValues,
            visitMtd: null,
            osaIssued: null,
          },
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.error,
      ).toBeNull();

      expect(
        result.current.data,
      ).not.toBeNull();

      expect(
        result.current.data
          ?.teamKpis[0].percent,
      ).toBe(93);

      expect(
        result.current.data
          ?.teamKpis[1],
      ).toMatchObject({
        percent: null,
        issued: 22,
        status: "neutral",
      });

      expect(
        result.current.data
          ?.teamKpis[3],
      ).toMatchObject({
        percent: 95,
        issued: null,
        status: "good",
      });

      expect(
        result.current.data
          ?.teamKpis[4].percent,
      ).toBe(99);
    });

    it("keeps a complete KPI table when all ten summary cells are BLANK", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values: {
            successfulCallsMtd: null,
            successfulCallsIssued:
              null,
            visitMtd: null,
            visitIssued: null,
            timeSpendMtd: null,
            timeSpendIssued: null,
            osaMtd: null,
            osaIssued: null,
            qcMtd: null,
            qcIssued: null,
          },
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const { result } =
        renderHook(
          () =>
            useOverviewData({
              period: "mtd",
              cycleKey: 202608,
            }),
        );

      expect(
        result.current.error,
      ).toBeNull();
      expect(
        result.current.data
          ?.teamKpis,
      ).toHaveLength(5);
      expect(
        result.current.data
          ?.teamKpis.every(
            (kpi) =>
              kpi.percent === null &&
              kpi.issued === null &&
              kpi.status ===
                "neutral",
          ),
      ).toBe(true);
      expect(
        result.current.data
          ?.marketKpis.find(
            (kpi) =>
              kpi.id === "osa",
          ),
      ).toMatchObject({
        percent: null,
        status: "neutral",
      });
    });

    it("passes the same applied filters to summary and trend hooks", () => {
      mockUseKpiMtdData
        .mockReturnValue({
          values:
            semanticValues,
          isLoading: false,
          error: null,
          refetch:
            refetchSummary,
        });

      const filters = {
        region: "number:1",
        amm: "string:001",
        supervisor: "string:S01",
      } as const;

      renderHook(
        () =>
          useOverviewData({
            period: "mtd",
            cycleKey: 202608,
            filters,
          }),
      );

      expect(
        mockUseKpiMtdData,
      ).toHaveBeenCalledWith(
        202608,
        filters,
      );

      expect(
        mockUseKpiMtdTrendData,
      ).toHaveBeenCalledWith(
        202608,
        filters,
      );
    });
  },
);

