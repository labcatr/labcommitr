#!/usr/bin/env node

/**
 * Labcommitr CLI Entry Point (Development)
 *
 * This file serves as the development entry point for the labcommitr CLI tool.
 * It includes test commands that are not available in production builds.
 *
 * This file is only used during development and is not included in
 * the published package.
 */

import { program } from "./cli/program-dev.js";
import { handleCliError } from "./cli/utils/error-handler.js";

/**
 * Main CLI execution (Development)
 * Parses process arguments and executes the appropriate command
 */
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error: unknown) {
    // Check if error is about too many arguments (likely unquoted message/body)
    if (
      error instanceof Error &&
      error.message.includes("too many arguments")
    ) {
      console.error("\n✗ Error: Too many arguments");
      console.error("\n  Your message or body contains spaces and needs to be quoted.");
      console.error("\n  Fix: Use quotes around values with spaces:");
      console.error(`    • Message: -m "your message here"`);
      console.error(`    • Body: -b "your body here"`);
      console.error(
        `    • Example: lab commit -t feat -m "add feature" -b "detailed description"\n`,
      );
      process.exit(1);
    }
    handleCliError(error);
    process.exit(1);
  }
}

// Execute CLI
main();

