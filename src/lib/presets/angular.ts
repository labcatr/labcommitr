/**
 * Angular Preset
 *
 * Strict commit message convention used by the Angular project
 * and many enterprise teams. Enforces consistent commit formatting
 * with comprehensive type coverage.
 *
 * Format: type(scope): subject
 * Example: feat(compiler): add support for standalone components
 */

import type { Preset } from "./index.js";

export const angularPreset: Preset = {
  id: "angular",
  name: "Angular Convention",
  description: "Strict format used by Angular and enterprise teams",
  defaults: {
    emoji_enabled: false,
    scope_mode: "optional",
  },
  types: [
    {
      id: "feat",
      description: "A new feature",
      emoji: "✨",
    },
    {
      id: "fix",
      description: "A bug fix",
      emoji: "🐛",
    },
    {
      id: "docs",
      description: "Documentation only changes",
      emoji: "📚",
    },
    {
      id: "style",
      description: "Changes that do not affect code meaning",
      emoji: "💄",
    },
    {
      id: "refactor",
      description: "Code change that neither fixes a bug nor adds a feature",
      emoji: "♻️",
    },
    {
      id: "perf",
      description: "Code change that improves performance",
      emoji: "⚡",
    },
    {
      id: "test",
      description: "Adding missing tests or correcting existing tests",
      emoji: "🧪",
    },
    {
      id: "build",
      description: "Changes that affect the build system or dependencies",
      emoji: "🏗️",
    },
    {
      id: "ci",
      description: "Changes to CI configuration files and scripts",
      emoji: "💚",
    },
    {
      id: "chore",
      description: "Other changes that don't modify src or test files",
      emoji: "🔧",
    },
  ],
};
