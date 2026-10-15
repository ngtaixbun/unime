const REDACTED = "[REDACTED]";
const SENSITIVE_KEY = /authorization|token|secret|credential|password|dax|query|response|payload|body/i;

export type AuditOutcome = "success" | "denied" | "rate_limited" | "busy" | "error" | "cancelled";

export interface SemanticAuditEvent {
  readonly event: "semantic_query";
  readonly requestId: string;
  readonly authenticatedApplicationId?: string;
  readonly questionId?: string;
  readonly authorizedScope?: "NATIONWIDE";
  readonly status: number;
  readonly durationMs: number;
  readonly outcome: AuditOutcome;
  readonly errorCategory?: string;
}

export type AuditSink = (serializedEvent: string) => void;

export function redactForLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactForLog);
  if (typeof value !== "object" || value === null) return value;
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactForLog(nested);
  }
  return output;
}

export class AuditLogger {
  public constructor(private readonly sink: AuditSink = console.info) {}

  public semanticQuery(event: SemanticAuditEvent): void {
    const safeEvent = redactForLog({
      level: "info",
      ...event,
      durationMs: Math.max(0, Math.round(event.durationMs)),
    });
    this.sink(JSON.stringify(safeEvent));
  }
}
