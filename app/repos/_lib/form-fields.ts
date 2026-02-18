/**
 * Form field name constants for the repos feature.
 *
 * Shared across the repos page, projects-and-repos, and repositories-list components.
 */
export const REPOS_FORM_FIELD = {
  Org: "org",
  Project: "project",
  Query: "q",
  Order: "order",
  HasRules: "hasRules",
} as const;

/**
 * Form field name constants for rule management (toggle, delete, create, edit).
 *
 * Shared across the rule management page, new rule page, edit rule page,
 * and the markdown-rule-editor component.
 */
export const RULE_FORM_FIELD = {
  Id: "id",
  Title: "title",
  Markdown: "markdown",
  Enabled: "enabled",
  SortOrder: "sortOrder",
} as const;
