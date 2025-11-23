/**
 * Configuration system exports for labcommitr
 *
 * This module provides the public API for the configuration loading system.
 * It exports the main classes, interfaces, and utility functions needed
 * by other parts of the application.
 */

// Re-export all types and interfaces
export * from "./types.js";

// Re-export configuration defaults and utilities
export * from "./defaults.js";

// Re-export main configuration loader
export * from "./loader.js";

// Re-export configuration validator
export * from "./validator.js";

/**
 * Convenience function to create and use a ConfigLoader instance
 *
 * This provides a simple API for one-off configuration loading without
 * needing to manage ConfigLoader instances manually. Most consumers
 * should use this function rather than instantiating ConfigLoader directly.
 *
 * @param startPath - Directory to start searching from (defaults to process.cwd())
 * @returns Promise resolving to complete configuration with metadata
 */
export async function loadConfig(
  startPath?: string,
): Promise<import("./types.js").ConfigLoadResult> {
  const { ConfigLoader } = await import("./loader.js");
  const loader = new ConfigLoader();
  return loader.load(startPath);
}
