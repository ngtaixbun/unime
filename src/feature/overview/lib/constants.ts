import type {
  NavigationItem,
  OverviewFilters,
  OverviewPeriod,
} from "../types";

export const OVERVIEW_PERIODS:
  OverviewPeriod[] = [
    "today",
    "seven-days",
    "mtd",
  ];

export const DEFAULT_OVERVIEW_FILTERS:
  OverviewFilters = {
    region: "all",
    amm: "all",
    supervisor: "all",
  };

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
  Record<OverviewPeriod, boolean> = {
    today: false,
    "seven-days": false,
    mtd: true,
  };

export const OVERVIEW_PERIOD_UNAVAILABLE_MESSAGE =
  "Chức năng này chưa được triển khai";

export function isOverviewPeriodEnabled(
  period: OverviewPeriod,
): boolean {
  return OVERVIEW_PERIOD_AVAILABILITY[
    period
  ];
}

// OVERVIEW_PERIOD_AVAILABILITY_END
