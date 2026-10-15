import { z } from "zod";

const cycleKeySchema = z.string().regex(/^\d{4}(0[1-9]|1[0-2])$/, "cycleKey must use YYYYMM with a valid month.");
export const requestIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/, "requestId contains unsupported characters.");

export const chatQueryRequestSchema = z.object({
  apiVersion: z.literal("1"),
  questionId: z.enum(["coverage_store", "coverage_employee"]),
  requestId: requestIdSchema.optional(),
  parameters: z.object({
    cycleKey: cycleKeySchema,
    region: z.literal("ALL"),
  }).strict(),
}).strict();

export type ChatQueryRequest = z.infer<typeof chatQueryRequestSchema>;

export interface ApiErrorBody {
  readonly apiVersion: "1";
  readonly questionId?: string;
  readonly requestId: string;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: readonly { readonly path: string; readonly message: string }[];
  };
}
