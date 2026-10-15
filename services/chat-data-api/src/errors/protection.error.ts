export type ProtectionErrorCode = "RATE_LIMITED" | "SEMANTIC_BUSY" | "REQUEST_ABORTED";

export class ProtectionError extends Error {
  public constructor(
    public readonly code: ProtectionErrorCode,
    message: string,
    public readonly statusCode: 429 | 499 | 503,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ProtectionError";
  }
}
