import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  CachedQueryResult,
} from "@microsoft/fabric-app-data";

import {
  executeDax,
  GenericDaxClientError,
  type GenericDaxErrorKind,
  type GatewayErrorDetails,
} from "@/lib/generic-dax-client";
import type {
  ColumnMetadataMap,
} from "@/lib/to-data-table";

interface UseSemanticModelQueryOptions {
  connection: string;
  query: string;
  enabled?: boolean;
  columnMetadata?: ColumnMetadataMap;
  /** Retained while feature query factories shed their legacy registered-query metadata. */
  backendRequest?: unknown;
  /** The Generic DAX Gateway does not expose the Fabric SDK cache. */
  bypassCache?: boolean;
}

export type SemanticQueryState =
  | "idle"
  | "waiting"
  | "loading"
  | "success"
  | "empty"
  | "error";

export interface SemanticQueryErrorInfo {
  readonly kind: GenericDaxErrorKind;
  readonly code: string;
  readonly message: string;
  readonly requestId?: string;
  readonly retryable: boolean;
  readonly requestAttempted: boolean;
  readonly details?: GatewayErrorDetails;
}

interface UseSemanticModelQueryResult {
  data: CachedQueryResult | undefined;
  isLoading: boolean;
  error: Error | undefined;
  errorInfo: SemanticQueryErrorInfo | undefined;
  state: SemanticQueryState;
  refetch: () => Promise<void>;
}

interface BackendColumnContract {
  readonly sourceNames: readonly string[];
  readonly normalizedNames: readonly string[];
}

function backendColumnContract(
  columnMetadata?: ColumnMetadataMap,
): BackendColumnContract | undefined {
  if (!columnMetadata) return undefined;
  const entries = Object.entries(columnMetadata);
  if (entries.length === 0) return undefined;
  const sourceNames = entries.map(([sourceName]) => sourceName);
  const normalizedNames = entries.map(([, definition]) => definition.name);
  if (
    normalizedNames.some((name) => typeof name !== "string" || name.trim() === "") ||
    new Set(normalizedNames).size !== normalizedNames.length
  ) {
    return undefined;
  }
  return { sourceNames, normalizedNames };
}

function configurationError(message: string): GenericDaxClientError {
  return new GenericDaxClientError(
    "QUERY_CONFIGURATION_INVALID",
    message,
    400,
    false,
    undefined,
    undefined,
    { kind: "validation", requestAttempted: false },
  );
}

function errorInfo(error: Error | undefined): SemanticQueryErrorInfo | undefined {
  if (!error) return undefined;
  if (error instanceof GenericDaxClientError) {
    return {
      kind: error.kind,
      code: error.code,
      message: error.message,
      requestId: error.requestId,
      retryable: error.retryable,
      requestAttempted: error.requestAttempted,
      details: error.details,
    };
  }
  return {
    kind: "internal",
    code: "CLIENT_ERROR",
    message: error.message,
    retryable: false,
    requestAttempted: false,
  };
}

export function useSemanticModelQuery(
  options: UseSemanticModelQueryOptions,
): UseSemanticModelQueryResult {
  const {
    connection,
    query,
    enabled = true,
    columnMetadata,
  } = options;

  const columnContract = useMemo(
    () => backendColumnContract(columnMetadata),
    [columnMetadata],
  );
  const columnContractKey = useMemo(
    () => columnContract === undefined ? "" : JSON.stringify(columnContract),
    [columnContract],
  );
  const setupError = useMemo(() => {
    if (!enabled) return undefined;
    if (connection.trim() === "") {
      return configurationError("Query backend thiếu connection hợp lệ.");
    }
    if (query.trim() === "") {
      return configurationError("Query backend thiếu DAX hợp lệ.");
    }
    if (columnContract === undefined) {
      return configurationError("Query backend thiếu columnMetadata hợp lệ.");
    }
    return undefined;
  }, [columnContract, connection, enabled, query]);
  const canExecute = enabled && setupError === undefined;
  const executionKey = canExecute
    ? `backend:${connection}:${query}:${columnContractKey}`
    : "";

  const [data, setData] = useState<CachedQueryResult>();
  const [isLoading, setIsLoading] = useState(canExecute);
  const [error, setError] = useState<Error>();
  const [resultExecutionKey, setResultExecutionKey] = useState("");
  const executionGeneration = useRef(0);
  const activeController = useRef<AbortController | undefined>(undefined);

  const execute = useCallback(async (): Promise<void> => {
    const generation = executionGeneration.current + 1;
    executionGeneration.current = generation;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;

    if (!enabled) {
      setData(undefined);
      setError(undefined);
      setIsLoading(false);
      setResultExecutionKey("");
      return;
    }

    if (setupError) {
      setData(undefined);
      setError(setupError);
      setIsLoading(false);
      setResultExecutionKey(executionKey);
      return;
    }

    setResultExecutionKey(executionKey);
    setData(undefined);
    setError(undefined);
    setIsLoading(true);

    try {
      if (!columnContract) throw configurationError("Query backend thiếu columnMetadata hợp lệ.");
      const response = await executeDax(
        {
          dax: query,
          expectedColumns: columnContract.normalizedNames,
        },
        { signal: controller.signal },
      );
      const result: CachedQueryResult = {
        status: "success",
        table: {
          columns: columnContract.sourceNames.map((name) => ({
            name,
            dataType: "unknown",
          })),
          rows: response.rows.map((row) => [...row]),
        },
        requestId: response.requestId,
        fromCache: false,
        cachedAt: undefined,
      };

      if (executionGeneration.current !== generation || controller.signal.aborted) return;
      setData(result);
    } catch (cause: unknown) {
      if (executionGeneration.current !== generation || controller.signal.aborted) return;
      setData(undefined);
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      if (executionGeneration.current === generation) setIsLoading(false);
    }
  }, [
    columnContract,
    enabled,
    executionKey,
    query,
    setupError,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      void execute();
    });
    return () => {
      executionGeneration.current += 1;
      activeController.current?.abort();
    };
  }, [execute]);

  const currentData = resultExecutionKey === executionKey ? data : undefined;
  const currentError = setupError ?? (resultExecutionKey === executionKey ? error : undefined);
  const currentIsLoading = canExecute &&
    (resultExecutionKey !== executionKey || isLoading);
  const state: SemanticQueryState = !enabled
    ? "waiting"
    : currentError
      ? "error"
      : currentIsLoading
        ? "loading"
        : currentData?.status === "success" && currentData.table.rows.length === 0
          ? "empty"
          : currentData?.status === "success"
            ? "success"
            : "idle";

  return {
    data: currentData,
    isLoading: currentIsLoading,
    error: currentError,
    errorInfo: errorInfo(currentError),
    state,
    refetch: execute,
  };
}

export function clearQueryCache(connection?: string): void {
  void connection;
}
