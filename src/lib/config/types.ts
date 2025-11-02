/**
 * TypeScript interfaces for labcommitr configuration system
 *
 * This file defines the core types used throughout the config loading system,
 * ensuring type safety and clear contracts between components.
 */

/**
 * Individual commit type definition
 * Each type represents a category of change (feat, fix, docs, etc.)
 */
export interface CommitType {
  /** Unique identifier for the commit type */
  id: string;
  /** Human-readable description of when to use this type */
  description: string;
  /** Emoji representation for terminal display */
  emoji?: string;
}

/**
 * Commit message body configuration
 * Controls how commit message body/description is collected and validated
 */
export interface BodyConfig {
  /** Whether commit body is required (default: false) */
  required: boolean;
  /** Minimum length when body is provided (default: 0 = no minimum) */
  min_length: number;
  /** Maximum length (null = unlimited, default: null) */
  max_length: number | null;
  /** Preferred editor for body input (default: "auto") */
  editor_preference: "auto" | "inline" | "editor";
}

/**
 * Main configuration interface - fully resolved with all defaults applied
 * This represents the complete configuration structure after processing
 */
export interface LabcommitrConfig {
  /** Schema version for future compatibility */
  version: string;
  /** Basic configuration settings */
  config: {
    /** Enable emoji mode with automatic terminal detection fallback */
    emoji_enabled: boolean;
    /** Override automatic emoji detection (null = auto-detect) */
    force_emoji_detection: boolean | null;
  };
  /** Commit message formatting rules */
  format: {
    /** Template for commit messages with variable substitution */
    template: string;
    /** Maximum length for commit subject line */
    subject_max_length: number;
    /** Configuration for commit message body/description */
    body: BodyConfig;
  };
  /** Array of available commit types (presence = enabled) */
  types: CommitType[];
  /** Validation rules for commit messages */
  validation: {
    /** Commit types that require a scope */
    require_scope_for: string[];
    /** Allowed scopes (empty = any scope allowed) */
    allowed_scopes: string[];
    /** Minimum subject length */
    subject_min_length: number;
    /** Words prohibited in commit subjects */
    prohibited_words: string[];
    /** Words prohibited in commit body (separate from subject) */
    prohibited_words_body: string[];
  };
  /** Advanced configuration options */
  advanced: {
    /** Custom aliases for commit types */
    aliases: Record<string, string>;
    /** Git integration settings */
    git: {
      /** Automatically stage all changes before committing */
      auto_stage: boolean;
      /** Sign commits with GPG */
      sign_commits: boolean;
    };
  };
}

/**
 * Raw configuration object as parsed from YAML file
 * Represents the structure before validation and default value application
 * Only 'types' field is required - all others are optional with defaults
 */
export interface RawConfig {
  /** Schema version for future compatibility */
  version?: string;
  /** Basic configuration settings */
  config?: Partial<LabcommitrConfig["config"]>;
  /** Commit message formatting rules */
  format?: Partial<LabcommitrConfig["format"]>;
  /** Array of available commit types - REQUIRED FIELD */
  types: CommitType[];
  /** Validation rules for commit messages */
  validation?: Partial<LabcommitrConfig["validation"]>;
  /** Advanced configuration options */
  advanced?: Partial<LabcommitrConfig["advanced"]>;
}

/**
 * Configuration loading result with metadata
 * Contains the processed config and information about its source
 */
export interface ConfigLoadResult {
  /** The fully processed configuration */
  config: LabcommitrConfig;
  /** Source of the configuration */
  source: "project" | "global" | "defaults";
  /** Absolute path to config file (if loaded from file) */
  path?: string;
  /** Timestamp when config was loaded */
  loadedAt: number;
  /** Whether emoji mode is actively enabled after terminal detection */
  emojiModeActive: boolean;
}

/**
 * Project root detection result
 * Contains information about the discovered project structure
 */
export interface ProjectRoot {
  /** Absolute path to the project root directory */
  path: string;
  /** Type of marker that identified this as project root */
  markerType: "git" | "package.json" | "filesystem-root";
  /** Whether this appears to be a monorepo structure */
  isMonorepo: boolean;
  /** Paths to detected subprojects (if any) */
  subprojects: string[];
}

/**
 * Configuration cache entry
 * Stores loaded config with metadata for cache invalidation
 */
export interface CachedConfig {
  /** The cached configuration data */
  data: ConfigLoadResult;
  /** Unix timestamp when cache entry was created */
  timestamp: number;
  /** File paths being watched for changes */
  watchedPaths: string[];
}

/**
 * Validation result for configuration files
 * Contains validation status and any errors found
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** Array of validation errors (empty if valid) */
  errors: ValidationError[];
}

/**
 * Individual validation error
 * Provides specific information about what failed validation with rich context
 */
export interface ValidationError {
  /** Technical field path (e.g., "types[0].id") */
  field: string;
  /** User-friendly field description (e.g., "Commit type #1 → ID field") */
  fieldDisplay: string;
  /** Technical error message for developers */
  message: string;
  /** User-friendly error explanation */
  userMessage: string;
  /** The actual problematic value */
  value?: unknown;
  /** What format/type was expected */
  expectedFormat?: string;
  /** Array of valid example values */
  examples?: string[];
  /** Specific issue identified (e.g., "Contains dash (-)") */
  issue?: string;
}

/**
 * Custom error class for configuration-related failures
 * Provides structured error information with actionable guidance
 */
export class ConfigError extends Error {
  /**
   * Creates a new configuration error with user-friendly messaging
   *
   * @param message - Primary error message (what went wrong)
   * @param details - Technical details about the error
   * @param solutions - Array of actionable solutions for the user
   * @param filePath - Path to the problematic config file (if applicable)
   */
  constructor(
    message: string,
    public readonly details: string,
    public readonly solutions: string[],
    public readonly filePath?: string,
  ) {
    super(message);
    this.name = "ConfigError";

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ConfigError.prototype);
  }

  /**
   * Formats the error for display to users
   * Includes the message, details, and actionable solutions
   */
  public formatForUser(): string {
    let output = `❌ ${this.message}\n`;

    if (this.details) {
      output += `\nDetails: ${this.details}\n`;
    }

    if (this.solutions.length > 0) {
      output += `\nSolutions:\n`;
      this.solutions.forEach((solution) => {
        output += `  ${solution}\n`;
      });
    }

    return output;
  }
}
