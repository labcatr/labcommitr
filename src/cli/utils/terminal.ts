/**
 * Terminal-width-aware utilities for CLI prompt formatting.
 *
 * Provides truncation functions to prevent @clack/prompts option labels
 * from wrapping past the terminal width, which breaks the left │ connector.
 */

import { stripVTControlCharacters } from "node:util";

/**
 * Get available width for prompt option text.
 * Accounts for @clack's prefix: "│  ● " (5 visible chars) + reserved right margin.
 */
export function getAvailableWidth(reservedRight: number = 0): number {
  const columns = process.stdout.columns || 80;
  const clackPrefix = 5; // "│  ● " or "│  ○ "
  return columns - clackPrefix - reservedRight;
}

/**
 * Truncate a string to fit terminal width, accounting for ANSI codes.
 * Strips ANSI for measurement, truncates visible text, preserves structure.
 */
export function truncateForPrompt(
  text: string,
  maxWidth: number,
): string {
  const visible = stripVTControlCharacters(text);
  if (visible.length <= maxWidth) return text;

  // For plain text (no ANSI), simple truncation
  if (visible.length === text.length) {
    return text.slice(0, maxWidth - 1) + "…";
  }

  // For text with ANSI codes, truncate the visible content
  // Walk through original string tracking visible character count
  let visibleCount = 0;
  let i = 0;
  const targetLength = maxWidth - 1; // Leave room for ellipsis

  while (i < text.length && visibleCount < targetLength) {
    // Detect CSI escape sequence: ESC[ <params> <final byte>
    // Final byte is any char in 0x40-0x7E range (A-Z, a-z, @, etc.)
    if (text[i] === "\x1b" && i + 1 < text.length && text[i + 1] === "[") {
      let j = i + 2;
      // Skip parameter and intermediate bytes (0x20-0x3F)
      while (
        j < text.length &&
        text.charCodeAt(j) >= 0x20 &&
        text.charCodeAt(j) <= 0x3f
      ) {
        j++;
      }
      // Skip the final byte (0x40-0x7E)
      if (j < text.length) j++;
      i = j;
      continue;
    }
    visibleCount++;
    i++;
  }

  return text.slice(0, i) + "…\x1b[0m";
}
