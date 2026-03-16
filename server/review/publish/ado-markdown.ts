import "server-only";

/**
 * Azure DevOps PR comments support a Markdown-like renderer, but single newlines
 * inside paragraphs often collapse into spaces.
 *
 * This helper provides "hard line breaks" using two trailing spaces before '\n'
 * so multi-line content stays readable in PR threads.
 */
export function adoInlineCode(value: string): string {
  const text = value.trim();
  if (text === "") return "``";

  const matches = text.match(/`+/g) ?? [];
  const longestRun = matches.reduce((max, run) => Math.max(max, run.length), 0);
  const fence = "`".repeat(longestRun + 1);
  return `${fence}${text}${fence}`;
}

export function adoBold(value: string): string {
  return `**${value}**`;
}

/**
 * Wrap text in a fenced code block, using a fence long enough to avoid
 * conflicts with backtick runs inside the content (mirrors `adoInlineCode`).
 */
export function adoFencedBlock(text: string): string {
  const matches = text.match(/`+/g) ?? [];
  const longestRun = matches.reduce((max, run) => Math.max(max, run.length), 0);
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}\n${text}\n${fence}`;
}

export function adoNormalizeNewlines(text: string): string[] {
  return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
}

/**
 * Wrap lines in a Markdown blockquote.
 *
 * - Non-empty lines are prefixed with `> `.
 * - Empty lines become `>` to preserve paragraph breaks.
 */
export function adoBlockquote(lines: string[]): string {
  return lines
    .map((line) => {
      if (line === "") return ">";
      return `> ${line}`;
    })
    .join("\n");
}
