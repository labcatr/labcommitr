/**
 * Shortcuts Module Types
 *
 * TypeScript interfaces for keyboard shortcuts functionality
 */

/**
 * Shortcut mapping structure
 * Provides bidirectional lookup between shortcut keys and option values
 */
export interface ShortcutMapping {
  /** Map of shortcut key → option value */
  keyToValue: Record<string, string>;
  /** Map of option value → shortcut key */
  valueToKey: Record<string, string>;
}

/**
 * Character set configuration for shortcuts
 * Supports future extensions (e.g., numeric shortcuts)
 */
export interface ShortcutCharacterSet {
  /** Characters available for shortcuts (default: a-z) */
  allowedChars: string[];
  /** Priority order for character selection */
  priority: "first" | "last" | "custom";
}

/**
 * Default character set (letters only)
 * Future: Can be extended to include digits 0-9
 */
export const DEFAULT_CHAR_SET: ShortcutCharacterSet = {
  allowedChars: "abcdefghijklmnopqrstuvwxyz".split(""),
  priority: "first",
};

