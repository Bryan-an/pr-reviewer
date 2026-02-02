import "server-only";

import { z } from "zod";

export const REVIEW_ENGINE = {
  Coderabbit: "coderabbit",
  Stub: "stub",
} as const;

export type ReviewEngine = (typeof REVIEW_ENGINE)[keyof typeof REVIEW_ENGINE];

const reviewEngineValues = [REVIEW_ENGINE.Coderabbit, REVIEW_ENGINE.Stub] as const;

const envSchema = z.object({
  AZURE_DEVOPS_PAT: z.string().min(1),
  REPOS_DIR: z.string().min(1).optional(),
  CODERABBIT_BIN: z.string().min(1).optional(),
  REVIEW_ENGINE: z.enum(reviewEngineValues).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Never log secrets; keep error output generic.
    throw new Error("Invalid server environment configuration.");
  }

  return parsed.data;
}
