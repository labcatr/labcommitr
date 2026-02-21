/**
 * Input Handler for Shortcuts
 *
 * Intercepts keyboard input to support single-character shortcuts.
 * Used as a utility by the custom UI select() prompt which has
 * native shortcut support built in.
 */

import type { ShortcutMapping } from "./types.js";
import { matchShortcut } from "./index.js";

/**
 * Check if a character input matches a shortcut
 *
 * @param input - Single character input
 * @param mapping - Shortcut mapping
 * @returns Option value if shortcut matches, null otherwise
 */
export function handleShortcutInput(
  input: string,
  mapping: ShortcutMapping | null,
): string | null {
  if (!mapping) {
    return null;
  }

  return matchShortcut(input, mapping);
}
