/**
 * CLI Error Handler
 *
 * Centralized error handling for the CLI application.
 * Transforms different error types into user-friendly output.
 *
 * Error Types Handled:
 * - ConfigError: Configuration validation and loading errors
 * - Commander errors: Invalid options, missing arguments
 * - System errors: File permissions, network issues
 * - Unknown errors: Unexpected exceptions
 */

import { Logger } from "../../lib/logger.js";
import { ConfigError } from "../../lib/config/types.js";

/**
 * Handle CLI errors with appropriate formatting
 * Determines error type and displays user-friendly message
 *
 * @param error - Error object to handle
 */
export function handleCliError(error: unknown): void {
  if (error instanceof ConfigError) {
    // Configuration errors (already formatted in Step 3)
    Logger.error(error.message);

    if (error.details) {
      console.error(error.details);
    }

    if (error.solutions && error.solutions.length > 0) {
      console.error("\n💡 Solutions:");
      error.solutions.forEach((solution, index) => {
        console.error(`  ${index + 1}. ${solution}`);
      });
    }

    return;
  }

  if (error instanceof Error) {
    // Standard errors
    if (error.name === "CommanderError") {
      // Commander.js validation errors (handled by Commander itself)
      return;
    }

    // Generic error
    Logger.error(`Error: ${error.message}`);

    if (process.env.DEBUG) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }

    return;
  }

  // Unknown error type
  Logger.error("An unexpected error occurred");
  console.error(error);
}
