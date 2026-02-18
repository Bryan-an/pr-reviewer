import { buildUrl } from "@/lib/utils/url";
import { REVIEW_FORM_FIELD } from "./form-fields";
import { REVIEW_SEARCH_PARAM } from "./search-params";

export function reviewUrl(params?: { prUrl?: string; runId?: string; error?: string }): string {
  return buildUrl("/review", {
    [REVIEW_FORM_FIELD.PrUrl]: params?.prUrl,
    [REVIEW_FORM_FIELD.RunId]: params?.runId,
    [REVIEW_SEARCH_PARAM.Error]: params?.error,
  });
}

export function reviewPublishedUrl(params: {
  prUrl: string;
  engineName: string;
  publishedThreads: number;
  skippedThreads: number;
  totalThreads: number;
}): string {
  return buildUrl("/review/published", {
    [REVIEW_FORM_FIELD.PrUrl]: params.prUrl,
    [REVIEW_FORM_FIELD.EngineName]: params.engineName,
    [REVIEW_SEARCH_PARAM.Published]: 1,
    [REVIEW_SEARCH_PARAM.PublishedThreads]: params.publishedThreads,
    [REVIEW_SEARCH_PARAM.SkippedThreads]: params.skippedThreads,
    [REVIEW_SEARCH_PARAM.TotalThreads]: params.totalThreads,
  });
}

export function reviewPublishErrorUrl(params: { prUrl?: string; correlationId: string }): string {
  return buildUrl("/review/published", {
    [REVIEW_FORM_FIELD.PrUrl]: params.prUrl,
    [REVIEW_FORM_FIELD.CorrelationId]: params.correlationId,
    [REVIEW_SEARCH_PARAM.PublishError]: 1,
  });
}
