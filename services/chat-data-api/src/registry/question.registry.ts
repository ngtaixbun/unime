import type { ApplicationPermission } from "../auth/permissions.js";

export interface QuestionConfiguration {
  readonly questionId: "coverage_store" | "coverage_employee";
  readonly scope: "NATIONWIDE";
  readonly allowedRegion: "ALL";
  readonly requiresCycleKey: true;
  readonly requiredPermission: ApplicationPermission;
}

export const questionRegistry = Object.freeze({
  coverage_store: Object.freeze({
    questionId: "coverage_store",
    scope: "NATIONWIDE",
    allowedRegion: "ALL",
    requiresCycleKey: true,
    requiredPermission: "coverage_store:nationwide:read",
  } satisfies QuestionConfiguration),
  coverage_employee: Object.freeze({
    questionId: "coverage_employee",
    scope: "NATIONWIDE",
    allowedRegion: "ALL",
    requiresCycleKey: true,
    requiredPermission: "coverage_employee:nationwide:read",
  } satisfies QuestionConfiguration),
});
