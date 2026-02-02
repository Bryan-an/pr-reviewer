import { z } from "zod";

export const reviewRequestSchema = z.object({
  prUrl: z.string().min(1),
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
