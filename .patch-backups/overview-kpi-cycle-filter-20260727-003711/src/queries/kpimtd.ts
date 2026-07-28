import type { ColumnMetadataMap } from "@/lib/to-data-table";
import kpiMtdDax from "./kpimtd.dax?raw";

const connection = "unimeModel";

export type KpiMtdRow = {
  successfulCallsMtd: number | null;
  successfulCallsIssued: number | null;
  visitMtd: number | null;
  visitIssued: number | null;
  timeSpendMtd: number | null;
  timeSpendIssued: number | null;
  osaMtd: number | null;
  osaIssued: number | null;
  qcMtd: number | null;
  qcIssued: number | null;
};

export const kpiMtdQuery = kpiMtdDax.trim();

export const columnMetadata: ColumnMetadataMap = {
  "[successfulCallsMtd]": {
    name: "successfulCallsMtd",
    displayName: "Successful Calls MTD",
  },
  "[successfulCallsIssued]": {
    name: "successfulCallsIssued",
    displayName: "NV rớt Successful Calls",
  },
  "[visitMtd]": {
    name: "visitMtd",
    displayName: "Tần suất viếng thăm MTD",
  },
  "[visitIssued]": {
    name: "visitIssued",
    displayName: "NV rớt Tần suất viếng thăm",
  },
  "[timeSpendMtd]": {
    name: "timeSpendMtd",
    displayName: "Time Spend MTD",
  },
  "[timeSpendIssued]": {
    name: "timeSpendIssued",
    displayName: "NV rớt Time Spend",
  },
  "[osaMtd]": {
    name: "osaMtd",
    displayName: "OSA MTD",
  },
  "[osaIssued]": {
    name: "osaIssued",
    displayName: "NV rớt OSA",
  },
  "[qcMtd]": {
    name: "qcMtd",
    displayName: "QC MTD",
  },
  "[qcIssued]": {
    name: "qcIssued",
    displayName: "NV rớt QC",
  },
};

export function kpiMtd() {
  return {
    connection,
    query: kpiMtdQuery,
    columnMetadata,
  };
}