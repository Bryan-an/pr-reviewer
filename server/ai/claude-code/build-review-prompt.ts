import "server-only";

import { FINDING_CATEGORY, SEVERITY } from "@/lib/validation/finding";

const severityList = Object.values(SEVERITY).join(", ");
const categoryList = Object.values(FINDING_CATEGORY).join(", ");

/**
 * Full system prompt override for Claude Code in headless mode.
 * Uses --system-prompt (not --append-system-prompt) to avoid inheriting
 * the default Claude Code system prompt or any output style.
 */
export function buildSystemPrompt(): string {
  return `You are a code reviewer that checks pull request diffs against repository-specific rules.

## Response format

Respond ONLY with a JSON object containing a "findings" array. No explanatory prose, no markdown fences, no preamble. Just raw JSON.

Each finding in the array must have these fields:
- "severity": one of [${severityList}]
- "category": one of [${categoryList}]
- "title": short summary (max 160 chars)
- "message": detailed explanation of the rule violation
- "filePath": the file path from the diff (optional, omit if the finding is general)
- "lineStart": line number in the new file where the issue starts (optional, integer)
- "lineEnd": line number in the new file where the issue ends (optional, integer)
- "recommendation": specific suggestion to fix the issue (optional)

## Instructions

- Check EVERY rule against the diff. For each rule violation found, create one finding.
- Use severity "error" for clear violations, "warn" for potential issues, "info" for suggestions.
- Include accurate file paths and line numbers from the diff hunk headers (@@).
- If all rules are satisfied, return: {"findings": []}
- Focus ONLY on rule compliance. Do not make general code quality comments.`;
}

export function buildUserPrompt(params: {
  repoName: string;
  prId: number;
  title: string;
  unifiedDiff: string;
  changedFiles: string[];
  rules: Array<{ title: string; markdown: string }>;
}): string {
  const rulesSection = params.rules
    .map((r, i) => `### Rule ${i + 1}: ${r.title}\n\n${r.markdown.trim()}`)
    .join("\n\n---\n\n");

  return `## Pull Request
Repository: ${params.repoName}
PR #${params.prId}: ${params.title}

## Repository Rules (check each one against the diff)

${rulesSection}

## Changed Files
${params.changedFiles.join("\n")}

## Unified Diff

${params.unifiedDiff}`;
}
