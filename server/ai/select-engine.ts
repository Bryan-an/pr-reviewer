import "server-only";

import { getEnv, REVIEW_ENGINE } from "@/lib/config/env";
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

/**
 * Returns the list of engines to run for a review.
 *
 * - `coderabbit` (default): CodeRabbit + Claude Code (Claude Code self-gates on rules)
 * - `claude-code`: Claude Code only
 * - `stub`: Stub only (testing)
 */
export function selectReviewEngines(): ReviewEngine[] {
  const env = getEnv();
  const engine = env.REVIEW_ENGINE ?? REVIEW_ENGINE.Coderabbit;

  if (engine === REVIEW_ENGINE.Stub) return [stubEngine];
  if (engine === REVIEW_ENGINE.ClaudeCode) return [claudeCodeEngine];

  // Default: run CodeRabbit + Claude Code in parallel.
  // Claude Code engine returns empty findings when the repo has no rules.
  return [coderabbitEngine, claudeCodeEngine];
}
