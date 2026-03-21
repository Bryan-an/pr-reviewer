import { z } from "zod";

/**
 * Client-side form schema for the rule editor (create + edit).
 *
 * `sortOrder` is kept as a string because the `<Input>` always yields a string.
 * The input filters non-digit characters via onChange, so the value is always
 * digits-only or empty. Conversion to number happens in the submit handler.
 */
export const ruleFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  markdown: z.string().trim().min(1, "Markdown content is required."),
  sortOrder: z.string().regex(/^\d*$/, "Order must be a non-negative integer."),
  enabled: z.boolean(),
});

export type RuleFormValues = z.infer<typeof ruleFormSchema>;
