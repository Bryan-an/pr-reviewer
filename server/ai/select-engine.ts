import "server-only";

import { getEnv } from "@/lib/config/env";
import { REVIEW_ENGINE, type ReviewEngineName } from "@/lib/validation/review-engine-name";
import { claudeCodeEngine } from "@/server/ai/claude-code/claude-code-engine";
import { coderabbitEngine } from "@/server/ai/coderabbit/coderabbit-engine";
import { runStubEngine } from "@/server/ai/stub-engine";
import type { EngineRunContext, EngineRunResult, ReviewEngine } from "@/server/ai/engine";

const stubEngine: ReviewEngine = {
  async run(context: EngineRunContext): Promise<EngineRunResult> {
    const findings = runStubEngine(context.parsedDiff);
    return { engineName: REVIEW_ENGINE.Stub, findings };
  },
};

export type EngineConfig = {
  engines: ReviewEngine[];
  configuredName: ReviewEngineName;
};

/**
 * Returns the engines to run and the configured engine name.
 *
 * - `coderabbit` (default): CodeRabbit + Claude Code (Claude Code self-gates on rules)
 * - `claude-code`: Claude Code only
 * - `stub`: Stub only (testing)
 */
export function selectEngineConfig(): EngineConfig {
  const env = getEnv();
  const engine = env.REVIEW_ENGINE ?? REVIEW_ENGINE.Coderabbit;

  if (engine === REVIEW_ENGINE.Stub) {
    return { engines: [stubEngine], configuredName: REVIEW_ENGINE.Stub };
  }

  if (engine === REVIEW_ENGINE.ClaudeCode) {
    return { engines: [claudeCodeEngine], configuredName: REVIEW_ENGINE.ClaudeCode };
  }

  // Default: run CodeRabbit + Claude Code in parallel.
  // Claude Code engine returns empty findings when the repo has no rules.
  return {
    engines: [coderabbitEngine, claudeCodeEngine],
    configuredName: REVIEW_ENGINE.Coderabbit,
  };
}
