/**
 * Configuration validation system for labcommitr
 *
 * Implements incremental validation following the docs/CONFIG_SCHEMA.md specification.
 * Phase 1: Basic schema validation (required fields, types, structure)
 * Phase 2: Business logic validation (uniqueness, cross-references)
 * Phase 3: Advanced validation (templates, industry standards)
 */

import type {
  RawConfig,
  ValidationResult,
  ValidationError,
  CommitType,
} from "./types.js";

/**
 * Configuration validator class
 * Validates user configuration against schema requirements
 */
export class ConfigValidator {
  /**
   * Validate raw user configuration
   * Phase 1: Basic schema validation (required fields, types, structure)
   * @param config - Raw configuration object to validate
   * @returns Validation result with any errors found
   */
  validate(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    // Phase 1: Basic structure validation
    if (!this.isValidConfigStructure(config)) {
      errors.push({
        field: "root",
        fieldDisplay: "Configuration root",
        message: "Configuration must be an object",
        userMessage:
          "Configuration file must contain an object with key-value pairs",
        value: config,
        expectedFormat: 'YAML object with fields like "version", "types", etc.',
        issue: "Found non-object value at root level",
      });
      return { valid: false, errors };
    }

    const typedConfig = config as RawConfig;

    // Validate required types array
    errors.push(...this.validateTypes(typedConfig));

    // Validate optional sections (only basic structure for Phase 1)
    errors.push(...this.validateOptionalSections(typedConfig));

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Phase 1: Validate that types array exists and is properly structured
   * @param config - Configuration object to validate
   * @returns Array of validation errors (empty if valid)
   */
  private validateTypes(config: RawConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if types field exists
    if (!config.types) {
      errors.push({
        field: "types",
        fieldDisplay: "Commit types array",
        message: 'Required field "types" is missing',
        userMessage: 'Configuration must include a "types" array',
        value: undefined,
        expectedFormat: "array with at least one commit type object",
        examples: ["feat", "fix", "docs", "refactor", "test"],
        issue: "Missing required field",
      });
      return errors;
    }

    // Check if types is an array
    if (!Array.isArray(config.types)) {
      errors.push({
        field: "types",
        fieldDisplay: "Commit types",
        message: 'Field "types" must be an array',
        userMessage: 'The "types" field must be a list of commit type objects',
        value: config.types,
        expectedFormat: "array with at least one commit type object",
        issue: "Found non-array value",
      });
      return errors;
    }

    // Check if types array is non-empty
    if (config.types.length === 0) {
      errors.push({
        field: "types",
        fieldDisplay: "Commit types array",
        message: 'Field "types" must contain at least one commit type',
        userMessage: "Configuration must define at least one commit type",
        value: config.types,
        expectedFormat: "array with at least one commit type object",
        examples: [
          "feat (features)",
          "fix (bug fixes)",
          "docs (documentation)",
          "refactor (code restructuring)",
          "test (testing)",
        ],
        issue: "Empty types array",
      });
      return errors;
    }

    // Validate each commit type
    config.types.forEach((type, index) => {
      errors.push(...this.validateCommitType(type, index));
    });

    return errors;
  }

  /**
   * Phase 1: Validate individual commit type structure
   * @param type - Commit type object to validate
   * @param index - Index in types array for error reporting
   * @returns Array of validation errors (empty if valid)
   */
  private validateCommitType(type: unknown, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const fieldPrefix = `types[${index}]`;
    const displayPrefix = `Commit type #${index + 1}`;

    // Check if type is an object
    if (!type || typeof type !== "object" || Array.isArray(type)) {
      errors.push({
        field: fieldPrefix,
        fieldDisplay: displayPrefix,
        message: "Each commit type must be an object",
        userMessage:
          "Each commit type must be an object with id and description fields",
        value: type,
        expectedFormat: 'object with "id" and "description" fields',
        issue: "Found non-object value",
      });
      return errors;
    }

    const commitType = type as Partial<CommitType>;

    // Validate required 'id' field
    if (!commitType.id) {
      errors.push({
        field: `${fieldPrefix}.id`,
        fieldDisplay: `${displayPrefix} → ID field`,
        message: 'Required field "id" is missing',
        userMessage: "Every commit type must have an ID",
        value: commitType.id,
        expectedFormat: "lowercase letters only (a-z)",
        examples: ["feat", "fix", "docs", "refactor", "test"],
        issue: "Missing required field",
      });
    } else if (typeof commitType.id !== "string") {
      errors.push({
        field: `${fieldPrefix}.id`,
        fieldDisplay: `${displayPrefix} → ID field`,
        message: 'Field "id" must be a string',
        userMessage: "Commit type ID must be text",
        value: commitType.id,
        expectedFormat: "lowercase letters only (a-z)",
        examples: ["feat", "fix", "docs", "refactor", "test"],
        issue: "Found non-string value",
      });
    } else if (commitType.id.trim() === "") {
      errors.push({
        field: `${fieldPrefix}.id`,
        fieldDisplay: `${displayPrefix} → ID field`,
        message: 'Field "id" cannot be empty',
        userMessage: "Commit type ID cannot be empty",
        value: commitType.id,
        expectedFormat: "lowercase letters only (a-z)",
        examples: ["feat", "fix", "docs", "refactor", "test"],
        issue: "Empty string",
      });
    } else if (!/^[a-z]+$/.test(commitType.id)) {
      // Identify specific problematic characters
      const invalidChars = commitType.id
        .split("")
        .filter((char) => !/[a-z]/.test(char))
        .filter((char, idx, arr) => arr.indexOf(char) === idx) // unique
        .map((char) => {
          if (char === char.toUpperCase() && char !== char.toLowerCase()) {
            return `${char} (uppercase)`;
          } else if (char === "-") {
            return `- (dash)`;
          } else if (char === "_") {
            return `_ (underscore)`;
          } else if (/\d/.test(char)) {
            return `${char} (number)`;
          } else if (char === " ") {
            return "(space)";
          } else {
            return `${char} (special character)`;
          }
        });

      errors.push({
        field: `${fieldPrefix}.id`,
        fieldDisplay: `${displayPrefix} → ID field`,
        message: 'Field "id" must contain only lowercase letters (a-z)',
        userMessage: "Commit type IDs must be lowercase letters only",
        value: commitType.id,
        expectedFormat: "lowercase letters only (a-z)",
        examples: ["feat", "fix", "docs", "refactor", "test"],
        issue: `Contains invalid characters: ${invalidChars.join(", ")}`,
      });
    }

    // Validate required 'description' field
    if (!commitType.description) {
      errors.push({
        field: `${fieldPrefix}.description`,
        fieldDisplay: `${displayPrefix} → description field`,
        message: 'Required field "description" is missing',
        userMessage: "Every commit type must have a description",
        value: commitType.description,
        examples: [
          '"A new feature"',
          '"Bug fix for users"',
          '"Documentation changes"',
        ],
        issue: "Missing required field",
      });
    } else if (typeof commitType.description !== "string") {
      errors.push({
        field: `${fieldPrefix}.description`,
        fieldDisplay: `${displayPrefix} → description field`,
        message: 'Field "description" must be a string',
        userMessage: "Commit type description must be text",
        value: commitType.description,
        examples: [
          '"A new feature"',
          '"Bug fix for users"',
          '"Documentation changes"',
        ],
        issue: "Found non-string value",
      });
    } else if (commitType.description.trim() === "") {
      errors.push({
        field: `${fieldPrefix}.description`,
        fieldDisplay: `${displayPrefix} → description field`,
        message: 'Field "description" cannot be empty',
        userMessage: "Commit type description cannot be empty",
        value: commitType.description,
        examples: [
          '"A new feature"',
          '"Bug fix for users"',
          '"Documentation changes"',
        ],
        issue: "Empty string",
      });
    }

    // Validate optional 'emoji' field
    if (commitType.emoji !== undefined) {
      if (typeof commitType.emoji !== "string") {
        errors.push({
          field: `${fieldPrefix}.emoji`,
          fieldDisplay: `${displayPrefix} → emoji field`,
          message: 'Field "emoji" must be a string',
          userMessage: "Emoji field must be text if provided",
          value: commitType.emoji,
          issue: "Found non-string value",
        });
      }
      // Note: Emoji format validation will be added in Phase 3
    }

    return errors;
  }

  /**
   * Phase 1: Validate optional configuration sections (basic structure only)
   * @param config - Configuration object to validate
   * @returns Array of validation errors (empty if valid)
   */
  private validateOptionalSections(config: RawConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate version field if present
    if (config.version !== undefined && typeof config.version !== "string") {
      errors.push({
        field: "version",
        fieldDisplay: "Schema version",
        message: 'Field "version" must be a string',
        userMessage: "The version field must be text",
        value: config.version,
        expectedFormat: 'version string (e.g., "1.0")',
        issue: "Found non-string value",
      });
    }

    // Validate config section if present
    if (
      config.config !== undefined &&
      (typeof config.config !== "object" || Array.isArray(config.config))
    ) {
      errors.push({
        field: "config",
        fieldDisplay: "Config section",
        message: 'Field "config" must be an object',
        userMessage:
          "The config section must be an object with key-value pairs",
        value: config.config,
        expectedFormat: "object with configuration settings",
        issue: "Found non-object value",
      });
    }

    // Validate format section if present
    if (
      config.format !== undefined &&
      (typeof config.format !== "object" || Array.isArray(config.format))
    ) {
      errors.push({
        field: "format",
        fieldDisplay: "Format section",
        message: 'Field "format" must be an object',
        userMessage:
          "The format section must be an object with formatting rules",
        value: config.format,
        expectedFormat: "object with format settings",
        issue: "Found non-object value",
      });
    }

    // Validate validation section if present
    if (
      config.validation !== undefined &&
      (typeof config.validation !== "object" ||
        Array.isArray(config.validation))
    ) {
      errors.push({
        field: "validation",
        fieldDisplay: "Validation section",
        message: 'Field "validation" must be an object',
        userMessage:
          "The validation section must be an object with validation rules",
        value: config.validation,
        expectedFormat: "object with validation settings",
        issue: "Found non-object value",
      });
    }

    // Validate advanced section if present
    if (
      config.advanced !== undefined &&
      (typeof config.advanced !== "object" || Array.isArray(config.advanced))
    ) {
      errors.push({
        field: "advanced",
        fieldDisplay: "Advanced section",
        message: 'Field "advanced" must be an object',
        userMessage:
          "The advanced section must be an object with advanced settings",
        value: config.advanced,
        expectedFormat: "object with advanced configuration",
        issue: "Found non-object value",
      });
    } else if (config.advanced) {
      // Validate shortcuts if present in advanced section
      errors.push(...this.validateShortcuts(config));
    }

    return errors;
  }

  /**
   * Validate shortcuts configuration
   * @param config - Configuration object to validate
   * @returns Array of validation errors (empty if valid)
   */
  private validateShortcuts(config: RawConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!config.advanced?.shortcuts) {
      return errors; // Optional section, skip if not present
    }

    const shortcuts = config.advanced.shortcuts;

    // Validate enabled
    if (
      shortcuts.enabled !== undefined &&
      typeof shortcuts.enabled !== "boolean"
    ) {
      errors.push({
        field: "advanced.shortcuts.enabled",
        fieldDisplay: "Shortcuts → Enabled",
        message: 'Field "enabled" must be a boolean',
        userMessage: "The shortcuts enabled setting must be true or false",
        value: shortcuts.enabled,
        expectedFormat: "boolean (true or false)",
        issue: "Found non-boolean value",
      });
    }

    // Validate display_hints
    if (
      shortcuts.display_hints !== undefined &&
      typeof shortcuts.display_hints !== "boolean"
    ) {
      errors.push({
        field: "advanced.shortcuts.display_hints",
        fieldDisplay: "Shortcuts → Display Hints",
        message: 'Field "display_hints" must be a boolean',
        userMessage: "The display hints setting must be true or false",
        value: shortcuts.display_hints,
        expectedFormat: "boolean (true or false)",
        issue: "Found non-boolean value",
      });
    }

    // Validate prompts structure
    if (shortcuts.prompts !== undefined) {
      if (
        typeof shortcuts.prompts !== "object" ||
        Array.isArray(shortcuts.prompts)
      ) {
        errors.push({
          field: "advanced.shortcuts.prompts",
          fieldDisplay: "Shortcuts → Prompts",
          message: 'Field "prompts" must be an object',
          userMessage:
            "The prompts section must be an object with prompt names as keys",
          value: shortcuts.prompts,
          expectedFormat: "object with prompt configurations",
          issue: "Found non-object value",
        });
        return errors; // Can't validate further if structure is wrong
      }

      // Validate each prompt's mapping
      const promptNames = ["type", "preview", "body"] as const;
      for (const promptName of promptNames) {
        const promptConfig = shortcuts.prompts[promptName];
        if (promptConfig !== undefined) {
          if (typeof promptConfig !== "object" || Array.isArray(promptConfig)) {
            errors.push({
              field: `advanced.shortcuts.prompts.${promptName}`,
              fieldDisplay: `Shortcuts → Prompts → ${promptName}`,
              message: `Prompt config for "${promptName}" must be an object`,
              userMessage: `The ${promptName} prompt configuration must be an object`,
              value: promptConfig,
              expectedFormat: "object with mapping field",
              issue: "Found non-object value",
            });
            continue;
          }

          // Validate mapping
          if (promptConfig.mapping !== undefined) {
            if (
              typeof promptConfig.mapping !== "object" ||
              Array.isArray(promptConfig.mapping)
            ) {
              errors.push({
                field: `advanced.shortcuts.prompts.${promptName}.mapping`,
                fieldDisplay: `Shortcuts → Prompts → ${promptName} → Mapping`,
                message: `Mapping for "${promptName}" must be an object`,
                userMessage: `The mapping for ${promptName} must be an object with key-value pairs`,
                value: promptConfig.mapping,
                expectedFormat: "object with shortcut keys and option values",
                issue: "Found non-object value",
              });
              continue;
            }

            // Validate mapping keys and values
            const usedKeys = new Set<string>();
            for (const [key, value] of Object.entries(promptConfig.mapping)) {
              // Validate key (must be single lowercase letter)
              if (!/^[a-z]$/.test(key)) {
                errors.push({
                  field: `advanced.shortcuts.prompts.${promptName}.mapping.${key}`,
                  fieldDisplay: `Shortcuts → Prompts → ${promptName} → Mapping → Key "${key}"`,
                  message: `Shortcut key must be a single lowercase letter (a-z)`,
                  userMessage: `Shortcut keys must be single letters (a-z)`,
                  value: key,
                  expectedFormat: "single lowercase letter (a-z)",
                  issue: `Invalid shortcut key format`,
                });
              }

              // Check for duplicate keys (case-insensitive)
              const normalizedKey = key.toLowerCase();
              if (usedKeys.has(normalizedKey)) {
                errors.push({
                  field: `advanced.shortcuts.prompts.${promptName}.mapping`,
                  fieldDisplay: `Shortcuts → Prompts → ${promptName} → Mapping`,
                  message: `Duplicate shortcut key "${key}"`,
                  userMessage: `The shortcut "${key}" is used for multiple options`,
                  value: promptConfig.mapping,
                  expectedFormat: "unique shortcut keys",
                  issue: `Shortcut "${key}" appears multiple times`,
                  examples: [`Use different letters for each option`],
                });
              }
              usedKeys.add(normalizedKey);

              // Validate value (must be string)
              if (typeof value !== "string") {
                errors.push({
                  field: `advanced.shortcuts.prompts.${promptName}.mapping.${key}`,
                  fieldDisplay: `Shortcuts → Prompts → ${promptName} → Mapping → Value for "${key}"`,
                  message: `Mapping value must be a string`,
                  userMessage: `The option value for shortcut "${key}" must be text`,
                  value: value,
                  expectedFormat: "string (option value)",
                  issue: "Found non-string value",
                });
              }
            }
          }
        }
      }
    }

    return errors;
  }

  /**
   * Helper: Check if input has valid configuration structure
   * @param config - Input to validate
   * @returns Whether input is a valid object structure
   */
  private isValidConfigStructure(config: unknown): config is RawConfig {
    return (
      config !== null &&
      config !== undefined &&
      typeof config === "object" &&
      !Array.isArray(config)
    );
  }
}
