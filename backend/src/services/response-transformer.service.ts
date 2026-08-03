import type { DaxQueryResult } from "../types/dax.js";

export interface DaxQuerySingleResponseData extends DaxQueryResult {
  readonly rowCount: number;
}

export interface ResponseTransformer {
  transformSingle(result: DaxQueryResult): DaxQuerySingleResponseData;
  transformBatch(
    result: Record<string, DaxQueryResult>,
  ): Record<string, DaxQueryResult>;
}

export class DaxResponseTransformer implements ResponseTransformer {
  public transformSingle(result: DaxQueryResult): DaxQuerySingleResponseData {
    return {
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rows.length,
    };
  }

  public transformBatch(
    result: Record<string, DaxQueryResult>,
  ): Record<string, DaxQueryResult> {
    return result;
  }
}