/**
 * DAX API client — calls the backend proxy instead of using the Fabric SDK.
 *
 * Activated when `VITE_USE_BACKEND=true` in .env.
 * The backend POSTs to Power BI REST `executeQueries` using a Service Principal token,
 * bypassing the Fabric portal iframe limitation.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export interface DaxResult {
    columns: string[];
    rows: Record<string, unknown>[];
}

interface ApiResponse {
    success: boolean;
    data?: DaxResult;
    error?: { code: string; message: string };
}

interface BatchApiResponse {
    success: boolean;
    data?: Record<string, DaxResult>;
    error?: { code: string; message: string };
}

/**
 * Execute a SINGLE DAX query via the backend proxy.
 *
 * @param dax    The DAX query string (e.g., `EVALUATE ROW(...)`)
 * @param signal AbortSignal for cancellation
 * @returns Normalized result with clean column names (no table prefix)
 * @throws   `{ status, code, message }` on failure
 */
export async function executeDax(
    dax: string,
    opts?: { signal?: AbortSignal },
): Promise<DaxResult> {
    const res = await fetch(`${API_BASE}/dax/query`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ dax }),
        signal: opts?.signal,
    });

    const json: ApiResponse = await res.json();

    if (!res.ok || !json.success || !json.data) {
        const msg = json.error?.message || `HTTP ${res.status} ${res.statusText}`;
        throw { status: res.status, code: json.error?.code, message: msg };
    }

    return json.data;
}

/**
 * Execute MULTIPLE DAX queries in a single roundtrip.
 *
 * Reduces 8 HTTP calls (typical Nationwide page) to 1 — saves ~500ms+
 * per page load by eliminating N-1 roundtrips and reusing one
 * Azure AD token across all queries.
 *
 * @param queries Array of { name, dax } pairs. `name` is used as result key.
 * @param signal  AbortSignal for cancellation
 * @returns Map of name → DaxResult. Missing names mean that query failed.
 */
export async function executeDaxBatch(
    queries: Array<{ name: string; dax: string }>,
    opts?: { signal?: AbortSignal },
): Promise<Record<string, DaxResult>> {
    const res = await fetch(`${API_BASE}/dax/batch`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ queries }),
        signal: opts?.signal,
    });

    const json: BatchApiResponse = await res.json();

    if (!res.ok || !json.success || !json.data) {
        const msg = json.error?.message || `HTTP ${res.status} ${res.statusText}`;
        throw { status: res.status, code: json.error?.code, message: msg };
    }

    return json.data;
}
