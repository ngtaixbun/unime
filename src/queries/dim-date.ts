import type { ColumnMetadataMap } from "@/lib/to-data-table";
import dimDateDax from "./dimdate.dax?raw";

const connection = "unimeModel";

export type DimDateCycleValue =
  string | number;

export type DimDateValue =
  string | Date;

export type DimDateRow = {
  cycleKey: DimDateCycleValue;
  cycleLabel: string;
  cycleStartDate: DimDateValue;
  cycleEndDate: DimDateValue;
  cycleSort: DimDateCycleValue;
  isLatestCycle: boolean;
};

export const dimDateQuery = dimDateDax.trim();

export const dimDateColumnMetadata: ColumnMetadataMap = {
  "[cycleKey]": {
    name: "cycleKey",
    displayName: "Khóa chu kỳ KPI",
  },

  "[cycleLabel]": {
    name: "cycleLabel",
    displayName: "Chu kỳ KPI",
  },

  "[cycleStartDate]": {
    name: "cycleStartDate",
    displayName: "Ngày bắt đầu chu kỳ",
  },

  "[cycleEndDate]": {
    name: "cycleEndDate",
    displayName: "Ngày kết thúc chu kỳ",
  },

  "[cycleSort]": {
    name: "cycleSort",
    displayName: "Thứ tự chu kỳ",
  },

  "[isLatestCycle]": {
    name: "isLatestCycle",
    displayName: "Chu kỳ mới nhất",
  },
};

export function dimDate() {
  return {
    connection,
    query: dimDateQuery,
    columnMetadata: dimDateColumnMetadata,
  };
}
