/**
 * UI Display Helpers
 *
 * Non-interactive output functions for sections, status lines,
 * dividers, and indented content. Replaces @clack log.info(),
 * log.message(), and renderWithConnector().
 */

import { label as renderLabel, spacing, symbols } from "./theme.js";
import { textColors, success as successColor } from "../commands/init/colors.js";
import type { LabelColor } from "./types.js";

/**
 * Display a section header: [label] message
 */
export function section(
  labelText: string,
  color: LabelColor,
  message: string,
): void {
  console.log(
    `${renderLabel(labelText, color)}  ${textColors.pureWhite(message)}`,
  );
}

/**
 * Status line helpers (indented with symbol prefix)
 */
export const status = {
  success: (msg: string) => {
    const indent = " ".repeat(spacing.optionIndent);
    console.log(`${indent}${successColor(symbols.check)} ${msg}`);
  },
  error: (msg: string) => {
    const indent = " ".repeat(spacing.optionIndent);
    console.log(
      `${indent}${textColors.gitDeleted(symbols.cross)} ${msg}`,
    );
  },
  info: (msg: string) => {
    const indent = " ".repeat(spacing.optionIndent);
    console.log(`${indent}${msg}`);
  },
} as const;

/**
 * Print a blank line
 */
export function blank(): void {
  console.log();
}

/**
 * Print an indented divider line
 */
export function divider(): void {
  const indent = " ".repeat(spacing.optionIndent);
  console.log(
    `${indent}${"─".repeat(45)}`,
  );
}

/**
 * Print content indented to option level (no connector prefix)
 */
export function indented(content: string): void {
  const indent = " ".repeat(spacing.optionIndent);
  console.log(`${indent}${content}`);
}

/**
 * Print multiple lines indented to option level
 */
export function block(lines: ReadonlyArray<string>): void {
  for (const l of lines) {
    indented(l);
  }
}
