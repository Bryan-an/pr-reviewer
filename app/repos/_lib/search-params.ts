/**
 * Search parameter key constants specific to the repos feature.
 *
 * For keys shared with form fields (org, project, q, order, hasRules),
 * use REPOS_FORM_FIELD from "./form-fields" instead.
 */
export const REPOS_SEARCH_PARAM = {
  Sort: "sort",
  Page: "page",
} as const;

/**
 * Search parameter key constants for rule management pages.
 */
export const RULE_SEARCH_PARAM = {
  Error: "error",
  From: "from",
} as const;
