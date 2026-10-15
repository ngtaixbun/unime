import { SemanticError } from "../errors/semantic.error.js";
import { resolveQuestionCapability } from "../registry/data-capability.registry.js";
import type { ChatQuestionId } from "../registry/data-capability.registry.js";
import type { CoverageData, SemanticQueryService } from "./semantic-query.service.js";

export interface CoverageAuthClient {
  acquire(): Promise<string>;
}

export interface CoveragePowerBiClient {
  executeQuery(input: {
    readonly token: string;
    readonly dax: string;
    readonly signal?: AbortSignal;
  }): Promise<{ readonly rows: Array<Record<string, unknown>> }>;
}

function hasExactColumns(row: Record<string, unknown>, expectedColumns: readonly string[]): boolean {
  const actual = Object.keys(row).sort();
  const expected = [...expectedColumns].sort();
  return actual.length === expected.length &&
    actual.every((column, index) => column === expected[index]);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export class CoverageStoreService implements SemanticQueryService {
  public constructor(
    private readonly authClient: CoverageAuthClient,
    private readonly powerBiClient: CoveragePowerBiClient,
    private readonly timeoutMs = 60_000,
  ) {}

  public async executeCoverage(
    questionId: ChatQuestionId,
    cycleKey: string,
    signal?: AbortSignal,
  ): Promise<CoverageData> {
    const resolved = resolveQuestionCapability(questionId, {
      cycleKey,
      scope: "NATIONWIDE",
    });
    const coverageLabel = questionId === "coverage_store" ? "Coverage Store" : "Coverage Employee";
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), this.timeoutMs);
    const operationSignal = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;
    const abortPromise = new Promise<never>((_resolve, reject) => {
      const rejectAbort = () => reject(new SemanticError(
        signal?.aborted ? "REQUEST_ABORTED" : "SEMANTIC_TIMEOUT",
        signal?.aborted ? "The request was cancelled." : "The semantic query timed out.",
        signal?.aborted ? 499 : 504,
      ));
      if (operationSignal.aborted) rejectAbort();
      else operationSignal.addEventListener("abort", rejectAbort, { once: true });
    });

    let result: Awaited<ReturnType<CoveragePowerBiClient["executeQuery"]>>;
    try {
      result = await Promise.race([
        (async () => {
          const token = await this.authClient.acquire();
          return this.powerBiClient.executeQuery({ token, dax: resolved.query, signal: operationSignal });
        })(),
        abortPromise,
      ]);
    } finally {
      clearTimeout(timer);
    }

    if (result.rows.length === 0) {
      throw new SemanticError(
        "SEMANTIC_NO_DATA",
        `Power BI returned no ${coverageLabel} data for the selected cycle.`,
        404,
      );
    }
    if (result.rows.length !== 1) {
      throw new SemanticError(
        "SEMANTIC_SCHEMA_MISMATCH",
        `Power BI returned an unexpected number of ${coverageLabel} rows.`,
        502,
      );
    }

    const row = result.rows[0]!;
    if (!hasExactColumns(row, resolved.capability.expectedColumns)) {
      throw new SemanticError(
        "SEMANTIC_SCHEMA_MISMATCH",
        `Power BI returned an unexpected ${coverageLabel} schema.`,
        502,
      );
    }

    const { responseProjection } = resolved.question;
    const actual = row[responseProjection.actual];
    const plan = row[responseProjection.plan];
    const coverageRatio = row[responseProjection.coverageRatio];
    if (actual === null || plan === null || coverageRatio === null) {
      throw new SemanticError(
        "SEMANTIC_NO_DATA",
        `Power BI returned incomplete ${coverageLabel} data for the selected cycle.`,
        404,
      );
    }
    if (
      !isFiniteNumber(actual) ||
      !isFiniteNumber(plan) ||
      !isFiniteNumber(coverageRatio)
    ) {
      throw new SemanticError(
        "SEMANTIC_SCHEMA_MISMATCH",
        `Power BI returned non-numeric ${coverageLabel} values.`,
        502,
      );
    }

    const coveragePercent = coverageRatio * 100;
    if (!Number.isFinite(coveragePercent)) {
      throw new SemanticError(
        "SEMANTIC_SCHEMA_MISMATCH",
        `Power BI returned an out-of-range ${coverageLabel} percentage.`,
        502,
      );
    }

    return {
      actual,
      plan,
      coveragePercent,
    };
  }

  /** Backwards-compatible entry point retained for the verified STEP 02 contract. */
  public executeCoverageStore(cycleKey: string, signal?: AbortSignal): Promise<CoverageData> {
    return this.executeCoverage("coverage_store", cycleKey, signal);
  }
}
