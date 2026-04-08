import { z } from "zod";

import { FINDING_STATUS, findingStatusValues } from "@/lib/validation/finding-status";
import { reviewEngineNameValues } from "@/lib/validation/review-engine-name";

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

const severityValues = [SEVERITY.Info, SEVERITY.Warn, SEVERITY.Error] as const;

const categoryValues = [
  FINDING_CATEGORY.Correctness,
  FINDING_CATEGORY.Security,
  FINDING_CATEGORY.Maintainability,
  FINDING_CATEGORY.Performance,
  FINDING_CATEGORY.Testing,
  FINDING_CATEGORY.DX,
  FINDING_CATEGORY.Style,
] as const;

export const FindingSchema = z.object({
  findingKey: z.string().trim().min(1),
  severity: z.enum(severityValues),
  category: z.enum(categoryValues),
  title: z.string().trim().min(1),
  message: z.string().trim().min(1),
  filePath: z
    .string()
    .transform((v) => v.trim())
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  lineStart: z.number().int().positive().optional(),
  lineEnd: z.number().int().positive().optional(),
  recommendation: z.string().trim().min(1).optional(),
  sourceName: z.enum(reviewEngineNameValues).optional(),
  id: z.string().trim().min(1).optional(),
  status: z.enum(findingStatusValues).optional().default(FINDING_STATUS.Pending),
});

export type ValidFinding = z.infer<typeof FindingSchema>;
