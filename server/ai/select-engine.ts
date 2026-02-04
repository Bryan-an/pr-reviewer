import "server-only";

import { getEnv, REVIEW_ENGINE } from "@/lib/config/env";
import { coderabbitEngine } from "@/server/ai/coderabbit/coderabbit-engine";
import { runStubEngine } from "@/server/ai/stub-engine";
import type { EngineRunContext, EngineRunResult, ReviewEngine } from "@/server/ai/engine";

const stubEngine: ReviewEngine = {
  async run(context: EngineRunContext): Promise<EngineRunResult> {
    const findings = runStubEngine(context.parsedDiff);
    return { engineName: REVIEW_ENGINE.Stub, findings };
  },
};

export function selectReviewEngine(): ReviewEngine {
  const env = getEnv();
  const engine = env.REVIEW_ENGINE ?? REVIEW_ENGINE.Coderabbit;

  if (engine === REVIEW_ENGINE.Stub) return stubEngine;
  return coderabbitEngine;
}
