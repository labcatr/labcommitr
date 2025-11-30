/**
 * Commander.js program configuration (Development)
 *
 * This module sets up the CLI program structure for development use,
 * including test commands that are not available in production builds.
 *
 * This file is only used during development and is not included in
 * the published package.
 */

import { Command } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Commands
import { configCommand } from "./commands/config.js";
import { initCommand } from "./commands/init/index.js";
import { commitCommand } from "./commands/commit.js";
import { previewCommand } from "./commands/preview/index.js";
import { revertCommand } from "./commands/revert/index.js";
import { testCommand } from "./commands/test/index.js";

// Get package.json for version info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

/**
 * Development CLI program instance (includes test commands)
 */
export const program = new Command();

// Program metadata
program
  .name("labcommitr")
  .description(
    "A CLI tool for standardized git commits with customizable workflows",
  )
  .version(packageJson.version, "-v, --version", "Display version number")
  .helpOption("-h, --help", "Display help information");

// Global options (future: --verbose, --no-emoji, etc.)
// program.option('--verbose', 'Enable verbose logging');

// Register commands (including test command for development)
program.addCommand(configCommand);
program.addCommand(initCommand);
program.addCommand(commitCommand);
program.addCommand(previewCommand);
program.addCommand(revertCommand);
program.addCommand(testCommand);

// Customize help text
program.addHelpText(
  "after",
  `
Examples:
  $ lab init                      Initialize config in current project
  $ lab commit                    Create a standardized commit (interactive)
  $ lab i                         (alias for init)
  $ lab c                         (alias for commit)
  $ lab test setup               Set up test environment
  $ lab test shell               Open shell in test environment

Note: You can use either 'lab' or 'labcommitr' to run commands.

Documentation:
  https://github.com/labcatr/labcommitr#readme
`,
);

// Error on unknown commands
program.showSuggestionAfterError(true);

