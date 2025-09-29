/**
 * Configuration validation system for labcommitr
 * 
 * Implements incremental validation following the CONFIG_SCHEMA.md specification.
 * Phase 1: Basic schema validation (required fields, types, structure)
 * Phase 2: Business logic validation (uniqueness, cross-references)  
 * Phase 3: Advanced validation (templates, industry standards)
 */

import type { RawConfig, ValidationResult, ValidationError, CommitType } from './types.js';

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
        field: 'root',
        message: 'Configuration must be an object',
        value: config
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
      errors
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
        field: 'types',
        message: 'Required field "types" is missing',
        value: undefined
      });
      return errors;
    }
    
    // Check if types is an array
    if (!Array.isArray(config.types)) {
      errors.push({
        field: 'types',
        message: 'Field "types" must be an array',
        value: config.types
      });
      return errors;
    }
    
    // Check if types array is non-empty
    if (config.types.length === 0) {
      errors.push({
        field: 'types',
        message: 'Field "types" must contain at least one commit type',
        value: config.types
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
    
    // Check if type is an object
    if (!type || typeof type !== 'object' || Array.isArray(type)) {
      errors.push({
        field: fieldPrefix,
        message: 'Each commit type must be an object',
        value: type
      });
      return errors;
    }
    
    const commitType = type as Partial<CommitType>;
    
    // Validate required 'id' field
    if (!commitType.id) {
      errors.push({
        field: `${fieldPrefix}.id`,
        message: 'Required field "id" is missing',
        value: commitType.id
      });
    } else if (typeof commitType.id !== 'string') {
      errors.push({
        field: `${fieldPrefix}.id`,
        message: 'Field "id" must be a string',
        value: commitType.id
      });
    } else if (commitType.id.trim() === '') {
      errors.push({
        field: `${fieldPrefix}.id`,
        message: 'Field "id" cannot be empty',
        value: commitType.id
      });
    } else if (!/^[a-z]+$/.test(commitType.id)) {
      errors.push({
        field: `${fieldPrefix}.id`,
        message: 'Field "id" must contain only lowercase letters (a-z)',
        value: commitType.id
      });
    }
    
    // Validate required 'description' field
    if (!commitType.description) {
      errors.push({
        field: `${fieldPrefix}.description`,
        message: 'Required field "description" is missing',
        value: commitType.description
      });
    } else if (typeof commitType.description !== 'string') {
      errors.push({
        field: `${fieldPrefix}.description`,
        message: 'Field "description" must be a string',
        value: commitType.description
      });
    } else if (commitType.description.trim() === '') {
      errors.push({
        field: `${fieldPrefix}.description`,
        message: 'Field "description" cannot be empty',
        value: commitType.description
      });
    }
    
    // Validate optional 'emoji' field
    if (commitType.emoji !== undefined) {
      if (typeof commitType.emoji !== 'string') {
        errors.push({
          field: `${fieldPrefix}.emoji`,
          message: 'Field "emoji" must be a string',
          value: commitType.emoji
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
    if (config.version !== undefined && typeof config.version !== 'string') {
      errors.push({
        field: 'version',
        message: 'Field "version" must be a string',
        value: config.version
      });
    }
    
    // Validate config section if present
    if (config.config !== undefined && (typeof config.config !== 'object' || Array.isArray(config.config))) {
      errors.push({
        field: 'config',
        message: 'Field "config" must be an object',
        value: config.config
      });
    }
    
    // Validate format section if present
    if (config.format !== undefined && (typeof config.format !== 'object' || Array.isArray(config.format))) {
      errors.push({
        field: 'format',
        message: 'Field "format" must be an object',
        value: config.format
      });
    }
    
    // Validate validation section if present
    if (config.validation !== undefined && (typeof config.validation !== 'object' || Array.isArray(config.validation))) {
      errors.push({
        field: 'validation',
        message: 'Field "validation" must be an object',
        value: config.validation
      });
    }
    
    // Validate advanced section if present
    if (config.advanced !== undefined && (typeof config.advanced !== 'object' || Array.isArray(config.advanced))) {
      errors.push({
        field: 'advanced',
        message: 'Field "advanced" must be an object',
        value: config.advanced
      });
    }
    
    return errors;
  }

  /**
   * Helper: Check if input has valid configuration structure
   * @param config - Input to validate
   * @returns Whether input is a valid object structure
   */
  private isValidConfigStructure(config: unknown): config is RawConfig {
    return config !== null && 
           config !== undefined && 
           typeof config === 'object' && 
           !Array.isArray(config);
  }
}
