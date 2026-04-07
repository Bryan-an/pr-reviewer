import "server-only";

import type * as z from "zod";

export type FindingValidationFailure = {
  index: number;
  item: unknown;
  issues: z.core.$ZodIssue[];
};

export class DomainValidationError extends Error {
  public readonly name = "DomainValidationError";
  public readonly code = "DOMAIN_VALIDATION_ERROR";
  public readonly failures: FindingValidationFailure[];

  public constructor(message: string, failures: FindingValidationFailure[]) {
    super(message);
    this.failures = failures;
  }
}

export class EmptyDiffError extends Error {
  public readonly name = "EmptyDiffError";
  public readonly code = "EMPTY_DIFF";
}

export function isEmptyDiffError(error: unknown): error is EmptyDiffError {
  return error instanceof EmptyDiffError;
}

export class AllEnginesFailedError extends Error {
  public readonly name = "AllEnginesFailedError";
  public readonly code = "ALL_ENGINES_FAILED";
  /** `engineName` is a synthetic label (e.g. "engine[0]"), not a ReviewEngineName */
  public readonly failures: Array<{ engineName: string; error: unknown }>;

  public constructor(failures: Array<{ engineName: string; error: unknown }>) {
    const names = failures.map((f) => f.engineName).join(", ");
    super(`All review engines failed: ${names}`);
    this.failures = failures;
  }
}

export function isAllEnginesFailedError(error: unknown): error is AllEnginesFailedError {
  return error instanceof AllEnginesFailedError;
}
