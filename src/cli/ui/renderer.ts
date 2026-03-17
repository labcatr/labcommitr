/**
 * Terminal Renderer
 *
 * Low-level terminal primitives: cursor control, raw mode management,
 * and ANSI escape helpers. Built on Node.js readline (no dependencies).
 */

import { stripVTControlCharacters } from "node:util";

/**
 * ANSI cursor control sequences
 */
export const cursor = {
  hide: () => process.stdout.write("\x1b[?25l"),
  show: () => process.stdout.write("\x1b[?25h"),
  moveUp: (n: number) => {
    if (n > 0) process.stdout.write(`\x1b[${n}A`);
  },
  moveDown: (n: number) => {
    if (n > 0) process.stdout.write(`\x1b[${n}B`);
  },
  moveToColumn: (col: number) => process.stdout.write(`\x1b[${col}G`),
  saveCursor: () => process.stdout.write("\x1b7"),
  restoreCursor: () => process.stdout.write("\x1b8"),
} as const;

/**
 * Line clearing utilities
 */
export const line = {
  /** Clear the current line entirely */
  clear: () => process.stdout.write("\x1b[2K\r"),
  /** Clear N lines moving upward from current position */
  clearLines: (count: number) => {
    for (let i = 0; i < count; i++) {
      process.stdout.write("\x1b[2K"); // clear line
      if (i < count - 1) {
        process.stdout.write("\x1b[1A"); // move up
      }
    }
    process.stdout.write("\r"); // return to start
  },
} as const;

/**
 * Check if both stdout and stdin are TTY
 */
export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY && process.stdin.isTTY);
}

/**
 * Get terminal width, falling back to 80 columns
 */
export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

/**
 * Dim text (ANSI dim)
 */
export function dim(text: string): string {
  return `\x1b[2m${text}\x1b[22m`;
}

/**
 * Bright cyan text
 */
export function brightCyan(text: string): string {
  return `\x1b[38;5;51m${text}\x1b[0m`;
}

/**
 * Enter raw mode for keyboard input.
 * Returns a cleanup function that restores previous state.
 *
 * Follows the same pattern as preview/prompts.ts:
 * checks stdin.isRaw before toggling.
 */
export function enterRawMode(): { cleanup: () => void } {
  const stdin = process.stdin;
  const wasRaw = stdin.isRaw;

  if (!wasRaw) {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
  }

  // SIGINT handler for clean exit during raw mode
  const sigintHandler = () => {
    cursor.show();
    if (!wasRaw) {
      stdin.setRawMode(false);
      stdin.pause();
    }
    process.exit(130);
  };
  process.on("SIGINT", sigintHandler);

  const cleanup = () => {
    process.removeListener("SIGINT", sigintHandler);
    cursor.show();
    if (!wasRaw) {
      stdin.setRawMode(false);
      stdin.pause();
    }
  };

  return { cleanup };
}

/**
 * Count the number of physical terminal lines a string occupies,
 * accounting for line wrapping at terminal width.
 *
 * A logical line that exceeds the terminal width wraps onto additional
 * physical lines. This function computes the true physical count by
 * measuring each logical line's visible width (stripping ANSI codes)
 * and dividing by the terminal column count.
 */
export function countPhysicalLines(
  content: string,
  columns?: number,
): number {
  const cols = columns ?? (process.stdout.columns || 80);
  return content.split("\n").reduce((total, logicalLine) => {
    const visibleLength = stripVTControlCharacters(logicalLine).length;
    return total + Math.max(1, Math.ceil(visibleLength / cols));
  }, 0);
}
