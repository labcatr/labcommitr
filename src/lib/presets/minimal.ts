/**
 * Minimal Preset
 *
 * Basic starting configuration with essential commit types.
 * Designed for teams who want to build custom conventions
 * from a simple foundation.
 *
 * Format: type(scope): subject
 * Example: feat: implement new feature
 */

import type { Preset } from "./index.js";

export const minimalPreset: Preset = {
  id: "minimal",
  name: "Minimal Setup",
  description: "Start with basics, customize everything yourself later",
  defaults: {
    emoji_enabled: false,
    scope_mode: "optional",
  },
  types: [
    {
      id: "feat",
      description: "New feature",
      emoji: "✨",
    },
    {
      id: "fix",
      description: "Bug fix",
      emoji: "🐛",
    },
    {
      id: "docs",
      description: "Documentation",
      emoji: "📚",
    },
    {
      id: "chore",
      description: "Maintenance",
      emoji: "🔧",
    },
  ],
};
