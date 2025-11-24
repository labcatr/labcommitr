/**
 * Shortcuts Module
 *
 * Handles keyboard shortcut configuration, auto-assignment, and integration
 * with @clack/prompts select() function.
 */

import type { ShortcutMapping, ShortcutCharacterSet } from "./types.js";
import { autoAssignShortcuts } from "./auto-assign.js";
import { DEFAULT_CHAR_SET } from "./types.js";

/**
 * Shortcuts configuration from user config
 * This is a subset of the full ShortcutsConfig interface
 */
export interface ShortcutsConfigInput {
  enabled?: boolean;
  display_hints?: boolean;
  prompts?: {
    type?: {
      mapping?: Record<string, string>;
    };
    preview?: {
      mapping?: Record<string, string>;
    };
    body?: {
      mapping?: Record<string, string>;
    };
  };
}

/**
 * Process shortcuts configuration for a prompt
 *
 * @param config - Shortcuts configuration from user config
 * @param promptName - Name of prompt ("type", "preview", "body")
 * @param options - Array of prompt options
 * @returns Shortcut mapping or null if shortcuts disabled
 */
export function processShortcuts(
  config: ShortcutsConfigInput | undefined,
  promptName: "type" | "preview" | "body",
  options: Array<{ value: string; label: string }>,
): ShortcutMapping | null {
  // Shortcuts disabled or not configured
  if (!config || !config.enabled) {
    return null;
  }

  // Get configured mappings for this prompt
  const promptConfig = config.prompts?.[promptName];
  const configuredMappings = promptConfig?.mapping || {};

  // Auto-assign missing shortcuts
  const mapping = autoAssignShortcuts(options, configuredMappings);

  return mapping;
}

/**
 * Format option label with shortcut hint
 *
 * @param label - Original option label
 * @param shortcut - Shortcut key (if available)
 * @param displayHints - Whether to show hints
 * @returns Formatted label with shortcut
 */
export function formatLabelWithShortcut(
  label: string,
  shortcut: string | undefined,
  displayHints: boolean,
): string {
  if (!shortcut || !displayHints) {
    return label;
  }
  return `[${shortcut}] ${label}`;
}

/**
 * Check if input matches a shortcut and return corresponding value
 *
 * @param input - User input (single character)
 * @param mapping - Shortcut mapping
 * @returns Option value if match found, null otherwise
 */
export function matchShortcut(
  input: string,
  mapping: ShortcutMapping | null,
): string | null {
  if (!mapping) {
    return null;
  }

  const normalizedInput = input.toLowerCase();
  return mapping.keyToValue[normalizedInput] || null;
}

/**
 * Get shortcut key for an option value
 *
 * @param value - Option value
 * @param mapping - Shortcut mapping
 * @returns Shortcut key if available, undefined otherwise
 */
export function getShortcutForValue(
  value: string,
  mapping: ShortcutMapping | null,
): string | undefined {
  if (!mapping) {
    return undefined;
  }
  return mapping.valueToKey[value];
}

