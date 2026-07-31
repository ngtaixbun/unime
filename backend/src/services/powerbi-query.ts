import axios from "axios";

import {
  acquirePowerBiAccessToken,
  PowerBiAuthenticationError,
} from "../auth/powerbi-token.js";

import { env } from "../config/env.js";

interface PowerBiErrorPayload {
  code?: string;
  message?: string;
}

interface PowerBiTablePayload {
  rows?: Array<
    Record<string, unknown>
  >;

  error?: PowerBiErrorPayload;
}

interface PowerBiResultPayload {
  tables?: PowerBiTablePayload[];
  error?: PowerBiErrorPayload;
}

interface PowerBiExecuteResponse {
  results?: PowerBiResultPayload[];
  error?: PowerBiErrorPayload;
}

export interface PowerBiQueryResult {
  columns: string[];

  rows: Array<
    Record<string, unknown>
  >;
}

export interface PowerBiTabularQueryResult {
  columns: string[];

  rows: unknown[][];
}

export class PowerBiServiceError
  extends Error {
  public constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PowerBiServiceError";
  }
}

export function assertPowerBiQueryResultColumns(
  result:
    PowerBiQueryResult,
  expectedColumns:
    readonly string[],
): void {
  const availableColumns =
    new Set(
      result.columns,
    );

  const missingColumn =
    expectedColumns.find(
      (columnName) =>
        !availableColumns.has(
          columnName,
        ),
    );

  if (missingColumn) {
    throw new PowerBiServiceError(
      `Power BI thiếu cột ${missingColumn}.`,
      502,
      "POWERBI_SCHEMA_MISMATCH",
    );
  }
}

function cleanColumnName(
  rawName: string,
): string {
  const match =
    rawName.match(
      /\[([^\]]+)\]$/,
    );

  return match?.[1] ?? rawName;
}

function normalizeRows(
  rows: Array<
    Record<string, unknown>
  >,
): PowerBiQueryResult {
  const normalizedRows =
    rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(
          ([key, value]) => [
            cleanColumnName(key),
            value,
          ],
        ),
      ),
    );

  const columns =
    Array.from(
      new Set(
        normalizedRows.flatMap(
          (row) =>
            Object.keys(row),
        ),
      ),
    );

  return {
    columns,
    rows: normalizedRows,
  };
}

export function toPowerBiTabularQueryResult(
  rows: Array<
    Record<string, unknown>
  >,
  expectedColumns: readonly string[],
): PowerBiTabularQueryResult {
  const tabularRows =
    rows.map(
      (row, rowIndex) =>
        expectedColumns.map(
          (columnName) => {
            if (
              !Object.prototype
                .hasOwnProperty.call(
                  row,
                  columnName,
                )
            ) {
              throw new PowerBiServiceError(
                `Power BI thiếu cột ${columnName} tại dòng ${rowIndex}.`,
                502,
                "POWERBI_SCHEMA_MISMATCH",
              );
            }

            return row[columnName];
          },
        ),
    );

  return {
    columns: [
      ...expectedColumns,
    ],
    rows: tabularRows,
  };
}

function extractResponseError(
  payload: PowerBiExecuteResponse,
): PowerBiErrorPayload | null {
  if (payload.error) {
    return payload.error;
  }

  const result =
    payload.results?.[0];

  if (result?.error) {
    return result.error;
  }

  const table =
    result?.tables?.[0];

  if (table?.error) {
    return table.error;
  }

  return null;
}

function extractAxiosMessage(
  data: unknown,
): string | null {
  if (
    typeof data !== "object" ||
    data === null
  ) {
    return null;
  }

  const candidate =
    data as {
      error?: {
        message?: unknown;
      };
    };

  return typeof
    candidate.error?.message ===
    "string"
      ? candidate.error.message
      : null;
}

async function executePowerBiDaxRows(
  dax: string,
): Promise<Array<
  Record<string, unknown>
>> {
  if (dax.trim() === "") {
    throw new PowerBiServiceError(
      "DAX query đang trống.",
      400,
      "EMPTY_DAX_QUERY",
    );
  }

  let accessToken: string;

  try {
    accessToken =
      await acquirePowerBiAccessToken();
  } catch (error: unknown) {
    if (
      error instanceof
      PowerBiAuthenticationError
    ) {
      throw new PowerBiServiceError(
        error.message,
        502,
        "POWERBI_AUTH_FAILED",
        error,
      );
    }

    throw error;
  }

  const endpoint =
    "https://api.powerbi.com/v1.0/myorg" +
    `/groups/${env.POWERBI_WORKSPACE_ID}` +
    `/datasets/${env.POWERBI_DATASET_ID}` +
    "/executeQueries";

  try {
    const response =
      await axios.post<
        PowerBiExecuteResponse
      >(
        endpoint,
        {
          queries: [
            {
              query: dax,
            },
          ],

          serializerSettings: {
            includeNulls: true,
          },
        },
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",
          },

          timeout:
            env.POWERBI_REQUEST_TIMEOUT_MS,
        },
      );

    const responseError =
      extractResponseError(
        response.data,
      );

    if (responseError) {
      throw new PowerBiServiceError(
        responseError.message ??
          "Power BI query failed.",
        502,
        responseError.code ??
          "POWERBI_QUERY_FAILED",
      );
    }

    const rows =
      response.data
        .results?.[0]
        ?.tables?.[0]
        ?.rows ?? [];

    return rows;
  } catch (error: unknown) {
    if (
      error instanceof
      PowerBiServiceError
    ) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const upstreamStatus =
        error.response?.status;

      const upstreamMessage =
        extractAxiosMessage(
          error.response?.data,
        ) ??
        error.message ??
        "Power BI request failed.";

      if (
        error.code === "ECONNABORTED"
      ) {
        throw new PowerBiServiceError(
          "Power BI query vượt thời gian chờ.",
          504,
          "POWERBI_TIMEOUT",
          error,
        );
      }

      if (upstreamStatus === 400) {
        throw new PowerBiServiceError(
          upstreamMessage,
          400,
          "POWERBI_INVALID_QUERY",
          error,
        );
      }

      if (upstreamStatus === 401) {
        throw new PowerBiServiceError(
          "Power BI từ chối access token.",
          502,
          "POWERBI_AUTH_FAILED",
          error,
        );
      }

      if (upstreamStatus === 403) {
        throw new PowerBiServiceError(
          "Service Principal chưa có quyền truy cập workspace hoặc Semantic Model.",
          502,
          "POWERBI_ACCESS_DENIED",
          error,
        );
      }

      if (upstreamStatus === 429) {
        throw new PowerBiServiceError(
          "Power BI đang giới hạn tần suất request.",
          503,
          "POWERBI_RATE_LIMITED",
          error,
        );
      }

      throw new PowerBiServiceError(
        upstreamMessage,
        502,
        "POWERBI_UPSTREAM_ERROR",
        error,
      );
    }

    throw new PowerBiServiceError(
      error instanceof Error
        ? error.message
        : "Lỗi không xác định khi query Power BI.",
      500,
      "POWERBI_INTERNAL_ERROR",
      error,
    );
  }
}

export async function executePowerBiDax(
  dax: string,
): Promise<PowerBiQueryResult> {
  const rows =
    await executePowerBiDaxRows(
      dax,
    );

  return normalizeRows(rows);
}

export async function executePowerBiDaxTabular(
  dax: string,
  expectedColumns:
    readonly string[],
): Promise<PowerBiTabularQueryResult> {
  const rows =
    await executePowerBiDaxRows(
      dax,
    );

  return toPowerBiTabularQueryResult(
    rows,
    expectedColumns,
  );
}
