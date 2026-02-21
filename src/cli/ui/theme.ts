/**
 * UI Theme
 *
 * Design tokens and consolidated label function.
 * Single source of truth for visual constants used across all commands.
 */

import { labelColors } from "../commands/init/colors.js";
import type { LabelColor } from "./types.js";

/**
 * Unicode symbols used in prompts and display
 */
export const symbols = {
  pointer: ">",
  check: "\u2714", // checkmark
  cross: "\u2718", // X
  bullet: "\u25CF", // filled circle
  circle: "\u25CB", // empty circle
} as const;

/**
 * Spacing constants for consistent alignment
 */
export const spacing = {
  /** Width of the label text area (centered within this) */
  labelWidth: 7,
  /** Gap between label and content */
  labelGap: 2,
  /** Total indent for option lines (label outer width + gap) */
  optionIndent: 11,
} as const;

/**
 * Create a compact, color-coded label.
 * Text is centered within a fixed-width badge.
 *
 * Consolidates the identical `label()` function previously
 * duplicated in init, commit, revert, and preview prompts.
 */
export function label(text: string, color: LabelColor): string {
  const colorFn: Record<LabelColor, (s: string) => string> = {
    magenta: labelColors.bgBrightMagenta,
    cyan: labelColors.bgBrightCyan,
    blue: labelColors.bgBrightBlue,
    yellow: labelColors.bgBrightYellow,
    green: labelColors.bgBrightGreen,
  };

  const width = spacing.labelWidth;
  const textLength = Math.min(text.length, width);
  const padding = width - textLength;
  // Odd padding: extra space on LEFT for better visual weight
  const leftPad = Math.ceil(padding / 2);
  const rightPad = padding - leftPad;
  const centeredText =
    " ".repeat(leftPad) + text.substring(0, textLength) + " ".repeat(rightPad);

  return colorFn[color](` ${centeredText} `);
}
