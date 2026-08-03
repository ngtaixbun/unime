import { GatewayError, type DaxQueryResult } from "../types/dax.js";

export type PowerBiRow = Record<string, unknown>;

export function normalizeColumnName(rawName: string): string {
  if (!rawName.includes("[") && !rawName.includes("]")) return rawName;
  const open = rawName.indexOf("[");
  const close = rawName.lastIndexOf("]");
  const alias = rawName.slice(open + 1, close);
  if (
    open < 0 ||
    close !== rawName.length - 1 ||
    alias === "" ||
    alias.includes("[") ||
    alias.includes("]") ||
    rawName.slice(0, open).includes("]")
  ) {
    throw new GatewayError(
      "POWERBI_SCHEMA_MISMATCH",
      "Power BI returned an invalid column name.",
      502,
    );
  }
  return alias;
}

export function normalizePowerBiResult(
  rows: readonly PowerBiRow[],
  expectedColumns: readonly string[] = [],
): DaxQueryResult {
  if (rows.length === 0) {
    return { columns: [...expectedColumns], rows: [] };
  }

  const rawByAlias = new Map<string, string>();
  const normalizedRows = rows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [rawName, value] of Object.entries(row)) {
      const alias = normalizeColumnName(rawName);
      const previous = rawByAlias.get(alias);
      if ((previous !== undefined && previous !== rawName) ||
          Object.prototype.hasOwnProperty.call(normalized, alias)) {
        throw new GatewayError(
          "POWERBI_SCHEMA_MISMATCH",
          "Power BI returned colliding normalized columns.",
          502,
        );
      }
      rawByAlias.set(alias, rawName);
      normalized[alias] = value;
    }
    return normalized;
  });

  const discoveredColumns = [...rawByAlias.keys()];
  const columns = expectedColumns.length > 0 ? [...expectedColumns] : discoveredColumns;
  if (expectedColumns.length > 0) {
    const expected = new Set(expectedColumns);
    const actual = new Set(discoveredColumns);
    if (expected.size !== actual.size ||
        expectedColumns.some((column) => !actual.has(column))) {
      throw new GatewayError(
        "POWERBI_SCHEMA_MISMATCH",
        "Power BI columns do not match the expected contract.",
        502,
      );
    }
    for (const row of normalizedRows) {
      const rowColumns = Object.keys(row);
      if (rowColumns.length !== expected.size || rowColumns.some((column) => !expected.has(column))) {
        throw new GatewayError(
          "POWERBI_SCHEMA_MISMATCH",
          "A Power BI row does not match the expected contract.",
          502,
        );
      }
    }
  }

  return {
    columns,
    rows: normalizedRows.map((row) =>
      Object.fromEntries(columns.map((column) => [column, row[column]]))),
  };
}
