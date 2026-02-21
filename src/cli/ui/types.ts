/**
 * UI Framework Types
 *
 * Interfaces and type definitions for the custom UI framework.
 * Zero dependencies on @clack/prompts.
 */

import type { ShortcutMapping } from "../../lib/shortcuts/types.js";

/**
 * Sentinel symbol for cancelled prompts.
 * Used the same way as @clack's cancel symbol.
 */
export const CANCEL_SYMBOL: unique symbol = Symbol("ui.cancel");

/**
 * Available label background colors
 */
export type LabelColor = "magenta" | "cyan" | "blue" | "yellow" | "green";

/**
 * Option for select/multiselect prompts
 */
export interface SelectOption<T> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Configuration for select prompt
 */
export interface SelectConfig<T> {
  label: string;
  labelColor: LabelColor;
  message: string;
  options: ReadonlyArray<SelectOption<T>>;
  initialValue?: T;
  shortcuts?: ShortcutMapping | null;
  /** Number of externally-written lines above this prompt to clear on submit */
  prefixLineCount?: number;
}

/**
 * Configuration for text input prompt
 */
export interface TextConfig {
  label: string;
  labelColor: LabelColor;
  message: string;
  placeholder?: string;
  initialValue?: string;
  validate?: (value: string) => string | undefined;
}

/**
 * Configuration for confirm prompt
 */
export interface ConfirmConfig {
  label: string;
  labelColor: LabelColor;
  message: string;
  initialValue?: boolean;
}

/**
 * Configuration for multiselect prompt
 */
export interface MultiselectConfig<T> {
  label: string;
  labelColor: LabelColor;
  message: string;
  options: ReadonlyArray<SelectOption<T>>;
  required?: boolean;
}

export type { ShortcutMapping };
