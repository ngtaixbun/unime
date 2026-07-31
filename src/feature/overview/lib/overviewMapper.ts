import { OVERVIEW_MOCK_DATA_BY_PERIOD } from "../data/overview-period.data";
import type { ReportPeriod } from "@/lib/report-period";
import type { OverviewData } from "../types";

export interface OverviewQueryResponse {
  data: OverviewData;
}

export function mapOverviewResponse(response: OverviewQueryResponse): OverviewData {
  return response.data;
}

export function getOverviewDataByPeriod(
  period: ReportPeriod,
): OverviewData {
  // TODO: Apply filters to the real DAX query once the Overview semantic model
  // query schema and filter parameters are confirmed.
  return OVERVIEW_MOCK_DATA_BY_PERIOD[period];
}

export function mapMockOverviewData(period?: ReportPeriod): OverviewData {
  return getOverviewDataByPeriod(period ?? "mtd");
}
