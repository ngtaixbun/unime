import type { ChatQuestionId } from "../registry/data-capability.registry.js";

export interface CoverageData {
  readonly actual: number;
  readonly plan: number;
  /** Percentage points: 85 means 85%. */
  readonly coveragePercent: number;
}

export interface SemanticQueryService {
  executeCoverage(questionId: ChatQuestionId, cycleKey: string, signal?: AbortSignal): Promise<CoverageData>;
}
