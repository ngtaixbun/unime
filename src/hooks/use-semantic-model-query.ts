import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  CachedQueryResult,
} from "@microsoft/fabric-app-data";

import {
  executeBackendSemanticModelQuery,
  executeGenericBackendSemanticModelQuery,
  type BackendSemanticQueryRequest,
} from "@/lib/backend-semantic-model-client";

import {
  getFabricClient,
} from "@/lib/fabric-client";
import type {
  ColumnMetadataMap,
} from "@/lib/to-data-table";

interface UseSemanticModelQueryOptions {
  connection: string;
  query: string;
  bypassCache?: boolean;
  enabled?: boolean;

  backendRequest?:
    BackendSemanticQueryRequest;

  columnMetadata?:
    ColumnMetadataMap;
}

interface UseSemanticModelQueryResult {
  data:
    CachedQueryResult |
    undefined;

  isLoading: boolean;

  error:
    Error |
    undefined;

  refetch:
    () => Promise<void>;
}

export function useSemanticModelQuery(
  options:
    UseSemanticModelQueryOptions,
): UseSemanticModelQueryResult {
  const {
    connection,
    query,
    bypassCache,
    enabled = true,
    backendRequest,
    columnMetadata,
  } = options;

  const dataSource =
    import.meta.env
      .VITE_DATA_SOURCE ===
    "backend"
      ? "backend"
      : "fabric";

  const backendQueryMode =
    import.meta.env
      .VITE_BACKEND_QUERY_MODE ===
    "generic"
      ? "generic"
      : "registered";

  const backendRequestKey =
    backendRequest === undefined
      ? ""
      : JSON.stringify(
          backendRequest,
        );

  const expectedColumnsKey =
    columnMetadata === undefined
      ? ""
      : JSON.stringify(
          Object.keys(
            columnMetadata,
          ),
        );

  const canExecute =
    enabled &&
    (
      dataSource === "backend"
      ? (
          backendQueryMode ===
            "generic"
            ? Boolean(
                query &&
                expectedColumnsKey &&
                expectedColumnsKey !==
                  "[]",
              )
            : backendRequestKey !==
              ""
        )
      : Boolean(
          connection &&
          query,
        )
    );

  const executionKey =
    canExecute
      ? dataSource === "backend"
        ? backendQueryMode ===
            "generic"
          ? `backend:generic:${connection}:${query}:${expectedColumnsKey}:${String(Boolean(bypassCache))}`
          : `backend:registered:${backendRequestKey}:${String(Boolean(bypassCache))}`
        : `fabric:${connection}:${query}:${String(Boolean(bypassCache))}`
      : "";

  const [
    data,
    setData,
  ] = useState<
    CachedQueryResult |
    undefined
  >();

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    canExecute,
  );

  const [
    error,
    setError,
  ] = useState<
    Error |
      undefined
  >();

  const [
    resultExecutionKey,
    setResultExecutionKey,
  ] = useState("");

  const executionGeneration =
    useRef(0);

  const execute =
    useCallback(
      async () => {
        const generation =
          executionGeneration.current +
          1;

        executionGeneration.current =
          generation;

        if (!canExecute) {
          setData(undefined);
          setError(undefined);
          setIsLoading(false);
          setResultExecutionKey("");
          return;
        }

        setResultExecutionKey(
          executionKey,
        );
        setData(undefined);
        setIsLoading(true);
        setError(undefined);

        try {
          const result =
            dataSource ===
            "backend"
              ? backendQueryMode ===
                  "generic"
                ? await executeGenericBackendSemanticModelQuery({
                    query,
                    expectedColumns:
                      JSON.parse(
                        expectedColumnsKey,
                      ) as string[],
                  })
                : await executeBackendSemanticModelQuery(
                    JSON.parse(
                      backendRequestKey,
                    ) as
                      BackendSemanticQueryRequest,
                  )
              : await getFabricClient()
                  .semanticModel(
                    connection,
                  )
                  .query(
                    query,
                    {
                      bypassCache,
                    },
                  );

          if (
            executionGeneration.current !==
            generation
          ) {
            return;
          }

          setData(result);

          if (
            result.status ===
            "error"
          ) {
            setError(
              new Error(
                result.error.message,
              ),
            );
          }
        } catch (
          cause: unknown
        ) {
          if (
            executionGeneration.current !==
            generation
          ) {
            return;
          }

          setData(undefined);

          setError(
            cause instanceof Error
              ? cause
              : new Error(
                  String(cause),
                ),
          );
        } finally {
          if (
            executionGeneration.current ===
            generation
          ) {
            setIsLoading(false);
          }
        }
      },
      [
        backendRequestKey,
        backendQueryMode,
        bypassCache,
        canExecute,
        connection,
        dataSource,
        executionKey,
        expectedColumnsKey,
        query,
      ],
    );

  useEffect(
    () => {
      queueMicrotask(
        () => {
          void execute();
        },
      );
    },
    [execute],
  );

  return {
    data:
      resultExecutionKey ===
      executionKey
        ? data
        : undefined,
    isLoading:
      canExecute &&
      (
        resultExecutionKey !==
          executionKey ||
        isLoading
      ),
    error:
      resultExecutionKey ===
      executionKey
        ? error
        : undefined,
    refetch: execute,
  };
}

export function clearQueryCache(
  connection?: string,
): void {
  if (
    import.meta.env
      .VITE_DATA_SOURCE ===
    "backend"
  ) {
    return;
  }

  if (connection) {
    getFabricClient()
      .semanticModel(connection)
      .clearCache();

    return;
  }

  getFabricClient()
    .clearCache();
}
