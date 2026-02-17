import "server-only";

import { z } from "zod";

export const REVIEW_ENGINE = {
  Coderabbit: "coderabbit",
  Stub: "stub",
} as const;

export type ReviewEngine = (typeof REVIEW_ENGINE)[keyof typeof REVIEW_ENGINE];

const reviewEngineValues = [REVIEW_ENGINE.Coderabbit, REVIEW_ENGINE.Stub] as const;

export const LOG_LEVEL = {
  Fatal: "fatal",
  Error: "error",
  Warn: "warn",
  Info: "info",
  Debug: "debug",
  Trace: "trace",
  Silent: "silent",
} as const;

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

const logLevelValues = [
  LOG_LEVEL.Fatal,
  LOG_LEVEL.Error,
  LOG_LEVEL.Warn,
  LOG_LEVEL.Info,
  LOG_LEVEL.Debug,
  LOG_LEVEL.Trace,
  LOG_LEVEL.Silent,
] as const;

const envSchema = z.object({
  AZURE_DEVOPS_PAT: z.string().min(1),
  REPOS_DIR: z.string().min(1).optional(),
  CODERABBIT_BIN: z.string().min(1).optional(),
  CODERABBIT_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  REVIEW_ENGINE: z.enum(reviewEngineValues).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(logLevelValues).optional(),
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
