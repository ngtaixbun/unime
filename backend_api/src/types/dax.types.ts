/**
 * Request body cho POST /api/dax/query
 */
export interface ExecuteDaxRequest {
    /** DAX query string — phải bắt đầu bằng EVALUATE. */
    dax: string;
}

/**
 * Normalized DAX result returned trong response envelope.
 */
export interface DaxResultData {
    columns: string[];
    rows: Record<string, unknown>[];
}

/**
 * Success response — POST /api/dax/query
 */
export interface ExecuteDaxResponse {
    success: true;
    data: DaxResultData;
    meta: { rowCount: number };
}

/**
 * Error response — POST /api/dax/query
 */
export interface ExecuteDaxErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
    };
}
