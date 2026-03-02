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
