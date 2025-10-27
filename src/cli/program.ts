/**
 * Commander.js program configuration
 *
 * This module sets up the CLI program structure including:
 * - Program metadata (name, version, description)
 * - Global options (--verbose, --silent, etc.)
 * - Command registration
 * - Help text customization
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Commands
import { configCommand } from './commands/config.js';
import { initCommand } from './commands/init.js';
import { commitCommand } from './commands/commit.js';

// Get package.json for version info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

/**
 * Main CLI program instance
 */
export const program = new Command();

// Program metadata
program
  .name('labcommitr')
  .description(
    'A CLI tool for standardized git commits with customizable workflows',
  )
  .version(packageJson.version, '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display help information');

// Global options (future: --verbose, --no-emoji, etc.)
// program.option('--verbose', 'Enable verbose logging');

// Register commands
program.addCommand(configCommand);
program.addCommand(initCommand);
program.addCommand(commitCommand);

// Customize help text
program.addHelpText(
  'after',
  `
Examples:
  $ labcommitr init              Initialize config in current project
  $ lab commit                   Create a standardized commit (interactive)
  $ lab config show              Display current configuration

Documentation:
  https://github.com/labcatr/labcommitr#readme
`,
);

// Error on unknown commands
program.showSuggestionAfterError(true);

