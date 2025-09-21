// TypeScript interfaces for configuration system
// Defines the structure of configuration objects and related types

// Main configuration interface based on finalized schema
export interface LabcommitrConfig {
  version: string;
  config: {
    emoji_enabled: boolean;
    force_emoji_detection: boolean | null;
  };
  format: {
    template: string;
    subject_max_length: number;
  };
  types: CommitType[];
  validation: {
    require_scope_for: string[];
    allowed_scopes: string[];
    subject_min_length: number;
    prohibited_words: string[];
  };
  advanced: {
    aliases: Record<string, string>;
    git: {
      auto_stage: boolean;
      sign_commits: boolean;
    };
  };
}

// Individual commit type structure
export interface CommitType {
  id: string;
  description: string;
  emoji?: string;
}

// Raw user configuration (before defaults applied)
export interface RawConfig {
  version?: string;
  config?: Partial<LabcommitrConfig['config']>;
  format?: Partial<LabcommitrConfig['format']>;
  types: CommitType[]; // Only required field
  validation?: Partial<LabcommitrConfig['validation']>;
  advanced?: Partial<LabcommitrConfig['advanced']>;
}

// Configuration loading result
export interface ConfigLoadResult {
  config: LabcommitrConfig;
  source: 'project' | 'global' | 'defaults';
  path?: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Validation error structure
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}
