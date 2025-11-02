/**
 * Gitmoji Preset
 *
 * Visual commit format using emojis to represent commit types.
 * Popular in creative and frontend development communities for
 * improved scannability in commit logs.
 *
 * Format: emoji type(scope): subject
 * Example: ✨ feat(ui): add dark mode toggle
 */

import type { Preset } from "./index.js";

export const gitmojiPreset: Preset = {
  id: "gitmoji",
  name: "Gitmoji Style",
  description: "Visual commits with emojis for better scannability",
  defaults: {
    emoji_enabled: true,
    scope_mode: "optional",
  },
  types: [
    {
      id: "feat",
      description: "Introduce new features",
      emoji: "✨",
    },
    {
      id: "fix",
      description: "Fix a bug",
      emoji: "🐛",
    },
    {
      id: "docs",
      description: "Add or update documentation",
      emoji: "📚",
    },
    {
      id: "style",
      description: "Improve structure or format of code",
      emoji: "🎨",
    },
    {
      id: "refactor",
      description: "Refactor code",
      emoji: "♻️",
    },
    {
      id: "perf",
      description: "Improve performance",
      emoji: "⚡",
    },
    {
      id: "test",
      description: "Add or update tests",
      emoji: "✅",
    },
    {
      id: "build",
      description: "Add or update build scripts",
      emoji: "👷",
    },
    {
      id: "ci",
      description: "Add or update CI configuration",
      emoji: "💚",
    },
    {
      id: "chore",
      description: "Miscellaneous chores",
      emoji: "🔧",
    },
  ],
};
