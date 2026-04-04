import "server-only";

import { logger } from "@/lib/logging/logger";
import type { EngineRunContext, EngineRunResult, ReviewEngine } from "@/server/ai/engine";
import type { Finding } from "@/server/review/types";

export type ParallelEngineOutcome = {
  /** Merged findings from all successful engines, with sourceName stamped */
  findings: Finding[];
  /** Engines that failed — `engineName` is a synthetic label (e.g. "engine[0]"), not a ReviewEngineName */
  failures: Array<{ engineName: string; error: unknown }>;
};

/**
 * Runs multiple review engines in parallel via Promise.allSettled.
 * Failed engines are logged but do not block the review — partial results
 * are returned from whichever engines succeeded.
 *
 * Each finding is stamped with `sourceName` matching the engine that produced it.
 */
export async function runEnginesInParallel(
  engines: ReviewEngine[],
  context: EngineRunContext,
): Promise<ParallelEngineOutcome> {
  // Tag each engine promise with its index so we can correlate settled results
  const results = await Promise.allSettled(engines.map((e) => e.run(context)));

  const merged: Finding[] = [];
  const failures: Array<{ engineName: string; error: unknown }> = [];

  for (const [i, settled] of results.entries()) {
    if (settled.status === "fulfilled") {
      const engineResult: EngineRunResult = settled.value;

      for (const finding of engineResult.findings) {
        merged.push({
          ...finding,
          sourceName: finding.sourceName ?? engineResult.engineName,
        });
      }
    } else {
      // Best-effort engine name: we don't know it from the rejected promise,
      // so use the index to label it.
      const engineLabel = `engine[${i}]`;
      failures.push({ engineName: engineLabel, error: settled.reason });

      logger.warn({ err: settled.reason, engineIndex: i }, "Review engine failed in parallel run");
    }
  }

  return {
    findings: merged,
    failures,
  };
}
