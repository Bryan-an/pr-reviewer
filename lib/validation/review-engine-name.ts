export const REVIEW_ENGINE = {
  Coderabbit: "coderabbit",
  ClaudeCode: "claude-code",
  Stub: "stub",
} as const;

export type ReviewEngineName = (typeof REVIEW_ENGINE)[keyof typeof REVIEW_ENGINE];

export const reviewEngineNameValues = [
  REVIEW_ENGINE.Coderabbit,
  REVIEW_ENGINE.ClaudeCode,
  REVIEW_ENGINE.Stub,
] as const;
