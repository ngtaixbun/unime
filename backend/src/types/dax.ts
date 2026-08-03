export interface DaxQueryRequest {
  readonly dax: string;
  readonly expectedColumns?: readonly string[] | undefined;
}

export interface DaxBatchItem extends DaxQueryRequest {
  readonly name: string;
}

export interface DaxQueryResult {
  readonly columns: string[];
  readonly rows: Array<Record<string, unknown>>;
}

export interface DaxQueryExecutor {
  executeQuery(input: DaxQueryRequest, signal?: AbortSignal): Promise<DaxQueryResult>;
  executeBatch(inputs: readonly DaxBatchItem[], signal?: AbortSignal): Promise<Record<string, DaxQueryResult>>;
}

export type GatewayErrorDetails = Readonly<Record<string, string | number | boolean | null>>;

export class GatewayError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly failedQueryName?: string,
    options?: ErrorOptions & { readonly details?: GatewayErrorDetails },
  ) {
    super(message, options);
    this.name = "GatewayError";
    if (options?.details) this.details = options.details;
  }

  public readonly details?: GatewayErrorDetails;
}
