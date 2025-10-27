/**
 * Config command implementation
 *
 * Provides utilities for working with labcommitr configuration:
 * - show: Display currently loaded configuration
 * - validate: Check configuration validity without loading
 *
 * This command is primarily for debugging and troubleshooting.
 */

import { Command } from 'commander';
import { loadConfig } from '../../lib/config/index.js';
import { Logger } from '../../lib/logger.js';
import { ConfigError } from '../../lib/config/types.js';

/**
 * Config command
 */
export const configCommand = new Command('config')
  .description('Manage labcommitr configuration')
  .addCommand(
    new Command('show')
      .description('Display the current configuration')
      .option('-p, --path <path>', 'Start search from specific directory')
      .action(showConfigAction),
  );

/**
 * Show config action handler
 * Loads and displays the current configuration with source information
 */
async function showConfigAction(options: { path?: string }): Promise<void> {
  try {
    Logger.info('Loading configuration...\n');

    const result = await loadConfig(options.path);

    // Display config source
    Logger.success(`Configuration loaded from: ${result.source}`);

    if (result.source === 'defaults') {
      Logger.warn('Using built-in defaults (no config file found)');
    }

    if (result.path) {
      Logger.info(`Config file path: ${result.path}`);
    }

    Logger.info(`Emoji mode: ${result.emojiModeActive ? 'enabled' : 'disabled (terminal fallback)'}`);

    // Display configuration (formatted JSON)
    console.log('\nConfiguration:');
    console.log(JSON.stringify(result.config, null, 2));
  } catch (error) {
    if (error instanceof ConfigError) {
      // ConfigError already has formatted output
      Logger.error(error.message);
      if (error.details) {
        console.error(error.details);
      }
      if (error.solutions && error.solutions.length > 0) {
        console.error('\nSolutions:');
        error.solutions.forEach((solution, index) => {
          console.error(`  ${index + 1}. ${solution}`);
        });
      }
    } else {
      // Unexpected error
      Logger.error('Failed to load configuration');
      console.error(error);
    }
    process.exit(1);
  }
}

