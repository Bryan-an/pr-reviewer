/**
 * Sort field and order value constants for the repos feature.
 *
 * Shared across the repos page, repositories-list, and repos-filter-form components.
 */

export const REPOS_SORT_FIELD = {
  Name: "name",
} as const;

export type ReposSortField = (typeof REPOS_SORT_FIELD)[keyof typeof REPOS_SORT_FIELD];

export const REPOS_SORT_ORDER = {
  Asc: "asc",
  Desc: "desc",
} as const;

export type ReposSortOrder = (typeof REPOS_SORT_ORDER)[keyof typeof REPOS_SORT_ORDER];
