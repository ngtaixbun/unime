# Unime Backend Source Review

> Generated from runtime source before backend scaffold.

Project root:

```text
/Users/nguyenngoctai/Unime
```

---

## File: `./package.json`

``json
{
  "name": "unime",
  "description": "This is a starter template for building Fabric Apps - Analytics web apps. Clone this repo locally and follow the steps below to get started.",
  "license": "MIT",
  "author": "Microsoft",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "predev": "rayfin env --framework vite",
    "prebuild": "rayfin env --framework vite",
    "dev": "vite",
    "build": "npx fabric-app-data generate -o src/fabric.generated.ts && tsc -b --noCheck && vite build",
    "build:fabric": "npx fabric-app-data generate -o src/fabric.generated.ts && tsc -b --noCheck && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run --exclude \"**/.patch-backups/**\" --exclude \"**/overview-team-kpi-trend-source-files/**\"",
    "test:watch": "vitest",
    "test:fabric": "node scripts/open-fabric-portal.mjs"
  },
  "dependencies": {
    "@microsoft/fabric-app-data": "1.1.0",
    "@microsoft/fabric-app-data-embed-client": "1.0.0",
    "@microsoft/fabric-app-data-proxy": "1.0.0",
    "@microsoft/fabric-datagrid": "1.1.0",
    "@microsoft/fabric-visuals": "1.1.1",
    "@microsoft/fabric-visuals-core": "1.1.1",
    "@microsoft/rayfin-auth-provider-fabric": "^1.33.1",
    "@microsoft/rayfin-client": "^1.33.1",
    "@microsoft/rayfin-core": "^1.33.1",
    "@microsoft/rayfin-data": "^1.33.1",
    "@microsoft/rayfin-lib": "^1.33.1",
    "@tailwindcss/vite": "^4.3.0",
    "clsx": "^2.1.1",
    "framer-motion": "^12.40.0",
    "lucide-react": "^1.17.0",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "react-error-boundary": "^6.1.2",
    "tailwind-merge": "^3.6.0",
    "tailwindcss": "^4.3.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.21.0",
    "@microsoft/fabric-app-data-cli": "1.1.0",
    "@microsoft/fabric-app-data-cli-proxy": "1.0.0",
    "@microsoft/rayfin-cli": "^1.33.1",
    "@microsoft/rayfin-mcp": "^1.33.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react-swc": "^4.3.1",
    "eslint": "^10.4.1",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "jsdom": "^29.1.1",
    "rollup-plugin-license": "^3.7.1",
    "typescript": "~5.7.2",
    "typescript-eslint": "^8.38.0",
    "vite": "^8.0.16",
    "vitest": "^4.1.8"
  }
}
``

---

## File: `./tsconfig.json`

``json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable",
      "ESNext.Decorators",
    ],
    "useDefineForClassFields": true,
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": [
        "./src/*"
      ]
    },
  },
  "include": [
    "src"
  ]
}
``

---

## File: `./vite.config.ts`

``typescript
//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite";
import license from "rollup-plugin-license";

import { resolve } from 'path';

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// Dev-only middleware: makes the local Vite server compatible with browsers that
// enforce Local Network Access (LNA) checks when a public origin (the Fabric portal)
// embeds an iframe pointing at http://localhost. Sets the LNA opt-in response header
// on every response and short-circuits the corresponding preflight OPTIONS request.
// This is required for fetch/XHR subresources from the embedded app — top-level
// iframe navigations additionally require launching Chromium with the
// `--disable-features=...LocalNetworkAccessChecks` flag (see .playwright-config.json).
const localNetworkAccessPlugin: PluginOption = {
  name: 'local-network-access-headers',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      if (req.method === 'OPTIONS' && req.headers['access-control-request-private-network']) {
        const origin = req.headers.origin || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
        res.statusCode = 204;
        res.end();
        return;
      }
      next();
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        localNetworkAccessPlugin,
    ],
    resolve: {
        alias: {
            '@': resolve(projectRoot, 'src'),
        }
    },
    optimizeDeps: {
        include: ['@microsoft/fabric-visuals', '@microsoft/fabric-datagrid', '@microsoft/fabric-visuals-core'],
    },
    build: {
        commonjsOptions: {
            include: [/node_modules/],
        },
        rollupOptions: {
            plugins: [
                license({
                    thirdParty: {
                        multipleVersions: true,
                        output: {
                            file: resolve(projectRoot, 'dist', 'THIRD_PARTY_NOTICES.txt'),
                            template(dependencies) {
                                if (dependencies.length === 0) {
                                    return 'No third-party dependencies.';
                                }
                                return (
                                    'This file was auto-generated at build time.\n\n' +
                                    dependencies
                                        .map((dep) => {
                                            const lines = [
                                                `${dep.name}@${dep.version}`,
                                                `License: ${dep.license || 'UNKNOWN'}`,
                                            ];
                                            if (dep.author) {
                                                lines.push(`Author: ${typeof dep.author === 'string' ? dep.author : dep.author.text()}`);
                                            }
                                            if (dep.noticeText) {
                                                lines.push('', 'NOTICE:', dep.noticeText.trim());
                                            }
                                            if (dep.licenseText) {
                                                lines.push('', dep.licenseText.trim());
                                            }
                                            return lines.join('\n');
                                        })
                                        .join('\n\n' + '='.repeat(60) + '\n\n')
                                );
                            },
                        },
                    },
                }),
            ],
        },
    },
});
``

---

## File: `./fabric.yaml`

``yaml
activeProfile: default
profiles:
  default:
    semanticModels:
      unimeModel:
        workspaceId: "6c4f81ec-8034-43c4-b0b7-9e8cfa32c5cb"
        itemId: "99602495-4eed-472b-95f0-52d67732be14"
``

---

## File: `./src/fabric.generated.ts`

``typescript
// fabric.generated.ts — AUTO-GENERATED from fabric.yaml (profile: default). Do not edit.

export const fabricConfig = {
  semanticModels: {
    'unimeModel': {
      workspaceId: '6c4f81ec-8034-43c4-b0b7-9e8cfa32c5cb',
      itemId: '99602495-4eed-472b-95f0-52d67732be14',
    },
  },
} as const;
``

---

## File: `./src/hooks/use-semantic-model-query.ts`

``typescript
//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState, useEffect, useCallback } from "react";
import { type CachedQueryResult } from "@microsoft/fabric-app-data";
import { getFabricClient } from "@/lib/fabric-client";

interface UseSemanticModelQueryOptions {
    /** Connection alias from fabric.yaml (e.g., "salesModel"). */
    connection: string;
    /** DAX query string. */
    query: string;
    /** If true, skip reading from cache (still writes the fresh result). */
    bypassCache?: boolean;
}

interface UseSemanticModelQueryResult {
    data: CachedQueryResult | undefined;
    isLoading: boolean;
    error: Error | undefined;
    refetch: () => Promise<void>;
}

/**
 * React hook that executes a DAX query against a Power BI semantic model
 * via the Fabric SDK. Results are cached by the SDK's built-in LRU cache.
 *
 * The connection alias is resolved from `fabric.generated.ts`
 * (managed by `npx fabric-app-data`).
 *
 * @example
 * // Basic usage
 * const { data, isLoading } = useSemanticModelQuery({
 *   connection: "salesModel",
 *   query: 'EVALUATE SUMMARIZE(Sales, Products[Name], "Total", SUM(Sales[Amount]))',
 * });
 *
 * if (data?.status === "success") {
 *   const table = data.table;
 *   // table.columns, table.rows
 * }
 *
 * @example
 * // Handling errors (SDK never throws — check result.status)
 * if (data?.status === "error") {
 *   console.error(data.error.message); // e.g., "401 Unauthorized"
 * }
 *
 * @example
 * // Checking cache status
 * if (data?.fromCache) {
 *   console.log(`Cached at ${data.cachedAt}`);
 * }
 *
 * @example
 * // Bypassing cache for fresh data
 * const { data } = useSemanticModelQuery({
 *   connection: "salesModel",
 *   query: 'EVALUATE ...',
 *   bypassCache: true,
 * });
 */
export function useSemanticModelQuery(
    options: UseSemanticModelQueryOptions,
): UseSemanticModelQueryResult {
    const { connection, query, bypassCache } = options;
    const canExecute = Boolean(connection && query);
    const [data, setData] = useState<CachedQueryResult | undefined>();
    const [isLoading, setIsLoading] = useState(canExecute);
    const [error, setError] = useState<Error | undefined>();

    const execute = useCallback(async () => {
        if (!canExecute) return;
        setIsLoading(true);
        setError(undefined);

        try {
            const result = await getFabricClient()
                .semanticModel(connection)
                .query(query, { bypassCache });

            setData(result);

            if (result.status === "error") {
                setError(new Error(result.error.message));
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsLoading(false);
        }
    }, [connection, query, bypassCache, canExecute]);

    useEffect(() => {
        queueMicrotask(() => {
            void execute();
        });
    }, [execute]);

    return { data, isLoading, error, refetch: execute };
}

/**
 * Clears cached query results from the SDK's LRU cache.
 * Pass a connection alias to clear a specific model, or omit to clear all.
 *
 * @example
 * clearQueryCache();              // clear all models
 * clearQueryCache("salesModel");  // clear a specific model
 */
export function clearQueryCache(connection?: string): void {
    if (connection) {
        getFabricClient().semanticModel(connection).clearCache();
    } else {
        getFabricClient().clearCache();
    }
}
``

---

## File: `./src/hooks/use-semantic-model-query.spec.ts`

``typescript
//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSemanticModelQuery, clearQueryCache } from "@/hooks/use-semantic-model-query";

// Mock the Fabric client module so tests run offline.
const mockClearCache = vi.fn();
const mockSemanticModelClearCache = vi.fn();
const mockQuery = vi.fn();

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: mockClearCache,
        semanticModel: () => ({
            query: mockQuery,
            clearCache: mockSemanticModelClearCache,
        }),
    }),
}));

describe("useSemanticModelQuery", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("starts in the loading state", () => {
        mockQuery.mockReturnValue(new Promise(() => {})); // never resolves

        const { result } = renderHook(() =>
            useSemanticModelQuery({ connection: "model", query: "EVALUATE ROW()" }),
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBeUndefined();
        expect(result.current.error).toBeUndefined();
    });

    it("returns data on a successful query", async () => {
        const successResult = {
            status: "success" as const,
            table: { columns: [{ name: "Value" }], rows: [[1]] },
            fromCache: false,
            cachedAt: undefined,
        };
        mockQuery.mockResolvedValue(successResult);

        const { result } = renderHook(() =>
            useSemanticModelQuery({ connection: "model", query: "EVALUATE ROW()" }),
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.data).toEqual(successResult);
        expect(result.current.error).toBeUndefined();
    });

    it("exposes an error when the query result has status 'error'", async () => {
        const errorResult = {
            status: "error" as const,
            error: { message: "401 Unauthorized" },
        };
        mockQuery.mockResolvedValue(errorResult);

        const { result } = renderHook(() =>
            useSemanticModelQuery({ connection: "model", query: "EVALUATE ROW()" }),
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.error?.message).toBe("401 Unauthorized");
    });

    it("re-executes the query when refetch is called", async () => {
        const successResult = {
            status: "success" as const,
            table: { columns: [], rows: [] },
            fromCache: false,
            cachedAt: undefined,
        };
        mockQuery.mockResolvedValue(successResult);

        const { result } = renderHook(() =>
            useSemanticModelQuery({ connection: "model", query: "EVALUATE ROW()" }),
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockQuery).toHaveBeenCalledTimes(1);

        await act(async () => {
            await result.current.refetch();
        });

        expect(mockQuery).toHaveBeenCalledTimes(2);
    });
});

describe("clearQueryCache", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("clears all caches when called without an argument", () => {
        clearQueryCache();
        expect(mockClearCache).toHaveBeenCalledOnce();
        expect(mockSemanticModelClearCache).not.toHaveBeenCalled();
    });

    it("clears only the specified model cache when called with a connection alias", () => {
        clearQueryCache("salesModel");
        expect(mockSemanticModelClearCache).toHaveBeenCalledOnce();
        expect(mockClearCache).not.toHaveBeenCalled();
    });
});
``

---

## File: `./src/lib/fabric-client.ts`

``typescript
//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { SemanticModelMessageClient } from "@microsoft/fabric-app-data-embed-client";
import { FabricClient, type FabricClientConfig } from "@microsoft/fabric-app-data";
import { EmbedFabricApiProxy } from "@microsoft/fabric-app-data-proxy";
import { fabricConfig } from "@/fabric.generated";

let _client: FabricClient | undefined;
let _messageClient: SemanticModelMessageClient | undefined;

/**
 * Returns the pre-configured FabricClient singleton.
 *
 * The client is built once using:
 * - An EmbedFabricApiProxy that communicates with the Fabric host via postMessage
 * - Connection aliases from `fabric.generated.ts` (managed by `npx fabric-app-data`)
 *
 * @internal Used by `useSemanticModelQuery` — prefer the hook over direct client access.
 */
export function getFabricClient(): FabricClient {
    if (!_messageClient)
        _messageClient = new SemanticModelMessageClient();

    if (!_client) {
        const proxy = new EmbedFabricApiProxy(_messageClient);
        _client = new FabricClient({ proxy, ...fabricConfig,  } as FabricClientConfig);
    }
    
    return _client;
}
``

---

## File: `./src/lib/to-data-table.ts`

``typescript
//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { ColumnDef, DataTable } from "@microsoft/fabric-visuals-core";
import type { QueryTable } from "@microsoft/fabric-app-data";

/**
 * Dictionary keyed by the original column name from the DAX query result.
 * Each value holds the `ColumnDef` metadata for that column.
 */
export type ColumnMetadataMap = Record<string, ColumnDef>;

/**
 * Merges a raw SDK query table with static column metadata to produce
 * a `DataTable` that `VegaVisual` and `DataGrid` accept directly.
 *
 * @param queryTable - The `table` value from `CachedQueryResult` (SDK output).
 * @param columnMetadata - Metadata dictionary exported from the query barrel file,
 *                         keyed by the original column name.
 * @returns A `DataTable` with enriched `ColumnDef` entries and the original rows.
 *
 * @example
 * ```tsx
 * import { columnMetadata, query } from "@/queries/sales/revenue-by-region";
 * import { toDataTable } from "@/lib/to-data-table";
 *
 * const { data } = useSemanticModelQuery({ connection: "myModel", query });
 *
 * if (data?.status === "success") {
 *   const dataTable = toDataTable(data.table, columnMetadata);
 *   return <VegaVisual spec={vegaLiteSpec} data={dataTable} theme={theme} />;
 * }
 * ```
 */
export function toDataTable(
    queryTable: QueryTable,
    columnMetadata: ColumnMetadataMap,
): DataTable {
    const columns: ColumnDef[] = queryTable.columns.map((col) => {
        return columnMetadata[col.name] ?? { name: col.name };
    });

    return { columns, rows: queryTable.rows };
}
``

---

## File: `./src/queries/org-filter.ts`

``typescript
export const ALL_ORG_FILTER_VALUE =
  "all" as const;

export type EncodedDimensionValue =
  | typeof ALL_ORG_FILTER_VALUE
  | `number:${string}`
  | `string:${string}`;

export interface OrgQueryFilters {
  region?: EncodedDimensionValue;
  amm?: EncodedDimensionValue;
  supervisor?: EncodedDimensionValue;
}

export const EMPTY_ORG_QUERY_FILTERS:
  OrgQueryFilters = {};

export function isEncodedDimensionValue(
  value: string,
): value is EncodedDimensionValue {
  if (value === ALL_ORG_FILTER_VALUE) {
    return true;
  }

  if (value.startsWith("string:")) {
    return true;
  }

  if (!value.startsWith("number:")) {
    return false;
  }

  const numberText =
    value.slice("number:".length);

  return (
    numberText.trim() !== "" &&
    Number.isFinite(
      Number(numberText),
    )
  );
}

export function encodeDimensionValue(
  value: string | number,
): EncodedDimensionValue {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        "Dimension ID dạng số không hợp lệ.",
      );
    }

    return `number:${value}`;
  }

  return `string:${value}`;
}

function escapeDaxString(
  value: string,
): string {
  return value.replaceAll(
    '"',
    '""',
  );
}

export function toDaxScalar(
  value: EncodedDimensionValue,
): string {
  if (value === ALL_ORG_FILTER_VALUE) {
    throw new Error(
      "Không thể chuyển giá trị all thành DAX scalar.",
    );
  }

  if (value.startsWith("number:")) {
    const numberText =
      value.slice("number:".length);

    if (
      numberText.trim() === "" ||
      !Number.isFinite(
        Number(numberText),
      )
    ) {
      throw new Error(
        "Dimension ID dạng số không hợp lệ.",
      );
    }

    return numberText;
  }

  if (value.startsWith("string:")) {
    const text =
      value.slice("string:".length);

    return `"${escapeDaxString(text)}"`;
  }

  throw new Error(
    "Dimension filter không hợp lệ.",
  );
}

export function buildTreatasFilter(
  value:
    | EncodedDimensionValue
    | undefined,
  targetColumn: string,
): string {
  if (
    value === undefined ||
    value === ALL_ORG_FILTER_VALUE
  ) {
    return "";
  }

  return [
    ",",
    "    KEEPFILTERS(",
    "        TREATAS(",
    `            { ${toDaxScalar(value)} },`,
    `            ${targetColumn}`,
    "        )",
    "    )",
  ].join("\n");
}
``

---

## File: `./src/queries/org-filter.spec.ts`

``typescript
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildTreatasFilter,
  encodeDimensionValue,
  isEncodedDimensionValue,
  toDaxScalar,
} from "./org-filter";

describe("org-filter", () => {
  it("preserves number and string ID types", () => {
    expect(
      encodeDimensionValue(12),
    ).toBe("number:12");

    expect(
      encodeDimensionValue("0012"),
    ).toBe("string:0012");
  });

  it("validates values returned by HTML select", () => {
    expect(
      isEncodedDimensionValue("all"),
    ).toBe(true);

    expect(
      isEncodedDimensionValue(
        "number:12",
      ),
    ).toBe(true);

    expect(
      isEncodedDimensionValue(
        "string:0012",
      ),
    ).toBe(true);

    expect(
      isEncodedDimensionValue(
        "number:",
      ),
    ).toBe(false);

    expect(
      isEncodedDimensionValue("0012"),
    ).toBe(false);
  });

  it("escapes DAX strings", () => {
    expect(
      toDaxScalar(
        'string:A"01',
      ),
    ).toBe('"A""01"');
  });

  it("omits all filters", () => {
    expect(
      buildTreatasFilter(
        "all",
        "'dimnv'[Region ID]",
      ),
    ).toBe("");
  });

  it("creates a selected TREATAS filter", () => {
    expect(
      buildTreatasFilter(
        "string:R01",
        "'dimnv'[Region ID]",
      ),
    ).toContain(
      `TREATAS(
            { "R01" },
            'dimnv'[Region ID]`,
    );
  });

  it("emits numeric IDs without DAX string quotes", () => {
    const filter =
      buildTreatasFilter(
        "number:16365",
        "'dimnv'[sup_id]",
      );

    expect(filter).toContain(
      "{ 16365 }",
    );
    expect(filter).not.toContain(
      '"16365"',
    );
  });
});
``

---

## File: `./src/queries/kpimtd.dax`

``dax

DEFINE
    VAR _SelectedCycleKey =
        __SELECTED_CYCLE_KEY__

EVALUATE
CALCULATETABLE(
    ROW(
        "successfulCallsMtd",
            [mtd_call] * 100,

        "successfulCallsIssued",
            [nvfail_call],

        "visitMtd",
            [mtd_visit] * 100,

        "visitIssued",
            [nvfail_visit],

        "timeSpendMtd",
            [mtd_timespend] * 100,

        "timeSpendIssued",
            [nvfail_timespend],

        "osaMtd",
            [mtd_osa] * 100,

        "osaIssued",
            [nvfail_osa],

        "qcMtd",
            [mtd_qc] * 100,

        "qcIssued",
            [nvfail_qc]
    ),

    KEEPFILTERS(
        TREATAS(
            { _SelectedCycleKey },
            'Date'[Chu kỳ KPI Key]
        )
    )
    __REGION_FILTER__
    __AMM_FILTER__
    __SUPERVISOR_FILTER__
)
``

---

## File: `./src/queries/kpimtd.ts`

``typescript
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import type { DimDateCycleValue } from "./dim-date";
import {
  buildTreatasFilter,
  type OrgQueryFilters,
} from "./org-filter";
import kpiMtdDax from "./kpimtd.dax?raw";

const connection = "unimeModel";

export type KpiMtdRow = {
  successfulCallsMtd: number | null;
  successfulCallsIssued: number | null;
  visitMtd: number | null;
  visitIssued: number | null;
  timeSpendMtd: number | null;
  timeSpendIssued: number | null;
  osaMtd: number | null;
  osaIssued: number | null;
  qcMtd: number | null;
  qcIssued: number | null;
};

export interface KpiMtdQueryParams {
  cycleKey: DimDateCycleValue;
  filters?: OrgQueryFilters;
}

export const kpiMtdQuery = kpiMtdDax.trim();

export const columnMetadata: ColumnMetadataMap = {
  "[successfulCallsMtd]": {
    name: "successfulCallsMtd",
    displayName: "Successful Calls MTD",
  },
  "[successfulCallsIssued]": {
    name: "successfulCallsIssued",
    displayName: "NV rớt Successful Calls",
  },
  "[visitMtd]": {
    name: "visitMtd",
    displayName: "Tần suất viếng thăm MTD",
  },
  "[visitIssued]": {
    name: "visitIssued",
    displayName: "NV rớt Tần suất viếng thăm",
  },
  "[timeSpendMtd]": {
    name: "timeSpendMtd",
    displayName: "Time Spend MTD",
  },
  "[timeSpendIssued]": {
    name: "timeSpendIssued",
    displayName: "NV rớt Time Spend",
  },
  "[osaMtd]": {
    name: "osaMtd",
    displayName: "OSA MTD",
  },
  "[osaIssued]": {
    name: "osaIssued",
    displayName: "NV rớt OSA",
  },
  "[qcMtd]": {
    name: "qcMtd",
    displayName: "QC MTD",
  },
  "[qcIssued]": {
    name: "qcIssued",
    displayName: "NV rớt QC",
  },
};

function toDaxScalar(
  value: DimDateCycleValue,
): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        "cycleKey KPI MTD không hợp lệ.",
      );
    }

    return String(value);
  }

  const normalized = value.trim();

  if (normalized === "") {
    throw new Error(
      "cycleKey KPI MTD đang trống.",
    );
  }

  return `"${normalized.replaceAll(
    '"',
    '""',
  )}"`;
}

export function kpiMtd({
  cycleKey,
  filters = {},
}: KpiMtdQueryParams) {
  for (const placeholder of [
    "__SELECTED_CYCLE_KEY__",
    "__REGION_FILTER__",
    "__AMM_FILTER__",
    "__SUPERVISOR_FILTER__",
  ]) {
    if (
      !kpiMtdQuery.includes(
        placeholder,
      )
    ) {
      throw new Error(
        `Template kpiMtd thiếu ${placeholder}.`,
      );
    }
  }

  const query = kpiMtdQuery
    .replace(
      "__SELECTED_CYCLE_KEY__",
      toDaxScalar(cycleKey),
    )
    .replace(
      "__REGION_FILTER__",
      buildTreatasFilter(
        filters.region,
        "'dimnv'[Region ID]",
      ),
    )
    .replace(
      "__AMM_FILTER__",
      buildTreatasFilter(
        filters.amm,
        "'dimnv'[amm_id]",
      ),
    )
    .replace(
      "__SUPERVISOR_FILTER__",
      buildTreatasFilter(
        filters.supervisor,
        "'dimnv'[sup_id]",
      ),
    );

  if (
    query.includes("__SELECTED_") ||
    query.includes("__REGION_FILTER__") ||
    query.includes("__AMM_FILTER__") ||
    query.includes(
      "__SUPERVISOR_FILTER__",
    )
  ) {
    throw new Error(
      "Không thể áp dụng filter vào kpiMtd.",
    );
  }

  return {
    connection,
    query,
    columnMetadata:
      columnMetadata,
  };
}
``

---

## File: `./src/queries/kpimtd.spec.ts`

``typescript
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  kpiMtd,
  kpiMtdQuery,
} from "./kpimtd";

describe("kpiMtd", () => {
  it("uses the unimeModel connection and injects cycleKey", () => {
    const result = kpiMtd({
      cycleKey: 202608,
    });

    expect(result.connection).toBe(
      "unimeModel",
    );
    expect(result.query).not.toBe(
      kpiMtdQuery,
    );
    expect(result.query).toContain(
      "202608",
    );
    expect(result.query).toMatch(
      /TREATAS\(\s*\{\s*_SelectedCycleKey\s*\},\s*'Date'\[Chu kỳ KPI Key\]/,
    );
    expect(result.query).not.toContain(
      "__SELECTED_CYCLE_KEY__",
    );
  });

  it("omits organization TREATAS blocks when every filter is all", () => {
    const { query } = kpiMtd({
      cycleKey: 202608,
      filters: {
        region: "all",
        amm: "all",
        supervisor: "all",
      },
    });

    expect(query).not.toContain(
      "'dimnv'[Region ID]",
    );
    expect(query).not.toContain(
      "'dimnv'[amm_id]",
    );
    expect(query).not.toContain(
      "'dimnv'[sup_id]",
    );
    expect(query).toContain(
      "'Date'[Chu kỳ KPI Key]",
    );
  });

  it("injects Region, AMM and Supervisor into the summary context", () => {
    const { query } = kpiMtd({
      cycleKey: 202608,
      filters: {
        region: "number:1",
        amm: "string:001",
        supervisor:
          'string:S"01',
      },
    });

    expect(query).toContain(
      "{ 1 }",
    );
    expect(query).toContain(
      "'dimnv'[Region ID]",
    );

    expect(query).toContain(
      '{ "001" }',
    );
    expect(query).toContain(
      "'dimnv'[amm_id]",
    );

    expect(query).toContain(
      '{ "S""01" }',
    );
    expect(query).toContain(
      "'dimnv'[sup_id]",
    );

    expect(query).not.toContain(
      "__REGION_FILTER__",
    );
    expect(query).not.toContain(
      "__AMM_FILTER__",
    );
    expect(query).not.toContain(
      "__SUPERVISOR_FILTER__",
    );
  });

  it("keeps numeric Supervisor IDs unquoted", () => {
    const { query } = kpiMtd({
      cycleKey: 202608,
      filters: {
        supervisor:
          "number:16365",
      },
    });

    expect(query).toMatch(
      /TREATAS\(\s*\{\s*16365\s*\},\s*'dimnv'\[sup_id\]/,
    );
    expect(query).not.toMatch(
      /TREATAS\(\s*\{\s*"16365"\s*\},\s*'dimnv'\[sup_id\]/,
    );
  });

  it("changes the generated query when cycle changes and leaves no placeholders", () => {
    const previous = kpiMtd({
      cycleKey: 202607,
      filters: {
        supervisor:
          "number:16365",
      },
    }).query;
    const current = kpiMtd({
      cycleKey: 202608,
      filters: {
        supervisor:
          "number:16365",
      },
    }).query;

    expect(current).not.toBe(previous);
    expect(current).toContain(
      "202608",
    );
    expect(current).not.toContain(
      "202607",
    );

    for (const placeholder of [
      "__SELECTED_CYCLE_KEY__",
      "__REGION_FILTER__",
      "__AMM_FILTER__",
      "__SUPERVISOR_FILTER__",
    ]) {
      expect(current).not.toContain(
        placeholder,
      );
    }
  });

  it("scales all five KPI ratios in DAX", () => {
    const { query } = kpiMtd({
      cycleKey: 202608,
    });

    expect(query).toMatch(
      /"successfulCallsMtd",\s*\[mtd_call\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"visitMtd",\s*\[mtd_visit\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"timeSpendMtd",\s*\[mtd_timespend\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"osaMtd",\s*\[mtd_osa\]\s*\*\s*100/,
    );
    expect(query).toMatch(
      /"qcMtd",\s*\[mtd_qc\]\s*\*\s*100/,
    );
  });

  it("keeps all five Issued measures unscaled", () => {
    const { query } = kpiMtd({
      cycleKey: 202608,
    });

    expect(query).toMatch(
      /"successfulCallsIssued",\s*\[nvfail_call\],/,
    );
    expect(query).toMatch(
      /"visitIssued",\s*\[nvfail_visit\],/,
    );
    expect(query).toMatch(
      /"timeSpendIssued",\s*\[nvfail_timespend\],/,
    );
    expect(query).toMatch(
      /"osaIssued",\s*\[nvfail_osa\],/,
    );
    expect(query).toMatch(
      /"qcIssued",\s*\[nvfail_qc\]/,
    );
  });

  it("maps all ten exact query columns", () => {
    const { columnMetadata } =
      kpiMtd({
        cycleKey: 202608,
      });

    expect(
      Object.fromEntries(
        Object.entries(
          columnMetadata,
        ).map(
          ([
            queryColumn,
            metadata,
          ]) => [
            queryColumn,
            metadata.name,
          ],
        ),
      ),
    ).toEqual({
      "[successfulCallsMtd]":
        "successfulCallsMtd",
      "[successfulCallsIssued]":
        "successfulCallsIssued",
      "[visitMtd]": "visitMtd",
      "[visitIssued]": "visitIssued",
      "[timeSpendMtd]":
        "timeSpendMtd",
      "[timeSpendIssued]":
        "timeSpendIssued",
      "[osaMtd]": "osaMtd",
      "[osaIssued]": "osaIssued",
      "[qcMtd]": "qcMtd",
      "[qcIssued]": "qcIssued",
    });
  });
});
``

---

## File: `./src/feature/overview/hooks/useKpiMtdData.ts`

``typescript
import {
  useMemo,
} from "react";

import {
  useSemanticModelQuery,
} from "@/hooks/use-semantic-model-query";
import {
  toDataTable,
} from "@/lib/to-data-table";
import type {
  DimDateCycleValue,
} from "@/queries/dim-date";
import {
  kpiMtd,
  type KpiMtdRow,
} from "@/queries/kpimtd";

import type {
  OverviewFilters,
} from "../types";

export type KpiMtdValues =
  KpiMtdRow;

export interface UseKpiMtdDataResult {
  values: KpiMtdValues | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface NullableNumberResult {
  valid: boolean;
  value: number | null;
}

const DEFAULT_FILTERS: OverviewFilters = {
  region: "all",
  amm: "all",
  supervisor: "all",
};

const KPI_MTD_NO_DATA_ERROR =
  "Semantic Model không trả đủ dữ liệu KPI MTD";

function toNullableFiniteNumber(
  value: unknown,
): NullableNumberResult {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return {
      valid: true,
      value: null,
    };
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(parsed)) {
    return {
      valid: false,
      value: null,
    };
  }

  return {
    valid: true,
    value: parsed,
  };
}

export function useKpiMtdData(
  cycleKey: DimDateCycleValue | null,
  filters: OverviewFilters =
    DEFAULT_FILTERS,
): UseKpiMtdDataResult {
  const {
    region,
    amm,
    supervisor,
  } = filters;

  const queryConfig = useMemo(
    () =>
      cycleKey === null
        ? null
        : kpiMtd({
            cycleKey,
            filters: {
              region,
              amm,
              supervisor,
            },
          }),
    [
      cycleKey,
      region,
      amm,
      supervisor,
    ],
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useSemanticModelQuery({
    connection:
      queryConfig?.connection ??
      "unimeModel",
    query:
      queryConfig?.query ??
      "",
  });

  const values =
    useMemo<KpiMtdValues | null>(
      () => {
        if (
          queryConfig === null ||
          data?.status !== "success"
        ) {
          return null;
        }

        const table = toDataTable(
          data.table,
          queryConfig.columnMetadata,
        );
        const firstRow = table.rows[0];

        if (!firstRow) {
          return null;
        }

        const columnIndexes = {
          successfulCallsMtd:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "successfulCallsMtd",
            ),

          successfulCallsIssued:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "successfulCallsIssued",
            ),

          visitMtd:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "visitMtd",
            ),

          visitIssued:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "visitIssued",
            ),

          timeSpendMtd:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "timeSpendMtd",
            ),

          timeSpendIssued:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "timeSpendIssued",
            ),

          osaMtd:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "osaMtd",
            ),

          osaIssued:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "osaIssued",
            ),

          qcMtd:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "qcMtd",
            ),

          qcIssued:
            table.columns.findIndex(
              (column) =>
                column.name ===
                "qcIssued",
            ),
        } satisfies Record<
          keyof KpiMtdRow,
          number
        >;

        const hasMissingColumn =
          Object.values(
            columnIndexes,
          ).some(
            (index) => index === -1,
          );

        if (hasMissingColumn) {
          return null;
        }

        const parsed = {
          successfulCallsMtd:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes
                  .successfulCallsMtd
              ],
            ),

          successfulCallsIssued:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes
                  .successfulCallsIssued
              ],
            ),

          visitMtd:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.visitMtd
              ],
            ),

          visitIssued:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.visitIssued
              ],
            ),

          timeSpendMtd:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.timeSpendMtd
              ],
            ),

          timeSpendIssued:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes
                  .timeSpendIssued
              ],
            ),

          osaMtd:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.osaMtd
              ],
            ),

          osaIssued:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.osaIssued
              ],
            ),

          qcMtd:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.qcMtd
              ],
            ),

          qcIssued:
            toNullableFiniteNumber(
              firstRow[
                columnIndexes.qcIssued
              ],
            ),
        };

        const hasInvalidValue =
          Object.values(
            parsed,
          ).some(
            (result) =>
              !result.valid,
          );

        if (hasInvalidValue) {
          return null;
        }

        return {
          successfulCallsMtd:
            parsed
              .successfulCallsMtd
              .value,

          successfulCallsIssued:
            parsed
              .successfulCallsIssued
              .value,

          visitMtd:
            parsed.visitMtd.value,

          visitIssued:
            parsed.visitIssued.value,

          timeSpendMtd:
            parsed.timeSpendMtd.value,

          timeSpendIssued:
            parsed
              .timeSpendIssued
              .value,

          osaMtd:
            parsed.osaMtd.value,

          osaIssued:
            parsed.osaIssued.value,

          qcMtd:
            parsed.qcMtd.value,

          qcIssued:
            parsed.qcIssued.value,
        };
      },
      [
        data,
        queryConfig,
      ],
    );

  const errorMessage =
    useMemo<string | null>(
      () => {
        if (cycleKey === null) {
          return null;
        }

        if (error) {
          return error.message;
        }

        if (
          data?.status === "error"
        ) {
          return data.error.message;
        }

        if (
          !isLoading &&
          data?.status === "success" &&
          values == null
        ) {
          return KPI_MTD_NO_DATA_ERROR;
        }

        return null;
      },
      [
        cycleKey,
        data,
        error,
        isLoading,
        values,
      ],
    );

  return {
    values,
    isLoading:
      cycleKey !== null &&
      isLoading,
    error: errorMessage,
    refetch,
  };
}
``

---

## File: `./src/feature/overview/hooks/useKpiMtdData.spec.ts`

``typescript
import {
  act,
  renderHook,
} from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { kpiMtd } from "@/queries/kpimtd";
import type {
  OverviewFilters,
} from "../types";

import { useKpiMtdData } from "./useKpiMtdData";

const {
  mockUseSemanticModelQuery,
} = vi.hoisted(() => ({
  mockUseSemanticModelQuery:
    vi.fn(),
}));

vi.mock(
  "@/hooks/use-semantic-model-query",
  () => ({
    useSemanticModelQuery:
      mockUseSemanticModelQuery,
  }),
);

const refetch =
  vi.fn(async () => undefined);

const queryColumns = [
  "[successfulCallsMtd]",
  "[successfulCallsIssued]",
  "[visitMtd]",
  "[visitIssued]",
  "[timeSpendMtd]",
  "[timeSpendIssued]",
  "[osaMtd]",
  "[osaIssued]",
  "[qcMtd]",
  "[qcIssued]",
];

const semanticRow = [
  93,
  11,
  0.27,
  22,
  102,
  33,
  95,
  44,
  99,
  55,
];

function successResult(
  row: unknown[] = semanticRow,
  columns: string[] = queryColumns,
) {
  return {
    data: {
      status: "success" as const,
      table: {
        columns: columns.map(
          (name) => ({
            name,
            dataType: "Double",
          }),
        ),
        rows: [row],
      },
    },
    isLoading: false,
    error: undefined,
    refetch,
  };
}

describe("useKpiMtdData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries kpimtd once through unimeModel", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(),
      );

    renderHook(
      () =>
        useKpiMtdData(202608),
    );

    expect(
      mockUseSemanticModelQuery,
    ).toHaveBeenCalledOnce();

    expect(
      mockUseSemanticModelQuery,
    ).toHaveBeenCalledWith({
      connection: "unimeModel",
      query:
        kpiMtd({
          cycleKey: 202608,
        }).query,
    });
  });

  it("rebuilds the semantic query when cycleKey changes", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(),
      );

    const filters: OverviewFilters = {
      region: "all",
      amm: "all",
      supervisor: "number:16365",
    };

    const { rerender } =
      renderHook(
        ({
          cycleKey,
        }: {
          cycleKey: number;
        }) =>
          useKpiMtdData(
            cycleKey,
            filters,
          ),
        {
          initialProps: {
            cycleKey: 202607,
          },
        },
      );

    const previousQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    rerender({
      cycleKey: 202608,
    });

    const currentQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    expect(currentQuery).not.toBe(
      previousQuery,
    );
    expect(currentQuery).toContain(
      "202608",
    );
    expect(currentQuery).toContain(
      "{ 16365 }",
    );
  });

  it("rebuilds the semantic query for each applied organization filter primitive", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(),
      );

    const { rerender } =
      renderHook(
        ({
          filters,
        }: {
          filters: OverviewFilters;
        }) =>
          useKpiMtdData(
            202608,
            filters,
          ),
        {
          initialProps: {
            filters: {
              region: "all",
              amm: "all",
              supervisor: "all",
            } as OverviewFilters,
          },
        },
      );

    const allQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    rerender({
      filters: {
        region: "number:1",
        amm: "all",
        supervisor: "all",
      },
    });
    const regionQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    rerender({
      filters: {
        region: "number:1",
        amm: "string:001",
        supervisor: "all",
      },
    });
    const ammQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    rerender({
      filters: {
        region: "number:1",
        amm: "string:001",
        supervisor:
          "number:16365",
      },
    });
    const supervisorQuery =
      mockUseSemanticModelQuery
        .mock.calls.at(-1)?.[0]
        .query;

    expect(regionQuery).not.toBe(
      allQuery,
    );
    expect(regionQuery).toContain(
      "'dimnv'[Region ID]",
    );
    expect(ammQuery).not.toBe(
      regionQuery,
    );
    expect(ammQuery).toContain(
      "'dimnv'[amm_id]",
    );
    expect(supervisorQuery).not.toBe(
      ammQuery,
    );
    expect(supervisorQuery).toContain(
      "'dimnv'[sup_id]",
    );
  });

  it("reads all five KPI percentages and all five Issued values unchanged", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toEqual({
      successfulCallsMtd: 93,
      successfulCallsIssued: 11,
      visitMtd: 0.27,
      visitIssued: 22,
      timeSpendMtd: 102,
      timeSpendIssued: 33,
      osaMtd: 95,
      osaIssued: 44,
      qcMtd: 99,
      qcIssued: 55,
    });

    expect(
      result.current.error,
    ).toBeNull();
  });

  it("preserves loading without exposing partial values", () => {
    mockUseSemanticModelQuery
      .mockReturnValue({
        data: undefined,
        isLoading: true,
        error: undefined,
        refetch,
      });

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toBeNull();

    expect(
      result.current.isLoading,
    ).toBe(true);

    expect(
      result.current.error,
    ).toBeNull();
  });

  it("surfaces semantic query errors", () => {
    mockUseSemanticModelQuery
      .mockReturnValue({
        data: {
          status: "error",
          error: {
            message:
              "Query failed",
          },
        },
        isLoading: false,
        error: undefined,
        refetch,
      });

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toBeNull();

    expect(
      result.current.error,
    ).toBe(
      "Query failed",
    );
  });

  it("rejects a successful response with no row", () => {
    const emptyResult =
      successResult();

    emptyResult.data.table.rows = [];

    mockUseSemanticModelQuery
      .mockReturnValue(
        emptyResult,
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toBeNull();

    expect(
      result.current.error,
    ).toBe(
      "Semantic Model không trả đủ dữ liệu KPI MTD",
    );
  });

  it("rejects a response missing any required column", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(
          semanticRow.slice(
            0,
            -1,
          ),
          queryColumns.slice(
            0,
            -1,
          ),
        ),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toBeNull();

    expect(
      result.current.error,
    ).toBe(
      "Semantic Model không trả đủ dữ liệu KPI MTD",
    );
  });

  it("keeps individual BLANK cells as null without removing other KPI values", () => {
    const partialRow:
      unknown[] = [
        ...semanticRow,
      ];

    partialRow[4] = null;
    partialRow[7] = "";

    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(
          partialRow,
        ),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toEqual({
      successfulCallsMtd: 93,
      successfulCallsIssued: 11,
      visitMtd: 0.27,
      visitIssued: 22,
      timeSpendMtd: null,
      timeSpendIssued: 33,
      osaMtd: 95,
      osaIssued: null,
      qcMtd: 99,
      qcIssued: 55,
    });

    expect(
      result.current.error,
    ).toBeNull();
  });

  it("allows a returned row whose cells are all BLANK", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(
          Array(
            queryColumns.length,
          ).fill(null),
        ),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toEqual({
      successfulCallsMtd: null,
      successfulCallsIssued: null,
      visitMtd: null,
      visitIssued: null,
      timeSpendMtd: null,
      timeSpendIssued: null,
      osaMtd: null,
      osaIssued: null,
      qcMtd: null,
      qcIssued: null,
    });

    expect(
      result.current.error,
    ).toBeNull();
  });

  it("parses numeric strings and preserves zero values", () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult([
          "93.5",
          "11",
          0,
          "0",
          "102",
          33,
          95,
          44,
          99,
          55,
        ]),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toMatchObject({
      successfulCallsMtd: 93.5,
      successfulCallsIssued: 11,
      visitMtd: 0,
      visitIssued: 0,
    });
    expect(
      result.current.error,
    ).toBeNull();
  });

  it("rejects a non-numeric non-BLANK cell", () => {
    const invalidRow:
      unknown[] = [
        ...semanticRow,
      ];

    invalidRow[4] =
      "not-a-number";

    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(
          invalidRow,
        ),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    expect(
      result.current.values,
    ).toBeNull();

    expect(
      result.current.error,
    ).toBe(
      "Semantic Model không trả đủ dữ liệu KPI MTD",
    );
  });

  it("exposes the existing refetch action", async () => {
    mockUseSemanticModelQuery
      .mockReturnValue(
        successResult(),
      );

    const { result } =
      renderHook(
        () =>
          useKpiMtdData(202608),
      );

    await act(async () => {
      await result.current.refetch();
    });

    expect(
      refetch,
    ).toHaveBeenCalledOnce();
  });
});
``

---

## File: `./src/feature/overview/types/overview.ts`

``typescript
import type {
  EncodedDimensionValue,
} from "@/queries/org-filter";

export type OverviewPeriod =
  | "today"
  | "seven-days"
  | "mtd";

export type OverviewKpiStatus =
  | "good"
  | "warn"
  | "bad"
  | "neutral";

export type OverviewRoute =
  | "overview"
  | "market"
  | "team"
  | "profile"
  | "userguide";

export interface TrendPoint {
  value: number;
  benchmark?: number;
  date?: string;
}

export interface OverviewFilters {
  region: EncodedDimensionValue;
  amm: EncodedDimensionValue;
  supervisor: EncodedDimensionValue;
}

export interface FilterOption {
  label: string;
  value: EncodedDimensionValue;
}

export interface OverviewKpi {
  id: string;
  title: string;
  percent: number | null;
  issued: number | null;
  issuedLabel: string;
  status: OverviewKpiStatus;
  trend: TrendPoint[];
  previousPercent?: number | null;
}

export interface CoverageMetric {
  id: string;
  title: string;
  percent: number;
  actual: number;
  target: number;
  missingLabel: string;
}

export interface OverviewData {
  coverage: CoverageMetric[];
  marketKpis: OverviewKpi[];
  teamKpis: OverviewKpi[];
}

export interface NavigationItem {
  id: OverviewRoute;
  label: string;
}
``

