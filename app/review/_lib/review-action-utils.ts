import { FindingSchema } from "@/lib/validation/finding";
import type { getCachedReviewRun } from "@/server/review/get-or-run-review";

export function parseCachedFindings(
  cached: NonNullable<Awaited<ReturnType<typeof getCachedReviewRun>>>,
) {
  return FindingSchema.array().safeParse(cached.result.findings);
}
