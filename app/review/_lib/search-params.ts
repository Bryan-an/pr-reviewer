/**
 * Search parameter key constants specific to the review feature.
 *
 * For keys shared with form fields (prUrl, runId, engineName, correlationId),
 * use REVIEW_FORM_FIELD from "./form-fields" instead.
 */
export const REVIEW_SEARCH_PARAM = {
  Published: "published",
  PublishError: "publishError",
  Error: "error",
  PublishedThreads: "publishedThreads",
  SkippedThreads: "skippedThreads",
  TotalThreads: "totalThreads",
} as const;
