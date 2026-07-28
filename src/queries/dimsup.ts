import type {
  ColumnMetadataMap,
} from "@/lib/to-data-table";
import dimSupDax from "./dimsup.dax?raw";
import {
  buildTreatasFilter,
  type EncodedDimensionValue,
} from "./org-filter";

const connection = "unimeModel";

export type DimSupRow = {
  supervisorId: string | number;
  supervisorLabel: string;
  ammId: string | number;
  regionId: string | number;
};

export interface DimSupQueryParams {
  region?: EncodedDimensionValue;
  amm?: EncodedDimensionValue;
}

export const dimSupQuery =
  dimSupDax.trim();

export const dimSupColumnMetadata:
  ColumnMetadataMap = {
    "[supervisorId]": {
      name: "supervisorId",
      displayName: "Supervisor ID",
    },
    "[supervisorLabel]": {
      name: "supervisorLabel",
      displayName: "Supervisor",
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
  dimSupColumnMetadata;

export function dimSup({
  region = "all",
  amm = "all",
}: DimSupQueryParams = {}) {
  for (const placeholder of [
    "__REGION_FILTER__",
    "__AMM_FILTER__",
  ]) {
    if (
      !dimSupQuery.includes(
        placeholder,
      )
    ) {
      throw new Error(
        `Template dimSup thiếu ${placeholder}.`,
      );
    }
  }

  const query = dimSupQuery
    .replace(
      "__REGION_FILTER__",
      buildTreatasFilter(
        region,
        "'dimnv'[Region ID]",
      ),
    )
    .replace(
      "__AMM_FILTER__",
      buildTreatasFilter(
        amm,
        "'dimnv'[amm_id]",
      ),
    );

  return {
    connection,
    query,
    columnMetadata:
      dimSupColumnMetadata,
  };
}
