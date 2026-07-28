import type {
  CachedQueryResult,
} from "@microsoft/fabric-app-data";

import type {
  EncodedDimensionValue,
} from "@/queries/org-filter";

export type BackendSemanticQueryId =
  | "overview-kpi-summary"
  | "overview-kpi-trend";

export interface BackendSemanticQueryParams {
  cycleKey: string | number;
  region: EncodedDimensionValue;
  amm: EncodedDimensionValue;
  supervisor: EncodedDimensionValue;
}

export interface BackendSemanticQueryRequest {
  queryId: BackendSemanticQueryId;
  params: BackendSemanticQueryParams;
}

interface BackendApiResponse {
  success: boolean;

  data?: {
    columns?: string[];
    rows?: Array<
      Record<string, unknown>
    >;
  };

  error?: {
    code?: string;
    message?: string;
  };
}

const expectedColumnsByQuery = {
  "overview-kpi-summary": [
    "successfulCallsMtd",
    "successfulCallsIssued",
    "visitMtd",
    "visitIssued",
    "timeSpendMtd",
    "timeSpendIssued",
    "osaMtd",
    "osaIssued",
    "qcMtd",
    "qcIssued",
  ],

  "overview-kpi-trend": [
    "Date",
    "successfulCallsMtd",
    "visitMtd",
    "timeSpendMtd",
    "osaMtd",
    "qcMtd",
    "benchmark",
  ],
} as const satisfies Record<
  BackendSemanticQueryId,
  readonly string[]
>;

function getApiBaseUrl(): string {
  const value =
    import.meta.env
      .VITE_API_BASE_URL
      ?.trim();

  if (!value) {
    throw new Error(
      "Thiếu VITE_API_BASE_URL.",
    );
  }

  return value.replace(
    /\/+$/,
    "",
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function executeBackendSemanticModelQuery(
  request: BackendSemanticQueryRequest,
): Promise<CachedQueryResult> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/dax/query`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        request,
      ),
    },
  );

  let payload:
    BackendApiResponse;

  try {
    payload =
      await response.json() as
        BackendApiResponse;
  } catch {
    throw new Error(
      `Backend trả response không hợp lệ (${response.status}).`,
    );
  }

  if (
    !response.ok ||
    !payload.success
  ) {
    throw new Error(
      payload.error?.message ??
        `Backend query thất bại (${response.status}).`,
    );
  }

  const sourceRows =
    payload.data?.rows;

  if (!Array.isArray(sourceRows)) {
    throw new Error(
      "Backend không trả danh sách rows hợp lệ.",
    );
  }

  const expectedColumns =
    expectedColumnsByQuery[
      request.queryId
    ];

  const rows =
    sourceRows.map(
      (sourceRow) => {
        if (!isRecord(sourceRow)) {
          throw new Error(
            "Backend trả row không hợp lệ.",
          );
        }

        for (
          const columnName of
          expectedColumns
        ) {
          if (
            !Object.prototype
              .hasOwnProperty.call(
                sourceRow,
                columnName,
              )
          ) {
            throw new Error(
              `Backend thiếu cột ${columnName}.`,
            );
          }
        }

        return expectedColumns.map(
          (columnName) =>
            sourceRow[columnName],
        );
      },
    );

  return {
    status: "success",

    table: {
      columns:
        expectedColumns.map(
          (columnName) => ({
            name:
              `[${columnName}]`,
          }),
        ),

      rows,
    },

    fromCache: false,
    cachedAt: undefined,
  } as CachedQueryResult;
}