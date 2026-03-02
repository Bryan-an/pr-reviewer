import { z } from "zod";

/**
 * Client-side form schema for the rule editor (create + edit).
 *
 * `sortOrder` is kept as a string because the `<Input>` always yields a string.
 * The refine validates it represents a non-negative integer.
 * Conversion to number happens in the submit handler when building FormData.
 */
export const ruleFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  markdown: z.string().trim().min(1, "Markdown content is required."),
  sortOrder: z.string().refine(
    (v) => {
      const trimmed = v.trim();
      if (trimmed === "") return true;
      const n = Number(trimmed);
      return Number.isFinite(n) && Number.isInteger(n) && n >= 0;
    },
    { message: "Order must be a non-negative integer." },
  ),
  enabled: z.boolean(),
});

export type RuleFormValues = z.infer<typeof ruleFormSchema>;
