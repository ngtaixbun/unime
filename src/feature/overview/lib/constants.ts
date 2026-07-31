import type {
  NavigationItem,
} from "../types";
import type { ReportPeriod } from "@/lib/report-period";

export const OVERVIEW_PERIODS:
  ReportPeriod[] = [
    "today",
    "7days",
    "mtd",
  ];

export const NAVIGATION_ITEMS:
  NavigationItem[] = [
    {
      id: "overview",
      label: "Tổng quan",
    },
    {
      id: "market",
      label: "Thị trường",
    },
    {
      id: "team",
      label: "Đội ngũ",
    },
    {
      id: "profile",
      label: "Hồ sơ",
    },
    {
      id: "userguide",
      label: "Hướng dẫn",
    },
  ];

// OVERVIEW_PERIOD_AVAILABILITY_START

/**
 * Feature flag tạm thời cho các mode Overview.
 *
 * Nội dung và data của Today/7 Days vẫn được giữ nguyên.
 * Chỉ chặn việc chuyển mode tại UI.
 */
export const OVERVIEW_PERIOD_AVAILABILITY:
  Record<ReportPeriod, boolean> = {
    today: false,
    "7days": false,
    mtd: true,
  };

export const OVERVIEW_PERIOD_UNAVAILABLE_MESSAGE =
  "Chức năng này chưa được triển khai";

export function isOverviewPeriodEnabled(
  period: ReportPeriod,
): boolean {
  return OVERVIEW_PERIOD_AVAILABILITY[
    period
  ];
}

// OVERVIEW_PERIOD_AVAILABILITY_END
