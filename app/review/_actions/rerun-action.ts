"use server";

import { reviewRequestSchema } from "@/lib/validation/review-request";
import { logger } from "@/lib/logging/logger";
import { runAndPersistReview } from "@/server/review/get-or-run-review";

export type RerunActionArgs = {
  prUrl: string;
};

export type RerunActionResult = { success: true; runId: string } | { success: false };

export async function rerunAction(args: RerunActionArgs): Promise<RerunActionResult> {
  const { prUrl } = args;

  const parsed = reviewRequestSchema.safeParse({ prUrl: prUrl.trim() });

  if (!parsed.success) {
    logger.warn({ prUrl }, "[rerunAction] invalid prUrl");
    return { success: false };
  }

  try {
    const { runId } = await runAndPersistReview(parsed.data);
    return { success: true, runId };
  } catch (err) {
    logger.error(err, "[rerunAction] failed");
    return { success: false };
  }
}
