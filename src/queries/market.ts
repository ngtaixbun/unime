import type {
  ColumnMetadataMap,
} from "@/lib/to-data-table";
import type {
  DimDateCycleValue,
} from "./dim-date";
import type {
  OrgQueryFilters,
} from "./org-filter";
import {
  buildMarketQuery,
  marketQueryTemplate,
} from "./market-query-builder";

const connection = "unimeModel";

export interface MarketRow {
  coverage_emp: number | null;
  plan_emp: number | null;
  coverage_shop: number | null;
  plan_shop: number | null;
  plan_call: number | null;
  coverage_call: number | null;
  coverage_call_perc: number | null;
  coverage_gap_call: number | null;
  coverage_dibu_shop: number | null;
  coverage_dibu_emp: number | null;
  coverage_dibu_call: number | null;
  coverage_actual_call: number | null;
  coverage_actual_shop: number | null;
  coverage_actual_emp: number | null;
  coverage_shop_perc: number | null;
  coverage_emp_perc: number | null;
  coverage_gap_emp: number | null;
  coverage_gap_shop: number | null;
  discipline_time: number | null;
  discipline_failtime: number | null;
  discipline_citre_perc: number | null;
  discipline_cosom_perc: number | null;
  coverage_shop_vs_D1: number | null;
  coverage_emp_vs_D1: number | null;
  KQCH_TC: number | null;
  KQCH_KTC: number | null;
  KQCH_dongcua: number | null;
  update_time: string | null;
}

export interface MarketQueryParams {
  cycleKey: DimDateCycleValue;
  anchorDate?: string;
  dateScope?: MarketDateScope;
  filters?: OrgQueryFilters;
}

export type MarketDateScope =
  | "single-day"
  | "cycle-to-date";

export const marketQuery =
  marketQueryTemplate;

export const marketColumnMetadata:
  ColumnMetadataMap = {
    "[coverage_emp]": {
      name: "coverage_emp",
      displayName: "Nhân viên ra đường",
      format: "#,##0",
    },
    "[plan_emp]": {
      name: "plan_emp",
      displayName: "Kế hoạch nhân viên",
      format: "#,##0",
    },
    "[coverage_shop]": {
      name: "coverage_shop",
      displayName: "Cửa hàng có độ phủ",
      format: "#,##0",
    },
    "[plan_shop]": {
      name: "plan_shop",
      displayName: "Kế hoạch cửa hàng",
      format: "#,##0",
    },
    "[plan_call]": {
      name: "plan_call",
      displayName: "Kế hoạch Beat",
      format: "#,##0",
    },
    "[coverage_call]": {
      name: "coverage_call",
      displayName: "Thực tế Beat",
      format: "#,##0",
    },
    "[coverage_call_perc]": {
      name: "coverage_call_perc",
      displayName: "Tỷ lệ Beatplan",
      format: "0.0%",
    },
    "[coverage_gap_call]": {
      name: "coverage_gap_call",
      displayName: "Beat còn thiếu",
      format: "#,##0",
    },
    "[coverage_dibu_shop]": {
      name: "coverage_dibu_shop",
      displayName: "Cửa hàng đi bù lịch",
      format: "#,##0",
    },
    "[coverage_dibu_emp]": {
      name: "coverage_dibu_emp",
      displayName: "Nhân viên đi bù lịch",
      format: "#,##0",
    },
    "[coverage_dibu_call]": {
      name: "coverage_dibu_call",
      displayName: "Beat đi bù lịch",
      format: "#,##0",
    },
    "[coverage_actual_call]": {
      name: "coverage_actual_call",
      displayName: "Beat đi theo plan",
      format: "#,##0",
    },
    "[coverage_actual_shop]": {
      name: "coverage_actual_shop",
      displayName: "Cửa hàng đi theo plan",
      format: "#,##0",
    },
    "[coverage_actual_emp]": {
      name: "coverage_actual_emp",
      displayName: "Nhân viên đi theo plan",
      format: "#,##0",
    },
    "[coverage_shop_perc]": {
      name: "coverage_shop_perc",
      displayName: "Tỷ lệ độ phủ cửa hàng",
      format: "0.0%",
    },
    "[coverage_emp_perc]": {
      name: "coverage_emp_perc",
      displayName: "Tỷ lệ nhân viên ra đường",
      format: "0.0%",
    },
    "[coverage_gap_emp]": {
      name: "coverage_gap_emp",
      displayName: "Nhân viên còn thiếu",
      format: "#,##0",
    },
    "[coverage_gap_shop]": {
      name: "coverage_gap_shop",
      displayName: "Cửa hàng còn thiếu",
      format: "#,##0",
    },
    "[discipline_time]": {
      name: "discipline_time",
      displayName: "Timespend trung bình",
      format: "0.0",
    },
    "[discipline_failtime]": {
      name: "discipline_failtime",
      displayName: "Tỷ lệ Issued",
      format: "0.0%",
    },
    "[discipline_citre_perc]": {
      name: "discipline_citre_perc",
      displayName: "Tỷ lệ CI trễ",
      format: "0.0%",
    },
    "[discipline_cosom_perc]": {
      name: "discipline_cosom_perc",
      displayName: "Tỷ lệ CO sớm",
      format: "0.0%",
    },
    "[coverage_shop_vs_D1]": {
      name: "coverage_shop_vs_D1",
      displayName: "Độ phủ cửa hàng so với D-1",
      format: "0.0%",
    },
    "[coverage_emp_vs_D1]": {
      name: "coverage_emp_vs_D1",
      displayName: "Nhân viên ra đường so với D-1",
      format: "0.0%",
    },
    "[KQCH_TC]": {
      name: "KQCH_TC",
      displayName: "Cửa hàng thành công",
      format: "#,##0",
    },
    "[KQCH_KTC]": {
      name: "KQCH_KTC",
      displayName: "Cửa hàng không thành công",
      format: "#,##0",
    },
    "[KQCH_dongcua]": {
      name: "KQCH_dongcua",
      displayName: "Cửa hàng đóng cửa",
      format: "#,##0",
    },
    "[update_time]": {
      name: "update_time",
      displayName: "Thời gian cập nhật",
    },
  };

export function market({
  cycleKey,
  anchorDate,
  dateScope = "single-day",
  filters = {},
}: MarketQueryParams) {
  return {
    connection,
    query: buildMarketQuery({
      mode: {
        kind: "summary",
        dateScope,
      },
      cycleKey,
      anchorDate,
      filters,
      queryName: "market",
    }),
    columnMetadata:
      marketColumnMetadata,
  };
}
