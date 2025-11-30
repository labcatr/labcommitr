/**
 * Auto-Assignment Algorithm
 *
 * Automatically assigns keyboard shortcuts to prompt options when not configured.
 * Uses first available letter from option value, skipping already-used keys.
 */

import type { ShortcutMapping } from "./types.js";
import { DEFAULT_CHAR_SET } from "./types.js";

/**
 * Auto-assign shortcuts to options
 *
 * @param options - Array of prompt options
 * @param configuredMappings - User-configured shortcut mappings
 * @returns Complete shortcut mapping (configured + auto-assigned)
 */
export function autoAssignShortcuts(
  options: Array<{ value: string; label: string }>,
  configuredMappings: Record<string, string>,
): ShortcutMapping {
  const keyToValue: Record<string, string> = {};
  const valueToKey: Record<string, string> = {};
  const usedKeys = new Set<string>();

  // Step 1: Process configured mappings
  for (const [key, value] of Object.entries(configuredMappings)) {
    const normalizedKey = key.toLowerCase();
    const optionExists = options.some((opt) => opt.value === value);

    if (optionExists) {
      keyToValue[normalizedKey] = value;
      valueToKey[value] = normalizedKey;
      usedKeys.add(normalizedKey);
    }
    // If option doesn't exist, skip (warning logged during config validation)
  }

  // Step 2: Find unassigned options
  const unassignedOptions = options.filter((opt) => !valueToKey[opt.value]);

  // Step 3: Auto-assign unassigned options
  for (const option of unassignedOptions) {
    const shortcut = findAvailableShortcut(option.value, usedKeys);
    if (shortcut) {
      keyToValue[shortcut] = option.value;
      valueToKey[option.value] = shortcut;
      usedKeys.add(shortcut);
    }
    // If no shortcut found, option works with arrow keys only
  }

  return { keyToValue, valueToKey };
}

/**
 * Find first available shortcut for an option value
 *
 * Searches through the option value's characters to find the first
 * available letter that isn't already used as a shortcut.
 *
 * @param value - Option value to find shortcut for
 * @param usedKeys - Set of already-used shortcut keys
 * @returns Available shortcut key or null if none found
 */
function findAvailableShortcut(
  value: string,
  usedKeys: Set<string>,
): string | null {
  const normalized = value.toLowerCase();
  const allowedChars = DEFAULT_CHAR_SET.allowedChars;

  // Try each character in the option value
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    // Only consider allowed characters (letters by default)
    if (allowedChars.includes(char) && !usedKeys.has(char)) {
      return char;
    }
  }

  return null; // No available shortcut
}

