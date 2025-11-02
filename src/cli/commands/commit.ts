/**
 * Commit command implementation
 *
 * Interactive commit creation with standardized formatting based on
 * project configuration.
 */

import { Command } from "commander";
import { commitAction } from "./commit/index.js";

/**
 * Commit command
 */
export const commitCommand = new Command("commit")
  .description("Create a standardized commit (interactive)")
  .alias("c")
  .option("-t, --type <type>", "Commit type (feat, fix, etc.)")
  .option("-s, --scope <scope>", "Commit scope")
  .option("-m, --message <message>", "Commit subject")
  .option("--no-verify", "Bypass git hooks")
  .action(commitAction);
