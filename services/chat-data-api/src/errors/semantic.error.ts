export type SemanticErrorCode =
  | "SEMANTIC_AUTH_FAILED"
  | "SEMANTIC_QUERY_FAILED"
  | "SEMANTIC_RATE_LIMITED"
  | "SEMANTIC_TIMEOUT"
  | "SEMANTIC_UPSTREAM_ERROR"
  | "SEMANTIC_SCHEMA_MISMATCH"
  | "SEMANTIC_NO_DATA"
  | "REQUEST_ABORTED";

/**
 * A deliberately small, safe error boundary for semantic-model operations.
 * Public messages must not contain credentials, tokens, DAX, or upstream bodies.
 */
export class SemanticError extends Error {
  public constructor(
    public readonly code: SemanticErrorCode,
    message: string,
    public readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SemanticError";
  }
}
