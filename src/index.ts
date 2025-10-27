#!/usr/bin/env node

/**
 * Labcommitr CLI Entry Point
 *
 * This file serves as the main entry point for the labcommitr CLI tool.
 * It initializes the Commander.js program and delegates command handling
 * to modular command implementations.
 *
 * Architecture:
 * - Minimal orchestration logic (setup and error handling only)
 * - Command implementations delegated to src/cli/commands/
 * - Global error handling for uncaught exceptions
 */

import { program } from './cli/program.js';
import { handleCliError } from './cli/utils/error-handler.js';

/**
 * Main CLI execution
 * Parses process arguments and executes the appropriate command
 */
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    handleCliError(error);
    process.exit(1);
  }
}

// Execute CLI
main();
