/**
 * Maps rule form error codes (from the `?error=` search param) to
 * user-facing banner messages.
 *
 * Shared between the new-rule and edit-rule pages.
 */
const RULE_ERROR_MESSAGE: Record<string, string> = {
  title: "Please provide a title for this rule.",
  markdown: "Please provide markdown content for this rule.",
  sortOrder: "Order must be a non-negative integer.",
};

export function getRuleErrorBannerMessage(errorCode: string | undefined): string | undefined {
  if (!errorCode) return undefined;
  return RULE_ERROR_MESSAGE[errorCode];
}
