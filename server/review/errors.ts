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

export function isDomainValidationError(error: unknown): error is DomainValidationError {
  return error instanceof DomainValidationError;
}

export class ReviewRunError extends Error {
  public readonly name = "ReviewRunError";
  public readonly code = "REVIEW_RUN_ERROR";
  public readonly correlationId: string;

  public constructor(params: { message: string; correlationId: string; cause?: unknown }) {
    super(params.message, params.cause ? { cause: params.cause } : undefined);
    this.correlationId = params.correlationId;
  }
}

export function isReviewRunError(error: unknown): error is ReviewRunError {
  return error instanceof ReviewRunError;
}
