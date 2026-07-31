import type {
  ColumnMetadataMap,
} from "@/lib/to-data-table";

import dimKpiDax from "./dim-kpi.dax?raw";

const connection = "unimeModel";

export interface DimKpiRow {
  kpiname: string;
  kpi_id: number;
}

export const dimKpiQuery =
  dimKpiDax.trim();

export const dimKpiColumnMetadata:
  ColumnMetadataMap = {
    "[kpiname]": {
      name: "kpiname",
      displayName: "KPI",
    },

    "[kpi_id]": {
      name: "kpi_id",
      displayName: "KPI ID",
    },
  };

export function dimKpi() {
  return {
    connection,
    query: dimKpiQuery,
    columnMetadata:
      dimKpiColumnMetadata,
  };
}
