import type {
  CachedQueryResult,
} from "@microsoft/fabric-app-data";

import type {
  EncodedDimensionValue,
} from "@/queries/org-filter";

interface BackendKpiQueryParams {
  cycleKey: string | number;
  kpiId?: number;
  region: EncodedDimensionValue;
  amm: EncodedDimensionValue;
  supervisor: EncodedDimensionValue;
}

interface BackendTeamEmployeeKpiQueryParams {
  cycleKey: string | number;
  kpiId: number;
  region: EncodedDimensionValue;
  amm: EncodedDimensionValue;
  supervisor: EncodedDimensionValue;
}

interface BackendDimAmmQueryParams {
  region: EncodedDimensionValue;
}

interface BackendDimSupervisorQueryParams {
  region: EncodedDimensionValue;
  amm: EncodedDimensionValue;
}

interface BackendSemanticQueryParamsById {
  "overview-kpi-summary":
    BackendKpiQueryParams;

  "overview-kpi-trend":
    BackendKpiQueryParams;

  "team-employee-kpi":
    BackendTeamEmployeeKpiQueryParams;

  "dim-date":
    Record<string, never>;

  "dim-kpi":
    Record<string, never>;

  "dim-region":
    Record<string, never>;

  "dim-amm":
    BackendDimAmmQueryParams;

  "dim-supervisor":
    BackendDimSupervisorQueryParams;
}

export type BackendSemanticQueryId =
  keyof BackendSemanticQueryParamsById;

export type BackendSemanticQueryRequest = {
  [QueryId in BackendSemanticQueryId]: {
    queryId: QueryId;

    params:
      BackendSemanticQueryParamsById[
        QueryId
      ];
  };
}[BackendSemanticQueryId];

export interface GenericBackendSemanticQueryRequest {
  query: string;
  expectedColumns: readonly string[];
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

interface GenericBackendApiResponse {
  success: boolean;

  data?: {
    columns?: string[];

    rows?: unknown[][];
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
    "mtdKpiSelected",
    "gap",
    "nvFail",
    "contributionNvFail",
    "countNv",
    "contributionNv",
    "actual",
    "target",
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

  "team-employee-kpi": [
    "employeeId",
    "employeeLabel",
    "regionId",
    "ammId",
    "supervisorId",
    "actual",
    "target",
    "percentage",
  ],

  "dim-date": [
    "cycleKey",
    "cycleLabel",
    "cycleStartDate",
    "cycleEndDate",
    "cycleSort",
    "isLatestCycle",
  ],

  "dim-kpi": [
    "kpiname",
    "kpi_id",
  ],

  "dim-region": [
    "regionId",
    "regionLabel",
  ],

  "dim-amm": [
    "ammId",
    "ammLabel",
    "regionId",
  ],

  "dim-supervisor": [
    "supervisorId",
    "supervisorLabel",
    "ammId",
    "regionId",
  ],
} as const satisfies Record<
  BackendSemanticQueryId,
  readonly string[]
>;

function getApiBaseUrl(): {
  configuredBaseUrl: string;
  requestBaseUrl: string;
} {
  const value =
    import.meta.env
      .VITE_API_BASE_URL
      ?.trim();

  if (!value) {
    throw new Error(
      "Thiếu VITE_API_BASE_URL.",
    );
  }

  const configuredBaseUrl =
    value.replace(
    /\/+$/,
    "",
  );

  return {
    configuredBaseUrl,

    // Local development uses Vite's same-origin /api proxy. Production keeps
    // calling the configured backend directly and therefore still relies on
    // the backend's explicit CORS allowlist.
    requestBaseUrl:
      import.meta.env.DEV
        ? ""
        : configuredBaseUrl,
  };
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

function cleanColumnName(
  columnName: string,
): string {
  const match =
    columnName.match(
      /\[([^\]]+)\]$/,
    );

  return match?.[1] ??
    columnName;
}

function resolveSourceColumnName(
  expectedColumn: string,
  sourceColumns: readonly string[],
  sourceRows: ReadonlyArray<
    Record<string, unknown>
  >,
): string | null {
  const expectedCleanName =
    cleanColumnName(
      expectedColumn,
    );

  const candidates =
    new Set<string>([
      expectedColumn,
      expectedCleanName,
    ]);

  for (
    const sourceColumn of
    sourceColumns
  ) {
    if (
      candidates.has(
        sourceColumn,
      ) ||
      cleanColumnName(
        sourceColumn,
      ) === expectedCleanName
    ) {
      return sourceColumn;
    }
  }

  for (
    const sourceRow of
    sourceRows
  ) {
    for (
      const sourceColumn of
      Object.keys(sourceRow)
    ) {
      if (
        candidates.has(
          sourceColumn,
        ) ||
        cleanColumnName(
          sourceColumn,
        ) === expectedCleanName
      ) {
        return sourceColumn;
      }
    }
  }

  return null;
}

async function executeBackendRequest(
  path: string,
  request: unknown,
  expectedColumns: readonly string[],
): Promise<CachedQueryResult> {
  const {
    configuredBaseUrl,
    requestBaseUrl,
  } =
    getApiBaseUrl();

  let response: Response;

  try {
    response =
      await fetch(
        `${requestBaseUrl}${path}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              request,
            ),
        },
      );
  } catch (cause: unknown) {
    const requestOrigin =
      typeof window === "undefined"
        ? "unknown origin"
        : window.location.origin;

    throw new Error(
      `Không thể kết nối backend ${configuredBaseUrl} từ ${requestOrigin}. ` +
      "Kiểm tra backend đang hoạt động và CORS_ORIGINS đã cho phép origin này.",
      {
        cause,
      },
    );
  }

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

  if (
    !Array.isArray(
      sourceRows,
    )
  ) {
    throw new Error(
      "Backend không trả danh sách rows hợp lệ.",
    );
  }

  const sourceColumns =
    payload.data?.columns;

  if (
    sourceColumns !==
      undefined &&
    (
      !Array.isArray(
        sourceColumns,
      ) ||
      sourceColumns.some(
        (columnName) =>
          typeof columnName !==
            "string" ||
          columnName.trim() ===
            "",
      )
    )
  ) {
    throw new Error(
      "Backend không trả danh sách columns hợp lệ.",
    );
  }

  const records =
    sourceRows.map(
      (sourceRow) => {
        if (
          !isRecord(
            sourceRow,
          )
        ) {
          throw new Error(
            "Backend trả row không hợp lệ.",
          );
        }

        return sourceRow;
      },
    );

  const resolvedColumns =
    expectedColumns.map(
      (columnName) => ({
        expected:
          columnName,

        source:
          resolveSourceColumnName(
            columnName,
            sourceColumns ?? [],
            records,
          ),
      }),
    );

  if (
    records.length > 0
  ) {
    const missingColumn =
      resolvedColumns.find(
        (column) =>
          column.source ===
            null,
      );

    if (missingColumn) {
      throw new Error(
        `Backend thiếu cột ${missingColumn.expected}.`,
      );
    }
  }

  const rows =
    records.map(
      (sourceRow) => {
        return resolvedColumns.map(
          ({
            expected,
            source,
          }) => {
            if (
              source === null ||
              !Object.prototype
                .hasOwnProperty.call(
                  sourceRow,
                  source,
                )
            ) {
              throw new Error(
                `Backend thiếu cột ${expected}.`,
              );
            }

            return sourceRow[
              source
            ];
          },
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
              columnName,

            dataType:
              "unknown",
          }),
        ),

      rows,
    },

    requestId: "",
    fromCache: false,
    cachedAt: undefined,
  };
}

export async function executeBackendSemanticModelQuery(
  request: BackendSemanticQueryRequest,
): Promise<CachedQueryResult> {
  const expectedColumns =
    expectedColumnsByQuery[
      request.queryId
    ].map(
      (columnName) =>
        `[${columnName}]`,
    );

  return executeBackendRequest(
    "/api/dax/query",
    request,
    expectedColumns,
  );
}

export async function executeGenericBackendSemanticModelQuery(
  request:
    GenericBackendSemanticQueryRequest,
): Promise<CachedQueryResult> {
  const query =
    request.query.trim();

  if (query === "") {
    throw new Error(
      "DAX query đang trống.",
    );
  }

  const expectedColumns =
    Array.from(
      request.expectedColumns,
    );

  if (
    expectedColumns.length ===
      0 ||
    expectedColumns.some(
      (columnName) =>
        typeof columnName !==
          "string" ||
        columnName.trim() ===
          "",
    ) ||
    new Set(
      expectedColumns,
    ).size !==
      expectedColumns.length
  ) {
    throw new Error(
      "expectedColumns của DAX query không hợp lệ.",
    );
  }

  const {
    configuredBaseUrl,
    requestBaseUrl,
  } =
    getApiBaseUrl();

  let response: Response;

  try {
    response =
      await fetch(
        `${requestBaseUrl}/api/dax/execute`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              query,
              expectedColumns,
            }),
        },
      );
  } catch (cause: unknown) {
    const requestOrigin =
      typeof window === "undefined"
        ? "unknown origin"
        : window.location.origin;

    throw new Error(
      `Không thể kết nối backend ${configuredBaseUrl} từ ${requestOrigin}. ` +
      "Kiểm tra backend đang hoạt động và CORS_ORIGINS đã cho phép origin này.",
      {
        cause,
      },
    );
  }

  let payload:
    GenericBackendApiResponse;

  try {
    payload =
      await response.json() as
        GenericBackendApiResponse;
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

  const sourceColumns =
    payload.data?.columns;
  const sourceRows =
    payload.data?.rows;

  if (
    !Array.isArray(
      sourceColumns,
    ) ||
    sourceColumns.some(
      (columnName) =>
        typeof columnName !==
          "string",
    )
  ) {
    throw new Error(
      "Backend không trả danh sách columns hợp lệ.",
    );
  }

  if (
    sourceColumns.length !==
      expectedColumns.length ||
    sourceColumns.some(
      (
        columnName,
        index,
      ) =>
        columnName !==
        expectedColumns[
          index
        ],
    )
  ) {
    throw new Error(
      "Backend trả columns không khớp columnMetadata.",
    );
  }

  if (
    !Array.isArray(
      sourceRows,
    ) ||
    sourceRows.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !==
          sourceColumns.length,
    )
  ) {
    throw new Error(
      "Backend không trả danh sách rows hợp lệ.",
    );
  }

  return {
    status: "success",

    table: {
      columns:
        sourceColumns.map(
          (columnName) => ({
            name:
              columnName,

            dataType:
              "unknown",
          }),
        ),

      rows:
        sourceRows,
    },

    requestId: "",
    fromCache: false,
    cachedAt: undefined,
  };
}
