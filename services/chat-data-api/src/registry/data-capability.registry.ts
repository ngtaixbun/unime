import { generatedQueryCapabilities } from "../generated/query-capabilities.generated.js";

export type DataCapabilityId = "market.summary";
export type ChatQuestionId = "coverage_store" | "coverage_employee";
export type SupportedScope = "NATIONWIDE";

export interface CapabilityRequest {
  readonly cycleKey: string;
  readonly scope: SupportedScope;
}

const CYCLE_KEY_PATTERN = /^\d{4}(0[1-9]|1[0-2])$/;

export const dataCapabilityRegistry = Object.freeze({
  "market.summary": Object.freeze({
    capabilityId: "market.summary" as const,
    sourceFactory: generatedQueryCapabilities.capabilities["market.summary"].sourceFactory,
    sourceHash: generatedQueryCapabilities.capabilities["market.summary"].sourceHash,
    availableExistingScopes: ["NATIONWIDE", "REGION", "AMM", "SUPERVISOR", "EMPLOYEE"] as const,
    enabledChatScopes: ["NATIONWIDE"] as const,
    availableExistingFilters: generatedQueryCapabilities.capabilities["market.summary"].supportedFilters,
    enabledChatFilters: [] as const,
    expectedColumns: generatedQueryCapabilities.capabilities["market.summary"].expectedColumns,
  }),
});

export const questionCapabilityRegistry = Object.freeze({
  coverage_store: Object.freeze({
    questionId: "coverage_store" as const,
    capabilityId: "market.summary" as const,
    responseProjection: Object.freeze({
      actual: "[coverage_shop]",
      plan: "[plan_shop]",
      coverageRatio: "[coverage_shop_perc]",
    }),
  }),
  coverage_employee: Object.freeze({
    questionId: "coverage_employee" as const,
    capabilityId: "market.summary" as const,
    responseProjection: Object.freeze({
      actual: "[coverage_emp]",
      plan: "[plan_emp]",
      coverageRatio: "[coverage_emp_perc]",
    }),
  }),
});

export function classifyQuestionCapability(questionId: string) {
  if (questionId in questionCapabilityRegistry) {
    return { status: "SUPPORTED" as const, questionId: questionId as ChatQuestionId };
  }
  return {
    status: "UNSUPPORTED" as const,
    questionId,
    reason: "No existing allowlisted Unime query capability is mapped to this question.",
  };
}

export function resolveQuestionCapability(questionId: ChatQuestionId, request: CapabilityRequest) {
  if (!CYCLE_KEY_PATTERN.test(request.cycleKey)) {
    throw new TypeError("cycleKey must use YYYYMM with a valid month.");
  }
  const question = questionCapabilityRegistry[questionId];
  const capability = dataCapabilityRegistry[question.capabilityId];
  if (!capability.enabledChatScopes.includes(request.scope)) {
    throw new Error(`UNSUPPORTED scope ${request.scope} for ${question.capabilityId}.`);
  }
  const generated = generatedQueryCapabilities.capabilities[question.capabilityId];
  const occurrences = generated.queryTemplate.split(generated.cyclePlaceholder).length - 1;
  if (occurrences !== 1) throw new Error("Generated capability has an invalid cycle placeholder contract.");
  return {
    capability,
    question,
    query: generated.queryTemplate.replace(generated.cyclePlaceholder, request.cycleKey),
  };
}
