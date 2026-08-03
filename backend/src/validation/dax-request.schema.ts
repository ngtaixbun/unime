import { z } from "zod";
import type { GatewayEnv } from "../config/env.js";

const expectedColumn = z.string().trim().min(1).max(512);

export function createDaxRequestSchemas(env: GatewayEnv) {
  const dax = z.string().refine((value) => value.trim().length > 0, "DAX is required.")
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= env.DAX_MAX_LENGTH_BYTES,
      `DAX exceeds ${env.DAX_MAX_LENGTH_BYTES} bytes.`,
    );
  const expectedColumns = z.array(expectedColumn)
    .max(512)
    .refine((columns) => new Set(columns).size === columns.length, "Expected columns must be unique.")
    .optional();
  const single = z.object({ dax, expectedColumns }).strict();
  const batchItem = single.extend({ name: z.string().trim().min(1).max(128) }).strict();
  const batch = z.object({
    queries: z.array(batchItem).min(1).max(env.BATCH_MAX_QUERIES),
  }).strict().superRefine((value, context) => {
    const names = new Set<string>();
    value.queries.forEach((query, index) => {
      if (names.has(query.name)) {
        context.addIssue({
          code: "custom",
          path: ["queries", index, "name"],
          message: "Batch query names must be unique.",
        });
      }
      names.add(query.name);
    });
  });

  return { single, batch };
}
