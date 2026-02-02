import "server-only";

export const SEVERITY = {
  Info: "info",
  Warn: "warn",
  Error: "error",
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export const FINDING_CATEGORY = {
  Correctness: "correctness",
  Security: "security",
  Maintainability: "maintainability",
  Performance: "performance",
  Testing: "testing",
  DX: "dx",
  Style: "style",
} as const;

export type FindingCategory = (typeof FINDING_CATEGORY)[keyof typeof FINDING_CATEGORY];

export type Finding = {
  id: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  message: string;
  filePath?: string;
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
