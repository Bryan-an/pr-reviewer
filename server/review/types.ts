import "server-only";

import type { FindingCategory, Severity } from "@/lib/validation/finding";

export type Finding = {
  id: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  message: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  recommendation?: string;
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
    name: string;
  };
  summary: {
    totalFindings: number;
    bySeverity: Record<Severity, number>;
  };
  findings: Finding[];
};
