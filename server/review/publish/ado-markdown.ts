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

export function adoHr(): string {
  return "\n\n---\n\n";
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

/**
 * Join lines with Markdown hard-breaks.
 *
 * Empty-string lines become paragraph breaks (blank line).
 */
export function adoJoinLines(lines: string[]): string {
  const out: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const next = i + 1 < lines.length ? lines[i + 1] : undefined;

    if (line === "") {
      // Blank line (paragraph break)
      out.push("\n");
      continue;
    }

    out.push(line);

    if (next === undefined) continue;

    if (next === "") {
      out.push("\n");
      continue;
    }

    // Hard break: two spaces before newline.
    out.push("  \n");
  }

  return out.join("");
}
