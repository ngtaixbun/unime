import { ProtectionError } from "../errors/protection.error.js";

export interface SemanticExecutionGateOptions {
  readonly maxConcurrency: number;
  readonly maxQueueSize: number;
  readonly queueTimeoutMs: number;
}

interface QueueEntry<T> {
  readonly task: () => Promise<T>;
  readonly signal: AbortSignal | undefined;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
  timer?: ReturnType<typeof setTimeout>;
  onAbort?: () => void;
  settled: boolean;
}

/** A process-local bounded FIFO gate for expensive semantic-model operations. */
export class SemanticExecutionGate {
  private activeCount = 0;
  // Entries retain their own generic promise callbacks; the queue only orders them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly queue: Array<QueueEntry<any>> = [];

  public constructor(private readonly options: SemanticExecutionGateOptions) {
    for (const [name, value] of Object.entries(options)) {
      if (!Number.isInteger(value) || value < (name === "maxQueueSize" ? 0 : 1)) {
        throw new TypeError(`${name} has an invalid value.`);
      }
    }
  }

  public get active(): number { return this.activeCount; }
  public get queued(): number { return this.queue.length; }

  public execute<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(this.abortedError());
    if (this.activeCount < this.options.maxConcurrency) return this.run(task);
    if (this.queue.length >= this.options.maxQueueSize) {
      return Promise.reject(new ProtectionError(
        "SEMANTIC_BUSY",
        "The semantic query service is temporarily busy.",
        503,
        Math.max(1, Math.ceil(this.options.queueTimeoutMs / 1_000)),
      ));
    }

    return new Promise<T>((resolve, reject) => {
      const entry: QueueEntry<T> = { task, signal, resolve, reject, settled: false };
      const removeAndReject = (error: ProtectionError): void => {
        if (entry.settled) return;
        entry.settled = true;
        const index = this.queue.indexOf(entry);
        if (index >= 0) this.queue.splice(index, 1);
        this.cleanup(entry);
        reject(error);
      };
      entry.onAbort = () => removeAndReject(this.abortedError());
      signal?.addEventListener("abort", entry.onAbort, { once: true });
      entry.timer = setTimeout(() => removeAndReject(new ProtectionError(
        "SEMANTIC_BUSY",
        "The semantic query queue wait timed out.",
        503,
        1,
      )), this.options.queueTimeoutMs);
      this.queue.push(entry);
    });
  }

  private run<T>(task: () => Promise<T>): Promise<T> {
    this.activeCount += 1;
    return Promise.resolve().then(task).finally(() => {
      this.activeCount -= 1;
      this.drain();
    });
  }

  private drain(): void {
    while (this.activeCount < this.options.maxConcurrency) {
      const entry = this.queue.shift();
      if (!entry) return;
      if (entry.settled) continue;
      entry.settled = true;
      this.cleanup(entry);
      if (entry.signal?.aborted) {
        entry.reject(this.abortedError());
        continue;
      }
      this.run(entry.task).then(entry.resolve, entry.reject);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cleanup(entry: QueueEntry<any>): void {
    if (entry.timer !== undefined) clearTimeout(entry.timer);
    if (entry.onAbort) entry.signal?.removeEventListener("abort", entry.onAbort);
  }

  private abortedError(): ProtectionError {
    return new ProtectionError("REQUEST_ABORTED", "The request was cancelled.", 499);
  }
}
