/**
 * Default configuration values for labcommitr
 *
 * This module provides sensible default values for all optional configuration fields,
 * ensuring the tool works out-of-the-box without requiring any configuration.
 * These defaults are merged with user-provided configuration to create the final config.
 */

import type { LabcommitrConfig, RawConfig } from "./types.js";

/**
 * Complete default configuration object
 *
 * This serves as the baseline configuration when no user config is provided.
 * All fields are populated with sensible defaults that provide a good starting point.
 *
 * Note: The 'types' array is intentionally empty here as it must be provided by the user
 * or through preset initialization. This ensures users consciously choose their commit types.
 */
export const DEFAULT_CONFIG: LabcommitrConfig = {
  /** Default schema version for new configurations */
  version: "1.0",

  /** Basic configuration with emoji enabled by default */
  config: {
    // Enable emoji mode with automatic terminal detection
    emoji_enabled: true,
    // Let the system auto-detect emoji support (null = auto-detect)
    force_emoji_detection: null,
  },

  /** Standard commit message format following conventional commits */
  format: {
    // Template supports both emoji and text modes through variable substitution
    template: "{emoji}{type}({scope}): {subject}",
    // Standard 50-character limit for commit subjects (git best practice)
    subject_max_length: 50,
  },

  /** Empty types array - must be provided by user or preset */
  types: [],

  /** Minimal validation rules - not overly restrictive by default */
  validation: {
    // No types require scope by default (user can enable per project)
    require_scope_for: [],
    // Any scope is allowed by default (empty = unrestricted)
    allowed_scopes: [],
    // Minimum 3-character subject to prevent overly brief commits
    subject_min_length: 3,
    // No prohibited words by default (user can customize)
    prohibited_words: [],
  },

  /** Conservative advanced settings - minimal automation by default */
  advanced: {
    // No aliases by default (user can add custom shortcuts)
    aliases: {},
    // Git integration disabled by default for safety
    git: {
      // Don't auto-stage changes (user maintains control)
      auto_stage: false,
      // Don't auto-sign commits (user configures as needed)
      sign_commits: false,
    },
  },
};

/**
 * Standard commit types for reference and preset initialization
 *
 * These represent a curated set of commit types following conventional commits
 * and common industry practices. They are used in presets but not automatically
 * merged with user configuration - user must explicitly choose their types.
 */
export const DEFAULT_COMMIT_TYPES = [
  {
    id: "feat",
    description: "A new feature for the user",
    emoji: "✨",
  },
  {
    id: "fix",
    description: "A bug fix for the user",
    emoji: "🐛",
  },
  {
    id: "docs",
    description: "Documentation changes",
    emoji: "📚",
  },
  {
    id: "style",
    description: "Code style changes (formatting, missing semicolons, etc.)",
    emoji: "💄",
  },
  {
    id: "refactor",
    description: "Code refactoring without changing functionality",
    emoji: "♻️",
  },
  {
    id: "test",
    description: "Adding or updating tests",
    emoji: "🧪",
  },
  {
    id: "chore",
    description: "Maintenance tasks, build changes, etc.",
    emoji: "🔧",
  },
];

/**
 * Merges user-provided raw configuration with default values
 *
 * This function implements the "defaults filling" logic where user-provided
 * values take precedence over defaults, but missing fields are filled in
 * with sensible defaults.
 *
 * @param rawConfig - User-provided configuration (potentially incomplete)
 * @returns Complete configuration with all fields populated
 */
export function mergeWithDefaults(rawConfig: RawConfig): LabcommitrConfig {
  // Create a deep copy of defaults to avoid mutation
  const merged: LabcommitrConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  // Apply user-provided values, preserving the types array
  merged.version = rawConfig.version ?? merged.version;
  merged.types = rawConfig.types; // Required field, always from user

  // Merge nested objects while preserving user preferences
  if (rawConfig.config) {
    merged.config = { ...merged.config, ...rawConfig.config };
  }

  if (rawConfig.format) {
    merged.format = { ...merged.format, ...rawConfig.format };
  }

  if (rawConfig.validation) {
    merged.validation = { ...merged.validation, ...rawConfig.validation };
  }

  if (rawConfig.advanced) {
    merged.advanced = { ...merged.advanced, ...rawConfig.advanced };

    // Handle nested git configuration
    if (rawConfig.advanced.git) {
      merged.advanced.git = {
        ...merged.advanced.git,
        ...rawConfig.advanced.git,
      };
    }
  }

  return merged;
}

/**
 * Creates a complete default configuration when no user config exists
 *
 * This is used as a fallback when no configuration file can be found
 * and the user chooses not to initialize one. Provides a minimal but
 * functional configuration using the standard commit types.
 *
 * @returns Complete default configuration ready for use
 */
export function createFallbackConfig(): LabcommitrConfig {
  return mergeWithDefaults({
    types: DEFAULT_COMMIT_TYPES,
  });
}
