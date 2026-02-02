import "server-only";

import { z } from "zod";

const envSchema = z.object({
  AZURE_DEVOPS_PAT: z.string().min(1),
  REPOS_DIR: z.string().min(1).optional(),
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
