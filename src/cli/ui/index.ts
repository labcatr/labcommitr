/**
 * UI Framework - Barrel Export
 *
 * Custom, zero-dependency UI framework built on Node.js readline.
 * Replaces @clack/prompts entirely.
 *
 * Usage:
 *   import { ui } from '../../ui/index.js';
 *   const val = await ui.select({ label: 'type', labelColor: 'magenta', ... });
 *   if (ui.isCancel(val)) process.exit(0);
 */

import { CANCEL_SYMBOL } from "./types.js";
import { select, text, confirm, multiselect } from "./prompts.js";
import { section, status, blank, divider, indented, block } from "./display.js";
import { label } from "./theme.js";

export { CANCEL_SYMBOL } from "./types.js";
export type {
  LabelColor,
  SelectOption,
  SelectConfig,
  TextConfig,
  ConfirmConfig,
  MultiselectConfig,
} from "./types.js";
export { label } from "./theme.js";
export { select, text, confirm, multiselect } from "./prompts.js";
export { section, status, blank, divider, indented, block } from "./display.js";

/**
 * Check if a value is the cancel symbol
 */
export function isCancel(value: unknown): value is typeof CANCEL_SYMBOL {
  return value === CANCEL_SYMBOL;
}

/**
 * Unified ui namespace for convenient imports
 */
export const ui = {
  select,
  text,
  confirm,
  multiselect,
  section,
  status,
  blank,
  divider,
  indented,
  block,
  label,
  isCancel,
} as const;
