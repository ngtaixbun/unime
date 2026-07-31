import { ConfidentialClientApplication } from "@azure/msal-node";
import axios from "axios";

import { env, POWERBI_API_BASE } from "../config/env";

// ─── Internal REST response shapes ────────────────────────────────────────────

/** Row returned by Fabric REST `executeQueries` — keys include table prefix, e.g. "Data[AMM]". */
interface FabricRow {
    [rawKey: string]: unknown;
}

interface FabricTable {
    rows: FabricRow[];
}

interface FabricQueryResult {
    tables?: FabricTable[];
    error?: {
        message: string;
        code: string;
    };
}

interface FabricExecuteResponse {
    results?: FabricQueryResult[];
    error?: { message: string };
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DaxResult {
    /** Column names without table prefix (e.g. "AMM" not "Data[AMM]"). */
    columns: string[];
    /** Rows with clean keys. */
    rows: Record<string, unknown>[];
}

/**
 * Batch DAX execution result — keyed by query name (e.g. "kpi", "byRegion").
 */
export interface DaxBatchResult {
    [key: string]: DaxResult;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip table prefix AND surrounding brackets from a raw Fabric column key.
 *
 *   "Data[AMM]"            → "AMM"
 *   "[Successfull Calls]"  → "Successfull Calls"
 *   "[Total Rows]"         → "Total Rows"
 *   "AMM"                  → "AMM"
 */
function cleanColumnName(raw: string): string {
    // Match the last bracketed segment or strip all brackets
    const match = raw.match(/\[([^\]]+)\]/);
    if (match) return match[1];
    return raw.replace(/[\[\]]/g, "");
}

/**
 * Normalize one row: rename keys from raw Fabric format to clean column names.
 * If multiple raw keys resolve to the same clean name, the last one wins
 * (this handles the case where both "Data[AMM]" and "[AMM]" appear).
 */
function normalizeRow(raw: FabricRow): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
        normalized[cleanColumnName(key)] = value;
    }
    return normalized;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class FabricService {
    private readonly cca: ConfidentialClientApplication;
    private readonly workspaceId: string;
    private readonly datasetId: string;

    constructor(msalClient: ConfidentialClientApplication) {
        this.cca = msalClient;
        this.workspaceId = env.WORKSPACE_ID;
        this.datasetId = env.SEMANTIC_MODEL_ID;
    }

    /**
     * Pre-warm token cache. Call once at server startup so the first
     * user request doesn't pay the ~700ms token acquisition cost.
     *
     * Silent failure — if Azure AD is unreachable at startup, requests
     * will fall back to lazy acquisition.
     */
    async initialize(): Promise<void> {
        try {
            await this.getToken();
            console.log("[FabricService] Token pre-warmed successfully");
        } catch (err) {
            console.warn(
                "[FabricService] Token pre-warm failed (will retry on demand):",
                err instanceof Error ? err.message : String(err),
            );
        }
    }

    /**
     * Acquire a fresh token from Microsoft Entra ID using client_credentials flow.
     */
    private async getToken(): Promise<string> {
        const result = await this.cca.acquireTokenByClientCredential({
            scopes: ["https://analysis.windows.net/powerbi/api/.default"],
        });

        if (!result?.accessToken) {
            throw new Error("Failed to acquire access token from Entra ID.");
        }

        return result.accessToken;
    }

    /**
     * Execute a SINGLE DAX query. Convenience wrapper around executeDaxBatch.
     */
    async executeDax(dax: string, signal?: AbortSignal): Promise<DaxResult> {
        const results = await this.executeDaxBatch([{ name: "_", dax }], signal);
        return results["_"];
    }

    /**
     * Execute MULTIPLE DAX queries in parallel, sharing one token.
     *
     * Note: Fabric REST `executeQueries` endpoint accepts only ONE query
     * per call (despite the name). To "batch" we run N requests in parallel
     * while sharing one Azure AD token — saves the per-request token cost
     * (which is cached but still requires a MSAL lookup).
     *
     * Saves ~500ms per page load vs N independent single queries.
     */
    async executeDaxBatch(
        queries: Array<{ name: string; dax: string }>,
        signal?: AbortSignal,
    ): Promise<DaxBatchResult> {
        if (queries.length === 0) return {};

        // 1. Acquire token ONCE — shared across all parallel requests
        const token = await this.getToken();

        // 2. Execute all queries in parallel (Node.js doesn't block the event
        //    loop on axios I/O, so 4 concurrent requests run in ~1 round-trip time)
        const settled = await Promise.allSettled(
            queries.map((q) => this.executeOneWithToken(q.dax, token, signal)),
        );

        // 3. Build result map
        const out: DaxBatchResult = {};
        for (let i = 0; i < queries.length; i++) {
            const { name } = queries[i];
            const r = settled[i];
            if (r.status === "fulfilled") {
                out[name] = r.value;
            } else {
                console.warn(
                    `[FabricService] Query "${name}" failed:`,
                    r.reason instanceof Error ? r.reason.message : String(r.reason),
                );
                out[name] = { columns: [], rows: [] };
            }
        }

        return out;
    }

    /**
     * Internal: execute a single DAX query using a pre-acquired token.
     */
    private async executeOneWithToken(
        dax: string,
        token: string,
        signal?: AbortSignal,
    ): Promise<DaxResult> {
        const url = `${POWERBI_API_BASE}/groups/${this.workspaceId}/datasets/${this.datasetId}/executeQueries`;

        const response = await axios.post<{ results?: Array<{ tables?: FabricTable[]; error?: { message: string; code: string } }> }>(
            url,
            {
                queries: [{ query: dax }],
                serializerSettings: { includeNulls: true },
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 60_000,
                signal,
            },
        );

        if (!response.data.results?.[0]) {
            throw new FabricServiceError("No results from Fabric", "EMPTY_RESULT", 502);
        }

        const r = response.data.results[0];
        if (r.error) {
            throw new FabricServiceError(r.error.message, r.error.code || "DAX_ERROR", 502);
        }

        // DEBUG: log full raw response so we can see what Fabric REST actually returns
        console.log("[DEBUG:executeOneWithToken] raw response:", JSON.stringify({
            hasTables: !!r.tables,
            tablesCount: r.tables?.length,
            firstTableRowsCount: r.tables?.[0]?.rows?.length,
            firstTableFirstRow: r.tables?.[0]?.rows?.[0],
            fullResponse: response.data,
        }).slice(0, 4000));

        const table = r.tables?.[0];
        if (!table || table.rows.length === 0) {
            return { columns: [], rows: [] };
        }

        const rawKeys = Object.keys(table.rows[0]);
        return {
            columns: rawKeys.map(cleanColumnName),
            rows: table.rows.map(normalizeRow),
        };
    }
}

// ─── Custom error class ───────────────────────────────────────────────────────

export class FabricServiceError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly httpStatus: number = 500,
    ) {
        super(message);
        this.name = "FabricServiceError";
    }
}
