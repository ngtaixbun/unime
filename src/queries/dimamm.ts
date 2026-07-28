import type {
  ColumnMetadataMap,
} from "@/lib/to-data-table";
import dimAmmDax from "./dimamm.dax?raw";
import {
  buildTreatasFilter,
  type EncodedDimensionValue,
} from "./org-filter";

const connection = "unimeModel";

export type DimAmmRow = {
  ammId: string | number;
  ammLabel: string;
  regionId: string | number;
};

export interface DimAmmQueryParams {
  region?: EncodedDimensionValue;
}

export const dimAmmQuery =
  dimAmmDax.trim();

export const dimAmmColumnMetadata:
  ColumnMetadataMap = {
    "[ammId]": {
      name: "ammId",
      displayName: "AMM ID",
    },
    "[ammLabel]": {
      name: "ammLabel",
      displayName: "AMM",
    },
    "[regionId]": {
      name: "regionId",
      displayName: "Mã khu vực",
    },
  };

export const columnMetadata =
  dimAmmColumnMetadata;

export function dimAmm({
  region = "all",
}: DimAmmQueryParams = {}) {
  const query = dimAmmQuery.replace(
    "__REGION_FILTER__",
    buildTreatasFilter(
      region,
      "'dimnv'[Region ID]",
    ),
  );

  return {
    connection,
    query,
    columnMetadata:
      dimAmmColumnMetadata,
  };
}
