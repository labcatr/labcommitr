/**
 * Input Handler for Shortcuts
 *
 * Intercepts keyboard input to support single-character shortcuts
 * before passing to @clack/prompts select() function.
 *
 * Note: This is a simplified implementation. Full input interception
 * would require deeper integration with @clack/prompts internals.
 * For now, shortcuts are displayed in labels and users can type
 * the letter to match (if @clack/prompts supports it) or use arrow keys.
 */

import type { ShortcutMapping } from "./types.js";
import { matchShortcut } from "./index.js";

/**
 * Check if a character input matches a shortcut
 * This can be used to pre-process input before it reaches @clack/prompts
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

/**
 * Note: Full input interception would require:
 * 1. Setting up raw mode on stdin
 * 2. Listening to keypress events
 * 3. Intercepting before @clack/prompts processes input
 * 4. Programmatically selecting the matched option
 *
 * This is complex and may conflict with @clack/prompts' internal handling.
 * For v1, we display shortcuts in labels and rely on @clack/prompts'
 * native behavior (if it supports typing to select) or arrow keys.
 *
 * Future enhancement: Implement full input interception wrapper.
 */

