import "server-only";

import type { File as ParsedDiffFile } from "parse-diff";

import type { ReviewEngineName } from "@/lib/validation/review-engine-name";
import type { ReviewRequest } from "@/lib/validation/review-request";
import type { Finding } from "@/server/review/types";

export type EngineRunContext = {
  request: ReviewRequest;
  repoDir: string;
  pr: {
    org: string;
    project: string;
    repoId: string;
    repoName: string;
    prId: number;
    title: string;
    url?: string;
    targetRefName: string;
    sourceRefName: string;
  };
  unifiedDiff: string;
  parsedDiff: ParsedDiffFile[];
  changedFiles: string[];
};

export type EngineRunResult = {
  engineName: ReviewEngineName;
  rawOutput?: string;
  findings: Finding[];
};

export interface ReviewEngine {
  run(context: EngineRunContext): Promise<EngineRunResult>;
}
