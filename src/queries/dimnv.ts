import type { ColumnMetadataMap } from "@/lib/to-data-table";
import dimNvDax from "./dimnv.dax?raw";

const connection = "unimeModel";

export type DimNvRow = {
  employeeId: string | number;
  employeeLabel: string;
  supervisorId: string | number;
  ammId: string | number;
  regionId: string | number;
};

export const dimNvQuery =
  dimNvDax.trim();

export const dimNvColumnMetadata:
  ColumnMetadataMap = {
    "[employeeId]": {
      name: "employeeId",
      displayName: "Mã nhân viên",
    },
    "[employeeLabel]": {
      name: "employeeLabel",
      displayName: "Nhân viên",
    },
    "[supervisorId]": {
      name: "supervisorId",
      displayName: "Supervisor ID",
    },
    "[ammId]": {
      name: "ammId",
      displayName: "AMM ID",
    },
    "[regionId]": {
      name: "regionId",
      displayName: "Mã khu vực",
    },
  };

export const columnMetadata =
  dimNvColumnMetadata;

export function dimNv() {
  return {
    connection,
    query: dimNvQuery,
    columnMetadata:
      dimNvColumnMetadata,
  };
}
