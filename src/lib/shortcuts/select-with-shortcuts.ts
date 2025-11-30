/**
 * Select with Shortcuts Support
 *
 * Wraps @clack/prompts select() with keyboard shortcut support.
 * Intercepts single-character input to match shortcuts before
 * passing control to @clack/prompts.
 *
 * Note: This implementation uses a workaround since @clack/prompts
 * doesn't natively support shortcuts. We intercept keypress events
 * and programmatically select the option if a shortcut matches.
 */

import { select, type SelectOptions } from "@clack/prompts";
import type { ShortcutMapping } from "./types.js";
import { matchShortcut } from "./index.js";
import readline from "readline";

/**
 * Select with shortcut support
 *
 * Wraps @clack/prompts select() with custom input handling for shortcuts.
 * If a shortcut key is pressed, immediately selects that option.
 * Otherwise, passes input to @clack/prompts for normal handling.
 *
 * @param options - Select options from @clack/prompts
 * @param shortcutMapping - Shortcut mapping (null if shortcuts disabled)
 * @returns Selected value or symbol (cancel)
 */
export async function selectWithShortcuts<T extends string>(
  options: SelectOptions<T>,
  shortcutMapping: ShortcutMapping | null,
): Promise<T | symbol> {
  // If no shortcuts, use normal select
  if (!shortcutMapping) {
    return await select(options);
  }

  // Set up input interception using readline
  const stdin = process.stdin;
  const wasRaw = stdin.isRaw;

  // Enable raw mode and keypress events
  if (!wasRaw) {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
  }

  readline.emitKeypressEvents(stdin);

  // Create promise that resolves when shortcut is pressed or select completes
  return new Promise((resolve) => {
    let shortcutResolved = false;
    let selectResolved = false;

    // Keypress handler for shortcuts
    const onKeypress = (char: string, key: readline.Key) => {
      // Ignore if already resolved
      if (shortcutResolved || selectResolved) {
        return;
      }

      // Check for escape (cancel) - let @clack/prompts handle it
      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        return; // Let @clack/prompts handle cancellation
      }

      // Check for Enter - let @clack/prompts handle it
      if (key.name === "return" || key.name === "enter") {
        return;
      }

      // Check for arrow keys - let @clack/prompts handle them
      if (
        key.name === "up" ||
        key.name === "down" ||
        key.name === "left" ||
        key.name === "right"
      ) {
        return;
      }

      // Check if single character matches a shortcut
      if (char && char.length === 1 && /^[a-z]$/i.test(char)) {
        const matchedValue = matchShortcut(char, shortcutMapping);
        if (matchedValue) {
          shortcutResolved = true;
          cleanup();
          // Resolve with the matched value
          resolve(matchedValue as T);
          return;
        }
      }
    };

    // Cleanup function
    const cleanup = () => {
      stdin.removeListener("keypress", onKeypress);
      if (!wasRaw) {
        stdin.setRawMode(false);
        stdin.pause();
      }
    };

    // Set up keypress listener BEFORE starting select
    stdin.on("keypress", onKeypress);

    // Start normal select prompt
    // Our listener will intercept shortcuts, but @clack/prompts
    // will handle everything else (arrows, Enter, etc.)
    select(options)
      .then((result) => {
        if (!shortcutResolved) {
          selectResolved = true;
          cleanup();
          resolve(result);
        }
      })
      .catch((error) => {
        if (!shortcutResolved) {
          selectResolved = true;
          cleanup();
          // On error, treat as cancel
          resolve(Symbol.for("clack.cancel"));
        }
      });
  });
}
