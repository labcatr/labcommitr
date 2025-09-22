/**
 * Configuration loading system for labcommitr
 * 
 * This module handles the discovery, parsing, and processing of configuration files.
 * It implements the async-first architecture with git-prioritized project root detection,
 * smart caching, and comprehensive error handling.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

import type { 
  LabcommitrConfig, 
  RawConfig, 
  ConfigLoadResult, 
  ProjectRoot,
  CachedConfig,
  ConfigError
} from './types.js';
import { mergeWithDefaults, createFallbackConfig } from './defaults.js';

/**
 * Configuration file names to search for (in priority order)
 * Primary: .labcommitr.config.yaml
 * Fallback: .labcommitr.config.yml
 */
const CONFIG_FILENAMES = [
  '.labcommitr.config.yaml',
  '.labcommitr.config.yml'
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
      if (cached && await this.isCacheValid(cached, configPath)) {
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
      if (await this.directoryExists(path.join(currentDir, '.git'))) {
        projectRoot = await this.createProjectRoot(currentDir, 'git');
        break;
      }
      
      // Priority 2: Check for package.json (Node.js project root)
      if (await this.fileExists(path.join(currentDir, 'package.json'))) {
        projectRoot = await this.createProjectRoot(currentDir, 'package.json');
        break;
      }
      
      // Move up one directory level
      currentDir = path.dirname(currentDir);
    }
    
    // Fallback: Use filesystem root if no project markers found
    if (!projectRoot) {
      projectRoot = await this.createProjectRoot(currentDir, 'filesystem-root');
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
  private async createProjectRoot(rootPath: string, markerType: ProjectRoot['markerType']): Promise<ProjectRoot> {
    // For now, implement basic monorepo detection by counting package.json files
    // More sophisticated detection can be added later
    const subprojects = await this.findSubprojects(rootPath);
    
    return {
      path: rootPath,
      markerType,
      isMonorepo: subprojects.length > 1, // Multiple package.json = likely monorepo
      subprojects
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
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const packageJsonPath = path.join(rootPath, entry.name, 'package.json');
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
      source: 'defaults',
      loadedAt: Date.now(),
      emojiModeActive: this.detectEmojiSupport() // TODO: Implement emoji detection
    };
  }

  /**
   * Loads and processes a configuration file
   * 
   * @param configPath - Path to the configuration file
   * @param projectRoot - Project root information
   * @returns Promise resolving to processed configuration
   */
  private async loadConfigFile(configPath: string, projectRoot: ProjectRoot): Promise<ConfigLoadResult> {
    // Validate file permissions before attempting to read
    await this.validateFilePermissions(configPath);
    
    // Parse the YAML file
    const rawConfig = await this.parseYamlFile(configPath);
    
    // Merge with defaults to create complete configuration
    const processedConfig = mergeWithDefaults(rawConfig);
    
    return {
      config: processedConfig,
      source: 'project',
      path: configPath,
      loadedAt: Date.now(),
      emojiModeActive: this.detectEmojiSupport() // TODO: Implement emoji detection
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
   * TODO: Implement proper emoji detection logic
   * For now, returns true as a placeholder
   * 
   * @returns Whether emojis should be displayed
   */
  private detectEmojiSupport(): boolean {
    // Placeholder implementation - will be enhanced later
    return true;
  }

  // TODO: Implement remaining methods (caching, error handling, YAML parsing)
  // These will be added in the next step to keep commits focused
  private getCachedConfig(configPath: string): CachedConfig | undefined {
    throw new Error('Method not implemented yet');
  }

  private async isCacheValid(cached: CachedConfig, configPath: string): Promise<boolean> {
    throw new Error('Method not implemented yet');
  }

  private cacheConfig(configPath: string, result: ConfigLoadResult): void {
    throw new Error('Method not implemented yet');
  }

  private async validateFilePermissions(filePath: string): Promise<void> {
    throw new Error('Method not implemented yet');
  }

  private async parseYamlFile(filePath: string): Promise<RawConfig> {
    throw new Error('Method not implemented yet');
  }

  private transformError(error: any, searchStartPath: string): Error {
    throw new Error('Method not implemented yet');
  }
}
