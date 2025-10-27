/**
 * Conventional Commits Preset
 *
 * Industry-standard commit message convention used widely in
 * open-source projects. Provides clear semantic commit types
 * with optional scopes for better organization.
 *
 * Format: type(scope): subject
 * Example: feat(api): add user authentication endpoint
 */

import type { Preset } from "./index.js";

export const conventionalPreset: Preset = {
  id: "conventional",
  name: "Conventional Commits",
  description: "Industry-standard format used by most open-source projects",
  defaults: {
    emoji_enabled: false,
    scope_mode: "optional",
  },
  types: [
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
      description: "Code style changes (formatting, semicolons, etc.)",
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
  ],
};
