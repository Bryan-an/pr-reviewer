import "server-only";

import type { FindingCategory, Severity } from "@/lib/validation/finding";
import type { FindingStatus } from "@/lib/validation/finding-status";
import type { ReviewEngineName } from "@/lib/validation/review-engine-name";

export type Finding = {
  findingKey: string;
  id?: string;
  status?: FindingStatus;
  severity: Severity;
  category: FindingCategory;
  title: string;
  message: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  recommendation?: string;
  sourceName?: ReviewEngineName;
  codeSnippet?: string;
};

export type ReviewRunResult = {
  pr: {
    org: string;
    project: string;
    repoId: string;
    repoName: string;
    prId: number;
    title: string;
    url?: string;
  };
  engine: {
    name: ReviewEngineName;
  };
  summary: {
    totalFindings: number;
    bySeverity: Record<Severity, number>;
  };
  findings: Finding[];
};
