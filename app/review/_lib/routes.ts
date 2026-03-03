import { buildUrl } from "@/lib/utils/url";
import { REVIEW_FORM_FIELD } from "./form-fields";

export function reviewUrl(params?: { prUrl?: string; runId?: string }): string {
  return buildUrl("/review", {
    [REVIEW_FORM_FIELD.PrUrl]: params?.prUrl,
    [REVIEW_FORM_FIELD.RunId]: params?.runId,
  });
}
