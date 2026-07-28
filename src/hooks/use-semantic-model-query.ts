import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  CachedQueryResult,
} from "@microsoft/fabric-app-data";

import {
  executeBackendSemanticModelQuery,
  type BackendSemanticQueryRequest,
} from "@/lib/backend-semantic-model-client";

import {
  getFabricClient,
} from "@/lib/fabric-client";

interface UseSemanticModelQueryOptions {
  connection: string;
  query: string;
  bypassCache?: boolean;

  backendRequest?:
    BackendSemanticQueryRequest;
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
    backendRequest,
  } = options;

  const dataSource =
    import.meta.env
      .VITE_DATA_SOURCE ===
    "backend"
      ? "backend"
      : "fabric";

  const backendQueryId =
    backendRequest?.queryId;

  const backendCycleKey =
    backendRequest?.params
      .cycleKey;

  const backendRegion =
    backendRequest?.params
      .region;

  const backendAmm =
    backendRequest?.params
      .amm;

  const backendSupervisor =
    backendRequest?.params
      .supervisor;

  const canExecute =
    dataSource === "backend"
      ? (
          backendQueryId !==
            undefined &&
          backendCycleKey !==
            undefined &&
          backendCycleKey !==
            null &&
          backendRegion !==
            undefined &&
          backendAmm !==
            undefined &&
          backendSupervisor !==
            undefined
        )
      : Boolean(
          connection &&
          query,
        );

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

  const execute =
    useCallback(
      async () => {
        if (!canExecute) {
          return;
        }

        setIsLoading(true);
        setError(undefined);

        try {
          const result =
            dataSource ===
            "backend"
              ? await executeBackendSemanticModelQuery({
                  queryId:
                    backendQueryId,

                  params: {
                    cycleKey:
                      backendCycleKey,

                    region:
                      backendRegion,

                    amm:
                      backendAmm,

                    supervisor:
                      backendSupervisor,
                  },
                })
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
          setData(undefined);

          setError(
            cause instanceof Error
              ? cause
              : new Error(
                  String(cause),
                ),
          );
        } finally {
          setIsLoading(false);
        }
      },
      [
        backendAmm,
        backendCycleKey,
        backendQueryId,
        backendRegion,
        backendSupervisor,
        bypassCache,
        canExecute,
        connection,
        dataSource,
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
    data,
    isLoading,
    error,
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