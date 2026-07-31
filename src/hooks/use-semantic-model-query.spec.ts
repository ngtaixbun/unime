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
const {
    mockClearCache,
    mockSemanticModelClearCache,
    mockQuery,
    mockRegisteredBackendQuery,
    mockGenericBackendQuery,
} = vi.hoisted(() => ({
    mockClearCache: vi.fn(),
    mockSemanticModelClearCache: vi.fn(),
    mockQuery: vi.fn(),
    mockRegisteredBackendQuery: vi.fn(),
    mockGenericBackendQuery: vi.fn(),
}));

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: mockClearCache,
        semanticModel: () => ({
            query: mockQuery,
            clearCache: mockSemanticModelClearCache,
        }),
    }),
}));

vi.mock("@/lib/backend-semantic-model-client", () => ({
    executeBackendSemanticModelQuery: mockRegisteredBackendQuery,
    executeGenericBackendSemanticModelQuery: mockGenericBackendQuery,
}));

describe("useSemanticModelQuery", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        vi.stubEnv("VITE_DATA_SOURCE", "fabric");
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

    it("sends the complete DAX query and column metadata through generic backend mode", async () => {
        vi.stubEnv("VITE_DATA_SOURCE", "backend");
        vi.stubEnv("VITE_BACKEND_QUERY_MODE", "generic");

        const successResult = {
            status: "success" as const,
            table: {
                columns: [{ name: "[Value]", dataType: "unknown" }],
                rows: [[1]],
            },
            requestId: "",
            fromCache: false,
            cachedAt: undefined,
        };
        mockGenericBackendQuery.mockResolvedValue(successResult);

        const { result } = renderHook(() =>
            useSemanticModelQuery({
                connection: "model",
                query: "EVALUATE ROW(\"Value\", 1)",
                columnMetadata: {
                    "[Value]": {
                        name: "Value",
                        displayName: "Value",
                    },
                },
                backendRequest: {
                    queryId: "dim-date",
                    params: {},
                },
            }),
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockGenericBackendQuery).toHaveBeenCalledWith({
            query: "EVALUATE ROW(\"Value\", 1)",
            expectedColumns: ["[Value]"],
        });
        expect(mockRegisteredBackendQuery).not.toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
        expect(result.current.data).toEqual(successResult);
    });

    it("keeps the registered backend request as the rollback mode", async () => {
        vi.stubEnv("VITE_DATA_SOURCE", "backend");
        vi.stubEnv("VITE_BACKEND_QUERY_MODE", "registered");

        const successResult = {
            status: "success" as const,
            table: { columns: [], rows: [] },
            requestId: "",
            fromCache: false,
            cachedAt: undefined,
        };
        mockRegisteredBackendQuery.mockResolvedValue(successResult);

        const backendRequest = {
            queryId: "dim-date" as const,
            params: {},
        };
        const { result } = renderHook(() =>
            useSemanticModelQuery({
                connection: "model",
                query: "EVALUATE ROW()",
                backendRequest,
            }),
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(mockRegisteredBackendQuery).toHaveBeenCalledWith(backendRequest);
        expect(mockGenericBackendQuery).not.toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
    });
});

describe("clearQueryCache", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        vi.stubEnv("VITE_DATA_SOURCE", "fabric");
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
