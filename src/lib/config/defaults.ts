// Default configuration values
// Provides sensible defaults for all optional configuration fields

import type { LabcommitrConfig } from './types.js';

// Complete default configuration object
export const DEFAULT_CONFIG: LabcommitrConfig = {
  version: '1.0',
  
  config: {
    emoji_enabled: true,
    force_emoji_detection: null,
  },
  
  format: {
    template: '{emoji}{type}({scope}): {subject}',
    subject_max_length: 50,
  },
  
  types: [], // Will be populated with user-provided types
  
  validation: {
    require_scope_for: [],
    allowed_scopes: [],
    subject_min_length: 3,
    prohibited_words: [],
  },
  
  advanced: {
    aliases: {},
    git: {
      auto_stage: false,
      sign_commits: false,
    },
  },
};

// Default commit types for reference (not used in merging)
export const DEFAULT_COMMIT_TYPES = [
  {
    id: 'feat',
    description: 'A new feature for the user',
    emoji: '✨',
  },
  {
    id: 'fix',
    description: 'A bug fix for the user',
    emoji: '🐛',
  },
  {
    id: 'docs',
    description: 'Documentation changes',
    emoji: '📚',
  },
  {
    id: 'style',
    description: 'Code style changes (formatting, missing semicolons, etc.)',
    emoji: '💄',
  },
  {
    id: 'refactor',
    description: 'Code refactoring without changing functionality',
    emoji: '♻️',
  },
  {
    id: 'test',
    description: 'Adding or updating tests',
    emoji: '🧪',
  },
  {
    id: 'chore',
    description: 'Maintenance tasks, build changes, etc.',
    emoji: '🔧',
  },
];
