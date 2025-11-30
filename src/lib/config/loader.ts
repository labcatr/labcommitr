/**
 * Configuration loading system for labcommitr
 *
 * This module handles the discovery, parsing, and processing of configuration files.
 * It implements the async-first architecture with git-prioritized project root detection,
 * smart caching, and comprehensive error handling.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";

import type {
  LabcommitrConfig,
  RawConfig,
  ConfigLoadResult,
  ProjectRoot,
  CachedConfig,
} from "./types.js";
import { ConfigError } from "./types.js";
import { mergeWithDefaults, createFallbackConfig } from "./defaults.js";
import { ConfigValidator } from "./validator.js";
import { detectEmojiSupport } from "../util/emoji.js";

/**
 * Configuration file names to search for (in priority order)
 * Primary: .labcommitr.config.yaml
 * Fallback: .labcommitr.config.yml
 */
const CONFIG_FILENAMES = [
  ".labcommitr.config.yaml",
  ".labcommitr.config.yml",
] as const;

/**
 * Main configuration loader class
 *
 * Handles the complete configuration loading pipeline:
 * 1. Project root detection (git-prioritized)
 * 2. Configuration file discovery
 * 3. File permission validation
 * 4. YAML parsing with error transformation
 * 5. Default value merging
 * 6. Result caching for performance
 */
export class ConfigLoader {
  /** Cache for loaded configurations to improve performance */
  private configCache = new Map<string, CachedConfig>();

  /** Cache for project root paths to avoid repeated filesystem traversal */
  private projectRootCache = new Map<string, ProjectRoot>();

  /**
   * Main entry point for configuration loading
   *
   * This method orchestrates the entire configuration loading process,
   * from project root detection through final configuration assembly.
   *
   * @param startPath - Directory to start searching from (defaults to process.cwd())
   * @returns Promise resolving to complete configuration with metadata
   */
  public async load(startPath?: string): Promise<ConfigLoadResult> {
    const searchStartPath = startPath ?? process.cwd();

    try {
      // Step 1: Detect project root with git prioritization
      const projectRoot = await this.findProjectRoot(searchStartPath);

      // Step 2: Look for configuration file within project boundaries
      const configPath = await this.findConfigFile(projectRoot.path);

      if (!configPath) {
        // No config found - return fallback configuration
        return this.createFallbackResult(projectRoot);
      }

      // Step 3: Check if we have this config cached
      const cached = this.getCachedConfig(configPath);
      if (cached && (await this.isCacheValid(cached, configPath))) {
        return cached.data;
      }

      // Step 4: Load and process the configuration file
      const result = await this.loadConfigFile(configPath, projectRoot);

      // Step 5: Cache the result for future use
      this.cacheConfig(configPath, result);

      return result;
    } catch (error) {
      // Transform any errors into user-friendly ConfigError instances
      throw this.transformError(error, searchStartPath);
    }
  }

  /**
   * Finds the project root directory using git-prioritized detection
   *
   * Search strategy:
   * 1. Traverse upward from start directory
   * 2. Priority 1: Look for .git directory (git repository root)
   * 3. Priority 2: Look for package.json (Node.js project root)
   * 4. Fallback: Stop at filesystem root
   *
   * @param startPath - Directory to begin search from
   * @returns Promise resolving to project root information
   */
  private async findProjectRoot(startPath: string): Promise<ProjectRoot> {
    // Check cache first to avoid repeated traversal
    const cachedRoot = this.projectRootCache.get(startPath);
    if (cachedRoot) {
      return cachedRoot;
    }

    let currentDir = path.resolve(startPath);
    let projectRoot: ProjectRoot | null = null;

    // Traverse upward until we find a project marker or hit filesystem root
    while (currentDir !== path.dirname(currentDir)) {
      // Priority 1: Check for .git directory (git repository root)
      if (await this.directoryExists(path.join(currentDir, ".git"))) {
        projectRoot = await this.createProjectRoot(currentDir, "git");
        break;
      }

      // Priority 2: Check for package.json (Node.js project root)
      if (await this.fileExists(path.join(currentDir, "package.json"))) {
        projectRoot = await this.createProjectRoot(currentDir, "package.json");
        break;
      }

      // Move up one directory level
      currentDir = path.dirname(currentDir);
    }

    // Fallback: Use filesystem root if no project markers found
    if (!projectRoot) {
      projectRoot = await this.createProjectRoot(currentDir, "filesystem-root");
    }

    // Cache the result for future lookups
    this.projectRootCache.set(startPath, projectRoot);

    return projectRoot;
  }

  /**
   * Searches for configuration file within project boundaries
   *
   * @param projectRoot - Project root directory to search in
   * @returns Promise resolving to config file path or null if not found
   */
  private async findConfigFile(projectRoot: string): Promise<string | null> {
    // Search for each possible config filename in order of preference
    for (const filename of CONFIG_FILENAMES) {
      const configPath = path.join(projectRoot, filename);

      if (await this.fileExists(configPath)) {
        return configPath;
      }
    }

    return null;
  }

  /**
   * Creates a ProjectRoot object with monorepo detection
   *
   * @param rootPath - The detected project root path
   * @param markerType - What type of marker identified this as the root
   * @returns Promise resolving to complete ProjectRoot information
   */
  private async createProjectRoot(
    rootPath: string,
    markerType: ProjectRoot["markerType"],
  ): Promise<ProjectRoot> {
    // For now, implement basic monorepo detection by counting package.json files
    // More sophisticated detection can be added later
    const subprojects = await this.findSubprojects(rootPath);

    return {
      path: rootPath,
      markerType,
      isMonorepo: subprojects.length > 1, // Multiple package.json = likely monorepo
      subprojects,
    };
  }

  /**
   * Finds subprojects within the project root (basic monorepo support)
   *
   * @param rootPath - Project root directory to search
   * @returns Promise resolving to array of subproject paths
   */
  private async findSubprojects(rootPath: string): Promise<string[]> {
    // This is a simplified implementation - can be enhanced later
    // Look for package.json files in immediate subdirectories
    try {
      const entries = await fs.readdir(rootPath, { withFileTypes: true });
      const subprojects: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          const packageJsonPath = path.join(
            rootPath,
            entry.name,
            "package.json",
          );
          if (await this.fileExists(packageJsonPath)) {
            subprojects.push(path.join(rootPath, entry.name));
          }
        }
      }

      return subprojects;
    } catch {
      // If we can't read the directory, return empty array
      return [];
    }
  }

  /**
   * Creates a fallback configuration result when no config file is found
   *
   * @param projectRoot - Project root information
   * @returns ConfigLoadResult with default configuration
   */
  private createFallbackResult(projectRoot: ProjectRoot): ConfigLoadResult {
    const fallbackConfig = createFallbackConfig();

    return {
      config: fallbackConfig,
      source: "defaults",
      loadedAt: Date.now(),
      emojiModeActive: this.detectEmojiSupport(fallbackConfig),
    };
  }

  /**
   * Loads and processes a configuration file
   *
   * @param configPath - Path to the configuration file
   * @param projectRoot - Project root information
   * @returns Promise resolving to processed configuration
   */
  private async loadConfigFile(
    configPath: string,
    projectRoot: ProjectRoot,
  ): Promise<ConfigLoadResult> {
    // Validate file permissions before attempting to read
    await this.validateFilePermissions(configPath);

    // Parse the YAML file
    const rawConfig = await this.parseYamlFile(configPath);

    // Validate the parsed configuration
    const validator = new ConfigValidator();
    const validationResult = validator.validate(rawConfig);

    if (!validationResult.valid) {
      // Format errors with rich context for user-friendly output
      const formattedErrors = validationResult.errors
        .map((error, index) => {
          const count = index + 1;
          const location = error.fieldDisplay || error.field;

          let errorBlock = `\n${count}. ${location}:\n`;
          errorBlock += `   ${error.userMessage || error.message}\n`;

          if (error.value !== undefined) {
            errorBlock += `   Found: ${JSON.stringify(error.value)}\n`;
          }

          if (error.issue) {
            errorBlock += `   Issue: ${error.issue}\n`;
          }

          if (error.expectedFormat) {
            errorBlock += `   Rule: ${error.expectedFormat}\n`;
          }

          if (error.examples && error.examples.length > 0) {
            errorBlock += `   Examples: ${error.examples.join(", ")}\n`;
          }

          return errorBlock;
        })
        .join("\n");

      const count = validationResult.errors.length;
      const plural = count === 1 ? "error" : "errors";
      const filename = path.basename(configPath);

      throw new ConfigError(
        `Configuration Error: ${filename}`,
        `Found ${count} validation ${plural}:${formattedErrors}`,
        [
          `Edit ${filename} to fix the issues listed above`,
          "See documentation for valid field formats: https://github.com/labcatr/labcommitr#config",
        ],
        configPath,
      );
    }

    // Merge with defaults to create complete configuration
    const processedConfig = mergeWithDefaults(rawConfig);

    return {
      config: processedConfig,
      source: "project",
      path: configPath,
      loadedAt: Date.now(),
      emojiModeActive: this.detectEmojiSupport(processedConfig),
    };
  }

  /**
   * Utility: Check if a file exists
   *
   * @param filePath - Path to check
   * @returns Promise resolving to whether file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Utility: Check if a directory exists
   *
   * @param dirPath - Directory path to check
   * @returns Promise resolving to whether directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Detects whether the current terminal supports emoji display
   *
   * Combines user preference (force_emoji_detection) with terminal capability detection.
   * User preference takes precedence over automatic detection.
   *
   * @param config - The loaded configuration (may contain force_emoji_detection override)
   * @returns Whether emojis should be displayed in the terminal
   */
  private detectEmojiSupport(config?: LabcommitrConfig): boolean {
    // User override takes highest priority
    if (config?.config.force_emoji_detection !== null && config?.config.force_emoji_detection !== undefined) {
      return config.config.force_emoji_detection;
    }

    // Automatic terminal detection
    return detectEmojiSupport();
  }

  /**
   * Retrieves cached configuration if available
   *
   * This method checks the in-memory cache for previously loaded configurations
   * to avoid redundant file system operations and parsing.
   *
   * @param configPath - Path to configuration file
   * @returns Cached configuration or undefined if not cached
   */
  private getCachedConfig(configPath: string): CachedConfig | undefined {
    return this.configCache.get(configPath);
  }

  /**
   * Validates whether cached configuration is still valid
   *
   * Cache validity is determined by comparing file modification time
   * with the cache timestamp. If the file has been modified since
   * caching, the cache is considered invalid.
   *
   * @param cached - Cached configuration entry
   * @param configPath - Path to configuration file
   * @returns Promise resolving to whether cache is valid
   */
  private async isCacheValid(
    cached: CachedConfig,
    configPath: string,
  ): Promise<boolean> {
    try {
      // Get file modification time
      const stats = await fs.stat(configPath);
      const fileModifiedTime = stats.mtime.getTime();

      // Cache is valid if file hasn't been modified since caching
      // Allow small time difference (1 second) to account for filesystem precision
      return fileModifiedTime <= cached.timestamp + 1000;
    } catch {
      // If we can't stat the file, assume cache is invalid
      // This handles cases where file was deleted or permissions changed
      return false;
    }
  }

  /**
   * Caches a configuration result for performance optimization
   *
   * Stores the configuration result in memory with metadata for
   * cache invalidation. Future loads of the same file will use
   * the cached result if the file hasn't been modified.
   *
   * @param configPath - Path to configuration file
   * @param result - Configuration result to cache
   */
  private cacheConfig(configPath: string, result: ConfigLoadResult): void {
    const cacheEntry: CachedConfig = {
      data: result,
      timestamp: Date.now(),
      watchedPaths: [configPath], // For future file watching enhancement
    };

    this.configCache.set(configPath, cacheEntry);

    // Optional: Implement cache size limit to prevent memory leaks
    // For now, keep it simple - can add LRU eviction later if needed
    if (this.configCache.size > 50) {
      // Arbitrary limit
      // Remove oldest entries (simple FIFO eviction)
      const entries = Array.from(this.configCache.entries());
      const oldestKey = entries[0][0];
      this.configCache.delete(oldestKey);
    }
  }

  /**
   * Validates that a file exists and is readable
   *
   * This method performs pre-read validation to provide clear error messages
   * when files cannot be accessed due to permission issues or missing files.
   *
   * @param filePath - Path to file to validate
   * @throws ConfigError if file cannot be read
   */
  private async validateFilePermissions(filePath: string): Promise<void> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // File not found - this is handled upstream, but provide clear error if called directly
        throw new ConfigError(
          `Configuration file not found: ${filePath}`,
          "The file does not exist",
          ["Run 'lab init' to create a configuration file"],
          filePath,
        );
      } else if (error.code === "EACCES") {
        // Permission denied - provide actionable solutions
        throw new ConfigError(
          `Cannot read configuration file: ${filePath}`,
          "Permission denied - insufficient file permissions",
          [
            `Check file permissions: ls -la ${path.basename(filePath)}`,
            `Fix permissions: chmod 644 ${path.basename(filePath)}`,
            "Verify file ownership with your system administrator",
          ],
          filePath,
        );
      } else if (error.code === "ENOTDIR") {
        // Path component is not a directory
        throw new ConfigError(
          `Invalid path to configuration file: ${filePath}`,
          "A component in the path is not a directory",
          [
            "Verify the file path is correct",
            "Check that all parent directories exist",
          ],
          filePath,
        );
      }

      // Re-throw unexpected errors with additional context
      throw new ConfigError(
        `Failed to access configuration file: ${filePath}`,
        `System error: ${error.message}`,
        [
          "Check file and directory permissions",
          "Verify the file path is correct",
          "Contact system administrator if the problem persists",
        ],
        filePath,
      );
    }
  }

  /**
   * Parses a YAML configuration file with comprehensive error handling
   *
   * This method reads and parses YAML files using js-yaml's safe loader
   * to prevent code execution. It provides detailed error messages for
   * common YAML syntax issues and validation problems.
   *
   * @param filePath - Path to YAML file to parse
   * @returns Promise resolving to parsed configuration object
   * @throws ConfigError for YAML syntax or structure errors
   */
  private async parseYamlFile(filePath: string): Promise<RawConfig> {
    try {
      // Read file content as UTF-8 text
      const fileContent = await fs.readFile(filePath, "utf8");

      // Check for empty file (common user error)
      if (!fileContent.trim()) {
        throw new ConfigError(
          `Configuration file is empty: ${filePath}`,
          "The file contains no content or only whitespace",
          [
            "Add configuration content to the file",
            "Run 'lab init' to generate a valid configuration file",
            "Copy from another project or use documentation examples",
          ],
          filePath,
        );
      }

      // Parse YAML with safe loader (prevents code execution)
      // Use DEFAULT_SCHEMA for full YAML 1.2 compatibility
      const parsed = yaml.load(fileContent, {
        schema: yaml.DEFAULT_SCHEMA,
        filename: filePath, // Helps with error reporting
      });

      // Validate that result is an object (not null, string, array, etc.)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        const actualType = Array.isArray(parsed) ? "array" : typeof parsed;
        throw new ConfigError(
          `Invalid configuration structure in ${filePath}`,
          `Configuration must be a YAML object, but got ${actualType}`,
          [
            "Ensure the file contains a valid YAML object (key-value pairs)",
            "Check that the file starts with object properties, not a list or scalar",
            "Run 'lab init' to generate a valid configuration file",
          ],
          filePath,
        );
      }

      // Basic structure validation - ensure required 'types' field exists
      const config = parsed as any;
      if (!Array.isArray(config.types)) {
        throw new ConfigError(
          `Missing required 'types' field in ${filePath}`,
          "Configuration must include a 'types' array defining commit types",
          [
            "Add a 'types' field with an array of commit type objects",
            "Each type should have 'id', 'description', and optionally 'emoji'",
            "Run 'lab init' to generate a valid configuration file",
          ],
          filePath,
        );
      }

      return config as RawConfig;
    } catch (error: any) {
      // Transform YAML parsing errors into user-friendly messages
      if (error instanceof yaml.YAMLException) {
        const { message, mark } = error;

        // Extract line and column information if available
        if (mark) {
          const lineInfo = `line ${mark.line + 1}, column ${mark.column + 1}`;
          throw new ConfigError(
            `Invalid YAML syntax in ${filePath} at ${lineInfo}`,
            `Parsing error: ${message}`,
            [
              `Check the syntax around line ${mark.line + 1}`,
              "Common issues: incorrect indentation, missing colons, unquoted special characters",
              "Use a YAML validator (e.g., yamllint) to identify syntax issues",
              "Run 'lab init' to generate a fresh config file",
            ],
            filePath,
          );
        } else {
          // YAML error without specific location
          throw new ConfigError(
            `Invalid YAML syntax in ${filePath}`,
            `Parsing error: ${message}`,
            [
              "Check YAML syntax throughout the file",
              "Common issues: incorrect indentation, missing colons, unquoted special characters",
              "Use a YAML validator to identify issues",
              "Run 'lab init' to generate a fresh config file",
            ],
            filePath,
          );
        }
      }

      // Re-throw if it's already a ConfigError (from our validation above)
      if (error.name === "ConfigError") {
        throw error;
      }

      // Handle file system errors that might occur during reading
      if (error.code === "EISDIR") {
        throw new ConfigError(
          `Cannot read configuration: ${filePath} is a directory`,
          "Expected a file but found a directory",
          [
            "Ensure the path points to a file, not a directory",
            "Check for naming conflicts with directories",
          ],
          filePath,
        );
      }

      // Generic error fallback with context
      throw new ConfigError(
        `Failed to parse configuration file: ${filePath}`,
        `Unexpected error: ${error.message}`,
        [
          "Verify the file is a valid YAML file",
          "Check file encoding (should be UTF-8)",
          "Run 'lab init' to generate a fresh config file",
        ],
        filePath,
      );
    }
  }

  /**
   * Transforms various error types into user-friendly ConfigError instances
   *
   * This method serves as the central error transformation point, ensuring
   * all errors thrown by the configuration system provide actionable guidance
   * to users rather than technical implementation details.
   *
   * @param error - The original error that occurred
   * @param context - Additional context about where the error occurred
   * @returns ConfigError with user-friendly messaging and solutions
   */
  private transformError(error: any, context: string): Error {
    // If it's already a ConfigError, pass it through unchanged
    if (error.name === "ConfigError") {
      return error;
    }

    // Handle common file system errors with specific guidance
    if (error.code === "ENOENT") {
      return new ConfigError(
        `No configuration found starting from ${context}`,
        "Could not locate a labcommitr configuration file in the project",
        [
          "Run 'lab init' to create a configuration file",
          "Ensure you're in a git repository or Node.js project",
          "Check that you have read permissions for the directory tree",
        ],
      );
    }

    if (error.code === "EACCES") {
      return new ConfigError(
        `Permission denied while searching for configuration`,
        `Cannot access directory or file: ${error.path || context}`,
        [
          "Check directory permissions in the project tree",
          "Ensure you have read access to the project directory",
          "Contact your system administrator if in a shared environment",
        ],
      );
    }

    if (error.code === "ENOTDIR") {
      return new ConfigError(
        `Invalid directory structure encountered`,
        `Expected directory but found file: ${error.path || context}`,
        [
          "Verify the project directory structure is correct",
          "Check for files where directories are expected",
        ],
      );
    }

    // Handle YAML-related errors (these should typically be caught upstream)
    if (error instanceof yaml.YAMLException) {
      return new ConfigError(
        `Configuration file contains invalid YAML syntax`,
        `YAML parsing error: ${error.message}`,
        [
          "Check YAML syntax in your configuration file",
          "Use a YAML validator to identify issues",
          "Run 'lab init' to generate a fresh config file",
        ],
      );
    }

    // Handle timeout errors (e.g., from slow file systems)
    if (error.code === "ETIMEDOUT") {
      return new ConfigError(
        `Timeout while accessing configuration files`,
        "File system operation took too long to complete",
        [
          "Check if the file system is responsive",
          "Try again in a few moments",
          "Consider checking disk space and system load",
        ],
      );
    }

    // Generic error fallback with as much context as possible
    const errorMessage = error.message || "Unknown error occurred";
    const errorContext = error.stack
      ? `\n\nTechnical details:\n${error.stack}`
      : "";

    return new ConfigError(
      `Configuration loading failed`,
      `${errorMessage}${errorContext}`,
      [
        "Check file permissions and syntax",
        "Verify you're in a valid project directory",
        "Run 'lab init' to reset configuration",
        "Report this issue if the problem persists with details about your setup",
      ],
    );
  }
}
