/**
 * Preset System
 *
 * Provides pre-configured commit convention templates that can be
 * used to quickly initialize project configuration. Each preset
 * includes commit types, format settings, and sensible defaults.
 *
 * Presets available:
 * - Conventional: Industry-standard semantic commit format
 * - Gitmoji: Visual emoji-based commit types
 * - Angular: Strict format used in Angular projects
 * - Minimal: Basic setup for custom configuration
 */

import type { LabcommitrConfig } from "../config/types.js";

/**
 * Preset definition interface
 * Defines structure and defaults for a commit convention
 */
export interface Preset {
  id: string;
  name: string;
  description: string;
  defaults: {
    emoji_enabled: boolean;
    scope_mode: "optional" | "selective" | "always" | "never";
  };
  types: Array<{
    id: string;
    description: string;
    emoji: string;
  }>;
}

// Import individual preset definitions
import { conventionalPreset } from "./conventional.js";
import { gitmojiPreset } from "./gitmoji.js";
import { angularPreset } from "./angular.js";
import { minimalPreset } from "./minimal.js";

/**
 * Preset registry
 * Maps preset IDs to their configurations
 */
export const PRESETS: Record<string, Preset> = {
  conventional: conventionalPreset,
  gitmoji: gitmojiPreset,
  angular: angularPreset,
  minimal: minimalPreset,
};

/**
 * Get preset configuration by ID
 * Throws error if preset not found
 */
export function getPreset(id: string): Preset {
  const preset = PRESETS[id];
  if (!preset) {
    throw new Error(`Unknown preset: ${id}`);
  }
  return preset;
}

/**
 * Generate default shortcut mappings for commit types
 * Creates sensible single-letter shortcuts based on type IDs
 *
 * @param types - Array of commit types from preset
 * @returns Record mapping shortcut key → type ID
 */
function generateDefaultShortcuts(
  types: Array<{ id: string }>,
): Record<string, string> {
  const mappings: Record<string, string> = {};
  const usedKeys = new Set<string>();

  for (const type of types) {
    const normalized = type.id.toLowerCase();
    let key: string | null = null;
    let index = 0;

    // Try each character in the type ID to find first available letter
    while (index < normalized.length && !key) {
      const char = normalized[index];
      // Only use letters (a-z)
      if (char >= "a" && char <= "z" && !usedKeys.has(char)) {
        key = char;
        break;
      }
      index++;
    }

    // Assign shortcut if available letter found
    if (key) {
      mappings[key] = type.id;
      usedKeys.add(key);
    }
    // If no available letter, type works with arrow keys only (no shortcut)
  }

  return mappings;
}

/**
 * Build complete configuration from preset and user choices
 * Merges preset defaults with user customizations
 */
export function buildConfig(
  presetId: string,
  customizations: {
    emoji?: boolean;
    // Scope prompt removed in init; default to optional unless provided
    scope?: "optional" | "selective" | "always" | "never";
    scopeRequiredFor?: string[];
    // Git integration
    autoStage?: boolean;
    // Body requirement
    bodyRequired?: boolean;
  },
): LabcommitrConfig {
  const preset = getPreset(presetId);

  // Determine which types require scopes
  let requireScopeFor: string[] = [];
  const scopeMode = customizations.scope ?? preset.defaults.scope_mode;

  if (scopeMode === "always") {
    requireScopeFor = preset.types.map((t) => t.id);
  } else if (scopeMode === "selective" && customizations.scopeRequiredFor) {
    requireScopeFor = customizations.scopeRequiredFor;
  }

  // Generate default shortcut mappings for commit types
  const typeShortcuts = generateDefaultShortcuts(preset.types);

  return {
    version: "1.0",
    config: {
      emoji_enabled: customizations.emoji ?? preset.defaults.emoji_enabled,
      force_emoji_detection: null,
    },
    format: {
      // Template is determined by style; emoji is handled at render time
      template: "{type}({scope}): {subject}",
      subject_max_length: 50,
      // Body configuration (respects user choice, defaults to optional)
      body: {
        required: customizations.bodyRequired ?? false,
        min_length: 0,
        max_length: null,
        editor_preference: "auto",
      },
    },
    types: preset.types,
    validation: {
      require_scope_for: requireScopeFor,
      allowed_scopes: [],
      subject_min_length: 3,
      prohibited_words: [],
      prohibited_words_body: [],
    },
    advanced: {
      aliases: {},
      git: {
        auto_stage: customizations.autoStage ?? false,
        // Security best-practice: enable signed commits by default
        sign_commits: true,
      },
      shortcuts: {
        enabled: true, // Enabled by default for better UX
        display_hints: true, // Show hints when enabled
        prompts: {
          type: {
            mapping: typeShortcuts, // Pre-configured shortcuts for commit types
          },
        },
      },
    },
  };
}
