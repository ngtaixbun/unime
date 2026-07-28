import type { ColumnMetadataMap } from "@/lib/to-data-table";
import dimRegionDax from "./dim-region.dax?raw";

const connection = "unimeModel";

export type DimRegionRow = {
  regionId: string | number;
  regionLabel: string;
};

export const dimRegionQuery =
  dimRegionDax.trim();

export const dimRegionColumnMetadata:
  ColumnMetadataMap = {
    "[regionId]": {
      name: "regionId",
      displayName: "Mã khu vực",
    },
    "[regionLabel]": {
      name: "regionLabel",
      displayName: "Khu vực",
    },
  };

/**
 * Compatibility alias for direct imports that previously used
 * `columnMetadata`.
 */
export const columnMetadata =
  dimRegionColumnMetadata;

export function dimRegion() {
  return {
    connection,
    query: dimRegionQuery,
    columnMetadata:
      dimRegionColumnMetadata,
  };
}
