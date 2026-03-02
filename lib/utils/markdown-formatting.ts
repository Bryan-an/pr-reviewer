export type SelectionRange = {
  start: number;
  end: number;
};

export type FormatResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

/**
 * Wraps the selection with inline markers (e.g. `**` for bold, `_` for italic).
 * Toggles off if the selection is already wrapped. Inserts a placeholder if
 * nothing is selected.
 */
export function applyInlineFormat(
  value: string,
  selection: SelectionRange,
  marker: string,
  placeholder: string,
): FormatResult {
  const { start, end } = selection;
  const len = marker.length;
  const selected = value.slice(start, end);
  const before = value.slice(Math.max(0, start - len), start);
  const after = value.slice(end, end + len);

  if (before === marker && after === marker) {
    return {
      value: value.slice(0, start - len) + selected + value.slice(end + len),
      selectionStart: start - len,
      selectionEnd: end - len,
    };
  }

  if (selected) {
    return {
      value: value.slice(0, start) + marker + selected + marker + value.slice(end),
      selectionStart: start + len,
      selectionEnd: end + len,
    };
  }

  return {
    value: value.slice(0, start) + marker + placeholder + marker + value.slice(end),
    selectionStart: start + len,
    selectionEnd: start + len + placeholder.length,
  };
}

/**
 * Toggles a line prefix (e.g. `## ` for heading, `- ` for list).
 * Removes the prefix if the current line already starts with it.
 */
export function applyLinePrefix(
  value: string,
  selection: SelectionRange,
  prefix: string,
): FormatResult {
  const { start, end } = selection;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;

  if (value.slice(lineStart).startsWith(prefix)) {
    const shift = prefix.length;

    return {
      value: value.slice(0, lineStart) + value.slice(lineStart + shift),
      selectionStart: Math.max(start - shift, lineStart),
      selectionEnd: Math.max(end - shift, lineStart),
    };
  }

  return {
    value: value.slice(0, lineStart) + prefix + value.slice(lineStart),
    selectionStart: start + prefix.length,
    selectionEnd: end + prefix.length,
  };
}

/**
 * Wraps content in a fenced code block. Selects the content inside the fences.
 */
export function applyCodeBlock(value: string, selection: SelectionRange): FormatResult {
  const { start, end } = selection;
  const selected = value.slice(start, end);
  const placeholder = "code";
  const content = selected || placeholder;
  const before = "```\n";
  const after = "\n```";
  const newValue = value.slice(0, start) + before + content + after + value.slice(end);

  return {
    value: newValue,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + content.length,
  };
}

/**
 * Inserts a markdown link. Places cursor on "url" so the user can type the URL.
 */
export function applyLink(value: string, selection: SelectionRange): FormatResult {
  const { start, end } = selection;
  const selected = value.slice(start, end);
  const linkText = selected || "link text";
  const url = "url";
  const insertion = `[${linkText}](${url})`;
  const newValue = value.slice(0, start) + insertion + value.slice(end);

  const urlStart = start + 1 + linkText.length + 2;

  return {
    value: newValue,
    selectionStart: urlStart,
    selectionEnd: urlStart + url.length,
  };
}

// ---------------------------------------------------------------------------
// List continuation & indentation
// ---------------------------------------------------------------------------

export const INDENT_DIRECTION = { Indent: "indent", Outdent: "outdent" } as const;
export type IndentDirection = (typeof INDENT_DIRECTION)[keyof typeof INDENT_DIRECTION];

const BULLET_RE = /^(\s*)([-*+])\s/;
const ORDERED_RE = /^(\s*)(\d+)\.\s/;

/** Removes an empty list item and its trailing newline (if any). */
function exitList(
  value: string,
  lineStart: number,
  lineEnd: number,
  fullLineEnd: number,
): FormatResult {
  // Consume the trailing newline so a mid-list removal doesn't leave a blank line
  const removeEnd = lineEnd !== -1 ? fullLineEnd + 1 : fullLineEnd;

  return {
    value: value.slice(0, lineStart) + value.slice(removeEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart,
  };
}

/**
 * Handles Enter inside a list item. Returns `null` when the cursor is not on a
 * list line so the caller can fall through to default Enter behaviour.
 *
 * Behaviours:
 * - **Empty item** (just the prefix, no content): removes the prefix and exits
 *   the list — no new line is inserted.
 * - **Content item**: inserts a newline followed by the same prefix (bullet) or
 *   the next number (ordered list). Content after the cursor moves to the new
 *   item.
 */
export function handleListContinuation(
  value: string,
  selection: SelectionRange,
): FormatResult | null {
  // Only act on a collapsed cursor (no selection)
  if (selection.start !== selection.end) return null;

  const pos = selection.start;
  const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
  const lineEnd = value.indexOf("\n", pos);
  const fullLineEnd = lineEnd === -1 ? value.length : lineEnd;
  const line = value.slice(lineStart, fullLineEnd);

  // --- Bullet lists (-, *, +) ---
  const bulletMatch = line.match(BULLET_RE);

  if (bulletMatch) {
    const [fullPrefix, indent, marker] = bulletMatch;

    if (line.slice(fullPrefix.length).trim() === "") {
      return exitList(value, lineStart, lineEnd, fullLineEnd);
    }

    const insertion = `\n${indent}${marker} `;

    return {
      value: value.slice(0, pos) + insertion + value.slice(pos),
      selectionStart: pos + insertion.length,
      selectionEnd: pos + insertion.length,
    };
  }

  // --- Ordered lists (1. 2. 3. …) ---
  const orderedMatch = line.match(ORDERED_RE);

  if (orderedMatch) {
    const [fullPrefix, indent, numStr] = orderedMatch;

    if (line.slice(fullPrefix.length).trim() === "") {
      return exitList(value, lineStart, lineEnd, fullLineEnd);
    }

    const nextNum = parseInt(numStr, 10) + 1;
    const insertion = `\n${indent}${nextNum}. `;

    return {
      value: value.slice(0, pos) + insertion + value.slice(pos),
      selectionStart: pos + insertion.length,
      selectionEnd: pos + insertion.length,
    };
  }

  return null;
}

/**
 * Indents or outdents a list item by 2 spaces. Returns `null` when the current
 * line is not a list item so the caller can fall through to default Tab
 * behaviour.
 */
export function handleListIndent(
  value: string,
  selection: SelectionRange,
  direction: IndentDirection,
): FormatResult | null {
  const { start, end } = selection;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const line = value.slice(lineStart);

  const isList = BULLET_RE.test(line) || ORDERED_RE.test(line);
  if (!isList) return null;

  if (direction === INDENT_DIRECTION.Indent) {
    const indent = "  ";

    return {
      value: value.slice(0, lineStart) + indent + value.slice(lineStart),
      selectionStart: start + indent.length,
      selectionEnd: end + indent.length,
    };
  }

  // Outdent — remove up to 2 leading spaces
  const leadingSpaces = line.match(/^(\s*)/)?.[1] ?? "";
  const removeCount = Math.min(2, leadingSpaces.length);
  if (removeCount === 0) return null;

  return {
    value: value.slice(0, lineStart) + value.slice(lineStart + removeCount),
    selectionStart: Math.max(start - removeCount, lineStart),
    selectionEnd: Math.max(end - removeCount, lineStart),
  };
}
